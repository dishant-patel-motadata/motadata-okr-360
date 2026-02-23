import { useState } from 'react';
import { useCompetencies, useCreateCompetency, useUpdateCompetency } from '@/hooks/useCompetencies';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@/lib/types';

export default function CompetencyList() {
  const { data, isLoading } = useCompetencies();
  const createComp = useCreateCompetency();
  const updateComp = useUpdateCompetency();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ competency_id: '', competency_name: '', description: '', applicable_to: [] as Role[] });

  const competencies = data?.data || [];

  const handleCreate = async () => {
    try {
      await createComp.mutateAsync(form);
      toast.success('Competency created');
      setAddOpen(false);
      setForm({ competency_id: '', competency_name: '', description: '', applicable_to: [] });
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateComp.mutateAsync({ id, data: { is_active: !currentActive } });
      toast.success('Competency updated');
    } catch (err: any) { toast.error(err.message); }
  };

  const toggleRole = (role: Role) => {
    setForm(prev => ({
      ...prev,
      applicable_to: prev.applicable_to.includes(role) ? prev.applicable_to.filter(r => r !== role) : [...prev.applicable_to, role],
    }));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Competency Management"
        description="Define and manage behavioral competencies"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Competencies' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Competency</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Competency</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>ID (e.g. COMM)</Label><Input value={form.competency_id} onChange={(e) => setForm(p => ({ ...p, competency_id: e.target.value.toUpperCase() }))} /></div>
                <div className="space-y-2"><Label>Name</Label><Input value={form.competency_name} onChange={(e) => setForm(p => ({ ...p, competency_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Applicable To</Label>
                  <div className="flex gap-4">
                    {(['IC', 'TM', 'HOD', 'CXO'] as Role[]).map(role => (
                      <label key={role} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.applicable_to.includes(role)} onCheckedChange={() => toggleRole(role)} />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createComp.isPending} className="w-full">
                  {createComp.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : competencies.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-12 w-12" />} title="No competencies" description="Add your first competency." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Applicable To</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competencies.map((c) => (
                  <TableRow key={c.competency_id}>
                    <TableCell className="font-mono text-xs">{c.competency_id}</TableCell>
                    <TableCell className="font-medium">{c.competency_name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">{c.description}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">{c.applicable_to.map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}</div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.competency_id, c.is_active)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
