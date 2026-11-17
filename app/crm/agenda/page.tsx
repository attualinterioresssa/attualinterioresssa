"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { preencher } from "@/lib/mensagens";
import { zap } from "@/lib/opcoes";

const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const STATUS = ["agendada", "confirmada", "realizada", "remarcada", "cancelada"];

export default function Agenda() {
  return <AuthGate><Painel /></AuthGate>;
}

function Painel() {
  const [fu, setFu] = useState<any[]>([]);
  const [ap, setAp] = useState<any[]>([]);
  const [corpo, setCorpo] = useState("");
  const [eu, setEu] = useState("");
  const [meId, setMeId] = useState("");
  const [erro, setErro] = useState("");
  const hoje = new Date().toLocaleDateString("sv-SE");

  const load = useCallback(async () => {
    const sel = "id,etapa,customers(nome,telefone),services(nome)";
    const [a, b, c, d] = await Promise.all([
      sb.from("followups").select(`*,leads(${sel})`).eq("status", "pendente").order("vencimento"),
      sb.from("appointments").select(`*,leads(${sel})`).in("status", ["agendada", "confirmada", "remarcada"]).order("data_hora"),
      sb.from("message_templates").select("corpo").eq("slug", "followup").maybeSingle(),
      sb.auth.getUser(),
    ]);
    if (a.error || b.error) setErro((a.error ?? b.error)!.message);
    setFu(a.data ?? []); setAp(b.data ?? []); setCorpo(c.data?.corpo ?? "");
    const uid = d.data.user?.id;
    if (uid) {
      setMeId(uid);
      const p = await sb.from("profiles").select("nome").eq("id", uid).maybeSingle();
      setEu(p.data?.nome?.split(" ")[0] ?? "");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function abrirFu(f: any) {
    const l = f.leads;
    const texto = preencher(corpo, { nome: (l?.customers?.nome ?? "").split(" ")[0], servico: l?.services?.nome, responsavel: eu });
    window.open(`https://wa.me/${zap(l.customers.telefone)}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    await Promise.all([
      sb.from("conversations").insert({ lead_id: l.id, user_id: meId || null, template_slug: "followup", mensagem: texto }),
      sb.from("activities").insert({ lead_id: l.id, user_id: meId || null, tipo: "whatsapp", descricao: `Follow-up dia ${f.dia}: WhatsApp aberto (${texto})` }),
    ]);
  }
  async function fechar(f: any, status: "feito" | "cancelado") {
    await sb.from("followups").update({ status, feito_em: new Date().toISOString() }).eq("id", f.id);
    await sb.from("activities").insert({ lead_id: f.lead_id, user_id: meId || null, tipo: "followup", descricao: `Follow-up dia ${f.dia} ${status === "feito" ? "concluído" : "dispensado"}: ${f.descricao}` });
    load();
  }
  async function statusVisita(v: any, status: string) {
    await sb.from("appointments").update({ status }).eq("id", v.id);
    if (status === "realizada" && v.leads?.etapa === "visita_agendada")
      await sb.from("leads").update({ etapa: "visita_realizada" }).eq("id", v.lead_id);
    load();
  }

  return (
    <>
      <h2>Agenda</h2>
      {erro && <p className="err">{erro}</p>}
      <div className="two">
        <div>
          <h3>Follow-ups pendentes ({fu.length})</h3>
          {fu.length === 0 && <p className="note">Nenhum follow-up pendente. Eles são criados quando um lead vai para “Orçamento enviado”.</p>}
          {fu.map((f) => (
            <div key={f.id} className="card" style={{ cursor: "default" }}>
              <Link href={`/crm/${f.lead_id}`}><b>{f.leads?.customers?.nome}</b></Link>
              <div className="note">Dia {f.dia}: {f.descricao}</div>
              <div className="note">
                {f.vencimento < hoje ? <span className="badge quente">atrasado</span> : f.vencimento === hoje ? <span className="badge morno">hoje</span> : null}{" "}
                {new Date(f.vencimento + "T00:00").toLocaleDateString("pt-BR")}
              </div>
              <div className="linha">
                <button className="btn small" onClick={() => abrirFu(f)}>WhatsApp</button>
                <button className="btn ghost small" onClick={() => fechar(f, "feito")}>Concluir</button>
                <button className="btn ghost small" onClick={() => fechar(f, "cancelado")}>Pular</button>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3>Visitas ({ap.length})</h3>
          {ap.length === 0 && <p className="note">Nenhuma visita marcada. Agende pela ficha do cliente.</p>}
          {ap.map((v) => (
            <div key={v.id} className="card" style={{ cursor: "default" }}>
              <Link href={`/crm/${v.lead_id}`}><b>{v.leads?.customers?.nome}</b></Link>
              <div className="note">{fmt(v.data_hora)}{v.servico ? ` · ${v.servico}` : ""}</div>
              {v.endereco && <div className="note">{v.endereco}</div>}
              {v.observacoes && <div className="note">{v.observacoes}</div>}
              <select value={v.status} onChange={(e) => statusVisita(v, e.target.value)} aria-label="Status da visita">
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
