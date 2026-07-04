// Developed by Traveler1945

import { describe, expect, test } from "bun:test";

import { splitAction } from "./splitAction";
import { buildSettlementFromGross } from "./settlementFromGross";

describe("buildSettlementFromGross", () => {
  test("maps splitAction slices into settlement columns", () => {
    const paidActionId = "00000000-0000-4000-8000-000000000001";
    const settlement = buildSettlementFromGross(50, paidActionId);
    const split = splitAction(50);

    expect(settlement.paidActionId).toBe(paidActionId);
    expect(settlement.gross).toBe(50);
    expect(settlement.operatorAmount).toBe(split.operator);
    expect(settlement.stakersAmount).toBe(split.stakers);
    expect(settlement.treasuryAmount).toBe(split.treasury);
    expect(settlement.burnAmount).toBe(split.burn);
    expect(settlement.split).toEqual(split);
    expect(
      settlement.operatorAmount +
        settlement.stakersAmount +
        settlement.treasuryAmount +
        settlement.burnAmount,
    ).toBe(50);
  });

  test("keeps settlement math aligned for odd gross amounts", () => {
    const settlement = buildSettlementFromGross(101, "00000000-0000-4000-8000-000000000002");
    const split = splitAction(101);

    expect(settlement.split).toEqual(split);
    expect(settlement.operatorAmount).toBe(89);
    expect(settlement.stakersAmount).toBe(5);
    expect(settlement.treasuryAmount).toBe(4);
    expect(settlement.burnAmount).toBe(3);
  });
});
