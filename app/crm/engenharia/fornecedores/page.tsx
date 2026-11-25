"use client";
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useEhAdmin } from "@/components/engenharia/useAdmin";

const vazio = { nome: "", contato: "", telefone: "", email: "", observacoes: "" };

export default function Fornecedores() {
  const admin = useEhAdmin();
  const [lista, setLista] = useState<any[]>([]);
  const [f, setF] = useState<Record<string, string>>({ ...vazio });
  const [edit, setEdit] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await sb.from("eng_fornecedores").select("*").order("nome");
    if (error) setMsg(error.message); else setLista(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (f.nome.trim().length < 2) { setMsg("Informe o nome do fornecedor."); return; }
    const dados = { nome: f.nome.trim(), contato: f.contato || null, telefone: f.telefone || null, email: f.email || null, observacoes: f.observacoes || null };
    const r = edit ? await sb.from("eng_fornecedores").update(dados).eq("id", edit) : await sb.from("eng_fornecedores").insert(dados);
    if (r.error) { setMsg(r.error.code === "23505" ? "Já existe um fornecedor com esse nome." : r.error.message); return; }
    setMsg(edit ? "Fornecedor atualizado." : "Fornecedor cadastrado."); setF({ ...vazio }); setEdit(null); load();
  }
  async function alternar(x: any) { await sb.from("eng_fornecedores").update({ ativo: !x.ativo }).eq("id", x.id); load(); }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h2>Fornecedores</h2>
      {admin === false && <p className="note">Você tem acesso de leitura. Só o administrador cadastra e altera fornecedores e preços.</p>}
      {msg && <p className="note">{msg}</p>}
      {admin && (
        <div className="card" style={{ cursor: "default", maxWidth: 560 }}>
          <b>{edit ? "Editar fornecedor" : "Novo fornecedor"}</b>
          <input placeholder="Nome" value={f.nome} onChange={set("nome")} />
          <div className="linha"><input placeholder="Contato" value={f.contato} onChange={set("contato")} /><input placeholder="Telefone" value={f.telefone} onChange={set("telefone")} /></div>
          <input placeholder="E-mail" value={f.email} onChange={set("email")} />
          <textarea rows={2} placeholder="Observações" value={f.observacoes} onChange={set("observacoes")} />
          <div className="linha"><button className="btn small" onClick={salvar}>Salvar</button>{edit && <button className="btn ghost small" onClick={() => { setEdit(null); setF({ ...vazio }); }}>Cancelar</button>}</div>
        </div>
      )}
      {lista.length === 0 && <p className="note">Nenhum fornecedor cadastrado ainda.</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="tab"><thead><tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th>Status</th><th /></tr></thead>
          <tbody>{lista.map((x) => (
            <tr key={x.id} style={{ opacity: x.ativo ? 1 : 0.5 }}><td>{x.nome}</td><td>{x.contato}</td><td>{x.telefone}</td><td>{x.email}</td><td>{x.ativo ? "ativo" : "inativo"}</td>
              <td>{admin && <><button className="btn ghost small" onClick={() => { setEdit(x.id); setF({ nome: x.nome, contato: x.contato ?? "", telefone: x.telefone ?? "", email: x.email ?? "", observacoes: x.observacoes ?? "" }); }}>Editar</button>{" "}
                <button className="btn ghost small" onClick={() => alternar(x)}>{x.ativo ? "Desativar" : "Reativar"}</button></>}</td></tr>
          ))}</tbody></table>
      </div>
    </>
  );
}
