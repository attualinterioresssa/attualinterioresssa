-- ATTUAL INTERIORES - CRM | Fase 6: orçamentos, vendas, produção e entregas
-- Rode DEPOIS do fase5-agenda.sql. Seguro para rodar mais de uma vez.

-- ============ Orçamentos (com histórico de versões) ============
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  ambiente text not null,
  status text not null default 'elaboracao'
    check (status in ('elaboracao','enviado','aceito','recusado','expirado')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists quotations_lead_idx on quotations(lead_id);

create table if not exists quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  versao int not null,
  descricao text,
  materiais text,
  acabamentos text,
  valor_total numeric(12,2) not null check (valor_total >= 0),
  forma_pagamento text,
  prazo text,
  validade date,
  pdf_path text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (quotation_id, versao)
);

-- ============ Vendas, produção e entregas ============
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  quotation_id uuid references quotations(id),
  valor numeric(12,2) not null,
  data_venda date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists sales_lead_idx on sales(lead_id);

create table if not exists production_orders (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  status text not null default 'a_produzir'
    check (status in ('a_produzir','em_producao','pronto','instalacao','entregue')),
  prazo_entrega date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists production_lead_idx on production_orders(lead_id);
create index if not exists production_status_idx on production_orders(status);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  production_order_id uuid not null references production_orders(id) on delete cascade,
  data_entrega date not null default current_date,
  observacoes text,
  created_at timestamptz not null default now()
);

alter table quotations        enable row level security;
alter table quotation_versions enable row level security;
alter table sales             enable row level security;
alter table production_orders enable row level security;
alter table deliveries        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['quotations','sales','production_orders','deliveries'] loop
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Versões de orçamento: só leitura e inclusão. Ninguém edita nem apaga o histórico.
drop policy if exists staff_read on quotation_versions;
create policy staff_read on quotation_versions for select to authenticated using (public.is_staff());
drop policy if exists staff_insert on quotation_versions;
create policy staff_insert on quotation_versions for insert to authenticated with check (public.is_staff());

grant usage on schema public to authenticated;
grant select, insert, update, delete on quotations, sales, production_orders, deliveries to authenticated;
grant select, insert on quotation_versions to authenticated;

-- ============ Arquivos PDF (bucket privado) ============
insert into storage.buckets (id, name, public) values ('orcamentos', 'orcamentos', false)
on conflict (id) do nothing;
drop policy if exists orcamentos_staff on storage.objects;
create policy orcamentos_staff on storage.objects for all to authenticated
  using (bucket_id = 'orcamentos' and public.is_staff())
  with check (bucket_id = 'orcamentos' and public.is_staff());

-- ============ Ações do funil (atômicas) ============
create or replace function public.marcar_enviado(p_quotation uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record; v numeric;
begin
  if not public.is_staff() then raise exception 'sem_permissao'; end if;
  select * into q from quotations where id = p_quotation;
  if not found then raise exception 'orcamento_nao_encontrado'; end if;
  select valor_total into v from quotation_versions where quotation_id = p_quotation order by versao desc limit 1;
  update quotations set status = 'enviado' where id = p_quotation;
  update leads set etapa = 'orcamento_enviado', valor = v where id = q.lead_id;
  insert into activities(lead_id, user_id, tipo, descricao)
  values (q.lead_id, auth.uid(), 'orcamento', 'Orçamento enviado (' || q.ambiente || '): R$ ' || v::text);
end $$;

create or replace function public.fechar_venda(p_quotation uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q record; v numeric; sid uuid; oid uuid;
begin
  if not public.is_staff() then raise exception 'sem_permissao'; end if;
  select * into q from quotations where id = p_quotation;
  if not found then raise exception 'orcamento_nao_encontrado'; end if;
  if q.status = 'aceito' then raise exception 'venda_ja_fechada'; end if;
  select valor_total into v from quotation_versions where quotation_id = p_quotation order by versao desc limit 1;
  insert into sales(lead_id, quotation_id, valor) values (q.lead_id, p_quotation, v) returning id into sid;
  insert into production_orders(sale_id, lead_id) values (sid, q.lead_id) returning id into oid;
  update quotations set status = 'aceito' where id = p_quotation;
  update leads set etapa = 'venda_fechada', valor = v where id = q.lead_id;
  insert into activities(lead_id, user_id, tipo, descricao)
  values (q.lead_id, auth.uid(), 'venda', 'Venda fechada (' || q.ambiente || '): R$ ' || v::text || '. Ordem de produção criada.');
  return oid;
end $$;

create or replace function public.avancar_producao(p_order uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare o record; nova text;
begin
  if not public.is_staff() then raise exception 'sem_permissao'; end if;
  if p_status not in ('a_produzir','em_producao','pronto','instalacao','entregue') then raise exception 'status_invalido'; end if;
  select * into o from production_orders where id = p_order;
  if not found then raise exception 'ordem_nao_encontrada'; end if;
  update production_orders set status = p_status, updated_at = now() where id = p_order;
  nova := case when p_status = 'entregue' then 'entregue'
               when p_status = 'a_produzir' then 'venda_fechada'
               else 'producao' end;
  update leads set etapa = nova where id = o.lead_id;
  if p_status = 'entregue' and not exists (select 1 from deliveries where production_order_id = p_order) then
    insert into deliveries(production_order_id) values (p_order);
  end if;
  insert into activities(lead_id, user_id, tipo, descricao)
  values (o.lead_id, auth.uid(), 'producao', 'Produção: ' || p_status);
end $$;

revoke all on function public.marcar_enviado(uuid), public.fechar_venda(uuid), public.avancar_producao(uuid, text) from public;
grant execute on function public.marcar_enviado(uuid), public.fechar_venda(uuid), public.avancar_producao(uuid, text) to authenticated;

select count(*) as tabelas_ok from information_schema.tables
where table_schema = 'public'
  and table_name in ('quotations','quotation_versions','sales','production_orders','deliveries');
