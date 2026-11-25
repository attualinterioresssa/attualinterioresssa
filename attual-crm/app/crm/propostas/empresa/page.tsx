"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { carregarEmpresa } from "@/lib/empresa";

const CAMPOS: [string, string][] = [
  ["razao_social", "Razão social"], ["cnpj", "CNPJ"], ["endereco", "Endereço"], ["telefone", "Telefone (com DDD e 9 dígitos)"],
  ["email", "E-mail da empresa"], ["responsavel", "Responsável (aparece no rodapé)"],
  ["representante_nome", "Representante legal (nome completo)"], ["representante_cargo", "Cargo do representante (ex.: sócio-administrador)"], ["representante_qualificacao", "Qualificação (nacionalidade, estado civil, profissão)"], ["representante_cpf", "CPF do representante"],
  ["banco", "Banco"], ["agencia_conta", "Agência e conta"], ["titular", "Titular da conta"], ["pix", "Chave PIX"],
  ["validade_dias", "Validade padrão (dias)"], ["margem_alvo", "Margem bruta alvo das propostas (%)"], ["prazo_entrega", "Prazo de entrega padrão"],
];

export default function Empresa() {
  return <AuthGate><Form /></AuthGate>;
}

function Form() {
  const [e, setE] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => { carregarEmpresa().then(setE); }, []);
  const set = (k: string) => (ev: any) => setE({ ...e, [k]: ev.target.value });
  async function salvar() {
    const v = { ...e, validade_dias: Number(e.validade_dias) || 15, margem_alvo: Number(e.margem_alvo) || 35 };
    const { error } = await sb.from("system_settings").upsert({ key: "empresa", value: v, updated_at: new Date().toISOString() });
    setMsg(error ? "Não foi possível salvar. Só o administrador altera estes dados." : "Dados salvos.");
  }
  return (
    <>
      <p><Link href="/crm/propostas">← Propostas</Link></p>
      <h2>Dados da empresa</h2>
      <p className="note">Aparecem em todas as propostas. Confira o CNPJ, o banco e a chave PIX com atenção, pois vão impressos para o cliente.</p>
      {msg && <p className="note">{msg}</p>}
      <div style={{ maxWidth: 640 }}>
        {CAMPOS.map(([k, t]) => <div key={k} className="f" style={{ marginBottom: 10 }}><label>{t}</label><input value={e[k] ?? ""} onChange={set(k)} /></div>)}
        <div className="f"><label>Observações padrão das propostas</label><textarea rows={5} value={e.observacoes_padrao ?? ""} onChange={set("observacoes_padrao")} /></div>
        <button className="btn small" onClick={salvar}>Salvar</button>
      </div>
    </>
  );
}
