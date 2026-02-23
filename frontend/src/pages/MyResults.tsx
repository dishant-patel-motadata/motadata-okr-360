import { useAuth } from '@/hooks/useAuth';
import { useMyScores } from '@/hooks/useScores';
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

export default function MyResults() {
  const { user } = useAuth();
  const { data, isLoading } = useMyScores();
  const scores = data?.data || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return null;

  const latestScore = scores[0];

  // Trend data
  const trendData = [...scores].reverse().map((s) => ({
    cycle: s.cycle_name || s.cycle_id.slice(0, 8),
    score: s.colleague_score,
  }));

  // Competency radar data
  const radarData = latestScore
    ? Object.entries(latestScore.competency_scores).map(([name, val]) => ({
        competency: name,
        score: val.score,
      }))
    : [];

  // Reviewer category data
  const categoryData = latestScore
    ? Object.entries(latestScore.reviewer_category_scores).map(([type, score]) => ({
        type: type.replace(/_/g, ' '),
        score,
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score — {latestScore.cycle_name}</CardTitle>
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
                {scores.map((s) => (
                  <div key={s.calc_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{s.cycle_name || s.cycle_id.slice(0, 8)}</p>
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
