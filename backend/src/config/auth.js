/**
 * config/auth.js
 *
 * better-auth instance configuration.
 *
 * Responsibilities:
 *   - Manages user credentials, sessions, and token rotation
 *   - Uses a direct PostgreSQL adapter (pg) pointed at the
 *     same Supabase database as the rest of the app
 *   - better-auth owns its own tables: user, session, account,
 *     verification — fully separate from the 15 business tables
 *   - RBAC roles are NOT stored in better-auth; they are read
 *     from employees.group_name at session time via the
 *     authenticateSession middleware
 *
 * Auth tables created by better-auth (do not touch manually):
 *   user, session, account, verification
 *
 * Mounting:
 *   app.all('/api/auth/*', toNodeHandler(auth))  — see app.js
 */

import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { env } from './env.js';
import crypto from "node:crypto";

// ── PostgreSQL connection pool (shared with better-auth) ───
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,          // max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// // TEMP: sanity DB test
// try {
//     const client = await pool.connect();
//     console.log("✅ PG connected successfully");
//     client.release();
// } catch (err) {
//     console.error("❌ PG connection failed", err);
// }

// console.log(env.DATABASE_URL)

// ── better-auth instance ───────────────────────────────────
export const auth = betterAuth({
    // Exposed base URL — used for callback URLs and CORS
    baseURL: env.BETTER_AUTH_URL,

    // Secret for signing sessions and tokens
    secret: env.BETTER_AUTH_SECRET,

    // Database adapter — pg (PostgreSQL / Supabase)
    database: {
        type: 'pg',
        pool,
    },
    // database: pgAdapter(pool),

    // Session configuration
    session: {
        expiresIn: parseInt(env.SESSION_EXPIRY_SECONDS, 10), // default 7 days
        updateAge: 86400, // refresh session timestamp if older than 1 day
        cookieCache: {
            enabled: true,
            maxAge: 300, // 5-minute client-side cache to reduce DB hits
        },
    },

    // Enable email + password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // employees are pre-seeded via AD sync
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: false, // explicit login only
    },

    // Trust headers from reverse proxy in production
    trustedOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()),

    // Advanced settings
    advanced: {
        // Use consistent cookie naming
        cookiePrefix: 'okr360',
        // Generate secure tokens
        generateId: () => crypto.randomUUID(),
    },
});

export { pool };


// import "dotenv/config";
// import crypto from "node:crypto";
// import { betterAuth } from "better-auth";
// import { Pool } from "pg";
// import { env } from "./env.js";

// // ── PostgreSQL pool ─────────────────────────────────────────
// export const pool = new Pool({
//   connectionString: env.DATABASE_URL,
//   max: 10,
//   idleTimeoutMillis: 30_000,
//   connectionTimeoutMillis: 5_000,
//   ssl:
//     env.NODE_ENV === "production"
//       ? { rejectUnauthorized: false }
//       : false,
// });

// // ── Better Auth ─────────────────────────────────────────────
// export const auth = betterAuth({
//   baseURL: env.BETTER_AUTH_URL,
//   secret: env.BETTER_AUTH_SECRET,

//   // ✅ THIS IS CORRECT FOR CURRENT better-auth
//   database: {
//     type: "pg",
//     pool,
//   },

//   session: {
//     expiresIn: Number(env.SESSION_EXPIRY_SECONDS ?? 60 * 60 * 24 * 7),
//     updateAge: 86_400,
//     cookieCache: {
//       enabled: true,
//       maxAge: 300,
//     },
//   },

//   emailAndPassword: {
//     enabled: true,
//     requireEmailVerification: false,
//     minPasswordLength: 8,
//     maxPasswordLength: 128,
//     autoSignIn: false,
//   },

//   trustedOrigins: env.CORS_ORIGINS
//     .split(",")
//     .map((o) => o.trim()),

//   advanced: {
//     cookiePrefix: "okr360",
//     generateId: () => crypto.randomUUID(),
//   },
// });
