"use client";
import { useState } from "react";
import { SERVICOS, MOMENTO, PRAZO, INVEST, PROJETO, type Opt } from "@/lib/opcoes";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const WA = process.env.NEXT_PUBLIC_WHATSAPP ?? "5571982246075";


export default function LeadForm() {
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [wa, setWa] = useState<string | null>(null);
  const [fail, setFail] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "").trim();
    const tel = g("telefone").replace(/\D/g, "");
    const er: Record<string, string> = {};
    if (g("nome").split(/\s+/).length < 2) er.nome = "Informe nome e sobrenome.";
    if (tel.length < 10 || tel.length > 13) er.telefone = "Informe o telefone com DDD.";
    if (!g("cidade")) er.cidade = "Informe a cidade.";
    if (!g("bairro")) er.bairro = "Informe o bairro.";
    for (const k of ["momento", "prazo", "investimento", "projeto"]) if (!g(k)) er[k] = "Escolha uma opção.";
    if (!f.get("consent_dados")) er.consent_dados = "Sem esta autorização não conseguimos atender você.";
    setErrs(er);
    if (Object.keys(er).length) return;

    const q = new URLSearchParams(window.location.search);
    const payload = {
      nome: g("nome"), telefone: tel, nascimento: g("nascimento"), cidade: g("cidade"), bairro: g("bairro"),
      servico: g("servico"), momento: g("momento"), prazo: g("prazo"), investimento: g("investimento"), projeto: g("projeto"),
      consent_dados: true, consent_marketing: !!f.get("consent_marketing"),
      utm_source: q.get("utm_source"), utm_medium: q.get("utm_medium"), utm_campaign: q.get("utm_campaign"),
      utm_content: q.get("utm_content"), utm_term: q.get("utm_term"), gclid: q.get("gclid"), fbclid: q.get("fbclid"),
    };
    setBusy(true); setFail(false);
    try {
      const r = await fetch(`${SB_URL}/rest/v1/rpc/registrar_lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_KEY },
        body: JSON.stringify({ p: payload }),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const servico = SERVICOS.find(([v]) => v === payload.servico)?.[1].toLowerCase();
      const msg = `Olá! Sou ${payload.nome}, de ${payload.bairro}, ${payload.cidade}. Preenchi o formulário sobre ${servico} (ref. ${String(d.id_lead).slice(0, 8)}). Gostaria de conversar sobre o meu projeto.`;
      setWa(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`);
    } catch {
      setFail(true);
    } finally {
      setBusy(false);
    }
  }

  const Err = ({ k }: { k: string }) => <span className="err">{errs[k] ?? ""}</span>;
  const Sel = ({ k, label, opts, full }: { k: string; label: string; opts: Opt[]; full?: boolean }) => (
    <div className={full ? "f full" : "f"}>
      <label htmlFor={k}>{label}</label>
      <select id={k} name={k} defaultValue="">
        <option value="" disabled>Selecione</option>
        {opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <Err k={k} />
    </div>
  );

  if (wa)
    return (
      <div id="done" style={{ display: "block" }} role="status">
        <h3>Recebemos suas informações</h3>
        <p style={{ margin: "0 0 18px", color: "var(--muted)" }}>Agora é só continuar a conversa no WhatsApp com a nossa equipe. Lá você também pode enviar fotos e referências.</p>
        <a className="btn" href={wa} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="f full"><label htmlFor="nome">Nome completo</label><input id="nome" name="nome" autoComplete="name" /><Err k="nome" /></div>
      <div className="f"><label htmlFor="telefone">WhatsApp com DDD</label><input id="telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(71) 9 0000-0000" /><Err k="telefone" /></div>
      <div className="f"><label htmlFor="nascimento">Data de nascimento <small>(opcional)</small></label><input id="nascimento" name="nascimento" type="date" /></div>
      <div className="f"><label htmlFor="cidade">Cidade</label><input id="cidade" name="cidade" defaultValue="Salvador" /><Err k="cidade" /></div>
      <div className="f"><label htmlFor="bairro">Bairro</label><input id="bairro" name="bairro" /><Err k="bairro" /></div>
      <div className="f full"><label htmlFor="servico">Serviço desejado</label>
        <select id="servico" name="servico" defaultValue="cozinha">{SERVICOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
      <Sel k="momento" label="Momento da obra" opts={MOMENTO} />
      <Sel k="prazo" label="Prazo para contratar" opts={PRAZO} />
      <Sel k="investimento" label="Faixa de investimento" opts={INVEST} />
      <Sel k="projeto" label="Você já tem projeto ou medidas?" opts={PROJETO} />
      <p className="note full">Fotos e referências: depois de enviar, você poderá mandá-las direto pelo WhatsApp.</p>
      <label className="chk full"><input type="checkbox" name="consent_dados" /><span>Autorizo o uso dos meus dados para contato sobre este orçamento, conforme o <a href="/privacidade" target="_blank" rel="noopener noreferrer">aviso de privacidade</a> (obrigatório).</span></label>
      <Err k="consent_dados" />
      <label className="chk full"><input type="checkbox" name="consent_marketing" /><span>Aceito receber novidades e ofertas da Attual (opcional).</span></label>
      {fail && (
        <p className="err full">Não conseguimos enviar agora. Tente de novo ou fale direto pelo <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
      )}
      <div className="full"><button className="btn" type="submit" disabled={busy}>{busy ? "Enviando..." : "Enviar e falar no WhatsApp"}</button></div>
    </form>
  );
}
