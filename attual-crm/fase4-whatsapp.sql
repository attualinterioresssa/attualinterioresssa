-- ATTUAL INTERIORES - CRM | Fase 4: WhatsApp e mensagens rápidas
-- Rode DEPOIS do fase3-crm.sql. Seguro para rodar mais de uma vez.

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  corpo text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  user_id uuid references profiles(id),
  canal text not null default 'whatsapp',
  template_slug text,
  mensagem text not null,
  created_at timestamptz not null default now()
);
create index if not exists conversations_lead_idx on conversations(lead_id, created_at desc);

alter table message_templates enable row level security;
alter table conversations     enable row level security;

drop policy if exists staff_all on message_templates;
create policy staff_all on message_templates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_all on conversations;
create policy staff_all on conversations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Variáveis aceitas nos textos: {nome} {servico} {responsavel}
insert into message_templates(slug,titulo,ordem,corpo) values
('boas_vindas','Boas-vindas',1,'Olá, {nome}! Aqui é {responsavel}, da Attual Interiores. Recebi o seu pedido de orçamento de {servico} e vou te ajudar. Podemos conversar agora?'),
('fotos','Solicitação de fotografias',2,'{nome}, para começar o seu projeto de {servico}, pode me enviar fotos do ambiente, as medidas (mesmo aproximadas) e referências que você gosta?'),
('visita','Confirmação de visita',3,'{nome}, estou confirmando a nossa visita para medição e conversa sobre {servico}. Está tudo certo para o horário combinado? Se tiver qualquer imprevisto, é só me avisar por aqui.'),
('orcamento','Envio de orçamento',4,'{nome}, o seu orçamento de {servico} está pronto. Vou te enviar a proposta agora. Qualquer dúvida sobre materiais, prazo ou formas de pagamento, me chame por aqui.'),
('negociacao','Negociação',5,'{nome}, conseguiu analisar a proposta? Posso ajustar materiais ou condições de pagamento para caber melhor no que você precisa. Vamos conversar?'),
('followup','Follow-up',6,'Oi, {nome}! Passando para saber se você teve alguma dúvida sobre o orçamento de {servico}. Fico à disposição para ajustar o que for preciso.'),
('posvenda','Pós-venda',7,'{nome}, como está o seu projeto de {servico}? Queremos saber se está tudo como você esperava. Se precisar de qualquer ajuste, é só falar. Obrigado pela confiança na Attual!')
on conflict (slug) do nothing;

-- Permissões para o login da equipe (evita o erro "permission denied")
grant usage on schema public to authenticated;
grant select, insert, update, delete on message_templates, conversations to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

select count(*) as modelos_criados from message_templates;
