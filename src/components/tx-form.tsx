"use client";

import { useActionState, useState } from "react";
import { saveTx } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Cat = { id: number; name: string; type: string; icon: string };
type Tx = { id: number; type: string; amount: string; categoryId: number; note: string; date: string } | null;

export default function TxForm({ cats, tx }: { cats: Cat[]; tx: Tx }) {
  const [state, action, pending] = useActionState(saveTx, {});
  const [type, setType] = useState(tx?.type ?? "expense");
  const initialDate = tx?.date ?? new Date().toISOString().slice(0, 10);
  const opts = cats.filter((c) => c.type === type);
  const initialCat = tx ? String(tx.categoryId) : String(opts[0]?.id ?? "");

  return (
    <form action={action} className="space-y-5">
      {tx && <input type="hidden" name="id" value={tx.id} />}

      {/* Segmented: Pengeluaran / Pemasukan */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              type === t
                ? t === "income"
                  ? "bg-emerald-700 text-white"
                  : "bg-red-600 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "income" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div>
        <Label htmlFor="tx-amount">Jumlah (Rp)</Label>
        <Input
          id="tx-amount"
          type="number"
          name="amount"
          min={0.01}
          max={9999999999.99}
          step="0.01"
          inputMode="numeric"
          placeholder="0"
          defaultValue={tx ? Number(tx.amount) : ""}
          required
          className="mt-1.5 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tx-cat">Kategori</Label>
          {/* ponytail: native select — server action baca FormData; shadcn Select butuh state sync tambahan */}
          <select
            id="tx-cat"
            name="categoryId"
            key={type}
            defaultValue={initialCat}
            required
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {opts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="tx-date">Tanggal</Label>
          <Input id="tx-date" type="date" name="date" defaultValue={initialDate} required className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label htmlFor="tx-note">Catatan (opsional)</Label>
        <Input id="tx-note" name="note" placeholder="mis. makan siang bareng tim" defaultValue={tx?.note ?? ""} maxLength={200} className="mt-1.5" />
      </div>

      {opts.length === 0 && <p className="text-sm">Belum ada kategori untuk tipe ini. Tambahkan di Pengaturan.</p>}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full py-5 text-base">
        {pending ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  );
}
