/**
 * scripts/seed-admin.js
 *
 * CLI tool to create the first CXO admin account during initial
 * platform setup. Run this AFTER migrate-auth.js.
 *
 * Usage:
 *   node scripts/seed-admin.js \
 *     --employeeId ADMIN001 \
 *     --fullName "Rajesh Kumar" \
 *     --email rajesh.kumar@motadata.com \
 *     --password "MySecret@123"
 *
 * Or set env vars:
 *   SEED_EMPLOYEE_ID, SEED_FULL_NAME, SEED_EMAIL, SEED_PASSWORD
 *   node scripts/seed-admin.js
 *
 * This script calls the seed-admin API endpoint internally.
 * Ensure the server is NOT yet running (uses direct DB access).
 */

import 'dotenv/config';
import { supabaseAdmin } from '../src/config/supabase.js';
import { auth, pool } from '../src/config/auth.js';
import { logger } from '../src/utils/logger.js';

// ── Parse CLI args ─────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const employeeId = getArg('--employeeId') || process.env.SEED_EMPLOYEE_ID;
const fullName   = getArg('--fullName')   || process.env.SEED_FULL_NAME;
const email      = getArg('--email')      || process.env.SEED_EMAIL;
const password   = getArg('--password')   || process.env.SEED_PASSWORD;

if (!employeeId || !fullName || !email || !password) {
  console.error('\n❌  Missing required arguments.\n');
  console.error('Usage:');
  console.error('  node scripts/seed-admin.js \\');
  console.error('    --employeeId ADMIN001 \\');
  console.error('    --fullName "Rajesh Kumar" \\');
  console.error('    --email rajesh.kumar@motadata.com \\');
  console.error('    --password "MySecret@123"\n');
  process.exit(1);
}

const run = async () => {
  try {
    // ── 1. Check if CXO already exists ──────────────────────
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('employee_id, email')
      .eq('group_name', 'CXO')
      .limit(1)
      .single();

    if (existing) {
      console.error(`\n❌  A CXO account already exists (${existing.email}).`);
      console.error('    This script can only run once. Use /api/auth/change-password to reset.\n');
      process.exit(1);
    }

    // ── 2. Create better-auth user ───────────────────────────
    logger.info('Creating better-auth user...', { email });

    const authResult = await auth.api.signUpEmail({
      body: { email, password, name: fullName },
    });

    if (!authResult?.user) {
      throw new Error('better-auth signUpEmail returned no user. Check DATABASE_URL and auth config.');
    }

    logger.info('better-auth user created', { id: authResult.user.id });

    // ── 3. Insert employee record ────────────────────────────
    const { error: empError } = await supabaseAdmin.from('employees').upsert(
      {
        employee_id: employeeId,
        full_name: fullName,
        email,
        department: 'Executive',
        designation: 'HR Admin / CXO',
        reporting_manager_id: null,
        date_of_joining: new Date().toISOString().split('T')[0],
        group_name: 'CXO',
        is_active: true,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id' }
    );

    if (empError) {
      throw new Error(`Employee insert failed: ${empError.message}`);
    }

    console.log('\n✅  Admin account created successfully!');
    console.log('────────────────────────────────────────');
    console.log(`   Employee ID : ${employeeId}`);
    console.log(`   Name        : ${fullName}`);
    console.log(`   Email       : ${email}`);
    console.log(`   Role        : CXO`);
    console.log('────────────────────────────────────────');
    console.log('\n   Sign in at: POST /api/auth/sign-in/email');
    console.log('   Body: { "email": "...", "password": "..." }\n');
  } catch (err) {
    logger.error('Seed admin failed', { error: err.message });
    console.error(`\n❌  ${err.message}\n`);
    process.exit(1);
  } finally {
    if (pool && typeof pool.end === 'function') await pool.end();
  }
};

run();
