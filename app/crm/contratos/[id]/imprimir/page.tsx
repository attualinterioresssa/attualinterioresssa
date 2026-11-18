"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";
import { ordinal, type Clausula } from "@/lib/contrato";

const CSS = `
.ct{background:#fff;color:#1a1a1a;max-width:794px;margin:0 auto;padding:40px 52px;font:400 12.5px/1.65 Montserrat,Arial,Helvetica,sans-serif}
.ct *{box-sizing:border-box}
.ct .cab{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:4px solid #e24a4a}
.ct .num{text-align:right}.ct .num b{display:block;font-size:17px;font-weight:800}.ct .num span{color:#667}
.ct .tit{text-align:center;font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase;margin:26px 0 20px}
.ct .h{font-weight:800;text-transform:uppercase;margin:22px 0 6px;font-size:12.5px;break-after:avoid}
.ct p{margin:0 0 8px;white-space:pre-wrap}
.ct table{width:100%;border-collapse:collapse;margin:10px 0}
.ct th{font-size:10.5px;text-transform:uppercase;text-align:left;padding:6px 6px;border-bottom:2px solid #dde3ea}
.ct td{padding:8px 6px;border-bottom:1px solid #e8edf2;vertical-align:top}
.ct tr{break-inside:avoid}
.ct .r{text-align:right;white-space:nowrap;font-weight:800}
.ct .tot{text-align:right;color:#e24a4a;font-weight:800;font-size:15px;margin:14px 0}
.ct .ass{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:70px;break-inside:avoid;text-align:center}
.ct .ass div{border-top:1px solid #444;padding-top:6px;font-size:11.5px}
.ct .test{margin-top:34px;break-inside:avoid}
.ct .linha-t{display:grid;grid-template-columns:1fr 1fr;gap:36px;margin-top:30px}
.ct .linha-t div{border-top:1px solid #444;padding-top:4px;font-size:11.5px}
.ct .rod{display:grid;grid-template-columns:2fr 1fr 2fr;gap:14px;margin-top:34px;padding-top:10px;border-top:4px solid #e24a4a;font-size:11px;break-inside:avoid}
@media print{
  body{background:#fff !important}
  .crm-top,.no-print{display:none !important}
  .wrap.wide{padding:0 !important;max-width:none !important}
  .ct{padding:0;max-width:none}
  @page{size:A4;margin:14mm}
}`;

export default function Imprimir() {
  return <AuthGate><Papel /></AuthGate>;
}

function Papel() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    sb.from("contracts").select("*").eq("id", id).single().then(({ data, error }) => { if (error) setErro(error.message); else setC(data); });
  }, [id]);
  if (erro) return <p className="err">{erro}</p>;
  if (!c) return <p className="note">Carregando...</p>;

  const k = c.contratante ?? {}; const e = c.contratada ?? {};
  const dataExt = new Date(c.data + "T00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const tests = (c.testemunhas ?? []).filter((t: any) => t.nome || t.cpf);
  const tem = (v: any) => v && String(v).trim();

  return (
    <>
      <style>{CSS}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap" />
      <div className="no-print linha" style={{ maxWidth: 794, margin: "0 auto 12px" }}>
        <button className="btn small" onClick={() => window.print()}>Imprimir / Salvar como PDF</button>
        <span className="note">Na janela que abrir, escolha o destino “Salvar como PDF”.</span>
      </div>
      <div className="ct">
        <div className="cab">
          <img src="/logo.png" alt="Attual Interiores" width={92} height={92} />
          <div className="num"><b>CONTRATO Nº {c.numero}</b><span>{dataExt}</span></div>
        </div>
        <div className="tit">Contrato de prestação de serviços de marcenaria</div>

        <div className="h">Das partes</div>
        <p><b>CONTRATANTE:</b> {k.nome}{tem(k.doc) ? `, portador(a) do CNPJ/CPF ${k.doc}` : ""}{tem(k.endereco) ? `, residente e domiciliado(a) em ${k.endereco}` : ""}{tem(k.tel) ? `, telefone/WhatsApp ${k.tel}` : ""}.</p>
        <p><b>CONTRATADA:</b> {e.razao_social}{tem(e.cnpj) ? `, inscrita no CNPJ ${e.cnpj}` : ""}{tem(e.endereco) ? `, com sede em ${e.endereco}` : ""}{tem(e.rep_nome) ? `, neste ato representada por ${e.rep_nome}${tem(e.rep_cargo) ? `, na qualidade de ${e.rep_cargo}` : ""}${tem(e.rep_qualificacao) ? `, ${e.rep_qualificacao}` : ""}${tem(e.rep_cpf) ? `, inscrito(a) no CPF/MF sob o nº ${e.rep_cpf}` : ""}, ao final signatário(a)` : ""}.</p>

        {c.clausulas.map((cl: Clausula, i: number) => (
          <div key={i}>
            <div className="h">Cláusula {ordinal(i).toLowerCase()} – {cl.titulo}</div>
            {cl.corpo.split("\n").map((l, j) => <p key={j}>{l}</p>)}
            {cl.tipo === "objeto" && (
              <>
                <table><thead><tr><th>Item</th><th>Descrição do mobiliário / ambiente</th><th className="r">Valor unitário</th></tr></thead>
                  <tbody>{c.itens.map((it: any, n: number) => (
                    <tr key={n}><td><b>{i + 1}.{n + 1}</b></td><td><b>{it.ambiente}</b> - ({it.qtd}x) {it.descricao}</td><td className="r">{brl(it.valor)}</td></tr>
                  ))}</tbody></table>
                {Number(c.desconto) > 0 && <div style={{ textAlign: "right", fontWeight: 700 }}>Subtotal: {brl(Number(c.total) + Number(c.desconto))} · Desconto: − {brl(Number(c.desconto))}</div>}
                <div className="tot">VALOR TOTAL DO ORÇAMENTO: {brl(Number(c.total))}</div>
              </>
            )}
          </div>
        ))}

        <p style={{ marginTop: 22 }}>Salvador, {dataExt}.</p>
        <div className="ass">
          <div><b>{k.nome}</b><br />CONTRATANTE{tem(k.doc) ? ` / CPF: ${k.doc}` : ""}</div>
          <div><b>{e.razao_social}</b><br />CONTRATADA{tem(e.cnpj) ? ` / CNPJ: ${e.cnpj}` : ""}</div>
        </div>
        <div className="test">
          <div className="h">Testemunhas:</div>
          <div className="linha-t">
            {[0, 1].map((i) => { const t = tests[i]; return <div key={i}>{i + 1}) {t?.nome ? `Nome: ${t.nome}` : "Nome:"}<br />{t?.cpf ? `CPF: ${t.cpf}` : "CPF:"}</div>; })}
          </div>
        </div>
        <div className="rod">
          <div><b>{e.razao_social}</b><br />{tem(e.cnpj) ? `CNPJ: ${e.cnpj}` : ""}</div>
          <div>{e.telefone}</div>
          <div style={{ textAlign: "right" }}>{e.endereco}</div>
        </div>
      </div>
    </>
  );
}
