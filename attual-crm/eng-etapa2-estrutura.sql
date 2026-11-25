-- ATTUAL INTERIORES - CRM | Módulo ENGENHARIA E ORÇAMENTOS | Etapa 2: estrutura do banco
-- Somente ADIÇÃO: cria objetos novos, todos com o prefixo eng_. Não altera nem apaga nada do CRM atual.
-- As tabelas nascem VAZIAS (nenhum dado fictício). Seguro para rodar mais de uma vez.
-- Reversão: eng-etapa2-reversao.sql | Teste: eng-etapa2-teste.sql

-- 0) Pré-requisitos do CRM atual
do $$
begin
  if to_regprocedure('public.is_staff()') is null then
    raise exception 'Falta a função is_staff() (fase3-crm.sql).';
  end if;
  if to_regclass('public.leads') is null or to_regclass('public.profiles') is null then
    raise exception 'Faltam as tabelas leads ou profiles.';
  end if;
end $$;

-- 1) Funções auxiliares novas
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and papel = 'admin' and ativo)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.eng_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- 2) Catálogo: fornecedores e materiais (preços só o administrador altera)
create table if not exists eng_fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text, telefone text, email text, observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists eng_fornecedores_nome_uq on eng_fornecedores (lower(nome));

-- Unidade de cada categoria: chapa = 'chapa'; fita = 'rolo'; ferragem, insumo e embalagem = 'un','m','kg','l','pct','cx' etc.
-- preco_compra é o preço da UNIDADE de compra (por chapa, por rolo, por unidade...).
create table if not exists eng_materiais (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('chapa','fita','ferragem','insumo','embalagem')),
  subcategoria text,                       -- ex.: mdf, dobradica, corredica, puxador, cola, plastico-bolha
  nome text not null,
  marca text,
  fornecedor_id uuid references eng_fornecedores(id) on delete set null,
  unidade text not null check (unidade in ('un','m','m2','chapa','rolo','kg','l','pct','cx')),
  espessura_mm numeric(6,2) check (espessura_mm is null or espessura_mm > 0),
  largura_mm numeric(8,2) check (largura_mm is null or largura_mm > 0),
  comprimento_mm numeric(8,2) check (comprimento_mm is null or comprimento_mm > 0),
  cor text, padrao text,
  tem_veio boolean not null default false,
  metragem_rolo_m numeric(10,2) check (metragem_rolo_m is null or metragem_rolo_m > 0),
  atributos jsonb not null default '{}'::jsonb,
  preco_compra numeric(14,4) not null default 0 check (preco_compra >= 0),
  preco_atualizado_em date,
  ativo boolean not null default true,
  observacoes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eng_chapa_medidas check (categoria <> 'chapa' or (espessura_mm is not null and largura_mm is not null and comprimento_mm is not null)),
  constraint eng_fita_medidas check (categoria <> 'fita' or (espessura_mm is not null and largura_mm is not null and metragem_rolo_m is not null))
);
create index if not exists eng_materiais_categoria_idx on eng_materiais (categoria, ativo);
create index if not exists eng_materiais_fornecedor_idx on eng_materiais (fornecedor_id);

-- Histórico de preços: só leitura e inclusão (ninguém edita nem apaga). Preenchido automaticamente por gatilho.
create table if not exists eng_precos_historico (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references eng_materiais(id) on delete cascade,
  preco numeric(14,4) not null check (preco >= 0),
  fornecedor_id uuid references eng_fornecedores(id) on delete set null,
  data_preco date not null,
  motivo text,
  registrado_por uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists eng_precos_hist_idx on eng_precos_historico (material_id, data_preco desc);

-- Regras configuráveis (ferragens, fixação, insumos) por tipo de móvel. A fórmula é validada pelo motor de cálculo (etapa 4).
create table if not exists eng_regras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo_movel text not null default 'generico',
  componente text not null,                -- ex.: dobradica, corredica, puxador, minifix, cavilha, parafuso, cola
  material_id uuid references eng_materiais(id) on delete set null,
  formula jsonb not null,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_regras_tipo_idx on eng_regras (tipo_movel, componente);

-- 3) Projetos, arquivos e peças (ligados à oportunidade do funil)
create table if not exists eng_projetos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,   -- cliente e oportunidade vêm do lead (sem duplicar cadastro)
  nome text not null,
  ambiente text,
  origem text not null default 'manual' check (origem in ('construtor','manual','importacao','misto')),
  status text not null default 'rascunho' check (status in ('rascunho','em_analise','validado','orcado','cancelado')),
  observacoes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_projetos_lead_idx on eng_projetos (lead_id);
create index if not exists eng_projetos_status_idx on eng_projetos (status);

create table if not exists eng_arquivos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references eng_projetos(id) on delete cascade,
  nome_original text not null,
  storage_path text not null,              -- caminho no bucket privado "projetos"
  formato text,                            -- pdf, jpg, png, dxf, xlsx, csv, xml, outro
  tamanho_bytes bigint,
  adaptador text,
  status_leitura text not null default 'pendente' check (status_leitura in ('pendente','lido','parcial','falhou')),
  relatorio jsonb not null default '{}'::jsonb,   -- relatório de leitura: avisos e inconsistências
  enviado_por uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists eng_arquivos_projeto_idx on eng_arquivos (projeto_id);

-- Fitas de borda: "frontal" e "traseira" = bordas ao longo do COMPRIMENTO da peça; "lateral" = bordas ao longo da LARGURA.
create table if not exists eng_pecas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references eng_projetos(id) on delete cascade,
  modulo text,
  nome text not null,
  tipo text not null default 'outro' check (tipo in ('lateral','base','tampo','porta','gaveta_frente','gaveta_lateral','gaveta_fundo','fundo','prateleira','travessa','rodape','painel','outro')),
  comprimento_mm numeric(8,2) not null check (comprimento_mm > 0),
  largura_mm numeric(8,2) not null check (largura_mm > 0),
  espessura_mm numeric(6,2) not null check (espessura_mm > 0),
  quantidade int not null default 1 check (quantidade > 0),
  material_id uuid references eng_materiais(id) on delete set null,
  material_texto text,                     -- como o material veio escrito no arquivo de origem
  padrao_cor text,
  sentido_veio text not null default 'sem_veio' check (sentido_veio in ('comprimento','largura','sem_veio')),
  fita_frontal boolean not null default false,
  fita_traseira boolean not null default false,
  fita_lateral_esq boolean not null default false,
  fita_lateral_dir boolean not null default false,
  fita_material_id uuid references eng_materiais(id) on delete set null,
  observacoes text,
  origem text not null default 'manual',   -- construtor, manual ou o nome do adaptador de importação
  confianca text not null default 'alta' check (confianca in ('alta','media','baixa')),
  conferida boolean not null default false, -- conferida por uma pessoa
  alertas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_pecas_projeto_idx on eng_pecas (projeto_id);
create index if not exists eng_pecas_pendentes_idx on eng_pecas (projeto_id) where not conferida and confianca <> 'alta';

-- 4) Plano de corte (só vale como "calculado" se gerado pelo nosso algoritmo; relatório de terceiros fica "importado")
create table if not exists eng_planos_corte (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references eng_projetos(id) on delete cascade,
  material_id uuid references eng_materiais(id) on delete set null,
  versao int not null default 1,
  algoritmo text not null,
  parametros jsonb not null default '{}'::jsonb,   -- espessura da serra, rotação, margens
  total_chapas int,
  aproveitamento_pct numeric(5,2) check (aproveitamento_pct is null or (aproveitamento_pct >= 0 and aproveitamento_pct <= 100)),
  perda_pct numeric(5,2) check (perda_pct is null or (perda_pct >= 0 and perda_pct <= 100)),
  resultado jsonb not null default '{}'::jsonb,
  status text not null default 'calculado' check (status in ('calculado','importado','invalidado')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (projeto_id, material_id, versao)
);

-- 5) Orçamentos de engenharia (cliente e oportunidade vêm do projeto, que vem do lead)
create table if not exists eng_orcamentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references eng_projetos(id) on delete cascade,
  proposal_id uuid references proposals(id) on delete set null,   -- proposta comercial gerada (reaproveita o PDF atual)
  versao int not null default 1,
  status text not null default 'rascunho' check (status in ('rascunho','definitivo','enviado','cancelado')),
  custo_reposicao numeric(14,2),
  custo_estoque numeric(14,2),
  preco_minimo numeric(14,2),
  preco_recomendado numeric(14,2),
  margem_pct numeric(7,2),
  markup numeric(8,3),
  parametros jsonb not null default '{}'::jsonb,   -- impostos, despesas e política usados no cálculo
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (projeto_id, versao)
);
create index if not exists eng_orcamentos_projeto_idx on eng_orcamentos (projeto_id);

create table if not exists eng_orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references eng_orcamentos(id) on delete cascade,
  categoria text not null check (categoria in ('chapa','fita','ferragem','insumo','embalagem','mao_de_obra','instalacao','transporte','indireto','imposto','outro')),
  descricao text not null,
  material_id uuid references eng_materiais(id) on delete set null,
  ambiente text,
  quantidade numeric(14,4),
  unidade text,
  custo_unitario numeric(14,4),
  custo_total numeric(14,2) not null default 0,
  base_custo text not null default 'reposicao' check (base_custo in ('reposicao','estoque')),
  created_at timestamptz not null default now()
);
create index if not exists eng_orc_itens_idx on eng_orcamento_itens (orcamento_id);

-- 6) Estoque (opcional). Sobras de MDF têm custo atribuído (nunca "custo zero").
create table if not exists eng_estoque_sobras (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references eng_materiais(id) on delete restrict,   -- chapa de origem (cor, padrão e espessura)
  comprimento_mm numeric(8,2) not null check (comprimento_mm > 0),
  largura_mm numeric(8,2) not null check (largura_mm > 0),
  espessura_mm numeric(6,2) not null check (espessura_mm > 0),
  quantidade int not null default 1 check (quantidade > 0),
  custo_atribuido numeric(14,2) not null default 0 check (custo_atribuido >= 0),
  status text not null default 'disponivel' check (status in ('disponivel','reservada','consumida')),
  origem_projeto_id uuid references eng_projetos(id) on delete set null,
  local text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists eng_sobras_material_idx on eng_estoque_sobras (material_id, status);

-- Movimentos: entrada (+), saida = consumo (-), ajuste (+ ou -), reserva e liberacao (não alteram o total, só o reservado).
create table if not exists eng_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada','saida','reserva','liberacao','ajuste')),
  material_id uuid references eng_materiais(id) on delete restrict,
  sobra_id uuid references eng_estoque_sobras(id) on delete restrict,
  quantidade numeric(14,4) not null,
  projeto_id uuid references eng_projetos(id) on delete set null,
  orcamento_id uuid references eng_orcamentos(id) on delete set null,
  custo_unitario numeric(14,4),
  observacoes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  constraint eng_mov_item check (material_id is not null or sobra_id is not null),
  constraint eng_mov_qtd check ((tipo = 'ajuste' and quantidade <> 0) or (tipo <> 'ajuste' and quantidade > 0))
);
create index if not exists eng_mov_material_idx on eng_estoque_movimentos (material_id, created_at desc);

create or replace view public.eng_estoque_saldo with (security_invoker = true) as
select m.material_id,
  coalesce(sum(case m.tipo when 'entrada' then m.quantidade when 'saida' then -m.quantidade when 'ajuste' then m.quantidade else 0 end), 0) as total,
  coalesce(sum(case m.tipo when 'reserva' then m.quantidade when 'liberacao' then -m.quantidade else 0 end), 0) as reservado,
  coalesce(sum(case m.tipo when 'entrada' then m.quantidade when 'saida' then -m.quantidade when 'ajuste' then m.quantidade else 0 end), 0)
    - coalesce(sum(case m.tipo when 'reserva' then m.quantidade when 'liberacao' then -m.quantidade else 0 end), 0) as disponivel,
  coalesce(sum(case m.tipo when 'saida' then m.quantidade else 0 end), 0) as consumido
from eng_estoque_movimentos m
where m.material_id is not null
group by m.material_id;

-- 7) Gatilhos
-- 7a) Preço: registra a data e o histórico sempre que o preço de compra muda
create or replace function public.eng_preco_antes() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.preco_atualizado_em := (now() at time zone 'America/Bahia')::date;
  elsif new.preco_compra is distinct from old.preco_compra then
    new.preco_atualizado_em := (now() at time zone 'America/Bahia')::date;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.eng_preco_depois() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into eng_precos_historico (material_id, preco, fornecedor_id, data_preco, registrado_por)
    values (new.id, new.preco_compra, new.fornecedor_id, new.preco_atualizado_em, auth.uid());
  elsif new.preco_compra is distinct from old.preco_compra then
    insert into eng_precos_historico (material_id, preco, fornecedor_id, data_preco, registrado_por)
    values (new.id, new.preco_compra, new.fornecedor_id, new.preco_atualizado_em, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_eng_preco_antes on eng_materiais;
create trigger trg_eng_preco_antes before insert or update on eng_materiais
  for each row execute function public.eng_preco_antes();
drop trigger if exists trg_eng_preco_depois on eng_materiais;
create trigger trg_eng_preco_depois after insert or update of preco_compra on eng_materiais
  for each row execute function public.eng_preco_depois();

-- 7b) Orçamento definitivo ou enviado exige peças e nenhuma peça incerta sem conferência
create or replace function public.eng_guarda_orcamento() returns trigger
language plpgsql as $$
begin
  if new.status in ('definitivo','enviado') then
    if not exists (select 1 from eng_pecas where projeto_id = new.projeto_id) then
      raise exception 'projeto_sem_pecas';
    end if;
    if exists (select 1 from eng_pecas where projeto_id = new.projeto_id and not conferida and confianca <> 'alta') then
      raise exception 'pecas_nao_conferidas';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_eng_guarda_orcamento on eng_orcamentos;
create trigger trg_eng_guarda_orcamento before insert or update on eng_orcamentos
  for each row execute function public.eng_guarda_orcamento();

-- 7c) updated_at automático nas demais tabelas
do $$
declare t text;
begin
  foreach t in array array['eng_fornecedores','eng_regras','eng_projetos','eng_pecas','eng_estoque_sobras'] loop
    execute format('drop trigger if exists trg_%1$s_upd on %1$I', t);
    execute format('create trigger trg_%1$s_upd before update on %1$I for each row execute function public.eng_set_updated_at()', t);
  end loop;
end $$;

-- 8) Segurança (RLS). Catálogo e preços: equipe lê, só o administrador altera. Trabalho do dia a dia: equipe ativa.
alter table eng_fornecedores       enable row level security;
alter table eng_materiais          enable row level security;
alter table eng_precos_historico   enable row level security;
alter table eng_regras             enable row level security;
alter table eng_projetos           enable row level security;
alter table eng_arquivos           enable row level security;
alter table eng_pecas              enable row level security;
alter table eng_planos_corte       enable row level security;
alter table eng_orcamentos         enable row level security;
alter table eng_orcamento_itens    enable row level security;
alter table eng_estoque_sobras     enable row level security;
alter table eng_estoque_movimentos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['eng_fornecedores','eng_materiais','eng_regras'] loop
    execute format('drop policy if exists staff_read on %I', t);
    execute format('create policy staff_read on %I for select to authenticated using (public.is_staff())', t);
    execute format('drop policy if exists admin_write on %I', t);
    execute format('create policy admin_write on %I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
  foreach t in array array['eng_projetos','eng_arquivos','eng_pecas','eng_planos_corte','eng_orcamentos','eng_orcamento_itens','eng_estoque_sobras','eng_estoque_movimentos'] loop
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists staff_read on eng_precos_historico;
create policy staff_read on eng_precos_historico for select to authenticated using (public.is_staff());
drop policy if exists admin_insert on eng_precos_historico;
create policy admin_insert on eng_precos_historico for insert to authenticated with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on eng_fornecedores, eng_materiais, eng_regras, eng_projetos, eng_arquivos, eng_pecas,
  eng_planos_corte, eng_orcamentos, eng_orcamento_itens, eng_estoque_sobras, eng_estoque_movimentos to authenticated;
grant select, insert on eng_precos_historico to authenticated;
grant select on eng_estoque_saldo to authenticated;

-- 9) Arquivos dos projetos importados (bucket privado)
insert into storage.buckets (id, name, public) values ('projetos', 'projetos', false) on conflict (id) do nothing;
drop policy if exists projetos_staff on storage.objects;
create policy projetos_staff on storage.objects for all to authenticated
  using (bucket_id = 'projetos' and public.is_staff())
  with check (bucket_id = 'projetos' and public.is_staff());

-- 10) Conferência (esperado: eng_tabelas = 12 e com_rls = 12)
select count(*) as eng_tabelas, count(*) filter (where relrowsecurity) as com_rls
from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'eng\_%';
