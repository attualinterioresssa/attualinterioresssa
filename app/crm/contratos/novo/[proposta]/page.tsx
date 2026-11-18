"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { carregarEmpresa } from "@/lib/empresa";
import { clausulasPadrao } from "@/lib/contrato";

export default function Novo() {
  return <AuthGate><Criar /></AuthGate>;
}

function Criar() {
  const { proposta } = useParams<{ proposta: string }>();
  const r = useRouter();
  const feito = useRef(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    (async () => {
      const [p, it, emp, num, u] = await Promise.all([
        sb.from("proposals").select("*").eq("id", proposta).single(),
        sb.from("proposal_items").select("*").eq("proposal_id", proposta).order("ordem"),
        carregarEmpresa(),
        sb.rpc("proximo_numero_contrato"),
        sb.auth.getUser(),
      ]);
      if (p.error) { setErro(p.error.message); return; }
      const itens = (it.data ?? []).map((i: any) => ({ ambiente: i.ambiente, descricao: i.descricao, qtd: i.qtd, valor: Number(i.valor) }));
      if (!itens.length) { setErro("A proposta não tem itens. Preencha e salve a proposta antes de gerar o contrato."); return; }
      const desconto = Number(p.data.desconto) || 0;
      const total = itens.reduce((s: number, i: any) => s + i.qtd * i.valor, 0) - desconto;
      const contratada = {
        razao_social: emp.razao_social ?? "", cnpj: emp.cnpj ?? "", endereco: emp.endereco ?? "", telefone: emp.telefone ?? "",
        banco: emp.banco ?? "", agencia_conta: emp.agencia_conta ?? "", titular: emp.titular ?? "", pix: emp.pix ?? "",
        rep_nome: emp.representante_nome ?? "", rep_cargo: emp.representante_cargo ?? "", rep_qualificacao: emp.representante_qualificacao ?? "", rep_cpf: emp.representante_cpf ?? "",
      };
      const prazo = p.data.prazo_entrega || emp.prazo_entrega || "";
      const base = { total, forma: p.data.cond_pagamento ?? "A combinar", cronograma: [], contratada, prazo, vigencia: "90 (noventa) dias úteis", foro: "Salvador - BA", garantiaMdf: "05 (cinco) anos", garantiaFerragens: "03 (três) anos" };
      const ins = await sb.from("contracts").insert({
        lead_id: p.data.lead_id, proposal_id: p.data.id, numero: num.data ?? "001",
        contratante: { nome: p.data.cliente_nome, doc: p.data.cliente_doc ?? "", endereco: p.data.cliente_endereco ?? "", tel: p.data.cliente_tel ?? "", email: p.data.cliente_email ?? "" },
        contratada, itens, total, desconto, forma_pagamento: base.forma, cronograma: [], prazo_entrega: prazo, vigencia: base.vigencia, foro: base.foro,
        garantia_mdf: base.garantiaMdf, garantia_ferragens: base.garantiaFerragens, clausulas: clausulasPadrao(base),
        testemunhas: [{ nome: "", cpf: "" }, { nome: "", cpf: "" }], created_by: u.data.user?.id ?? null,
      }).select("id").single();
      if (ins.error) setErro(ins.error.message); else r.replace(`/crm/contratos/${ins.data.id}`);
    })();
  }, [proposta, r]);

  return erro ? <p className="err">{erro}</p> : <p className="note">Gerando o contrato a partir da proposta...</p>;
}
