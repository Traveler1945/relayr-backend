CREATE TYPE "public"."operator_status" AS ENUM('live', 'offline');--> statement-breakpoint
CREATE TYPE "public"."paid_action_outcome" AS ENUM('pending', 'success', 'fail');--> statement-breakpoint
CREATE TYPE "public"."paid_action_status" AS ENUM('pending', 'settling', 'settled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."robot_status" AS ENUM('live', 'offline');--> statement-breakpoint
CREATE TYPE "public"."robot_type" AS ENUM('rover', 'arm', 'claw', 'printer', 'lab');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_usdc" integer NOT NULL,
	"price_rly" bigint,
	"modules" jsonb NOT NULL,
	"reward_rly" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"name" text NOT NULL,
	"robot_type" "robot_type" NOT NULL,
	"modules" jsonb NOT NULL,
	"price_default" integer NOT NULL,
	"success_rate" integer NOT NULL,
	"uptime" integer NOT NULL,
	"reputation" integer NOT NULL,
	"trust_stake" bigint NOT NULL,
	"actions_served" integer NOT NULL,
	"status" "operator_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paid_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"robot_id" uuid NOT NULL,
	"user_wallet" text NOT NULL,
	"command" jsonb NOT NULL,
	"price" integer NOT NULL,
	"pay_mint" text NOT NULL,
	"tx_signature" text,
	"video_hash" text,
	"clip_url" text,
	"outcome" "paid_action_outcome" NOT NULL,
	"status" "paid_action_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "robots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"robot_id" text NOT NULL,
	"label" text NOT NULL,
	"status" "robot_status" NOT NULL,
	"stream_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paid_action_id" uuid NOT NULL,
	"gross" integer NOT NULL,
	"operator_amount" integer NOT NULL,
	"stakers_amount" integer NOT NULL,
	"treasury_amount" integer NOT NULL,
	"burn_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_actions" ADD CONSTRAINT "paid_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_actions" ADD CONSTRAINT "paid_actions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paid_actions" ADD CONSTRAINT "paid_actions_robot_id_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "public"."robots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "robots" ADD CONSTRAINT "robots_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_action_id_paid_actions_id_fk" FOREIGN KEY ("paid_action_id") REFERENCES "public"."paid_actions"("id") ON DELETE no action ON UPDATE no action;