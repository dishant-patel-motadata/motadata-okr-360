import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelfFeedback, useSaveSelfFeedbackDraft, useSubmitSelfFeedback } from '@/hooks/useSelfFeedback';
import { useCompetencies } from '@/hooks/useCompetencies';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { RatingSelector } from '@/components/shared/RatingSelector';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Send, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function SelfFeedbackForm() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: fbData, isLoading: fbLoading } = useSelfFeedback(cycleId || '');
  const { data: compData } = useCompetencies({ applicable_to: user?.group_name, is_active: true });
  const saveDraft = useSaveSelfFeedbackDraft();
  const submitFb = useSubmitSelfFeedback();

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const competencies = compData?.data || [];
  const feedback = fbData?.data;
  const isSubmitted = feedback?.status === 'SUBMITTED';

  useEffect(() => {
    if (feedback?.competency_ratings) {
      const existing: Record<string, number> = {};
      feedback.competency_ratings.forEach((r) => { existing[r.competency_id] = r.rating; });
      setRatings(existing);
    }
  }, [feedback]);

  const answeredCount = Object.keys(ratings).length;

  const handleSave = async () => {
    if (!cycleId) return;
    try {
      await saveDraft.mutateAsync({
        cycleId,
        data: { competency_ratings: Object.entries(ratings).map(([competency_id, rating]) => ({ competency_id, rating })) },
      });
      toast.success('Draft saved');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSubmit = async () => {
    if (!cycleId) return;
    try {
      await submitFb.mutateAsync({
        cycleId,
        data: { competency_ratings: Object.entries(ratings).map(([competency_id, rating]) => ({ competency_id, rating })) },
      });
      toast.success('Self-feedback submitted');
      navigate('/dashboard');
    } catch (err: any) { toast.error(err.message); }
    setConfirmOpen(false);
  };

  if (fbLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <PageHeader
        title="Self-Assessment"
        description="Rate yourself on each competency"
        breadcrumbs={[{ label: 'Self-Feedback' }]}
      />

      <Alert className="mb-6 border-accent/20 bg-accent/5">
        <Info className="h-4 w-4 text-accent" />
        <AlertDescription>Self-ratings are for your reference only and do NOT count toward your final 360 score.</AlertDescription>
      </Alert>

      {isSubmitted && (
        <Alert className="mb-6"><AlertDescription>This self-feedback has been submitted and is read-only.</AlertDescription></Alert>
      )}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${competencies.length ? (answeredCount / competencies.length) * 100 : 0}%` }} />
        </div>
        <span className="text-sm text-muted-foreground">{answeredCount}/{competencies.length} rated</span>
      </div>

      <div className="space-y-4">
        {competencies.map((comp) => (
          <Card key={comp.competency_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{comp.competency_name}</CardTitle>
              {comp.description && <p className="text-sm text-muted-foreground">{comp.description}</p>}
            </CardHeader>
            <CardContent>
              <RatingSelector
                value={ratings[comp.competency_id] || null}
                onChange={(val) => setRatings((prev) => ({ ...prev, [comp.competency_id]: val }))}
                disabled={isSubmitted}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {!isSubmitted && (
        <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 rounded-lg border bg-card p-4">
          <Button variant="outline" onClick={handleSave} disabled={saveDraft.isPending}>
            <Save className="mr-2 h-4 w-4" />{saveDraft.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={answeredCount < competencies.length}>
            <Send className="mr-2 h-4 w-4" />Submit
          </Button>
        </div>
      )}

      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Submit Self-Assessment" description="Once submitted, you cannot edit your self-feedback. Continue?" confirmLabel="Submit" onConfirm={handleSubmit} loading={submitFb.isPending} />
    </div>
  );
}
