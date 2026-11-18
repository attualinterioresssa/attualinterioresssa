# Attual Interiores — CRM (Fase 2: landing page + captação de leads)

Next.js 14 + TypeScript. O formulário grava no Supabase pela função `registrar_lead` (arquivo `fase2-banco.sql`, rodar no SQL Editor).

## Rodar no computador
1. Instale o Node.js 20 ou superior.
2. Copie `.env.example` para `.env.local`.
3. `npm install` e depois `npm run dev`. Abra http://localhost:3000

## Publicar (GitHub + Vercel)
1. Crie um repositório no GitHub e envie estes arquivos (não envie `.env.local`).
2. Na Vercel: Add New > Project > escolha o repositório > Deploy.
3. Antes do deploy, em Environment Variables, cadastre as 3 variáveis do `.env.example`.
4. Teste o formulário e confira o lead em Supabase > Table Editor > leads.

## Segurança
- Só a chave publishable vai no site. A secret key nunca entra no código nem na Vercel do site.
- As tabelas têm RLS ligado e sem acesso público; o cadastro entra só pela função.

## Fase 3: CRM (login, funil, ficha, tarefas)
1. Supabase > Authentication > Users > Add user (e-mail e senha, marcando "Auto Confirm User").
2. Supabase > Authentication > Sign In / Providers > Email: desligue "Allow new users to sign up".
3. SQL Editor: rode `fase3-crm.sql` (depois do `fase2-banco.sql`).
4. Envie os arquivos novos ao GitHub; a Vercel publica sozinha.
5. Acesse `/login` no site e entre com o e-mail e a senha criados.
Páginas: `/crm` (funil Kanban), `/crm/<id>` (ficha), `/privacidade` (aviso de privacidade).

## Fase 4: WhatsApp e mensagens rápidas
1. SQL Editor: rode `fase4-whatsapp.sql` (depois do `fase3-crm.sql`).
2. Envie os arquivos novos ao GitHub.
3. Na ficha do cliente, use "Mensagens rápidas". Os modelos são editados em `/crm/mensagens`.

## Fase 5: agenda de visitas e follow-up
1. SQL Editor: rode `fase5-agenda.sql` (depois do `fase4-whatsapp.sql`).
2. Envie os arquivos novos ao GitHub (atenção às pastas `app/crm/agenda`, `app/crm/[id]` e `components`).
3. Ao mover um lead para "Orçamento enviado", o sistema cria lembretes nos dias 1, 3, 7, 15 e 30, visíveis em `/crm/agenda`.
4. Venda fechada, perdido ou "não contatar" cancelam os lembretes pendentes.

## Fase 6: orçamentos, vendas, produção e entregas
1. SQL Editor: rode `fase6-orcamentos.sql` (depois do `fase5-agenda.sql`).
2. Envie os arquivos novos ao GitHub (pasta inteira, conteúdo do zip).
3. Na ficha do cliente: "Orçamentos" (versões, PDF privado, enviar, fechar venda) e "Produção". Painel geral em `/crm/producao`.

## Fase 7: dashboard e campanhas
1. SQL Editor: rode `fase7-campanhas.sql` (depois do `fase6-orcamentos.sql`).
2. Envie os arquivos novos ao GitHub (conteúdo inteiro do zip).
3. `/crm/dashboard`: indicadores, gráficos por período e exportação CSV. `/crm/campanhas`: lançamentos de investimento (manual ou CSV) e análise por campanha. As integrações com Google Ads, GA4, GTM, Meta Pixel e Conversions API aparecem como pendentes.

## Fase 8: segurança, LGPD, testes e documentação
1. SQL Editor: rode `fase8-seguranca.sql`. As duas consultas finais devem voltar vazias.
2. SQL Editor: rode `teste-fluxo.sql`. Deve aparecer "TESTE OK (nada foi gravado)" em vermelho.
3. Envie os arquivos novos ao GitHub (conteúdo inteiro do zip).
4. Documentação em `docs/`: DOCUMENTACAO.md, TESTES.md e BACKUP.md.
5. Pixels: preencha `NEXT_PUBLIC_GTM_ID` ou `NEXT_PUBLIC_META_PIXEL_ID` na Vercel quando tiver os IDs. O banner de cookies aparece só nesse caso.

## Fase 9: propostas comerciais (PDF no modelo da empresa)
1. SQL Editor: rode `fase9-propostas.sql` (depois do `fase8-seguranca.sql`).
2. Envie os arquivos novos ao GitHub, mantendo as pastas (`app/crm/propostas`, `lib`, `public/logo.png`).
3. `/crm/propostas/empresa`: preencha telefone, banco, agência e conta, titular e PIX (só o administrador salva).
4. Na ficha do cliente: "Redigir proposta (PDF)". No editor, "Ver / Imprimir PDF" e "Registrar no funil como orçamento".

## Fase 10: contratos e segundo modelo de proposta
1. SQL Editor: rode `fase10-contratos.sql` (depois do `fase9-propostas.sql`).
2. Envie os arquivos novos ao GitHub (conteúdo inteiro do zip).
3. `/crm/propostas/empresa`: preencha também os dados do representante legal (nome, cargo, qualificação e CPF).
4. Na proposta: escolha o modelo do PDF (clássico ou moderno) e use "Gerar contrato". O contrato nasce com as cláusulas do modelo da empresa, todas editáveis; depois: Ver / Imprimir PDF, Enviar pelo WhatsApp, anexar o PDF assinado e Marcar como assinado (bloqueia o texto e fecha a venda no funil quando a proposta foi registrada como orçamento).

## Fase 11: medidor de markup nas propostas
1. SQL Editor: rode `fase11-markup.sql` (depois do `fase10-contratos.sql`).
2. Envie os arquivos novos ao GitHub (conteúdo inteiro do zip).
3. Na proposta: informe o custo interno de cada item. O painel mostra custo, venda, lucro, margem, markup, simulador e desconto limite seguro. A meta de margem (padrão 35%) fica em Propostas > Dados da empresa. Custos e margem nunca aparecem no PDF do cliente.
