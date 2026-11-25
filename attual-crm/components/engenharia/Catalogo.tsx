"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";
import { useEhAdmin } from "./useAdmin";
import { MODELO_CSV, UNIDADES, arredonda, custoReferencia, diasDesde, parseCsv, validarMaterial, variacaoPercentual } from "@/lib/engenharia/materiais";

const ROT: Record<string, string> = { chapa: "Chapas (MDF e similares)", fita: "Fitas de borda", ferragem: "Ferragens e acessórios", insumo: "Insumos", embalagem: "Embalagens" };
const SUG: Record<string, string[]> = {
  chapa: ["MDF", "MDP", "Compensado"], fita: ["PVC", "ABS"],
  ferragem: ["Dobradiça", "Corrediça telescópica", "Corrediça oculta", "Corrediça com amortecimento", "Puxador", "Pistão", "Sistema basculante", "Minifix", "Cavilha", "Parafuso", "Suporte", "Acessório"],
  insumo: ["Cola", "Silicone", "Solvente", "Acabamento"],
  embalagem: ["Plástico-bolha", "Filme stretch", "Papelão", "Cantoneira", "Fita adesiva", "Proteção especial"],
};
const unidadePadrao = (c: string) => (c === "chapa" ? "chapa" : c === "fita" ? "rolo" : c === "ferragem" ? "un" : "");
const novo = (c: string): Record<string, string> => ({ categoria: c, subcategoria: "", nome: "", marca: "", fornecedor_id: "", unidade: unidadePadrao(c), espessura_mm: "", largura_mm: "", comprimento_mm: "", cor: "", padrao: "", tem_veio: "", metragem_rolo_m: "", preco_compra: "", observacoes: "" });
const fmt = (n: any) => (n == null ? "" : String(n).replace(".", ","));

export default function Catalogo({ categorias }: { categorias: string[] }) {
  const chave = categorias.join(",");
  const admin = useEhAdmin();
  const [mats, setMats] = useState<any[]>([]);
  const [forn, setForn] = useState<any[]>([]);
  const [cat, setCat] = useState(categorias[0]);
  const [f, setF] = useState<Record<string, string> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [hist, setHist] = useState<{ id: string; itens: any[] } | null>(null);
  const [msg, setMsg] = useState("");
  const [relat, setRelat] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [inativos, setInativos] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      sb.from("eng_materiais").select("*,fornecedor:eng_fornecedores(nome)").in("categoria", chave.split(",")).order("nome"),
      sb.from("eng_fornecedores").select("id,nome").eq("ativo", true).order("nome"),
    ]);
    if (a.error) setMsg(a.error.message); else setMats(a.data ?? []);
    setForn(b.data ?? []);
  }, [chave]);
  useEffect(() => { load(); }, [load]);

  const visiveis = useMemo(() => mats.filter((m) => m.categoria === cat && (inativos || m.ativo) &&
    (!busca || `${m.nome} ${m.marca ?? ""} ${m.cor ?? ""} ${m.padrao ?? ""} ${m.subcategoria ?? ""}`.toLowerCase().includes(busca.toLowerCase()))), [mats, cat, busca, inativos]);

  const uid = async () => (await sb.auth.getUser()).data.user?.id ?? null;
  const set = (k: string) => (e: any) => setF({ ...(f as Record<string, string>), [k]: e.target.value });

  async function salvar() {
    if (!f) return;
    const v = validarMaterial(f);
    if (!v.ok) { setMsg(v.erros.join("; ")); return; }
    const dup = mats.some((m) => m.id !== editId && m.categoria === v.valor.categoria && m.nome.toLowerCase() === v.valor.nome.toLowerCase()
      && (m.marca ?? "").toLowerCase() === (v.valor.marca ?? "").toLowerCase() && Number(m.espessura_mm ?? 0) === Number(v.valor.espessura_mm ?? 0) && (m.cor ?? "") === (v.valor.cor ?? ""));
    if (dup) { setMsg("Já existe um material igual (mesmo nome, marca, espessura e cor)."); return; }
    const dados = { ...v.valor, fornecedor_id: f.fornecedor_id || null };
    const r = editId ? await sb.from("eng_materiais").update(dados).eq("id", editId) : await sb.from("eng_materiais").insert({ ...dados, created_by: await uid() });
    if (r.error) { setMsg(r.error.message.includes("row-level security") ? "Só o administrador pode cadastrar ou alterar materiais e preços." : r.error.message); return; }
    setMsg(editId ? "Material atualizado. Se o preço mudou, o histórico foi registrado." : "Material cadastrado."); setF(null); setEditId(null); load();
  }
  function editar(m: any) {
    setEditId(m.id); setCat(m.categoria);
    setF({ categoria: m.categoria, subcategoria: m.subcategoria ?? "", nome: m.nome, marca: m.marca ?? "", fornecedor_id: m.fornecedor_id ?? "", unidade: m.unidade,
      espessura_mm: fmt(m.espessura_mm), largura_mm: fmt(m.largura_mm), comprimento_mm: fmt(m.comprimento_mm), cor: m.cor ?? "", padrao: m.padrao ?? "",
      tem_veio: m.tem_veio ? "sim" : "", metragem_rolo_m: fmt(m.metragem_rolo_m), preco_compra: fmt(m.preco_compra), observacoes: m.observacoes ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function alternar(m: any) { await sb.from("eng_materiais").update({ ativo: !m.ativo }).eq("id", m.id); load(); }
  async function verHistorico(m: any) {
    if (hist?.id === m.id) { setHist(null); return; }
    const r = await sb.from("eng_precos_historico").select("*").eq("material_id", m.id).order("data_preco", { ascending: false }).order("created_at", { ascending: false });
    setHist({ id: m.id, itens: r.data ?? [] });
  }

  async function importar(file: File | null) {
    if (!file) return;
    const { linhas } = parseCsv(await file.text());
    if (!linhas.length) { setMsg("Arquivo vazio ou sem a linha de cabeçalho."); return; }
    const mapF = new Map<string, string>(forn.map((x) => [x.nome.toLowerCase(), x.id]));
    const rel: string[] = []; const ok: { v: any; nf: string }[] = []; const vistos = new Set<string>(); const novosF = new Set<string>();
    linhas.forEach((l, i) => {
      const v = validarMaterial(l);
      if (!v.ok) { rel.push(`Linha ${i + 2}: ${v.erros.join("; ")}`); return; }
      const k = [v.valor.categoria, v.valor.nome, v.valor.marca ?? "", v.valor.espessura_mm ?? 0, v.valor.cor ?? ""].join("|").toLowerCase();
      const dup = vistos.has(k) || mats.some((m) => [m.categoria, m.nome, m.marca ?? "", Number(m.espessura_mm ?? 0), m.cor ?? ""].join("|").toLowerCase() === k);
      if (dup) { rel.push(`Linha ${i + 2}: já cadastrado (${v.valor.nome})`); return; }
      vistos.add(k);
      const nf = (l.fornecedor ?? "").trim();
      if (nf && !mapF.has(nf.toLowerCase())) novosF.add(nf);
      ok.push({ v: v.valor, nf });
    });
    if (novosF.size) {
      const r = await sb.from("eng_fornecedores").insert(Array.from(novosF).map((nome) => ({ nome }))).select("id,nome");
      if (r.error) { setMsg(r.error.message.includes("row-level security") ? "Só o administrador pode importar." : r.error.message); return; }
      (r.data ?? []).forEach((x: any) => mapF.set(x.nome.toLowerCase(), x.id));
    }
    const u = await uid();
    const rows = ok.map(({ v, nf }) => ({ ...v, fornecedor_id: nf ? mapF.get(nf.toLowerCase()) ?? null : null, created_by: u }));
    if (rows.length) {
      const r = await sb.from("eng_materiais").insert(rows);
      if (r.error) { setMsg(r.error.message.includes("row-level security") ? "Só o administrador pode importar." : r.error.message); return; }
    }
    setRelat(rel); setMsg(`${rows.length} material(is) importado(s); ${rel.length} linha(s) ignorada(s).`); load();
  }
  function baixarModelo() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + MODELO_CSV], { type: "text/csv;charset=utf-8" })); a.download = "modelo-materiais.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const campo = (k: string, t: string, extra: any = {}) => (
    <div className="f" key={k}><label>{t}</label><input value={(f as any)[k] ?? ""} onChange={set(k)} {...extra} /></div>
  );
  const c = f?.categoria ?? cat;

  return (
    <>
      {admin === false && <p className="note">Você tem acesso de leitura. Só o administrador cadastra e altera materiais e preços.</p>}
      {msg && <p className="note">{msg}</p>}
      {relat.length > 0 && <details open><summary className="note">Linhas ignoradas na importação ({relat.length})</summary>{relat.map((l, i) => <p key={i} className="note">{l}</p>)}</details>}
      {categorias.length > 1 && <div className="linha">{categorias.map((x) => <button key={x} className={x === cat ? "btn small" : "btn ghost small"} onClick={() => setCat(x)}>{ROT[x]}</button>)}</div>}

      {admin && !f && (
        <div className="linha" style={{ flexWrap: "wrap" }}>
          <button className="btn small" onClick={() => { setEditId(null); setF(novo(cat)); }}>Novo material</button>
          <label className="btn ghost small" style={{ cursor: "pointer" }}>Importar CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { importar(e.target.files?.[0] ?? null); e.target.value = ""; }} /></label>
          <button className="btn ghost small" onClick={baixarModelo}>Baixar modelo de planilha</button>
        </div>
      )}

      {f && (
        <div className="card" style={{ cursor: "default", maxWidth: 640, margin: "12px 0" }}>
          <b>{editId ? "Editar" : "Novo"}: {ROT[c]}</b>
          <datalist id="sug">{(SUG[c] ?? []).map((s) => <option key={s} value={s} />)}</datalist>
          {campo("subcategoria", "Tipo (ex.: MDF, dobradiça, cola)", { list: "sug" })}
          {campo("nome", "Nome do material")}
          <div className="linha">{campo("marca", "Marca")}
            <div className="f"><label>Fornecedor</label><select value={f.fornecedor_id} onChange={set("fornecedor_id")}><option value="">Sem fornecedor</option>{forn.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></div></div>
          {(c === "chapa" || c === "fita") && <div className="linha">{campo("espessura_mm", "Espessura (mm)", { inputMode: "decimal" })}{campo("largura_mm", "Largura (mm)", { inputMode: "decimal" })}{c === "chapa" && campo("comprimento_mm", "Comprimento (mm)", { inputMode: "decimal" })}{c === "fita" && campo("metragem_rolo_m", "Metragem do rolo (m)", { inputMode: "decimal" })}</div>}
          {(c === "chapa" || c === "fita") && <div className="linha">{campo("cor", "Cor")}{campo("padrao", "Padrão")}</div>}
          {c === "chapa" && <label className="chk"><input type="checkbox" checked={f.tem_veio === "sim"} onChange={(e) => setF({ ...f, tem_veio: e.target.checked ? "sim" : "" })} /><span>Tem sentido de veio</span></label>}
          {c !== "chapa" && c !== "fita" && <div className="f"><label>Unidade de compra</label><select value={f.unidade} onChange={set("unidade")}><option value="">Selecione</option>{UNIDADES.filter((u) => u !== "chapa" && u !== "rolo").map((u) => <option key={u} value={u}>{u}</option>)}</select></div>}
          {campo("preco_compra", c === "chapa" ? "Preço por chapa (R$)" : c === "fita" ? "Preço por rolo (R$)" : "Preço por unidade de compra (R$)", { inputMode: "decimal" })}
          <textarea rows={2} placeholder="Observações" value={f.observacoes} onChange={set("observacoes")} />
          <div className="linha"><button className="btn small" onClick={salvar}>Salvar</button><button className="btn ghost small" onClick={() => { setF(null); setEditId(null); }}>Cancelar</button></div>
        </div>
      )}

      <div className="filtros" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <input placeholder="Buscar por nome, marca, cor ou padrão" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /><span>Mostrar inativos</span></label>
      </div>
      {visiveis.length === 0 && <p className="note">Nenhum item cadastrado nesta categoria ainda.</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="tab"><thead><tr><th>Material</th><th>Fornecedor</th><th>Medidas</th><th>Cor / padrão</th><th>Preço</th><th>Referência</th><th>Preço atualizado</th><th /></tr></thead>
          <tbody>{visiveis.map((m) => {
            const ref = custoReferencia(m); const dias = diasDesde(m.preco_atualizado_em);
            return (
              <>
                <tr key={m.id} style={{ opacity: m.ativo ? 1 : 0.5 }}>
                  <td>{m.nome}<br /><span className="note">{[m.subcategoria, m.marca].filter(Boolean).join(" · ")}</span></td>
                  <td>{m.fornecedor?.nome ?? "—"}</td>
                  <td>{m.categoria === "chapa" ? `${fmt(m.espessura_mm)} mm · ${fmt(m.largura_mm)}×${fmt(m.comprimento_mm)}` : m.categoria === "fita" ? `${fmt(m.espessura_mm)} × ${fmt(m.largura_mm)} mm · rolo ${fmt(m.metragem_rolo_m)} m` : m.unidade}</td>
                  <td>{[m.cor, m.padrao].filter(Boolean).join(" / ") || "—"}{m.tem_veio ? " · veio" : ""}</td>
                  <td>{brl(Number(m.preco_compra))} / {m.unidade}</td>
                  <td>{ref ? `${brl(ref.valor)} / ${ref.unidade}` : "—"}</td>
                  <td>{m.preco_atualizado_em ? new Date(m.preco_atualizado_em + "T00:00").toLocaleDateString("pt-BR") : "—"}{dias != null ? <span className="note"> (há {dias} d)</span> : null}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{admin && <button className="btn ghost small" onClick={() => editar(m)}>Editar</button>} <button className="btn ghost small" onClick={() => verHistorico(m)}>Histórico</button> {admin && <button className="btn ghost small" onClick={() => alternar(m)}>{m.ativo ? "Desativar" : "Reativar"}</button>}</td>
                </tr>
                {hist?.id === m.id && (
                  <tr key={m.id + "h"}><td colSpan={8}>
                    <b>Histórico de preços</b>
                    {hist.itens.length === 0 && <p className="note">Sem registros.</p>}
                    {hist.itens.map((h, i) => {
                      const ant = hist.itens[i + 1]; const v = ant ? variacaoPercentual(Number(h.preco), Number(ant.preco)) : null;
                      return <p key={h.id} className="note">{new Date(h.data_preco + "T00:00").toLocaleDateString("pt-BR")} · {brl(Number(h.preco))}{v != null ? ` (${v > 0 ? "+" : ""}${String(arredonda(v, 1)).replace(".", ",")}%)` : ""}</p>;
                    })}
                  </td></tr>
                )}
              </>
            );
          })}</tbody></table>
      </div>
    </>
  );
}
