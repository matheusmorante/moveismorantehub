# Diagnósticos

## SUP-001 — RPC da agenda continua lenta após a redução de trabalho redundante

- **Data:** 26/11/2026.
- **Gravidade:** P1 — alta.
- **Status:** Em investigação.
- **Confiança:** Alta para a estrutura de custo; média para a relação com a janela inteira de timeouts.
- **Arquivos e linhas:** supabase/migrations/20261106194759_avoid_redundant_schedule_match.sql:3-; supabase/migrations/20261121155207_extend_order_rpc_statement_timeouts.sql:62-66; shared-utils/orders/orderScheduleServerQuery.ts:11-33; erp/src/pages/utils/orderSyncQueries/scheduledOrdersQuery.ts:9-14; mobile/src/features/logistics/hooks/useScopedOrderSchedule.ts:54.
- **Problema e evidências:** a RPC list_order_schedule_ids para o escopo erp_schedule terminou uma chamada em 11.644 ms e houve quatro SQLSTATE 57014 para essa RPC na janela observada. O plano do log tem custo baixo no invólucro PostgREST, mas mostra somente a Function Scan; ele não contém o plano das consultas executadas dentro da função PL/pgSQL. O contexto do erro aponta para order_schedule_appointment_date, order_schedule_appointment_matches e order_schedule_matches.
- **Causa provável:** a versão remota materializa linhas de pedidos como JSONB e executa order_schedule_matches sobre os pedidos visíveis; a contagem do total exige avaliar todos os candidatos antes de devolver os IDs da página. A função percorre os dados de agendamento e compromissos em PL/pgSQL. Os índices em status, data agendada e tipo não tornam esse predicado encapsulado sobre to_jsonb(o) diretamente pesquisável pelo planejador. Esta última conclusão é inferência estrutural; EXPLAIN ANALYZE não foi executado.
- **Contexto anterior:** a auditoria SCE-033 já removeu a segunda avaliação desnecessária para erp_schedule, agenda e logística. A migration 20261121155207 já dá 20 segundos de timeout à RPC; o helper local compartilhado aguarda até 25 segundos. Mesmo assim, o banco registrou a chamada de 11,644 segundos e novos cancelamentos. Não repetir a proposta de remover a segunda passagem ou apenas aumentar o timeout.
- **Impacto:** demora visível na agenda e risco de novos cancelamentos. A função de leitura é compartilhada: o escopo erp_schedule é chamado pelo ERP; o app usa outros escopos por meio do helper compartilhado. Uma alteração futura precisa preservar ambos, os resultados completos, a ordem e a contagem.
- **Métrica afetada:** tempo e CPU de consultas PostgreSQL; chamadas e volume de resposta não foram associados a esta ocorrência. Planos lentos também podem contribuir para Log Ingestion, mas a quantidade de bytes não foi medida. Isso não mede Log Query.
- **Guardas:** os arquivos compartilhados citados estavam modificados ou não rastreados no checkout durante a auditoria e foram preservados.

## SUP-002 — Timeouts simultâneos em RPCs distintas

- **Data:** 26/11/2026.
- **Gravidade:** P1 — alta.
- **Status:** Em investigação.
- **Confiança:** Alta para a ocorrência; baixa para uma causa única.
- **Evidências:** entre 10:55 e 11:20 BRT, os logs remotos mostraram 168 eventos Postgres e 139 eventos PostgREST. Houve SQLSTATE 57014 em list_order_schedule_ids, list_order_page_ids, notification_product_summaries e get_dashboard_digital_catalog_metrics, além de outros eventos sem atribuição segura. O PostgREST registrou respostas 57014 e “Thread killed by timeout manager” até 11:17, depois das falhas de início dos cron jobs. Não foram encontrados registros explícitos de “too many connections”, falta de memória, falta de worker ou slots de conexão esgotados.
- **Causa provável:** carga de consultas lenta distribuída entre vários endpoints, possivelmente combinada com contenção transitória. O histórico cumulativo do pg_stat_statements, reiniciado em 18/10/2026, confirma volume e caudas lentas para pedidos e notificações; ele não permite atribuir esses totais à janela de 25 minutos.
- **Impacto:** respostas podem exceder os limites das roles de API ou o timeout do gateway; os erros de conexão 08006 podem acompanhar requisições canceladas, mas o log disponível não prova qual cliente encerrou cada conexão.
- **Métrica afetada:** chamadas, tempo de banco e timeouts. Os totais de eventos dos logs não são bytes de Log Ingestion nem Log Query.

## SUP-003 — Inicialização intermitente dos cron jobs

- **Data:** 26/11/2026.
- **Gravidade:** P1 — alta para a confiabilidade do processamento; causa não confirmada.
- **Status:** Em investigação.
- **Confiança:** Alta para as falhas e recuperação; baixa para a causa.
- **Evidências:** os jobs 4 (dispatch-return-fiscal-emission-worker) e 6 (auto-fulfill-scheduled-orders), agendados a cada dois minutos, falharam ao iniciar às 11:06, 11:08 e 11:10 BRT. Ambos voltaram a concluir às 11:12 e 11:14. Existem cinco jobs ativos no total, com pg_cron 1.6.4 e cron.max_running_jobs=32. Não apareceu erro explícito de conexão, worker ou memória nos logs consultados.
- **Causa provável:** não determinada. O status “job startup timeout” é distinto de um timeout dentro da instrução SQL; a recuperação posterior não identifica a causa.
- **Impacto:** atraso temporário no processamento fiscal automático e na finalização de pedidos agendados.
- **Métrica afetada:** início e duração dos jobs; não foi demonstrada contribuição relevante ao volume de logs.
- **Referência:** o [guia oficial de diagnóstico do pg_cron da Supabase](https://supabase.com/kb/troubleshooting/pgcron-debugging-guide-n1KTaz) recomenda conferir o estado do scheduler, histórico dos jobs, concorrência e indicadores de strain. Nesta execução havia cinco jobs ativos e não foram encontrados erros explícitos de limite de conexões ou workers.

### Verificação de 26/11 após o ajuste do dispatcher

- **Observação.** Às 13h48 BRT, o MoranteHub tinha `cron.use_background_workers=off` e o agendador estava ativo desde 18/10, com início registrado junto ao postmaster. Os dois jobs completaram todas as 40 execuções finalizadas de cada um entre 12h28 e 13h48 BRT. [Medição](metricas.md#26112026--partida-e-execução-dos-dois-jobs).
- **Interpretação do estado.** No código upstream do pg_cron 1.6.4, esse modo usa libpq. O prazo de partida de 10 s cobre os estados de conexão e envio do comando. Depois que o envio é aceito, o agendador passa a aguardar o resultado sem esse prazo. O histórico classifica a falha anterior como expiração na fase de partida. A mensagem por si só não distingue conexão de envio. [Código do pg_cron 1.6.4](https://github.com/citusdata/pg_cron/blob/v1.6.4/src/pg_cron.c#L1461-L1565).
- **Causa e impacto.** A causa das falhas históricas segue indeterminada. A ausência de novas falhas no intervalo confirma recuperação nessa amostra. A checagem de fila de SUP-PROP-003 roda dentro da instrução SQL e seus efeitos sobre carga são uma hipótese separada. A contagem pontual de conexões não informa o pico do incidente. Para avançar, comparar os horários das falhas já registradas com as séries de conexões, CPU, memória e I/O do projeto. [Guia do Supabase](https://supabase.com/kb/troubleshooting/pgcron-debugging-guide-n1KTaz).

## SUP-004 — auto_explain registra planos acima de 10 segundos

- **Data:** 26/11/2026.
- **Gravidade:** P2 — média.
- **Status:** Em investigação.
- **Confiança:** Alta para a configuração; baixa para a parcela do volume de Log Ingestion.
- **Evidências:** auto_explain está carregado, log_min_duration=10000 ms e sample_rate=1. O log_nested_statements está desligado; log_min_duration_statement está desligado e log_statement está restrito a DDL. A chamada de agenda de 11.644 ms gerou um plano do invólucro PostgREST, sem mostrar o trabalho interno da função.
- **Causa provável:** cada instrução acima de 10 segundos pode gerar um plano de log. Como os planos aninhados estão desligados, esses registros podem ter volume sem explicar qual trecho dentro da RPC consumiu o tempo. Ainda não há comparação de bytes antes/depois ou percentagem atribuível ao auto_explain.
- **Impacto:** possível contribuição à Log Ingestion e visibilidade incompleta do custo interno; não é evidência de que auto_explain causou os timeouts nem o consumo de Log Query.

## SUP-005 — Execuções periódicas dos workers a cada dois minutos

- **Data:** 26/11/2026.
- **Gravidade:** P2 — média.
- **Status:** Em investigação.
- **Confiança:** Alta para o volume cumulativo; média para trabalho sem pendências.
- **Arquivos e referências:** supabase/migrations/20261011024729_automatic_return_nfe_fiscal_jobs.sql; supabase/migrations/20261011022346_auto_fulfill_scheduled_orders_at_brt_midnight.sql; funções remotas dispatch_return_fiscal_emission_worker e auto_fulfill_scheduled_orders.
- **Evidências:** desde o reset das estatísticas em 18/10/2026, cada worker foi chamado 28.114 vezes. auto_fulfill_scheduled_orders acumulou 141,83 minutos de execução, média 302,7 ms e máximo 28,516 s. dispatch_return_fiscal_emission_worker acumulou 24,42 minutos, média 52,1 ms e máximo 22,504 s. O dispatcher agenda um POST a cada chamada quando URL e segredo estão configurados; seu corpo SQL não verifica a existência de jobs pendentes antes de enfileirar o POST. Não foi medido quantos desses POSTs encontraram trabalho nem a atividade do worker HTTP.
- **Causa provável:** polling frequente pode executar chamadas sem trabalho pendente; a frequência pode também refletir a latência operacional desejada. Contagem de invocações não prova chamadas externas concluídas ou trabalho vazio.
- **Impacto:** uso recorrente de conexões, CPU e requisições ao worker. Reduzir frequência pode atrasar a transmissão fiscal automática ou a finalização de pedidos e exige aprovação explícita.
- **Métrica afetada:** chamadas e tempo de banco, não Log Query ou Log Ingestion diretamente.

## SUP-006 — ERP consulta rascunhos depois de receber erro no resumo de produtos

- **Data, gravidade e confiança.** 26/11/2026, P2 (média). Confiança alta no encadeamento do checkout e indeterminada quanto à frequência em produção.
- **Observação.** O sino e o painel de alertas usam a mesma atualização do ERP. Ela recebe `{ data, error }` de `notification_product_summaries`, verifica se a sessão ainda é válida, consulta `list_order_page_ids` para obter o total de rascunhos e só então verifica `pError` e se o resumo é um array. O app carrega suas notificações por `app_notifications`, por um fluxo distinto.
- **Causa confirmada no código.** Quando o erro da RPC de produtos chega no objeto resolvido ou a resposta não tem o formato esperado, a atualização ainda inicia a leitura de rascunhos. Seu resultado é descartado, pois o fluxo sai antes de montar e publicar um novo conteúdo. Se a primeira chamada rejeitar a promessa, o `catch` já impede a segunda leitura.
- **Impacto e limite.** Uma chamada de pedidos evitável por tentativa elegível ainda ativa, além da espera dessa consulta antes de encerrar o ciclo. A ocorrência histórica de `57014` em notificações (SUP-002) justifica o recorte. A sequência individual, a frequência, o custo no banco e os bytes em produção não foram medidos. Não há atribuição a Log Query ou Log Ingestion.
- **Caminhos conferidos.** `erp/src/pages/utils/notifications/notificationService.ts:269–300,318–345`; `erp/src/components/shared/feedback/NotificationBell.tsx:36`; `erp/src/pages/App/Dashboard/components/AlertsPanel.tsx:59`; `shared-utils/orders/orderListServerQuery.ts`; `mobile/src/contexts/NotificationContext.tsx:42–60,76–110`. A SCE-324 já tratou cancelamento e reconexão. O ponto deste achado é a ordem das etapas quando a primeira RPC resolve com erro.

## SUP-007 — O ERP pode consultar a página anterior quando o filtro de pedidos muda

- **Data, prioridade, gravidade e confiança.** 26/11/2026, 12:42:56 BRT. P2, média. Alta para a combinação transitória de filtro e página no código. A chegada da chamada ao banco e a frequência em produção seguem sem medição.
- **Observação e causa no checkout.** Na tela de pedidos, `OrderHistoryList` passa os filtros ao hook. Com a lista em uma página acima de 1, a alteração efetiva do filtro muda a chave de `useQuery` imediatamente, usando ainda o número da página anterior. O efeito de reset só depois redefine a página para 1 e limpa a seleção. Em cache frio, a chave transitória pode iniciar `fetchOrdersPage`, que chama `list_order_page_ids` antes de ler os resumos. Cache ou cancelamento podem evitar que a primeira solicitação chegue ao banco.
- **Impacto e risco.** Uma seleção paginada transitória pode iniciar por troca efetiva de filtro na condição descrita, antes de eventuais retries. A leitura pode avançar para resumos se completar antes do cancelamento. O custo no PostgreSQL, os bytes e o tempo da interface estão sem medição. Uma correção deve preservar a volta à primeira página, a limpeza da seleção e a atualização por Realtime.
- **Escopo e caminhos.** ERP: `erp/src/pages/App/SalesOrder/index.tsx:126–148`; `erp/src/pages/App/SalesOrder/OrderHistoryList/index.tsx:106–111`; `erp/src/pages/App/SalesOrder/OrderHistoryList/hooks/useOrderHistory.ts:34–38,116–124,146–156,184–194`; `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:11–28`. App: `mobile/src/features/orders/screens/NativeOrdersScreen.tsx:153–181` e `mobile/src/features/orders/hooks/useMobileOrders.ts:37–51,289–298` já voltam à primeira página junto à atualização de busca ou status, com debounce na busca. As duas listagens usam o helper `shared-utils/orders/orderListServerQuery.ts:11–28`. SCE-325 tratou a recuperação após reconexão. SCE-211 registrou um padrão semelhante em outra tela.

## SUP-008 — Retentativa da lista ERP repete a seleção após resposta fora do contrato

- **Data, prioridade e confiança.** 26/11/2026, 13h00 BRT. P3, gravidade baixa. Confiança alta na política do checkout. Frequência e impacto em produção indeterminados.
- **Observação.** Os seletores compartilhados rejeitam uma página inválida de IDs ou um lote de resumos fora do contrato. O histórico anterior de 05/11 já descreve uma retentativa no ERP, com exceção para bloqueios do Query Guard. O recorte novo verifica quais classes de falha chegam à retentativa e o que é repetido após o segundo estágio falhar.
- **Causa confirmada no código.** O serviço ERP propaga o erro da leitura e a política do hook aceita a primeira falha de contrato. Ela recebe a rejeição da operação inteira. Se falhar a validação dos resumos depois de uma seleção bem-sucedida, a retentativa automática volta a selecionar todos os IDs daquela página. Se a validação falhar na própria seleção, volta a executar essa etapa. O app trata o resultado rejeitado no carregamento atual, sem retentativa equivalente nesse hook. Mantém atualização manual e recuperação após mudança de conectividade.
- **Caminhos.** `erp/src/pages/App/SalesOrder/OrderHistoryList/hooks/useOrderHistory.ts:120–146`, `erp/src/pages/App/SalesOrder/OrderHistoryList/utils/orderHistoryQueryRetry.ts:3–15`, `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:22–31,46–49`, `shared-utils/orders/orderListServerQuery.ts:23–39`, `shared-utils/orders/orderSummaryQuery.ts:7–16`, `mobile/src/features/orders/services/mobileOrderListService.ts:302–308` e `mobile/src/features/orders/hooks/useMobileOrders.ts:219–230,268–298`.
- **Impacto e limites.** Uma seleção adicional por falha inicial elegível no ERP se a retentativa iniciar. Pode haver uma segunda leitura de resumos quando a seleção devolver IDs. A regra atual também permite retentativa para falhas transitórias. O cancelamento SQL por prazo e o timeout do cliente são caminhos distintos. A migration 20261121155207 e a definição posterior da RPC mantêm 20 s no PostgreSQL para a seleção, com 25 s no cliente compartilhado. O cliente dá 15 s à leitura de resumos. O recorte não explica os 57014 históricos nem comprova economia no banco, no egress ou nos medidores de logs.

## SUP-009 — Série e rankings de 30 dias leem eventos materializados de todo o histórico

- **Data, prioridade e gravidade.** 26/11/2026, P2 (média). Confiança alta na estrutura da consulta e baixa na atribuição do cancelamento observado em SUP-002.
- **Observação.** A SCE-137 unificou os dois totais históricos em uma agregação. Depois, a SCE-322 acrescentou três tipos de evento, série diária e rankings. O painel ERP mostra os totais históricos e os indicadores de 30 dias. O hook requisita uma RPC por execução da consulta, com dados frescos por cinco minutos por usuário e papéis. A busca dirigida encontrou o painel ERP como leitor. O Catálogo Digital emite eventos por outra rota e a busca no app não encontrou consumidor da RPC.
- **Causa estrutural confirmada.** Na migration 20261118001316, a CTE `analytics_events AS MATERIALIZED` reúne os eventos elegíveis sem condição de data. A série diária e os rankings aplicam a janela UTC em leituras posteriores dessa CTE. Assim, a data desses dois consumidores não restringe a carga na tabela. Os totais históricos de visualizações e visitantes de produto requerem o histórico de `product_view`. Visitas às páginas e cliques fora da janela não contribuem para nenhum contador ou ranking. A leitura remota de metadados confirmou a presença da CTE materializada e dos consumidores diário e de rankings na função operacional. [Documentação do PostgreSQL sobre materialização](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-CTE-MATERIALIZATION).
- **Caminhos e impacto.** `supabase/migrations/20261118001316_digital_catalog_performance_events.sql:94–127,140–154,156–205`, `erp/src/pages/App/Dashboard/hooks/useDashboardDigitalCatalog.ts:30–42`, `erp/src/pages/App/Dashboard/components/DigitalCatalogPanel.tsx:156–205,254–267` e `erp/src/pages/App/Dashboard/Index.tsx:200`. O trabalho intermediário cresce com o histórico elegível. A distribuição por tipo/data, o custo no plano executado e a parcela atribuível ao timeout não foram medidos. A proposta afeta trabalho SQL por execução, com uma chamada e o mesmo contrato JSON como requisitos.


## SUP-010 — Conflito de versão entra no caminho de falha do autofinalizador

- **Prioridade e gravidade.** P2, moderada. Confiança alta no caminho de execução, com incidência operacional ainda não medida.
- **Causa confirmada.** Após verificar a versão do candidato, o job chama a atualização versionada e conta `40001` em `version_conflicts`. A atualização versionada passou a emitir a exceção padrão `P0001` com a mensagem `ORDER_VERSION_CONFLICT` para evitar a retentativa do PostgREST. Se outra gravação mudar a versão entre a leitura e a atualização protegida, o job cai em `WHEN OTHERS`, incrementa `failed` e emite um aviso genérico. O catálogo operacional confirmou as duas definições em 26/11/2026 às 14:48:27 BRT. [Autofinalizador, linhas 124–157](../../supabase/migrations/20261013231942_auto_fulfill_scheduled_orders_time_aware.sql#L124), [guard, linhas 31–41](../../supabase/migrations/20261020234843_prevent_order_update_conflict_retry.sql#L31).
- **Chamadores.** O cron chama o autofinalizador diretamente. No ERP, o serviço de edição que seleciona a RPC versionada já trata a mensagem `ORDER_VERSION_CONFLICT`. A busca no código do app e serviços compartilhados não encontrou chamada direta ao job ou à RPC versionada. [Seleção da RPC no ERP](../../erp/src/pages/utils/orderMutation/orderUpdateSchema.ts#L191), [tratamento no ERP](../../erp/src/pages/utils/orderMutation/orderUpdateService.ts#L360).
- **Limite da atribuição de SUP-005.** Na transação compartilhada, `order_status_history.changed_by` deriva do vendedor presente no payload ou de `system`. O job reutiliza o payload do pedido. A entrada escrita por esse caminho não distingue finalização automática de manual e não identifica o ciclo. Contar transições por autor ou horário ficaria sujeito a atribuição incorreta. [Histórico da transação, linhas 926–930](../../supabase/migrations/20261031005746_sale_order_item_stock_adjustments.sql#L926).
- **Impacto e risco.** O conflito pode produzir uma classificação incorreta e um aviso adicional por ocorrência. A guarda de versão continua impedindo a atualização com versão obsoleta. Frequência dos conflitos, tempo de execução, eventos e efeito no consumo oficial seguem sem medição. A proposta relacionada é SUP-PROP-009.
