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
