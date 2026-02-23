# 360 Feedback Platform - Product Requirements Document

**Version:** 1.0
**Date:** February 2026
**Author:** Product Management
**Status:** Ready for Development

---

## 1. Executive Summary

### 1.1 Purpose

Build a 360-degree feedback platform that enables multi-stakeholder anonymous feedback collection for employee performance evaluation at Motadata.

### 1.2 Scope

This document covers the **360 Feedback System** only. The following are **NOT in scope**:

| Excluded                  | Reason                    |
| ------------------------- | ------------------------- |
| OKR Module                | Separate platform         |
| Organization Pulse        | Separate module (Phase 2) |
| AI Analytics Engine       | Phase 2                   |
| Mid-Cycle Manager Reviews | Phase 2                   |
| Employee Suggestions      | Phase 2                   |

### 1.3 Target Scale

- **Current:** 300-400 employees across 20 departments
- **Scalable to:** 1,000+ employees

---

## 2. User Roles

### 2.1 Role Definitions

| Role                   | Code  | Count | Description                       |
| ---------------------- | ----- | ----- | --------------------------------- |
| Individual Contributor | IC    | ~250  | Regular employees                 |
| Team Manager           | TM    | ~40   | Manages team of ICs               |
| Head of Department     | HOD   | ~15   | Manages department (multiple TMs) |
| CXO/HR Admin           | ADMIN | ~5    | System administrators             |

### 2.2 Role Hierarchy

```
CXO/HR Admin
    └── HOD
        └── Team Manager
            └── Individual Contributor
```

---

## 3. Core Concepts

### 3.1 Feedback Types (In Scope)

| Type                          | Purpose         | Filled By                 | Counted in Score    |
| ----------------------------- | --------------- | ------------------------- | ------------------- |
| **Self-Feedback**       | Self-assessment | Employee about themselves | NO (reference only) |
| **Colleagues Feedback** | Peer assessment | Assigned reviewers        | YES                 |

### 3.2 Rating Scale (4-Point Label)

| Rating Value | Label              | Interpretation                        |
| ------------ | ------------------ | ------------------------------------- |
| 4            | Outstanding Impact | Top performer, exceeds expectations   |
| 3            | Significant Impact | Meets expectations consistently       |
| 2            | Moderate Impact    | Meets basic expectations              |
| 1            | Not Enough Impact  | Below expectations, needs improvement |

### 3.3 Final Score Mapping

| Average Score | Label              |
| ------------- | ------------------ |
| 4             | Outstanding Impact |
| 3             | Significant Impact |
| 2             | Moderate Impact    |
| 1             | Not Enough Impact  |

> **Note:** Final score is rounded to nearest integer for label mapping.

### 3.4 Anonymity Rules

| Data Point          | Visible to Employee | Visible to TM/HOD | Visible to Admin |
| ------------------- | ------------------- | ----------------- | ---------------- |
| Rater Name          | NO                  | NO                | YES              |
| Rater Department    | NO                  | NO                | YES              |
| Reviewer Category   | YES                 | YES               | YES              |
| Individual Response | NO                  | NO                | YES (audit only) |
| Aggregated Score    | Label Only          | Label + Numeric   | Label + Numeric  |

---

## 4. Functional Requirements

### 4.1 Module: Employee Data Sync (AD Integration)

#### 4.1.1 Description

Employee data will be synced from **Active Directory (AD)**. No manual employee CRUD operations are required.

#### 4.1.2 Requirements

| ID    | Requirement                                                                              | Priority    |
| ----- | ---------------------------------------------------------------------------------------- | ----------- |
| AD-01 | System shall sync employee data from Active Directory                                    | Must Have   |
| AD-02 | Sync shall run on configurable schedule (default: daily)                                 | Must Have   |
| AD-03 | Sync shall capture: Employee ID, Name, Email, Department, Designation, Reporting Manager | Must Have   |
| AD-04 | System shall log all sync operations with success/failure status                         | Must Have   |
| AD-05 | Admin shall be able to trigger manual sync                                               | Should Have |
| AD-06 | System shall handle employee additions, updates, and deactivations                       | Must Have   |

#### 4.1.3 Employee Fields (From AD)

| Field             | Type                    | Source | Required |
| ----------------- | ----------------------- | ------ | -------- |
| Employee ID       | String                  | AD     | Yes      |
| Full Name         | String                  | AD     | Yes      |
| Email             | String                  | AD     | Yes      |
| Department        | String                  | AD     | Yes      |
| Designation       | String                  | AD     | Yes      |
| Reporting Manager | Reference (Employee ID) | AD     | Yes      |
| Date of Joining   | Date                    | AD     | Yes      |
| Is Active         | Boolean                 | AD     | Yes      |

#### 4.1.4 Additional Fields (System Managed)

| Field                        | Type                 | Description             | Required         |
| ---------------------------- | -------------------- | ----------------------- | ---------------- |
| Group Name                   | Enum (IC/TM/HOD/CXO) | Role classification     | Yes (Admin sets) |
| Cross-functional Peer Groups | Array (3-4 groups)   | For reviewer assignment | Yes (Admin sets) |
| Applicable Competencies      | Array (up to 10)     | For question filtering  | Optional         |

---

### 4.2 Module: Review Cycle Management

#### 4.2.1 Description

HR Admin creates and manages review cycles that define the feedback collection period.

#### 4.2.2 Requirements

| ID    | Requirement                                                                   | Priority    |
| ----- | ----------------------------------------------------------------------------- | ----------- |
| RC-01 | Admin shall create review cycles with name, start date, end date              | Must Have   |
| RC-02 | Cycle duration options: 3, 4, 6, or 12 months                                 | Must Have   |
| RC-03 | Admin shall configure grace period (0-7 days)                                 | Must Have   |
| RC-04 | Admin shall enable/disable Self-Feedback per cycle                            | Must Have   |
| RC-05 | Admin shall enable/disable Colleagues Feedback per cycle                      | Must Have   |
| RC-06 | Cycle shall have states: Draft → Active → Closing → Completed → Published | Must Have   |
| RC-07 | Admin shall activate cycle (Draft → Active)                                  | Must Have   |
| RC-08 | System shall auto-transition to Closing when end date reached                 | Must Have   |
| RC-09 | System shall auto-transition to Completed when grace period ends              | Must Have   |
| RC-10 | Admin shall publish results (Completed → Published)                          | Must Have   |
| RC-11 | Admin shall configure reminder schedule (days before deadline)                | Should Have |
| RC-12 | System shall prevent overlapping active cycles                                | Must Have   |
| RC-13 | Admin shall view cycle history                                                | Should Have |
| RC-14 | Admin shall fill survey on behalf of a reviewer                               | Must Have   |
| RC-15 | Admin shall reopen review form after grace period for specific employee       | Must Have   |

#### 4.2.3 Review Cycle States

```
DRAFT ──[Activate]──> ACTIVE ──[End Date]──> CLOSING ──[Grace Period Ends]──> COMPLETED ──[Publish]──> PUBLISHED
```

#### 4.2.4 Review Cycle Data Model

| Field                     | Type            | Required | Default   |
| ------------------------- | --------------- | -------- | --------- |
| cycle_id                  | UUID            | Auto     | -         |
| cycle_name                | String          | Yes      | -         |
| start_date                | Date            | Yes      | -         |
| end_date                  | Date            | Yes      | -         |
| duration_months           | Enum (3/4/6/12) | Yes      | -         |
| grace_period_days         | Integer         | Yes      | 3         |
| status                    | Enum            | Auto     | DRAFT     |
| enable_self_feedback      | Boolean         | Yes      | true      |
| enable_colleague_feedback | Boolean         | Yes      | true      |
| reminder_schedule         | JSON Array      | No       | [7, 3, 1] |
| created_by                | Reference       | Auto     | -         |
| created_at                | DateTime        | Auto     | -         |
| updated_at                | DateTime        | Auto     | -         |

---

### 4.3 Module: Self-Feedback

#### 4.3.1 Description

Employees complete a self-assessment form to reflect on their own performance. Self-scores are **NOT counted** in the final 360 score (reference only).

#### 4.3.2 Requirements

| ID    | Requirement                                                      | Priority    |
| ----- | ---------------------------------------------------------------- | ----------- |
| SF-01 | Employee shall access self-feedback form when cycle is Active    | Must Have   |
| SF-02 | Form shall display list of competencies applicable to employee   | Must Have   |
| SF-03 | Employee shall rate each competency on 4-point scale             | Must Have   |
| SF-04 | Employee shall save draft before final submission                | Should Have |
| SF-05 | Employee shall submit form (one-time, no edit after submit)      | Must Have   |
| SF-06 | System shall display confirmation on submission                  | Must Have   |
| SF-07 | System shall record submission timestamp                         | Must Have   |
| SF-08 | Admin shall view self-feedback completion status                 | Must Have   |

#### 4.3.3 Self-Feedback Data Model

| Field              | Type                   | Required |
| ------------------ | ---------------------- | -------- |
| self_feedback_id   | UUID                   | Auto     |
| employee_id        | Reference              | Yes      |
| cycle_id           | Reference              | Yes      |
| competency_ratings | JSON Array             | Yes      |
| status             | Enum (DRAFT/SUBMITTED) | Auto     |
| submitted_at       | DateTime               | Auto     |
| created_at         | DateTime               | Auto     |

#### 4.3.4 Competency Rating Structure

```json
{
  "competency_ratings": [
    {
      "competency_id": "COMM",
      "competency_name": "Communication",
      "rating": 3,
      "label": "Significant Impact"
    }
  ]
}
```

---

### 4.4 Module: Colleagues Feedback (Survey System)

#### 4.4.1 Description

Multi-stakeholder anonymous feedback where assigned reviewers rate an employee on predefined questions.

#### 4.4.2 Survey Administration Requirements

| ID    | Requirement                                                       | Priority    |
| ----- | ----------------------------------------------------------------- | ----------- |
| SA-01 | Admin shall assign reviewers to each employee                     | Must Have   |
| SA-02 | System shall suggest reviewers based on hierarchy (auto-populate) | Should Have |
| SA-03 | Admin shall add/remove reviewers from suggestions                 | Must Have   |
| SA-04 | Admin shall configure minimum reviewers per employee (default: 2) | Must Have   |
| SA-05 | Admin shall configure maximum reviewers per employee (default: 8) | Must Have   |
| SA-06 | System shall validate reviewer count against configured min/max   | Must Have   |
| SA-07 | Admin shall bulk assign reviewers via CSV upload                  | Must Have  |
| SA-08 | Admin shall view assignment status per employee                   | Must Have   |
| SA-09 | Admin shall rollback/reassign survey if assigned incorrectly      | Must Have   |

#### 4.4.3 Reviewer Assignment Matrix (Guidelines)

| Employee Type          | Reviewer Sources                                                                                    | Count |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ----- |
| **IC**           | Reporting Manager (1), Peers (4), Cross-functional Peers (3)                                        | 8     |
| **Team Manager** | Reporting Manager (1), Peers (2), Direct Reports (3), Cross-functional Peers (2)                    | 8     |
| **HOD**          | Reporting Manager/CXO (3), Cross-functional Peers (3), Direct Reports (2-3), Indirect Reports (2-3) | 10-12 |

> **Note:** This is a guideline. Assignment should be flexible based on organizational needs.

#### 4.4.4 Reviewer Types

| Type Code        | Description                                           |
| ---------------- | ----------------------------------------------------- |
| MANAGER          | Direct reporting manager                              |
| PEER             | Same level in same department                         |
| DIRECT_REPORT    | Directly reports to the employee                      |
| INDIRECT_REPORT  | Reports to employee's direct report                   |
| CROSS_FUNCTIONAL | Same level in different department (from peer groups) |
| CXO              | C-level executive                                     |

#### 4.4.5 Survey Completion Requirements

| ID    | Requirement                                                              | Priority    |
| ----- | ------------------------------------------------------------------------ | ----------- |
| SC-01 | Reviewer shall see list of assigned surveys on login                     | Must Have   |
| SC-02 | Survey list shall show: Employee Name, Designation, Department, Deadline | Must Have   |
| SC-03 | Reviewer shall click to start survey                                     | Must Have   |
| SC-04 | System shall display confidentiality notice before survey                | Must Have   |
| SC-05 | System shall display question set based on employee's group (IC/TM/HOD)  | Must Have   |
| SC-06 | Reviewer shall rate each question on 4-point scale                       | Must Have   |
| SC-07 | Reviewer shall add optional comments                                     | Should Have |
| SC-08 | Reviewer shall save draft before final submission                        | Must Have   |
| SC-09 | Reviewer shall submit survey (one-time, no edit after submit)            | Must Have   |
| SC-10 | System shall display confidentiality reminder after submission           | Must Have   |
| SC-11 | System shall record submission timestamp                                 | Must Have   |
| SC-12 | Reviewer shall view their own past 360 results                           | Must Have   |
| SC-13 | Survey shall clearly display deadline                                    | Must Have   |

#### 4.4.6 Survey Data Models

**Survey Assignment**

| Field         | Type                                 | Required |
| ------------- | ------------------------------------ | -------- |
| assignment_id | UUID                                 | Auto     |
| employee_id   | Reference                            | Yes      |
| cycle_id      | Reference                            | Yes      |
| status        | Enum (PENDING/IN_PROGRESS/COMPLETED) | Auto     |
| created_at    | DateTime                             | Auto     |
| updated_at    | DateTime                             | Auto     |

**Survey Reviewer**

| Field                | Type                                 | Required |
| -------------------- | ------------------------------------ | -------- |
| reviewer_id          | UUID                                 | Auto     |
| assignment_id        | Reference                            | Yes      |
| reviewer_employee_id | Reference                            | Yes      |
| reviewer_type        | Enum                                 | Yes      |
| question_set         | Enum (IC/TM/HOD)                     | Yes      |
| status               | Enum (PENDING/IN_PROGRESS/COMPLETED) | Auto     |
| access_token         | UUID                                 | Auto     |
| reminded_at          | DateTime                             | Auto     |
| completed_at         | DateTime                             | Auto     |

**Survey Response**

| Field       | Type          | Required |
| ----------- | ------------- | -------- |
| response_id | UUID          | Auto     |
| reviewer_id | Reference     | Yes      |
| question_id | Reference     | Yes      |
| rating      | Integer (1-4) | Yes      |
| created_at  | DateTime      | Auto     |

**Survey Comments**

| Field        | Type      | Required |
| ------------ | --------- | -------- |
| comment_id   | UUID      | Auto     |
| reviewer_id  | Reference | Yes      |
| comment_text | Text      | Yes      |
| created_at   | DateTime  | Auto     |

---

### 4.5 Module: Question Bank

#### 4.5.1 Description

Pre-defined questions organized by employee group (IC, TM, HOD) and mapped to competencies.

#### 4.5.2 Requirements

| ID    | Requirement                                                          | Priority    |
| ----- | -------------------------------------------------------------------- | ----------- |
| QB-01 | System shall store questions in 3 sets: IC, TM, HOD                  | Must Have   |
| QB-02 | Each question shall be mapped to a competency                        | Must Have   |
| QB-03 | Admin shall view all questions                                       | Must Have   |
| QB-04 | Admin shall enable/disable questions                                 | Should Have |
| QB-05 | Admin shall add custom questions                                     | Must Have   |
| QB-06 | Admin shall bulk import questions via CSV                            | Must Have   |
| QB-07 | Same questions shall be shown to all reviewers within a review group | Must Have   |

#### 4.5.3 Question Sets (Reference Only)

**IC Questions (15)**

| #  | Category        | Question                                       |
| -- | --------------- | ---------------------------------------------- |
| 1  | Communication   | Communicates ideas clearly and effectively     |
| 2  | Communication   | Listens actively and responds appropriately    |
| 3  | Teamwork        | Collaborates well with team members            |
| 4  | Teamwork        | Supports colleagues in achieving shared goals  |
| 5  | Quality         | Delivers high-quality work consistently        |
| 6  | Quality         | Pays attention to detail in deliverables       |
| 7  | Reliability     | Meets deadlines and commitments                |
| 8  | Reliability     | Is dependable and can be counted on            |
| 9  | Initiative      | Takes ownership of tasks proactively           |
| 10 | Initiative      | Identifies and solves problems independently   |
| 11 | Adaptability    | Adjusts well to changing priorities            |
| 12 | Adaptability    | Remains effective under pressure               |
| 13 | Growth          | Shows willingness to learn new skills          |
| 14 | Growth          | Accepts and acts on feedback constructively    |
| 15 | Professionalism | Maintains a positive and professional attitude |

**Team Manager Questions (15)**

| #  | Category            | Question                                         |
| -- | ------------------- | ------------------------------------------------ |
| 1  | Leadership          | Provides clear direction to the team             |
| 2  | Leadership          | Inspires and motivates team members              |
| 3  | Mentorship          | Develops and coaches team members effectively    |
| 4  | Mentorship          | Provides regular and constructive feedback       |
| 5  | Decision Making     | Makes timely and effective decisions             |
| 6  | Decision Making     | Considers input from team before deciding        |
| 7  | Delegation          | Assigns tasks appropriately based on strengths   |
| 8  | Delegation          | Empowers team members with autonomy              |
| 9  | Conflict Resolution | Handles team conflicts constructively            |
| 10 | Conflict Resolution | Creates a safe environment for open discussion   |
| 11 | Accountability      | Holds team members accountable fairly            |
| 12 | Accountability      | Takes responsibility for team outcomes           |
| 13 | Communication       | Keeps team informed about priorities and changes |
| 14 | Planning            | Sets realistic goals and milestones              |
| 15 | Recognition         | Recognizes and appreciates team contributions    |

**HOD Questions (16)**

| #  | Category            | Question                                         |
| -- | ------------------- | ------------------------------------------------ |
| 1  | Strategy            | Aligns team goals with company vision            |
| 2  | Strategy            | Anticipates future challenges and opportunities  |
| 3  | Cross-functional    | Builds strong relationships across departments   |
| 4  | Cross-functional    | Facilitates collaboration between teams          |
| 5  | Resource Management | Optimizes team resources effectively             |
| 6  | Resource Management | Makes sound budget and staffing decisions        |
| 7  | Change Management   | Leads organizational change initiatives          |
| 8  | Change Management   | Helps team navigate transitions smoothly         |
| 9  | Executive Presence  | Represents department effectively to leadership  |
| 10 | Executive Presence  | Communicates vision with clarity and conviction  |
| 11 | Talent Development  | Builds a strong pipeline of future leaders       |
| 12 | Talent Development  | Creates growth opportunities for high performers |
| 13 | Innovation          | Encourages experimentation and new ideas         |
| 14 | Innovation          | Implements process improvements proactively      |
| 15 | Business Acumen     | Understands and acts on business priorities      |
| 16 | Culture             | Champions company values and culture             |

#### 4.5.4 Question Data Model

| Field         | Type             | Required            |
| ------------- | ---------------- | ------------------- |
| question_id   | UUID             | Auto                |
| set_type      | Enum (IC/TM/HOD) | Yes                 |
| order_number  | Integer          | Yes                 |
| question_text | String           | Yes                 |
| category      | String           | Yes                 |
| competency_id | Reference        | Yes                 |
| is_active     | Boolean          | Yes (default: true) |
| created_at    | DateTime         | Auto                |
| updated_at    | DateTime         | Auto                |

---

### 4.6 Module: Score Calculation

#### 4.6.1 Description

Calculate final 360 score from colleague ratings using simple average (all reviewers have equal weight).

#### 4.6.2 Requirements

| ID      | Requirement                                                  | Priority    |
| ------- | ------------------------------------------------------------ | ----------- |
| CALC-01 | Self-rating shall be EXCLUDED from final score               | Must Have   |
| CALC-02 | System shall calculate simple average of colleague ratings   | Must Have   |
| CALC-03 | All reviewer types shall have equal weight (1.0x)            | Must Have   |
| CALC-04 | System shall map final score to 4-point label                | Must Have   |
| CALC-05 | System shall calculate competency-wise scores                | Must Have   |
| CALC-06 | System shall calculate reviewer-category-wise scores         | Must Have   |
| CALC-07 | Calculation shall trigger when cycle moves to COMPLETED      | Must Have   |

#### 4.6.3 Calculation Formula

```
Final Score = Sum of all reviewer average ratings / Total number of reviewers

Where:
- Each reviewer's rating = Average of their responses across all questions
- All reviewers have equal weight (1.0x)

Example:
- Manager: avg rating 3
- Peer 1: avg rating 4
- Peer 2: avg rating 3
- Direct Report: avg rating 4

Final Score = (3 + 4 + 3 + 4) / 4
            = 14 / 4
            = 3.5 → Round to 4 → "Outstanding Impact"
```

#### 4.6.4 Calculated Metrics Data Model

| Field                    | Type      | Description                                                |
| ------------------------ | --------- | ---------------------------------------------------------- |
| calc_id                  | UUID      | Auto                                                       |
| employee_id              | Reference | Employee being evaluated                                   |
| cycle_id                 | Reference | Review cycle                                               |
| self_score               | Decimal   | Self-assessment average (reference only)                   |
| colleague_score          | Decimal   | Simple average of colleague ratings                        |
| final_label              | Enum      | Mapped label (Outstanding/Significant/Moderate/Not Enough) |
| competency_scores        | JSON      | Per-competency breakdown                                   |
| reviewer_category_scores | JSON      | Per-reviewer-type breakdown                                |
| total_reviewers          | Integer   | Count of reviewers who submitted                           |
| calculated_at            | DateTime  | Calculation timestamp                                      |

---

### 4.7 Module: Dashboards

#### 4.7.1 Employee Dashboard

| Feature                        | Description                    | Data Shown                                    |
| ------------------------------ | ------------------------------ | --------------------------------------------- |
| **My 360 Results**       | Overall score                  | Label only (no numeric)                       |
| **Self vs Department**   | Comparison with dept average   | Competency-wise comparison                    |
| **Rater Breakdown**      | Scores by reviewer category    | Peer avg, Manager rating, etc. (names hidden) |
| **Competency Breakdown** | Per-competency scores          | Label for each competency                     |
| **Historical Trends**    | Past cycles comparison         | Trend chart                                   |
| **Comments**             | Reviewer comments              | Anonymized text                               |
| **Pending Surveys**      | Assigned reviews to complete   | List with deadlines                           |

#### 4.7.2 Team Manager Dashboard

| Feature                         | Description            | Data Shown                |
| ------------------------------- | ---------------------- | ------------------------- |
| **My Report**             | Personal 360 results   | Label only                |
| **Team 360 Overview**     | All team members       | Numeric + Label           |
| **Competency View**       | Team competency scores | High/low identification   |
| **Individual Drill-down** | Select team member     | Full breakdown            |
| **Comments**              | Team comments          | Individual + consolidated |
| **Pending Reviews**       | Surveys assigned to TM | List with deadlines       |

#### 4.7.3 HOD Dashboard

| Feature                           | Description            | Data Shown                |
| --------------------------------- | ---------------------- | ------------------------- |
| **My Report**               | Personal 360 results   | Label only                |
| **Department 360 Overview** | All dept employees     | Numeric + Label           |
| **Manager-wise View**       | Breakdown by TM        | Avg scores per team       |
| **Competency Analysis**     | Dept competency scores | Heatmap                   |
| **Trending**                | Past vs Current        | Comparison chart          |
| **Comments**                | Dept comments          | Individual + consolidated |

**Filters:**

- By Role (TM/IC)
- By Manager
- By Employee
- By Competency
- By Experience

#### 4.7.4 CXO/Admin Dashboard

| Feature                         | Description           | Data Shown                |
| ------------------------------- | --------------------- | ------------------------- |
| **Org 360 Overview**      | All employees         | Numeric + Label           |
| **Department Comparison** | Cross-dept analytics  | Comparative chart         |
| **Competency Analysis**   | Org-wide competency   | Heatmap                   |
| **Comments**              | All comments          | Individual + consolidated |
| **Review Cycle Status**   | Active cycle progress | Completion %              |
| **System Config**         | Admin settings        | Configuration panels      |

**Filters:**

- By Department/HOD
- By Manager
- By Role (TM/IC)
- By Individual
- By Competency
- By Experience

---

### 4.8 Module: Reports & Export

#### 4.8.1 Requirements

| ID     | Requirement                                                             | Priority     |
| ------ | ----------------------------------------------------------------------- | ------------ |
| RPT-01 | System shall generate individual employee PDF report                    | Must Have    |
| RPT-02 | PDF shall include: Overall score, competency breakdown, trend, comments | Must Have    |
| RPT-03 | PDF shall NOT include reviewer names or departments                     | Must Have    |
| RPT-04 | Admin shall generate department summary PDF                             | Must Have    |
| RPT-05 | Admin shall generate organization summary PDF                           | Must Have    |
| RPT-06 | Admin shall export raw data to CSV                                      | Should Have  |
| RPT-07 | Reports shall be downloadable                                           | Must Have    |
| RPT-08 | Admin shall schedule automated report generation                        | Nice to Have |

#### 4.8.2 Individual Report Contents

| Section                     | Content                                            |
| --------------------------- | -------------------------------------------------- |
| Header                      | Employee Name, Designation, Department, Cycle Name |
| Overall Score               | Final Label + Visual indicator                     |
| Self vs Department          | Comparison chart                                   |
| Competency Breakdown        | Per-competency scores (table + chart)              |
| Reviewer Category Breakdown | Scores by reviewer type                            |
| Historical Trend            | Past 3 cycles comparison                           |
| Comments                    | Anonymized reviewer comments                       |
| Footer                      | Generated date, confidentiality notice             |

---

### 4.9 Module: Notifications

#### 4.9.1 Channels

| Channel  | Integration    | Purpose              |
| -------- | -------------- | -------------------- |
| Email    | SMTP (Outlook) | All notifications    |
| MS Teams | Webhook        | Reminders and alerts |

#### 4.9.2 Notification Types

| Event                  | Recipients        | Channel       | Timing                       |
| ---------------------- | ----------------- | ------------- | ---------------------------- |
| Cycle Started          | All Employees     | Email         | On activation                |
| Survey Assigned        | Reviewer          | Email + Teams | On assignment                |
| Survey Reminder        | Pending Reviewers | Email + Teams | 7, 3, 1 days before deadline |
| Self-Feedback Reminder | Pending Employees | Email + Teams | 7, 3, 1 days before deadline |
| Cycle Ending           | All Pending       | Email + Teams | On closing                   |
| Results Published      | All Employees     | Email + Teams | On publish                   |

#### 4.9.3 Notification Data Model

| Field           | Type                       | Required |
| --------------- | -------------------------- | -------- |
| notification_id | UUID                       | Auto     |
| template_id     | Reference                  | Yes      |
| recipient_id    | Reference                  | Yes      |
| channel         | Enum (EMAIL/TEAMS)         | Yes      |
| subject         | String                     | Yes      |
| body            | Text                       | Yes      |
| status          | Enum (PENDING/SENT/FAILED) | Auto     |
| sent_at         | DateTime                   | Auto     |
| error_message   | Text                       | Auto     |

#### 4.9.4 Notification Templates

| Template ID       | Event                  | Subject                                                    |
| ----------------- | ---------------------- | ---------------------------------------------------------- |
| CYCLE_START       | Cycle Started          | 360 Feedback Cycle "{cycle_name}" has started              |
| SURVEY_ASSIGNED   | Survey Assigned        | You have been assigned to review {employee_name}           |
| SURVEY_REMINDER   | Survey Reminder        | Reminder: {count} surveys pending - Due in {days} days     |
| SELF_REMINDER     | Self-Feedback Reminder | Reminder: Complete your self-feedback - Due in {days} days |
| CYCLE_CLOSING     | Cycle Closing          | 360 Feedback Cycle closing - Submit pending surveys        |
| RESULTS_PUBLISHED | Results Published      | Your 360 Feedback results are now available                |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement       | Target                    |
| ----------------- | ------------------------- |
| Page Load Time    | < 3 seconds               |
| API Response Time | < 500ms (95th percentile) |
| Concurrent Users  | 100+                      |
| Report Generation | < 30 seconds              |

### 5.2 Security

| Requirement        | Description                          |
| ------------------ | ------------------------------------ |
| Authentication     | JWT-based token authentication       |
| Authorization      | Role-based access control (RBAC)     |
| Data Encryption    | HTTPS for transit, encrypted at rest |
| Session Management | Token expiry, secure cookie handling |
| Audit Logging      | All admin actions logged             |

### 5.3 Availability

| Requirement      | Target    |
| ---------------- | --------- |
| Uptime           | 99.5%     |
| Backup Frequency | Daily     |
| Recovery Time    | < 4 hours |

### 5.4 Browser Support

| Browser | Version           |
| ------- | ----------------- |
| Chrome  | Latest 2 versions |
| Firefox | Latest 2 versions |
| Edge    | Latest 2 versions |
| Safari  | Latest 2 versions |

---

## 6. Technical Specifications

### 6.1 Technology Stack

| Layer          | Technology          |
| -------------- | ------------------- |
| Frontend       | As per convenience |
| Backend        | As per convenience |
| Database       | As per convenience  |
| Authentication | JWT                 |
| Email          | SMTP (Outlook)      |
| Notifications  | MS Teams Webhooks   |
| PDF Generation | As per convenience  |
## 8. UI/UX Guidelines

### 8.1 Design Principles

- Clean, professional interface
- Mobile-responsive (desktop-first)
- Accessible (WCAG 2.1 AA)
- Consistent with Motadata brand

### 8.2 Key Screens

| Screen             | Users     | Purpose                     |
| ------------------ | --------- | --------------------------- |
| Login              | All       | AD authentication           |
| Dashboard          | All       | Role-based home screen      |
| Self-Feedback Form | All       | Complete self-assessment    |
| Survey List        | Reviewers | View pending surveys        |
| Survey Form        | Reviewers | Complete 360 review         |
| My Results         | All       | View personal 360 results   |
| Team Results       | TM        | View team members' results  |
| Dept Results       | HOD       | View department results     |
| Org Results        | Admin     | View organization results   |
| Cycle Management   | Admin     | Create/manage review cycles |
| Survey Admin       | Admin     | Assign/track surveys        |
| Reports            | Admin     | Generate/download reports   |

### 8.3 Color Scheme (Labels)

| Label              | Color | Hex     |
| ------------------ | ----- | ------- |
| Outstanding Impact | Green | #22C55E |
| Significant Impact | Blue  | #3B82F6 |
| Moderate Impact    | Amber | #F59E0B |
| Not Enough Impact  | Red   | #EF4444 |

---

## 9. Phase 2 Roadmap

Items excluded from Phase 1:

| Feature              | Description                          |
| -------------------- | ------------------------------------ |
| Organization Pulse   | Separate org-wide sentiment survey   |
| Mid-Cycle Reviews    | Ad-hoc reviews outside regular cycle |
| Employee Suggestions | Ideas and grievance capture          |
| AI Analytics         | Sentiment analysis, trend prediction |

---

## 10. Appendix

### A. Glossary

| Term                | Definition                                     |
| ------------------- | ---------------------------------------------- |
| 360 Feedback        | Multi-stakeholder feedback from all directions |
| Self-Feedback       | Employee's self-assessment                     |
| Colleagues Feedback | Anonymous peer review                          |
| Review Cycle        | Time-bound feedback collection period          |
| Competency          | Skill or behavior being evaluated              |

### B. Document History

| Version | Date     | Author      | Changes     |
| ------- | -------- | ----------- | ----------- |
| 1.0     | Feb 2026 | Om Vekariya | Initial PRD |

---

**End of Document**
