'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Search, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.action) params.append('action', filters.action);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(response.data.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleResetFilters = () => {
    setFilters({
      entity_type: '',
      action: '',
      start_date: '',
      end_date: '',
    });
    setTimeout(() => fetchLogs(), 100);
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('APPROVED')) {
      return 'text-green-600 bg-green-50';
    }
    if (action.includes('DELETED') || action.includes('REJECTED')) {
      return 'text-red-600 bg-red-50';
    }
    if (action.includes('UPDATED')) {
      return 'text-blue-600 bg-blue-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  if (loading && logs.length === 0) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entity_type">Entity Type</Label>
              <Select
                id="entity_type"
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="users">Users</option>
                <option value="departments">Departments</option>
                <option value="roles">Roles</option>
                <option value="leave_applications">Leave Applications</option>
                <option value="attendance">Attendance</option>
                <option value="payroll_runs">Payroll Runs</option>
                <option value="salary_structure">Salary Structure</option>
                <option value="system_settings">System Settings</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="action">Action</Label>
              <Select
                id="action"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="USER_CREATED">User Created</option>
                <option value="USER_UPDATED">User Updated</option>
                <option value="USER_DELETED">User Deleted</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="DEPARTMENT_CREATED">Department Created</option>
                <option value="DEPARTMENT_UPDATED">Department Updated</option>
                <option value="DEPARTMENT_DELETED">Department Deleted</option>
                <option value="LEAVE_APPLIED">Leave Applied</option>
                <option value="LEAVE_APPROVED">Leave Approved</option>
                <option value="LEAVE_REJECTED">Leave Rejected</option>
                <option value="ATTENDANCE_MARKED">Attendance Marked</option>
                <option value="PAYROLL_PROCESSED">Payroll Processed</option>
                <option value="SALARY_STRUCTURE_CREATED">Salary Structure Created</option>
                <option value="SETTING_UPDATED">Setting Updated</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters}>
              <Search className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>{log.user_name || 'System'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.entity_type && log.entity_id
                          ? `${log.entity_type} #${log.entity_id}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell>
                        {log.old_values || log.new_values ? (
                          <details className="cursor-pointer">
                            <summary className="text-sm text-blue-600 hover:text-blue-800">
                              View Details
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              {log.old_values && (
                                <div className="mb-2">
                                  <strong>Old Values:</strong>
                                  <pre className="mt-1 whitespace-pre-wrap">
                                    {/* {JSON.stringify(JSON.parse(log.old_values), null, 2)} */}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <strong>New Values:</strong>
                                  <pre className="mt-1 whitespace-pre-wrap">
                                    {/* {JSON.stringify(JSON.parse(log.new_values), null, 2)} */}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


