// Developed by Traveler1945

import { describe, expect, test } from "bun:test";

import { splitAction } from "./splitAction";

describe("splitAction", () => {
  test("splits $0.50 (50 minor units) with floored minority slices", () => {
    const split = splitAction(50);

    expect(split.stakers).toBe(2);
    expect(split.treasury).toBe(2);
    expect(split.burn).toBe(1);
    expect(split.operator).toBe(45);
    expect(
      split.operator + split.stakers + split.treasury + split.burn,
    ).toBe(50);
  });

  test("assigns rounding dust to operator", () => {
    const split = splitAction(101);

    expect(split.stakers).toBe(5);
    expect(split.treasury).toBe(4);
    expect(split.burn).toBe(3);
    expect(split.operator).toBe(89);
    expect(
      split.operator + split.stakers + split.treasury + split.burn,
    ).toBe(101);
  });
});
