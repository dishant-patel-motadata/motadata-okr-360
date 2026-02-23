import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTeamResults } from '@/hooks/useResults';
import { useCycles } from '@/hooks/useCycles';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { getLabelForScore } from '@/lib/constants';

export default function TeamResults() {
  const { cycleId: paramCycleId } = useParams<{ cycleId: string }>();
  const [cycleId, setCycleId] = useState(paramCycleId || '');
  const { data, isLoading } = useTeamResults(cycleId);
  const { user } = useAuth();

  const results = data?.data || [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Team Results"
        description="View your team members' feedback scores"
        breadcrumbs={[{ label: 'Analysis', path: '/dashboard' }, { label: 'Team Results' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} />}
      />

      {!cycleId ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to view team results." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No results" description="No team results available for this cycle." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Reviewers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.employee_id}>
                    <TableCell className="font-medium">{r.employee_name || r.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.designation}</TableCell>
                    <TableCell>{r.colleague_score?.toFixed(2)}</TableCell>
                    <TableCell>
                      <ScoreBadge score={r.colleague_score} label={r.final_label || getLabelForScore(r.colleague_score)} viewerRole={user?.group_name || 'TM'} size="sm" />
                    </TableCell>
                    <TableCell>{r.total_reviewers}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/employee/${r.employee_id}/results/${cycleId}`}>View Detail</Link>
                      </Button>
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
