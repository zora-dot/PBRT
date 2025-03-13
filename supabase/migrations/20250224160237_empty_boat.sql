/*
  # Fix Authentication Functions Implementation

  1. Changes
    - Add function to check user credentials by username or email
    - Add function to verify user existence
    - Properly handle case sensitivity
    - Add better error handling
    - Use Supabase's native auth functions

  2. Security
    - Proper schema isolation
    - Explicit permission grants
    - Secure password handling
*/

-- Drop any existing functions to avoid conflicts
DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS check_login_exists(TEXT);

-- Create function to check if login exists
CREATE OR REPLACE FUNCTION check_login_exists(
  p_login TEXT
)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_email TEXT,
  user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT id, email
  INTO v_user_id, v_email
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_login)
  AND deleted_at IS NULL;

  -- If not found by email, try username (case insensitive)
  IF v_user_id IS NULL THEN
    SELECT u.id, u.email, p.username
    INTO v_user_id, v_email, v_username
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(p_login)
    AND u.deleted_at IS NULL;
  ELSE
    -- Get username for email user
    SELECT username INTO v_username
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  RETURN QUERY
  SELECT 
    v_user_id IS NOT NULL,
    v_email,
    v_username;
END;
$$;

-- Create function to authenticate user
CREATE OR REPLACE FUNCTION authenticate_user(
  p_login TEXT,
  p_password TEXT
)
RETURNS TABLE (
  session_token TEXT,
  user_id UUID,
  email TEXT,
  username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_result RECORD;
BEGIN
  -- First try to find user by email
  SELECT id, email
  INTO v_user_id, v_email
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_login)
  AND deleted_at IS NULL;

  -- If not found by email, try username
  IF v_user_id IS NULL THEN
    SELECT u.id, u.email
    INTO v_user_id, v_email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(p_login)
    AND u.deleted_at IS NULL;
  END IF;

  -- If user found, attempt to sign in
  IF v_user_id IS NOT NULL THEN
    -- Get username
    SELECT username INTO v_username
    FROM public.profiles
    WHERE id = v_user_id;

    -- Use Supabase's native auth to sign in
    v_result := auth.sign_in_with_password(
      email := v_email,
      password := p_password
    );

    -- Return session info if successful
    IF v_result.session_token IS NOT NULL THEN
      RETURN QUERY
      SELECT 
        v_result.session_token::TEXT,
        v_user_id,
        v_email,
        v_username;
    END IF;
  END IF;
END;
$$;

-- Create optimized indexes for lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lookup 
ON auth.users(LOWER(email)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lookup 
ON public.profiles(LOWER(username));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_login_exists(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_login_exists IS 
'Checks if a username or email exists in the system and returns user details';

COMMENT ON FUNCTION authenticate_user IS 
'Authenticates a user by username or email using Supabase native auth';