/**
 * config/auth.js
 *
 * better-auth instance configuration.
 *
 * Uses a custom Supabase JS adapter (HTTPS) instead of a direct
 * pg TCP connection — required because the host machine has no
 * IPv6 routing to Supabase's direct DB endpoint.
 *
 * Auth tables (created by scripts/migrate-auth.js):
 *   user, session, account, verification
 *
 * Mounting:
 *   app.all('/api/auth/*', toNodeHandler(auth))  — see app.js
 */

import { betterAuth } from 'better-auth';
import { createAdapterFactory } from 'better-auth/adapters';
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import crypto from 'node:crypto';

// ── Supabase service-role client (HTTPS — no pg TCP needed) ─
const supa = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// ── Custom better-auth adapter backed by Supabase JS client ─
// createAdapterFactory signature: ({ config, adapter }) => (betterAuthOptions) => adapterInstance
const supabaseAdapterFactory = createAdapterFactory({
    config: {
        adapterId: 'supabase-https',
        adapterName: 'Supabase HTTPS Adapter',
        usePlural: false,           // tables: user / session / account / verification (singular)
        supportsBooleans: true,
        supportsDates: true,
        supportsJSON: true,
        supportsNumericIds: false,
        supportsUUIDs: false,
        supportsArrays: false,
    },
    // adapter factory receives field-name helpers and returns the method implementations
    adapter: ({ getFieldName, getModelName }) => {

        // Translate better-auth logical field names (camelCase) → DB column names (snake_case)
        function applyWhere(query, model, where = []) {
            for (const { field, value, operator = 'eq' } of where) {
                const col = getFieldName({ model, field });
                switch (operator) {
                    case 'eq':          query = query.eq(col, value);           break;
                    case 'ne':          query = query.neq(col, value);          break;
                    case 'lt':          query = query.lt(col, value);           break;
                    case 'lte':         query = query.lte(col, value);          break;
                    case 'gt':          query = query.gt(col, value);           break;
                    case 'gte':         query = query.gte(col, value);          break;
                    case 'in':          query = query.in(col, Array.isArray(value) ? value : [value]); break;
                    case 'contains':    query = query.ilike(col, `%${value}%`); break;
                    case 'starts_with': query = query.ilike(col, `${value}%`);  break;
                    case 'ends_with':   query = query.ilike(col, `%${value}`);  break;
                    default:            query = query.eq(col, value);
                }
            }
            return query;
        }

        function translateSelect(model, select) {
            if (!select?.length) return '*';
            return select.map(f => getFieldName({ model, field: f })).join(',');
        }

        return {
            async create({ model, data, select }) {
                const table = getModelName(model);
                const { data: row, error } = await supa
                    .from(table).insert(data)
                    .select(translateSelect(model, select))
                    .single();
                if (error) throw new Error(`[supabase-adapter] create ${table}: ${error.message}`);
                return row;
            },
            async findOne({ model, where, select }) {
                const table = getModelName(model);
                let q = supa.from(table).select(translateSelect(model, select));
                q = applyWhere(q, model, where);
                const { data, error } = await q.maybeSingle();
                if (error) throw new Error(`[supabase-adapter] findOne ${table}: ${error.message}`);
                return data ?? null;
            },
            async findMany({ model, where, limit, offset, sortBy }) {
                const table = getModelName(model);
                let q = supa.from(table).select('*');
                q = applyWhere(q, model, where);
                if (sortBy) q = q.order(getFieldName({ model, field: sortBy.field }), { ascending: sortBy.direction === 'asc' });
                if (limit)  q = q.limit(limit);
                if (offset) q = q.range(offset, offset + (limit ?? 100) - 1);
                const { data, error } = await q;
                if (error) throw new Error(`[supabase-adapter] findMany ${table}: ${error.message}`);
                return data ?? [];
            },
            async update({ model, where, update }) {
                const table = getModelName(model);
                let q = supa.from(table).update(update);
                q = applyWhere(q, model, where);
                const { data, error } = await q.select().maybeSingle();
                if (error) throw new Error(`[supabase-adapter] update ${table}: ${error.message}`);
                return data ?? null;
            },
            async updateMany({ model, where, update }) {
                const table = getModelName(model);
                let q = supa.from(table).update(update);
                q = applyWhere(q, model, where);
                const { data, error } = await q.select();
                if (error) throw new Error(`[supabase-adapter] updateMany ${table}: ${error.message}`);
                return data?.length ?? 0;
            },
            async delete({ model, where }) {
                const table = getModelName(model);
                let q = supa.from(table).delete();
                q = applyWhere(q, model, where);
                const { error } = await q;
                if (error) throw new Error(`[supabase-adapter] delete ${table}: ${error.message}`);
            },
            async deleteMany({ model, where }) {
                const table = getModelName(model);
                let q = supa.from(table).delete();
                q = applyWhere(q, model, where);
                const { data, error } = await q.select();
                if (error) throw new Error(`[supabase-adapter] deleteMany ${table}: ${error.message}`);
                return data?.length ?? 0;
            },
            async count({ model, where }) {
                const table = getModelName(model);
                let q = supa.from(table).select('*', { count: 'exact', head: true });
                q = applyWhere(q, model, where);
                const { count, error } = await q;
                if (error) throw new Error(`[supabase-adapter] count ${table}: ${error.message}`);
                return count ?? 0;
            },
        };
    },
});

// ── better-auth instance ───────────────────────────────────
export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    // Custom Supabase JS adapter — pure HTTPS, no direct pg TCP connection
    database: supabaseAdapterFactory,

    session: {
        expiresIn: parseInt(env.SESSION_EXPIRY_SECONDS, 10),
        updateAge: 86400,
        cookieCache: { enabled: true, maxAge: 300 },
    },

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: false,
    },

    trustedOrigins: env.CORS_ORIGINS.split(',').map((o) => o.trim()),

    advanced: {
        cookiePrefix: 'okr360',
        generateId: () => crypto.randomUUID(),
    },
});

// pool is null — using Supabase HTTPS adapter, no pg TCP connection
export const pool = null;
