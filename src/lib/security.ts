import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
function derive(password: string, salt: string, length: number, options: { N: number; r: number; p: number; maxmem: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8 || password.length > 128) throw new Error('Password wajib 8–128 karakter.');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function checkPassword(password: string, hash: string): Promise<boolean> {
  if (password.length > 128 || hash.split('$').length !== 3) return false;
  const [scheme, salt, encoded] = hash.split('$');
  if (scheme !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(encoded ?? '')) return false;
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
  return timingSafeEqual(key, Buffer.from(encoded, 'hex'));
}
export function randomToken(): string { return randomBytes(32).toString('base64url'); }
export function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
