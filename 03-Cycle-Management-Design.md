# Review Cycle Management Module - Detailed Design Document

**Version:** 2.0
**Date:** February 2026
**Parent Document:** 01-Product-Requirements-Document.md
**Status:** Ready for Engineering Review

---

## 1. Module Overview

### 1.1 Purpose

This module enables HR Admin to create, configure, and manage review cycles through a guided wizard. A review cycle is the central orchestrating entity of the 360 Feedback Platform - it brings together employees, reviewer mappings, question templates, timelines, and visibility rules into a single time-bound feedback collection process.

### 1.2 Key Design Decisions

| Decision                                   | Detail                                                                                                              | Rationale                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| One active cycle at a time                 | Only one cycle can be in an active state across the entire organization                                             | Prevents reviewer confusion and conflicting deadlines               |
| "Same time for all" only                   | All employees in a cycle are reviewed on the same timeline                                                          | Simplifies scheduling; DOJ-based and custom flows deferred          |
| One-time cycle only                        | No recurring/frequency configuration                                                                                | Auto-recurring cycles deferred to future phase                      |
| Parallel form filling only                 | All reviewers fill forms simultaneously                                                                             | Sequential and custom filling order deferred                        |
| Admin-only nomination                      | Only HR Admin nominates/assigns all reviewers                                                                       | RM and self-nomination deferred                                     |
| Wizard-based creation                      | Cycle setup is a multi-step guided wizard                                                                           | Reduces errors, ensures all configuration is complete before launch |
| Master templates + per-cycle customization | Question templates and reviewer mapping templates exist as reusable masters; Admin selects and customizes per cycle | Saves setup time for recurring patterns while allowing flexibility  |
| Full audit trail                           | All admin actions are logged with before/after values                                                               | Accountability and dispute resolution                               |

### 1.3 Dependencies

| Module                           | Dependency             | Detail                                                              |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| User Management                  | Employee data          | Cycle participants come from active employee records                |
| Question Template Master         | Question sets          | Each group in a cycle uses a question template from the master      |
| Competency Master                | Competency definitions | Questions are mapped to competencies; scores roll up per competency |
| Rating Scale Master              | Rating options         | The 4-point rating scale applied to all questions                   |
| Reviewer Mapping Template Master | Pre-mapped assignments | Admin can import pre-configured employee-to-reviewer mappings       |
| Notifications                    | Event triggers         | Cycle state changes trigger email/Teams notifications               |
| Score Calculation                | Triggered by           | Scores calculated when form filling stage ends                      |

---

## 2. Scope

### 2.1 In Scope

- Cycle creation wizard
- Cycle CRUD with save-as-draft at any step
- Reviewer type selection and configuration (min/max limits per role group)
- Question template selection per group (from master module)
- Timeline configuration with 3 stages and exclude-weekends option
- Visibility configuration (3 phases: while filling / after filling / after publishing)
- Employee mapping with groups (IC/TM/HOD + custom)
- Per-employee bidirectional reviewer mapping (receives from / gives to)
- Import from master reviewer mapping templates (with per-cycle editing)
- Cycle state machine (Draft → Launched → Form Active → Form Closed → Published)
- Admin override: fill survey on behalf of a reviewer
- Admin override: reopen review form after closure
- Auto-advance between stages (based on configured days) + manual advance via button
- Cycle progress tracking and completion dashboard
- Cycle history

### 2.2 Out of Scope

| Item                                   | Reason                                        |
| -------------------------------------- | --------------------------------------------- |
| "Based on DOJ" review type             | Future phase                                  |
| "Create your own" review type          | Future phase                                  |
| Recurring/frequency cycles             | Future phase - only one-time cycles for now   |
| Sequential / Custom form filling order | Future phase - only parallel filling          |
| RM or Self nomination                  | Future phase - only Admin nomination          |
| Review Meeting step                    | Not in scope for Phase 1                      |
| Score calculation logic                | Separate module                               |
| Notification delivery mechanism        | Separate module (this module triggers events) |
| Report generation                      | Separate module                               |

---

## 3. Master Modules (Prerequisites)

These master modules exist independently outside of cycle creation. They are created and maintained separately, and are referenced/imported during cycle setup.

### 3.1 Question Template Master

A Question Template is a reusable package of question sets organized by role group (IC/TM/HOD). Questions are **derived from competencies** - the system auto-populates questions based on the competencies selected for each role group, and Admin can fully customize from there.

| Attribute | Detail |
| --- | --- |
| Template Name | Unique name (e.g., "2026 Standard Template", "Engineering-focused Template") |
| Description | Optional description of the template's purpose |
| Question Sets | Contains separate sets for each role group (IC, TM, HOD). Each set has its own questions. |
| Questions per Set | Each question has: question text, mapped competency (from Competency Master), order, active/inactive flag, comment enabled/disabled |
| Rating Scale | All questions in a template use the same rating scale (from Rating Scale Master, default 4-point) |
| Status | Active / Inactive |

#### 3.1.1 Template Creation Flow (Competency-Driven)

```
Step 1: Admin creates a new template (name + description)
    ↓
Step 2: For each role group (IC / TM / HOD):
    ↓
    2a. Admin selects role group (e.g., "IC")
        ↓
    2b. System auto-loads competencies applicable to that role group
        (from Competency Master, where each competency has role-group applicability)
        ↓
        Example: IC role auto-loads → Communication, Teamwork, Quality, Innovation
        ↓
    2c. For each loaded competency, system auto-populates default questions
        (each competency in the master has default questions pre-configured)
        ↓
        Example: "Communication" competency auto-loads →
            Q1: "How effectively does this person communicate ideas to the team?"
            Q2: "How well does this person listen and respond to feedback?"
        ↓
    2d. Admin can now customize:
        ├── Add/remove competencies for this role group
        ├── Add/remove/edit individual questions under any competency
        ├── Reorder questions
        ├── Enable/disable specific questions (inactive = not shown on form)
        └── Enable/disable comment field per question
    ↓
Step 3: Admin selects rating scale (default: 4-point from Rating Scale Master)
    ↓
Step 4: Save template
```

#### 3.1.2 Auto-Sync Behavior

| Scenario | What Happens |
| --- | --- |
| New competency added to Competency Master | Existing templates are NOT auto-updated. Admin must manually add the new competency to templates where needed. |
| Default questions updated in Competency Master | Existing templates retain their current questions. Only NEW templates or newly-added competencies get the updated defaults. |
| Competency deactivated in Master | Templates referencing this competency show a warning. Questions under the deactivated competency remain but are flagged for Admin review. |
| Admin adds a competency to a role group in a template | System auto-loads that competency's default questions. Admin can then customize. |

> **Design Principle:** Auto-populate is a convenience for initial setup. Once a template is created, it is independent of the master defaults. Changes in the master do NOT cascade into existing templates - this prevents unexpected changes to live or previously-used templates.

#### 3.1.3 Question Template Rules

- Multiple templates can exist simultaneously
- Only one template is selected per group per cycle
- Admin can create, edit, clone, and deactivate templates
- A template cannot be deactivated if it's in use by an active cycle
- Questions within a template are ordered; order determines display sequence on the form
- Admin can bulk import questions via CSV into a template (see Section 14)
- Each competency in the Competency Master should have: applicable role groups (IC/TM/HOD) and default questions

### 3.2 Reviewer Mapping Template Master

A Reviewer Mapping Template is a saved snapshot of employee-to-reviewer assignments that can be reused across cycles.

| Attribute          | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Template Name      | Unique name (e.g., "H1 2026 Standard Mapping", "Engineering Dept Mapping")                                    |
| Description        | Optional description                                                                                          |
| Mapping Data       | For each employee: list of reviewers with their reviewer type (Peer, Cross-functional, RM, Subordinate, etc.) |
| Bidirectional View | Each employee entry shows: "Receives reviews from" (list) and "Gives reviews to" (derived list)               |
| Status             | Active / Inactive                                                                                             |

**Rules:**

- Contains actual employee-to-reviewer assignments (specific people, not rules)
- When imported into a cycle, Admin can edit/add/remove individual assignments
- Template can be created from scratch or saved from a completed cycle's mapping
- Employees who have been deactivated since the template was created are flagged during import
- Admin can create, edit, clone, and deactivate templates

### 3.3 Competency Master

| Attribute       | Detail                                             |
| --------------- | -------------------------------------------------- |
| Competency ID   | Unique identifier (e.g., COMM, LEAD, TEAM)         |
| Competency Name | Display name (e.g., "Communication", "Leadership") |
| Description     | What this competency measures                      |
| Status          | Active / Inactive                                  |

**Rules:**

- Questions in Question Templates are mapped to competencies
- Scores roll up per competency for the employee
- Admin can CRUD competencies
- A competency cannot be deactivated if mapped to questions in an active cycle's template

### 3.4 Rating Scale Master

| Attribute  | Detail                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| Scale Name | e.g., "Standard 4-Point Impact Scale"                                                        |
| Options    | Ordered list of rating options, each with: value (numeric), label (text), description, color |
| Default    | One scale is marked as system default                                                        |

**Default Scale (from PRD):**

| Value | Label              | Color           |
| ----- | ------------------ | --------------- |
| 4     | Outstanding Impact | Green (#22C55E) |
| 3     | Significant Impact | Blue (#3B82F6)  |
| 2     | Moderate Impact    | Amber (#F59E0B) |
| 1     | Not Enough Impact  | Red (#EF4444)   |

**Rules:**

- Multiple scales can exist but only one is selected per question template
- A scale cannot be modified if in use by an active cycle
- Minimum 2 options, maximum 10 options per scale

---

## 4. Cycle Creation Wizard

The cycle creation flow is a 6-step wizard. Admin can navigate between steps freely, save as draft at any step, and complete setup only when all required steps are valid.

### 4.1 Wizard Steps Overview

```
┌──────────────────┐
│ 1. Review Cycle   │  Name, description
├──────────────────┤
│ 2. Reviewers      │  Select reviewer types, min/max per role group
├──────────────────┤
│ 3. Review Form    │  Select question template per group, rating scale, comment options
├──────────────────┤
│ 4. Timelines      │  Launch date, stage durations, exclude weekends, auto-advance
├──────────────────┤
│ 5. Visibility     │  Who sees what during filling, after filling, after publishing
├──────────────────┤
│ 6. Map Employees  │  Create groups, assign employees, map reviewers per employee
└──────────────────┘

[Save as Draft] available at every step
[Complete Setup] available only when all steps are valid
```

### 4.2 Left Sidebar Navigation

The wizard displays a left sidebar showing all 6 steps. Each step shows:

- Step name
- Validation indicator: empty circle (not started), red exclamation (incomplete/errors), green check (complete and valid)
- Admin can click any step to jump to it (non-linear navigation)

---

### 4.3 Step 1: Review Cycle

**Purpose:** Define the basic identity of the cycle.

**Fields:**

| Field             | Input Type                                | Required | Validation                              | Default |
| ----------------- | ----------------------------------------- | -------- | --------------------------------------- | ------- |
| Review Cycle Name | Text input                                | Yes      | Max 200 chars, unique across all cycles | -       |
| Description       | Text area (with "+ Add description" link) | No       | Max 2000 chars                          | -       |

**Review Type:** Fixed to "Same time for all" (no other options shown in Phase 1).

- Review happens for all employees at the same time

**Frequency:** Fixed to "One time" (no frequency selection shown in Phase 1).

**Behavior:**

- This is the simplest step - just name and optional description
- "Same time for all" means every employee in the cycle has the same timeline
- No start/end date configuration here - dates are configured in the Timelines step

---

### 4.4 Step 2: Reviewers

**Purpose:** Define which reviewer types participate in this cycle and configure nomination rules and reviewer count limits.

#### 4.4.1 Reviewer Type Selection

Admin selects which reviewer types are included in this cycle. The available reviewer types are organized into categories:

**Category: Always Included (pre-selected, can be unchecked)**

| Reviewer Type     | Description                                   |
| ----------------- | --------------------------------------------- |
| Self              | Employee reviews themselves (self-feedback)   |
| Reporting Manager | Direct reporting manager reviews the employee |

**Category: Managers (optional)**

| Reviewer Type       | Description                        |
| ------------------- | ---------------------------------- |
| Manager of Manager  | The reporting manager's manager    |
| Department Head     | Head of the employee's department  |
| Business Unit Head  | Head of the business unit          |
| Dotted Line Manager | Secondary/matrix reporting manager |

**Category: Nominated by Admin**

These reviewer types require Admin to nominate specific people (during the Nomination stage or in Map Employees step).

| Reviewer Type   | Description                                             |
| --------------- | ------------------------------------------------------- |
| Peers           | Same-level colleagues in the same department            |
| External        | Reviewers from outside the organization (e.g., clients) |
| Subordinates    | Employees who report to the person being reviewed       |
| Project Manager | Manager of a project the employee works on              |

**Category: Custom Reviewers**

Admin can add custom reviewer types beyond the defaults.

| Reviewer Type         | Description                                           |
| --------------------- | ----------------------------------------------------- |
| Cross-Functional Peer | Peers from different departments                      |
| Indirect Reportees    | Employees who report to the person's direct reports   |
| + Add Custom Reviewer | Admin can create new reviewer type with a custom name |

**"+ Add more reviewers" Action:**

- Opens a side panel showing all available reviewer types organized by category
- Admin checks/unchecks reviewer types
- Selected types appear as chips/badges in the main area
- Cancel / Save buttons

#### 4.4.2 Nomination Configuration

For each nominated reviewer type (Peers, External, Subordinates, Cross-Functional, custom), a configuration row appears:

| Column            | Description                                         |
| ----------------- | --------------------------------------------------- |
| Reviewer Type     | The reviewer type name                              |
| Who Can Nominate? | Fixed to "Performance Admin" (HR Admin) for Phase 1 |
| Min Reviewers     | Minimum number of this reviewer type per employee   |
| Max Reviewers     | Maximum number of this reviewer type per employee   |

**Min/Max Limits per Role Group:**

The min/max reviewer counts can be configured differently for each role group (IC / TM / HOD). This means:

- For an IC employee: Peers min 2, max 4
- For a TM employee: Peers min 1, max 3
- For an HOD employee: Peers min 1, max 2

| Setting        | Validation                                      |
| -------------- | ----------------------------------------------- |
| Min            | Integer >= 0                                    |
| Max            | Integer >= Min, and >= 1 if Min > 0             |
| Per role group | Admin can set different min/max for IC, TM, HOD |

**Example Configuration:**

| Reviewer Type     | IC Min/Max | TM Min/Max | HOD Min/Max |
| ----------------- | ---------- | ---------- | ----------- |
| Reporting Manager | 1 / 1      | 1 / 1      | 1 / 1       |
| Peers             | 2 / 4      | 1 / 3      | 1 / 2       |
| Cross-Functional  | 1 / 3      | 1 / 2      | 1 / 3       |
| Subordinates      | 0 / 0      | 2 / 4      | 2 / 5       |

#### 4.4.3 Worked Example: Step 2 Configuration

> **This step defines the RULES for the cycle.** No specific people are assigned here. The actual person-to-person assignments happen in Step 6 (Map Employees).

**Scenario:** HR Admin is setting up the "H1 2026 360 Review" cycle.

**Selected Reviewer Types:**

| Reviewer Type | Category | Selected |
| --- | --- | --- |
| Self | Always Included | YES |
| Reporting Manager | Always Included | YES |
| Peers | Nominated by Admin | YES |
| Cross-Functional Peer | Custom | YES |
| Subordinates | Nominated by Admin | YES |

**Configured Min/Max per Role Group:**

| Reviewer Type | IC Min | IC Max | TM Min | TM Max | HOD Min | HOD Max |
| --- | --- | --- | --- | --- | --- | --- |
| Self | 1 | 1 | 1 | 1 | 1 | 1 |
| Reporting Manager | 1 | 1 | 1 | 1 | 0 | 1 |
| Peers | 2 | 4 | 1 | 3 | 1 | 2 |
| Cross-Functional Peer | 1 | 2 | 1 | 2 | 1 | 3 |
| Subordinates | 0 | 0 | 2 | 5 | 3 | 8 |

**What this means:**
- An **IC** employee must have: 1 self review, 1 RM, 2-4 peers, 1-2 cross-functional, 0 subordinates
- A **TM** employee must have: 1 self review, 1 RM, 1-3 peers, 1-2 cross-functional, 2-5 subordinates
- An **HOD** employee must have: 1 self review, 0-1 RM, 1-2 peers, 1-3 cross-functional, 3-8 subordinates

> **What happens next:** In Step 6 (Map Employees), Admin will assign specific people to each employee. The system will validate those assignments against these min/max rules. For example, if Admin assigns only 1 peer to an IC employee, Step 6 will show a validation error: "IC employee {name} needs minimum 2 Peers (currently has 1)."

#### 4.4.4 Reviewer Step Rules

| Rule                                        | Detail                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| At least one reviewer type must be selected | Cannot proceed without selecting at least one type (besides Self)                    |
| Self is optional                            | Admin can uncheck Self to disable self-feedback for this cycle                       |
| Reporting Manager auto-populated            | If RM is selected, the system auto-maps each employee's RM from user management data |
| Custom reviewer types                       | Admin-created types behave exactly like built-in nominated types                     |
| Min/Max validation                          | System validates actual assignments against these limits during Map Employees step   |

---

### 4.5 Step 3: Review Form

**Purpose:** Select question templates for each group and configure rating/comment options.

#### 4.5.1 Question Template Selection

Each role group (IC / TM / HOD + any custom groups defined in Map Employees) needs a question template assigned.

| Field             | Input Type                               | Required | Description                                                           |
| ----------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------- |
| Group Name        | Label (read-only)                        | -        | e.g., "IC", "TM", "HOD"                                               |
| Question Template | Dropdown (from Question Template Master) | Yes      | Select which question template to use for this group                  |
| Preview           | Action link                              | -        | "View questions" opens a preview of the selected template's questions |

**Behavior:**

- Admin selects one question template per group
- The dropdown shows all active templates from the Question Template Master
- If groups haven't been defined yet in Map Employees, default groups (IC, TM, HOD) are shown
- After selecting a template, Admin can preview the questions, categories, and competency mappings
- Admin can customize the selected template for this cycle (enable/disable individual questions, reorder) without affecting the master template

#### 4.5.2 Rating Scale

| Field        | Input Type                   | Required | Description                              |
| ------------ | ---------------------------- | -------- | ---------------------------------------- |
| Rating Scale |  (from Rating Scale Master) | Yes      | Default: "Standard 4-Point Impact Scale" |

- One rating scale applies to ALL questions across ALL groups in this cycle
- Admin can preview the scale options (value, label, color)

#### 4.5.3 Comment Configuration

| Field                             | Input Type                                | Default             | Description                                                                       |
| --------------------------------- | ----------------------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| Enable comments for all questions | Toggle                                    | ON                  | When ON, every question shows an optional comment text field alongside the rating |
| Per-question comment override     | Per-question toggle (in template preview) | Inherits from above | Admin can enable/disable comments for specific questions                          |

#### 4.5.4 Review Form Step Rules

| Rule                                 | Detail                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Every group must have a template     | Cannot complete setup without a template for each defined group             |
| Questions must map to competencies   | All questions in the selected template must have a valid competency mapping |
| At least 1 active question per group | Template must have at least one active (enabled) question                   |
| Same rating scale for all            | One scale applies uniformly across the cycle                                |

---

### 4.6 Step 4: Timelines

**Purpose:** Configure when the cycle launches and how long each stage lasts.

#### 4.6.1 Launch Configuration

| Field                 | Input Type                               | Required    | Validation              | Default          |
| --------------------- | ---------------------------------------- | ----------- | ----------------------- | ---------------- |
| Tentative Launch Date | Date picker                              | Yes         | Must be today or future | Today            |
| Exclude Weekly Offs   | Checkbox                                 | No          | -                       | Unchecked        |
| Weekly Off Days       | Multi-select (shown when checkbox is ON) | Conditional | At least 1 day selected | Saturday, Sunday |

**Exclude Weekly Offs behavior:**

- When ON, weekends/selected days are excluded from the day count
- Example: 5 working days starting Monday = Mon-Fri (not Mon-Fri+Sat+Sun+Mon+Tue)
- The calendar visualization reflects excluded days

#### 4.6.2 Stage Configuration

The cycle has 2 sequential stages. Each stage has a configurable duration in days.

> **Note:** Reviewer nomination/assignment is handled entirely in Step 6 (Map Employees) before launching the cycle. In future phases, when RM/Self-nomination is supported, a "Nomination" stage will be added here before Form Submission.

**Stage 1: Review Form Submission**

| Field         | Input Type   | Default  | Description                                                                     |
| ------------- | ------------ | -------- | ------------------------------------------------------------------------------- |
| Days          | Number input | 5        | Total number of days for all reviewers to fill their forms                      |
| Filling Order | Fixed        | Parallel | "All reviewers can independently review an employee within their allotted time" |

**Parallel filling detail:** Each reviewer type gets the same time window. The panel shows:

| Reviewer Type              | Days            | Date Range                    |
| -------------------------- | --------------- | ----------------------------- |
| Self                       | (same as total) | (calculated from stage start) |
| Reporting Manager          | (same as total) | (calculated)                  |
| Peers                      | (same as total) | (calculated)                  |
| Subordinates               | (same as total) | (calculated)                  |
| _(other selected types)_ | (same as total) | (calculated)                  |

> In parallel mode, all reviewer types fill simultaneously. The "Days" column is the same for all, matching the stage duration.

**Auto-Advance Option:**

| Field                                                   | Input Type | Default   | Description                                                                                                                                                                    |
| ------------------------------------------------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Move to next stage if form is not submitted by due date | Checkbox   | Unchecked | If enabled: when the form submission deadline passes, the system automatically closes all pending forms and moves to the next stage. If disabled: Admin must manually advance. |

When this checkbox is enabled:

- Forms that are in DRAFT status are preserved but marked as "Not Submitted"
- Forms that were never started are marked as "Missed"
- A summary notification is sent to Admin showing who didn't submit

When this checkbox is disabled:

- The stage remains active until Admin manually clicks "Move to Next Stage"
- Admin gets a notification when the deadline passes but the system waits for manual action
- This gives Admin time to follow up, send reminders, or use the "Fill on Behalf" override

**Stage 2: Publish Reviews to Employees**

| Field | Input Type   | Default | Description                                                  |
| ----- | ------------ | ------- | ------------------------------------------------------------ |
| Days  | Number input | 2       | Number of days for Admin to review results before publishing |

- During this stage, the system calculates scores
- Admin reviews completion stats, score distributions, and flags
- Admin clicks "Publish" to make results visible to employees based on visibility config
- If Admin doesn't publish within the allotted days, the system sends a reminder but does NOT auto-publish (publishing is always manual)

#### 4.6.3 Calendar Visualization

The Timelines step displays a visual calendar (Gantt-chart style) showing:

| Element         | Display                                                       |
| --------------- | ------------------------------------------------------------- |
| Date range      | From launch date to final publish date                        |
| Stage bars      | Colored horizontal bars showing each stage's duration         |
| Weekend markers | Grey columns for excluded days (if exclude weekly offs is ON) |
| Total duration  | "X days to complete the review cycle (excluding Y weekoffs)"  |
| Stage labels    | Stage name on each bar with date range                        |

#### 4.6.4 Reminder Configuration

Configurable automated reminders sent to employees/reviewers with pending submissions.

| Field | Input Type | Default | Description |
| --- | --- | --- | --- |
| Enable Reminders | Toggle | ON | Whether automated reminders are sent |
| Reminder Days Before Deadline | Multi-select chips | 7, 3, 1 | Days before form submission deadline when reminders are sent |
| Available Options | Chips | 1, 2, 3, 5, 7, 10, 14, 21, 30 | Admin picks which days to send reminders |
| Max Reminders | - | 10 | Maximum 10 reminder points per cycle |

**Reminder Behavior:**

| Rule | Detail |
| --- | --- |
| Deadline reference | Reminders are calculated from the Stage 1 (Form Submission) end date |
| Recipients | Only employees/reviewers with **pending** or **in-progress** submissions receive reminders. Already submitted = no reminder. |
| Reminder content | "You have {n} pending review(s) to complete. Deadline: {date}. {X} days remaining." |
| Channels | Email + in-app notification (Teams integration if configured) |
| Sent to all | Reminders go to ALL pending reviewers + ALL employees with pending self-feedback |
| Configurable during FORM_ACTIVE | Admin can add/remove reminder days even while forms are open (only future reminders affected) |
| No duplicate sends | If a reminder was already sent for a specific day, it won't be sent again (idempotent) |
| Ad-hoc reminders | In addition to scheduled reminders, Admin can send manual reminders to specific individuals from the Progress Dashboard (throttled: max 1 per person per 24 hours) |

**Example:**
- Form submission stage ends on March 15
- Reminders configured: 7, 3, 1 days before
- System sends reminders on: March 8 (7 days), March 12 (3 days), March 14 (1 day)
- Only to people who haven't submitted yet at each reminder point

#### 4.6.5 Timeline Rules

| Rule                   | Detail                                                                           |
| ---------------------- | -------------------------------------------------------------------------------- |
| Stages are sequential  | Stage 2 starts after Stage 1 ends |
| Minimum stage duration | Stage 1 (Form Submission): 1 day minimum, Stage 2 (Publish): 1 day minimum |
| Maximum total duration | No hard limit, but warn if total exceeds 90 days                                 |
| Date recalculation     | Changing launch date or any stage duration recalculates all subsequent dates     |
| Exclude weekends       | Applied to all stages consistently                                               |
| Refresh Chart          | A "Refresh Chart" action recalculates the visualization after changes            |

---

### 4.7 Step 5: Visibility

**Purpose:** Configure who can see what at each phase of the review process. This is fully configurable per cycle.

#### 4.7.1 Visibility Phases

The visibility configuration is organized into 3 columns/phases:

| Phase                      | When it applies                                                              |
| -------------------------- | ---------------------------------------------------------------------------- |
| **While Filling**    | During Stage 2 (Form Submission) - when reviewers are actively filling forms |
| **After Filling**    | After a reviewer submits their form but before results are published         |
| **After Publishing** | After Admin publishes results (Stage 3 complete)                             |

#### 4.7.2 Configuration Per Reviewer Type

For each reviewer type selected in Step 2, Admin configures visibility in each phase:

**Phase 1: While Filling - Who can view the review form**

For each role:

| Role              | Toggle | "Can view reviews of"                         | "Share anonymously" |
| ----------------- | ------ | --------------------------------------------- | ------------------- |
| Self              | ON/OFF | N/A (own form only)                           | N/A                 |
| Reporting Manager | ON/OFF | Multi-select: Self, Peers, Subordinates, etc. | Checkbox            |
| Peers             | ON/OFF | N/A                                           | N/A                 |
| Subordinates      | ON/OFF | N/A                                           | N/A                 |
| _(other types)_ | ON/OFF | N/A                                           | N/A                 |

When "Reporting Manager" is toggled ON with "Can view reviews of: Self, Peers, Subordinates":

- The RM can see (while forms are being filled) the submitted reviews from Self, Peers, and Subordinates for their direct reports
- If "Share anonymously" is checked: RM sees the content but not the reviewer's identity

**Phase 2: After Filling - Who can view completed reviews**

Same structure as Phase 1, but applies after all forms are submitted (or the stage closes).

Additional roles may appear:

| Role                         | Toggle | "Can view reviews of"          |
| ---------------------------- | ------ | ------------------------------ |
| Self (employee)              | ON/OFF | N/A (own reviews about them)   |
| Reporting Manager            | ON/OFF | Multi-select of reviewer types |
| Manager of Manager           | ON/OFF | Multi-select of reviewer types |
| _(other configured types)_ | ON/OFF | -                              |

**Phase 3: After Publishing - Settings for Self**

| Setting                    | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| "Settings for self" button | Opens configuration for what the employee sees in their published results |

Settings include:

- Overall score: Label only / Label + numeric / Hidden
- Competency breakdown: Visible / Hidden
- Reviewer category breakdown: Visible / Hidden
- Individual comments: Visible (anonymized) / Hidden
- Comparison with department average: Visible / Hidden

> **Note:** For Reporting Manager and above, the "after filling" visibility settings carry forward to "after publishing" as well (as noted in the screenshot: "For all managers, after form filling settings will be considered after publishing as well").

#### 4.7.3 Visibility Rules

| Rule                                                 | Detail                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Anonymity is configurable                            | Unlike the PRD's fixed anonymity rules, this is now configurable per cycle. The PRD rules serve as recommended defaults. |
| Default configuration                                | On cycle creation, visibility is pre-populated with the PRD anonymity rules (Section 3.4) as defaults                    |
| At least one viewer per phase                        | At least one role must have visibility enabled in the "After Publishing" phase                                           |
| Self visibility is always available after publishing | Self employee can always see at minimum a label of their result (cannot be fully hidden)                                 |
| Admin always has full visibility                     | CXO/HR Admin can see everything regardless of configuration (implicit, not shown in UI)                                  |

#### 4.7.4 Default Visibility (Pre-populated from PRD)

| Data Point           | While Filling                | After Filling                | After Publishing                              |
| -------------------- | ---------------------------- | ---------------------------- | --------------------------------------------- |
| Reviewer identity    | Hidden from all except Admin | Hidden from all except Admin | Hidden from all except Admin                  |
| Individual responses | Hidden                       | RM can view (anonymous)      | RM can view (anonymous)                       |
| Aggregated score     | Not applicable               | RM: Label + Numeric          | Employee: Label only, RM/HOD: Label + Numeric |
| Comments             | Hidden                       | RM can view (anonymous)      | Employee: Anonymous text, RM: Anonymous text  |

---

### 4.8 Step 6: Map Employees

**Purpose:** Define employee groups, assign employees to groups, and map specific reviewers to each employee. This step is the **execution** of the rules defined in Step 2 (Reviewers).

> **How Step 2 and Step 6 connect:**
> - **Step 2** defines the rules: which reviewer types, how many per role group (min/max)
> - **Step 6** applies those rules: which specific people are in which group, and who specifically reviews whom
> - The system validates Step 6 assignments against Step 2 rules

This is the most complex step and the core of the cycle configuration.

#### 4.8.1 Multiple Groups (Default Flow)

Admin creates multiple groups representing categories of employees with different review configurations. This is the primary flow for our platform.

> **Note:** A "Same for all" option (single group) may be added in a future phase. For now, Admin always works with multiple groups.

**Page Layout:**

Each group appears as a card/section on the page:

```
┌─────────────────────────────────────────────────────────┐
│ Group: IC                                    [Delete]   │
│ Owners: [Darshi Parikh, Meetkumar Chavda]                    │
│ Question Template: [2026 IC Standard Template  ▼]       │
│ Employees in this group: 180                            │
│ [Map Employees]  [View/Edit Reviewer Mapping]           │
├─────────────────────────────────────────────────────────┤
│ Group: TM                                    [Delete]   │
│ Owners: [Meetkumar Chavda]                                   │
│ Question Template: [2026 TM Standard Template  ▼]       │
│ Employees in this group: 35                             │
│ [Map Employees]  [View/Edit Reviewer Mapping]           │
├─────────────────────────────────────────────────────────┤
│ Group: HOD                                   [Delete]   │
│ Owners: [Darshi Parikh]                                 │
│ Question Template: [2026 HOD Leadership Template  ▼]    │
│ Employees in this group: 12                             │
│ [Map Employees]  [View/Edit Reviewer Mapping]           │
└─────────────────────────────────────────────────────────┘
                    [+ Create New Group]
```

**Per Group Configuration:**

| Element | Description |
| --- | --- |
| Group Name | Text input (e.g., "HOD", "TM", "IC"). Editable. |
| Owners | Admin(s) responsible for this group (multi-select from employees). Owners can manage this group's mappings. |
| Question Template | Dropdown from Question Template Master. Each group gets its own template (overrides Step 3 selection). |
| Employees | "Map Employees" button → opens employee selection dialog |
| Reviewer Mapping | "View/Edit Reviewer Mapping" button → opens per-employee mapping screen |
| + Create new group | Button below all groups to add another |
| Delete group | Trash icon (with confirmation: "Delete group {name}? {n} employees will be unassigned.") |

**Pre-defined groups suggestion:** On first visit to this step, system auto-creates IC, TM, HOD groups based on employees' `group_name` field from User Management. Admin can rename, add, or remove groups.

#### 4.8.2 Employee Selection Dialog

Triggered by clicking "Map Employees" button for a group.

**Dialog Layout:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ Map employees                                                  [X]  │
│                                                                      │
│ [Department ▼] [Location ▼] [Business Unit ▼] [Pay Grade ▼]        │
│ [Joined On Or Before 📅] [Joined In 📅] [Job Title ▼] [Legal Entity ▼] │
│                                                                      │
│ 🔍 Search...                                   292 employees selected │
│                                                                      │
│ ☑ EMPLOYEE NUMBER  EMPLOYEE NAME          REPORTING     DEPARTMENT  │
│                                            MANAGER                   │
│ ☑ CT200903         Mitul Modesara          Amit Shingala Leadership  │
│                    Chief Operating Officer                            │
│ ☑ CT250701         Enyinnaya Uduma         Bhasker N.   Sales       │
│                    Channel Sales Manager                             │
│ ☑ FMT170103        Kevin Gardhariya        Amit Patel   Development │
│                    Front-End Lead                                     │
│ ☑ FMT170801        Utsav Kakadiya          Ashish D.    Development │
│                    Technical Lead                                     │
│ ☐ FMT190102        Darshi Parikh           Kshama Patel HR          │
│                    HR Manager              (Already in: HOD)         │
│                                                                      │
│                               [Cancel]  [Save]                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Filters:**

| Filter | Type | Description |
| --- | --- | --- |
| Department | Multi-select dropdown | Filter by department(s) |
| Location | Multi-select dropdown | Filter by office location |
| Business Unit | Multi-select dropdown | Filter by BU |
| Pay Grade | Multi-select dropdown | Filter by pay grade |
| Joined On Or Before | Date picker | Employees who joined on or before this date |
| Joined In | Month/Year picker | Employees who joined in this month/year |
| Job Title | Multi-select dropdown | Filter by designation |
| Legal Entity | Multi-select dropdown | Filter by legal entity |

**Filter Behavior:**
- Filters are cumulative (AND logic)
- Changing a filter immediately updates the employee list
- Only active employees are shown
- Count of selected employees updates in real-time

**Rules:**
- An employee can only belong to ONE group in a cycle
- If an employee is already assigned to another group, they appear greyed out with a note: "Already in group: {group_name}"
- Employee's `group_name` from User Management (IC/TM/HOD/CXO) is shown as a reference column but does NOT restrict which group they can be placed in
- Select All checkbox applies to currently filtered/visible employees only

#### 4.8.3 Per-Employee Reviewer Mapping

After employees are assigned to a group, Admin maps specific reviewers to each employee. This screen is accessed via "View/Edit Reviewer Mapping" button on the group card.

**Mapping Screen Layout:**

The screen shows a list of all employees in the group. Admin can click on any employee to expand their reviewer mapping.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Reviewer Mapping - Group: IC (180 employees)                           │
│                                                                         │
│ 🔍 Search employees...          Validation: ✅ 165 valid  ⚠ 12 warnings  ❌ 3 errors │
│                                                                         │
│ [Import from Template]  [Save as Template]  [Bulk Import from Excel]   │
│                                                                         │
│ EMPLOYEE          DEPT          RM         PEERS  CROSS   SUBS  STATUS │
│                                            (2-4)  (1-2)   (0)         │
│ ─────────────────────────────────────────────────────────────────────── │
│ ▶ Kevin Gardhariya  Development  Amit P.    3/2-4  1/1-2  0/0   ✅    │
│ ▼ Utsav Kakadiya    Development  Ashish D.  2/2-4  1/1-2  0/0   ✅    │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │ Tab: [Receives Reviews From]  [Gives Reviews To]               │  │
│   │                                                                 │  │
│   │ RECEIVES REVIEWS FROM:                                          │  │
│   │ ┌──────────────────┬───────────────────┬─────────────┬───────┐  │  │
│   │ │ Reviewer         │ Type              │ Department  │ Action│  │  │
│   │ ├──────────────────┼───────────────────┼─────────────┼───────┤  │  │
│   │ │ 👤 Utsav (Self)  │ Self              │ -           │ auto  │  │  │
│   │ │ Ashish Dhamelia  │ Reporting Manager │ Development │ auto  │  │  │
│   │ │ Raj Patel        │ Peer              │ Development │ [✕]   │  │  │
│   │ │ Ankur Suthar     │ Peer              │ DevOps      │ [✕]   │  │  │
│   │ │ Priya Sharma     │ Cross-Functional  │ Product     │ [✕]   │  │  │
│   │ └──────────────────┴───────────────────┴─────────────┴───────┘  │  │
│   │ [+ Add Reviewer]                                                │  │
│   │                                                                 │  │
│   │ Validation: Peers 2/2-4 ✅  Cross-Functional 1/1-2 ✅          │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│ ▶ Vaibhav Prajapati Development  Ashish D.  1/2-4  0/1-2  0/0   ❌    │
│   ⚠ Needs 1 more Peer (min 2), Needs 1 Cross-Functional (min 1)       │
│ ▶ Ankur Suthar      DevOps       Ashish D.  2/2-4  2/1-2  0/0   ✅    │
│ ...                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Employee List Columns:**

| Column | Description |
| --- | --- |
| Employee | Name + designation |
| Department | Department name |
| RM | Reporting Manager name (auto-assigned) |
| Peers (min-max) | Current count / configured min-max from Step 2. E.g., "3/2-4" means 3 assigned, min 2 max 4 |
| Cross (min-max) | Same for Cross-Functional |
| Subs (min-max) | Same for Subordinates (shown as 0/0 for IC since Step 2 says IC min=0 max=0) |
| Status | Green check (valid), yellow warning, red error based on min/max validation |

**Expanded Employee - Two Tab Views:**

**Tab 1: "Receives Reviews From" (Inbound - Editable)**

Shows all reviewers assigned TO this employee. This is the primary editing view.

| Column | Description |
| --- | --- |
| Reviewer | Reviewer's name (+ avatar/initial) |
| Type | Reviewer type: Self, Reporting Manager, Peer, Cross-Functional, Subordinate, etc. |
| Department | Reviewer's department |
| Action | "auto" badge (for auto-assigned types like Self, RM) OR [X] remove button (for manually assigned) |

- Self row: always present if Self is enabled in Step 2, shows the employee themselves, tagged "auto"
- RM row: auto-populated from User Management, tagged "auto". Admin can remove and reassign if needed.
- Other rows: manually added by Admin via "+ Add Reviewer" button

**Tab 2: "Gives Reviews To" (Outbound - Read-only, Derived)**

Shows all employees that THIS person is assigned to review. This view is NOT directly editable - it is automatically derived from all other employees' "Receives from" mappings.

| Column | Description |
| --- | --- |
| Employee Being Reviewed | Name + designation of the employee being reviewed |
| Role as Reviewer | What type this person serves as: Peer, Cross-Functional, RM, Subordinate, etc. |
| Group | Which group the reviewed employee belongs to (IC/TM/HOD) |
| Department | Department of the employee being reviewed |

**Example for Darshi Parikh (IC group):**

Tab 1 - Receives Reviews From:
| Reviewer | Type | Department | Action |
| --- | --- | --- | --- |
| Darshi (Self) | Self | HR | auto |
| Kshama Patel | Reporting Manager | HR | auto |
| Meetkumar Chavda | Peer | HR | [X] |
| Ravi Mehta | Peer | HR | [X] |
| Priya Shah | Cross-Functional | Engineering | [X] |

Tab 2 - Gives Reviews To:
| Employee Being Reviewed | Darshi's Role | Group | Department |
| --- | --- | --- | --- |
| Meetkumar Chavda | Peer | IC | HR |
| Kshama Patel | Subordinate | TM | HR |
| Amit Shingala | Cross-Functional | HOD | Leadership |

> **Why both views matter:**
> - **Tab 1 (Receives)** answers: "Who is evaluating Darshi?" → This determines Darshi's review quality and coverage
> - **Tab 2 (Gives)** answers: "How many reviews does Darshi need to fill?" → This helps Admin balance workload. If Darshi is reviewer for 15 people, that's a heavy load.

**"+ Add Reviewer" Flow:**

| Step | Action |
| --- | --- |
| 1 | Admin clicks "+ Add Reviewer" on an employee's expanded view |
| 2 | A dialog opens with: search bar, employee list, and a "Reviewer Type" dropdown |
| 3 | Admin searches for a person, selects them, picks the type (Peer / Cross-Functional / etc.) |
| 4 | System validates: not self, not duplicate, reviewer type is enabled in Step 2 |
| 5 | Reviewer is added to the employee's "Receives from" list |
| 6 | The added reviewer's "Gives to" tab automatically updates to reflect the new assignment |

**Auto-Assignment Rules:**

| Reviewer Type | Auto-Assignment |
| --- | --- |
| Self | Auto-included for every employee if "Self" is selected in Step 2. Cannot be removed. |
| Reporting Manager | Auto-populated from User Management `reporting_manager_id`. Admin can remove and reassign a different person. |
| Manager of Manager | Auto-populated by following the reporting chain up 2 levels. |
| Department Head | Auto-populated based on employee's department + who has group_name = HOD in that department. |
| Peers, Cross-Functional, Subordinates, Custom | Must be manually assigned by Admin OR imported from a mapping template. |

#### 4.8.6 Importing from Reviewer Mapping Template

Admin can import a pre-configured mapping template instead of mapping from scratch.

**Flow:**

```
Admin clicks "Import from Template"
    ↓
Dialog shows available templates from Reviewer Mapping Template Master:
    ├── Template Name
    ├── Description
    ├── Employee count
    ├── Last used in cycle: {name}
    └── Created/Updated date
    ↓
Admin selects a template
    ↓
System shows conflict resolution (if mappings already exist):
    "Some employees already have reviewer mappings. How should we handle conflicts?"
    ├── ( ) Replace all existing mappings with template data
    ├── ( ) Merge: keep existing mappings, add only missing ones from template
    └── ( ) Cancel import
    ↓
System imports and shows summary:
    ┌────────────────────────────────────────────────────┐
    │ Import Summary                                     │
    │                                                    │
    │ ✅ Matched & imported: 165 employees               │
    │ ⚠  Reviewer deactivated (skipped): 4 assignments  │
    │ ⚠  Employee not in cycle: 12 (skipped)            │
    │ ❌ New employees not in template: 8 (need mapping) │
    │                                                    │
    │ [View Details]  [OK]                               │
    └────────────────────────────────────────────────────┘
    ↓
Admin can now freely edit ALL imported mappings
(add/remove reviewers, change types, adjust as needed)
```

**Import Rules:**

| Rule | Detail |
| --- | --- |
| Matching by Employee ID | Template employees matched to cycle employees by their ID |
| Deactivated reviewers | If a reviewer in the template has been deactivated, that assignment is skipped with a warning |
| Employees not in cycle | If the template has employees not mapped to this cycle group, they are ignored |
| New employees | Employees in the cycle but not in the template are listed as "Unmapped - needs reviewer assignment" |
| Editable after import | All imported mappings are fully editable. Changes do NOT affect the source template. |
| Source template unaffected | The original template is never modified by cycle-level edits |

#### 4.8.7 Saving Mapping as Template

After completing or modifying the mapping, Admin can save the current state as a new template for future reuse.

**Important clarification:** When Admin imports a template and then makes changes in this cycle, those changes live ONLY in the cycle. The original template is untouched. If Admin wants to preserve the modified version, they must explicitly save it as a new template.

**Flow:**

```
Admin clicks "Save as Mapping Template"
    ↓
Dialog:
    ┌────────────────────────────────────────────────┐
    │ Save Current Mapping as Template               │
    │                                                │
    │ Template Name: [________________________]      │
    │ Description:   [________________________]      │
    │                                                │
    │ ℹ This will save a snapshot of the current     │
    │   reviewer mappings for this group ({n}        │
    │   employees, {m} total assignments).           │
    │                                                │
    │ ℹ This does NOT affect the current cycle.      │
    │   The template is saved independently for      │
    │   future use.                                  │
    │                                                │
    │ [Cancel]  [Save Template]                      │
    └────────────────────────────────────────────────┘
```

**Rules:**
- Template name must be unique across all mapping templates
- Saves current employee-reviewer mappings as-is (including any modifications made after import)
- The template is available immediately for future cycles
- Does not affect the current cycle in any way (it's a copy/snapshot)
- Admin can save as template at any point during mapping (even if validation errors exist - template can have incomplete mappings)

#### 4.8.8 Data Flow: Template vs Cycle Mapping

```
┌──────────────────────┐
│ Mapping Template     │──── Import ────►┌──────────────────────────┐
│ Master               │                 │ Cycle-Specific Mapping   │
│ (Reusable, stored    │                 │ (Lives only in this      │
│  independently)      │     ◄── Save ───│  cycle, fully editable)  │
│                      │    as Template   │                          │
│ "H1 2026 Mapping"   │                 │ Changes here do NOT      │
│ "Eng Dept Standard"  │                 │ affect the source        │
│ "Modified H1 v2"     │                 │ template                 │
└──────────────────────┘                 └──────────────────────────┘
```

**Example Scenario:**
1. Admin imports "H1 2026 Mapping" template into current cycle
2. Admin adds 3 new employees and removes 2 outdated reviewers
3. These changes are saved in the cycle mapping only
4. Admin clicks "Save as Template" → saves as "H1 2026 Mapping v2"
5. Now both templates exist: original "H1 2026 Mapping" (unchanged) and new "H1 2026 Mapping v2" (with modifications)
6. Next cycle, Admin can import either version

#### 4.8.8 Map Employees Validation Rules

| Rule                                      | Detail                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Every group must have at least 1 employee | Empty groups are not allowed                                                                   |
| No employee in multiple groups            | An employee can only belong to one group per cycle                                             |
| Reviewer count validation                 | Each employee's reviewer count per type must be within the min/max configured in Step 2        |
| Self-review prevention                    | An employee cannot be assigned as their own reviewer (system auto-prevents)                    |
| Reviewer must be active                   | Only active employees can be assigned as reviewers                                             |
| Every employee needs at least 1 reviewer  | If colleague feedback is enabled, each employee must have at least one non-self reviewer       |
| Reviewer workload warning                 | If a person is assigned as reviewer for more than 10 employees, show a warning (not a blocker) |

---

## 5. Cycle States and Lifecycle

### 5.1 State Machine

```
┌─────────┐                   ┌────────────┐                  ┌─────────────────┐
│  DRAFT   │───[Complete]────►│  LAUNCHED   │──[Admin opens]──►│  FORM ACTIVE     │
│          │    Setup          │  (Visible)  │   forms          │  (Filling in     │
└─────────┘                   └────────────┘                  │   progress)      │
                                                              └─────────────────┘
                                                                     │
                                                               Stage days expire
                                                               or Admin closes
                                                                     ▼
┌─────────────┐               ┌──────────────┐
│  PUBLISHED   │◄──[Admin]────│  FORM CLOSED  │
│  (Results    │   Publishes   │  (Scores     │
│   visible)   │              │   calculated) │
└─────────────┘               └──────────────┘
```

**5 states for Phase 1.** Reviewer assignment/nomination is fully handled by Admin during wizard setup (Step 6: Map Employees) before launching the cycle.

> **Future Compatibility:** When RM/Self-nomination is introduced, a **NOMINATION_ACTIVE** state will be inserted between LAUNCHED and FORM_ACTIVE. The current architecture supports this cleanly - LAUNCHED will transition to NOMINATION_ACTIVE instead of FORM_ACTIVE, and all downstream states remain unchanged.

### 5.2 State Definitions

| State | Description | Entry | What Happens | What's Allowed |
| --- | --- | --- | --- | --- |
| **DRAFT** | Cycle is being configured via wizard. Not visible to employees. | Admin creates cycle (or saves wizard as draft) | Nothing - cycle is being set up | Edit all settings, delete cycle, save as draft |
| **LAUNCHED** | Cycle setup is complete. Visible to employees as "upcoming". Admin can still adjust reviewer mappings before opening forms. | Admin clicks "Complete Setup" | Employees see a notification that a review cycle is starting. No forms are available yet. Admin uses this window to verify/adjust reviewer mappings if needed. | Admin can edit reviewer mappings, timeline, visibility. Employees can view cycle info only. |
| **FORM_ACTIVE** | Forms are live. Reviewers fill surveys in parallel. | Launch date is reached + Admin clicks "Open Forms" (manual) OR auto-transition on launch date (if configured) | All mapped reviewers receive their forms via email. Form filling is open for the configured number of days. | Reviewers fill forms, save drafts, submit. Admin monitors progress, sends reminders. |
| **FORM_CLOSED** | Form filling period ended. No more submissions. Scores being calculated. | Form filling days expire + auto-advance is ON (automatic) OR Admin clicks "Close Forms" (manual) | Pending forms are marked as Not Submitted / Missed. Score calculation triggers. | Admin reviews results, uses overrides (fill on behalf, reopen individual forms). Admin prepares to publish. |
| **PUBLISHED** | Results visible to employees per visibility configuration. | Admin clicks "Publish Results" (always manual) | Employees can see their 360 results based on visibility config. Notifications sent. | View results, generate reports. No further edits to data. |

### 5.3 Transition Rules

| From | To | Trigger | Conditions |
| --- | --- | --- | --- |
| DRAFT | LAUNCHED | Admin clicks "Complete Setup" | All 6 wizard steps valid, no validation errors |
| LAUNCHED | FORM_ACTIVE | Launch date reached + Admin clicks "Open Forms" OR auto-transition on launch date | Launch date is today or past, reviewer mappings meet min/max requirements |
| FORM_ACTIVE | FORM_CLOSED | Form filling days expire + auto-advance ON (auto) OR Admin clicks "Close Forms" (manual) | N/A (always allowed) |
| FORM_CLOSED | PUBLISHED | Admin clicks "Publish" (always manual) | Score calculation complete, no pending reopened forms |

### 5.4 Auto-Advance vs Manual Advance

| Transition | Auto Behavior | Manual Behavior |
| --- | --- | --- |
| LAUNCHED → FORM_ACTIVE | System auto-transitions on launch date (if "auto-open forms on launch date" is ON in timeline config) | Admin clicks "Open Forms" to open at any time after launch |
| FORM_ACTIVE → FORM_CLOSED | Only if "Move to next stage if form is not submitted by due date" checkbox is ON | Admin clicks "Close Forms" |
| FORM_CLOSED → PUBLISHED | Never auto (publishing is always manual) | Admin clicks "Publish Results" |

### 5.5 Overlap Prevention

| Rule | Detail |
| --- | --- |
| One active cycle | Only one cycle can be in LAUNCHED, FORM_ACTIVE, or FORM_CLOSED state at any time |
| Multiple drafts allowed | Multiple DRAFT cycles can exist simultaneously |
| Multiple published allowed | Multiple PUBLISHED cycles can exist (historical data) |
| Activation check | When Admin completes setup, system checks: "No other cycle is currently active. Proceed?" If another cycle is active: "Cannot launch. Cycle '{name}' is currently in {state}." |

### 5.6 What Happens to Incomplete Submissions on Form Close

| Scenario                                       | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Self-feedback in DRAFT                         | Marked as "Not Submitted". Draft data preserved but not scored.   |
| Self-feedback never started                    | Marked as "Missed". Self-score = NULL.                            |
| Reviewer survey PENDING (never started)        | Marked as "Missed". Not counted in score.                         |
| Reviewer survey IN_PROGRESS (partially filled) | Marked as "Not Submitted". Partial data preserved but not scored. |
| Employee with zero completed reviewers         | colleague_score = NULL, final_label = "Insufficient Data"         |

---

## 6. Admin Override Workflows

These are privileged actions available in the **FORM_CLOSED** state. They bypass normal submission rules, require justification, and are fully audited.

### 6.1 Fill Survey on Behalf of a Reviewer

**Purpose:** Admin completes a survey on behalf of a reviewer who cannot complete it themselves.

**When Available:** FORM_CLOSED state only.

**Access:** Admin navigates to Cycle → Progress → Pending Submissions → selects a missed/not-submitted reviewer.

**Workflow:**

```
Step 1: Select Reviewer
    Admin selects a reviewer with status MISSED or NOT_SUBMITTED
    System shows: Reviewer name, type, employee being reviewed, question set

Step 2: Provide Justification
    ┌──────────────────────────────────────┐
    │ Fill Survey on Behalf                │
    │                                      │
    │ Reviewer: {name} ({type})            │
    │ Reviewing: {employee_name}           │
    │                                      │
    │ Reason: [Dropdown]                   │
    │   ├── Employee on extended leave     │
    │   ├── Employee unresponsive          │
    │   ├── Employee left organization     │
    │   ├── Technical issue                │
    │   └── Other                          │
    │                                      │
    │ Additional Notes: [Text area]        │
    │ (Required if "Other")               │
    │                                      │
    │ [Cancel] [Proceed to Survey]         │
    └──────────────────────────────────────┘

Step 3: Fill the Survey
    Admin sees the same form the reviewer would see:
    - Confidentiality notice (modified): "You are filling this survey on behalf of {reviewer_name}"
    - All questions from the applicable question template
    - Rating scale for each question
    - Comment field (if enabled)
    Admin can save as draft and return later

Step 4: Submit Confirmation
    "Submit survey on behalf of {reviewer_name} for {employee_name}?
     Reason: {reason}
     This action is permanently logged and cannot be undone."
    [Cancel] [Confirm & Submit]

Step 5: Processing
    - Survey responses saved
    - Reviewer status updated to COMPLETED
    - Scores recalculated for the subject employee
    - Audit log entry created with full details
```

**Business Rules:**

| Rule                        | Detail                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Admin cannot be the subject | Admin cannot fill on behalf for a survey where they themselves are the employee being reviewed                 |
| One submission only         | Once filled on behalf, cannot be re-done for the same reviewer-subject pair                                    |
| Scores recalculated         | Subject employee's scores are automatically recalculated after submission                                      |
| Not visible to employee     | The fact that this was filled by Admin is recorded in audit log but NOT shown to the employee in their results |
| Draft support               | Admin can save progress and return later                                                                       |

### 6.2 Reopen Review Form After Closure

**Purpose:** Admin reopens the survey submission window for specific reviewer(s) after forms have been closed.

**When Available:** FORM_CLOSED state only.

**Individual Reopen Only:** Admin can reopen the form for ONE specific reviewer at a time. If multiple reviewers need reopening, Admin must perform the reopen action individually for each one (ensuring deliberate, audited decisions per reviewer).

**Workflow:**

```
Step 1: Select Reviewer
    Admin navigates to Pending Submissions list → selects a specific reviewer
    with MISSED or NOT_SUBMITTED status → clicks "Reopen Form"

Step 2: Configure Reopen
    ┌──────────────────────────────────────┐
    │ Reopen Survey Form                   │
    │                                      │
    │ Reviewer: {name} ({type})            │
    │ Reviewing: {employee_name}           │
    │ Current Status: {MISSED/NOT_SUBMITTED}│
    │                                      │
    │ Reopen Deadline: [Date picker]       │
    │   (Max 14 days from today)           │
    │                                      │
    │ Reason: [Dropdown]                   │
    │   ├── Reviewer was on leave          │
    │   ├── Technical issue                │
    │   ├── Reviewer requested extension   │
    │   ├── Insufficient coverage          │
    │   └── Other                          │
    │                                      │
    │ Additional Notes: [Text area]        │
    │ (Required if "Other")               │
    │ Notify Reviewer: [Checkbox, ON]      │
    │                                      │
    │ [Cancel] [Reopen]                    │
    └──────────────────────────────────────┘

Step 3: Processing
    - Reviewer status changes back to PENDING
    - Reopen deadline is set on this specific reviewer record
    - If notify is ON: reviewer gets email/Teams notification with new deadline
    - Audit log entry created with: admin ID, reviewer ID, subject employee,
      reason, notes, new deadline, reopen count
```

**Reopen Business Rules:**

| Rule                       | Detail                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Maximum reopen deadline    | 14 calendar days from today                                                                            |
| Reopen count limit         | A reviewer can be reopened maximum 2 times. After that, Admin must use "Fill on Behalf".               |
| After reopen deadline      | If reviewer still hasn't submitted by the reopen deadline, status auto-reverts to MISSED               |
| Scores recalculated        | When a reopened reviewer submits, scores for the subject employee are automatically recalculated       |
| Publish blocked            | Cannot publish results while any reopened reviewers have pending submissions (deadline not yet passed) |
| Cycle stays in FORM_CLOSED | The cycle state does NOT change during reopens                                                         |
| Notification               | Reopen notification clearly states the new deadline and that this is a reopened form                   |

---

## 7. Cycle Progress Dashboard

**Available in:** FORM_ACTIVE, FORM_CLOSED, PUBLISHED states.

**Location:** Cycle Detail → Progress tab.

### 7.1 Overall Metrics

| Metric                   | Display                                            |
| ------------------------ | -------------------------------------------------- |
| Current Stage            | Badge showing current state + "Day X of Y"         |
| Days Remaining           | Countdown for current stage                        |
| Self-Feedback Completion | Progress bar: {submitted} / {total eligible} ({%}) |
| Survey Completion        | Progress bar: {completed} / {total assigned} ({%}) |
| Full Coverage            | Employees where ALL assigned reviewers submitted   |
| Partial Coverage         | Employees where SOME reviewers submitted           |
| No Coverage              | Employees where ZERO reviewers submitted           |

### 7.2 Department Breakdown

| Column              | Description                                 |
| ------------------- | ------------------------------------------- |
| Department          | Department name                             |
| Employee Count      | Employees in this department for this cycle |
| Self-Feedback %     | Completion percentage                       |
| Survey Completion % | Completion percentage                       |
| Status              | On Track / At Risk / Behind                 |

**Status Calculation:**

- **On Track:** Completion % >= (days elapsed / total days) * 100
- **At Risk:** 10-25% below expected linear progress
- **Behind:** More than 25% below expected progress

### 7.3 Pending Submissions List

Filterable table of all incomplete items:

| Column        | Description                            |
| ------------- | -------------------------------------- |
| Employee      | Who needs to act                       |
| Type          | Self-Feedback / Survey                 |
| Reviewing     | Employee being reviewed (for surveys)  |
| Reviewer Type | Peer / RM / etc.                       |
| Status        | PENDING / IN_PROGRESS / DRAFT          |
| Last Activity | Last save timestamp or "Never started" |

**Actions per item:**

- Send Reminder (in FORM_ACTIVE state)
- Fill on Behalf (in FORM_CLOSED state)
- Reopen (in FORM_CLOSED state)

---

## 8. Business Rules Summary

### 8.1 Cycle Creation Rules

| ID    | Rule                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------- |
| CC-01 | Cycle name must be unique across all cycles                                                     |
| CC-02 | At least one feedback type must be enabled (Self or Colleague)                                  |
| CC-03 | All wizard steps must be valid to complete setup                                               |
| CC-04 | Every employee group must have a question template assigned                                     |
| CC-05 | Every employee must have reviewers meeting min/max requirements (if colleague feedback enabled) |
| CC-06 | An employee cannot be in multiple groups in the same cycle                                      |
| CC-07 | An employee cannot be their own reviewer                                                        |
| CC-08 | Only active employees can be participants or reviewers                                          |

### 8.2 Cycle Activation Rules

| ID    | Rule                                                                  |
| ----- | --------------------------------------------------------------------- |
| CA-01 | Only one cycle can be in a non-DRAFT, non-PUBLISHED state at any time |
| CA-02 | Launch date must be today or future at activation time                |
| CA-03 | At least one active question per question set per group               |
| CA-04 | Active employees must exist in the mapped groups                      |
| CA-05 | Completing setup is irreversible - cannot go back to DRAFT            |

### 8.3 Stage Transition Rules

| ID    | Rule                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| ST-01 | Stages follow strict sequential order: Form Active → Form Closed → Published |
| ST-02 | No stage can be skipped |
| ST-03 | No backward transitions                                                                                              |
| ST-04 | Auto-advance triggers only if configured ("Move to next stage" checkbox) for form filling; always manual for publish |
| ST-05 | Manual advance is always available for any stage (Admin can advance early)                                           |
| ST-06 | Publishing is ALWAYS manual - never auto-triggered                                                                   |

### 8.4 Form Filling Rules

| ID    | Rule                                                                                    |
| ----- | --------------------------------------------------------------------------------------- |
| FF-01 | All reviewers fill forms in parallel during Stage 2                                     |
| FF-02 | A reviewer can save draft multiple times before final submission                        |
| FF-03 | Once submitted, a form cannot be edited by the reviewer                                 |
| FF-04 | All questions must be rated before submission (no partial submissions)                  |
| FF-05 | Comments are optional (unless specifically marked as required in the question template) |
| FF-06 | Reviewer sees a confidentiality notice before starting the form                         |
| FF-07 | Reviewer sees a confidentiality reminder after submission                               |
| FF-08 | Forms are accessible only during FORM_ACTIVE state (and FORM_CLOSED for reopened forms) |

### 8.5 Admin Override Rules

| ID    | Rule                                                                          |
| ----- | ----------------------------------------------------------------------------- |
| AO-01 | Fill on Behalf: available only in FORM_CLOSED state                           |
| AO-02 | Fill on Behalf: requires justification (reason + optional notes)              |
| AO-03 | Fill on Behalf: Admin cannot fill for a survey where they are the subject     |
| AO-04 | Fill on Behalf: one submission per reviewer-subject pair                      |
| AO-05 | Fill on Behalf: triggers score recalculation                                  |
| AO-06 | Reopen: available only in FORM_CLOSED state                                   |
| AO-07 | Reopen: deadline max 14 days from today                                       |
| AO-08 | Reopen: max 2 reopens per reviewer                                            |
| AO-09 | Reopen: blocks publish until all reopened reviewers submit or deadline passes |
| AO-10 | Reopen: missed reopened reviewers auto-revert to MISSED                       |
| AO-11 | Both overrides: fully audited with admin ID, reason, and timestamp            |

### 8.6 Visibility Rules

| ID    | Rule                                                                                  |
| ----- | ------------------------------------------------------------------------------------- |
| VR-01 | Visibility is configurable per cycle across 3 phases                                  |
| VR-02 | PRD anonymity rules are loaded as defaults but can be adjusted                        |
| VR-03 | Admin always has full visibility (implicit)                                           |
| VR-04 | Employee must be able to see at minimum their overall label after publishing          |
| VR-05 | "Share anonymously" means reviewer content is visible but reviewer identity is hidden |
| VR-06 | Manager's "after filling" settings carry forward to "after publishing" as well        |

---

## 9. Edit and Delete Rules

### 9.1 What Can Be Edited After Setup

| Field / Setting             | DRAFT | LAUNCHED | FORM_ACTIVE     | FORM_CLOSED     | PUBLISHED |
| --------------------------- | ----- | -------- | --------------- | --------------- | --------- |
| Cycle Name                  | YES   | YES      | NO              | NO              | NO        |
| Description                 | YES   | YES      | YES             | NO              | NO        |
| Reviewer Types              | YES   | YES      | NO              | NO              | NO        |
| Min/Max Limits              | YES   | YES      | NO              | NO              | NO        |
| Question Templates          | YES   | YES      | NO              | NO              | NO        |
| Timeline Dates/Days         | YES   | YES      | YES (remaining) | NO              | NO        |
| Visibility Config           | YES   | YES      | YES             | YES             | NO        |
| Employee Mapping            | YES   | YES      | NO              | NO              | NO        |
| Reviewer Mapping            | YES   | YES      | NO              | NO              | NO        |
| Add new reviewers mid-cycle | -     | -        | YES             | NO (use Reopen) | NO        |
| Remove unstarted reviewers  | -     | -        | YES             | NO              | NO        |

### 9.2 Delete Rules

| Rule                        | Detail                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| DRAFT cycles                | Can be deleted (hard delete). Confirmation required.                                                                            |
| LAUNCHED cycles             | Can be cancelled (soft delete). Requires confirmation. Audit logged. All notifications recalled.                                |
| Active cycles (FORM_ACTIVE+) | Cannot be deleted. Must complete the cycle or Admin can "Abort Cycle" (with full justification, audit trail, and confirmation). |
| PUBLISHED cycles            | Cannot be deleted. Historical data preserved permanently.                                                                       |

---

## 10. Notifications Triggered by Cycle Events

This module triggers notification events. The actual delivery is handled by the Notifications module.

| Event                       | Recipients                                | When                                    |
| --------------------------- | ----------------------------------------- | --------------------------------------- |
| Cycle Launched              | All mapped employees                      | On LAUNCHED state                       |
| Nomination Started          | Admin (confirmation)                      | On NOMINATION_ACTIVE state              |
| Forms Opened                | All mapped reviewers                      | On FORM_ACTIVE state                    |
| Reminder: X days left       | Pending reviewers / pending self-feedback | Per reminder schedule                   |
| Forms Closing Soon          | Pending reviewers                         | 1 day before form close                 |
| Forms Closed                | All employees                             | On FORM_CLOSED state                    |
| Reopened Form               | Specific reviewer(s)                      | On reopen action                        |
| Results Published           | All employees                             | On PUBLISHED state                      |
| Admin: Low Completion       | Admin                                     | When completion is "Behind" threshold   |
| Admin: Forms Closed Summary | Admin                                     | On form close (shows who didn't submit) |

---

## 11. Edge Cases & Special Scenarios

### 11.1 Employee Added After Cycle is Launched

| Consideration      | Handling                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| Before FORM_ACTIVE | Admin can add the employee to a group and map reviewers. They are included normally.                         |
| During FORM_ACTIVE | Admin can add the employee and assign reviewers. Reviewers receive forms immediately for the remaining time. |
| After FORM_CLOSED  | Cannot add. Employee is not included in this cycle.                                                          |

### 11.2 Employee Deactivated Mid-Cycle

| Consideration              | Handling                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Blocked by User Management | User Management blocks deactivation if employee has active cycle participation (as defined in User Management doc) |
| Admin must first           | Remove the employee from the cycle (if in LAUNCHED state), or wait for cycle to complete |

### 11.3 Reviewer Count Below Minimum After Form Close

| Consideration     | Handling                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- |
| Example           | Employee needs min 2 Peers, but only 1 submitted                                       |
| Score Calculation | Score is calculated with available data. No blocking.                                  |
| Admin Warning     | Progress dashboard shows: "{n} employees have fewer reviewers than configured minimum" |
| Admin Options     | Use "Fill on Behalf" or "Reopen" to add more reviews                                   |

### 11.4 All Reviewers Miss for an Employee

| Consideration | Handling                                                  |
| ------------- | --------------------------------------------------------- |
| Score         | colleague_score = NULL, final_label = "Insufficient Data" |
| Employee View | "Results not available - insufficient reviewer data"      |
| Admin View    | Flagged in progress dashboard as "No Coverage"            |

### 11.5 Admin Tries to Publish with Reopened Pending Reviewers

| Handling   | Detail                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Blocked    | "Cannot publish. {n} reopened reviewer(s) have pending submissions. Wait for deadlines to pass or use 'Fill on Behalf'." |
| Resolution | Admin waits for deadlines (auto-MISSED) or fills on behalf                                                               |

### 11.6 Launch Date in the Past

| Handling                                                  | Detail                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| If Admin completes setup after the configured launch date | System asks: "Launch date {date} has passed. The cycle will start immediately. Proceed?" |
| If confirmed                                              | Cycle goes directly to NOMINATION_ACTIVE (skipping LAUNCHED wait period)                 |

### 11.7 Stage Duration Changed Mid-Cycle

| Handling              | Detail                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Remaining stages only | Admin can only change durations for stages that haven't started yet                       |
| Calendar recalculated | All future dates shift accordingly                                                        |
| Notifications         | Updated deadlines reflected in future reminders (already-sent reminders are not recalled) |

### 11.8 Zero Employees Mapped

| Handling | Detail                                                                                        |
| -------- | --------------------------------------------------------------------------------------------- |
| Blocked  | Cannot complete setup. Step 6 shows validation error: "Map at least one employee to proceed." |

### 11.9 Same Person as Reviewer for Multiple Employees

| Handling         | Detail                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed          | A person can be a reviewer for multiple employees                                                                                      |
| Workload warning | If assigned to review more than 10 employees, show warning: "{name} is assigned to review {n} employees. This may be a high workload." |
| Not blocked      | Warning only, Admin can proceed                                                                                                        |

---

## 12. Audit Trail

### 12.1 Audited Actions

| Action             | Trigger                           | Data Captured                                            |
| ------------------ | --------------------------------- | -------------------------------------------------------- |
| CREATE_CYCLE       | Cycle created as draft            | Full cycle config                                        |
| UPDATE_CYCLE       | Any cycle setting changed         | Changed fields (before/after)                            |
| DELETE_CYCLE       | Draft cycle deleted               | Full config at time of deletion                          |
| COMPLETE_SETUP     | Setup completed, cycle launched   | Validation results, employee/reviewer counts             |
| STAGE_TRANSITION   | Any stage change (auto or manual) | From state, to state, trigger type (auto/manual)         |
| REVIEWER_ASSIGNED  | Reviewer mapped to employee       | Employee ID, reviewer ID, reviewer type                  |
| REVIEWER_REMOVED   | Reviewer mapping removed          | Employee ID, reviewer ID, reviewer type, reason          |
| FILL_ON_BEHALF     | Admin fills survey for reviewer   | Admin ID, reviewer ID, subject ID, reason, all responses |
| REOPEN_FORM        | Admin reopens form for reviewer   | Admin ID, reviewer ID(s), reason, new deadline           |
| SEND_REMINDER      | Ad-hoc reminder sent              | Admin ID, recipient ID, reminder type                    |
| PUBLISH_RESULTS    | Admin publishes results           | Completion statistics, score summary                     |
| VISIBILITY_CHANGED | Visibility config modified        | Before/after visibility settings                         |
| TEMPLATE_IMPORTED  | Mapping template imported         | Template ID, matched/flagged counts                      |
| ABORT_CYCLE        | Active cycle aborted              | Admin ID, reason, state at abort time                    |

### 12.2 Audit Access & Retention

| Rule       | Detail                                     |
| ---------- | ------------------------------------------ |
| Access     | Admin only, via cycle detail Audit Log tab |
| Retention  | Indefinite                                 |
| Searchable | By action type, performer, date range      |
| Immutable  | Cannot be modified or deleted              |

---

## 13. Bulk Import Capabilities

### 13.1 Bulk Import Questions (into Question Template Master)

**Purpose:** Admin can bulk import questions into a question template instead of adding them one by one.

**Location:** Question Template Master → Edit Template → "Import Questions" button

**Functional Requirements:**

| Requirement | Detail |
| --- | --- |
| Downloadable template | System provides a downloadable template file that Admin fills in and re-uploads |
| Template format | To be decided by engineering |
| Required data per row | Role group (IC/TM/HOD), competency reference, question text, display order, comment enabled flag |
| Validation | All rows validated before any are committed (all-or-nothing) |
| Competency validation | Every competency reference must exist in Competency Master and be active |
| Role group validation | Must be one of the valid role groups (IC, TM, HOD) |
| Duplicate handling | If a question with identical text already exists in the same role group, flag as warning |
| Error reporting | On failure, return a row-by-row error report so Admin can fix and re-upload |
| Does not delete | Import only adds new questions. It does not remove or modify existing questions in the template. |
| Idempotent-safe | Re-importing the same file should flag duplicates, not create duplicates |

### 13.2 Bulk Import Employee-Reviewer Mapping (into Cycle or Mapping Template)

**Purpose:** Admin can bulk import reviewer mappings from a file instead of mapping one by one in the UI.

**Location:** Step 6 (Map Employees) → Reviewer Mapping screen → "Bulk Import" button. Also available in Reviewer Mapping Template Master for creating templates.

**Functional Requirements:**

| Requirement | Detail |
| --- | --- |
| Downloadable template | System provides a downloadable template file with required columns and example data |
| Template format | To be decided by engineering |
| Required data per row | Employee identifier (being reviewed), reviewer identifier, reviewer type |
| One row = one assignment | Each row represents one reviewer-to-employee assignment. An employee with 5 reviewers has 5 rows. |
| Validation | All rows validated before any are committed (all-or-nothing) |
| Employee validation | Employee being reviewed must exist in the current cycle's mapped employees (or in active employees for template master) |
| Reviewer validation | Reviewer must be an active employee |
| Type validation | Reviewer type must match the types enabled in Step 2 (for cycle import) |
| Self-assignment check | Employee cannot be their own reviewer (except for SELF type where employee = reviewer) |
| Min/Max validation | After import, total reviewer counts per employee per type must satisfy min/max rules from Step 2 |
| Duplicate detection | Same employee + same reviewer + same type = duplicate, flagged as error |
| Error reporting | Row-by-row error report on failure |
| Conflict resolution | If mappings already exist: Admin chooses "Replace all" or "Merge with existing" before import proceeds |
| Bidirectional update | After import, the "Gives reviews to" derived view updates automatically for all affected employees |

**Shared Rules for Both Bulk Imports:**

| Rule | Detail |
| --- | --- |
| All-or-nothing | If any row fails validation, zero rows are imported |
| Template download | A "Download Template" action provides an empty file with headers and example rows |
| Audit log | Every bulk import is logged with: admin ID, file name, row count, success/failure, timestamp |

> **Note for Engineering:** The exact file format (CSV vs Excel vs other), column names, and template structure are implementation decisions. The above defines WHAT the bulk import must do, not HOW the file should look. Engineering should design the template to be intuitive and include a reference sheet for valid values (reviewer types, competency IDs, etc.).

---

## 14. Open Questions for Engineering

| # | Question | Context | Decision Needed By |
| --- | --- | --- | --- |
| 1 | What timezone should be used for stage transitions and deadline calculations? | Motadata is India-based. Should we use IST fixed, or make it configurable? | Sprint Planning |
| 2 | How should "Exclude Weekly Offs" interact with partial days? | If a stage starts on Friday and is 2 days with weekends excluded, does it end Monday or Tuesday? | Sprint Planning |
| 3 | Should the "Not Submitted" and "Missed" statuses be distinct from PENDING/IN_PROGRESS? | PENDING = never started, IN_PROGRESS = partially filled, MISSED = time expired never started, NOT_SUBMITTED = time expired with draft. Need to confirm status enum values. | Data Model Review |
| 4 | Should score recalculation after "Fill on Behalf" happen immediately or in background? | Immediate is simpler but may be slow for employees with many reviewers | Sprint Planning |
| 5 | For the "Gives reviews to" derived view - should it update in real-time or on save? | Affects UX responsiveness of the mapping screen | UX Review |
| 6 | Should we support "Clone Cycle" to create a new cycle from an existing one's configuration? | Visible in the Keka reference screenshots. Would save setup time. | Product Decision |
| 7 | How should the Reviewer Mapping Template handle organizational changes between cycles? | If departments restructure, the old template may have stale mappings. Should we validate on import or just flag issues? | Product Decision |

---

**End of Document**
