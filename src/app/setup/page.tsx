import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { bootstrapAdmin } from '@/app/actions';
import ActionForm from '@/components/action-form';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/password-input';
export const dynamic = 'force-dynamic';
export default async function Page() {
 if(!process.env.LOCAL_BOOTSTRAP_USERNAME || !['localhost','127.0.0.1'].includes(new URL(process.env.APP_URL!).hostname)) notFound();
 if(await prisma.user.count({where:{role:'admin'}})) redirect('/login');
 return <main className="mx-auto max-w-md space-y-5 p-5 py-12"><h1 className="text-2xl font-bold">Siapkan ArusKas</h1><p>Buat akun admin pertama. Halaman ini hanya tersedia di komputer lokal dan ditutup setelah admin dibuat.</p><ActionForm action={bootstrapAdmin} label="Buat akun admin"><label className="block">Nama<Input name="name" autoComplete="name" required maxLength={80}/></label><label className="block">Password baru<PasswordInput id="setup-password" name="password" autoComplete="new-password" required minLength={8} maxLength={128}/></label><label className="block">Ulangi password<PasswordInput id="setup-confirm" name="confirmation" autoComplete="new-password" required minLength={8} maxLength={128}/></label><p className="text-sm text-muted-foreground">Minimal 8 karakter. Jangan bagikan password melalui chat.</p></ActionForm></main>;
}
