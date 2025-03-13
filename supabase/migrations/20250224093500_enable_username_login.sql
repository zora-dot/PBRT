/*
  # Enable Username Login Support

  1. New Functions
    - Create function to get user by username or email with better error handling
    - Support case-insensitive username/email lookup
    - Include email confirmation status in response

  2. Indexes
    - Add optimized indexes for username lookups
    - Add composite indexes for better query performance

  3. Security
    - Set proper search path and security context
    - Grant minimal required permissions
*/

-- Create improved function to get user by username or email
CREATE OR REPLACE FUNCTION get_user_by_username_or_email(p_login TEXT)
RETURNS TABLE (
  email TEXT,
  is_confirmed BOOLEAN,
  username TEXT,
  has_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_is_confirmed BOOLEAN;
  v_username TEXT;
  v_has_password BOOLEAN;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    u.id,
    u.email,
    (u.email_confirmed_at IS NOT NULL),
    p.username,
    p.has_password
  INTO 
    v_user_id,
    v_email,
    v_is_confirmed,
    v_username,
    v_has_password
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
      p.has_password
    INTO 
      v_user_id,
      v_email,
      v_is_confirmed,
      v_username,
      v_has_password
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(p_login)
    AND u.deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- Return result if found
  IF v_user_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT 
      v_email::TEXT,
      v_is_confirmed,
      v_username,
      v_has_password;
  END IF;
END;
$$;

-- Create optimized indexes for username/email lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower 
ON auth.users(LOWER(email)) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username_email_lookup 
ON public.profiles(LOWER(username), id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_by_username_or_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_username_or_email(TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_by_username_or_email IS 
'Looks up a user by either username or email (case insensitive) and returns their email, confirmation status, and username if found.';
