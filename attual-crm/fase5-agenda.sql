-- ATTUAL INTERIORES - CRM | Fase 5: agenda de visitas e follow-up
-- Rode DEPOIS do fase4-whatsapp.sql. Seguro para rodar mais de uma vez.

alter table leads add column if not exists nao_contatar boolean not null default false;

-- ============ Visitas ============
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  responsavel_id uuid references profiles(id),
  data_hora timestamptz not null,
  endereco text,
  servico text,
  observacoes text,
  status text not null default 'agendada'
    check (status in ('agendada','confirmada','realizada','remarcada','cancelada')),
  created_at timestamptz not null default now()
);
create index if not exists appointments_data_idx on appointments(data_hora);
create index if not exists appointments_lead_idx on appointments(lead_id);

-- ============ Follow-up ============
create table if not exists followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  dia int not null,
  vencimento date not null,
  descricao text not null,
  status text not null default 'pendente' check (status in ('pendente','feito','cancelado')),
  feito_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists followups_venc_idx on followups(vencimento) where status = 'pendente';
create index if not exists followups_lead_idx on followups(lead_id);

alter table appointments enable row level security;
alter table followups    enable row level security;

drop policy if exists staff_all on appointments;
create policy staff_all on appointments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_all on followups;
create policy staff_all on followups for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to authenticated;
grant select, insert, update, delete on appointments, followups to authenticated;

-- ============ Regras automáticas ============
-- Etapa "Orçamento enviado": cria a sequência dos dias 1, 3, 7, 15 e 30.
-- Venda fechada, perdido ou "não contatar": cancela os lembretes pendentes.
create or replace function public.gerenciar_followups() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  d int;
  hoje date := (now() at time zone 'America/Bahia')::date;
begin
  if new.etapa is distinct from old.etapa and new.etapa = 'orcamento_enviado' and not new.nao_contatar then
    update followups set status = 'cancelado' where lead_id = new.id and status = 'pendente';
    foreach d in array array[1,3,7,15,30] loop
      insert into followups(lead_id, dia, vencimento, descricao)
      values (new.id, d, hoje + d,
        case d
          when 1  then 'Verificar recebimento e dúvidas'
          when 3  then 'Verificar interesse e possíveis ajustes'
          when 7  then 'Retomar negociação'
          when 15 then 'Verificar decisão'
          else 'Último contato da sequência'
        end);
    end loop;
    insert into activities(lead_id, user_id, tipo, descricao)
    values (new.id, auth.uid(), 'sistema', 'Sequência de follow-up criada (dias 1, 3, 7, 15 e 30)');
  end if;

  if (new.etapa in ('venda_fechada','perdido') and new.etapa is distinct from old.etapa)
     or (new.nao_contatar and not old.nao_contatar) then
    update followups set status = 'cancelado' where lead_id = new.id and status = 'pendente';
  end if;
  return new;
end $$;

drop trigger if exists trg_followups on leads;
create trigger trg_followups after update of etapa, nao_contatar on leads
  for each row execute function public.gerenciar_followups();

select count(*) as tabelas_ok from information_schema.tables
where table_schema = 'public' and table_name in ('appointments','followups');
