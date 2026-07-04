// Developed by Traveler1945

import type { ActionSplit } from "./splitAction";

export type PaidActionBroadcast = {
  type: "paid_action";
  data: {
    id: string;
    operator: string;
    robot_id: string;
    action: string;
    price: number;
    mint: string;
    outcome: string;
    status: string;
    clip_url: string | null;
    tx: string | null;
    split: ActionSplit;
    ts: number;
  };
};

type PaidActionEventInput = {
  id: string;
  operatorName: string;
  robotId: string;
  actionName: string;
  price: number;
  payMint: string;
  outcome: string;
  status: string;
  clipUrl: string | null;
  txSignature: string | null;
  split: ActionSplit;
  createdAt: Date;
};

export function buildPaidActionEvent(
  input: PaidActionEventInput,
): PaidActionBroadcast {
  return {
    type: "paid_action",
    data: {
      id: input.id,
      operator: input.operatorName,
      robot_id: input.robotId,
      action: input.actionName,
      price: input.price,
      mint: input.payMint,
      outcome: input.outcome,
      status: input.status,
      clip_url: input.clipUrl,
      tx: input.txSignature,
      split: input.split,
      ts: Math.floor(input.createdAt.getTime() / 1000),
    },
  };
}
