// Funções puras do cadastro de materiais (sem acesso a banco): leitura de números e planilhas, validação e custos de referência.

export const CATEGORIAS = ["chapa", "fita", "ferragem", "insumo", "embalagem"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const UNIDADES = ["un", "m", "m2", "chapa", "rolo", "kg", "l", "pct", "cx"] as const;

export type MaterialEntrada = {
  categoria: string; subcategoria: string | null; nome: string; marca: string | null; unidade: string;
  espessura_mm: number | null; largura_mm: number | null; comprimento_mm: number | null;
  cor: string | null; padrao: string | null; tem_veio: boolean; metragem_rolo_m: number | null;
  preco_compra: number; observacoes: string | null;
};
export type Validacao = { ok: true; valor: MaterialEntrada } | { ok: false; erros: string[] };

/** Lê número no formato brasileiro ou simples. Devolve NaN se não for número. Use vírgula para decimais. */
export function parseNumeroBR(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
  let t = String(valor ?? "").trim().replace(/[R$\s]/g, "");
  if (!t) return NaN;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export const normalizaCabecalho = (h: string) =>
  h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const ALIAS: Record<string, string> = {
  preco: "preco_compra", preco_unitario: "preco_compra", valor: "preco_compra",
  espessura: "espessura_mm", largura: "largura_mm", comprimento: "comprimento_mm",
  metragem: "metragem_rolo_m", metragem_rolo: "metragem_rolo_m", veio: "tem_veio", tipo: "subcategoria",
};

/** Lê CSV (vírgula, ponto e vírgula ou tab), com aspas, BOM e quebras de linha do Windows. */
export function parseCsv(texto: string): { linhas: Record<string, string>[]; delimitador: string } {
  const t = texto.replace(/^\uFEFF/, "");
  const primeira = t.split(/\r?\n/)[0] ?? "";
  const delimitador = primeira.includes(";") ? ";" : primeira.includes("\t") ? "\t" : ",";
  const registros: string[][] = [];
  let campo = ""; let reg: string[] = []; let aspas = false;
  const fecha = () => { reg.push(campo); campo = ""; if (reg.some((x) => x.trim() !== "")) registros.push(reg); reg = []; };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === delimitador) { reg.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; fecha(); }
    else campo += c;
  }
  if (campo !== "" || reg.length) fecha();
  if (registros.length < 2) return { linhas: [], delimitador };
  const cab = registros[0].map((h) => { const n = normalizaCabecalho(h); return ALIAS[n] ?? n; });
  const linhas = registros.slice(1).map((r) => {
    const o: Record<string, string> = {};
    cab.forEach((h, i) => { if (h) o[h] = (r[i] ?? "").trim(); });
    return o;
  });
  return { linhas, delimitador };
}

const vazio = (v: string | undefined) => (v ?? "").trim() === "";
const texto = (v: string | undefined) => ((v ?? "").trim() === "" ? null : (v ?? "").trim());

function booleano(v: string | undefined): boolean | null {
  const t = (v ?? "").trim().toLowerCase();
  if (t === "") return false;
  if (["sim", "s", "true", "1", "x"].includes(t)) return true;
  if (["nao", "não", "n", "false", "0"].includes(t)) return false;
  return null;
}

/** Valida e normaliza uma linha de material (vinda do formulário ou de planilha). Nada é presumido: o que falta vira erro. */
export function validarMaterial(l: Record<string, string>): Validacao {
  const erros: string[] = [];
  const categoria = (l.categoria ?? "").trim().toLowerCase();
  if (!(CATEGORIAS as readonly string[]).includes(categoria)) erros.push(`categoria inválida ("${l.categoria ?? ""}"); use ${CATEGORIAS.join(", ")}`);
  const nome = (l.nome ?? "").trim();
  if (nome.length < 2) erros.push("nome obrigatório");

  let unidade = (l.unidade ?? "").trim().toLowerCase();
  if (categoria === "chapa") { if (unidade && unidade !== "chapa") erros.push('chapa usa a unidade "chapa"'); unidade = "chapa"; }
  else if (categoria === "fita") { if (unidade && unidade !== "rolo") erros.push('fita usa a unidade "rolo"'); unidade = "rolo"; }
  else if (categoria === "ferragem") { if (!unidade) unidade = "un"; }
  if (categoria && !(UNIDADES as readonly string[]).includes(unidade)) erros.push(unidade ? `unidade inválida ("${unidade}")` : "unidade obrigatória");

  const num = (campo: string, rotulo: string, obrigatorio: boolean): number | null => {
    if (vazio(l[campo])) { if (obrigatorio) erros.push(`${rotulo} obrigatório`); return null; }
    const n = parseNumeroBR(l[campo]);
    if (!Number.isFinite(n) || n <= 0) { erros.push(`${rotulo} inválido ("${l[campo]}"): informe um número maior que zero`); return null; }
    return n;
  };
  const espessura = num("espessura_mm", "espessura (mm)", categoria === "chapa" || categoria === "fita");
  const largura = num("largura_mm", "largura (mm)", categoria === "chapa" || categoria === "fita");
  const comprimento = num("comprimento_mm", "comprimento (mm)", categoria === "chapa");
  const metragem = num("metragem_rolo_m", "metragem do rolo (m)", categoria === "fita");

  let preco = 0;
  if (vazio(l.preco_compra)) erros.push("preço de compra obrigatório");
  else { preco = parseNumeroBR(l.preco_compra); if (!Number.isFinite(preco) || preco < 0) { erros.push(`preço inválido ("${l.preco_compra}")`); preco = 0; } }

  const veio = booleano(l.tem_veio);
  if (veio === null) erros.push(`"tem veio" inválido ("${l.tem_veio}"); use sim ou não`);

  if (erros.length) return { ok: false, erros };
  return {
    ok: true,
    valor: {
      categoria, subcategoria: texto(l.subcategoria), nome, marca: texto(l.marca), unidade,
      espessura_mm: espessura, largura_mm: largura, comprimento_mm: comprimento,
      cor: texto(l.cor), padrao: texto(l.padrao), tem_veio: veio === true, metragem_rolo_m: metragem,
      preco_compra: preco, observacoes: texto(l.observacoes),
    },
  };
}

/** Arredonda para evitar sobras de ponto flutuante (ex.: 100.00000000000001). */
export const arredonda = (n: number, casas = 4): number => Math.round((n + Number.EPSILON) * 10 ** casas) / 10 ** casas;

/** Custo de referência na unidade de uso: chapa por m², fita por metro, demais por unidade de compra. */
export function custoReferencia(m: { categoria: string; unidade: string; preco_compra: number; largura_mm?: number | null; comprimento_mm?: number | null; metragem_rolo_m?: number | null }): { valor: number; unidade: string } | null {
  const p = Number(m.preco_compra);
  if (!Number.isFinite(p)) return null;
  if (m.categoria === "chapa") {
    const area = ((Number(m.largura_mm) || 0) * (Number(m.comprimento_mm) || 0)) / 1e6;
    return area > 0 ? { valor: arredonda(p / area), unidade: "m²" } : null;
  }
  if (m.categoria === "fita") {
    const met = Number(m.metragem_rolo_m) || 0;
    return met > 0 ? { valor: arredonda(p / met), unidade: "m" } : null;
  }
  return { valor: p, unidade: m.unidade };
}

export const variacaoPercentual = (atual: number, anterior: number): number | null =>
  anterior > 0 ? arredonda(((atual - anterior) / anterior) * 100, 2) : null;

export function diasDesde(dataISO: string | null | undefined, hoje: Date = new Date()): number | null {
  if (!dataISO) return null;
  const d = new Date(dataISO.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((h.getTime() - d.getTime()) / 86400000);
}

export const MODELO_CSV =
  "categoria;subcategoria;nome;marca;fornecedor;unidade;espessura_mm;largura_mm;comprimento_mm;cor;padrao;tem_veio;metragem_rolo_m;preco_compra;observacoes\n";
