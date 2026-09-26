CREATE TABLE `catalog_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`unit` text DEFAULT 'each' NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`taxable` integer DEFAULT true NOT NULL,
	`items_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_owner_kind_name` ON `catalog_entries` (`owner`,`kind`,`name`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`signature` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `settings` ADD `logo_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `accent_color` text DEFAULT '#183f8f' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `secondary_color` text DEFAULT '#d8b36a' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `document_style` text DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `footer_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `estimate_prefix` text DEFAULT 'EST' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `invoice_prefix` text DEFAULT 'INV' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `email_subject` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `email_message` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `preferences_json` text DEFAULT '{}' NOT NULL;