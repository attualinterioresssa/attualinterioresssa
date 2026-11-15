"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { ETAPAS } from "@/lib/etapas";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Crm() {
  return <AuthGate><Funil /></AuthGate>;
}

function Funil() {
  const [leads, setLeads] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const [f, setF] = useState({ q: "", serv: "", cls: "", orig: "" });

  useEffect(() => {
    sb.from("leads")
      .select("id,etapa,classificacao,pontuacao,valor,origem,created_at,customers(nome,bairro),services(nome)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => { if (error) setErro(error.message); else setLeads(data ?? []); });
  }, []);

  const servs = Array.from(new Set(leads.map((l) => l.services?.nome).filter(Boolean)));
  const origs = Array.from(new Set(leads.map((l) => l.origem).filter(Boolean)));
  const vis = useMemo(() => leads.filter((l) =>
    (!f.q || (l.customers?.nome ?? "").toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.serv || l.services?.nome === f.serv) &&
    (!f.cls || l.classificacao === f.cls) &&
    (!f.orig || l.origem === f.orig)), [leads, f]);

  async function mover(id: string, etapa: string) {
    setLeads((p) => p.map((l) => (l.id === id ? { ...l, etapa } : l)));
    const { error } = await sb.from("leads").update({ etapa }).eq("id", id);
    if (error) setErro(error.message);
  }

  return (
    <>
      <div className="filtros">
        <input placeholder="Buscar por nome" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select value={f.serv} onChange={(e) => setF({ ...f, serv: e.target.value })}><option value="">Todos os serviços</option>{servs.map((s: any) => <option key={s}>{s}</option>)}</select>
        <select value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })}><option value="">Toda classificação</option><option value="quente">Quente</option><option value="morno">Morno</option><option value="frio">Frio</option></select>
        <select value={f.orig} onChange={(e) => setF({ ...f, orig: e.target.value })}><option value="">Toda origem</option>{origs.map((s: any) => <option key={s}>{s}</option>)}</select>
      </div>
      {erro && <p className="err">{erro}</p>}
      <p className="note">{vis.length} lead(s). Arraste os cartões ou use “Mover para”.</p>
      <div className="board">
        {ETAPAS.map(([slug, nome]) => {
          const col = vis.filter((l) => l.etapa === slug);
          return (
            <div key={slug} className="col" onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) mover(id, slug); }}>
              <h4>{nome} <span>{col.length}</span></h4>
              {col.map((l) => (
                <div key={l.id} className="card" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", l.id)}>
                  <Link href={`/crm/${l.id}`}><b>{l.customers?.nome}</b></Link>
                  <div className="note">{l.services?.nome}{l.customers?.bairro ? ` · ${l.customers.bairro}` : ""}</div>
                  <div><span className={`badge ${l.classificacao}`}>{l.classificacao}</span>{l.valor ? <span className="note"> {brl(Number(l.valor))}</span> : null}</div>
                  <select value={slug} onChange={(e) => mover(l.id, e.target.value)} aria-label="Mover para">
                    {ETAPAS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
