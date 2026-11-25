"use client";
import { useEffect, useState } from "react";

const GTM = process.env.NEXT_PUBLIC_GTM_ID ?? "";
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

function carregar() {
  const w: any = window;
  if (w.__trk) return;
  w.__trk = true;
  if (GTM) {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true; s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM)}`;
    document.head.appendChild(s);
  }
  if (PIXEL) {
    const n: any = (w.fbq = function (...a: any[]) { n.callMethod ? n.callMethod(...a) : n.queue.push(a); });
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const s = document.createElement("script");
    s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    w.fbq("init", PIXEL); w.fbq("track", "PageView");
  }
}

/** Avisa o Tag Manager e o Pixel que um lead foi enviado. Só age se o visitante aceitou os cookies. */
export function eventoLead(servico: string) {
  const w: any = window;
  if (!w.__trk) return;
  w.dataLayer?.push({ event: "lead_enviado", servico });
  if (PIXEL) w.fbq?.("track", "Lead");
}

export default function CookieConsent() {
  const [estado, setEstado] = useState<string | null>("?");
  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem("cookies_medicao"); } catch {}
    setEstado(v);
    if (v === "aceito") carregar();
  }, []);
  if (!(GTM || PIXEL) || estado !== null) return null;
  const escolher = (v: string) => {
    try { localStorage.setItem("cookies_medicao", v); } catch {}
    setEstado(v);
    if (v === "aceito") carregar();
  };
  return (
    <div role="dialog" aria-label="Aviso de cookies" className="cookies">
      <span>Usamos cookies de medição e publicidade (Google e Meta) para entender o desempenho dos anúncios. Veja o <a href="/privacidade">aviso de privacidade</a>.</span>
      <span className="linha">
        <button className="btn small" onClick={() => escolher("aceito")}>Aceitar</button>
        <button className="btn ghost small" onClick={() => escolher("recusado")}>Recusar</button>
      </span>
    </div>
  );
}
