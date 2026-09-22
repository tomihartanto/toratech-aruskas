"use client";
import { saveBudget } from '@/app/actions';
import ActionForm from '@/components/action-form';
import { Input } from '@/components/ui/input';
export default function BudgetForm({cats}:{cats:{id:number;name:string}[]}) {
 if(!cats.length) return <p className="text-sm">Tambahkan kategori pengeluaran terlebih dahulu.</p>;
 return <ActionForm action={saveBudget} label="Simpan budget"><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Kategori budget<select aria-label="Kategori budget" name="categoryId" required className="mt-1 h-11 w-full rounded-md border px-3">{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="text-sm">Bulan<Input type="month" name="month" defaultValue={new Date().toISOString().slice(0,7)} required/></label><label className="text-sm">Batas pengeluaran (Rp)<Input type="number" name="limitAmount" min="0.01" step="0.01" max="9999999999.99" required/></label></div></ActionForm>;
}
