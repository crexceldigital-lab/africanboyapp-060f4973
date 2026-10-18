ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "annual_collection_commitment" jsonb;
ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "flagged_for_review" boolean DEFAULT false;
ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "review_required_reason" text;
ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "is_historical_baseline" boolean DEFAULT false;
ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "parent_offer_reference" text;
ALTER TABLE "public"."agent_commercial_offers" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;

CREATE TABLE IF NOT EXISTS "public"."distributor_collection_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"application_id" uuid,
	"collection_id" text NOT NULL,
	"collection_number" integer NOT NULL,
	"collection_name" text NOT NULL,
	"is_opening_order" boolean DEFAULT false,
	"minimum_commitment" integer DEFAULT 1000,
	"quantity_ordered" integer DEFAULT 0,
	"quantity_paid" integer DEFAULT 0,
	"quantity_fulfilled" integer DEFAULT 0,
	"status" text DEFAULT 'Pending Order',
	"order_reference" text,
	"order_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
