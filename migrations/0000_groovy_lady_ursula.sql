CREATE TABLE `admin_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`admin_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `blackouts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`reason` text DEFAULT 'Gig Confirmed',
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `coupon_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_code` text,
	`user_id` text,
	`order_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`coupon_code`) REFERENCES `coupons`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`code` text PRIMARY KEY NOT NULL,
	`description` text,
	`scope` text DEFAULT 'all',
	`discount_type` text NOT NULL,
	`discount_value` real NOT NULL,
	`min_spend` real DEFAULT 0,
	`expiry_date` text,
	`usage_limit` integer,
	`is_one_time_per_user` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`created_by_ref_user_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `event_gigs` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`event_date` text NOT NULL,
	`location` text,
	`description` text,
	`status` text DEFAULT 'confirmed',
	`deposit_received` real DEFAULT 0,
	`paystack_ref` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_name_unique` ON `genres` (`name`);--> statement-breakpoint
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
	`play_count` integer DEFAULT 0,
	`download_count` integer DEFAULT 0,
	`required_tier` text DEFAULT 'free',
	`tags` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `newsletter_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`target_audience` text,
	`sent_count` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
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
	`paystack_ref` text,
	`items` text NOT NULL,
	`shipping_address` text,
	`city` text,
	`phone_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`customer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`customer_email` text,
	`amount_kes` real NOT NULL,
	`currency` text DEFAULT 'KES',
	`status` text DEFAULT 'success',
	`method` text,
	`verified_sig` integer DEFAULT false,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
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
	`supabase_id` text,
	`is_subscriber` integer DEFAULT false,
	`subscription_plan` text,
	`subscription_expiry` text,
	`has_used_trial` integer DEFAULT false,
	`referral_code` text,
	`referral_by` text,
	`referral_balance` real DEFAULT 0,
	`referral_earned_days` integer DEFAULT 0,
	`balance` real DEFAULT 0,
	`daily_download_count` integer DEFAULT 0,
	`last_download_reset` text,
	`last_ip` text,
	`device_fingerprint` text,
	`last_login` text,
	`presence_status` text DEFAULT 'offline',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_email_unique` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer_id` text,
	`referred_id` text,
	`status` text DEFAULT 'pending',
	`reward_amount` real DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`referrer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referred_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `studio_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`session_date` text NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`total_amount` real,
	`paystack_ref` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`full_name` text,
	`tags` text,
	`status` text DEFAULT 'active',
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`price` real NOT NULL,
	`duration_days` integer NOT NULL,
	`features` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`customer_name` text,
	`customer_email` text,
	`customer_phone` text,
	`subject` text NOT NULL,
	`message_content` text NOT NULL,
	`source` text DEFAULT 'web',
	`status` text DEFAULT 'open',
	`priority` text DEFAULT 'normal',
	`admin_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `track_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text,
	`version_name` text,
	`file_url` text,
	`download_url` text,
	`file_size` text,
	`format` text DEFAULT 'mp3',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`genre` text,
	`sub_genre` text,
	`bpm` integer,
	`key` text,
	`release_date` text,
	`cover_url` text,
	`audio_url` text,
	`download_url` text,
	`duration` text,
	`is_featured` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`tags` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
