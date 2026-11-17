"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { ETAPAS, nomeEtapa } from "@/lib/etapas";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");
const FECHADAS = ["venda_fechada", "producao", "entregue", "pos_venda"];

export default function Painel() {
  return <AuthGate><Dashboard /></AuthGate>;
}

function Dashboard() {
  const [per, setPer] = useState("mes");
  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [qs, setQs] = useState<any[]>([]);
  const [ap, setAp] = useState<any[]>([]);
  const [inv, setInv] = useState<any[]>([]);
  const [erro, setErro] = useState("");

  const load = useCallback(async () => {
    const now = new Date();
    const ini = per === "mes" ? new Date(now.getFullYear(), now.getMonth(), 1)
      : per === "30" ? new Date(now.getTime() - 30 * 864e5)
      : per === "90" ? new Date(now.getTime() - 90 * 864e5) : new Date(2000, 0, 1);
    const iso = ini.toISOString(); const dia = ini.toLocaleDateString("sv-SE");
    const [a, b, c, d, e] = await Promise.all([
      sb.from("leads").select("id,etapa,classificacao,origem,campanha,valor,created_at,customers(nome,telefone),services(nome)").gte("created_at", iso).order("created_at", { ascending: false }).limit(5000),
      sb.from("sales").select("valor,data_venda,lead_id,leads(origem)").gte("data_venda", dia),
      sb.from("quotations").select("status,created_at").gte("created_at", iso),
      sb.from("appointments").select("status,created_at").gte("created_at", iso),
      sb.from("campaigns").select("investimento,data").gte("data", dia),
    ]);
    const err = [a, b, c, d, e].find((r) => r.error);
    setErro(err?.error?.message ?? "");
    setLeads(a.data ?? []); setSales(b.data ?? []); setQs(c.data ?? []); setAp(d.data ?? []); setInv(e.data ?? []);
  }, [per]);
  useEffect(() => { load(); }, [load]);

  const m = useMemo(() => {
    const n = leads.length;
    const fat = sales.reduce((s, x) => s + Number(x.valor), 0);
    const invest = inv.reduce((s, x) => s + Number(x.investimento), 0);
    const orcEnv = qs.filter((q) => q.status !== "elaboracao").length;
    const receitaAds = sales.filter((s) => s.leads?.origem).reduce((t, x) => t + Number(x.valor), 0);
    return {
      n, fat, invest, orcEnv,
      qual: leads.filter((l) => l.classificacao !== "frio").length,
      quentes: leads.filter((l) => l.classificacao === "quente").length,
      visitas: ap.filter((v) => v.status !== "cancelada").length,
      vendas: sales.length,
      perdidas: leads.filter((l) => l.etapa === "perdido").length,
      ticket: sales.length ? fat / sales.length : 0,
      convLeads: pct(leads.filter((l) => FECHADAS.includes(l.etapa)).length, n),
      convOrc: pct(qs.filter((q) => q.status === "aceito").length, orcEnv),
      cpl: n && invest ? brl(invest / n) : "—",
      roas: invest ? `${(receitaAds / invest).toFixed(2).replace(".", ",")}x` : "—",
    };
  }, [leads, sales, qs, ap, inv]);

  const semanas = useMemo(() => {
    const mp: Record<string, number> = {};
    leads.forEach((l) => {
      const d = new Date(l.created_at); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const k = d.toLocaleDateString("sv-SE"); mp[k] = (mp[k] ?? 0) + 1;
    });
    return Object.entries(mp).sort().slice(-10);
  }, [leads]);
  const porEtapa = ETAPAS.map(([s]) => [s, leads.filter((l) => l.etapa === s).length] as [string, number]);
  const maxS = Math.max(1, ...semanas.map((x) => x[1])); const maxE = Math.max(1, ...porEtapa.map((x) => x[1]));

  function csv() {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [["Data", "Nome", "Telefone", "Serviço", "Etapa", "Classificação", "Origem", "Campanha", "Valor"].join(";")];
    leads.forEach((l) => linhas.push([new Date(l.created_at).toLocaleDateString("pt-BR"), l.customers?.nome, l.customers?.telefone, l.services?.nome, nomeEtapa(l.etapa), l.classificacao, l.origem, l.campanha, l.valor].map(esc).join(";")));
    const blob = new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `leads-${new Date().toLocaleDateString("sv-SE")}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  const K = ({ t, v }: { t: string; v: string | number }) => <div className="kpi"><span className="note">{t}</span><b>{v}</b></div>;
  return (
    <>
      <div className="filtros" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <select value={per} onChange={(e) => setPer(e.target.value)} aria-label="Período">
          <option value="mes">Este mês</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="tudo">Todo o período</option>
        </select>
        <button className="btn small" onClick={csv}>Exportar leads em CSV</button>
      </div>
      {erro && <p className="err">{erro}</p>}
      <div className="kpis">
        <K t="Leads" v={m.n} /><K t="Leads qualificados (quentes e mornos)" v={m.qual} /><K t="Leads quentes" v={m.quentes} />
        <K t="Visitas agendadas" v={m.visitas} /><K t="Orçamentos enviados" v={m.orcEnv} /><K t="Vendas fechadas" v={m.vendas} />
        <K t="Vendas perdidas" v={m.perdidas} /><K t="Faturamento" v={brl(m.fat)} /><K t="Ticket médio" v={brl(m.ticket)} />
        <K t="Conversão de leads" v={m.convLeads} /><K t="Conversão de orçamentos" v={m.convOrc} /><K t="Investimento em anúncios" v={brl(m.invest)} />
        <K t="Custo por lead" v={m.cpl} /><K t="Retorno das campanhas" v={m.roas} />
      </div>
      <p className="note">Leads, perdidas e conversões contam os leads que entraram no período. Faturamento e vendas contam pela data da venda. Custo por lead = investimento ÷ leads. Retorno = faturamento dos leads com origem de anúncio ÷ investimento.</p>
      <div className="two">
        <div><h3>Leads por semana</h3>
          {semanas.length === 0 && <p className="note">Sem dados no período.</p>}
          {semanas.map(([k, v]) => <div key={k} className="barra"><span className="note">{new Date(k + "T00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span><div><i style={{ width: `${(v / maxS) * 100}%` }} /></div><b>{v}</b></div>)}
        </div>
        <div><h3>Leads por etapa do funil</h3>
          {porEtapa.map(([s, v]) => <div key={s} className="barra"><span className="note">{nomeEtapa(s)}</span><div><i style={{ width: `${(v / maxE) * 100}%` }} /></div><b>{v}</b></div>)}
        </div>
      </div>
    </>
  );
}
