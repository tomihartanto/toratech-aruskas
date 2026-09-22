import Link from 'next/link';
import ActionForm from '@/components/action-form';
import PasswordInput from '@/components/password-input';
import { register } from '@/app/actions';
import { Input } from '@/components/ui/input';
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}) {
 const {token}=await searchParams;
 return <main className="mx-auto max-w-md space-y-5 px-5 py-16"><h1 className="text-2xl font-bold">Buat akun</h1>{!token ? <p>Tautan tidak valid. Minta tautan baru dari admin.</p> : <ActionForm action={register} label="Buat akun"><input type="hidden" name="token" value={token} /><label className="block">Nama<Input name="name" required maxLength={80} autoComplete="name" /></label><label className="block">Password baru<PasswordInput id="reg-password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label><p className="text-sm text-muted-foreground">Gunakan 8–128 karakter. Tautan hanya dapat dipakai sekali.</p></ActionForm>}<Link className="underline" href="/login">Kembali ke login</Link></main>;
}
