import Link from "next/link";

export const metadata = { title: "Aviso de privacidade | Attual Interiores" };

export default function Privacidade() {
  return (
    <div className="wrap" style={{ maxWidth: 760, paddingTop: 32, paddingBottom: 48 }}>
      <p><Link href="/">← Voltar ao site</Link></p>
      <h1 style={{ fontSize: "2.2rem" }}>Aviso de privacidade</h1>
      <p className="note">Atualizado em 17 de novembro de 2026</p>

      <section><h2>Quem é o responsável</h2>
        <p>Attual Interiores, marcenaria de móveis planejados em Salvador (BA). Responsável: Erilan Jesus dos Santos. Contato para assuntos de privacidade: erilandossantos@gmail.com.</p></section>

      <section><h2>Quais dados coletamos</h2>
        <p>Pelo formulário de orçamento: nome, telefone, cidade e bairro, serviço desejado, momento da obra, prazo, faixa de investimento, informações sobre projeto ou medidas e, se você quiser informar, data de nascimento. Também registramos de qual anúncio ou link você veio (como UTMs, gclid e fbclid) e as autorizações que você deu.</p></section>

      <section><h2>Para que usamos</h2>
        <p>Para entrar em contato sobre o seu orçamento, entender o seu projeto, agendar visitas e acompanhar a proposta. Se você marcar a opção de novidades e ofertas, também para enviar comunicações de marketing. Você pode usar o serviço sem aceitar o marketing.</p></section>

      <section><h2>Base legal</h2>
        <p>Consentimento (Lei 13.709/2018, LGPD) para o contato comercial e, separadamente, para o marketing. Você pode revogar quando quiser.</p></section>

      <section><h2>Com quem os dados são tratados</h2>
        <p>Usamos prestadores de tecnologia para operar o sistema: Supabase (banco de dados), Vercel (hospedagem do site) WhatsApp, quando você conversa conosco por lá, e Google e Meta, se você aceitar os cookies de medição. Não vendemos os seus dados.</p></section>

      <section><h2>Por quanto tempo guardamos</h2>
        <p>Pelo tempo necessário para o atendimento e para cumprir obrigações legais, ou até você pedir a exclusão.</p></section>

      <section><h2>Seus direitos</h2>
        <p>Você pode pedir confirmação de que tratamos seus dados, acesso, correção, exclusão, informação sobre compartilhamento e a revogação do consentimento. Escreva para erilandossantos@gmail.com informando o nome e o telefone usados no formulário.</p></section>

      <section><h2>Cookies</h2>
        <p>Com o seu consentimento, dado ou recusado no aviso exibido ao acessar o site, podemos usar ferramentas do Google (Tag Manager, Analytics e Ads) e do Meta (Pixel) para medir visitas e o desempenho dos anúncios. Se você recusar, nenhuma dessas ferramentas é carregada. Para mudar de ideia, limpe os dados do site no navegador.</p></section>
    </div>
  );
}
