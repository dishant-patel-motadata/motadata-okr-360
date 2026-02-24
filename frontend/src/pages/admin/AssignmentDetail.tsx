import { useParams } from "react-router-dom";
import {
  useAssignment,
  useRemoveReviewer,
  useAddReviewer,
} from "@/hooks/useAssignments";
import { useEmployees } from "@/hooks/useEmployees";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Plus, Trash2, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { REVIEWER_TYPE_LABELS } from "@/lib/constants";
import type { ReviewerType } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useAssignment(id || "");
  const { data: empData } = useEmployees({ limit: 500 });
  const removeReviewer = useRemoveReviewer();
  const addReviewer = useAddReviewer();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newReviewerEmpId, setNewReviewerEmpId] = useState("");
  const [newReviewerType, setNewReviewerType] = useState<ReviewerType>("PEER");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const assignment = data?.data;
  const reviewers = assignment?.survey_reviewers || [];
  const employees = empData?.data || [];

  // Filter employees for search - exclude the ratee and already assigned reviewers
  const filteredEmployees = useMemo(() => {
    if (!assignment) return [];
    const existingReviewerIds = new Set(reviewers.map((r) => r.reviewer_employee_id));
    const rateeId = assignment.employee_id;

    return employees.filter((e) => {
      // Exclude the ratee (person being reviewed)
      if (e.employee_id === rateeId) return false;
      // Exclude already assigned reviewers
      if (existingReviewerIds.has(e.employee_id)) return false;
      // Filter by search term
      if (employeeSearch) {
        const q = employeeSearch.toLowerCase();
        const nameMatch = e.full_name?.toLowerCase().includes(q);
        const idMatch = e.employee_id?.toLowerCase().includes(q);
        return nameMatch || idMatch;
      }
      return true;
    });
  }, [employees, assignment, reviewers, employeeSearch]);

  // Get selected employee display name
  const selectedEmployee = employees.find((e) => e.employee_id === newReviewerEmpId);

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      await removeReviewer.mutateAsync(removeId);
      toast.success("Reviewer removed");
    } catch (err: any) {
      toast.error(err.message);
    }
    setRemoveId(null);
  };

  const handleAdd = async () => {
    if (!id || !newReviewerEmpId) return;
    try {
      await addReviewer.mutateAsync({
        assignment_id: id,
        reviewer_employee_id: newReviewerEmpId,
        reviewer_type: newReviewerType,
      });
      toast.success("Reviewer added");
      setAddOpen(false);
      setNewReviewerEmpId("");
      setEmployeeSearch("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!assignment) return null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Assignment Detail"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Assignments", path: "/admin/assignments" },
          {
            label:
              assignment.employees.full_name ||
              assignment.employees.employee_id,
          },
        ]}
        actions={
          <Dialog open={addOpen} onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) {
              setNewReviewerEmpId("");
              setEmployeeSearch("");
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Reviewer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Reviewer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Search Employee</Label>
                  <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeePopoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedEmployee ? (
                          <span className="truncate">
                            {selectedEmployee.full_name} ({selectedEmployee.employee_id})
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Search by name or ID...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Type employee name or ID..."
                          value={employeeSearch}
                          onValueChange={setEmployeeSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No employees found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {filteredEmployees.slice(0, 50).map((emp) => (
                              <CommandItem
                                key={emp.employee_id}
                                value={emp.employee_id}
                                onSelect={() => {
                                  setNewReviewerEmpId(emp.employee_id);
                                  setEmployeePopoverOpen(false);
                                  setEmployeeSearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newReviewerEmpId === emp.employee_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{emp.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {emp.employee_id} · {emp.department} · {emp.group_name}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Reviewer Type</Label>
                  <Select
                    value={newReviewerType}
                    onValueChange={(v) => setNewReviewerType(v as ReviewerType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REVIEWER_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={addReviewer.isPending || !newReviewerEmpId}
                  className="w-full"
                >
                  {addReviewer.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Reviewer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Assignment Info
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div>
              <p className="font-medium">
                {assignment.employees.full_name ||
                  assignment.employees.employee_id}
              </p>
              <p className="text-sm text-muted-foreground">
                {assignment.employees.department} ·{" "}
                {assignment.employees.group_name}
              </p>
            </div>
            <StatusBadge status={assignment.status} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Reviewers ({reviewers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewers.map((r) => (
                  <TableRow key={r.reviewer_id}>
                    <TableCell className="font-medium">
                      {r.reviewer_name || r.reviewer_employee_id}
                    </TableCell>
                    <TableCell>{r.reviewer_department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {REVIEWER_TYPE_LABELS[r.reviewer_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.completed_at
                        ? new Date(r.completed_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoveId(r.reviewer_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={() => setRemoveId(null)}
        title="Remove Reviewer"
        description="Are you sure you want to remove this reviewer?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
