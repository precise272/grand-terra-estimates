CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`company` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`billing_address` text DEFAULT '' NOT NULL,
	`site_address` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_clients_owner_name` ON `clients` (`owner`,`name`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`client_id` text,
	`kind` text NOT NULL,
	`number` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`province` text DEFAULT 'ON' NOT NULL,
	`tax_rate` integer DEFAULT 13000 NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`deposit_cents` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`items_json` text DEFAULT '[]' NOT NULL,
	`client_snapshot_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_documents_owner_updated` ON `documents` (`owner`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_documents_owner_client` ON `documents` (`owner`,`client_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`document_id` text NOT NULL,
	`key` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_photos_owner_document` ON `photos` (`owner`,`document_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'Grand Terra Group of Companies' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`tax_number` text DEFAULT '' NOT NULL,
	`payment_instructions` text DEFAULT '' NOT NULL,
	`default_terms` text DEFAULT '' NOT NULL,
	`province` text DEFAULT 'ON' NOT NULL
);
