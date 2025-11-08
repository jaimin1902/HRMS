'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { Plus } from 'lucide-react';

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types');
      setLeaveTypes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leave Types</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Leave Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leave Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Max Days</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Requires Approval</TableHead>
                <TableHead>Carry Forward</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>{type.code}</TableCell>
                  <TableCell>{type.description || '-'}</TableCell>
                  <TableCell>{type.max_days || 'Unlimited'}</TableCell>
                  <TableCell>{type.is_paid ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{type.requires_approval ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{type.carry_forward ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


