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
