/*
  # Update auth.users and profiles synchronization

  1. Changes
    - Add display_name column to auth.users
    - Create function to sync display_name with profiles.username
    - Update existing users with display names from profiles
  
  2. Security
    - Functions run with SECURITY DEFINER
    - Proper permissions granted
*/

-- Add display_name column to auth.users if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Function to sync display_name with profiles.username
CREATE OR REPLACE FUNCTION public.sync_display_name_with_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users display_name when profiles username changes
  UPDATE auth.users
  SET display_name = NEW.username,
      raw_user_meta_data = 
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('display_name', NEW.username)
          ELSE 
            raw_user_meta_data || jsonb_build_object('display_name', NEW.username)
        END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for display_name sync
DROP TRIGGER IF EXISTS on_username_change ON public.profiles;
CREATE TRIGGER on_username_change
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  WHEN (NEW.username IS DISTINCT FROM OLD.username)
  EXECUTE FUNCTION public.sync_display_name_with_username();

-- Update existing auth.users with display names from profiles
UPDATE auth.users u
SET display_name = p.username,
    raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('display_name', p.username)
        ELSE 
          raw_user_meta_data || jsonb_build_object('display_name', p.username)
      END
FROM public.profiles p
WHERE u.id = p.id
AND (u.display_name IS NULL OR u.display_name != p.username);

-- Grant necessary permissions
GRANT UPDATE ON auth.users TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;