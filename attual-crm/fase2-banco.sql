-- ATTUAL INTERIORES - CRM | Fase 2: captação de leads
-- Cole no Supabase: SQL Editor > New query > Run
-- Seguro para rodar mais de uma vez.

create extension if not exists pgcrypto;

-- ============ Tabelas ============
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  ativo boolean not null default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,            -- somente dígitos
  nascimento date,
  cidade text,
  bairro text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_telefone_uq on customers(telefone);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  service_id uuid references services(id),
  etapa text not null default 'novo_lead',
  classificacao text not null check (classificacao in ('quente','morno','frio')),
  pontuacao int not null,
  origem text, campanha text, anuncio text, conteudo text, termo text,
  gclid text, fbclid text,
  created_at timestamptz not null default now()
);
create index if not exists leads_customer_idx on leads(customer_id);
create index if not exists leads_etapa_idx on leads(etapa);
create index if not exists leads_class_idx on leads(classificacao);
create index if not exists leads_created_idx on leads(created_at desc);

create table if not exists lead_answers (
  lead_id uuid primary key references leads(id) on delete cascade,
  momento text, prazo text, investimento text, projeto text
);

create table if not exists lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  total int not null,
  nivel text not null,
  detalhe jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists lead_scores_lead_idx on lead_scores(lead_id);

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  tipo text not null check (tipo in ('dados','marketing')),
  concedido boolean not null,
  finalidade text not null,
  versao_texto text not null default 'v1',
  created_at timestamptz not null default now()
);
create index if not exists consent_customer_idx on consent_records(customer_id);

create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============ Segurança (RLS) ============
-- RLS ligado e SEM políticas: ninguém de fora lê nem grava direto nas tabelas.
-- Os dados só entram pela função registrar_lead(). O acesso da equipe (login) vem na fase do CRM.
alter table services        enable row level security;
alter table customers       enable row level security;
alter table leads           enable row level security;
alter table lead_answers    enable row level security;
alter table lead_scores     enable row level security;
alter table consent_records enable row level security;
alter table system_settings enable row level security;

-- ============ Dados iniciais ============
insert into services(slug,nome) values
 ('cozinha','Cozinha planejada'),('guarda-roupa','Guarda-roupa'),('quarto','Quarto'),
 ('painel','Painel'),('banheiro','Banheiro'),('escritorio','Escritório'),
 ('personalizado','Móvel personalizado')
on conflict (slug) do nothing;

insert into system_settings(key,value) values ('scoring','{
 "limites":{"quente":65,"morno":35},
 "momento":{"obra_andamento":25,"imovel_pronto":20,"na_planta":10,"pesquisando":0},
 "prazo":{"ate_30d":30,"1_3m":20,"3_6m":10,"sem_prazo":0},
 "investimento":{"acima_40":30,"20_40":25,"10_20":12,"ate_10":3,"nao_informar":8},
 "projeto":{"projeto_medidas":15,"medidas":10,"referencias":5,"nada":0}
}'::jsonb) on conflict (key) do nothing;

-- ============ Função de cadastro (única porta de entrada pública) ============
create or replace function public.registrar_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb; k text; v int; total int := 0; det jsonb := '{}'::jsonb;
  nivel text; tel text; cid uuid; lid uuid; sid uuid;
begin
  tel := regexp_replace(coalesce(p->>'telefone',''), '\D', '', 'g');
  if length(trim(coalesce(p->>'nome',''))) < 3 or length(tel) < 10 or length(tel) > 13 then
    raise exception 'dados_invalidos';
  end if;
  if coalesce((p->>'consent_dados')::boolean,false) is not true then
    raise exception 'consentimento_obrigatorio';
  end if;

  select value into cfg from system_settings where key = 'scoring';
  foreach k in array array['momento','prazo','investimento','projeto'] loop
    v := coalesce((cfg->k->>(p->>k))::int, 0);
    det := det || jsonb_build_object(k, v);
    total := total + v;
  end loop;
  nivel := case
    when total >= (cfg->'limites'->>'quente')::int then 'quente'
    when total >= (cfg->'limites'->>'morno')::int  then 'morno'
    else 'frio' end;

  select id into sid from services where slug = p->>'servico';

  select id into cid from customers where telefone = tel;
  if cid is null then
    insert into customers(nome,telefone,nascimento,cidade,bairro)
    values (left(trim(p->>'nome'),150), tel, nullif(p->>'nascimento','')::date,
            left(p->>'cidade',100), left(p->>'bairro',100))
    returning id into cid;
  end if;

  insert into leads(customer_id,service_id,classificacao,pontuacao,origem,campanha,anuncio,conteudo,termo,gclid,fbclid)
  values (cid,sid,nivel,total,
          left(p->>'utm_source',100), left(p->>'utm_campaign',150), left(p->>'utm_medium',100),
          left(p->>'utm_content',150), left(p->>'utm_term',150),
          left(p->>'gclid',255), left(p->>'fbclid',255))
  returning id into lid;

  insert into lead_answers(lead_id,momento,prazo,investimento,projeto)
  values (lid, p->>'momento', p->>'prazo', p->>'investimento', p->>'projeto');

  insert into lead_scores(lead_id,total,nivel,detalhe) values (lid,total,nivel,det);

  insert into consent_records(customer_id,lead_id,tipo,concedido,finalidade)
  values (cid,lid,'dados',true,'Contato comercial sobre orçamento de móveis planejados');
  insert into consent_records(customer_id,lead_id,tipo,concedido,finalidade)
  values (cid,lid,'marketing',coalesce((p->>'consent_marketing')::boolean,false),'Envio de novidades e ofertas');

  return jsonb_build_object('id_lead', lid, 'classificacao', nivel);
end;
$$;

revoke all on function public.registrar_lead(jsonb) from public;
grant execute on function public.registrar_lead(jsonb) to anon, authenticated;
