# 360 Feedback Platform — Complete Frontend Specification for Lovable

> **Purpose:** This document is a complete, self-contained prompt for Lovable to build the entire frontend for the Motadata 360 Feedback Platform. It covers every page, component, API integration, authentication flow, role-based access, data shapes, and UI/UX details. The backend is already fully built and deployed.

---

## 1. Project Overview

### 1.1 What We're Building

A **360-degree feedback platform** for employee performance evaluation at Motadata (~300–400 employees across 20 departments, scalable to 1,000+). Employees are reviewed anonymously by managers, peers, direct reports, and cross-functional colleagues on behavioral competencies using a 1–4 rating scale.

### 1.2 Tech Stack (Frontend)

| Layer | Technology |
|---|---|
| Framework | **React 18+** with **TypeScript** |
| Routing | **React Router v6** (or TanStack Router) |
| Styling | **Tailwind CSS** + **shadcn/ui** components |
| State/Data | **TanStack Query (React Query)** for server state |
| Forms | **React Hook Form** + **Zod** validation |
| Charts | **Recharts** (radar, bar, line, pie charts) |
| Tables | **TanStack Table** for data grids with sort/filter/pagination |
| PDF trigger | Download links (PDF generated server-side) |
| Icons | **Lucide React** |
| Toasts/Notifications | **sonner** or shadcn toast |
| Date Picker | **shadcn date picker** (uses date-fns) |
| File Upload | **react-dropzone** for CSV uploads |

### 1.3 Design System

- **Desktop-first**, fully responsive down to tablet (mobile is secondary)
- **Clean, professional** SaaS-style enterprise UI
- Light mode primary, optional dark mode
- Use shadcn/ui component library as the base
- Color scheme for rating labels:

| Rating | Label | Color | Hex | Badge Variant |
|---|---|---|---|---|
| 4 | Outstanding Impact | Green | `#22C55E` | `bg-green-100 text-green-800` |
| 3 | Significant Impact | Blue | `#3B82F6` | `bg-blue-100 text-blue-800` |
| 2 | Moderate Impact | Amber | `#F59E0B` | `bg-amber-100 text-amber-800` |
| 1 | Not Enough Impact | Red | `#EF4444` | `bg-red-100 text-red-800` |

---

## 2. Authentication

### 2.1 Auth System

The backend uses **better-auth** (session-based with cookies). All auth is cookie-based — **no manual JWT/token handling needed**. Just set `credentials: 'include'` on every fetch request.

### 2.2 Auth Endpoints

| Action | Method | URL | Body | Response |
|---|---|---|---|---|
| **Sign Up** | POST | `/api/auth/sign-up/email` | `{ email, password, name }` | `{ user, session }` |
| **Sign In** | POST | `/api/auth/sign-in/email` | `{ email, password }` | `{ user, session }` |
| **Sign Out** | POST | `/api/auth/sign-out` | — | `{ success: true }` |
| **Get Session** | GET | `/api/auth/get-session` | — | `{ user, session }` or `null` |
| **Get Profile** | GET | `/api/v1/auth/me` | — | Full employee profile with role |

### 2.3 Auth Flow Implementation

```typescript
// api/client.ts — Base API client
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // CRITICAL: sends session cookie
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Redirect to login
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error || json.message);
  return json;
}
```

### 2.4 Auth Context

```typescript
// The /api/v1/auth/me endpoint returns:
interface AuthUser {
  userId: string;        // better-auth user ID
  employeeId: string;    // AD employee ID
  email: string;
  fullName: string;
  group_name: 'IC' | 'TM' | 'HOD' | 'CXO';  // THIS IS THE ROLE
  department: string;
  designation: string;
  isActive: boolean;
}
```

- On app load, call `GET /api/v1/auth/me`. If it returns a user → authenticated. If 401 → show login.
- Store in React context. Roles drive what navigation items and pages are visible.
- `group_name` is the role field: `IC`, `TM`, `HOD`, `CXO` (CXO = admin/HR).

### 2.5 Login Page

- Simple centered card with email + password fields
- "Sign In" button → `POST /api/auth/sign-in/email`
- On success, redirect to `/dashboard`
- Show validation errors inline (wrong password, account doesn't exist)
- Motadata branding/logo at top
- No "sign up" link (employees are AD-synced; admin uses seed script)

---

## 3. API Conventions

### 3.1 Response Envelope

Every API response follows this shape:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error: string | null;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 3.2 Validation Errors (422)

```typescript
interface ValidationError {
  success: false;
  error: 'VALIDATION_ERROR';
  errors: Array<{ field: string; message: string }>;
}
```

Map these to form field errors using React Hook Form's `setError`.

### 3.3 Pagination Pattern

All list endpoints support `?page=1&limit=20`. The response `meta` object contains pagination info. Implement a reusable `<Pagination />` component.

---

## 4. Role-Based Access Control

### 4.1 Role Hierarchy

```
CXO (Admin/HR)  — Full access, system configuration, all reports
  └── HOD        — Department-level view, own dept employees
      └── TM     — Team-level view, direct reports
          └── IC  — Personal view only
```

### 4.2 Navigation Items by Role

| Nav Item | IC | TM | HOD | CXO |
|---|---|---|---|---|
| Dashboard (My Results) | ✅ | ✅ | ✅ | ✅ |
| Pending Surveys | ✅ | ✅ | ✅ | ✅ |
| Self-Feedback | ✅ | ✅ | ✅ | ✅ |
| Team Results | ❌ | ✅ | ✅ | ✅ |
| Department Results | ❌ | ❌ | ✅ | ✅ |
| Organization Results | ❌ | ❌ | ❌ | ✅ |
| Cycle Management | ❌ | ❌ | ❌ | ✅ |
| Employee Management | ❌ | ❌ | ❌ | ✅ |
| Survey Assignments | ❌ | ❌ | ❌ | ✅ |
| Competency Management | ❌ | ❌ | ❌ | ✅ |
| Question Bank | ❌ | ❌ | ❌ | ✅ |
| Reports & Export | ❌ | ❌ | ❌ | ✅ |
| Admin Settings | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ❌ | ✅ |

### 4.3 Anonymity Rules (CRITICAL)

| Data Point | IC (Self) | TM/HOD (Team) | CXO (Admin) |
|---|---|---|---|
| Reviewer Name | **NEVER** | **NEVER** | YES (audit only) |
| Reviewer Department | **NEVER** | **NEVER** | YES (audit only) |
| Aggregated Score | **Label Only** | Label + Numeric | Label + Numeric |
| Competency Breakdown | Label Only | Numeric | Numeric |
| Individual Responses | **NEVER** | **NEVER** | YES (audit only) |
| Comments | Anonymized text | Anonymized text | Anonymized text |

**Implementation:** When displaying scores:
- For IC viewing their own results: Show label badges only (e.g., "Significant Impact"), NO numeric scores
- For TM/HOD/CXO viewing others: Show numeric + label
- Never show who gave what rating anywhere in the UI

---

## 5. Layout & Navigation

### 5.1 App Shell

```
┌─────────────────────────────────────────────────────┐
│  [Logo] Motadata 360 Feedback    [User Menu ▾]      │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │         Main Content Area                │
│ Nav      │                                          │
│          │                                          │
│ • Dash   │                                          │
│ • Surveys│                                          │
│ • Self   │                                          │
│ • Team   │                                          │
│ • ...    │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  Footer (optional)                                   │
└─────────────────────────────────────────────────────┘
```

- **Sidebar:** Collapsible left navigation with icons + labels. Group items: "My Workspace" (dashboard, surveys, self-feedback) | "Analysis" (team/dept/org results) | "Administration" (cycles, employees, assignments, questions, competencies, reports, settings, audit logs)
- **Top bar:** Logo left, user avatar dropdown right (profile, sign out)
- **Breadcrumbs** on all inner pages

### 5.2 Route Map

```
/login                              — Login page (public)
/dashboard                          — Role-based dashboard home
/surveys                            — My pending surveys list
/surveys/:reviewerId                — Survey form (fill feedback)
/self-feedback/:cycleId             — Self-feedback form
/my-results                         — My historical scores
/my-results/:cycleId                — My score detail for a cycle
/team/results/:cycleId              — Team results (TM/HOD/CXO)
/department/results/:cycleId        — Dept results (HOD/CXO)
/org/results/:cycleId               — Org results (CXO only)
/employee/:employeeId/results/:cycleId — Individual employee scorecard
/admin/cycles                       — Cycle management list
/admin/cycles/new                   — Create new cycle
/admin/cycles/:id                   — Edit cycle / cycle detail
/admin/employees                    — Employee directory
/admin/employees/:id                — Employee detail / edit
/admin/assignments                  — Survey assignment management
/admin/assignments/:id              — Assignment detail
/admin/competencies                 — Competency management
/admin/questions                    — Question bank
/admin/reports                      — Report generation
/admin/settings                     — Reviewer config & system settings
/admin/audit-logs                   — Audit log viewer
/survey/token/:token                — Public token-based survey access (no login needed)
```

---

## 6. Complete Page Specifications

---

### 6.1 Dashboard (`/dashboard`)

The dashboard is role-adaptive. Show different widgets based on `group_name`.

#### API Calls on Load:
- `GET /api/v1/scores/my` → historical scores
- `GET /api/v1/reviewers/pending` → pending surveys count
- `GET /api/v1/admin/dashboard?cycle_id={activeCycleId}` → (CXO only) cycle stats

#### All Roles — Common Widgets:
1. **Welcome Banner:** "Welcome, {fullName}" with role badge, department
2. **Active Cycle Card:** Show current active cycle name, dates, status, days remaining
3. **Pending Surveys Count:** Card with count + "Complete Now" CTA → `/surveys`
4. **Self-Feedback Status:** Card showing if self-feedback is pending/draft/submitted for active cycle
5. **My Latest Score:** Show last cycle's final_label as a big colored badge. IC sees label only. TM/HOD/CXO sees numeric + label.

#### CXO-Only Dashboard Widgets:
From `GET /api/v1/admin/dashboard?cycle_id={id}`:
6. **Cycle Progress:** Donut/pie chart: assignments completed vs pending vs in-progress
7. **Self-Feedback Completion:** Progress bar showing % of employees who submitted self-feedback
8. **Department Completion Heatmap:** Table with departments as rows, showing completion %
9. **Quick Actions:** Cards linking to "Create Cycle", "Manage Assignments", "Generate Reports"
10. **Recent Audit Log:** Last 5 audit entries (mini table)

#### TM Dashboard Additions:
6. **Team Overview Card:** Count of direct reports, avg team score (if published)

#### HOD Dashboard Additions:
6. **Department Overview Card:** Employee count, avg department score

---

### 6.2 Pending Surveys (`/surveys`)

#### API: `GET /api/v1/reviewers/pending`

Shows a list of surveys the logged-in user needs to complete as a reviewer.

#### Response Shape:
```typescript
interface PendingReviewer {
  reviewer_id: string;        // UUID
  assignment_id: string;
  reviewer_type: 'MANAGER' | 'PEER' | 'DIRECT_REPORT' | 'INDIRECT_REPORT' | 'CROSS_FUNCTIONAL' | 'CXO';
  question_set: 'IC' | 'TM' | 'HOD';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  access_token: string;
  // Joined employee data for the person being reviewed:
  employee_name: string;
  employee_designation: string;
  employee_department: string;
  // Cycle info:
  cycle_name: string;
  end_date: string;
}
```

#### UI:
- **Card grid** or **table** listing each pending survey
- Each card shows: Employee name, their designation, department, reviewer type badge, deadline, status badge (Pending/In Progress/Completed)
- **"Start Survey" / "Continue" button** → navigates to `/surveys/{reviewerId}`
- Completed ones shown greyed out with checkmark
- Show **confidentiality notice banner** at top: *"All feedback is anonymous. Your identity will never be shared with the person you are reviewing."*
- Filter/sort by status, deadline
- Show urgency indicator (red deadline if < 3 days away)

---

### 6.3 Survey Form (`/surveys/:reviewerId`)

This is the main feedback form where a reviewer rates an employee.

#### API Calls:
- `GET /api/v1/surveys/form/:reviewerId` → loads form data (employee info, questions, existing responses)
- `POST /api/v1/surveys/form/:reviewerId/save` → save draft
- `POST /api/v1/surveys/form/:reviewerId/submit` → final submission (locked after)

#### GET Response Shape:
```typescript
interface SurveyForm {
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
    question_id: string;      // e.g. 'IC-01'
    question_text: string;
    category: string;         // e.g. 'Communication'
    competency_id: string;
    order_number: number;
  }>;
  existing_responses: Array<{
    question_id: string;
    rating: number;
  }>;
  existing_comment: string | null;
}
```

#### UI Layout:
1. **Header:** "Reviewing: {employee_name}" | "{designation}, {department}" | "Cycle: {cycle_name}" | "Deadline: {end_date}"
2. **Confidentiality Notice** (dismissible banner): "Your responses are completely anonymous. The employee will never see who submitted this feedback."
3. **Questions grouped by category** (Communication, Teamwork, etc.) — collapsible sections
4. Each question: question text + **4-point radio button group** or **star rating** with labels:
   - 1 = Not Enough Impact (Red)
   - 2 = Moderate Impact (Amber)
   - 3 = Significant Impact (Blue)
   - 4 = Outstanding Impact (Green)
5. **Comment box** at the bottom (optional, max 5000 chars): "Additional comments about this employee's performance"
6. **Sticky footer** with two buttons:
   - "Save Draft" (saves progress, can return later)
   - "Submit" (final — confirmation dialog first: "Once submitted, you cannot edit your responses. Continue?")
7. **Progress indicator:** "12/15 questions answered"
8. If already submitted (`status === 'COMPLETED'`): Show read-only view with submitted responses, "Submitted on {date}" badge

#### POST Body (save/submit):
```json
{
  "responses": [
    { "question_id": "IC-01", "rating": 3 },
    { "question_id": "IC-02", "rating": 4 }
  ],
  "comment": "Great team player with strong communication skills."
}
```

---

### 6.4 Token-Based Survey (`/survey/token/:token`)

Same form as above but accessed via a direct link (no login required).

#### API: `GET /api/v1/reviewers/by-token/:token`

Returns reviewer info. Then use the same form flow but with token auth header or the reviewer_id from the response.

---

### 6.5 Self-Feedback Form (`/self-feedback/:cycleId`)

#### API Calls:
- `GET /api/v1/self-feedback/:cycleId` → current self-feedback (draft or submitted)
- `POST /api/v1/self-feedback/:cycleId` → save draft
- `POST /api/v1/self-feedback/:cycleId/submit` → final submission

#### GET Response:
```typescript
interface SelfFeedback {
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
```

Also need competency list: `GET /api/v1/competencies?applicable_to={user.group_name}&is_active=true`

#### UI:
1. **Header:** "Self-Assessment — {cycle_name}"
2. **Instructions:** "Rate yourself on each competency. Self-ratings are for your reference only and do NOT count toward your final 360 score."
3. **Competency cards** — each shows:
   - Competency name + description
   - 4-point rating selector (same color scheme as survey)
4. **Progress:** "8/10 competencies rated"
5. **Save Draft / Submit buttons** (same pattern as survey form)
6. If already submitted: read-only view

#### POST Body:
```json
{
  "competency_ratings": [
    { "competency_id": "COMM", "rating": 3 },
    { "competency_id": "TEAM", "rating": 4 }
  ]
}
```

---

### 6.6 My Results (`/my-results`)

#### API: `GET /api/v1/scores/my`

Returns array of historical calculated scores across all cycles.

#### Response Shape:
```typescript
interface CalculatedScore {
  calc_id: string;
  employee_id: string;
  cycle_id: string;
  self_score: number | null;
  colleague_score: number;
  final_label: 'Outstanding Impact' | 'Significant Impact' | 'Moderate Impact' | 'Not Enough Impact';
  competency_scores: Record<string, { score: number; label: string }>;
  reviewer_category_scores: Record<string, number>;
  total_reviewers: number;
  calculated_at: string;
  // joined:
  cycle_name?: string;
}
```

#### UI:
- **Cycle selector** dropdown at top (or tabs for last 3 cycles)
- **Overall Score Card:** Large badge with final_label
  - **IC role:** Show **label only**, no numeric! (e.g., just "Significant Impact" badge)
  - **TM/HOD/CXO:** Show numeric (e.g., "3.25") + label
- **Trend Chart (Line):** Show colleague_score across cycles (if multiple). X = cycle name, Y = score 1–4
- **Competency Breakdown (Radar Chart):** Spider/radar chart with competency scores
- **Competency Table:** Table with competency name, score, label, bar indicator
- **Reviewer Category Breakdown (Bar Chart):** Horizontal bars per reviewer type (MANAGER, PEER, DIRECT_REPORT, etc.) showing their avg score
- **Self vs Colleagues (if self_score exists):** Side-by-side comparison chart
- Click on a cycle → `/my-results/:cycleId` for detail

### 6.7 My Results Detail (`/my-results/:cycleId`)

#### API:
- `GET /api/v1/scores/employee/{myEmployeeId}/cycle/:cycleId`
- `GET /api/v1/scores/employee/{myEmployeeId}/cycle/:cycleId/comparison` → department comparison
- `GET /api/v1/results/employee/{myEmployeeId}/cycle/:cycleId/comments` → anonymized comments

#### UI:
All the same sections as above but for specific cycle, plus:
- **Department Comparison:** "Your score vs department average" per competency (grouped bar chart)
- **Anonymized Comments Section:** List of comment cards with just the text (no reviewer info)

---

### 6.8 Team Results (`/team/results/:cycleId`) — TM/HOD/CXO

#### API: `GET /api/v1/results/team/cycle/:cycleId`

Shows results for the logged-in user's direct reports.

#### UI:
- **Cycle selector** at top
- **Team summary cards:** Avg team score, highest/lowest performer (name + score)
- **Team members table:**

| Employee | Designation | Score | Label | Competency Avg | Actions |
|---|---|---|---|---|---|
| John Doe | Sr. Engineer | 3.45 | Significant Impact | [mini bar] | View Detail |

- Click "View Detail" → `/employee/:employeeId/results/:cycleId`
- **Competency heatmap:** Grid with employees as rows, competencies as columns, cells colored by score

---

### 6.9 Department Results (`/department/results/:cycleId`) — HOD/CXO

#### API: `GET /api/v1/results/department/cycle/:cycleId?department={dept}&group_name={filter}`

#### UI:
- **Filters:** Department dropdown, Role filter (IC/TM)
- **Department KPIs:** Avg score, total employees, completion rate
- **Employee table** with scores (same columns as team results)
- **Competency analysis:** Department-wide competency averages (bar chart)
- **Manager-wise breakdown:** Group employees by their reporting manager, show team avg per manager

---

### 6.10 Organization Results (`/org/results/:cycleId`) — CXO Only

#### API: `GET /api/v1/results/org/cycle/:cycleId?department={filter}&group_name={filter}`

#### UI:
- **Org KPIs:** Total employees scored, org avg score, top/bottom departments
- **Department comparison bar chart:** Horizontal bars with department avg scores
- **Competency heatmap (org-wide):** Departments as rows, competencies as columns
- **Employee table** with all filters (department, role, score range, search)
- **Score distribution pie chart:** How many employees in each label bucket

---

### 6.11 Employee Scorecard (`/employee/:employeeId/results/:cycleId`)

#### API:
- `GET /api/v1/scores/employee/:employeeId/cycle/:cycleId`
- `GET /api/v1/scores/employee/:employeeId/cycle/:cycleId/comparison`
- `GET /api/v1/results/employee/:employeeId/cycle/:cycleId`
- `GET /api/v1/results/employee/:employeeId/cycle/:cycleId/comments`

#### UI:
Full individual scorecard page:
1. **Header:** Employee name, designation, department, cycle name
2. **Overall Score:** Numeric + label (with color)
3. **Self vs Colleagues:** Two gauge charts side by side
4. **Competency Radar Chart:** Spider chart of all competency scores
5. **Competency Breakdown Table:** Name | Self Score | Colleague Score | Gap | Label
6. **Reviewer Category Chart:** Bar chart by reviewer type
7. **Department Comparison:** Employee score vs dept avg per competency
8. **Comments:** Anonymized reviewer comments in cards
9. **Download PDF** button → `GET /api/v1/reports/individual/:employeeId/cycle/:cycleId` (triggers file download)

---

## 7. Admin Pages (CXO Only)

---

### 7.1 Cycle Management (`/admin/cycles`)

#### API: `GET /api/v1/cycles?page=1&limit=10&status={filter}`

#### List View:
- **Table** with columns: Cycle Name, Start Date, End Date, Duration, Status (color badge), Actions
- **Status badges:** DRAFT (gray), ACTIVE (green), CLOSING (amber), COMPLETED (blue), PUBLISHED (purple)
- **"+ Create Cycle"** button top-right
- **Filter** by status
- Actions per row: View, Edit (DRAFT only), Delete (DRAFT only), Activate, Publish

#### Create/Edit Cycle (`/admin/cycles/new` or `/admin/cycles/:id`)

**API:**
- `POST /api/v1/cycles` (create)
- `PATCH /api/v1/cycles/:id` (update — DRAFT only)
- `DELETE /api/v1/cycles/:id` (delete — DRAFT only)
- `POST /api/v1/cycles/:id/activate` (DRAFT → ACTIVE)
- `POST /api/v1/cycles/:id/publish` (COMPLETED → PUBLISHED)

**Form Fields:**
| Field | Type | Validation |
|---|---|---|
| cycle_name | Text input | 3–100 chars, required |
| start_date | Date picker | Required, YYYY-MM-DD |
| end_date | Date picker | Required, must be after start_date |
| duration_months | Select | Options: 3, 4, 6, 12 |
| grace_period_days | Number input | 0–7, default 3 |
| enable_self_feedback | Toggle/Switch | Default: true |
| enable_colleague_feedback | Toggle/Switch | Default: true |
| reminder_schedule | Multi-number input | Array of days, e.g. [7, 3, 1] |

**Cycle Detail Page** (`/admin/cycles/:id`):
- Cycle info card with all fields
- Status badge + state transition buttons:
  - DRAFT: "Activate Cycle" button (with confirmation dialog)
  - COMPLETED: "Publish Results" button (with confirmation)
- **Assignment overview:** How many employees assigned, completion stats
- **Timeline visualization:** Visual cycle timeline with start → end → grace period

---

### 7.2 Employee Management (`/admin/employees`)

#### API:
- `GET /api/v1/employees?page=1&limit=20&department=&group_name=&is_active=true&search=`
- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id` (update group_name, cross_functional_groups, applicable_competencies)
- `POST /api/v1/employees/sync` (trigger AD sync)
- `GET /api/v1/employees/sync/logs?limit=10`

#### List View:
- **Data table** with columns: Employee ID, Name, Email, Department, Designation, Group/Role (badge), Active (badge), Actions
- **Filters:** Department dropdown, Role dropdown, Active/Inactive toggle, Search bar (name/email)
- **"Sync from AD"** button — triggers `POST /employees/sync`, shows sync progress/result
- **Sync log viewer:** Table showing recent sync logs (date, type, status, counts)
- Pagination

#### Employee Detail (`/admin/employees/:id`):
**Read-only fields (from AD):** Name, Email, Department, Designation, Reporting Manager, Date of Joining, Active status, Last synced

**Editable fields (form):**
| Field | Type | Notes |
|---|---|---|
| group_name | Select | IC, TM, HOD, CXO |
| cross_functional_groups | Multi-select/Tags | Free-text tags e.g. ["Engineering", "Product"] |
| applicable_competencies | Multi-select | Competency IDs from competency list |

Save button → `PATCH /api/v1/employees/:id`

---

### 7.3 Survey Assignment Management (`/admin/assignments`)

This is the most complex admin page. It manages which employees are enrolled in a cycle and who reviews them.

#### APIs:
- `GET /api/v1/assignments?cycle_id={id}&page=1&limit=50&status=&employee_id=&department=`
- `GET /api/v1/assignments/status?cycle_id={id}` → summary stats
- `POST /api/v1/assignments` → `{ employee_id, cycle_id }` — create assignment
- `DELETE /api/v1/assignments/:id` — remove assignment
- `GET /api/v1/assignments/:id` — detail with reviewers
- `GET /api/v1/assignments/:id/suggestions` — auto-suggested reviewers
- `POST /api/v1/assignments/reviewers` → `{ assignment_id, reviewer_employee_id, reviewer_type }` — add reviewer
- `DELETE /api/v1/assignments/reviewers/:reviewerId` — remove reviewer
- `POST /api/v1/assignments/bulk-csv` → multipart file upload — bulk assign via CSV

#### Main View:
1. **Cycle selector** dropdown at top (required — loads assignments for selected cycle)
2. **Status summary cards:** Total assignments, Pending, In Progress, Completed
3. **Assignments table:**

| Employee | Department | Role | Reviewers Count | Status | Actions |
|---|---|---|---|---|---|
| Jane Smith | Engineering | IC | 5/8 | IN_PROGRESS | View / Delete |

4. **Filters:** Status, Department, Employee search
5. **Bulk actions:**
   - "Add Assignment" → dialog with employee search + cycle
   - "Bulk CSV Upload" → file upload dialog (CSV with columns: `employee_id, cycle_id, reviewer_employee_id, reviewer_type`)
6. **Download CSV template** button

#### Assignment Detail (`/admin/assignments/:id`):
- **Employee info card:** Name, department, role
- **Reviewers table:**

| Reviewer Name | Department | Type | Status | Completed At | Actions |
|---|---|---|---|---|---|
| Bob Wilson | Engineering | PEER | COMPLETED | 2026-02-15 | Remove |
| Alice Chen | Product | CROSS_FUNCTIONAL | PENDING | — | Remove |

- **"Add Reviewer" button** → dialog:
  - Employee search/select dropdown
  - Reviewer type dropdown: MANAGER, PEER, DIRECT_REPORT, INDIRECT_REPORT, CROSS_FUNCTIONAL, CXO
  - Save → `POST /api/v1/assignments/reviewers`

- **"Auto-Suggest Reviewers" button** → calls `GET /api/v1/assignments/:id/suggestions`
  - Shows suggested reviewers with types (based on reporting hierarchy)
  - Checkboxes to select which suggestions to add
  - "Add Selected" button

- **Admin survey actions per reviewer:**
  - "Fill On Behalf" button (PENDING reviewers) → Opens survey form in admin mode → `POST /api/v1/surveys/form/:reviewerId/on-behalf`
  - "Reopen" button (COMPLETED reviewers) → `POST /api/v1/surveys/form/:reviewerId/reopen`

---

### 7.4 Competency Management (`/admin/competencies`)

#### API:
- `GET /api/v1/competencies?applicable_to=&is_active=`
- `POST /api/v1/competencies` → create
- `PATCH /api/v1/competencies/:id` → update

#### UI:
- **Table:** Competency ID, Name, Description, Applicable To (badges), Active (toggle), Actions
- **"+ Add Competency"** button → dialog/drawer:

| Field | Type |
|---|---|
| competency_id | Text (uppercase, e.g. "COMM") |
| competency_name | Text |
| description | Textarea |
| applicable_to | Multi-select checkboxes: IC, TM, HOD, CXO |

- **Edit:** Inline or dialog. `competency_id` is read-only after creation.
- **Toggle is_active** directly from the table row

---

### 7.5 Question Bank (`/admin/questions`)

#### API:
- `GET /api/v1/questions?set_type=&competency_id=&is_active=`
- `POST /api/v1/questions` → create
- `PATCH /api/v1/questions/:id` → update
- `POST /api/v1/questions/import/csv` → bulk CSV import (multipart)

#### UI:
- **Tabs:** "IC Questions (15)" | "TM Questions (15)" | "HOD Questions (16)" — each tab filters by `set_type`
- **Table per tab:** Order #, Question ID, Question Text, Category, Competency, Active, Actions
- **"+ Add Question"** button per tab:

| Field | Type |
|---|---|
| question_id | Text (optional, auto-generated e.g. "IC-16") |
| set_type | Pre-filled from active tab |
| order_number | Number |
| question_text | Textarea (5–500 chars) |
| category | Text |
| competency_id | Select from competency list |

- **"Import CSV"** button → file upload
- **Edit:** Dialog with editable fields (question_text, category, competency_id, is_active)
- Drag-to-reorder would be nice (optional — order_number)

---

### 7.6 Reports & Export (`/admin/reports`)

#### APIs:
- `GET /api/v1/reports/individual/:employeeId/cycle/:cycleId` → **returns PDF file**
- `GET /api/v1/reports/department/cycle/:cycleId?department={dept}` → **returns PDF file**
- `GET /api/v1/reports/org/cycle/:cycleId` → **returns PDF file**
- `GET /api/v1/reports/export/cycle/:cycleId` → **returns CSV file**

#### UI:
- **Report type selection:** Cards or tabs:
  1. **Individual Report** — Select employee + cycle → Download PDF
  2. **Department Report** — Select department + cycle → Download PDF
  3. **Organization Report** — Select cycle → Download PDF
  4. **Data Export (CSV)** — Select cycle → Download CSV

- Each section has: Selector dropdowns → "Generate & Download" button
- Show loading spinner while generating
- For file downloads, use: `window.open(url)` or create an anchor with blob URL

```typescript
// File download helper
async function downloadFile(url: string, filename: string) {
  const res = await fetch(`${API_BASE}${url}`, { credentials: 'include' });
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}
```

---

### 7.7 Admin Settings (`/admin/settings`)

#### API:
- `GET /api/v1/admin/reviewer-config`
- `PATCH /api/v1/admin/reviewer-config` → `{ min_reviewers, max_reviewers }`

#### UI:
- **Reviewer Configuration card:**
  - "Minimum reviewers per employee": number input (1–20)
  - "Maximum reviewers per employee": number input (1–50)
  - Save button
  - Validation: min ≤ max

---

### 7.8 Audit Logs (`/admin/audit-logs`)

#### API: `GET /api/v1/admin/audit-logs?page=1&limit=50&action_type=&entity_type=&entity_id=&user_id=&from=&to=`

#### Response Shape:
```typescript
interface AuditLog {
  log_id: string;
  user_id: string;
  action_type: string;    // CREATE, UPDATE, DELETE, ACTIVATE, PUBLISH
  entity_type: string;    // review_cycles, survey_assignments, etc.
  entity_id: string;
  old_value: object | null;
  new_value: object | null;
  ip_address: string;
  created_at: string;
  // joined:
  user_name?: string;
}
```

#### UI:
- **Filterable data table:**
  - Filters: Action type (multi-select), Entity type (multi-select), Date range picker, User search
  - Columns: Timestamp, User, Action, Entity Type, Entity ID, IP Address, Actions
- Click row → Expandable detail showing `old_value` vs `new_value` JSON diff (side-by-side or highlighted)
- Export audit logs button (optional)

---

## 8. Reusable Components

### 8.1 Component Library

Build these as reusable components:

| Component | Usage |
|---|---|
| `<ScoreBadge score={3.5} role="IC" />` | Shows label-only for IC, numeric+label for others. Color-coded. |
| `<RatingSelector value={3} onChange={fn} />` | 4-point rating input with colored labels |
| `<StatusBadge status="ACTIVE" />` | Cycle/assignment/reviewer status |
| `<CompetencyRadarChart data={...} />` | Spider/radar chart for competency scores |
| `<ScoreTrendChart data={[...]} />` | Line chart for historical scores |
| `<DepartmentComparisonChart data={...} />` | Grouped bar chart |
| `<ReviewerCategoryChart data={...} />` | Horizontal bar chart by reviewer type |
| `<DataTable columns={...} data={...} />` | Reusable TanStack table with sort/filter/pagination |
| `<Pagination meta={...} onPageChange={fn} />` | Pagination controls using API meta |
| `<ConfirmDialog />` | "Are you sure?" modal for destructive actions |
| `<FileUpload accept=".csv" onUpload={fn} />` | CSV upload dropzone |
| `<EmptyState icon={...} message="..." />` | Empty state placeholder |
| `<PageHeader title="..." breadcrumbs={[...]} />` | Page title + breadcrumb trail |
| `<CycleSelector value={id} onChange={fn} />` | Dropdown to select a cycle (fetches cycles list) |
| `<EmployeeSearch onSelect={fn} />` | Searchable employee dropdown (uses `/employees?search=`) |
| `<ProtectedRoute roles={['CXO']} />` | Route wrapper that checks role |

### 8.2 ScoreBadge Component Logic

```typescript
function ScoreBadge({ score, label, viewerRole }: {
  score: number;
  label: string;
  viewerRole: 'IC' | 'TM' | 'HOD' | 'CXO';
}) {
  const colorMap = {
    'Outstanding Impact': 'bg-green-100 text-green-800 border-green-200',
    'Significant Impact': 'bg-blue-100 text-blue-800 border-blue-200',
    'Moderate Impact': 'bg-amber-100 text-amber-800 border-amber-200',
    'Not Enough Impact': 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className={`px-3 py-1 rounded-full border ${colorMap[label]}`}>
      {viewerRole !== 'IC' && <span className="font-semibold">{score.toFixed(2)} — </span>}
      <span>{label}</span>
    </div>
  );
}
```

---

## 9. Data Fetching Patterns

### 9.1 React Query Setup

```typescript
// hooks/useAuth.ts
export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<{ data: AuthUser }>('/api/v1/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// hooks/useCycles.ts
export function useCycles(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['cycles', params],
    queryFn: () => apiFetch(`/api/v1/cycles?${new URLSearchParams(params as any)}`),
  });
}

// hooks/useCreateCycle.ts
export function useCreateCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCyclePayload) =>
      apiFetch('/api/v1/cycles', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cycles'] }),
  });
}
```

### 9.2 Optimistic Updates

Use TanStack Query's `onMutate` / `onError` / `onSettled` for optimistic updates on status toggles (e.g., competency active/inactive).

---

## 10. Error Handling

### 10.1 Global Error Handling

- **401 Unauthorized** → redirect to `/login`
- **403 Forbidden** → show "Access Denied" page
- **404 Not Found** → show 404 page
- **409 Conflict** → show toast with specific message (e.g., "Cycle must be in DRAFT status to edit")
- **422 Validation** → map field errors to form fields
- **500 Server Error** → show toast "Something went wrong. Please try again."

### 10.2 Form Error Display

```typescript
// Map API validation errors to React Hook Form
function mapApiErrors(apiErrors: Array<{field: string; message: string}>, setError: Function) {
  apiErrors.forEach(({ field, message }) => {
    setError(field, { type: 'server', message });
  });
}
```

---

## 11. Environment Variables

```env
VITE_API_URL=http://localhost:3000
```

The API base URL. All requests go to this. In production, this would be the deployed backend URL.

**CORS:** The backend already has CORS configured to accept the frontend origin. Make sure the frontend origin is listed in the backend's `CORS_ORIGINS` env variable.

---

## 12. Key Business Rules to Enforce in UI

1. **Cycles can only be edited while in DRAFT status.** Disable edit forms/buttons for non-DRAFT cycles.
2. **Cycles can only be deleted while in DRAFT.** Hide delete button for other statuses.
3. **Activate** transitions DRAFT → ACTIVE. Show confirmation dialog.
4. **Publish** transitions COMPLETED → PUBLISHED. Show confirmation dialog.
5. **Survey submission is one-time.** After submit, form becomes read-only. Show "Submitted" badge.
6. **Self-feedback submission is one-time.** Same as above.
7. **All feedback is anonymous.** NEVER show reviewer names/identifiers in any results view.
8. **IC sees label only.** No numeric scores for IC viewing their own results.
9. **Reviewer config bounds** are enforced when adding reviewers (show warning if over/under limit).
10. **Grace period:** Surveys can still be submitted during CLOSING status. Show "Grace period — X days remaining" notice.

---

## 13. Seed / Initial Data

For testing, the backend has:
- `POST /api/v1/auth/seed-admin` — creates the initial CXO admin account
  - Body: `{ "employeeId": "EMP-001", "fullName": "Admin User", "email": "admin@motadata.com", "password": "Admin123!" }`
- After seeding admin, sign in and use employee sync/management to set up test data
- Question bank can be seeded via CSV import or the seed script

---

## 14. Summary of ALL API Endpoints

### Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/sign-up/email` | Public | Register |
| POST | `/api/auth/sign-in/email` | Public | Login |
| POST | `/api/auth/sign-out` | Session | Logout |
| GET | `/api/auth/get-session` | Session | Check session |
| GET | `/api/v1/auth/me` | Session | Get profile |
| POST | `/api/v1/auth/seed-admin` | Public | Seed first admin |

### Employees
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/employees` | CXO | List with filters |
| GET | `/api/v1/employees/:id` | Self/CXO | Get one |
| PATCH | `/api/v1/employees/:id` | CXO | Update role/groups |
| POST | `/api/v1/employees/sync` | CXO | Trigger AD sync |
| GET | `/api/v1/employees/sync/logs` | CXO | Sync log history |

### Cycles
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/cycles` | CXO | List cycles |
| POST | `/api/v1/cycles` | CXO | Create cycle |
| GET | `/api/v1/cycles/:id` | CXO | Get detail |
| PATCH | `/api/v1/cycles/:id` | CXO | Update (DRAFT) |
| DELETE | `/api/v1/cycles/:id` | CXO | Delete (DRAFT) |
| POST | `/api/v1/cycles/:id/activate` | CXO | Activate |
| POST | `/api/v1/cycles/:id/publish` | CXO | Publish results |

### Competencies
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/competencies` | Any | List |
| GET | `/api/v1/competencies/:id` | Any | Get one |
| POST | `/api/v1/competencies` | CXO | Create |
| PATCH | `/api/v1/competencies/:id` | CXO | Update |

### Questions
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/questions` | Any | List with filters |
| GET | `/api/v1/questions/:id` | Any | Get one |
| POST | `/api/v1/questions` | CXO | Create |
| PATCH | `/api/v1/questions/:id` | CXO | Update |
| POST | `/api/v1/questions/import/csv` | CXO | CSV bulk import |

### Self-Feedback
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/self-feedback/:cycleId` | Any | Get my self-feedback |
| POST | `/api/v1/self-feedback/:cycleId` | Any | Save draft |
| POST | `/api/v1/self-feedback/:cycleId/submit` | Any | Submit (final) |
| GET | `/api/v1/self-feedback/:cycleId/completion` | CXO | Completion stats |

### Assignments
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/assignments` | CXO | List assignments |
| GET | `/api/v1/assignments/status` | CXO | Status summary |
| POST | `/api/v1/assignments` | CXO | Create assignment |
| POST | `/api/v1/assignments/bulk-csv` | CXO | Bulk CSV upload |
| POST | `/api/v1/assignments/reviewers` | CXO | Add reviewer |
| DELETE | `/api/v1/assignments/reviewers/:reviewerId` | CXO | Remove reviewer |
| GET | `/api/v1/assignments/:id` | CXO | Get with reviewers |
| DELETE | `/api/v1/assignments/:id` | CXO | Delete assignment |
| GET | `/api/v1/assignments/:id/suggestions` | CXO | Auto-suggest reviewers |

### Reviewers
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/reviewers/by-token/:token` | Public | Token access |
| GET | `/api/v1/reviewers/pending` | Any | My pending reviews |
| GET | `/api/v1/reviewers/:id` | Self/CXO | Get reviewer |

### Surveys (Responses)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/surveys/form/:reviewerId` | Session/Token | Load form |
| POST | `/api/v1/surveys/form/:reviewerId/save` | Session/Token | Save draft |
| POST | `/api/v1/surveys/form/:reviewerId/submit` | Session/Token | Submit |
| POST | `/api/v1/surveys/form/:reviewerId/on-behalf` | CXO | Admin fill |
| POST | `/api/v1/surveys/form/:reviewerId/reopen` | CXO | Reopen survey |

### Scores
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/scores/my` | Any | My historical scores |
| GET | `/api/v1/scores/cycle/:cycleId` | CXO | All cycle scores |
| POST | `/api/v1/scores/cycle/:cycleId/recalculate` | CXO | Recalculate |
| GET | `/api/v1/scores/employee/:eid/cycle/:cid` | Self/TM/HOD/CXO | Employee score |
| GET | `/api/v1/scores/employee/:eid/cycle/:cid/comparison` | Self/TM/HOD/CXO | Dept comparison |

### Results
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/results/team/cycle/:cycleId` | TM/HOD/CXO | Team results |
| GET | `/api/v1/results/department/cycle/:cycleId` | HOD/CXO | Dept results |
| GET | `/api/v1/results/org/cycle/:cycleId` | CXO | Org results |
| GET | `/api/v1/results/employee/:eid/cycle/:cid` | Self/TM/HOD/CXO | Individual |
| GET | `/api/v1/results/employee/:eid/cycle/:cid/comments` | Self/TM/HOD/CXO | Comments |

### Reports
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/reports/individual/:eid/cycle/:cid` | CXO | PDF report |
| GET | `/api/v1/reports/department/cycle/:cid?department=` | CXO | Dept PDF |
| GET | `/api/v1/reports/org/cycle/:cid` | CXO | Org PDF |
| GET | `/api/v1/reports/export/cycle/:cid` | CXO | CSV export |

### Admin
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | CXO | Dashboard stats |
| GET | `/api/v1/admin/reviewer-config` | CXO | Get config |
| PATCH | `/api/v1/admin/reviewer-config` | CXO | Update config |
| GET | `/api/v1/admin/audit-logs` | CXO | Audit trail |

---

## 15. Database Entity Relationships (for understanding data flow)

```
employees (1) ──< survey_assignments (M) ──< survey_reviewers (M) ──< survey_responses (M)
                                                         └──< survey_comments (M)
employees (1) ──< self_feedback (M per cycle)
employees (1) ──< calculated_scores (M per cycle)
review_cycles (1) ──< survey_assignments (M)
review_cycles (1) ──< self_feedback (M)
review_cycles (1) ──< calculated_scores (M)
competencies (1) ──< questions (M)
questions (1) ──< survey_responses (M)
reviewer_config (singleton row)
```

---

## 16. Accessibility & UX Requirements

- **WCAG 2.1 AA** compliance
- All interactive elements keyboard-navigable
- Proper aria labels on charts (provide data table alternative)
- Color + icon/text (never color-alone) for status indicators
- Loading skeletons on data fetch
- Proper focus management on dialogs/modals
- Error states with clear messaging
- Empty states with helpful illustrations/text
- Responsive: works on 1024px+ (desktop/laptop primary), graceful on tablet
- Toast notifications for success/error on mutations
- Breadcrumb navigation on all inner pages
- Page titles for browser tab

---

## 17. Performance Optimizations

- **Route-based code splitting** with React.lazy + Suspense
- **Prefetch** next likely navigation (e.g., on hover over "View Detail")
- **Debounce** search inputs (300ms)
- **Stale time** of 5 min on stable data (competencies, questions), shorter for dynamic data (assignments, reviewers)
- Virtual scrolling for large tables (TanStack Virtual if > 100 rows)
- Memoize chart components (avoid re-render on unrelated state changes)

---

## 18. File Structure (Suggested)

```
src/
├── api/
│   ├── client.ts              # Base fetch wrapper with credentials
│   └── endpoints.ts           # All API endpoint constants
├── hooks/
│   ├── useAuth.ts
│   ├── useCycles.ts
│   ├── useEmployees.ts
│   ├── useAssignments.ts
│   ├── useCompetencies.ts
│   ├── useQuestions.ts
│   ├── useSelfFeedback.ts
│   ├── useSurveys.ts
│   ├── useScores.ts
│   ├── useResults.ts
│   ├── useReports.ts
│   └── useAdmin.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Sidebar + TopBar + Main
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── ui/                     # shadcn/ui components
│   ├── shared/
│   │   ├── ScoreBadge.tsx
│   │   ├── RatingSelector.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── DataTable.tsx
│   │   ├── Pagination.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FileUpload.tsx
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   ├── CycleSelector.tsx
│   │   └── EmployeeSearch.tsx
│   └── charts/
│       ├── CompetencyRadarChart.tsx
│       ├── ScoreTrendChart.tsx
│       ├── DepartmentComparisonChart.tsx
│       ├── ReviewerCategoryChart.tsx
│       ├── ScoreDistributionPie.tsx
│       └── CompletionDonut.tsx
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Surveys.tsx
│   ├── SurveyForm.tsx
│   ├── SelfFeedbackForm.tsx
│   ├── MyResults.tsx
│   ├── MyResultsDetail.tsx
│   ├── TeamResults.tsx
│   ├── DepartmentResults.tsx
│   ├── OrgResults.tsx
│   ├── EmployeeScorecard.tsx
│   ├── admin/
│   │   ├── CycleList.tsx
│   │   ├── CycleForm.tsx
│   │   ├── CycleDetail.tsx
│   │   ├── EmployeeList.tsx
│   │   ├── EmployeeDetail.tsx
│   │   ├── AssignmentList.tsx
│   │   ├── AssignmentDetail.tsx
│   │   ├── CompetencyList.tsx
│   │   ├── QuestionBank.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   └── AuditLogs.tsx
│   └── errors/
│       ├── NotFound.tsx
│       └── AccessDenied.tsx
├── lib/
│   ├── constants.ts            # Rating labels, colors, role hierarchy
│   ├── types.ts                # All TypeScript interfaces
│   └── utils.ts                # Date formatting, score utils
├── App.tsx                     # Router setup
└── main.tsx                    # Entry point
```

---

## 19. Getting Started Checklist

1. Create React + TypeScript + Vite project
2. Install: `tailwindcss`, `shadcn/ui`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `recharts`, `react-router-dom`, `lucide-react`, `sonner`, `react-dropzone`, `date-fns`
3. Set up shadcn/ui with theme configuration
4. Set up TanStack Query provider
5. Build auth context + API client with `credentials: 'include'`
6. Build layout (sidebar, topbar, protected routes)
7. Implement login page
8. Build dashboard (role-adaptive)
9. Build survey list + survey form
10. Build self-feedback form
11. Build my results + detail pages
12. Build team/dept/org results pages
13. Build admin pages (cycles → employees → assignments → competencies → questions → reports → settings → audit logs)
14. Add charts to all results pages
15. Test all flows end-to-end against the running backend

**Backend URL for development:** `http://localhost:3000`

---

*This document provides everything needed to build the complete frontend. The backend is fully operational — focus on building a polished, professional UI that integrates with every endpoint listed above.*
