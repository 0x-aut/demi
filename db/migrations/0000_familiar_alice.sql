CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"repo_name" text NOT NULL,
	"repo_url" text NOT NULL,
	"github_token" text,
	"branch" text DEFAULT 'main' NOT NULL,
	"description" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"system_prompt" text DEFAULT '',
	"model" text DEFAULT 'gpt-4o' NOT NULL,
	"tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_catalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "workspace_agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"system_prompt_override" text,
	"model_override" text,
	"tools_override" jsonb,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_agent_workspace_id_agent_id_unique" UNIQUE("workspace_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workspace_agent_id" uuid,
	"mongo_history_id" text NOT NULL,
	"title" text,
	"model" text DEFAULT 'gpt-4o' NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"last_message_preview" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_agent" ADD CONSTRAINT "workspace_agent_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_agent" ADD CONSTRAINT "workspace_agent_agent_id_agent_catalog_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_workspace_agent_id_workspace_agent_id_fk" FOREIGN KEY ("workspace_agent_id") REFERENCES "public"."workspace_agent"("id") ON DELETE set null ON UPDATE no action;