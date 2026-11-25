-- ATTUAL INTERIORES - CRM | Fase 11: custo por item, markup, margem e desconto nas propostas
-- Rode DEPOIS do fase10-contratos.sql. Seguro para rodar mais de uma vez.

-- Custo de cada item (interno: nunca vai para o PDF nem para o contrato)
alter table proposal_items add column if not exists custo numeric(12,2) not null default 0 check (custo >= 0);

-- Desconto da proposta, sempre guardado em R$ (a tela aceita digitar em R$ ou em %)
alter table proposals add column if not exists desconto numeric(12,2) not null default 0 check (desconto >= 0);

-- O contrato guarda o desconto aplicado (e continua bloqueado depois de assinado)
alter table contracts add column if not exists desconto numeric(12,2) not null default 0;
create or replace function public.bloquear_contrato_assinado() returns trigger
language plpgsql as $$
begin
  if old.status = 'assinado' and (
       new.clausulas   is distinct from old.clausulas
    or new.itens       is distinct from old.itens
    or new.total       is distinct from old.total
    or new.desconto    is distinct from old.desconto
    or new.contratante is distinct from old.contratante
    or new.contratada  is distinct from old.contratada
    or new.cronograma  is distinct from old.cronograma
    or new.numero      is distinct from old.numero) then
    raise exception 'contrato_assinado_nao_editavel';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Margem bruta alvo (padrão 35%), ajustável em Propostas > Dados da empresa
update system_settings set value = value || '{"margem_alvo": 35}'::jsonb
where key = 'empresa' and not (value ? 'margem_alvo');

select count(*) as colunas_ok from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'proposal_items' and column_name = 'custo') or
  (table_name = 'proposals' and column_name = 'desconto') or
  (table_name = 'contracts' and column_name = 'desconto'));
