import { useParams, useNavigate } from 'react-router-dom';
import { useEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useCompetencies } from '@/hooks/useCompetencies';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/lib/types';

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useEmployee(id || '');
  const { data: compData } = useCompetencies();
  const updateEmployee = useUpdateEmployee();

  const [groupName, setGroupName] = useState<Role>('IC');
  const [crossGroups, setCrossGroups] = useState('');

  const emp = data?.data;
  const competencies = compData?.data || [];

  useEffect(() => {
    if (emp) {
      setGroupName(emp.group_name);
      setCrossGroups(emp.cross_functional_groups?.join(', ') || '');
    }
  }, [emp]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateEmployee.mutateAsync({
        id,
        data: {
          group_name: groupName,
          cross_functional_groups: crossGroups.split(',').map(s => s.trim()).filter(Boolean),
        },
      });
      toast.success('Employee updated');
    } catch (err: any) { toast.error(err.message); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!emp) return null;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <PageHeader
        title={emp.full_name}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Employees', path: '/admin/employees' }, { label: emp.full_name }]}
      />

      <div className="space-y-6">
        {/* Read-only info */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Employee Information (from AD)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><Label className="text-muted-foreground">Email</Label><p>{emp.email}</p></div>
            <div><Label className="text-muted-foreground">Department</Label><p>{emp.department}</p></div>
            <div><Label className="text-muted-foreground">Designation</Label><p>{emp.designation}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><p><Badge variant={emp.is_active ? 'default' : 'secondary'}>{emp.is_active ? 'Active' : 'Inactive'}</Badge></p></div>
            <div><Label className="text-muted-foreground">Date of Joining</Label><p>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : 'N/A'}</p></div>
            <div><Label className="text-muted-foreground">Employee ID</Label><p>{emp.employee_id}</p></div>
          </CardContent>
        </Card>

        {/* Editable fields */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Editable Fields</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Role / Group</Label>
              <Select value={groupName} onValueChange={(v) => setGroupName(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cross-Functional Groups (comma-separated)</Label>
              <Input value={crossGroups} onChange={(e) => setCrossGroups(e.target.value)} placeholder="Engineering, Product, Design" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/admin/employees')}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
