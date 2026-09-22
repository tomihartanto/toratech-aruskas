import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rupiah, tanggal, monthKey } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Wallet, TriangleAlert } from "lucide-react";
import TrendChart from "@/components/trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function DashboardPage() {
  const { id: userId } = await requireUser();
  const now = new Date();
  const mk = monthKey(now);
  const [start, end] = [new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))];
  const trendStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [monthTx, trendTx, budgets, recent] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, date: { gte: start, lt: end } }, include: { category: true } }),
    prisma.transaction.groupBy({
      by: ["type", "date"],
      where: { userId, date: { gte: trendStart, lt: end } },
      _sum: { amount: true },
    }),
    prisma.budget.findMany({ where: { userId, month: mk }, include: { category: true } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" }, include: { category: true }, take: 5 }),
  ]);

  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const byMonth = new Map<string, { pemasukan: number; pengeluaran: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    byMonth.set(monthKey(d), { pemasukan: 0, pengeluaran: 0 });
  }
  for (const row of trendTx) {
    const e = byMonth.get(monthKey(row.date));
    if (!e) continue;
    if (row.type === "income") e.pemasukan += Number(row._sum.amount ?? 0);
    else e.pengeluaran += Number(row._sum.amount ?? 0);
  }
  const chartData = [...byMonth.entries()].map(([k, v]) => ({
    label: `${MONTHS_ID[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}`,
    ...v,
  }));

  const spentByCat = new Map<number, number>();
  for (const t of monthTx) {
    if (t.type !== "expense") continue;
    spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + Number(t.amount));
  }
  const budgetRows = budgets
    .map((b) => {
      const spent = spentByCat.get(b.categoryId) ?? 0;
      return { ...b, spent, pct: Math.round((spent / Number(b.limitAmount)) * 100) };
    })
    .sort((a, b) => b.pct - a.pct);
  const overBudget = budgetRows.filter((b) => b.pct >= 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{MONTHS_ID[now.getUTCMonth()]} {now.getUTCFullYear()}</p>
        </div>
        <Button render={<Link href="/transaksi/baru" />} nativeButton={false}>+ Transaksi</Button>
      </div>

      {overBudget.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Budget terlampaui:</strong>{" "}
            {overBudget.map((b) => `${b.category.name} (${b.pct}%)`).join(", ")}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><ArrowDownLeft className="size-4 text-emerald-700" /> Pemasukan</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-emerald-700 sm:text-2xl">{rupiah(income)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><ArrowUpRight className="size-4 text-red-700" /> Pengeluaran</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-red-700 sm:text-2xl">{rupiah(expense)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Wallet className="size-4" /> Selisih</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-xl font-bold sm:text-2xl ${income - expense >= 0 ? "" : "text-red-700"}`}>{rupiah(income - expense)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tren 6 Bulan</CardTitle></CardHeader>
        <CardContent><TrendChart data={chartData} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Budget Bulan Ini</CardTitle></CardHeader>
        <CardContent>
          {budgetRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada budget. <Link href="/pengaturan" className="underline underline-offset-2">Atur di Pengaturan</Link>.
            </p>
          ) : (
            <div className="space-y-4">
              {budgetRows.map((b) => (
                <div key={b.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{b.category.name}</span>
                    <span className={`whitespace-nowrap text-xs ${b.pct >= 100 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                      {rupiah(b.spent)} / {rupiah(Number(b.limitAmount))}
                    </span>
                  </div>
                  <Progress value={Math.min(b.pct, 100)} className={`h-2 ${b.pct >= 100 ? "[&>div]:bg-destructive" : b.pct >= 80 ? "[&>div]:bg-amber-500" : ""}`} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          <Link href="/transaksi" className="text-sm text-muted-foreground hover:text-foreground">Lihat semua →</Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{t.category.name}{t.note ? ` — ${t.note}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{tanggal(t.date)}</span>
                  </span>
                  <span className={`whitespace-nowrap font-medium ${t.type === "income" ? "text-emerald-700" : "text-red-700"}`}>
                    {t.type === "income" ? "+" : "−"} {rupiah(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
