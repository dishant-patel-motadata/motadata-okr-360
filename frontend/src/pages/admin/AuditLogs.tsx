import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAdmin';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ScrollText, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs({ page, limit: 50 });
  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Audit Logs"
        description="Track all system activities"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Audit Logs' }]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-12 w-12" />} title="No audit logs" description="Activity logs will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <Collapsible key={log.log_id} asChild>
                    <>
                      <TableRow>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                        <TableCell>{log.user_name || log.user_id.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline">{log.action_type}</Badge></TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entity_id.slice(0, 12)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.ip_address}</TableCell>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm"><ChevronDown className="h-3.5 w-3.5" /></Button>
                          </CollapsibleTrigger>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-semibold mb-1">Old Value:</p>
                                <pre className="overflow-auto rounded bg-muted p-2 max-h-40">{log.old_value ? JSON.stringify(log.old_value, null, 2) : '—'}</pre>
                              </div>
                              <div>
                                <p className="font-semibold mb-1">New Value:</p>
                                <pre className="overflow-auto rounded bg-muted p-2 max-h-40">{log.new_value ? JSON.stringify(log.new_value, null, 2) : '—'}</pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
