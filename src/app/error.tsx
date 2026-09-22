"use client";
import { Button } from '@/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="mx-auto max-w-md space-y-4 p-8"><h1 className="text-xl font-bold">Halaman belum dapat dimuat</h1><p>Periksa koneksi lalu coba lagi. Jika masalah berlanjut, hubungi admin.</p><Button onClick={reset}>Coba lagi</Button></main>;}
