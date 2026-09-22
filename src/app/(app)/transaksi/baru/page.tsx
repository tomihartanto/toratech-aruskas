import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import TxForm from "@/components/tx-form";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TxBaruPage() {
  const { id: userId } = await requireUser();
  const cats = await prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Transaksi Baru</h1>
      <Card>
        <CardContent className="pt-6">
          <TxForm cats={cats} tx={null} />
        </CardContent>
      </Card>
    </div>
  );
}
