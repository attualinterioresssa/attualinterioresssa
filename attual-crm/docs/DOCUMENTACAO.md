# Attual Interiores — Central de Vendas e CRM próprio

## Visão geral
Plataforma própria da marcenaria: landing page com formulário de qualificação, CRM com funil, agenda, orçamentos, produção, painel e campanhas. Dados no banco da empresa (Supabase), código no GitHub da empresa, site na Vercel.

## Arquitetura
- Site e CRM: Next.js 14 + TypeScript (pasta `app`, `components`, `lib`).
- Banco, login e arquivos: Supabase (Postgres, Auth, Storage), com RLS em todas as tabelas.
- Hospedagem: Vercel. Código: GitHub.
- Fotos do site: `public/fotos`. Textos das mensagens de WhatsApp: editáveis em `/crm/mensagens`.

## Instalação do zero
1. Supabase: criar projeto (região São Paulo). Em Authentication > Users, criar o usuário administrador (Auto Confirm). Em Sign In / Providers > Email, desligar "Allow new users to sign up".
2. SQL Editor: rodar, nesta ordem, `fase2-banco.sql`, `fase3-crm.sql`, `fase4-whatsapp.sql`, `fase5-agenda.sql`, `fase6-orcamentos.sql`, `fase7-campanhas.sql`, `fase8-seguranca.sql`.
3. GitHub: enviar o conteúdo da pasta do projeto para a raiz do repositório (`package.json` na raiz).
4. Vercel: importar o repositório (framework Next.js, Root Directory vazio). Cadastrar as variáveis de `.env.example`.
5. Testar com `teste-fluxo.sql` e com `docs/TESTES.md`.

## Variáveis de ambiente
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_WHATSAPP`, e opcionais `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`. A chave secret/service_role do Supabase nunca entra no código nem na Vercel do site.

## Mapa do sistema
- Público: `/` (landing e formulário), `/privacidade`.
- Equipe (login): `/login`, `/crm` (funil), `/crm/[id]` (ficha), `/crm/agenda`, `/crm/producao`, `/crm/dashboard`, `/crm/campanhas`, `/crm/mensagens`.
- Funil: 14 etapas. Follow-up automático ao entrar em "Orçamento enviado" (dias 1, 3, 7, 15, 30); cancelado em venda fechada, perdido ou "não contatar".

## O que é gratuito e o que pode custar
Gratuito hoje (R$ 0): Supabase, GitHub e Vercel nos planos gratuitos, WhatsApp Business convencional, banco, login, CRM, orçamentos, painel.
Pode exigir pagamento ou ação extra (confira os termos atuais de cada serviço):
- **Vercel Hobby** é voltado a uso não comercial; uso comercial pode exigir o plano Pro. Alternativa: migrar a hospedagem (o código é portátil).
- **Supabase gratuito** tem limites de banco e arquivos, e pausa projetos sem atividade por cerca de uma semana. Não conte com backups automáticos: veja `docs/BACKUP.md`.
- **Domínio próprio** (ex.: .com.br): custo anual.
- **WhatsApp Business Platform (API oficial)**: pago por conversa; necessário para disparos automáticos. Hoje os envios são manuais, por clique.
- **Google Ads e Meta Ads**: o investimento em anúncios, claro, é pago. As integrações (GA4, GTM, Pixel, Conversions API) são gratuitas, mas dependem de contas e credenciais; a Conversions API exige token e desenvolvimento adicional.
- **n8n**: gratuito para instalar por conta própria, mas precisa de um servidor.

## Segurança
RLS em todas as tabelas, sem acesso público às tabelas; o cadastro público entra só pela função `registrar_lead` (valida dados, exige consentimento, limita 3 cadastros por telefone por hora, campo escondido contra robôs). PDFs de orçamento em bucket privado com link temporário. Versões de orçamento não podem ser editadas nem apagadas. Cabeçalhos de segurança no site; páginas do CRM bloqueadas para buscadores.

## LGPD
Aviso de privacidade em `/privacidade`; consentimento obrigatório de contato e opcional de marketing, com data, finalidade e versão do texto; correção de dados e exclusão total (somente administrador) na ficha do cliente; cookies de medição só após aceite. Este material não substitui revisão jurídica: revise o aviso com um advogado e inclua CNPJ e endereço.

## Conferência após mudanças
Rodar `teste-fluxo.sql` (a mensagem "TESTE OK" em vermelho é o resultado esperado) e o checklist de `docs/TESTES.md`.
