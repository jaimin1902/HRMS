'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Search, Filter, Calendar, Clock } from 'lucide-react';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Map<number, any>>(new Map());
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUsers, setProcessingUsers] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState({
    department_id: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, filters]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('start_date', selectedDate);
      params.append('end_date', selectedDate);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/attendance?${params.toString()}`);
      const attendanceData = response.data.data || [];
      
      // Create a map of user_id to attendance record
      const attendanceMap = new Map();
      attendanceData.forEach((record: any) => {
        attendanceMap.set(record.user_id, record);
      });
      
      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?is_active=true');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments');
      setDepartments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    if (direction === 'prev') {
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() + 1);
    }
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    try {
      // Parse the timestamp - handle both ISO strings and date strings
      let date: Date;
      if (typeof time === 'string' && time.includes('T')) {
        // ISO string with timezone
        date = new Date(time);
      } else if (typeof time === 'string') {
        // Date string without timezone - assume it's already in local time
        date = new Date(time + 'Z'); // Add Z to indicate UTC, then convert to local
      } else {
        date = new Date(time);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', time);
        return '-';
      }
      
      // Format in local timezone
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } catch (error) {
      console.error('Error formatting time:', error, time);
      return '-';
    }
  };

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '0:00';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const hours = Math.floor(diffHours);
    const minutes = Math.floor((diffHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateExtraHours = (workingHours: string) => {
    const [hours, minutes] = workingHours.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const standardMinutes = 8 * 60; // 8 hours standard
    const extraMinutes = Math.max(0, totalMinutes - standardMinutes);
    const extraHours = Math.floor(extraMinutes / 60);
    const extraMins = extraMinutes % 60;
    return `${extraHours}:${extraMins.toString().padStart(2, '0')}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleCheckIn = async (userId: number) => {
    if (processingUsers.has(userId)) return;
    
    setProcessingUsers(prev => new Set(prev).add(userId));
    try {
      const now = new Date();
      // Parse selected date as local date (YYYY-MM-DD format)
      const [year, month, day] = selectedDate.split('-').map(Number);
      
      // Create date in local timezone with selected date and current time
      const localDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      
      // Convert to ISO string (this automatically handles timezone conversion)
      const checkInTime = localDate.toISOString();
      
      console.log('Check-in:', { 
        selectedDate, 
        localTime: localDate.toLocaleString(),
        checkInTime,
        hours: now.getHours(),
        minutes: now.getMinutes()
      });
      
      await api.post('/attendance/admin/mark', {
        user_id: userId,
        date: selectedDate,
        check_in_time: checkInTime,
        status: 'present',
      });
      
      await fetchAttendance();
    } catch (error: any) {
      console.error('Check-in error:', error);
      alert(error.response?.data?.message || 'Failed to mark check-in');
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleCheckOut = async (userId: number) => {
    if (processingUsers.has(userId)) return;
    
    setProcessingUsers(prev => new Set(prev).add(userId));
    try {
      const now = new Date();
      // Parse selected date as local date (YYYY-MM-DD format)
      const [year, month, day] = selectedDate.split('-').map(Number);
      
      // Create date in local timezone with selected date and current time
      const localDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      
      // Convert to ISO string (this automatically handles timezone conversion)
      const checkOutTime = localDate.toISOString();
      
      console.log('Check-out:', { 
        selectedDate, 
        localTime: localDate.toLocaleString(),
        checkOutTime,
        hours: now.getHours(),
        minutes: now.getMinutes()
      });
      
      await api.post('/attendance/admin/checkout', {
        user_id: userId,
        date: selectedDate,
        check_out_time: checkOutTime,
      });
      
      await fetchAttendance();
    } catch (error: any) {
      console.error('Check-out error:', error);
      alert(error.response?.data?.message || 'Failed to mark check-out');
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Merge users with attendance records
  const getFilteredUsers = () => {
    let filtered = users;
    
    // Filter by department
    if (filters.department_id) {
      filtered = filtered.filter(user => 
        user.department_id === parseInt(filters.department_id)
      );
    }
    
    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower) ||
        user.employee_id?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(user => {
        const attendanceRecord = attendance.get(user.id);
        return attendanceRecord?.status === filters.status;
      });
    }
    
    return filtered;
  };

  if (loading && users.length === 0) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Attendance Management</h1>
      
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Date Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
            >
              &lt;
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              >
                Today
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
            >
              &gt;
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {formatDisplayDate(selectedDate)}
          </p>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by name or ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Select
                value={filters.department_id}
                onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="half-day">Half Day</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees Attendance - {formatDisplayDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          {getFilteredUsers().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredUsers().map((user) => {
                    const attendanceRecord = attendance.get(user.id);
                    const hasCheckIn = attendanceRecord?.check_in_time;
                    const hasCheckOut = attendanceRecord?.check_out_time;
                    const workHours = calculateWorkingHours(
                      attendanceRecord?.check_in_time || null,
                      attendanceRecord?.check_out_time || null
                    );
                    const isProcessing = processingUsers.has(user.id);
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.employee_id}</TableCell>
                        <TableCell>
                          {departments.find(d => d.id === user.department_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {hasCheckIn ? (
                            <div>
                              <div className="font-medium">{formatTime(attendanceRecord.check_in_time)}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(attendanceRecord.check_in_time).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {hasCheckOut ? (
                            <div>
                              <div className="font-medium">{formatTime(attendanceRecord.check_out_time)}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(attendanceRecord.check_out_time).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {hasCheckIn && hasCheckOut ? workHours : '-'}
                        </TableCell>
                        <TableCell>
                          {attendanceRecord ? (
                            <span className={`px-2 py-1 rounded text-xs ${
                              attendanceRecord.status === 'present' ? 'bg-green-100 text-green-800' :
                              attendanceRecord.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                              attendanceRecord.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' :
                              attendanceRecord.status === 'absent' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {attendanceRecord.status === 'present' ? 'Complete' :
                               attendanceRecord.status === 'half-day' ? 'Half-Day' :
                               attendanceRecord.status === 'leave' ? 'Leave' :
                               attendanceRecord.status === 'absent' ? 'Absent' :
                               attendanceRecord.status}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                              Not Marked
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
