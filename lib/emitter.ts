// Developed by Traveler1945

import { eq } from "drizzle-orm";

import { db } from "../db";
import { actions, operators, robots } from "../db/schema";
import { firePaidAction } from "./firePaidAction";

type EmitterCatalogEntry = {
  operatorId: string;
  actionId: string;
};

let catalog: EmitterCatalogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function randomBetween(minMs: number, maxMs: number): number {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

async function loadCatalog(): Promise<EmitterCatalogEntry[]> {
  const rows = await db
    .select({
      operatorId: operators.id,
      actionId: actions.id,
    })
    .from(actions)
    .innerJoin(operators, eq(actions.operatorId, operators.id))
    .innerJoin(robots, eq(robots.operatorId, operators.id))
    .where(eq(operators.status, "live"));

  return rows.map((row) => ({
    operatorId: row.operatorId,
    actionId: row.actionId,
  }));
}

async function emitRandomPaidAction(): Promise<void> {
  if (catalog.length === 0) {
    catalog = await loadCatalog();
  }

  if (catalog.length === 0) {
    console.warn("[emitter] no live operator actions available");
    return;
  }

  const entry = catalog[Math.floor(Math.random() * catalog.length)]!;
  const outcome = Math.random() < 0.94 ? "success" : "fail";

  try {
    const result = await firePaidAction({
      operatorId: entry.operatorId,
      actionId: entry.actionId,
      outcome,
    });
    console.log(
      `[emitter] paid_action ${result.paidAction.id} (${result.event.data.operator}/${result.event.data.action})`,
    );
  } catch (error) {
    console.error("[emitter] failed to emit paid_action", error);
  }
}

function scheduleNextTick(minMs: number, maxMs: number): void {
  const delay = randomBetween(minMs, maxMs);
  timer = setTimeout(async () => {
    await emitRandomPaidAction();
    scheduleNextTick(minMs, maxMs);
  }, delay);
}

export function startPaidActionEmitter(): void {
  if (timer) {
    return;
  }

  const minMs = Number(process.env.EMITTER_MIN_INTERVAL_MS ?? 4_000);
  const maxMs = Number(process.env.EMITTER_MAX_INTERVAL_MS ?? 8_000);

  if (minMs <= 0 || maxMs <= 0 || minMs > maxMs) {
    throw new Error(
      "Invalid emitter interval env vars: EMITTER_MIN_INTERVAL_MS must be <= EMITTER_MAX_INTERVAL_MS and both > 0",
    );
  }

  console.log(
    `[emitter] starting randomized paid_action feed (${minMs}-${maxMs}ms)`,
  );

  scheduleNextTick(minMs, maxMs);
}

export function stopPaidActionEmitter(): void {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}

export function __resetEmitterForTests(): void {
  stopPaidActionEmitter();
  catalog = [];
}
