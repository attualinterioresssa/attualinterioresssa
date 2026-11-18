"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";

export default function Contratos() {
  return <AuthGate><Lista /></AuthGate>;
}

function Lista() {
  const [cs, setCs] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  useEffect(() => {
    sb.from("contracts").select("id,numero,data,status,total,contratante").order("created_at", { ascending: false })
      .then(({ data, error }) => { if (error) setErro(error.message); else setCs(data ?? []); });
  }, []);
  return (
    <>
      <h2>Contratos</h2>
      {erro && <p className="err">{erro}</p>}
      <p className="note">Para criar um contrato, abra a proposta do cliente (aba Propostas) e use “Gerar contrato”.</p>
      {cs.length === 0 && <p className="note">Nenhum contrato ainda.</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="tab"><thead><tr><th>Nº</th><th>Data</th><th>Contratante</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>{cs.map((c) => (
            <tr key={c.id}><td><Link href={`/crm/contratos/${c.id}`}>{c.numero}</Link></td>
              <td>{new Date(c.data + "T00:00").toLocaleDateString("pt-BR")}</td><td>{c.contratante?.nome}</td>
              <td>{brl(Number(c.total))}</td><td><span className="badge">{c.status}</span></td></tr>
          ))}</tbody></table>
      </div>
    </>
  );
}
