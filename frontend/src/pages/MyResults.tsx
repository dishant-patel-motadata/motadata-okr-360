import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyScores, useEmployeeScore } from '@/hooks/useScores';
import { useEmployeeComments } from '@/hooks/useResults';
import { PageHeader } from '@/components/shared/PageHeader';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { getLabelForScore } from '@/lib/constants';

function getCycleName(s: any): string {
  return s.review_cycles?.cycle_name || s.cycle_name || s.cycle_id?.slice(0, 8) || 'Unknown';
}

function getCategoryScore(val: any): number {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
  return 0;
}

function getCompetencyScore(val: any): number {
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && typeof val.score === 'number') return val.score;
  return 0;
}

// Detail view for a specific cycle
function MyResultsDetail({ cycleId }: { cycleId: string }) {
  const { user } = useAuth();
  const { data: scoreData, isLoading } = useEmployeeScore(user?.employee_id || '', cycleId);
  const { data: commentsData } = useEmployeeComments(user?.employee_id || '', cycleId);

  const score = scoreData?.data;
  const comments = commentsData?.data || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!score || !user) return <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No results" description="Score not available for this cycle yet." />;

  const radarData = Object.entries(score.competency_scores || {}).map(([name, val]: [string, any]) => ({
    competency: name,
    score: getCompetencyScore(val),
  }));

  const categoryData = Object.entries(score.reviewer_category_scores || {}).map(([type, val]: [string, any]) => ({
    type: type.replace(/_/g, ' '),
    score: getCategoryScore(val),
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Results"
        description={`Cycle: ${getCycleName(score)}`}
        breadcrumbs={[{ label: 'My Results', path: '/my-results' }, { label: getCycleName(score) }]}
      />

      <div className="space-y-6">
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
              <CardHeader><CardTitle className="text-sm font-medium">Competency Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
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
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 4]} className="text-xs" />
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
          <CardHeader><CardTitle className="text-sm font-medium">Competency Scores</CardTitle></CardHeader>
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

        <Button asChild variant="outline">
          <Link to="/my-results">← Back to all cycles</Link>
        </Button>
      </div>
    </div>
  );
}

// Overview of all cycles
export default function MyResults() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user } = useAuth();
  const { data, isLoading } = useMyScores();
  const scores = data?.data || [];

  // If cycleId is in URL, show detail view
  if (cycleId) {
    return <MyResultsDetail cycleId={cycleId} />;
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  const latestScore = scores[0];

  // Trend data
  const trendData = [...scores].reverse().map((s: any) => ({
    cycle: getCycleName(s),
    score: s.colleague_score,
  }));

  // Competency radar data
  const radarData = latestScore
    ? Object.entries(latestScore.competency_scores || {}).map(([name, val]: [string, any]) => ({
        competency: name,
        score: getCompetencyScore(val),
      }))
    : [];

  // Reviewer category data
  const categoryData = latestScore
    ? Object.entries(latestScore.reviewer_category_scores || {}).map(([type, val]: [string, any]) => ({
        type: type.replace(/_/g, ' '),
        score: getCategoryScore(val),
      }))
    : [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Results"
        description="Your 360 feedback scores across cycles"
        breadcrumbs={[{ label: 'My Results' }]}
      />

      {scores.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-12 w-12" />} title="No results yet" description="Your feedback scores will appear here once a cycle is published." />
      ) : (
        <div className="space-y-6">
          {/* Overall Score */}
          {latestScore && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score — {getCycleName(latestScore)}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <ScoreBadge score={latestScore.colleague_score} label={latestScore.final_label} viewerRole={user.group_name} size="lg" />
                <span className="text-sm text-muted-foreground">Based on {latestScore.total_reviewers} reviewers</span>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trend Chart */}
            {trendData.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Score Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="cycle" className="text-xs" />
                      <YAxis domain={[1, 4]} className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" className="stroke-primary" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Radar Chart */}
            {radarData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Competency Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
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

            {/* Reviewer Category */}
            {categoryData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">By Reviewer Type</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" domain={[0, 4]} className="text-xs" />
                      <YAxis type="category" dataKey="type" width={120} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="score" className="fill-primary" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cycles list */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">All Cycles</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scores.map((s: any) => (
                  <div key={s.calc_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{getCycleName(s)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.calculated_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreBadge score={s.colleague_score} label={s.final_label} viewerRole={user.group_name} size="sm" />
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/my-results/${s.cycle_id}`}>View →</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
