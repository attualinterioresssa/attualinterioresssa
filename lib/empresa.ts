import { sb } from "@/lib/supabase";

export type Empresa = Record<string, any>;

export async function carregarEmpresa(): Promise<Empresa> {
  const { data } = await sb.from("system_settings").select("value").eq("key", "empresa").maybeSingle();
  return (data?.value ?? {}) as Empresa;
}

export const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const money = (s: string | number) => { const n = Number(String(s).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
