-- Fix: Allow users to create their own profile
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Note: The public SELECT on employees/students and public INSERT on attendance 
-- tables are intentional for "kiosk mode" check-in functionality.
-- These allow face recognition to work without requiring login at the kiosk.