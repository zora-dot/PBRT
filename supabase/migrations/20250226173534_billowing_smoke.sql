-- Create function to check if login exists and get user details with a new name
CREATE OR REPLACE FUNCTION check_login_exists_v3(
  p_login TEXT
)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_email TEXT,
  user_name TEXT,
  is_confirmed BOOLEAN,
  auth_provider TEXT
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

-- Create optimized indexes for lookups if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email_lookup_v3 
ON auth.users(LOWER(email)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lookup_v3 
ON public.profiles(LOWER(username));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_login_exists_v3(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_login_exists_v3 IS 
'Checks if a username or email exists and returns user details including confirmation status and auth provider';