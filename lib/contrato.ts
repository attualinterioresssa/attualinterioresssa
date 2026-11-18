import { brl, money } from "@/lib/empresa";

export type Clausula = { titulo: string; corpo: string; tipo?: "objeto" };

const ORD = ["PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA", "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA", "DÉCIMA TERCEIRA", "DÉCIMA QUARTA", "DÉCIMA QUINTA"];
export const ordinal = (i: number) => ORD[i] ?? `${i + 1}ª`;

const U = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100, p: string[] = [];
  if (c) p.push(C[c]);
  if (r) { if (r < 20) p.push(U[r]); else { const d = Math.floor(r / 10), u = r % 10; p.push(u ? `${D[d]} e ${U[u]}` : D[d]); } }
  return p.join(" e ");
}
function inteiro(n: number): string {
  if (n === 0) return "zero";
  const bi = Math.floor(n / 1e9), mi = Math.floor((n % 1e9) / 1e6), mil = Math.floor((n % 1e6) / 1e3), r = n % 1e3;
  const p: string[] = [];
  if (bi) p.push(`${ate999(bi)} ${bi === 1 ? "bilhão" : "bilhões"}`);
  if (mi) p.push(`${ate999(mi)} ${mi === 1 ? "milhão" : "milhões"}`);
  if (mil) p.push(mil === 1 ? "mil" : `${ate999(mil)} mil`);
  if (r) p.push(ate999(r));
  if (p.length === 1) return p[0];
  const ultimo = p.pop() as string;
  const liga = r === 0 || r < 100 || r % 100 === 0 ? " e " : " ";
  return p.join(" ") + liga + ultimo;
}
export function extenso(v: number): string {
  const total = Math.round(v * 100), reais = Math.floor(total / 100), cent = total % 100;
  const partes: string[] = [];
  if (reais > 0 || cent === 0) partes.push(`${inteiro(reais)} ${reais === 1 ? "real" : reais >= 1e6 && reais % 1e6 === 0 ? "de reais" : "reais"}`);
  if (cent > 0) partes.push(`${inteiro(cent)} ${cent === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ");
}

export const dmy = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10).split("-").reverse().join("/") : s ?? "");

export type ParcelaC = { descricao: string; valor: string | number; vencimento: string };
export type EntradaClausulas = {
  total: number; forma: string; cronograma: ParcelaC[]; contratada: Record<string, any>;
  prazo: string; vigencia: string; foro: string; garantiaMdf: string; garantiaFerragens: string;
};

/** Texto padrão das cláusulas, seguindo o contrato modelo da empresa. Tudo pode ser editado no contrato. */
export function clausulasPadrao(e: EntradaClausulas): Clausula[] {
  const linhas = [`O valor total acordado para os serviços é de ${brl(e.total)} (${extenso(e.total)}), a ser pago conforme o cronograma detalhado abaixo:`, `Forma: ${e.forma || "A COMBINAR"}`];
  e.cronograma.filter((p) => p.descricao || money(p.valor)).forEach((p) =>
    linhas.push(`• ${p.descricao || "Parcela"}: ${brl(money(p.valor))}${p.vencimento ? ` — vencimento em ${dmy(p.vencimento)}` : ""}`));
  const c = e.contratada; const conta: string[] = [];
  if (c.banco) conta.push(`Banco ${c.banco}`);
  if (c.agencia_conta) conta.push(`Agência e conta ${c.agencia_conta}`);
  if (c.pix) conta.push(`Chave Pix ${c.pix}`);
  if (c.titular || c.razao_social) conta.push(`Titular ${c.titular || c.razao_social}`);
  if (c.cnpj) conta.push(`CNPJ ${c.cnpj}`);
  if (c.banco || c.pix) linhas.push(`Os valores devidos à CONTRATADA serão pagos mediante transferência para a seguinte conta: ${conta.join(", ")}.`);

  return [
    { titulo: "DO OBJETO", tipo: "objeto", corpo: "O presente contrato tem como objeto a comercialização de móveis sob medida, descritos e caracterizados nos projetos e no orçamento abaixo, previamente aprovados pelo CONTRATANTE:" },
    { titulo: "DO VALOR E PAGAMENTO", corpo: linhas.join("\n") },
    { titulo: "DOS PRAZOS", corpo: `A CONTRATADA se compromete a entregar os objetos do presente contrato ao CONTRATANTE em ${e.prazo || "prazo a combinar"}, contados a partir da assinatura do contrato e aprovação do projeto executivo.` },
    { titulo: "DA RESCISÃO CONTRATUAL", corpo: "O presente termo poderá ser rescindido por qualquer uma das partes por descumprimento de uma das cláusulas, mediante aviso prévio de 30 (trinta) dias, com a indenização da parte prejudicada no valor total do contrato ou por meio de acordo entre as duas partes." },
    { titulo: "DAS GARANTIAS", corpo: `A garantia do mobiliário em MDF será de ${e.garantiaMdf} e as ferragens ${e.garantiaFerragens}.` },
    { titulo: "DOS CASOS OMISSOS", corpo: "Os casos omissos neste contrato serão acordados entre as partes, via aditivo ao presente termo." },
    { titulo: "DA VIGÊNCIA", corpo: `O presente contrato é de ${e.vigencia}, podendo ser prorrogado em até um terço desse prazo, a critério de ambas as partes.` },
    { titulo: "DO FORO", corpo: `Fica eleito o foro da cidade de ${e.foro} para o julgamento de quaisquer problemas decorrentes do descumprimento do presente termo.` },
    { titulo: "DA PROTEÇÃO DE DADOS (SUGESTÃO, REVISAR)", corpo: "As partes tratarão os dados pessoais envolvidos neste contrato somente para a sua execução e para o cumprimento de obrigações legais, nos termos da Lei nº 13.709/2018 (LGPD)." },
  ];
}
