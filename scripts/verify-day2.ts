// Developed by Traveler1945

import { and, eq, sql } from "drizzle-orm";

import { db } from "../db";
import { actions, operators, paidActions, settlements } from "../db/schema";
import { firePaidAction } from "../lib/firePaidAction";
import { subscribe } from "../lib/realtime";

async function earningsCount(operatorId: string): Promise<number> {
  const [row] = await db
    .select({ actionCount: sql<number>`count(*)::int` })
    .from(settlements)
    .innerJoin(paidActions, eq(settlements.paidActionId, paidActions.id))
    .where(
      and(
        eq(paidActions.status, "settled"),
        eq(paidActions.operatorId, operatorId),
      ),
    );

  return row?.actionCount ?? 0;
}

async function main() {
  const received: string[] = [];
  const unsubscribe = subscribe((payload) => {
    received.push(payload);
  });

  const [sample] = await db
    .select({
      operatorId: operators.id,
      actionId: actions.id,
    })
    .from(actions)
    .innerJoin(operators, eq(actions.operatorId, operators.id))
    .where(eq(operators.status, "live"))
    .limit(1);

  if (!sample) {
    throw new Error("No live operator actions found — run db:seed first");
  }

  const beforeCount = await earningsCount(sample.operatorId);
  const fired = await firePaidAction({
    operatorId: sample.operatorId,
    actionId: sample.actionId,
  });
  const afterCount = await earningsCount(sample.operatorId);
  unsubscribe();

  const broadcast = received.at(-1) ? JSON.parse(received.at(-1)!) : null;

  console.log("[verify-day2] action.fire event");
  console.log(JSON.stringify(fired.event, null, 2));
  console.log("[verify-day2] realtime broadcast received:", Boolean(broadcast));
  console.log(
    "[verify-day2] earnings settled count before/after:",
    beforeCount,
    afterCount,
    `(delta ${afterCount - beforeCount})`,
  );
  console.log("[verify-day2] settlement split", fired.settlement);
}

main().catch((error) => {
  console.error("[verify-day2] failed:", error);
  process.exit(1);
});
