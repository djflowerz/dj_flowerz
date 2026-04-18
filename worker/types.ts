export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  PROFILES_BUCKET: R2Bucket;
  KV: KVNamespace;
  AI: any;
  ADMIN_HUB: DurableObjectNamespace;
  PUBLIC_R2_DOMAIN: string;
  VITE_ADMIN_EMAIL: string;
  VITE_APP_URL: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  is_marketplace: number;
  price: number;
  escrow_status: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
  author_role: string;
  // Computed fields
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
}

export interface CommunityFollow {
  id: string;
  follower_id: string;
  following_id: string;
  following_name: string;
  following_avatar: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  role: string;
  bio?: string;
  location?: string;
  is_subscriber: number;
}
