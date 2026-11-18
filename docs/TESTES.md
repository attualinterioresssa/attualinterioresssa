# Checklist de testes (Módulo 14)

O teste automático `teste-fluxo.sql` cobre os passos 3 a 15 no banco e desfaz tudo no final. Os passos que dependem de tela e de navegador ficam neste checklist manual. Marque cada item.

| # | Passo | Como verificar | Resultado esperado |
|---|-------|----------------|--------------------|
| 1 | Clique em anúncio | Abra o site com `?utm_source=meta&utm_campaign=teste-manual` | A página abre normalmente |
| 2 | Landing page | Role a página | Fotos, serviços e formulário aparecem |
| 3 | Preencher formulário | Preencha com dados de teste e marque o consentimento | Tela "Recebemos suas informações" |
| 4 | Pontuação | Teste automático | Classificação quente, morna ou fria conforme as respostas |
| 5 | Cadastro salvo | Supabase > Table Editor > leads | Lead com origem "meta" e campanha "teste-manual" |
| 6 | Lead no CRM | `/crm` | Cartão na coluna Novo lead |
| 7 | Botão de WhatsApp | Botão da tela final e botão da ficha | Conversa abre com a mensagem pronta |
| 8 | Primeiro contato | Ficha > Mensagens rápidas > Abrir no WhatsApp | Linha "WhatsApp aberto" no histórico |
| 9 | Visita | Ficha > Agendar visita | Lead vai para Visita agendada; aparece em Agenda |
| 10 | Orçamento | Ficha > Novo orçamento + Nova revisão | Duas versões no Histórico; PDF abre |
| 11 | Lembretes | Marcar como enviado | 5 follow-ups em Agenda |
| 12 | Venda | Fechar venda | Lead em Venda fechada; faturamento no Painel |
| 13 | Follow-up interrompido | Conferir Agenda | Follow-ups do lead sumiram |
| 14 | Produção | Produção > mover a ordem | Lead acompanha a etapa |
| 15 | Entrega | Status Entregue | Lead em Entregue; entrega registrada |

## Testes de segurança
1. Rode o final do `fase8-seguranca.sql`: as duas consultas devem voltar vazias (nenhuma tabela sem RLS e nenhum acesso direto para visitantes).
2. Abra `/crm` numa aba anônima sem login: deve ir para `/login`.
3. Na Vercel, confira que nenhuma variável contém a chave secret.
4. Envie o formulário 4 vezes seguidas com o mesmo telefone: o quarto deve falhar.

## Testes de LGPD
1. Marque o consentimento de marketing em um teste e confira em consent_records dois registros (dados e marketing).
2. Na ficha, use "Corrigir dados" e "Excluir dados do cliente" em um lead de teste.
