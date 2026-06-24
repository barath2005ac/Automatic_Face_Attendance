import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Download, Search, Clock, User } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
  employees: {
    name: string;
    department: string;
    email: string;
  };
}

export function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    fetchAttendanceRecords();
  }, [dateFilter]);

  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(today), end: endOfDay(today) };
      case 'week':
        return { start: startOfDay(subDays(today, 7)), end: endOfDay(today) };
      case 'month':
        return { start: startOfDay(subDays(today, 30)), end: endOfDay(today) };
      default:
        return { start: startOfDay(today), end: endOfDay(today) };
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (name, department, email)
        `)
        .gte('check_in', start.toISOString())
        .lte('check_in', end.toISOString())
        .order('check_in', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-success/10 text-success border-success/20',
      late: 'bg-warning/10 text-warning border-warning/20',
      absent: 'bg-destructive/10 text-destructive border-destructive/20',
      half_day: 'bg-primary/10 text-primary border-primary/20',
    };
    return styles[status as keyof typeof styles] || styles.present;
  };

  const filteredRecords = records.filter(r =>
    r.employees?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employees?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['Name', 'Department', 'Check In', 'Check Out', 'Status'].join(','),
      ...filteredRecords.map(r => [
        r.employees?.name,
        r.employees?.department,
        format(new Date(r.check_in), 'yyyy-MM-dd HH:mm'),
        r.check_out ? format(new Date(r.check_out), 'yyyy-MM-dd HH:mm') : '-',
        r.status,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateFilter}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Attendance Records</h1>
          <p className="mt-1 text-muted-foreground">View and export attendance history</p>
        </div>
        
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border border-border overflow-hidden">
            {['today', 'week', 'month'].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors capitalize",
                  dateFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {filter === 'today' ? 'Today' : filter === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Employee</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Department</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Check In</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Check Out</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-4 px-6">
                      <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{record.employees?.name}</p>
                          <p className="text-sm text-muted-foreground">{record.employees?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 rounded-md bg-muted text-sm">
                        {record.employees?.department}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{format(new Date(record.check_in), 'h:mm a')}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.check_in), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {record.check_out ? (
                        <span className="text-foreground">
                          {format(new Date(record.check_out), 'h:mm a')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border capitalize",
                        getStatusBadge(record.status)
                      )}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
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
