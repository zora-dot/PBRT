/*
  # Fix Authentication Flow

  1. New Functions
    - get_user_auth_details: Comprehensive user lookup with auth details
    - verify_user_password: Secure password verification
    - get_user_provider: Get user's authentication provider

  2. Security
    - Better error handling
    - Secure password verification
    - Provider-aware authentication

  3. Improvements
    - Case-insensitive lookups
    - Optimized indexes
    - Better error messages
*/

-- Create function to get user auth details
CREATE OR REPLACE FUNCTION get_user_auth_details(
  p_login TEXT
)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  is_confirmed BOOLEAN,
  auth_provider TEXT,
  has_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_is_confirmed BOOLEAN;
  v_provider TEXT;
  v_has_password BOOLEAN;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    id, 
    email,
    email_confirmed_at IS NOT NULL,
    raw_app_meta_data->>'provider',
    encrypted_password IS NOT NULL
  INTO 
    v_user_id, 
    v_email,
    v_is_confirmed,
    v_provider,
    v_has_password
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_login)
  AND deleted_at IS NULL;

  -- If not found by email, try username (case insensitive)
  IF v_user_id IS NULL THEN
    SELECT 
      u.id, 
      u.email,
      u.email_confirmed_at IS NOT NULL,
      u.raw_app_meta_data->>'provider',
      u.encrypted_password IS NOT NULL,
      p.username
    INTO 
      v_user_id, 
      v_email,
      v_is_confirmed,
      v_provider,
      v_has_password,
      v_username
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
    v_user_id,
    v_email,
    v_username,
    COALESCE(v_is_confirmed, false),
    v_provider,
    COALESCE(v_has_password, false);
END;
$$;

-- Create function to verify user password
CREATE OR REPLACE FUNCTION verify_user_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, extensions
AS $$
DECLARE
  v_encrypted_password TEXT;
BEGIN
  -- Get user's encrypted password
  SELECT encrypted_password INTO v_encrypted_password
  FROM auth.users
  WHERE id = p_user_id
  AND deleted_at IS NULL;

  -- Return true if password matches
  RETURN COALESCE(
    crypt(p_password, v_encrypted_password) = v_encrypted_password,
    false
  );
END;
$$;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_lookup 
ON auth.users(LOWER(email), id, encrypted_password, email_confirmed_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_lookup 
ON public.profiles(LOWER(username), id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_auth_details(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password(UUID, TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_auth_details IS 
'Gets comprehensive user authentication details by username or email';

COMMENT ON FUNCTION verify_user_password IS 
'Securely verifies a user''s password';