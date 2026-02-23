import { useReviewerConfig, useUpdateReviewerConfig } from '@/hooks/useAdmin';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export default function AdminSettings() {
  const { data, isLoading } = useReviewerConfig();
  const updateConfig = useUpdateReviewerConfig();
  const [min, setMin] = useState(2);
  const [max, setMax] = useState(8);

  useEffect(() => {
    if (data?.data) {
      setMin(data.data.min_reviewers);
      setMax(data.data.max_reviewers);
    }
  }, [data]);

  const handleSave = async () => {
    if (min > max) { toast.error('Minimum must be ≤ maximum'); return; }
    try {
      await updateConfig.mutateAsync({ min_reviewers: min, max_reviewers: max });
      toast.success('Settings saved');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <PageHeader title="Admin Settings" breadcrumbs={[{ label: 'Admin' }, { label: 'Settings' }]} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4" />Reviewer Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum reviewers per employee</Label>
            <Input type="number" min={1} max={20} value={min} onChange={(e) => setMin(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Maximum reviewers per employee</Label>
            <Input type="number" min={1} max={50} value={max} onChange={(e) => setMax(Number(e.target.value))} />
          </div>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
