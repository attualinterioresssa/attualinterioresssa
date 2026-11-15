import LeadForm from "@/components/LeadForm";

const SERVICOS = ["Cozinhas", "Guarda-roupas", "Quartos", "Painéis", "Banheiros", "Escritórios", "Móveis personalizados"];
const ETAPAS = ["Briefing e referências", "Medição técnica", "Projeto executivo", "Produção na marcenaria", "Instalação", "Entrega final"];
const GALERIA: [string, string, string][] = [
  ["g1", "Cozinhas", "Cozinha branca com armários curvos e bancada em pedra"],
  ["g2", "Cozinhas", "Cozinha verde com armários em madeira clara e forno embutido"],
  ["g3", "Painéis", "Painel de TV iluminado com bancada baixa"],
  ["g4", "Quartos", "Guarda-roupa e escrivaninha em tom terracota com madeira"],
  ["g5", "Quartos", "Guarda-roupa infantil branco com puxadores em formato de nuvem"],
  ["g6", "Banheiros", "Gabinete de banheiro suspenso com espelho iluminado"],
  ["g7", "Escritórios", "Bancada de trabalho em madeira com nicho suspenso"],
  ["g8", "Móveis personalizados", "Bancada com armários em madeira e vidro na varanda"],
  ["g9", "Painéis", "Painel de TV em pedra com bancada e armário"],
];

export default function Home() {
  return (
    <>
      <div className="wrap">
        <header>
          <a className="brand" href="#topo" aria-label="Attual Interiores">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
              <path d="M13 3 3 15l11 13 6-6" fill="none" stroke="#3d3d40" strokeWidth="3.5" />
              <path d="M19 8l12 21H25l-9-15z" fill="#a01e30" />
              <path d="M17 20h8l-1.5 3H15z" fill="#a01e30" />
            </svg>
            <b>ATTUAL</b>
          </a>
          <a className="btn ghost" href="#orcamento">Solicitar orçamento</a>
        </header>

        <div className="hero" id="topo">
          <div>
            <h1>Móveis planejados que combinam com o seu jeito de viver.</h1>
            <p>Cozinhas, guarda-roupas, quartos, painéis, banheiros e escritórios feitos sob medida em Salvador. Você acompanha cada etapa, da medição técnica à entrega.</p>
            <div className="row">
              <a className="btn" href="#orcamento">Solicitar orçamento</a>
              <a className="btn ghost" href="#projetos">Ver projetos</a>
            </div>
          </div>
          <img className="ph heroimg" src="/fotos/hero.jpg" alt="Cozinha gourmet com bancada em pedra e painéis de madeira, projeto da Attual" />
        </div>

        <section>
          <h2>O que fazemos</h2>
          <div className="svc">{SERVICOS.map((s) => <a key={s} href="#orcamento">{s}</a>)}</div>
        </section>

        <section>
          <h2>O que você recebe</h2>
          <div className="grid3">
            <div><h3>Projeto feito para o seu espaço</h3><p>Medição técnica e desenho executivo antes de qualquer corte.</p></div>
            <div><h3>Acabamento de alto padrão</h3><p>Ferragens, laminados e madeiras escolhidos com você, com amostras.</p></div>
            <div><h3>Entrega organizada</h3><p>Prazo combinado por escrito e suporte durante toda a instalação.</p></div>
          </div>
        </section>

        <section>
          <h2>Do briefing à entrega</h2>
          <div className="steps">{ETAPAS.map((e) => <div key={e}>{e}</div>)}</div>
        </section>

        <section id="projetos">
          <h2>Projetos entregues</h2>
          <div className="mas">
            {GALERIA.map(([f, c, a]) => (
              <figure key={f}><img className="ph" loading="lazy" src={`/fotos/${f}.jpg`} alt={a} /><figcaption>{c}</figcaption></figure>
            ))}
          </div>
        </section>

        <section id="orcamento">
          <h2>Conte sobre o seu projeto</h2>
          <LeadForm />
        </section>
      </div>
      <footer><div className="wrap">Attual Interiores · Móveis planejados · Salvador, BA</div></footer>
    </>
  );
}
