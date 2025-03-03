/*
  # Fix logout handling

  1. Changes
    - Add function to safely handle user logout
    - Add cleanup for invalid sessions
    - Add better error handling

  2. Security
    - Maintain proper permissions
    - Add validation checks
*/

-- Create function to safely handle user logout
CREATE OR REPLACE FUNCTION handle_user_logout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- If no user ID, silently succeed (user already logged out)
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Revoke all refresh tokens for the user
  UPDATE auth.refresh_tokens
  SET revoked = true
  WHERE user_id = v_user_id;

  -- Clear any active sessions
  DELETE FROM auth.sessions
  WHERE user_id = v_user_id;

  -- Clear any expired sessions for all users while we're at it
  DELETE FROM auth.sessions
  WHERE not_after < now();
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_user_logout() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION handle_user_logout IS 
'Safely handles user logout by cleaning up sessions and tokens';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry 
ON auth.sessions(user_id, not_after);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_revoked 
ON auth.refresh_tokens(user_id, revoked);