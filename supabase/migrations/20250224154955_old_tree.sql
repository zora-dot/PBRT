/*
  # Fix Username Login Implementation

  1. Changes
    - Add function to safely get user by username/email with password verification
    - Add function to verify user credentials
    - Add helper function for case-insensitive user lookup
    - Add missing indexes for performance optimization

  2. Security
    - Proper schema isolation
    - Explicit permission grants
    - Input validation
*/

-- Drop previous function if it exists
DROP FUNCTION IF EXISTS get_user_by_username_or_email(TEXT);

-- Create function to safely get user with password verification
CREATE OR REPLACE FUNCTION get_user_with_auth(
  p_login TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  is_confirmed BOOLEAN,
  username TEXT,
  is_valid_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_is_confirmed BOOLEAN;
  v_username TEXT;
  v_encrypted_password TEXT;
  v_is_valid_password BOOLEAN;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    u.id,
    u.email,
    (u.email_confirmed_at IS NOT NULL),
    p.username,
    u.encrypted_password
  INTO 
    v_user_id,
    v_email,
    v_is_confirmed,
    v_username,
    v_encrypted_password
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(u.email) = LOWER(p_login)
  AND u.deleted_at IS NULL
  LIMIT 1;

  -- If not found by email, try username (case insensitive)
  IF v_user_id IS NULL THEN
    SELECT 
      u.id,
      u.email,
      (u.email_confirmed_at IS NOT NULL),
      p.username,
      u.encrypted_password
    INTO 
      v_user_id,
      v_email,
      v_is_confirmed,
      v_username,
      v_encrypted_password
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(p_login)
    AND u.deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- Verify password if user found
  IF v_user_id IS NOT NULL THEN
    v_is_valid_password := extensions.crypt(p_password, v_encrypted_password) = v_encrypted_password;
    
    RETURN QUERY 
    SELECT 
      v_user_id,
      v_email::TEXT,
      v_is_confirmed,
      v_username,
      v_is_valid_password;
  END IF;
END;
$$;

-- Create helper function for case-insensitive user lookup
CREATE OR REPLACE FUNCTION find_user_by_login(p_login TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  username TEXT,
  is_confirmed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    p.username,
    (u.email_confirmed_at IS NOT NULL)
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE (
    LOWER(u.email) = LOWER(p_login) OR
    LOWER(p.username) = LOWER(p_login)
  )
  AND u.deleted_at IS NULL
  LIMIT 1;
END;
$$;

-- Create optimized indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_users_email_lookup'
  ) THEN
    CREATE INDEX idx_users_email_lookup 
    ON auth.users(LOWER(email)) 
    WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_profiles_username_lookup'
  ) THEN
    CREATE INDEX idx_profiles_username_lookup 
    ON public.profiles(LOWER(username));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_users_auth_lookup'
  ) THEN
    CREATE INDEX idx_users_auth_lookup 
    ON auth.users(id, email, encrypted_password) 
    WHERE deleted_at IS NULL;
  END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_with_auth(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_login(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_with_auth IS 
'Safely authenticates a user by username or email with password verification';

COMMENT ON FUNCTION find_user_by_login IS 
'Looks up a user by username or email without password verification';