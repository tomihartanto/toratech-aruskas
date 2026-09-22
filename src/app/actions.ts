"use server";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { checkOrigin, requireUser, requireAdmin, setSession, clearSession } from '@/lib/auth';
import { authenticate, acceptInvite, issueInvite, issueReset, resetPassword } from '@/lib/accounts';
import { checkPassword, hashPassword } from '@/lib/security';
import { id, text } from '@/lib/validation';
import { headers } from 'next/headers';
import { saveTransaction, saveCategoryRecord, saveBudgetRecord, deleteRecord } from '@/lib/finance';
export type State = { error?: string; success?: string; link?: string };
function failure(error: unknown): State {
 const code = (error as {code?:string})?.code;
 if (code === 'P2002') return {error:'Data sudah ada. Gunakan nama atau username lain.'};
 if (code === 'P2003') return {error:'Data masih dipakai transaksi atau budget. Hapus data terkait terlebih dahulu.'};
 return {error:error instanceof Error && !code ? error.message : 'Gagal menyimpan. Coba lagi.'};
}
function refresh() { revalidatePath('/','layout'); }
export async function bootstrapAdmin(_prev:State,f:FormData):Promise<State> {
 try {
  await checkOrigin();
  const host=(await headers()).get('host')??'';
  if(!process.env.LOCAL_BOOTSTRAP_USERNAME || !['localhost','127.0.0.1'].includes(new URL(process.env.APP_URL!).hostname) || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw new Error('Setup lokal tidak tersedia.');
  const password=String(f.get('password')??'');
  if(password!==String(f.get('confirmation')??'')) throw new Error('Konfirmasi password tidak cocok.');
  const passwordHash=await hashPassword(password);
  const name=text(f.get('name'),'Nama',80);
  await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(73184219)`;
   if(await tx.user.count({where:{role:'admin'}})) throw new Error('Setup sudah selesai. Silakan masuk.');
   const user=await tx.user.create({data:{username:process.env.LOCAL_BOOTSTRAP_USERNAME!,name,passwordHash,role:'admin',active:true}});
   const templates=await tx.category.findMany({where:{userId:null},select:{name:true,type:true}});
   await tx.category.createMany({data:templates.map(c=>({...c,userId:user.id,icon:'tag'}))});
  });
 } catch(e) { return failure(e); }
 redirect('/login');
}
export async function login(_prev:State,f:FormData):Promise<State> {
 let user;
 try { await checkOrigin(); user = await authenticate(prisma,String(f.get('username')??''),String(f.get('password')??'')); }
 catch(e) { return failure(e); }
 await setSession(user.id); redirect('/');
}
export async function logout() { await checkOrigin(); await clearSession(); redirect('/login'); }
export async function register(_prev:State,f:FormData):Promise<State> {
 let user;
 try { await checkOrigin(); user = await acceptInvite(prisma,String(f.get('token')??''),String(f.get('name')??''),String(f.get('password')??'')); }
 catch(e) { return failure(e); }
 await setSession(user.id); redirect('/');
}
export async function reset(_prev:State,f:FormData):Promise<State> {
 try { await checkOrigin(); await resetPassword(prisma,String(f.get('token')??''),String(f.get('password')??'')); await clearSession(); return {success:'Password diperbarui. Silakan masuk kembali.'}; }
 catch(e) { return failure(e); }
}
export async function changePassword(_prev:State,f:FormData):Promise<State> {
 const user = await requireUser();
 try {
  await checkOrigin();
  if (!await checkPassword(String(f.get('currentPassword')??''),user.passwordHash)) throw new Error('Password saat ini salah.');
  const passwordHash = await hashPassword(String(f.get('password')??''));
  await prisma.$transaction([prisma.user.update({where:{id:user.id},data:{passwordHash}}),prisma.session.deleteMany({where:{userId:user.id}}),prisma.passwordReset.deleteMany({where:{userId:user.id}})]);
  await clearSession();
 } catch(e) { return failure(e); }
 redirect('/login');
}
export async function revokeAll(_prev:State,_f:FormData):Promise<State> {
 void _prev; void _f;
 const user = await requireUser(); await checkOrigin();
 await prisma.session.deleteMany({where:{userId:user.id}}); await clearSession(); redirect('/login');
}
export async function adminAction(_prev:State,f:FormData):Promise<State> {
 const admin = await requireAdmin();
 try {
  await checkOrigin(); const op = String(f.get('op'));
  if(op === 'invite') { const token = await issueInvite(prisma,String(f.get('username')??'')); refresh(); return {link:`${process.env.APP_URL}/register?token=${token}`,success:'Undangan berlaku 24 jam. Salin dan kirim secara pribadi; email tidak dikirim otomatis.'}; }
  const target = id(f.get('id'));
  if(op === 'revokeInvite') { await prisma.invite.update({where:{id:target},data:{usedAt:new Date()}}); }
  else {
   const user = await prisma.user.findUnique({where:{id:target}});
   if(!user) throw new Error('Akun tidak ditemukan.');
   if(op === 'reset') { const token = await issueReset(prisma,target); return {link:`${process.env.APP_URL}/reset?token=${token}`,success:'Tautan reset berlaku 1 jam. Kirim secara pribadi; email tidak dikirim otomatis.'}; }
   if(target === admin.id || user.role === 'admin') throw new Error('Akun admin tidak dapat dinonaktifkan lewat halaman ini.');
   if(op === 'toggle') await prisma.$transaction([prisma.user.update({where:{id:target},data:{active:!user.active}}),prisma.session.deleteMany({where:{userId:target}})]);
   else if(op === 'revoke') await prisma.session.deleteMany({where:{userId:target}});
   else throw new Error('Aksi tidak valid.');
  }
  refresh(); return {success:'Perubahan tersimpan.'};
 } catch(e) { return failure(e); }
}
export async function saveTx(_prev:State,f:FormData):Promise<State> { const user=await requireUser(); try { await checkOrigin(); await saveTransaction(prisma,user.id,f); } catch(e) {return failure(e);} refresh(); redirect('/transaksi'); }
export async function saveCategory(_prev:State,f:FormData):Promise<State> { const user=await requireUser(); try { await checkOrigin(); await saveCategoryRecord(prisma,user.id,f); } catch(e) {return failure(e);} refresh(); return {success:'Kategori tersimpan.'}; }
export async function saveBudget(_prev:State,f:FormData):Promise<State> { const user=await requireUser(); try { await checkOrigin(); await saveBudgetRecord(prisma,user.id,f); } catch(e) {return failure(e);} refresh(); return {success:'Budget tersimpan.'}; }
async function remove(entity:'transaction'|'category'|'budget',f:FormData):Promise<State> { const user=await requireUser(); try { await checkOrigin(); await deleteRecord(prisma,user.id,entity,f.get('id')); refresh(); return {success:'Data dihapus.'}; } catch(e) {return failure(e);} }
export async function deleteTx(_prev:State,f:FormData) { return remove('transaction',f); }
export async function deleteCategory(_prev:State,f:FormData) { return remove('category',f); }
export async function deleteBudget(_prev:State,f:FormData) { return remove('budget',f); }
