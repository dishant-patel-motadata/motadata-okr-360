import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgResults } from '@/hooks/useResults';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Loader2, Globe, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLabelForScore } from '@/lib/constants';

export default function OrgResults() {
  const { cycleId: paramCycleId } = useParams<{ cycleId: string }>();
  const [cycleId, setCycleId] = useState(paramCycleId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const { data, isLoading } = useOrgResults(cycleId);

  // Backend returns { success, data: { cycle, summary, employees: [...], department_summary } }
  const payload = data?.data;
  const results = payload?.employees || [];
  const summary = payload?.summary;
  const deptSummary = payload?.department_summary || [];

  // Filter employees by search term (name or employee_id)
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter((r: any) => {
      const name = (r.employees?.full_name ?? r.full_name ?? '').toLowerCase();
      const id = (r.employee_id ?? '').toLowerCase();
      const dept = (r.employees?.department ?? r.department ?? '').toLowerCase();
      return name.includes(term) || id.includes(term) || dept.includes(term);
    });
  }, [results, searchTerm]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Organization Results"
        description="View organization-wide feedback scores"
        breadcrumbs={[{ label: 'Analysis', path: '/dashboard' }, { label: 'Organization Results' }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} status="COMPLETED,PUBLISHED" />}
      />

      {!cycleId ? (
        <EmptyState icon={<Globe className="h-12 w-12" />} title="Select a cycle" description="Choose a review cycle to view org results." />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : results.length === 0 ? (
        <EmptyState icon={<Globe className="h-12 w-12" />} title="No results" description="No org results available for this cycle." />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.total_employees}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Org Avg</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{summary.org_avg?.toFixed(2) ?? 'N/A'}</p></CardContent>
              </Card>
            </div>
          )}

          {deptSummary.length > 0 && (
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-base">Department Summary</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Label</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptSummary.map((d: any) => (
                      <TableRow key={d.department}>
                        <TableCell className="font-medium">{d.department}</TableCell>
                        <TableCell>{d.employee_count}</TableCell>
                        <TableCell>{d.avg_score?.toFixed(2)}</TableCell>
                        <TableCell>
                          <ScoreBadge score={d.avg_score} label={getLabelForScore(d.avg_score)} viewerRole="CXO" size="sm" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">All Employees</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or department..."
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
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Label</TableHead>
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
                    filteredResults.map((r: any) => (
                      <TableRow key={r.employee_id}>
                        <TableCell className="font-medium">{r.employees?.full_name ?? r.full_name}</TableCell>
                        <TableCell>{r.employees?.department ?? r.department}</TableCell>
                        <TableCell>{r.employees?.group_name ?? r.group_name}</TableCell>
                        <TableCell>{r.colleague_score?.toFixed(2)}</TableCell>
                        <TableCell>
                          <ScoreBadge score={r.colleague_score} label={r.final_label || getLabelForScore(r.colleague_score)} viewerRole="CXO" size="sm" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm"><Link to={`/employee/${r.employee_id}/results/${cycleId}`}>View</Link></Button>
                        </TableCell>
                      </TableRow>
                    ))
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
