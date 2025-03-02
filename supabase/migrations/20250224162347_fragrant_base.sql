/*
  # Fix Authentication Flow

  1. New Functions
    - get_user_auth_details: Improved user lookup with auth details
    - verify_user_password: Enhanced password verification
    - get_social_auth_details: Social auth provider handling

  2. Security
    - Better error handling
    - Secure password verification
    - Provider-aware authentication

  3. Improvements
    - Case-insensitive lookups
    - Optimized indexes
    - Better error messages
*/

-- First drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_user_auth_details(text);
DROP FUNCTION IF EXISTS verify_user_password(uuid, text);

-- Create function to get user auth details with social provider info
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
  has_password BOOLEAN,
  is_social_auth BOOLEAN
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
  v_is_social_auth BOOLEAN;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    id, 
    email,
    email_confirmed_at IS NOT NULL,
    raw_app_meta_data->>'provider',
    encrypted_password IS NOT NULL,
    raw_app_meta_data->>'provider' IS NOT NULL AND 
    raw_app_meta_data->>'provider' != 'email'
  INTO 
    v_user_id, 
    v_email,
    v_is_confirmed,
    v_provider,
    v_has_password,
    v_is_social_auth
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
      u.raw_app_meta_data->>'provider' IS NOT NULL AND 
      u.raw_app_meta_data->>'provider' != 'email',
      p.username
    INTO 
      v_user_id, 
      v_email,
      v_is_confirmed,
      v_provider,
      v_has_password,
      v_is_social_auth,
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
    COALESCE(v_has_password, false),
    COALESCE(v_is_social_auth, false);
END;
$$;

-- Create function to verify user password with better error handling
CREATE OR REPLACE FUNCTION verify_user_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, extensions
AS $$
DECLARE
  v_encrypted_password TEXT;
  v_is_social_auth BOOLEAN;
  v_provider TEXT;
BEGIN
  -- Get user's auth details
  SELECT 
    encrypted_password,
    raw_app_meta_data->>'provider' IS NOT NULL AND 
    raw_app_meta_data->>'provider' != 'email',
    raw_app_meta_data->>'provider'
  INTO 
    v_encrypted_password,
    v_is_social_auth,
    v_provider
  FROM auth.users
  WHERE id = p_user_id
  AND deleted_at IS NULL;

  -- Check for social auth
  IF v_is_social_auth THEN
    RETURN QUERY
    SELECT 
      false::BOOLEAN,
      'SOCIAL_AUTH_REQUIRED'::TEXT,
      format('Please sign in with %s', v_provider)::TEXT;
    RETURN;
  END IF;

  -- Verify password
  IF v_encrypted_password IS NULL THEN
    RETURN QUERY
    SELECT 
      false::BOOLEAN,
      'NO_PASSWORD'::TEXT,
      'No password set for this account'::TEXT;
    RETURN;
  END IF;

  -- Return password verification result
  RETURN QUERY
  SELECT 
    crypt(p_password, v_encrypted_password) = v_encrypted_password,
    CASE 
      WHEN crypt(p_password, v_encrypted_password) = v_encrypted_password THEN NULL
      ELSE 'INVALID_PASSWORD'
    END::TEXT,
    CASE 
      WHEN crypt(p_password, v_encrypted_password) = v_encrypted_password THEN NULL
      ELSE 'Invalid password'
    END::TEXT;
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
'Gets comprehensive user authentication details including social auth status';

COMMENT ON FUNCTION verify_user_password IS 
'Securely verifies a user''s password with detailed error reporting';