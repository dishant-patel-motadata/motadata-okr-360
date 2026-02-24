// Auth
export interface AuthUser {
  userId: string;
  employeeId: string;
  email: string;
  full_name: string;
  group_name: 'IC' | 'TM' | 'HOD' | 'CXO';
  department: string;
  designation: string;
  isActive: boolean;
}

export type Role = 'IC' | 'TM' | 'HOD' | 'CXO';

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ValidationError {
  success: false;
  error: 'VALIDATION_ERROR';
  errors: Array<{ field: string; message: string }>;
}

// Cycles
export interface ReviewCycle {
  cycle_id: string;
  cycle_name: string;
  start_date: string;
  end_date: string;
  duration_months: 3 | 4 | 6 | 12;
  grace_period_days: number;
  status: CycleStatus;
  enable_self_feedback: boolean;
  enable_colleague_feedback: boolean;
  reminder_schedule: number[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSING' | 'COMPLETED' | 'PUBLISHED';

export interface CreateCyclePayload {
  cycle_name: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  grace_period_days: number;
  enable_self_feedback: boolean;
  enable_colleague_feedback: boolean;
  reminder_schedule: number[];
}

// Employees
export interface Employee {
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  reporting_manager_id: string | null;
  reporting_manager_name?: string;
  date_of_joining: string;
  is_active: boolean;
  group_name: Role;
  cross_functional_groups: string[];
  applicable_competencies: string[];
  last_synced_at: string;
}

// Competencies
export interface Competency {
  competency_id: string;
  competency_name: string;
  description: string;
  applicable_to: Role[];
  is_active: boolean;
}

// Questions
export interface Question {
  question_id: string;
  set_type: 'IC' | 'TM' | 'HOD';
  order_number: number;
  question_text: string;
  category: string;
  competency_id: string;
  is_active: boolean;
}

// Self Feedback
export interface SelfFeedback {
  self_feedback_id: string;
  employee_id: string;
  cycle_id: string;
  competency_ratings: Array<{
    competency_id: string;
    rating: number;
  }>;
  status: 'DRAFT' | 'SUBMITTED';
  submitted_at: string | null;
}

// Surveys / Reviewers
export interface PendingReviewer {
  reviewer_id: string;
  assignment_id: string;
  reviewer_type: ReviewerType;
  question_set: 'IC' | 'TM' | 'HOD';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  access_token: string;
  employee_name: string;
  employee_designation: string;
  employee_department: string;
  cycle_name: string;
  end_date: string;
}

export type ReviewerType = 'MANAGER' | 'PEER' | 'DIRECT_REPORT' | 'INDIRECT_REPORT' | 'CROSS_FUNCTIONAL' | 'CXO';

export interface SurveyForm {
  reviewer: {
    reviewer_id: string;
    reviewer_type: string;
    status: string;
    question_set: 'IC' | 'TM' | 'HOD';
  };
  employee: {
    full_name: string;
    designation: string;
    department: string;
  };
  cycle: {
    cycle_name: string;
    end_date: string;
  };
  questions: Array<{
    question_id: string;
    question_text: string;
    category: string;
    competency_id: string;
    order_number: number;
  }>;
  existing_responses: Array<{
    question_id: string;
    rating: number;
  }>;
  existing_comment: string | null;
}

// Scores
export interface CalculatedScore {
  calc_id: string;
  employee_id: string;
  cycle_id: string;
  self_score: number | null;
  colleague_score: number;
  final_label: RatingLabel;
  competency_scores: Record<string, { score: number; label: string }>;
  reviewer_category_scores: Record<string, number>;
  total_reviewers: number;
  calculated_at: string;
  cycle_name?: string;
}

export type RatingLabel = 'Outstanding Impact' | 'Significant Impact' | 'Moderate Impact' | 'Not Enough Impact';

// Assignments
export interface Assignment {
  assignment_id: string;
  employee_id: string;
  cycle_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  employee_name?: string;
  employee_department?: string;
  employee_designation?: string;
  employee_group_name?: Role;
  reviewers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentReviewer {
  reviewer_id: string;
  assignment_id: string;
  reviewer_employee_id: string;
  reviewer_name?: string;
  reviewer_department?: string;
  reviewer_type: ReviewerType;
  question_set: 'IC' | 'TM' | 'HOD';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  access_token: string;
  completed_at: string | null;
}

// Audit Logs
export interface AuditLog {
  log_id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_value: object | null;
  new_value: object | null;
  ip_address: string;
  created_at: string;
  user_name?: string;
}

// Admin Dashboard
export interface AdminDashboard {
  total_assignments: number;
  completed_assignments: number;
  pending_assignments: number;
  in_progress_assignments: number;
  self_feedback_completion: number;
  total_employees: number;
  department_stats: Array<{
    department: string;
    total: number;
    completed: number;
    completion_rate: number;
  }>;
  recent_audit_logs: AuditLog[];
}

// Reviewer Config
export interface ReviewerConfig {
  min_reviewers: number;
  max_reviewers: number;
}

// Sync Logs
export interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  total_records: number;
  added: number;
  updated: number;
  errors: number;
  created_at: string;
}
