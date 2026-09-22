import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { changePassword, revokeAll } from '@/app/actions';
import ActionForm from '@/components/action-form';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
export default async function Page() {
 const user=await requireUser();
 return <div className="mx-auto max-w-lg space-y-8"><header><h1 className="text-xl font-bold">Akun saya</h1><p>{user.name} · {user.username}</p></header>{user.role==='admin' && <Link className="block underline" href="/admin">Kelola akun dan undangan</Link>}<section className="rounded-xl border bg-background p-5 space-y-4"><h2 className="font-semibold">Ganti password</h2><ActionForm action={changePassword} label="Ganti password"><label className="block">Password saat ini<PasswordInput id="cur-password" name="currentPassword" required autoComplete="current-password" /></label><label className="block">Password baru<PasswordInput id="new-password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label><p className="text-sm text-muted-foreground">Minimal 8 karakter. Semua perangkat akan keluar setelah perubahan.</p></ActionForm></section><ActionForm action={revokeAll} label="Keluar dari semua perangkat" confirm="Keluar dari semua perangkat, termasuk perangkat ini?" /></div>;
}
