/*
  # Add trigger for user deletion

  1. Changes
    - Add trigger to delete auth.users when profiles are deleted
    - Add function to handle the deletion
    - Grant necessary permissions

  2. Security
    - Only allow deletion of own user
    - Ensure proper error handling
*/

-- Create function to handle profile deletion
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
  WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger for profile deletion
DROP TRIGGER IF EXISTS on_profile_delete ON profiles;
CREATE TRIGGER on_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_deletion();

-- Grant necessary permissions
GRANT DELETE ON auth.users TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION handle_profile_deletion IS 
'Deletes the corresponding auth.users record when a profile is deleted';