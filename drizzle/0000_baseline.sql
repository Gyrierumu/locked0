CREATE TABLE "achievement_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"achievement_set_id" uuid NOT NULL,
	"content_pack_id" uuid,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_groups_achievement_set_id_position_unique" UNIQUE("achievement_set_id","position"),
	CONSTRAINT "achievement_groups_type_check" CHECK ("achievement_groups"."type" in ('base', 'dlc', 'expansion', 'update', 'mode', 'other')),
	CONSTRAINT "achievement_groups_position_check" CHECK ("achievement_groups"."position" >= 0),
	CONSTRAINT "achievement_groups_base_pack_check" CHECK ("achievement_groups"."type" <> 'base' or "achievement_groups"."content_pack_id" is null)
);
--> statement-breakpoint
CREATE TABLE "achievement_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"region_code" text,
	"external_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_sets_game_id_key_unique" UNIQUE("game_id","key"),
	CONSTRAINT "achievement_sets_status_check" CHECK ("achievement_sets"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"achievement_group_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"achievement_type" text NOT NULL,
	"points" integer,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"icon_path" text,
	"position" integer NOT NULL,
	"external_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_group_position_unique" UNIQUE("achievement_group_id","position"),
	CONSTRAINT "achievements_group_slug_unique" UNIQUE("achievement_group_id","slug"),
	CONSTRAINT "achievements_type_check" CHECK ("achievements"."achievement_type" in ('bronze', 'silver', 'gold', 'platinum', 'standard')),
	CONSTRAINT "achievements_points_check" CHECK ("achievements"."points" is null or "achievements"."points" >= 0),
	CONSTRAINT "achievements_position_check" CHECK ("achievements"."position" >= 0),
	CONSTRAINT "achievements_status_check" CHECK ("achievements"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "content_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"release_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_packs_game_id_slug_unique" UNIQUE("game_id","slug"),
	CONSTRAINT "content_packs_type_check" CHECK ("content_packs"."type" in ('expansion', 'dlc', 'update', 'mode', 'other')),
	CONSTRAINT "content_packs_status_check" CHECK ("content_packs"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "game_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text,
	"region_code" text,
	"release_date" date,
	"external_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_releases_game_id_key_unique" UNIQUE("game_id","key")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"cover_path" text,
	"hero_path" text,
	"developer_name" text,
	"publisher_name" text,
	"release_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug"),
	CONSTRAINT "games_slug_format_check" CHECK ("games"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "games_status_check" CHECK ("games"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"icon_path" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "release_achievement_sets" (
	"game_release_id" uuid NOT NULL,
	"achievement_set_id" uuid NOT NULL,
	CONSTRAINT "release_achievement_sets_pk" PRIMARY KEY("game_release_id","achievement_set_id")
);
--> statement-breakpoint
CREATE TABLE "checklist_item_achievements" (
	"checklist_item_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	CONSTRAINT "checklist_item_achievements_pk" PRIMARY KEY("checklist_item_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_node_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'action' NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_missable" boolean DEFAULT false NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checklist_items_content_node_id_unique" UNIQUE("content_node_id"),
	CONSTRAINT "checklist_items_kind_check" CHECK ("checklist_items"."kind" in ('action', 'collectible', 'quest', 'boss', 'choice', 'online', 'other')),
	CONSTRAINT "checklist_items_edit_revision_check" CHECK ("checklist_items"."edit_revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guide_content_node_achievements" (
	"content_node_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	CONSTRAINT "guide_content_node_achievements_pk" PRIMARY KEY("content_node_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "guide_content_node_targets" (
	"content_node_id" uuid NOT NULL,
	"guide_target_id" uuid NOT NULL,
	CONSTRAINT "guide_content_node_targets_pk" PRIMARY KEY("content_node_id","guide_target_id")
);
--> statement-breakpoint
CREATE TABLE "guide_content_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_section_id" uuid NOT NULL,
	"type" text NOT NULL,
	"position" integer NOT NULL,
	"target_scope" text DEFAULT 'all' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_content_nodes_type_check" CHECK ("guide_content_nodes"."type" in ('text', 'heading', 'alert', 'spoiler', 'image', 'video', 'list', 'table', 'link', 'checklist', 'achievement')),
	CONSTRAINT "guide_content_nodes_target_scope_check" CHECK ("guide_content_nodes"."target_scope" in ('all', 'selected')),
	CONSTRAINT "guide_content_nodes_position_check" CHECK ("guide_content_nodes"."position" >= 0),
	CONSTRAINT "guide_content_nodes_edit_revision_check" CHECK ("guide_content_nodes"."edit_revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guide_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_step_id" uuid NOT NULL,
	"anchor" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"position" integer NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_sections_step_anchor_unique" UNIQUE("guide_step_id","anchor"),
	CONSTRAINT "guide_sections_position_check" CHECK ("guide_sections"."position" >= 0),
	CONSTRAINT "guide_sections_edit_revision_check" CHECK ("guide_sections"."edit_revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guide_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"anchor" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"estimated_minutes_min" integer,
	"estimated_minutes_max" integer,
	"position" integer NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_steps_guide_id_anchor_unique" UNIQUE("guide_id","anchor"),
	CONSTRAINT "guide_steps_position_check" CHECK ("guide_steps"."position" >= 0),
	CONSTRAINT "guide_steps_edit_revision_check" CHECK ("guide_steps"."edit_revision" >= 0),
	CONSTRAINT "guide_steps_estimated_minutes_min_check" CHECK ("guide_steps"."estimated_minutes_min" is null or "guide_steps"."estimated_minutes_min" >= 0),
	CONSTRAINT "guide_steps_estimated_minutes_max_check" CHECK ("guide_steps"."estimated_minutes_max" is null or "guide_steps"."estimated_minutes_max" >= 0),
	CONSTRAINT "guide_steps_estimated_minutes_range_check" CHECK ("guide_steps"."estimated_minutes_min" is null or "guide_steps"."estimated_minutes_max" is null or "guide_steps"."estimated_minutes_max" >= "guide_steps"."estimated_minutes_min")
);
--> statement-breakpoint
CREATE TABLE "guide_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"achievement_set_id" uuid NOT NULL,
	"game_release_id" uuid,
	"difficulty_rating" smallint,
	"estimated_minutes_min" integer,
	"estimated_minutes_max" integer,
	"minimum_playthroughs" smallint,
	"has_missables" boolean,
	"requires_online" boolean,
	"difficulty_requirement" text,
	"supports_base_completion" boolean DEFAULT true NOT NULL,
	"supports_full_completion" boolean DEFAULT true NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_targets_difficulty_rating_check" CHECK ("guide_targets"."difficulty_rating" is null or "guide_targets"."difficulty_rating" between 1 and 10),
	CONSTRAINT "guide_targets_estimated_minutes_min_check" CHECK ("guide_targets"."estimated_minutes_min" is null or "guide_targets"."estimated_minutes_min" >= 0),
	CONSTRAINT "guide_targets_estimated_minutes_max_check" CHECK ("guide_targets"."estimated_minutes_max" is null or "guide_targets"."estimated_minutes_max" >= 0),
	CONSTRAINT "guide_targets_estimated_minutes_range_check" CHECK ("guide_targets"."estimated_minutes_min" is null or "guide_targets"."estimated_minutes_max" is null or "guide_targets"."estimated_minutes_max" >= "guide_targets"."estimated_minutes_min"),
	CONSTRAINT "guide_targets_minimum_playthroughs_check" CHECK ("guide_targets"."minimum_playthroughs" is null or "guide_targets"."minimum_playthroughs" >= 1),
	CONSTRAINT "guide_targets_edit_revision_check" CHECK ("guide_targets"."edit_revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "guide_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot_schema_version" smallint DEFAULT 1 NOT NULL,
	"changelog" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"source_draft_revision" bigint,
	"source_version_id" uuid,
	"published_by" uuid,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guide_versions_guide_id_version_number_unique" UNIQUE("guide_id","version_number"),
	CONSTRAINT "guide_versions_version_number_check" CHECK ("guide_versions"."version_number" >= 1),
	CONSTRAINT "guide_versions_snapshot_schema_version_check" CHECK ("guide_versions"."snapshot_schema_version" >= 1),
	CONSTRAINT "guide_versions_source_draft_revision_check" CHECK ("guide_versions"."source_draft_revision" is null or "guide_versions"."source_draft_revision" >= 0),
	CONSTRAINT "guide_versions_changelog_check" CHECK (length(trim("guide_versions"."changelog")) > 0),
	CONSTRAINT "guide_versions_source_xor_check" CHECK (("guide_versions"."source_draft_revision" is null) <> ("guide_versions"."source_version_id" is null))
);
--> statement-breakpoint
CREATE TABLE "guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"workflow_status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"published_version_id" uuid,
	"draft_revision" bigint DEFAULT 0 NOT NULL,
	"structure_revision" bigint DEFAULT 0 NOT NULL,
	"edit_revision" bigint DEFAULT 0 NOT NULL,
	"first_published_at" timestamp with time zone,
	"outdated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guides_game_id_slug_unique" UNIQUE("game_id","slug"),
	CONSTRAINT "guides_workflow_status_check" CHECK ("guides"."workflow_status" in ('draft', 'review')),
	CONSTRAINT "guides_draft_revision_check" CHECK ("guides"."draft_revision" >= 0),
	CONSTRAINT "guides_structure_revision_check" CHECK ("guides"."structure_revision" >= 0),
	CONSTRAINT "guides_edit_revision_check" CHECK ("guides"."edit_revision" >= 0),
	CONSTRAINT "guides_publication_consistency_check" CHECK ((
        ("guides"."published_version_id" is null and "guides"."first_published_at" is null)
        or
        ("guides"."published_version_id" is not null and "guides"."first_published_at" is not null)
      ))
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "profiles_username_lowercase_check" CHECK ("profiles"."username" = lower("profiles"."username")),
	CONSTRAINT "profiles_username_format_check" CHECK ("profiles"."username" ~ '^[a-z0-9_]{3,30}$')
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "user_roles_pk" PRIMARY KEY("user_id","role"),
	CONSTRAINT "user_roles_role_check" CHECK ("user_roles"."role" in ('author', 'editor', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_game_id" uuid,
	"storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"checksum_sha256" text,
	"source_url" text,
	"credit" text,
	"created_by" uuid,
	"first_published_at" timestamp with time zone,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "media_assets_byte_size_check" CHECK ("media_assets"."byte_size" > 0),
	CONSTRAINT "media_assets_width_check" CHECK ("media_assets"."width" is null or "media_assets"."width" > 0),
	CONSTRAINT "media_assets_height_check" CHECK ("media_assets"."height" is null or "media_assets"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "user_achievement_progress" (
	"user_completion_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"earned_at" timestamp with time zone,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievement_progress_pk" PRIMARY KEY("user_completion_id","achievement_id"),
	CONSTRAINT "user_achievement_progress_source_check" CHECK ("user_achievement_progress"."source" in ('manual', 'playstation', 'xbox', 'steam', 'admin', 'other'))
);
--> statement-breakpoint
CREATE TABLE "user_checklist_progress" (
	"user_guide_progress_id" uuid NOT NULL,
	"checklist_item_id" uuid NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_checklist_progress_pk" PRIMARY KEY("user_guide_progress_id","checklist_item_id")
);
--> statement-breakpoint
CREATE TABLE "user_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_set_id" uuid NOT NULL,
	"goal" text DEFAULT 'base' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"base_completed_at" timestamp with time zone,
	"full_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_completions_user_set_unique" UNIQUE("user_id","achievement_set_id"),
	CONSTRAINT "user_completions_goal_check" CHECK ("user_completions"."goal" in ('base', 'full'))
);
--> statement-breakpoint
CREATE TABLE "user_guide_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guide_target_id" uuid NOT NULL,
	"achievement_set_id" uuid NOT NULL,
	"user_completion_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone NOT NULL,
	"last_step_id" uuid,
	"last_section_id" uuid,
	"last_content_node_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_guide_progress_user_target_unique" UNIQUE("user_id","guide_target_id")
);
--> statement-breakpoint
ALTER TABLE "achievement_groups" ADD CONSTRAINT "achievement_groups_achievement_set_id_achievement_sets_id_fk" FOREIGN KEY ("achievement_set_id") REFERENCES "public"."achievement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_groups" ADD CONSTRAINT "achievement_groups_content_pack_id_content_packs_id_fk" FOREIGN KEY ("content_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_sets" ADD CONSTRAINT "achievement_sets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_achievement_group_id_achievement_groups_id_fk" FOREIGN KEY ("achievement_group_id") REFERENCES "public"."achievement_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_packs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_releases" ADD CONSTRAINT "game_releases_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_releases" ADD CONSTRAINT "game_releases_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_achievement_sets" ADD CONSTRAINT "release_achievement_sets_game_release_id_game_releases_id_fk" FOREIGN KEY ("game_release_id") REFERENCES "public"."game_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_achievement_sets" ADD CONSTRAINT "release_achievement_sets_achievement_set_id_achievement_sets_id_fk" FOREIGN KEY ("achievement_set_id") REFERENCES "public"."achievement_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_achievements" ADD CONSTRAINT "checklist_item_achievements_checklist_item_id_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_achievements" ADD CONSTRAINT "checklist_item_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_content_node_id_guide_content_nodes_id_fk" FOREIGN KEY ("content_node_id") REFERENCES "public"."guide_content_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_content_node_achievements" ADD CONSTRAINT "guide_content_node_achievements_content_node_id_guide_content_nodes_id_fk" FOREIGN KEY ("content_node_id") REFERENCES "public"."guide_content_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_content_node_achievements" ADD CONSTRAINT "guide_content_node_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_content_node_targets" ADD CONSTRAINT "guide_content_node_targets_content_node_id_guide_content_nodes_id_fk" FOREIGN KEY ("content_node_id") REFERENCES "public"."guide_content_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_content_node_targets" ADD CONSTRAINT "guide_content_node_targets_guide_target_id_guide_targets_id_fk" FOREIGN KEY ("guide_target_id") REFERENCES "public"."guide_targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_content_nodes" ADD CONSTRAINT "guide_content_nodes_guide_section_id_guide_sections_id_fk" FOREIGN KEY ("guide_section_id") REFERENCES "public"."guide_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_sections" ADD CONSTRAINT "guide_sections_guide_step_id_guide_steps_id_fk" FOREIGN KEY ("guide_step_id") REFERENCES "public"."guide_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_steps" ADD CONSTRAINT "guide_steps_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_targets" ADD CONSTRAINT "guide_targets_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_targets" ADD CONSTRAINT "guide_targets_achievement_set_id_achievement_sets_id_fk" FOREIGN KEY ("achievement_set_id") REFERENCES "public"."achievement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_targets" ADD CONSTRAINT "guide_targets_game_release_id_game_releases_id_fk" FOREIGN KEY ("game_release_id") REFERENCES "public"."game_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_versions" ADD CONSTRAINT "guide_versions_guide_id_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."guides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_versions" ADD CONSTRAINT "guide_versions_source_version_id_guide_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guide_versions" ADD CONSTRAINT "guide_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guides" ADD CONSTRAINT "guides_published_version_id_guide_versions_id_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."guide_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_scope_game_id_games_id_fk" FOREIGN KEY ("scope_game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_user_completion_id_user_completions_id_fk" FOREIGN KEY ("user_completion_id") REFERENCES "public"."user_completions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievement_progress" ADD CONSTRAINT "user_achievement_progress_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_checklist_progress" ADD CONSTRAINT "user_checklist_progress_user_guide_progress_id_user_guide_progress_id_fk" FOREIGN KEY ("user_guide_progress_id") REFERENCES "public"."user_guide_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_checklist_progress" ADD CONSTRAINT "user_checklist_progress_checklist_item_id_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."checklist_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_completions" ADD CONSTRAINT "user_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_completions" ADD CONSTRAINT "user_completions_achievement_set_id_achievement_sets_id_fk" FOREIGN KEY ("achievement_set_id") REFERENCES "public"."achievement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_guide_target_id_guide_targets_id_fk" FOREIGN KEY ("guide_target_id") REFERENCES "public"."guide_targets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_achievement_set_id_achievement_sets_id_fk" FOREIGN KEY ("achievement_set_id") REFERENCES "public"."achievement_sets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_user_completion_id_user_completions_id_fk" FOREIGN KEY ("user_completion_id") REFERENCES "public"."user_completions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_last_step_id_guide_steps_id_fk" FOREIGN KEY ("last_step_id") REFERENCES "public"."guide_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_last_section_id_guide_sections_id_fk" FOREIGN KEY ("last_section_id") REFERENCES "public"."guide_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_guide_progress" ADD CONSTRAINT "user_guide_progress_last_content_node_id_guide_content_nodes_id_fk" FOREIGN KEY ("last_content_node_id") REFERENCES "public"."guide_content_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_groups_one_base_per_set_unique" ON "achievement_groups" USING btree ("achievement_set_id") WHERE "achievement_groups"."type" = 'base';--> statement-breakpoint
CREATE INDEX "achievement_groups_achievement_set_id_idx" ON "achievement_groups" USING btree ("achievement_set_id");--> statement-breakpoint
CREATE INDEX "achievement_groups_content_pack_id_idx" ON "achievement_groups" USING btree ("content_pack_id");--> statement-breakpoint
CREATE INDEX "achievement_sets_game_id_idx" ON "achievement_sets" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "achievements_achievement_group_id_idx" ON "achievements" USING btree ("achievement_group_id");--> statement-breakpoint
CREATE INDEX "content_packs_game_id_idx" ON "content_packs" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_releases_game_id_idx" ON "game_releases" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_releases_platform_id_idx" ON "game_releases" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "release_achievement_sets_achievement_set_id_idx" ON "release_achievement_sets" USING btree ("achievement_set_id");--> statement-breakpoint
CREATE INDEX "checklist_item_achievements_achievement_id_idx" ON "checklist_item_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "guide_content_node_achievements_achievement_id_idx" ON "guide_content_node_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "guide_content_node_targets_guide_target_id_idx" ON "guide_content_node_targets" USING btree ("guide_target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_content_nodes_active_position_unique" ON "guide_content_nodes" USING btree ("guide_section_id","position") WHERE "guide_content_nodes"."retired_at" is null;--> statement-breakpoint
CREATE INDEX "guide_content_nodes_guide_section_id_idx" ON "guide_content_nodes" USING btree ("guide_section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_sections_active_position_unique" ON "guide_sections" USING btree ("guide_step_id","position") WHERE "guide_sections"."retired_at" is null;--> statement-breakpoint
CREATE INDEX "guide_sections_guide_step_id_idx" ON "guide_sections" USING btree ("guide_step_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_steps_active_position_unique" ON "guide_steps" USING btree ("guide_id","position") WHERE "guide_steps"."retired_at" is null;--> statement-breakpoint
CREATE INDEX "guide_steps_guide_id_idx" ON "guide_steps" USING btree ("guide_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_targets_general_identity_unique" ON "guide_targets" USING btree ("guide_id","achievement_set_id") WHERE "guide_targets"."game_release_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "guide_targets_specific_identity_unique" ON "guide_targets" USING btree ("guide_id","achievement_set_id","game_release_id") WHERE "guide_targets"."game_release_id" is not null;--> statement-breakpoint
CREATE INDEX "guide_targets_guide_id_idx" ON "guide_targets" USING btree ("guide_id");--> statement-breakpoint
CREATE INDEX "guide_targets_achievement_set_id_idx" ON "guide_targets" USING btree ("achievement_set_id");--> statement-breakpoint
CREATE INDEX "guide_targets_game_release_id_idx" ON "guide_targets" USING btree ("game_release_id");--> statement-breakpoint
CREATE INDEX "guide_versions_source_version_id_idx" ON "guide_versions" USING btree ("source_version_id");--> statement-breakpoint
CREATE INDEX "guides_game_id_idx" ON "guides" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "guides_published_version_id_idx" ON "guides" USING btree ("published_version_id");--> statement-breakpoint
CREATE INDEX "guides_public_game_id_idx" ON "guides" USING btree ("game_id") WHERE "guides"."published_version_id" is not null and "guides"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "media_assets_scope_game_id_idx" ON "media_assets" USING btree ("scope_game_id");--> statement-breakpoint
CREATE INDEX "user_achievement_progress_completion_id_idx" ON "user_achievement_progress" USING btree ("user_completion_id");--> statement-breakpoint
CREATE INDEX "user_achievement_progress_achievement_id_idx" ON "user_achievement_progress" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX "user_checklist_progress_guide_progress_id_idx" ON "user_checklist_progress" USING btree ("user_guide_progress_id");--> statement-breakpoint
CREATE INDEX "user_checklist_progress_checklist_item_id_idx" ON "user_checklist_progress" USING btree ("checklist_item_id");--> statement-breakpoint
CREATE INDEX "user_completions_user_id_idx" ON "user_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_completions_achievement_set_id_idx" ON "user_completions" USING btree ("achievement_set_id");--> statement-breakpoint
CREATE INDEX "user_guide_progress_user_id_idx" ON "user_guide_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_guide_progress_guide_target_id_idx" ON "user_guide_progress" USING btree ("guide_target_id");--> statement-breakpoint
CREATE INDEX "user_guide_progress_achievement_set_id_idx" ON "user_guide_progress" USING btree ("achievement_set_id");--> statement-breakpoint
CREATE INDEX "user_guide_progress_completion_id_idx" ON "user_guide_progress" USING btree ("user_completion_id");--> statement-breakpoint
CREATE INDEX "user_guide_progress_last_activity_at_idx" ON "user_guide_progress" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "user_guide_progress_user_activity_idx" ON "user_guide_progress" USING btree ("user_id","last_activity_at" DESC NULLS LAST);