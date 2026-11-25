"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const PROD = ["a_produzir", "em_producao", "pronto", "instalacao", "entregue"];
const ROT: Record<string, string> = { a_produzir: "A produzir", em_producao: "Em produção", pronto: "Pronto", instalacao: "Instalação", entregue: "Entregue" };
const vazio = { ambiente: "", descricao: "", materiais: "", acabamentos: "", valor: "", pagamento: "", prazo: "", validade: "" };

export default function Orcamentos({ leadId, onChange }: { leadId: string; onChange: () => void }) {
  const [qs, setQs] = useState<any[]>([]);
  const [ords, setOrds] = useState<any[]>([]);
  const [f, setF] = useState({ ...vazio });
  const [rev, setRev] = useState<string | null>(null);
  const [arq, setArq] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [aberto, setAberto] = useState(false);
  const [hist, setHist] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.from("quotations").select("*,quotation_versions(*)").eq("lead_id", leadId).order("created_at", { ascending: false }),
      sb.from("production_orders").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
    ]);
    if (a.error) setMsg(a.error.message);
    setQs((a.data ?? []).map((q: any) => ({ ...q, quotation_versions: (q.quotation_versions ?? []).sort((x: any, y: any) => y.versao - x.versao) })));
    setOrds(b.data ?? []);
  }, [leadId]);
  useEffect(() => { load(); }, [load]);

  function novo() { setF({ ...vazio }); setRev(null); setArq(null); setAberto(true); }
  function revisar(q: any) {
    const v = q.quotation_versions[0];
    setF({ ambiente: q.ambiente, descricao: v.descricao ?? "", materiais: v.materiais ?? "", acabamentos: v.acabamentos ?? "", valor: String(v.valor_total), pagamento: v.forma_pagamento ?? "", prazo: v.prazo ?? "", validade: v.validade ?? "" });
    setRev(q.id); setArq(null); setAberto(true);
  }

  async function salvar() {
    if (!f.ambiente.trim() || !f.valor) { setMsg("Informe o ambiente e o valor total."); return; }
    setBusy(true); setMsg("");
    try {
      const u = (await sb.auth.getUser()).data.user?.id;
      let qid = rev; let versao = 1;
      if (qid) versao = (qs.find((q) => q.id === qid)?.quotation_versions[0]?.versao ?? 0) + 1;
      else {
        const r = await sb.from("quotations").insert({ lead_id: leadId, ambiente: f.ambiente.trim(), created_by: u }).select("id").single();
        if (r.error) throw r.error;
        qid = r.data.id;
      }
      let pdf: string | null = null;
      if (arq) {
        const nome = `${leadId}/${qid}-v${versao}.pdf`;
        const up = await sb.storage.from("orcamentos").upload(nome, arq, { contentType: "application/pdf", upsert: false });
        if (up.error) throw up.error;
        pdf = nome;
      }
      const ins = await sb.from("quotation_versions").insert({
        quotation_id: qid, versao, descricao: f.descricao || null, materiais: f.materiais || null, acabamentos: f.acabamentos || null,
        valor_total: Number(f.valor), forma_pagamento: f.pagamento || null, prazo: f.prazo || null, validade: f.validade || null, pdf_path: pdf, created_by: u,
      });
      if (ins.error) throw ins.error;
      await sb.from("activities").insert({ lead_id: leadId, user_id: u, tipo: "orcamento", descricao: `Orçamento ${rev ? "revisado (versão " + versao + ")" : "criado"}: ${f.ambiente} · ${brl(Number(f.valor))}` });
      setAberto(false); load(); onChange();
    } catch (e: any) { setMsg(e.message ?? "Erro ao salvar."); } finally { setBusy(false); }
  }
  async function rpc(nome: string, args: any) {
    const r = await sb.rpc(nome, args);
    if (r.error) setMsg(r.error.message); else { setMsg(""); load(); onChange(); }
  }
  async function recusar(q: any) { await sb.from("quotations").update({ status: "recusado" }).eq("id", q.id); load(); }
  async function abrirPdf(p: string) {
    const r = await sb.storage.from("orcamentos").createSignedUrl(p, 120);
    if (r.data?.signedUrl) window.open(r.data.signedUrl, "_blank", "noopener,noreferrer"); else setMsg(r.error?.message ?? "Não foi possível abrir o PDF.");
  }
  async function prazoEntrega(o: any, d: string) { await sb.from("production_orders").update({ prazo_entrega: d || null }).eq("id", o.id); load(); }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h3>Orçamentos</h3>
      {msg && <p className="err">{msg}</p>}
      {qs.map((q) => {
        const v = q.quotation_versions[0];
        return (
          <div key={q.id} className="card" style={{ cursor: "default", marginBottom: 10 }}>
            <div><b>{q.ambiente}</b> <span className="badge">{q.status}</span></div>
            {v && <div className="note">{brl(v.valor_total)} · versão {v.versao}{v.validade ? ` · válido até ${new Date(v.validade + "T00:00").toLocaleDateString("pt-BR")}` : ""}<br />{v.forma_pagamento ? `Pagamento: ${v.forma_pagamento}` : ""}{v.prazo ? ` · Prazo: ${v.prazo}` : ""}</div>}
            <div className="linha" style={{ flexWrap: "wrap" }}>
              {v?.pdf_path && <button className="btn ghost small" onClick={() => abrirPdf(v.pdf_path)}>Abrir PDF</button>}
              {q.status !== "aceito" && <button className="btn ghost small" onClick={() => revisar(q)}>Nova revisão</button>}
              {(q.status === "elaboracao" || q.status === "recusado") && <button className="btn small" onClick={() => rpc("marcar_enviado", { p_quotation: q.id })}>Marcar como enviado</button>}
              {(q.status === "enviado" || q.status === "elaboracao") && <button className="btn small" onClick={() => rpc("fechar_venda", { p_quotation: q.id })}>Fechar venda</button>}
              {q.status === "enviado" && <button className="btn ghost small" onClick={() => recusar(q)}>Recusado</button>}
              <button className="btn ghost small" onClick={() => setHist(hist === q.id ? null : q.id)}>Histórico ({q.quotation_versions.length})</button>
            </div>
            {hist === q.id && q.quotation_versions.map((x: any) => (
              <div key={x.id} className="note">v{x.versao} · {new Date(x.created_at).toLocaleDateString("pt-BR")} · {brl(x.valor_total)}{x.pdf_path ? <> · <a href="#" onClick={(e) => { e.preventDefault(); abrirPdf(x.pdf_path); }}>PDF</a></> : null}</div>
            ))}
          </div>
        );
      })}
      {!aberto && <button className="btn small" onClick={novo}>Novo orçamento</button>}
      {aberto && (
        <div className="card" style={{ cursor: "default" }}>
          <b>{rev ? "Nova revisão (a versão anterior fica guardada)" : "Novo orçamento"}</b>
          <input placeholder="Ambiente (ex.: Cozinha)" value={f.ambiente} onChange={set("ambiente")} disabled={!!rev} />
          <textarea rows={2} placeholder="Descrição" value={f.descricao} onChange={set("descricao")} />
          <input placeholder="Materiais" value={f.materiais} onChange={set("materiais")} />
          <input placeholder="Acabamentos" value={f.acabamentos} onChange={set("acabamentos")} />
          <input type="number" min="0" step="0.01" placeholder="Valor total (R$)" value={f.valor} onChange={set("valor")} />
          <input placeholder="Forma de pagamento" value={f.pagamento} onChange={set("pagamento")} />
          <input placeholder="Prazo de entrega (ex.: 45 dias)" value={f.prazo} onChange={set("prazo")} />
          <label className="note">Validade do orçamento <input type="date" value={f.validade} onChange={set("validade")} /></label>
          <label className="note">Arquivo PDF <input type="file" accept="application/pdf" onChange={(e) => setArq(e.target.files?.[0] ?? null)} /></label>
          <div className="linha"><button className="btn small" onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button><button className="btn ghost small" onClick={() => setAberto(false)}>Cancelar</button></div>
        </div>
      )}
      {ords.length > 0 && <h3>Produção</h3>}
      {ords.map((o) => (
        <div key={o.id} className="card" style={{ cursor: "default", marginBottom: 10 }}>
          <select value={o.status} onChange={(e) => rpc("avancar_producao", { p_order: o.id, p_status: e.target.value })} aria-label="Status da produção">
            {PROD.map((s) => <option key={s} value={s}>{ROT[s]}</option>)}
          </select>
          <label className="note">Prazo de entrega <input type="date" value={o.prazo_entrega ?? ""} onChange={(e) => prazoEntrega(o, e.target.value)} /></label>
        </div>
      ))}
    </>
  );
}
