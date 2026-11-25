"use client";
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";

/** true = administrador ativo; false = não; null = ainda carregando. A proteção real continua no banco (RLS). */
export function useAdmin(): boolean | null {
  const [a, setA] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const uid = (await sb.auth.getUser()).data.user?.id;
      if (!uid) { setA(false); return; }
      const { data } = await sb.from("profiles").select("papel,ativo").eq("id", uid).maybeSingle();
      setA(data?.papel === "admin" && !!data?.ativo);
    })();
  }, []);
  return a;
}
