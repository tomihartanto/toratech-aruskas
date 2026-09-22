"use client";

import { useActionState, useState } from "react";
import { LogoMark } from "@/components/logo";
import PasswordInput from "@/components/password-input";
import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  // Nilai di-controlled supaya React 19 auto-reset form tidak menghapus
  // username/password saat login gagal.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="w-full max-w-xs space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 w-14">
          <LogoMark className="size-14" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">ArusKas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Monitoring pendapatan & pengeluaran</p>
      </div>
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">Akun hanya melalui undangan admin. Lupa password? Hubungi admin untuk tautan reset.</p>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
