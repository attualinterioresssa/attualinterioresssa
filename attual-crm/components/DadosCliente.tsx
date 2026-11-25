"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";

export default function DadosCliente({ c, onChange }: { c: any; onChange: () => void }) {
  const r = useRouter();
  const [ed, setEd] = useState(false);
  const [f, setF] = useState({ nome: c.nome ?? "", telefone: c.telefone ?? "", cidade: c.cidade ?? "", bairro: c.bairro ?? "" });
  const [msg, setMsg] = useState("");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function salvar() {
    const tel = f.telefone.replace(/\D/g, "");
    if (f.nome.trim().length < 3 || tel.length < 10) { setMsg("Confira o nome e o telefone."); return; }
    const { error } = await sb.from("customers").update({ nome: f.nome.trim(), telefone: tel, cidade: f.cidade.trim(), bairro: f.bairro.trim() }).eq("id", c.id);
    if (error) { setMsg(error.message); return; }
    setMsg(""); setEd(false); onChange();
  }
  async function excluir() {
    if (!window.confirm("Excluir TODOS os dados deste cliente (cadastro, leads, orçamentos, histórico e PDFs)? Esta ação não pode ser desfeita.")) return;
    const { data: ls } = await sb.from("leads").select("id").eq("customer_id", c.id);
    for (const l of ls ?? []) {
      const { data: arqs } = await sb.storage.from("orcamentos").list(l.id);
      if (arqs?.length) await sb.storage.from("orcamentos").remove(arqs.map((a) => `${l.id}/${a.name}`));
    }
    const res = await sb.rpc("excluir_cliente", { p_customer: c.id });
    if (res.error) setMsg(res.error.message === "somente_administrador" ? "Só o administrador pode excluir dados." : res.error.message);
    else r.push("/crm");
  }

  return (
    <>
      <h3>Dados do cliente (LGPD)</h3>
      {msg && <p className="err">{msg}</p>}
      {!ed ? (
        <div className="linha"><button className="btn ghost small" onClick={() => setEd(true)}>Corrigir dados</button><button className="btn ghost small" onClick={excluir}>Excluir dados do cliente</button></div>
      ) : (
        <div className="card" style={{ cursor: "default" }}>
          <input value={f.nome} onChange={set("nome")} placeholder="Nome" />
          <input value={f.telefone} onChange={set("telefone")} placeholder="Telefone" inputMode="tel" />
          <div className="linha"><input value={f.cidade} onChange={set("cidade")} placeholder="Cidade" /><input value={f.bairro} onChange={set("bairro")} placeholder="Bairro" /></div>
          <div className="linha"><button className="btn small" onClick={salvar}>Salvar</button><button className="btn ghost small" onClick={() => setEd(false)}>Cancelar</button></div>
        </div>
      )}
    </>
  );
}
