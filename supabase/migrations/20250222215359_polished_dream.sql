-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_user_by_username(text);

-- Create improved function to safely get user email by username with better error handling
CREATE OR REPLACE FUNCTION get_user_by_username(p_username TEXT)
RETURNS TABLE (
  email VARCHAR(255),  -- Match auth.users.email type
  is_confirmed BOOLEAN -- Add confirmation status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_email VARCHAR(255);
  v_is_confirmed BOOLEAN;
BEGIN
  -- First try to find by username in profiles (case insensitive)
  SELECT u.id, u.email, (u.email_confirmed_at IS NOT NULL)
  INTO v_user_id, v_email, v_is_confirmed
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(p_username)
  AND u.deleted_at IS NULL
  LIMIT 1;

  -- If not found, try display_name (case insensitive)
  IF v_user_id IS NULL THEN
    SELECT u.id, u.email, (u.email_confirmed_at IS NOT NULL)
    INTO v_user_id, v_email, v_is_confirmed
    FROM auth.users u
    WHERE LOWER(u.display_name) = LOWER(p_username)
    AND u.deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- Return result if found
  IF v_user_id IS NOT NULL THEN
    RETURN QUERY SELECT v_email::VARCHAR(255), v_is_confirmed;
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_username(TEXT) TO anon;

-- Create case-insensitive indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_display_name_lower ON auth.users(LOWER(display_name))
WHERE deleted_at IS NULL;

-- Ensure all usernames and display names are properly synced
UPDATE auth.users u
SET display_name = p.username,
    raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('username', p.username)
        ELSE 
          raw_user_meta_data || jsonb_build_object('username', p.username)
      END
FROM public.profiles p
WHERE u.id = p.id
AND (u.display_name IS NULL OR LOWER(u.display_name) != LOWER(p.username))
AND u.deleted_at IS NULL;