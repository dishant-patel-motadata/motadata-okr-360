import { useState } from 'react';
import { useCycles, useDeleteCycle, useActivateCycle, usePublishCycle } from '@/hooks/useCycles';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { Plus, Loader2, Target, Trash2, Play, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CycleList() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCycles({ page, limit: 20 });
  const deleteCycle = useDeleteCycle();
  const activateCycle = useActivateCycle();
  const publishCycle = usePublishCycle();

  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string } | null>(null);

  const cycles = data?.data || [];

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'delete') await deleteCycle.mutateAsync(confirmAction.id);
      if (confirmAction.type === 'activate') await activateCycle.mutateAsync(confirmAction.id);
      if (confirmAction.type === 'publish') await publishCycle.mutateAsync(confirmAction.id);
      toast.success(`Cycle ${confirmAction.type}d successfully`);
    } catch (err: any) { toast.error(err.message); }
    setConfirmAction(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cycle Management"
        description="Create and manage review cycles"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Cycles' }]}
        actions={
          <Button asChild><Link to="/admin/cycles/new"><Plus className="mr-2 h-4 w-4" />Create Cycle</Link></Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : cycles.length === 0 ? (
        <EmptyState icon={<Target className="h-12 w-12" />} title="No cycles" description="Create your first review cycle to get started." action={<Button asChild><Link to="/admin/cycles/new">Create Cycle</Link></Button>} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.cycle_id}>
                    <TableCell className="font-medium">
                      <Link to={`/admin/cycles/${cycle.cycle_id}`} className="hover:text-primary">{cycle.cycle_name}</Link>
                    </TableCell>
                    <TableCell>{format(new Date(cycle.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(cycle.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{cycle.duration_months}mo</TableCell>
                    <TableCell><StatusBadge status={cycle.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {cycle.status === 'DRAFT' && (
                          <>
                            <Button asChild variant="ghost" size="sm"><Link to={`/admin/cycles/${cycle.cycle_id}`}>Edit</Link></Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'activate', id: cycle.cycle_id })}>
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'delete', id: cycle.cycle_id })}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                        {cycle.status === 'COMPLETED' && (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'publish', id: cycle.cycle_id })}>
                            <Send className="mr-1 h-3.5 w-3.5" />Publish
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={`${confirmAction?.type === 'delete' ? 'Delete' : confirmAction?.type === 'activate' ? 'Activate' : 'Publish'} Cycle`}
        description={`Are you sure you want to ${confirmAction?.type} this cycle? This action cannot be undone.`}
        confirmLabel={confirmAction?.type === 'delete' ? 'Delete' : confirmAction?.type === 'activate' ? 'Activate' : 'Publish'}
        variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
