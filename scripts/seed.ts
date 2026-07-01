// Developed by Traveler 1945

import { eq, sql } from "drizzle-orm";

import { db } from "../db";
import {
  actions,
  operators,
  paidActions,
  robots,
  settlements,
} from "../db/schema";
import { splitAction } from "../lib/splitAction";

const PAID_ACTION_COUNT = 8_000;

type OperatorSeed = {
  wallet: string;
  name: string;
  robotType: "rover" | "arm" | "claw" | "printer" | "lab";
  modules: { pay: boolean; access: boolean; proof: boolean; rewards: boolean };
  priceDefault: number;
  successRate: number;
  uptime: number;
  reputation: number;
  trustStake: number;
  status: "live" | "offline";
  robot: { robotId: string; label: string; streamUrl: string };
  actionDefs: Array<{
    name: string;
    priceUsdc: number;
    modules: { pay?: boolean; access?: boolean; proof?: boolean; rewards?: boolean };
    rewardRly?: number;
  }>;
};

const operatorSeeds: OperatorSeed[] = [
  {
    wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    name: "MarsRover Co",
    robotType: "rover",
    modules: { pay: true, access: true, proof: true, rewards: true },
    priceDefault: 50,
    successRate: 9850,
    uptime: 9920,
    reputation: 940,
    trustStake: 2_500_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xMR1",
      label: "Curiosity-X",
      streamUrl: "https://cdn.relayr.dev/clips/rover-loop.mp4",
    },
    actionDefs: [
      { name: "drive", priceUsdc: 50, modules: { pay: true, proof: true } },
      { name: "scan", priceUsdc: 75, modules: { pay: true, access: true, proof: true } },
      { name: "sample", priceUsdc: 100, modules: { pay: true, proof: true, rewards: true }, rewardRly: 500_000 },
    ],
  },
  {
    wallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    name: "PrecisionArm Labs",
    robotType: "arm",
    modules: { pay: true, access: true, proof: true, rewards: false },
    priceDefault: 40,
    successRate: 9910,
    uptime: 9960,
    reputation: 970,
    trustStake: 1_800_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xPA1",
      label: "Delta-6",
      streamUrl: "https://cdn.relayr.dev/clips/arm-loop.mp4",
    },
    actionDefs: [
      { name: "pick", priceUsdc: 40, modules: { pay: true, proof: true } },
      { name: "place", priceUsdc: 40, modules: { pay: true, proof: true } },
      { name: "weld", priceUsdc: 120, modules: { pay: true, access: true, proof: true } },
    ],
  },
  {
    wallet: "4vJ9JU1bJJE96FWSJKvHsmmFADgLxfaW29LfVjUQLX9K",
    name: "ClawKing",
    robotType: "claw",
    modules: { pay: true, access: true, proof: true, rewards: true },
    priceDefault: 50,
    successRate: 9780,
    uptime: 9880,
    reputation: 920,
    trustStake: 3_200_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xA3",
      label: "Talon-Prime",
      streamUrl: "https://cdn.relayr.dev/clips/claw-loop.mp4",
    },
    actionDefs: [
      { name: "grab", priceUsdc: 50, modules: { pay: true, proof: true, rewards: true }, rewardRly: 250_000 },
      { name: "lift", priceUsdc: 60, modules: { pay: true, proof: true } },
      { name: "drop", priceUsdc: 30, modules: { pay: true, proof: true } },
    ],
  },
  {
    wallet: "DYw8jCTfwHNRJhhmFcbXvVDTqWMevLeXuyBtyUsYtY5N",
    name: "PrintForge",
    robotType: "printer",
    modules: { pay: true, access: false, proof: true, rewards: false },
    priceDefault: 80,
    successRate: 9820,
    uptime: 9900,
    reputation: 880,
    trustStake: 1_200_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xPF1",
      label: "LayerMax",
      streamUrl: "https://cdn.relayr.dev/clips/printer-loop.mp4",
    },
    actionDefs: [
      { name: "print", priceUsdc: 80, modules: { pay: true, proof: true } },
      { name: "prototype", priceUsdc: 150, modules: { pay: true, proof: true, access: true } },
    ],
  },
  {
    wallet: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    name: "BioLab Bot",
    robotType: "lab",
    modules: { pay: true, access: true, proof: true, rewards: true },
    priceDefault: 90,
    successRate: 9930,
    uptime: 9970,
    reputation: 960,
    trustStake: 2_100_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xLB1",
      label: "Helix-9",
      streamUrl: "https://cdn.relayr.dev/clips/lab-loop.mp4",
    },
    actionDefs: [
      { name: "mix", priceUsdc: 90, modules: { pay: true, proof: true } },
      { name: "centrifuge", priceUsdc: 110, modules: { pay: true, access: true, proof: true } },
      { name: "pipette", priceUsdc: 45, modules: { pay: true, proof: true, rewards: true }, rewardRly: 100_000 },
    ],
  },
  {
    wallet: "3NZ9JMVBmGAqocybic2cjzLPUEx4fjpgDay3WjQ5Wz2",
    name: "Desert Crawler",
    robotType: "rover",
    modules: { pay: true, access: true, proof: true, rewards: false },
    priceDefault: 55,
    successRate: 9750,
    uptime: 9850,
    reputation: 850,
    trustStake: 900_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xDC1",
      label: "SandRunner",
      streamUrl: "https://cdn.relayr.dev/clips/rover-loop.mp4",
    },
    actionDefs: [
      { name: "navigate", priceUsdc: 55, modules: { pay: true, proof: true } },
      { name: "map", priceUsdc: 85, modules: { pay: true, access: true, proof: true } },
    ],
  },
  {
    wallet: "8BnEgHoWFysVcuFFX7Qztdmzu4ABCKLbP8xYQ9c4V5",
    name: "GripWorks",
    robotType: "claw",
    modules: { pay: true, access: false, proof: true, rewards: false },
    priceDefault: 50,
    successRate: 9680,
    uptime: 9720,
    reputation: 810,
    trustStake: 600_000_000,
    status: "offline",
    robot: {
      robotId: "rbt_0xGW1",
      label: "Vice-2",
      streamUrl: "https://cdn.relayr.dev/clips/claw-loop.mp4",
    },
    actionDefs: [
      { name: "pinch", priceUsdc: 50, modules: { pay: true, proof: true } },
    ],
  },
  {
    wallet: "2wmVCSfPxGPjrnMMn7rchp4Ys6W7c3A11nyq5LJz2D8",
    name: "NanoPrint",
    robotType: "printer",
    modules: { pay: true, access: true, proof: true, rewards: true },
    priceDefault: 200,
    successRate: 9890,
    uptime: 9940,
    reputation: 930,
    trustStake: 1_500_000_000,
    status: "live",
    robot: {
      robotId: "rbt_0xNP1",
      label: "MicroLayer",
      streamUrl: "https://cdn.relayr.dev/clips/printer-loop.mp4",
    },
    actionDefs: [
      { name: "microprint", priceUsdc: 200, modules: { pay: true, proof: true, rewards: true }, rewardRly: 750_000 },
    ],
  },
];

const MOCK_WALLETS = [
  "HxFLKUAmAMLz1jtT4x2K6kCHq3vX9pN2mR8wL5kJ7sQ",
  "Bq7Yn3KpR9mW2xL5vT8hJ4nF6cD1aZ0sE3gH7iK9mP",
  "Kp2Wm8R5nT9xL3vH7jF4cD6aZ1sE0gH8iK2mP5qR",
  "Mn4Tq9W2xL6vH8jF3cD7aZ0sE5gH1iK6mP9qR2wT",
  "Rq8Wm3T6xL9vH2jF5cD4aZ7sE0gH3iK8mP1qR5wN",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  const index = Math.floor(rng() * items.length);
  return items[index]!;
}

function mockTxSignature(rng: () => number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let sig = "";
  for (let i = 0; i < 88; i++) {
    sig += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return sig;
}

async function clearTables() {
  await db.execute(sql`TRUNCATE TABLE settlements, paid_actions, actions, robots, operators CASCADE`);
}

async function seed() {
  console.log("Clearing existing data...");
  await clearTables();

  const rng = mulberry32(42);
  const actionCatalog: Array<{
    actionId: string;
    operatorId: string;
    robotId: string;
    name: string;
    priceUsdc: number;
    weight: number;
  }> = [];

  console.log("Seeding operators, robots, and actions...");
  for (const seed of operatorSeeds) {
    const [operator] = await db
      .insert(operators)
      .values({
        wallet: seed.wallet,
        name: seed.name,
        robotType: seed.robotType,
        modules: seed.modules,
        priceDefault: seed.priceDefault,
        successRate: seed.successRate,
        uptime: seed.uptime,
        reputation: seed.reputation,
        trustStake: seed.trustStake,
        actionsServed: 0,
        status: seed.status,
      })
      .returning({ id: operators.id });

    const [robot] = await db
      .insert(robots)
      .values({
        operatorId: operator!.id,
        robotId: seed.robot.robotId,
        label: seed.robot.label,
        status: seed.status,
        streamUrl: seed.robot.streamUrl,
      })
      .returning({ id: robots.id });

    for (const actionDef of seed.actionDefs) {
      const [action] = await db
        .insert(actions)
        .values({
          operatorId: operator!.id,
          name: actionDef.name,
          priceUsdc: actionDef.priceUsdc,
          modules: actionDef.modules,
          rewardRly: actionDef.rewardRly ?? null,
        })
        .returning({ id: actions.id });

      actionCatalog.push({
        actionId: action!.id,
        operatorId: operator!.id,
        robotId: robot!.id,
        name: actionDef.name,
        priceUsdc: actionDef.priceUsdc,
        weight: seed.status === "live" ? 1 : 0.15,
      });
    }
  }

  const totalActionDefs = actionCatalog.length;
  console.log(`Seeded ${operatorSeeds.length} operators, ${totalActionDefs} actions`);

  const now = Date.now();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const totalWeight = actionCatalog.reduce((sum, item) => sum + item.weight, 0);

  console.log(`Generating ${PAID_ACTION_COUNT} paid actions + settlements...`);

  const batchSize = 500;
  let inserted = 0;
  const servedCounts = new Map<string, number>();

  while (inserted < PAID_ACTION_COUNT) {
    const batchCount = Math.min(batchSize, PAID_ACTION_COUNT - inserted);
    const paidActionRows: (typeof paidActions.$inferInsert)[] = [];

    for (let i = 0; i < batchCount; i++) {
      let roll = rng() * totalWeight;
      let catalogEntry = actionCatalog[0]!;
      for (const entry of actionCatalog) {
        roll -= entry.weight;
        if (roll <= 0) {
          catalogEntry = entry;
          break;
        }
      }

      const createdAt = new Date(now - Math.floor(rng() * ninetyDaysMs));
      const isSuccess = rng() < 0.94;
      const outcome = isSuccess ? "success" : "fail";
      const status = isSuccess ? "settled" : pick(rng, ["settled", "disputed"] as const);
      const settledAt =
        status === "settled" || status === "disputed"
          ? new Date(createdAt.getTime() + Math.floor(rng() * 120_000))
          : null;

      paidActionRows.push({
        actionId: catalogEntry.actionId,
        operatorId: catalogEntry.operatorId,
        robotId: catalogEntry.robotId,
        userWallet: pick(rng, MOCK_WALLETS),
        command: { action: catalogEntry.name, ts: createdAt.toISOString() },
        price: catalogEntry.priceUsdc,
        payMint: "USDC",
        txSignature: mockTxSignature(rng),
        outcome,
        status,
        createdAt,
        settledAt,
      });

      servedCounts.set(
        catalogEntry.operatorId,
        (servedCounts.get(catalogEntry.operatorId) ?? 0) + 1,
      );
    }

    const insertedPaidActions = await db
      .insert(paidActions)
      .values(paidActionRows)
      .returning({ id: paidActions.id, price: paidActions.price, status: paidActions.status });

    const settlementRows = insertedPaidActions
      .filter((row) => row.status === "settled" || row.status === "disputed")
      .map((row) => {
        const split = splitAction(row.price);
        return {
          paidActionId: row.id,
          gross: row.price,
          operatorAmount: split.operator,
          stakersAmount: split.stakers,
          treasuryAmount: split.treasury,
          burnAmount: split.burn,
        };
      });

    if (settlementRows.length > 0) {
      await db.insert(settlements).values(settlementRows);
    }

    inserted += batchCount;
    if (inserted % 2000 === 0 || inserted === PAID_ACTION_COUNT) {
      console.log(`  ${inserted}/${PAID_ACTION_COUNT} paid actions inserted`);
    }
  }

  for (const [operatorId, count] of servedCounts) {
    await db
      .update(operators)
      .set({ actionsServed: count })
      .where(eq(operators.id, operatorId));
  }

  console.log("Seed complete.");
  console.log(`  Operators: ${operatorSeeds.length}`);
  console.log(`  Actions: ${totalActionDefs}`);
  console.log(`  Paid actions: ${PAID_ACTION_COUNT}`);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
