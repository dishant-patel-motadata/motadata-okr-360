import { useState } from 'react';
import { useQuestions, useCreateQuestion, useUpdateQuestion } from '@/hooks/useQuestions';
import { useCompetencies } from '@/hooks/useCompetencies';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('IC');
  const { data, isLoading } = useQuestions({ set_type: activeTab });
  const { data: compData } = useCompetencies();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ question_text: '', category: '', competency_id: '', order_number: 1 });

  const questions = data?.data || [];
  const competencies = compData?.data || [];

  const handleCreate = async () => {
    try {
      await createQuestion.mutateAsync({ ...form, set_type: activeTab as any, order_number: form.order_number });
      toast.success('Question created');
      setAddOpen(false);
      setForm({ question_text: '', category: '', competency_id: '', order_number: 1 });
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await updateQuestion.mutateAsync({ id, data: { is_active: !current } });
      toast.success('Question updated');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Question Bank"
        description="Manage feedback questions by role"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Questions' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Question</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Question ({activeTab})</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Question Text</Label><Textarea value={form.question_text} onChange={(e) => setForm(p => ({ ...p, question_text: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Communication" /></div>
                <div className="space-y-2">
                  <Label>Competency</Label>
                  <Select value={form.competency_id} onValueChange={(v) => setForm(p => ({ ...p, competency_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select competency" /></SelectTrigger>
                    <SelectContent>{competencies.map(c => <SelectItem key={c.competency_id} value={c.competency_id}>{c.competency_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Order #</Label><Input type="number" value={form.order_number} onChange={(e) => setForm(p => ({ ...p, order_number: Number(e.target.value) }))} /></div>
                <Button onClick={handleCreate} disabled={createQuestion.isPending} className="w-full">
                  {createQuestion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="IC">IC Questions</TabsTrigger>
          <TabsTrigger value="TM">TM Questions</TabsTrigger>
          <TabsTrigger value="HOD">HOD Questions</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : questions.length === 0 ? (
            <EmptyState icon={<HelpCircle className="h-12 w-12" />} title="No questions" description={`No ${activeTab} questions found.`} />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Competency</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q) => (
                      <TableRow key={q.question_id}>
                        <TableCell className="text-muted-foreground">{q.order_number}</TableCell>
                        <TableCell className="font-medium max-w-md">{q.question_text}</TableCell>
                        <TableCell><Badge variant="outline">{q.category}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{q.competency_id}</TableCell>
                        <TableCell>
                          <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q.question_id, q.is_active)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
