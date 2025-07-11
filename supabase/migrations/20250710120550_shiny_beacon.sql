/*
  # Create admin profile manually

  This migration ensures that admin profiles are created correctly
  and handles any missing profile data.
*/

-- First, let's check if we have any users without profiles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all auth users and ensure they have profiles
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Create missing profile
    INSERT INTO public.profiles (id, full_name, role, active)
    VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'full_name', split_part(user_record.email, '@', 1)),
      COALESCE(user_record.raw_user_meta_data->>'role', 'user'),
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      active = EXCLUDED.active,
      updated_at = now();
      
    RAISE NOTICE 'Created/updated profile for user: %', user_record.email;
  END LOOP;
END $$;

-- Ensure admin users have the correct role
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE id IN (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email LIKE '%admin%' 
  OR au.raw_user_meta_data->>'role' = 'admin'
);

-- Show current profiles for debugging
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  RAISE NOTICE 'Current profiles:';
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.role, p.active, au.email
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    ORDER BY p.role DESC, au.email
  LOOP
    RAISE NOTICE 'Profile: % (%) - Role: %, Active: %, Email: %', 
      profile_record.full_name, 
      profile_record.id, 
      profile_record.role, 
      profile_record.active,
      profile_record.email;
  END LOOP;
END $$;