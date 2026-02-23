import { usePendingSurveys } from '@/hooks/useSurveys';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertTriangle, ShieldCheck, Loader2, Clock } from 'lucide-react';
import { REVIEWER_TYPE_LABELS } from '@/lib/constants';
import { differenceInDays, parseISO } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Surveys() {
  const { data, isLoading } = usePendingSurveys();
  const surveys = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pending Surveys"
        description="Complete your assigned feedback surveys"
        breadcrumbs={[{ label: 'Surveys' }]}
      />

      <Alert className="mb-6 border-primary/20 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          All feedback is anonymous. Your identity will never be shared with the person you are reviewing.
        </AlertDescription>
      </Alert>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="No pending surveys"
          description="You have no surveys to complete at this time."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => {
            const daysLeft = differenceInDays(parseISO(survey.end_date), new Date());
            const isUrgent = daysLeft <= 3 && daysLeft >= 0;
            const isCompleted = survey.status === 'COMPLETED';

            return (
              <Card key={survey.reviewer_id} className={isCompleted ? 'opacity-60' : ''}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {REVIEWER_TYPE_LABELS[survey.reviewer_type]}
                    </Badge>
                    <StatusBadge status={survey.status} />
                  </div>
                  <h3 className="text-lg font-semibold">{survey.employee_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {survey.employee_designation} · {survey.employee_department}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{survey.cycle_name}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {isUrgent && <AlertTriangle className="h-3 w-3" />}
                      <Clock className="h-3 w-3" />
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
                    </span>
                    {!isCompleted ? (
                      <Button asChild size="sm">
                        <Link to={`/surveys/${survey.reviewer_id}`}>
                          {survey.status === 'IN_PROGRESS' ? 'Continue' : 'Start Survey'}
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">✓ Completed</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
