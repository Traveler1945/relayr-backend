// Developed by Traveler1945

const ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function createMockDevnetSignature(): string {
  let sig = "";
  for (let i = 0; i < 88; i++) {
    sig += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return sig;
}
