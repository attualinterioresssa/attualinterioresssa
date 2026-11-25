-- ATTUAL INTERIORES - CRM | Fase 9: propostas comerciais (modelo em PDF)
-- Rode DEPOIS do fase8-seguranca.sql. Seguro para rodar mais de uma vez.

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  quotation_id uuid references quotations(id) on delete set null,
  numero text not null,
  data date not null default ((now() at time zone 'America/Bahia')::date),
  cliente_nome text not null,
  cliente_doc text,
  cliente_tel text,
  cliente_email text,
  cliente_endereco text,
  projeto text,
  endereco_obra text,
  validade_dias int not null default 15,
  prazo_entrega text,
  cond_pagamento text not null default 'A combinar',
  observacoes text,
  status text not null default 'rascunho' check (status in ('rascunho','enviada','aceita','recusada')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists proposals_lead_idx on proposals(lead_id);
create index if not exists proposals_data_idx on proposals(data desc);

create table if not exists proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals(id) on delete cascade,
  ambiente text not null,
  ordem int not null default 0,
  descricao text not null,
  qtd int not null default 1 check (qtd > 0),
  valor numeric(12,2) not null default 0 check (valor >= 0)
);
create index if not exists proposal_items_prop_idx on proposal_items(proposal_id, ordem);

alter table proposals      enable row level security;
alter table proposal_items enable row level security;
do $$
declare t text;
begin
  foreach t in array array['proposals','proposal_items'] loop
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on proposals, proposal_items to authenticated;

-- Dados da empresa (somente o administrador altera; a equipe lê)
drop policy if exists admin_write on system_settings;
create policy admin_write on system_settings for all to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and papel = 'admin' and ativo))
  with check (exists (select 1 from profiles where id = auth.uid() and papel = 'admin' and ativo));
grant select, insert, update on system_settings to authenticated;

-- Banco, agência, conta, PIX e telefone NÃO são preenchidos aqui: cadastre pela tela "Dados da empresa".
insert into system_settings(key, value) values ('empresa', jsonb_build_object(
  'razao_social', 'Attual Interiores, Design e Marcenaria LTDA.',
  'cnpj', '43.201.471/0001-70',
  'endereco', 'Durval Neves da Rocha, 48, Salvador, BA - CEP 40255-180',
  'validade_dias', 15,
  'prazo_entrega', '35 dias úteis',
  'observacoes_padrao', 'Não estão inclusos neste orçamento materiais e serviços como: gesso, granito e/ou mármore, instalações elétricas e hidráulicas, puxadores em geral (exceto puxadores tipo gola ou cava). Vidros e espelhos só estarão inclusos os que estiverem conjugados aos móveis, como portas, prateleiras e tampos de mesa.'
)) on conflict (key) do nothing;

-- Numeração sugerida: sequência do mês + mês/ano (ex.: 1-11/26). O número pode ser editado na proposta.
create or replace function public.proximo_numero_proposta() returns text
language sql security definer set search_path = public as $$
  select (count(*) + 1)::text || '-' || to_char(now() at time zone 'America/Bahia', 'MM/YY')
  from proposals
  where public.is_staff()
    and date_trunc('month', created_at at time zone 'America/Bahia') = date_trunc('month', now() at time zone 'America/Bahia')
$$;
revoke all on function public.proximo_numero_proposta() from public;
grant execute on function public.proximo_numero_proposta() to authenticated;

select count(*) as tabelas_ok from information_schema.tables
where table_schema = 'public' and table_name in ('proposals','proposal_items');
