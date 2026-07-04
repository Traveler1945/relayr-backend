// Developed by Traveler1945

import { address } from "@solana/kit";
import { createWalletClient } from "@solana/pay";
import {
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { asc, eq } from "drizzle-orm";

import { db } from "../db";
import { actions, operators } from "../db/schema";
import { getDevnetRpcUrl, getDevnetUsdcMint } from "../lib/pay/config";
import { confirmPay } from "../lib/pay/confirmPay";
import { createPaySession } from "../lib/pay/createSession";
import {
  loadDevnetPayer,
  loadDevnetPayerKeypair,
} from "../lib/pay/devnetPayer";

const DEVNET_USDC_DECIMALS = 6;

async function getPayerBalances(connection: Connection, payerAddress: string) {
  const mint = new PublicKey(getDevnetUsdcMint());
  const owner = new PublicKey(payerAddress);
  const solLamports = await connection.getBalance(owner);

  try {
    const ata = getAssociatedTokenAddressSync(mint, owner);
    const tokenAccount = await getAccount(connection, ata);
    return {
      solLamports,
      usdcAmount: Number(tokenAccount.amount) / 10 ** DEVNET_USDC_DECIMALS,
    };
  } catch {
    return { solLamports, usdcAmount: 0 };
  }
}

async function trySolAirdrop(connection: Connection, payerAddress: string) {
  const owner = new PublicKey(payerAddress);
  const rpcUrl = getDevnetRpcUrl();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const signature = await connection.requestAirdrop(
        owner,
        LAMPORTS_PER_SOL,
      );
      await connection.confirmTransaction(signature, "confirmed");
      console.log("[verify-day3-devnet] SOL airdrop confirmed via", rpcUrl);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[verify-day3-devnet] SOL airdrop attempt ${attempt} failed:`,
        message,
      );
      await new Promise((resolve) => setTimeout(resolve, 3_000 * attempt));
    }
  }
}

async function bootstrapDevnetUsdcMint(
  connection: Connection,
  payerKeypair: Keypair,
  requiredUsdc: number,
): Promise<string> {
  const mintKeypair = Keypair.generate();
  const payer = payerKeypair.publicKey;

  const mint = await createMint(
    connection,
    payerKeypair,
    payer,
    null,
    DEVNET_USDC_DECIMALS,
    mintKeypair,
  );

  const payerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    mint,
    payer,
  );

  const mintAmount = Math.ceil(requiredUsdc * 10 ** DEVNET_USDC_DECIMALS);
  await mintTo(
    connection,
    payerKeypair,
    mint,
    payerAta.address,
    payer,
    mintAmount,
  );

  console.log(
    "[verify-day3-devnet] bootstrapped devnet-only USDC mint",
    mint.toBase58(),
  );

  return mint.toBase58();
}

async function ensurePayerFunded(
  connection: Connection,
  payerAddress: string,
  payerKeypair: Keypair,
  requiredUsdc: number,
) {
  let balances = await getPayerBalances(connection, payerAddress);
  console.log("[verify-day3-devnet] payer balances", {
    sol: balances.solLamports / LAMPORTS_PER_SOL,
    usdc: balances.usdcAmount,
    requiredUsdc,
  });

  if (balances.solLamports < 0.05 * LAMPORTS_PER_SOL) {
    if (process.env.DEVNET_TRY_AIRDROP === "true") {
      await trySolAirdrop(connection, payerAddress);
      balances = await getPayerBalances(connection, payerAddress);
    }
  }

  if (balances.solLamports < 0.01 * LAMPORTS_PER_SOL) {
    throw new Error(
      [
        "Devnet payer needs SOL for fees.",
        `Address: ${payerAddress}`,
        "Fund at https://faucet.solana.com (devnet), or set DEVNET_TRY_AIRDROP=true to retry RPC airdrops.",
      ].join(" "),
    );
  }

  if (balances.usdcAmount < requiredUsdc) {
    if (process.env.DEVNET_BOOTSTRAP_USDC === "true") {
      const mint = await bootstrapDevnetUsdcMint(
        connection,
        payerKeypair,
        requiredUsdc,
      );
      process.env.DEVNET_USDC_MINT = mint;
      return;
    }

    throw new Error(
      [
        `Devnet payer needs at least ${requiredUsdc} USDC.`,
        `Address: ${payerAddress}`,
        "Fund at https://faucet.circle.com (Solana Devnet), or set DEVNET_BOOTSTRAP_USDC=true to mint a devnet-only test token.",
      ].join(" "),
    );
  }
}

async function main() {
  delete process.env.MOCK_PAY;
  process.env.DEVNET_BOOTSTRAP_USDC ??= "true";

  const rpcUrl = getDevnetRpcUrl();
  const connection = new Connection(rpcUrl, "confirmed");
  const payerSigner = await loadDevnetPayer();
  const payerKeypair = loadDevnetPayerKeypair();
  const payerAddress = payerKeypair.publicKey.toBase58();

  console.log("[verify-day3-devnet] payer", payerAddress);

  const [sample] = await db
    .select({
      operatorId: operators.id,
      actionId: actions.id,
      priceUsdc: actions.priceUsdc,
    })
    .from(actions)
    .innerJoin(operators, eq(actions.operatorId, operators.id))
    .where(eq(operators.status, "live"))
    .orderBy(asc(actions.priceUsdc))
    .limit(1);

  if (!sample) {
    throw new Error("No live operator actions found — run db:seed first");
  }

  const requiredUsdc = sample.priceUsdc / 100;
  await ensurePayerFunded(connection, payerAddress, payerKeypair, requiredUsdc);

  const session = await createPaySession({
    operatorId: sample.operatorId,
    actionId: sample.actionId,
  });

  console.log("[verify-day3-devnet] createSession");
  console.log(
    JSON.stringify(
      {
        reference: session.reference,
        url: session.url,
        mock: session.mock,
        mint: getDevnetUsdcMint(),
      },
      null,
      2,
    ),
  );

  const wallet = createWalletClient({ rpcUrl, payer: payerSigner });
  const parsed = wallet.pay.parseURL(session.url);

  if (!("amount" in parsed) || parsed.amount == null) {
    throw new Error("Parsed Solana Pay URL missing amount");
  }

  const reference =
    "reference" in parsed && parsed.reference != null
      ? Array.isArray(parsed.reference)
        ? parsed.reference[0]
        : parsed.reference
      : address(session.reference);

  const instructions = await wallet.pay.createTransfer({
    recipient: parsed.recipient,
    amount: parsed.amount,
    splToken: "splToken" in parsed ? parsed.splToken : undefined,
    reference,
    memo: "memo" in parsed ? parsed.memo : undefined,
  });

  const signature = await wallet.sendTransaction(instructions);
  console.log("[verify-day3-devnet] wallet sent tx", String(signature));

  await new Promise((resolve) => setTimeout(resolve, 6_000));

  const confirmed = await confirmPay({ reference: session.reference });

  console.log("[verify-day3-devnet] confirm");
  console.log(
    JSON.stringify(
      {
        mock: confirmed.mock,
        txSignature: confirmed.txSignature,
        explorerUrl: confirmed.explorerUrl,
        settlement: confirmed.settlement,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[verify-day3-devnet] failed:", error);
  process.exit(1);
});
