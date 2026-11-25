"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl, carregarEmpresa, type Empresa } from "@/lib/empresa";

const CSS = `
.papel{--cor:#0b1220;background:#fff;color:#111;max-width:794px;margin:0 auto;padding:40px 48px;font:400 13px/1.5 Montserrat,Arial,Helvetica,sans-serif}
.papel.mod{--cor:#e24a4a}
.papel *{box-sizing:border-box}
.papel .cab{display:flex;justify-content:space-between;gap:20px;padding-bottom:14px;border-bottom:3px solid #dfe5ec}
.papel.mod .cab{border-bottom:4px solid var(--cor)}
.papel .emp{text-align:right;font-size:12px;color:#334}
.papel .emp b{display:block;font-size:17px;color:#0b1220;text-transform:uppercase}
.papel .np{font-size:22px;font-weight:800;text-align:right}
.papel .num{display:flex;justify-content:space-between;align-items:flex-end;margin:18px 0}
.papel .nome{font-size:24px;font-weight:800;text-transform:uppercase;color:#0b1220}
.papel .tit{text-align:center;font-weight:800;font-size:16px;letter-spacing:.04em;margin:22px 0}
.papel .duas{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:14px}
.papel .t{font-weight:800;font-size:12px;text-transform:uppercase;border-bottom:3px solid var(--cor);padding-bottom:4px;margin:8px 0}
.papel .amb{margin-top:18px;border-top:3px solid var(--cor);padding-top:8px;font-weight:800;text-transform:uppercase}
.papel table{width:100%;border-collapse:collapse;margin-top:6px}
.papel th{font-size:11px;text-transform:uppercase;text-align:left;padding:6px 8px;border-bottom:1px solid #cdd5df}
.papel td{padding:8px;border-bottom:1px solid #e6ebf1;vertical-align:top}
.papel tr{break-inside:avoid}
.papel .r{text-align:right;white-space:nowrap}
.papel .sub{text-align:right;font-weight:800;margin-top:6px}
.papel .tot{margin-top:18px;padding:10px 0;border-top:3px solid var(--cor);text-align:right;font-size:17px;font-weight:800}
.papel.mod .tot{color:var(--cor)}
.papel .blk{margin-top:16px;font-size:12px;white-space:pre-wrap;break-inside:avoid}
.papel .nota{font-style:italic;color:#667;font-size:12px;margin-top:12px}
.papel .rod{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:14px;margin-top:28px;padding-top:12px;border-top:1px solid #cdd5df;font-size:12px;break-inside:avoid}
.papel.mod .rod{grid-template-columns:2fr 1fr 2fr;border-top:3px solid var(--cor)}
.papel .rod b{display:block;font-size:11px;text-transform:uppercase;color:#556}
.papel.mod .rod b{color:#111}
@media print{
  body{background:#fff !important}
  .crm-top,.no-print{display:none !important}
  .wrap.wide{padding:0 !important;max-width:none !important}
  .papel{padding:0;max-width:none}
  @page{size:A4;margin:14mm}
}`;

export default function Imprimir() {
  return <AuthGate><Papel /></AuthGate>;
}

function Papel() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [emp, setEmp] = useState<Empresa>({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const [a, b, e] = await Promise.all([
        sb.from("proposals").select("*").eq("id", id).single(),
        sb.from("proposal_items").select("*").eq("proposal_id", id).order("ordem"),
        carregarEmpresa(),
      ]);
      if (a.error) { setErro(a.error.message); return; }
      setP(a.data); setItems(b.data ?? []); setEmp(e);
    })();
  }, [id]);

  if (erro) return <p className="err">{erro}</p>;
  if (!p) return <p className="note">Carregando...</p>;

  const mod = p.layout === "moderno";
  const grupos: { nome: string; itens: any[] }[] = [];
  items.forEach((i) => { let g = grupos.find((x) => x.nome === i.ambiente); if (!g) { g = { nome: i.ambiente, itens: [] }; grupos.push(g); } g.itens.push(i); });
  const subtotal = items.reduce((s, i) => s + i.qtd * Number(i.valor), 0);
  const desconto = Number(p.desconto) || 0;
  const total = subtotal - desconto;
  let n = 0;
  const dataExt = new Date(p.data + "T00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const temPag = emp.banco || emp.pix;

  return (
    <>
      <style>{CSS}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap" />
      <div className="no-print linha" style={{ maxWidth: 794, margin: "0 auto 12px" }}>
        <button className="btn small" onClick={() => window.print()}>Imprimir / Salvar como PDF</button>
        <span className="note">Na janela que abrir, escolha o destino “Salvar como PDF”.</span>
      </div>
      <div className={`papel${mod ? " mod" : ""}`}>
        {mod ? (
          <div className="cab">
            <img src="/logo.png" alt="Attual Interiores" width={92} height={92} />
            <div><div className="np">PROPOSTA Nº {p.numero}</div><div style={{ color: "#667", textAlign: "right" }}>{dataExt}</div></div>
          </div>
        ) : (
          <div className="cab">
            <img src="/logo.png" alt="Attual Interiores" width={96} height={96} />
            <div className="emp">
              <b>{emp.razao_social}</b>
              {emp.cnpj && <div>CNPJ: {emp.cnpj}</div>}
              {emp.endereco && <div>{emp.endereco}</div>}
              {emp.telefone && <div>{emp.telefone}</div>}
            </div>
          </div>
        )}
        {mod ? <div className="tit">PROPOSTA COMERCIAL DE MARCENARIA</div> : (
          <div className="num">
            <div><div className="nome">{p.cliente_nome}</div><div style={{ color: "#667" }}>Apresentamos nossa proposta exclusiva para marcenaria</div></div>
            <div><div style={{ fontWeight: 800, color: "#334", textAlign: "right" }}>PROPOSTA Nº</div><div className="np">{p.numero}</div><div style={{ color: "#667", textAlign: "right" }}>Salvador, {dataExt}</div></div>
          </div>
        )}
        <div className="duas">
          <div><div className="t">Dados do cliente</div>
            <div><b>Cliente:</b> {p.cliente_nome}</div>
            <div><b>CPF/CNPJ:</b> {p.cliente_doc || "---"}</div>
            <div><b>Tel:</b> {p.cliente_tel || "---"}</div>
            <div><b>E-mail:</b> {p.cliente_email || "---"}</div>
            {p.cliente_endereco && <div><b>Endereço:</b> {p.cliente_endereco}</div>}</div>
          <div><div className="t">{mod ? "Ficha técnica / Arquiteto" : "Ficha técnica"}</div>
            {p.projeto && <div><b>Projeto:</b> {p.projeto}</div>}
            {p.endereco_obra && <div><b>Endereço da obra:</b> {p.endereco_obra}</div>}
            {(mod || p.arquiteto) && <div><b>Arquiteto(a):</b> {p.arquiteto || "Não informado"}</div>}
            {(mod || p.responsavel) && <div><b>Responsável:</b> {p.responsavel || "Não informado"}</div>}
            {mod && <><div className="t">Condições comerciais</div>
              <div><b>Prazo de entrega:</b> {p.prazo_entrega || "—"}</div>
              <div><b>Condição de pagamento:</b> {p.cond_pagamento}</div></>}</div>
        </div>
        {grupos.map((g) => (
          <div key={g.nome}>
            <div className="amb">{g.nome}</div>
            <table><thead><tr><th>Item</th><th>Descrição</th><th>Qtd</th><th className="r">Valor</th></tr></thead>
              <tbody>{g.itens.map((i) => { n += 1; return <tr key={i.id}><td><b>{n}</b></td><td>{i.descricao}</td><td>{i.qtd}</td><td className="r"><b>{brl(i.qtd * Number(i.valor))}</b></td></tr>; })}</tbody></table>
            <div className="sub">Valor total {g.nome.toLowerCase()}: {brl(g.itens.reduce((s, i) => s + i.qtd * Number(i.valor), 0))}</div>
          </div>
        ))}
        {desconto > 0 && <div className="sub">Subtotal: {brl(subtotal)} · Desconto: − {brl(desconto)}</div>}
        <div className="tot">VALOR TOTAL DO INVESTIMENTO: {brl(total)}</div>
        {mod && <div className="nota">Proposta válida por {p.validade_dias} dias. Prazos de fabricação iniciam após assinatura do contrato e aprovação do projeto executivo. Condições de pagamento: {String(p.cond_pagamento).toLowerCase()}.</div>}
        {temPag && (
          <div className="blk"><div className="t">Dados para pagamento</div>
            {emp.banco && <div>Banco: {emp.banco}</div>}
            {emp.agencia_conta && <div>Agência e conta: {emp.agencia_conta}</div>}
            {(emp.titular || emp.cnpj) && <div>Titular: {emp.titular || emp.razao_social} {emp.cnpj ? `— CNPJ: ${emp.cnpj}` : ""}</div>}
            {emp.pix && <div>Chave PIX: {emp.pix}</div>}</div>
        )}
        {p.observacoes && <div className="blk"><div className="t">Observações da proposta</div>{p.observacoes}</div>}
        {mod ? (
          <div className="rod">
            <div><b>{emp.razao_social}</b>{emp.cnpj ? `CNPJ: ${emp.cnpj}` : ""}</div>
            <div>{emp.telefone}</div>
            <div style={{ textAlign: "right" }}>{emp.endereco}</div>
          </div>
        ) : (
          <div className="rod">
            <div><b>Responsável</b>{emp.responsavel || emp.razao_social}</div>
            <div><b>Validade da proposta</b>{p.validade_dias} dias</div>
            <div><b>Prazo de entrega</b>{p.prazo_entrega || "—"}</div>
            <div><b>Cond. pagamento</b>{p.cond_pagamento}</div>
          </div>
        )}
      </div>
    </>
  );
}
