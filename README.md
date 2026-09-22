# ArusKas

Aplikasi pencatatan keuangan pribadi multi-user (invite-only). Next.js 16 (App Router, Server Actions) + Prisma 7 + PostgreSQL. Semua teks UI Bahasa Indonesia. Aplikasi ini dirancang untuk dijalankan lokal/self-host; tidak ada layanan pihak ketiga.

Fitur inti: dashboard arus kas, transaksi (income/expense, tanggal UTC date-only), kategori & budget bulanan per user, admin invite + reset password via tautan (tanpa pengiriman email otomatis), rate-limit login, sesi cookie httpOnly.

## Persyaratan

- Node.js >= 24
- PostgreSQL lokal (default `localhost:5432`), database `db_aruskas`
- npm

## Setup pertama kali

```bash
cp .env.example .env          # lalu isi nilai rahasia (lihat tabel di bawah)
npm install
npm run migrate-local         # buat skema 8 tabel di localhost:5432/db_aruskas (aman, hanya DB lokal)
npm run build
npm start                     # produksi, bind 127.0.0.1:3000
```

Variabel `.env`:

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | `postgresql://user:pass@localhost:5432/db_aruskas?schema=public` |
| `AUTH_SECRET` | tidak | Disiapkan `.env.example`; saat ini belum dipakai kode (token pakai random 256-bit + hash DB) |
| `APP_URL` | ya | Origin aplikasi, mis. `http://127.0.0.1:3000`. Dipakai CSRF check + pembuatan tautan |
| `LOCAL_BOOTSTRAP_USERNAME` | ya | Username admin pertama (3-30 karakter, a-z 0-9 `.` `_` `-`); hanya aktif saat `APP_URL` localhost |
| `PORT` | tidak | Default 3000 |

`node --env-file=.env` dipakai semua script; jangan jalankan `next` langsung tanpa env.

### Membuat admin pertama

Dua cara (pilih salah satu):

1. **Via UI (disarankan):** buka `http://127.0.0.1:3000/setup` — halaman hanya muncul selama belum ada admin dan `APP_URL` localhost. Buat password admin untuk `LOCAL_BOOTSTRAP_USERNAME`. Halaman menutup otomatis setelah admin dibuat.
2. **Via terminal interaktif:** `npm run bootstrap` — prompt username/nama/password (input disembunyikan). Menolak jalan bila admin sudah ada atau bukan TTY.

Setelah admin ada, user lain hanya bisa masuk lewat undangan admin. Kategori template (Gaji, Freelance, dst.) otomatis disalin ke tiap akun baru.

## Login & operasional harian

- Login: `/login`. Password minimal 8 karakter. Salah 5x dalam 15 menit -> akun terkunci 15 menit (tabel `LoginAttempt`).
- Keluar: tombol Keluar (navbar desktop / tab bar mobile). `/akun` juga punya "Keluar dari semua perangkat".
- Ganti password sendiri: `/akun` -> semua sesi dicabut setelah sukses.

### Admin: undang user

1. Login admin -> `/akun` -> "Kelola akun dan undangan" (`/admin`, hanya role admin; user lain diarahkan ke `/akun`).
2. Isi username -> "Buat undangan". Tautan registrasi muncul sekali di layar (tidak dikirim otomatis — salin dan kirim secara pribadi, mis. chat aman).
3. Tautan berlaku 24 jam, sekali pakai. Bisa dibatalkan dari daftar "Undangan aktif" -> "Batalkan undangan".
4. User membuka tautan -> `/register?token=...` -> isi nama + password -> langsung login.

### Admin: reset password user

`/admin` -> kartu user -> "Buat tautan reset password". Tautan berlaku 1 jam, sekali pakai; tautan lama otomatis hangus. User membuka `/reset?token=...` -> password baru -> semua sesi user dicabut. Kirim tautan secara pribadi; tidak ada email otomatis.

### Admin: kelola user

- "Cabut semua sesi" — paksa logout user.
- "Nonaktifkan akun" — blok login & cabut sesi (data tetap utuh). "Aktifkan akun" memulihkan.
- Akun admin tidak bisa dinonaktifkan lewat UI.

## Backup

```bash
npm run backup
```

- Hanya mau jalan untuk `localhost/db_aruskas` (guard keras di skrip).
- Dump konsisten (REPEATABLE READ read-only snapshot) semua tabel -> `backups/pre-multiuser-<epoch>.json` (mode 0600).
- Output: path file + SHA-256 + jumlah baris per tabel. Simpan SHA-256 untuk verifikasi restore.

Restore manual: file adalah JSON per-tabel (`{"users":[...],"transactions":[...]}`); impor dengan `psql`/skrip ke DB lokal baru. Uji restore setidaknya sekali sebelum benar-benar mengandalkan backup.

## Pengujian

```bash
npm run typecheck          # tsc --noEmit
npm run lint
npm test                   # unit: accounts/security/finance/validation (node:test)
npm run test:e2e           # browser headless (Edge) + DB; butuh server jalan di APP_URL
node --env-file=.env tests/e2e-multiuser.mjs   # alur multi-user penuh (invite->register->reset->user mgmt)
```

E2E butuh Playwright di `PLAYWRIGHT_PATH` (default `D:/code/personal/toratech-docs/node_modules/playwright`, channel `msedge`). Semua test hanya jalan melawan `127.0.0.1` + `db_aruskas` dan membersihkan record buatannya sendiri (berdasarkan username acak/ID).

## Keamanan & audit dependensi

Status `npm audit` (termasuk `--omit=dev`): **0 vulnerabilities**.

Riwayat: audit pernah melaporkan 4 high — `prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`. Fix via `overrides` di `package.json`:

```json
"overrides": { "deepmerge-ts": "^8.0.2", "mysql2": "^3.24.4" }
```

- `mysql2` — transitive dari `@prisma/config`; app pakai `@prisma/adapter-pg` (`pg`), `mysql2` tidak pernah dipakai saat runtime app.
- `deepmerge-ts` — transitive dari `@prisma/config`; hanya jalan saat CLI Prisma (migrate/generate), bukan di runtime app.
- `prisma`/`@prisma/config` — advisori terselesaikan oleh bump transitive di atas pada versi 7.10.0.

Risiko residual: `overrides` memaksa versi di luar rentang yang dideklarasikan `@prisma/config`; jika suatu saat `npm ls deepmerge-ts mysql2` menunjukkan versi lain atau Prisma error saat migrate/generate, hapus override terkait dan naikkan `prisma` ke versi yang membawa dependensi patched. Jalankan `npm audit` setiap `npm install`.

## Deploy produksi (checklist)

Aplikasi ini dibangun untuk akses pribadi/lokal. Jika dipublikasikan ke jaringan:

1. `APP_URL` = origin publik (https). Cookie otomatis `secure` saat https; `checkOrigin` menolak cross-origin.
2. Isi `AUTH_SECRET` baru (random >= 16 char) bila memakainya untuk derivasi token di masa depan; token saat ini acak 256-bit tersimpan sebagai hash di DB.
3. `LOCAL_BOOTSTRAP_USERNAME` — `/setup` otomatis nonaktif bila `APP_URL` bukan localhost; bootstrap admin harus dilakukan sebelum expose, atau via `npm run bootstrap` di server (TTY).
4. PostgreSQL: buat user DB terpisah, minimal privilege; jangan expose port DB.
5. `npm ci && npm run migrate-local` (atau SQL `prisma/multiuser.sql`) lalu `npm run build && npm start` di belakang reverse proxy TLS.
6. Jadwalkan `npm run backup` (cron) + simpan salinan off-site; catat SHA-256.
7. `npm audit` bersih sebelum rilis.
8. Jangan commit `.env`; `.gitignore` sudah mengecualikan.

## Struktur singkat

- `src/app` — halaman App Router; `(app)` grup terproteksi (login required), `/admin` admin-only.
- `src/lib` — `accounts.ts` (invite/reset/sesi/throttle), `auth.ts` (guard+cookie), `security.ts` (hash/token), `finance.ts`, `validation.ts`.
- `prisma/schema.prisma` — 8 model: User, Session, Invite, PasswordReset, LoginAttempt, Category, Transaction, Budget.
- `scripts/` — `migrate-local.mjs`, `bootstrap.mjs`, `backup.mjs`, `configure-local.mjs` (semua guard localhost).
