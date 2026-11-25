-- ATTUAL INTERIORES - CRM | Engenharia, Etapa 2: REVERSÃO
-- Remove SOMENTE os objetos do módulo Engenharia (prefixo eng_). Nenhuma tabela do CRM é tocada.
-- Use apenas se quiser desfazer a etapa 2. Os dados cadastrados nas tabelas eng_ serão perdidos.
drop view if exists public.eng_estoque_saldo;
drop table if exists public.eng_estoque_movimentos, public.eng_estoque_sobras, public.eng_orcamento_itens, public.eng_orcamentos,
  public.eng_planos_corte, public.eng_pecas, public.eng_arquivos, public.eng_projetos, public.eng_regras,
  public.eng_precos_historico, public.eng_materiais, public.eng_fornecedores cascade;
drop function if exists public.eng_guarda_orcamento();
drop function if exists public.eng_preco_antes();
drop function if exists public.eng_preco_depois();
drop function if exists public.eng_set_updated_at();
drop policy if exists projetos_staff on storage.objects;
-- A função is_admin() é mantida (inofensiva). O bucket "projetos" deve ser apagado pela tela Storage do Supabase
-- (o Supabase bloqueia apagar buckets por SQL).
