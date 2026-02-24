import { useState, useMemo } from "react";
import {
  useAssignments,
  useDeleteAssignment,
} from "@/hooks/useAssignments";
import { useEmployees } from "@/hooks/useEmployees";
import { PageHeader } from "@/components/shared/PageHeader";
import { CycleSelector } from "@/components/shared/CycleSelector";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Loader2, ClipboardList, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

export default function AssignmentList() {
  const [cycleId, setCycleId] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const { data, isLoading } = useAssignments({
    cycle_id: cycleId,
    page,
    limit: 500,
  });
  const { data: empData } = useEmployees({ limit: 500 });
  const deleteAssignment = useDeleteAssignment();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const allAssignments = data?.data?.rows || [];
  const employees = empData?.data || [];

  // Get unique departments from employees
  const departments = useMemo(() => {
    return [...new Set(employees.map((e) => e.department))].filter(Boolean).sort();
  }, [employees]);

  // Filter assignments by search (employee name or ID) and status/department
  const assignments = useMemo(() => {
    let filtered = allAssignments;

    // Search by employee name or employee_id
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((a) => {
        const name = a.employees?.full_name?.toLowerCase() || "";
        const empId = a.employees?.employee_id?.toLowerCase() || a.employee_id?.toLowerCase() || "";
        return name.includes(q) || empId.includes(q);
      });
    }

    // Filter by status
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Filter by department
    if (departmentFilter && departmentFilter !== "all") {
      filtered = filtered.filter((a) => a.employees?.department === departmentFilter);
    }

    return filtered;
  }, [allAssignments, search, statusFilter, departmentFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAssignment.mutateAsync(deleteId);
      toast.success("Assignment deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("all");
  };

  const hasFilters = search || statusFilter !== "all" || departmentFilter !== "all";

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Survey Assignments"
        description="Manage employee survey assignments"
        breadcrumbs={[{ label: "Admin" }, { label: "Assignments" }]}
        actions={<CycleSelector value={cycleId} onChange={setCycleId} />}
      />

      {/* Search and Filters */}
      {cycleId && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!cycleId ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="Select a cycle"
          description="Choose a review cycle to manage assignments."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title={hasFilters ? "No matching assignments" : "No assignments"}
          description={hasFilters ? "Try adjusting your search or filters." : "No assignments found for this cycle."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.assignment_id}>
                    <TableCell className="font-medium">
                      {a.employees?.full_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {a.employees?.employee_id || a.employee_id}
                    </TableCell>
                    <TableCell>{a.employees?.department}</TableCell>
                    <TableCell>{a.employees?.group_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/assignments/${a.assignment_id}`}>
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(a.assignment_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Assignment"
        description="This will remove the assignment and all associated reviewers."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
