import type { PrismaClient } from '@prisma/client';
import { hashPassword, checkPassword, randomToken, tokenHash } from './security.ts';
import { username, text } from './validation.ts';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export async function issueInvite(db: PrismaClient, address: string) {
  const normalized = username(address);
  if (await db.user.findUnique({where:{username:normalized}})) throw new Error('Username sudah terdaftar.');
  const token = randomToken();
  await db.$transaction(async tx => {
    await tx.invite.updateMany({where:{username:normalized,usedAt:null},data:{usedAt:new Date()}});
    await tx.invite.create({data:{username:normalized,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+86400000)}});
  });
  return token;
}
export async function acceptInvite(db: PrismaClient, token: string, name: string, password: string) {
  const cleanName = text(name,'Nama',80);
  if (!/^[\w-]{43}$/.test(token)) throw new Error('Undangan tidak valid atau sudah kedaluwarsa.');
  const hash = tokenHash(token);
  const invite = await db.invite.findUnique({where:{tokenHash:hash}});
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) throw new Error('Undangan tidak valid atau sudah kedaluwarsa.');
  const passwordHash = await hashPassword(password);
  return db.$transaction(async tx => {
    const result = await tx.invite.updateMany({where:{id:invite.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
    if (result.count !== 1) throw new Error('Undangan sudah dipakai atau kedaluwarsa.');
    const user = await tx.user.create({data:{username:invite.username,name:cleanName,passwordHash,role:'user',active:true}});
    const templates = await tx.category.findMany({where:{userId:null},select:{name:true,type:true}});
    await tx.category.createMany({data:templates.map(c=>({...c,userId:user.id,icon:'tag'}))});
    return user;
  });
}
export async function newSession(db: PrismaClient, userId: number) {
  const token = randomToken();
  await db.session.create({data:{tokenHash:tokenHash(token),userId,expiresAt:new Date(Date.now()+SESSION_SECONDS*1000)}});
  return token;
}
export async function sessionUser(db: PrismaClient, token: string | undefined) {
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const session = await db.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  return session && session.expiresAt > new Date() && session.user.active ? session.user : null;
}
export async function revokeSession(db: PrismaClient, token: string | undefined) {
  if (token) await db.session.deleteMany({where:{tokenHash:tokenHash(token)}});
}
export async function authenticate(db: PrismaClient, address: string, password: string) {
  const normalized = username(address);
  const key = tokenHash(normalized);
  const now = new Date();
  // Atomic per-account throttle survives process restarts and concurrent requests.
  await db.loginAttempt.deleteMany({where:{key,expiresAt:{lte:now}}});
  const attempt = await db.loginAttempt.upsert({where:{key},create:{key,count:1,expiresAt:new Date(Date.now()+900000)},update:{count:{increment:1}}});
  if (attempt.count > 5) throw new Error('Terlalu banyak percobaan. Tunggu 15 menit.');
  const user = await db.user.findUnique({where:{username:normalized}});
  const valid = user ? await checkPassword(password,user.passwordHash) : (await hashPassword('dummy-timing-only-'+randomToken()), false);
  if (!user || !valid || !user.active) throw new Error('Username atau password salah.');
  await db.loginAttempt.deleteMany({where:{key}});
  return user;
}
export async function issueReset(db: PrismaClient, userId: number) {
  const token = randomToken();
  await db.$transaction(async tx => {
    await tx.passwordReset.deleteMany({where:{userId}});
    await tx.passwordReset.create({data:{userId,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+3600000)}});
  });
  return token;
}
export async function resetPassword(db: PrismaClient, token: string, password: string) {
  if (!/^[\w-]{43}$/.test(token)) throw new Error('Tautan reset tidak valid.');
  const hash = tokenHash(token);
  const reset = await db.passwordReset.findUnique({where:{tokenHash:hash}});
  if (!reset || reset.expiresAt <= new Date()) throw new Error('Tautan reset tidak valid atau kedaluwarsa.');
  const passwordHash = await hashPassword(password);
  await db.$transaction(async tx => {
    const result = await tx.passwordReset.deleteMany({where:{tokenHash:hash,expiresAt:{gt:new Date()}}});
    if (result.count !== 1) throw new Error('Tautan reset sudah dipakai.');
    await tx.user.update({where:{id:reset.userId},data:{passwordHash}});
    await tx.passwordReset.deleteMany({where:{userId:reset.userId}});
    await tx.session.deleteMany({where:{userId:reset.userId}});
  });
}
