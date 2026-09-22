import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rupiah, tanggal } from '@/lib/format';
import { deleteTx } from '@/app/actions';
import ActionForm from '@/components/action-form';
import { Button } from '@/components/ui/button';
export default async function Page() {
 const {id:userId}=await requireUser();
 const txs=await prisma.transaction.findMany({where:{userId},orderBy:[{date:'desc'},{id:'desc'}],include:{category:true},take:200});
 return <div className="space-y-5"><header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Transaksi</h1><p className="text-sm text-muted-foreground">200 transaksi terbaru · data pribadi Anda</p></div><Button render={<Link href="/transaksi/baru"/>} nativeButton={false}>Tambah transaksi</Button></header>{!txs.length ? <section className="rounded-xl border bg-background p-8 text-center space-y-3"><h2 className="font-semibold">Mulai catat arus kas Anda</h2><p className="text-sm text-muted-foreground">Belum ada transaksi. Catat pemasukan atau pengeluaran pertama.</p><Link href="/transaksi/baru" className="inline-block py-3 underline">Tambah transaksi pertama</Link></section> : <ul className="space-y-3">{txs.map(t=><li key={t.id} className="rounded-xl border bg-background p-4 sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6"><div><p className="font-medium">{t.category.name}</p><p className="text-xs text-muted-foreground">{tanggal(t.date)}</p>{t.note && <p className="mt-1 break-words text-sm">{t.note}</p>}</div><p className={`my-3 font-semibold tabular-nums ${t.type==='income'?'text-emerald-700':'text-red-700'}`}>{t.type==='income'?'+':'−'} {rupiah(Number(t.amount))}</p><div className="flex items-start gap-3"><Link href={`/transaksi/${t.id}`} className="px-3 py-3 text-sm underline">Edit</Link><ActionForm action={deleteTx} label="Hapus" confirm="Hapus transaksi ini? Tindakan tidak dapat dibatalkan."><input type="hidden" name="id" value={t.id}/></ActionForm></div></li>)}</ul>}</div>;
}
