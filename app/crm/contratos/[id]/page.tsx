"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";
import { clausulasPadrao, ordinal, type Clausula } from "@/lib/contrato";
import { zap } from "@/lib/opcoes";

export default function EditorContrato() {
  return <AuthGate><Contrato /></AuthGate>;
}

const PARTE: [string, string][] = [["nome", "Nome completo"], ["doc", "CPF/CNPJ"], ["endereco", "Endereço (residência)"], ["tel", "Telefone/WhatsApp"], ["email", "E-mail"]];
const EMP: [string, string][] = [["razao_social", "Razão social"], ["cnpj", "CNPJ"], ["endereco", "Endereço da sede"], ["telefone", "Telefone"], ["rep_nome", "Representante legal"], ["rep_cargo", "Cargo do representante"], ["rep_qualificacao", "Qualificação (nacionalidade, estado civil, profissão)"], ["rep_cpf", "CPF do representante"], ["banco", "Banco"], ["agencia_conta", "Agência e conta"], ["titular", "Titular da conta"], ["pix", "Chave PIX"]];

function Contrato() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb.from("contracts").select("*").eq("id", id).single();
    if (error) setMsg(error.message); else setC(data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!c) return <p className="note">{msg || "Carregando..."}</p>;
  const trav = c.status === "assinado";
  const set = (k: string) => (e: any) => setC({ ...c, [k]: e.target.value });
  const obj = (o: string, k: string, t: string) => (
    <div className="f" key={o + k}><label>{t}</label><input disabled={trav} value={c[o]?.[k] ?? ""} onChange={(e) => setC({ ...c, [o]: { ...c[o], [k]: e.target.value } })} /></div>
  );
  const txt = (k: string, t: string) => (
    <div className="f" key={k}><label>{t}</label><input disabled={trav} value={c[k] ?? ""} onChange={set(k)} /></div>
  );
  const setParc = (i: number, k: string, v: string) => setC({ ...c, cronograma: c.cronograma.map((p: any, j: number) => (j === i ? { ...p, [k]: v } : p)) });
  const setCl = (i: number, k: keyof Clausula, v: string) => setC({ ...c, clausulas: c.clausulas.map((x: Clausula, j: number) => (j === i ? { ...x, [k]: v } : x)) });
  const setTest = (i: number, k: string, v: string) => setC({ ...c, testemunhas: c.testemunhas.map((t: any, j: number) => (j === i ? { ...t, [k]: v } : t)) });

  async function salvar() {
    setBusy(true); setMsg("");
    const { error } = await sb.from("contracts").update({
      numero: c.numero, data: c.data, status: c.status, contratante: c.contratante, contratada: c.contratada, itens: c.itens, total: c.total, desconto: c.desconto,
      forma_pagamento: c.forma_pagamento, cronograma: c.cronograma, prazo_entrega: c.prazo_entrega, vigencia: c.vigencia, foro: c.foro,
      garantia_mdf: c.garantia_mdf, garantia_ferragens: c.garantia_ferragens, clausulas: c.clausulas, testemunhas: c.testemunhas,
    }).eq("id", id);
    setBusy(false);
    setMsg(error ? (error.message.includes("contrato_assinado") ? "Contrato assinado não pode ser alterado." : error.message) : "Contrato salvo.");
  }
  function regenerar() {
    if (!window.confirm("Regerar o texto de todas as cláusulas a partir dos campos? As edições manuais nas cláusulas serão perdidas.")) return;
    setC({ ...c, clausulas: clausulasPadrao({ total: Number(c.total), forma: c.forma_pagamento ?? "", cronograma: c.cronograma, contratada: c.contratada, prazo: c.prazo_entrega ?? "", vigencia: c.vigencia ?? "", foro: c.foro ?? "", garantiaMdf: c.garantia_mdf ?? "", garantiaFerragens: c.garantia_ferragens ?? "" }) });
  }
  async function atualizarItens() {
    if (!c.proposal_id) { setMsg("Este contrato não está ligado a uma proposta."); return; }
    if (!window.confirm("Copiar de novo os itens e o valor da proposta para este contrato?")) return;
    const { data } = await sb.from("proposal_items").select("*").eq("proposal_id", c.proposal_id).order("ordem");
    const itens = (data ?? []).map((i: any) => ({ ambiente: i.ambiente, descricao: i.descricao, qtd: i.qtd, valor: Number(i.valor) }));
    const pd = await sb.from("proposals").select("desconto").eq("id", c.proposal_id).maybeSingle();
    const desconto = Number(pd.data?.desconto) || 0;
    setC({ ...c, itens, desconto, total: itens.reduce((s: number, i: any) => s + i.qtd * i.valor, 0) - desconto });
    setMsg("Itens atualizados. Use “Regerar cláusulas” para refletir o novo valor no texto, e salve.");
  }
  async function enviarZap() {
    const nome = (c.contratante?.nome ?? "").split(" ")[0];
    const texto = `Olá, ${nome}! Segue o contrato nº ${c.numero} da Attual Interiores para sua análise e assinatura. Qualquer dúvida, estou à disposição.`;
    window.open(`https://wa.me/${zap(c.contratante?.tel ?? "")}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    const u = (await sb.auth.getUser()).data.user?.id ?? null;
    await sb.from("activities").insert({ lead_id: c.lead_id, user_id: u, tipo: "contrato", descricao: `Contrato nº ${c.numero} enviado pelo WhatsApp` });
    if (c.status === "rascunho") { await sb.from("contracts").update({ status: "enviado" }).eq("id", id); load(); }
  }
  async function subirAssinado(f: File | null) {
    if (!f) return;
    const caminho = `${c.lead_id}/${id}-assinado.pdf`;
    const up = await sb.storage.from("contratos").upload(caminho, f, { contentType: "application/pdf", upsert: true });
    if (up.error) { setMsg(up.error.message); return; }
    await sb.from("contracts").update({ pdf_path: caminho }).eq("id", id);
    setMsg("PDF assinado guardado."); load();
  }
  async function abrirAssinado() {
    const r = await sb.storage.from("contratos").createSignedUrl(c.pdf_path, 120);
    if (r.data?.signedUrl) window.open(r.data.signedUrl, "_blank", "noopener,noreferrer"); else setMsg(r.error?.message ?? "Não foi possível abrir o PDF.");
  }
  async function marcarAssinado() {
    if (!window.confirm("Marcar como assinado? Depois disso o texto, as partes e os valores ficam bloqueados.")) return;
    if (!(await salvarSilencioso())) return;
    const a = await sb.from("contracts").update({ status: "assinado", assinado_em: new Date().toISOString() }).eq("id", id);
    if (a.error) { setMsg(a.error.message); return; }
    const u = (await sb.auth.getUser()).data.user?.id ?? null;
    await sb.from("activities").insert({ lead_id: c.lead_id, user_id: u, tipo: "contrato", descricao: `Contrato nº ${c.numero} assinado` });
    let extra = "";
    const pr = c.proposal_id ? await sb.from("proposals").select("quotation_id").eq("id", c.proposal_id).maybeSingle() : null;
    if (pr?.data?.quotation_id) {
      const r = await sb.rpc("fechar_venda", { p_quotation: pr.data.quotation_id });
      extra = r.error && !String(r.error.message).includes("venda_ja_fechada") ? ` Não foi possível fechar a venda: ${r.error.message}` : " Venda fechada no funil e ordem de produção criada.";
    } else extra = " Para fechar a venda no funil, registre a proposta como orçamento e use “Fechar venda” na ficha.";
    setMsg("Contrato assinado." + extra); load();
  }
  async function salvarSilencioso() {
    const { error } = await sb.from("contracts").update({ clausulas: c.clausulas, contratante: c.contratante, contratada: c.contratada, cronograma: c.cronograma, testemunhas: c.testemunhas }).eq("id", id);
    if (error) { setMsg(error.message); return false; } return true;
  }

  return (
    <>
      <p><Link href="/crm/contratos">← Contratos</Link> · <Link href={`/crm/${c.lead_id}`}>Ficha do cliente</Link></p>
      <h2>Contrato nº {c.numero} <span className="badge">{c.status}</span></h2>
      {trav && <p className="note">Contrato assinado: texto, partes e valores estão bloqueados.</p>}
      {msg && <p className="note">{msg}</p>}
      <div className="linha" style={{ flexWrap: "wrap" }}>
        <button className="btn small" onClick={salvar} disabled={busy || trav}>{busy ? "Salvando..." : "Salvar"}</button>
        <Link className="btn ghost small" href={`/crm/contratos/${id}/imprimir`} target="_blank">Ver / Imprimir PDF</Link>
        <button className="btn ghost small" onClick={enviarZap}>Enviar pelo WhatsApp</button>
        {!trav && <button className="btn ghost small" onClick={marcarAssinado}>Marcar como assinado</button>}
      </div>
      <p className="note">Salve antes de abrir o PDF. O WhatsApp abre a conversa com o texto pronto, mas o arquivo PDF precisa ser anexado por você (o WhatsApp comum não anexa sozinho).</p>

      <div className="two">
        <div>
          <h3>Contrato</h3>
          {txt("numero", "Número")}
          <div className="f"><label>Data</label><input type="date" disabled={trav} value={c.data ?? ""} onChange={set("data")} /></div>
          <div className="f"><label>Status</label><select value={c.status} onChange={set("status")} disabled={trav}>{["rascunho", "enviado", "assinado", "cancelado"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <h3>Contratante</h3>
          {PARTE.map(([k, t]) => obj("contratante", k, t))}
          <h3>Contratada e representante</h3>
          {EMP.map(([k, t]) => obj("contratada", k, t))}
          <h3>Testemunhas</h3>
          {c.testemunhas.map((t: any, i: number) => (
            <div key={i} className="linha"><input disabled={trav} placeholder={`Testemunha ${i + 1}: nome`} value={t.nome} onChange={(e) => setTest(i, "nome", e.target.value)} /><input disabled={trav} placeholder="CPF" value={t.cpf} onChange={(e) => setTest(i, "cpf", e.target.value)} /></div>
          ))}
          <h3>Contrato assinado (arquivo)</h3>
          {c.pdf_path && <p><button className="btn ghost small" onClick={abrirAssinado}>Abrir PDF assinado</button></p>}
          <label className="note">Anexar o PDF assinado <input type="file" accept="application/pdf" onChange={(e) => { subirAssinado(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>
        </div>
        <div>
          <h3>Itens e valor</h3>
          {c.itens.map((i: any, k: number) => <p key={k} className="note">1.{k + 1} {i.ambiente} — ({i.qtd}x) {i.descricao} · {brl(i.valor)}</p>)}
          {Number(c.desconto) > 0 && <p className="note">Desconto: − {brl(Number(c.desconto))}</p>}
          <p><b>Valor total: {brl(Number(c.total))}</b></p>
          {!trav && <button className="btn ghost small" onClick={atualizarItens}>Atualizar itens a partir da proposta</button>}
          <h3>Pagamento e prazos</h3>
          {txt("forma_pagamento", "Forma de pagamento")}
          {c.cronograma.map((p: any, i: number) => (
            <div key={i} className="linha"><input disabled={trav} placeholder="Parcela (ex.: Entrada)" value={p.descricao} onChange={(e) => setParc(i, "descricao", e.target.value)} />
              <input disabled={trav} inputMode="decimal" placeholder="Valor" value={p.valor} onChange={(e) => setParc(i, "valor", e.target.value)} />
              <input disabled={trav} type="date" value={p.vencimento} onChange={(e) => setParc(i, "vencimento", e.target.value)} />
              {!trav && <button className="btn ghost small" onClick={() => setC({ ...c, cronograma: c.cronograma.filter((_: any, j: number) => j !== i) })}>×</button>}</div>
          ))}
          {!trav && <button className="btn ghost small" onClick={() => setC({ ...c, cronograma: [...c.cronograma, { descricao: "", valor: "", vencimento: "" }] })}>Adicionar parcela</button>}
          {txt("prazo_entrega", "Prazo de entrega")}{txt("vigencia", "Vigência")}{txt("foro", "Foro (cidade - UF)")}
          {txt("garantia_mdf", "Garantia do MDF")}{txt("garantia_ferragens", "Garantia das ferragens")}
          <h3>Cláusulas (texto editável)</h3>
          {!trav && <button className="btn ghost small" onClick={regenerar}>Regerar cláusulas a partir dos campos</button>}
          {c.clausulas.map((cl: Clausula, i: number) => (
            <div key={i} className="card" style={{ cursor: "default", marginTop: 8 }}>
              <b>CLÁUSULA {ordinal(i)} –</b>
              <input disabled={trav} value={cl.titulo} onChange={(e) => setCl(i, "titulo", e.target.value)} />
              <textarea disabled={trav} rows={5} value={cl.corpo} onChange={(e) => setCl(i, "corpo", e.target.value)} />
              {!trav && <button className="btn ghost small" onClick={() => setC({ ...c, clausulas: c.clausulas.filter((_: any, j: number) => j !== i) })}>Remover cláusula</button>}
            </div>
          ))}
          {!trav && <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setC({ ...c, clausulas: [...c.clausulas, { titulo: "NOVA CLÁUSULA", corpo: "" }] })}>Adicionar cláusula</button>}
        </div>
      </div>
    </>
  );
}
