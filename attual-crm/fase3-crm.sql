-- ATTUAL INTERIORES - CRM | Fase 3: login da equipe, funil, histórico e tarefas
-- Rode DEPOIS do fase2-banco.sql e DEPOIS de criar o usuário em Authentication > Users.
-- Seguro para rodar mais de uma vez.

-- ============ Perfis da equipe ============
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null default 'comercial' check (papel in ('admin','comercial')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and ativo)
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ============ Ajustes em leads ============
alter table leads add column if not exists responsavel_id uuid references profiles(id);
alter table leads add column if not exists valor numeric(12,2);
alter table leads drop constraint if exists leads_etapa_chk;
alter table leads add constraint leads_etapa_chk check (etapa in (
  'novo_lead','qualificado','contato_realizado','visita_agendada','visita_realizada',
  'orcamento_elaboracao','orcamento_enviado','em_negociacao','follow_up','venda_fechada',
  'producao','entregue','pos_venda','perdido'));
create index if not exists leads_responsavel_idx on leads(responsavel_id);

-- ============ Histórico e tarefas ============
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  user_id uuid references profiles(id),
  tipo text not null default 'nota',
  descricao text not null,
  created_at timestamptz not null default now()
);
create index if not exists activities_lead_idx on activities(lead_id, created_at desc);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  titulo text not null,
  vencimento date,
  concluida boolean not null default false,
  responsavel_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists tasks_lead_idx on tasks(lead_id);
create index if not exists tasks_venc_idx on tasks(vencimento) where not concluida;

alter table activities enable row level security;
alter table tasks      enable row level security;

-- ============ Políticas: só a equipe logada (e ativa) acessa ============
do $$
declare t text;
begin
  foreach t in array array['services','customers','leads','lead_answers','activities','tasks'] loop
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
  foreach t in array array['lead_scores','consent_records','system_settings','profiles'] loop
    execute format('drop policy if exists staff_read on %I', t);
    execute format('create policy staff_read on %I for select to authenticated using (public.is_staff())', t);
  end loop;
end $$;

-- ============ Histórico automático ============
create or replace function public.log_lead_novo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activities(lead_id,tipo,descricao)
  values (new.id,'sistema','Lead criado pelo formulário (' || new.classificacao || ', ' || new.pontuacao || ' pontos)');
  return new;
end $$;
drop trigger if exists trg_lead_novo on leads;
create trigger trg_lead_novo after insert on leads for each row execute function public.log_lead_novo();

create or replace function public.log_lead_etapa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.etapa is distinct from old.etapa then
    insert into activities(lead_id,user_id,tipo,descricao)
    values (new.id, auth.uid(), 'etapa', 'Etapa alterada: ' || old.etapa || ' → ' || new.etapa);
  end if;
  return new;
end $$;
drop trigger if exists trg_lead_etapa on leads;
create trigger trg_lead_etapa after update of etapa on leads for each row execute function public.log_lead_etapa();

-- ============ Perfil do administrador ============
-- Só funciona se o usuário já existir em Authentication > Users.
insert into profiles(id, nome, papel)
select id, 'Erilan Jesus dos Santos', 'admin' from auth.users
where email = 'erilandossantos@gmail.com'
on conflict (id) do nothing;

select count(*) as perfis_criados from profiles;
