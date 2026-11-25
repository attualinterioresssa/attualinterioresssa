"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import { sb } from "@/lib/supabase";

const PROD = ["a_produzir", "em_producao", "pronto", "instalacao", "entregue"];
const ROT: Record<string, string> = { a_produzir: "A produzir", em_producao: "Em produção", pronto: "Pronto", instalacao: "Instalação", entregue: "Entregue" };
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Producao() {
  return <AuthGate><Quadro /></AuthGate>;
}

function Quadro() {
  const [ords, setOrds] = useState<any[]>([]);
  const [erro, setErro] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from("production_orders")
      .select("*,sales(valor),leads(id,customers(nome),services(nome))").order("created_at", { ascending: false });
    if (error) setErro(error.message); else setOrds(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  async function mover(id: string, status: string) {
    const r = await sb.rpc("avancar_producao", { p_order: id, p_status: status });
    if (r.error) setErro(r.error.message); else load();
  }
  return (
    <>
      <h2>Produção</h2>
      {erro && <p className="err">{erro}</p>}
      {ords.length === 0 && <p className="note">Nenhuma ordem de produção ainda. Elas nascem quando você fecha uma venda na ficha do cliente.</p>}
      <div className="board">
        {PROD.map((s) => (
          <div key={s} className="col">
            <h4>{ROT[s]} <span>{ords.filter((o) => o.status === s).length}</span></h4>
            {ords.filter((o) => o.status === s).map((o) => (
              <div key={o.id} className="card" style={{ cursor: "default" }}>
                <Link href={`/crm/${o.lead_id}`}><b>{o.leads?.customers?.nome}</b></Link>
                <div className="note">{o.leads?.services?.nome}{o.sales?.valor ? ` · ${brl(o.sales.valor)}` : ""}</div>
                {o.prazo_entrega && <div className="note">Entrega: {new Date(o.prazo_entrega + "T00:00").toLocaleDateString("pt-BR")}</div>}
                <select value={o.status} onChange={(e) => mover(o.id, e.target.value)} aria-label="Mover para">
                  {PROD.map((x) => <option key={x} value={x}>{ROT[x]}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
