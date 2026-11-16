"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";

export default function Login() {
  const r = useRouter();
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErro("");
    const { error } = await sb.auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("senha")) });
    setBusy(false);
    if (error) setErro("E-mail ou senha incorretos.");
    else r.push("/crm");
  }
  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h2>Acesso da equipe</h2>
      <form className="lg" onSubmit={entrar}>
        <div className="f"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
        <div className="f"><label htmlFor="senha">Senha</label><input id="senha" name="senha" type="password" autoComplete="current-password" required /></div>
        {erro && <span className="err">{erro}</span>}
        <div><button className="btn" type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button></div>
      </form>
    </div>
  );
}
