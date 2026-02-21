# Getting Started — 360 Feedback Platform

A step-by-step guide to set up and run the backend API locally.

---

## Prerequisites

| Tool | Minimum Version | Check |
|---|---|---|
| Node.js | 18.x | `node -v` |
| npm | 9.x | `npm -v` |
| Supabase account | — | [supabase.com](https://supabase.com) |

---

## 1. Clone & Install

```bash
cd b:\okr_360\backend
npm install
```

---

## 2. Configure Environment

Copy the example file and fill in your values:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set these required fields:

```dotenv
# ── Supabase (Settings → API in your Supabase project dashboard) ──
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# ── Database (Settings → Database → Connection string → URI) ──
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# ── better-auth (generate a random 32+ char secret) ──
BETTER_AUTH_SECRET=<run: npx @better-auth/cli@latest secret>
BETTER_AUTH_URL=http://localhost:3000
```

> Leave `SMTP_*` fields empty for now — the Notifications module is deferred and they default safely.

---

## 3. Set Up the Database


### 3.2 Run the better-auth migration

This creates the `user`, `session`, `account`, and `verification` tables required by better-auth:

```bash
npm run migrate:auth
```

### 3.3 Seed competencies and questions

Populate the question bank (46 questions across IC / TM / HOD sets):

```bash
npm run seed:questions
```

---

## 4. Start the Server

### Development mode (auto-restart on file changes)

```bash
npm run dev
```

### Production mode

```bash
npm start
```

The API will be available at **http://localhost:3000**

You should see:
```
✅  360 Feedback API listening on port 3000 (development)
```

---

## 5. Create the First Admin Account

On a fresh database, run the one-time seed script:

```bash
npm run seed:admin
```

Or use the API endpoint directly:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-001",
    "fullName": "HR Admin",
    "email": "admin@company.com",
    "password": "Admin@12345"
  }'
```

> This endpoint locks itself once any CXO employee exists — it is safe to leave in production.

---

## 6. Verify the Setup

```bash
# 1. Health check
curl http://localhost:3000/

# 2. Login
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin@12345"}'

# 3. My profile
curl -b cookies.txt http://localhost:3000/api/v1/auth/me
```

---

## 7. Run Tests

```bash
# All tests
npm test

# With coverage report
npm test -- --coverage

# Specific file
npm test -- --testPathPattern="scores.calculator"
```

> Tests use stub environment values — no real Supabase connection is needed.

---

## 8. Project Structure

```
backend/
├── src/
│   ├── app.js                  # Express app wiring
│   ├── server.js               # HTTP server + graceful shutdown
│   ├── config/
│   │   ├── env.js              # Zod env validation
│   │   ├── auth.js             # better-auth + pg adapter
│   │   └── supabase.js         # Supabase client
│   ├── middleware/
│   │   ├── authenticateSession.js   # Session auth guard
│   │   ├── authorizeRoles.js        # Role guard (IC/TM/HOD/CXO)
│   │   ├── validate.js              # Zod request validation
│   │   ├── errorHandler.js          # Global error catcher
│   │   └── requestLogger.js
│   ├── modules/
│   │   ├── auth/               # Login, seed-admin, /me
│   │   ├── employees/          # Employee CRUD + AD sync
│   │   ├── cycles/             # Review cycle management
│   │   ├── competencies/       # Competency catalogue
│   │   ├── questions/          # Question bank (IC/TM/HOD sets)
│   │   ├── selfFeedback/       # Employee self-assessment
│   │   ├── assignments/        # Survey assignment management
│   │   ├── reviewers/          # Reviewer access + token auth
│   │   ├── responses/          # Survey form + submission
│   │   ├── scores/             # Score calculation engine
│   │   ├── reports/            # Results dashboard + PDF/CSV
│   │   └── admin/              # Admin dashboard + audit logs
│   ├── jobs/
│   │   └── cycleTransition.js  # CRON: auto-advance cycle status
│   └── utils/
│       ├── asyncWrapper.js
│       ├── logger.js
│       └── writeAuditLog.js
├── tests/
│   ├── scores.calculator.test.js   # Pure unit tests (28 tests)
│   ├── scores.test.js              # Integration tests
│   ├── admin.test.js
│   ├── responses.test.js
│   ├── auth.test.js
│   ├── cycles.test.js
│   └── employees.test.js
├── scripts/
│   ├── migrate-auth.js         # better-auth DB migration
│   ├── seed-admin.js           # First CXO account
│   └── seed-questions.js       # 46 questions + competencies
├── .env.example                # Environment template
├── jest.config.js
└── jest.setup.js               # Test env stubs
```

---

## 9. API Route Summary

| Prefix | Module | Auth Required |
|---|---|---|
| `POST /api/auth/sign-in/email` | Login | None |
| `POST /api/auth/sign-out` | Logout | Session |
| `GET  /api/auth/session` | Session info | None |
| `GET  /api/v1/auth/me` | My profile | Session |
| `POST /api/v1/auth/seed-admin` | First admin | None (locks automatically) |
| `/api/v1/employees/**` | Employees | CXO (write), Session (read) |
| `/api/v1/cycles/**` | Review cycles | CXO |
| `/api/v1/competencies/**` | Competencies | CXO (write), Session (read) |
| `/api/v1/questions/**` | Questions | CXO (write), Session (read) |
| `/api/v1/self-feedback/**` | Self-assessment | Session |
| `/api/v1/assignments/**` | Assignments | CXO |
| `/api/v1/reviewers/**` | Reviewer records | Session / Token |
| `/api/v1/surveys/**` | Survey forms | Session or Token |
| `/api/v1/scores/**` | Scores | Session (role-dependent) |
| `/api/v1/results/**` | Dashboards | Session (role-dependent) |
| `/api/v1/reports/**` | PDF / CSV | CXO |
| `/api/v1/admin/**` | Admin tools | CXO |

---

## 10. Background Jobs

The following CRON jobs run automatically while the server is active:

| Job | Schedule | What it does |
|---|---|---|
| `cycleTransition.js` | Every hour | Moves `ACTIVE → CLOSING` when `end_date` is reached, and `CLOSING → COMPLETED` when grace period ends |

---

## 11. Role Reference

| Role | Code | Permissions |
|---|---|---|
| Individual Contributor | IC | Own data, assigned surveys |
| Team Manager | TM | Own data + direct reports + team dashboard |
| Head of Department | HOD | TM + department dashboard |
| CXO / HR Admin | CXO | Full access, admin tools, reports |

---

## Common Issues

### `process.exit(1)` on startup
Your `.env` is missing a required variable. Check the console output for the exact field name.

### `BETTER_AUTH_SECRET must be at least 32 chars`
Generate a valid secret:
```bash
npx @better-auth/cli@latest secret
```

### Port already in use
Change `PORT=3001` in `.env`.

### `relation "user" does not exist`
Run the auth migration: `npm run migrate:auth`

### `relation "questions" does not exist`  
Run the database setup SQL in Supabase SQL Editor first, then `npm run seed:questions`.
