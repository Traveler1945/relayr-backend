// Developed by Traveler1945

import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import bs58 from "bs58";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";

const DEFAULT_KEYPAIR_PATH = join(
  import.meta.dir,
  "../../scripts/.devnet-payer.json",
);

type SolanaKeypairJson = number[];

function readKeypairBytes(path: string): Uint8Array {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as SolanaKeypairJson;

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error(`Invalid Solana keypair file at ${path}`);
  }

  return Uint8Array.from(parsed);
}

function loadKeypairBytes(): Uint8Array {
  const secret = process.env.DEVNET_PAYER_SECRET?.trim();
  if (secret) {
    const bytes = bs58.decode(secret);
    if (bytes.length !== 64) {
      throw new Error("DEVNET_PAYER_SECRET must decode to a 64-byte keypair");
    }
    return bytes;
  }

  const keypairPath =
    process.env.DEVNET_PAYER_KEYPAIR_PATH?.trim() ?? DEFAULT_KEYPAIR_PATH;

  if (!existsSync(keypairPath)) {
    throw new Error(
      [
        "Devnet payer not configured.",
        `Set DEVNET_PAYER_SECRET in .env, or create ${keypairPath}.`,
        "Generate one with: solana-keygen new -o scripts/.devnet-payer.json --no-bip39-passphrase",
        "Fund it with devnet SOL (https://faucet.solana.com) and USDC (https://faucet.circle.com).",
      ].join(" "),
    );
  }

  return readKeypairBytes(keypairPath);
}

export async function loadDevnetPayer(): Promise<KeyPairSigner> {
  return createKeyPairSignerFromBytes(loadKeypairBytes());
}

export function loadDevnetPayerKeypair(): Keypair {
  return Keypair.fromSecretKey(loadKeypairBytes());
}

export function getDefaultDevnetPayerPath(): string {
  return DEFAULT_KEYPAIR_PATH;
}
