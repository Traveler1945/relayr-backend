// Developed by Traveler1945

import { describe, expect, test } from "bun:test";

import { buildPaidActionEvent } from "./paidActionEvent";
import { broadcastPaidAction, subscribe } from "./realtime";
import { splitAction } from "./splitAction";

describe("realtime broadcast", () => {
  test("delivers paid_action payloads to SSE subscribers", () => {
    const payloads: string[] = [];
    const unsubscribe = subscribe((payload) => payloads.push(payload));

    const event = buildPaidActionEvent({
      id: "00000000-0000-4000-8000-000000000099",
      operatorName: "ClawKing",
      robotId: "rbt_0xA3",
      actionName: "grab",
      price: 50,
      payMint: "USDC",
      outcome: "success",
      status: "settled",
      clipUrl: null,
      txSignature: "mock_tx",
      split: splitAction(50),
      createdAt: new Date("2026-06-30T12:00:00.000Z"),
    });

    broadcastPaidAction(event);
    unsubscribe();

    expect(payloads).toHaveLength(1);
    expect(JSON.parse(payloads[0]!)).toEqual(event);
  });
});
