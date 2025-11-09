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

  // Helper function to get current IST time and convert to UTC
  const getCurrentISTAsUTC = (dateStr: string): string => {
    // Get current IST time components
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = istFormatter.formatToParts(now);
    const partsObj: any = {};
    parts.forEach(part => {
      partsObj[part.type] = part.value;
    });
    
    // Use the provided dateStr for date, but current IST time for time
    const [year, month, day] = dateStr.split('-');
    const istHours = String(partsObj.hour).padStart(2, '0');
    const istMinutes = String(partsObj.minute).padStart(2, '0');
    const istSeconds = String(partsObj.second || '0').padStart(2, '0');
    
    // Create ISO string with IST timezone offset (+05:30)
    // Format: YYYY-MM-DDTHH:mm:ss+05:30
    const istDateTimeString = `${year}-${month}-${day}T${istHours}:${istMinutes}:${istSeconds}+05:30`;
    
    // Create Date object - JavaScript will automatically convert IST to UTC
    const date = new Date(istDateTimeString);
    
    // Return UTC ISO string (this is what PostgreSQL expects)
    return date.toISOString();
  };

  const handleCheckIn = async () => {
    if (checkingIn) return; // Prevent double-click
    
    setCheckingIn(true);
    try {
      const now = new Date();
      // Get local date in YYYY-MM-DD format (IST)
      const istDateFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const datePartsObj = istDateFormatter.formatToParts(now);
      const dateParts: any = {};
      datePartsObj.forEach(part => {
        dateParts[part.type] = part.value;
      });
      const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      
      // Get UTC time from current IST time
      const checkInTime = getCurrentISTAsUTC(today);
      
      // Get current IST time for logging
      const istTime = now.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      console.log('Checking in...', { 
        localDate: today, 
        currentISTTime: istTime,
        checkInTimeUTC: checkInTime,
        checkInTimeIST: new Date(checkInTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
      
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
      // Get local date in YYYY-MM-DD format (IST)
      const istDateFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = istDateFormatter.formatToParts(now);
      const dateParts: any = {};
      parts.forEach(part => {
        dateParts[part.type] = part.value;
      });
      const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      
      // Get UTC time from current IST time
      const checkOutTime = getCurrentISTAsUTC(today);
      
      // Get current IST time for logging
      const istTime = now.toLocaleTimeString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      console.log('Checking out...', { 
        localDate: today, 
        currentISTTime: istTime,
        checkOutTimeUTC: checkOutTime,
        checkOutTimeIST: new Date(checkOutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
      
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
      // Parse the timestamp - backend returns UTC timestamps
      const date = new Date(time);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', time);
        return '-';
      }
      
      // Convert UTC to IST (Asia/Kolkata) and format
      // IST is UTC+5:30
      return date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting time:', error, time);
      return '-';
    }
  };

  const calculateWorkingHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn || !checkOut) return '0:00';
    try {
      // Parse UTC timestamps from backend
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      
      // Calculate difference in milliseconds
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const hours = Math.floor(diffHours);
      const minutes = Math.floor((diffHours - hours) * 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating working hours:', error);
      return '0:00';
    }
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

  if (loading) return <div className="p-4 sm:p-8">Loading...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">My Attendance</h1>
      
      {/* Today's Attendance Card */}
      <Card>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">Monthly Attendance</CardTitle>
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Check-In</TableHead>
                <TableHead className="whitespace-nowrap">Check-Out</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap">Work Hours</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">Extra Hours</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
