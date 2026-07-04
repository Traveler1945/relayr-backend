// Developed by Traveler1945

export const DEVNET_USDC_MINT =
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export function getDevnetUsdcMint(): string {
  return process.env.DEVNET_USDC_MINT ?? DEVNET_USDC_MINT;
}

export function isMockPayEnabled(): boolean {
  return process.env.MOCK_PAY === "true";
}

export function getDevnetRpcUrl(): string {
  return process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";
}

export function devnetExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
