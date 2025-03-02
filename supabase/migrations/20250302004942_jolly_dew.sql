/*
  # Add social auth user lookup function

  1. Changes
    - Add function to handle social auth user lookup
    - Add optimized indexes for lookups
    - Add proper permissions

  2. Security
    - Set proper schema search path
    - Add security definer
*/

-- Create function to handle social auth user lookup
CREATE OR REPLACE FUNCTION get_social_auth_user(
  p_login TEXT
)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_email TEXT,
  user_name TEXT,
  is_confirmed BOOLEAN,
  provider TEXT
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
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    id, 
    email,
    email_confirmed_at IS NOT NULL,
    raw_app_meta_data->>'provider'
  INTO 
    v_user_id, 
    v_email,
    v_is_confirmed,
    v_provider
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
      p.username
    INTO 
      v_user_id, 
      v_email,
      v_is_confirmed,
      v_provider,
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
    v_email,
    v_username,
    COALESCE(v_is_confirmed, false),
    v_provider;
END;
$$;

-- Create optimized indexes for lookups
CREATE INDEX IF NOT EXISTS idx_users_social_auth_lookup 
ON auth.users(LOWER(email)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_social_auth_lookup 
ON public.profiles(LOWER(username));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_social_auth_user(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_social_auth_user IS 
'Checks if a username or email exists and returns user details including auth provider';