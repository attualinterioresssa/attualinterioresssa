"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl, money, carregarEmpresa } from "@/lib/empresa";

type Item = { ambiente: string; descricao: string; qtd: string; valor: string; custo: string };
const AMBIENTES = ["Cozinha", "Área de serviço", "Sala", "Escritório", "Suíte master", "Quarto", "Sanitário", "Varanda"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const pc = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

export default function Editor() {
  return <AuthGate><Proposta /></AuthGate>;
}

function Proposta() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [alvo, setAlvo] = useState(35);
  const [descTipo, setDescTipo] = useState<"R$" | "%">("R$");
  const [descVal, setDescVal] = useState("");
  const [mk, setMk] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b, e] = await Promise.all([
      sb.from("proposals").select("*").eq("id", id).single(),
      sb.from("proposal_items").select("*").eq("proposal_id", id).order("ordem"),
      carregarEmpresa(),
    ]);
    if (a.error) { setMsg(a.error.message); return; }
    setP(a.data); setAlvo(Number(e.margem_alvo) || 35);
    setDescTipo("R$"); setDescVal(Number(a.data.desconto) ? String(a.data.desconto) : "");
    setItems((b.data ?? []).map((i: any) => ({ ambiente: i.ambiente, descricao: i.descricao, qtd: String(i.qtd), valor: String(i.valor), custo: Number(i.custo) ? String(i.custo) : "" })));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const set = (k: string) => (e: any) => setP({ ...p, [k]: e.target.value });
  const setItem = (i: number, k: keyof Item, v: string) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const qt = (i: Item) => parseInt(i.qtd) || 1;
  const sub = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => { const a = i.ambiente.trim() || "Geral"; m[a] = (m[a] ?? 0) + qt(i) * money(i.valor); });
    return m;
  }, [items]);
  const ambs = Array.from(new Set([...AMBIENTES, ...items.map((i) => i.ambiente).filter(Boolean)]));

  // Rentabilidade (interno)
  const subtotal = r2(Object.values(sub).reduce((s, v) => s + v, 0));
  const custoTot = r2(items.reduce((s, i) => s + qt(i) * money(i.custo), 0));
  const desconto = r2(descTipo === "%" ? (subtotal * Math.min(100, money(descVal))) / 100 : Math.min(subtotal, money(descVal)));
  const total = r2(subtotal - desconto);
  const lucro = r2(total - custoTot);
  const margem = total > 0 ? (lucro / total) * 100 : 0;
  const markupReal = custoTot > 0 ? total / custoTot : 0;
  const limite = custoTot > 0 ? Math.max(0, r2(subtotal - custoTot / (1 - alvo / 100))) : 0;
  const mkv = mk ?? (markupReal || 2);
  const simVenda = r2(custoTot * mkv);
  const simMargem = simVenda > 0 ? ((simVenda - custoTot) / simVenda) * 100 : 0;
  const nivel = custoTot === 0 ? { t: "Informe os custos", c: "frio" } : margem < alvo ? { t: "Abaixo da meta", c: "quente" } : margem < alvo + 15 ? { t: "Boa", c: "morno" } : { t: "Excelente", c: "" };

  async function salvar(): Promise<boolean> {
    setBusy(true); setMsg("");
    const campos = ["numero", "data", "cliente_nome", "cliente_doc", "cliente_tel", "cliente_email", "cliente_endereco", "projeto", "endereco_obra", "prazo_entrega", "cond_pagamento", "observacoes", "status", "layout", "arquiteto", "responsavel"];
    const upd: any = { validade_dias: Number(p.validade_dias) || 15, desconto, updated_at: new Date().toISOString() };
    campos.forEach((c) => { upd[c] = p[c] === "" ? null : p[c]; });
    upd.cliente_nome = p.cliente_nome; upd.numero = p.numero; upd.cond_pagamento = p.cond_pagamento || "A combinar";
    const a = await sb.from("proposals").update(upd).eq("id", id);
    if (a.error) { setMsg(a.error.message); setBusy(false); return false; }
    await sb.from("proposal_items").delete().eq("proposal_id", id);
    const rows = items.filter((i) => i.descricao.trim()).map((i, k) => ({ proposal_id: id, ambiente: i.ambiente.trim() || "Geral", ordem: k, descricao: i.descricao.trim(), qtd: qt(i), valor: money(i.valor), custo: money(i.custo) }));
    if (rows.length) {
      const b = await sb.from("proposal_items").insert(rows);
      if (b.error) { setMsg(b.error.message); setBusy(false); return false; }
    }
    setBusy(false); setMsg("Proposta salva."); return true;
  }

  function aplicarMarkup() {
    if (custoTot === 0) { setMsg("Informe o custo dos itens para aplicar o markup."); return; }
    if (!window.confirm(`Recalcular o valor dos itens que têm custo, usando markup de ${mkv.toFixed(2)}x? Itens sem custo não mudam.`)) return;
    setItems(items.map((i) => (money(i.custo) > 0 ? { ...i, valor: r2(money(i.custo) * mkv).toFixed(2) } : i)));
    setMk(null); setMsg("Valores recalculados. Confira e salve.");
  }

  async function registrarNoFunil() {
    if (!(await salvar())) return;
    const u = (await sb.auth.getUser()).data.user?.id;
    let qid = p.quotation_id as string | null; let versao = 1;
    if (qid) {
      const { data } = await sb.from("quotation_versions").select("versao").eq("quotation_id", qid).order("versao", { ascending: false }).limit(1);
      versao = (data?.[0]?.versao ?? 0) + 1;
    } else {
      const r = await sb.from("quotations").insert({ lead_id: p.lead_id, ambiente: p.projeto || `Proposta ${p.numero}`, created_by: u }).select("id").single();
      if (r.error) { setMsg(r.error.message); return; }
      qid = r.data.id;
      await sb.from("proposals").update({ quotation_id: qid }).eq("id", id);
    }
    const val = new Date(p.data + "T00:00"); val.setDate(val.getDate() + (Number(p.validade_dias) || 15));
    const ins = await sb.from("quotation_versions").insert({
      quotation_id: qid, versao, descricao: Object.entries(sub).map(([a, v]) => `${a}: ${brl(v)}`).join(" | ") + (desconto > 0 ? ` | Desconto: ${brl(desconto)}` : ""),
      valor_total: total, forma_pagamento: p.cond_pagamento, prazo: p.prazo_entrega, validade: val.toLocaleDateString("sv-SE"), created_by: u,
    });
    if (ins.error) { setMsg(ins.error.message); return; }
    setMsg(`Registrado no funil como orçamento (versão ${versao}). Para marcar como enviado, use a ficha do cliente.`);
    load();
  }

  if (!p) return <p className="note">{msg || "Carregando..."}</p>;
  const F = (k: string, t: string, tipo?: string) => (
    <div className="f" key={k}><label>{t}</label><input type={tipo ?? "text"} value={p[k] ?? ""} onChange={set(k)} /></div>
  );
  return (
    <>
      <p><Link href="/crm/propostas">← Propostas</Link> · <Link href={`/crm/${p.lead_id}`}>Ficha do cliente</Link></p>
      <h2>Proposta nº {p.numero}</h2>
      {msg && <p className="note">{msg}</p>}
      <div className="two">
        <div>
          <h3>Cliente</h3>
          {F("numero", "Número da proposta")}{F("data", "Data", "date")}{F("cliente_nome", "Cliente")}{F("cliente_doc", "CPF/CNPJ")}
          {F("cliente_tel", "Telefone")}{F("cliente_email", "E-mail")}{F("cliente_endereco", "Endereço do cliente")}
          <h3>Projeto</h3>
          {F("projeto", "Projeto (ex.: projeto residencial)")}{F("endereco_obra", "Endereço da obra")}{F("arquiteto", "Arquiteto(a)")}{F("responsavel", "Responsável")}
          <div className="f"><label>Modelo do PDF</label><select value={p.layout ?? "classico"} onChange={set("layout")}><option value="classico">Clássico (linhas escuras)</option><option value="moderno">Moderno (linhas vermelhas)</option></select></div>
          <h3>Condições</h3>
          {F("validade_dias", "Validade da proposta (dias)", "number")}{F("prazo_entrega", "Prazo de entrega")}{F("cond_pagamento", "Condição de pagamento")}
          <div className="f"><label>Observações</label><textarea rows={6} value={p.observacoes ?? ""} onChange={set("observacoes")} /></div>
          <div className="f"><label>Status</label>
            <select value={p.status} onChange={set("status")}>{["rascunho", "enviada", "aceita", "recusada"].map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <div>
          <h3>Itens por ambiente</h3>
          <datalist id="amb">{ambs.map((a) => <option key={a} value={a} />)}</datalist>
          {items.map((it, i) => (
            <div key={i} className="card" style={{ cursor: "default", marginBottom: 8 }}>
              <input list="amb" placeholder="Ambiente" value={it.ambiente} onChange={(e) => setItem(i, "ambiente", e.target.value)} />
              <textarea rows={3} placeholder="Descrição do item" value={it.descricao} onChange={(e) => setItem(i, "descricao", e.target.value)} />
              <div className="linha"><input type="number" min="1" placeholder="Qtd" value={it.qtd} onChange={(e) => setItem(i, "qtd", e.target.value)} />
                <input inputMode="decimal" placeholder="Valor (R$)" value={it.valor} onChange={(e) => setItem(i, "valor", e.target.value)} />
                <input inputMode="decimal" placeholder="Custo interno (R$)" value={it.custo} onChange={(e) => setItem(i, "custo", e.target.value)} aria-label="Custo interno, não aparece no PDF" />
                <button className="btn ghost small" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remover</button></div>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => setItems([...items, { ambiente: items[items.length - 1]?.ambiente ?? "", descricao: "", qtd: "1", valor: "", custo: "" }])}>Adicionar item</button>

          <h3>Desconto</h3>
          <div className="linha">
            <select value={descTipo} onChange={(e) => setDescTipo(e.target.value as "R$" | "%")} style={{ width: 90 }} aria-label="Tipo de desconto"><option value="R$">R$</option><option value="%">%</option></select>
            <input inputMode="decimal" placeholder="Valor do desconto" value={descVal} onChange={(e) => setDescVal(e.target.value)} />
          </div>
          {desconto > 0 && <p className="note">Desconto aplicado: {brl(desconto)}</p>}
          {desconto > 0 && custoTot > 0 && desconto > limite && <p className="err">Desconto acima do limite seguro ({brl(limite)}): a margem cai para {pc(margem)}, abaixo da meta de {alvo}%.</p>}

          <h3>Rentabilidade (interna, não vai no PDF)</h3>
          <div className="kpis">
            <div className="kpi"><span className="note">Custo estimado</span><b>{brl(custoTot)}</b><span className="note">soma dos itens</span></div>
            <div className="kpi"><span className="note">Venda projetada</span><b>{brl(total)}</b><span className="note">pós-desconto</span></div>
            <div className="kpi"><span className="note">Lucro</span><b>{brl(lucro)}</b></div>
            <div className="kpi"><span className="note">Margem bruta</span><b>{pc(margem)}</b><span className={`badge ${nivel.c}`}>{nivel.t}</span></div>
          </div>
          <div className="card" style={{ cursor: "default" }}>
            <label className="note">Markup do projeto (simulador): <b>{mkv.toFixed(2).replace(".", ",")}x</b>{markupReal > 0 && ` · atual ${markupReal.toFixed(2).replace(".", ",")}x`}</label>
            <input type="range" min="1" max="5" step="0.05" value={mkv} onChange={(e) => setMk(Number(e.target.value))} aria-label="Markup" />
            <p className="note">Simulação: venda {brl(simVenda)} · lucro {brl(r2(simVenda - custoTot))} · margem {pc(simMargem)}</p>
            <p className="note">Desconto limite seguro ({alvo}% de margem): <b>{brl(limite)}</b></p>
            <button className="btn ghost small" onClick={aplicarMarkup}>Aplicar markup aos valores dos itens</button>
          </div>

          <h3>Totais</h3>
          {Object.entries(sub).map(([a, v]) => <p key={a} className="note">{a}: {brl(v)}</p>)}
          {desconto > 0 && <p className="note">Subtotal: {brl(subtotal)} · Desconto: − {brl(desconto)}</p>}
          <p><b>Valor total do investimento: {brl(total)}</b></p>
          <div className="linha" style={{ flexWrap: "wrap" }}>
            <button className="btn small" onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
            <Link className="btn ghost small" href={`/crm/propostas/${id}/imprimir`} target="_blank">Ver / Imprimir PDF</Link>
            <button className="btn ghost small" onClick={registrarNoFunil}>Registrar no funil como orçamento</button>
            <Link className="btn ghost small" href={`/crm/contratos/novo/${id}`}>Gerar contrato</Link>
          </div>
          <p className="note">Salve antes de abrir o PDF. Custos, markup e margem aparecem só aqui, nunca no PDF do cliente.</p>
        </div>
      </div>
    </>
  );
}
