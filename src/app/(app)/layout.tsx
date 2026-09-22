import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import Nav from "@/components/nav";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <div className="min-h-svh bg-muted/30">
      <Nav />
      {/* pb-20: ruang untuk bottom tab bar mobile */}
      <a href="#main" className="sr-only focus:not-sr-only focus:block focus:p-3">Lewati ke konten</a>
      <main id="main" className="mx-auto max-w-5xl p-4 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
