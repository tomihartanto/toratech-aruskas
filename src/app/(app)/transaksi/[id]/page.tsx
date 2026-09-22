import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import TxForm from "@/components/tx-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TxEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await requireUser();
  const { id } = await params;
  const tx = await prisma.transaction.findUnique({
    where: { userId, id: /^[1-9]\d{0,8}$/.test(id) ? Number(id) : 0 },
  });
  if (!tx) notFound();
  const cats = await prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Edit Transaksi</h1>
      <Card>
        <CardContent className="pt-6">
          <TxForm
        cats={cats}
        tx={{
          id: tx.id,
          type: tx.type,
          amount: String(tx.amount),
          categoryId: tx.categoryId,
          note: tx.note,
          date: tx.date.toISOString().slice(0, 10),
        }}
      />
        </CardContent>
      </Card>
    </div>
  );
}
