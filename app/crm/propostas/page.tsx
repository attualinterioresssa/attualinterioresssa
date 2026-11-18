"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";
import { brl } from "@/lib/empresa";

export default function Propostas() {
  return <AuthGate><Lista /></AuthGate>;
}

function Lista() {
  const r = useRouter();
  const [props, setProps] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [sel, setSel] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    sb.from("proposals").select("id,numero,data,cliente_nome,status,desconto,proposal_items(qtd,valor)").order("created_at", { ascending: false })
      .then(({ data, error }) => { if (error) setErro(error.message); else setProps(data ?? []); });
    sb.from("leads").select("id,customers(nome)").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setLeads(data ?? []));
  }, []);

  return (
    <>
      <h2>Propostas</h2>
      {erro && <p className="err">{erro}</p>}
      <div className="linha">
        <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Cliente">
          <option value="">Escolha o cliente da nova proposta</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.customers?.nome}</option>)}
        </select>
        <button className="btn small" disabled={!sel} onClick={() => r.push(`/crm/propostas/nova/${sel}`)}>Criar proposta</button>
        <Link className="btn ghost small" href="/crm/propostas/empresa">Dados da empresa</Link>
      </div>
      {props.length === 0 && <p className="note">Nenhuma proposta ainda. Escolha um cliente acima, ou use “Redigir proposta” na ficha dele.</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="tab"><thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/crm/propostas/${p.id}`}>{p.numero}</Link></td>
                <td>{new Date(p.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                <td>{p.cliente_nome}</td>
                <td>{brl((p.proposal_items ?? []).reduce((s: number, i: any) => s + i.qtd * Number(i.valor), 0) - Number(p.desconto || 0))}</td>
                <td><span className="badge">{p.status}</span></td>
              </tr>
            ))}
          </tbody></table>
      </div>
    </>
  );
}
