export function id(value: unknown): number {
  const s = String(value ?? '');
  if (!/^[1-9]\d*$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) > 2147483647) throw new Error('ID tidak valid.');
  return Number(s);
}
export function dateOnly(value: unknown): Date {
  const s = String(value ?? '');
  const date = new Date(`${s}T00:00:00.000Z`);
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== s) throw new Error('Tanggal tidak valid.');
  return date;
}
export function month(value: unknown): string {
  const s = String(value ?? '');
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(s)) throw new Error('Bulan tidak valid.');
  return s;
}
export function money(value: unknown): string {
  const s = String(value ?? '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s) || Number(s) <= 0 || Number(s) >= 10000000000) throw new Error('Jumlah harus lebih dari 0, maksimal 9.999.999.999,99.');
  return s;
}
export function username(value: unknown): string {
  const s = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,30}$/.test(s)) throw new Error('Username tidak valid: 3-30 karakter, hanya a-z, 0-9, titik, garis bawah, atau strip.');
  return s;
}
export function text(value: unknown, label: string, max: number): string {
  const s = String(value ?? '').trim();
  if (!s || s.length > max) throw new Error(`${label} wajib diisi, maksimal ${max} karakter.`);
  return s;
}
