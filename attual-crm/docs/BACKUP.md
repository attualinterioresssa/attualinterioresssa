# Backup e recuperação

No plano gratuito do Supabase não conte com backups automáticos (confira em Database > Backups o que sua conta oferece). A rotina abaixo cobre o essencial e custa R$ 0.

## Rotina semanal (5 minutos)
1. Supabase > Table Editor: abra `customers`, `leads`, `quotations`, `quotation_versions`, `sales`, `production_orders` e `consent_records`. Use **Export** > CSV em cada uma.
2. No CRM, Painel > **Exportar leads em CSV**.
3. Guarde os arquivos em duas pastas separadas (computador e um serviço de nuvem da empresa), com a data no nome.
4. Os PDFs de orçamento ficam em Storage > orcamentos. Baixe a pasta uma vez por mês.

## Dica contra pausa por inatividade
O projeto gratuito é pausado depois de cerca de uma semana sem acesso. Abrir o CRM ao menos uma vez por semana evita isso. Se pausar, restaure pelo botão do painel do Supabase.

## Recuperação
- **Perda de dados:** crie as tabelas rodando os arquivos `faseN-*.sql` e importe os CSVs (Table Editor > Import data from CSV), começando por `customers`, depois `leads` e as demais.
- **Erro no site:** na Vercel, Deployments > escolha um deploy anterior > Promote to Production.
- **Código perdido:** o GitHub guarda todo o histórico.
- **Acesso perdido:** redefina a senha em Supabase > Authentication > Users.

## Melhoria futura
Backup automático diário com GitHub Actions (gratuito) exige guardar a string de conexão do banco como segredo. Podemos montar quando você quiser.
