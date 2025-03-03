/*
  # Fix User Signup

  1. Changes
    - Add policy to allow service role to create profiles
    - Ensure handle_new_user trigger can create profiles
    - Fix signup flow by allowing profile creation

  2. Security
    - Maintain security while allowing necessary profile creation
    - Only allow authenticated users and service role to create profiles
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new insert policy that allows both authenticated users and service role
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
TO authenticated, service_role
WITH CHECK (
  -- Allow service role (for handle_new_user trigger) or user creating their own profile
  (auth.uid() = id) OR 
  (auth.jwt()->>'role' = 'service_role')
);

-- Ensure handle_new_user has necessary permissions
ALTER FUNCTION handle_new_user() SECURITY DEFINER;