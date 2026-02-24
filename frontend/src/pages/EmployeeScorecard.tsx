import { useParams } from 'react-router-dom';
import { useEmployeeScore, useScoreComparison } from '@/hooks/useScores';
import { useEmployeeComments } from '@/hooks/useResults';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { downloadFile } from '@/api/client';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { getLabelForScore } from '@/lib/constants';

function getCompetencyScore(val: any): number {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
  return 0;
}

function getCategoryScore(val: any): number {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
  return 0;
}

export default function EmployeeScorecard() {
  const { employeeId, cycleId } = useParams<{ employeeId: string; cycleId: string }>();
  const { user } = useAuth();
  const { data: scoreData, isLoading } = useEmployeeScore(employeeId || '', cycleId || '');
  const { data: commentsData } = useEmployeeComments(employeeId || '', cycleId || '');

  const score = scoreData?.data;
  const comments = commentsData?.data || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!score || !user) return null;

  const employeeName = score.employees?.full_name || 'Employee';
  const cycleName = score.review_cycles?.cycle_name || '';

  const radarData = Object.entries(score.competency_scores || {}).map(([name, val]: [string, any]) => ({
    competency: name,
    score: getCompetencyScore(val),
  }));

  const categoryData = Object.entries(score.reviewer_category_scores || {}).map(([type, val]: [string, any]) => ({
    type: type.replace(/_/g, ' '),
    score: getCategoryScore(val),
  }));

  const handleDownload = async () => {
    try {
      await downloadFile(`/api/v1/reports/individual/${employeeId}/cycle/${cycleId}`, `scorecard-${employeeId}.pdf`);
    } catch { toast.error('Failed to download report'); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Scorecard: ${employeeName}`}
        description={cycleName ? `Cycle: ${cycleName}` : undefined}
        breadcrumbs={[{ label: 'Results' }, { label: employeeName }]}
        actions={
          user.group_name === 'CXO' ? (
            <Button variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
          ) : null
        }
      />

      <div className="space-y-6">
        {/* Overall */}
        <Card>
          <CardContent className="flex items-center gap-6 py-6">
            <ScoreBadge score={score.colleague_score} label={score.final_label} viewerRole={user.group_name} size="lg" />
            <div className="text-sm text-muted-foreground">
              <p>Based on {score.total_reviewers} reviewers</p>
              {score.self_score != null && <p>Self-score: {score.self_score.toFixed(2)}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {radarData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Competency Radar</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="competency" className="text-xs" />
                    <PolarRadiusAxis domain={[0, 4]} />
                    <Radar dataKey="score" className="stroke-primary fill-primary/20" strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {categoryData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">By Reviewer Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 4]} />
                    <YAxis type="category" dataKey="type" width={120} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="score" className="fill-primary" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Competency Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Competency Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(score.competency_scores || {}).map(([name, val]: [string, any]) => {
                const numScore = getCompetencyScore(val);
                const label = val?.label || getLabelForScore(numScore);
                return (
                  <div key={name} className="flex items-center gap-4">
                    <span className="w-40 truncate text-sm font-medium">{name}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(numScore / 4) * 100}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-10 text-right">{numScore.toFixed(1)}</span>
                    <ScoreBadge label={label as any} viewerRole={user.group_name} size="sm" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        {comments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Anonymous Comments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comments.map((c: any, i: number) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm">{c.comment_text || c.text || c}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
