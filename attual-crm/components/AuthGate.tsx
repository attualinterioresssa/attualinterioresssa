"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const r = useRouter();
  const [ok, setOk] = useState(false);
  const [email, setEmail] = useState("");
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) r.replace("/login");
      else { setEmail(data.session.user.email ?? ""); setOk(true); }
    });
  }, [r]);
  if (!ok) return <div className="wrap"><p className="note">Carregando...</p></div>;
  return (
    <div className="wrap wide">
      <div className="crm-top">
        <Link href="/crm" className="brand"><b>ATTUAL · CRM</b></Link>
        <span className="note">{email}{" "}
          <button className="btn ghost small" onClick={async () => { await sb.auth.signOut(); r.replace("/login"); }}>Sair</button>
        </span>
      </div>
      {children}
    </div>
  );
}
