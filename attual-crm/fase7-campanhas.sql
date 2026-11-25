-- ATTUAL INTERIORES - CRM | Fase 7: dashboard e campanhas
-- Rode DEPOIS do fase6-orcamentos.sql. Seguro para rodar mais de uma vez.

-- Lançamentos de investimento por campanha (digitados ou importados de relatórios em CSV).
-- Nada aqui é buscado automaticamente do Google Ads ou do Meta: integração pendente até haver credenciais.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  plataforma text not null default 'meta' check (plataforma in ('google','meta','outro')),
  campanha text not null,
  grupo_anuncios text,
  anuncio text,
  palavra_chave text,
  investimento numeric(12,2) not null default 0 check (investimento >= 0),
  impressoes int,
  cliques int,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists campaigns_data_idx on campaigns(data desc);
create index if not exists campaigns_nome_idx on campaigns(lower(campanha));

alter table campaigns enable row level security;
drop policy if exists staff_all on campaigns;
create policy staff_all on campaigns for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to authenticated;
grant select, insert, update, delete on campaigns to authenticated;

select count(*) as tabelas_ok from information_schema.tables
where table_schema = 'public' and table_name = 'campaigns';
