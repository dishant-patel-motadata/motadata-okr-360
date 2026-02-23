import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Surveys from "@/pages/Surveys";
import SurveyForm from "@/pages/SurveyForm";
import SelfFeedbackForm from "@/pages/SelfFeedbackForm";
import MyResults from "@/pages/MyResults";
import TeamResults from "@/pages/TeamResults";
import DepartmentResults from "@/pages/DepartmentResults";
import OrgResults from "@/pages/OrgResults";
import EmployeeScorecard from "@/pages/EmployeeScorecard";
import CycleList from "@/pages/admin/CycleList";
import CycleForm from "@/pages/admin/CycleForm";
import EmployeeList from "@/pages/admin/EmployeeList";
import EmployeeDetail from "@/pages/admin/EmployeeDetail";
import AssignmentList from "@/pages/admin/AssignmentList";
import AssignmentDetail from "@/pages/admin/AssignmentDetail";
import CompetencyList from "@/pages/admin/CompetencyList";
import QuestionBank from "@/pages/admin/QuestionBank";
import Reports from "@/pages/admin/Reports";
import AdminSettings from "@/pages/admin/Settings";
import AuditLogs from "@/pages/admin/AuditLogs";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="surveys" element={<Surveys />} />
              <Route path="surveys/:reviewerId" element={<SurveyForm />} />
              <Route path="self-feedback/:cycleId" element={<SelfFeedbackForm />} />
              <Route path="self-feedback" element={<Dashboard />} />
              <Route path="my-results" element={<MyResults />} />
              <Route path="my-results/:cycleId" element={<MyResults />} />
              <Route path="team/results" element={<TeamResults />} />
              <Route path="team/results/:cycleId" element={<TeamResults />} />
              <Route path="department/results" element={<DepartmentResults />} />
              <Route path="department/results/:cycleId" element={<DepartmentResults />} />
              <Route path="org/results" element={<OrgResults />} />
              <Route path="org/results/:cycleId" element={<OrgResults />} />
              <Route path="employee/:employeeId/results/:cycleId" element={<EmployeeScorecard />} />
              <Route path="admin/cycles" element={<ProtectedRoute requiredRole="CXO"><CycleList /></ProtectedRoute>} />
              <Route path="admin/cycles/new" element={<ProtectedRoute requiredRole="CXO"><CycleForm /></ProtectedRoute>} />
              <Route path="admin/cycles/:id" element={<ProtectedRoute requiredRole="CXO"><CycleForm /></ProtectedRoute>} />
              <Route path="admin/employees" element={<ProtectedRoute requiredRole="CXO"><EmployeeList /></ProtectedRoute>} />
              <Route path="admin/employees/:id" element={<ProtectedRoute requiredRole="CXO"><EmployeeDetail /></ProtectedRoute>} />
              <Route path="admin/assignments" element={<ProtectedRoute requiredRole="CXO"><AssignmentList /></ProtectedRoute>} />
              <Route path="admin/assignments/:id" element={<ProtectedRoute requiredRole="CXO"><AssignmentDetail /></ProtectedRoute>} />
              <Route path="admin/competencies" element={<ProtectedRoute requiredRole="CXO"><CompetencyList /></ProtectedRoute>} />
              <Route path="admin/questions" element={<ProtectedRoute requiredRole="CXO"><QuestionBank /></ProtectedRoute>} />
              <Route path="admin/reports" element={<ProtectedRoute requiredRole="CXO"><Reports /></ProtectedRoute>} />
              <Route path="admin/settings" element={<ProtectedRoute requiredRole="CXO"><AdminSettings /></ProtectedRoute>} />
              <Route path="admin/audit-logs" element={<ProtectedRoute requiredRole="CXO"><AuditLogs /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
