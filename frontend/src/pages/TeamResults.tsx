import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTeamResults } from '@/hooks/useResults';
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

  // Backend returns { success, data: { cycle_id, team: [...], summary } }
  const payload = data?.data;
  const results = payload?.team || [];
  const summary = payload?.summary;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Team Results"
        description="View your team members' feedback scores"
        breadcrumbs={[{ label: 'Analysis', path: '/dashboard' }, { label: 'Team Results' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} status="COMPLETED,PUBLISHED" />}
      />

      {!cycleId ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to view team results." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No results" description="No team results available for this cycle." />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.total_members}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Scored</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.scored}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Team Avg</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.team_avg?.toFixed(2) ?? 'N/A'}</p></CardContent>
              </Card>
            </div>
          )}
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
                  {results.map((r: any) => {
                    const score = r.score;
                    return (
                      <TableRow key={r.employee_id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.designation}</TableCell>
                        <TableCell>{score?.colleague_score?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell>
                          {score ? (
                            <ScoreBadge score={score.colleague_score} label={score.final_label || getLabelForScore(score.colleague_score)} viewerRole={user?.group_name || 'TM'} size="sm" />
                          ) : (
                            <span className="text-muted-foreground text-sm">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>{score?.total_reviewers ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" disabled={!score}>
                            <Link to={`/employee/${r.employee_id}/results/${cycleId}`}>View Detail</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
