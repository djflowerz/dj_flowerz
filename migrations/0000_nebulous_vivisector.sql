CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`user_name` text,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`rating` integer,
	`status` text DEFAULT 'approved',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mixtapes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`cover_url` text,
	`audio_url` text,
	`video_url` text,
	`duration` text,
	`release_date` text,
	`category` text,
	`is_featured` integer DEFAULT false,
	`show_in_gallery` integer DEFAULT true,
	`show_in_music_pool` integer DEFAULT false,
	`stream_count` integer DEFAULT 0,
	`download_count` integer DEFAULT 0,
	`required_tier` text DEFAULT 'free',
	`tags` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`customer_email` text,
	`customer_name` text,
	`total_amount` real NOT NULL,
	`status` text DEFAULT 'pending',
	`payment_status` text DEFAULT 'pending',
	`payment_method` text,
	`reference_code` text,
	`items` text NOT NULL,
	`shipping_address` text,
	`city` text,
	`phone_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`currency` text DEFAULT 'KES',
	`category` text,
	`image` text,
	`images` text,
	`stock` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`rating` real DEFAULT 0,
	`reviews_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`role` text DEFAULT 'user',
	`avatar_url` text,
	`phone_number` text,
	`is_subscriber` integer DEFAULT false,
	`subscription_plan` text,
	`subscription_expiry` text,
	`has_used_trial` integer DEFAULT false,
	`referral_code` text,
	`referred_by` text,
	`balance` real DEFAULT 0,
	`last_login` text,
	`presence_status` text DEFAULT 'offline',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);