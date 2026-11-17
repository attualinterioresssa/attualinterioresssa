"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const SEM = "(sem campanha)";
const vazio = { data: new Date().toLocaleDateString("sv-SE"), plataforma: "meta", campanha: "", grupo_anuncios: "", anuncio: "", palavra_chave: "", investimento: "" };
const INTEGRACOES = ["Google Ads", "Google Analytics 4", "Google Tag Manager", "Meta Pixel", "Meta Conversions API"];

function num(s: string) {
  let t = (s ?? "").replace(/[R$\s]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t); return Number.isFinite(n) ? n : NaN;
}
function dataIso(s: string) {
  const m = (s ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (s ?? "").trim();
}

export default function Campanhas() {
  return <AuthGate><Painel /></AuthGate>;
}

function Painel() {
  const [lanc, setLanc] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [qs, setQs] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [f, setF] = useState({ ...vazio });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      sb.from("campaigns").select("*").order("data", { ascending: false }).limit(2000),
      sb.from("leads").select("id,campanha,origem").limit(5000),
      sb.from("quotations").select("lead_id,status"),
      sb.from("sales").select("lead_id,valor"),
    ]);
    const err = [a, b, c, d].find((r) => r.error);
    if (err?.error) setMsg(err.error.message);
    setLanc(a.data ?? []); setLeads(b.data ?? []); setQs(c.data ?? []); setSales(d.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const linhas = useMemo(() => {
    const mp: Record<string, any> = {};
    const g = (nome: string, plat?: string) => (mp[nome.toLowerCase()] ??= { nome, plat: plat ?? "", inv: 0, leads: 0, orc: 0, vendas: 0, fat: 0 });
    lanc.forEach((x) => { const r = g(x.campanha, x.plataforma); r.inv += Number(x.investimento); });
    const leadCamp: Record<string, string> = {};
    leads.forEach((l) => { const n = l.campanha || (l.origem ? `${l.origem} (sem campanha)` : SEM); leadCamp[l.id] = n.toLowerCase(); g(n).leads += 1; });
    qs.filter((q) => q.status !== "elaboracao").forEach((q) => { const r = mp[leadCamp[q.lead_id]]; if (r) r.orc += 1; });
    sales.forEach((s) => { const r = mp[leadCamp[s.lead_id]]; if (r) { r.vendas += 1; r.fat += Number(s.valor); } });
    return Object.values(mp).sort((a: any, b: any) => b.inv - a.inv || b.leads - a.leads);
  }, [lanc, leads, qs, sales]);

  async function salvar() {
    const inv = num(f.investimento);
    if (!f.campanha.trim() || Number.isNaN(inv)) { setMsg("Informe a campanha e o investimento."); return; }
    const { error } = await sb.from("campaigns").insert({ data: f.data, plataforma: f.plataforma, campanha: f.campanha.trim(), grupo_anuncios: f.grupo_anuncios || null, anuncio: f.anuncio || null, palavra_chave: f.palavra_chave || null, investimento: inv });
    if (error) setMsg(error.message); else { setMsg("Lançamento salvo."); setF({ ...vazio }); load(); }
  }
  async function remover(id: string) { await sb.from("campaigns").delete().eq("id", id); load(); }

  async function importar(file: File | null) {
    if (!file) return;
    const txt = (await file.text()).replace(/^\ufeff/, "");
    const rows = txt.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) { setMsg("Arquivo vazio."); return; }
    const sep = rows[0].includes(";") ? ";" : ",";
    const head = rows[0].split(sep).map((h) => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_"));
    const col = (cells: string[], ...nomes: string[]) => { for (const n of nomes) { const i = head.indexOf(n); if (i >= 0) return (cells[i] ?? "").trim().replace(/^"|"$/g, ""); } return ""; };
    const out: any[] = []; let ruins = 0;
    rows.slice(1).forEach((r) => {
      const c = r.split(sep);
      const inv = num(col(c, "investimento", "custo", "valor_gasto"));
      const camp = col(c, "campanha", "nome_da_campanha"); const d = dataIso(col(c, "data", "dia"));
      if (!camp || Number.isNaN(inv) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) { ruins++; return; }
      const pl = col(c, "plataforma").toLowerCase();
      out.push({ data: d, plataforma: ["google", "meta"].includes(pl) ? pl : "outro", campanha: camp, grupo_anuncios: col(c, "grupo", "grupo_de_anuncios") || null, anuncio: col(c, "anuncio") || null, palavra_chave: col(c, "palavra_chave") || null, investimento: inv, impressoes: parseInt(col(c, "impressoes")) || null, cliques: parseInt(col(c, "cliques")) || null });
    });
    if (!out.length) { setMsg(`Nenhuma linha válida (${ruins} ignoradas). Confira o cabeçalho: data, plataforma, campanha, investimento.`); return; }
    const { error } = await sb.from("campaigns").insert(out);
    setMsg(error ? error.message : `${out.length} linhas importadas${ruins ? `, ${ruins} ignoradas` : ""}.`); load();
  }

  const tot = linhas.reduce((t: any, r: any) => ({ inv: t.inv + r.inv, leads: t.leads + r.leads, fat: t.fat + r.fat }), { inv: 0, leads: 0, fat: 0 });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <h2>Campanhas</h2>
      {msg && <p className="note">{msg}</p>}
      <h3>Integrações</h3>
      <div className="svc">{INTEGRACOES.map((i) => <span key={i} style={{ padding: "14px 18px", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>{i}<br /><span className="badge">pendente</span></span>)}</div>
      <p className="note">Nenhuma conexão foi simulada. Cada integração depende de credenciais da conta de anúncios e, para pixels, de aviso de cookies. Até lá, use os lançamentos manuais ou a importação de relatório abaixo.</p>

      <h3>Análise por campanha</h3>
      <p className="note">Os leads entram pela campanha registrada no link do anúncio (utm_campaign). O nome do lançamento precisa ser igual ao da campanha no link.</p>
      <div style={{ overflowX: "auto" }}>
        <table className="tab"><thead><tr><th>Campanha</th><th>Investimento</th><th>Leads</th><th>Orçamentos</th><th>Vendas</th><th>Faturamento</th><th>Custo/lead</th><th>Retorno</th></tr></thead>
          <tbody>
            {linhas.map((r: any) => (
              <tr key={r.nome}><td>{r.nome}</td><td>{brl(r.inv)}</td><td>{r.leads}</td><td>{r.orc}</td><td>{r.vendas}</td><td>{brl(r.fat)}</td>
                <td>{r.inv && r.leads ? brl(r.inv / r.leads) : "—"}</td><td>{r.inv ? `${(r.fat / r.inv).toFixed(2).replace(".", ",")}x` : "—"}</td></tr>
            ))}
            <tr><td><b>Total</b></td><td><b>{brl(tot.inv)}</b></td><td><b>{tot.leads}</b></td><td /><td /><td><b>{brl(tot.fat)}</b></td><td /><td /></tr>
          </tbody></table>
      </div>

      <h3>Novo lançamento de investimento</h3>
      <div className="two">
        <div>
          <div className="linha"><input type="date" value={f.data} onChange={set("data")} aria-label="Data" />
            <select value={f.plataforma} onChange={set("plataforma")}><option value="meta">Meta Ads</option><option value="google">Google Ads</option><option value="outro">Outro</option></select></div>
          <input placeholder="Campanha (igual ao utm_campaign)" value={f.campanha} onChange={set("campanha")} />
          <div className="linha"><input placeholder="Grupo de anúncios" value={f.grupo_anuncios} onChange={set("grupo_anuncios")} /><input placeholder="Anúncio" value={f.anuncio} onChange={set("anuncio")} /></div>
          <div className="linha"><input placeholder="Palavra-chave" value={f.palavra_chave} onChange={set("palavra_chave")} /><input placeholder="Investimento (R$)" value={f.investimento} onChange={set("investimento")} inputMode="decimal" /></div>
          <button className="btn small" onClick={salvar}>Salvar lançamento</button>
        </div>
        <div>
          <b>Importar relatório (CSV)</b>
          <p className="note">Colunas: data (dd/mm/aaaa), plataforma, campanha, grupo, anuncio, palavra_chave, investimento, impressoes, cliques. Aceita vírgula ou ponto e vírgula. Só data, campanha e investimento são obrigatórios.</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => { importar(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </div>
      </div>

      <h3>Últimos lançamentos</h3>
      {lanc.slice(0, 15).map((x) => (
        <div key={x.id} className="linha"><span className="note" style={{ flex: 1 }}>{new Date(x.data + "T00:00").toLocaleDateString("pt-BR")} · {x.plataforma} · {x.campanha} · {brl(Number(x.investimento))}</span>
          <button className="btn ghost small" onClick={() => remover(x.id)} aria-label="Remover lançamento">Remover</button></div>
      ))}
    </>
  );
}
