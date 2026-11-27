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
- **Amostra relacionada a ingestão (27/11):** a consulta documentada de 26/11, 12:00–12:15 BRT encontrou 5 planos auto_explain com 21.406 bytes de texto event_message e 60 outros eventos PostgreSQL com 4.783 bytes. Os planos foram 81,7% do texto desse recorte. Volume oficial ingerido, repetição do padrão e contribuição mensal permanecem sem medição; consultar [causa raiz de Log Ingestion](causa-raiz-log-ingestion.md).

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
- **Resultado da proposta.** A migration `20261126175900_classify_auto_fulfill_order_version_conflicts` reconhece `P0001` com a mensagem exata `ORDER_VERSION_CONFLICT` e conta o caso como conflito. O worker não foi executado para produzir uma prova comportamental.

## SUP-011 — O painel de Catálogo Digital repete a consulta após erro de permissão

- **Data, gravidade e confiança.** 2026-11-26T15:35:06.9956823-03:00. P3, baixa. Confiança alta no caminho condicional do código. Frequência em produção indeterminada.
- **Causa confirmada no código.** O painel ERP é montado na rota administrativa, que usa o perfil em memória. O hook habilita a consulta pela identidade do perfil e propaga o erro da RPC. O banco confere o perfil vigente e retorna `42501` se o acesso for negado. Como o hook herda `retry: 1` sem classificar o erro, uma consulta ativa fica elegível para mais uma chamada mesmo após essa negativa. Uma hipótese de ocorrência é a permissão mudar no servidor antes de o perfil local ser atualizado.
- **Impacto e limites.** Até uma tentativa automática evitável e espera adicional antes de mostrar o erro se a consulta continuar ativa e o Query Guard permitir o envio. A negativa ocorre antes das agregações. Frequência real, trabalho SQL, latência, bytes, egress e os medidores de logs ficaram sem medição. O `57014` de SUP-002 tem outro código e sua origem permanece em investigação.
- **Caminhos conferidos.** [Rota ERP](../../erp/src/Router.tsx#L79), [papéis efetivos](../../erp/src/context/auth/useRoleSimulation.ts#L58), [painel](../../erp/src/pages/App/Dashboard/components/DigitalCatalogPanel.tsx#L110), [hook](../../erp/src/pages/App/Dashboard/hooks/useDashboardDigitalCatalog.ts#L30), [cliente de consultas](../../erp/src/lib/queryClient.ts#L3), [checagem SQL](../../supabase/migrations/20261126181712_bound_dashboard_catalog_recent_analytics.sql#L8) e [Query Guard](../../erp/src/services/monitoring/queryGuard.ts#L232). A busca dirigida pelos chamadores encontrou somente esse consumidor operacional no ERP e nenhum no app, catálogo público ou bibliotecas compartilhadas.

## SUP-012 — Pico diário de Log Query de 144,317 GB em 05/11/2026

- **Data, prioridade, gravidade e confiança.** 27/11/2026. P1, alta pelo volume observado; confiança alta no valor mostrado pelo tooltip e baixa na atribuição por falta de escopo visível.
- **Observação.** A captura do painel oficial Usage enviada pelo operador mostra `144.317 GB` de Log Query no dia 05/11/2026. O operador informou que a média esperada é 10 GB/dia. O pico é aproximadamente 14,4× essa referência; uma captura anterior mostra `2.711 GB` em 25/11 (aproximadamente 0,27×). Ambos são valores diários, não o acumulado do período. A mesma página mostra 100 GB incluídos no plano, uma medida distinta da média esperada.
- **Causa e atribuição.** A causa operacional do MoranteHub não está confirmada. A falha de medição reconhecida pelo Supabase em 04–05/11 é a principal hipótese para o ponto isolado, com chamadas de logs sobrepostas e atualização recorrente do Studio como mecanismos concorrentes. O gráfico não permite atribuir o valor ao ERP, app, usuário ou ferramenta.
- **Impacto e risco.** O valor de 05/11 é 14,4× a média esperada informada pelo operador e é relevante para investigação. Média esperada não é teto diário rígido; isso não determina cobrança, faturamento, retenção nem consumo agregado. Atribuição errada poderia levar a mudanças que prejudiquem logging de auditoria ou segurança.
- **Métricas afetadas e pendências.** Log Query diário; total do período, origem, número de consultas, eventos, SQL, egress e bytes não medidos. Conferir Usage com escopo identificável e correlacionar uma fonte de telemetria adequada antes de propor alteração. Nenhuma proposta é aberta neste estágio.
- **Fonte.** Capturas do painel Supabase Usage fornecidas pelo operador em 27/11/2026; não houve consulta ao Logs Explorer ou ao banco nesta investigação.
- **Investigação da origem.** A atribuição permanece desconhecida. A revisão incremental de ferramentas, histórico e código está em [causa raiz de Log Query](causa-raiz-log-query.md) e [causa raiz de Log Ingestion](causa-raiz-log-ingestion.md); a [linha do tempo](linha-do-tempo-consumo.md) distingue uma consulta confirmada de uma janela histórica cujo recibo de ferramenta não está acessível.
- **Novas evidências:** a equipe Supabase reconheceu, em 04–05/11, falhas de medição capazes de inflar Log Query; outro projeto Free reportou um pico de 138,2 GB em 02/11 na mesma discussão. Também foi confirmado um mecanismo de consulta repetida na prévia de Logs do Studio. Vercel não mostra deployments do projeto morantehub em 05/11 ou 25/11. Esses fatos favorecem uma anomalia de medição como hipótese para o outlier, sem confirmar impacto na conta nem excluir outras fontes. Ver SUP-018 a SUP-020 e [causa raiz](causa-raiz-log-query.md).

## SUP-013 — Consultas históricas a logs coincidem com o pico de 05/11

- **Data, gravidade e estado.** 27/11/2026. P1 para investigação; em investigação.
- **Origem e métrica suspeitas.** Auditorias de diagnóstico Codex/MCP que usaram supabase.query_logs; Log Query.
- **Evidências favoráveis.** O roadmap registra uma chamada em 05/11, 08:30–11:30 UTC, e duas agregações adicionais com janelas 04/11 15:00–05/11 15:00 UTC (24 h) e 05/11 14:00–14:59 UTC (1 h). As janelas de 3 h e 1 h estão contidas na de 24 h. Um relatório de auditoria de Egress registra recorrência ativa de três horas em outro período e dezenas de referências a query_logs entre 25/10 e 06/11.
- **Evidências contrárias e limites.** A captura de 144.317 GB não mostra projeto/organização. Não há volume escaneado por chamada, recibo completo para todas as janelas, nem prova de que a sobreposição produziu o pico. No relatório Egress, 70 ocorrências textuais de query_logs não equivalem a 70 chamadas: há resumos e mais de uma chamada por registro. O estado atual da automação Egress não está acessível nesta revisão.
- **Frequência e volume.** Três chamadas documentadas em janelas que cobrem 05/11; consumo por chamada e sua variação no Usage não medidos. A série histórica contém outras janelas; o total exato permanece desconhecido.
- **Confiança e próximo teste.** Confiança alta de que as janelas foram documentadas, baixa de que expliquem o pico. O histórico Codex de 05/11 e o estado da recorrência Egress não estão acessíveis; não repetir janelas antigas. A autorização atual permite uma agregação somente leitura se surgir uma hipótese para uma janela nova de até 15 minutos.

## SUP-014 — Consumidores externos de Log Query não identificados

- **Data e estado.** 27/11/2026; fontes acessíveis parcialmente investigadas, sem atribuição de consumidor.
- **Origem e métrica suspeitas.** Dashboard, CLI, Management API, MCP adicional, monitoramento ou serviço externo; Log Query.
- **Evidências favoráveis.** Essas interfaces podem ler logs. O changelog Supabase informa que o CLI v3 recebeu um explorador de logs em 10/11, disponível antes de 25/11. A Management API tem endpoint de configuração PostgREST; a ferramenta MCP conectada não o expõe.
- **Evidências contrárias e limites.** Busca local não encontrou script `supabase logs`; o executável `supabase` não está no PATH. O histórico Platform Audit Logs está disponível apenas em Team/Enterprise; MoranteHub é Free. Nenhuma sessão Dashboard/CLI/Management API externa ou execução da automação Egress foi atribuída.
- **Frequência e volume.** Desconhecidos e não medidos.
- **Confiança e próximo passo.** A lacuna do Platform Audit Logs é confirmada pelo plano. O endpoint de configuração PostgREST é documentado, mas não está disponível no conector atual. Não repetir pedidos de acesso. Usar uma consulta de logs inédita e estreita apenas se outra hipótese concreta depender dela, nos limites autorizados pelo operador.

## SUP-015 — Logs de Edge Functions podem contribuir para Log Ingestion

- **Data e estado.** 27/11/2026; em investigação.
- **Origem e métrica suspeitas.** Chamadas console.* em funções serverless Supabase; Log Ingestion.
- **Evidências favoráveis.** Busca estática encontrou logging explícito em 6 de 18 arquivos TypeScript sob supabase/functions. analyze-inbound-invoice e sefaz-inbound-sync registram mensagens de início/conclusão por invocação.
- **Evidências contrárias e limites.** Nenhuma contagem de invocações, bytes por função ou correlação com Usage está disponível. Presença de console.* não prova execução ou volume dominante.
- **Frequência e volume.** Não medidos.
- **Confiança e próximo passo.** Baixa. O histórico de sessões e frequência de invocações ainda não está disponível. Se uma hipótese concreta depender de uma agregação por fonte, usar a autorização vigente: uma consulta inédita de até 15 minutos por execução, com limites explícitos. Não reduzir logging.

## SUP-016 — Logs de outros serviços Supabase sem bytes por fonte

- **Data e estado.** 27/11/2026; parcialmente investigado para o erro PostgREST relacionado a Data API desativada; demais fontes sem projeção por bytes.
- **Origem e métrica suspeitas.** API gateway, Auth, Storage, Realtime, logs de conexão e outras fontes do projeto; Log Ingestion.
- **Evidências favoráveis.** Esses serviços fazem parte das fontes agregadas no medidor oficial. O primeiro recorte de 26/11 tem contagens Postgres/PostgREST, sem projeção comparável em bytes para cada serviço. A documentação Supabase descreve mensagens PostgREST adicionais se a Data API estiver desativada sem encerrar PostgREST.
- **Evidências contrárias.** A amostra de 15 minutos não encontrou o erro `pg_pgrst_no_exposed_schemas`. Não há no material disponível uma divisão oficial de bytes por serviço nem acesso a configuração externa.
- **Frequência e volume.** Não medidos; contagens históricas de eventos não são bytes.
- **Confiança e próximo passo.** Baixa. A role `authenticator` do MoranteHub não tem o override `pgrst.db_schemas` da correção, mas isso não comprova que a Data API esteja desativada ou que erros ocorram. Atribuir bytes por fonte exige um recorte de logs e uma medida Usage do mesmo escopo; a autorização vigente cobre uma consulta inédita e estreita se ela for indispensável. Não usar contagem de eventos como proxy de volume.

## SUP-017 — Chamadas SQL e migrations da auditoria podem gerar logs PostgreSQL

- **Data e estado.** 27/11/2026; em investigação.
- **Origem e métrica suspeitas.** Chamadas remotas supabase.execute_sql e supabase.apply_migration feitas em tarefas da auditoria; Log Ingestion.
- **Evidências favoráveis.** Quatro chats relacionados contêm 33 registros de execute_sql e 5 chamadas de apply_migration. A configuração histórica de log_statement inclui DDL, e auto_explain pode registrar consultas acima do limiar de 10 s.
- **Evidências contrárias.** Os registros misturam ciclos, aprovações, implementação e verificação; não representam somente a automação. Não há correlação entre essas chamadas e eventos/bytes ingeridos.
- **Frequência e volume.** Contagem de chamadas documentada; eventos e bytes atribuíveis não medidos.
- **Confiança e próximo teste.** Baixa. Comparar Usage com escopo e janela identificáveis; não repetir SQL nem alterar logging para testar esta hipótese.

## SUP-018 — Falha de medição do Log Query reconhecida pelo Supabase

- **Data, gravidade e estado.** Evidência pública de 04–05/11/2026, revisada em 27/11. P1 para interpretar o pico; anomalia geral confirmada, impacto específico no MoranteHub não confirmado.
- **Evidências favoráveis.** Em 04/11, a equipe Supabase informou que havia condições que inflavam os valores de Log Query, que correções estavam sendo implantadas e que os clientes não seriam responsabilizados pelos valores atualmente inflados. Em 05/11, confirmou novamente que a falha era conhecida e que a aplicação da métrica não começaria naquele momento. Na mesma discussão, um projeto Free reportou 138,2 GB em um único dia em 02/11, padrão próximo do ponto de 144,317 GB do MoranteHub em 05/11. O tópico recebeu relatos adicionais de 13 e 16/11; não encontrei anúncio de resolução nele até essa atualização. [Discussão oficial sobre uso de logs](https://github.com/orgs/supabase/discussions/50925).
- **Limites e evidências contrárias.** A discussão não identifica o MoranteHub e não prova que os 144,317 GB foram inflados pelo mesmo defeito. Não há série corrigida ou recibo de metering por cliente. A captura do operador continua sendo o valor exibido pelo painel no momento.
- **Confiança e próximo passo.** Alta confiança de que a medição tinha defeitos públicos na mesma semana; confiança moderada de que isso explica o pico do MoranteHub. Acompanhar o comportamento do medidor oficial e não inferir cobrança ou culpa a partir do ponto isolado.

## SUP-019 — A prévia de Logs do Studio pode repetir leituras de contagem

- **Data e estado.** Código público presente no snapshot de 28/10/2026, localizado em 27/11. Mecanismo confirmado; atividade histórica no MoranteHub desconhecida.
- **Mecanismo.** `useLogsPreview.tsx` define atualização periódica da consulta de contagem a cada 60 segundos, usando a hora em que a página abriu como início e o horário atual como fim. A equipe Supabase disse que leituras repetidas sem cache podem elevar Log Query. A janela crescente torna a tela aberta por tempo prolongado uma possível fonte de reexame dos mesmos dados. [Código do Studio no snapshot de 28/10](https://github.com/supabase/supabase/blob/da4a40e308/apps/studio/hooks/analytics/useLogsPreview.tsx) · [confirmação da equipe Supabase](https://github.com/orgs/supabase/discussions/50925).
- **Limites e próximo passo.** Não há histórico de navegador ou sessão Dashboard para confirmar que a tela ficou aberta em 05/11 ou 25/11. O mecanismo não deve ser atribuído à conta sem essa evidência.

## SUP-020 — Diferença histórica sem evidência de deployment Vercel nos dias comparados

- **Data e estado.** Verificação somente leitura em 27/11/2026; nenhuma implantação registrada nos intervalos consultados.
- **Evidências.** A lista autenticada de deployments do projeto Vercel `morantehub` retorna zero resultados para os dias locais 05/11 e 25/11. O histórico local acessível do Codex também não contém sessões em 05/11; em 25/11 há somente a tarefa de `git pull`/`npm run dev`, sem chamada `query_logs`. O inventário Supabase listou uma organização Free e um projeto MoranteHub.
- **Limites.** Histórico local indisponível não prova ausência de sessão Codex. Deployments por Supabase Dashboard/CLI e outros canais não aparecem na lista Vercel. As capturas ainda não identificam se Usage estava filtrado para projeto ou organização.
- **Conclusão.** Não há evidência de uma mudança publicada via Vercel ou de uma chamada MCP Codex local em 25/11 que explique o consumo menor. Não foi identificado evento comparativo que explique causalmente a diferença.

## SUP-021 — Erros PostgREST podem aumentar logs se Data API estiver desativada

- **Data e estado.** Documentação Supabase atualizada em 04/11/2026, relato comunitário em 16/11, leitura do catálogo e amostra inédita de logs em 27/11. Mecanismo documentado; aplicabilidade ao MoranteHub não confirmada.
- **Mecanismo e impacto potencial.** O artigo oficial diz que desligar Data API não encerra PostgREST e pode gerar erros repetidos de schema ausente em logs. Um usuário relatou redução significativa de Log Query após aplicar o workaround oficial num projeto com Data API desativada. As mensagens de erro também podem contribuir para Log Ingest, mas não há bytes atribuídos ao MoranteHub.
- **Evidência específica do MoranteHub.** `pg_roles.rolconfig` para `authenticator` lista `session_preload_libraries`, os três timeouts e nenhum `pgrst.db_schemas`; o workaround não está aplicado. Uma agregação em `postgrest_logs` para 27/11 20:09–20:24 UTC encontrou zero eventos com `pg_pgrst_no_exposed_schemas`. Isso cobre uma janela e um texto específico, não o estado da Data API nem outros erros/horários.
- **Configuração remota não acessível.** A Supabase documenta `GET /v1/projects/{ref}/postgrest`, que retorna `db_schema` e exige `data_api_config_read`. O MCP atual não expõe esse endpoint e `get_project` omite o campo; não acessei tokens/credenciais para fazer uma chamada direta. [Management API — GET PostgREST config](https://supabase.com/docs/reference/api/v1-get-postgrest-service-config).
- **Limite e decisão.** Não aplicar o workaround: ele muda a configuração de schemas expostos e pode alterar o comportamento da API. A amostra de 15 min não encontrou o erro específico; estado da Data API e histórico de outras janelas continuam desconhecidos. [Artigo oficial](https://supabase.com/kb/troubleshooting/schema-pg_pgrst_no_exposed_schemas-does-not-exist) · [relato público](https://github.com/orgs/supabase/discussions/50925).
