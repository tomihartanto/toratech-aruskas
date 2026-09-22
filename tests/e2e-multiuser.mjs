// Full multi-user UI/UX verification: admin invite -> register -> reset link -> user management.
// Headless Edge via shared playwright install. Cleans up ONLY records it created, by exact username/ID.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword, tokenHash } from '../src/lib/security.ts';
import { newSession } from '../src/lib/accounts.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'D:/code/personal/toratech-docs/node_modules/playwright');
const base = process.env.APP_URL;
assert.equal(new URL(base).hostname, '127.0.0.1');
const dbUrl = new URL(process.env.DATABASE_URL);
assert.equal(dbUrl.pathname, '/db_aruskas');
assert.ok(['localhost', '127.0.0.1'].includes(dbUrl.hostname));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const prefix = `muv-${randomBytes(10).toString('hex')}`;
const password = randomBytes(24).toString('base64url') + 'aA1';
const emails = [];
const ids = [];
const errors = [];
let browser;

const routes = ['/', '/transaksi', '/pengaturan', '/akun', '/admin'];

try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });

  // --- Admin context (DB-seeded test admin; role asserted) ---
  const adminEmail = `${prefix}-admin`; emails.push(adminEmail);
  const admin = await db.user.create({ data: { username: adminEmail, name: 'Multiuser Admin', passwordHash: await hashPassword(password), role: 'admin', active: true } });
  ids.push(admin.id);
  assert.equal(admin.role, 'admin');
  const adminContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const adminSession = await newSession(db, admin.id);
  await adminContext.addCookies([{ name: 'aruskas_session', value: adminSession, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const adminPage = await adminContext.newPage();
  adminPage.on('pageerror', e => errors.push('admin pageerror: ' + e.message));
  adminPage.on('console', m => { if (m.type() === 'error') errors.push('admin console: ' + m.text()); });

  // Non-admin must NOT see admin page
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  const guardResp = await anonPage.goto(base + '/admin');
  assert.ok(guardResp.url().includes('/login'), 'anon /admin should redirect to /login, got ' + guardResp.url());

  // --- 1. Admin creates invite through the real UI ---
  await adminPage.goto(base + '/admin');
  assert.match(await adminPage.textContent('main'), /Kelola akun/);
  const invitedEmail = `${prefix}-user`; emails.push(invitedEmail);
  await adminPage.getByLabel('Username pengguna', { exact: true }).fill(invitedEmail);
  await adminPage.getByRole('button', { name: 'Buat undangan', exact: true }).click();
  await adminPage.getByLabel('Tautan pribadi', { exact: true }).waitFor();
  const inviteLink = await adminPage.getByLabel('Tautan pribadi', { exact: true }).inputValue();
  assert.ok(inviteLink.startsWith(base + '/register?token='), inviteLink);
  const inviteToken = new URL(inviteLink).searchParams.get('token');
  assert.match(inviteToken, /^[\w-]{43}$/);
  const inviteRow = await db.invite.findFirstOrThrow({ where: { username: invitedEmail, tokenHash: tokenHash(inviteToken) } });
  const inviteId = inviteRow.id;
  assert.equal(inviteRow.usedAt, null);
  assert.ok(await adminPage.getByText(invitedEmail).first().isVisible(), 'invite should be listed under "Undangan aktif"');

  // --- 2. Fresh user registers via the invite link (new browser context) ---
  const userContext = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const userPage = await userContext.newPage();
  userPage.on('pageerror', e => errors.push('user pageerror: ' + e.message));
  userPage.on('console', m => { if (m.type() === 'error') errors.push('user console: ' + m.text()); });
  await userPage.goto(inviteLink);
  assert.match(await userPage.textContent('main'), /Buat akun/);
  await userPage.getByLabel('Nama', { exact: true }).fill('Multiuser Test User');
  await userPage.getByLabel('Password baru', { exact: true }).fill(password);
  await userPage.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await userPage.waitForURL(base + '/');
  const regUser = await db.user.findUniqueOrThrow({ where: { username: invitedEmail } });
  ids.push(regUser.id);
  assert.equal(regUser.role, 'user');
  assert.equal((await db.invite.findUniqueOrThrow({ where: { id: inviteId } })).usedAt !== null, true, 'invite marked used');
  assert.ok((await db.category.count({ where: { userId: regUser.id } })) > 0, 'template categories copied');

  // Non-admin is redirected away from /admin to /akun (no error boundary, no data leak)
  await userPage.goto(base + '/admin');
  await userPage.waitForURL('**/akun');
  const userAdminUrl = userPage.url();
  const adminBodyText = await userPage.textContent('body');
  assert.ok(!/Kelola akun/.test(adminBodyText), 'non-admin must not see admin content');

  // Invite link single-use
  const replay = await browser.newContext();
  const replayPage = await replay.newPage();
  await replayPage.goto(inviteLink);
  await replayPage.getByLabel('Nama', { exact: true }).fill('Replay Attacker');
  await replayPage.getByLabel('Password baru', { exact: true }).fill(password);
  await replayPage.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await replayPage.locator('p[role=\"alert\"]').first().waitFor();
  for (let i = 0; i < 15 && !(await replayPage.locator('p[role=\"alert\"]').first().textContent()); i++) await replayPage.waitForTimeout(300);
  assert.match(await replayPage.locator('p[role=\"alert\"]').first().textContent(), /tidak valid|sudah dipakai/i);
  await replay.close();

  // --- 3. Admin issues reset link; user resets password through real UI ---
  await adminPage.goto(base + '/admin');
  const userCard = adminPage.locator('article').filter({ hasText: invitedEmail });
  await userCard.getByRole('button', { name: 'Buat tautan reset password', exact: true }).click();
  await adminPage.getByLabel('Tautan pribadi', { exact: true }).waitFor();
  const resetLink = await adminPage.getByLabel('Tautan pribadi', { exact: true }).inputValue();
  assert.ok(resetLink.startsWith(base + '/reset?token='), resetLink);
  const resetToken = new URL(resetLink).searchParams.get('token');
  assert.match(resetToken, /^[\w-]{43}$/);
  assert.equal(await db.passwordReset.count({ where: { tokenHash: tokenHash(resetToken), userId: regUser.id } }), 1);

  const newPassword = randomBytes(24).toString('base64url') + 'bB2';
  await userPage.goto(resetLink);
  assert.match(await userPage.textContent('main'), /Reset password/);
  await userPage.getByLabel('Password baru', { exact: true }).fill(newPassword);
  await userPage.getByRole('button', { name: 'Reset password', exact: true }).click();
  await userPage.locator('p[role=\"status\"]').first().waitFor();
  assert.match(await userPage.locator('p[role=\"status\"]').first().textContent(), /Password diperbarui/);
  assert.equal(await db.session.count({ where: { userId: regUser.id } }), 0, 'reset revokes sessions');
  assert.equal(await db.passwordReset.count({ where: { userId: regUser.id } }), 0, 'reset token consumed');
  // Old session cookie now invalid -> redirected to /login
  const afterReset = await userPage.goto(base + '/');
  assert.ok(afterReset.url().includes('/login'), 'stale session bounced to login');

  // Login with new password through real UI
    await userPage.getByLabel('Username', { exact: true }).fill(invitedEmail);
    await userPage.getByLabel('Password', { exact: true }).fill(newPassword);
    await userPage.getByRole('button', { name: 'Masuk', exact: true }).click();
    await userPage.waitForURL(base + '/');
    // Old password rejected
    await userPage.getByRole('button', { name: 'Keluar', exact: true }).last().click();
    await userPage.waitForURL(base + '/login');
    await userPage.getByLabel('Username', { exact: true }).fill(invitedEmail);
    await userPage.getByLabel('Password', { exact: true }).fill(password);
    await userPage.getByRole('button', { name: 'Masuk', exact: true }).click();
    await userPage.getByText('Username atau password salah').first().waitFor();
    await userPage.waitForTimeout(500); // fields are controlled; values persist after failed login
    await userPage.getByLabel('Username', { exact: true }).fill(invitedEmail);
    await userPage.getByLabel('Password', { exact: true }).fill(newPassword);
    await userPage.getByRole('button', { name: 'Masuk', exact: true }).click();
    await userPage.waitForURL(base + '/', { timeout: 15000 });
    await userContext.close();

  // --- 4. User management: revoke sessions, toggle active ---
  await adminPage.goto(base + '/admin');
  assert.ok((await db.session.count({ where: { userId: regUser.id } })) > 0);
  adminPage.once('dialog', d => d.accept());
  await userCard.getByRole('button', { name: 'Cabut semua sesi', exact: true }).click();
  await adminPage.waitForFunction(() => document.querySelectorAll('p[role=\"status\"]').length > 0, null, { timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 20 && (await db.session.count({ where: { userId: regUser.id } })) > 0; i++) await adminPage.waitForTimeout(200);
  assert.equal(await db.session.count({ where: { userId: regUser.id } }), 0, 'revoke sessions');

  await adminPage.goto(base + '/admin');
  adminPage.once('dialog', d => d.accept());
  await userCard.getByRole('button', { name: 'Nonaktifkan akun', exact: true }).click();
  for (let i = 0; i < 25 && (await db.user.findUniqueOrThrow({ where: { id: regUser.id } })).active; i++) await adminPage.waitForTimeout(300);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: regUser.id } })).active, false);
  // Deactivated user cannot log in
  const relogin = await browser.newContext();
  const reloginPage = await relogin.newPage();
  await reloginPage.goto(base + '/login');
  await reloginPage.getByLabel('Username', { exact: true }).fill(invitedEmail);
  await reloginPage.getByLabel('Password', { exact: true }).fill(newPassword);
  await reloginPage.getByRole('button', { name: 'Masuk', exact: true }).click();
  await reloginPage.getByText('Username atau password salah').first().waitFor();
  await relogin.close();

  await adminPage.goto(base + '/admin');
  adminPage.once('dialog', d => d.accept());
  await userCard.getByRole('button', { name: 'Aktifkan akun', exact: true }).click();
  for (let i = 0; i < 25 && !(await db.user.findUniqueOrThrow({ where: { id: regUser.id } })).active; i++) await adminPage.waitForTimeout(300);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: regUser.id } })).active, true);

  // --- 5. Admin revokeInvite: fresh invite then revoke via UI ---
  const shortEmail = `${prefix}-short`; emails.push(shortEmail);
  await adminPage.goto(base + '/admin');
  await adminPage.getByLabel('Username pengguna', { exact: true }).fill(shortEmail);
  await adminPage.getByRole('button', { name: 'Buat undangan', exact: true }).click();
  await adminPage.getByLabel('Tautan pribadi', { exact: true }).waitFor();
  const shortLink = await adminPage.getByLabel('Tautan pribadi', { exact: true }).inputValue();
  const shortToken = new URL(shortLink).searchParams.get('token');
  await adminPage.goto(base + '/admin');
  const shortCard = adminPage.locator('article').filter({ hasText: shortEmail });
  adminPage.once('dialog', d => d.accept());
  await shortCard.getByRole('button', { name: 'Batalkan undangan', exact: true }).click();
  for (let i = 0; i < 25 && !(await db.invite.findFirstOrThrow({ where: { tokenHash: tokenHash(shortToken) } })).usedAt; i++) await adminPage.waitForTimeout(300);
  assert.ok((await db.invite.findFirstOrThrow({ where: { tokenHash: tokenHash(shortToken) } })).usedAt !== null, 'revoked invite marked used');
  const shortPage = await (await browser.newContext()).newPage();
  await shortPage.goto(shortLink);
  await shortPage.getByLabel('Nama', { exact: true }).fill('Revoked Invite');
  await shortPage.getByLabel('Password baru', { exact: true }).fill(password);
  await shortPage.getByRole('button', { name: 'Buat akun', exact: true }).click();
  await shortPage.locator('p[role=\"alert\"]').first().waitFor();
  assert.match(await shortPage.locator('p[role=\"alert\"]').first().textContent(), /tidak valid|sudah dipakai/i);
  assert.equal(await db.user.count({ where: { username: shortEmail } }), 0);
  await shortPage.context().close();

  // --- 6. Responsive: desktop 1366x900 + mobile 390x844, zero horizontal overflow ---
  for (const route of routes) {
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await adminPage.goto(base + route);
    assert.ok(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `mobile overflow ${route}`);
    await adminPage.setViewportSize({ width: 1366, height: 900 });
    await adminPage.goto(base + route);
    assert.ok(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `desktop overflow ${route}`);
  }

  // Login page mobile check too
  const mobLogin = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  mobLogin.on('pageerror', e => errors.push('moblogin pageerror: ' + e.message));
  mobLogin.on('console', m => { if (m.type() === 'error') errors.push('moblogin console: ' + m.text()); });
  await mobLogin.goto(base + '/login');
  assert.ok(await mobLogin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile overflow /login');
  await mobLogin.context().close();

  assert.deepEqual(errors, []);
  console.log('PASS multi-user UI verification:');
  console.log('- anon guard /admin -> /login OK');
  console.log('- admin invite via UI -> link issued, listed, stored hashed OK');
  console.log('- register via invite link (fresh context) -> role user, invite consumed, categories copied OK');
  console.log('- invite single-use replay rejected OK');
  console.log('- admin reset link -> user resets via UI -> sessions revoked, token consumed, old pw rejected, new pw login OK');
  console.log('- user mgmt: revoke sessions, deactivate blocks login, reactivate OK');
  console.log('- revokeInvite via UI -> registration rejected OK');
  console.log(`- responsive: ${routes.join(', ')} + /login at 390x844 and 1366x900, no horizontal overflow OK`);
  console.log('- zero console errors / pageerrors across all contexts OK');
} finally {
  if (browser) await browser.close();
  // Cleanup ONLY records this test created, by exact username/ID. Never blanket deletes.
  for (const email of emails) {
    const user = await db.user.findUnique({ where: { username: email } });
    if (user) await db.user.delete({ where: { id: user.id } });
    await db.invite.deleteMany({ where: { username: email } });
    await db.loginAttempt.deleteMany({ where: { key: tokenHash(email) } });
  }
  for (const id of ids) {
    await db.session.deleteMany({ where: { userId: id } });
    await db.passwordReset.deleteMany({ where: { userId: id } });
  }
  await db.$disconnect();
}
