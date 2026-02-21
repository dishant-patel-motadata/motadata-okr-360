# 360 Feedback Platform — Complete API Curl Test Reference

> **Base URL:** `http://localhost:3000`  
> **Cookie jar file:** `cookies.txt` (created automatically on login)  
> All authenticated requests use `-b cookies.txt` to send the session cookie.

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Authentication](#2-authentication)
3. [Employees](#3-employees)
4. [Review Cycles](#4-review-cycles)
5. [Competencies](#5-competencies)
6. [Questions](#6-questions)
7. [Self-Feedback](#7-self-feedback)
8. [Survey Assignments](#8-survey-assignments)
9. [Reviewers](#9-reviewers)
10. [Survey Responses](#10-survey-responses)
11. [Scores](#11-scores)
12. [Results / Dashboards](#12-results--dashboards)
13. [Reports (PDF & CSV)](#13-reports-pdf--csv)
14. [Admin](#14-admin)

---

## Quick Setup

```bash
# Set BASE_URL once (Linux/macOS)
export BASE="http://localhost:3000"

# Windows PowerShell
$BASE = "http://localhost:3000"
```

---

## 1. Health Check

### 1.1 Server ping
```bash
curl -s "$BASE/" | jq .
```

**Expected:**
```json
{ "success": true, "message": "360 Feedback API is running" }
```

---

## 2. Authentication

### 2.1 — One-time: Create the first CXO admin account

> Run **once** on a fresh database. Locks itself once any CXO exists.

```bash
curl -s -X POST "$BASE/api/v1/auth/seed-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-001",
    "fullName": "Admin User",
    "email": "admin@company.com",
    "password": "Admin@12345"
  }' | jq .
```

**Expected:** `201 Created` with employee details

---

### 2.2 — Login (Sign In)

```bash
curl -s -c cookies.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "Admin@12345"
  }' | jq .
```

**Expected:** `200 OK` — session cookie saved to `cookies.txt`

---

### 2.3 — Login as IC employee (example)

```bash
curl -s -c cookies_ic.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "emp@company.com",
    "password": "Emp@12345"
  }' | jq .
```

---

### 2.4 — Get current session info (better-auth built-in)

```bash
curl -s -b cookies.txt "$BASE/api/auth/session" | jq .
```

---

### 2.5 — Get my full profile (custom endpoint)

```bash
curl -s -b cookies.txt "$BASE/api/v1/auth/me" | jq .
```

**Expected:** `200 OK` with employee record + group_name

---

### 2.6 — Sign out

```bash
curl -s -c cookies.txt -b cookies.txt -X POST "$BASE/api/auth/sign-out" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

---

### 2.7 — Unauthenticated request (should return 401)

```bash
curl -s "$BASE/api/v1/auth/me" | jq .
```

**Expected:** `401 Unauthorized`

---

## 3. Employees

> All employee routes require a valid session. Write operations require CXO role.

### 3.1 — List all employees (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees" | jq .
```

### 3.2 — List with filters

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/employees?group_name=IC&department=Engineering&page=1&limit=20" \
  | jq .
```

### 3.3 — Get employee by ID (self or CXO)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees/EMP-001" | jq .
```

### 3.4 — Get non-existent employee (404)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees/EMP-DOES-NOT-EXIST" | jq .
```

**Expected:** `404 Not Found`

### 3.5 — Update employee managed fields (CXO only)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/employees/EMP-002" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "TM",
    "cross_functional_groups": ["Engineering", "Product"],
    "applicable_competencies": ["COMM", "LEAD", "TEAM"]
  }' | jq .
```

### 3.6 — Trigger manual AD sync (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/employees/sync" | jq .
```

### 3.7 — View AD sync logs (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees/sync/logs?page=1&limit=10" | jq .
```

### 3.8 — IC tries to list all employees (403)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/employees" | jq .
```

**Expected:** `403 Forbidden`

---

## 4. Review Cycles

> All cycle routes require CXO role.

### 4.1 — List cycles

```bash
curl -s -b cookies.txt "$BASE/api/v1/cycles" | jq .
```

### 4.2 — List cycles with filter

```bash
curl -s -b cookies.txt "$BASE/api/v1/cycles?status=ACTIVE" | jq .
```

### 4.3 — Create a new cycle

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles" \
  -H "Content-Type: application/json" \
  -d '{
    "cycle_name": "Q1 2026 Review",
    "start_date": "2026-01-01",
    "end_date": "2026-03-31",
    "duration_months": 3,
    "grace_period_days": 3,
    "enable_self_feedback": true,
    "enable_colleague_feedback": true,
    "reminder_schedule": [7, 3, 1]
  }' | jq .
```

**Expected:** `201 Created` with `cycle_id`; save it:
```bash
CYCLE_ID="<paste cycle_id UUID here>"
```

### 4.4 — Get cycle by ID

```bash
curl -s -b cookies.txt "$BASE/api/v1/cycles/$CYCLE_ID" | jq .
```

### 4.5 — Update DRAFT cycle

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/cycles/$CYCLE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "cycle_name": "Q1 2026 Review (Updated)",
    "grace_period_days": 5
  }' | jq .
```

### 4.6 — Activate cycle (DRAFT → ACTIVE)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/activate" | jq .
```

**Expected:** `200 OK` with `status: "ACTIVE"`

### 4.7 — Try to activate already-active cycle (409)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/activate" | jq .
```

**Expected:** `409 Conflict`

### 4.8 — Publish cycle (COMPLETED → PUBLISHED)

> Cycle must be in COMPLETED status first (auto-transitions at end_date + grace period).

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/publish" | jq .
```

### 4.9 — Delete DRAFT cycle

```bash
DRAFT_CYCLE_ID="<paste draft cycle_id>"
curl -s -b cookies.txt -X DELETE "$BASE/api/v1/cycles/$DRAFT_CYCLE_ID" | jq .
```

### 4.10 — Validation error: end_date before start_date (422)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles" \
  -H "Content-Type: application/json" \
  -d '{
    "cycle_name": "Bad Cycle",
    "start_date": "2026-03-31",
    "end_date": "2026-01-01",
    "duration_months": 3
  }' | jq .
```

**Expected:** `422 Unprocessable Entity`

---

## 5. Competencies

> Read: any authenticated user. Write: CXO only.

### 5.1 — List all competencies

```bash
curl -s -b cookies.txt "$BASE/api/v1/competencies" | jq .
```

### 5.2 — List with filters

```bash
curl -s -b cookies.txt "$BASE/api/v1/competencies?applicable_to=IC&is_active=true" | jq .
```

### 5.3 — Get single competency

```bash
curl -s -b cookies.txt "$BASE/api/v1/competencies/COMM" | jq .
```

### 5.4 — Create competency (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/competencies" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_id": "INNOV",
    "competency_name": "Innovation",
    "description": "Ability to generate and implement new ideas",
    "applicable_to": ["TM", "HOD"]
  }' | jq .
```

### 5.5 — Update competency (CXO only)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/competencies/INNOV" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Drives creative thinking and implementation",
    "is_active": true
  }' | jq .
```

### 5.6 — Deactivate a competency

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/competencies/INNOV" \
  -H "Content-Type: application/json" \
  -d '{ "is_active": false }' | jq .
```

### 5.7 — Unauthenticated access (401)

```bash
curl -s "$BASE/api/v1/competencies" | jq .
```

---

## 6. Questions

> Read: any authenticated user. Write: CXO only.

### 6.1 — List all questions

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions" | jq .
```

### 6.2 — List questions by set type

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=IC" | jq .
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=TM" | jq .
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=HOD" | jq .
```

### 6.3 — List questions by competency

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions?competency_id=COMM" | jq .
```

### 6.4 — Get single question

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions/IC-01" | jq .
```

### 6.5 — Create a question (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "IC-16",
    "set_type": "IC",
    "order_number": 16,
    "question_text": "Demonstrates ethical behaviour consistently",
    "category": "Professionalism",
    "competency_id": "PROF"
  }' | jq .
```

### 6.6 — Update a question (CXO only)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/questions/IC-16" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "Consistently demonstrates ethical and professional behaviour",
    "is_active": true
  }' | jq .
```

### 6.7 — Bulk import questions via CSV (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/questions/import/csv" \
  -F "file=@/path/to/questions.csv" | jq .
```

> CSV format: `question_id,set_type,order_number,question_text,category,competency_id`

---

## 7. Self-Feedback

> Any authenticated employee (for their own data). CXO for completion overview.

### 7.1 — Get self-feedback form for a cycle

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/self-feedback/$CYCLE_ID" | jq .
```

### 7.2 — Save draft self-feedback

```bash
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_ratings": [
      { "competency_id": "COMM", "rating": 3 },
      { "competency_id": "TEAM", "rating": 4 },
      { "competency_id": "QUAL", "rating": 3 },
      { "competency_id": "RELY", "rating": 4 },
      { "competency_id": "INIT", "rating": 3 }
    ]
  }' | jq .
```

**Expected:** `200 OK` with `status: "DRAFT"`

### 7.3 — Submit self-feedback (one-time lock)

```bash
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_ratings": [
      { "competency_id": "COMM", "rating": 3 },
      { "competency_id": "TEAM", "rating": 4 },
      { "competency_id": "QUAL", "rating": 3 },
      { "competency_id": "RELY", "rating": 4 },
      { "competency_id": "INIT", "rating": 3 }
    ]
  }' | jq .
```

**Expected:** `200 OK` with `status: "SUBMITTED"` and `submitted_at` timestamp

### 7.4 — Try to re-submit after SUBMITTED (409)

```bash
# Run 7.3 again
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{ "competency_ratings": [] }' | jq .
```

**Expected:** `409 Conflict`

### 7.5 — View completion status for all employees (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/self-feedback/$CYCLE_ID/completion" | jq .
```

### 7.6 — Validation error: rating out of range (422)

```bash
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_ratings": [
      { "competency_id": "COMM", "rating": 5 }
    ]
  }' | jq .
```

**Expected:** `422 Unprocessable Entity` (rating must be 1–4)

---

## 8. Survey Assignments

> All assignment routes require CXO role.

### 8.1 — List assignments for a cycle

```bash
curl -s -b cookies.txt "$BASE/api/v1/assignments?cycle_id=$CYCLE_ID" | jq .
```

### 8.2 — Get assignment completion status overview

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/assignments/status?cycle_id=$CYCLE_ID" | jq .
```

### 8.3 — Create a single assignment

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-002",
    "cycle_id": "'$CYCLE_ID'"
  }' | jq .
```

**Expected:** `201 Created` with `assignment_id`; save it:
```bash
ASSIGNMENT_ID="<paste assignment_id UUID here>"
```

### 8.4 — Get one assignment with reviewer list

```bash
curl -s -b cookies.txt "$BASE/api/v1/assignments/$ASSIGNMENT_ID" | jq .
```

### 8.5 — Get reviewer suggestions for assignment

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/assignments/$ASSIGNMENT_ID/suggestions" | jq .
```

### 8.6 — Add a reviewer to assignment

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "'$ASSIGNMENT_ID'",
    "reviewer_employee_id": "EMP-003",
    "reviewer_type": "PEER"
  }' | jq .
```

**Expected:** `201 Created` with `reviewer_id`; save it:
```bash
REVIEWER_ID="<paste reviewer_id UUID here>"
```

### 8.7 — Add multiple reviewers

```bash
# Manager
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "'$ASSIGNMENT_ID'",
    "reviewer_employee_id": "EMP-001",
    "reviewer_type": "MANAGER"
  }' | jq .

# Direct Report
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "'$ASSIGNMENT_ID'",
    "reviewer_employee_id": "EMP-004",
    "reviewer_type": "DIRECT_REPORT"
  }' | jq .
```

### 8.8 — Remove a reviewer

```bash
curl -s -b cookies.txt -X DELETE \
  "$BASE/api/v1/assignments/reviewers/$REVIEWER_ID" | jq .
```

### 8.9 — Bulk assign via CSV upload

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/bulk-csv" \
  -F "file=@/path/to/assignments.csv" | jq .
```

> CSV format: `employee_id,cycle_id,reviewer_employee_id,reviewer_type`

### 8.10 — Delete (rollback) assignment

```bash
curl -s -b cookies.txt -X DELETE \
  "$BASE/api/v1/assignments/$ASSIGNMENT_ID" | jq .
```

---

## 9. Reviewers

### 9.1 — Get reviewer by access token (public, no login needed)

```bash
TOKEN="<access_token from reviewer record>"
curl -s "$BASE/api/v1/reviewers/by-token/$TOKEN" | jq .
```

### 9.2 — Get my pending / in-progress surveys (authenticated)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/reviewers/pending" | jq .
```

**Expected:** List of surveys assigned to the logged-in employee, with deadline and target employee info.

### 9.3 — Get reviewer record by ID (own or CXO)

```bash
curl -s -b cookies.txt "$BASE/api/v1/reviewers/$REVIEWER_ID" | jq .
```

### 9.4 — IC tries to view another employee's reviewer (403)

```bash
ANOTHER_REVIEWER_ID="<other reviewer uuid>"
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/reviewers/$ANOTHER_REVIEWER_ID" | jq .
```

**Expected:** `403 Forbidden`

---

## 10. Survey Responses

> Dual-auth: use either session cookie OR `?token=<access_token>` query param.

### 10.1 — Get survey form (session auth)

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/surveys/form/$REVIEWER_ID" | jq .
```

### 10.2 — Get survey form (token auth — no login required)

```bash
TOKEN="<access_token from reviewer record>"
curl -s "$BASE/api/v1/surveys/form/$REVIEWER_ID?token=$TOKEN" | jq .
```

### 10.3 — Save draft responses (session auth)

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/save" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 3 },
      { "question_id": "IC-02", "rating": 4 },
      { "question_id": "IC-03", "rating": 3 },
      { "question_id": "IC-04", "rating": 4 },
      { "question_id": "IC-05", "rating": 3 }
    ]
  }' | jq .
```

### 10.4 — Save draft responses (token auth)

```bash
TOKEN="<access_token>"
curl -s -X POST \
  "$BASE/api/v1/surveys/form/$REVIEWER_ID/save?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 4 },
      { "question_id": "IC-02", "rating": 3 }
    ]
  }' | jq .
```

### 10.5 — Submit survey (final, one-time)

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 3 },
      { "question_id": "IC-02", "rating": 4 },
      { "question_id": "IC-03", "rating": 3 },
      { "question_id": "IC-04", "rating": 4 },
      { "question_id": "IC-05", "rating": 3 },
      { "question_id": "IC-06", "rating": 4 },
      { "question_id": "IC-07", "rating": 3 },
      { "question_id": "IC-08", "rating": 4 },
      { "question_id": "IC-09", "rating": 3 },
      { "question_id": "IC-10", "rating": 4 },
      { "question_id": "IC-11", "rating": 3 },
      { "question_id": "IC-12", "rating": 4 },
      { "question_id": "IC-13", "rating": 3 },
      { "question_id": "IC-14", "rating": 4 },
      { "question_id": "IC-15", "rating": 3 }
    ],
    "comment": "Great colleague, always supportive and professional."
  }' | jq .
```

**Expected:** `200 OK` with `status: "COMPLETED"` and `completed_at` timestamp

### 10.6 — Submit with validation error: rating out of range (422)

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/save" \
  -H "Content-Type: application/json" \
  -d '{ "responses": [{ "question_id": "IC-01", "rating": 5 }] }' | jq .
```

**Expected:** `422 Unprocessable Entity`

### 10.7 — Submit on behalf of reviewer (CXO admin proxy, RC-14)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/on-behalf" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 4 },
      { "question_id": "IC-02", "rating": 3 }
    ]
  }' | jq .
```

### 10.8 — Reopen a completed survey (CXO, RC-15)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/reopen" | jq .
```

**Expected:** `200 OK` with `status: "IN_PROGRESS"` (reviewer can edit again)

### 10.9 — Non-CXO tries to reopen (403)

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/reopen" | jq .
```

**Expected:** `403 Forbidden`

---

## 11. Scores

### 11.1 — Get my own historical scores

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/scores/my" | jq .
```

### 11.2 — Get all scores for a cycle (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/scores/cycle/$CYCLE_ID" | jq .
```

### 11.3 — IC tries to view cycle scores (403)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/scores/cycle/$CYCLE_ID" | jq .
```

**Expected:** `403 Forbidden`

### 11.4 — Force recalculate scores for a cycle (CXO only)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/scores/cycle/$CYCLE_ID/recalculate" | jq .
```

### 11.5 — Get one employee's scorecard (own)

```bash
EMP_ID="EMP-002"
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/scores/employee/$EMP_ID/cycle/$CYCLE_ID" | jq .
```

### 11.6 — Get another employee's scorecard (CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/scores/employee/EMP-002/cycle/$CYCLE_ID" | jq .
```

### 11.7 — IC tries to view another employee's score (403)

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/scores/employee/EMP-001/cycle/$CYCLE_ID" | jq .
```

**Expected:** `403 Forbidden`

### 11.8 — Self vs. department comparison

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/scores/employee/EMP-002/cycle/$CYCLE_ID/comparison" | jq .
```

---

## 12. Results / Dashboards

### 12.1 — Employee dashboard — own results

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/results/employee/EMP-002/cycle/$CYCLE_ID" | jq .
```

### 12.2 — Employee dashboard — manager viewing team member

```bash
curl -s -b cookies_tm.txt \
  "$BASE/api/v1/results/employee/EMP-002/cycle/$CYCLE_ID" | jq .
```

### 12.3 — Employee comments — anonymised

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/results/employee/EMP-002/cycle/$CYCLE_ID/comments" | jq .
```

### 12.4 — Team dashboard (TM / HOD / CXO)

```bash
curl -s -b cookies_tm.txt \
  "$BASE/api/v1/results/team/cycle/$CYCLE_ID" | jq .
```

### 12.5 — Department dashboard (HOD / CXO only)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/department/cycle/$CYCLE_ID" | jq .
```

### 12.6 — Org-wide dashboard (CXO only)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/org/cycle/$CYCLE_ID" | jq .
```

### 12.7 — IC tries to view team dashboard (403)

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/results/team/cycle/$CYCLE_ID" | jq .
```

**Expected:** `403 Forbidden`

---

## 13. Reports (PDF & CSV)

> All report endpoints require CXO role. PDF reports return `application/pdf`.  
> Use `-o filename.pdf` to save the file.

### 13.1 — Individual employee PDF report

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/individual/EMP-002/cycle/$CYCLE_ID" \
  -o employee_report.pdf

echo "Saved to employee_report.pdf"
```

### 13.2 — Department summary PDF

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/department/cycle/$CYCLE_ID?department=Engineering" \
  -o dept_report.pdf

echo "Saved to dept_report.pdf"
```

### 13.3 — Organisation summary PDF

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/org/cycle/$CYCLE_ID" \
  -o org_report.pdf

echo "Saved to org_report.pdf"
```

### 13.4 — Raw data CSV export

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/export/cycle/$CYCLE_ID" \
  -o export_$CYCLE_ID.csv

echo "Saved to export_$CYCLE_ID.csv"
```

### 13.5 — IC tries to generate report (403)

```bash
curl -s -b cookies_ic.txt \
  "$BASE/api/v1/reports/org/cycle/$CYCLE_ID" | jq .
```

**Expected:** `403 Forbidden`

---

## 14. Admin

> All admin routes require CXO role.

### 14.1 — System dashboard overview

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/dashboard" | jq .
```

### 14.2 — System dashboard with specific cycle

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/admin/dashboard?cycle_id=$CYCLE_ID" | jq .
```

**Expected:** Active cycle stats (completion %, pending reviewers, employee groups breakdown)

### 14.3 — Invalid cycle_id UUID (422)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/admin/dashboard?cycle_id=not-a-uuid" | jq .
```

**Expected:** `422 Unprocessable Entity`

### 14.4 — Get current reviewer config (min/max limits)

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/reviewer-config" | jq .
```

**Expected:**
```json
{
  "success": true,
  "data": { "min_reviewers": 2, "max_reviewers": 8 }
}
```

### 14.5 — Update reviewer config (both fields)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/admin/reviewer-config" \
  -H "Content-Type: application/json" \
  -d '{
    "min_reviewers": 3,
    "max_reviewers": 10
  }' | jq .
```

### 14.6 — Update only max_reviewers

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/admin/reviewer-config" \
  -H "Content-Type: application/json" \
  -d '{ "max_reviewers": 12 }' | jq .
```

### 14.7 — Validation: min > max (422)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/admin/reviewer-config" \
  -H "Content-Type: application/json" \
  -d '{
    "min_reviewers": 10,
    "max_reviewers": 5
  }' | jq .
```

**Expected:** `422 Unprocessable Entity`

### 14.8 — Validation: empty body (422)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/admin/reviewer-config" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected:** `422 Unprocessable Entity` (at least one field required)

### 14.9 — View audit logs

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/audit-logs" | jq .
```

### 14.10 — Audit logs with filters

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/admin/audit-logs?action_type=UPDATE&entity_type=review_cycles&page=1&limit=20" \
  | jq .
```

### 14.11 — Audit logs with date range

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/admin/audit-logs?from=2026-01-01&to=2026-12-31" | jq .
```

### 14.12 — Audit logs pagination validation (page=0 → 422)

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/audit-logs?page=0" | jq .
```

**Expected:** `422 Unprocessable Entity`

### 14.13 — Non-CXO tries to access admin (403)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/admin/dashboard" | jq .
```

**Expected:** `403 Forbidden`

---

## End-to-End Test Sequence

Follow this order to test a complete review cycle flow:

```
Step 1:  2.1  → seed-admin (first time only)
Step 2:  2.2  → login as CXO
Step 3:  3.5  → set group_name=IC for test employee
Step 4:  4.3  → create cycle
Step 5:  4.6  → activate cycle
Step 6:  8.3  → create assignment for IC employee
Step 7:  8.6  → add reviewers (MANAGER, PEER, DIRECT_REPORT)
Step 8:  2.3  → login as IC employee
Step 9:  7.2  → IC saves self-feedback draft
Step 10: 7.3  → IC submits self-feedback
Step 11: 9.2  → IC views pending surveys (reviewer for someone else)
Step 12: 10.3 → IC saves survey draft
Step 13: 10.5 → IC submits survey
Step 14: 2.2  → login as CXO
Step 15: 11.4 → trigger score recalculation
Step 16: 11.2 → view all cycle scores
Step 17: 12.6 → view org dashboard
Step 18: 13.4 → export raw CSV
Step 19: 4.8  → publish cycle results
Step 20: 12.1 → IC views own results (published)
```

---

## Common Response Formats

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated list
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Validation error (422)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "rating", "message": "Number must be less than or equal to 4" }
  ]
}
```

### Authentication error (401)
```json
{ "success": false, "error": "Authentication required." }
```

### Authorization error (403)
```json
{ "success": false, "error": "Forbidden: insufficient role." }
```

### Not found (404)
```json
{ "success": false, "error": "Not found." }
```
