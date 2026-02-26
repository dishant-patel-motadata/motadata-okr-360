# 360 Feedback Platform — Complete Database Schema

> **Target:** Supabase / PostgreSQL 15+ &nbsp;|&nbsp; **Version:** 1.0 &nbsp;|&nbsp; **Tables:** 17

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [The Five Logical Layers](#2-the-five-logical-layers)
3. [Entity-Relationship Diagram](#3-entity-relationship-diagram)
4. [Table-by-Table Reference](#4-table-by-table-reference)
   - 4.1 [employees](#41-employees)
   - 4.2 [ad_sync_log](#42-ad_sync_log)
   - 4.3 [competencies](#43-competencies)
   - 4.4 [questions](#44-questions)
   - 4.5 [question_templates](#45-question_templates)
   - 4.6 [template_questions](#46-template_questions)
   - 4.7 [reviewer_config](#47-reviewer_config)
   - 4.8 [reviewer_role_config](#48-reviewer_role_config)
   - 4.9 [review_cycles](#49-review_cycles)
   - 4.10 [survey_assignments](#410-survey_assignments)
   - 4.11 [employee_mapping_uploads](#411-employee_mapping_uploads)
   - 4.12 [survey_reviewers](#412-survey_reviewers)
   - 4.13 [survey_responses](#413-survey_responses)
   - 4.14 [survey_comments](#414-survey_comments)
   - 4.15 [self_feedback](#415-self_feedback)
   - 4.16 [calculated_scores](#416-calculated_scores)
   - 4.17 [notification_templates](#417-notification_templates)
   - 4.18 [notification_log](#418-notification_log)
   - 4.19 [audit_log](#419-audit_log)
5. [Relationships Summary](#5-relationships-summary)
6. [Status Lifecycles](#6-status-lifecycles)
7. [End-to-End Data Flow](#7-end-to-end-data-flow)
8. [Key Join Paths for Application Code](#8-key-join-paths-for-application-code)
9. [Constraints & Business Rules](#9-constraints--business-rules)
10. [Indexes](#10-indexes)
11. [Triggers](#11-triggers)

---

## 1. Schema Overview

This database powers a **360-degree feedback platform** where employees are evaluated by their managers, peers, direct reports, and cross-functional colleagues across behavioural competencies. The schema supports:

- **Multi-cycle reviews** — run independent feedback campaigns (quarterly, half-yearly, annual).
- **Role-based question sets** — IC (15), TM (15), HOD (16) questions, each mapped to competencies.
- **Configurable reviewer counts** — global bounds + per-role, per-cycle fine-tuning.
- **Template-based question management** — reusable, versionable question bundles.
- **Self-assessment** — employees rate themselves for gap analysis against peer feedback.
- **Pre-computed scorecards** — aggregated scores by competency and reviewer category.
- **Full audit trail** — every admin action is logged with before/after snapshots.
- **Multi-channel notifications** — email + Teams with Mustache-templated messages.

---

## 2. The Five Logical Layers

| Layer | Tables | Purpose |
|---|---|---|
| **People & Org** | `employees`, `ad_sync_log` | Who exists in the org, hierarchy, AD sync history |
| **Setup & Config** | `competencies`, `questions`, `question_templates`, `template_questions`, `reviewer_config`, `reviewer_role_config` | What gets measured and how many reviewers per role |
| **Cycle & Assignments** | `review_cycles`, `survey_assignments`, `survey_reviewers`, `employee_mapping_uploads` | Time-boxed campaigns, who reviews whom |
| **Feedback Data** | `survey_responses`, `survey_comments`, `self_feedback` | Raw numeric ratings + qualitative text |
| **Outputs & Ops** | `calculated_scores`, `notification_templates`, `notification_log`, `audit_log` | Pre-computed results, communications, audit trail |

---

## 3. Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PEOPLE & ORG LAYER                                         │
│                                                                                         │
│  ┌──────────────────┐          ┌──────────────────┐                                     │
│  │   employees       │          │   ad_sync_log     │  (standalone — no FK)              │
│  │──────────────────│          │──────────────────│                                     │
│  │ PK employee_id    │◄─┐      │ PK sync_id        │                                     │
│  │    full_name      │  │      │    sync_type       │                                     │
│  │    email          │  │      │    status          │                                     │
│  │    department     │  │      │    employees_added  │                                     │
│  │    group_name     │  │      │    ...             │                                     │
│  │ FK reporting_     │──┘      └──────────────────┘                                     │
│  │    manager_id     │  (self-ref)                                                       │
│  │    is_active      │                                                                   │
│  └────────┬─────────┘                                                                   │
│           │                                                                              │
│           │  Referenced by virtually every other table                                   │
└───────────┼─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            SETUP & CONFIG LAYER                                         │
│                                                                                         │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐                 │
│  │ competencies      │     │ question_templates│     │ reviewer_config  │                 │
│  │──────────────────│     │──────────────────│     │──────────────────│                 │
│  │ PK competency_id  │◄─┐  │ PK template_id   │◄─┐  │ PK config_id    │                 │
│  │    competency_name│  │  │    template_name  │  │  │    min_reviewers │                 │
│  │    applicable_to  │  │  │ FK cloned_from    │──┘  │    max_reviewers │                 │
│  └────────┬─────────┘  │  │ FK created_by ────│──►employees           │                 │
│           │            │  └────────┬─────────┘                                          │
│           │            │           │                                                     │
│           ▼            │           ▼                                                     │
│  ┌──────────────────┐  │  ┌──────────────────┐     ┌──────────────────┐                 │
│  │ questions         │  │  │template_questions │     │reviewer_role_    │                 │
│  │──────────────────│  │  │──────────────────│     │  config           │                 │
│  │ PK question_id    │  │  │ PK template_      │     │──────────────────│                 │
│  │    set_type       │  │  │    question_id    │     │ PK config_id    │                 │
│  │    order_number   │  │  │ FK template_id    │     │ FK cycle_id ────│──► review_cycles│
│  │ FK competency_id ─│──┘  │ FK question_id ──│──►  │    role          │                 │
│  └──────────────────┘      └──────────────────┘     │    selected_count│                 │
│                                                      └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          CYCLE & ASSIGNMENTS LAYER                                      │
│                                                                                         │
│  ┌──────────────────────┐                                                               │
│  │   review_cycles       │◄──────────────────────────────────────┐                      │
│  │──────────────────────│                                        │                      │
│  │ PK cycle_id           │     ┌──────────────────────┐          │                      │
│  │    cycle_name         │     │ employee_mapping_     │          │                      │
│  │    start_date/end_date│     │   uploads             │          │                      │
│  │    status             │     │──────────────────────│          │                      │
│  │ FK template_id ──────│──►  │ PK upload_id          │          │                      │
│  │ FK created_by ───────│──►  │ FK cycle_id ──────────│──────────┘                      │
│  └──────────┬───────────┘     │ FK uploaded_by ───────│──► employees                    │
│             │                  └──────────────────────┘                                  │
│             ▼                                                                            │
│  ┌──────────────────────┐                                                               │
│  │ survey_assignments    │                                                               │
│  │──────────────────────│                                                               │
│  │ PK assignment_id      │                                                               │
│  │ FK employee_id ──────│──► employees  (the ratee)                                     │
│  │ FK cycle_id ─────────│──► review_cycles                                              │
│  │    status             │                                                               │
│  └──────────┬───────────┘                                                               │
│             │                                                                            │
│             ▼                                                                            │
│  ┌──────────────────────┐                                                               │
│  │ survey_reviewers      │                                                               │
│  │──────────────────────│                                                               │
│  │ PK reviewer_id        │                                                               │
│  │ FK assignment_id ────│──► survey_assignments                                         │
│  │ FK reviewer_employee_ │                                                               │
│  │    id ───────────────│──► employees  (the reviewer)                                  │
│  │    reviewer_type      │                                                               │
│  │    question_set       │                                                               │
│  │    access_token       │                                                               │
│  └──────────┬───────────┘                                                               │
│             │                                                                            │
└─────────────┼───────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            FEEDBACK DATA LAYER                                          │
│                                                                                         │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐                    │
│  │ survey_responses  │   │ survey_comments   │   │ self_feedback     │                    │
│  │──────────────────│   │──────────────────│   │──────────────────│                    │
│  │ PK response_id    │   │ PK comment_id     │   │ PK self_feedback_ │                    │
│  │ FK reviewer_id ──│   │ FK reviewer_id ──│   │    id             │                    │
│  │ FK question_id ──│   │    comment_text   │   │ FK employee_id    │                    │
│  │    rating (1–4)   │   └──────────────────┘   │ FK cycle_id       │                    │
│  └──────────────────┘                           │    competency_    │                    │
│                                                  │    ratings (JSONB)│                    │
│                                                  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           OUTPUTS & OPS LAYER                                           │
│                                                                                         │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ calculated_scores │  │notification_      │  │ notification_log  │  │ audit_log       │ │
│  │──────────────────│  │  templates         │  │──────────────────│  │────────────────│ │
│  │ PK calc_id        │  │───────────────────│  │ PK notification_ │  │ PK log_id       │ │
│  │ FK employee_id    │  │ PK template_id    │  │    id             │  │ FK user_id      │ │
│  │ FK cycle_id       │  │    template_name  │  │ FK template_id   │  │    action_type  │ │
│  │    self_score     │  │    event_type     │  │ FK recipient_id  │  │    entity_type  │ │
│  │    colleague_score│  │    email_subject  │  │    channel        │  │    entity_id    │ │
│  │    final_label    │  │    email_body     │  │    status         │  │    old_value    │ │
│  │    competency_    │  │    teams_message  │  │    error_message  │  │    new_value    │ │
│  │    scores (JSONB) │  └───────────────────┘  └──────────────────┘  └────────────────┘ │
│  └──────────────────┘                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Table-by-Table Reference

### 4.1 `employees`

> **The hub table.** Every other table in the schema ultimately references back to an employee. Records are auto-synced from Azure Active Directory.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `employee_id` | `TEXT` | **PK** | — | AD object ID / employee number (e.g., `EMP001`) |
| `full_name` | `TEXT` | NOT NULL | — | Employee's display name |
| `email` | `TEXT` | NOT NULL, UNIQUE | — | Corporate email address |
| `department` | `TEXT` | NOT NULL | — | Department name (e.g., `Engineering`, `Sales`) |
| `designation` | `TEXT` | NOT NULL | — | Job title / role designation |
| `reporting_manager_id` | `TEXT` | NULL | — | **Self-referencing FK** → `employees(employee_id)`. CXOs have `NULL` |
| `date_of_joining` | `DATE` | NOT NULL | — | Hire date; used for cycle eligibility filtering |
| `group_name` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` / `CXO`. Determines which question set is used |
| `cross_functional_groups` | `JSONB` | NULL | — | Array of department names this employee can receive cross-functional reviews from. E.g., `["Engineering", "Product"]` |
| `applicable_competencies` | `JSONB` | NULL | — | Array of competency codes relevant to this employee's scorecard. E.g., `["COMM", "TEAM", "QUAL"]` |
| `leadership_level` | `INTEGER` | NULL | — | Hierarchical depth: `1` = CXO, `2` = HOD, `3` = TM, `4` = IC. Powers org-level queries |
| `org_path` | `TEXT[]` | NULL | — | Materialized path from org root to this employee. E.g., `{EMP001, EMP005, EMP021}`. Enables efficient subtree queries |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete flag. Inactive employees are excluded from new cycles; historical data is preserved |
| `synced_at` | `TIMESTAMPTZ` | NULL | — | Timestamp of the last AD sync that touched this record |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Last modification timestamp (auto-updated by trigger) |

**Constraints:**
- `CHECK (group_name IN ('IC','TM','HOD','CXO'))`

**Who references `employees`:**

| Referencing Table | Column | Meaning |
|---|---|---|
| `employees` | `reporting_manager_id` | Self-referencing: the employee's direct manager |
| `review_cycles` | `created_by` | Admin who created the cycle |
| `survey_assignments` | `employee_id` | The person being reviewed (ratee) |
| `survey_reviewers` | `reviewer_employee_id` | The person giving feedback |
| `self_feedback` | `employee_id` | The person rating themselves |
| `calculated_scores` | `employee_id` | The person whose scores are computed |
| `notification_log` | `recipient_id` | Person who received the notification |
| `audit_log` | `user_id` | Admin who performed the action |
| `reviewer_config` | `updated_by` | Admin who last updated global config |
| `reviewer_role_config` | `updated_by` | Admin who last updated role config |
| `question_templates` | `created_by` | Admin who created the template |
| `employee_mapping_uploads` | `uploaded_by` | Admin who uploaded the CSV |

---

### 4.2 `ad_sync_log`

> **Standalone table** (no foreign keys to other tables). Records the outcome of every Azure Active Directory synchronisation run.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `sync_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique identifier for the sync run |
| `sync_type` | `TEXT` | NOT NULL | — | `SCHEDULED` (nightly CRON) or `MANUAL` (admin-triggered) |
| `status` | `TEXT` | NOT NULL | — | `SUCCESS` / `PARTIAL` / `FAILED` |
| `employees_added` | `INTEGER` | NOT NULL | `0` | Count of new employees created |
| `employees_updated` | `INTEGER` | NOT NULL | `0` | Count of existing employees modified |
| `employees_deactivated` | `INTEGER` | NOT NULL | `0` | Count of employees marked inactive |
| `error_message` | `TEXT` | NULL | — | First error encountered (for `PARTIAL` or `FAILED` runs) |
| `started_at` | `TIMESTAMPTZ` | NOT NULL | — | When the sync run began |
| `completed_at` | `TIMESTAMPTZ` | NULL | — | When the sync run finished (`NULL` if `FAILED` before completion) |

**Constraints:**
- `CHECK (sync_type IN ('SCHEDULED','MANUAL'))`
- `CHECK (status IN ('SUCCESS','PARTIAL','FAILED'))`

---

### 4.3 `competencies`

> Master catalogue of 25 behavioural/skill areas measured through 360 feedback. Serves as the grouping anchor for score roll-ups.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `competency_id` | `TEXT` | **PK** | — | Short uppercase code (e.g., `COMM`, `LEAD`, `STRT`) |
| `competency_name` | `TEXT` | NOT NULL | — | Human-readable name (e.g., `Communication`, `Leadership`) |
| `description` | `TEXT` | NULL | — | What this competency measures |
| `applicable_to` | `TEXT[]` | NULL | `ARRAY['IC','TM','HOD']` | Which employee groups see this competency. E.g., `{IC,TM}` means it won't appear on HOD scorecards |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete; retired competencies don't break historical data |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Referenced by:** `questions.competency_id`

**Example competencies:**

| Code | Name | Applicable To |
|---|---|---|
| `COMM` | Communication | IC, TM, HOD |
| `TEAM` | Teamwork | IC, TM |
| `LEAD` | Leadership | TM, HOD |
| `STRT` | Strategy | HOD |
| `EXPR` | Executive Presence | HOD, CXO |

---

### 4.4 `questions`

> The 46 survey items split across three sets — **IC (15)**, **TM (15)**, **HOD (16)**. Each question is mapped to exactly one competency and displayed in a fixed order.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `question_id` | `TEXT` | **PK** | — | Human-readable ID (e.g., `IC-01`, `TM-03`, `HOD-11`) |
| `set_type` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — determines which employees are evaluated with this question |
| `order_number` | `INTEGER` | NOT NULL | — | Display sequence within the set (1-based) |
| `question_text` | `TEXT` | NOT NULL | — | The actual question shown to reviewers |
| `category` | `TEXT` | NOT NULL | — | Grouping label (e.g., `Communication`, `Leadership`). Informational, not used for scoring |
| `competency_id` | `TEXT` | NOT NULL | — | **FK → `competencies(competency_id)`**. Links this question to its competency for score aggregation |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete for question retirement |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (set_type, order_number)` — no duplicate positions within a set
- `CHECK (set_type IN ('IC','TM','HOD'))`

**How question routing works:**
1. Employee's `group_name` (e.g., `TM`) → determines `set_type`
2. Cycle's `template_id` → filters via `template_questions` junction
3. Result: the specific subset of questions the reviewer sees

---

### 4.5 `question_templates`

> Reusable question set bundles that are locked to a review cycle at creation time. Supports versioning via `cloned_from`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique template identifier |
| `template_name` | `TEXT` | NOT NULL, UNIQUE | — | Human-friendly name (e.g., `Standard Full Set (46 Questions)`) |
| `description` | `TEXT` | NULL | — | Notes on when/why to use this template |
| `cloned_from` | `UUID` | NULL | — | **Self-referencing FK → `question_templates(template_id)`**. Source template if this was cloned |
| `source_file_url` | `TEXT` | NULL | — | URL/path of an uploaded file used to create this template |
| `created_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who created it |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Inactive templates can't be assigned to new cycles |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Referenced by:** `review_cycles.template_id`, `template_questions.template_id`

---

### 4.6 `template_questions`

> Junction table implementing the **many-to-many** relationship between `question_templates` and `questions`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_question_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `template_id` | `UUID` | NOT NULL | — | **FK → `question_templates(template_id)`** `ON DELETE CASCADE` |
| `question_id` | `TEXT` | NOT NULL | — | **FK → `questions(question_id)`** |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete for temporarily excluding a question from a template |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (template_id, question_id)` — prevents duplicate inclusion

---

### 4.7 `reviewer_config`

> **Single-row** admin settings table defining the global minimum and maximum number of reviewers per employee.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `config_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `min_reviewers` | `INTEGER` | NOT NULL | `2` | Global lower bound for reviewer count |
| `max_reviewers` | `INTEGER` | NOT NULL | `8` | Global upper bound for reviewer count |
| `updated_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who last changed the config |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Business rule:** All per-role configs in `reviewer_role_config` must stay within these global bounds.

---

### 4.8 `reviewer_role_config`

> Per-cycle, per-role reviewer count settings that operate within the global bounds from `reviewer_config`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `config_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** `ON DELETE CASCADE` |
| `role` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` / `CXO` — the employee role this config applies to |
| `min_reviewers` | `INTEGER` | NOT NULL | `2` | Lower bound for this role (within global bounds) |
| `max_reviewers` | `INTEGER` | NOT NULL | `8` | Upper bound for this role (within global bounds) |
| `selected_count` | `INTEGER` | NULL | — | The **exact** number of reviewers each employee of this role must have. Chosen by admin from the min–max range |
| `updated_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`** |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (cycle_id, role)` — one config per role per cycle
- `CHECK (min_reviewers <= max_reviewers)`
- `CHECK (selected_count IS NULL OR (selected_count >= min_reviewers AND selected_count <= max_reviewers))`
- `CHECK (role IN ('IC','TM','HOD','CXO'))`

**Config hierarchy:**
```
reviewer_config (global: min=2, max=8)
  └── reviewer_role_config (per cycle, per role)
        ├── IC:  min=2, max=5, selected_count=3
        ├── TM:  min=3, max=6, selected_count=4
        ├── HOD: min=3, max=7, selected_count=5
        └── CXO: min=4, max=8, selected_count=6
```

---

### 4.9 `review_cycles`

> **The central campaign object.** Everything survey-related is scoped to a cycle. One row = one time-boxed 360-feedback campaign.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `cycle_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique cycle identifier |
| `cycle_name` | `TEXT` | NOT NULL | — | Display name (e.g., `H1 2026 Review`) |
| `start_date` | `DATE` | NOT NULL | — | Campaign start date |
| `end_date` | `DATE` | NOT NULL | — | Campaign end date (must be after `start_date`) |
| `duration_months` | `INTEGER` | NOT NULL | — | Campaign duration; restricted to `3`, `4`, `6`, or `12` months |
| `grace_period_days` | `INTEGER` | NOT NULL | `3` | Extra days after `end_date` for late submissions (CLOSING phase). Range: 0–7 |
| `status` | `TEXT` | NOT NULL | `DRAFT` | Lifecycle state (see [Status Lifecycles](#6-status-lifecycles)) |
| `enable_self_feedback` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: allow self-assessment in this cycle |
| `enable_colleague_feedback` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: allow peer/colleague reviews |
| `reminder_schedule` | `JSONB` | NULL | `[7,3,1]` | Array of days-before-deadline when automated reminders fire |
| `template_id` | `UUID` | NULL | — | **FK → `question_templates(template_id)`**. Locks the question set for this cycle |
| `employee_join_date_before` | `DATE` | NULL | — | Filter: only employees who joined on or before this date are eligible |
| `created_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`** |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `CHECK (end_date > start_date)`
- `CHECK (duration_months IN (3,4,6,12))`
- `CHECK (grace_period_days BETWEEN 0 AND 7)`
- `CHECK (status IN ('DRAFT','ACTIVE','CLOSING','COMPLETED','PUBLISHED'))`

**Child tables:** `survey_assignments`, `self_feedback`, `calculated_scores`, `reviewer_role_config`, `employee_mapping_uploads`

---

### 4.10 `survey_assignments`

> Enrols one employee in one review cycle. Acts as the parent container for all reviewers and responses for that person in that cycle.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `assignment_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique assignment identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person being reviewed (the **ratee**) |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `status` | `TEXT` | NOT NULL | `PENDING` | Derived from child reviewer statuses |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (employee_id, cycle_id)` — one assignment per employee per cycle
- `CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED'))`

**Status derivation logic:**
- `PENDING` — no reviewers have started
- `IN_PROGRESS` — at least one reviewer has completed, but not all
- `COMPLETED` — all assigned reviewers have completed

---

### 4.11 `employee_mapping_uploads`

> Tracks CSV file uploads used to bulk-create employee-reviewer mappings for a cycle.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `upload_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique upload identifier |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`**. Scopes the upload to a specific cycle |
| `file_name` | `TEXT` | NOT NULL | — | Original filename for display/audit |
| `file_url` | `TEXT` | NOT NULL | — | Storage path / URL of the uploaded CSV |
| `total_rows` | `INTEGER` | NOT NULL | `0` | Total data rows in the CSV file |
| `processed_rows` | `INTEGER` | NOT NULL | `0` | Rows successfully imported |
| `failed_rows` | `INTEGER` | NOT NULL | `0` | Rows that failed validation |
| `error_details` | `JSONB` | NULL | `[]` | Array of per-row error information for UI display |
| `status` | `TEXT` | NOT NULL | `PENDING` | Upload processing state |
| `uploaded_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who uploaded the file |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED'))`

---

### 4.12 `survey_reviewers`

> **The bridge table** between assignments and feedback. Each row = one reviewer assigned to evaluate one employee. This is where reviewer types, access tokens, and completion tracking live.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `reviewer_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique reviewer-assignment identifier |
| `assignment_id` | `UUID` | NOT NULL | — | **FK → `survey_assignments(assignment_id)`**. Links to the ratee |
| `reviewer_employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person giving feedback |
| `reviewer_type` | `TEXT` | NOT NULL | — | Category of reviewer (determines analytical weight in score calculations) |
| `question_set` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — snapshot of the ratee's `group_name` at assignment time |
| `status` | `TEXT` | NOT NULL | `PENDING` | Reviewer's completion state |
| `access_token` | `UUID` | UNIQUE | `gen_random_uuid()` | Unique token for password-less survey access via direct link |
| `reminded_at` | `TIMESTAMPTZ` | NULL | — | Timestamp of last reminder sent to this reviewer |
| `completed_at` | `TIMESTAMPTZ` | NULL | — | When the reviewer submitted their feedback |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `CHECK (reviewer_type IN ('MANAGER','PEER','DIRECT_REPORT','INDIRECT_REPORT','CROSS_FUNCTIONAL','CXO'))`
- `CHECK (question_set IN ('IC','TM','HOD'))`
- `CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED'))`

**Reviewer types explained:**

| Type | Who Is This? | Typical Count |
|---|---|---|
| `MANAGER` | The ratee's `reporting_manager_id` | 1 |
| `PEER` | Same-department colleagues at the same level | 2–4 |
| `DIRECT_REPORT` | Employees who report to the ratee | 0–3 |
| `INDIRECT_REPORT` | Skip-level reports | 0–2 |
| `CROSS_FUNCTIONAL` | Colleagues from a different department | 1–2 |
| `CXO` | C-level executives reviewing other CXOs | 0–4 |

**Why `question_set` is snapshotted:** If a TM is promoted to HOD mid-cycle, existing reviewers should still answer TM questions. The snapshot preserves the question set that was assigned at enrolment time.

---

### 4.13 `survey_responses`

> **The atomic unit of feedback.** One row = one numeric rating (1–4) given by one reviewer for one question.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `response_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `reviewer_id` | `UUID` | NOT NULL | — | **FK → `survey_reviewers(reviewer_id)`**. Links to who gave the rating |
| `question_id` | `TEXT` | NOT NULL | — | **FK → `questions(question_id)`**. Links to the competency for roll-up |
| `rating` | `INTEGER` | NOT NULL | — | Score on the 1–4 scale |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (reviewer_id, question_id)` — one answer per reviewer per question (enables safe upserts)
- `CHECK (rating BETWEEN 1 AND 4)`

**Rating scale:**

| Value | Label | Meaning |
|---|---|---|
| 1 | Not Enough Impact | Below expectations |
| 2 | Moderate Impact | Meets some expectations |
| 3 | Significant Impact | Meets or exceeds expectations |
| 4 | Outstanding Impact | Consistently exceeds expectations |

---

### 4.14 `survey_comments`

> Open-ended qualitative text submitted alongside numeric ratings. Separated into its own table for access control and future NLP/sentiment analysis.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `comment_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `reviewer_id` | `UUID` | NOT NULL | — | **FK → `survey_reviewers(reviewer_id)`**. Ties comment to the reviewer's type and ratee |
| `comment_text` | `TEXT` | NOT NULL | — | Free-form text (no length constraint) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

---

### 4.15 `self_feedback`

> Employee self-assessment, stored separately from peer feedback. Enables "self vs. peer" gap analysis in the final report.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `self_feedback_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person rating themselves |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `competency_ratings` | `JSONB` | NOT NULL | `[]` | Array of `{competency_id, rating}` objects. E.g., `[{"competency_id": "COMM", "rating": 3}, ...]` |
| `status` | `TEXT` | NOT NULL | `DRAFT` | `DRAFT` (can save progress) or `SUBMITTED` (locked) |
| `submitted_at` | `TIMESTAMPTZ` | NULL | — | When the employee formally submitted |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (employee_id, cycle_id)` — one self-review per person per cycle
- `CHECK (status IN ('DRAFT','SUBMITTED'))`

---

### 4.16 `calculated_scores`

> **Pre-computed scorecards** read by dashboards and reports. One row per employee per cycle, generated by the score engine after the cycle closes.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `calc_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`** |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `self_score` | `NUMERIC(4,2)` | NULL | — | Average of weighted self-ratings from `self_feedback.competency_ratings` |
| `colleague_score` | `NUMERIC(4,2)` | NULL | — | Weighted average across all reviewer types from `survey_responses` |
| `final_label` | `TEXT` | NULL | — | Derived performance band |
| `competency_scores` | `JSONB` | NULL | `{}` | Map of `competency_id → avg_score`. E.g., `{"COMM": 3.5, "TEAM": 4.0}` |
| `reviewer_category_scores` | `JSONB` | NULL | `{}` | Map of `reviewer_type → avg_score`. E.g., `{"MANAGER": 3.8, "PEER": 3.5}` |
| `reviewer_competency_breakdown` | `JSONB` | NULL | `{}` | Nested map: `reviewer_type → competency → avg_score`. E.g., `{"MANAGER": {"COMM": 3.5}, "PEER": {"COMM": 3.2}}` |
| `total_reviewers` | `INTEGER` | NULL | `0` | Count of completed reviewers (for transparency) |
| `calculated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | When the score was computed |

**Constraints:**
- `UNIQUE (employee_id, cycle_id)` — one scorecard per employee per cycle; safe to recalculate via upsert
- `CHECK (final_label IN ('Outstanding Impact','Significant Impact','Moderate Impact','Not Enough Impact'))`

**Final label derivation:**

| Score Range | Label |
|---|---|
| 3.50 – 4.00 | Outstanding Impact |
| 2.50 – 3.49 | Significant Impact |
| 1.50 – 2.49 | Moderate Impact |
| 1.00 – 1.49 | Not Enough Impact |

---

### 4.17 `notification_templates`

> Admin-editable message templates using Mustache-style placeholders. Each template has both email and Teams variants.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_id` | `TEXT` | **PK** | — | Short descriptive code (e.g., `CYCLE_START`, `SURVEY_ASSIGNED`) |
| `template_name` | `TEXT` | NOT NULL | — | Human-readable name |
| `event_type` | `TEXT` | NOT NULL | — | Application-layer event constant that triggers dispatch |
| `email_subject` | `TEXT` | NOT NULL | — | Email subject line with placeholders |
| `email_body` | `TEXT` | NOT NULL | — | Email body (HTML/plain text) with placeholders |
| `teams_message` | `TEXT` | NULL | — | Teams Adaptive Card message with placeholders |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Available placeholders:** `{{employee_name}}`, `{{reviewer_name}}`, `{{cycle_name}}`, `{{start_date}}`, `{{end_date}}`, `{{deadline}}`, `{{department}}`, `{{designation}}`, `{{pending_count}}`, `{{days_left}}`, `{{grace_end_date}}`

**Standard event types:**

| Template ID | Event | When Fired |
|---|---|---|
| `CYCLE_START` | Cycle activated | Cycle status → ACTIVE |
| `SURVEY_ASSIGNED` | Reviewer assigned | New `survey_reviewers` row created |
| `SURVEY_REMINDER` | Pending survey reminder | `reminder_schedule` days before deadline |
| `SELF_REMINDER` | Self-feedback reminder | `reminder_schedule` days before deadline |
| `CYCLE_CLOSING` | Grace period warning | Cycle status → CLOSING |
| `RESULTS_PUBLISHED` | Results available | Cycle status → PUBLISHED |

---

### 4.18 `notification_log`

> Append-only delivery log for every notification attempt. Functions as both an operational log and a retry queue.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `notification_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `template_id` | `TEXT` | NULL | — | **FK → `notification_templates(template_id)`**. Which template was used |
| `recipient_id` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Who received (or should have received) the notification |
| `channel` | `TEXT` | NOT NULL | — | `EMAIL` or `TEAMS` |
| `subject` | `TEXT` | NOT NULL | — | Resolved subject line (placeholders replaced) |
| `body` | `TEXT` | NOT NULL | — | Resolved body content |
| `status` | `TEXT` | NOT NULL | `PENDING` | Delivery state |
| `sent_at` | `TIMESTAMPTZ` | NULL | — | Actual send timestamp |
| `error_message` | `TEXT` | NULL | — | Error detail for failed deliveries |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `CHECK (channel IN ('EMAIL','TEAMS'))`
- `CHECK (status IN ('PENDING','SENT','FAILED'))`

---

### 4.19 `audit_log`

> **Immutable, append-only** audit trail of every significant administrative action. Provides before/after JSONB snapshots for point-in-time reconstruction.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `log_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `user_id` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who performed the action (`NULL` for system-initiated) |
| `action_type` | `TEXT` | NOT NULL | — | Verb: `CREATE`, `UPDATE`, `DELETE`, `ACTIVATE`, `PUBLISH`, `CALCULATE` |
| `entity_type` | `TEXT` | NOT NULL | — | Table name of the affected record (e.g., `review_cycles`, `survey_assignments`) |
| `entity_id` | `TEXT` | NOT NULL | — | Primary key of the affected row (`TEXT` to accommodate both UUID and TEXT PKs) |
| `old_value` | `JSONB` | NULL | — | Full snapshot of the record **before** the change (`NULL` for `CREATE` actions) |
| `new_value` | `JSONB` | NULL | — | Full snapshot of the record **after** the change (`NULL` for `DELETE` actions) |
| `ip_address` | `TEXT` | NULL | — | Client IP address for security investigations |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | When the action occurred |

---

## 5. Relationships Summary

### All Foreign Key Relationships

```
employees.reporting_manager_id          ──► employees.employee_id           (self-ref)

review_cycles.template_id              ──► question_templates.template_id
review_cycles.created_by               ──► employees.employee_id

competencies                           ◄── questions.competency_id

question_templates.cloned_from         ──► question_templates.template_id   (self-ref)
question_templates.created_by          ──► employees.employee_id

template_questions.template_id         ──► question_templates.template_id   (CASCADE)
template_questions.question_id         ──► questions.question_id

reviewer_config.updated_by             ──► employees.employee_id

reviewer_role_config.cycle_id          ──► review_cycles.cycle_id           (CASCADE)
reviewer_role_config.updated_by        ──► employees.employee_id

survey_assignments.employee_id         ──► employees.employee_id
survey_assignments.cycle_id            ──► review_cycles.cycle_id

employee_mapping_uploads.cycle_id      ──► review_cycles.cycle_id
employee_mapping_uploads.uploaded_by   ──► employees.employee_id

survey_reviewers.assignment_id         ──► survey_assignments.assignment_id
survey_reviewers.reviewer_employee_id  ──► employees.employee_id

survey_responses.reviewer_id           ──► survey_reviewers.reviewer_id
survey_responses.question_id           ──► questions.question_id

survey_comments.reviewer_id            ──► survey_reviewers.reviewer_id

self_feedback.employee_id              ──► employees.employee_id
self_feedback.cycle_id                 ──► review_cycles.cycle_id

calculated_scores.employee_id          ──► employees.employee_id
calculated_scores.cycle_id             ──► review_cycles.cycle_id

notification_log.template_id           ──► notification_templates.template_id
notification_log.recipient_id          ──► employees.employee_id

audit_log.user_id                      ──► employees.employee_id
```

### Cardinality Summary

| Relationship | Cardinality | Notes |
|---|---|---|
| `employees` ↔ `employees` (manager) | Many-to-One | CXOs have NULL manager |
| `review_cycles` → `question_templates` | Many-to-One | Multiple cycles can share a template |
| `question_templates` ↔ `questions` (via `template_questions`) | Many-to-Many | Junction table |
| `competencies` → `questions` | One-to-Many | One competency, multiple questions |
| `review_cycles` → `survey_assignments` | One-to-Many | One cycle, many enrolled employees |
| `survey_assignments` → `survey_reviewers` | One-to-Many | One ratee, multiple reviewers |
| `survey_reviewers` → `survey_responses` | One-to-Many | One reviewer, many question ratings |
| `survey_reviewers` → `survey_comments` | One-to-Many | One reviewer, one or more comments |
| `employees` × `review_cycles` → `self_feedback` | One-to-One | UNIQUE(employee_id, cycle_id) |
| `employees` × `review_cycles` → `calculated_scores` | One-to-One | UNIQUE(employee_id, cycle_id) |
| `review_cycles` → `reviewer_role_config` | One-to-Many | Up to 4 (one per role per cycle) |

---

## 6. Status Lifecycles

### Review Cycle Status

```
   ┌──────┐     Activate     ┌────────┐    end_date      ┌─────────┐   all surveys   ┌───────────┐   publish    ┌───────────┐
   │ DRAFT│ ───────────────► │ ACTIVE │ ────────────────► │ CLOSING │ ──────────────► │ COMPLETED │ ──────────► │ PUBLISHED │
   └──────┘                  └────────┘                   └─────────┘                 └───────────┘             └───────────┘
                              Surveys                     Grace period                 Scores                   Results
                              can be                      (0-7 extra                   calculated               viewable
                              submitted                   days for                                              by employees
                                                          late submissions)
```

**Rules:**
- Surveys can only be submitted while `ACTIVE` or `CLOSING`
- CLOSING duration = `grace_period_days` after `end_date`
- Score calculation happens during transition to `COMPLETED`
- `PUBLISHED` makes results visible to employees

### Survey Assignment Status

```
   ┌─────────┐    first reviewer     ┌─────────────┐    all reviewers     ┌───────────┐
   │ PENDING │ ────────────────────► │ IN_PROGRESS │ ──────────────────► │ COMPLETED │
   └─────────┘    starts              └─────────────┘    completed         └───────────┘
```

### Survey Reviewer Status

```
   ┌─────────┐    opens survey     ┌─────────────┐    submits all      ┌───────────┐
   │ PENDING │ ──────────────────► │ IN_PROGRESS │ ──────────────────► │ COMPLETED │
   └─────────┘                     └─────────────┘    ratings           └───────────┘
```

### Self-Feedback Status

```
   ┌───────┐    submit     ┌───────────┐
   │ DRAFT │ ────────────► │ SUBMITTED │
   └───────┘  (locked)     └───────────┘
```

### Upload Status

```
   ┌─────────┐    begin      ┌────────────┐    success    ┌───────────┐
   │ PENDING │ ────────────► │ PROCESSING │ ────────────► │ COMPLETED │
   └─────────┘               └──────┬─────┘               └───────────┘
                                     │ error
                                     ▼
                              ┌────────┐
                              │ FAILED │
                              └────────┘
```

### Notification Status

```
   ┌─────────┐    send success    ┌──────┐
   │ PENDING │ ─────────────────► │ SENT │
   └────┬────┘                    └──────┘
        │ send failure
        ▼
   ┌────────┐
   │ FAILED │
   └────────┘
```

---

## 7. End-to-End Data Flow

The complete lifecycle from setup through to published results:

### Phase 1: People Setup (AD Sync)

```
Azure Active Directory ──sync──► employees table
                                  ├── employee_id, full_name, email
                                  ├── department, group_name
                                  ├── reporting_manager_id (org tree)
                                  └── synced_at timestamp

Recursive CTE ──computes──► employees.org_path + leadership_level
                             ad_sync_log ◄── sync run stats
```

### Phase 2: Question & Competency Setup

```
Admin defines ──► competencies (25 entries: COMM, LEAD, STRT...)
                     │
                     ▼
Admin defines ──► questions (46 entries: IC-01..IC-15, TM-01..TM-15, HOD-01..HOD-16)
                     │
                     ▼
Admin creates ──► question_templates (bundled subsets)
                     │
                     ▼
                  template_questions (M:N junction mapping)
```

### Phase 3: Reviewer Configuration

```
Admin sets ──► reviewer_config (global: min=2, max=8)
                  │
                  ▼ (per cycle, per role)
              reviewer_role_config
                  ├── IC:  selected_count = 3
                  ├── TM:  selected_count = 4
                  ├── HOD: selected_count = 5
                  └── CXO: selected_count = 6
```

### Phase 4: Cycle Creation (DRAFT)

```
Admin creates ──► review_cycles (status=DRAFT)
                     ├── template_id → locks question set
                     ├── start_date, end_date
                     ├── grace_period_days
                     ├── reminder_schedule
                     └── employee_join_date_before (eligibility filter)
```

### Phase 5: Assignment & Mapping (still DRAFT)

```
CSV upload ──► employee_mapping_uploads (tracking)
                  │
                  ▼
              survey_assignments (one per employee × cycle)
                  │
                  ▼
              survey_reviewers (X per employee, where X = selected_count)
                  ├── MANAGER (1)
                  ├── PEER (variable)
                  ├── CROSS_FUNCTIONAL (variable)
                  └── each gets access_token for direct link
```

### Phase 6: Cycle Activation (DRAFT → ACTIVE)

```
Admin activates ──► review_cycles.status = 'ACTIVE'
                       │
                       ▼
                    notification_log ◄── CYCLE_START notifications
                    notification_log ◄── SURVEY_ASSIGNED notifications
                    audit_log ◄── ACTIVATE action logged
```

### Phase 7: Feedback Collection (ACTIVE)

```
Reviewers:
  survey_reviewers (access via token or login)
       │
       ├──► survey_responses (one per question, rating 1-4)
       ├──► survey_comments (qualitative text)
       └──► status: PENDING → IN_PROGRESS → COMPLETED

Employees (self):
  self_feedback
       ├──► competency_ratings (JSONB array)
       └──► status: DRAFT → SUBMITTED

Reminder engine:
  review_cycles.reminder_schedule → notification_log
       ├── SURVEY_REMINDER (for pending reviewers)
       └── SELF_REMINDER (for pending self-feedback)
```

### Phase 8: Cycle Closing (ACTIVE → CLOSING)

```
end_date reached ──► review_cycles.status = 'CLOSING'
                        │
                        ├── grace_period_days extra days for late submissions
                        └── notification_log ◄── CYCLE_CLOSING notifications
```

### Phase 9: Score Calculation (CLOSING → COMPLETED)

```
Grace period expires ──► review_cycles.status = 'COMPLETED'
                            │
                            ▼
Score Engine reads:
  survey_responses ── per question ratings
  questions ── competency mapping
  survey_reviewers ── reviewer types
  self_feedback ── self ratings

Score Engine writes:
  calculated_scores
       ├── self_score (from self_feedback)
       ├── colleague_score (weighted avg from responses)
       ├── competency_scores {"COMM": 3.5, ...}
       ├── reviewer_category_scores {"MANAGER": 3.8, ...}
       ├── reviewer_competency_breakdown {"MANAGER": {"COMM": 3.5}, ...}
       ├── final_label (Outstanding/Significant/Moderate/Not Enough)
       └── total_reviewers
```

### Phase 10: Publication (COMPLETED → PUBLISHED)

```
Admin publishes ──► review_cycles.status = 'PUBLISHED'
                       │
                       ├── calculated_scores now visible to employees
                       ├── notification_log ◄── RESULTS_PUBLISHED notifications
                       └── audit_log ◄── PUBLISH action logged
```

---

## 8. Key Join Paths for Application Code

### Show My Pending Surveys

```sql
employees
  → survey_reviewers        (via reviewer_employee_id)
  → survey_assignments      (via assignment_id)
  → review_cycles           (via cycle_id)
WHERE survey_reviewers.status = 'PENDING'
  AND review_cycles.status IN ('ACTIVE','CLOSING')
```

### Show Survey Form (Questions for a Reviewer)

```sql
survey_reviewers.question_set
  → questions               (WHERE set_type = question_set)
  → template_questions      (WHERE template_id = cycle.template_id AND is_active = TRUE)
  → review_cycles.template_id
```

### Submit Survey

```sql
INSERT INTO survey_responses  (one row per question)
INSERT INTO survey_comments   (optional qualitative text)
UPDATE survey_reviewers       SET status = 'COMPLETED', completed_at = NOW()
UPDATE survey_assignments     SET status = derived_status
```

### My Scorecard

```sql
calculated_scores
  WHERE employee_id = :me AND cycle_id = :cycle
  → Read JSONB blobs for:
      competency_scores (radar chart)
      reviewer_category_scores (bar chart)
      reviewer_competency_breakdown (detailed table)
```

### Team Results (Manager View)

```sql
employees
  WHERE reporting_manager_id = :manager_id
  JOIN calculated_scores ON employee_id + cycle_id
```

### Department Results

```sql
employees
  WHERE department = :dept
  JOIN calculated_scores ON employee_id + cycle_id
```

### Organisation Results

```sql
calculated_scores
  JOIN employees ON employee_id
  WHERE cycle_id = :cycle
  GROUP BY department / leadership_level
```

### Self vs. Peer Gap Analysis

```sql
calculated_scores
  → self_score vs. colleague_score
  → competency_scores (per-competency gap)
```

### Completion Dashboard

```sql
survey_assignments.status    -- per-employee completion
survey_reviewers.status      -- per-reviewer completion
  WHERE cycle_id = :cycle
  GROUP BY status
```

---

## 9. Constraints & Business Rules

### Database-Level Constraints

| Rule | Table | Mechanism |
|---|---|---|
| One assignment per employee per cycle | `survey_assignments` | `UNIQUE(employee_id, cycle_id)` |
| One self-review per person per cycle | `self_feedback` | `UNIQUE(employee_id, cycle_id)` |
| One answer per reviewer per question | `survey_responses` | `UNIQUE(reviewer_id, question_id)` |
| One scorecard per employee per cycle | `calculated_scores` | `UNIQUE(employee_id, cycle_id)` |
| One role config per role per cycle | `reviewer_role_config` | `UNIQUE(cycle_id, role)` |
| One question per position per set | `questions` | `UNIQUE(set_type, order_number)` |
| No duplicate questions in a template | `template_questions` | `UNIQUE(template_id, question_id)` |
| Rating range 1–4 | `survey_responses` | `CHECK (rating BETWEEN 1 AND 4)` |
| Cycle end after start | `review_cycles` | `CHECK (end_date > start_date)` |
| Grace period 0–7 days | `review_cycles` | `CHECK (grace_period_days BETWEEN 0 AND 7)` |
| Duration restricted | `review_cycles` | `CHECK (duration_months IN (3,4,6,12))` |
| Selected count within range | `reviewer_role_config` | `CHECK (selected_count >= min AND <= max)` |
| Role config min ≤ max | `reviewer_role_config` | `CHECK (min_reviewers <= max_reviewers)` |
| Valid group names | `employees` | `CHECK (group_name IN ('IC','TM','HOD','CXO'))` |
| Valid cycle statuses | `review_cycles` | `CHECK (status IN ('DRAFT','ACTIVE','CLOSING','COMPLETED','PUBLISHED'))` |
| Valid reviewer types | `survey_reviewers` | `CHECK (reviewer_type IN ('MANAGER','PEER','DIRECT_REPORT','INDIRECT_REPORT','CROSS_FUNCTIONAL','CXO'))` |

### Application-Level Business Rules

| Rule | Enforcement Point |
|---|---|
| Surveys can only be submitted while cycle is `ACTIVE` or `CLOSING` | Application middleware |
| Total reviewers per employee must equal `reviewer_role_config.selected_count` | Assignment creation logic |
| Per-role bounds must fall within `reviewer_config` global bounds | Admin configuration UI |
| `CLOSING` phase lasts exactly `grace_period_days` after `end_date` | Background job / CRON |
| Reminders fire at intervals defined by `reminder_schedule` | `reminderScheduler` job |
| `self_feedback` status transitions: `DRAFT` → `SUBMITTED` (one-way) | API validation |
| Cycle status transitions follow prescribed order | Cycle transition job |
| Scores are calculated only after cycle reaches `COMPLETED` | Score calculation engine |

---

## 10. Indexes

### Employees

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_employees_dept` | `department` | Department-level queries and reports |
| `idx_employees_group` | `group_name` | Filter by role (IC/TM/HOD/CXO) |
| `idx_employees_manager` | `reporting_manager_id` | Org hierarchy traversal |
| `idx_employees_active` | `is_active` | Filter active/inactive employees |
| `idx_employees_leadership` | `leadership_level` | Org-level aggregation queries |

### Review Cycles

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_cycles_status` | `status` | Filter cycles by state |
| `idx_cycles_template` | `template_id` | Join to question templates |

### Questions & Templates

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_questions_set` | `set_type` | Filter by IC/TM/HOD |
| `idx_questions_competency` | `competency_id` | Competency-based lookups |
| `idx_templates_active` | `is_active` | Filter active templates |
| `idx_template_questions_tid` | `template_id` | Template → questions join |
| `idx_template_questions_qid` | `question_id` | Question → templates reverse lookup |

### Feedback & Surveys

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_sf_employee_cycle` | `employee_id, cycle_id` | Self-feedback lookup |
| `idx_sf_status` | `status` | Filter by DRAFT/SUBMITTED |
| `idx_sa_employee_cycle` | `employee_id, cycle_id` | Assignment lookup |
| `idx_sa_status` | `status` | Completion dashboard |
| `idx_sr_assignment` | `assignment_id` | Reviewers for an assignment |
| `idx_sr_reviewer_emp` | `reviewer_employee_id` | "My pending surveys" lookup |
| `idx_sr_reviewer_type` | `reviewer_type` | Category breakdown queries |
| `idx_sr_status` | `status` | Completion filtering |
| `idx_sr_completed` | `completed_at` (partial) | Only non-null values; analytics |
| `idx_resp_reviewer` | `reviewer_id` | Responses by reviewer |
| `idx_resp_question` | `question_id` | Responses by question |

### Scores & Notifications

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_scores_employee_cycle` | `employee_id, cycle_id` | Scorecard lookup |
| `idx_notif_log_recipient` | `recipient_id` | Notification history per person |
| `idx_notif_log_status` | `status` | Pending notifications for retry |
| `idx_rrc_cycle` | `cycle_id` | Role configs for a cycle |
| `idx_rrc_role` | `role` | Role-based lookups |
| `idx_emu_cycle` | `cycle_id` | Uploads for a cycle |
| `idx_emu_status` | `status` | Upload processing status |
| `idx_audit_user` | `user_id` | Audit trail by admin |
| `idx_audit_entity` | `entity_type, entity_id` | Audit trail for a specific record |

---

## 11. Triggers

### Auto-Update Timestamps

A single trigger function `fn_set_updated_at()` is applied to all tables that have an `updated_at` column. It automatically sets `updated_at = NOW()` on every `UPDATE`.

**Applied to:**

| Table | Trigger Name |
|---|---|
| `employees` | `trg_employees_updated_at` |
| `review_cycles` | `trg_review_cycles_updated_at` |
| `competencies` | `trg_competencies_updated_at` |
| `questions` | `trg_questions_updated_at` |
| `question_templates` | `trg_question_templates_updated_at` |
| `self_feedback` | `trg_self_feedback_updated_at` |
| `survey_assignments` | `trg_survey_assignments_updated_at` |
| `calculated_scores` | `trg_calculated_scores_updated_at` |
| `notification_templates` | `trg_notification_templates_updated_at` |
| `reviewer_role_config` | `trg_reviewer_role_config_updated_at` |

```sql
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
```

---

## Quick Reference: Mock Data Summary

The seed script populates the database with realistic data for testing:

| Table | Row Count | Notes |
|---|---|---|
| `employees` | 400 | 4 CXOs, 16 HODs, 80 TMs, 300 ICs across 20 departments |
| `competencies` | 25 | Full catalogue |
| `questions` | 46 | 15 IC + 15 TM + 16 HOD |
| `question_templates` | 3 | Standard (46), Simplified (30), Leadership (31) |
| `reviewer_config` | 1 | Global min=2, max=8 |
| `review_cycles` | 3 | H1 2025 (PUBLISHED), H2 2025 (PUBLISHED), H1 2026 (ACTIVE) |
| `reviewer_role_config` | 12 | 4 roles × 3 cycles |
| `survey_assignments` | 1200 | 400 employees × 3 cycles |
| `survey_reviewers` | ~7200 | ~6 reviewers per employee × 1200 assignments |
| `survey_responses` | ~100,000+ | One per question per completed reviewer |
| `survey_comments` | ~4800+ | One per completed reviewer |
| `self_feedback` | 1200 | 400 employees × 3 cycles |
| `calculated_scores` | 1200+ | All published + completed assignments |
| `notification_templates` | 6 | One per event type |
| `notification_log` | ~5000+ | Across all 3 cycles |
| `audit_log` | 20+ | Key admin actions |
| `ad_sync_log` | 8 | Mix of SCHEDULED/MANUAL, SUCCESS/PARTIAL/FAILED |
