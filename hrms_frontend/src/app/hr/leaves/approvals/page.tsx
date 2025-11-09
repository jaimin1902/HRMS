'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { formatDate } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export default function LeaveApprovalsPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/leaves?status=pending');
      setLeaves(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/leaves/${id}/approve`, {});
      fetchLeaves();
    } catch (error) {
      alert('Failed to approve leave');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.put(`/leaves/${id}/reject`, { rejection_reason: reason });
      fetchLeaves();
    } catch (error) {
      alert('Failed to reject leave');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Leave Approvals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>{leave.employee_name}</TableCell>
                  <TableCell>{leave.leave_type_name}</TableCell>
                  <TableCell>{formatDate(leave.start_date)}</TableCell>
                  <TableCell>{formatDate(leave.end_date)}</TableCell>
                  <TableCell>{leave.total_days}</TableCell>
                  <TableCell>{leave.reason || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(leave.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(leave.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


