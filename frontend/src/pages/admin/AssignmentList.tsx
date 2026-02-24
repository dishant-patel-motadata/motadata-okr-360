import { useState } from 'react';
import { useAssignments, useAssignmentStatus, useDeleteAssignment } from '@/hooks/useAssignments';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { Loader2, ClipboardList, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignmentList() {
  const [cycleId, setCycleId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAssignments({ cycle_id: cycleId, page, limit: 50 });
  const { data: statusData } = useAssignmentStatus(cycleId);
  const deleteAssignment = useDeleteAssignment();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const assignments = data?.data || [];
  console.log('Assignments:', assignments);
  const stats = statusData?.data;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAssignment.mutateAsync(deleteId);
      toast.success('Assignment deleted');
    } catch (err: any) { toast.error(err.message); }
    setDeleteId(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Survey Assignments"
        description="Manage employee survey assignments"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Assignments' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} />}
      />

      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'In Progress', value: stats.in_progress },
            { label: 'Completed', value: stats.completed },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!cycleId ? (
        <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to manage assignments." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : assignments.rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="No assignments" description="No assignments found for this cycle." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Reviewers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.rows.map((a) => (
                  <TableRow key={a.assignment_id}>
                    <TableCell className="font-medium">{a.employee_name || a.employee_id}</TableCell>
                    <TableCell>{a.employee_department}</TableCell>
                    <TableCell>{a.employee_group_name}</TableCell>
                    <TableCell>{a.reviewers_count || 0}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm"><Link to={`/admin/assignments/${a.assignment_id}`}>View</Link></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.assignment_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : "No assignments yet" }
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Assignment" description="This will remove the assignment and all associated reviewers." confirmLabel="Delete" variant="destructive" onConfirm={handleDelete} />
    </div>
  );
}
