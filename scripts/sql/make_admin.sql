-- 1. Add the is_admin column to the profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Make your specific user account an admin! 
-- (Replace 'YOUR_EMAIL@EXAMPLE.COM' with the email you use to log in)
UPDATE public.profiles
SET is_admin = true
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM'
);
