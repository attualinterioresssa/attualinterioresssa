-- ATTUAL INTERIORES - CRM | Fase 8: segurança, LGPD e correções
-- Rode DEPOIS do fase7-campanhas.sql. Seguro para rodar mais de uma vez.

-- 1) Nova coluna para a mídia (utm_medium) e correção do nome do anúncio (utm_content)
alter table leads add column if not exists midia text;
do $$
begin
  if not exists (select 1 from system_settings where key = 'backfill_midia') then
    update leads set midia = anuncio, anuncio = conteudo;
    insert into system_settings(key, value) values ('backfill_midia', 'true'::jsonb);
  end if;
end $$;

-- 2) Cadastro público com limite de tentativas e UTMs corretas
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

  -- anti-spam: no máximo 3 cadastros por telefone na última hora
  if (select count(*) from leads where customer_id = cid and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'muitas_tentativas';
  end if;

  insert into leads(customer_id,service_id,classificacao,pontuacao,origem,midia,campanha,anuncio,conteudo,termo,gclid,fbclid)
  values (cid,sid,nivel,total,
          left(p->>'utm_source',100), left(p->>'utm_medium',100), left(p->>'utm_campaign',150),
          left(p->>'utm_content',150), left(p->>'utm_content',150), left(p->>'utm_term',150),
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

-- 3) Endurecimento: visitantes sem login não têm permissão direta em nenhuma tabela
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- 4) LGPD: registro de solicitações e exclusão de cliente (somente administrador)
create table if not exists lgpd_requests (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  executado_por uuid,
  created_at timestamptz not null default now()
);
alter table lgpd_requests enable row level security;
drop policy if exists staff_all on lgpd_requests;
create policy staff_all on lgpd_requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
grant select, insert on lgpd_requests to authenticated;

create or replace function public.excluir_cliente(p_customer uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and papel = 'admin' and ativo) then
    raise exception 'somente_administrador';
  end if;
  delete from customers where id = p_customer;
  insert into lgpd_requests(tipo, executado_por) values ('exclusao', auth.uid());
end $$;
revoke all on function public.excluir_cliente(uuid) from public;
grant execute on function public.excluir_cliente(uuid) to authenticated;

-- 5) Conferência: tabelas sem RLS (deve voltar vazio) e permissões do visitante (deve voltar vazio)
select tablename as tabela_sem_rls from pg_tables where schemaname = 'public' and not rowsecurity;
select table_name as tabela_com_acesso_anon from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
