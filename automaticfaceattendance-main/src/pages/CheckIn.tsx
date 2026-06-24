import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FaceCamera } from '@/components/FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RecognizedEmployee {
  id: string;
  name: string;
  department: string;
  photo_url: string | null;
}

interface CheckInResult {
  success: boolean;
  employee?: RecognizedEmployee;
  checkInTime?: string;
  message: string;
}

export function CheckIn() {
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { compareFaces } = useFaceDetection();

  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Fetch all employees with face descriptors
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name, department, face_descriptor, photo_url')
        .eq('is_active', true)
        .not('face_descriptor', 'is', null);

      if (error) throw error;

      if (!employees || employees.length === 0) {
        setCheckInResult({
          success: false,
          message: 'No registered employees found. Please register employees first.',
        });
        setIsProcessing(false);
        return;
      }

      // Find matching employee
      let bestMatch: { employee: typeof employees[0]; distance: number } | null = null;
      const THRESHOLD = 0.6; // Face match threshold

      for (const employee of employees) {
        if (employee.face_descriptor) {
          const distance = compareFaces(descriptor, employee.face_descriptor as number[]);
          
          if (distance < THRESHOLD && (!bestMatch || distance < bestMatch.distance)) {
            bestMatch = { employee, distance };
          }
        }
      }

      if (bestMatch) {
        // Check if already checked in today
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: existingCheckIn } = await supabase
          .from('attendance')
          .select('id')
          .eq('employee_id', bestMatch.employee.id)
          .gte('check_in', startOfDay)
          .lte('check_in', endOfDay)
          .single();

        if (existingCheckIn) {
          setCheckInResult({
            success: false,
            employee: {
              id: bestMatch.employee.id,
              name: bestMatch.employee.name,
              department: bestMatch.employee.department,
              photo_url: bestMatch.employee.photo_url,
            },
            message: 'Already checked in today!',
          });
        } else {
          // Determine status based on time
          const currentHour = new Date().getHours();
          const status = currentHour >= 9 ? 'late' : 'present';

          // Record attendance
          const { error: insertError } = await supabase
            .from('attendance')
            .insert({
              employee_id: bestMatch.employee.id,
              status,
            });

          if (insertError) throw insertError;

          const checkInTime = format(new Date(), 'h:mm a');
          
          setCheckInResult({
            success: true,
            employee: {
              id: bestMatch.employee.id,
              name: bestMatch.employee.name,
              department: bestMatch.employee.department,
              photo_url: bestMatch.employee.photo_url,
            },
            checkInTime,
            message: status === 'late' ? 'Checked in (Late)' : 'Successfully checked in!',
          });

          toast.success(`Welcome, ${bestMatch.employee.name}!`);
        }
      } else {
        setCheckInResult({
          success: false,
          message: 'Face not recognized. Please register first.',
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      setCheckInResult({
        success: false,
        message: 'An error occurred. Please try again.',
      });
    }

    // Reset after 5 seconds
    setTimeout(() => {
      setCheckInResult(null);
      setIsProcessing(false);
    }, 5000);
  }, [isProcessing, compareFaces]);

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Face Check-In</h1>
        <p className="mt-1 text-muted-foreground">
          Look at the camera to check in
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Camera Feed */}
          <div className="glass-card rounded-xl p-6">
            <FaceCamera
              onFaceDetected={handleFaceDetected}
              mode="detect"
            />
          </div>

          {/* Result Panel */}
          <div className={cn(
            "glass-card rounded-xl p-8 transition-all duration-500",
            checkInResult ? "face-detected" : "opacity-70"
          )}>
            {checkInResult ? (
              <div className="text-center">
                {/* Status Icon */}
                <div className={cn(
                  "mx-auto h-20 w-20 rounded-full flex items-center justify-center mb-6",
                  checkInResult.success 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {checkInResult.success ? (
                    <CheckCircle className="h-10 w-10" />
                  ) : (
                    <XCircle className="h-10 w-10" />
                  )}
                </div>

                {/* Employee Info */}
                {checkInResult.employee && (
                  <div className="mb-6">
                    <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      {checkInResult.employee.photo_url ? (
                        <img 
                          src={checkInResult.employee.photo_url} 
                          alt={checkInResult.employee.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <h2 className="text-2xl font-display font-bold text-foreground">
                      {checkInResult.employee.name}
                    </h2>
                    <p className="text-muted-foreground">{checkInResult.employee.department}</p>
                  </div>
                )}

                {/* Check-in Time */}
                {checkInResult.checkInTime && (
                  <div className="flex items-center justify-center gap-2 text-lg mb-4">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-medium">{checkInResult.checkInTime}</span>
                  </div>
                )}

                {/* Message */}
                <p className={cn(
                  "text-lg font-medium",
                  checkInResult.success ? "text-success" : "text-destructive"
                )}>
                  {checkInResult.message}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                  Waiting for Face Detection
                </h2>
                <p className="text-muted-foreground">
                  Position your face in front of the camera
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
