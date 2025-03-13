/*
  # Fix profile deletion trigger

  1. Changes
    - Change trigger timing from BEFORE DELETE to AFTER DELETE
    - Update trigger function to handle deletion order correctly
    - Add better error handling and validation

  2. Security
    - Maintain user ownership check
    - Ensure proper permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
DROP FUNCTION IF EXISTS handle_profile_deletion();

-- Create improved function to handle profile deletion
CREATE OR REPLACE FUNCTION handle_profile_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow users to delete their own profile
  IF OLD.id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete other users'' profiles';
  END IF;

  -- Delete the auth user
  DELETE FROM auth.users
  WHERE id = OLD.id
  AND deleted_at IS NULL;

  RETURN OLD;
END;
$$;

-- Create trigger for profile deletion that runs AFTER DELETE
CREATE TRIGGER on_profile_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_deletion();

-- Grant necessary permissions
GRANT DELETE ON auth.users TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION handle_profile_deletion IS 
'Deletes the corresponding auth.users record after a profile is deleted';