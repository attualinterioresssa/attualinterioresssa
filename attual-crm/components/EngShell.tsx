"use client";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";

// Áreas do módulo. href null = ainda não construída (aparece como "em breve", sem link).
const ITENS: [string, string | null][] = [
  ["Painel", "/crm/engenharia"],
  ["Novo orçamento", null],
  ["Importação de projetos", null],
  ["Projetos em análise", null],
  ["Lista de peças", null],
  ["Plano de corte", null],
  ["Materiais (chapas e fitas)", "/crm/engenharia/materiais#chapa"],
  ["Fornecedores", "/crm/engenharia/fornecedores"],
  ["Ferragens e acessórios", "/crm/engenharia/materiais#ferragem"],
  ["Insumos e embalagens", "/crm/engenharia/materiais#insumo"],
  ["Formação de preços", null],
  ["Histórico de orçamentos", null],
  ["Configurações de fabricação", null],
];

export default function EngShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="eng">
        <nav className="eng-menu" aria-label="Engenharia e orçamentos">
          <b>ENGENHARIA</b>
          {ITENS.map(([t, h]) => h
            ? <Link key={t} href={h}>{t}</Link>
            : <span key={t} title="Em construção">{t} <small>em breve</small></span>)}
        </nav>
        <div className="eng-main">{children}</div>
      </div>
    </AuthGate>
  );
}
