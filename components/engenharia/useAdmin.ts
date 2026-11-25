"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

/** true = administrador, false = equipe (só leitura nos preços), null = carregando */
export function useEhAdmin(): boolean | null {
  const [a, setA] = useState<boolean | null>(null);
  useEffect(() => {
    sb.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id) { setA(false); return; }
      const r = await sb.from("profiles").select("papel").eq("id", id).maybeSingle();
      setA(r.data?.papel === "admin");
    });
  }, []);
  return a;
}
