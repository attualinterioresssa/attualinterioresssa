"use client";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";

export default function Mensagens() {
  return <AuthGate><Modelos /></AuthGate>;
}

function Modelos() {
  const [lista, setLista] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    sb.from("message_templates").select("*").order("ordem").then(({ data, error }) => {
      if (error) setMsg(error.message); else setLista(data ?? []);
    });
  }, []);

  async function salvar(t: any) {
    const { error } = await sb.from("message_templates")
      .update({ corpo: t.corpo, updated_at: new Date().toISOString() }).eq("id", t.id);
    setMsg(error ? error.message : `“${t.titulo}” salvo.`);
  }

  return (
    <>
      <h2>Mensagens rápidas</h2>
      <p className="note">Use {"{nome}"}, {"{servico}"} e {"{responsavel}"} no texto. Eles são trocados pelos dados do cliente na hora do envio.</p>
      {msg && <p className="note">{msg}</p>}
      {lista.map((t, i) => (
        <div key={t.id} style={{ marginBottom: 22 }}>
          <h3>{t.titulo}</h3>
          <textarea rows={4} value={t.corpo}
            onChange={(e) => setLista(lista.map((x, j) => (j === i ? { ...x, corpo: e.target.value } : x)))} />
          <button className="btn small" onClick={() => salvar(t)}>Salvar</button>
        </div>
      ))}
    </>
  );
}
