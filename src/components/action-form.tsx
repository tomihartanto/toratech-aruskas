"use client";
import { useActionState } from 'react';
import type { State } from '@/app/actions';
import { Button } from '@/components/ui/button';
export default function ActionForm({action,children,label,confirm}:{action:(state:State,data:FormData)=>Promise<State>;children?:React.ReactNode;label:string;confirm?:string}) {
 const [state,submit,pending]=useActionState(action,{});
 return <form action={submit} onSubmit={e=>{if(confirm && !window.confirm(confirm)) e.preventDefault();}} className="space-y-3">
 {children}<Button type="submit" disabled={pending}>{pending?'Memproses…':label}</Button>
 {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
 {state.success && <p role="status" className="text-sm">{state.success}</p>}
 {state.link && <label className="block text-sm">Tautan pribadi — salin sekarang<input readOnly aria-label="Tautan pribadi" value={state.link} onFocus={e=>e.target.select()} className="mt-2 w-full rounded border p-3" /></label>}
 </form>;
}
