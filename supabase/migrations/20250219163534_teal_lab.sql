/*
  # Fix Signup Permissions

  1. Changes
    - Grant necessary permissions to service role
    - Ensure handle_new_user trigger has proper permissions
    - Add additional safeguards for profile creation

  2. Security
    - Maintain security while allowing necessary operations
    - Restrict permissions to only what's needed
*/

-- Grant necessary permissions to service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure handle_new_user has proper permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER SET search_path = public;

-- Add additional safeguards
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create comprehensive insert policy
CREATE POLICY "Allow profile creation and management"
ON profiles FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Allow service role or user creating their own profile
  (auth.uid() = id) OR 
  (current_user = 'service_role') OR
  (auth.jwt()->>'role' = 'service_role')
);