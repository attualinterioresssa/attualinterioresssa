export type Opt = [string, string];
export const SERVICOS: Opt[] = [["cozinha","Cozinha planejada"],["guarda-roupa","Guarda-roupa"],["quarto","Quarto"],["painel","Painel"],["banheiro","Banheiro"],["escritorio","Escritório"],["personalizado","Móvel personalizado"]];
export const MOMENTO: Opt[] = [["obra_andamento","Obra ou reforma em andamento"],["imovel_pronto","Imóvel pronto, quero planejar"],["na_planta","Imóvel na planta ou comprando"],["pesquisando","Só pesquisando"]];
export const PRAZO: Opt[] = [["ate_30d","Em até 30 dias"],["1_3m","De 1 a 3 meses"],["3_6m","De 3 a 6 meses"],["sem_prazo","Sem prazo definido"]];
export const INVEST: Opt[] = [["acima_40","Acima de R$ 40 mil"],["20_40","R$ 20 mil a R$ 40 mil"],["10_20","R$ 10 mil a R$ 20 mil"],["ate_10","Até R$ 10 mil"],["nao_informar","Prefiro não informar"]];
export const PROJETO: Opt[] = [["projeto_medidas","Tenho projeto e medidas"],["medidas","Tenho só as medidas"],["referencias","Tenho só referências"],["nada","Ainda não tenho nada"]];
export const rotulo = (l: Opt[], v?: string | null) => l.find(([k]) => k === v)?.[1] ?? v ?? "—";
export const zap = (tel: string) => { const d = (tel || "").replace(/\D/g, ""); return d.length <= 11 ? "55" + d : d; };
