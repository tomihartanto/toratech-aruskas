import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL);
if (url.pathname !== '/db_aruskas' || !['localhost','127.0.0.1'].includes(url.hostname) || (url.port && url.port !== '5432')) throw new Error('Migration only localhost:5432/db_aruskas.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
 await db.query('BEGIN');
 await db.query('LOCK TABLE "Category", "Transaction", "Budget" IN ACCESS EXCLUSIVE MODE');
 const counts = (await db.query('SELECT (SELECT count(*) FROM "Transaction")::int AS transactions, (SELECT count(*) FROM "Budget")::int AS budgets')).rows[0];
 if (counts.transactions || counts.budgets) throw new Error('Existing financial data needs explicit owner migration. Aborted.');
 const exists = (await db.query("SELECT to_regclass('public.\"User\"') AS name")).rows[0].name;
 if (exists) throw new Error('Already migrated; refusing replay.');
 await db.query(await readFile(new URL('../prisma/multiuser.sql', import.meta.url), 'utf8'));
 await db.query('COMMIT');
 const result = await db.query('SELECT (SELECT count(*) FROM "Category")::int AS categories, (SELECT count(*) FROM "User")::int AS users');
 console.log({ migration:'applied', ...result.rows[0] });
} catch (error) { await db.query('ROLLBACK'); throw error; } finally { await db.end(); }
