"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS: [string, string | null, string][] = [
  ["Painel de orçamentos", "/crm/engenharia", ""],
  ["Novo orçamento", null, "etapa 7"],
  ["Importação de projetos", null, "etapa 5"],
  ["Projetos em análise", null, "etapa 4B"],
  ["Lista de peças", null, "etapa 4B"],
  ["Plano de corte", null, "etapa 6"],
  ["Materiais (chapas e fitas)", "/crm/engenharia/materiais", ""],
  ["Fornecedores", "/crm/engenharia/fornecedores", ""],
  ["Ferragens e acessórios", "/crm/engenharia/ferragens", ""],
  ["Embalagens e insumos", "/crm/engenharia/insumos", ""],
  ["Formação de preços", null, "etapa 7"],
  ["Histórico de orçamentos", null, "etapa 9"],
  ["Configurações de fabricação", null, "etapa 4"],
];

export default function Menu() {
  const path = usePathname();
  return (
    <nav className="eng-menu" aria-label="Engenharia e orçamentos">
      <b>Engenharia</b>
      {ITENS.map(([t, href, nota]) =>
        href ? (
          <Link key={t} href={href} className={path === href ? "ativo" : ""} aria-current={path === href ? "page" : undefined}>{t}</Link>
        ) : (
          <span key={t} className="off">{t} <small>({nota})</small></span>
        )
      )}
    </nav>
  );
}
