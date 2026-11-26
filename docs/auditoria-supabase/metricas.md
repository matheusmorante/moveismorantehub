# Métricas

## 26/11/2026 — comparação SQL de SUP-PROP-008

- No Supabase operacional, as projeções antiga e candidata devolveram JSON idêntico em uma comparação sob o mesmo snapshot, com a mesma data UTC. A comparação avaliou a projeção do SQL e não exercitou a sessão do ERP.
- `EXPLAIN` sem `ANALYZE` para os dois SELECTs estimou custo de 10.010,78 na versão anterior e 1.552,41 na candidata. O plano candidato usou `product_analytics_event_type_created_at_idx` com os limites de data para os eventos recentes e leu o histórico para o agregado de visualizações. Custos do planejador são unidades estimadas, sem aferição de latência, CPU ou I/O.
- As superfícies mantêm os contratos das RPCs. Volume real de chamadas, tamanho da resposta na rede, egress, Logs Query e Logs Ingest não foram medidos.

## Valores relatados pelo operador

| Métrica | Valor relatado em 26/11/2026 | Fonte e limite |
|---|---:|---|
| Log Query | 430,268 GB de 100 GB (aprox. 430%) | Texto fornecido pelo operador; não relido no medidor oficial. |
| Log Ingestion | 0,942 GB de 1 GB (94,2%) | Texto fornecido pelo operador; não relido no medidor oficial. |

Log Query mede dados processados por consultas aos logs; Log Ingestion mede dados enviados para armazenamento de logs. Nenhum contador de eventos ou tempo de SQL substitui esses medidores.

## Evidências remotas — janela de logs

**Intervalo:** 26/11/2026, 10:55–11:20 BRT.

| Fonte | Eventos consultados |
|---|---:|
| postgres_logs | 168 |
| postgrest_logs | 139 |

Esses valores são contagens de registros na janela, não tamanhos em bytes, consumo faturável ou causa do limite de Log Query. O Log Explorer também retornou outras fontes; os valores não foram usados para estimar ingestão.

## PostgreSQL — estatísticas cumulativas desde 18/10/2026 11:21:04 UTC

| Instrução/RPC | Chamadas | Tempo total aproximado | Média | Máximo |
|---|---:|---:|---:|---:|
| list_order_page_ids | 32.479 | 353,8 min | 653,5 ms | 19,884 s |
| notification_product_summaries | 25.941 | 204,9 min | 473,9 ms | 7,824 s |
| list_order_schedule_ids | 2.984 | 124,4 min | 2.500,8 ms | 19,564 s |
| get_dashboard_digital_catalog_metrics | 230 | 3,5 min | 916,5 ms | 7,307 s |
| auto_fulfill_scheduled_orders | 28.114 | 141,83 min | 302,7 ms | 28,516 s |
| dispatch_return_fiscal_emission_worker | 28.114 | 24,42 min | 52,1 ms | 22,504 s |

São contadores cumulativos de execução no PostgreSQL, não tempo por usuário, relatório diário, Log Query, Log Ingestion ou bytes transferidos. Não usar estas médias como projeção de cobrança.

## Configuração e jobs observados

- auto_explain.log_min_duration=10000 ms, sample_rate=1, log_nested_statements=off.
- log_min_duration_statement=-1, log_duration=off e log_statement=ddl.
- PostgreSQL: limite global atual de conexões 60; configuração de statement_timeout das roles authenticator e authenticated 8 s; idle_in_transaction_session_timeout 60 s. A RPC de agenda tem exceção própria de 20 s.
- pg_cron 1.6.4; cinco jobs ativos. O dispatcher fiscal e o autofinalizador operam a cada dois minutos; os outros três jobs são diários.
- orders: estimativa de 1.321 linhas e 6.275.072 bytes. O tamanho/contagem são estimativas do catálogo, não contagem exata no incidente.

## Dados ainda necessários

- Leitura atual e séries históricas dos medidores oficiais de Log Query e Log Ingestion.
- Bytes e cardinalidade por fonte/tipo de log, se disponíveis sem consultar janelas já analisadas.
- CPU, memória, I/O e pico de conexões no intervalo do incidente.
- Série temporal do pg_stat_statements e volume de execuções por RPC por intervalo, não apenas desde o reset.
- Número de jobs pendentes e resultado HTTP dos dispatches fiscais para medir execuções sem trabalho.

## 26/11/2026 — revisão estática das notificações

- **Chamadas.** O checkout demonstra uma chamada evitável à RPC de pedidos por tentativa ativa que recebe erro no objeto retornado pelo resumo de produtos e ainda chega à contagem. É um limite estrutural por tentativa, sem contagem de ocorrências em produção.
- **Banco e rede.** Tempo, CPU, memória, I/O, pico de conexões, bytes, egress e eventos do recorte não medidos. A linha histórica de `pg_stat_statements` continua cumulativa. Para atribuir impacto ao recorte, seria necessária uma série de chamadas, erros e latências por rota e janela, com correlação segura entre as duas etapas.
- **Medidores oficiais.** Log Query e Log Ingestion não medidos neste ciclo. Os valores relatados acima seguem como referência histórica. A fonte oficial é a página de uso da organização no Dashboard, com o projeto MoranteHub e a janela de cobrança selecionados. A integração disponível não oferece esses medidores. Nenhuma nova varredura no Logs Explorer foi executada. [Log Query](https://supabase.com/docs/guides/platform/manage-your-usage/logs-query) e [Log Ingestion](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest)

Não estimar estes valores quando a telemetria não estiver disponível. Reavaliar as métricas depois de uma mudança aprovada usando janelas e fontes equivalentes.

## Verificação após as migrations de 26/11

Cinco respostas da mesma leitura remota foram comparadas antes e depois. A impressão digital do JSON completo coincidiu em cada caso.

| Caminho | Itens devolvidos | Total do filtro | Bytes do texto JSON no PostgreSQL |
|---|---:|---:|---:|
| Cronograma ERP, filtros do incidente | 29 | 29 | 1.196 |
| Agenda do app, todos os tipos | 53 | 53 | 1.420 |
| Pedidos ERP, primeira página | 15 | 1.108 | 651 |
| Pedidos de Venda no app, primeira página | 15 | 1.108 | 651 |
| Alertas de estoque para condição novo | 89 | — | 87.552 |

A execução conjunta passou de 2.273,81 ms para 1.564,99 ms nas duas execuções registradas pelo `pg_stat_statements`. É uma amostra do tempo do banco para os cinco casos juntos. A carga, a latência de cada RPC e o egress faturado exigem medições adicionais.

Para os filtros do cronograma ERP do incidente, 1.324 pedidos estavam visíveis na consulta de diagnóstico. O pré-filtro elimina 181 por estados, tipo ou exclusão e mais 370 pelo agendamento normalizado fora do intervalo. O plano estimado continuou a usar varredura sequencial. Para alertas, o `EXPLAIN` do SELECT deixou de mostrar a varredura auxiliar das variações e manteve o uso de `idx_product_variations_product_id` na agregação. As RPCs preservam seus contratos de rede.

## Cron em 26/11

| Job | Execuções nas 24 h antes da amostra | Concluídas | Falhas na partida | Duração do primeiro ciclo depois |
|---|---:|---:|---:|---:|
| Dispatcher de devolução fiscal | 720 | 702 | 18 | 12,1 ms |
| Autofinalizador de pedidos | 720 | 702 | 18 | 468,2 ms |

A janela de 24 horas terminou aproximadamente às 12h14 BRT. A fila fiscal estava vazia na medição, sem registros retidos que permitissem medir tempo entre criação e processamento. O autofinalizador tinha 3 candidatos vencidos sob o predicado atual na leitura pontual. Os dois jobs concluíram o primeiro ciclo após a mudança às 12h26 BRT. O dispatcher elimina um enfileiramento de HTTP por ciclo em que a sua verificação não encontra trabalho elegível. O número de POSTs evitados no período e as causas das falhas de partida não foram medidos.

## Amostra de Log Ingestion em 26/11

Uma consulta ad hoc ao Logs Explorer cobriu 12h00–12h15 BRT com filtro em `postgres_logs` e agregação de `length(event_message)` na origem.

| Texto dos eventos | Eventos | Bytes |
|---|---:|---:|
| Planos identificados por duração e texto do plano | 5 | 21.406 |
| Demais eventos PostgreSQL | 60 | 4.783 |

Os planos corresponderam a 81,7% do texto nessa amostra PostgreSQL. O recorte não contém o volume de metadados, as outras fontes de logs ou o total da organização. Os medidores oficiais permanecem pendentes no painel de uso. A Supabase descreve Log Query como dados examinados para ler logs e orienta evitar polling no Logs Explorer. [Log Query](https://supabase.com/docs/guides/platform/manage-your-usage/logs-query) e [Log Ingestion](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest).

## 26/11/2026 — troca de filtro na listagem ERP

Em 26/11/2026, 12:42:56 BRT, a inspeção encontrou uma possível chamada inicial adicional a `list_order_page_ids` por troca efetiva de filtro em página acima de 1, antes de retries e condicionada a cache e cancelamento. Uma resposta que avance pode iniciar a leitura de resumos. A revisão foi estática.

Chamadas observadas, eventos, latência, tempo de banco, CPU, RAM, Disk I/O, pico de conexões, bytes de resposta e egress não medidos neste recorte. A confirmação exige contagem de solicitações por página e troca de filtro, sem registrar os filtros, e estatísticas de execução do banco em intervalo equivalente. Log Query e Log Ingestion não medidos nesta execução. Os valores oficiais seguem no painel de uso da organização, filtrado pelo projeto e período.

## 26/11/2026 — retentativa da lista ERP

Às 13h00 BRT, a revisão estática indicou até uma seleção de IDs e uma leitura de resumos adicionais por tentativa elegível. O caminho de resumos depende de a seleção devolver IDs. Contagem de chamadas, eventos, latência, tempo do banco, CPU, RAM, Disk I/O, pico de conexões, bytes de resposta e egress em produção não medidos. Para medir impacto, são necessárias contagens por etapa e tipo de falha, latência e estatísticas do banco em janela equivalente, sem conteúdo de pedidos.

Log Query e Log Ingestion não medidos nesta execução. A fonte dos valores oficiais segue sendo Usage da organização Supabase, com o projeto e período selecionados. O conector disponível não oferece a leitura desses medidores. A janela de logs permanece encerrada às 12h15 BRT.


## 26/11/2026 — base para medir a listagem de pedidos por intervalo

Coleta em 26/11/2026 às 13:08:06,903 BRT. Projeto operacional MoranteHub, views `extensions.pg_stat_statements` e `extensions.pg_stat_statements_info`. Recorte das instruções PostgREST de topo da role `authenticated` no banco atual, filtradas pelas duas RPCs do schema `public`. Reset global em 18/10/2026 às 11:21:04 UTC, com `dealloc = 16` na coleta.

| RPC | Entradas | Execuções concluídas registradas | Tempo total de execução (ms) | Máximo registrado (ms) |
|---|---:|---:|---:|---:|
| list_order_page_ids | 1 | 32.696 | 21.437.001,76 | 19.883,61 |
| read_order_summaries | 1 | 9.678 | 3.493.623,82 | 7.496,50 |

Os contadores são cumulativos. Uma segunda coleta comparável permite calcular deltas de chamadas e tempo total, após conferir continuidade das entradas, monotonicidade, reset e desalocações. O máximo é cumulativo. A extensão atualiza o contador de execução ao fim de execuções bem-sucedidas. Cancelamentos SQL, timeout do gateway e origem ERP/app exigem evidência própria. Os dois clientes compartilham as RPCs e o seletor também atende outros fluxos. A diferença entre os totais das RPCs não quantifica retentativas nem cancelamentos. [Documentação do PostgreSQL](https://www.postgresql.org/docs/current/pgstatstatements.html).

Latência por requisição, cancelamentos por etapa, CPU, RAM, Disk I/O, pico de conexões, eventos, bytes de resposta e egress não medidos. Para cancelamentos, a fonte necessária é telemetria agregada de PostgreSQL e PostgREST por janela e operação. Log Query e Log Ingestion não medidos. A fonte oficial permanece o painel Usage da organização, com projeto e período selecionados.

## 26/11/2026 — primeira comparação da listagem por intervalo

Intervalo de 13:08:06,903 a 13:21:37,386 BRT (13 min 30 s). Fonte: `extensions.pg_stat_statements` e `extensions.pg_stat_statements_info` no MoranteHub operacional. A segunda coleta encontrou uma entrada por RPC no mesmo recorte de banco, role e nível, com reset global e `dealloc = 16` iguais aos da base, máximos cumulativos iguais e contadores crescentes. A base não guardou os identificadores das instruções. Os deltas são estimativas operacionais comparáveis sob esses indicadores de continuidade.

| RPC | Execuções registradas ao fim da janela | Delta de execuções concluídas | Tempo total ao fim da janela (ms) | Delta de tempo SQL (ms) |
|---|---:|---:|---:|---:|
| list_order_page_ids | 32.702 | +6 | 21.437.521,93 | +520,17 |
| read_order_summaries | 9.679 | +1 | 3.493.827,10 | +203,28 |

Os agregados não permitem parear as etapas ou atribuir execuções ao ERP, ao app ou aos alertas. Cancelamentos, latência de ponta a ponta, eventos, bytes de resposta, egress, CPU, RAM, Disk I/O e pico de conexões não medidos. Log Query e Log Ingestion não medidos. A fonte oficial segue sendo o painel Usage da organização, com filtro do projeto e do período. Nenhuma consulta ao Logs Explorer foi feita nesta rodada.

## 26/11/2026 — metadados da RPC de métricas do Catálogo Digital

Coleta às 13:34:05,882 BRT, no MoranteHub operacional. O catálogo PostgreSQL confirmou a CTE materializada e os consumidores de série diária e rankings na RPC `public.get_dashboard_digital_catalog_metrics()`. A função não tem override próprio de `statement_timeout` em `pg_proc.proconfig`. Isso não determina o prazo efetivo de cada requisição. `pg_stat_user_tables` estimava 3.745 linhas vivas para `public.product_analytics`, com último autoanalyze em 23/11/2026 às 11:00:53,991 BRT. A estimativa é da tabela inteira, sem contagem por período, tipo ou filtros da RPC.

Chamadas por intervalo, latência, tempo SQL, CPU, RAM, Disk I/O, pico de conexões, eventos de log, bytes de resposta e egress não medidos. Para medir o custo, faltam plano interno e estatísticas de execução comparáveis. Para atribuir cancelamentos, faltam evidências por operação e janela. Log Query e Log Ingestion não medidos. A fonte oficial segue sendo Usage da organização com projeto e período selecionados.


## 26/11/2026 — partida e execução dos dois jobs

Fonte: leitura agregada de `cron.job_run_details` no MoranteHub, por `end_time` no intervalo de 12h28 inclusive a 13h48 exclusive (BRT). O recorte começa após o primeiro ciclo já registrado às 12h26. Abrange somente os dois jobs e os registros finalizados no intervalo.

| Job | Finalizados com sucesso | Falhas de partida | Falhas por timeout SQL | Outros resultados | Duração máxima dos sucessos |
|---|---:|---:|---:|---:|---:|
| Dispatcher de devoluções fiscais | 40 | 0 | 0 | 0 | 61,02 ms |
| Autofinalizador de pedidos | 40 | 0 | 0 | 0 | 1.120,05 ms |

A duração usa `end_time - start_time` dos sucessos. A latência anterior ao envio do comando e o custo efetivo de CPU/SQL por ciclo não foram medidos. A classificação de timeout SQL usa a mensagem registrada no histórico.

Às 13:48:04,116 BRT, a consulta a `pg_settings` e `pg_stat_activity` encontrou 20 processos do tipo `client backend` no ponto de coleta, com `max_connections=60`, 3 conexões reservadas a superusuários e `max_worker_processes=6`. O agendador estava ativo desde 18/10/2026 às 11:26:14,728 UTC. `cron.launch_active_jobs=on`, `cron.use_background_workers=off` e `cron.max_running_jobs=32`. CPU, RAM, Disk I/O e pico de conexões do incidente não medidos. Fonte necessária: séries históricas em Observability. [Guia do pg_cron da Supabase](https://supabase.com/kb/troubleshooting/pgcron-debugging-guide-n1KTaz).

Chamadas HTTP, eventos do Logs Explorer, bytes de resposta, egress, Log Query e Log Ingestion não medidos no recorte. A janela do Logs Explorer permanece encerrada às 12h15 BRT. O painel Usage da organização é a fonte dos medidores oficiais de logs.


## 26/11/2026 — base de execução do autofinalizador

Coleta às 14:19:51,916 BRT. Fonte: `extensions.pg_stat_statements` e `extensions.pg_stat_statements_info` no MoranteHub operacional. Filtro pela instrução exata do job, `SELECT public.auto_fulfill_scheduled_orders()`, com uma entrada de topo, `queryid=6259416268233072029`. Último reset global em 18/10/2026 às 11:21:04,056 UTC e `dealloc=16` na coleta.

| Contador cumulativo | Valor |
|---|---:|
| Execuções concluídas | 28.194 |
| Tempo de execução somado | 8.553.202,746 ms |
| Tempo médio por execução | 303,370 ms |
| Máximo cumulativo | 28.515,529 ms |
| Acessos atendidos pelos buffers compartilhados | 142.419.133 |
| Blocos lidos nos buffers compartilhados | 174 |
| Blocos compartilhados marcados como sujos | 36.304 |
| Blocos temporários gravados | 0 |

**Observação.** A média cumulativa é de aproximadamente 5.051 acertos de buffer por execução. O SELECT também registrou 28.194 linhas SQL. A função retorna um resumo JSON por chamada concluída, mesmo quando `processed=0`. Esse contador de linhas mede a saída da instrução. O número de pedidos finalizados e os ciclos vazios não foram medidos. [Função e agendamento](../../supabase/migrations/20261013231942_auto_fulfill_scheduled_orders_time_aware.sql#L151).

**Limite da medição.** O tempo SQL reúne a seleção de candidatos e o trabalho transacional das execuções concluídas. Os acertos podem contar o mesmo bloco várias vezes. CPU, RAM, Disk I/O, pico de conexões, cancelamentos, latência do cliente, bytes de resposta, egress, eventos de log, Log Query e Log Ingestion não medidos. Para obter deltas, repetir o recorte após um intervalo útil e conferir a mesma entrada, reset, desalocações e monotonicidade. A separação entre ciclos vazios e ciclos com trabalho depende de uma fonte agregada que preserve o resultado por ciclo. Os medidores oficiais continuam no Usage, filtrado pelo projeto e período de cobrança.

## 26/11/2026 — primeiro intervalo comparável do autofinalizador

Janela de 14:19:51,916 a 14:32:57,617 BRT (13 min 5,701 s). Fonte: uma leitura de `extensions.pg_stat_statements` e `extensions.pg_stat_statements_info` no MoranteHub operacional. A entrada de topo `6259416268233072029`, o reset global e o contador de desalocações conferem com a base anterior. Os contadores cumulativos avançaram de forma monotônica.

| Métrica | Delta na janela |
|---|---:|
| Execuções concluídas / linhas SQL de resumo | 7 / 7 |
| Tempo de execução SQL somado | 3.008,394 ms |
| Tempo SQL médio por execução concluída | 429,771 ms |
| Acertos nos buffers compartilhados | 39.866 |
| Blocos lidos nos buffers compartilhados | 0 |
| Blocos compartilhados marcados como sujos | 9 |
| Blocos temporários gravados | 0 |

**Observação.** Uma consulta agregada a `cron.job_run_details`, pelo job `auto-fulfill-scheduled-orders` e pelo horário de término na mesma janela, encontrou sete sucessos. Todas as mensagens foram `1 row` e nenhuma continha o campo `processed`. A função retorna uma linha de resumo também nos ciclos sem pedidos finalizados. A amostra mede tempo de execução SQL e confirma que o histórico do cron, nesse recorte, não permite distinguir ciclos vazios de ciclos com trabalho. Os blocos marcados como sujos não identificam a quantidade de pedidos processados. [Retorno e agendamento](../../supabase/migrations/20261013231942_auto_fulfill_scheduled_orders_time_aware.sql#L151).

**Limites.** CPU, RAM, Disk I/O, pico de conexões, latência ponta a ponta, chamadas HTTP, eventos de log, bytes de resposta, egress, Log Query e Log Ingestion não medidos. Para recursos do banco, a fonte necessária é Reports. Para faturamento de logs, é Usage no período e projeto correspondentes. O máximo cumulativo permaneceu em 28.515,529 ms e não representa o máximo da janela.


## 26/11/2026 — limites de atribuição no autofinalizador

Às 14:48:27 BRT, uma leitura do catálogo PostgreSQL no MoranteHub operacional confirmou o tratamento de `40001` no job, a exceção padrão `P0001` para versão obsoleta e o uso do vendedor no histórico de status. A leitura retornou apenas verificações booleanas e horário. As transições escritas pela função compartilhada não fornecem identificação do job ou do ciclo.

Conflitos observados, ciclos vazios, pedidos processados por ciclo, eventos, latência, tempo SQL adicional, respostas, egress, CPU, RAM, Disk I/O e pico de conexões não medidos neste recorte. O resultado de processamento por ciclo seria a fonte para as três primeiras contagens. Reports é a fonte para séries de recursos do banco. Log Query e Log Ingestion não medidos neste ciclo. Para os valores oficiais, consultar Usage da organização com escopo do projeto e período. Última janela do Logs Explorer até 12h15 BRT.

## 26/11/2026 — validação após a migration do autofinalizador

Leitura remota às 14:59 BRT confirmou no catálogo a captura de `P0001`, a comparação exata da mensagem `ORDER_VERSION_CONFLICT`, a manutenção do tratamento `40001`, zero EXECUTE para anon/authenticated/service_role e um cron do autofinalizador com a agenda `*/2 * * * *`. Isso verifica definição, privilégios e agendamento. Não mede ocorrências, resultados comportamentais, tempo SQL, eventos, bytes, egress ou medidores oficiais de Log Query e Log Ingestion.

## 26/11/2026 — retentativa após negativa no painel de Catálogo Digital

- Revisão estática às 2026-11-26T15:35:06.9956823-03:00. O cliente ERP admite até uma retentativa automática após o erro `42501`, dependendo de a consulta permanecer ativa e de o Query Guard liberar a chamada. É um limite deduzido do código. Execuções, latência, tempo SQL, volume de eventos, bytes e egress reais ficaram sem medição.
- Log Query e Log Ingestion oficiais continuam sem medição neste ciclo. A leitura requer Usage da organização com filtro por projeto e período. O checkpoint do Logs Explorer continua às 12h15 BRT.

## 26/11/2026 — base dos contadores da RPC de métricas do catálogo

Coleta às 15:47 BRT no projeto MoranteHub (`hkoxhourxwlddgsfdgws`), por leitura de `extensions.pg_stat_statements` e `extensions.pg_stat_statements_info`. A instrução principal `get_dashboard_digital_catalog_metrics` (`queryid=2070826686899725551`) tinha 235 chamadas, 214.318,24 ms de execução acumulada, média de 911,993 ms e máximo de 7.306,58 ms. Linhas retornadas: 235. `stats_reset` permaneceu em 18/10/2026 às 11:21:04,056 UTC e `dealloc=16`.

Este retrato serve como ponto inicial para o próximo delta. Ele acumula chamadas anteriores e posteriores à migration de 26/11, portanto não mede o desempenho da versão alterada. O delta posterior pode medir novas execuções enquanto queryid, reset e desalocações permanecerem estáveis. Não identifica cancelamentos, cliente, CPU, I/O, latência de rede, bytes, egress, nem Log Query ou Log Ingestion. Nenhuma leitura do Logs Explorer nesta rodada.

## 26/11/2026 — intervalo sem novas chamadas da RPC do catálogo

No MoranteHub operacional, uma leitura de `pg_stat_statements` às 16:01:56 BRT comparou a instrução `queryid=2070826686899725551` com a base das 15:47 BRT. O contador permaneceu em 235 chamadas e 214.318,24 ms totais, sem alteração no máximo cumulativo, no reset global (18/10 às 11:21:04 UTC) ou em `dealloc=16`. Delta observado: zero chamadas e zero ms agregados no intervalo de aproximadamente 15 minutos. Isso indica que essa instrução não teve execuções concluídas registradas nesse período. Não permite avaliar o custo da versão otimizada nem inferir demanda total do painel. Erros/cancelamentos, bytes, latência, recursos e medidores oficiais de Log Query e Log Ingestion seguem sem medição.

## 26/11/2026 — execuções do autofinalizador após a migration

Fonte: leitura agregada de `cron.job_run_details` e `cron.job` no MoranteHub operacional, filtrada pelo comando de `auto_fulfill_scheduled_orders()` e `end_time` entre 16:00 inclusive e 17:00 exclusive (BRT). Foi identificado um job e 30 execuções concluídas. Todas 30 tiveram status `succeeded`; zero resultados diferentes de sucesso, zero assinaturas de timeout de partida e zero assinaturas de timeout SQL em `return_message`. Duração média dos sucessos: 620,35 ms; máximo no intervalo: 4.686,06 ms.

A janela é posterior à migration de classificação de conflito, mas não mede ocorrências de `ORDER_VERSION_CONFLICT` nem prova o comportamento dessa classificação. A duração abrange a execução SQL do job, sem isolar CPU, número de pedidos processados, chamadas HTTP, latência de rede ou trabalho útil. Log Query, Log Ingestion, bytes e egress não medidos. Não houve consulta ao Logs Explorer.
