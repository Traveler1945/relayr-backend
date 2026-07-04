// Developed by Traveler1945

import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";

import { db } from "../db";
import { operators, paidActions, settlements } from "../db/schema";
import { loadActionContext } from "./actionContext";
import { buildPaidActionEvent } from "./paidActionEvent";
import { broadcastPaidAction } from "./realtime";
import { buildSettlementFromGross } from "./settlementFromGross";

const SANDBOX_WALLET = "SANDBOX_TEST_WALLET";

function mockTxSignature(): string {
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let sig = "mock_";
  for (let i = 0; i < 80; i++) {
    sig += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return sig;
}

export type FirePaidActionInput = {
  operatorId: string;
  actionId: string;
  userWallet?: string;
  txSignature?: string;
  outcome?: "success" | "fail";
  source?: "fire" | "pay";
};

export type FirePaidActionResult = {
  paidAction: typeof paidActions.$inferSelect;
  settlement: typeof settlements.$inferSelect;
  event: ReturnType<typeof buildPaidActionEvent>;
};

export async function firePaidAction(
  input: FirePaidActionInput,
): Promise<FirePaidActionResult> {
  const actionRow = await loadActionContext(input.operatorId, input.actionId);

  const outcome = input.outcome ?? "success";
  const txSignature = input.txSignature ?? mockTxSignature();
  const userWallet = input.userWallet ?? SANDBOX_WALLET;
  const source = input.source ?? "fire";
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [pending] = await tx
      .insert(paidActions)
      .values({
        actionId: actionRow.actionId,
        operatorId: actionRow.operatorId,
        robotId: actionRow.robotUuid,
        userWallet,
        command: { action: actionRow.actionName, source },
        price: actionRow.priceUsdc,
        payMint: "USDC",
        txSignature,
        outcome: "pending",
        status: "pending",
        createdAt: now,
      })
      .returning();

    if (!pending) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create paid action",
      });
    }

    await tx
      .update(paidActions)
      .set({ status: "settling", outcome })
      .where(eq(paidActions.id, pending.id));

    const settlementDraft = buildSettlementFromGross(
      actionRow.priceUsdc,
      pending.id,
    );

    const [settlement] = await tx
      .insert(settlements)
      .values({
        paidActionId: settlementDraft.paidActionId,
        gross: settlementDraft.gross,
        operatorAmount: settlementDraft.operatorAmount,
        stakersAmount: settlementDraft.stakersAmount,
        treasuryAmount: settlementDraft.treasuryAmount,
        burnAmount: settlementDraft.burnAmount,
      })
      .returning();

    const [settled] = await tx
      .update(paidActions)
      .set({
        status: "settled",
        outcome,
        settledAt: now,
      })
      .where(eq(paidActions.id, pending.id))
      .returning();

    await tx
      .update(operators)
      .set({ actionsServed: sql`${operators.actionsServed} + 1` })
      .where(eq(operators.id, actionRow.operatorId));

    if (!settlement || !settled) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to settle paid action",
      });
    }

    return { paidAction: settled, settlement, split: settlementDraft.split };
  });

  const event = buildPaidActionEvent({
    id: result.paidAction.id,
    operatorName: actionRow.operatorName,
    robotId: actionRow.robotId,
    actionName: actionRow.actionName,
    price: result.paidAction.price,
    payMint: result.paidAction.payMint,
    outcome: result.paidAction.outcome,
    status: result.paidAction.status,
    clipUrl: result.paidAction.clipUrl,
    txSignature: result.paidAction.txSignature,
    split: result.split,
    createdAt: result.paidAction.createdAt,
  });

  broadcastPaidAction(event);

  return {
    paidAction: result.paidAction,
    settlement: result.settlement,
    event,
  };
}
