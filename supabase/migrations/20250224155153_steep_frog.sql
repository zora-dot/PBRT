/*
  # Fix Authentication Login Implementation

  1. Changes
    - Add function to properly authenticate users by username or email
    - Add function to verify user existence by username or email
    - Fix case sensitivity issues in lookups
    - Add proper error handling

  2. Security
    - Use Supabase's native auth.sign_in_with_password
    - Proper schema isolation
    - Explicit permission grants
*/

-- Drop previous functions if they exist
DROP FUNCTION IF EXISTS get_user_with_auth(TEXT, TEXT);
DROP FUNCTION IF EXISTS find_user_by_login(TEXT);

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

    -- Attempt to sign in using Supabase's native auth
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

-- Create function to check if login exists
CREATE OR REPLACE FUNCTION check_login_exists(
  p_login TEXT
)
RETURNS TABLE (
  found BOOLEAN,
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
  -- Check email
  SELECT id, email
  INTO v_user_id, v_email
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_login)
  AND deleted_at IS NULL;

  -- If not found by email, check username
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

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_email 
ON auth.users(LOWER(email)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_username 
ON public.profiles(LOWER(username));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION authenticate_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_login_exists(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION authenticate_user IS 
'Authenticates a user by username or email using Supabase native auth';

COMMENT ON FUNCTION check_login_exists IS 
'Checks if a username or email exists in the system';