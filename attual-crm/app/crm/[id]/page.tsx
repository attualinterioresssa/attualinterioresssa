"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { ETAPAS } from "@/lib/etapas";
import { MOMENTO, PRAZO, INVEST, PROJETO, rotulo, zap } from "@/lib/opcoes";

export default function Ficha() {
  return <AuthGate><Detalhe /></AuthGate>;
}

function Detalhe() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [acts, setActs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [nota, setNota] = useState("");
  const [tt, setTt] = useState("");
  const [td, setTd] = useState("");
  const [erro, setErro] = useState("");

  const load = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      sb.from("leads").select("*,customers(*),services(nome),lead_answers(*)").eq("id", id).single(),
      sb.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
      sb.from("tasks").select("*").eq("lead_id", id).order("vencimento", { ascending: true, nullsFirst: false }),
      sb.from("profiles").select("id,nome"),
    ]);
    if (a.error) setErro(a.error.message);
    setLead(a.data); setActs(b.data ?? []); setTasks(c.data ?? []); setUsers(d.data ?? []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const uid = async () => (await sb.auth.getUser()).data.user?.id;
  async function upd(patch: any) {
    const { error } = await sb.from("leads").update(patch).eq("id", id);
    if (error) setErro(error.message); else load();
  }
  async function addNota() {
    if (!nota.trim()) return;
    await sb.from("activities").insert({ lead_id: id, user_id: await uid(), tipo: "nota", descricao: nota.trim() });
    setNota(""); load();
  }
  async function addTask() {
    if (!tt.trim()) return;
    await sb.from("tasks").insert({ lead_id: id, titulo: tt.trim(), vencimento: td || null, responsavel_id: await uid() });
    setTt(""); setTd(""); load();
  }
  async function toggle(t: any) {
    await sb.from("tasks").update({ concluida: !t.concluida }).eq("id", t.id); load();
  }

  if (erro && !lead) return <p className="err">{erro}</p>;
  if (!lead) return <p className="note">Carregando...</p>;
  const c = lead.customers ?? {};
  const r = Array.isArray(lead.lead_answers) ? lead.lead_answers[0] : lead.lead_answers;
  const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <>
      <p><Link href="/crm">← Voltar ao funil</Link></p>
      <h2>{c.nome} <span className={`badge ${lead.classificacao}`}>{lead.classificacao}</span></h2>
      {erro && <p className="err">{erro}</p>}
      <div className="two">
        <div>
          <p className="note">Telefone: {c.telefone} · {c.bairro}, {c.cidade}<br />
            Serviço: {lead.services?.nome} · Pontuação: {lead.pontuacao}<br />
            Origem: {lead.origem ?? "direto"}{lead.campanha ? ` · Campanha: ${lead.campanha}` : ""}<br />
            Entrou em {fmt(lead.created_at)}</p>
          <p><a className="btn small" href={`https://wa.me/${zap(c.telefone)}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></p>
          <div className="f"><label>Etapa do funil</label>
            <select value={lead.etapa} onChange={(e) => upd({ etapa: e.target.value })}>{ETAPAS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></div>
          <div className="f"><label>Responsável</label>
            <select value={lead.responsavel_id ?? ""} onChange={(e) => upd({ responsavel_id: e.target.value || null })}><option value="">Sem responsável</option>{users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          <div className="f"><label>Valor estimado (R$)</label>
            <input type="number" min="0" step="0.01" defaultValue={lead.valor ?? ""} onBlur={(e) => upd({ valor: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <h3>Respostas do formulário</h3>
          <p className="note">Momento: {rotulo(MOMENTO, r?.momento)}<br />Prazo: {rotulo(PRAZO, r?.prazo)}<br />Investimento: {rotulo(INVEST, r?.investimento)}<br />Projeto: {rotulo(PROJETO, r?.projeto)}</p>
        </div>
        <div>
          <h3>Tarefas</h3>
          {tasks.map((t) => (
            <label key={t.id} className="chk"><input type="checkbox" checked={t.concluida} onChange={() => toggle(t)} />
              <span style={{ textDecoration: t.concluida ? "line-through" : "none" }}>{t.titulo}{t.vencimento ? ` · ${new Date(t.vencimento + "T00:00").toLocaleDateString("pt-BR")}` : ""}</span></label>
          ))}
          <div className="linha"><input placeholder="Nova tarefa" value={tt} onChange={(e) => setTt(e.target.value)} /><input type="date" value={td} onChange={(e) => setTd(e.target.value)} /><button className="btn small" onClick={addTask}>Adicionar</button></div>
          <h3>Histórico</h3>
          <div className="linha"><input placeholder="Registrar contato ou observação" value={nota} onChange={(e) => setNota(e.target.value)} /><button className="btn small" onClick={addNota}>Salvar</button></div>
          {acts.map((a) => <p key={a.id} className="note"><b>{fmt(a.created_at)}</b> · {a.descricao}</p>)}
        </div>
      </div>
    </>
  );
}
