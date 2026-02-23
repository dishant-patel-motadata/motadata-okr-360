import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateCycle, useUpdateCycle, useCycle } from '@/hooks/useCycles';
import type { CreateCyclePayload } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';

const cycleSchema = z.object({
  cycle_name: z.string().min(3).max(100),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  duration_months: z.number(),
  grace_period_days: z.number().min(0).max(7),
  enable_self_feedback: z.boolean(),
  enable_colleague_feedback: z.boolean(),
});

type CycleFormData = z.infer<typeof cycleSchema>;

export default function CycleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';
  const { data: cycleData } = useCycle(isEdit ? id : '');
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      cycle_name: '',
      start_date: '',
      end_date: '',
      duration_months: 6,
      grace_period_days: 3,
      enable_self_feedback: true,
      enable_colleague_feedback: true,
    },
  });

  useEffect(() => {
    if (cycleData?.data) {
      const c = cycleData.data;
      reset({
        cycle_name: c.cycle_name,
        start_date: c.start_date.split('T')[0],
        end_date: c.end_date.split('T')[0],
        duration_months: c.duration_months,
        grace_period_days: c.grace_period_days,
        enable_self_feedback: c.enable_self_feedback,
        enable_colleague_feedback: c.enable_colleague_feedback,
      });
    }
  }, [cycleData, reset]);

  const onSubmit = async (data: CycleFormData) => {
    try {
      const payload = { ...data, reminder_schedule: [7, 3, 1] } as CreateCyclePayload & { reminder_schedule: number[] };
      if (isEdit) {
        await updateCycle.mutateAsync({ id, data: payload });
        toast.success('Cycle updated');
      } else {
        await createCycle.mutateAsync(payload);
        toast.success('Cycle created');
      }
      navigate('/admin/cycles');
    } catch (err: any) { toast.error(err.message); }
  };

  const isPending = createCycle.isPending || updateCycle.isPending;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <PageHeader
        title={isEdit ? 'Edit Cycle' : 'Create Cycle'}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Cycles', path: '/admin/cycles' }, { label: isEdit ? 'Edit' : 'New' }]}
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Cycle Name</Label>
              <Input {...register('cycle_name')} placeholder="Q1 2026 Review" />
              {errors.cycle_name && <p className="text-xs text-destructive">{errors.cycle_name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" {...register('start_date')} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...register('end_date')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Select value={String(watch('duration_months'))} onValueChange={(v) => setValue('duration_months', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 4, 6, 12].map((m) => (<SelectItem key={m} value={String(m)}>{m} months</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grace Period (days)</Label>
                <Input type="number" min={0} max={7} {...register('grace_period_days', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={watch('enable_self_feedback')} onCheckedChange={(v) => setValue('enable_self_feedback', v)} />
                <Label>Self-Feedback</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={watch('enable_colleague_feedback')} onCheckedChange={(v) => setValue('enable_colleague_feedback', v)} />
                <Label>Colleague Feedback</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/cycles')}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Update' : 'Create'} Cycle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
