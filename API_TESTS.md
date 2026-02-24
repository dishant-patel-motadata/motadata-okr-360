# 360 Feedback Platform — Complete API curl Test Reference

> **Base URL:** `http://localhost:3000`  
> **Cookie jar:** `cookies.txt` (created automatically on sign-in)  
> All authenticated requests use `-b cookies.txt` to send the session cookie.

---

## ⚠️ How Employees Work (READ THIS FIRST)

There is **no `POST /api/v1/employees` endpoint**.  
Employees are never created via the REST API.  They come from two sources only:

| Source | When |
|--------|------|
| `db_scripts/database-mock-data.sql` seed | Development / first setup — 50 employees already in DB |
| `POST /api/v1/employees/sync` | Production — pulls employees from Azure Active Directory |

The mock data already contains **50 employees** across all groups:  
`EMP001–EMP005` → CXO | `EMP006–EMP020` → HOD | `EMP021–EMP035` → TM | `EMP036–EMP050` → IC

To manage an employee you **PATCH** their managed fields (group_name, competencies, cross-functional groups).

---

## How to Create an Admin Account

### Option A — Mock data already seeded (your current setup)

The 5 CXO employees already exist in the DB. Just create a better-auth login for one:

```bash
# Step 1 — Create the better-auth login (links by email automatically)
curl -s -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@motadata.com","password":"Motadata@123","name":"Rajesh Kumar"}' | jq .

# Step 2 — Sign in and save cookie
curl -s -c cookies.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@motadata.com","password":"Motadata@123"}' | jq .

# Step 3 — Verify you have CXO role
curl -s -b cookies.txt "$BASE/api/v1/auth/me" | jq '.data.group_name'
# Expected: "CXO"
```

### Option B — Fresh database (no mock data)

Use the one-time seed endpoint. It locks itself once any CXO employee exists.

```bash
curl -s -X POST "$BASE/api/v1/auth/seed-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "fullName": "Admin User",
    "email": "admin@motadata.com",
    "password": "Admin@123"
  }' | jq .
# Expected: 201 Created
```

---

## Quick Setup

```bash
export BASE="http://localhost:3000"
```

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [Authentication](#2-authentication)
3. [Employees](#3-employees)
4. [Review Cycles](#4-review-cycles)
5. [Competencies](#5-competencies)
6. [Questions](#6-questions)
7. [Survey Assignments](#7-survey-assignments)
8. [Reviewers](#8-reviewers)
9. [Self-Feedback](#9-self-feedback)
10. [Survey Responses](#10-survey-responses)
11. [Scores](#11-scores)
12. [Results / Dashboards](#12-results--dashboards)
13. [Reports](#13-reports)
14. [Admin](#14-admin)

---

## 1. Health Check

```bash
curl -s "$BASE/" | jq .
curl -s "$BASE/health" | jq .
```

**Expected:**
```json
{ "success": true, "message": "OKR-360 API", "version": "v1" }
```

---

## 2. Authentication

### 2.1 — Sign up (creates better-auth login, links to employee record by email)

```bash
curl -s -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.kumar@motadata.com",
    "password": "Motadata@123",
    "name": "Rajesh Kumar"
  }' | jq .
```

> **Note:** The email must already exist in the `employees` table. After signing up,
> the session middleware links the auth account to the employee row by email.

### 2.2 — Sign in (save cookie)

```bash
curl -s -c cookies.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rajesh.kumar@motadata.com",
    "password": "Motadata@123"
  }' | jq .
```

**Expected:** `200 OK` — session cookie written to `cookies.txt`

### 2.3 — Sign in as IC employee (for testing IC-only flows)

```bash
# First create auth account for an IC employee
curl -s -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun.sharma@motadata.com","password":"Motadata@123","name":"Arjun Sharma"}' | jq .

# Then sign in to a separate cookie jar
curl -s -c cookies_ic.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun.sharma@motadata.com","password":"Motadata@123"}' | jq .
```

### 2.4 — Get session (better-auth built-in)

```bash
curl -s -b cookies.txt "$BASE/api/auth/get-session" | jq .
```

### 2.5 — Get my full profile (custom endpoint, includes employee record + role)

```bash
curl -s -b cookies.txt "$BASE/api/v1/auth/me" | jq .
```

**Expected:** `200 OK` with `employee_id`, `group_name`, `department`, etc.

### 2.6 — Sign out

```bash
curl -s -b cookies.txt -X POST "$BASE/api/auth/sign-out" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

### 2.7 — Unauthenticated request (should return 401)

```bash
curl -s "$BASE/api/v1/auth/me" | jq .
```

### 2.8 — One-time seed-admin (FRESH DB ONLY — locked once any CXO exists)

```bash
curl -s -X POST "$BASE/api/v1/auth/seed-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "fullName": "Admin User",
    "email": "admin@motadata.com",
    "password": "Admin@123"
  }' | jq .
```

---

## 3. Employees

> There is **no POST /api/v1/employees**. Employees come from mock seed or AD sync.  
> All write operations require CXO role.

### 3.1 — List all employees (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees" | jq .
```

### 3.2 — List with filters

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/employees?group_name=IC&department=Engineering&page=1&limit=20" | jq .
```

### 3.3 — Get employee by ID (self or CXO)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees/EMP001" | jq .
```

### 3.4 — Update managed fields (CXO only — group, competencies, cross-functional)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/employees/EMP036" \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "TM",
    "cross_functional_groups": ["Engineering", "Product"],
    "applicable_competencies": ["COMM", "LEAD", "TEAM"]
  }' | jq .
```

### 3.5 — Trigger manual AD sync (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/employees/sync" | jq .
```

### 3.6 — View AD sync logs (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/employees/sync/logs?page=1&limit=10" | jq .
```

### 3.7 — IC tries to list all employees (should return 403)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/employees" | jq .
```

---

## 4. Review Cycles

> All cycle routes require CXO role.

### 4.1 — List cycles

```bash
curl -s -b cookies.txt "$BASE/api/v1/cycles" | jq .
```

### 4.2 — Create a cycle

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

**Save the returned `cycle_id`:**
```bash
CYCLE_ID="<paste cycle_id UUID here>"
```

### 4.3 — Get cycle by ID

```bash
curl -s -b cookies.txt "$BASE/api/v1/cycles/$CYCLE_ID" | jq .
```

### 4.4 — Update DRAFT cycle

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/cycles/$CYCLE_ID" \
  -H "Content-Type: application/json" \
  -d '{"cycle_name":"Q1 2026 Review (Updated)","grace_period_days":5}' | jq .
```

### 4.5 — Activate cycle (DRAFT → ACTIVE)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/activate" | jq .
```

**Expected:** `200 OK` with `status: "ACTIVE"`

### 4.6 — Publish cycle (COMPLETED → PUBLISHED)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/publish" | jq .
```

### 4.7 — Delete DRAFT cycle

```bash
curl -s -b cookies.txt -X DELETE "$BASE/api/v1/cycles/$CYCLE_ID" | jq .
```

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
    "description": "Drives creative thinking and implementation",
    "applicable_to": ["TM", "HOD"]
  }' | jq .
```

### 5.5 — Update competency (CXO only)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/competencies/INNOV" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' | jq .
```

---

## 6. Questions

> Read: any authenticated user. Write: CXO only.

### 6.1 — List all questions

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions" | jq .
```

### 6.2 — List by set type

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=IC" | jq .
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=TM" | jq .
curl -s -b cookies.txt "$BASE/api/v1/questions?set_type=HOD" | jq .
```

### 6.3 — Get single question

```bash
curl -s -b cookies.txt "$BASE/api/v1/questions/IC-01" | jq .
```

### 6.4 — Create question (CXO only)

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "question_id": "IC-16",
    "set_type": "IC",
    "order_number": 16,
    "question_text": "Demonstrates ethical behaviour consistently",
    "category": "Professionalism",
    "competency_id": "COMM"
  }' | jq .
```

### 6.5 — Update question (CXO only)

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/questions/IC-16" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}' | jq .
```

---

## 7. Survey Assignments

> All assignment routes require CXO role.

### 7.1 — Create assignment for an employee

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP036",
    "cycle_id": "'$CYCLE_ID'"
  }' | jq .
```

**Save the returned `assignment_id`:**
```bash
ASSIGNMENT_ID="<paste assignment_id UUID here>"
```

### 7.2 — List assignments for a cycle

```bash
curl -s -b cookies.txt "$BASE/api/v1/assignments?cycle_id=$CYCLE_ID" | jq .
```

### 7.3 — Get assignment completion status overview

```bash
curl -s -b cookies.txt "$BASE/api/v1/assignments/status?cycle_id=$CYCLE_ID" | jq .
```

### 7.4 — Get reviewer suggestions for assignment

```bash
curl -s -b cookies.txt "$BASE/api/v1/assignments/$ASSIGNMENT_ID/suggestions" | jq .
```

### 7.5 — Add a reviewer to assignment

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "'$ASSIGNMENT_ID'",
    "reviewer_employee_id": "EMP037",
    "reviewer_type": "PEER"
  }' | jq .
```

**Save the returned `reviewer_id`:**
```bash
REVIEWER_ID="<paste reviewer_id UUID here>"
```

### 7.6 — Add manager reviewer

```bash
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_id": "'$ASSIGNMENT_ID'",
    "reviewer_employee_id": "EMP021",
    "reviewer_type": "MANAGER"
  }' | jq .
```

### 7.7 — Remove a reviewer

```bash
curl -s -b cookies.txt -X DELETE "$BASE/api/v1/assignments/reviewers/$REVIEWER_ID" | jq .
```

### 7.8 — Delete assignment

```bash
curl -s -b cookies.txt -X DELETE "$BASE/api/v1/assignments/$ASSIGNMENT_ID" | jq .
```

---

## 8. Reviewers

### 8.1 — Get my pending surveys (authenticated)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/reviewers/pending" | jq .
```

### 8.2 — Get reviewer record by ID

```bash
curl -s -b cookies.txt "$BASE/api/v1/reviewers/$REVIEWER_ID" | jq .
```

### 8.3 — Get reviewer by access token (public — no login needed)

```bash
TOKEN="<access_token from reviewer record>"
curl -s "$BASE/api/v1/reviewers/by-token/$TOKEN" | jq .
```

---

## 9. Self-Feedback

> Any authenticated employee (for their own data). CXO for completion overview.

### 9.1 — Get self-feedback form

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/self-feedback/$CYCLE_ID" | jq .
```

### 9.2 — Save draft self-feedback

```bash
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_ratings": [
      { "competency_id": "COMM", "rating": 3 },
      { "competency_id": "TEAM", "rating": 4 },
      { "competency_id": "QUAL", "rating": 3 }
    ]
  }' | jq .
```

**Expected:** `200 OK` with `status: "DRAFT"`

### 9.3 — Submit self-feedback (one-time lock)

```bash
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "competency_ratings": [
      { "competency_id": "COMM", "rating": 3 },
      { "competency_id": "TEAM", "rating": 4 },
      { "competency_id": "QUAL", "rating": 3 }
    ]
  }' | jq .
```

**Expected:** `200 OK` with `status: "SUBMITTED"`

### 9.4 — View completion status for all employees (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/self-feedback/$CYCLE_ID/completion" | jq .
```

---

## 10. Survey Responses

> Accepts EITHER session cookie OR `?token=<access_token>` query param.

### 10.1 — Get survey form (session)

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/surveys/form/$REVIEWER_ID" | jq .
```

### 10.2 — Get survey form (token — no login needed)

```bash
TOKEN="<access_token from reviewer record>"
curl -s "$BASE/api/v1/surveys/form/$REVIEWER_ID?token=$TOKEN" | jq .
```

### 10.3 — Save draft responses

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/save" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 4, "comment": "Excellent communicator." },
      { "question_id": "IC-02", "rating": 3, "comment": "Good team player." }
    ]
  }' | jq .
```

### 10.4 — Submit survey (final, one-time)

```bash
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 4, "comment": "Excellent communicator." },
      { "question_id": "IC-02", "rating": 3, "comment": "Good team player." }
    ]
  }' | jq .
```

**Expected:** `200 OK` with `status: "COMPLETED"`

### 10.5 — Admin: submit on behalf (CXO only)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/on-behalf" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "question_id": "IC-01", "rating": 3 }
    ]
  }' | jq .
```

### 10.6 — Admin: reopen completed survey (CXO only)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/reopen" | jq .
```

---

## 11. Scores

### 11.1 — Get my own scores

```bash
curl -s -b cookies_ic.txt "$BASE/api/v1/scores/my" | jq .
```

### 11.2 — Get full cycle scoreboard (CXO only)

```bash
curl -s -b cookies.txt "$BASE/api/v1/scores/cycle/$CYCLE_ID" | jq .
```

### 11.3 — Get one employee's scorecard

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/scores/employee/EMP036/cycle/$CYCLE_ID" | jq .
```

### 11.4 — Get comparison (self vs department average)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/scores/employee/EMP036/cycle/$CYCLE_ID/comparison" | jq .
```

### 11.5 — Force recalculate scores (CXO only)

```bash
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/scores/cycle/$CYCLE_ID/recalculate" | jq .
```

---

## 12. Results / Dashboards

### 12.1 — Employee dashboard (own or TM/HOD/CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/employee/EMP036/cycle/$CYCLE_ID" | jq .
```

### 12.2 — Anonymised comments for employee

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/employee/EMP036/cycle/$CYCLE_ID/comments" | jq .
```

### 12.3 — Team dashboard (TM/HOD/CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/team/cycle/$CYCLE_ID" | jq .
```

### 12.4 — Department dashboard (HOD/CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/department/cycle/$CYCLE_ID" | jq .
```

### 12.5 — Org-level dashboard (CXO only)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/results/org/cycle/$CYCLE_ID" | jq .
```

---

## 13. Reports

### 13.1 — Individual PDF report

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/individual/EMP036/cycle/$CYCLE_ID" \
  -o individual_report.pdf
```

### 13.2 — Department PDF report (CXO/HOD)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/department/cycle/$CYCLE_ID" \
  -o dept_report.pdf
```

### 13.3 — Org-wide PDF report (CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/org/cycle/$CYCLE_ID" \
  -o org_report.pdf
```

### 13.4 — CSV export of all scores (CXO)

```bash
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/export/cycle/$CYCLE_ID" \
  -o scores_export.csv
```

---

## 14. Admin

> All admin routes require CXO role.

### 14.1 — System dashboard

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/dashboard" | jq .
```

### 14.2 — Get reviewer config (min/max reviewer limits)

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/reviewer-config" | jq .
```

### 14.3 — Update reviewer config

```bash
curl -s -b cookies.txt -X PATCH "$BASE/api/v1/admin/reviewer-config" \
  -H "Content-Type: application/json" \
  -d '{"min_reviewers": 2, "max_reviewers": 5}' | jq .
```

### 14.4 — Audit log

```bash
curl -s -b cookies.txt "$BASE/api/v1/admin/audit-logs?page=1&limit=20" | jq .
```

---

## End-to-End Test Flow

Complete sequence from zero to scores:

```bash
export BASE="http://localhost:3000"

# ── 1. Create admin login (mock data already has employee records) ──
curl -s -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@motadata.com","password":"Motadata@123","name":"Rajesh Kumar"}' | jq .

# ── 2. Sign in as CXO admin ──
curl -s -c cookies.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"rajesh.kumar@motadata.com","password":"Motadata@123"}' | jq .

# ── 3. Verify CXO role ──
curl -s -b cookies.txt "$BASE/api/v1/auth/me" | jq '{email:.data.email, role:.data.group_name}'

# ── 4. Create a review cycle ──
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles" \
  -H "Content-Type: application/json" \
  -d '{"cycle_name":"Q1 2026","start_date":"2026-01-01","end_date":"2026-03-31","duration_months":3,"grace_period_days":3,"enable_self_feedback":true,"enable_colleague_feedback":true}' | jq .
# → save cycle_id as CYCLE_ID

# ── 5. Activate the cycle ──
curl -s -b cookies.txt -X POST "$BASE/api/v1/cycles/$CYCLE_ID/activate" | jq .

# ── 6. Create an assignment for an IC employee ──
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP036","cycle_id":"'$CYCLE_ID'"}' | jq .
# → save assignment_id as ASSIGNMENT_ID

# ── 7. Add a peer reviewer ──
curl -s -b cookies.txt -X POST "$BASE/api/v1/assignments/reviewers" \
  -H "Content-Type: application/json" \
  -d '{"assignment_id":"'$ASSIGNMENT_ID'","reviewer_employee_id":"EMP037","reviewer_type":"PEER"}' | jq .
# → save reviewer_id as REVIEWER_ID

# ── 8. Create IC employee login ──
curl -s -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun.sharma@motadata.com","password":"Motadata@123","name":"Arjun Sharma"}' | jq .
curl -s -c cookies_ic.txt -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun.sharma@motadata.com","password":"Motadata@123"}' | jq .

# ── 9. IC submits self-feedback ──
curl -s -b cookies_ic.txt -X POST "$BASE/api/v1/self-feedback/$CYCLE_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"competency_ratings":[{"competency_id":"COMM","rating":3},{"competency_id":"TEAM","rating":4}]}' | jq .

# ── 10. Reviewer submits survey ──
curl -s -b cookies_ic.txt \
  -X POST "$BASE/api/v1/surveys/form/$REVIEWER_ID/submit" \
  -H "Content-Type: application/json" \
  -d '{"responses":[{"question_id":"IC-01","rating":4,"comment":"Great work."}]}' | jq .

# ── 11. CXO recalculates scores ──
curl -s -b cookies.txt \
  -X POST "$BASE/api/v1/scores/cycle/$CYCLE_ID/recalculate" | jq .

# ── 12. View results ──
curl -s -b cookies.txt \
  "$BASE/api/v1/results/employee/EMP036/cycle/$CYCLE_ID" | jq .

# ── 13. Export CSV ──
curl -s -b cookies.txt \
  "$BASE/api/v1/reports/export/cycle/$CYCLE_ID" -o scores.csv
```

---

## Complete Route Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | API index |
| GET | `/health` | Public | Health check |
| **Auth** | | | |
| POST | `/api/auth/sign-up/email` | Public | Create better-auth login |
| POST | `/api/auth/sign-in/email` | Public | Sign in |
| POST | `/api/auth/sign-out` | Session | Sign out |
| GET | `/api/auth/get-session` | Session | Session info |
| GET | `/api/v1/auth/me` | Session | Full employee profile |
| POST | `/api/v1/auth/seed-admin` | Public (one-time) | Fresh-DB admin setup |
| **Employees** | | | |
| GET | `/api/v1/employees` | CXO | List employees |
| GET | `/api/v1/employees/:id` | Self/CXO | Get one employee |
| PATCH | `/api/v1/employees/:id` | CXO | Update managed fields |
| POST | `/api/v1/employees/sync` | CXO | Trigger AD sync |
| GET | `/api/v1/employees/sync/logs` | CXO | Sync history |
| **Cycles** | | | |
| GET | `/api/v1/cycles` | Session | List cycles |
| POST | `/api/v1/cycles` | CXO | Create cycle |
| GET | `/api/v1/cycles/:id` | Session | Get cycle |
| PATCH | `/api/v1/cycles/:id` | CXO | Update cycle |
| DELETE | `/api/v1/cycles/:id` | CXO | Delete draft cycle |
| POST | `/api/v1/cycles/:id/activate` | CXO | DRAFT → ACTIVE |
| POST | `/api/v1/cycles/:id/publish` | CXO | COMPLETED → PUBLISHED |
| **Competencies** | | | |
| GET | `/api/v1/competencies` | Session | List competencies |
| GET | `/api/v1/competencies/:id` | Session | Get competency |
| POST | `/api/v1/competencies` | CXO | Create competency |
| PATCH | `/api/v1/competencies/:id` | CXO | Update competency |
| **Questions** | | | |
| GET | `/api/v1/questions` | Session | List questions |
| GET | `/api/v1/questions/:id` | Session | Get question |
| POST | `/api/v1/questions` | CXO | Create question |
| PATCH | `/api/v1/questions/:id` | CXO | Update question |
| POST | `/api/v1/questions/import/csv` | CXO | Bulk import CSV |
| **Self-Feedback** | | | |
| GET | `/api/v1/self-feedback/:cycleId` | Session | Get form |
| POST | `/api/v1/self-feedback/:cycleId` | Session | Save draft |
| POST | `/api/v1/self-feedback/:cycleId/submit` | Session | Final submit |
| GET | `/api/v1/self-feedback/:cycleId/completion` | CXO | Completion overview |
| **Assignments** | | | |
| GET | `/api/v1/assignments` | Session | List assignments |
| POST | `/api/v1/assignments` | CXO | Create assignment |
| GET | `/api/v1/assignments/status` | CXO | Completion status |
| POST | `/api/v1/assignments/bulk-csv` | CXO | Bulk assign via CSV |
| GET | `/api/v1/assignments/:id` | Session | Get assignment |
| DELETE | `/api/v1/assignments/:id` | CXO | Delete assignment |
| GET | `/api/v1/assignments/:id/suggestions` | CXO | Reviewer suggestions |
| POST | `/api/v1/assignments/reviewers` | CXO | Add reviewer |
| DELETE | `/api/v1/assignments/reviewers/:reviewerId` | CXO | Remove reviewer |
| **Reviewers** | | | |
| GET | `/api/v1/reviewers/by-token/:token` | Public | Get by access token |
| GET | `/api/v1/reviewers/pending` | Session | My pending surveys |
| GET | `/api/v1/reviewers/:id` | Self/CXO | Get reviewer record |
| **Surveys** | | | |
| GET | `/api/v1/surveys/form/:reviewerId` | Session/Token | Get survey form |
| POST | `/api/v1/surveys/form/:reviewerId/save` | Session/Token | Save draft |
| POST | `/api/v1/surveys/form/:reviewerId/submit` | Session/Token | Final submit |
| POST | `/api/v1/surveys/form/:reviewerId/on-behalf` | CXO | Admin submit |
| POST | `/api/v1/surveys/form/:reviewerId/reopen` | CXO | Admin reopen |
| **Scores** | | | |
| GET | `/api/v1/scores/my` | Session | My scores |
| GET | `/api/v1/scores/cycle/:cycleId` | CXO | Full scoreboard |
| POST | `/api/v1/scores/cycle/:cycleId/recalculate` | CXO | Force recalculate |
| GET | `/api/v1/scores/employee/:employeeId/cycle/:cycleId` | Self/TM/HOD/CXO | Scorecard |
| GET | `/api/v1/scores/employee/:employeeId/cycle/:cycleId/comparison` | Self/CXO | Self vs dept |
| **Results** | | | |
| GET | `/api/v1/results/employee/:employeeId/cycle/:cycleId` | Self/TM/HOD/CXO | Dashboard |
| GET | `/api/v1/results/employee/:employeeId/cycle/:cycleId/comments` | Self/TM/HOD/CXO | Comments |
| GET | `/api/v1/results/team/cycle/:cycleId` | TM/HOD/CXO | Team view |
| GET | `/api/v1/results/department/cycle/:cycleId` | HOD/CXO | Dept view |
| GET | `/api/v1/results/org/cycle/:cycleId` | CXO | Org view |
| **Reports** | | | |
| GET | `/api/v1/reports/individual/:employeeId/cycle/:cycleId` | Self/TM/HOD/CXO | PDF |
| GET | `/api/v1/reports/department/cycle/:cycleId` | HOD/CXO | Dept PDF |
| GET | `/api/v1/reports/org/cycle/:cycleId` | CXO | Org PDF |
| GET | `/api/v1/reports/export/cycle/:cycleId` | CXO | CSV export |
| **Admin** | | | |
| GET | `/api/v1/admin/dashboard` | CXO | System stats |
| GET | `/api/v1/admin/reviewer-config` | CXO | Reviewer limits |
| PATCH | `/api/v1/admin/reviewer-config` | CXO | Update limits |
| GET | `/api/v1/admin/audit-logs` | CXO | Audit history |
