-- ATTUAL INTERIORES - CRM | Fase 10: contratos + segundo modelo de proposta
-- Rode DEPOIS do fase9-propostas.sql. Seguro para rodar mais de uma vez.
-- Este arquivo substitui qualquer rascunho anterior do fase10.

-- 0) Se existir uma tabela "contracts" de um rascunho antigo (com coluna "texto") e ela estiver vazia, ela é recriada.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='contracts' and column_name='texto') then
    if (select count(*) from contracts) = 0 then
      drop table contracts cascade;
    else
      raise exception 'Existe uma tabela contracts antiga com dados. Não continue: me avise antes.';
    end if;
  end if;
end $$;

-- 1) Segundo modelo de proposta (linhas vermelhas) e campos novos
alter table proposals add column if not exists layout text not null default 'classico';
alter table proposals drop constraint if exists proposals_layout_chk;
alter table proposals add constraint proposals_layout_chk check (layout in ('classico','moderno'));
alter table proposals add column if not exists arquiteto text;
alter table proposals add column if not exists responsavel text;

-- 2) Contratos
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  proposal_id uuid references proposals(id) on delete set null,
  numero text not null,
  data date not null default ((now() at time zone 'America/Bahia')::date),
  status text not null default 'rascunho' check (status in ('rascunho','enviado','assinado','cancelado')),
  contratante jsonb not null default '{}'::jsonb,
  contratada jsonb not null default '{}'::jsonb,
  itens jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  forma_pagamento text,
  cronograma jsonb not null default '[]'::jsonb,
  prazo_entrega text,
  vigencia text,
  foro text,
  garantia_mdf text,
  garantia_ferragens text,
  clausulas jsonb not null default '[]'::jsonb,
  testemunhas jsonb not null default '[]'::jsonb,
  pdf_path text,
  assinado_em timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contracts_lead_idx on contracts(lead_id);
create index if not exists contracts_status_idx on contracts(status);

alter table contracts enable row level security;
drop policy if exists staff_all on contracts;
create policy staff_all on contracts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant usage on schema public to authenticated;
grant select, insert, update, delete on contracts to authenticated;

-- Contrato assinado não pode ter texto, partes, itens, valor ou parcelas alterados.
create or replace function public.bloquear_contrato_assinado() returns trigger
language plpgsql as $$
begin
  if old.status = 'assinado' and (
       new.clausulas   is distinct from old.clausulas
    or new.itens       is distinct from old.itens
    or new.total       is distinct from old.total
    or new.contratante is distinct from old.contratante
    or new.contratada  is distinct from old.contratada
    or new.cronograma  is distinct from old.cronograma
    or new.numero      is distinct from old.numero) then
    raise exception 'contrato_assinado_nao_editavel';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_contrato_assinado on contracts;
create trigger trg_contrato_assinado before update on contracts
  for each row execute function public.bloquear_contrato_assinado();

-- 3) Contrato assinado: arquivo em bucket privado
insert into storage.buckets (id, name, public) values ('contratos', 'contratos', false)
on conflict (id) do nothing;
drop policy if exists contratos_staff on storage.objects;
create policy contratos_staff on storage.objects for all to authenticated
  using (bucket_id = 'contratos' and public.is_staff())
  with check (bucket_id = 'contratos' and public.is_staff());

-- 4) Numeração sugerida (ex.: 001-11/2026). O número pode ser editado em cada contrato.
create or replace function public.proximo_numero_contrato() returns text
language sql security definer set search_path = public as $$
  select lpad((count(*) + 1)::text, 3, '0') || '-' || to_char(now() at time zone 'America/Bahia', 'MM/YYYY')
  from contracts where public.is_staff()
$$;
revoke all on function public.proximo_numero_contrato() from public;
grant execute on function public.proximo_numero_contrato() to authenticated;

select count(*) as tabelas_ok from information_schema.tables where table_schema = 'public' and table_name = 'contracts';
