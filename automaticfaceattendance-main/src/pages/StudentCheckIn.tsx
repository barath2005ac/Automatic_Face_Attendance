import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FaceCamera } from '@/components/FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { CheckCircle, XCircle, Clock, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  roll_number: string | null;
  face_descriptor: number[];
}

interface CheckInResult {
  student: Student;
  status: 'success' | 'already_checked_in' | 'error';
  message: string;
  time: Date;
}

export function StudentCheckIn() {
  const [students, setStudents] = useState<Student[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { compareFaces } = useFaceDetection();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch students with registered faces
  useEffect(() => {
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email, department, roll_number, face_descriptor')
        .eq('is_active', true)
        .not('face_descriptor', 'is', null);

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      setStudents(data as Student[]);
    };

    fetchStudents();
  }, []);

  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    if (isProcessing || students.length === 0) return;

    setIsProcessing(true);

    try {
      // Find matching student
      let matchedStudent: Student | null = null;
      let bestDistance = Infinity;

      for (const student of students) {
        if (!student.face_descriptor) continue;
        
        const distance = compareFaces(descriptor, student.face_descriptor);
        
        if (distance < 0.6 && distance < bestDistance) {
          bestDistance = distance;
          matchedStudent = student;
        }
      }

      if (!matchedStudent) {
        setIsProcessing(false);
        return;
      }

      // Check if already checked in today
      const today = new Date();
      const { data: existingCheckIn } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('student_id', matchedStudent.id)
        .gte('check_in', startOfDay(today).toISOString())
        .lte('check_in', endOfDay(today).toISOString())
        .maybeSingle();

      if (existingCheckIn) {
        const result: CheckInResult = {
          student: matchedStudent,
          status: 'already_checked_in',
          message: `${matchedStudent.name} has already checked in today`,
          time: new Date(),
        };
        
        setRecentCheckIns(prev => [result, ...prev.slice(0, 4)]);
        toast.info(result.message);
        
        // Add delay before next check
        setTimeout(() => setIsProcessing(false), 3000);
        return;
      }

      // Determine if late (after 9:00 AM)
      const hour = today.getHours();
      const isLate = hour >= 9;

      // Record attendance
      const { error } = await supabase
        .from('student_attendance')
        .insert({
          student_id: matchedStudent.id,
          status: isLate ? 'late' : 'present',
        });

      if (error) throw error;

      const result: CheckInResult = {
        student: matchedStudent,
        status: 'success',
        message: `${matchedStudent.name} checked in successfully${isLate ? ' (Late)' : ''}`,
        time: new Date(),
      };

      setRecentCheckIns(prev => [result, ...prev.slice(0, 4)]);
      toast.success(result.message);

      // Add delay before next check
      setTimeout(() => setIsProcessing(false), 3000);
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Failed to record attendance');
      setIsProcessing(false);
    }
  }, [students, isProcessing, compareFaces]);

  return (
    <div className="p-8">
      {/* Header with Clock */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Student Check-In</h1>
          <p className="mt-1 text-muted-foreground">
            Face recognition student attendance • {students.length} students registered
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-display font-bold text-primary">
            {format(currentTime, 'h:mm:ss a')}
          </p>
          <p className="text-muted-foreground">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Camera Feed */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            Camera Feed
          </h2>
          <FaceCamera
            mode="detect"
            onFaceDetected={handleFaceDetected}
          />
          
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-primary">
              <Clock className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-display font-semibold text-foreground mb-4">
            Recent Check-ins
          </h2>
          
          {recentCheckIns.length > 0 ? (
            <div className="space-y-4">
              {recentCheckIns.map((checkIn, index) => (
                <div
                  key={`${checkIn.student.id}-${checkIn.time.getTime()}`}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg transition-all duration-300",
                    index === 0 ? "animate-fade-in" : "",
                    checkIn.status === 'success' ? "bg-success/10" :
                    checkIn.status === 'already_checked_in' ? "bg-warning/10" :
                    "bg-destructive/10"
                  )}
                >
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    checkIn.status === 'success' ? "bg-success/20" :
                    checkIn.status === 'already_checked_in' ? "bg-warning/20" :
                    "bg-destructive/20"
                  )}>
                    {checkIn.status === 'success' ? (
                      <CheckCircle className="h-6 w-6 text-success" />
                    ) : checkIn.status === 'already_checked_in' ? (
                      <Clock className="h-6 w-6 text-warning" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{checkIn.student.name}</p>
                    <p className="text-sm text-muted-foreground">{checkIn.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {checkIn.student.department}
                      </span>
                      {checkIn.student.roll_number && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {checkIn.student.roll_number}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(checkIn.time, 'h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No check-ins yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Students will appear here when they check in
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
