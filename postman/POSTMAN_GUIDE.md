# Postman Collection — Import & Usage Guide

## Files

| File | Purpose |
|---|---|
| `360-Feedback-API.postman_collection.json` | Main collection — all 60+ requests |
| `360-Feedback-Local.postman_environment.json` | Environment variables |

---

## 1. Import into Postman

1. Open **Postman** → click **Import** (top-left)
2. Drag & drop **both JSON files** at the same time (or import one by one)
3. In the top-right environment dropdown select **"360 Feedback - Local"**

---

## 2. First-time Setup

### Step 1 — Start the server
```bash
cd backend
npm run dev
```
Server must be running on `http://localhost:3000` before sending any requests.

### Step 2 — Enable cookie storage
Postman must be allowed to save the `better-auth` session cookie:
- Go to **Settings → General → Cookies** (or click the 🍪 icon near Send) — cookies are **saved automatically** by default in Postman desktop.

### Step 3 — Seed the admin (once, on a fresh database)
Open folder **01 · Auth** → run **"01 Seed First Admin (run once)"**  
Expected: `201 Created`  
On re-run after the admin already exists: `403` — that is normal.

### Step 4 — Login
Run **"02 Login as CXO Admin"**  
The session cookie is stored in Postman's cookie jar — all following requests use it automatically.

---

## 3. Recommended Test Order (End-to-End)

Run these folders **top to bottom** to cover a full review cycle workflow:

```
01 · Auth                    Login / profile check
02 · Employees               Verify employees, update roles
03 · Review Cycles           Create → Activate → (Submit surveys) → Publish
04 · Competencies            Browse competency catalogue
05 · Questions               Browse question bank
06 · Self-Feedback           Employee self-assessment (DRAFT → SUBMIT)
07 · Assignments             Create assignment → Add reviewers
08 · Reviewers               Look up reviewer by token / pending list
09 · Survey Responses        Get form → Save draft → Submit survey
10 · Scores                  View scores · Recalculate
11 · Results / Dashboards    View dashboards at each role level
12 · Reports (PDF & CSV)     Generate reports (use Save Response to download)
13 · Admin                   Dashboard · Config · Audit logs
14 · Error Cases & Security  Boundary / guard tests
```

---

## 4. Auto-Populated Variables

These variables are **written automatically** by test scripts — you do not need to set them manually:

| Variable | Set by | Value |
|---|---|---|
| `cycleId` | `03 · Cycles → 01 Create Cycle` | UUID of new cycle |
| `assignmentId` | `07 · Assignments → 01 Create Assignment` | UUID of new assignment |
| `reviewerId` | `07 · Assignments → 06 Add Reviewer` | UUID of reviewer record |
| `accessToken` | `07 · Assignments → 06 Add Reviewer` | One-time survey token |

You can see and edit them under **Environments → 360 Feedback - Local → Current Value**.

---

## 5. PDF / CSV Reports

Use **"Send and Download"** (arrow next to Send) for the report endpoints so Postman saves the binary file to disk instead of trying to display it.

---

## 6. Testing Different Roles

To test **403** responses on CXO-only endpoints:

1. Log out: `01 · Auth → 06 Sign Out`
2. Create a non-CXO employee account (or update an employee's group_name to `IC`)
3. Login with that IC employee's credentials
4. Run the CXO-protected endpoints from folder 14 → you will see `403 Forbidden`

---

## 7. Changing Environments

| Environment | `baseUrl` |
|---|---|
| Local | `http://localhost:3000` |
| Staging | `https://staging.yourapp.com` |
| Production | `https://api.yourapp.com` |

Duplicate the environment file and change `baseUrl` — all requests automatically use the new URL.

---

## 8. Running the Entire Collection (Collection Runner)

1. Right-click the collection name → **Run collection**
2. Select environment: **360 Feedback - Local**
3. Click **Run 360 Feedback Platform API**

The runner executes requests in folder order. Red rows = assertion failures.  
Note: some tests (sign-out, delete cycle) will intentionally cause later requests to fail unless you re-login or recreate the cycle between runs.
