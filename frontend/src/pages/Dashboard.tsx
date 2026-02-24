import { useAuth } from '@/hooks/useAuth';
import { useMyScores } from '@/hooks/useScores';
import { usePendingSurveys } from '@/hooks/useSurveys';
import { useCycles } from '@/hooks/useCycles';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { PageHeader } from '@/components/shared/PageHeader';
import { ScoreBadge } from '@/components/shared/ScoreBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, UserCircle, BarChart3, Target, Users, FileText, Loader2 } from 'lucide-react';
import { hasRole } from '@/lib/constants';

export default function Dashboard() {
  const { user } = useAuth();
  const { data: scoresData } = useMyScores();
  const { data: pendingData } = usePendingSurveys();
  const { data: cyclesData } = useCycles({ status: 'ACTIVE', limit: 1 });

  const activeCycle = cyclesData?.data?.[0];
  const pendingSurveys = pendingData?.data?.filter((s) => s.status !== 'COMPLETED') || [];
  const scores = scoresData?.data || [];
  const latestScore = scores[0];

  const { data: adminData } = useAdminDashboard(activeCycle?.cycle_id || '');
  const admin = adminData?.data;

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome, ${user.full_name}`}
        description={`${user.designation} · ${user.department}`}
      />

      {/* Common cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Active Cycle */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cycle</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeCycle ? (
              <>
                <p className="text-lg font-semibold">{activeCycle.cycle_name}</p>
                <p className="text-xs text-muted-foreground">
                  Ends {new Date(activeCycle.end_date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active cycle</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Surveys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Surveys</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingSurveys.length}</p>
            {pendingSurveys.length > 0 && (
              <Button asChild variant="link" className="h-auto p-0 text-xs">
                <Link to="/surveys">Complete Now →</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Self-Feedback Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Self-Feedback</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeCycle ? (
              <Button asChild variant="link" className="h-auto p-0">
                <Link to={`/self-feedback/${activeCycle.cycle_id}`}>Fill Self-Assessment →</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">No active cycle</p>
            )}
          </CardContent>
        </Card>

        {/* Latest Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latestScore ? (
              <ScoreBadge
                score={latestScore.colleague_score}
                label={latestScore.final_label}
                viewerRole={user.group_name}
                size="md"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No scores yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CXO Admin Dashboard */}
      {hasRole(user.group_name, 'CXO') && admin && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Administration Overview</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cycle Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span className="font-medium">{admin.completed_assignments}/{admin.total_assignments}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-rating-outstanding"
                      style={{ width: `${admin.total_assignments ? (admin.completed_assignments / admin.total_assignments) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{admin.total_employees}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/cycles"><Target className="mr-2 h-3.5 w-3.5" />Manage Cycles</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/assignments"><ClipboardList className="mr-2 h-3.5 w-3.5" />Assignments</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/reports"><FileText className="mr-2 h-3.5 w-3.5" />Reports</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Department Stats */}
          {admin.department_stats && admin.department_stats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Department Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {admin.department_stats.map((dept) => (
                    <div key={dept.department} className="flex items-center gap-4">
                      <span className="w-32 truncate text-sm">{dept.department}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${dept.completion_rate}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{dept.completion_rate}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TM/HOD Quick Links */}
      {hasRole(user.group_name, 'TM') && !hasRole(user.group_name, 'CXO') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Team Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to={activeCycle ? `/team/results/${activeCycle.cycle_id}` : '#'}>
                <Users className="mr-2 h-3.5 w-3.5" />View Team Results
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
