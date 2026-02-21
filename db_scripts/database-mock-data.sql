

-- ============================================================
-- PART 6 — SEED DATA: COMPETENCIES (25)
-- ============================================================
INSERT INTO competencies (competency_id, competency_name, description, applicable_to) VALUES
-- IC competencies
('COMM','Communication',          'Ability to communicate ideas clearly and listen actively',              ARRAY['IC','TM','HOD']),
('TEAM','Teamwork',               'Collaboration and support of colleagues toward shared goals',           ARRAY['IC','TM']),
('QUAL','Quality',                'Delivering high-quality, detailed work consistently',                  ARRAY['IC','TM']),
('RELY','Reliability',            'Meeting deadlines, dependability and follow-through',                  ARRAY['IC','TM']),
('INIT','Initiative',             'Taking ownership and solving problems proactively',                    ARRAY['IC','TM']),
('ADPT','Adaptability',           'Adjusting to change and remaining effective under pressure',           ARRAY['IC','TM']),
('GROW','Growth Mindset',         'Willingness to learn, accept feedback and develop skills',             ARRAY['IC','TM']),
('PROF','Professionalism',        'Positive attitude, ethical conduct and workplace standards',           ARRAY['IC','TM','HOD']),
-- TM competencies
('LEAD','Leadership',             'Providing clear direction and inspiring the team',                     ARRAY['TM','HOD']),
('MENT','Mentorship',             'Coaching, developing and providing feedback to team members',          ARRAY['TM','HOD']),
('DCSN','Decision Making',        'Making timely, informed and effective decisions',                      ARRAY['TM','HOD']),
('DLGT','Delegation',             'Appropriately assigning tasks and empowering team members',            ARRAY['TM','HOD']),
('CNFL','Conflict Resolution',    'Handling team conflicts constructively and fairly',                    ARRAY['TM','HOD']),
('ACCT','Accountability',         'Holding team accountable and taking responsibility for outcomes',      ARRAY['TM','HOD']),
('PLAN','Planning',               'Setting realistic goals, milestones and tracking progress',            ARRAY['TM','HOD']),
('RECG','Recognition',            'Recognising and appreciating contributions of team members',           ARRAY['TM','HOD']),
-- HOD competencies
('STRT','Strategy',               'Aligning team goals with company vision and anticipating challenges',  ARRAY['HOD']),
('XFNL','Cross-functional',       'Building relationships and facilitating collaboration across depts',   ARRAY['HOD']),
('RSMG','Resource Management',    'Optimising team resources, budget and staffing decisions',             ARRAY['HOD']),
('CHMG','Change Management',      'Leading organisational change and helping team navigate transitions',  ARRAY['HOD']),
('EXPR','Executive Presence',     'Representing department effectively and communicating vision',         ARRAY['HOD','CXO']),
('TDEV','Talent Development',     'Building leadership pipeline and creating growth opportunities',       ARRAY['HOD','CXO']),
('INNO','Innovation',             'Encouraging experimentation and implementing process improvements',    ARRAY['HOD','CXO']),
('BACU','Business Acumen',        'Understanding and acting on business priorities',                      ARRAY['HOD','CXO']),
('CULT','Culture',                'Championing company values and culture across the organisation',       ARRAY['HOD','CXO'])
ON CONFLICT (competency_id) DO NOTHING;


-- ============================================================
-- PART 7 — SEED DATA: QUESTIONS (46 total)
-- ============================================================

-- IC Questions (15)
INSERT INTO questions (question_id, set_type, order_number, question_text, category, competency_id) VALUES
('IC-01','IC', 1,'Communicates ideas clearly and effectively',                'Communication',  'COMM'),
('IC-02','IC', 2,'Listens actively and responds appropriately',               'Communication',  'COMM'),
('IC-03','IC', 3,'Collaborates well with team members',                       'Teamwork',       'TEAM'),
('IC-04','IC', 4,'Supports colleagues in achieving shared goals',             'Teamwork',       'TEAM'),
('IC-05','IC', 5,'Delivers high-quality work consistently',                   'Quality',        'QUAL'),
('IC-06','IC', 6,'Pays attention to detail in deliverables',                  'Quality',        'QUAL'),
('IC-07','IC', 7,'Meets deadlines and commitments',                           'Reliability',    'RELY'),
('IC-08','IC', 8,'Is dependable and can be counted on',                       'Reliability',    'RELY'),
('IC-09','IC', 9,'Takes ownership of tasks proactively',                      'Initiative',     'INIT'),
('IC-10','IC',10,'Identifies and solves problems independently',              'Initiative',     'INIT'),
('IC-11','IC',11,'Adjusts well to changing priorities',                       'Adaptability',   'ADPT'),
('IC-12','IC',12,'Remains effective under pressure',                          'Adaptability',   'ADPT'),
('IC-13','IC',13,'Shows willingness to learn new skills',                     'Growth',         'GROW'),
('IC-14','IC',14,'Accepts and acts on feedback constructively',               'Growth',         'GROW'),
('IC-15','IC',15,'Maintains a positive and professional attitude',            'Professionalism','PROF')
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
('HOD-01','HOD', 1,'Aligns team goals with company vision',                       'Strategy',            'STRT'),
('HOD-02','HOD', 2,'Anticipates future challenges and opportunities',             'Strategy',            'STRT'),
('HOD-03','HOD', 3,'Builds strong relationships across departments',              'Cross-functional',    'XFNL'),
('HOD-04','HOD', 4,'Facilitates collaboration between teams',                     'Cross-functional',    'XFNL'),
('HOD-05','HOD', 5,'Optimises team resources effectively',                        'Resource Management', 'RSMG'),
('HOD-06','HOD', 6,'Makes sound budget and staffing decisions',                   'Resource Management', 'RSMG'),
('HOD-07','HOD', 7,'Leads organisational change initiatives',                     'Change Management',   'CHMG'),
('HOD-08','HOD', 8,'Helps team navigate transitions smoothly',                    'Change Management',   'CHMG'),
('HOD-09','HOD', 9,'Represents department effectively to leadership',             'Executive Presence',  'EXPR'),
('HOD-10','HOD',10,'Communicates vision with clarity and conviction',             'Executive Presence',  'EXPR'),
('HOD-11','HOD',11,'Builds a strong pipeline of future leaders',                  'Talent Development',  'TDEV'),
('HOD-12','HOD',12,'Creates growth opportunities for high performers',            'Talent Development',  'TDEV'),
('HOD-13','HOD',13,'Encourages experimentation and new ideas',                    'Innovation',          'INNO'),
('HOD-14','HOD',14,'Implements process improvements proactively',                 'Innovation',          'INNO'),
('HOD-15','HOD',15,'Understands and acts on business priorities',                 'Business Acumen',     'BACU'),
('HOD-16','HOD',16,'Champions company values and culture',                        'Culture',             'CULT')
ON CONFLICT (question_id) DO NOTHING;


-- ============================================================
-- PART 8 — SEED DATA: NOTIFICATION TEMPLATES
-- ============================================================
INSERT INTO notification_templates
    (template_id, template_name, event_type, email_subject, email_body, teams_message)
VALUES
('CYCLE_START',
 'Cycle Started',
 'CYCLE_START',
 '360 Feedback Cycle "{{cycle_name}}" has started',
 'Dear {{employee_name}},\n\nThe 360 Feedback Cycle "{{cycle_name}}" is now active ({{start_date}} – {{end_date}}).\nPlease complete your self-feedback and any assigned peer reviews before the deadline.\n\nThank you.',
 '📢 360 Feedback Cycle **{{cycle_name}}** is now **ACTIVE**. Complete your reviews by {{end_date}}.'),

('SURVEY_ASSIGNED',
 'Survey Assigned',
 'SURVEY_ASSIGNED',
 'You have been assigned to review {{employee_name}}',
 'Dear {{reviewer_name}},\n\nYou have been assigned to provide 360 feedback for {{employee_name}} ({{designation}}, {{department}}).\n\nDeadline: {{deadline}}\n\nPlease log in to complete the survey.\n\nThank you.',
 '📋 You have a new survey to complete for **{{employee_name}}** — due **{{deadline}}**.'),

('SURVEY_REMINDER',
 'Survey Reminder',
 'SURVEY_REMINDER',
 'Reminder: {{pending_count}} survey(s) pending — due in {{days_left}} day(s)',
 'Dear {{reviewer_name}},\n\nThis is a reminder that you have {{pending_count}} pending survey(s) due in {{days_left}} day(s).\n\nPlease log in and complete your reviews before the deadline.\n\nThank you.',
 '⏰ Reminder: **{{pending_count}}** survey(s) due in **{{days_left}} day(s)**. Please submit before the deadline.'),

('SELF_REMINDER',
 'Self-Feedback Reminder',
 'SELF_REMINDER',
 'Reminder: Complete your self-feedback — due in {{days_left}} day(s)',
 'Dear {{employee_name}},\n\nThis is a reminder to complete your self-feedback for the cycle "{{cycle_name}}".\nDeadline: {{deadline}} ({{days_left}} day(s) remaining).\n\nThank you.',
 '⏰ Reminder: Complete your **self-feedback** by **{{deadline}}**.'),

('CYCLE_CLOSING',
 'Cycle Closing',
 'CYCLE_CLOSING',
 '360 Feedback Cycle "{{cycle_name}}" is closing — submit pending surveys',
 'Dear {{employee_name}},\n\nThe 360 Feedback Cycle "{{cycle_name}}" has entered its closing period.\nGrace period ends: {{grace_end_date}}.\n\nPlease submit all pending surveys immediately.\n\nThank you.',
 '🔔 Cycle **{{cycle_name}}** is **CLOSING**. Grace period ends {{grace_end_date}}. Submit now!'),

('RESULTS_PUBLISHED',
 'Results Published',
 'RESULTS_PUBLISHED',
 'Your 360 Feedback results for "{{cycle_name}}" are now available',
 'Dear {{employee_name}},\n\nYour 360 Feedback results for the cycle "{{cycle_name}}" have been published.\nLog in to view your competency breakdown, reviewer category scores and historical trends.\n\nThank you.',
 '🎉 360 Feedback results for **{{cycle_name}}** are now **PUBLISHED**. Log in to view your results.')
ON CONFLICT (template_id) DO NOTHING;


-- ============================================================
-- PART 9 — SEED DATA: REVIEWER CONFIG
-- ============================================================
INSERT INTO reviewer_config (min_reviewers, max_reviewers) VALUES (2, 8);


-- ============================================================
-- PART 10 — MOCK DATA: 400 EMPLOYEES
-- ============================================================
-- Structure:
--   EMP001–EMP005  : 5  CXO / Admin
--   EMP006–EMP020  : 15 HOD
--   EMP021–EMP060  : 40 Team Managers (2 per department)
--   EMP061–EMP400  : 340 Individual Contributors
-- ============================================================

-- 10.1 — CXO Employees (5)
INSERT INTO employees
    (employee_id, full_name, email, department, designation,
     reporting_manager_id, date_of_joining, group_name, applicable_competencies,
     cross_functional_groups, synced_at)
VALUES
('EMP001','Rajesh Kumar',   'rajesh.kumar@motadata.com',   'Executive',       'Chief Executive Officer',         NULL,       '2015-01-15','CXO', '["EXPR","TDEV","INNO","BACU","CULT"]'::JSONB, '["Executive","Engineering","Product","Sales","HR"]'::JSONB, NOW()),
('EMP002','Priya Sharma',   'priya.sharma@motadata.com',   'Technology',      'Chief Technology Officer',        'EMP001',   '2015-03-01','CXO', '["EXPR","TDEV","INNO","BACU","CULT"]'::JSONB, '["Technology","Engineering","DevOps","Security"]'::JSONB, NOW()),
('EMP003','Amit Patel',     'amit.patel@motadata.com',     'Product',         'Chief Product Officer',           'EMP001',   '2016-06-01','CXO', '["EXPR","TDEV","INNO","BACU","CULT"]'::JSONB, '["Product","Design","Marketing"]'::JSONB, NOW()),
('EMP004','Neha Gupta',     'neha.gupta@motadata.com',     'Finance',         'Chief Financial Officer',         'EMP001',   '2016-09-01','CXO', '["EXPR","TDEV","INNO","BACU","CULT"]'::JSONB, '["Finance","Legal","Operations"]'::JSONB, NOW()),
('EMP005','Vikram Singh',   'vikram.singh@motadata.com',   'HR & People',     'Chief Human Resources Officer',   'EMP001',   '2016-11-01','CXO', '["EXPR","TDEV","INNO","BACU","CULT"]'::JSONB, '["HR & People","Operations","Executive"]'::JSONB, NOW());

-- 10.2 — HOD Employees (15)
INSERT INTO employees
    (employee_id, full_name, email, department, designation,
     reporting_manager_id, date_of_joining, group_name, applicable_competencies,
     cross_functional_groups, synced_at)
VALUES
('EMP006','Ananya Iyer',       'ananya.iyer@motadata.com',       'Engineering',             'Head of Engineering',         'EMP002','2017-01-10','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Engineering","Product","DevOps","Security"]'::JSONB,NOW()),
('EMP007','Sanjay Mehta',      'sanjay.mehta@motadata.com',      'Product',                 'Head of Product',             'EMP003','2017-03-15','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Product","Engineering","Design","Marketing"]'::JSONB,NOW()),
('EMP008','Kavya Reddy',       'kavya.reddy@motadata.com',       'Design',                  'Head of Design',              'EMP003','2017-05-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Design","Product","Marketing","Engineering"]'::JSONB,NOW()),
('EMP009','Arjun Nair',        'arjun.nair@motadata.com',        'Data Science',            'Head of Data Science',        'EMP002','2017-07-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Data Science","Engineering","Product","Finance"]'::JSONB,NOW()),
('EMP010','Deepa Krishnan',    'deepa.krishnan@motadata.com',    'QA & Testing',            'Head of QA & Testing',        'EMP002','2017-08-15','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["QA & Testing","Engineering","DevOps","Product"]'::JSONB,NOW()),
('EMP011','Rohit Joshi',       'rohit.joshi@motadata.com',       'DevOps & Infrastructure', 'Head of DevOps',              'EMP002','2017-09-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["DevOps & Infrastructure","Engineering","Security","Cloud"]'::JSONB,NOW()),
('EMP012','Sneha Choudhary',   'sneha.choudhary@motadata.com',   'Sales',                   'Head of Sales',               'EMP001','2017-10-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Sales","Marketing","Customer Success","Product"]'::JSONB,NOW()),
('EMP013','Aditya Kumar',      'aditya.kumar@motadata.com',      'Marketing',               'Head of Marketing',           'EMP001','2017-11-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Marketing","Sales","Product","Design"]'::JSONB,NOW()),
('EMP014','Preethi Nair',      'preethi.nair@motadata.com',      'Customer Success',        'Head of Customer Success',    'EMP001','2018-01-15','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Customer Success","Sales","Support","Product"]'::JSONB,NOW()),
('EMP015','Kiran Verma',       'kiran.verma@motadata.com',       'Customer Support',        'Head of Customer Support',    'EMP001','2018-02-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Customer Support","Customer Success","Product","Engineering"]'::JSONB,NOW()),
('EMP016','Meera Pillai',      'meera.pillai@motadata.com',      'HR & People',             'Head of HR',                  'EMP005','2018-03-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["HR & People","Operations","Executive","Finance"]'::JSONB,NOW()),
('EMP017','Suresh Bhatt',      'suresh.bhatt@motadata.com',      'Finance',                 'Head of Finance',             'EMP004','2018-04-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Finance","Operations","Legal","HR & People"]'::JSONB,NOW()),
('EMP018','Lakshmi Rao',       'lakshmi.rao@motadata.com',       'Legal & Compliance',      'Head of Legal',               'EMP004','2018-05-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Legal & Compliance","Finance","HR & People","Security"]'::JSONB,NOW()),
('EMP019','Sunil Thakur',      'sunil.thakur@motadata.com',      'Operations',              'Head of Operations',          'EMP001','2018-06-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Operations","Finance","HR & People","Engineering"]'::JSONB,NOW()),
('EMP020','Divya Menon',       'divya.menon@motadata.com',       'Information Security',    'Head of Information Security','EMP002','2018-07-01','HOD','["STRT","XFNL","RSMG","CHMG","EXPR","TDEV","INNO","BACU","CULT"]'::JSONB,'["Information Security","Engineering","DevOps & Infrastructure","Legal & Compliance"]'::JSONB,NOW());

-- 10.3 — Team Managers (40) generated via DO block
DO $$
DECLARE
    i            INTEGER;
    emp_id       TEXT;
    emp_num      INTEGER;
    f_name       TEXT;
    l_name       TEXT;
    email_addr   TEXT;

    first_names TEXT[] := ARRAY[
        'Rahul','Pooja','Nikhil','Swati','Gaurav','Nisha','Harish','Pallavi','Mohan','Geeta',
        'Siddharth','Bhavna','Akash','Vaishali','Narayan','Madhuri','Tarun','Komal','Vikrant','Shweta',
        'Prasad','Anjali','Hemant','Shilpa','Devendra','Rupal','Chirag','Payal','Manas','Ritu',
        'Yash','Archana','Neeraj','Sonal','Dhruv','Reena','Krunal','Mansi','Rushabh','Foram'
    ];
    last_names TEXT[] := ARRAY[
        'Shah','Kulkarni','Deshpande','More','Kadam','Patil','Shinde','Jadhav','Bhosale','Wagh',
        'Parikh','Thakkar','Modi','Dave','Gandhi','Kapoor','Saxena','Tiwari','Dubey','Rastogi',
        'Menon','Pillai','Krishnan','Subramanian','Mukherjee','Chatterjee','Bose','Roy','Das','Ghosh',
        'Shetty','Naik','Gaikwad','Thorat','Kale','Mane','Pawar','Nikam','Sonawane','Jagtap'
    ];

    -- 40 departments (2 per dept = 20 depts)
    depts TEXT[] := ARRAY[
        'Engineering','Engineering',
        'Product','Product',
        'Design','Design',
        'Data Science','Data Science',
        'QA & Testing','QA & Testing',
        'DevOps & Infrastructure','DevOps & Infrastructure',
        'Sales','Sales',
        'Marketing','Marketing',
        'Customer Success','Customer Success',
        'Customer Support','Customer Support',
        'HR & People','HR & People',
        'Finance','Finance',
        'Legal & Compliance','Legal & Compliance',
        'Operations','Operations',
        'Information Security','Information Security',
        'Mobile Development','Mobile Development',
        'Backend Development','Backend Development',
        'Frontend Development','Frontend Development',
        'Analytics','Analytics',
        'Cloud Infrastructure','Cloud Infrastructure'
    ];

    hod_ids TEXT[] := ARRAY[
        'EMP006','EMP006',
        'EMP007','EMP007',
        'EMP008','EMP008',
        'EMP009','EMP009',
        'EMP010','EMP010',
        'EMP011','EMP011',
        'EMP012','EMP012',
        'EMP013','EMP013',
        'EMP014','EMP014',
        'EMP015','EMP015',
        'EMP016','EMP016',
        'EMP017','EMP017',
        'EMP018','EMP018',
        'EMP019','EMP019',
        'EMP020','EMP020',
        'EMP006','EMP006',   -- Mobile under Engineering HOD
        'EMP006','EMP006',   -- Backend under Engineering HOD
        'EMP006','EMP006',   -- Frontend under Engineering HOD
        'EMP009','EMP009',   -- Analytics under Data Science HOD
        'EMP011','EMP011'    -- Cloud under DevOps HOD
    ];

    tm_designations TEXT[] := ARRAY[
        'Engineering Manager','Engineering Lead',
        'Product Manager','Senior Product Manager',
        'Design Manager','UX Lead',
        'Data Science Manager','ML Platform Lead',
        'QA Manager','Test Lead',
        'DevOps Manager','Platform Engineering Lead',
        'Sales Manager','Regional Sales Manager',
        'Marketing Manager','Growth Manager',
        'Customer Success Manager','Customer Success Lead',
        'Support Manager','Support Operations Lead',
        'HR Manager','Talent Acquisition Manager',
        'Finance Manager','Financial Planning Lead',
        'Legal Manager','Compliance Manager',
        'Operations Manager','Process Excellence Lead',
        'Security Manager','Security Operations Lead',
        'Mobile Lead','Mobile Engineering Manager',
        'Backend Lead','Backend Engineering Manager',
        'Frontend Lead','Frontend Engineering Manager',
        'Analytics Manager','Data & Analytics Lead',
        'Cloud Manager','Infrastructure Lead'
    ];

    join_dates DATE[] := ARRAY[
        '2018-02-01','2018-04-15','2018-06-01','2018-07-20','2018-09-10',
        '2018-10-01','2018-11-15','2019-01-07','2019-02-18','2019-03-25',
        '2019-04-08','2019-05-20','2019-06-03','2019-07-15','2019-08-01',
        '2019-09-09','2019-10-14','2019-11-04','2019-12-02','2020-01-13',
        '2020-02-17','2020-03-09','2020-04-20','2020-05-11','2020-06-22',
        '2020-07-06','2020-08-19','2020-09-01','2020-10-12','2020-11-23',
        '2020-12-07','2021-01-18','2021-02-08','2021-03-22','2021-04-05',
        '2021-05-17','2021-06-28','2021-07-12','2021-08-02','2021-09-14'
    ];
BEGIN
    FOR i IN 1..40 LOOP
        emp_num   := 20 + i;
        emp_id    := 'EMP' || LPAD(emp_num::TEXT, 3, '0');
        f_name    := first_names[i];
        l_name    := last_names[i];
        email_addr := LOWER(REPLACE(f_name,'''','')) || '.' ||
                      LOWER(REPLACE(l_name,'''','')) || emp_num::TEXT ||
                      '@motadata.com';

        INSERT INTO employees
            (employee_id, full_name, email, department, designation,
             reporting_manager_id, date_of_joining, group_name,
             applicable_competencies, cross_functional_groups, synced_at)
        VALUES (
            emp_id,
            f_name || ' ' || l_name,
            email_addr,
            depts[i],
            tm_designations[i],
            hod_ids[i],
            join_dates[i],
            'TM',
            '["LEAD","MENT","DCSN","DLGT","CNFL","ACCT","COMM","PLAN","RECG"]'::JSONB,
            jsonb_build_array(depts[i], depts[CASE WHEN i <= 2 THEN 3 ELSE 1 END]),
            NOW()
        )
        ON CONFLICT (employee_id) DO NOTHING;
    END LOOP;
END $$;


-- 10.4 — Individual Contributors (340) generated via DO block
DO $$
DECLARE
    ic_counter   INTEGER := 61;
    i            INTEGER;
    j            INTEGER;
    emp_id       TEXT;
    f_name       TEXT;
    l_name       TEXT;
    email_addr   TEXT;
    ic_per_tm    INTEGER;
    tm_emp_id    TEXT;
    dept_name    TEXT;
    desig        TEXT;
    join_day     DATE;

    first_names TEXT[] := ARRAY[
        'Aarav','Aisha','Akash','Alisha','Amol','Anisha','Ankit','Ankita','Anshul','Aparna',
        'Ashish','Ashwini','Atul','Avni','Ayush','Bharat','Bhavesh','Chetana','Chetan','Darshan',
        'Deepak','Devika','Dhara','Disha','Esha','Faisal','Farhan','Garima','Girish','Hardik',
        'Heena','Hitesh','Hrithik','Ishaan','Ishita','Jai','Janvi','Jitesh','Juhi','Kalpesh',
        'Kanchan','Kartik','Ketan','Khushi','Kishan','Komal','Krishna','Kriti','Kuldeep','Lata',
        'Lalit','Lavanya','Mahesh','Manoj','Mayur','Milan','Minal','Mitesh','Mukesh','Namrata',
        'Naresh','Neelam','Neeraj','Nilesh','Niraj','Nisha','Nishant','Nitin','Omkar','Parag',
        'Pawan','Payel','Piyush','Pooja','Prachi','Prakash','Pranav','Prashant','Pratik','Preeti',
        'Purvi','Rachana','Raghav','Rahul','Rajiv','Ramesh','Raunak','Reena','Rohan','Ruchi',
        'Sachin','Saket','Saloni','Samir','Sandeep','Sandip','Sangeeta','Sanjana','Santosh','Sapna',
        'Sarika','Satish','Seema','Shailesh','Shefali','Shubham','Shweta','Siddhi','Smita','Sonam',
        'Sudhir','Suhas','Sumit','Sunita','Suraj','Suresh','Suyog','Swapnil','Tanmay','Tanvi',
        'Tejal','Tejas','Uday','Uma','Urvashi','Uttam','Vaibhav','Varsha','Vijay','Vipul',
        'Viral','Vishal','Vrushali','Wasim','Yogesh','Yatin','Zalak','Zara','Zenith','Zubair'
    ];
    last_names TEXT[] := ARRAY[
        'Agarwal','Agrawal','Ahuja','Anand','Arora','Bajaj','Bansal','Bhatia','Bhatt','Bose',
        'Chakraborty','Chandra','Chatterjee','Chaudhary','Chavan','Chopra','Das','Dave','Desai','Deshpande',
        'Dhawan','Dubey','Dwivedi','Fernandes','Gaikwad','Gandhi','Garg','Ghosh','Gokhale','Goyal',
        'Gupta','Hegde','Iyer','Jadhav','Jain','Jaiswal','Jagtap','Jha','Joshi','Kale',
        'Kadam','Kapoor','Karmakar','Khandelwal','Khanna','Kohli','Kulkarni','Kumar','Lal','Luthra',
        'Mahato','Malhotra','Mane','Mathur','Mehrotra','Mehta','Mishra','Mittal','Modi','More',
        'Mukherjee','Nair','Narang','Naik','Nikam','Oswal','Parekh','Parikh','Patel','Patil',
        'Pawar','Pillai','Prasad','Puri','Rao','Rastogi','Reddy','Roy','Sahoo','Singh',
        'Sinha','Saxena','Shah','Sharma','Shinde','Shukla','Shetty','Sonawane','Srivastava','Subramanian',
        'Thakkar','Thakur','Tiwari','Trivedi','Vaidya','Verma','Vora','Wagh','Waghmare','Yadav'
    ];

    ic_designations TEXT[] := ARRAY[
        'Software Engineer','Senior Software Engineer','Software Developer','Senior Software Developer',
        'QA Engineer','Senior QA Engineer','Data Analyst','Senior Data Analyst',
        'Product Designer','UI/UX Designer','DevOps Engineer','Cloud Engineer',
        'Business Analyst','Technical Writer','Support Engineer','Solutions Engineer',
        'Marketing Specialist','Sales Executive','Account Executive','Customer Success Specialist',
        'HR Specialist','Finance Analyst','Legal Associate','Operations Analyst',
        'Security Analyst','Mobile Developer','Backend Developer','Frontend Developer',
        'Machine Learning Engineer','Data Engineer','BI Analyst','Product Analyst',
        'Test Automation Engineer','Performance Engineer','Systems Engineer','Platform Engineer',
        'Content Writer','SEO Specialist','Sales Development Representative','Technical Support Engineer'
    ];

    depts TEXT[] := ARRAY[
        'Engineering','Engineering',
        'Product','Product',
        'Design','Design',
        'Data Science','Data Science',
        'QA & Testing','QA & Testing',
        'DevOps & Infrastructure','DevOps & Infrastructure',
        'Sales','Sales',
        'Marketing','Marketing',
        'Customer Success','Customer Success',
        'Customer Support','Customer Support',
        'HR & People','HR & People',
        'Finance','Finance',
        'Legal & Compliance','Legal & Compliance',
        'Operations','Operations',
        'Information Security','Information Security',
        'Mobile Development','Mobile Development',
        'Backend Development','Backend Development',
        'Frontend Development','Frontend Development',
        'Analytics','Analytics',
        'Cloud Infrastructure','Cloud Infrastructure'
    ];

    base_date DATE := '2018-01-01'::DATE;
BEGIN
    FOR i IN 1..40 LOOP
        -- First 20 TMs get 9 ICs, last 20 TMs get 8 ICs → total 340
        ic_per_tm   := CASE WHEN i <= 20 THEN 9 ELSE 8 END;
        tm_emp_id   := 'EMP' || LPAD((20 + i)::TEXT, 3, '0');
        dept_name   := depts[i];

        FOR j IN 1..ic_per_tm LOOP
            emp_id     := 'EMP' || LPAD(ic_counter::TEXT, 3, '0');
            f_name     := first_names[((ic_counter - 61 + j * 7) % array_length(first_names, 1)) + 1];
            l_name     := last_names[((ic_counter + j * 3)       % array_length(last_names,  1)) + 1];
            email_addr := LOWER(REPLACE(f_name,'''','')) || '.' ||
                          LOWER(REPLACE(l_name,'''','')) || ic_counter::TEXT ||
                          '@motadata.com';
            desig      := ic_designations[((ic_counter - 61) % array_length(ic_designations, 1)) + 1];
            join_day   := base_date + ((ic_counter - 61) * 3 % 1825) * INTERVAL '1 day';

            INSERT INTO employees
                (employee_id, full_name, email, department, designation,
                 reporting_manager_id, date_of_joining, group_name,
                 applicable_competencies, cross_functional_groups, synced_at)
            VALUES (
                emp_id,
                f_name || ' ' || l_name,
                email_addr,
                dept_name,
                desig,
                tm_emp_id,
                join_day,
                'IC',
                '["COMM","TEAM","QUAL","RELY","INIT","ADPT","GROW","PROF"]'::JSONB,
                jsonb_build_array(dept_name),
                NOW()
            )
            ON CONFLICT (employee_id) DO NOTHING;

            ic_counter := ic_counter + 1;
        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 11 — MOCK DATA: REVIEW CYCLES (3 cycles)
-- ============================================================

-- Cycle 1: H1 2025 — PUBLISHED (completed)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, created_by)
VALUES
(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'H1 2025 — 360 Review',
    '2025-01-06', '2025-06-30', 6,
    3, 'PUBLISHED', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'EMP001'
);

-- Cycle 2: H2 2025 — PUBLISHED (completed)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, created_by)
VALUES
(
    '22222222-2222-2222-2222-222222222222'::UUID,
    'H2 2025 — 360 Review',
    '2025-07-07', '2025-12-31', 6,
    3, 'PUBLISHED', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'EMP001'
);

-- Cycle 3: H1 2026 — ACTIVE (current)
INSERT INTO review_cycles
    (cycle_id, cycle_name, start_date, end_date, duration_months,
     grace_period_days, status, enable_self_feedback, enable_colleague_feedback,
     reminder_schedule, created_by)
VALUES
(
    '33333333-3333-3333-3333-333333333333'::UUID,
    'H1 2026 — 360 Review',
    '2026-02-02', '2026-06-30', 6,
    3, 'ACTIVE', TRUE, TRUE,
    '[7,3,1]'::JSONB, 'EMP001'
);


-- ============================================================
-- PART 12 — MOCK DATA: SURVEY ASSIGNMENTS
--   Create one assignment per employee for the ACTIVE cycle
--   (H1 2026 — all 400 employees)
-- ============================================================
INSERT INTO survey_assignments (employee_id, cycle_id, status)
SELECT
    e.employee_id,
    '33333333-3333-3333-3333-333333333333'::UUID,
    CASE
        WHEN e.employee_id IN ('EMP001','EMP002','EMP003') THEN 'COMPLETED'
        WHEN e.employee_id IN ('EMP004','EMP005','EMP006','EMP007','EMP008') THEN 'IN_PROGRESS'
        ELSE 'PENDING'
    END
FROM employees e
WHERE e.is_active = TRUE
ON CONFLICT (employee_id, cycle_id) DO NOTHING;


-- ============================================================
-- PART 13 — MOCK DATA: SURVEY REVIEWERS
--   Assign reviewers for a sample of 10 IC employees
--   in the active cycle
-- ============================================================
DO $$
DECLARE
    r           RECORD;
    sa_id       UUID;
    rev_emp     TEXT;
    reviewer_row_type TEXT;
    q_set       TEXT;
    rev_list    TEXT[];
    rev_types   TEXT[];
    k           INTEGER;
BEGIN
    -- Pick 10 IC employees to have reviewers fully configured
    FOR r IN
        SELECT e.employee_id, e.reporting_manager_id, e.department
        FROM   employees e
        WHERE  e.group_name = 'IC'
          AND  e.is_active = TRUE
        ORDER BY e.employee_id
        LIMIT 10
    LOOP
        -- Get assignment id
        SELECT assignment_id INTO sa_id
        FROM   survey_assignments
        WHERE  employee_id = r.employee_id
          AND  cycle_id = '33333333-3333-3333-3333-333333333333'::UUID;

        q_set := 'IC';

        -- Build reviewer list: manager + 7 peers from same dept (or closest)
        rev_list  := ARRAY[r.reporting_manager_id];
        rev_types := ARRAY['MANAGER'];

        -- Add 7 peers (other ICs in same department, excluding self and manager)
        FOR rev_emp IN
            SELECT e2.employee_id
            FROM   employees e2
            WHERE  e2.department   = r.department
              AND  e2.group_name   = 'IC'
              AND  e2.employee_id <> r.employee_id
              AND  e2.employee_id <> r.reporting_manager_id
              AND  e2.is_active   = TRUE
            ORDER BY e2.employee_id
            LIMIT 7
        LOOP
            rev_list  := array_append(rev_list,  rev_emp);
            rev_types := array_append(rev_types, 'PEER'::TEXT);
        END LOOP;

        FOR k IN 1..array_length(rev_list,1) LOOP
            reviewer_row_type := rev_types[k];
            INSERT INTO survey_reviewers
                (assignment_id, reviewer_employee_id, reviewer_type, question_set, status)
            VALUES (sa_id, rev_list[k], reviewer_row_type, q_set, 'PENDING')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 14 — MOCK DATA: SELF-FEEDBACK
--   30 SUBMITTED + 20 DRAFT for active cycle (H1 2026)
-- ============================================================
DO $$
DECLARE
    r       RECORD;
    cnt     INTEGER := 0;
    ratings JSONB;
    stat    TEXT;
    sub_at  TIMESTAMPTZ;
BEGIN
    FOR r IN
        SELECT e.employee_id, e.group_name
        FROM   employees e
        WHERE  e.is_active = TRUE
          AND  e.group_name IN ('IC','TM','HOD')
        ORDER BY e.employee_id
        LIMIT 50
    LOOP
        cnt    := cnt + 1;
        stat   := CASE WHEN cnt <= 30 THEN 'SUBMITTED' ELSE 'DRAFT' END;
        sub_at := CASE WHEN cnt <= 30 THEN NOW() - ((50 - cnt) * INTERVAL '1 day') ELSE NULL END;

        CASE r.group_name
            WHEN 'IC' THEN
                ratings := '[
                    {"competency_id":"COMM","competency_name":"Communication","rating":3,"label":"Significant Impact"},
                    {"competency_id":"TEAM","competency_name":"Teamwork","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"QUAL","competency_name":"Quality","rating":3,"label":"Significant Impact"},
                    {"competency_id":"RELY","competency_name":"Reliability","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"INIT","competency_name":"Initiative","rating":3,"label":"Significant Impact"},
                    {"competency_id":"ADPT","competency_name":"Adaptability","rating":2,"label":"Moderate Impact"},
                    {"competency_id":"GROW","competency_name":"Growth Mindset","rating":3,"label":"Significant Impact"},
                    {"competency_id":"PROF","competency_name":"Professionalism","rating":4,"label":"Outstanding Impact"}
                ]'::JSONB;
            WHEN 'TM' THEN
                ratings := '[
                    {"competency_id":"LEAD","competency_name":"Leadership","rating":3,"label":"Significant Impact"},
                    {"competency_id":"MENT","competency_name":"Mentorship","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"DCSN","competency_name":"Decision Making","rating":3,"label":"Significant Impact"},
                    {"competency_id":"DLGT","competency_name":"Delegation","rating":3,"label":"Significant Impact"},
                    {"competency_id":"ACCT","competency_name":"Accountability","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"COMM","competency_name":"Communication","rating":3,"label":"Significant Impact"},
                    {"competency_id":"PLAN","competency_name":"Planning","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"RECG","competency_name":"Recognition","rating":3,"label":"Significant Impact"}
                ]'::JSONB;
            ELSE  -- HOD
                ratings := '[
                    {"competency_id":"STRT","competency_name":"Strategy","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"XFNL","competency_name":"Cross-functional","rating":3,"label":"Significant Impact"},
                    {"competency_id":"RSMG","competency_name":"Resource Management","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"CHMG","competency_name":"Change Management","rating":3,"label":"Significant Impact"},
                    {"competency_id":"EXPR","competency_name":"Executive Presence","rating":4,"label":"Outstanding Impact"},
                    {"competency_id":"INNO","competency_name":"Innovation","rating":3,"label":"Significant Impact"}
                ]'::JSONB;
        END CASE;

        INSERT INTO self_feedback
            (employee_id, cycle_id, competency_ratings, status, submitted_at)
        VALUES
            (r.employee_id,
             '33333333-3333-3333-3333-333333333333'::UUID,
             ratings, stat, sub_at)
        ON CONFLICT (employee_id, cycle_id) DO NOTHING;
    END LOOP;
END $$;


-- ============================================================
-- PART 15 — MOCK DATA: CALCULATED SCORES
--   Scores for all employees for the two PUBLISHED cycles
-- ============================================================
DO $$
DECLARE
    r          RECORD;
    raw_score  NUMERIC(4,2);
    self_s     NUMERIC(4,2);
    label_map  TEXT;
    comp_scores JSONB;
    rev_cat_scores JSONB;
    cycle_uuid  UUID;
    c           INTEGER;
BEGIN
    FOR c IN 1..2 LOOP
        cycle_uuid := CASE
            WHEN c = 1 THEN '11111111-1111-1111-1111-111111111111'::UUID
            ELSE            '22222222-2222-2222-2222-222222222222'::UUID
        END;

        FOR r IN
            SELECT e.employee_id, e.group_name
            FROM   employees e
            WHERE  e.is_active = TRUE
        LOOP
            -- Generate a pseudo-random score 1.5–4.0 seeded on emp + cycle
            raw_score  := ROUND(( 1.5 + (('x' || MD5(r.employee_id || c::TEXT))::BIT(32)::INT::BIGINT & 65535)::NUMERIC / 65535.0 * 2.5 )::NUMERIC, 2);
            self_s     := ROUND(( 1.5 + (('x' || MD5('s' || r.employee_id || c::TEXT))::BIT(32)::INT::BIGINT & 65535)::NUMERIC / 65535.0 * 2.5 )::NUMERIC, 2);

            label_map := CASE
                WHEN raw_score >= 3.5 THEN 'Outstanding Impact'
                WHEN raw_score >= 2.5 THEN 'Significant Impact'
                WHEN raw_score >= 1.5 THEN 'Moderate Impact'
                ELSE 'Not Enough Impact'
            END;

            comp_scores := CASE r.group_name
                WHEN 'IC' THEN jsonb_build_object(
                    'COMM', ROUND(raw_score + 0.1, 2),
                    'TEAM', ROUND(raw_score - 0.1, 2),
                    'QUAL', ROUND(raw_score + 0.2, 2),
                    'RELY', ROUND(raw_score - 0.2, 2),
                    'INIT', ROUND(raw_score + 0.0, 2),
                    'ADPT', ROUND(raw_score - 0.3, 2),
                    'GROW', ROUND(raw_score + 0.1, 2),
                    'PROF', ROUND(raw_score + 0.3, 2)
                )
                WHEN 'TM' THEN jsonb_build_object(
                    'LEAD', ROUND(raw_score + 0.1, 2),
                    'MENT', ROUND(raw_score - 0.1, 2),
                    'DCSN', ROUND(raw_score + 0.2, 2),
                    'DLGT', ROUND(raw_score - 0.2, 2),
                    'ACCT', ROUND(raw_score + 0.0, 2),
                    'COMM', ROUND(raw_score - 0.1, 2),
                    'PLAN', ROUND(raw_score + 0.1, 2),
                    'RECG', ROUND(raw_score + 0.2, 2)
                )
                ELSE jsonb_build_object(
                    'STRT', ROUND(raw_score + 0.2, 2),
                    'XFNL', ROUND(raw_score - 0.1, 2),
                    'RSMG', ROUND(raw_score + 0.1, 2),
                    'CHMG', ROUND(raw_score - 0.2, 2),
                    'EXPR', ROUND(raw_score + 0.3, 2),
                    'INNO', ROUND(raw_score + 0.0, 2)
                )
            END;

            rev_cat_scores := jsonb_build_object(
                'MANAGER',          ROUND(raw_score + 0.1, 2),
                'PEER',             ROUND(raw_score - 0.1, 2),
                'DIRECT_REPORT',    ROUND(raw_score + 0.2, 2),
                'CROSS_FUNCTIONAL', ROUND(raw_score - 0.2, 2)
            );

            INSERT INTO calculated_scores
                (employee_id, cycle_id, self_score, colleague_score, final_label,
                 competency_scores, reviewer_category_scores, total_reviewers, calculated_at)
            VALUES
                (r.employee_id, cycle_uuid,
                 LEAST(self_s, 4.0), LEAST(raw_score, 4.0), label_map,
                 comp_scores, rev_cat_scores,
                 5 + ((('x' || MD5(r.employee_id))::BIT(8)::INT) % 4),
                 CASE WHEN c = 1 THEN '2025-07-01 09:00:00+00'::TIMESTAMPTZ
                                 ELSE '2026-01-02 09:00:00+00'::TIMESTAMPTZ END)
            ON CONFLICT (employee_id, cycle_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;


-- ============================================================
-- PART 16 — MOCK DATA: SAMPLE AD SYNC LOG
-- ============================================================
INSERT INTO ad_sync_log
    (sync_type, status, employees_added, employees_updated, employees_deactivated,
     started_at, completed_at)
VALUES
('MANUAL',    'SUCCESS', 400, 0, 0, '2026-02-01 06:00:00+00', '2026-02-01 06:04:22+00'),
('SCHEDULED', 'SUCCESS', 0,   3, 0, '2026-02-10 02:00:00+00', '2026-02-10 02:01:44+00'),
('SCHEDULED', 'SUCCESS', 0,   1, 0, '2026-02-17 02:00:00+00', '2026-02-17 02:01:12+00');


-- ============================================================
-- PART 17 — VERIFICATION QUERIES
-- (comment out before running in production)
-- ============================================================
/*
SELECT group_name, COUNT(*) AS total
FROM   employees
GROUP  BY group_name
ORDER  BY group_name;

SELECT status, COUNT(*) AS total
FROM   review_cycles
GROUP  BY status;

SELECT COUNT(*) AS total_assignments FROM survey_assignments;
SELECT COUNT(*) AS total_reviewers   FROM survey_reviewers;
SELECT COUNT(*) AS total_self_fb     FROM self_feedback;
SELECT COUNT(*) AS total_scores_h1   FROM calculated_scores WHERE cycle_id = '11111111-1111-1111-1111-111111111111';
SELECT COUNT(*) AS total_scores_h2   FROM calculated_scores WHERE cycle_id = '22222222-2222-2222-2222-222222222222';
SELECT COUNT(*) AS total_questions   FROM questions;
SELECT COUNT(*) AS total_competencies FROM competencies;
*/

-- ============================================================
-- END OF SCRIPT
-- ============================================================
