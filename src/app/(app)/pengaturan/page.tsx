import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { rupiah, monthKey } from '@/lib/format';
import { deleteCategory, deleteBudget } from '@/app/actions';
import CategoryForm from '@/components/category-form';
import BudgetForm from '@/components/budget-form';
import ActionForm from '@/components/action-form';
import { Tag } from 'lucide-react';
export default async function Page() {
 const {id:userId}=await requireUser();
 const [cats,budgets]=await Promise.all([prisma.category.findMany({where:{userId},orderBy:{name:'asc'}}),prisma.budget.findMany({where:{userId,month:monthKey()},include:{category:true}})]);
 return <div className="space-y-7"><header><h1 className="text-xl font-bold">Kategori & budget</h1><p className="text-sm text-muted-foreground">Atur kategori dan batas pengeluaran bulanan Anda.</p></header><section className="space-y-4 rounded-xl border bg-background p-5"><h2 className="font-semibold">Tambah kategori</h2><CategoryForm/></section><section className="space-y-3"><h2 className="font-semibold">Kategori saya</h2>{cats.length===0 && <p>Belum ada kategori. Tambahkan kategori pertama di atas.</p>}{cats.map(c=><article key={c.id} className="rounded-xl border bg-background p-4 space-y-3"><div className="flex items-center gap-2"><Tag className="size-4"/><h3 className="font-medium">{c.name}</h3><span className="ml-auto text-xs text-muted-foreground">{c.type==='income'?'Pemasukan':'Pengeluaran'}</span></div><details><summary className="cursor-pointer py-2 text-sm underline">Edit kategori</summary><CategoryForm category={c}/></details><ActionForm action={deleteCategory} label="Hapus kategori" confirm={`Hapus kategori ${c.name}? Kategori terpakai tidak dapat dihapus.`}><input type="hidden" name="id" value={c.id}/></ActionForm></article>)}</section><section className="space-y-4 rounded-xl border bg-background p-5"><h2 className="font-semibold">Budget — {monthKey()}</h2><BudgetForm cats={cats.filter(c=>c.type==='expense')}/>{!budgets.length && <p className="text-sm text-muted-foreground">Belum ada budget bulan ini.</p>}{budgets.map(b=><article key={b.id} className="border-t pt-4 space-y-3"><p>{b.category.name} · {rupiah(Number(b.limitAmount))}</p><ActionForm action={deleteBudget} label="Hapus budget" confirm="Hapus budget ini?"><input type="hidden" name="id" value={b.id}/></ActionForm></article>)}</section></div>;
}
