// Developed by Traveler1945

export type ActionSplit = {
  operator: number;
  stakers: number;
  treasury: number;
  burn: number;
};

/** gross in minor units; floor each slice, give rounding dust to operator */
export function splitAction(gross: number): ActionSplit {
  const stakers = Math.floor(gross * 0.05);
  const treasury = Math.floor(gross * 0.04);
  const burn = Math.floor(gross * 0.03);
  const operator = gross - stakers - treasury - burn;

  return { operator, stakers, treasury, burn };
}
