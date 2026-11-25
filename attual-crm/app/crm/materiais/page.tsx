"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";

const ABAS = [
  { id: "mdf", nome: "MDF e chapas", categoria: "chapa", subs: ["mdf"], unidades: ["chapa"] },
  { id: "fita", nome: "Fitas de borda", categoria: "fita", subs: ["fita"], unidades: ["rolo", "m"] },
  { id: "dobradica", nome: "Dobradiças", categoria: "ferragem", subs: ["dobradica"], unidades: ["un", "pct", "cx"] },
  { id: "corredica", nome: "Corrediças", categoria: "ferragem", subs: ["corredica"], unidades: ["un", "pct", "cx"] },
  { id: "calco", nome: "Calços e suportes", categoria: "ferragem", subs: ["calco_prateleira", "suporte"], unidades: ["un", "pct", "cx"] },
  { id: "outras", nome: "Outras ferragens", categoria: "ferragem", subs: ["puxador", "pistao", "basculante", "minifix", "cavilha", "parafuso", "acessorio"], unidades: ["un", "pct", "cx"] },
  { id: "insumo", nome: "Insumos", categoria: "insumo", subs: ["cola", "silicone", "solvente", "acabamento", "outro"], unidades: ["un", "kg", "l", "pct", "cx"] },
  { id: "emb", nome: "Embalagens", categoria: "embalagem", subs: ["plastico-bolha", "filme-stretch", "papelao", "cantoneira", "fita-adesiva", "protecao"], unidades: ["un", "m", "m2", "rolo", "pct"] },
  { id: "ferramenta", nome: "Ferramentas", categoria: "ferramenta", subs: ["ferramenta"], unidades: ["un"] },
];
const TODAS_SUBS = ABAS.flatMap((a) => a.subs.map((s) => ({ cat: a.categoria, sub: s })));
const UNIDADES = ["un", "m", "m2", "chapa", "rolo", "kg", "l", "pct", "cx"];
const CATEGORIAS = ["chapa", "fita", "ferragem", "insumo", "embalagem", "ferramenta"];
const VAZIO: any = { id: null, nome: "", marca: "", fornecedor_id: "", subcategoria: "", unidade: "", espessura_mm: "", largura_mm: "", comprimento_mm: "", cor: "", padrao: "", tem_veio: false, metragem_rolo_m: "", preco_compra: "", observacoes: "", ativo: true };

// Aceita "245,90", "245.90" e "1840". Retorna null se vazio e NaN se inválido.
const num = (s: any): number | null => {
  if (s === "" || s === null || s === undefined) return null;
  const t = String(s).trim();
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : NaN;
};

export default function Materiais() {
  return <AuthGate><Tela /></AuthGate>;
}

function Tela() {
  const [secao, setSecao] = useState<"materiais" | "fornecedores">("materiais");
  const [aba, setAba] = useState("mdf");
  const [admin, setAdmin] = useState(false);
  const [itens, setItens] = useState<any[]>([]);
  const [forn, setForn] = useState<any[]>([]);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [fEdit, setFEdit] = useState<any>(null);
  const [hist, setHist] = useState<{ nome: string; linhas: any[] } | null>(null);
  const [msg, setMsg] = useState("");
  const A = ABAS.find((a) => a.id === aba) ?? ABAS[0];

  useEffect(() => { sb.rpc("is_admin").then((r) => setAdmin(r.data === true)); }, []);

  const load = useCallback(async () => {
    const [m, f] = await Promise.all([
      sb.from("eng_materiais").select("*").order("nome"),
      sb.from("eng_fornecedores").select("*").order("nome"),
    ]);
    const err = m.error ?? f.error;
    if (err) setMsg(err.message);
    setItens(m.data ?? []); setForn(f.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const visiveis = useMemo(() => itens.filter((i) =>
    i.categoria === A.categoria && A.subs.includes(i.subcategoria) &&
    (mostrarInativos || i.ativo) &&
    (!busca || `${i.nome} ${i.marca ?? ""} ${i.cor ?? ""}`.toLowerCase().includes(busca.toLowerCase()))
  ), [itens, A, mostrarInativos, busca]);

  const nomeForn = (id: string | null) => forn.find((f) => f.id === id)?.nome ?? "—";

  function abrirEdicao(it?: any) {
    if (!it) { setEdit({ ...VAZIO, subcategoria: A.subs[0], unidade: A.unidades[0] }); return; }
    setEdit({ ...VAZIO, ...it,
      fornecedor_id: it.fornecedor_id ?? "", marca: it.marca ?? "", espessura_mm: it.espessura_mm ?? "",
      largura_mm: it.largura_mm ?? "", comprimento_mm: it.comprimento_mm ?? "", metragem_rolo_m: it.metragem_rolo_m ?? "",
      cor: it.cor ?? "", padrao: it.padrao ?? "", observacoes: it.observacoes ?? "", preco_compra: String(it.preco_compra ?? "") });
  }

  async function salvar() {
    const e = edit;
    if (!e.nome.trim()) { setMsg("Informe o nome do item."); return; }
    const numeros = {
      espessura_mm: num(e.espessura_mm), largura_mm: num(e.largura_mm), comprimento_mm: num(e.comprimento_mm),
      metragem_rolo_m: num(e.metragem_rolo_m), preco_compra: num(e.preco_compra) ?? 0,
    };
    if (Object.values(numeros).some((v) => Number.isNaN(v))) { setMsg("Confira os números. Use vírgula para decimais, ex.: 18,5."); return; }
    if (A.categoria === "chapa" && (!numeros.espessura_mm || !numeros.largura_mm || !numeros.comprimento_mm)) { setMsg("Chapa precisa de espessura, largura e comprimento."); return; }
    if (A.categoria === "fita" && (!numeros.espessura_mm || !numeros.largura_mm || !numeros.metragem_rolo_m)) { setMsg("Fita precisa de espessura, largura e metragem do rolo."); return; }
    const p = {
      categoria: A.categoria, subcategoria: e.subcategoria || A.subs[0], nome: e.nome.trim(),
      marca: e.marca.trim() || null, fornecedor_id: e.fornecedor_id || null, unidade: e.unidade || A.unidades[0],
      ...numeros, cor: e.cor.trim() || null, padrao: e.padrao.trim() || null,
      tem_veio: !!e.tem_veio, observacoes: e.observacoes.trim() || null, ativo: !!e.ativo,
    };
    const r = e.id
      ? await sb.from("eng_materiais").update(p).eq("id", e.id)
      : await sb.from("eng_materiais").insert(p);
    if (r.error) { setMsg(r.error.message); return; }
    setEdit(null); setMsg("Item salvo."); load();
  }

  async function remover(it: any) {
    if (!window.confirm(`Remover "${it.nome}"? O item e o histórico de preços dele serão apagados.`)) return;
    const r = await sb.from("eng_materiais").delete().eq("id", it.id);
    if (r.error) {
      setMsg(r.error.code === "23503"
        ? "Este item já foi usado em estoque ou em cálculo, então não pode ser apagado. Use “Desativar”."
        : r.error.message);
      return;
    }
    setMsg("Item removido."); load();
  }
  async function alternarAtivo(it: any) {
    const r = await sb.from("eng_materiais").update({ ativo: !it.ativo }).eq("id", it.id);
    if (r.error) setMsg(r.error.message); else load();
  }
  async function verHistorico(it: any) {
    const r = await sb.from("eng_precos_historico").select("*").eq("material_id", it.id).order("data_preco", { ascending: false });
    setHist({ nome: it.nome, linhas: r.data ?? [] });
  }

  async function importar(file: File | null) {
    if (!file) return;
    const txt = (await file.text()).replace(/^\uFEFF/, "");
    const linhas = txt.split(/\r?\n/).filter((l) => l.trim());
    if (linhas.length < 2) { setMsg("Planilha vazia."); return; }
    const sep = linhas[0].includes(";") ? ";" : ",";
    const cab = linhas[0].split(sep).map((h) => h.trim().toLowerCase());
    const porNome = new Map(forn.map((f) => [f.nome.trim().toLowerCase(), f.id]));
    const lote: any[] = []; const erros: string[] = [];
    linhas.slice(1).forEach((l, i) => {
      const c = l.split(sep);
      const g = (k: string) => { const j = cab.indexOf(k); return j >= 0 ? (c[j] ?? "").trim() : ""; };
      const ln = i + 2;
      const cat = g("categoria").toLowerCase();
      const sub = g("subcategoria").toLowerCase();
      const nome = g("nome");
      if (!nome) { erros.push(`linha ${ln}: sem nome`); return; }
      if (!CATEGORIAS.includes(cat)) { erros.push(`linha ${ln}: categoria inválida “${cat}”`); return; }
      if (!TODAS_SUBS.some((x) => x.cat === cat && x.sub === sub)) { erros.push(`linha ${ln}: subcategoria “${sub}” não existe em ${cat}`); return; }
      const un = (g("unidade_compra") || "un").toLowerCase();
      if (!UNIDADES.includes(un)) { erros.push(`linha ${ln}: unidade inválida “${un}”`); return; }
      const vals = {
        espessura_mm: num(g("espessura_mm")), largura_mm: num(g("largura_mm")), comprimento_mm: num(g("comprimento_mm")),
        metragem_rolo_m: num(g("metragem_rolo_m")), preco_compra: num(g("preco_compra")) ?? 0,
      };
      if (Object.values(vals).some((v) => Number.isNaN(v))) { erros.push(`linha ${ln}: número inválido`); return; }
      if (cat === "chapa" && (!vals.espessura_mm || !vals.largura_mm || !vals.comprimento_mm)) { erros.push(`linha ${ln}: chapa sem medidas`); return; }
      if (cat === "fita" && (!vals.espessura_mm || !vals.largura_mm || !vals.metragem_rolo_m)) { erros.push(`linha ${ln}: fita sem medidas ou metragem do rolo`); return; }
      const fn = g("fornecedor").toLowerCase();
      if (fn && !porNome.has(fn)) erros.push(`linha ${ln}: fornecedor “${g("fornecedor")}” não cadastrado (importado sem fornecedor)`);
      lote.push({
        categoria: cat, subcategoria: sub, nome, marca: g("marca") || null, fornecedor_id: porNome.get(fn) ?? null,
        unidade: un, ...vals, cor: g("cor") || null, padrao: g("padrao") || null,
        tem_veio: /^(sim|s|true|1)$/i.test(g("tem_veio")), observacoes: g("observacoes") || null,
      });
    });
    if (lote.length) {
      const r = await sb.from("eng_materiais").insert(lote);
      if (r.error) { setMsg(r.error.message); return; }
    }
    setMsg(`${lote.length} itens importados.` + (erros.length ? ` ${erros.length} linha(s) ignoradas: ${erros.slice(0, 5).join("; ")}${erros.length > 5 ? "..." : ""}` : ""));
    load();
  }

  async function salvarForn() {
    if (!fEdit.nome.trim()) { setMsg("Informe o nome do fornecedor."); return; }
    const p = {
      nome: fEdit.nome.trim(), contato: fEdit.contato.trim() || null, telefone: fEdit.telefone.trim() || null,
      email: fEdit.email.trim() || null, observacoes: fEdit.observacoes.trim() || null,
    };
    const r = fEdit.id
      ? await sb.from("eng_fornecedores").update(p).eq("id", fEdit.id)
      : await sb.from("eng_fornecedores").insert(p);
    if (r.error) { setMsg(r.error.message.includes("duplicate") ? "Já existe um fornecedor com esse nome." : r.error.message); return; }
    setFEdit(null); setMsg("Fornecedor salvo."); load();
  }
  async function removerForn(f: any) {
    if (!window.confirm(`Remover o fornecedor “${f.nome}”? Os materiais dele continuam cadastrados, sem fornecedor.`)) return;
    const r = await sb.from("eng_fornecedores").delete().eq("id", f.id);
    if (r.error) setMsg(r.error.message); else { setMsg("Fornecedor removido."); load(); }
  }

  const campo = (k: string, t: string, tipo = "text") => (
    <div className="f" key={k}><label>{t}</label>
      <input type={tipo} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
  );
  const fcampo = (k: string, t: string) => (
    <div className="f" key={k}><label>{t}</label>
      <input value={fEdit[k] ?? ""} onChange={(e) => setFEdit({ ...fEdit, [k]: e.target.value })} /></div>
  );

  return (
    <>
      <h2>Materiais e fornecedores</h2>
      <div className="linha">
        <button className={`btn ${secao === "materiais" ? "" : "ghost"} small`} onClick={() => setSecao("materiais")}>Materiais</button>
        <button className={`btn ${secao === "fornecedores" ? "" : "ghost"} small`} onClick={() => setSecao("fornecedores")}>Fornecedores</button>
      </div>
      {!admin && <p className="note">Modo de leitura. Somente o administrador cadastra, altera ou remove itens.</p>}
      {msg && <p className="note">{msg}</p>}

      {secao === "materiais" && (
        <>
          <div className="linha" style={{ flexWrap: "wrap" }}>
            {ABAS.map((a) => (
              <button key={a.id} className={`btn ${aba === a.id ? "" : "ghost"} small`} onClick={() => { setAba(a.id); setEdit(null); setMsg(""); }}>{a.nome}</button>
            ))}
          </div>
          {A.id === "ferramenta" && <p className="note">Ferramentas não entram no custo por peça. Entram nos custos indiretos, na formação de preço (etapa 7).</p>}
          <div className="linha" style={{ flexWrap: "wrap" }}>
            <input placeholder="Buscar por nome, marca ou cor" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <label className="chk"><input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} />Mostrar desativados</label>
            {admin && <button className="btn small" onClick={() => abrirEdicao()}>Novo item</button>}
            {admin && <label className="note">Importar planilha (CSV) <input type="file" accept=".csv,text/csv" onChange={(e) => { importar(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>}
          </div>

          {edit && admin && (
            <div className="card" style={{ cursor: "default", marginBottom: 14 }}>
              <b>{edit.id ? "Editar item" : `Novo item em ${A.nome}`}</b>
              {campo("nome", "Nome (ex.: MDF Areal Bold 18 mm)")}
              <div className="f"><label>Subcategoria</label>
                <select value={edit.subcategoria || A.subs[0]} onChange={(e) => setEdit({ ...edit, subcategoria: e.target.value })}>
                  {A.subs.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
              <div className="f"><label>Fornecedor</label>
                <select value={edit.fornecedor_id ?? ""} onChange={(e) => setEdit({ ...edit, fornecedor_id: e.target.value })}>
                  <option value="">Sem fornecedor</option>{forn.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
              <div className="f"><label>Unidade de compra</label>
                <select value={edit.unidade || A.unidades[0]} onChange={(e) => setEdit({ ...edit, unidade: e.target.value })}>
                  {A.unidades.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              {campo("marca", "Marca")}
              <div className="linha">{campo("espessura_mm", "Espessura (mm)")}{campo("largura_mm", "Largura (mm)")}{campo("comprimento_mm", "Comprimento (mm)")}</div>
              {campo("metragem_rolo_m", "Metragem do rolo (m), só para fita")}
              <div className="linha">{campo("cor", "Cor")}{campo("padrao", "Padrão")}</div>
              {campo("preco_compra", "Preço por unidade de compra (R$)")}
              <label className="chk"><input type="checkbox" checked={!!edit.tem_veio} onChange={(e) => setEdit({ ...edit, tem_veio: e.target.checked })} />Tem veio</label>
              {campo("observacoes", "Observações")}
              <div className="linha"><button className="btn small" onClick={salvar}>Salvar</button><button className="btn ghost small" onClick={() => setEdit(null)}>Cancelar</button></div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table className="tab">
              <thead><tr><th>Nome</th><th>Marca</th><th>Fornecedor</th><th>Subcategoria</th><th>Medidas</th><th>Preço</th><th>Situação</th><th></th></tr></thead>
              <tbody>
                {visiveis.map((it) => (
                  <tr key={it.id}>
                    <td>{it.nome}</td>
                    <td>{it.marca ?? "—"}</td>
                    <td>{nomeForn(it.fornecedor_id)}</td>
                    <td>{it.subcategoria}</td>
                    <td>{[it.espessura_mm, it.largura_mm, it.comprimento_mm].every((v) => v) ? `${it.espessura_mm} × ${it.largura_mm} × ${it.comprimento_mm} mm` : it.metragem_rolo_m ? `${it.espessura_mm ?? "?"} × ${it.largura_mm ?? "?"} mm · ${it.metragem_rolo_m} m` : "—"}</td>
                    <td>{brl(Number(it.preco_compra))} / {it.unidade}</td>
                    <td><span className="badge">{it.ativo ? "em uso" : "desativado"}</span></td>
                    <td className="linha" style={{ whiteSpace: "nowrap" }}>
                      <button className="btn ghost small" onClick={() => verHistorico(it)}>Histórico</button>
                      {admin && <button className="btn ghost small" onClick={() => abrirEdicao(it)}>Editar</button>}
                      {admin && <button className="btn ghost small" onClick={() => alternarAtivo(it)}>{it.ativo ? "Desativar" : "Reativar"}</button>}
                      {admin && <button className="btn ghost small" onClick={() => remover(it)}>Remover</button>}
                    </td>
                  </tr>
                ))}
                {visiveis.length === 0 && <tr><td colSpan={8} className="note">Nenhum item nesta aba ainda.</td></tr>}
              </tbody>
            </table>
          </div>

          {hist && (
            <div className="card" style={{ cursor: "default", marginTop: 14 }}>
              <b>Histórico de preços: {hist.nome}</b>
              {hist.linhas.length === 0 && <p className="note">Sem registros.</p>}
              {hist.linhas.map((h) => <p key={h.id} className="note">{new Date(h.data_preco + "T00:00").toLocaleDateString("pt-BR")} · {brl(Number(h.preco))}</p>)}
              <button className="btn ghost small" onClick={() => setHist(null)}>Fechar</button>
            </div>
          )}
          <p className="note">Formato da planilha: colunas categoria; subcategoria; nome; marca; fornecedor; unidade_compra; espessura_mm; largura_mm; comprimento_mm; cor; padrao; tem_veio; metragem_rolo_m; preco_compra; observacoes. Separador ponto e vírgula, preço com vírgula decimal.</p>
        </>
      )}

      {secao === "fornecedores" && (
        <>
          {admin && <button className="btn small" onClick={() => setFEdit({ id: null, nome: "", contato: "", telefone: "", email: "", observacoes: "" })}>Novo fornecedor</button>}
          {fEdit && admin && (
            <div className="card" style={{ cursor: "default", marginTop: 12 }}>
              <b>{fEdit.id ? "Editar fornecedor" : "Novo fornecedor"}</b>
              {fcampo("nome", "Nome")}{fcampo("contato", "Pessoa de contato")}{fcampo("telefone", "Telefone")}{fcampo("email", "E-mail")}{fcampo("observacoes", "Observações")}
              <div className="linha"><button className="btn small" onClick={salvarForn}>Salvar</button><button className="btn ghost small" onClick={() => setFEdit(null)}>Cancelar</button></div>
            </div>
          )}
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table className="tab">
              <thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th></th></tr></thead>
              <tbody>
                {forn.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nome}</td><td>{f.contato ?? "—"}</td><td>{f.telefone ?? "—"}</td><td>{f.email ?? "—"}</td>
                    <td className="linha" style={{ whiteSpace: "nowrap" }}>
                      {admin && <button className="btn ghost small" onClick={() => setFEdit({ ...f, contato: f.contato ?? "", telefone: f.telefone ?? "", email: f.email ?? "", observacoes: f.observacoes ?? "" })}>Editar</button>}
                      {admin && <button className="btn ghost small" onClick={() => removerForn(f)}>Remover</button>}
                    </td>
                  </tr>
                ))}
                {forn.length === 0 && <tr><td colSpan={5} className="note">Nenhum fornecedor cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
