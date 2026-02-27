# 360 Feedback Platform — Complete Database Schema

> **Target:** Supabase / PostgreSQL 15+ &nbsp;|&nbsp; **Version:** 1.0 &nbsp;|&nbsp; **Tables:** 29

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [The Five Logical Layers](#2-the-five-logical-layers)
3. [Entity-Relationship Diagram](#3-entity-relationship-diagram)
4. [Table-by-Table Reference](#4-table-by-table-reference)
   - 4.1 [employees](#41-employees)
   - 4.2 [rating_scales](#42-rating_scales)
   - 4.3 [rating_scale_options](#43-rating_scale_options)
   - 4.4 [review_cycles](#44-review_cycles)
   - 4.5 [competencies](#45-competencies)
   - 4.6 [competency_default_questions](#46-competency_default_questions)
   - 4.7 [questions](#47-questions)
   - 4.8 [reviewer_types](#48-reviewer_types)
   - 4.9 [cycle_reviewer_type_config](#49-cycle_reviewer_type_config)
   - 4.10 [reviewer_config (DEPRECATED)](#410-reviewer_config-deprecated)
   - 4.11 [reviewer_role_config (DEPRECATED)](#411-reviewer_role_config-deprecated)
   - 4.12 [question_templates](#412-question_templates)
   - 4.13 [template_questions](#413-template_questions)
   - 4.14 [reviewer_mapping_templates](#414-reviewer_mapping_templates)
   - 4.15 [reviewer_mapping_template_entries](#415-reviewer_mapping_template_entries)
   - 4.16 [cycle_groups](#416-cycle_groups)
   - 4.17 [cycle_group_owners](#417-cycle_group_owners)
   - 4.18 [cycle_template_questions](#418-cycle_template_questions)
   - 4.19 [self_feedback](#419-self_feedback)
   - 4.20 [survey_assignments](#420-survey_assignments)
   - 4.21 [employee_mapping_uploads](#421-employee_mapping_uploads)
   - 4.22 [survey_reviewers](#422-survey_reviewers)
   - 4.23 [survey_responses](#423-survey_responses)
   - 4.24 [survey_comments](#424-survey_comments)
   - 4.25 [calculated_scores](#425-calculated_scores)
   - 4.26 [notification_templates](#426-notification_templates)
   - 4.27 [notification_log](#427-notification_log)
   - 4.28 [audit_log](#428-audit_log)
   - 4.29 [ad_sync_log](#429-ad_sync_log)
5. [Relationships Summary](#5-relationships-summary)
6. [Status Lifecycles](#6-status-lifecycles)
7. [End-to-End Data Flow](#7-end-to-end-data-flow)
8. [Key Join Paths for Application Code](#8-key-join-paths-for-application-code)
9. [Constraints & Business Rules](#9-constraints--business-rules)
10. [Indexes](#10-indexes)
11. [Triggers](#11-triggers)
12. [Seed Data](#12-seed-data)

---

## 1. Schema Overview

This database powers a **360-degree feedback platform** where employees are evaluated by their managers, peers, direct reports, and cross-functional colleagues across behavioural competencies. The schema supports:

- **Multi-cycle reviews** — run independent feedback campaigns (quarterly, half-yearly, annual).
- **Role-based question sets** — IC (15), TM (15), HOD (16) questions, each mapped to competencies.
- **Configurable rating scales** — default 4-point impact scale plus admin-created custom scales (2–10 options).
- **Flexible reviewer types** — built-in types (Self, Reporting Manager, Peer, Subordinate, etc.) plus admin-created custom reviewer types.
- **Per-cycle reviewer type configuration** — min/max reviewer counts per type, per role group (IC/TM/HOD).
- **Template-based question management** — reusable, versionable question bundles with per-role-group scoping.
- **Cycle groups** — employees organised into groups (IC/TM/HOD/custom), each with its own question template.
- **Reviewer mapping templates** — reusable snapshots of employee-to-reviewer assignments importable into cycles.
- **Self-assessment** — employees rate themselves for gap analysis against peer feedback.
- **Pre-computed scorecards** — aggregated scores by competency and reviewer category.
- **Admin overrides** — fill-on-behalf and form reopen capabilities for survey reviewers.
- **Wizard-driven cycle setup** — multi-step wizard with persisted progress tracking.
- **Full audit trail** — every admin action is logged with before/after snapshots.
- **Multi-channel notifications** — email + Teams with Mustache-templated messages.

---

## 2. The Five Logical Layers

| Layer | Tables | Purpose |
|---|---|---|
| **People & Org** | `employees`, `ad_sync_log` | Who exists in the org, hierarchy, AD sync history |
| **Setup & Config** | `rating_scales`, `rating_scale_options`, `competencies`, `competency_default_questions`, `questions`, `reviewer_types`, `question_templates`, `template_questions`, `reviewer_config` *(deprecated)*, `reviewer_role_config` *(deprecated)* | Rating scales, competencies, questions, reviewer types, and templates |
| **Cycle & Assignments** | `review_cycles`, `cycle_reviewer_type_config`, `cycle_groups`, `cycle_group_owners`, `cycle_template_questions`, `reviewer_mapping_templates`, `reviewer_mapping_template_entries`, `survey_assignments`, `survey_reviewers`, `employee_mapping_uploads` | Time-boxed campaigns, groups, who reviews whom |
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
│  │ rating_scales     │     │ competencies      │     │ reviewer_types   │                 │
│  │──────────────────│     │──────────────────│     │──────────────────│                 │
│  │ PK scale_id       │◄─┐  │ PK competency_id  │◄─┐  │ PK reviewer_     │                 │
│  │    scale_name     │  │  │    competency_name│  │  │    type_id       │                 │
│  │    is_default     │  │  │    applicable_to  │  │  │    type_key      │                 │
│  └────────┬─────────┘  │  └────────┬─────────┘  │  │    category      │                 │
│           │            │           │            │  └────────┬─────────┘                 │
│           ▼            │           ▼            │           │                            │
│  ┌──────────────────┐  │  ┌──────────────────┐  │           ▼                            │
│  │ rating_scale_    │  │  │ questions         │  │  ┌──────────────────┐                 │
│  │   options         │  │  │──────────────────│  │  │ cycle_reviewer_  │                 │
│  │──────────────────│  │  │ PK question_id    │  │  │  type_config     │                 │
│  │ PK option_id      │  │  │    set_type       │  │  │──────────────────│                 │
│  │ FK scale_id       │  │  │    order_number   │  │  │ FK cycle_id      │                 │
│  │    value, label   │  │  │ FK competency_id ─│──┘  │ FK reviewer_     │                 │
│  └──────────────────┘  │  └──────────────────┘      │    type_id       │                 │
│                        │                             │    role_group    │                 │
│  ┌──────────────────┐  │  ┌──────────────────┐      └──────────────────┘                 │
│  │ question_templates│  │  │ competency_      │                                          │
│  │──────────────────│  │  │  default_questions│                                          │
│  │ PK template_id   │◄─┤  │──────────────────│                                          │
│  │    template_name  │  │  │ FK competency_id  │                                          │
│  │ FK rating_scale_id│──┘  │    role_group     │                                          │
│  │ FK cloned_from    │──┐  │    question_text  │                                          │
│  │ FK created_by ────│──►employees             │                                          │
│  └────────┬─────────┘  │  └──────────────────┘                                          │
│           │            │                                                                 │
│           ▼            │                                                                 │
│  ┌──────────────────┐  │                                                                 │
│  │template_questions │  │                                                                 │
│  │──────────────────│  │                                                                 │
│  │ FK template_id    │  │                                                                 │
│  │ FK question_id    │  │                                                                 │
│  │    role_group     │  │                                                                 │
│  │    display_order  │  │                                                                 │
│  │    comment_enabled│  │                                                                 │
│  └──────────────────┘  │                                                                 │
│                        │                                                                 │
│  ┌──────────────────┐  │  ┌──────────────────┐                                          │
│  │ reviewer_config   │  │  │reviewer_role_    │                                          │
│  │  (DEPRECATED)     │  │  │  config           │                                          │
│  │──────────────────│  │  │  (DEPRECATED)     │                                          │
│  │ PK config_id      │  │  │──────────────────│                                          │
│  │    min_reviewers  │  │  │ FK cycle_id       │                                          │
│  │    max_reviewers  │  │  │    role           │                                          │
│  └──────────────────┘  │  └──────────────────┘                                          │
└────────────────────────┴────────────────────────────────────────────────────────────────┘
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
│  │    launch_date        │     │   uploads             │          │                      │
│  │    status             │     │──────────────────────│          │                      │
│  │ FK rating_scale_id ──│──►  │ PK upload_id          │          │                      │
│  │ FK created_by ───────│──►  │ FK cycle_id ──────────│──────────┘                      │
│  └──────────┬───────────┘     │ FK uploaded_by ───────│──► employees                    │
│             │                  └──────────────────────┘                                  │
│             │                                                                            │
│  ┌──────────┴───────────┐     ┌──────────────────────┐                                  │
│  │ cycle_groups          │     │ reviewer_mapping_     │                                  │
│  │──────────────────────│     │   templates            │                                  │
│  │ PK group_id           │     │──────────────────────│                                  │
│  │ FK cycle_id           │     │ PK template_id        │                                  │
│  │    group_name         │     │    template_name       │                                  │
│  │ FK question_template_ │     └──────────┬───────────┘                                  │
│  │    id                 │                │                                               │
│  └──────────┬───────────┘     ┌──────────┴───────────┐                                  │
│             │                  │ reviewer_mapping_     │                                  │
│  ┌──────────┴──────────┐      │   template_entries    │                                  │
│  │ cycle_group_owners   │      │──────────────────────│                                  │
│  │─────────────────────│      │ FK template_id        │                                  │
│  │ FK group_id          │      │ FK employee_id        │                                  │
│  │ FK employee_id       │      │ FK reviewer_id        │                                  │
│  └─────────────────────┘      │ FK reviewer_type_id   │                                  │
│                                └──────────────────────┘                                  │
│  ┌──────────────────────┐                                                               │
│  │ cycle_template_       │                                                               │
│  │   questions           │                                                               │
│  │──────────────────────│                                                               │
│  │ FK group_id           │                                                               │
│  │ FK question_id        │                                                               │
│  │    display_order      │                                                               │
│  │    comment_enabled    │                                                               │
│  └──────────────────────┘                                                               │
│                                                                                         │
│  ┌──────────────────────┐                                                               │
│  │ survey_assignments    │                                                               │
│  │──────────────────────│                                                               │
│  │ PK assignment_id      │                                                               │
│  │ FK employee_id ──────│──► employees  (the ratee)                                     │
│  │ FK cycle_id ─────────│──► review_cycles                                              │
│  │ FK group_id ─────────│──► cycle_groups                                               │
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
│  │    reviewer_type      │   (key from reviewer_types)                                   │
│  │    question_set       │                                                               │
│  │    access_token       │                                                               │
│  │    reopen_count       │                                                               │
│  │ FK filled_on_behalf_  │                                                               │
│  │    by ───────────────│──► employees  (admin override)                                │
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
│  │ FK question_id ──│   │ FK question_id ──│   │ FK employee_id    │                    │
│  │    rating (1–10)  │   │    comment_text   │   │ FK cycle_id       │                    │
│  └──────────────────┘   └──────────────────┘   │    competency_    │                    │
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
| `survey_reviewers` | `filled_on_behalf_by` | Admin who filled survey on behalf |
| `self_feedback` | `employee_id` | The person rating themselves |
| `calculated_scores` | `employee_id` | The person whose scores are computed |
| `notification_log` | `recipient_id` | Person who received the notification |
| `audit_log` | `user_id` | Admin who performed the action |
| `reviewer_config` | `updated_by` | Admin who last updated global config (deprecated) |
| `reviewer_role_config` | `updated_by` | Admin who last updated role config (deprecated) |
| `question_templates` | `created_by` | Admin who created the template |
| `employee_mapping_uploads` | `uploaded_by` | Admin who uploaded the CSV |
| `reviewer_mapping_templates` | `created_by` | Admin who created the mapping template |
| `reviewer_mapping_template_entries` | `employee_id` | Employee in the mapping |
| `reviewer_mapping_template_entries` | `reviewer_id` | Reviewer in the mapping |
| `cycle_group_owners` | `employee_id` | Admin owner of a cycle group |

---

### 4.2 `rating_scales`

> Master catalogue of rating scales that can be applied to question templates and review cycles. The default is a 4-point impact scale, but admins can create custom scales (2–10 options).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `scale_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique scale identifier |
| `scale_name` | `TEXT` | NOT NULL, UNIQUE | — | Human-friendly name (e.g., `Standard 4-Point Impact Scale`) |
| `is_default` | `BOOLEAN` | NOT NULL | `FALSE` | Exactly one row should be `TRUE` (system default) |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete; inactive scales can't be assigned to new cycles but existing cycles are unaffected |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Referenced by:** `rating_scale_options.scale_id`, `review_cycles.rating_scale_id`, `question_templates.rating_scale_id`

---

### 4.3 `rating_scale_options`

> The individual options within a rating scale. Each option has a numeric value, label, optional description, colour, and display order.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `option_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique option identifier |
| `scale_id` | `UUID` | NOT NULL | — | **FK → `rating_scales(scale_id)`** `ON DELETE CASCADE` |
| `value` | `INTEGER` | NOT NULL | — | Numeric score (e.g., 1, 2, 3, 4) |
| `label` | `TEXT` | NOT NULL | — | Display text (e.g., `Outstanding Impact`) |
| `description` | `TEXT` | NULL | — | Longer explanation of the rating level |
| `color` | `TEXT` | NULL | — | Hex colour for badge rendering (e.g., `#22C55E`) |
| `display_order` | `INTEGER` | NOT NULL | — | Controls sequence on the form |

**Constraints:**
- `UNIQUE (scale_id, value)` — no duplicate values within a scale
- `UNIQUE (scale_id, display_order)` — no duplicate positions within a scale

**Default 4-point scale options:**

| Value | Label | Description | Color | Display Order |
|---|---|---|---|---|
| 4 | Outstanding Impact | Consistently exceeds expectations | `#22C55E` | 1 |
| 3 | Significant Impact | Frequently exceeds expectations | `#3B82F6` | 2 |
| 2 | Moderate Impact | Meets expectations | `#F59E0B` | 3 |
| 1 | Not Enough Impact | Below expectations | `#EF4444` | 4 |

---

### 4.4 `review_cycles`

> **The central campaign object.** Everything survey-related is scoped to a cycle. One row = one time-boxed 360-feedback campaign that progresses through a wizard-based setup and then through a defined state machine.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `cycle_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique cycle identifier |
| `cycle_name` | `TEXT` | NOT NULL | — | Display name (e.g., `H1 2026 Review`) |
| `description` | `TEXT` | NULL | — | Optional description (max 2000 chars, app-enforced) |
| `review_type` | `TEXT` | NOT NULL | `SAME_TIME_FOR_ALL` | Review scheduling type |
| `frequency` | `TEXT` | NOT NULL | `ONE_TIME` | Recurrence frequency |
| `status` | `TEXT` | NOT NULL | `DRAFT` | Lifecycle state (see [Status Lifecycles](#6-status-lifecycles)) |
| `launch_date` | `DATE` | NULL | — | Tentative date when the cycle begins |
| `exclude_weekly_offs` | `BOOLEAN` | NOT NULL | `FALSE` | Whether to exclude weekends from deadline calculations |
| `weekly_off_days` | `JSONB` | NULL | `["Saturday","Sunday"]` | Days to exclude when calculating deadlines |
| `form_submission_days` | `INTEGER` | NULL | `5` | Stage 1 duration: number of days for form submission |
| `publish_review_days` | `INTEGER` | NULL | `2` | Stage 2 duration: number of days for result publishing |
| `auto_advance_form_submission` | `BOOLEAN` | NOT NULL | `FALSE` | Auto-close forms on deadline |
| `form_start_date` | `DATE` | NULL | — | Computed: when the survey form opens |
| `form_end_date` | `DATE` | NULL | — | Computed: when the survey form closes |
| `publish_start_date` | `DATE` | NULL | — | Computed: when the review publication phase starts |
| `publish_end_date` | `DATE` | NULL | — | Computed: when the review publication phase ends |
| `enable_self_feedback` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: allow self-assessment in this cycle |
| `enable_colleague_feedback` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: allow peer/colleague reviews |
| `enable_reminders` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: enable automated reminders |
| `reminder_days_before_deadline` | `JSONB` | NULL | `[7,3,1]` | Array of days-before-deadline when automated reminders fire |
| `visibility_config` | `JSONB` | NULL | `{}` | Structured 3-phase visibility rules (while_filling, after_filling, after_publishing) |
| `rating_scale_id` | `UUID` | NULL | — | **FK → `rating_scales(scale_id)`**. One rating scale applies to all questions across all groups in this cycle |
| `enable_comments` | `BOOLEAN` | NOT NULL | `TRUE` | Feature toggle: allow qualitative comments |
| `wizard_progress` | `JSONB` | NULL | `{}` | Tracks which wizard steps are done (e.g., `{"step1":true,"step2":false,...}`) |
| `created_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`** |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `CHECK (review_type IN ('SAME_TIME_FOR_ALL'))`
- `CHECK (frequency IN ('ONE_TIME'))`
- `CHECK (status IN ('DRAFT','LAUNCHED','FORM_ACTIVE','FORM_CLOSED','PUBLISHED'))`

**Child tables:** `cycle_groups`, `cycle_reviewer_type_config`, `survey_assignments`, `self_feedback`, `calculated_scores`, `reviewer_role_config` *(deprecated)*, `employee_mapping_uploads`

---

### 4.5 `competencies`

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

**Referenced by:** `questions.competency_id`, `competency_default_questions.competency_id`

**Example competencies:**

| Code | Name | Applicable To |
|---|---|---|
| `COMM` | Communication | IC, TM, HOD |
| `TEAM` | Teamwork | IC, TM |
| `LEAD` | Leadership | TM, HOD |
| `STRT` | Strategy | HOD |
| `EXPR` | Executive Presence | HOD, CXO |

---

### 4.6 `competency_default_questions`

> Default questions for each competency per role group. When an admin adds a competency to a question template, these defaults auto-populate.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `competency_id` | `TEXT` | NOT NULL | — | **FK → `competencies(competency_id)`** `ON DELETE CASCADE` |
| `role_group` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — which set this default is for |
| `question_text` | `TEXT` | NOT NULL | — | The default question text |
| `display_order` | `INTEGER` | NOT NULL | `1` | Order within this competency / role |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `CHECK (role_group IN ('IC','TM','HOD'))`

**Notes:** Changes here do NOT cascade into existing templates; only new additions use the defaults.

---

### 4.7 `questions`

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
1. Employee's `group_name` (e.g., `TM`) → determines which `cycle_group` they belong to
2. Cycle group's `question_template_id` → points to the template
3. `cycle_template_questions` → per-cycle-group snapshot of questions (customizable without affecting master template)
4. Result: the specific subset of questions the reviewer sees

---

### 4.8 `reviewer_types`

> Master catalogue of all reviewer types available in the platform. Includes built-in types (Self, Reporting Manager, Peer, Subordinate, etc.) and supports admin-created custom reviewer types.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `reviewer_type_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique reviewer type identifier |
| `type_key` | `TEXT` | NOT NULL, UNIQUE | — | Short identifier key (e.g., `SELF`, `REPORTING_MANAGER`, `PEER`) |
| `type_name` | `TEXT` | NOT NULL | — | Display name shown in the UI (e.g., `Reporting Manager`) |
| `description` | `TEXT` | NULL | — | Explanation of this reviewer type |
| `category` | `TEXT` | NOT NULL | `CUSTOM` | Grouping category for the UI |
| `is_system` | `BOOLEAN` | NOT NULL | `FALSE` | `TRUE` for built-in types, `FALSE` for admin-created |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `CHECK (category IN ('ALWAYS_INCLUDED','MANAGERS','NOMINATED','CUSTOM'))`

**Referenced by:** `cycle_reviewer_type_config.reviewer_type_id`, `reviewer_mapping_template_entries.reviewer_type_id`

**Built-in reviewer types:**

| Type Key | Type Name | Category |
|---|---|---|
| `SELF` | Self | ALWAYS_INCLUDED |
| `REPORTING_MANAGER` | Reporting Manager | ALWAYS_INCLUDED |
| `MANAGER_OF_MANAGER` | Manager of Manager | MANAGERS |
| `DEPARTMENT_HEAD` | Department Head | MANAGERS |
| `BUSINESS_UNIT_HEAD` | Business Unit Head | MANAGERS |
| `DOTTED_LINE_MANAGER` | Dotted Line Manager | MANAGERS |
| `PEER` | Peers | NOMINATED |
| `EXTERNAL` | External | NOMINATED |
| `SUBORDINATE` | Subordinates | NOMINATED |
| `PROJECT_MANAGER` | Project Manager | NOMINATED |
| `CROSS_FUNCTIONAL` | Cross-Functional Peer | CUSTOM |
| `INDIRECT_REPORT` | Indirect Reportees | CUSTOM |

---

### 4.9 `cycle_reviewer_type_config`

> Per-cycle configuration of which reviewer types are enabled and the min/max reviewer count limits per reviewer type per role group (IC/TM/HOD). Replaces the old global `reviewer_config` and per-role `reviewer_role_config` tables.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `config_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** `ON DELETE CASCADE` |
| `reviewer_type_id` | `UUID` | NOT NULL | — | **FK → `reviewer_types(reviewer_type_id)`** |
| `role_group` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — the employee's role group |
| `min_reviewers` | `INTEGER` | NOT NULL | `0` | Minimum number of this type per employee |
| `max_reviewers` | `INTEGER` | NOT NULL | `1` | Maximum number of this type per employee |

**Constraints:**
- `UNIQUE (cycle_id, reviewer_type_id, role_group)` — one config per reviewer type per role per cycle
- `CHECK (min_reviewers <= max_reviewers AND min_reviewers >= 0)`
- `CHECK (role_group IN ('IC','TM','HOD'))`

**Example:** Cycle X may require 2–4 Peers for IC employees but only 1–3 Peers for TM employees.

---

### 4.10 `reviewer_config` (DEPRECATED)

> **DEPRECATED.** Legacy single-row global min/max reviewer config. Replaced by `cycle_reviewer_type_config` for new cycles. Kept for backward compatibility.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `config_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `min_reviewers` | `INTEGER` | NOT NULL | `2` | Global lower bound for reviewer count |
| `max_reviewers` | `INTEGER` | NOT NULL | `8` | Global upper bound for reviewer count |
| `updated_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who last changed the config |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

---

### 4.11 `reviewer_role_config` (DEPRECATED)

> **DEPRECATED.** Legacy per-cycle, per-role reviewer count config. Replaced by `cycle_reviewer_type_config` for new cycles. Kept for backward compatibility.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `config_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** `ON DELETE CASCADE` |
| `role` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` / `CXO` — the employee role this config applies to |
| `min_reviewers` | `INTEGER` | NOT NULL | `2` | Lower bound for this role |
| `max_reviewers` | `INTEGER` | NOT NULL | `8` | Upper bound for this role |
| `selected_count` | `INTEGER` | NULL | — | The **exact** number of reviewers each employee of this role must have. Chosen by admin from the min–max range |
| `updated_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`** |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (cycle_id, role)` — one config per role per cycle
- `CHECK (min_reviewers <= max_reviewers)`
- `CHECK (selected_count IS NULL OR (selected_count >= min_reviewers AND selected_count <= max_reviewers))`
- `CHECK (role IN ('IC','TM','HOD','CXO'))`

---

### 4.12 `question_templates`

> Reusable question set bundles that are assigned to cycle groups. Supports versioning via `cloned_from` and can have a rating scale per template.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique template identifier |
| `template_name` | `TEXT` | NOT NULL, UNIQUE | — | Human-friendly name (e.g., `Standard Full Set (46 Questions)`) |
| `description` | `TEXT` | NULL | — | Notes on when/why to use this template |
| `rating_scale_id` | `UUID` | NULL | — | **FK → `rating_scales(scale_id)`**. One scale per template |
| `cloned_from` | `UUID` | NULL | — | **Self-referencing FK → `question_templates(template_id)`**. Source template if this was cloned |
| `source_file_url` | `TEXT` | NULL | — | URL/path of an uploaded file used to create this template |
| `created_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who created it |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Inactive templates can't be assigned to new cycles |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Referenced by:** `template_questions.template_id`, `cycle_groups.question_template_id`

---

### 4.13 `template_questions`

> Junction table implementing the **many-to-many** relationship between `question_templates` and `questions`, scoped by role group with display order and comment toggle.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_question_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `template_id` | `UUID` | NOT NULL | — | **FK → `question_templates(template_id)`** `ON DELETE CASCADE` |
| `question_id` | `TEXT` | NOT NULL | — | **FK → `questions(question_id)`** |
| `role_group` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — which set within the template |
| `display_order` | `INTEGER` | NOT NULL | `1` | Order within role_group in the template |
| `comment_enabled` | `BOOLEAN` | NOT NULL | `TRUE` | Per-question comment toggle |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete for temporarily excluding a question from a template |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (template_id, question_id, role_group)` — prevents duplicate inclusion per role group
- `CHECK (role_group IN ('IC','TM','HOD'))`

---

### 4.14 `reviewer_mapping_templates`

> Reusable snapshots of employee-to-reviewer assignments that can be imported into cycles. Saves admin time when the same reviewer structure repeats across cycles.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `template_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique template identifier |
| `template_name` | `TEXT` | NOT NULL, UNIQUE | — | Human-friendly name |
| `description` | `TEXT` | NULL | — | Optional notes |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Soft-delete flag |
| `created_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who created it |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Referenced by:** `reviewer_mapping_template_entries.template_id`

---

### 4.15 `reviewer_mapping_template_entries`

> Individual employee-to-reviewer assignments stored inside a reviewer mapping template.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `entry_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `template_id` | `UUID` | NOT NULL | — | **FK → `reviewer_mapping_templates(template_id)`** `ON DELETE CASCADE` |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The employee being reviewed |
| `reviewer_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The reviewer |
| `reviewer_type_id` | `UUID` | NOT NULL | — | **FK → `reviewer_types(reviewer_type_id)`**. Type of review relationship |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (template_id, employee_id, reviewer_id, reviewer_type_id)` — prevents duplicate entries

---

### 4.16 `cycle_groups`

> Groups within a review cycle. Employees are organised into groups (IC, TM, HOD, or custom) and each group is assigned its own question template. Configured in wizard Step 6.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `group_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique group identifier |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** `ON DELETE CASCADE` |
| `group_name` | `TEXT` | NOT NULL | — | Display name (e.g., `IC`, `TM`, `HOD`) |
| `question_template_id` | `UUID` | NULL | — | **FK → `question_templates(template_id)`**. Each group gets its own template |
| `display_order` | `INTEGER` | NULL | `1` | Controls display sequence of groups |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (cycle_id, group_name)` — no duplicate group names within a cycle

**Notes:** Default groups (IC/TM/HOD) are auto-created on cycle setup; admin can add custom groups or rename.

**Referenced by:** `cycle_group_owners.group_id`, `cycle_template_questions.group_id`, `survey_assignments.group_id`

---

### 4.17 `cycle_group_owners`

> Admin(s) responsible for managing a cycle group.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `group_id` | `UUID` | NOT NULL | — | **FK → `cycle_groups(group_id)`** `ON DELETE CASCADE` |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The admin owner |

**Constraints:**
- `UNIQUE (group_id, employee_id)` — one owner row per person per group

---

### 4.18 `cycle_template_questions`

> Per-cycle-group snapshot of questions copied from the selected question template. Admin can enable/disable or reorder questions here without affecting the master template.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `group_id` | `UUID` | NOT NULL | — | **FK → `cycle_groups(group_id)`** `ON DELETE CASCADE` |
| `question_id` | `TEXT` | NOT NULL | — | **FK → `questions(question_id)`** |
| `display_order` | `INTEGER` | NOT NULL | `1` | Order within this group's question set |
| `is_active` | `BOOLEAN` | NOT NULL | `TRUE` | Can disable without deleting |
| `comment_enabled` | `BOOLEAN` | NOT NULL | `TRUE` | Per-question comment toggle for this cycle |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (group_id, question_id)` — no duplicate questions within a group

**Notes:** When a template is selected for a group, its questions are copied here; all subsequent edits happen on this copy.

---

### 4.19 `self_feedback`

> Employee self-assessment, stored separately from peer feedback. Enables "self vs. peer" gap analysis in the final report.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `self_feedback_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person rating themselves |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `competency_ratings` | `JSONB` | NOT NULL | `[]` | Array of `{competency_id, rating}` objects. E.g., `[{"competency_id": "COMM", "rating": 3}, ...]` |
| `status` | `TEXT` | NOT NULL | `DRAFT` | Submission state |
| `submitted_at` | `TIMESTAMPTZ` | NULL | — | When the employee formally submitted |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | Auto-updated by trigger |

**Constraints:**
- `UNIQUE (employee_id, cycle_id)` — one self-review per person per cycle
- `CHECK (status IN ('DRAFT','SUBMITTED','NOT_SUBMITTED','MISSED'))`

**Status meanings:**

| Status | Meaning |
|---|---|
| `DRAFT` | Saved but not formally submitted; can still edit |
| `SUBMITTED` | Locked; cannot be modified |
| `NOT_SUBMITTED` | Explicitly not submitted by the employee |
| `MISSED` | Deadline passed without any submission |

---

### 4.20 `survey_assignments`

> Enrols one employee in one review cycle. Acts as the parent container for all reviewers and responses for that person in that cycle.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `assignment_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique assignment identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person being reviewed (the **ratee**) |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `group_id` | `UUID` | NULL | — | **FK → `cycle_groups(group_id)`**. Which cycle group this employee belongs to (IC/TM/HOD/custom) |
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

### 4.21 `employee_mapping_uploads`

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

### 4.22 `survey_reviewers`

> **The bridge table** between assignments and feedback. Each row = one reviewer assigned to evaluate one employee. This is where reviewer types, access tokens, completion tracking, admin overrides (fill-on-behalf, reopen), and extended status states live.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `reviewer_id` | `UUID` | **PK** | `gen_random_uuid()` | Unique reviewer-assignment identifier |
| `assignment_id` | `UUID` | NOT NULL | — | **FK → `survey_assignments(assignment_id)`**. Links to the ratee |
| `reviewer_employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`**. The person giving feedback |
| `reviewer_type` | `TEXT` | NOT NULL | — | Key from `reviewer_types` (e.g., `SELF`, `REPORTING_MANAGER`, `PEER`, `SUBORDINATE`, `CROSS_FUNCTIONAL`, or custom) |
| `question_set` | `TEXT` | NOT NULL | — | `IC` / `TM` / `HOD` — snapshot of the ratee's `group_name` at assignment time |
| `status` | `TEXT` | NOT NULL | `PENDING` | Reviewer's completion state |
| `access_token` | `UUID` | UNIQUE | `gen_random_uuid()` | Unique token for password-less survey access via direct link |
| `reminded_at` | `TIMESTAMPTZ` | NULL | — | Timestamp of last reminder sent to this reviewer |
| `completed_at` | `TIMESTAMPTZ` | NULL | — | When the reviewer submitted their feedback |
| `reopen_count` | `INTEGER` | NOT NULL | `0` | Number of times the form has been reopened (max 2 allowed) |
| `reopen_deadline` | `TIMESTAMPTZ` | NULL | — | Deadline for reopened form (max 14 days from reopen) |
| `filled_on_behalf_by` | `TEXT` | NULL | — | **FK → `employees(employee_id)`**. Admin who filled the survey on behalf of this reviewer |
| `filled_on_behalf_reason` | `TEXT` | NULL | — | Dropdown selection reason for fill-on-behalf |
| `filled_on_behalf_notes` | `TEXT` | NULL | — | Additional notes for the fill-on-behalf action |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `CHECK (question_set IN ('IC','TM','HOD'))`
- `CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','NOT_SUBMITTED','MISSED'))`

**Reviewer types:** Driven by `reviewer_types` master table. The `reviewer_type` column stores the `type_key` from that table (e.g., `SELF`, `REPORTING_MANAGER`, `PEER`, `SUBORDINATE`, `CROSS_FUNCTIONAL`, `MANAGER_OF_MANAGER`, `DEPARTMENT_HEAD`, `BUSINESS_UNIT_HEAD`, `DOTTED_LINE_MANAGER`, `EXTERNAL`, `PROJECT_MANAGER`, `INDIRECT_REPORT`, or any admin-created custom key).

**Status meanings:**

| Status | Meaning |
|---|---|
| `PENDING` | Reviewer has not started |
| `IN_PROGRESS` | Reviewer has opened the survey but not submitted |
| `COMPLETED` | Reviewer has submitted all ratings |
| `NOT_SUBMITTED` | Reviewer explicitly chose not to submit |
| `MISSED` | Deadline passed without submission |

**Admin override features:**
- **Form Reopen (Section 6.2):** Admin can reopen a closed form for a reviewer up to 2 times (`reopen_count`), with a maximum 14-day deadline (`reopen_deadline`).
- **Fill on Behalf (Section 6.1):** Admin can fill out the survey on behalf of a reviewer, recording who did it (`filled_on_behalf_by`), why (`filled_on_behalf_reason`), and additional notes (`filled_on_behalf_notes`).

**Why `question_set` is snapshotted:** If a TM is promoted to HOD mid-cycle, existing reviewers should still answer TM questions. The snapshot preserves the question set that was assigned at enrolment time.

---

### 4.23 `survey_responses`

> **The atomic unit of feedback.** One row = one numeric rating given by one reviewer for one question. Supports configurable rating scales (2–10 options).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `response_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `reviewer_id` | `UUID` | NOT NULL | — | **FK → `survey_reviewers(reviewer_id)`**. Links to who gave the rating |
| `question_id` | `TEXT` | NOT NULL | — | **FK → `questions(question_id)`**. Links to the competency for roll-up |
| `rating` | `INTEGER` | NOT NULL | — | Score on the configured scale (1–10 range supported) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Constraints:**
- `UNIQUE (reviewer_id, question_id)` — one answer per reviewer per question (enables safe upserts)
- `CHECK (rating BETWEEN 1 AND 10)` — supports configurable scales from 2 to 10 options

**Default 4-point rating scale:**

| Value | Label | Meaning |
|---|---|---|
| 1 | Not Enough Impact | Below expectations |
| 2 | Moderate Impact | Meets expectations |
| 3 | Significant Impact | Frequently exceeds expectations |
| 4 | Outstanding Impact | Consistently exceeds expectations |

**Note:** The actual scale labels and values are driven by the `rating_scales` and `rating_scale_options` tables. The CHECK constraint uses 1–10 to accommodate all possible custom scale configurations.

---

### 4.24 `survey_comments`

> Open-ended qualitative text submitted alongside numeric ratings. Supports both per-question comments and general comments. Separated into its own table for access control and future NLP/sentiment analysis.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `comment_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `reviewer_id` | `UUID` | NOT NULL | — | **FK → `survey_reviewers(reviewer_id)`**. Ties comment to the reviewer's type and ratee |
| `question_id` | `TEXT` | NULL | — | **FK → `questions(question_id)`**. Per-question comment; `NULL` means a general comment for the entire review |
| `comment_text` | `TEXT` | NOT NULL | — | Free-form text (no length constraint) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | — |

**Notes:** `question_id` being `NULL` indicates a general comment for the entire review rather than a comment tied to a specific question.

---

### 4.25 `calculated_scores`

> **Pre-computed scorecards** read by dashboards and reports. One row per employee per cycle, generated by the score engine after the cycle closes.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `calc_id` | `UUID` | **PK** | `gen_random_uuid()` | Row identifier |
| `employee_id` | `TEXT` | NOT NULL | — | **FK → `employees(employee_id)`** |
| `cycle_id` | `UUID` | NOT NULL | — | **FK → `review_cycles(cycle_id)`** |
| `self_score` | `NUMERIC(4,2)` | NULL | — | Average of weighted self-ratings from `self_feedback.competency_ratings` |
| `colleague_score` | `NUMERIC(4,2)` | NULL | — | Weighted average across all reviewer types from `survey_responses` |
| `final_label` | `TEXT` | NULL | — | Derived performance band (configurable per cycle via rating scale labels) |
| `competency_scores` | `JSONB` | NULL | `{}` | Map of `competency_id → avg_score`. E.g., `{"COMM": 3.5, "TEAM": 4.0}` |
| `reviewer_category_scores` | `JSONB` | NULL | `{}` | Map of `reviewer_type → avg_score`. E.g., `{"MANAGER": 3.8, "PEER": 3.5}` |
| `reviewer_competency_breakdown` | `JSONB` | NULL | `{}` | Nested map: `reviewer_type → competency → avg_score`. E.g., `{"MANAGER": {"COMM": 3.5}, "PEER": {"COMM": 3.2}}` |
| `total_reviewers` | `INTEGER` | NULL | `0` | Count of completed reviewers (for transparency) |
| `calculated_at` | `TIMESTAMPTZ` | NOT NULL | `NOW()` | When the score was computed |

**Constraints:**
- `UNIQUE (employee_id, cycle_id)` — one scorecard per employee per cycle; safe to recalculate via upsert

**Notes:** The `final_label` is derived from rating scale labels configured per cycle (via `rating_scales` + `rating_scale_options`), rather than a fixed set of values.

---

### 4.26 `notification_templates`

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
| `CYCLE_START` | Cycle launched | Cycle status → LAUNCHED |
| `SURVEY_ASSIGNED` | Reviewer assigned | New `survey_reviewers` row created |
| `SURVEY_REMINDER` | Pending survey reminder | `reminder_days_before_deadline` days before deadline |
| `SELF_REMINDER` | Self-feedback reminder | `reminder_days_before_deadline` days before deadline |
| `CYCLE_CLOSING` | Form closing warning | Cycle status → FORM_CLOSED |
| `RESULTS_PUBLISHED` | Results available | Cycle status → PUBLISHED |

---

### 4.27 `notification_log`

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

### 4.28 `audit_log`

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

### 4.29 `ad_sync_log`

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

## 5. Relationships Summary

### All Foreign Key Relationships

```
employees.reporting_manager_id                    ──► employees.employee_id           (self-ref)

rating_scale_options.scale_id                     ──► rating_scales.scale_id          (CASCADE)

review_cycles.rating_scale_id                     ──► rating_scales.scale_id
review_cycles.created_by                          ──► employees.employee_id

competency_default_questions.competency_id        ──► competencies.competency_id      (CASCADE)

questions.competency_id                           ──► competencies.competency_id

reviewer_types                                    ◄── cycle_reviewer_type_config.reviewer_type_id
reviewer_types                                    ◄── reviewer_mapping_template_entries.reviewer_type_id

cycle_reviewer_type_config.cycle_id               ──► review_cycles.cycle_id          (CASCADE)
cycle_reviewer_type_config.reviewer_type_id       ──► reviewer_types.reviewer_type_id

reviewer_config.updated_by                        ──► employees.employee_id           (DEPRECATED)

reviewer_role_config.cycle_id                     ──► review_cycles.cycle_id          (CASCADE, DEPRECATED)
reviewer_role_config.updated_by                   ──► employees.employee_id           (DEPRECATED)

question_templates.rating_scale_id                ──► rating_scales.scale_id
question_templates.cloned_from                    ──► question_templates.template_id  (self-ref)
question_templates.created_by                     ──► employees.employee_id

template_questions.template_id                    ──► question_templates.template_id  (CASCADE)
template_questions.question_id                    ──► questions.question_id

reviewer_mapping_templates.created_by             ──► employees.employee_id

reviewer_mapping_template_entries.template_id     ──► reviewer_mapping_templates.template_id (CASCADE)
reviewer_mapping_template_entries.employee_id     ──► employees.employee_id
reviewer_mapping_template_entries.reviewer_id     ──► employees.employee_id
reviewer_mapping_template_entries.reviewer_type_id──► reviewer_types.reviewer_type_id

cycle_groups.cycle_id                             ──► review_cycles.cycle_id          (CASCADE)
cycle_groups.question_template_id                 ──► question_templates.template_id

cycle_group_owners.group_id                       ──► cycle_groups.group_id           (CASCADE)
cycle_group_owners.employee_id                    ──► employees.employee_id

cycle_template_questions.group_id                 ──► cycle_groups.group_id           (CASCADE)
cycle_template_questions.question_id              ──► questions.question_id

self_feedback.employee_id                         ──► employees.employee_id
self_feedback.cycle_id                            ──► review_cycles.cycle_id

survey_assignments.employee_id                    ──► employees.employee_id
survey_assignments.cycle_id                       ──► review_cycles.cycle_id
survey_assignments.group_id                       ──► cycle_groups.group_id

employee_mapping_uploads.cycle_id                 ──► review_cycles.cycle_id
employee_mapping_uploads.uploaded_by              ──► employees.employee_id

survey_reviewers.assignment_id                    ──► survey_assignments.assignment_id
survey_reviewers.reviewer_employee_id             ──► employees.employee_id
survey_reviewers.filled_on_behalf_by              ──► employees.employee_id

survey_responses.reviewer_id                      ──► survey_reviewers.reviewer_id
survey_responses.question_id                      ──► questions.question_id

survey_comments.reviewer_id                       ──► survey_reviewers.reviewer_id
survey_comments.question_id                       ──► questions.question_id

calculated_scores.employee_id                     ──► employees.employee_id
calculated_scores.cycle_id                        ──► review_cycles.cycle_id

notification_log.template_id                      ──► notification_templates.template_id
notification_log.recipient_id                     ──► employees.employee_id

audit_log.user_id                                 ──► employees.employee_id
```

### Cardinality Summary

| Relationship | Cardinality | Notes |
|---|---|---|
| `employees` ↔ `employees` (manager) | Many-to-One | CXOs have NULL manager |
| `rating_scales` → `rating_scale_options` | One-to-Many | One scale, 2–10 options |
| `review_cycles` → `rating_scales` | Many-to-One | Multiple cycles can share a scale |
| `review_cycles` → `cycle_groups` | One-to-Many | One cycle, multiple groups (IC/TM/HOD/custom) |
| `cycle_groups` → `question_templates` | Many-to-One | Multiple groups can share a template |
| `cycle_groups` → `cycle_group_owners` | One-to-Many | One group, multiple admin owners |
| `cycle_groups` → `cycle_template_questions` | One-to-Many | Per-group question snapshot |
| `review_cycles` → `cycle_reviewer_type_config` | One-to-Many | Per-type, per-role-group config per cycle |
| `reviewer_types` → `cycle_reviewer_type_config` | One-to-Many | One type used across many cycle configs |
| `question_templates` ↔ `questions` (via `template_questions`) | Many-to-Many | Junction table, scoped by role_group |
| `competencies` → `questions` | One-to-Many | One competency, multiple questions |
| `competencies` → `competency_default_questions` | One-to-Many | Default questions per competency |
| `reviewer_mapping_templates` → `reviewer_mapping_template_entries` | One-to-Many | One template, many mapping entries |
| `review_cycles` → `survey_assignments` | One-to-Many | One cycle, many enrolled employees |
| `survey_assignments` → `survey_reviewers` | One-to-Many | One ratee, multiple reviewers |
| `survey_reviewers` → `survey_responses` | One-to-Many | One reviewer, many question ratings |
| `survey_reviewers` → `survey_comments` | One-to-Many | One reviewer, one or more comments |
| `employees` × `review_cycles` → `self_feedback` | One-to-One | UNIQUE(employee_id, cycle_id) |
| `employees` × `review_cycles` → `calculated_scores` | One-to-One | UNIQUE(employee_id, cycle_id) |
| `review_cycles` → `reviewer_role_config` | One-to-Many | Up to 4 (one per role per cycle, DEPRECATED) |

---

## 6. Status Lifecycles

### Review Cycle Status

```
   ┌──────┐     Launch       ┌──────────┐    form opens    ┌─────────────┐   form closes   ┌─────────────┐   publish    ┌───────────┐
   │ DRAFT│ ───────────────► │ LAUNCHED │ ────────────────► │ FORM_ACTIVE │ ──────────────► │ FORM_CLOSED │ ──────────► │ PUBLISHED │
   └──────┘                  └──────────┘                   └─────────────┘                 └─────────────┘             └───────────┘
                              Cycle                          Surveys                        Scores                      Results
                              announced                      can be                         calculated,                 viewable
                                                             submitted                      forms locked                by employees
```

**Rules:**
- Surveys can only be submitted while cycle is in `FORM_ACTIVE` status
- `FORM_ACTIVE` duration = `form_submission_days` (with optional weekly-off exclusion)
- `auto_advance_form_submission` auto-closes forms on deadline
- Score calculation happens during transition to `FORM_CLOSED`
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
   └─────────┘                     └──────┬──────┘    ratings           └───────────┘
                                          │
                                          │ deadline passes
                                          ▼
                                   ┌──────────────┐
                                   │ NOT_SUBMITTED │ ─── or ── MISSED
                                   └──────────────┘
```

### Self-Feedback Status

```
   ┌───────┐    submit     ┌───────────┐
   │ DRAFT │ ────────────► │ SUBMITTED │
   └───┬───┘  (locked)     └───────────┘
       │
       │ deadline passes
       ▼
   ┌───────────────┐
   │ NOT_SUBMITTED │ ─── or ── MISSED
   └───────────────┘
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

### Phase 2: Rating Scale & Competency Setup

```
Admin defines ──► rating_scales (e.g. "Standard 4-Point Impact Scale")
                     │
                     ▼
                  rating_scale_options (4 options: 1–4 with labels & colours)

Admin defines ──► competencies (25 entries: COMM, LEAD, STRT...)
                     │
                     ▼
                  competency_default_questions (default questions per competency per role)
```

### Phase 3: Question & Template Setup

```
Admin defines ──► questions (46 entries: IC-01..IC-15, TM-01..TM-15, HOD-01..HOD-16)
                     │
                     ▼
Admin creates ──► question_templates (bundled subsets, with rating_scale_id)
                     │
                     ▼
                  template_questions (M:N junction, scoped by role_group, with display_order)
```

### Phase 4: Reviewer Type Setup

```
System seeds  ──► reviewer_types (12 built-in types: SELF, REPORTING_MANAGER, PEER, ...)
Admin adds    ──► reviewer_types (custom types: category=CUSTOM, is_system=FALSE)
```

### Phase 5: Cycle Creation (DRAFT) — Wizard Steps

```
Admin creates ──► review_cycles (status=DRAFT)
                     ├── cycle_name, description
                     ├── launch_date, form_submission_days, publish_review_days
                     ├── rating_scale_id (one scale per cycle)
                     ├── visibility_config, enable_reminders, enable_comments
                     └── wizard_progress (tracks step completion)

Wizard Step 4 ──► cycle_reviewer_type_config (per reviewer type, per role group, min/max)

Wizard Step 6 ──► cycle_groups (IC, TM, HOD, or custom groups)
                     │
                     ├── cycle_group_owners (admin(s) per group)
                     │
                     └── cycle_template_questions (question snapshot per group,
                             customizable without affecting master template)
```

### Phase 6: Assignment & Mapping (still DRAFT)

```
CSV upload ──► employee_mapping_uploads (tracking)
                  │
                  ▼
              survey_assignments (one per employee × cycle, with group_id)
                  │
                  ▼
              survey_reviewers (per assignment, per reviewer type)
                  ├── reviewer_type = key from reviewer_types
                  └── each gets access_token for direct link

Or import from template:
  reviewer_mapping_templates → reviewer_mapping_template_entries → survey_reviewers
```

### Phase 7: Cycle Launch (DRAFT → LAUNCHED)

```
Admin launches ──► review_cycles.status = 'LAUNCHED'
                      │
                      ▼
                   notification_log ◄── CYCLE_START notifications
                   audit_log ◄── ACTIVATE action logged
```

### Phase 8: Form Active (LAUNCHED → FORM_ACTIVE)

```
form_start_date reached ──► review_cycles.status = 'FORM_ACTIVE'
                               │
                               ▼
                           notification_log ◄── SURVEY_ASSIGNED notifications

Reviewers:
  survey_reviewers (access via token or login)
       │
       ├──► survey_responses (one per question, rating 1–10 range)
       ├──► survey_comments (per-question or general)
       └──► status: PENDING → IN_PROGRESS → COMPLETED

Employees (self):
  self_feedback
       ├──► competency_ratings (JSONB array)
       └──► status: DRAFT → SUBMITTED

Reminder engine:
  review_cycles.reminder_days_before_deadline → notification_log
       ├── SURVEY_REMINDER (for pending reviewers)
       └── SELF_REMINDER (for pending self-feedback)
```

### Phase 9: Form Closed (FORM_ACTIVE → FORM_CLOSED)

```
form_end_date reached ──► review_cycles.status = 'FORM_CLOSED'
  (or auto_advance_form_submission triggered)
                            │
                            ├── Forms locked
                            ├── Pending reviewers → NOT_SUBMITTED or MISSED
                            ├── notification_log ◄── CYCLE_CLOSING notifications
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
       ├── reviewer_category_scores {"REPORTING_MANAGER": 3.8, ...}
       ├── reviewer_competency_breakdown {"REPORTING_MANAGER": {"COMM": 3.5}, ...}
       ├── final_label (derived from rating scale labels)
       └── total_reviewers
```

### Phase 10: Publication (FORM_CLOSED → PUBLISHED)

```
Admin publishes ──► review_cycles.status = 'PUBLISHED'
                       │
                       ├── calculated_scores now visible per visibility_config
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
  AND review_cycles.status = 'FORM_ACTIVE'
```

### Show Survey Form (Questions for a Reviewer)

```sql
survey_reviewers.question_set
  → survey_assignments.group_id
  → cycle_template_questions  (WHERE group_id = assignment.group_id AND is_active = TRUE)
  → questions                 (via question_id)
  ORDER BY cycle_template_questions.display_order
```

### Submit Survey

```sql
INSERT INTO survey_responses  (one row per question)
INSERT INTO survey_comments   (optional: per-question or general)
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
| One role config per role per cycle (deprecated) | `reviewer_role_config` | `UNIQUE(cycle_id, role)` |
| One reviewer type config per type/role/cycle | `cycle_reviewer_type_config` | `UNIQUE(cycle_id, reviewer_type_id, role_group)` |
| One question per position per set | `questions` | `UNIQUE(set_type, order_number)` |
| No duplicate questions in a template per role | `template_questions` | `UNIQUE(template_id, question_id, role_group)` |
| No duplicate questions in a cycle group | `cycle_template_questions` | `UNIQUE(group_id, question_id)` |
| No duplicate group names per cycle | `cycle_groups` | `UNIQUE(cycle_id, group_name)` |
| No duplicate scale values | `rating_scale_options` | `UNIQUE(scale_id, value)` |
| No duplicate scale display orders | `rating_scale_options` | `UNIQUE(scale_id, display_order)` |
| No duplicate mapping entries | `reviewer_mapping_template_entries` | `UNIQUE(template_id, employee_id, reviewer_id, reviewer_type_id)` |
| Rating range 1–10 | `survey_responses` | `CHECK (rating BETWEEN 1 AND 10)` |
| Reviewer config min ≤ max | `cycle_reviewer_type_config` | `CHECK (min_reviewers <= max_reviewers AND min_reviewers >= 0)` |
| Selected count within range (deprecated) | `reviewer_role_config` | `CHECK (selected_count >= min AND <= max)` |
| Role config min ≤ max (deprecated) | `reviewer_role_config` | `CHECK (min_reviewers <= max_reviewers)` |
| Valid group names | `employees` | `CHECK (group_name IN ('IC','TM','HOD','CXO'))` |
| Valid cycle statuses | `review_cycles` | `CHECK (status IN ('DRAFT','LAUNCHED','FORM_ACTIVE','FORM_CLOSED','PUBLISHED'))` |
| Valid review type | `review_cycles` | `CHECK (review_type IN ('SAME_TIME_FOR_ALL'))` |
| Valid frequency | `review_cycles` | `CHECK (frequency IN ('ONE_TIME'))` |
| Valid reviewer type category | `reviewer_types` | `CHECK (category IN ('ALWAYS_INCLUDED','MANAGERS','NOMINATED','CUSTOM'))` |
| Valid self-feedback status | `self_feedback` | `CHECK (status IN ('DRAFT','SUBMITTED','NOT_SUBMITTED','MISSED'))` |
| Valid reviewer status | `survey_reviewers` | `CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','NOT_SUBMITTED','MISSED'))` |
| Valid question set type | `survey_reviewers` | `CHECK (question_set IN ('IC','TM','HOD'))` |
| Valid role group (config) | `cycle_reviewer_type_config` | `CHECK (role_group IN ('IC','TM','HOD'))` |
| Valid role group (template) | `template_questions` | `CHECK (role_group IN ('IC','TM','HOD'))` |
| Valid role group (defaults) | `competency_default_questions` | `CHECK (role_group IN ('IC','TM','HOD'))` |

### Application-Level Business Rules

| Rule | Enforcement Point |
|---|---|
| Surveys can only be submitted while cycle is `FORM_ACTIVE` | Application middleware |
| Reviewer counts per type must respect `cycle_reviewer_type_config` min/max | Assignment creation logic |
| `FORM_ACTIVE` phase lasts `form_submission_days` (with optional weekly-off exclusion) | Background job / CRON |
| Reminders fire at intervals defined by `reminder_days_before_deadline` | `reminderScheduler` job |
| `self_feedback` status transitions: `DRAFT` → `SUBMITTED` (one-way) | API validation |
| Self-feedback can also reach `NOT_SUBMITTED` / `MISSED` if deadline passes | Cycle transition job |
| Survey reviewers can reach `NOT_SUBMITTED` / `MISSED` if deadline passes | Cycle transition job |
| Cycle status transitions follow prescribed order (DRAFT → LAUNCHED → FORM_ACTIVE → FORM_CLOSED → PUBLISHED) | Cycle transition job |
| Scores are calculated only after cycle reaches `FORM_CLOSED` | Score calculation engine |
| Form reopen: max 2 reopens per reviewer, max 14-day deadline | Application middleware |
| Fill on behalf: requires reason and notes, tracked on reviewer record | Application middleware |
| Templates are assigned per group, not per cycle | Wizard / cycle_groups |
| Cycle template questions are snapshots — changes don't affect master template | Application logic |

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

### Rating Scales

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_rating_scales_active` | `is_active` | Filter active scales |
| `idx_rso_scale` | `scale_id` | Options lookup for a scale |

### Review Cycles

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_cycles_status` | `status` | Filter cycles by state |
| `idx_cycles_rating_scale` | `rating_scale_id` | Join to rating scales |
| `idx_cycles_launch_date` | `launch_date` | Timeline-based queries |

### Competency Default Questions

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_cdq_competency` | `competency_id` | Defaults per competency |
| `idx_cdq_role_group` | `role_group` | Defaults per role group |

### Questions & Templates

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_questions_set` | `set_type` | Filter by IC/TM/HOD |
| `idx_questions_competency` | `competency_id` | Competency-based lookups |
| `idx_templates_active` | `is_active` | Filter active templates |
| `idx_template_questions_tid` | `template_id` | Template → questions join |
| `idx_template_questions_qid` | `question_id` | Question → templates reverse lookup |
| `idx_tq_role_group` | `role_group` | Role-group-based filtering |

### Reviewer Types

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_rt_type_key` | `type_key` | Lookup by key |
| `idx_rt_category` | `category` | Filter by category |
| `idx_rt_active` | `is_active` | Filter active types |

### Cycle Reviewer Type Config

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_crtc_cycle` | `cycle_id` | Config per cycle |
| `idx_crtc_reviewer_type` | `reviewer_type_id` | Config per reviewer type |
| `idx_crtc_role_group` | `role_group` | Config per role group |

### Reviewer Mapping Templates

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_rmt_active` | `is_active` | Filter active mapping templates |
| `idx_rmte_template` | `template_id` | Entries per template |
| `idx_rmte_employee` | `employee_id` | Entries per employee |

### Cycle Groups

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_cg_cycle` | `cycle_id` | Groups per cycle |
| `idx_cgo_group` | `group_id` | Owners per group |
| `idx_ctq_group` | `group_id` | Template questions per group |

### Feedback & Surveys

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_sf_employee_cycle` | `employee_id, cycle_id` | Self-feedback lookup |
| `idx_sf_status` | `status` | Filter by DRAFT/SUBMITTED/etc. |
| `idx_sa_employee_cycle` | `employee_id, cycle_id` | Assignment lookup |
| `idx_sa_status` | `status` | Completion dashboard |
| `idx_sa_group` | `group_id` | Assignments per cycle group |
| `idx_sr_assignment` | `assignment_id` | Reviewers for an assignment |
| `idx_sr_reviewer_emp` | `reviewer_employee_id` | "My pending surveys" lookup |
| `idx_sr_reviewer_type` | `reviewer_type` | Category breakdown queries |
| `idx_sr_status` | `status` | Completion filtering |
| `idx_sr_completed` | `completed_at` (partial: WHERE NOT NULL) | Analytics on completed reviewers |
| `idx_sr_reopen_deadline` | `reopen_deadline` (partial: WHERE NOT NULL) | Reopen deadline tracking |
| `idx_resp_reviewer` | `reviewer_id` | Responses by reviewer |
| `idx_resp_question` | `question_id` | Responses by question |
| `idx_sc_reviewer` | `reviewer_id` | Comments by reviewer |
| `idx_sc_question` | `question_id` (partial: WHERE NOT NULL) | Per-question comment lookup |

### Scores & Notifications

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_scores_employee_cycle` | `employee_id, cycle_id` | Scorecard lookup |
| `idx_notif_log_recipient` | `recipient_id` | Notification history per person |
| `idx_notif_log_status` | `status` | Pending notifications for retry |

### Legacy / Deprecated

| Index | Column(s) | Purpose |
|---|---|---|
| `idx_rrc_cycle` | `cycle_id` | Role configs for a cycle (deprecated) |
| `idx_rrc_role` | `role` | Role-based lookups (deprecated) |

### Uploads & Audit

| Index | Column(s) | Purpose |
|---|---|---|
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
| `rating_scales` | `trg_rating_scales_updated_at` |
| `reviewer_types` | `trg_reviewer_types_updated_at` |
| `reviewer_mapping_templates` | `trg_reviewer_mapping_templates_updated_at` |
| `cycle_groups` | `trg_cycle_groups_updated_at` |

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

## 12. Seed Data

### Default Rating Scale

The system ships with a pre-configured **Standard 4-Point Impact Scale**:

| Value | Label | Description | Color |
|---|---|---|---|
| 4 | Outstanding Impact | Consistently exceeds expectations | `#22C55E` |
| 3 | Significant Impact | Frequently exceeds expectations | `#3B82F6` |
| 2 | Moderate Impact | Meets expectations | `#F59E0B` |
| 1 | Not Enough Impact | Below expectations | `#EF4444` |

### Built-in Reviewer Types

12 system reviewer types are seeded across 4 categories:

| Type Key | Type Name | Category |
|---|---|---|
| `SELF` | Self | ALWAYS_INCLUDED |
| `REPORTING_MANAGER` | Reporting Manager | ALWAYS_INCLUDED |
| `MANAGER_OF_MANAGER` | Manager of Manager | MANAGERS |
| `DEPARTMENT_HEAD` | Department Head | MANAGERS |
| `BUSINESS_UNIT_HEAD` | Business Unit Head | MANAGERS |
| `DOTTED_LINE_MANAGER` | Dotted Line Manager | MANAGERS |
| `PEER` | Peers | NOMINATED |
| `EXTERNAL` | External | NOMINATED |
| `SUBORDINATE` | Subordinates | NOMINATED |
| `PROJECT_MANAGER` | Project Manager | NOMINATED |
| `CROSS_FUNCTIONAL` | Cross-Functional Peer | CUSTOM |
| `INDIRECT_REPORT` | Indirect Reportees | CUSTOM |
