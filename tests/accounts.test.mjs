import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && url.pathname === '/db_aruskas');
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const a = await import('../src/lib/accounts.ts').catch(() => ({}));
test('invite is required, single use; session expiry and revocation', async () => {
 assert.equal(typeof a.acceptInvite, 'function');
 const email = `test-${randomBytes(12).toString('hex')}`;
 const password = randomBytes(24).toString('base64url');
 let user;
 try {
  await assert.rejects(a.acceptInvite(db,'invalid','Test',password));
  const token = await a.issueInvite(db,email);
  user = await a.acceptInvite(db,token,'Test',password);
  assert.equal(user.role,'user');
  await assert.rejects(a.acceptInvite(db,token,'Test',password));
  const session = await a.newSession(db,user.id);
  assert.equal((await a.sessionUser(db,session)).id,user.id);
  await a.revokeSession(db,session);
  assert.equal(await a.sessionUser(db,session),null);
  const expired = await a.newSession(db,user.id);
  await db.session.updateMany({where:{userId:user.id},data:{expiresAt:new Date(0)}});
  assert.equal(await a.sessionUser(db,expired),null);
 } finally {
  if(user) await db.user.delete({where:{id:user.id}});
  await db.invite.deleteMany({where:{username:email}});
  await db.$disconnect();
 }
});
