import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { newSession, sessionUser, revokeSession, SESSION_SECONDS } from '@/lib/accounts';
const COOKIE = 'aruskas_session';
export async function currentUser() { return sessionUser(prisma,(await cookies()).get(COOKIE)?.value); }
export async function isAuthed() { return Boolean(await currentUser()); }
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/akun');
  return user;
}
export async function checkOrigin() {
  const h = await headers();
  const origin = h.get('origin');
  const configured = process.env.APP_URL;
  if (!origin || !configured) throw new Error('Permintaan ditolak. Muat ulang halaman dari alamat aplikasi.');
  // ponytail: dev lokal — localhost & 127.0.0.1 dianggap host sama.
  // Produksi: origin harus persis APP_URL.
  const eqLocal = (u: string) => {
    try { const { hostname, port, protocol } = new URL(u); return protocol === 'http:' && ['localhost','127.0.0.1'].includes(hostname) && (port === '3000' || port === ''); }
    catch { return false; }
  };
  const same = new URL(origin).origin === new URL(configured).origin;
  if (!same && !(eqLocal(origin) && eqLocal(configured))) throw new Error('Permintaan ditolak. Muat ulang halaman dari alamat aplikasi.');
}
export async function setSession(userId: number) {
  await clearSession();
  const token = await newSession(prisma,userId);
  (await cookies()).set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:new URL(process.env.APP_URL!).protocol === 'https:',path:'/',maxAge:SESSION_SECONDS});
}
export async function clearSession() {
  const store = await cookies();
  await revokeSession(prisma,store.get(COOKIE)?.value);
  store.delete(COOKIE);
}
