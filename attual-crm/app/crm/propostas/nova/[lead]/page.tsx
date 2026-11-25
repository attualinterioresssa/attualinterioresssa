"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { carregarEmpresa } from "@/lib/empresa";

export default function Nova() {
  return <AuthGate><Criar /></AuthGate>;
}

function Criar() {
  const { lead } = useParams<{ lead: string }>();
  const r = useRouter();
  const feito = useRef(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    (async () => {
      const [l, emp, num, u] = await Promise.all([
        sb.from("leads").select("id,customers(nome,telefone,cidade,bairro)").eq("id", lead).single(),
        carregarEmpresa(),
        sb.rpc("proximo_numero_proposta"),
        sb.auth.getUser(),
      ]);
      if (l.error) { setErro(l.error.message); return; }
      const c: any = l.data.customers ?? {};
      const ins = await sb.from("proposals").insert({
        lead_id: lead, numero: num.data ?? "1", cliente_nome: c.nome, cliente_tel: c.telefone,
        cliente_endereco: [c.bairro, c.cidade].filter(Boolean).join(", "),
        validade_dias: Number(emp.validade_dias) || 15, prazo_entrega: emp.prazo_entrega ?? "",
        observacoes: emp.observacoes_padrao ?? "", created_by: u.data.user?.id ?? null,
      }).select("id").single();
      if (ins.error) setErro(ins.error.message); else r.replace(`/crm/propostas/${ins.data.id}`);
    })();
  }, [lead, r]);

  return erro ? <p className="err">{erro}</p> : <p className="note">Criando a proposta...</p>;
}
