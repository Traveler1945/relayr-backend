// Developed by Traveler1945

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { actions, paidActions, settlements } from "../db/schema";
import { publicProcedure, router } from "../lib/trpc";

const takeRate = {
  operator: 0.88,
  stakers: 0.05,
  treasury: 0.04,
  burn: 0.03,
} as const;

export const earningsRouter = router({
  summary: publicProcedure
    .input(
      z
        .object({
          operatorId: z.string().uuid().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const operatorFilter = input?.operatorId
        ? eq(paidActions.operatorId, input.operatorId)
        : undefined;

      const settledFilter = eq(paidActions.status, "settled");

      const whereClause =
        operatorFilter !== undefined
          ? and(settledFilter, operatorFilter)
          : settledFilter;

      const [totals] = await db
        .select({
          actionCount: sql<number>`count(*)::int`,
          gross: sql<number>`coalesce(sum(${settlements.gross}), 0)::int`,
          operator: sql<number>`coalesce(sum(${settlements.operatorAmount}), 0)::int`,
          stakers: sql<number>`coalesce(sum(${settlements.stakersAmount}), 0)::int`,
          treasury: sql<number>`coalesce(sum(${settlements.treasuryAmount}), 0)::int`,
          burn: sql<number>`coalesce(sum(${settlements.burnAmount}), 0)::int`,
        })
        .from(settlements)
        .innerJoin(paidActions, eq(settlements.paidActionId, paidActions.id))
        .where(whereClause);

      const byAction = await db
        .select({
          actionId: actions.id,
          actionName: actions.name,
          count: sql<number>`count(*)::int`,
          gross: sql<number>`coalesce(sum(${settlements.gross}), 0)::int`,
          operator: sql<number>`coalesce(sum(${settlements.operatorAmount}), 0)::int`,
          stakers: sql<number>`coalesce(sum(${settlements.stakersAmount}), 0)::int`,
          treasury: sql<number>`coalesce(sum(${settlements.treasuryAmount}), 0)::int`,
          burn: sql<number>`coalesce(sum(${settlements.burnAmount}), 0)::int`,
        })
        .from(settlements)
        .innerJoin(paidActions, eq(settlements.paidActionId, paidActions.id))
        .innerJoin(actions, eq(paidActions.actionId, actions.id))
        .where(whereClause)
        .groupBy(actions.id, actions.name)
        .orderBy(actions.name);

      return {
        totals: {
          actionCount: totals?.actionCount ?? 0,
          gross: totals?.gross ?? 0,
          operator: totals?.operator ?? 0,
          stakers: totals?.stakers ?? 0,
          treasury: totals?.treasury ?? 0,
          burn: totals?.burn ?? 0,
        },
        takeRate,
        byAction: byAction.map((row) => ({
          actionId: row.actionId,
          actionName: row.actionName,
          count: row.count,
          gross: row.gross,
          split: {
            operator: row.operator,
            stakers: row.stakers,
            treasury: row.treasury,
            burn: row.burn,
          },
        })),
      };
    }),
});
