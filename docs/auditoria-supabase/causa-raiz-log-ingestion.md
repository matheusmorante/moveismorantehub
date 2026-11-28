# Causa raiz — Log Ingestion

**Estado em 28/11/2026: origem principal do total do ciclo não identificada.** A amostra de 26/11 mostra planos `auto_explain` como origem volumosa no texto PostgreSQL daquela janela. Uma nova amostra de 15 minutos em 28/11 mostra `edge_logs` como maior fonte de bytes de `event_message`, representando cerca de 85% do texto retornado; a documentação define essa fonte como requisições HTTP pelo API Gateway, incluindo REST e GraphQL. A comparação estática dos dias de pico e baixo Log Query não encontrou aumento equivalente de logging do backend no repositório: em 05/11, seis chamadas `console.error`/`console.warn` foram adicionadas em clientes ERP/app, não em Edge Functions. A busca local não encontrou exportador que encaminhasse essas mensagens ao Log Ingest do projeto. No refactor de `sefaz-inbound-sync`, oito chamadas existentes foram movidas de módulo e permaneceram oito. Em 25/11, o commit local não alterou loggers ou configuração de logging. Essas amostras reduzem algumas incertezas sobre fontes atuais, mas não medem o total oficial ingerido nem identificam a causa dos acumulados históricos.

## Medidas disponíveis

- O operador relatou 0,942 GB contra 1 GB incluído em 26/11. Não houve leitura do acumulado oficial nesta revisão.
- A captura de 27/11 mostra 1 GB incluído e barras diárias entre 28/10 e 27/11, sem tooltip numérico. A barra de 21/11 parece próxima de 88 MB pela escala, mas é somente uma estimativa visual.
- A documentação oficial descreve Log Ingest como o volume de logs ingerido pelos serviços do projeto, incluindo Postgres, API gateway, Auth, Storage, Realtime e Edge Functions. Usage exibe todos os projetos por padrão e permite selecionar projeto e período. A página consultada informa que Log Ingest ainda não estava sendo cobrado e prevê um período de carência até o início de 2027. [Usage oficial de Log Ingest](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest).

## Evidência PostgreSQL

Na janela 26/11, 12:00–12:15 BRT, uma agregação de supabase.query_logs encontrou:

| Grupo | Eventos | Bytes de texto event_message |
|---|---:|---:|
| Planos classificados como auto_explain | 5 | 21.406 |
| Outros eventos PostgreSQL | 60 | 4.783 |
| Total da amostra | 65 | 26.189 |

Os planos correspondem a 81,7% dos bytes de event_message nesta amostra. A leitura anterior registrou auto_explain.log_min_duration = 10000 ms, sample_rate = 1 e log_nested_statements = off; log_min_duration_statement = -1, log_duration = off e log_statement = ddl. A configuração é compatível com a geração de planos para consultas que ultrapassam o limiar, e os cinco registros dão evidência de que esse caminho gerou texto volumoso na janela. Não medem os metadados de log, outras fontes, outros dias ou o total faturável do projeto.

## Evidência do API Gateway

Uma única agregação somente leitura consultou a janela inédita de 28/11/2026, 12:02–12:17 UTC (09:02–09:17 BRT), sem retornar mensagens brutas:

| Fonte | Eventos | Bytes de texto `event_message` | Maior mensagem |
|---|---:|---:|---:|
| `edge_logs` | 217 | 70.072 | 5.612 |
| `postgres_logs` | 61 | 4.991 | 261 |
| `auth_audit_logs` | 4 | 2.307 | 578 |
| `postgrest_logs` | 21 | 1.861 | 209 |
| `auth_logs` | 5 | 1.748 | 521 |
| `realtime_logs` | 12 | 1.425 | 496 |
| **Total** | **320** | **82.404** | **5.612** |

Na documentação oficial, `edge_logs` representa requisições HTTP que passam pelo API Gateway, inclusive REST e GraphQL; `function_edge_logs` representa requisições/respostas de invocações de Edge Functions e `function_logs` representa saída de `console.*` dentro delas. As duas fontes de função não apareceram nesta amostra. `auto_explain` não apareceu no texto da janela. Portanto, nesta amostra, o API Gateway foi o maior componente visível do texto dos eventos — aproximadamente 85,0% dos 82.404 bytes de `event_message`. O comprimento do campo não é a medida oficial do Log Ingest: exclui outros campos e metadados e não informa compressão, agregação ou comportamento em outros intervalos. A leitura não atribui chamadas a um cliente específico nem explica o total de novembro. [Referência de fontes e campos](https://supabase.com/docs/guides/observability/log-field-reference).

## Fontes candidatas no código

Uma busca estática encontrou chamadas console.* explícitas em 6 de 18 arquivos TypeScript sob supabase/functions. Isso localiza emissores possíveis, não prova que foram executados nem mede frequência ou bytes:

- analyze-inbound-invoice registra início, falhas e conclusão por invocação, incluindo contagem de itens, tipo/tamanho do arquivo e tempos: [index.ts:69](../../supabase/functions/analyze-inbound-invoice/index.ts#L69) e [index.ts:212](../../supabase/functions/analyze-inbound-invoice/index.ts#L212).
- sefaz-inbound-sync registra início, etapas de consulta, recuperação e resumo de conclusão: [index.ts:24](../../supabase/functions/sefaz-inbound-sync/index.ts#L24) e [index.ts:476](../../supabase/functions/sefaz-inbound-sync/index.ts#L476).
- sync-ncms, gemini-live-token e mobile-gemini-proxy têm chamadas explícitas de erro/aviso; mobile-gemini-proxy também tem avisos em quotaService. A frequência de invocação e o volume por função não estão disponíveis na inspeção local.

Uma busca local por configuração de Log Drain e integração com Datadog, Axiom, Better Stack, Logtail, New Relic ou Sentry não encontrou setup desses emissores. A ocorrência de sentryHint em secure-integrations.cjs pertence à mensagem de trace propagation do supabase-js. O repositório não contém .github nem vercel.json na raiz. Configurações feitas diretamente na organização Supabase, no Dashboard ou em serviços externos não estão acessíveis por esta inspeção; esses emissores permanecem possíveis.

## Indício PostgREST se a Data API estiver desativada

A base oficial do Supabase informa que desativar a Data API não encerra imediatamente PostgREST. Nessa situação, um schema fictício `pg_pgrst_no_exposed_schemas` é colocado na configuração exposta e pode gerar entradas de erro adicionais nos logs. A correção documentada direciona a role `authenticator` a um schema vazio e recarrega PostgREST; ela afeta a exposição da API e não foi aplicada. [Artigo oficial atualizado em 04/11/2026](https://supabase.com/kb/troubleshooting/schema-pg_pgrst_no_exposed_schemas-does-not-exist).

Em 16/11, um usuário relatou redução significativa de Log Query após aplicar essa correção em um projeto com Data API desativada. No MoranteHub, uma leitura somente de `pg_roles.rolconfig` encontrou na role `authenticator` apenas `session_preload_libraries`, `statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout`; não encontrou configuração `pgrst.db_schemas`. Isso mostra que a correção não está aplicada. Uma agregação de 15 minutos em 27/11 (20:09–20:24 UTC) não encontrou eventos `postgrest_logs` contendo `pg_pgrst_no_exposed_schemas`. A amostra reduz a evidência de ocorrência atual desse erro, mas não confirma se a Data API está desativada nem exclui erros noutros horários. Não atribui bytes de Log Ingest ou Log Query. [Tópico público](https://github.com/orgs/supabase/discussions/50925).

## Suspeitas ordenadas pelas evidências

| Prioridade | Origem possível | Evidência e limite | Estado |
|---|---|---|---|
| 1 | SUP-016 — requisições HTTP via API Gateway | `edge_logs` somou 70.072 bytes de `event_message` em uma janela de 15 minutos, maior volume de texto entre seis fontes retornadas; representa cerca de 85,0% da amostra combinada. A amostra não identifica o cliente nem mede o total oficial. | Maior fonte observada nesta janela; frequência e bytes de Log Ingest no ciclo continuam desconhecidos. |
| 2 | SUP-004 — planos PostgreSQL emitidos por auto_explain | Cinco eventos somaram 21.406 bytes de texto em uma janela de 15 minutos e representaram 81,7% da amostra PostgreSQL de 26/11. O total do projeto e a repetição não foram medidos. | Dominante somente naquela amostra PostgreSQL; causa do total desconhecida. |
| 3 | SUP-015 — logs de Edge Functions | Código contém mensagens por invocação em duas funções e erros/avisos em outras. `function_edge_logs` e `function_logs` não apareceram na amostra de 28/11. Não há frequência histórica nem correlação com Usage. | Possível, sem medição suficiente. |
| 4 | SUP-016 — Auth, Storage, Realtime e outros serviços | A janela de 28/11 retornou eventos `auth_audit_logs`, `auth_logs`, `postgrest_logs` e `realtime_logs`; Storage e fontes de pooler não apareceram. O texto de eventos não é comparável ao contador oficial. | Observados em uma amostra; frequência e contribuição oficial desconhecidas. |
| 5 | SUP-017 — chamadas SQL e migrations da própria auditoria | Históricos acessíveis incluem 33 registros supabase.execute_sql e 5 supabase.apply_migration em quatro chats relacionados. Esses totais não representam apenas ciclos automáticos nem medem eventos ou bytes. | Contribuição à ingestão desconhecida. |
| 6 | Alterações versionadas nos dias comparados | Em 05/11, seis chamadas novas eram em clientes web/mobile; não foi encontrado encaminhamento dessas mensagens ao Log Ingest do Supabase. A Edge Function teve apenas mudança de localização de logging, sem aumento do número de chamadas. Em 25/11, não houve mudança de logging no commit local e o Vercel não registra deployment. | Nenhum aumento de emissão no backend Supabase foi comprovado; deployments externos e recorrência de execução permanecem sem telemetria. |
| 7 | SUP-021 — erros PostgREST se Data API estiver desativada | Documentação oficial descreve mensagens adicionais nesse estado; a role `authenticator` não tem o override. Uma janela inédita de 15 min em 27/11 não teve ocorrências do erro consultado. | Data API e histórico de ocorrência desconhecidos; não explica esta amostra de 28/11 ou os totais do ciclo. |

Nos quatro chats relacionados inspecionados foram encontrados 33 registros de chamada supabase.execute_sql e cinco chamadas supabase.apply_migration. Esses totais misturam ciclos de auditoria, aprovações, implementação e verificação; não representam 33 execuções automáticas nem são contagens de eventos ou bytes de log. Não permitem atribuir Log Ingest à automação.

## Próxima confirmação necessária

O próximo recorte pode comparar `edge_logs` com requisições REST/GraphQL por rota normalizada numa janela nova de até 15 minutos, omitindo query string e identificadores; isso só estima atividade recente e não atribui o consumo histórico. A autorização de leitura do operador permite no máximo uma agregação por execução, com limites ISO explícitos, sem dados sensíveis e sem repetir janelas. Agrupar `source`, contagem e comprimento de `event_message` é apenas um indicador amostral, não o contador oficial de bytes ingeridos. Nenhuma configuração de logging deve ser alterada sem causa confirmada e aprovação específica.
