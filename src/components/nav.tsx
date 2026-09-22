"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings, LogOut, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { logout } from "@/app/actions";

const links = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi", Icon: Receipt },
  { href: "/pengaturan", label: "Pengaturan", Icon: Settings },
  { href: "/akun", label: "Akun", Icon: UserRound },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: top bar */}
      <header className="hidden border-b bg-background md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
            <nav className="flex gap-1">
              {links.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    pathname === href ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logout}>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive">
              <LogOut className="size-4" />
              Keluar
            </button>
          </form>
        </div>
      </header>

      {/* Mobile: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background md:hidden">
        <div className="mx-auto flex max-w-lg">
          {links.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                pathname === href ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
          <form action={logout} className="flex flex-1"><button className="flex w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px]"><LogOut className="size-5"/>Keluar</button></form>
        </div>
      </nav>
    </>
  );
}
