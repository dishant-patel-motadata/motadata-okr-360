import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurveyForm, useSaveSurveyDraft, useSubmitSurvey } from '@/hooks/useSurveys';
import { PageHeader } from '@/components/shared/PageHeader';
import { RatingSelector } from '@/components/shared/RatingSelector';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function SurveyForm() {
  const { reviewerId } = useParams<{ reviewerId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSurveyForm(reviewerId || '');
  const saveDraft = useSaveSurveyDraft();
  const submitSurvey = useSubmitSurvey();

  const [responses, setResponses] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = data?.data;

  useEffect(() => {
    if (form) {
      const existing: Record<string, number> = {};
      form.existing_responses.forEach((r) => { existing[r.question_id] = r.rating; });
      setResponses(existing);
      setComment(form.existing_comment || '');
    }
  }, [form]);

  const isCompleted = form?.reviewer.status === 'COMPLETED';
  const answeredCount = Object.keys(responses).length;
  const totalQuestions = form?.questions.length || 0;

  const groupedQuestions = useMemo(() => {
    if (!form) return {};
    return form.questions.reduce<Record<string, typeof form.questions>>((acc, q) => {
      if (!acc[q.category]) acc[q.category] = [];
      acc[q.category].push(q);
      return acc;
    }, {});
  }, [form]);

  const handleSave = async () => {
    if (!reviewerId) return;
    try {
      await saveDraft.mutateAsync({
        reviewerId,
        data: {
          responses: Object.entries(responses).map(([question_id, rating]) => ({ question_id, rating })),
          comment,
        },
      });
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async () => {
    if (!reviewerId) return;
    try {
      await submitSurvey.mutateAsync({
        reviewerId,
        data: {
          responses: Object.entries(responses).map(([question_id, rating]) => ({ question_id, rating })),
          comment,
        },
      });
      toast.success('Survey submitted successfully');
      navigate('/surveys');
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmOpen(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!form) return null;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <PageHeader
        title={`Reviewing: ${form.employee.full_name}`}
        description={`${form.employee.designation} · ${form.employee.department} · ${form.cycle.cycle_name}`}
        breadcrumbs={[{ label: 'Surveys', path: '/surveys' }, { label: form.employee.full_name }]}
      />

      <Alert className="mb-6 border-primary/20 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription>Your responses are completely anonymous. The employee will never see who submitted this feedback.</AlertDescription>
      </Alert>

      {isCompleted && (
        <Alert className="mb-6">
          <AlertDescription>This survey has been submitted and is read-only.</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }} />
        </div>
        <span className="text-sm text-muted-foreground">{answeredCount}/{totalQuestions} answered</span>
      </div>

      {/* Questions by category */}
      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([category, questions]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((q) => (
                <div key={q.question_id} className="space-y-3">
                  <p className="text-sm font-medium">{q.order_number}. {q.question_text}</p>
                  <RatingSelector
                    value={responses[q.question_id] || null}
                    onChange={(val) => setResponses((prev) => ({ ...prev, [q.question_id]: val }))}
                    disabled={isCompleted}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comment */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Additional Comments (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Share any additional feedback about this employee's performance..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isCompleted}
            maxLength={5000}
            rows={4}
          />
          <p className="mt-1 text-xs text-muted-foreground">{comment.length}/5000</p>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isCompleted && (
        <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 rounded-lg border bg-card p-4">
          <Button variant="outline" onClick={handleSave} disabled={saveDraft.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveDraft.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={answeredCount < totalQuestions}>
            <Send className="mr-2 h-4 w-4" />
            Submit
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit Feedback"
        description="Once submitted, you cannot edit your responses. Are you sure you want to continue?"
        confirmLabel="Submit"
        onConfirm={handleSubmit}
        loading={submitSurvey.isPending}
      />
    </div>
  );
}
