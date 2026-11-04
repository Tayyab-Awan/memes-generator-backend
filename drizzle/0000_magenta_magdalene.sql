CREATE TYPE "public"."meme_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "memes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"captions" jsonb NOT NULL,
	"image_public_id" text NOT NULL,
	"image_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"status" "meme_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "memes_created_at_id_idx" ON "memes" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);