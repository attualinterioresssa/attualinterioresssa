import test from "node:test";
import assert from "node:assert/strict";
import { parseNumeroBR, parseCsv, validarMaterial, custoReferencia, variacaoPercentual, diasDesde } from "../../lib/engenharia/materiais.ts";

test("parseNumeroBR lê formatos brasileiros e simples", () => {
  assert.equal(parseNumeroBR("1.234,56"), 1234.56);
  assert.equal(parseNumeroBR("1,5"), 1.5);
  assert.equal(parseNumeroBR("R$ 100"), 100);
  assert.equal(parseNumeroBR("0.45"), 0.45);
  assert.equal(parseNumeroBR("0.450"), 0.45);
  assert.equal(parseNumeroBR("1.840"), 1840);
  assert.equal(parseNumeroBR(2750), 2750);
  assert.ok(Number.isNaN(parseNumeroBR("")));
  assert.ok(Number.isNaN(parseNumeroBR("abc")));
});

test("parseCsv: ponto e vírgula, aspas, BOM, CRLF e linhas em branco", () => {
  const csv = '\uFEFFCategoria;Nome;Preço\r\nchapa;"MDF; branco ""TX""";1.234,50\r\n\r\nfita;Fita 22mm;80\r\n';
  const { linhas, delimitador } = parseCsv(csv);
  assert.equal(delimitador, ";");
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].nome, 'MDF; branco "TX"');
  assert.equal(linhas[0].preco_compra, "1.234,50");
  assert.equal(linhas[1].categoria, "fita");
});

test("parseCsv: separador vírgula e arquivo sem dados", () => {
  assert.equal(parseCsv("categoria,nome\nchapa,A").linhas[0].nome, "A");
  assert.equal(parseCsv("categoria,nome\n").linhas.length, 0);
});

test("validarMaterial: chapa válida", () => {
  const r = validarMaterial({ categoria: "chapa", nome: "MDF teste", espessura_mm: "18", largura_mm: "1840", comprimento_mm: "2750", preco_compra: "506,00", tem_veio: "sim" });
  assert.equal(r.ok, true);
  assert.equal(r.valor.unidade, "chapa");
  assert.equal(r.valor.tem_veio, true);
  assert.equal(r.valor.preco_compra, 506);
});

test("validarMaterial: recusa o que falta, sem presumir", () => {
  assert.equal(validarMaterial({ categoria: "chapa", nome: "MDF", largura_mm: "1840", comprimento_mm: "2750", preco_compra: "10" }).ok, false);
  const fita = validarMaterial({ categoria: "fita", nome: "Fita", unidade: "m", espessura_mm: "1", largura_mm: "22", metragem_rolo_m: "50", preco_compra: "10" });
  assert.equal(fita.ok, false);
  assert.ok(fita.erros.some((e) => e.includes("rolo")));
  assert.equal(validarMaterial({ categoria: "insumo", nome: "Cola", preco_compra: "10" }).ok, false);
  assert.equal(validarMaterial({ categoria: "ferragem", nome: "Dobradiça", preco_compra: "-1" }).ok, false);
  assert.equal(validarMaterial({ categoria: "ferragem", nome: "Dobradiça" }).ok, false);
  assert.equal(validarMaterial({ categoria: "outra", nome: "X", unidade: "un", preco_compra: "1" }).ok, false);
  assert.equal(validarMaterial({ categoria: "ferragem", nome: "Puxador", preco_compra: "5", tem_veio: "talvez" }).ok, false);
});

test("validarMaterial: ferragem usa 'un' por padrão", () => {
  const r = validarMaterial({ categoria: "ferragem", nome: "Dobradiça", preco_compra: "3,5" });
  assert.equal(r.ok, true);
  assert.equal(r.valor.unidade, "un");
});

test("custoReferencia: chapa por m², fita por metro, demais por unidade", () => {
  assert.equal(custoReferencia({ categoria: "chapa", unidade: "chapa", preco_compra: 506, largura_mm: 1840, comprimento_mm: 2750 }).valor, 100);
  const f = custoReferencia({ categoria: "fita", unidade: "rolo", preco_compra: 100, metragem_rolo_m: 50 });
  assert.equal(f.valor, 2); assert.equal(f.unidade, "m");
  assert.deepEqual(custoReferencia({ categoria: "ferragem", unidade: "un", preco_compra: 4 }), { valor: 4, unidade: "un" });
  assert.equal(custoReferencia({ categoria: "chapa", unidade: "chapa", preco_compra: 10 }), null);
});

test("variação de preço e idade do preço", () => {
  assert.equal(variacaoPercentual(120, 100), 20);
  assert.equal(variacaoPercentual(80, 100), -20);
  assert.equal(variacaoPercentual(10, 0), null);
  assert.equal(diasDesde("2026-11-14", new Date(2026, 10, 24)), 10);
  assert.equal(diasDesde(null), null);
});
