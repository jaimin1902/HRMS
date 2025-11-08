'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Clock, Calendar, TrendingUp } from 'lucide-react';

export default function EmployeeAttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState({
    presentDays: 0,
    leaveDays: 0,
    absentDays: 0,
    totalWorkingDays: 0,
  });

  useEffect(() => {
    fetchAttendance();
    fetchTodayAttendance();
  }, [selectedMonth, selectedYear]);

  const fetchAttendance = async () => {
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
      const response = await api.get(`/attendance/my?start_date=${startDate}&end_date=${endDate}`);
      const data = response.data.data || [];
      setAttendance(data);
      
      // Calculate summary
      const present = data.filter((a: any) => a.status === 'present').length;
      const leave = data.filter((a: any) => a.status === 'leave').length;
      const absent = data.filter((a: any) => a.status === 'absent').length;
      setSummary({
        presentDays: present,
        leaveDays: leave,
        absentDays: absent,
        totalWorkingDays: present + leave,
      });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance/my?start_date=${today}&end_date=${today}`);
      if (response.data.data && response.data.data.length > 0) {
        setTodayAttendance(response.data.data[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Failed to fetch today attendance:', error);
      setTodayAttendance(null);
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn) return; // Prevent double-click
    
    setCheckingIn(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Use current local date and time
      const checkInTime = now.toISOString();
      
      console.log('Checking in...', { date: today, check_in_time: checkInTime });
      
      const response = await api.post('/attendance/mark', {
        date: today,
        check_in_time: checkInTime,
        status: 'present',
      });
      
      console.log('Check-in response:', response.data);
      
      if (response.data.success) {
        // Update today's attendance immediately
        setTodayAttendance(response.data.data);
        // Refresh the attendance list
        await fetchAttendance();
        // Also refresh today's attendance to ensure consistency
        await fetchTodayAttendance();
      } else {
        alert(response.data.message || 'Failed to mark attendance');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to mark attendance';
      alert(errorMessage);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (checkingOut) return; // Prevent double-click
    
    setCheckingOut(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Use current local date and time
      const checkOutTime = now.toISOString();
      
      console.log('Checking out...', { date: today, check_out_time: checkOutTime });
      
      const response = await api.post('/attendance/checkout', {
        date: today,
        check_out_time: checkOutTime,
      });
      
      console.log('Check-out response:', response.data);
      
      if (response.data.success) {
        // Update today's attendance immediately
        setTodayAttendance(response.data.data);
        // Refresh the attendance list
        await fetchAttendance();
        // Also refresh today's attendance to ensure consistency
        await fetchTodayAttendance();
      } else {
        alert(response.data.message || 'Failed to check out');
      }
    } catch (error: any) {
      console.error('Check-out error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to check out';
      alert(errorMessage);
    } finally {
      setCheckingOut(false);
    }
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Attendance</h1>
      
      {/* Today's Attendance Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            {!todayAttendance || !todayAttendance.check_in_time ? (
              <Button onClick={handleCheckIn} size="lg" disabled={checkingIn}>
                <Clock className="mr-2 h-4 w-4" />
                {checkingIn ? 'Checking In...' : 'Check In'}
              </Button>
            ) : (
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Check In</p>
                    <p className="text-lg font-semibold">{formatTime(todayAttendance.check_in_time)}</p>
                  </div>
                  {todayAttendance.check_out_time ? (
                    <div>
                      <p className="text-sm text-gray-600">Check Out</p>
                      <p className="text-lg font-semibold">{formatTime(todayAttendance.check_out_time)}</p>
                    </div>
                  ) : (
                    <Button onClick={handleCheckOut} disabled={checkingOut}>
                      <Clock className="mr-2 h-4 w-4" />
                      {checkingOut ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  )}
                </div>
                {todayAttendance.check_out_time && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Working Hours: <span className="font-semibold">
                        {calculateWorkingHours(todayAttendance.check_in_time, todayAttendance.check_out_time)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Present</p>
                <p className="text-2xl font-bold">{summary.presentDays}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leaves Count</p>
                <p className="text-2xl font-bold">{summary.leaveDays}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Working Days</p>
                <p className="text-2xl font-bold">{summary.totalWorkingDays}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Monthly Attendance</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                &lt;
              </Button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1 border rounded"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                &gt;
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {new Date().getDate()}, {monthNames[selectedMonth]} {selectedYear}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Work Hours</TableHead>
                <TableHead>Extra Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No attendance records found for this month
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => {
                  const workHours = calculateWorkingHours(record.check_in_time, record.check_out_time);
                  const extraHours = record.check_in_time && record.check_out_time 
                    ? calculateExtraHours(workHours) 
                    : '0:00';
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{formatTime(record.check_in_time)}</TableCell>
                      <TableCell>{formatTime(record.check_out_time)}</TableCell>
                      <TableCell>{workHours}</TableCell>
                      <TableCell>{extraHours}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'leave' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
