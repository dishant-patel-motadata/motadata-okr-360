import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDepartmentResults } from '@/hooks/useResults';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Loader2, Building2, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { getLabelForScore } from '@/lib/constants';

export default function DepartmentResults() {
  const { cycleId: paramCycleId } = useParams<{ cycleId: string }>();
  const [cycleId, setCycleId] = useState(paramCycleId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useDepartmentResults(cycleId);
  const { user } = useAuth();

  // Backend returns { success, data: { department, cycle_id, summary, employees: [...], manager_groups } }
  const payload = data?.data;
  const results = payload?.employees || [];
  const summary = payload?.summary;

  // Filter employees by search term (name or employee_id)
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter((r: any) => {
      const name = (r.full_name ?? '').toLowerCase();
      const id = (r.employee_id ?? '').toLowerCase();
      const role = (r.group_name ?? '').toLowerCase();
      return name.includes(term) || id.includes(term) || role.includes(term);
    });
  }, [results, searchTerm]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Department Results"
        description={payload?.department ? `Department: ${payload.department}` : 'View department-wide feedback scores'}
        breadcrumbs={[{ label: 'Analysis', path: '/dashboard' }, { label: 'Department Results' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} status="COMPLETED,PUBLISHED" />}
      />

      {!cycleId ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to view department results." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Building2 className="h-12 w-12" />} title="No results" description="No department results available for this cycle." />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.total}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Scored</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.scored}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Dept Avg</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.dept_avg?.toFixed(2) ?? 'N/A'}</p></CardContent>
              </Card>
            </div>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Employees</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Reviewers</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No employees match your search' : 'No employees found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResults.map((r: any) => {
                      const score = r.score;
                      return (
                        <TableRow key={r.employee_id}>
                          <TableCell className="font-medium">{r.full_name}</TableCell>
                          <TableCell>{r.group_name}</TableCell>
                          <TableCell>{score?.colleague_score?.toFixed(2) ?? '—'}</TableCell>
                          <TableCell>
                            {score ? (
                              <ScoreBadge score={score.colleague_score} label={score.final_label || getLabelForScore(score.colleague_score)} viewerRole={user?.group_name || 'HOD'} size="sm" />
                            ) : (
                              <span className="text-muted-foreground text-sm">Pending</span>
                            )}
                          </TableCell>
                          <TableCell>{score?.total_reviewers ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" disabled={!score}>
                              <Link to={`/employee/${r.employee_id}/results/${cycleId}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
