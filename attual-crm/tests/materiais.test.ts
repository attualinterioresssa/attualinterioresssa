import test from "node:test";
import assert from "node:assert/strict";
import { parseNumero, parseCsv, validarMaterial, lerPlanilhaMateriais, chaveMaterial } from "../lib/engenharia/materiais.ts";

test("parseNumero: formatos brasileiros e simples", () => {
  assert.equal(parseNumero("1.234,56"), 1234.56);
  assert.equal(parseNumero("R$ 1.234,56"), 1234.56);
  assert.equal(parseNumero("12,5"), 12.5);
  assert.equal(parseNumero("12.5"), 12.5);
  assert.equal(parseNumero("2.750"), 2750);       // milhar
  assert.equal(parseNumero("1.234.567"), 1234567);
  assert.equal(parseNumero("0.125"), 0.125);      // decimal, não milhar
  assert.equal(parseNumero("18"), 18);
  assert.equal(parseNumero(""), null);
  assert.equal(parseNumero("abc"), null);
  assert.equal(parseNumero("12,3,4"), null);      // ambíguo: recusa em vez de adivinhar
});

test("parseCsv: BOM, ponto e vírgula, aspas, CRLF e linhas vazias", () => {
  const r = parseCsv('\ufeffnome;preco\r\n"Cola, branca";"1,50"\r\n\r\nSilicone;2,00\r\n');
  assert.deepEqual(r, [["nome", "preco"], ["Cola, branca", "1,50"], ["Silicone", "2,00"]]);
  assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv('a;b\n"ele disse ""oi""";2'), [["a", "b"], ['ele disse "oi"', "2"]]);
});

test("validarMaterial: chapa e fita exigem medidas; unidade padrão", () => {
  const ok = validarMaterial({ categoria: "MDF", nome: "TESTE MDF 18mm", espessura_mm: "18", largura_mm: "1.840", comprimento_mm: "2.750", preco_compra: "R$ 250,00" });
  assert.deepEqual(ok.erros, []);
  assert.equal(ok.valor?.categoria, "chapa");
  assert.equal(ok.valor?.unidade, "chapa");
  assert.equal(ok.valor?.largura_mm, 1840);
  assert.equal(ok.valor?.comprimento_mm, 2750);
  assert.equal(ok.valor?.preco_compra, 250);

  const semLargura = validarMaterial({ categoria: "chapa", nome: "x", espessura_mm: "18", comprimento_mm: "2750", preco_compra: "1" });
  assert.ok(semLargura.erros.includes("Chapa exige largura"));
  assert.equal(semLargura.valor, undefined);

  const fita = validarMaterial({ categoria: "fita de borda", nome: "TESTE fita", espessura_mm: "0,45", largura_mm: "22", metragem_rolo_m: "150", preco_compra: "80,5" });
  assert.deepEqual(fita.erros, []);
  assert.equal(fita.valor?.unidade, "rolo");
  assert.equal(fita.valor?.espessura_mm, 0.45);
  assert.ok(validarMaterial({ categoria: "fita", nome: "x", espessura_mm: "1", largura_mm: "22", preco_compra: "1" }).erros.includes("Fita exige a metragem do rolo"));
});

test("validarMaterial: preço, categoria, unidade e veio", () => {
  assert.ok(validarMaterial({ categoria: "ferragem", nome: "x", unidade: "un" }).erros.includes("Preço de compra ausente"));
  assert.ok(validarMaterial({ categoria: "ferragem", nome: "x", unidade: "un", preco_compra: "-1" }).erros[0].startsWith("Preço de compra inválido"));
  assert.ok(validarMaterial({ categoria: "xyz", nome: "x", unidade: "un", preco_compra: "1" }).erros[0].startsWith("Categoria inválida"));
  assert.ok(validarMaterial({ categoria: "ferragem", nome: "x", preco_compra: "1" }).erros.includes("Unidade ausente"));
  assert.ok(validarMaterial({ categoria: "ferragem", nome: "x", unidade: "balde", preco_compra: "1" }).erros[0].startsWith("Unidade inválida"));
  assert.equal(validarMaterial({ categoria: "insumo", nome: "x", unidade: "Litro", preco_compra: "10", tem_veio: "Sim" }).valor?.tem_veio, true);
  assert.equal(validarMaterial({ categoria: "insumo", nome: "x", unidade: "m²", preco_compra: "10" }).valor?.unidade, "m2");
  assert.ok(validarMaterial({ categoria: "chapa", nome: "x", unidade: "rolo", espessura_mm: "1", largura_mm: "1", comprimento_mm: "1", preco_compra: "1" }).erros.length > 0);
});

test("lerPlanilhaMateriais: cabeçalho com acento, erros por linha e duplicidade", () => {
  const csv = [
    "Categoria;Nome;Fornecedor;Espessura;Largura;Comprimento;Preço",
    "chapa;TESTE MDF 18mm;Forn A;18;1840;2750;250,00",
    "chapa;TESTE MDF sem largura;Forn A;18;;2750;250,00",
    "balde;Qualquer;Forn B;;;;10",
  ].join("\n");
  const r = lerPlanilhaMateriais(csv);
  assert.deepEqual(r.cabecalhoFaltando, []);
  assert.equal(r.linhas.length, 3);
  assert.equal(r.linhas[0].erros.length, 0);
  assert.equal(r.linhas[0].fornecedor, "Forn A");
  assert.equal(r.linhas[1].linha, 3);
  assert.ok(r.linhas[1].erros.includes("Chapa exige largura"));
  assert.ok(r.linhas[2].erros[0].startsWith("Categoria inválida"));
  assert.equal(lerPlanilhaMateriais("nome;preco\nx;1").cabecalhoFaltando[0], "categoria");

  const a = chaveMaterial({ categoria: "chapa", nome: " TESTE MDF 18mm ", fornecedor: "Forn A", espessura_mm: 18 });
  const b = chaveMaterial({ categoria: "chapa", nome: "teste mdf 18mm", marca: "", fornecedor: "forn a", espessura_mm: 18 });
  assert.equal(a, b);
});
