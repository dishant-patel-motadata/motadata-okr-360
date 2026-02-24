import { useState } from 'react';
import { useCycles } from '@/hooks/useCycles';
import { useEmployees } from '@/hooks/useEmployees';
import { PageHeader } from '@/components/shared/PageHeader';
import { CycleSelector } from '@/components/shared/CycleSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadFile } from '@/api/client';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const [cycleId, setCycleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [downloading, setDownloading] = useState('');

  const { data: empData } = useEmployees({ limit: 500 });
  const employees = empData?.data || [];

  const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      let path = '';
      let filename = '';
      if (type === 'individual') {
        path = `/api/v1/reports/individual/${employeeId}/cycle/${cycleId}`;
        filename = `individual-report-${employeeId}.pdf`;
      } else if (type === 'department') {
        path = `/api/v1/reports/department/cycle/${cycleId}?department=${department}`;
        filename = `department-report-${department}.pdf`;
      } else if (type === 'org') {
        path = `/api/v1/reports/org/cycle/${cycleId}`;
        filename = `org-report.pdf`;
      } else if (type === 'csv') {
        path = `/api/v1/reports/export/cycle/${cycleId}`;
        filename = `data-export.csv`;
      }
      await downloadFile(path, filename);
      toast.success('Download started');
    } catch (err: any) { toast.error(err.message || 'Download failed'); }
    setDownloading('');
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports & Export"
        description="Generate and download feedback reports"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Reports' }]}
      />

      <div className="mb-6">
        <CycleSelector value={cycleId} onChange={setCycleId} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Individual Report */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Individual Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.employee_id} value={e.employee_id}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => handleDownload('individual')} disabled={!cycleId || !employeeId || downloading === 'individual'} className="w-full">
              {downloading === 'individual' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF
            </Button>
          </CardContent>
        </Card>

        {/* Department Report */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Department Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => handleDownload('department')} disabled={!cycleId || !department || downloading === 'department'} className="w-full">
              {downloading === 'department' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF
            </Button>
          </CardContent>
        </Card>

        {/* Org Report */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Organization Report</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={() => handleDownload('org')} disabled={!cycleId || downloading === 'org'} className="w-full">
              {downloading === 'org' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF
            </Button>
          </CardContent>
        </Card>

        {/* CSV Export */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />Data Export (CSV)</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={() => handleDownload('csv')} disabled={!cycleId || downloading === 'csv'} className="w-full">
              {downloading === 'csv' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
