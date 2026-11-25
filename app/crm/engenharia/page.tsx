"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

const ROT: Record<string, string> = { chapa: "Chapas", fita: "Fitas de borda", ferragem: "Ferragens", insumo: "Insumos", embalagem: "Embalagens" };

export default function PainelEngenharia() {
  const [mats, setMats] = useState<any[] | null>(null);
  const [forn, setForn] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  useEffect(() => {
    sb.from("eng_materiais").select("categoria,ativo").limit(5000).then(({ data, error }) => { if (error) setErro(error.message); else setMats(data ?? []); });
    sb.from("eng_fornecedores").select("id", { count: "exact", head: true }).then(({ count }) => setForn(count ?? 0));
  }, []);
  const conta = (c: string) => (mats ?? []).filter((m) => m.categoria === c && m.ativo).length;
  return (
    <>
      <h2>Engenharia e orçamentos</h2>
      {erro && <p className="err">{erro}</p>}
      <div className="kpis">
        <div className="kpi"><span className="note">Fornecedores</span><b>{forn ?? "…"}</b></div>
        {Object.keys(ROT).map((c) => <div key={c} className="kpi"><span className="note">{ROT[c]} ativas</span><b>{mats ? conta(c) : "…"}</b></div>)}
      </div>
      <p className="note">Estes números vêm do cadastro real. Nada aqui é de exemplo.</p>
      <h3>Por onde começar</h3>
      <ol className="note" style={{ lineHeight: 1.9 }}>
        <li><Link href="/crm/engenharia/fornecedores">Cadastre os fornecedores</Link>.</li>
        <li>Cadastre as <Link href="/crm/engenharia/materiais">chapas e fitas</Link>, as <Link href="/crm/engenharia/ferragens">ferragens</Link> e os <Link href="/crm/engenharia/insumos">insumos e embalagens</Link>, ou importe uma planilha CSV.</li>
        <li>As próximas etapas (peças, cálculo, plano de corte e preço) aparecem no menu quando ficarem prontas.</li>
      </ol>
    </>
  );
}
