-- ============================================================
-- 360 FEEDBACK PLATFORM — COMPLETE DATABASE SETUP
-- Target  : Supabase / PostgreSQL 15+
-- Version : 1.0   |   Date: February 2026
-- ============================================================
-- Run order: execute this file once in Supabase SQL Editor.
-- It is safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- ============================================================


-- ============================================================
-- PART 1 — EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ============================================================
-- PART 2 — DROP EXISTING TABLES (clean slate)
-- ============================================================
DROP TABLE IF EXISTS ad_sync_log              CASCADE;
DROP TABLE IF EXISTS audit_log                CASCADE;
DROP TABLE IF EXISTS notification_log         CASCADE;
DROP TABLE IF EXISTS notification_templates   CASCADE;
DROP TABLE IF EXISTS calculated_scores        CASCADE;
DROP TABLE IF EXISTS survey_comments          CASCADE;
DROP TABLE IF EXISTS survey_responses         CASCADE;
DROP TABLE IF EXISTS survey_reviewers         CASCADE;
DROP TABLE IF EXISTS survey_assignments       CASCADE;
DROP TABLE IF EXISTS self_feedback            CASCADE;
DROP TABLE IF EXISTS employee_mapping_uploads CASCADE;
DROP TABLE IF EXISTS template_questions       CASCADE;
DROP TABLE IF EXISTS question_templates       CASCADE;
DROP TABLE IF EXISTS questions                CASCADE;
DROP TABLE IF EXISTS competencies             CASCADE;
DROP TABLE IF EXISTS reviewer_role_config     CASCADE;
DROP TABLE IF EXISTS reviewer_config          CASCADE;
DROP TABLE IF EXISTS review_cycles            CASCADE;
DROP TABLE IF EXISTS employees                CASCADE;


-- ============================================================
-- PART 3 — TABLE CREATION
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 employees
-- PURPOSE : The single source of truth for every person in the
--           organisation.  Records are auto-synced from Azure
--           Active Directory so that names, emails, departments
--           and reporting lines always reflect payroll reality.
-- WHY IT EXISTS :
--   • Every other table (review_cycles, survey_assignments,
--     responses, scores, audit entries) ultimately refers back
--     to an employee_id.  Having one canonical table avoids
--     data duplication and keeps referential integrity intact.
-- KEY FIELDS :
--   employee_id          – AD object ID / employee number (PK).
--   group_name           – IC (Individual Contributor), TM
--                          (Team Manager), HOD (Head of Dept),
--                          or CXO.  Drives which question set
--                          (15 IC / 15 TM / 16 HOD) is used.
--   reporting_manager_id – Self-referencing FK; lets the app
--                          auto-derive the MANAGER reviewer.
--   applicable_competencies / cross_functional_groups – JSONB
--                          arrays that personalise which
--                          competencies appear in reports and
--                          which cross-dept peers can review.
--   is_active            – Soft-delete flag.  Inactive employees
--                          are excluded from new cycles but
--                          historical data is preserved.
-- ----------------------------------------------------------
CREATE TABLE employees (
    employee_id              TEXT PRIMARY KEY,
    full_name                TEXT NOT NULL,
    email                    TEXT UNIQUE NOT NULL,
    department               TEXT NOT NULL,
    designation              TEXT NOT NULL,
    reporting_manager_id     TEXT REFERENCES employees(employee_id),
    date_of_joining          DATE NOT NULL,
    group_name               TEXT NOT NULL CHECK (group_name IN ('IC','TM','HOD','CXO')),
    cross_functional_groups  JSONB,          -- e.g. ["Engineering","Product"]
    applicable_competencies  JSONB,          -- e.g. ["COMM","TEAM"]
    leadership_level         INTEGER,        -- 1=CXO, 2=HOD, 3=TM, 4=IC (for org hierarchy)
    org_path                 TEXT[],         -- Materialized path from root to this node
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    synced_at                TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.2 review_cycles
-- PURPOSE : Represents a single time-boxed 360-feedback
--           campaign (e.g. "Q1 2026 Review").  One row = one
--           cycle that can span 3, 4, 6, or 12 months.
-- WHY IT EXISTS :
--   • All survey activity — assignments, reviewers, responses,
--     scores, and notifications — is scoped to a cycle.  This
--     lets HR run multiple independent reviews over time and
--     compare results across cycles in trend reports.
-- KEY FIELDS :
--   cycle_id              – UUID PK referenced by every
--                           downstream table.
--   status                – DRAFT → ACTIVE → CLOSING →
--                           COMPLETED → PUBLISHED.  Business
--                           rules enforce that surveys can only
--                           be submitted while ACTIVE/CLOSING.
--   duration_months       – Restricted to 3 / 4 / 6 / 12 to
--                           match standard appraisal cadences.
--   grace_period_days     – Extra days (0–7) after end_date
--                           during which late submissions are
--                           still accepted (CLOSING status).
--   reminder_schedule     – JSONB array of days-before-deadline
--                           when automated reminders fire
--                           (default [7, 3, 1]).
--   enable_self_feedback / enable_colleague_feedback – Feature
--                           toggles per cycle.
-- ----------------------------------------------------------
CREATE TABLE review_cycles (
    cycle_id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_name                TEXT NOT NULL,
    start_date                DATE NOT NULL,
    end_date                  DATE NOT NULL,
    duration_months           INTEGER NOT NULL CHECK (duration_months IN (3,4,6,12)),
    grace_period_days         INTEGER NOT NULL DEFAULT 3 CHECK (grace_period_days BETWEEN 0 AND 7),
    status                    TEXT NOT NULL DEFAULT 'DRAFT'
                                  CHECK (status IN ('DRAFT','ACTIVE','CLOSING','COMPLETED','PUBLISHED')),
    enable_self_feedback      BOOLEAN NOT NULL DEFAULT TRUE,
    enable_colleague_feedback BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_schedule         JSONB DEFAULT '[7,3,1]',
    template_id               UUID,           -- FK to question_templates (set on cycle creation)
    employee_join_date_before DATE,           -- filter: include only employees who joined on or before this date
    created_by                TEXT REFERENCES employees(employee_id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_dates CHECK (end_date > start_date)
);

-- ----------------------------------------------------------
-- 3.3 competencies
-- PURPOSE : A master catalogue of the 25 behavioural / skill
--           areas that the organisation measures through 360
--           feedback (e.g. Communication, Leadership, Strategy).
-- WHY IT EXISTS :
--   • Decoupling competency definitions from questions means
--     HR can rename, reword, or deactivate a competency in one
--     place and have all linked questions and score roll-ups
--     update automatically.
--   • Reports aggregate ratings at the competency level
--     (not just the question level), so this table is the
--     grouping anchor for calculated_scores.competency_scores.
-- KEY FIELDS :
--   competency_id   – Short UPPERCASE code (e.g. 'COMM',
--                     'LEAD') used as FK in questions table
--                     and as keys in the JSONB score blobs.
--   applicable_to   – TEXT array of groups that see this
--                     competency (e.g. ARRAY['IC','TM','HOD']).
--                     Prevents irrelevant competencies from
--                     appearing in IC or TM scorecards.
--   is_active       – Soft-delete allows retiring competencies
--                     without breaking historic data.
-- ----------------------------------------------------------
CREATE TABLE competencies (
    competency_id   TEXT PRIMARY KEY,   -- short code e.g. 'COMM'
    competency_name TEXT NOT NULL,
    description     TEXT,
    applicable_to   TEXT[] DEFAULT ARRAY['IC','TM','HOD'],  -- which groups see this
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.4 questions
-- PURPOSE : Stores the 46 rated survey questions split across
--           three sets — IC (15), TM (15), and HOD (16) —
--           each mapped to a competency and displayed in a
--           fixed order.
-- WHY IT EXISTS :
--   • Using a table (rather than hard-coded arrays) means
--     questions can be added, reworded, or retired by HR
--     without a code deployment.
--   • The set_type column drives which question set a reviewer
--     sees based on the ratee's group_name, ensuring that an
--     IC is never judged on HOD-level leadership dimensions.
-- KEY FIELDS :
--   question_id     – Human-readable PK (e.g. 'IC-07',
--                     'TM-03', 'HOD-11') for easy debugging.
--   set_type        – IC / TM / HOD; also stored in
--                     survey_reviewers.question_set so the
--                     reviewer record is self-contained.
--   order_number    – Controls display sequence within a set.
--   competency_id   – FK to competencies; used to roll up
--                     per-question ratings into a competency
--                     score during calculation.
--   UNIQUE(set_type, order_number) – Prevents duplicate
--                     position numbers within the same set.
-- ----------------------------------------------------------
CREATE TABLE questions (
    question_id   TEXT PRIMARY KEY,     -- e.g. 'IC-01', 'TM-01', 'HOD-01'
    set_type      TEXT NOT NULL CHECK (set_type IN ('IC','TM','HOD')),
    order_number  INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    category      TEXT NOT NULL,
    competency_id TEXT NOT NULL REFERENCES competencies(competency_id),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (set_type, order_number)
);

-- ----------------------------------------------------------
-- 3.5 reviewer_config
-- PURPOSE : A single-row admin settings table that controls
--           the minimum and maximum number of peer/colleague
--           reviewers that can be assigned to any one employee
--           in a cycle.
-- WHY IT EXISTS :
--   • Externalising these limits (rather than hard-coding them)
--     lets the HR admin change them via the UI without a code
--     change.  For example, if the organisation decides to
--     increase the cap from 8 to 10 reviewers, only this row
--     needs updating.
--   • The application layer reads these values at assignment
--     time and enforces them through validation rules.
-- KEY FIELDS :
--   min_reviewers   – Lower bound; protects against under-
--                     reviewed employees (default 2).
--   max_reviewers   – Upper bound; prevents survey fatigue
--                     and keeps scoring statistically sound
--                     (default 8).
--   updated_by      – FK to employees so the audit trail shows
--                     which admin last changed the config.
-- ----------------------------------------------------------
CREATE TABLE reviewer_config (
    config_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_reviewers INTEGER NOT NULL DEFAULT 2,
    max_reviewers INTEGER NOT NULL DEFAULT 8,
    updated_by    TEXT REFERENCES employees(employee_id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.5b reviewer_role_config
-- PURPOSE : Stores per-role reviewer count settings within the
--           global min/max bounds from reviewer_config.  For each
--           role (IC, TM, HOD, CXO) and each cycle, the admin
--           sets a tighter min–max range and then selects a
--           fixed count (selected_count) from that range.
-- WHY IT EXISTS :
--   • Different roles need different numbers of reviewers — an
--     IC might need 3 reviewers while an HOD needs 6.
--   • The selected_count becomes the exact number of reviewers
--     (X) that every employee of that role must have in the
--     cycle.  Reviewers may come from different roles, but the
--     total must equal selected_count.
--   • Per-cycle scoping (via cycle_id) lets HR adjust counts
--     across cycles without losing history.
-- KEY FIELDS :
--   cycle_id       – FK to review_cycles; each cycle can have
--                    its own role-based reviewer config.
--   role           – IC / TM / HOD / CXO; the employee role
--                    this config applies to.
--   min_reviewers  – Lower bound for this role (within global).
--   max_reviewers  – Upper bound for this role (within global).
--   selected_count – The exact reviewer count chosen by admin
--                    from the min–max range for this role.
--   UNIQUE(cycle_id, role) – One config per role per cycle.
-- ----------------------------------------------------------
CREATE TABLE reviewer_role_config (
    config_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id       UUID NOT NULL REFERENCES review_cycles(cycle_id) ON DELETE CASCADE,
    role           TEXT NOT NULL CHECK (role IN ('IC','TM','HOD','CXO')),
    min_reviewers  INTEGER NOT NULL DEFAULT 2,
    max_reviewers  INTEGER NOT NULL DEFAULT 8,
    selected_count INTEGER,  -- the fixed reviewer count chosen from min–max
    updated_by     TEXT REFERENCES employees(employee_id),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cycle_id, role),
    CONSTRAINT chk_role_minmax CHECK (min_reviewers <= max_reviewers),
    CONSTRAINT chk_selected_in_range CHECK (
        selected_count IS NULL
        OR (selected_count >= min_reviewers AND selected_count <= max_reviewers)
    )
);

-- ----------------------------------------------------------
-- 3.6 question_templates
-- PURPOSE : Stores reusable question set templates that can be
--           assigned to review cycles.  Allows HR to create
--           custom question sets and reuse them across multiple
--           cycles without affecting the master question bank.
-- WHY IT EXISTS :
--   • Decouples question sets from cycles, enabling template
--     reuse and version control.  When a cycle is created
--     with a template, it locks in that question set — future
--     changes to the template won't affect active cycles.
--   • Allows different cycles to use different question
--     subsets (e.g., simplified set for H1, full set for H2).
-- KEY FIELDS :
--   template_id   – UUID PK referenced by review_cycles.
--   template_name – Human-friendly name (e.g., "Standard IC/TM/HOD Set",
--                   "Simplified Q1 2026", "Leadership Focus").
--   description   – Optional notes on when/why to use this template.
--   created_by    – FK to employees (admin who created it).
--   is_active     – Soft-delete flag; inactive templates can't be
--                   assigned to new cycles but existing cycles
--                   using them remain unaffected.
-- ----------------------------------------------------------
CREATE TABLE question_templates (
    template_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name  TEXT NOT NULL UNIQUE,
    description    TEXT,
    cloned_from    UUID REFERENCES question_templates(template_id),  -- source template if this was cloned
    source_file_url TEXT,          -- URL / path of an uploaded file used to create this template
    created_by     TEXT REFERENCES employees(employee_id),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.7 template_questions
-- PURPOSE : Junction table linking question templates to the
--           specific questions they include.  This M:N mapping
--           lets one template include multiple questions, and
--           one question can belong to multiple templates.
-- WHY IT EXISTS :
--   • Provides full flexibility: HR can create a template with
--     only 10 IC questions, or all 15, or a mix across sets.
--   • When a cycle references a template_id, the application
--     pulls questions via this junction to build the survey.
--   • The is_active flag allows temporarily excluding a
--     question from a template without deleting the link.
-- KEY FIELDS :
--   template_id – FK to question_templates.
--   question_id – FK to questions (the master question bank).
--   is_active   – Soft-delete for this template-question link.
--   UNIQUE(template_id, question_id) – Prevents duplicate
--               question inclusion in one template.
-- ----------------------------------------------------------
CREATE TABLE template_questions (
    template_question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id          UUID NOT NULL REFERENCES question_templates(template_id) ON DELETE CASCADE,
    question_id          TEXT NOT NULL REFERENCES questions(question_id),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, question_id)
);

-- ----------------------------------------------------------
-- 3.8 self_feedback
-- PURPOSE : Captures each employee's own competency ratings
--           for a given review cycle, allowing a "self vs.
--           peer" score gap analysis in the final report.
-- WHY IT EXISTS :
--   • Self-awareness is a core goal of 360 feedback.  Storing
--     self-ratings separately from peer ratings means the
--     score engine can clearly label which part of the final
--     scorecard is self-reported vs. externally observed.
--   • Keeping a DRAFT status lets employees save progress
--     and return before formally submitting.
-- KEY FIELDS :
--   employee_id        – The person rating themselves (not a
--                        reviewer); FK to employees.
--   cycle_id           – FK to review_cycles scoping the
--                        submission to one campaign.
--   competency_ratings – JSONB array of
--                        {competency_id, rating} objects;
--                        flexible structure avoids a wide
--                        EAV schema.
--   status             – DRAFT (saved) or SUBMITTED (locked).
--   UNIQUE(employee_id, cycle_id) – One self-review per
--                        person per cycle.
-- ----------------------------------------------------------
CREATE TABLE self_feedback (
    self_feedback_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         TEXT NOT NULL REFERENCES employees(employee_id),
    cycle_id            UUID NOT NULL REFERENCES review_cycles(cycle_id),
    competency_ratings  JSONB NOT NULL DEFAULT '[]',
    status              TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED')),
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, cycle_id)
);

-- ----------------------------------------------------------
-- 3.9 survey_assignments
-- PURPOSE : The top-level record that enrols one employee in
--           one review cycle, acting as the parent container
--           for all reviewers and responses for that person
--           in that cycle.
-- WHY IT EXISTS :
--   • A single join key (assignment_id) links an employee-
--     cycle pair to all its reviewers (survey_reviewers) and,
--     transitively, to all submitted responses and scores.
--     This makes it straightforward to check completion,
--     trigger reminders, and display dashboards per employee.
--   • The status aggregate (PENDING → IN_PROGRESS →
--     COMPLETED) gives HR a quick health-check view of how
--     many employees have all reviewers done.
-- KEY FIELDS :
--   assignment_id  – UUID PK referenced by survey_reviewers.
--   employee_id    – The person being reviewed (the ratee).
--   cycle_id       – FK to review_cycles.
--   status         – Derives from child reviewer statuses:
--                    PENDING (none started), IN_PROGRESS
--                    (some done), COMPLETED (all done).
--   UNIQUE(employee_id, cycle_id) – One assignment per
--                    employee per cycle.
-- ----------------------------------------------------------
CREATE TABLE survey_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   TEXT NOT NULL REFERENCES employees(employee_id),
    cycle_id      UUID NOT NULL REFERENCES review_cycles(cycle_id),
    status        TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, cycle_id)
);

-- ----------------------------------------------------------
-- 3.9b employee_mapping_uploads
-- PURPOSE : Tracks CSV file uploads used to bulk-create
--           employee-reviewer mappings for a cycle.  Stores
--           the file reference, row counts, and any errors
--           so HR can audit and re-process failed uploads.
-- WHY IT EXISTS :
--   • Bulk mapping via CSV is the primary workflow for large
--     organisations.  Without a log, there is no way to know
--     which file produced the current reviewer mappings, or
--     to retry a failed import.
--   • Error details (failed_rows, error_details) enable the
--     UI to show a per-row error report after upload.
-- KEY FIELDS :
--   cycle_id       – FK to review_cycles; scopes the upload.
--   file_name      – Original filename for display / audit.
--   file_url       – Storage path / URL of the uploaded CSV.
--   total_rows     – Total data rows in the file.
--   processed_rows – Successfully imported rows.
--   failed_rows    – Rows that failed validation.
--   error_details  – JSONB array of per-row error info.
--   status         – PENDING → PROCESSING → COMPLETED | FAILED.
--   uploaded_by    – FK to employees (admin who uploaded).
-- ----------------------------------------------------------
CREATE TABLE employee_mapping_uploads (
    upload_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id       UUID NOT NULL REFERENCES review_cycles(cycle_id),
    file_name      TEXT NOT NULL,
    file_url       TEXT NOT NULL,
    total_rows     INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows    INTEGER NOT NULL DEFAULT 0,
    error_details  JSONB DEFAULT '[]',
    status         TEXT NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    uploaded_by    TEXT REFERENCES employees(employee_id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.10 survey_reviewers
-- PURPOSE : Each row represents one reviewer who has been
--           asked to provide 360 feedback for a specific
--           employee (assignment).  This table is the bridge
--           between an assignment and the individual ratings
--           and comments that reviewer submits.
-- WHY IT EXISTS :
--   • Different reviewer types (MANAGER, PEER,
--     DIRECT_REPORT, CROSS_FUNCTIONAL, CXO) carry different
--     analytical weight in the final scorecard, so they must
--     be tracked individually rather than aggregated early.
--   • The access_token (UUID) enables secure, tokenised
--     survey links that don't require a reviewer to log in,
--     improving response rates for external or occasional
--     reviewers.
--   • reminded_at / completed_at timestamps power the
--     reminder engine and completion-rate analytics.
-- KEY FIELDS :
--   reviewer_employee_id – FK to employees (the person giving
--                          feedback).
--   reviewer_type        – Category used for weighted score
--                          breakdown in reports.
--   question_set         – IC / TM / HOD; copied from the
--                          ratee's group so the reviewer sees
--                          the correct question set even if
--                          the ratee's group changes later.
--   access_token         – Unique UUID for password-less
--                          survey access via a direct link.
-- ----------------------------------------------------------
CREATE TABLE survey_reviewers (
    reviewer_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id        UUID NOT NULL REFERENCES survey_assignments(assignment_id),
    reviewer_employee_id TEXT NOT NULL REFERENCES employees(employee_id),
    reviewer_type        TEXT NOT NULL
                             CHECK (reviewer_type IN
                                 ('MANAGER','PEER','DIRECT_REPORT','INDIRECT_REPORT',
                                  'CROSS_FUNCTIONAL','CXO')),
    question_set         TEXT NOT NULL CHECK (question_set IN ('IC','TM','HOD')),
    status               TEXT NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED')),
    access_token         UUID UNIQUE DEFAULT gen_random_uuid(),
    reminded_at          TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.11 survey_responses
-- PURPOSE : The atomic unit of feedback — one numeric rating
--           (1–4 scale) given by one reviewer for one question.
--           This is the raw data that every score calculation
--           and report is ultimately derived from.
-- WHY IT EXISTS :
--   • Storing responses at the individual question level (not
--     just as a per-reviewer total) preserves full granularity
--     for competency-level breakdowns, outlier detection, and
--     future re-weighting without data loss.
--   • The 1–4 scale (Not Enough Impact → Outstanding Impact)
--     avoids a neutral mid-point, forcing a directional
--     judgement from each reviewer.
-- KEY FIELDS :
--   reviewer_id   – FK to survey_reviewers; links the rating
--                   back to who gave it, their type, and
--                   which assignment it belongs to.
--   question_id   – FK to questions; links the rating to its
--                   competency for roll-up calculations.
--   rating        – INTEGER 1–4; CHECK constraint enforced
--                   at DB level as a last-resort safeguard.
--   UNIQUE(reviewer_id, question_id) – Prevents duplicate
--                   answers; idempotent upserts are safe.
-- ----------------------------------------------------------
CREATE TABLE survey_responses (
    response_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id  UUID NOT NULL REFERENCES survey_reviewers(reviewer_id),
    question_id  TEXT NOT NULL REFERENCES questions(question_id),
    rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reviewer_id, question_id)
);

-- ----------------------------------------------------------
-- 3.12 survey_comments
-- PURPOSE : Stores the open-ended qualitative text that
--           reviewers optionally write alongside their
--           numeric ratings, providing context and specific
--           examples that numbers alone cannot capture.
-- WHY IT EXISTS :
--   • Qualitative feedback is one of the highest-value
--     outputs of a 360 review.  Separating comments into
--     their own table (rather than a column in
--     survey_reviewers) allows:
--       – Multiple comments per reviewer in future iterations.
--       – NLP / sentiment analysis pipelines to consume the
--         text without touching the ratings table.
--       – Targeted access control (HR can grant managers
--         read access to comments separately from scores).
-- KEY FIELDS :
--   reviewer_id   – FK to survey_reviewers; ties the comment
--                   to the reviewer's type and the ratee's
--                   assignment for filtered display.
--   comment_text  – Plain text; no length constraint to
--                   encourage thorough responses.
-- ----------------------------------------------------------
CREATE TABLE survey_comments (
    comment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id  UUID NOT NULL REFERENCES survey_reviewers(reviewer_id),
    comment_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.13 calculated_scores
-- PURPOSE : A materialised summary of every employee's final
--           360 scores for one cycle, computed by the score
--           engine after the cycle closes.  This is the primary
--           table read by the analytics dashboard and reports.
-- WHY IT EXISTS :
--   • Aggregating raw survey_responses on every page load
--     would be slow and complex.  Pre-computing and storing
--     the final scores here makes the reporting layer simple,
--     fast, and cacheable.
--   • Storing both the self_score (from self_feedback) and
--     the colleague_score (from peer/manager/DR ratings)
--     alongside each other enables the self-vs-peer gap
--     analysis that is central to 360 feedback value.
-- KEY FIELDS :
--   self_score            – Average of weighted self ratings.
--   colleague_score       – Weighted average across all
--                           reviewer types.
--   final_label           – Derived band: Outstanding Impact /
--                           Significant / Moderate /
--                           Not Enough Impact.
--   competency_scores     – JSONB map of competency_id →
--                           average score for detailed
--                           radar/spider chart rendering.
--   reviewer_category_scores – JSONB map of reviewer_type →
--                           average score for category
--                           breakdown charts.
--   total_reviewers       – Count of reviewers who completed
--                           the survey; shown for transparency.
--   UNIQUE(employee_id, cycle_id) – One scorecard per
--                           employee per cycle; safe to
--                           recalculate with an upsert.
-- ----------------------------------------------------------
CREATE TABLE calculated_scores (
    calc_id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id                   TEXT NOT NULL REFERENCES employees(employee_id),
    cycle_id                      UUID NOT NULL REFERENCES review_cycles(cycle_id),
    self_score                    NUMERIC(4,2),
    colleague_score               NUMERIC(4,2),
    final_label                   TEXT CHECK (final_label IN
                                      ('Outstanding Impact','Significant Impact',
                                       'Moderate Impact','Not Enough Impact')),
    competency_scores             JSONB DEFAULT '{}',      -- {"COMM": 3.5, "TEAM": 4.0, ...}
    reviewer_category_scores      JSONB DEFAULT '{}',      -- {"MANAGER": 3.8, "PEER": 3.5, ...}
    reviewer_competency_breakdown JSONB DEFAULT '{}',      -- {"MANAGER": {"COMM": 3.5, "TEAM": 4.0}, "PEER": {...}}
    total_reviewers               INTEGER DEFAULT 0,
    calculated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, cycle_id)
);

-- ----------------------------------------------------------
-- 3.14 notification_templates
-- PURPOSE : A library of reusable, admin-editable message
--           templates for every automated notification event
--           in the platform (cycle start, survey assigned,
--           reminder, results published, etc.).
-- WHY IT EXISTS :
--   • Centralising message content in the database means HR
--     admins can update subject lines, body copy, or Teams
--     card text through the admin UI without involving
--     developers or doing a code deployment.
--   • Each template carries both an email variant and a
--     Teams message variant, enabling the same event to
--     fan out over multiple channels with appropriate
--     formatting for each medium.
--   • Mustache-style placeholders ({{employee_name}},
--     {{deadline}}, etc.) are resolved at send time by
--     the notification service.
-- KEY FIELDS :
--   template_id   – Short descriptive code (e.g.
--                   'CYCLE_START') used as FK in
--                   notification_log and referenced in code.
--   event_type    – Maps to application-layer event constants
--                   that trigger notification dispatch.
--   email_body / teams_message – Separate content fields
--                   because HTML/plain-text email and Teams
--                   Adaptive Cards have different syntax.
-- ----------------------------------------------------------
CREATE TABLE notification_templates (
    template_id   TEXT PRIMARY KEY,   -- e.g. 'CYCLE_START'
    template_name TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    email_body    TEXT NOT NULL,
    teams_message TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.15 notification_log
-- PURPOSE : An append-only record of every notification the
--           platform has attempted to send, including its
--           delivery status and any failure detail.  Functions
--           as both an operational log and a retry queue.
-- WHY IT EXISTS :
--   • Without a delivery log, HR has no visibility into
--     whether employees actually received their survey
--     invitations or reminders.  This table powers a
--     "notification history" admin screen and allows support
--     staff to manually re-trigger failed messages.
--   • The PENDING / SENT / FAILED status lifecycle enables
--     background workers to pick up PENDING rows, mark them
--     SENT on success, or FAILED (with error_message) on
--     exception — making the delivery pipeline
--     fault-tolerant and observable.
-- KEY FIELDS :
--   template_id     – FK to notification_templates; records
--                     which template was used.
--   recipient_id    – FK to employees; shows which person
--                     received (or should have received) the
--                     notification.
--   channel         – EMAIL or TEAMS; allows channel-level
--                     delivery rate reporting.
--   status          – PENDING → SENT | FAILED.
--   error_message   – Captured exception detail for
--                     debugging delivery failures.
-- ----------------------------------------------------------
CREATE TABLE notification_log (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     TEXT REFERENCES notification_templates(template_id),
    recipient_id    TEXT REFERENCES employees(employee_id),
    channel         TEXT NOT NULL CHECK (channel IN ('EMAIL','TEAMS')),
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','SENT','FAILED')),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.16 audit_log
-- PURPOSE : An immutable, append-only audit trail of every
--           significant administrative action performed in the
--           platform — who did what, to which record, and
--           what it looked like before and after the change.
-- WHY IT EXISTS :
--   • Compliance and governance require that sensitive HR
--     operations (cycle activation, result publication,
--     reviewer changes, score overrides) are traceable to
--     a specific user, timestamp, and IP address.
--   • The old_value / new_value JSONB columns provide a full
--     diff diff for every mutation, enabling point-in-time
--     reconstruction of any record's history without
--     maintaining separate versioned shadow tables.
--   • Stored at the DB layer rather than only in application
--     logs, ensuring that even direct SQL changes (hotfixes,
--     migrations) can be added to the trail.
-- KEY FIELDS :
--   user_id       – FK to employees; the admin who performed
--                   the action (NULL for system-initiated).
--   action_type   – Verb: CREATE, UPDATE, DELETE, ACTIVATE,
--                   PUBLISH, etc.
--   entity_type   – Table name of the affected record.
--   entity_id     – TEXT PK of the affected row (flexible
--                   to support both UUID and TEXT PKs).
--   old_value / new_value – Full JSONB snapshots of the
--                   record before and after the change.
--   ip_address    – For security investigations.
-- ----------------------------------------------------------
CREATE TABLE audit_log (
    log_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT REFERENCES employees(employee_id),
    action_type TEXT NOT NULL,   -- CREATE, UPDATE, DELETE, ACTIVATE, PUBLISH …
    entity_type TEXT NOT NULL,   -- review_cycles, survey_assignments …
    entity_id   TEXT NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3.17 ad_sync_log
-- PURPOSE : Records the outcome of every Active Directory
--           synchronisation run — whether it was scheduled
--           (nightly CRON) or manually triggered by an admin
--           — so that HR can verify that employee data is
--           current and diagnose any sync failures.
-- WHY IT EXISTS :
--   • The employees table is owned by AD.  Each sync may
--     add new hires, update changed fields (name, dept,
--     manager), or deactivate leavers.  Without a sync log,
--     there is no way to confirm that the last sync ran
--     cleanly or to quantify how many records changed.
--   • The counters (employees_added, employees_updated,
--     employees_deactivated) give HR a quick changelog
--     without having to diff the employees table manually.
--   • A PARTIAL status handles the real-world scenario where
--     some records sync successfully but others fail
--     (e.g. malformed AD attributes), preserving useful
--     partial progress rather than rolling back everything.
-- KEY FIELDS :
--   sync_type              – SCHEDULED (automated) or
--                            MANUAL (admin-initiated).
--   status                 – SUCCESS / PARTIAL / FAILED.
--   employees_added /
--   employees_updated /
--   employees_deactivated  – Change counters for the run.
--   error_message          – First error encountered if the
--                            sync was PARTIAL or FAILED.
--   started_at / completed_at – Duration tracking.
-- ----------------------------------------------------------
CREATE TABLE ad_sync_log (
    sync_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type            TEXT NOT NULL CHECK (sync_type IN ('SCHEDULED','MANUAL')),
    status               TEXT NOT NULL CHECK (status IN ('SUCCESS','PARTIAL','FAILED')),
    employees_added      INTEGER NOT NULL DEFAULT 0,
    employees_updated    INTEGER NOT NULL DEFAULT 0,
    employees_deactivated INTEGER NOT NULL DEFAULT 0,
    error_message        TEXT,
    started_at           TIMESTAMPTZ NOT NULL,
    completed_at         TIMESTAMPTZ
);


-- ============================================================
-- PART 4 — FOREIGN KEY CONSTRAINTS (deferred for dependency resolution)
-- ============================================================
ALTER TABLE review_cycles ADD CONSTRAINT fk_review_cycles_template
    FOREIGN KEY (template_id) REFERENCES question_templates(template_id);


-- ============================================================
-- PART 5 — updated_at TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to every table that has updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'employees','review_cycles','competencies','questions',
        'question_templates','self_feedback','survey_assignments',
        'calculated_scores','notification_templates','reviewer_role_config'
    ]
    LOOP
        EXECUTE format(
            'CREATE OR REPLACE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
            tbl, tbl
        );
    END LOOP;
END;
$$;


-- ============================================================
-- PART 6 — INDEXES
-- ============================================================
-- Employees
CREATE INDEX idx_employees_dept          ON employees(department);
CREATE INDEX idx_employees_group         ON employees(group_name);
CREATE INDEX idx_employees_manager       ON employees(reporting_manager_id);
CREATE INDEX idx_employees_active        ON employees(is_active);
CREATE INDEX idx_employees_leadership    ON employees(leadership_level);

-- Review Cycles
CREATE INDEX idx_cycles_status           ON review_cycles(status);
CREATE INDEX idx_cycles_template         ON review_cycles(template_id);

-- Questions and Templates
CREATE INDEX idx_questions_set           ON questions(set_type);
CREATE INDEX idx_questions_competency    ON questions(competency_id);
CREATE INDEX idx_templates_active        ON question_templates(is_active);
CREATE INDEX idx_template_questions_tid  ON template_questions(template_id);
CREATE INDEX idx_template_questions_qid  ON template_questions(question_id);

-- Self Feedback
CREATE INDEX idx_sf_employee_cycle       ON self_feedback(employee_id, cycle_id);
CREATE INDEX idx_sf_status               ON self_feedback(status);

-- Survey Assignments
CREATE INDEX idx_sa_employee_cycle       ON survey_assignments(employee_id, cycle_id);
CREATE INDEX idx_sa_status               ON survey_assignments(status);

-- Survey Reviewers (includes reverse lookup optimization)
CREATE INDEX idx_sr_assignment           ON survey_reviewers(assignment_id);
CREATE INDEX idx_sr_reviewer_emp         ON survey_reviewers(reviewer_employee_id);
CREATE INDEX idx_sr_reviewer_type        ON survey_reviewers(reviewer_type);
CREATE INDEX idx_sr_status               ON survey_reviewers(status);
CREATE INDEX idx_sr_completed            ON survey_reviewers(completed_at) WHERE completed_at IS NOT NULL;

-- Survey Responses
CREATE INDEX idx_resp_reviewer           ON survey_responses(reviewer_id);
CREATE INDEX idx_resp_question           ON survey_responses(question_id);

-- Calculated Scores
CREATE INDEX idx_scores_employee_cycle   ON calculated_scores(employee_id, cycle_id);

-- Notifications
CREATE INDEX idx_notif_log_recipient     ON notification_log(recipient_id);
CREATE INDEX idx_notif_log_status        ON notification_log(status);

-- Reviewer Role Config
CREATE INDEX idx_rrc_cycle               ON reviewer_role_config(cycle_id);
CREATE INDEX idx_rrc_role                ON reviewer_role_config(role);

-- Employee Mapping Uploads
CREATE INDEX idx_emu_cycle               ON employee_mapping_uploads(cycle_id);
CREATE INDEX idx_emu_status              ON employee_mapping_uploads(status);

-- Audit
CREATE INDEX idx_audit_user              ON audit_log(user_id);
CREATE INDEX idx_audit_entity            ON audit_log(entity_type, entity_id);


-- ============================================================
-- PART 7 — COMMENTS AND DOCUMENTATION
-- ============================================================
COMMENT ON TABLE question_templates IS 'Reusable question set templates that can be assigned to review cycles';
COMMENT ON TABLE template_questions IS 'Junction table mapping questions to templates';
COMMENT ON COLUMN employees.leadership_level IS '1=CXO, 2=HOD, 3=TM, 4=IC - for org hierarchy queries';
COMMENT ON COLUMN employees.org_path IS 'Materialized path from organization root to this employee';
COMMENT ON COLUMN review_cycles.template_id IS 'Question template used for this cycle (locked on creation)';
COMMENT ON COLUMN calculated_scores.reviewer_competency_breakdown IS 'Detailed scores: reviewer_type -> competency -> avg_score for granular analysis';
COMMENT ON TABLE reviewer_role_config IS 'Per-cycle, per-role reviewer count config (min, max, selected fixed count)';
COMMENT ON COLUMN reviewer_role_config.selected_count IS 'Exact number of reviewers each employee of this role must have in the cycle';
COMMENT ON COLUMN review_cycles.employee_join_date_before IS 'Filter: only include employees who joined on or before this date';
COMMENT ON COLUMN question_templates.cloned_from IS 'Source template UUID if this template was cloned from another';
COMMENT ON COLUMN question_templates.source_file_url IS 'URL/path of uploaded file used to create this template';
COMMENT ON TABLE employee_mapping_uploads IS 'Tracks CSV uploads for bulk employee-reviewer mapping per cycle';
