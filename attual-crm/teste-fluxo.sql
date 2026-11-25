-- ATTUAL INTERIORES - CRM | Teste automático do fluxo comercial (passos 3 a 15 do Módulo 14)
-- Roda tudo e DESFAZ no final: nada fica gravado. Uma mensagem "TESTE OK" em vermelho é o resultado esperado.
do $$
declare uid uuid; r jsonb; lid uuid; qid uuid; oid uuid; n int;
begin
  select id into uid from profiles where papel = 'admin' and ativo limit 1;
  if uid is null then raise exception 'FALHOU: nenhum administrador em profiles (rode o fase3-crm.sql)'; end if;
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);

  -- 3 a 5: formulário, pontuação e cadastro salvo
  r := public.registrar_lead(jsonb_build_object(
    'nome','Teste Automatico Fluxo','telefone','71900000000','cidade','Salvador','bairro','Barra','servico','cozinha',
    'momento','obra_andamento','prazo','ate_30d','investimento','acima_40','projeto','projeto_medidas',
    'consent_dados',true,'consent_marketing',false,'utm_source','teste','utm_campaign','teste-auto'));
  lid := (r->>'id_lead')::uuid;
  if r->>'classificacao' <> 'quente' then raise exception 'FALHOU (pontuação): esperado quente, veio %', r->>'classificacao'; end if;

  -- 6: lead aparece no CRM, na primeira etapa
  select count(*) into n from leads where id = lid and etapa = 'novo_lead';
  if n <> 1 then raise exception 'FALHOU (passo 6): lead fora da etapa Novo lead'; end if;
  select count(*) into n from consent_records where lead_id = lid;
  if n <> 2 then raise exception 'FALHOU (LGPD): esperados 2 registros de consentimento, vieram %', n; end if;
  select count(*) into n from activities where lead_id = lid;
  if n < 1 then raise exception 'FALHOU: histórico automático do lead não foi criado'; end if;

  -- 8: primeiro contato
  insert into activities(lead_id, user_id, tipo, descricao) values (lid, uid, 'whatsapp', 'Primeiro contato (teste)');
  update leads set etapa = 'contato_realizado' where id = lid;

  -- 9: visita agendada
  insert into appointments(lead_id, data_hora, endereco) values (lid, now() + interval '2 days', 'Rua Teste, 1');
  update leads set etapa = 'visita_agendada' where id = lid;

  -- 10: orçamento com revisão (histórico preservado)
  insert into quotations(lead_id, ambiente, created_by) values (lid, 'Cozinha', uid) returning id into qid;
  insert into quotation_versions(quotation_id, versao, valor_total, created_by) values (qid, 1, 25000, uid);
  insert into quotation_versions(quotation_id, versao, valor_total, created_by) values (qid, 2, 23000, uid);
  select count(*) into n from quotation_versions where quotation_id = qid;
  if n <> 2 then raise exception 'FALHOU (passo 10): versões do orçamento'; end if;

  -- 11: lembretes de follow-up (dias 1, 3, 7, 15 e 30)
  perform public.marcar_enviado(qid);
  select count(*) into n from followups where lead_id = lid and status = 'pendente';
  if n <> 5 then raise exception 'FALHOU (passo 11): esperados 5 follow-ups, vieram %', n; end if;

  -- 12 e 13: venda fechada e follow-up interrompido
  oid := public.fechar_venda(qid);
  select count(*) into n from followups where lead_id = lid and status = 'pendente';
  if n <> 0 then raise exception 'FALHOU (passo 13): follow-ups continuam pendentes após a venda'; end if;
  select count(*) into n from sales where lead_id = lid and valor = 23000;
  if n <> 1 then raise exception 'FALHOU (passo 12): venda não usou o valor da versão mais recente'; end if;

  -- 14: produção
  select count(*) into n from production_orders where id = oid and status = 'a_produzir';
  if n <> 1 then raise exception 'FALHOU (passo 14): ordem de produção não criada'; end if;
  perform public.avancar_producao(oid, 'em_producao');
  select count(*) into n from leads where id = lid and etapa = 'producao';
  if n <> 1 then raise exception 'FALHOU (passo 14): lead não foi para Produção'; end if;

  -- 15: entrega
  perform public.avancar_producao(oid, 'entregue');
  select count(*) into n from deliveries where production_order_id = oid;
  if n <> 1 then raise exception 'FALHOU (passo 15): entrega não registrada'; end if;
  select count(*) into n from leads where id = lid and etapa = 'entregue';
  if n <> 1 then raise exception 'FALHOU (passo 15): lead não foi para Entregue'; end if;

  raise exception 'TESTE OK (nada foi gravado): fluxo comercial validado do cadastro à entrega';
end $$;
