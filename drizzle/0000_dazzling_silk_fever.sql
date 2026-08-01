CREATE TYPE "public"."answer_policy_mode" AS ENUM('gentle-redirection', 'validation', 'truthful');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'af');--> statement-breakpoint
CREATE TYPE "public"."schedule_kind" AS ENUM('meal', 'visit', 'activity', 'care', 'rest');--> statement-breakpoint
CREATE TYPE "public"."schedule_source" AS ENUM('family', 'calendar');--> statement-breakpoint
CREATE TYPE "public"."simplicity_level" AS ENUM('full', 'guided', 'calm', 'minimal');--> statement-breakpoint
CREATE TYPE "public"."topic_situation" AS ENUM('deceased', 'moved-away', 'estranged', 'in-hospital', 'in-care', 'other');--> statement-breakpoint
CREATE TABLE "answer_policies" (
	"person_id" text PRIMARY KEY NOT NULL,
	"default_mode" "answer_policy_mode" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"language" "language" NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"text" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"facility_id" text NOT NULL,
	"preferred_name" text NOT NULL,
	"room_label" text NOT NULL,
	"voice_name" text NOT NULL,
	"primary_language" "language" NOT NULL,
	"languages" "language"[] NOT NULL,
	"simplicity" "simplicity_level" NOT NULL,
	"mic_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"relationship" jsonb NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"title" jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"kind" "schedule_kind" NOT NULL,
	"source" "schedule_source" NOT NULL,
	"visitor_name" text,
	"external_uid" text
);
--> statement-breakpoint
CREATE TABLE "sensitive_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"subject_name" text NOT NULL,
	"relationship" jsonb NOT NULL,
	"situation" "topic_situation" NOT NULL,
	"mode" "answer_policy_mode",
	"family_wording" jsonb
);
--> statement-breakpoint
CREATE TABLE "voice_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" text NOT NULL,
	"from_name" text NOT NULL,
	"audio_url" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"transcript" jsonb
);
--> statement-breakpoint
ALTER TABLE "answer_policies" ADD CONSTRAINT "answer_policies_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_subscriptions" ADD CONSTRAINT "calendar_subscriptions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_notes" ADD CONSTRAINT "family_notes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entries" ADD CONSTRAINT "schedule_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensitive_topics" ADD CONSTRAINT "sensitive_topics_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_messages" ADD CONSTRAINT "voice_messages_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens" USING btree ("token");