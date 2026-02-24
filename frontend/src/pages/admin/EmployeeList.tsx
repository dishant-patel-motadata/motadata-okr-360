import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Loader2, Users, RefreshCw, Search } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { useSyncEmployees } from "@/hooks/useEmployees";
import { toast } from "sonner";

export default function EmployeeList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [groupName, setGroupName] = useState("");

  const { data, isLoading } = useEmployees({
    page,
    limit: 20,
    search: search || undefined,
    department: department || undefined,
    group_name: groupName || undefined,
    is_active: true,
  });
  const syncEmployees = useSyncEmployees();

  const employees = data?.data || [];
  const meta = data?.meta;

  const handleSync = async () => {
    try {
      await syncEmployees.mutateAsync();
      toast.success("Employee sync triggered");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Employee Management"
        description="Manage employees and their roles"
        breadcrumbs={[{ label: "Admin" }, { label: "Employees" }]}
        actions={
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncEmployees.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncEmployees.isPending ? "animate-spin" : ""}`}
            />
            Sync from AD
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={groupName}
          onValueChange={(v) => setGroupName(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No employees found"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.employee_id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {emp.employee_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {emp.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.email}
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.group_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={emp.is_active ? "default" : "secondary"}
                        className={
                          emp.is_active
                            ? "bg-rating-outstanding-bg text-rating-outstanding"
                            : ""
                        }
                      >
                        {emp.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/employees/${emp.employee_id}`}>
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
