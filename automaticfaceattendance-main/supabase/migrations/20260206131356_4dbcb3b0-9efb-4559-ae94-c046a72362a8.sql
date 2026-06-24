-- Fix employee-photos storage bucket security
UPDATE storage.buckets SET public = false WHERE id = 'employee-photos';

-- Create proper storage policies for employee photos
CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can view employee photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-photos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can update employee photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos' AND
  has_role(auth.uid(), 'admin'::app_role)
);