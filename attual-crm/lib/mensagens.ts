export function preencher(corpo: string, v: { nome?: string; servico?: string; responsavel?: string }) {
  return corpo
    .replaceAll("{nome}", v.nome || "")
    .replaceAll("{servico}", (v.servico || "").toLowerCase())
    .replaceAll("{responsavel}", v.responsavel || "a equipe");
}
