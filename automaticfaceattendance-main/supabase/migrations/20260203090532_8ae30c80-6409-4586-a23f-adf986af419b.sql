-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- PROFILES RLS POLICIES
-- =====================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ========================
-- USER_ROLES RLS POLICIES
-- ========================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================
-- DROP OLD PERMISSIVE POLICIES
-- ================================
DROP POLICY IF EXISTS "Allow all access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all access to attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow all access to students" ON public.students;
DROP POLICY IF EXISTS "Allow all access to student_attendance" ON public.student_attendance;

-- ========================
-- EMPLOYEES RLS POLICIES
-- ========================
-- Anyone can read employees (needed for face recognition check-in)
CREATE POLICY "Anyone can view employees for check-in"
  ON public.employees FOR SELECT
  USING (true);

-- Only admins can insert/update/delete employees
CREATE POLICY "Admins can manage employees"
  ON public.employees FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- ATTENDANCE RLS POLICIES
-- ========================
-- Anyone can insert attendance (for check-in kiosk)
CREATE POLICY "Anyone can record attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view attendance
CREATE POLICY "Authenticated users can view attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can update/delete attendance
CREATE POLICY "Admins can manage attendance"
  ON public.attendance FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete attendance"
  ON public.attendance FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ========================
-- STUDENTS RLS POLICIES
-- ========================
-- Anyone can read students (needed for face recognition check-in)
CREATE POLICY "Anyone can view students for check-in"
  ON public.students FOR SELECT
  USING (true);

-- Only admins can insert/update/delete students
CREATE POLICY "Admins can manage students"
  ON public.students FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update students"
  ON public.students FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================
-- STUDENT_ATTENDANCE RLS POLICIES
-- ================================
-- Anyone can insert student attendance (for check-in kiosk)
CREATE POLICY "Anyone can record student attendance"
  ON public.student_attendance FOR INSERT
  WITH CHECK (true);

-- Authenticated users can view student attendance
CREATE POLICY "Authenticated users can view student attendance"
  ON public.student_attendance FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can update/delete student attendance
CREATE POLICY "Admins can manage student attendance"
  ON public.student_attendance FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete student attendance"
  ON public.student_attendance FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));