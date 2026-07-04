// Developed by Traveler1945

import { address, generateKeyPairSigner } from "@solana/kit";

import {
  loadActionContext,
  usdcCentsToDecimalAmount,
} from "../actionContext";
import {
  getDevnetRpcUrl,
  getDevnetUsdcMint,
  isMockPayEnabled,
} from "./config";
import { savePaySession } from "./sessions";

type MerchantClient = {
  pay: {
    encodeURL: (fields: unknown) => URL;
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

export type CreatePaySessionInput = {
  operatorId: string;
  actionId: string;
};

export type CreatePaySessionResult = {
  reference: string;
  url: string;
  deeplink: string;
  qrPayload: string;
  amount: number;
  mint: string;
  mock: boolean;
};

export async function createPaySession(
  input: CreatePaySessionInput,
): Promise<CreatePaySessionResult> {
  const action = await loadActionContext(input.operatorId, input.actionId);
  const amount = usdcCentsToDecimalAmount(action.priceUsdc);
  const referenceSigner = await generateKeyPairSigner();
  const reference = referenceSigner.address;
  const recipient = address(action.operatorWallet);
  const usdcMint = getDevnetUsdcMint();
  const splToken = address(usdcMint);

  const transferFields = {
    recipient: action.operatorWallet,
    amount,
    splToken: usdcMint,
    reference,
  };

  savePaySession({
    reference,
    operatorId: input.operatorId,
    actionId: input.actionId,
    amountUsdc: action.priceUsdc,
    recipient: action.operatorWallet,
    transferFields,
    createdAt: Date.now(),
  });

  if (isMockPayEnabled()) {
    const mockUrl = new URL(`solana:${action.operatorWallet}`);
    mockUrl.searchParams.set("amount", String(amount));
    mockUrl.searchParams.set("spl-token", usdcMint);
    mockUrl.searchParams.set("reference", reference);
    mockUrl.searchParams.set("label", "RELAYR");
    mockUrl.searchParams.set("message", action.actionName);

    const url = mockUrl.toString();
    return {
      reference,
      url,
      deeplink: url,
      qrPayload: url,
      amount: action.priceUsdc,
      mint: "USDC",
      mock: true,
    };
  }

  const merchant = await getMerchantClient();
  const url = merchant.pay
    .encodeURL({
      recipient,
      amount,
      splToken,
      reference,
      label: "RELAYR",
      message: action.actionName,
    })
    .toString();

  return {
    reference,
    url,
    deeplink: url,
    qrPayload: url,
    amount: action.priceUsdc,
    mint: "USDC",
    mock: false,
  };
}

export function __resetMerchantClientForTests(): void {
  merchantClient = undefined;
}
