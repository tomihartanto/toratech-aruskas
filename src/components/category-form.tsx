"use client";
import ActionForm from '@/components/action-form';
import { saveCategory } from '@/app/actions';
import { Input } from '@/components/ui/input';
export default function CategoryForm({category}:{category?:{id:number;name:string;type:string}}) {
 return <ActionForm action={saveCategory} label={category?'Simpan kategori':'Tambah kategori'}>{category && <input type="hidden" name="id" value={category.id}/>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nama kategori<Input name="name" defaultValue={category?.name} maxLength={50} required /></label><label className="text-sm">Tipe<select name="type" defaultValue={category?.type??'expense'} className="mt-1 h-11 w-full rounded-md border px-3"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label></div></ActionForm>;
}
