// Developed by Traveler 1945

import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const robotTypeEnum = pgEnum("robot_type", [
  "rover",
  "arm",
  "claw",
  "printer",
  "lab",
]);

export const operatorStatusEnum = pgEnum("operator_status", ["live", "offline"]);

export const robotStatusEnum = pgEnum("robot_status", ["live", "offline"]);

export const paidActionOutcomeEnum = pgEnum("paid_action_outcome", [
  "pending",
  "success",
  "fail",
]);

export const paidActionStatusEnum = pgEnum("paid_action_status", [
  "pending",
  "settling",
  "settled",
  "disputed",
]);

export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull(),
  name: text("name").notNull(),
  robotType: robotTypeEnum("robot_type").notNull(),
  modules: jsonb("modules")
    .$type<{
      pay: boolean;
      access: boolean;
      proof: boolean;
      rewards: boolean;
    }>()
    .notNull(),
  priceDefault: integer("price_default").notNull(),
  successRate: integer("success_rate").notNull(),
  uptime: integer("uptime").notNull(),
  reputation: integer("reputation").notNull(),
  trustStake: bigint("trust_stake", { mode: "number" }).notNull(),
  actionsServed: integer("actions_served").notNull(),
  status: operatorStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const robots = pgTable("robots", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id),
  robotId: text("robot_id").notNull(),
  label: text("label").notNull(),
  status: robotStatusEnum("status").notNull(),
  streamUrl: text("stream_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const actions = pgTable("actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id),
  name: text("name").notNull(),
  priceUsdc: integer("price_usdc").notNull(),
  priceRly: bigint("price_rly", { mode: "number" }),
  modules: jsonb("modules")
    .$type<{
      pay?: boolean;
      access?: boolean;
      proof?: boolean;
      rewards?: boolean;
    }>()
    .notNull(),
  rewardRly: bigint("reward_rly", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paidActions = pgTable("paid_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionId: uuid("action_id")
    .notNull()
    .references(() => actions.id),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id),
  robotId: uuid("robot_id")
    .notNull()
    .references(() => robots.id),
  userWallet: text("user_wallet").notNull(),
  command: jsonb("command").$type<Record<string, unknown>>().notNull(),
  price: integer("price").notNull(),
  payMint: text("pay_mint").notNull(),
  txSignature: text("tx_signature"),
  videoHash: text("video_hash"),
  clipUrl: text("clip_url"),
  outcome: paidActionOutcomeEnum("outcome").notNull(),
  status: paidActionStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const settlements = pgTable("settlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  paidActionId: uuid("paid_action_id")
    .notNull()
    .references(() => paidActions.id),
  gross: integer("gross").notNull(),
  operatorAmount: integer("operator_amount").notNull(),
  stakersAmount: integer("stakers_amount").notNull(),
  treasuryAmount: integer("treasury_amount").notNull(),
  burnAmount: integer("burn_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
