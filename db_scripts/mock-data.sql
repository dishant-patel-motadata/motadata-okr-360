-- ============================================================
-- 360 FEEDBACK PLATFORM — COMPLETE MOCK DATA
-- Target  : Supabase / PostgreSQL 15+
-- Version : 1.0   |   Date: February 2026
-- ============================================================
-- Run AFTER 02-database-setup.sql.
-- This script seeds sample employees and all other tables.
-- All INSERTs use ON CONFLICT DO NOTHING so it is safe to re-run.
-- ============================================================


-- ============================================================
-- PART 0 — SEED DATA: SAMPLE EMPLOYEES (400 employees)
-- ============================================================
-- This section creates a representative org structure with
-- 4 CXOs, 16 HODs, 80 TMs, and 300 ICs across 20 departments.

DO $$
DECLARE
    dept_names TEXT[] := ARRAY[
        'Engineering', 'Product Management', 'Sales', 'Marketing',
        'Customer Success', 'Finance', 'Human Resources', 'Operations',
        'Legal', 'IT', 'Data Science', 'Design', 'Quality Assurance',
        'Business Development', 'Research', 'Security', 'DevOps',
        'Support', 'Analytics', 'Strategy'
    ];
    dept TEXT;
    cxo_id TEXT;
    hod_id TEXT;
    tm_id TEXT;
    emp_counter INTEGER := 1;
    i INTEGER;
    j INTEGER;
    k INTEGER;
BEGIN
    -- Create 4 CXO (no manager)
    FOR i IN 1..4 LOOP
        INSERT INTO employees (
            employee_id, full_name, email, department, designation,
            reporting_manager_id, date_of_joining, group_name,
            cross_functional_groups, applicable_competencies, is_active,
            leadership_level, synced_at
        ) VALUES (
            'EMP' || LPAD(emp_counter::TEXT, 3, '0'),
            'CXO ' || emp_counter,
            'cxo' || emp_counter || '@company.com',
            dept_names[((i-1) % 20) + 1],
            CASE i
                WHEN 1 THEN 'Chief Executive Officer'
                WHEN 2 THEN 'Chief Technology Officer'
                WHEN 3 THEN 'Chief Operating Officer'
                ELSE 'Chief Financial Officer'
            END,
            NULL,
            '2020-01-01'::DATE + (i * 30),
            'CXO',
            jsonb_build_array(dept_names[((i-1) % 20) + 1], dept_names[((i+4) % 20) + 1]),
            jsonb_build_array('EXPR', 'TDEV', 'INNO', 'BACU', 'CULT'),
            TRUE,
            1,
            NOW()
        ) ON CONFLICT (employee_id) DO NOTHING;
        emp_counter := emp_counter + 1;
    END LOOP;

    -- Create 16 HODs (4 per CXO)
    FOR i IN 1..16 LOOP
        cxo_id := 'EMP' || LPAD(((i-1) / 4 + 1)::TEXT, 3, '0');
        INSERT INTO employees (
            employee_id, full_name, email, department, designation,
            reporting_manager_id, date_of_joining, group_name,
            cross_functional_groups, applicable_competencies, is_active,
            leadership_level, synced_at
        ) VALUES (
            'EMP' || LPAD(emp_counter::TEXT, 3, '0'),
            'HOD ' || emp_counter,
            'hod' || emp_counter || '@company.com',
            dept_names[((i-1) % 20) + 1],
            'Head of ' || dept_names[((i-1) % 20) + 1],
            cxo_id,
            '2020-03-01'::DATE + (i * 15),
            'HOD',
            jsonb_build_array(dept_names[((i-1) % 20) + 1], dept_names[((i+5) % 20) + 1], dept_names[((i+10) % 20) + 1]),
            jsonb_build_array('STRT', 'XFNL', 'RSMG', 'CHMG', 'EXPR', 'TDEV', 'INNO', 'BACU', 'CULT', 'PROF'),
            TRUE,
            2,
            NOW()
        ) ON CONFLICT (employee_id) DO NOTHING;
        emp_counter := emp_counter + 1;
    END LOOP;

    -- Create 80 TMs (5 per HOD)
    FOR i IN 1..80 LOOP
        hod_id := 'EMP' || LPAD(((i-1) / 5 + 5)::TEXT, 3, '0');
        INSERT INTO employees (
            employee_id, full_name, email, department, designation,
            reporting_manager_id, date_of_joining, group_name,
            cross_functional_groups, applicable_competencies, is_active,
            leadership_level, synced_at
        ) VALUES (
            'EMP' || LPAD(emp_counter::TEXT, 3, '0'),
            'Team Manager ' || emp_counter,
            'tm' || emp_counter || '@company.com',
            dept_names[((i-1) % 20) + 1],
            'Team Lead - ' || dept_names[((i-1) % 20) + 1],
            hod_id,
            '2021-01-01'::DATE + (i * 7),
            'TM',
            jsonb_build_array(dept_names[((i-1) % 20) + 1], dept_names[((i+3) % 20) + 1]),
            jsonb_build_array('LEAD', 'MENT', 'DCSN', 'DLGT', 'CNFL', 'ACCT', 'COMM', 'PLAN', 'RECG'),
            TRUE,
            3,
            NOW()
        ) ON CONFLICT (employee_id) DO NOTHING;
        emp_counter := emp_counter + 1;
    END LOOP;

    -- Create 300 ICs (3-4 per TM)
    FOR i IN 1..300 LOOP
        tm_id := 'EMP' || LPAD(((i-1) / 4 + 21)::TEXT, 3, '0');
        INSERT INTO employees (
            employee_id, full_name, email, department, designation,
            reporting_manager_id, date_of_joining, group_name,
            cross_functional_groups, applicable_competencies, is_active,
            leadership_level, synced_at
        ) VALUES (
            'EMP' || LPAD(emp_counter::TEXT, 3, '0'),
            'Employee ' || emp_counter,
            'emp' || emp_counter || '@company.com',
            dept_names[((i-1) % 20) + 1],
            CASE (i % 5)
                WHEN 0 THEN 'Senior ' || dept_names[((i-1) % 20) + 1] || ' Specialist'
                WHEN 1 THEN dept_names[((i-1) % 20) + 1] || ' Analyst'
                WHEN 2 THEN 'Junior ' || dept_names[((i-1) % 20) + 1] || ' Associate'
                WHEN 3 THEN dept_names[((i-1) % 20) + 1] || ' Coordinator'
                ELSE dept_names[((i-1) % 20) + 1] || ' Specialist'
            END,
            tm_id,
            '2022-01-01'::DATE + (i * 3),
            'IC',
            jsonb_build_array(dept_names[((i-1) % 20) + 1], dept_names[((i+7) % 20) + 1]),
            jsonb_build_array('COMM', 'TEAM', 'QUAL', 'RELY', 'INIT', 'ADPT', 'GROW', 'PROF'),
            TRUE,
            4,
            NOW()
        ) ON CONFLICT (employee_id) DO NOTHING;
        emp_counter := emp_counter + 1;
    END LOOP;

END $$;


-- ============================================================
-- PART 1 — SEED DATA: COMPETENCIES (25)
-- ============================================================
INSERT INTO competencies (competency_id, competency_name, description, applicable_to) VALUES
('COMM','Communication',       'Ability to communicate ideas clearly and listen actively',             ARRAY['IC','TM','HOD']),
('TEAM','Teamwork',            'Collaboration and support of colleagues toward shared goals',          ARRAY['IC','TM']),
('QUAL','Quality',             'Delivering high-quality, detailed work consistently',                 ARRAY['IC','TM']),
('RELY','Reliability',         'Meeting deadlines, dependability and follow-through',                 ARRAY['IC','TM']),
('INIT','Initiative',          'Taking ownership and solving problems proactively',                   ARRAY['IC','TM']),
('ADPT','Adaptability',        'Adjusting to change and remaining effective under pressure',          ARRAY['IC','TM']),
('GROW','Growth Mindset',      'Willingness to learn, accept feedback and develop skills',            ARRAY['IC','TM']),
('PROF','Professionalism',     'Positive attitude, ethical conduct and workplace standards',          ARRAY['IC','TM','HOD']),
('LEAD','Leadership',          'Providing clear direction and inspiring the team',                    ARRAY['TM','HOD']),
('MENT','Mentorship',          'Coaching, developing and providing feedback to team members',         ARRAY['TM','HOD']),
('DCSN','Decision Making',     'Making timely, informed and effective decisions',                     ARRAY['TM','HOD']),
('DLGT','Delegation',          'Appropriately assigning tasks and empowering team members',           ARRAY['TM','HOD']),
('CNFL','Conflict Resolution', 'Handling team conflicts constructively and fairly',                   ARRAY['TM','HOD']),
('ACCT','Accountability',      'Holding team accountable and taking responsibility for outcomes',     ARRAY['TM','HOD']),
('PLAN','Planning',            'Setting realistic goals, milestones and tracking progress',           ARRAY['TM','HOD']),
('RECG','Recognition',         'Recognising and appreciating contributions of team members',          ARRAY['TM','HOD']),
('STRT','Strategy',            'Aligning team goals with company vision and anticipating challenges', ARRAY['HOD']),
('XFNL','Cross-functional',    'Building relationships and facilitating collaboration across depts',  ARRAY['HOD']),
('RSMG','Resource Management', 'Optimising team resources, budget and staffing decisions',            ARRAY['HOD']),
('CHMG','Change Management',   'Leading organisational change and helping team navigate transitions', ARRAY['HOD']),
('EXPR','Executive Presence',  'Representing department effectively and communicating vision',        ARRAY['HOD','CXO']),
('TDEV','Talent Development',  'Building leadership pipeline and creating growth opportunities',      ARRAY['HOD','CXO']),
('INNO','Innovation',          'Encouraging experimentation and implementing process improvements',   ARRAY['HOD','CXO']),
('BACU','Business Acumen',     'Understanding and acting on business priorities',                     ARRAY['HOD','CXO']),
('CULT','Culture',             'Championing company values and culture across the organisation',      ARRAY['HOD','CXO'])
ON CONFLICT (competency_id) DO NOTHING;


-- ============================================================
-- PART 2 — SEED DATA: QUESTIONS (46 total)
-- ============================================================

-- IC Questions (15)
INSERT INTO questions (question_id, set_type, order_number, question_text, category, competency_id) VALUES
('IC-01','IC', 1,'Communicates ideas clearly and effectively',          'Communication',  'COMM'),
('IC-02','IC', 2,'Listens actively and responds appropriately',         'Communication',  'COMM'),
('IC-03','IC', 3,'Collaborates well with team members',                 'Teamwork',       'TEAM'),
('IC-04','IC', 4,'Supports colleagues in achieving shared goals',       'Teamwork',       'TEAM'),
('IC-05','IC', 5,'Delivers high-quality work consistently',             'Quality',        'QUAL'),
('IC-06','IC', 6,'Pays attention to detail in deliverables',            'Quality',        'QUAL'),
('IC-07','IC', 7,'Meets deadlines and commitments',                     'Reliability',    'RELY'),
('IC-08','IC', 8,'Is dependable and can be counted on',                 'Reliability',    'RELY'),
('IC-09','IC', 9,'Takes ownership of tasks proactively',                'Initiative',     'INIT'),
('IC-10','IC',10,'Identifies and solves problems independently',        'Initiative',     'INIT'),
('IC-11','IC',11,'Adjusts well to changing priorities',                 'Adaptability',   'ADPT'),
('IC-12','IC',12,'Remains effective under pressure',                    'Adaptability',   'ADPT'),
('IC-13','IC',13,'Shows willingness to learn new skills',               'Growth',         'GROW'),
('IC-14','IC',14,'Accepts and acts on feedback constructively',         'Growth',         'GROW'),
('IC-15','IC',15,'Maintains a positive and professional attitude',      'Professionalism','PROF')
ON CONFLICT (question_id) DO NOTHING;

-- Team Manager Questions (15)
INSERT INTO questions (question_id, set_type, order_number, question_text, category, competency_id) VALUES
('TM-01','TM', 1,'Provides clear direction to the team',                        'Leadership',         'LEAD'),
('TM-02','TM', 2,'Inspires and motivates team members',                         'Leadership',         'LEAD'),
('TM-03','TM', 3,'Develops and coaches team members effectively',               'Mentorship',         'MENT'),
('TM-04','TM', 4,'Provides regular and constructive feedback',                  'Mentorship',         'MENT'),
('TM-05','TM', 5,'Makes timely and effective decisions',                        'Decision Making',    'DCSN'),
('TM-06','TM', 6,'Considers input from team before deciding',                   'Decision Making',    'DCSN'),
('TM-07','TM', 7,'Assigns tasks appropriately based on strengths',              'Delegation',         'DLGT'),
('TM-08','TM', 8,'Empowers team members with autonomy',                         'Delegation',         'DLGT'),
('TM-09','TM', 9,'Handles team conflicts constructively',                       'Conflict Resolution','CNFL'),
('TM-10','TM',10,'Creates a safe environment for open discussion',              'Conflict Resolution','CNFL'),
('TM-11','TM',11,'Holds team members accountable fairly',                       'Accountability',     'ACCT'),
('TM-12','TM',12,'Takes responsibility for team outcomes',                      'Accountability',     'ACCT'),
('TM-13','TM',13,'Keeps team informed about priorities and changes',            'Communication',      'COMM'),
('TM-14','TM',14,'Sets realistic goals and milestones',                         'Planning',           'PLAN'),
('TM-15','TM',15,'Recognises and appreciates team contributions',               'Recognition',        'RECG')
ON CONFLICT (question_id) DO NOTHING;

-- HOD Questions (16)
INSERT INTO questions (question_id, set_type, order_number, question_text, category, competency_id) VALUES
('HOD-01','HOD', 1,'Aligns team goals with company vision',                   'Strategy',            'STRT'),
('HOD-02','HOD', 2,'Anticipates future challenges and opportunities',         'Strategy',            'STRT'),
('HOD-03','HOD', 3,'Builds strong relationships across departments',          'Cross-functional',    'XFNL'),
('HOD-04','HOD', 4,'Facilitates collaboration between teams',                 'Cross-functional',    'XFNL'),
('HOD-05','HOD', 5,'Optimises team resources effectively',                    'Resource Management', 'RSMG'),
('HOD-06','HOD', 6,'Makes sound budget and staffing decisions',               'Resource Management', 'RSMG'),
('HOD-07','HOD', 7,'Leads organisational change initiatives',                 'Change Management',   'CHMG'),
('HOD-08','HOD', 8,'Helps team navigate transitions smoothly',                'Change Management',   'CHMG'),
('HOD-09','HOD', 9,'Represents department effectively to leadership',         'Executive Presence',  'EXPR'),
('HOD-10','HOD',10,'Communicates vision with clarity and conviction',         'Executive Presence',  'EXPR'),
('HOD-11','HOD',11,'Builds a strong pipeline of future leaders',              'Talent Development',  'TDEV'),
('HOD-12','HOD',12,'Creates growth opportunities for high performers',        'Talent Development',  'TDEV'),
('HOD-13','HOD',13,'Encourages experimentation and new ideas',                'Innovation',          'INNO'),
('HOD-14','HOD',14,'Implements process improvements proactively',             'Innovation',          'INNO'),
('HOD-15','HOD',15,'Understands and acts on business priorities',             'Business Acumen',     'BACU'),
('HOD-16','HOD',16,'Champions company values and culture',                    'Culture',             'CULT')
ON CONFLICT (question_id) DO NOTHING;


-- ============================================================
-- PART 3 — SEED DATA: REVIEWER CONFIG
-- ============================================================
INSERT INTO reviewer_config (min_reviewers, max_reviewers, updated_by)
VALUES (2, 8, 'EMP005')
ON CONFLICT DO NOTHING;


-- ============================================================
-- PART 3A — SEED DATA: QUESTION TEMPLATES
-- ============================================================

-- Template 1: Standard Full Set (all 46 questions)
INSERT INTO question_templates (template_id, template_name, description, created_by)
VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID,
    'Standard Full Set (46 Questions)',
    'Complete question set covering all competencies for IC, TM, and HOD levels',
    'EMP001'
)
ON CONFLICT (template_id) DO NOTHING;

-- Template 2: Simplified Set (30 questions - top 10 per level)
INSERT INTO question_templates (template_id, template_name, description, created_by)
VALUES
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID,
    'Simplified Set (30 Questions)',
    'Condensed question set focusing on core competencies - 10 IC, 10 TM, 10 HOD',
    'EMP001'
)
ON CONFLICT (template_id) DO NOTHING;

-- Template 3: Leadership Focus (TM + HOD only)
INSERT INTO question_templates (template_id, template_name, description, created_by)
VALUES
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID,
    'Leadership Focus (TM/HOD)',
    'Leadership-focused template for TM and HOD levels only (31 questions)',
    'EMP001'
)
ON CONFLICT (template_id) DO NOTHING;


-- ============================================================
-- PART 3B — SEED DATA: TEMPLATE-QUESTION MAPPINGS
-- ============================================================

-- Template 1: All IC questions
INSERT INTO template_questions (template_id, question_id)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, question_id
FROM   questions
WHERE  set_type = 'IC'
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 1: All TM questions
INSERT INTO template_questions (template_id, question_id)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, question_id
FROM   questions
WHERE  set_type = 'TM'
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 1: All HOD questions
INSERT INTO template_questions (template_id, question_id)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, question_id
FROM   questions
WHERE  set_type = 'HOD'
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 2: Simplified IC set (first 10 IC questions)
INSERT INTO template_questions (template_id, question_id)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, question_id
FROM   questions
WHERE  set_type = 'IC' AND order_number <= 10
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 2: Simplified TM set (first 10 TM questions)
INSERT INTO template_questions (template_id, question_id)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, question_id
FROM   questions
WHERE  set_type = 'TM' AND order_number <= 10
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 2: Simplified HOD set (first 10 HOD questions)
INSERT INTO template_questions (template_id, question_id)
SELECT 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, question_id
FROM   questions
WHERE  set_type = 'HOD' AND order_number <= 10
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 3: All TM questions
INSERT INTO template_questions (template_id, question_id)
SELECT 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, question_id
FROM   questions
WHERE  set_type = 'TM'
ON CONFLICT (template_id, question_id) DO NOTHING;

-- Template 3: All HOD questions
INSERT INTO template_questions (template_id, question_id)
SELECT 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID, question_id
FROM   questions
WHERE  set_type = 'HOD'
ON CONFLICT (template_id, question_id) DO NOTHING;


-- ============================================================
-- PART 4 — SEED DATA: NOTIFICATION TEMPLATES
-- ============================================================
INSERT INTO notification_templates
    (template_id, template_name, event_type, email_subject, email_body, teams_message)
VALUES
('CYCLE_START',
 'Cycle Started', 'CYCLE_START',
 '360 Feedback Cycle "{{cycle_name}}" has started',
 'Dear {{employee_name}},\n\nThe 360 Feedback Cycle "{{cycle_name}}" is now active ({{start_date}} – {{end_date}}).\nPlease complete your self-feedback and any assigned peer reviews before the deadline.\n\nThank you.',
 '📢 360 Feedback Cycle **{{cycle_name}}** is now **ACTIVE**. Complete your reviews by {{end_date}}.'),

('SURVEY_ASSIGNED',
 'Survey Assigned', 'SURVEY_ASSIGNED',
 'You have been assigned to review {{employee_name}}',
 'Dear {{reviewer_name}},\n\nYou have been assigned to provide 360 feedback for {{employee_name}} ({{designation}}, {{department}}).\n\nDeadline: {{deadline}}\n\nPlease log in to complete the survey.\n\nThank you.',
 '📋 You have a new survey to complete for **{{employee_name}}** — due **{{deadline}}**.'),

('SURVEY_REMINDER',
 'Survey Reminder', 'SURVEY_REMINDER',
 'Reminder: {{pending_count}} survey(s) pending — due in {{days_left}} day(s)',
 'Dear {{reviewer_name}},\n\nThis is a reminder that you have {{pending_count}} pending survey(s) due in {{days_left}} day(s).\n\nPlease log in and complete your reviews before the deadline.\n\nThank you.',
 '⏰ Reminder: **{{pending_count}}** survey(s) due in **{{days_left}} day(s)**. Please submit before the deadline.'),

('SELF_REMINDER',
 'Self-Feedback Reminder', 'SELF_REMINDER',
 'Reminder: Complete your self-feedback — due in {{days_left}} day(s)',
 'Dear {{employee_name}},\n\nThis is a reminder to complete your self-feedback for the cycle "{{cycle_name}}".\nDeadline: {{deadline}} ({{days_left}} day(s) remaining).\n\nThank you.',
 '⏰ Reminder: Complete your **self-feedback** by **{{deadline}}**.'),

('CYCLE_CLOSING',
 'Cycle Closing', 'CYCLE_CLOSING',
 '360 Feedback Cycle "{{cycle_name}}" is closing — submit pending surveys',
 'Dear {{employee_name}},\n\nThe 360 Feedback Cycle "{{cycle_name}}" has entered its closing period.\nGrace period ends: {{grace_end_date}}.\n\nPlease submit all pending surveys immediately.\n\nThank you.',
 '🔔 Cycle **{{cycle_name}}** is **CLOSING**. Grace period ends {{grace_end_date}}. Submit now!'),

('RESULTS_PUBLISHED',
 'Results Published', 'RESULTS_PUBLISHED',
 'Your 360 Feedback results for "{{cycle_name}}" are now available',
 'Dear {{employee_name}},\n\nYour 360 Feedback results for the cycle "{{cycle_name}}" have been published.\nLog in to view your competency breakdown, reviewer category scores and historical trends.\n\nThank you.',
 '🎉 360 Feedback results for **{{cycle_name}}** are now **PUBLISHED**. Log in to view your results.')
ON CONFLICT (template_id) DO NOTHING;


-- ============================================================
-- PART 5 — MOCK DATA: REVIEW CYCLES (3 cycles)
-- ============================================================

-- Cycle 1: H1 2025 — PUBLISHED (using Standard Full Set template)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, template_id, created_by)
VALUES
(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'H1 2025 — 360 Review',
    '2025-01-06', '2025-06-30', 6,
    3, 'PUBLISHED', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, 'EMP001'
)
ON CONFLICT (cycle_id) DO NOTHING;

-- Cycle 2: H2 2025 — PUBLISHED (using Standard Full Set template)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, template_id, created_by)
VALUES
(
    '22222222-2222-2222-2222-222222222222'::UUID,
    'H2 2025 — 360 Review',
    '2025-07-07', '2025-12-31', 6,
    3, 'PUBLISHED', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID, 'EMP001'
)
ON CONFLICT (cycle_id) DO NOTHING;

-- Cycle 3: H1 2026 — ACTIVE (current) (using Simplified Set template)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, template_id, created_by)
VALUES
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'H1 2026 — 360 Review',
    '2026-02-02', '2026-06-30', 6,
    3, 'ACTIVE', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID, 'EMP001'
)
ON CONFLICT (cycle_id) DO NOTHING;


-- ============================================================
-- PART 5A — UPDATE EMPLOYEES: LEADERSHIP LEVEL & ORG PATH
-- ============================================================

-- Set leadership_level based on group_name
UPDATE employees SET leadership_level = CASE
    WHEN group_name = 'CXO' THEN 1
    WHEN group_name = 'HOD' THEN 2
    WHEN group_name = 'TM'  THEN 3
    WHEN group_name = 'IC'  THEN 4
    ELSE NULL
END;

-- Build org_path (materialized path from root to employee)
-- This is done via recursive CTE
WITH RECURSIVE org_tree AS (
    -- Anchor: employees with no manager (CXO level)
    SELECT
        employee_id,
        ARRAY[employee_id] AS path
    FROM employees
    WHERE reporting_manager_id IS NULL

    UNION ALL

    -- Recursive: employees with managers
    SELECT
        e.employee_id,
        ot.path || e.employee_id
    FROM employees e
    JOIN org_tree ot ON e.reporting_manager_id = ot.employee_id
)
UPDATE employees e
SET org_path = ot.path
FROM org_tree ot
WHERE e.employee_id = ot.employee_id;


-- ============================================================
-- PART 6 — MOCK DATA: SURVEY ASSIGNMENTS
--   All 400 active employees enrolled in ALL 3 cycles.
--   H1 2025 and H2 2025: all COMPLETED (published cycles).
--   H1 2026: mix of COMPLETED / IN_PROGRESS / PENDING.
-- ============================================================

-- Assignments for H1 2025 (all COMPLETED — cycle is PUBLISHED)
INSERT INTO survey_assignments (employee_id, cycle_id, status)
SELECT employee_id, '11111111-1111-1111-1111-111111111111'::UUID, 'COMPLETED'
FROM   employees
WHERE  is_active = TRUE
ON CONFLICT (employee_id, cycle_id) DO NOTHING;

-- Assignments for H2 2025 (all COMPLETED — cycle is PUBLISHED)
INSERT INTO survey_assignments (employee_id, cycle_id, status)
SELECT employee_id, '22222222-2222-2222-2222-222222222222'::UUID, 'COMPLETED'
FROM   employees
WHERE  is_active = TRUE
ON CONFLICT (employee_id, cycle_id) DO NOTHING;

-- Assignments for H1 2026 (active cycle — mixed statuses)
INSERT INTO survey_assignments (employee_id, cycle_id, status)
SELECT
    e.employee_id,
    '33333333-3333-3333-3333-333333333333'::UUID,
    CASE
        -- CXO and first 5 HODs: COMPLETED
        WHEN e.group_name = 'CXO'                                              THEN 'COMPLETED'
        WHEN e.employee_id IN ('EMP006','EMP007','EMP008','EMP009','EMP010')   THEN 'COMPLETED'
        -- Remaining HODs and first half of TMs: IN_PROGRESS
        WHEN e.group_name = 'HOD'                                              THEN 'IN_PROGRESS'
        WHEN e.group_name = 'TM'
             AND (CAST(SUBSTRING(e.employee_id, 4) AS INTEGER) % 2) = 1       THEN 'IN_PROGRESS'
        -- Everything else: PENDING
        ELSE 'PENDING'
    END
FROM employees e
WHERE e.is_active = TRUE
ON CONFLICT (employee_id, cycle_id) DO NOTHING;


-- ============================================================
-- PART 7 — MOCK DATA: SURVEY REVIEWERS
--   • For the two PUBLISHED cycles (H1 2025, H2 2025):
--     assign reviewers for ALL employees (COMPLETED).
--   • For the ACTIVE cycle (H1 2026):
--     assign reviewers for all employees, with mixed statuses.
--
--   Reviewer composition per employee:
--     1 MANAGER (reporting_manager_id)
--     4 PEERs   (same dept ICs, or same-dept TMs for HOD/TM)
--     1 CROSS_FUNCTIONAL (IC from a different dept)
--   CXO employees get PEER reviewers from within the CXO group.
-- ============================================================

DO $$
DECLARE
    cycle_rec   RECORD;
    emp_rec     RECORD;
    sa_id       UUID;
    q_set       TEXT;
    mgr_id      TEXT;
    peer_ids    TEXT[];
    cf_id       TEXT;
    rev_id      TEXT;
    k           INTEGER;
    rev_status  TEXT;
    peer_group  TEXT;
BEGIN
    FOR cycle_rec IN
        SELECT cycle_id, status
        FROM   review_cycles
        ORDER BY start_date
    LOOP
        FOR emp_rec IN
            SELECT e.employee_id, e.group_name, e.reporting_manager_id, e.department
            FROM   employees e
            WHERE  e.is_active = TRUE
            ORDER BY e.employee_id
        LOOP
            -- Determine question set based on group_name
            q_set := CASE emp_rec.group_name
                WHEN 'IC'  THEN 'IC'
                WHEN 'TM'  THEN 'TM'
                WHEN 'HOD' THEN 'HOD'
                WHEN 'CXO' THEN 'HOD'   -- CXOs are assessed on HOD question set
            END;

            -- Fetch assignment_id for this employee + cycle
            SELECT assignment_id INTO sa_id
            FROM   survey_assignments
            WHERE  employee_id = emp_rec.employee_id
              AND  cycle_id    = cycle_rec.cycle_id;

            IF sa_id IS NULL THEN
                CONTINUE;
            END IF;

            -- ── Manager reviewer ─────────────────────────────────
            mgr_id := emp_rec.reporting_manager_id;
            IF mgr_id IS NOT NULL THEN
                rev_status := CASE
                    WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'COMPLETED'
                    WHEN emp_rec.employee_id IN ('EMP006','EMP007','EMP008','EMP009','EMP010') THEN 'COMPLETED'
                    WHEN emp_rec.group_name IN ('HOD','CXO') THEN 'IN_PROGRESS'
                    ELSE 'PENDING'
                END;

                INSERT INTO survey_reviewers
                    (assignment_id, reviewer_employee_id, reviewer_type, question_set,
                     status, reminded_at, completed_at)
                VALUES (
                    sa_id, mgr_id, 'MANAGER', q_set,
                    rev_status,
                    CASE WHEN cycle_rec.status = 'ACTIVE' THEN NOW() - INTERVAL '7 days' ELSE NULL END,
                    CASE WHEN rev_status = 'COMPLETED'
                         THEN CASE
                             WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                                  THEN '2025-06-20 10:00:00+00'::TIMESTAMPTZ
                             WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                                  THEN '2025-12-20 10:00:00+00'::TIMESTAMPTZ
                             ELSE NOW() - INTERVAL '3 days'
                         END
                         ELSE NULL END
                )
                ON CONFLICT DO NOTHING;
            END IF;

            -- ── Peer group to pick from ───────────────────────────
            peer_group := CASE emp_rec.group_name
                WHEN 'IC'  THEN 'IC'
                WHEN 'TM'  THEN 'TM'
                WHEN 'HOD' THEN 'HOD'
                WHEN 'CXO' THEN 'CXO'
            END;

            -- ── 4 Peer reviewers (same dept, same group, not self) ─
            FOR rev_id IN
                SELECT e2.employee_id
                FROM   employees e2
                WHERE  e2.department   = emp_rec.department
                  AND  e2.group_name   = peer_group
                  AND  e2.employee_id <> emp_rec.employee_id
                  AND  e2.is_active    = TRUE
                ORDER BY e2.employee_id
                LIMIT 4
            LOOP
                rev_status := CASE
                    WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'COMPLETED'
                    WHEN emp_rec.employee_id IN ('EMP006','EMP007','EMP008') THEN 'COMPLETED'
                    WHEN emp_rec.group_name IN ('HOD','CXO') THEN 'IN_PROGRESS'
                    ELSE 'PENDING'
                END;

                INSERT INTO survey_reviewers
                    (assignment_id, reviewer_employee_id, reviewer_type, question_set,
                     status, reminded_at, completed_at)
                VALUES (
                    sa_id, rev_id, 'PEER', q_set,
                    rev_status,
                    CASE WHEN cycle_rec.status = 'ACTIVE' THEN NOW() - INTERVAL '5 days' ELSE NULL END,
                    CASE WHEN rev_status = 'COMPLETED'
                         THEN CASE
                             WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                                  THEN '2025-06-22 11:00:00+00'::TIMESTAMPTZ
                             WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                                  THEN '2025-12-22 11:00:00+00'::TIMESTAMPTZ
                             ELSE NOW() - INTERVAL '2 days'
                         END
                         ELSE NULL END
                )
                ON CONFLICT DO NOTHING;
            END LOOP;

            -- ── 1 Cross-functional reviewer (different dept, same group_name tier) ─
            SELECT e3.employee_id INTO cf_id
            FROM   employees e3
            WHERE  e3.department   <> emp_rec.department
              AND  e3.group_name    = peer_group
              AND  e3.employee_id  <> emp_rec.employee_id
              AND  e3.is_active     = TRUE
            ORDER BY e3.employee_id
            LIMIT 1;

            IF cf_id IS NOT NULL THEN
                rev_status := CASE
                    WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'COMPLETED'
                    WHEN emp_rec.group_name IN ('HOD','CXO') THEN 'IN_PROGRESS'
                    ELSE 'PENDING'
                END;

                INSERT INTO survey_reviewers
                    (assignment_id, reviewer_employee_id, reviewer_type, question_set,
                     status, reminded_at, completed_at)
                VALUES (
                    sa_id, cf_id, 'CROSS_FUNCTIONAL', q_set,
                    rev_status,
                    CASE WHEN cycle_rec.status = 'ACTIVE' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
                    CASE WHEN rev_status = 'COMPLETED'
                         THEN CASE
                             WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                                  THEN '2025-06-25 14:00:00+00'::TIMESTAMPTZ
                             WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                                  THEN '2025-12-25 14:00:00+00'::TIMESTAMPTZ
                             ELSE NULL
                         END
                         ELSE NULL END
                )
                ON CONFLICT DO NOTHING;
            END IF;

            -- ── DIRECT_REPORT reviewers for TMs (first 2 ICs that report to them) ─
            IF emp_rec.group_name = 'TM' THEN
                FOR rev_id IN
                    SELECT e4.employee_id
                    FROM   employees e4
                    WHERE  e4.reporting_manager_id = emp_rec.employee_id
                      AND  e4.group_name           = 'IC'
                      AND  e4.is_active             = TRUE
                    ORDER BY e4.employee_id
                    LIMIT 2
                LOOP
                    rev_status := CASE
                        WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'COMPLETED'
                        ELSE 'PENDING'
                    END;

                    INSERT INTO survey_reviewers
                        (assignment_id, reviewer_employee_id, reviewer_type, question_set,
                         status, reminded_at, completed_at)
                    VALUES (
                        sa_id, rev_id, 'DIRECT_REPORT', q_set,
                        rev_status,
                        CASE WHEN cycle_rec.status = 'ACTIVE' THEN NOW() - INTERVAL '7 days' ELSE NULL END,
                        CASE WHEN rev_status = 'COMPLETED'
                             THEN CASE
                                 WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                                      THEN '2025-06-23 09:00:00+00'::TIMESTAMPTZ
                                 WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                                      THEN '2025-12-23 09:00:00+00'::TIMESTAMPTZ
                                 ELSE NULL
                             END
                             ELSE NULL END
                    )
                    ON CONFLICT DO NOTHING;
                END LOOP;
            END IF;

            -- ── CXO reviewer for HODs (CXO who oversees their department) ─
            IF emp_rec.group_name = 'HOD' THEN
                SELECT e5.employee_id INTO rev_id
                FROM   employees e5
                WHERE  e5.group_name  = 'CXO'
                  AND  e5.employee_id = (
                      SELECT reporting_manager_id FROM employees
                      WHERE  employee_id = emp_rec.employee_id
                  )
                LIMIT 1;

                IF rev_id IS NOT NULL THEN
                    rev_status := CASE
                        WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'COMPLETED'
                        ELSE 'IN_PROGRESS'
                    END;

                    INSERT INTO survey_reviewers
                        (assignment_id, reviewer_employee_id, reviewer_type, question_set,
                         status, reminded_at, completed_at)
                    VALUES (
                        sa_id, rev_id, 'CXO', q_set,
                        rev_status,
                        CASE WHEN cycle_rec.status = 'ACTIVE' THEN NOW() - INTERVAL '10 days' ELSE NULL END,
                        CASE WHEN rev_status = 'COMPLETED'
                             THEN CASE
                                 WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                                      THEN '2025-06-28 16:00:00+00'::TIMESTAMPTZ
                                 WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                                      THEN '2025-12-28 16:00:00+00'::TIMESTAMPTZ
                                 ELSE NULL
                             END
                             ELSE NULL END
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;

        END LOOP; -- emp_rec
    END LOOP; -- cycle_rec
END $$;


-- ============================================================
-- PART 8 — MOCK DATA: SURVEY RESPONSES
--   For all COMPLETED reviewers in the two PUBLISHED cycles,
--   generate one rating per question (appropriate to question_set).
--   Uses a deterministic pseudo-random formula (1–4 range).
-- ============================================================

DO $$
DECLARE
    sr_rec       RECORD;
    q_rec        RECORD;
    rating_val   INTEGER;
    hash_seed    BIGINT;
BEGIN
    FOR sr_rec IN
        SELECT sr.reviewer_id, sr.question_set, sr.reviewer_employee_id,
               sa.employee_id AS ratee_id
        FROM   survey_reviewers sr
        JOIN   survey_assignments sa ON sa.assignment_id = sr.assignment_id
        JOIN   review_cycles rc      ON rc.cycle_id = sa.cycle_id
        WHERE  sr.status = 'COMPLETED'
          AND  rc.status IN ('PUBLISHED','COMPLETED')
    LOOP
        FOR q_rec IN
            SELECT question_id
            FROM   questions
            WHERE  set_type = sr_rec.question_set
              AND  is_active = TRUE
            ORDER BY order_number
        LOOP
            -- Deterministic 1–4 rating seeded on reviewer + question
            hash_seed  := (('x' || MD5(sr_rec.reviewer_id::TEXT || q_rec.question_id))::BIT(32)::INT::BIGINT & 4000);
            rating_val := 1 + (hash_seed % 4)::INTEGER;

            INSERT INTO survey_responses (reviewer_id, question_id, rating)
            VALUES (sr_rec.reviewer_id, q_rec.question_id, rating_val)
            ON CONFLICT (reviewer_id, question_id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- Also generate responses for the COMPLETED reviewers in the ACTIVE cycle
    FOR sr_rec IN
        SELECT sr.reviewer_id, sr.question_set, sr.reviewer_employee_id,
               sa.employee_id AS ratee_id
        FROM   survey_reviewers sr
        JOIN   survey_assignments sa ON sa.assignment_id = sr.assignment_id
        JOIN   review_cycles rc      ON rc.cycle_id = sa.cycle_id
        WHERE  sr.status = 'COMPLETED'
          AND  rc.status = 'ACTIVE'
    LOOP
        FOR q_rec IN
            SELECT question_id
            FROM   questions
            WHERE  set_type = sr_rec.question_set
              AND  is_active = TRUE
            ORDER BY order_number
        LOOP
            hash_seed  := (('x' || MD5('active' || sr_rec.reviewer_id::TEXT || q_rec.question_id))::BIT(32)::INT::BIGINT & 4000);
            rating_val := 1 + (hash_seed % 4)::INTEGER;

            INSERT INTO survey_responses (reviewer_id, question_id, rating)
            VALUES (sr_rec.reviewer_id, q_rec.question_id, rating_val)
            ON CONFLICT (reviewer_id, question_id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- Generate partial responses for IN_PROGRESS reviewers (first half of questions)
    FOR sr_rec IN
        SELECT sr.reviewer_id, sr.question_set
        FROM   survey_reviewers sr
        JOIN   survey_assignments sa ON sa.assignment_id = sr.assignment_id
        JOIN   review_cycles rc      ON rc.cycle_id = sa.cycle_id
        WHERE  sr.status = 'IN_PROGRESS'
          AND  rc.status = 'ACTIVE'
        LIMIT 200   -- cap to keep data manageable
    LOOP
        FOR q_rec IN
            SELECT question_id, order_number
            FROM   questions
            WHERE  set_type = sr_rec.question_set
              AND  is_active = TRUE
              AND  order_number <= 8   -- half of questions answered
            ORDER BY order_number
        LOOP
            hash_seed  := (('x' || MD5('prog' || sr_rec.reviewer_id::TEXT || q_rec.question_id))::BIT(32)::INT::BIGINT & 65535);
            rating_val := 1 + (hash_seed % 4)::INTEGER;

            INSERT INTO survey_responses (reviewer_id, question_id, rating)
            VALUES (sr_rec.reviewer_id, q_rec.question_id, rating_val)
            ON CONFLICT (reviewer_id, question_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 9 — MOCK DATA: SURVEY COMMENTS
--   One qualitative comment per COMPLETED reviewer across all
--   cycles.  Sample comments are rotated deterministically.
-- ============================================================

DO $$
DECLARE
    sr_rec      RECORD;
    comments    TEXT[] := ARRAY[
        'Consistently delivers high-quality work and communicates proactively with stakeholders.',
        'A reliable team player who brings creative solutions to complex problems.',
        'Demonstrates strong ownership and follow-through on all assigned deliverables.',
        'Excellent communicator who keeps everyone aligned and informed at all times.',
        'Shows great initiative and is always willing to go beyond the scope of assigned tasks.',
        'A dependable colleague who leads by example and upholds the highest professional standards.',
        'Strong analytical thinking combined with an ability to explain complex ideas simply.',
        'Adapts quickly to changing priorities while maintaining output quality.',
        'Inspires confidence in peers through transparent communication and consistent delivery.',
        'A natural mentor — always willing to help team members grow and succeed.',
        'Makes well-reasoned decisions under pressure and takes full accountability for outcomes.',
        'Builds trust within the team by being honest, transparent and fair.',
        'Proactively identifies risks early and escalates with clear mitigation plans.',
        'Creates an inclusive environment where every voice is heard and valued.',
        'Brings positive energy to the team and maintains morale even during challenging periods.'
    ];
    idx         INTEGER;
    hash_val    BIGINT;
BEGIN
    FOR sr_rec IN
        SELECT sr.reviewer_id
        FROM   survey_reviewers sr
        JOIN   survey_assignments sa ON sa.assignment_id = sr.assignment_id
        WHERE  sr.status = 'COMPLETED'
        ORDER BY sr.reviewer_id
    LOOP
        hash_val := (('x' || MD5('comment' || sr_rec.reviewer_id::TEXT))::BIT(32)::INT::BIGINT & 65535);
        idx      := 1 + (hash_val % array_length(comments, 1))::INTEGER;

        INSERT INTO survey_comments (reviewer_id, comment_text)
        VALUES (sr_rec.reviewer_id, comments[idx])
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;


-- ============================================================
-- PART 10 — MOCK DATA: SELF-FEEDBACK
--   For all 3 cycles.
--   PUBLISHED cycles: all employees SUBMITTED.
--   ACTIVE cycle: first 150 employees SUBMITTED, rest DRAFT.
-- ============================================================

DO $$
DECLARE
    cycle_rec   RECORD;
    emp_rec     RECORD;
    cnt         INTEGER;
    ratings     JSONB;
    stat        TEXT;
    sub_at      TIMESTAMPTZ;
BEGIN
    FOR cycle_rec IN
        SELECT cycle_id, status
        FROM   review_cycles
        ORDER BY start_date
    LOOP
        cnt := 0;

        FOR emp_rec IN
            SELECT e.employee_id, e.group_name
            FROM   employees e
            WHERE  e.is_active   = TRUE
              AND  e.group_name IN ('IC','TM','HOD','CXO')
            ORDER BY e.employee_id
        LOOP
            cnt := cnt + 1;

            -- Status logic
            stat := CASE
                WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'SUBMITTED'
                WHEN cnt <= 150                                     THEN 'SUBMITTED'
                ELSE 'DRAFT'
            END;

            sub_at := CASE
                WHEN stat = 'SUBMITTED' THEN
                    CASE
                        WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                             THEN '2025-06-15 10:00:00+00'::TIMESTAMPTZ
                        WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                             THEN '2025-12-15 10:00:00+00'::TIMESTAMPTZ
                        ELSE NOW() - ((400 - cnt) * INTERVAL '1 hour')
                    END
                ELSE NULL
            END;

            -- Build competency ratings per group
            ratings := CASE emp_rec.group_name
                WHEN 'IC' THEN '[
                    {"competency_id":"COMM","competency_name":"Communication","rating":3,"label":"Significant Impact"},
                    {"competency_id":"TEAM","competency_name":"Teamwork","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"QUAL","competency_name":"Quality","rating":3,"label":"Significant Impact"},
                    {"competency_id":"RELY","competency_name":"Reliability","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"INIT","competency_name":"Initiative","rating":3,"label":"Significant Impact"},
                    {"competency_id":"ADPT","competency_name":"Adaptability","rating":2,"label":"Moderate Impact"},
                    {"competency_id":"GROW","competency_name":"Growth Mindset","rating":3,"label":"Significant Impact"},
                    {"competency_id":"PROF","competency_name":"Professionalism","rating":4,"label":"Outstanding Impact"}
                ]'::JSONB
                WHEN 'TM' THEN '[
                    {"competency_id":"LEAD","competency_name":"Leadership","rating":3,"label":"Significant Impact"},
                    {"competency_id":"MENT","competency_name":"Mentorship","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"DCSN","competency_name":"Decision Making","rating":3,"label":"Significant Impact"},
                    {"competency_id":"DLGT","competency_name":"Delegation","rating":3,"label":"Significant Impact"},
                    {"competency_id":"CNFL","competency_name":"Conflict Resolution","rating":2,"label":"Moderate Impact"},
                    {"competency_id":"ACCT","competency_name":"Accountability","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"COMM","competency_name":"Communication","rating":3,"label":"Significant Impact"},
                    {"competency_id":"PLAN","competency_name":"Planning","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"RECG","competency_name":"Recognition","rating":3,"label":"Significant Impact"}
                ]'::JSONB
                WHEN 'HOD' THEN '[
                    {"competency_id":"STRT","competency_name":"Strategy","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"XFNL","competency_name":"Cross-functional","rating":3,"label":"Significant Impact"},
                    {"competency_id":"RSMG","competency_name":"Resource Management","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"CHMG","competency_name":"Change Management","rating":3,"label":"Significant Impact"},
                    {"competency_id":"EXPR","competency_name":"Executive Presence","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"TDEV","competency_name":"Talent Development","rating":3,"label":"Significant Impact"},
                    {"competency_id":"INNO","competency_name":"Innovation","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"BACU","competency_name":"Business Acumen","rating":3,"label":"Significant Impact"},
                    {"competency_id":"CULT","competency_name":"Culture","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"PROF","competency_name":"Professionalism","rating":3,"label":"Significant Impact"}
                ]'::JSONB
                ELSE -- CXO
                    '[
                    {"competency_id":"EXPR","competency_name":"Executive Presence","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"TDEV","competency_name":"Talent Development","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"INNO","competency_name":"Innovation","rating":3,"label":"Significant Impact"},
                    {"competency_id":"BACU","competency_name":"Business Acumen","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"CULT","competency_name":"Culture","rating":4,"label":"Outstanding Impact"}
                ]'::JSONB
            END;

            INSERT INTO self_feedback
                (employee_id, cycle_id, competency_ratings, status, submitted_at)
            VALUES
                (emp_rec.employee_id, cycle_rec.cycle_id, ratings, stat, sub_at)
            ON CONFLICT (employee_id, cycle_id) DO NOTHING;

        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 11 — MOCK DATA: CALCULATED SCORES
--   Scores for ALL employees for both PUBLISHED cycles and
--   for COMPLETED assignments in the ACTIVE cycle.
-- ============================================================

DO $$
DECLARE
    cycle_rec    RECORD;
    emp_rec      RECORD;
    raw_score    NUMERIC(4,2);
    self_s       NUMERIC(4,2);
    label_text   TEXT;
    comp_scores  JSONB;
    rev_cat_sc   JSONB;
    tot_rev      INTEGER;
    calc_ts      TIMESTAMPTZ;
BEGIN
    FOR cycle_rec IN
        SELECT cycle_id, status
        FROM   review_cycles
        ORDER BY start_date
    LOOP
        FOR emp_rec IN
            SELECT e.employee_id, e.group_name
            FROM   employees e
            WHERE  e.is_active = TRUE
            -- For active cycle, only employees with COMPLETED assignments get scores
            AND (
                cycle_rec.status IN ('PUBLISHED','COMPLETED')
                OR EXISTS (
                    SELECT 1 FROM survey_assignments sa
                    WHERE sa.employee_id = e.employee_id
                      AND sa.cycle_id    = cycle_rec.cycle_id
                      AND sa.status      = 'COMPLETED'
                )
            )
        LOOP
            -- Deterministic pseudo-random colleague score (1.50–4.00)
            raw_score := ROUND((
                1.5 + (
                    (('x' || MD5(emp_rec.employee_id || cycle_rec.cycle_id::TEXT))::BIT(32)::INT::BIGINT & 65535)
                    ::NUMERIC / 65535.0 * 2.5
                )
            )::NUMERIC, 2);

            -- Deterministic pseudo-random self score (1.50–4.00)
            self_s := ROUND((
                1.5 + (
                    (('x' || MD5('self' || emp_rec.employee_id || cycle_rec.cycle_id::TEXT))::BIT(32)::INT::BIGINT & 65535)
                    ::NUMERIC / 65535.0 * 2.5
                )
            )::NUMERIC, 2);

            -- Clamp scores to max 4.0
            raw_score := LEAST(raw_score, 4.0);
            self_s    := LEAST(self_s,    4.0);

            label_text := CASE
                WHEN raw_score >= 3.5 THEN 'Outstanding Impact'
                WHEN raw_score >= 2.5 THEN 'Significant Impact'
                WHEN raw_score >= 1.5 THEN 'Moderate Impact'
                ELSE 'Not Enough Impact'
            END;

            -- Per-competency breakdown
            comp_scores := CASE emp_rec.group_name
                WHEN 'IC' THEN jsonb_build_object(
                    'COMM', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'TEAM', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                    'QUAL', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                    'RELY', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                    'INIT', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                    'ADPT', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                    'GROW', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                    'PROF', LEAST(ROUND(raw_score + 0.05, 2), 4.0)
                )
                WHEN 'TM' THEN jsonb_build_object(
                    'LEAD', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'MENT', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                    'DCSN', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                    'DLGT', LEAST(ROUND(raw_score - 0.15, 2), 4.0),
                    'CNFL', LEAST(ROUND(raw_score - 0.25, 2), 4.0),
                    'ACCT', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                    'COMM', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                    'PLAN', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'RECG', LEAST(ROUND(raw_score + 0.15, 2), 4.0)
                )
                WHEN 'HOD' THEN jsonb_build_object(
                    'STRT', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                    'XFNL', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                    'RSMG', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'CHMG', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                    'EXPR', LEAST(ROUND(raw_score + 0.25, 2), 4.0),
                    'TDEV', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                    'INNO', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                    'BACU', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                    'CULT', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'PROF', LEAST(ROUND(raw_score - 0.05, 2), 4.0)
                )
                ELSE -- CXO
                    jsonb_build_object(
                    'EXPR', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                    'TDEV', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                    'INNO', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                    'BACU', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                    'CULT', LEAST(ROUND(raw_score + 0.10, 2), 4.0)
                )
            END;

            -- Per-reviewer-type breakdown
            rev_cat_sc := jsonb_build_object(
                'MANAGER',          LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                'PEER',             LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                'DIRECT_REPORT',    LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                'CROSS_FUNCTIONAL', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                'CXO',              LEAST(ROUND(raw_score + 0.05, 2), 4.0)
            );

            -- Detailed reviewer-competency breakdown (2D: reviewer_type -> competency -> score)
            -- This provides granular analysis showing how each reviewer category rated each competency
            DECLARE
                rev_comp_breakdown JSONB;
            BEGIN
                rev_comp_breakdown := CASE emp_rec.group_name
                    WHEN 'IC' THEN jsonb_build_object(
                        'MANAGER', jsonb_build_object(
                            'COMM', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'TEAM', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'QUAL', LEAST(ROUND(raw_score + 0.30, 2), 4.0),
                            'RELY', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'INIT', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'ADPT', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'GROW', LEAST(ROUND(raw_score + 0.25, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score + 0.15, 2), 4.0)
                        ),
                        'PEER', jsonb_build_object(
                            'COMM', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'TEAM', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                            'QUAL', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'RELY', LEAST(ROUND(raw_score - 0.15, 2), 4.0),
                            'INIT', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'ADPT', LEAST(ROUND(raw_score - 0.30, 2), 4.0),
                            'GROW', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score - 0.05, 2), 4.0)
                        ),
                        'CROSS_FUNCTIONAL', jsonb_build_object(
                            'COMM', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'TEAM', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'QUAL', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'RELY', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'INIT', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'ADPT', LEAST(ROUND(raw_score - 0.15, 2), 4.0),
                            'GROW', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score + 0.00, 2), 4.0)
                        )
                    )
                    WHEN 'TM' THEN jsonb_build_object(
                        'MANAGER', jsonb_build_object(
                            'LEAD', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'MENT', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'DCSN', LEAST(ROUND(raw_score + 0.30, 2), 4.0),
                            'DLGT', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'CNFL', LEAST(ROUND(raw_score - 0.15, 2), 4.0),
                            'ACCT', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'COMM', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'PLAN', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'RECG', LEAST(ROUND(raw_score + 0.25, 2), 4.0)
                        ),
                        'PEER', jsonb_build_object(
                            'LEAD', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'MENT', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                            'DCSN', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'DLGT', LEAST(ROUND(raw_score - 0.25, 2), 4.0),
                            'CNFL', LEAST(ROUND(raw_score - 0.35, 2), 4.0),
                            'ACCT', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'COMM', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'PLAN', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'RECG', LEAST(ROUND(raw_score + 0.05, 2), 4.0)
                        ),
                        'DIRECT_REPORT', jsonb_build_object(
                            'LEAD', LEAST(ROUND(raw_score + 0.30, 2), 4.0),
                            'MENT', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'DCSN', LEAST(ROUND(raw_score + 0.40, 2), 4.0),
                            'DLGT', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'CNFL', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'ACCT', LEAST(ROUND(raw_score + 0.30, 2), 4.0),
                            'COMM', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'PLAN', LEAST(ROUND(raw_score + 0.25, 2), 4.0),
                            'RECG', LEAST(ROUND(raw_score + 0.35, 2), 4.0)
                        ),
                        'CROSS_FUNCTIONAL', jsonb_build_object(
                            'LEAD', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'MENT', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'DCSN', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'DLGT', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'CNFL', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                            'ACCT', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'COMM', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'PLAN', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'RECG', LEAST(ROUND(raw_score + 0.10, 2), 4.0)
                        )
                    )
                    WHEN 'HOD' THEN jsonb_build_object(
                        'CXO', jsonb_build_object(
                            'STRT', LEAST(ROUND(raw_score + 0.30, 2), 4.0),
                            'XFNL', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'RSMG', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'CHMG', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'EXPR', LEAST(ROUND(raw_score + 0.35, 2), 4.0),
                            'TDEV', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'INNO', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'BACU', LEAST(ROUND(raw_score + 0.25, 2), 4.0),
                            'CULT', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score + 0.05, 2), 4.0)
                        ),
                        'PEER', jsonb_build_object(
                            'STRT', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'XFNL', LEAST(ROUND(raw_score - 0.20, 2), 4.0),
                            'RSMG', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'CHMG', LEAST(ROUND(raw_score - 0.30, 2), 4.0),
                            'EXPR', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'TDEV', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'INNO', LEAST(ROUND(raw_score - 0.10, 2), 4.0),
                            'BACU', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'CULT', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score - 0.15, 2), 4.0)
                        ),
                        'DIRECT_REPORT', jsonb_build_object(
                            'STRT', LEAST(ROUND(raw_score + 0.25, 2), 4.0),
                            'XFNL', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'RSMG', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'CHMG', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'EXPR', LEAST(ROUND(raw_score + 0.40, 2), 4.0),
                            'TDEV', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'INNO', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'BACU', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'CULT', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score + 0.05, 2), 4.0)
                        ),
                        'CROSS_FUNCTIONAL', jsonb_build_object(
                            'STRT', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'XFNL', LEAST(ROUND(raw_score - 0.15, 2), 4.0),
                            'RSMG', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'CHMG', LEAST(ROUND(raw_score - 0.25, 2), 4.0),
                            'EXPR', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'TDEV', LEAST(ROUND(raw_score + 0.00, 2), 4.0),
                            'INNO', LEAST(ROUND(raw_score - 0.05, 2), 4.0),
                            'BACU', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'CULT', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'PROF', LEAST(ROUND(raw_score - 0.10, 2), 4.0)
                        )
                    )
                    ELSE -- CXO
                        jsonb_build_object(
                        'PEER', jsonb_build_object(
                            'EXPR', LEAST(ROUND(raw_score + 0.20, 2), 4.0),
                            'TDEV', LEAST(ROUND(raw_score + 0.10, 2), 4.0),
                            'INNO', LEAST(ROUND(raw_score + 0.05, 2), 4.0),
                            'BACU', LEAST(ROUND(raw_score + 0.15, 2), 4.0),
                            'CULT', LEAST(ROUND(raw_score + 0.10, 2), 4.0)
                        )
                    )
                END;

            -- Total reviewer count (deterministic 4–8)
            tot_rev := 4 + ((('x' || MD5(emp_rec.employee_id))::BIT(8)::INT) % 5);

            -- Calculation timestamp
            calc_ts := CASE
                WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                     THEN '2025-07-01 09:00:00+00'::TIMESTAMPTZ
                WHEN cycle_rec.cycle_id = '22222222-2222-2222-2222-222222222222'::UUID
                     THEN '2026-01-02 09:00:00+00'::TIMESTAMPTZ
                ELSE NOW()
            END;

            INSERT INTO calculated_scores
                (employee_id, cycle_id, self_score, colleague_score, final_label,
                 competency_scores, reviewer_category_scores, reviewer_competency_breakdown,
                 total_reviewers, calculated_at)
            VALUES
                (emp_rec.employee_id, cycle_rec.cycle_id,
                 self_s, raw_score, label_text,
                 comp_scores, rev_cat_sc, rev_comp_breakdown,
                 tot_rev, calc_ts)
            ON CONFLICT (employee_id, cycle_id) DO NOTHING;

            END;

        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 12 — MOCK DATA: NOTIFICATION LOG
--   Simulates notifications fired during all 3 cycles:
--   CYCLE_START, SURVEY_ASSIGNED, SURVEY_REMINDER,
--   SELF_REMINDER, RESULTS_PUBLISHED.
--   Status: SENT for older cycles, mix of SENT/PENDING for active.
-- ============================================================

DO $$
DECLARE
    emp_rec   RECORD;
    cycle_rec RECORD;
    ch        TEXT;
    notif_status TEXT;
    sent_ts   TIMESTAMPTZ;
    base_sub  TEXT;
    base_body TEXT;
    tmpl_id   TEXT;
    event_no  INTEGER;
BEGIN
    -- ── Cycle-start notifications for all 3 cycles ────────────
    FOR cycle_rec IN
        SELECT cycle_id, cycle_name, status, start_date
        FROM   review_cycles
        ORDER BY start_date
    LOOP
        FOR emp_rec IN
            SELECT employee_id, full_name
            FROM   employees
            WHERE  is_active = TRUE
            ORDER BY employee_id
            LIMIT 400
        LOOP
            FOR ch IN SELECT unnest(ARRAY['EMAIL','TEAMS'])
            LOOP
                notif_status := CASE WHEN cycle_rec.status IN ('PUBLISHED','COMPLETED') THEN 'SENT' ELSE 'SENT' END;
                sent_ts      := cycle_rec.start_date + INTERVAL '1 hour';

                INSERT INTO notification_log
                    (template_id, recipient_id, channel, subject, body, status, sent_at)
                VALUES (
                    'CYCLE_START',
                    emp_rec.employee_id,
                    ch,
                    '360 Feedback Cycle "' || cycle_rec.cycle_name || '" has started',
                    'Dear ' || emp_rec.full_name || ', the cycle ' || cycle_rec.cycle_name || ' is now ACTIVE.',
                    notif_status,
                    sent_ts
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    -- ── Survey-assigned notifications (active cycle, EMAIL only, first 200 employees) ─
    FOR emp_rec IN
        SELECT employee_id, full_name
        FROM   employees
        WHERE  is_active = TRUE
        ORDER BY employee_id
        LIMIT 200
    LOOP
        INSERT INTO notification_log
            (template_id, recipient_id, channel, subject, body, status, sent_at)
        VALUES (
            'SURVEY_ASSIGNED',
            emp_rec.employee_id,
            'EMAIL',
            'You have been assigned to review peers in H1 2026 — 360 Review',
            'Dear ' || emp_rec.full_name || ', please complete your assigned surveys by 2026-06-30.',
            'SENT',
            '2026-02-03 09:00:00+00'::TIMESTAMPTZ
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── Reminder notifications (active cycle, first 100 employees still PENDING) ─
    FOR emp_rec IN
        SELECT e.employee_id, e.full_name
        FROM   employees e
        JOIN   survey_assignments sa
               ON  sa.employee_id = e.employee_id
               AND sa.cycle_id    = '33333333-3333-3333-3333-333333333333'::UUID
               AND sa.status      = 'PENDING'
        WHERE  e.is_active = TRUE
        ORDER BY e.employee_id
        LIMIT 100
    LOOP
        INSERT INTO notification_log
            (template_id, recipient_id, channel, subject, body, status, sent_at)
        VALUES (
            'SURVEY_REMINDER',
            emp_rec.employee_id,
            'EMAIL',
            'Reminder: surveys pending — due in 7 day(s)',
            'Dear ' || emp_rec.full_name || ', you have pending surveys. Please complete them before the deadline.',
            'SENT',
            NOW() - INTERVAL '7 days'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── Self-feedback reminders (active cycle, DRAFT self-feedbacks) ─
    FOR emp_rec IN
        SELECT e.employee_id, e.full_name
        FROM   employees e
        JOIN   self_feedback sf
               ON  sf.employee_id = e.employee_id
               AND sf.cycle_id    = '33333333-3333-3333-3333-333333333333'::UUID
               AND sf.status      = 'DRAFT'
        WHERE  e.is_active = TRUE
        ORDER BY e.employee_id
        LIMIT 100
    LOOP
        INSERT INTO notification_log
            (template_id, recipient_id, channel, subject, body, status, sent_at)
        VALUES (
            'SELF_REMINDER',
            emp_rec.employee_id,
            'EMAIL',
            'Reminder: Complete your self-feedback — due in 7 day(s)',
            'Dear ' || emp_rec.full_name || ', please complete your self-feedback for H1 2026 review.',
            'SENT',
            NOW() - INTERVAL '7 days'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── Results-published notifications (PUBLISHED cycles only) ─
    FOR cycle_rec IN
        SELECT cycle_id, cycle_name
        FROM   review_cycles
        WHERE  status = 'PUBLISHED'
        ORDER BY start_date
    LOOP
        FOR emp_rec IN
            SELECT employee_id, full_name
            FROM   employees
            WHERE  is_active = TRUE
            ORDER BY employee_id
            LIMIT 400
        LOOP
            INSERT INTO notification_log
                (template_id, recipient_id, channel, subject, body, status, sent_at)
            VALUES (
                'RESULTS_PUBLISHED',
                emp_rec.employee_id,
                'EMAIL',
                'Your 360 Feedback results for "' || cycle_rec.cycle_name || '" are now available',
                'Dear ' || emp_rec.full_name || ', your 360 results for ' || cycle_rec.cycle_name || ' are published.',
                'SENT',
                CASE
                    WHEN cycle_rec.cycle_id = '11111111-1111-1111-1111-111111111111'::UUID
                         THEN '2025-07-02 09:00:00+00'::TIMESTAMPTZ
                    ELSE '2026-01-03 09:00:00+00'::TIMESTAMPTZ
                END
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- ── A few FAILED notifications to simulate delivery errors ─
    FOR emp_rec IN
        SELECT employee_id, full_name
        FROM   employees
        WHERE  is_active = TRUE
        ORDER BY employee_id
        LIMIT 5
    LOOP
        INSERT INTO notification_log
            (template_id, recipient_id, channel, subject, body, status, sent_at, error_message)
        VALUES (
            'SURVEY_REMINDER',
            emp_rec.employee_id,
            'TEAMS',
            'Reminder: surveys pending — due in 3 day(s)',
            'Please complete your pending surveys.',
            'FAILED',
            NULL,
            'Teams webhook returned 429 Too Many Requests'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- ── A few PENDING notifications (queued but not yet sent) ─
    FOR emp_rec IN
        SELECT employee_id, full_name
        FROM   employees
        WHERE  is_active = TRUE
        ORDER BY employee_id DESC
        LIMIT 10
    LOOP
        INSERT INTO notification_log
            (template_id, recipient_id, channel, subject, body, status)
        VALUES (
            'SURVEY_REMINDER',
            emp_rec.employee_id,
            'EMAIL',
            'Reminder: surveys pending — due in 1 day(s)',
            'Dear ' || emp_rec.full_name || ', your surveys are due tomorrow. Please complete them now.',
            'PENDING'
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

END $$;


-- ============================================================
-- PART 13 — MOCK DATA: AUDIT LOG
--   Records key administrative actions taken during the
--   lifecycle of all 3 cycles and related configuration changes.
-- ============================================================

INSERT INTO audit_log
    (user_id, action_type, entity_type, entity_id, old_value, new_value, ip_address, created_at)
VALUES
-- Cycle 1 lifecycle
('EMP001','CREATE',   'review_cycles',  '11111111-1111-1111-1111-111111111111',
 NULL,
 '{"cycle_name":"H1 2025 — 360 Review","status":"DRAFT"}',
 '10.0.1.5', '2025-01-01 08:00:00+00'),

('EMP001','ACTIVATE', 'review_cycles',  '11111111-1111-1111-1111-111111111111',
 '{"status":"DRAFT"}',
 '{"status":"ACTIVE"}',
 '10.0.1.5', '2025-01-06 09:00:00+00'),

('EMP001','UPDATE',   'review_cycles',  '11111111-1111-1111-1111-111111111111',
 '{"status":"ACTIVE"}',
 '{"status":"CLOSING"}',
 '10.0.1.5', '2025-06-30 18:00:00+00'),

('EMP001','UPDATE',   'review_cycles',  '11111111-1111-1111-1111-111111111111',
 '{"status":"CLOSING"}',
 '{"status":"COMPLETED"}',
 '10.0.1.5', '2025-07-03 10:00:00+00'),

('EMP001','PUBLISH',  'review_cycles',  '11111111-1111-1111-1111-111111111111',
 '{"status":"COMPLETED"}',
 '{"status":"PUBLISHED"}',
 '10.0.1.5', '2025-07-05 09:00:00+00'),

-- Cycle 2 lifecycle
('EMP001','CREATE',   'review_cycles',  '22222222-2222-2222-2222-222222222222',
 NULL,
 '{"cycle_name":"H2 2025 — 360 Review","status":"DRAFT"}',
 '10.0.1.5', '2025-07-01 08:00:00+00'),

('EMP001','ACTIVATE', 'review_cycles',  '22222222-2222-2222-2222-222222222222',
 '{"status":"DRAFT"}',
 '{"status":"ACTIVE"}',
 '10.0.1.5', '2025-07-07 09:00:00+00'),

('EMP001','UPDATE',   'review_cycles',  '22222222-2222-2222-2222-222222222222',
 '{"status":"ACTIVE"}',
 '{"status":"CLOSING"}',
 '10.0.1.5', '2025-12-31 18:00:00+00'),

('EMP001','UPDATE',   'review_cycles',  '22222222-2222-2222-2222-222222222222',
 '{"status":"CLOSING"}',
 '{"status":"COMPLETED"}',
 '10.0.1.5', '2026-01-03 10:00:00+00'),

('EMP001','PUBLISH',  'review_cycles',  '22222222-2222-2222-2222-222222222222',
 '{"status":"COMPLETED"}',
 '{"status":"PUBLISHED"}',
 '10.0.1.5', '2026-01-05 09:00:00+00'),

-- Cycle 3 — created and activated
('EMP001','CREATE',   'review_cycles',  '33333333-3333-3333-3333-333333333333',
 NULL,
 '{"cycle_name":"H1 2026 — 360 Review","status":"DRAFT"}',
 '10.0.1.5', '2026-01-20 08:00:00+00'),

('EMP001','ACTIVATE', 'review_cycles',  '33333333-3333-3333-3333-333333333333',
 '{"status":"DRAFT"}',
 '{"status":"ACTIVE"}',
 '10.0.1.5', '2026-02-02 09:00:00+00'),

-- Reviewer config update
('EMP005','UPDATE',   'reviewer_config', 'singleton',
 '{"min_reviewers":2,"max_reviewers":6}',
 '{"min_reviewers":2,"max_reviewers":8}',
 '10.0.1.12', '2025-01-03 11:00:00+00'),

-- Employee deactivation
('EMP016','UPDATE',   'employees',       'EMP350',
 '{"is_active":true}',
 '{"is_active":false}',
 '10.0.1.12', '2026-02-10 14:00:00+00'),

-- Score recalculation
('EMP001','CALCULATE','calculated_scores','EMP006-11111111',
 NULL,
 '{"colleague_score":3.45,"final_label":"Significant Impact"}',
 '10.0.1.5', '2025-07-01 09:05:00+00'),

('EMP001','CALCULATE','calculated_scores','EMP006-22222222',
 NULL,
 '{"colleague_score":3.67,"final_label":"Outstanding Impact"}',
 '10.0.1.5', '2026-01-02 09:05:00+00'),

-- Notification template edit
('EMP005','UPDATE',   'notification_templates', 'CYCLE_START',
 '{"email_subject":"Feedback cycle has started"}',
 '{"email_subject":"360 Feedback Cycle \"{{cycle_name}}\" has started"}',
 '10.0.1.12', '2025-01-02 10:30:00+00'),

-- Bulk assignment creation
('EMP016','CREATE',   'survey_assignments','bulk-h1-2026',
 NULL,
 '{"cycle_id":"33333333-3333-3333-3333-333333333333","count":400}',
 '10.0.1.12', '2026-02-02 10:00:00+00'),

-- Reviewer added manually
('EMP016','CREATE',   'survey_reviewers', 'manual-reviewer-001',
 NULL,
 '{"reviewer_type":"PEER","reviewer_employee_id":"EMP100"}',
 '10.0.1.12', '2026-02-05 15:00:00+00'),

-- Reviewer removed
('EMP016','DELETE',   'survey_reviewers', 'manual-reviewer-001',
 '{"reviewer_type":"PEER","reviewer_employee_id":"EMP100"}',
 NULL,
 '10.0.1.12', '2026-02-06 09:00:00+00');


-- ============================================================
-- PART 14 — MOCK DATA: AD SYNC LOG
-- ============================================================

INSERT INTO ad_sync_log
    (sync_type, status, employees_added, employees_updated, employees_deactivated,
     error_message, started_at, completed_at)
VALUES
('MANUAL',    'SUCCESS', 400, 0,  0,  NULL,
 '2026-02-01 06:00:00+00', '2026-02-01 06:04:22+00'),

('SCHEDULED', 'SUCCESS', 0,   3,  0,  NULL,
 '2026-02-10 02:00:00+00', '2026-02-10 02:01:44+00'),

('SCHEDULED', 'SUCCESS', 0,   1,  0,  NULL,
 '2026-02-17 02:00:00+00', '2026-02-17 02:01:12+00'),

('SCHEDULED', 'PARTIAL', 0,   2,  1,  'AD attribute "designation" missing for EMP372; skipped.',
 '2026-02-24 02:00:00+00', '2026-02-24 02:02:05+00'),

('SCHEDULED', 'FAILED',  0,   0,  0,  'Connection timeout — Azure AD Graph API unreachable.',
 '2025-12-01 02:00:00+00', NULL),

('MANUAL',    'SUCCESS', 5,   0,  0,  NULL,
 '2025-07-10 08:30:00+00', '2025-07-10 08:31:18+00'),

('SCHEDULED', 'SUCCESS', 0,   8,  2,  NULL,
 '2025-10-01 02:00:00+00', '2025-10-01 02:02:50+00'),

('SCHEDULED', 'SUCCESS', 2,   5,  0,  NULL,
 '2025-04-15 02:00:00+00', '2025-04-15 02:01:55+00');


-- ============================================================
-- PART 15 — VERIFICATION QUERIES
-- (uncomment to run after seeding)
-- ============================================================
/*
SELECT 'employees'            AS tbl, COUNT(*) FROM employees;
SELECT 'competencies'         AS tbl, COUNT(*) FROM competencies;
SELECT 'questions'            AS tbl, COUNT(*) FROM questions;
SELECT 'reviewer_config'      AS tbl, COUNT(*) FROM reviewer_config;
SELECT 'notification_templates' AS tbl, COUNT(*) FROM notification_templates;
SELECT 'review_cycles'        AS tbl, COUNT(*) FROM review_cycles;
SELECT 'survey_assignments'   AS tbl, COUNT(*) FROM survey_assignments;
SELECT 'survey_reviewers'     AS tbl, COUNT(*) FROM survey_reviewers;
SELECT 'survey_responses'     AS tbl, COUNT(*) FROM survey_responses;
SELECT 'survey_comments'      AS tbl, COUNT(*) FROM survey_comments;
SELECT 'self_feedback'        AS tbl, COUNT(*) FROM self_feedback;
SELECT 'calculated_scores'    AS tbl, COUNT(*) FROM calculated_scores;
SELECT 'notification_log'     AS tbl, COUNT(*) FROM notification_log;
SELECT 'audit_log'            AS tbl, COUNT(*) FROM audit_log;
SELECT 'ad_sync_log'          AS tbl, COUNT(*) FROM ad_sync_log;
*/

-- ============================================================
-- END OF MOCK DATA SCRIPT
-- ============================================================
