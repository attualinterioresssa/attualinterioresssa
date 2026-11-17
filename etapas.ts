export const ETAPAS: [string, string][] = [
  ["novo_lead","Novo lead"],["qualificado","Qualificado"],["contato_realizado","Contato realizado"],
  ["visita_agendada","Visita agendada"],["visita_realizada","Visita realizada"],
  ["orcamento_elaboracao","Orçamento em elaboração"],["orcamento_enviado","Orçamento enviado"],
  ["em_negociacao","Em negociação"],["follow_up","Follow-up"],["venda_fechada","Venda fechada"],
  ["producao","Produção"],["entregue","Entregue"],["pos_venda","Pós-venda"],["perdido","Perdido"],
];
export const nomeEtapa = (s: string) => ETAPAS.find(([k]) => k === s)?.[1] ?? s;
