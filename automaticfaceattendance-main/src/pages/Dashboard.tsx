import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/StatCard';
import { Users, UserCheck, Clock, AlertTriangle, GraduationCap } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type ViewMode = 'employees' | 'students';

interface AttendanceStats {
  total: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}

interface RecentCheckIn {
  id: string;
  name: string;
  check_in: string;
  status: string;
}

export function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('employees');
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
  });
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [viewMode]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();

      if (viewMode === 'employees') {
        // Get total active employees
        const { count: total } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get today's employee attendance
        const { data: todayAttendance } = await supabase
          .from('attendance')
          .select(`
            *,
            employees (name)
          `)
          .gte('check_in', startOfDay(today).toISOString())
          .lte('check_in', endOfDay(today).toISOString())
          .order('check_in', { ascending: false });

        const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
        const lateToday = todayAttendance?.filter(a => a.status === 'late').length || 0;
        const absentToday = (total || 0) - (todayAttendance?.length || 0);

        setStats({
          total: total || 0,
          presentToday,
          lateToday,
          absentToday: Math.max(0, absentToday),
        });

        // Map recent check-ins
        const recent = todayAttendance?.slice(0, 5).map(a => ({
          id: a.id,
          name: a.employees?.name || 'Unknown',
          check_in: a.check_in,
          status: a.status,
        })) || [];

        setRecentCheckIns(recent);
      } else {
        // Get total active students
        const { count: total } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Get today's student attendance
        const { data: todayAttendance } = await supabase
          .from('student_attendance')
          .select(`
            *,
            students (name)
          `)
          .gte('check_in', startOfDay(today).toISOString())
          .lte('check_in', endOfDay(today).toISOString())
          .order('check_in', { ascending: false });

        const presentToday = todayAttendance?.filter(a => a.status === 'present').length || 0;
        const lateToday = todayAttendance?.filter(a => a.status === 'late').length || 0;
        const absentToday = (total || 0) - (todayAttendance?.length || 0);

        setStats({
          total: total || 0,
          presentToday,
          lateToday,
          absentToday: Math.max(0, absentToday),
        });

        // Map recent check-ins
        const recent = todayAttendance?.slice(0, 5).map(a => ({
          id: a.id,
          name: a.students?.name || 'Unknown',
          check_in: a.check_in,
          status: a.status,
        })) || [];

        setRecentCheckIns(recent);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-success/10 text-success';
      case 'late': return 'bg-warning/10 text-warning';
      case 'absent': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const label = viewMode === 'employees' ? 'Employees' : 'Students';
  const Icon = viewMode === 'employees' ? Users : GraduationCap;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of today's attendance • {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setViewMode('employees')}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200",
            viewMode === 'employees'
              ? "border-primary bg-primary/10 text-primary shadow-glow"
              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <Users className="h-6 w-6" />
          <div className="text-left">
            <p className="font-semibold">Employees</p>
            <p className="text-xs opacity-70">View employee attendance</p>
          </div>
        </button>
        
        <button
          onClick={() => setViewMode('students')}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-xl border-2 transition-all duration-200",
            viewMode === 'students'
              ? "border-primary bg-primary/10 text-primary shadow-glow"
              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <GraduationCap className="h-6 w-6" />
          <div className="text-left">
            <p className="font-semibold">Students</p>
            <p className="text-xs opacity-70">View student attendance</p>
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={`Total ${label}`}
          value={stats.total}
          icon={Icon}
          variant="primary"
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          title="Late Today"
          value={stats.lateToday}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Absent Today"
          value={stats.absentToday}
          icon={AlertTriangle}
          variant="default"
        />
      </div>

      {/* Recent Check-ins */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Recent {label} Check-ins
        </h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div>
                    <div className="h-4 w-32 bg-muted rounded mb-1" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        ) : recentCheckIns.length > 0 ? (
          <div className="space-y-3">
            {recentCheckIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 animate-fade-in"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {checkIn.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{checkIn.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(checkIn.check_in), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(checkIn.status)}`}>
                  {checkIn.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No {viewMode} check-ins recorded today</p>
          </div>
        )}
      </div>
    </div>
  );
}
