// Developed by Traveler1945

import { TRPCError } from "@trpc/server";

import { firePaidAction } from "../firePaidAction";
import {
  devnetExplorerUrl,
  getDevnetRpcUrl,
  isMockPayEnabled,
} from "./config";
import { createMockDevnetSignature } from "./mockSignature";
import { deletePaySession, getPaySession } from "./sessions";

type MerchantClient = {
  pay: {
    findReference: (
      reference: unknown,
      options?: { commitment?: "confirmed" | "finalized" },
    ) => Promise<{ signature: unknown; err: unknown | null }>;
    validateTransfer: (
      signature: unknown,
      fields: unknown,
      options?: { commitment?: "confirmed" | "finalized" },
    ) => Promise<unknown>;
  };
};

let merchantClient: MerchantClient | undefined;

async function getMerchantClient(): Promise<MerchantClient> {
  if (!merchantClient) {
    const { createMerchantClient } = await import("@solana/pay");
    merchantClient = createMerchantClient({ rpcUrl: getDevnetRpcUrl() }) as MerchantClient;
  }
  return merchantClient;
}

export type ConfirmPayInput = {
  reference: string;
};

export type ConfirmPayResult = {
  txSignature: string;
  explorerUrl: string;
  mock: boolean;
  paidAction: Awaited<ReturnType<typeof firePaidAction>>["paidAction"];
  settlement: Awaited<ReturnType<typeof firePaidAction>>["settlement"];
  event: Awaited<ReturnType<typeof firePaidAction>>["event"];
};

async function resolveDevnetSignature(
  reference: string,
  transferFields: {
    recipient: string;
    amount: number;
    splToken: string;
    reference: string;
  },
): Promise<string> {
  const { address } = await import("@solana/kit");
  const merchant = await getMerchantClient();
  const refAddress = address(reference);
  const maxAttempts = 15;
  const delayMs = 2_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const found = await merchant.pay.findReference(refAddress, {
        commitment: "confirmed",
      });

      if (found.err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Devnet transaction failed",
        });
      }

      await merchant.pay.validateTransfer(found.signature, {
        recipient: address(transferFields.recipient),
        amount: transferFields.amount,
        splToken: address(transferFields.splToken),
        reference: refAddress,
      });

      return String(found.signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("not found") || message.includes("FindReferenceError");

      if (!retryable || attempt === maxAttempts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            attempt === maxAttempts
              ? "Devnet payment not found yet — try again after the wallet confirms"
              : message,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Devnet payment not found",
  });
}

export async function confirmPay(input: ConfirmPayInput): Promise<ConfirmPayResult> {
  const session = getPaySession(input.reference);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Pay session not found",
    });
  }

  const mock = isMockPayEnabled();
  const txSignature = mock
    ? createMockDevnetSignature()
    : await resolveDevnetSignature(session.reference, session.transferFields);

  const result = await firePaidAction({
    operatorId: session.operatorId,
    actionId: session.actionId,
    txSignature,
    source: "pay",
  });

  deletePaySession(session.reference);

  return {
    txSignature,
    explorerUrl: devnetExplorerUrl(txSignature),
    mock,
    paidAction: result.paidAction,
    settlement: result.settlement,
    event: result.event,
  };
}

export function __resetConfirmMerchantClientForTests(): void {
  merchantClient = undefined;
}
