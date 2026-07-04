// Developed by Traveler1945

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "../db";
import { actions, operators, robots } from "../db/schema";

export type ActionContext = {
  actionId: string;
  actionName: string;
  priceUsdc: number;
  operatorId: string;
  operatorName: string;
  operatorWallet: string;
  robotUuid: string;
  robotId: string;
};

export async function loadActionContext(
  operatorId: string,
  actionId: string,
): Promise<ActionContext> {
  const [row] = await db
    .select({
      actionId: actions.id,
      actionName: actions.name,
      priceUsdc: actions.priceUsdc,
      operatorId: actions.operatorId,
      operatorName: operators.name,
      operatorWallet: operators.wallet,
      robotUuid: robots.id,
      robotId: robots.robotId,
    })
    .from(actions)
    .innerJoin(operators, eq(actions.operatorId, operators.id))
    .innerJoin(robots, eq(robots.operatorId, operators.id))
    .where(and(eq(actions.id, actionId), eq(actions.operatorId, operatorId)))
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Action not found for operator",
    });
  }

  return row;
}

export function usdcCentsToDecimalAmount(priceUsdcCents: number): number {
  return priceUsdcCents / 100;
}
