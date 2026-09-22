import type { PrismaClient } from '@prisma/client';
import { id, dateOnly, month, money, text } from './validation.ts';
function kind(value: unknown) {
  if (value !== 'income' && value !== 'expense') throw new Error('Tipe tidak valid.');
  return value;
}
export async function saveTransaction(db: PrismaClient, userId: number, form: FormData) {
  const txId = form.get('id') ? id(form.get('id')) : undefined;
  const type = kind(form.get('type'));
  const categoryId = id(form.get('categoryId'));
  const note = String(form.get('note') ?? '').trim();
  if (note.length > 200) throw new Error('Catatan maksimal 200 karakter.');
  const data = {userId,type,categoryId,amount:money(form.get('amount')),date:dateOnly(form.get('date')),note};
  return db.$transaction(async tx => {
    const cat = await tx.category.findFirst({where:{id:categoryId,userId,type}});
    if (!cat) throw new Error('Kategori tidak cocok atau tidak ditemukan.');
    if (txId) {
      const result = await tx.transaction.updateMany({where:{id:txId,userId},data});
      if (!result.count) throw new Error('Transaksi tidak ditemukan.');
    } else await tx.transaction.create({data});
  });
}
export async function saveCategoryRecord(db: PrismaClient, userId: number, form: FormData) {
  const categoryId = form.get('id') ? id(form.get('id')) : undefined;
  const data = {userId,name:text(form.get('name'),'Nama kategori',50),type:kind(form.get('type')),icon:'tag'};
  return db.$transaction(async tx => {
    if (categoryId) {
      const old = await tx.category.findFirst({where:{id:categoryId,userId}});
      if (!old) throw new Error('Kategori tidak ditemukan.');
      if (old.type !== data.type && (await tx.transaction.count({where:{categoryId,userId}}) || await tx.budget.count({where:{categoryId,userId}}))) throw new Error('Tipe kategori terpakai tidak dapat diubah.');
      await tx.category.update({where:{id:categoryId,userId},data});
    } else await tx.category.create({data});
  });
}
export async function saveBudgetRecord(db: PrismaClient, userId: number, form: FormData) {
  const categoryId = id(form.get('categoryId'));
  const data = {userId,categoryId,month:month(form.get('month')),limitAmount:money(form.get('limitAmount'))};
  const cat = await db.category.findFirst({where:{id:categoryId,userId,type:'expense'}});
  if (!cat) throw new Error('Pilih kategori pengeluaran milik Anda.');
  await db.budget.upsert({where:{categoryId_month:{categoryId,month:data.month}},create:data,update:{limitAmount:data.limitAmount}});
}
export async function deleteRecord(db: PrismaClient, userId: number, entity: 'transaction'|'category'|'budget', recordId: unknown) {
  const where = {id:id(recordId),userId};
  const result = entity === 'transaction' ? await db.transaction.deleteMany({where}) : entity === 'budget' ? await db.budget.deleteMany({where}) : await db.category.deleteMany({where});
  if (!result.count) throw new Error('Data tidak ditemukan atau sudah dihapus.');
}
