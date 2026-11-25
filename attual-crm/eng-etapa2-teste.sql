-- ATTUAL INTERIORES - CRM | Engenharia, Etapa 2: teste automático das regras do banco
-- Roda tudo dentro de uma transação e DESFAZ no final: nada fica gravado. Usa um lead existente só como referência.
-- Resultado esperado: uma mensagem em vermelho começando com "TESTE OK". Se começar com "FALHOU", me envie a mensagem.
do $$
declare lid uuid; mid uuid; pid uuid; n int; tot numeric; res numeric; dis numeric; con numeric;
begin
  select id into lid from leads limit 1;
  if lid is null then raise exception 'FALHOU: não há nenhum lead para usar como referência'; end if;

  -- 1) chapa sem medidas é recusada
  begin
    insert into eng_materiais (categoria, nome, unidade, preco_compra) values ('chapa', 'TESTE sem medidas', 'chapa', 100);
    raise exception 'FALHOU: aceitou chapa sem medidas';
  exception when check_violation then null; end;

  -- 2) chapa válida gera histórico de preço; só muda o histórico quando o preço muda
  insert into eng_materiais (categoria, subcategoria, nome, unidade, espessura_mm, largura_mm, comprimento_mm, preco_compra)
  values ('chapa', 'mdf', 'TESTE MDF 18mm', 'chapa', 18, 1840, 2750, 100) returning id into mid;
  select count(*) into n from eng_precos_historico where material_id = mid;
  if n <> 1 then raise exception 'FALHOU (histórico): esperado 1 registro, veio %', n; end if;
  update eng_materiais set preco_compra = 120 where id = mid;
  update eng_materiais set nome = 'TESTE MDF 18mm B' where id = mid;
  select count(*) into n from eng_precos_historico where material_id = mid;
  if n <> 2 then raise exception 'FALHOU (histórico): esperados 2 registros, vieram %', n; end if;

  -- 3) peça com medida zero é recusada
  insert into eng_projetos (lead_id, nome, origem) values (lid, 'TESTE projeto', 'manual') returning id into pid;
  begin
    insert into eng_pecas (projeto_id, nome, comprimento_mm, largura_mm, espessura_mm) values (pid, 'x', 0, 100, 18);
    raise exception 'FALHOU: aceitou peça com comprimento 0';
  exception when check_violation then null; end;

  -- 4) orçamento definitivo sem peças é bloqueado
  begin
    insert into eng_orcamentos (projeto_id, versao, status) values (pid, 1, 'definitivo');
    raise exception 'FALHOU: aceitou orçamento definitivo sem peças';
  exception when others then
    if sqlerrm <> 'projeto_sem_pecas' then raise; end if;
  end;

  -- 5) peça de baixa confiança e não conferida bloqueia o orçamento definitivo
  insert into eng_pecas (projeto_id, nome, comprimento_mm, largura_mm, espessura_mm, quantidade, confianca, conferida)
  values (pid, 'lateral teste', 720, 560, 18, 2, 'baixa', false);
  begin
    insert into eng_orcamentos (projeto_id, versao, status) values (pid, 1, 'definitivo');
    raise exception 'FALHOU: aceitou orçamento definitivo com peça não conferida';
  exception when others then
    if sqlerrm <> 'pecas_nao_conferidas' then raise; end if;
  end;

  -- 6) depois de conferida, o orçamento definitivo é aceito; versão duplicada é recusada
  update eng_pecas set conferida = true where projeto_id = pid;
  insert into eng_orcamentos (projeto_id, versao, status) values (pid, 1, 'definitivo');
  begin
    insert into eng_orcamentos (projeto_id, versao, status) values (pid, 1, 'rascunho');
    raise exception 'FALHOU: aceitou versão de orçamento duplicada';
  exception when unique_violation then null; end;

  -- 7) estoque: entrada 10, reserva 3, consumo 2 => total 8, reservado 3, disponível 5, consumido 2
  insert into eng_estoque_movimentos (tipo, material_id, quantidade) values ('entrada', mid, 10), ('reserva', mid, 3), ('saida', mid, 2);
  select total, reservado, disponivel, consumido into tot, res, dis, con from eng_estoque_saldo where material_id = mid;
  if tot <> 8 or res <> 3 or dis <> 5 or con <> 2 then
    raise exception 'FALHOU (estoque): total %, reservado %, disponível %, consumido % (esperado 8, 3, 5, 2)', tot, res, dis, con;
  end if;
  begin
    insert into eng_estoque_movimentos (tipo, material_id, quantidade) values ('entrada', mid, -1);
    raise exception 'FALHOU: aceitou entrada de estoque negativa';
  exception when check_violation then null; end;

  -- 8) todas as tabelas eng_ estão com RLS ligado
  select count(*) into n from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'eng\_%' and not relrowsecurity;
  if n <> 0 then raise exception 'FALHOU: % tabela(s) eng_ sem RLS', n; end if;

  raise exception 'TESTE OK (nada foi gravado): 8 verificações da estrutura passaram';
end $$;
