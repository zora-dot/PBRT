/*
  # Initial Schema Setup

  1. Tables
    - profiles
      - User profiles with authentication and preferences
    - pastes
      - Main pastes table for storing content
    - folders
      - Folders for organizing pastes
    - comments
      - Comments on pastes
    - favorites
      - User paste favorites
    - likes
      - User paste likes
    - follows
      - User follow relationships
    - notifications
      - User notifications
    - drafts
      - Temporary draft storage
    - shortened_urls
      - URL shortener for pastes
    - stripe_customers
      - Stripe customer data

  2. Views
    - paste_details
      - Combined view for paste data with user info

  3. Functions
    - hash_paste_password()
    - verify_paste_password()
    - increment_short_url_clicks()
    - process_stripe_webhook()

  4. Triggers
    - handle_new_user
    - handle_deleted_user
    - handle_notifications
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create tables in correct dependency order
-- 1. Profiles (depends on auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  subscription_tier text DEFAULT 'FREE',
  subscription_expires_at timestamptz,
  username_color text DEFAULT '#000000',
  username_bold boolean DEFAULT false,
  username_italic boolean DEFAULT false,
  username_underline boolean DEFAULT false
);

-- 2. Folders (depends on profiles)
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 3. Pastes (depends on profiles and folders)
CREATE TABLE IF NOT EXISTS pastes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_public boolean DEFAULT true,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  password_hash text,
  deleted_at timestamptz,
  restore_folder_id uuid REFERENCES folders(id),
  custom_url text UNIQUE,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', content), 'B')
  ) STORED
);

-- 4. Comments (depends on profiles and pastes)
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Favorites (depends on profiles and pastes)
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, paste_id)
);

-- 6. Likes (depends on profiles, pastes, and comments)
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (paste_id IS NOT NULL AND comment_id IS NULL) OR
    (paste_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE(user_id, paste_id),
  UNIQUE(user_id, comment_id)
);

-- 7. Follows (depends on profiles)
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 8. Notifications (depends on profiles, pastes, and comments)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('like', 'favorite', 'follow', 'comment')),
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 9. Drafts (depends on profiles)
CREATE TABLE IF NOT EXISTS drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  content text NOT NULL,
  last_modified timestamptz DEFAULT now(),
  is_auto_saved boolean DEFAULT false
);

-- 10. Shortened URLs (depends on pastes)
CREATE TABLE IF NOT EXISTS shortened_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paste_id uuid REFERENCES pastes(id) ON DELETE CASCADE NOT NULL,
  short_id text UNIQUE NOT NULL,
  full_original_url text NOT NULL,
  full_short_url text NOT NULL,
  clicks bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 11. Stripe customers (depends on profiles)
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id text UNIQUE NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS pastes_search_idx ON pastes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS pastes_user_id_idx ON pastes(user_id);
CREATE INDEX IF NOT EXISTS pastes_folder_id_idx ON pastes(folder_id);
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id);
CREATE INDEX IF NOT EXISTS favorites_paste_id_idx ON favorites(paste_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS likes_paste_id_idx ON likes(paste_id);
CREATE INDEX IF NOT EXISTS likes_comment_id_idx ON likes(comment_id);
CREATE INDEX IF NOT EXISTS comments_paste_id_idx ON comments(paste_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS drafts_user_id_idx ON drafts(user_id);
CREATE INDEX IF NOT EXISTS shortened_urls_paste_id_idx ON shortened_urls(paste_id);
CREATE INDEX IF NOT EXISTS shortened_urls_short_id_idx ON shortened_urls(short_id);

-- Create paste_details view
CREATE OR REPLACE VIEW paste_details AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url,
  f.name AS folder_name,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(fav.favorites_count, 0) AS favorites_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM pastes p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN folders f ON p.folder_id = f.id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS likes_count
  FROM likes
  WHERE paste_id IS NOT NULL
  GROUP BY paste_id
) l ON p.id = l.paste_id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS favorites_count
  FROM favorites
  GROUP BY paste_id
) fav ON p.id = fav.paste_id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS comments_count
  FROM comments
  GROUP BY paste_id
) c ON p.id = c.paste_id;

-- Create functions
CREATE OR REPLACE FUNCTION hash_paste_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

CREATE OR REPLACE FUNCTION verify_paste_password(paste_id uuid, password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM pastes
  WHERE id = paste_id;
  
  RETURN stored_hash = crypt(password, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION increment_short_url_clicks(paste_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE shortened_urls
  SET clicks = clicks + 1
  WHERE paste_id = paste_id_param;
END;
$$;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastes ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortened_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Public pastes are viewable by everyone"
ON pastes FOR SELECT
TO public
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own pastes"
ON pastes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pastes"
ON pastes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pastes"
ON pastes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create triggers
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      'user_' || substr(new.id::text, 1, 8)
    )
  );

  -- Create "All Pastes" folder for new user
  INSERT INTO folders (user_id, name)
  VALUES (new.id, 'All Pastes');

  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete user's profile and all related data
  DELETE FROM profiles WHERE id = old.id;
  RETURN old;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_deleted_user();

CREATE OR REPLACE FUNCTION handle_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Handle likes
    IF NEW.paste_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, actor_id, type, paste_id)
      SELECT p.user_id, NEW.user_id, 'like', NEW.paste_id
      FROM pastes p
      WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
    END IF;

    -- Handle comments
    IF TG_TABLE_NAME = 'comments' THEN
      INSERT INTO notifications (user_id, actor_id, type, paste_id, comment_id)
      SELECT p.user_id, NEW.user_id, 'comment', NEW.paste_id, NEW.id
      FROM pastes p
      WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
    END IF;

    -- Handle follows
    IF TG_TABLE_NAME = 'follows' THEN
      INSERT INTO notifications (user_id, actor_id, type)
      VALUES (NEW.following_id, NEW.follower_id, 'follow');
    END IF;

    -- Handle favorites
    IF TG_TABLE_NAME = 'favorites' THEN
      INSERT INTO notifications (user_id, actor_id, type, paste_id)
      SELECT p.user_id, NEW.user_id, 'favorite', NEW.paste_id
      FROM pastes p
      WHERE p.id = NEW.paste_id AND p.user_id != NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_notifications();

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_notifications();

CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_notifications();

CREATE TRIGGER on_favorite_created
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION handle_notifications();