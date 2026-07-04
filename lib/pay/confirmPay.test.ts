// Developed by Traveler1945

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { subscribe } from "../realtime";
import { devnetExplorerUrl } from "./config";
import { createMockDevnetSignature } from "./mockSignature";
import { __resetPaySessionsForTests, savePaySession } from "./sessions";

const firePaidActionFn = mock(async () => ({
  paidAction: {
    id: "00000000-0000-4000-8000-000000000099",
    actionId: "00000000-0000-4000-8000-000000000002",
    operatorId: "00000000-0000-4000-8000-000000000001",
    robotId: "00000000-0000-4000-8000-000000000003",
    userWallet: "SANDBOX_TEST_WALLET",
    command: { action: "drive", source: "pay" },
    price: 50,
    payMint: "USDC",
    txSignature: "pending",
    videoHash: null,
    clipUrl: null,
    outcome: "success",
    status: "settled",
    createdAt: new Date("2026-07-03T12:00:00.000Z"),
    settledAt: new Date("2026-07-03T12:00:00.000Z"),
  },
  settlement: {
    id: "00000000-0000-4000-8000-000000000098",
    paidActionId: "00000000-0000-4000-8000-000000000099",
    gross: 50,
    operatorAmount: 45,
    stakersAmount: 2,
    treasuryAmount: 2,
    burnAmount: 1,
    createdAt: new Date("2026-07-03T12:00:00.000Z"),
  },
  event: {
    type: "paid_action" as const,
    data: {
      id: "00000000-0000-4000-8000-000000000099",
      operator: "MarsRover Co",
      robot_id: "rbt_0xMR1",
      action: "drive",
      price: 50,
      mint: "USDC",
      outcome: "success",
      status: "settled",
      clip_url: null,
      tx: "pending",
      split: { operator: 45, stakers: 2, treasury: 2, burn: 1 },
      ts: 1780507200,
    },
  },
}));

mock.module("../firePaidAction", () => ({
  firePaidAction: firePaidActionFn,
}));

const { confirmPay, __resetConfirmMerchantClientForTests } = await import(
  "./confirmPay"
);

describe("confirmPay with MOCK_PAY", () => {
  beforeEach(() => {
    process.env.MOCK_PAY = "true";
    __resetPaySessionsForTests();
    __resetConfirmMerchantClientForTests();
    firePaidActionFn.mockClear();
  });

  afterEach(() => {
    delete process.env.MOCK_PAY;
    __resetPaySessionsForTests();
  });

  test("creates settlement downstream via firePaidAction and returns explorer link", async () => {
    const reference = "11111111111111111111111111111112";
    savePaySession({
      reference,
      operatorId: "00000000-0000-4000-8000-000000000001",
      actionId: "00000000-0000-4000-8000-000000000002",
      amountUsdc: 50,
      recipient: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      transferFields: {
        recipient: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        amount: 0.5,
        splToken: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        reference,
      },
      createdAt: Date.now(),
    });

    const payloads: string[] = [];
    const unsubscribe = subscribe((payload) => payloads.push(payload));

    const result = await confirmPay({ reference });

    unsubscribe();

    expect(result.mock).toBe(true);
    expect(result.txSignature).toHaveLength(88);
    expect(result.explorerUrl).toBe(devnetExplorerUrl(result.txSignature));
    expect(result.settlement.gross).toBe(50);
    expect(result.settlement.operatorAmount).toBe(45);
    expect(firePaidActionFn).toHaveBeenCalledTimes(1);
    expect(firePaidActionFn.mock.calls[0]?.[0]).toMatchObject({
      operatorId: "00000000-0000-4000-8000-000000000001",
      actionId: "00000000-0000-4000-8000-000000000002",
      source: "pay",
      txSignature: result.txSignature,
    });
  });

  test("mock signatures look like devnet base58 transaction ids", () => {
    const signature = createMockDevnetSignature();
    expect(signature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{88}$/);
  });
});
