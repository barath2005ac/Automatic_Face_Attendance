import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Download, Calendar, GraduationCap } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  student_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
  students: {
    name: string;
    email: string;
    department: string;
    roll_number: string | null;
  } | null;
}

export function StudentAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          *,
          students (name, email, department, roll_number)
        `)
        .gte('check_in', start.toISOString())
        .lte('check_in', end.toISOString())
        .order('check_in', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Name', 'Email', 'Department', 'Roll Number', 'Check In', 'Check Out', 'Status'];
    const rows = records.map(r => [
      r.students?.name || 'Unknown',
      r.students?.email || '',
      r.students?.department || '',
      r.students?.roll_number || '',
      format(new Date(r.check_in), 'yyyy-MM-dd HH:mm:ss'),
      r.check_out ? format(new Date(r.check_out), 'yyyy-MM-dd HH:mm:ss') : '',
      r.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-attendance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-success/10 text-success';
      case 'late': return 'bg-warning/10 text-warning';
      case 'absent': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredRecords = records.filter(r =>
    r.students?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.students?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.students?.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.students?.roll_number && r.students.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Student Attendance</h1>
          <p className="mt-1 text-muted-foreground">View and export student attendance records</p>
        </div>
        
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {(['today', 'week', 'month'] as const).map((filter) => (
            <Button
              key={filter}
              variant={dateFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(filter)}
              className="capitalize"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {filter === 'today' ? 'Today' : filter === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Student</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Department</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Roll Number</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Check In</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Check Out</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border animate-pulse">
                    <td className="p-4"><div className="h-4 bg-muted rounded w-32" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                    <td className="p-4"><div className="h-4 bg-muted rounded w-16" /></td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{record.students?.name}</p>
                          <p className="text-xs text-muted-foreground">{record.students?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{record.students?.department}</td>
                    <td className="p-4 text-muted-foreground">{record.students?.roll_number || '-'}</td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(record.check_in), 'MMM d, yyyy')}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      {format(new Date(record.check_in), 'h:mm a')}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {record.check_out ? format(new Date(record.check_out), 'h:mm a') : '-'}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getStatusColor(record.status)
                      )}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No attendance records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
