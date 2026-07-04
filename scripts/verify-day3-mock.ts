// Developed by Traveler1945

import { eq } from "drizzle-orm";

import { db } from "../db";
import { actions, operators } from "../db/schema";
import { subscribe } from "../lib/realtime";
import { confirmPay } from "../lib/pay/confirmPay";
import { createPaySession } from "../lib/pay/createSession";

async function main() {
  process.env.MOCK_PAY = "true";

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

  const payloads: string[] = [];
  const unsubscribe = subscribe((payload) => payloads.push(payload));

  const session = await createPaySession({
    operatorId: sample.operatorId,
    actionId: sample.actionId,
  });

  console.log("[verify-day3-mock] createSession");
  console.log(JSON.stringify(session, null, 2));

  const confirmed = await confirmPay({ reference: session.reference });

  unsubscribe();

  console.log("[verify-day3-mock] confirm");
  console.log(
    JSON.stringify(
      {
        mock: confirmed.mock,
        txSignature: confirmed.txSignature,
        explorerUrl: confirmed.explorerUrl,
        settlement: confirmed.settlement,
        event: confirmed.event,
      },
      null,
      2,
    ),
  );
  console.log("[verify-day3-mock] broadcast received:", payloads.length > 0);
}

main().catch((error) => {
  console.error("[verify-day3-mock] failed:", error);
  process.exit(1);
});
