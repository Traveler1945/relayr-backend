// Developed by Traveler1945

import { splitAction } from "./splitAction";

export function buildSettlementFromGross(gross: number, paidActionId: string) {
  const split = splitAction(gross);

  return {
    paidActionId,
    gross,
    operatorAmount: split.operator,
    stakersAmount: split.stakers,
    treasuryAmount: split.treasury,
    burnAmount: split.burn,
    split,
  };
}
