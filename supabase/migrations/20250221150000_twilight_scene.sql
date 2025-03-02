/*
  # User Management and Rate Limiting

  1. Changes
    - Add automatic deletion of unverified users after 24 hours
    - Modify profile creation to only occur after email verification
    - Add paste rate limiting functionality
    - Add required extensions and functions

  2. Security
    - All functions are marked as SECURITY DEFINER
    - Proper error handling and validation
    - Rate limiting based on subscription tier
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Function to delete unverified users after 24 hours
CREATE OR REPLACE FUNCTION delete_unverified_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users
  WHERE email_confirmed_at IS NULL
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Schedule the cleanup job (runs every hour)
SELECT cron.schedule(
  'delete-unverified-users',
  '0 * * * *',
  $$SELECT delete_unverified_users()$$
);

-- Function to check paste rate limit
CREATE OR REPLACE FUNCTION check_paste_rate_limit(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_supporter boolean;
  paste_count int;
  max_pastes int;
  cooldown_period interval;
BEGIN
  -- Get user's subscription status
  SELECT subscription_tier = 'SUPPORTER' INTO is_supporter
  FROM profiles
  WHERE id = user_id;

  -- Set limits based on subscription
  IF is_supporter THEN
    max_pastes := 250;
    cooldown_period := INTERVAL '1 second';
  ELSE
    max_pastes := 25;
    cooldown_period := INTERVAL '30 seconds';
  END IF;

  -- Check recent paste creation
  SELECT COUNT(*) INTO paste_count
  FROM pastes
  WHERE pastes.user_id = check_paste_rate_limit.user_id
  AND created_at > NOW() - cooldown_period;

  RETURN paste_count < max_pastes;
END;
$$;

-- Function to enforce paste rate limit
CREATE OR REPLACE FUNCTION enforce_paste_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT check_paste_rate_limit(NEW.user_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before creating another paste.';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting
DROP TRIGGER IF EXISTS check_paste_rate_limit ON pastes;
CREATE TRIGGER check_paste_rate_limit
  BEFORE INSERT ON pastes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_paste_rate_limit();

-- Update handle_new_user trigger to only create profile after email verification
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if email is verified
  IF new.email_confirmed_at IS NOT NULL THEN
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
  END IF;

  RETURN new;
END;
$$;