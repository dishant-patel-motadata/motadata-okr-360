import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDepartmentResults } from '@/hooks/useResults';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { getLabelForScore } from '@/lib/constants';

export default function DepartmentResults() {
  const { cycleId: paramCycleId } = useParams<{ cycleId: string }>();
  const [cycleId, setCycleId] = useState(paramCycleId || '');
  const { data, isLoading } = useDepartmentResults(cycleId);
  const { user } = useAuth();
  const results = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Department Results"
        description="View department-wide feedback scores"
        breadcrumbs={[{ label: 'Analysis', path: '/dashboard' }, { label: 'Department Results' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} />}
      />

      {!cycleId ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to view department results." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="No results" description="No department results available for this cycle." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.employee_id}>
                    <TableCell className="font-medium">{r.employee_name || r.full_name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.group_name}</TableCell>
                    <TableCell>{r.colleague_score?.toFixed(2)}</TableCell>
                    <TableCell>
                      <ScoreBadge score={r.colleague_score} label={r.final_label || getLabelForScore(r.colleague_score)} viewerRole={user?.group_name || 'HOD'} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm"><Link to={`/employee/${r.employee_id}/results/${cycleId}`}>View</Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
