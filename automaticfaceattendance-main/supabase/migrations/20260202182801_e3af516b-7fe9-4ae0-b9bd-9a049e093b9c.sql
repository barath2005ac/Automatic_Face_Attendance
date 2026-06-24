-- Create students table (similar to employees)
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  roll_number TEXT,
  photo_url TEXT,
  face_descriptor JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_attendance table
CREATE TABLE public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Allow all access to students"
ON public.students
FOR ALL
USING (true)
WITH CHECK (true);

-- Create policies for student_attendance table
CREATE POLICY "Allow all access to student_attendance"
ON public.student_attendance
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updating updated_at on students
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();