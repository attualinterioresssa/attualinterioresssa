-- ATTUAL INTERIORES - CRM | Engenharia, Etapa 3: cadastro de materiais e ferramentas
-- Rode DEPOIS do eng-etapa2-estrutura.sql. Seguro para rodar mais de uma vez.
-- Acrescenta a categoria "ferramenta". Ferramentas não entram no custo por peça (entram nos custos indiretos, etapa 7).
alter table eng_materiais drop constraint if exists eng_materiais_categoria_check;
alter table eng_materiais add constraint eng_materiais_categoria_check
  check (categoria in ('chapa','fita','ferragem','insumo','embalagem','ferramenta'));

-- Conferência (esperado: 1)
select count(*) as categorias_ok from pg_constraint where conname = 'eng_materiais_categoria_check';
