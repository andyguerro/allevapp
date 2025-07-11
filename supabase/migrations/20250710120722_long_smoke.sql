/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop existing problematic policies that cause infinite recursion
    - Create new simplified policies that don't self-reference
    - Use auth.uid() directly instead of checking profiles table within policies

  2. New Policies
    - Users can view their own profile using auth.uid()
    - Users can update their own profile using auth.uid()
    - Admins can manage all profiles (using user metadata instead of profiles table)
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;

-- Create new policies without self-referencing
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin');