import 'dotenv/config';
import pg from 'pg';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url = new URL(process.env.DATABASE_URL);
if (url.pathname !== '/db_aruskas' || !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Backup hanya DB lokal db_aruskas.');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const data = {};
  for (const {tablename} of tables) data[tablename] = (await db.query(`SELECT * FROM "${tablename.replaceAll('"','""')}"`)).rows;
  await db.query('COMMIT');
  await mkdir('backups', {recursive:true});
  const file = `backups/pre-multiuser-${Date.now()}.json`;
  const text = JSON.stringify(data, null, 2);
  await writeFile(file, text, {flag:'wx', mode:0o600});
  console.log(JSON.stringify({file, sha256:createHash('sha256').update(text).digest('hex'), counts:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length]))}));
} finally { await db.end(); }
