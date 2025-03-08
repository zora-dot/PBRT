-- Add is_verified column to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create or replace the function to handle email verification
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_verified when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE auth.users
    SET is_verified = TRUE
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_email_verification ON auth.users;
CREATE TRIGGER on_email_verification
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_email_verification();

-- Update existing verified users
UPDATE auth.users
SET is_verified = TRUE
WHERE email_confirmed_at IS NOT NULL;

-- Grant necessary permissions
GRANT UPDATE ON auth.users TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;