# Produtos: alertas e resumo de estoque no servidor — 04/11/2026

## Problema comprovado

A auditoria anterior registrou 64,67 MB em leituras de `products`, somando diferentes telas. Esse total não é apenas o dashboard. Nesta etapa, o escopo solicitado foi reduzir os dados dos alertas e calcular o resumo de estoque no servidor.

`useDashboardStock` percorria todos os produtos físicos ativos em lotes de 1.000, baixava suas variações ativas e as 30 movimentações mais recentes. O navegador calculava contagens, ordenava e guardava oito itens. Os alertas já usavam a RPC compacta da etapa anterior, mas ela ainda incluía variações com estoque positivo, que não produziam aviso nesse contrato.

A consulta antiga de estoque selecionava `observations`, mas não a marcação canônica em `technical_specs`. Quarenta produtos identificados como teste entravam nos candidatos; 25 contribuíam indevidamente para o contador de estoque zerado.

## Alteração

- `get_dashboard_stock_summary()` devolve as contagens globais de estoque zerado/mínimo, até oito itens ordenados e o inventário em andamento. Produto com variações usa somente as variações ativas; se não houver variação ativa, conserva o fallback para o estoque do pai. O mínimo permanece o do produto pai, como antes.
- Os critérios físicos/ativo/exclusão e a ordenação são aplicados no PostgreSQL. As contagens abrangem todos os elegíveis; oito é somente o limite de apresentação dos itens. A marcação canônica de teste e os marcadores legados de observação são excluídos no servidor.
- A busca do inventário em andamento interpreta as observações legadas no servidor, tolera texto inválido e não limita os candidatos às primeiras 30 movimentações antes de verificar o status.
- O hook usa uma consulta com timeout de 15 segundos, cancelamento e validação explícita Zod da resposta. Resposta ausente/inválida mantém erro visível e a ação de repetir. Cache por identidade/papéis, foco, reconexão e invalidação por produto/variação/inventário foram preservados; mudança do período de vendas não refaz essa leitura.
- `notification_product_summaries` mantém o contrato e os campos já reduzidos, incluindo nome, IDs, estoque/mínimo, unidade e configuração/nota do alerta. O array de variações agora contém somente as que podem produzir o aviso existente de estoque zero. Interesses pendentes, condições escolhidas e desativação individual continuam preservados. O schema operacional não tem coluna de estoque mínimo por variação; o limiar do dashboard continua sendo o do pai.
- Nenhum preço, estoque ou cadastro foi alterado. Não há mudança nos passos do estoquista, portanto esta otimização interna não exige reescrever o guia PDF.

## Medições e preservação

Playwright em Chrome visível, autenticado com o operador configurado, abriu o dashboard na porta 5173, verificou o contador e trocou o período. A navegação teve **uma resposta de resumo, 7.153 bytes HTTP decodificados**, e nenhuma leitura bruta de `products`, `product_variations` ou `inventory_moves` para montar o painel. A troca de período conservou uma chamada no total.

Na comparação somente leitura das mesmas fontes, a projeção anterior totalizou **128.257 bytes de JSON serializado** (161 produtos, 121 variações ativas e 30 movimentações). O resumo equivalente serializado teve **7.051 bytes**, redução de **94,50% nessa consulta**. A referência anterior foi executada uma vez na auditoria, em fase separada da navegação, para conferir a equivalência.

O cálculo de referência, com a exclusão canônica de testes, coincidiu em contagens e nos oito itens/IDs/nomes/quantidades/mínimos exibidos: **131 zerados, zero no mínimo, oito itens, zero divergências**. O contador antigo de 156 incluía 25 ocorrências de teste. A consulta remota não tinha inventário em andamento; não se declara prova de UI desse estado com dados graváveis.

Nos alertas, os mesmos 103 produtos passaram de **99.445 para 96.597 bytes** de JSON agregado no banco. Seis variações saudáveis deixaram de ser transportadas (171 → 165). A assinatura do conteúdo esperado, removendo somente essas variações, foi idêntica antes/depois; nomes e notas dos avisos não foram cortados.

As medidas são amostras de respostas/JSON, não egress faturável nem economia mensal. A consulta de estoque isolada levou 26,999 ms no banco; execuções da função completa tiveram 55,984 ms e 786,382 ms. A variação observada não permite prometer latência fixa. Não houve escrita de blocos nessas leituras. [Evidências numéricas](produtos-alertas-resumo-estoque-2026-11-04-evidencias.json).

## Banco, compatibilidade e aplicação

Migration `20261105013133_dashboard_stock_summary_compact_alerts.sql` revisada e aplicada no projeto operacional `hkoxhourxwlddgsfdgws`, schema `public`. Histórico remoto, colunas, dependências e permissões foram conferidos antes; versão remota e ACL foram reconferidas depois.

As duas funções são `SECURITY INVOKER`, com `search_path` vazio, execução autenticada e sem execução por `anon`/`PUBLIC`. As três tabelas mantêm RLS e suas políticas não foram modificadas. Advisors de segurança/performance não apontaram avisos ligados às duas funções. Isso não equivale a testar todos os perfis com identidades diferentes.

O acréscimo é compatível com o cliente antigo; a consulta direta anterior permanece disponível. A RPC dos alertas preserva assinatura e significado dos avisos. Para rollback do cliente não é necessário remover dados ou funções. Não foram criadas fixtures, executado DML de teste, alterado estoque/pedidos nem enviado qualquer efeito externo.

## ERP e app

Os consumidores reais do ERP são o dashboard (`Index.tsx`/`useDashboardStock`/`AttentionPanel`) e os alertas compartilhados pelo sino e `AlertsPanel`.

O app foi conferido em `mobile/src/features/stock/overview/native-stock-screen/NativeStockScreen.tsx`, `NotificationContext.tsx` e `services/appNotificationQuery.ts`. Não há a Central de Atenção com esse agregado na navegação nativa; `StockSummaryScreen.tsx` é um arquivo sem chamadores, com valores estáticos, e não foi tratado como implementação funcional. As notificações móveis já recebem resumos de `list_app_notification_summaries`, sem baixar produtos para calcular esses avisos. Esta alteração não cria uma tela nova no app nem reativa Produtos no beta.

## Validação

| Teste | Executado | Projeto/ref | Massa sintética remota | Resultado / limite |
|---|---|---|---|---|
| Vitest/RTL | Sim, 12 testes/3 arquivos | Local, lógica/componentes | Nenhuma | Contrato agregado, totais maiores que a lista visível, erro, limite de oito, reconsulta Realtime, notas/condições/desativação dos alertas. Mocks não comprovam transações PostgreSQL. |
| Playwright somente leitura | Sim, ERP 5173 | Operacional existente | Nenhuma | Contador/itens reais, equivalência da referência, ausência de consultas brutas na montagem e reuso ao trocar período. Sem mutações operacionais. |
| Build ERP | Sim | Checkout local | Nenhuma | `npm run build:test --prefix erp`, aprovado em 2m04s. Não representa typecheck global do repositório. |
| SQL/ACL/advisors remotos | Sim, somente leitura | `hkoxhourxwlddgsfdgws`, `public` | Nenhuma | Funções invoker, RLS existente, acesso autenticado e assinatura equivalente dos alertas. Sem prova gravável, entre perfis ou de instalação em banco vazio. |
| Android físico | Não | — | Nenhuma | Sem alteração de tela/serviço nativo equivalente nesta etapa. |

A migration está no Supabase operacional; o cliente ERP alterado está no checkout local. Não houve deploy nem OTA. A medição em produção depende de publicação e de uma janela equivalente de uso.

## Arquivos

- `erp/src/pages/App/Dashboard/hooks/useDashboardStock.ts`
- `erp/src/pages/App/Dashboard/hooks/useDashboardStock.test.tsx`
- `erp/src/pages/utils/__tests__/notificationSnapshot.test.ts`
- `supabase/migrations/20261105013133_dashboard_stock_summary_compact_alerts.sql`

A implementação usa funções de banco e invoker conforme a [documentação oficial de funções Supabase](https://supabase.com/docs/guides/database/functions). Não utilizou Supabase Local nem CLI.
