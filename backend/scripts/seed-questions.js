/**
 * scripts/seed-questions.js
 *
 * Seeds the competencies and questions tables with the full
 * PRD-defined dataset (25 competencies, 46 questions).
 *
 * Safe to re-run — uses upsert on PK conflicts.
 *
 * Usage:
 *   npm run seed:questions
 */

import '../src/config/env.js';   // validates env vars on entry
import { upsertCompetencies }   from '../src/modules/competencies/competencies.repository.js';
import { upsertQuestions }      from '../src/modules/questions/questions.repository.js';

// ─────────────────────────────────────────────────────────────
// PART 1 — COMPETENCIES  (25 total)
// ─────────────────────────────────────────────────────────────
const COMPETENCIES = [
  // ── IC ───────────────────────────────────────────────────
  { competency_id: 'COMM', competency_name: 'Communication',    description: 'Clarity, listening, and information sharing.',            applicable_to: ['IC','TM'] },
  { competency_id: 'TEAM', competency_name: 'Teamwork',         description: 'Collaboration, shared goals, and peer support.',          applicable_to: ['IC'] },
  { competency_id: 'QUAL', competency_name: 'Quality',          description: 'Consistently delivering high-quality, detailed work.',    applicable_to: ['IC'] },
  { competency_id: 'RELY', competency_name: 'Reliability',      description: 'Meeting commitments and being dependable.',               applicable_to: ['IC'] },
  { competency_id: 'INIT', competency_name: 'Initiative',       description: 'Proactive ownership and independent problem-solving.',    applicable_to: ['IC'] },
  { competency_id: 'ADAP', competency_name: 'Adaptability',     description: 'Flexibility under changing priorities and pressure.',     applicable_to: ['IC'] },
  { competency_id: 'GROW', competency_name: 'Growth Mindset',   description: 'Continuous learning and receptiveness to feedback.',      applicable_to: ['IC'] },
  { competency_id: 'PROF', competency_name: 'Professionalism',  description: 'Positive attitude and professional conduct.',             applicable_to: ['IC'] },
  // ── TM ───────────────────────────────────────────────────
  { competency_id: 'LEAD', competency_name: 'Leadership',       description: 'Providing direction and motivating the team.',            applicable_to: ['TM'] },
  { competency_id: 'MENT', competency_name: 'Mentorship',       description: 'Coaching, developing, and giving feedback to reports.',   applicable_to: ['TM'] },
  { competency_id: 'DECI', competency_name: 'Decision Making',  description: 'Making timely, inclusive, and effective decisions.',      applicable_to: ['TM'] },
  { competency_id: 'DELE', competency_name: 'Delegation',       description: 'Task assignment aligned to strengths and autonomy.',      applicable_to: ['TM'] },
  { competency_id: 'CONF', competency_name: 'Conflict Resolution', description: 'Resolving team conflicts constructively.',             applicable_to: ['TM'] },
  { competency_id: 'ACCT', competency_name: 'Accountability',   description: 'Holding the team and self accountable for outcomes.',     applicable_to: ['TM'] },
  { competency_id: 'PLAN', competency_name: 'Planning',         description: 'Setting realistic goals and milestones.',                 applicable_to: ['TM'] },
  { competency_id: 'RECG', competency_name: 'Recognition',      description: 'Acknowledging and appreciating team contributions.',      applicable_to: ['TM'] },
  // ── HOD ──────────────────────────────────────────────────
  { competency_id: 'STRA', competency_name: 'Strategic Thinking',    description: 'Aligning goals with vision and anticipating challenges.', applicable_to: ['HOD'] },
  { competency_id: 'XFUN', competency_name: 'Cross-functional Collaboration', description: 'Building relationships and facilitating inter-dept teamwork.', applicable_to: ['HOD'] },
  { competency_id: 'RSMG', competency_name: 'Resource Management',   description: 'Optimising budget, staffing, and resources.',             applicable_to: ['HOD'] },
  { competency_id: 'CHNG', competency_name: 'Change Management',     description: 'Leading and navigating organisational change.',            applicable_to: ['HOD'] },
  { competency_id: 'EXPR', competency_name: 'Executive Presence',    description: 'Representing the department and communicating vision.',    applicable_to: ['HOD'] },
  { competency_id: 'TLNT', competency_name: 'Talent Development',    description: 'Building a leadership pipeline and creating opportunities.',applicable_to: ['HOD'] },
  { competency_id: 'INNV', competency_name: 'Innovation',            description: 'Encouraging experimentation and process improvement.',      applicable_to: ['HOD'] },
  { competency_id: 'BACU', competency_name: 'Business Acumen',       description: 'Understanding and acting on business priorities.',          applicable_to: ['HOD'] },
  { competency_id: 'CULT', competency_name: 'Culture & Values',      description: 'Championing company values and fostering culture.',         applicable_to: ['HOD'] },
];

// ─────────────────────────────────────────────────────────────
// PART 2 — QUESTIONS  (46 total: IC ×15, TM ×15, HOD ×16)
// ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  // ── IC (15) ──────────────────────────────────────────────
  { question_id: 'IC-01', set_type: 'IC', order_number:  1, category: 'Communication',   competency_id: 'COMM', question_text: 'Communicates ideas clearly and effectively.' },
  { question_id: 'IC-02', set_type: 'IC', order_number:  2, category: 'Communication',   competency_id: 'COMM', question_text: 'Listens actively and responds appropriately.' },
  { question_id: 'IC-03', set_type: 'IC', order_number:  3, category: 'Teamwork',        competency_id: 'TEAM', question_text: 'Collaborates well with team members.' },
  { question_id: 'IC-04', set_type: 'IC', order_number:  4, category: 'Teamwork',        competency_id: 'TEAM', question_text: 'Supports colleagues in achieving shared goals.' },
  { question_id: 'IC-05', set_type: 'IC', order_number:  5, category: 'Quality',         competency_id: 'QUAL', question_text: 'Delivers high-quality work consistently.' },
  { question_id: 'IC-06', set_type: 'IC', order_number:  6, category: 'Quality',         competency_id: 'QUAL', question_text: 'Pays attention to detail in deliverables.' },
  { question_id: 'IC-07', set_type: 'IC', order_number:  7, category: 'Reliability',     competency_id: 'RELY', question_text: 'Meets deadlines and commitments.' },
  { question_id: 'IC-08', set_type: 'IC', order_number:  8, category: 'Reliability',     competency_id: 'RELY', question_text: 'Is dependable and can be counted on.' },
  { question_id: 'IC-09', set_type: 'IC', order_number:  9, category: 'Initiative',      competency_id: 'INIT', question_text: 'Takes ownership of tasks proactively.' },
  { question_id: 'IC-10', set_type: 'IC', order_number: 10, category: 'Initiative',      competency_id: 'INIT', question_text: 'Identifies and solves problems independently.' },
  { question_id: 'IC-11', set_type: 'IC', order_number: 11, category: 'Adaptability',    competency_id: 'ADAP', question_text: 'Adjusts well to changing priorities.' },
  { question_id: 'IC-12', set_type: 'IC', order_number: 12, category: 'Adaptability',    competency_id: 'ADAP', question_text: 'Remains effective under pressure.' },
  { question_id: 'IC-13', set_type: 'IC', order_number: 13, category: 'Growth',          competency_id: 'GROW', question_text: 'Shows willingness to learn new skills.' },
  { question_id: 'IC-14', set_type: 'IC', order_number: 14, category: 'Growth',          competency_id: 'GROW', question_text: 'Accepts and acts on feedback constructively.' },
  { question_id: 'IC-15', set_type: 'IC', order_number: 15, category: 'Professionalism', competency_id: 'PROF', question_text: 'Maintains a positive and professional attitude.' },

  // ── TM (15) ──────────────────────────────────────────────
  { question_id: 'TM-01', set_type: 'TM', order_number:  1, category: 'Leadership',          competency_id: 'LEAD', question_text: 'Provides clear direction to the team.' },
  { question_id: 'TM-02', set_type: 'TM', order_number:  2, category: 'Leadership',          competency_id: 'LEAD', question_text: 'Inspires and motivates team members.' },
  { question_id: 'TM-03', set_type: 'TM', order_number:  3, category: 'Mentorship',          competency_id: 'MENT', question_text: 'Develops and coaches team members effectively.' },
  { question_id: 'TM-04', set_type: 'TM', order_number:  4, category: 'Mentorship',          competency_id: 'MENT', question_text: 'Provides regular and constructive feedback.' },
  { question_id: 'TM-05', set_type: 'TM', order_number:  5, category: 'Decision Making',     competency_id: 'DECI', question_text: 'Makes timely and effective decisions.' },
  { question_id: 'TM-06', set_type: 'TM', order_number:  6, category: 'Decision Making',     competency_id: 'DECI', question_text: 'Considers input from team before deciding.' },
  { question_id: 'TM-07', set_type: 'TM', order_number:  7, category: 'Delegation',          competency_id: 'DELE', question_text: 'Assigns tasks appropriately based on strengths.' },
  { question_id: 'TM-08', set_type: 'TM', order_number:  8, category: 'Delegation',          competency_id: 'DELE', question_text: 'Empowers team members with autonomy.' },
  { question_id: 'TM-09', set_type: 'TM', order_number:  9, category: 'Conflict Resolution', competency_id: 'CONF', question_text: 'Handles team conflicts constructively.' },
  { question_id: 'TM-10', set_type: 'TM', order_number: 10, category: 'Conflict Resolution', competency_id: 'CONF', question_text: 'Creates a safe environment for open discussion.' },
  { question_id: 'TM-11', set_type: 'TM', order_number: 11, category: 'Accountability',      competency_id: 'ACCT', question_text: 'Holds team members accountable fairly.' },
  { question_id: 'TM-12', set_type: 'TM', order_number: 12, category: 'Accountability',      competency_id: 'ACCT', question_text: 'Takes responsibility for team outcomes.' },
  { question_id: 'TM-13', set_type: 'TM', order_number: 13, category: 'Communication',       competency_id: 'COMM', question_text: 'Keeps team informed about priorities and changes.' },
  { question_id: 'TM-14', set_type: 'TM', order_number: 14, category: 'Planning',            competency_id: 'PLAN', question_text: 'Sets realistic goals and milestones.' },
  { question_id: 'TM-15', set_type: 'TM', order_number: 15, category: 'Recognition',         competency_id: 'RECG', question_text: 'Recognizes and appreciates team contributions.' },

  // ── HOD (16) ─────────────────────────────────────────────
  { question_id: 'HOD-01', set_type: 'HOD', order_number:  1, category: 'Strategy',            competency_id: 'STRA', question_text: 'Aligns team goals with company vision.' },
  { question_id: 'HOD-02', set_type: 'HOD', order_number:  2, category: 'Strategy',            competency_id: 'STRA', question_text: 'Anticipates future challenges and opportunities.' },
  { question_id: 'HOD-03', set_type: 'HOD', order_number:  3, category: 'Cross-functional',    competency_id: 'XFUN', question_text: 'Builds strong relationships across departments.' },
  { question_id: 'HOD-04', set_type: 'HOD', order_number:  4, category: 'Cross-functional',    competency_id: 'XFUN', question_text: 'Facilitates collaboration between teams.' },
  { question_id: 'HOD-05', set_type: 'HOD', order_number:  5, category: 'Resource Management', competency_id: 'RSMG', question_text: 'Optimizes team resources effectively.' },
  { question_id: 'HOD-06', set_type: 'HOD', order_number:  6, category: 'Resource Management', competency_id: 'RSMG', question_text: 'Makes sound budget and staffing decisions.' },
  { question_id: 'HOD-07', set_type: 'HOD', order_number:  7, category: 'Change Management',   competency_id: 'CHNG', question_text: 'Leads organizational change initiatives.' },
  { question_id: 'HOD-08', set_type: 'HOD', order_number:  8, category: 'Change Management',   competency_id: 'CHNG', question_text: 'Helps team navigate transitions smoothly.' },
  { question_id: 'HOD-09', set_type: 'HOD', order_number:  9, category: 'Executive Presence',  competency_id: 'EXPR', question_text: 'Represents department effectively to leadership.' },
  { question_id: 'HOD-10', set_type: 'HOD', order_number: 10, category: 'Executive Presence',  competency_id: 'EXPR', question_text: 'Communicates vision with clarity and conviction.' },
  { question_id: 'HOD-11', set_type: 'HOD', order_number: 11, category: 'Talent Development',  competency_id: 'TLNT', question_text: 'Builds a strong pipeline of future leaders.' },
  { question_id: 'HOD-12', set_type: 'HOD', order_number: 12, category: 'Talent Development',  competency_id: 'TLNT', question_text: 'Creates growth opportunities for high performers.' },
  { question_id: 'HOD-13', set_type: 'HOD', order_number: 13, category: 'Innovation',          competency_id: 'INNV', question_text: 'Encourages experimentation and new ideas.' },
  { question_id: 'HOD-14', set_type: 'HOD', order_number: 14, category: 'Innovation',          competency_id: 'INNV', question_text: 'Implements process improvements proactively.' },
  { question_id: 'HOD-15', set_type: 'HOD', order_number: 15, category: 'Business Acumen',     competency_id: 'BACU', question_text: 'Understands and acts on business priorities.' },
  { question_id: 'HOD-16', set_type: 'HOD', order_number: 16, category: 'Culture',             competency_id: 'CULT', question_text: 'Champions company values and culture.' },
];

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Seeding competencies ===');
  const seededComps = await upsertCompetencies(COMPETENCIES);
  console.log(`  ✓ ${seededComps.length} competencies upserted.`);

  console.log('=== Seeding questions ===');
  // Upsert in batches of 20 to stay inside Supabase row limits per request
  let questionCount = 0;
  for (let i = 0; i < QUESTIONS.length; i += 20) {
    const batch = QUESTIONS.slice(i, i + 20);
    const result = await upsertQuestions(batch);
    questionCount += result.length;
  }
  console.log(`  ✓ ${questionCount} questions upserted.`);
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
