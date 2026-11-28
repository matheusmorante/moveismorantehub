# Histórico

## 28/11/2026 09:53 BRT — redução da cadência da auditoria

- **Mudança e motivo:** a automação de investigação foi alterada de uma execução a cada 15 minutos para uma execução por hora. O painel Usage mostrado pelo operador informa atualização horária dos dados; a frequência anterior podia produzir até 96 execuções locais por dia sem tornar os medidores mais atuais. A nova frequência permite até 24 execuções por dia.
- **Escopo e limite:** alteração somente na recorrência da automação local do Codex. Nenhum código do ERP/app, dado, configuração Supabase/Vercel, cron ou serviço foi alterado. A redução de execuções não equivale a uma redução comprovada de bytes de Log Query ou Log Ingestion; as consultas de logs recentes têm janelas registradas, mas não há medição dos bytes escaneados.
- **Próxima verificação:** observar a próxima atualização do Usage e comparar janelas equivalentes. A mudança não atribui nem corrige retroativamente o pico de 05/11.

## 28/11/2026 09:32 BRT — bloqueio de histórico de chamadas externas da Vercel

- **Fonte e resultado:** o schema Vercel expõe `vercel.external_api_request.count` e dimensões de hostname/rota. Consultas somente leitura à janela BRT de 05/11 e à de 25/11 foram rejeitadas por exigir Observability Plus; a equipe está no plano Hobby. Não houve acesso a contagens e nenhum plano foi alterado.
- **Consulta de logs:** uma tentativa única em `query_logs`, 28/11/2026 12:17–12:32 UTC (09:17–09:32 BRT), para agrupar rotas normalizadas em `edge_logs` foi rejeitada pelo parser SQL e não retornou dados. Não repetir essa janela; a próxima consulta, se indispensável, deve usar intervalo novo e expressão compatível com ClickHouse.
- **Limites e próximo passo:** o histórico Vercel de chamadas externas permanece indisponível sem mudança paga. Não se fez novo pedido nem alteração. Continuar por uma fonte de leitura já acessível; a falha do `query_logs` não esclarece o tráfego ou o metering.

## 28/11/2026 09:17 BRT — verificação de históricos locais e amostra de Log Ingestion

- **Fontes e resultado:** metadados das bases History padrão do Chrome e Edge; Agendador do Windows; uma agregação Supabase `query_logs` na janela inédita 28/11/2026 12:02–12:17 UTC (09:02–09:17 BRT). Não houve visita local a URLs Supabase `/logs` ou `/usage` entre 28/10 e 27/11 nas bases legíveis (6/7 Chrome, 1/1 Edge). O log operacional do Agendador estava desativado e a lista atual não tinha tarefas nomeadas Codex/Supabase/Morante/Auditoria/Log Query/Log Ingestion. Isso não exclui uma aba previamente aberta, webview do Codex ou agendadores externos.
- **Log Ingestion amostrado:** `edge_logs` (API Gateway REST/GraphQL) somou 217 eventos e 70.072 bytes de texto `event_message` (~85% do texto de todas as fontes retornadas); `postgres_logs` somou 61 eventos e 4.991 bytes, sem ocorrência da string `auto_explain`. A janela retornou também auth, PostgREST e Realtime; não retornou fontes de Edge Function. Esses comprimentos não são bytes oficiais de Log Ingest e não explicam o acumulado ou os picos históricos. Uma consulta de logs executada; sem payload bruto.
- **Limites e preservação:** uma das sete bases Chrome não pôde ser lida; ausência de visita não prova ausência de aba ativa nem cobre outros navegadores/perfis, APIs, CLI, webviews ou automações externas. Não houve mudança de código, configuração, dados, cron, serviço, implantação, migration ou teste. Os resultados foram registrados em [causa raiz de Log Query](causa-raiz-log-query.md) e [causa raiz de Log Ingestion](causa-raiz-log-ingestion.md).
- **Próximo recorte:** se uma leitura nova for necessária, agregar apenas rotas API Gateway normalizadas em janela inédita de até 15 minutos, removendo query strings e IDs; comparar apenas como amostra recente, sem inferir os dias 05/11 ou 25/11.

## 26/11/2026 — implementação de SUP-PROP-005 a SUP-PROP-008

- O operador aprovou expressamente as quatro propostas. No ERP, `notificationService.ts` evita selecionar rascunhos se o resumo de produtos falhar. `useOrderHistory.ts` vincula a página à identidade do filtro e usa 15 pedidos por página. `orderHistoryQueryRetry.ts` encerra a tentativa automática para os erros dos validadores compartilhados de página e resumos, preservando as mensagens.
- No app, o fluxo de pedidos já volta à página 1 ao trocar busca ou status. O serviço usa os mesmos validadores atualizados e o hook trata a falha da leitura sem retry equivalente. A RPC de métricas tem consumidor no painel do ERP. A consulta de alertas de estoque revisada pertence ao ERP.
- A migration `20261126181712_bound_dashboard_catalog_recent_analytics` foi aplicada ao MoranteHub. O JSON antigo e o candidato coincidiram no mesmo snapshot antes da aplicação. O `EXPLAIN` estimou 10.010,78 e 1.552,41 unidades, respectivamente. Verificação posterior confirmou a definição, o proprietário, os grants, o modo de segurança e o caminho de busca da função. [Métricas](metricas.md#26112026--comparação-sql-de-sup-prop-008).
- Vitest passou em 24 casos do ERP e em nove casos dos serviços de listagem do app com `erp/vitest.mobile.config.ts`. O SQL foi verificado por comparação direta de leitura e metadados, sem login no painel. Alterações do ERP e dos validadores permanecem no checkout. Sem publicação ou OTA.

## 2026-11-26 — primeira execução e criação da automação

- **Objetivo:** iniciar auditoria incremental após o operador compartilhar logs de SQLSTATE 57014, SQLSTATE 08006, duração superior a 10 segundos e falhas de inicialização do pg_cron.
- **Fontes consultadas:** documentação fiscal vigente; roadmap de otimização de consumo já existente; Supabase Logs dos intervalos estreitos 10:55–11:20 BRT; advisors de segurança, desempenho e saúde; funções SQL remotas; cron.job e cron.job_run_details; pg_settings; pg_stat_statements.
- **Escopo remoto:** projeto MoranteHub, hkoxhourxwlddgsfdgws; funções de negócio do schema public e a view de estatísticas extensions.pg_stat_statements.
- **Código revisado:** migrations de filtros/contagens de agenda e timeout; helper compartilhado da agenda; chamadores reais ERP e app.
- **Descobertas:** SUP-001 a SUP-005.
- **Propostas registradas:** SUP-PROP-001 a SUP-PROP-004, todas aguardando aprovação individual.
- **Alterações aprovadas ou executadas:** nenhuma alteração funcional, SQL, configuração, cron, dados, migration, commit, push, deploy ou OTA.
- **Automação:** “Auditoria contínua de consumo e desempenho do Supabase”, ativa no projeto local MoranteHub, com execução a cada 15 minutos. Avisos automáticos limitados a falhas; cada execução ainda registra seu resultado e propostas nestes documentos.
- **Testes:** nenhum teste foi executado. As consultas remotas foram de leitura; não se usou EXPLAIN ANALYZE.
- **Limitações:** os contadores de pg_stat_statements são cumulativos desde 18/10/2026 e não isolam os 25 minutos do incidente; não há medição de Log Query, Log Ingestion, egress, CPU ou I/O por RPC neste relatório.
- **Proteção do checkout:** os arquivos ERP e helper compartilhado da agenda que já estavam modificados ou não rastreados foram preservados.

## 2026-11-26 — atualização de alertas após erro na RPC de produtos

- **Checkpoint.** SUP-006 e SUP-PROP-005 registrados. Revisão estática em `main` da sequência de chamadas do ERP e do caminho móvel. O roadmap anterior já cobre compactação, compartilhamento, cancelamento e reconexão. O recorte novo é a leitura descartada após a RPC de produtos resolver com erro.
- **Validação e decisões.** Revisados o sino, o painel, o serviço que compartilham e o contexto de notificações do app. SUP-PROP-001 a SUP-PROP-005 aguardam aprovação individual. Nenhum teste, consulta remota ou alteração funcional foi executado. As alterações locais preexistentes foram preservadas.
- **Próximo recorte.** Revisar `list_order_page_ids` nos gatilhos de atualização da lista de pedidos do ERP e do app, no contexto de SUP-PROP-002. Usar os registros SCE de pedidos e Realtime como ponto de partida. O último intervalo de logs coberto continua 10:55–11:20 BRT. Consultar uma janela nova somente se houver hipótese que dependa dela.

## 2026-11-26 — implementação das quatro propostas aprovadas

O operador aprovou SUP-PROP-001 a SUP-PROP-004. As migrations 20261126152432, 20261126152451 e 20261126152514 constam no histórico do projeto operacional MoranteHub. A comparação do catálogo preservou as permissões e configurações das funções. Os advisors remotos após a aplicação não indicaram achado específico para as funções alteradas.

As cinco leituras de verificação devolveram JSON idêntico antes e depois, incluindo ordem, totais e detalhes da resposta. A consulta que reuniu essas leituras passou de 2.273,81 ms para 1.564,99 ms no PostgreSQL. O plano dos alertas passou de dois acessos às variações, incluindo uma varredura auxiliar, a uma leitura indexada por produto candidato. Esses resultados cobrem a amostra remota e o plano consultado. [Métricas e casos verificados](metricas.md#verificação-após-as-migrations-de-2611).

O primeiro ciclo normal do dispatcher e do autofinalizador após a mudança concluiu às 12h26 BRT. O dispatcher tinha fila vazia e sua função agora retorna antes de enfileirar HTTP nesse estado. A consulta de reserva fiscal, suas permissões, a retomada e as frequências dos dois jobs conferem com as definições anteriores. A validação cobriu o banco por leituras e o ciclo automático observado. O processamento de devolução com trabalho elegível e as interfaces ficaram fora desta prova. [Registro fiscal](../fiscal/historico-correcoes-2026-11-26.md).

A amostra ad hoc do `auto_explain` cobriu 12h00–12h15 BRT. Para compará-la ao contador oficial será necessário o uso por projeto no painel Usage, para o mesmo intervalo ou uma janela disponível compatível. O checkpoint de logs avança para 12h15 BRT. A auditoria continua por código e estatísticas SQL, com logs somente quando uma hipótese exigir nova consulta. SUP-PROP-005 mantém sua decisão própria.

## Próximas execuções

Ler este histórico e os diagnósticos antes de escolher o próximo recorte. Para leituras de logs indispensáveis, usar uma única janela ad hoc de até 15 minutos que ainda não tenha sido consultada. Conferir os diffs atuais e restringir as gravações da automação a este diretório.

## 2026-11-26 — filtro e paginação do histórico de pedidos

- **Checkpoint em 26/11/2026, 12:42:56 BRT.** SUP-007 e SUP-PROP-006 registrados após revisão estática da tela, serviços e clientes ERP/app em `main`. Os diffs locais dos hooks examinados movem imports. O reset de página após a mudança da chave já existia. O mecanismo histórico SCE-325 de recuperação por Realtime ficou fora desta proposta.
- **Decisões e validação.** SUP-PROP-005 e SUP-PROP-006 aguardam aprovação. SUP-PROP-001 e 002 constam como implementadas. SUP-PROP-003 foi aplicada ao dispatcher, com prova de fila elegível pendente e autofinalizador em observação. SUP-PROP-004 tem amostra coletada e comparação oficial pendente. Sem testes de implementação, novas consultas remotas ou alterações funcionais.
- **Próximo recorte.** Distinguir as causas de retry e timeout do histórico de pedidos no ERP e no app, começando pela política de retry e pelo timeout compartilhado. Conferir o histórico da extensão dos limites antes de propor mudanças. Usar telemetria incremental somente se necessária para verificar uma hipótese específica. Último checkpoint de logs preservado em 12h15 BRT.

## 2026-11-26 — retentativa da lista de pedidos

- **Checkpoint em 26/11/2026, 13h00 BRT.** Revisão estática em `main`, com conferência dos diffs e da auditoria anterior do ERP e app. SUP-008 e SUP-PROP-007 registram a retentativa após falha de contrato. Os diffs dos hooks e serviço examinados movem imports. Os helpers reorganizados e as alterações locais foram preservados.
- **Decisões e validações.** SUP-PROP-005, 006 e 007 aguardam aprovação individual. Implementações anteriores e a comparação oficial pendente de SUP-PROP-004 seguem registradas acima. Nenhum teste de implementação, consulta remota ou nova leitura de logs. Última janela de logs coberta até 12h15 BRT.
- **Próximo recorte.** Verificar se há métricas agregadas por intervalo para distinguir cancelamentos da seleção de IDs, da leitura de resumos e do gateway, sem atribuir eventos ao ERP ou app por rota compartilhada. Priorizar métricas operacionais e manter os medidores oficiais no painel Usage.


## 2026-11-26 — contadores da seleção e dos resumos de pedidos

- **Checkpoint às 13:08:06 BRT.** Em `main`, conferidos os chamadores compartilhados da lista no ERP e no app e o uso do seletor nos alertas ERP. A leitura agregada das estatísticas do MoranteHub abriu uma base comparável para as duas RPCs. Os contadores cobrem execuções concluídas. A atribuição dos cancelamentos a uma etapa ou cliente permaneceu sem medição. Nenhum novo defeito causal ou proposta. [Amostra e limites](metricas.md#26112026--base-para-medir-a-listagem-de-pedidos-por-intervalo).
- **Decisões.** SUP-PROP-005, 006 e 007 aguardam aprovação individual. A comparação oficial de SUP-PROP-004 segue pendente. Apenas leitura remota e documentação. Sem testes de implementação. Última janela de logs coberta até 12h15 BRT.
- **Próximo recorte.** Comparar os deltas das mesmas instruções após decorrido um intervalo. Considerar uma janela nova de logs por operação apenas se houver uma hipótese de cancelamento que a estatística SQL não possa resolver.

## 2026-11-26 — primeiro intervalo comparável da lista de pedidos

- **Checkpoint às 13:21:37 BRT.** Em `main`, a consulta de leitura ao MoranteHub registrou os deltas de execuções concluídas e tempo SQL das duas RPCs em 13 min 30 s. A janela não distinguiu cancelamentos nem origem. Nenhum novo diagnóstico causal ou proposta. [Comparação e limites](metricas.md#26112026--primeira-comparação-da-listagem-por-intervalo).
- **Decisões e validação.** SUP-PROP-005, 006 e 007 aguardam aprovação individual. SUP-PROP-004 aguarda comparação com Usage. Conferidos o escopo, a monotonicidade e os indicadores de reset e desalocação. Nenhum teste de implementação ou mudança funcional. Última janela de logs coberta até 12h15 BRT.
- **Próximo recorte.** Conferir o histórico e os chamadores de `get_dashboard_digital_catalog_metrics`, outra RPC com cancelamento registrado em SUP-002. Reservar nova consulta de logs para uma hipótese que dependa dela.

## 2026-11-26 — recorte temporal das métricas do Catálogo Digital

- **Checkpoint às 13:34:05 BRT.** Em `main`, revisão da SCE-137, da SCE-322, do painel ERP e da função de leitura. A consulta remota de metadados confirmou a materialização na definição operacional. SUP-009 registra o trabalho estrutural e SUP-PROP-008 propõe avaliar uma entrada de 30 dias para os indicadores recentes.
- **Decisões e validação.** SUP-PROP-005 a 008 aguardam aprovação individual. SUP-PROP-004 aguarda comparação oficial em Usage. Revisão estática e leitura de metadados, sem execução da RPC, testes de implementação ou mudanças funcionais. Última janela de logs coberta até 12h15 BRT.
- **Próximo recorte.** Conferir se o modo de inicialização e os indicadores disponíveis do pg_cron permitem distinguir falha de partida de cancelamento dentro da instrução. Partir de SUP-003, consultar primeiro a documentação fiscal vigente e só abrir uma janela de logs se houver evidência nova que exija essa fonte.


## 2026-11-26 — fase de partida do pg_cron

- **Checkpoint às 13h48 BRT.** Após leitura da documentação fiscal, dos diffs em `main`, do histórico de SUP-003 e das migrations dos dois jobs, a leitura remota confirmou o modo libpq. O histórico finalizado de 12h28 a 13h48 BRT mostra 40 sucessos por job e zero falhas. O código da extensão separa o prazo de partida do tempo de execução. A causa histórica permanece aberta. [Diagnóstico SUP-003](diagnosticos.md#sup-003--inicialização-intermitente-dos-cron-jobs) e [amostra](metricas.md#26112026--partida-e-execução-dos-dois-jobs).
- **Decisões e validação.** SUP-PROP-003 mantém a checagem de fila já aplicada ao dispatcher. SUP-PROP-005 a 008 aguardam aprovação individual e SUP-PROP-004 aguarda o comparativo em Usage. Sem nova proposta, testes de implementação, escrita remota ou consulta ao Logs Explorer. As mudanças locais preexistentes foram preservadas.
- **Próximo recorte.** Verificar a disponibilidade de séries agregadas em Observability para as falhas de 11h06, 11h08 e 11h10 BRT. Se indisponíveis, avançar na atribuição dos 08006 pelos caminhos de cliente e gateway, usando as evidências já coletadas antes de considerar uma nova leitura de logs.


## 2026-11-26T14:15:19-03:00 — séries históricas do incidente de conexão

- Em main, a documentação do Supabase confirmou que Reports > Database oferece séries de conexões por serviço, CPU, memória e IOPS. O conector disponível não expõe essas séries. A amostra de 20 conexões às 13h48 BRT é posterior às falhas de 11h06–11h10 BRT. As evidências existentes não vinculam os 08006 às requisições do ERP, do app, do gateway ou aos dois jobs. Os diffs locais dos caminhos de listagem ERP/app revisados alteram imports e não fornecem nova evidência de atribuição. [Relatórios do Supabase](https://supabase.com/docs/guides/observability/reports).
- Sem novo diagnóstico causal ou proposta. SUP-PROP-005 a 008 aguardam decisões individuais. SUP-PROP-004 aguarda Usage para Log Query e Log Ingestion. Sem nova consulta operacional, teste ou mudança funcional. Checkpoint do Logs Explorer permanece às 12h15 BRT.
- Próximo recorte. Comparar as séries de Reports no entorno das falhas, se houver acesso autorizado. Sem séries ou evidência nova para os 08006, avançar para o custo por execução do autofinalizador com estatísticas de leitura, a partir de SUP-005 e da documentação fiscal vigente.


## 2026-11-26T14:21:36.2454482-03:00 — base de execução do autofinalizador

- Em `main`, a revisão de SUP-005 conferiu a documentação fiscal, o histórico SCE, a migration do job e os diffs locais. O agendador chama a função diretamente. A busca nos clientes ERP/app e no código compartilhado não encontrou chamada direta dessa função. O SQL primeiro calcula a elegibilidade e só então tenta a transição versionada. A consulta remota de leitura estabeleceu a base cumulativa, com 28.194 execuções concluídas e média de 303,370 ms de tempo SQL. [Medição](metricas.md#26112026--base-de-execução-do-autofinalizador).
- Nenhum novo defeito causal ou proposta. SUP-PROP-003 segue aplicada ao dispatcher, com o autofinalizador em observação. SUP-PROP-004 aguarda comparação no Usage e SUP-PROP-005 a 008 aguardam aprovação individual. Sem testes de implementação, escrita remota ou consulta ao Logs Explorer. Última janela de logs coberta até 12h15 BRT.
- Próximo recorte. Medir o delta da mesma instrução, conferindo a continuidade dos contadores e o trabalho por execução. Investigar uma fonte agregada para distinguir ciclos vazios dos que processam pedidos. A cadência atual e o retorno JSON isolado não permitem inferir essa proporção.

## 2026-11-26T14:34:04.6325631-03:00 — primeiro intervalo comparável do autofinalizador

- Em `main`, conferidos os diffs do recorte, a documentação fiscal e os caminhos no ERP, app e serviços compartilhados. Entre 14:19:51 e 14:32:57 BRT, o MoranteHub registrou sete execuções concluídas, com 3.008,394 ms de SQL somados. Os sete sucessos no cron registraram `1 row`, sem o contador de pedidos processados. A hipótese de ciclos vazios de SUP-005 segue sem confirmação. [Métricas e limites](metricas.md#26112026--primeiro-intervalo-comparável-do-autofinalizador).
- Nenhuma proposta nova. SUP-PROP-005 a 008 aguardam aprovação individual. SUP-PROP-004 aguarda comparação oficial em Usage e SUP-PROP-003 segue aplicada ao dispatcher, com o autofinalizador em observação. Leituras remotas agregadas e revisão estática. Sem testes de implementação, escrita remota ou leitura do Logs Explorer. Última janela de logs até 12h15 BRT.
- Próximo recorte. Verificar se o histórico de transições existente identifica finalizações automáticas de forma inequívoca e se há uma leitura agregada barata por intervalo. Se a fonte não distinguir autoria ou ciclo, registrar o limite e avançar para a origem mensurável de Log Query e Log Ingestion no Usage.


## 2026-11-26 — atribuição de transições e conflitos do autofinalizador

- **Checkpoint às 14:48:27 BRT.** Revisão em `main` após leitura da documentação fiscal e do histórico. Os arquivos das três migrations examinadas não tinham diff local. O histórico de status escrito pela transação compartilhada não identifica o ciclo nem a origem automática. A leitura remota de metadados confirmou que o job trata o conflito de versão emitido como `P0001` no caminho genérico de falha. Registrados SUP-010 e SUP-PROP-009.
- **Decisões e validação.** SUP-PROP-005 a 009 aguardam aprovação individual. SUP-PROP-003 segue aplicada ao dispatcher, com o autofinalizador em observação, e SUP-PROP-004 aguarda o medidor oficial. Revisão estática e metadados operacionais. Sem execução do job, testes de implementação, mudança funcional, escrita remota ou nova leitura do Logs Explorer. Checkpoint de logs até 12h15 BRT.
- **Próximo recorte.** Buscar a série oficial de Log Query e Log Ingestion em Usage ou uma fonte autorizada equivalente, conferindo o escopo e a granularidade antes de compará-la à amostra de `auto_explain`. A revisão dos conflitos só deve avançar para frequência se houver fonte agregada capaz de distingui-los de outras falhas.

## 2026-11-26 — aplicação da SUP-PROP-009

- O operador aprovou explicitamente a SUP-PROP-009. Revisei a migration completa e o histórico remoto do projeto operacional `hkoxhourxwlddgsfdgws`. A migration `20261126175900_classify_auto_fulfill_order_version_conflicts` atualizou somente a função `public.auto_fulfill_scheduled_orders()`.
- Verificação remota às 14:59 BRT confirmou o reconhecimento da mensagem exata junto ao SQLSTATE `P0001`, manutenção do caminho `40001`, ausência de EXECUTE para anon, authenticated e service_role e um job de autofinalização ativo na cadência de dois minutos. A primeira checagem usou cast inválido de regproc e falhou sem efeito. A checagem corrigida com regprocedure passou.
- Não executei o job nem testes comportamentais com pedido, conflito ou erro injetado. Portanto, a validação dinâmica de contadores e avisos reais permanece pendente. Nenhum outro código, dado, cron ou configuração foi alterado.
- Próximo recorte: obter Usage oficial para comparar Log Query e Log Ingestion com a amostra de auto_explain.

## 2026-11-26T15:03:17-03:00 — acesso aos medidores oficiais

- Em main, conferidos o histórico, os diffs de auditoria e as fontes oficiais. Usage permite selecionar o projeto e o período. O conector disponível não oferece as séries de Logs Query e Logs Ingest, e a referência pública da Management API não apresentou rota equivalente. Sem acesso autorizado ao painel em headless, ambos ficaram não medidos. A amostra de 12h00–12h15 BRT cobre só texto de eventos PostgreSQL. Atribuir parcela da ingestão exigiria escopo e intervalo compatíveis, mesmo com um total oficial diário. [Logs Query](https://supabase.com/docs/guides/platform/manage-your-usage/logs-query) e [Logs Ingest](https://supabase.com/docs/guides/platform/manage-your-usage/logs-ingest).
- Nenhum novo diagnóstico causal ou proposta. SUP-PROP-004 aguarda o medidor oficial, SUP-PROP-005 a 008 aguardam aprovação individual e SUP-PROP-009 consta como aplicada com verificação de metadados. Sem consulta operacional ou testes. Última janela no Logs Explorer até 12h15 BRT.
- Próximo recorte. Verificar a precedência dos limites de tempo das RPCs que tiveram 57014 em SUP-002, começando pelas definições e chamadores que mudaram desde a auditoria anterior. Retomar Usage quando houver série oficial acessível.

## 2026-11-26T15:20:59-03:00 — limites de tempo do painel de Catálogo Digital

- Em main, conferidos status, diffs, SUP-002, SUP-009 e histórico SCE-137/SCE-322. A última definição versionada de get_dashboard_digital_catalog_metrics, o hook ERP e a configuração do cliente estão sem diff local. A RPC não declara statement_timeout próprio nessa migration e o hook chama a RPC sem prazo específico. O cliente ERP usa um fetch compartilhado. A busca dirigida confirma um chamador operacional no ERP e nenhum no app ou nos serviços compartilhados. A troca local de import na consulta de estoque pertence a outro hook. A revisão estática não determina qual prazo efetivo causou o 57014 do painel.
- Sem novo diagnóstico ou proposta, medição remota ou teste de implementação. Logs Explorer coberto até 12h15 BRT. SUP-PROP-005 a 008 aguardam aprovação individual, 004 depende do Usage e 009 consta como aplicada com verificação de metadados.
- Próximo recorte. Conferir, nos diffs e no histórico, se a camada compartilhada de fetch ou o Query Guard mudou a política de cancelamento para o painel. Retomar a atribuição do 57014 quando houver evidência do orçamento efetivo por camada e papel.

## 2026-11-26T15:35:06.9956823-03:00 — retentativa do painel após negativa de acesso

- Em `main`, conferi os diffs, o histórico SCE-137/SCE-322, os chamadores e o fetch do Query Guard. Seu diff local troca o import do helper. O temporizador de 10 s deste trecho limita a leitura da cópia do corpo para telemetria, após a resposta do fetch. A revisão não atribuiu o `57014` a essa camada. A política global do ERP permite uma retentativa após a negativa `42501` do painel, sob as condições registradas em SUP-011.
- SUP-PROP-010 aguarda aprovação própria. SUP-PROP-005 a 007 seguem implementadas no checkout e dependem de publicação do ERP. SUP-PROP-008 e 009 constam como aplicadas remotamente. SUP-PROP-004 depende do Usage. Revisão estática e conferência documental. Checkpoint do Logs Explorer permanece às 12h15 BRT. Sem teste de implementação, consulta remota ou alteração funcional.
- Próximo recorte. Obter uma base de execuções e tempo SQL da RPC do painel após SUP-PROP-008, se houver entrada comparável nas estatísticas acumuladas. Separar a medição operacional de latência, cancelamentos e cobrança. Retomar atribuição de timeout somente com evidência do prazo efetivo por camada.

## 2026-11-26T15:48:22-03:00 — base para o delta da RPC de métricas do catálogo

- Em `main`, conferi o histórico da SUP-PROP-008 aplicada, documentação SCE relacionada, diffs e status. O projeto MoranteHub estava ativo e saudável. Uma leitura agregada de `pg_stat_statements` capturou a RPC após a migration. A amostra é cumulativa desde 18/10 e não isola a versão nova. O queryid, reset e desalocações foram registrados como condição para comparar o próximo intervalo.
- Atualizei a base métrica para permitir cálculo de deltas. Nenhuma mudança funcional, consulta ao Logs Explorer ou teste. SUP-PROP-010 permanece aguardando decisão; SUP-PROP-004 aguarda a comparação oficial em Usage; SUP-PROP-005 a 007 continuam implementadas no checkout e dependem de publicação; SUP-PROP-008 e SUP-PROP-009 constam aplicadas.
- Próximo recorte: repetir a leitura somente num intervalo futuro comparável e calcular delta se queryid, reset e desalocações continuarem estáveis. O total de chamadas não prova redução de Log Query ou de bytes. Uso oficial, erros cancelados, egress e recursos seguem sem medição.

## 2026-11-26T16:02:05-03:00 — intervalo sem chamadas registradas para o painel do catálogo

- Em `main`, conferi status e diffs das fontes do recorte. No MoranteHub, a leitura de `pg_stat_statements` comparada com a base de 15:47 BRT mostrou zero novas execuções do queryid monitorado em cerca de 15 minutos. Reset, queryid e desalocações permaneceram estáveis. A métrica é cumulativa e não fornece custo da nova implementação sem chamadas no intervalo.
- Nenhum achado ou proposta nova. SUP-PROP-010 aguarda decisão; 004 aguarda Usage; 005–007 seguem no checkout; 008 e 009 aplicadas. Logs Query e Ingest oficiais não medidos; Logs Explorer coberto até 12h15 BRT. Sem testes ou mudanças funcionais.
- Próximo recorte: medir novo delta somente após intervalo em que a RPC tenha chamadas registradas, ou escolher outra evidência nova. Não inferir redução de uso ou logs deste intervalo sem chamadas.

## 2026-11-26T16:16:55-03:00 — diffs do cliente do catálogo sem mudança no fluxo de leitura

- Em `main`, o recorte da vitrine mostrou somente relocação de imports em `useCatalogProductsQuery.ts` e no cliente Supabase do catálogo; `shared-utils/supabaseReadMetrics.ts` reexporta o módulo movido. Comparei o conteúdo de `shared-utils/core/supabaseReadMetrics.ts` ao arquivo rastreado anterior, que coincide integralmente. ERP/app continuam apontando para a implementação movida. Sem mudança funcional nos chamadores ou na medição local.
- Não acrescentei diagnóstico, proposta ou métrica. A base anterior da RPC ainda não teve novas chamadas. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; SUP-PROP-005 a 007 seguem no checkout; SUP-PROP-008 e 009 aplicadas. Sem consultas remotas, Logs Explorer ou testes.
- Próximo recorte: aguardar incremento da RPC monitorada ou evidência funcional nova em acesso a dados; avançar apenas com diff comportamental ou métrica comparável.

## 2026-11-26T16:31:53-03:00 — nenhum diff funcional novo no recorte do catálogo

- Revisei o checkpoint, o estado da branch main e os diffs restritos às fontes de leitura do Catálogo Digital. Desde o ciclo anterior, nenhuma alteração lógica nova apareceu nos arquivos consultados. A movimentação do wrapper e da instrumentação já conferida continua sendo apenas relocação idêntica.
- Sem achado, proposta, teste ou consulta remota novos. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; SUP-PROP-005 a 007 seguem no checkout; SUP-PROP-008 e 009 aplicadas. Última comparação do painel mostrou zero chamadas na janela, e o Logs Explorer permanece coberto até 12h15 BRT.
- Próximo recorte: retomar a coleta do painel somente após chamadas acumuladas ou diante de nova alteração funcional/telemetria; Usage oficial segue indisponível nesta sessão.

## 2026-11-26T16:48:07-03:00 — mudança de imports da agenda sem alteração na consulta

- Em main, o checkout marca alterações nas chamadas de agenda do ERP e do app, mas seus diffs apenas movem imports de formatador e serviço de realtime. O helper compartilhado está extraído para shared-utils/orders/; a comparação com a definição rastreada confirmou o mesmo fluxo de RPC, timeout de 25 s, validação, paginação e carregamento em lotes, com imports reorganizados. As migrations de agenda e timeout não têm diff.
- Nenhum novo achado, proposta ou métrica. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; SUP-PROP-005 a 007 seguem no checkout; SUP-PROP-008 e 009 aplicadas. Sem consulta remota, Logs Explorer ou teste.
- Próximo recorte: retomar a comparação da agenda caso surja alteração lógica, amostra operacional nova ou delta de execução que sustente avaliação. Não reavaliar apenas por realocação de imports.

## 2026-11-26T17:03:27-03:00 — revisão estática das correções da listagem de pedidos

- Em main, conferi os diffs das propostas aprovadas SUP-PROP-006 e 007 nos caminhos do ERP e do app, além dos validadores compartilhados. A troca de filtro usa a chave normalizada para iniciar na página 1 já na renderização que dispara a consulta. A lista ainda limita a 15. As respostas inválidas de IDs ou resumos geram OrderReadContractError, e a política do histórico do ERP encerra retry automático somente para esse erro, mantendo a exclusão de erro do Query Guard e a retentativa de outras falhas. etchOrdersPage propaga essas falhas no caminho revisado. A inspeção não encontrou regressão adicional nos diffs.
- SUP-PROP-005 a 007 constam implementadas no checkout e aguardam publicação do ERP; o mobile mantém o fluxo imperativo/offline sem retry automático desta lista. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; 008/009 aplicadas. Sem execução de testes, consulta remota ou Logs Explorer.
- Próximo recorte: apenas alteração lógica nova ou evidência de uso/erro com intervalo identificável. Os diffs atuais não exigem novo diagnóstico ou proposta.

## 2026-11-26T17:19:56-03:00 — amostra horária do autofinalizador após a migration

- No projeto MoranteHub ativo, consultei somente o agregado de cron.job_run_details do job auto_fulfill_scheduled_orders, para end_time entre 16h e 17h BRT. O único job identificado concluiu 30 de 30 execuções com sucesso. Não houve status diferente de sucesso nem assinatura de timeout de partida ou SQL na mensagem resumida. Média de 620,35 ms e máximo de 4.686,06 ms por execução bem-sucedida.
- A amostra posterior à migration confirma continuidade da execução nesse intervalo. Não exercita nem comprova a classificação de conflito P0001; quantidade de pedidos processados, ciclos sem trabalho, causa de início das antigas falhas, logs e cobrança continuam indeterminados. Sem novo diagnóstico causal ou proposta. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; SUP-PROP-005 a 007 seguem no checkout; 008/009 aplicadas.
- Próximo recorte: acompanhar novos resultados apenas se houver necessidade de validar nova janela após mudança ou se surgirem falhas. Sem consulta ao Logs Explorer ou testes.

## 2026-11-26T17:32:16-03:00 — checkpoint sem mudança lógica nas consultas monitoradas

- Em main, conferi branch, status e diffs das funções e chamadores já acompanhados. O diff permanece nas alterações previamente revisadas de paginação/retry ERP e na relocação de imports da agenda/Query Guard; migrations das RPCs não apresentam alteração nova. O resultado horário do autofinalizador foi registrado no ciclo anterior.
- Sem nova evidência, diagnóstico, proposta, medição ou teste. SUP-PROP-010 aguarda decisão; SUP-PROP-004 aguarda Usage; SUP-PROP-005 a 007 seguem no checkout; 008/009 constam aplicadas. Não reconsultei cron nem Logs Explorer nesta rodada.
- Próximo recorte: aguardar regressão, novo diff lógico ou validação pendente acionável; manter Log Query e Log Ingestion como não medidos sem acesso ao Usage oficial.

## 2026-11-26T17:49:45-03:00 — atualizacao do remoto sem novos commits

- A pedido do operador, executei fetch e pull fast-forward em main. origin/main e HEAD estavam sincronizados, com zero commits para integrar. O pull informou que a branch ja estava atualizada.
- As alteracoes locais existentes permaneceram no checkout. Nenhum arquivo funcional foi alterado pela operacao Git. Sem nova medicao, diagnostico ou proposta nesta execucao.
- Proximo recorte da auditoria segue condicionado a diff logico novo, regressao ou validacao pendente acionavel.

## 2026-11-27T09:10:56-03:00 — revisão dos quatro commits remotos de vitrine

- `fetch` confirmou `origin/main` quatro commits à frente do checkout `main` (`9b0fcd2d`); o checkout está limpo. O diff desses commits contém somente o componente visual `digital-catalog/src/features/products/components/product-card.tsx` e duas imagens públicas de selo. A revisão do componente encontrou apenas mudanças na apresentação dos selos recebidos junto ao produto; não altera consultas, RPCs, escrita de dados, filtros ou projeções Supabase. Não fiz pull nem alterações de código nesta execução.
- Sem novo achado, proposta ou medição de banco, egress ou logs. Log Query e Log Ingestion não medidos. SUP-PROP-004 aguarda comparação com Usage; SUP-PROP-005 a 007 dependem da publicação do ERP; SUP-PROP-008/009 aplicadas; SUP-PROP-010 aguarda aprovação. Sem consulta remota, Logs Explorer ou testes.
- Próximo recorte: examinar uma mudança nova em acesso a dados/SQL ou evidência operacional com intervalo definido. Preservar o checkout enquanto estiver quatro commits atrás e fora do escopo autorizado de atualização funcional.

## 2026-11-27T09:25:57-03:00 — rechecagem após avanço do checkout

- A primeira verificação desta rodada mostrava `main` quatro commits atrás; numa rechecagem sequencial, `main` e `origin/main` já coincidiam em `d89ead94`. Esta auditoria não executou pull. O status local também mostra `erp/server/testing/test-artifact-operator.cjs` modificado; o arquivo foi preservado. O histórico dos quatro commits contém somente ativos visuais e ajustes de rótulos em `ProductCard` e `ProductOpportunityField`; a inspeção não encontrou caminho de acesso Supabase alterado. A anotação de 09:10 cobria o subconjunto da vitrine e este registro completa o diff.
- Sem novo diagnóstico, proposta ou medição; sem consulta remota, Logs Explorer ou testes. Log Query, Log Ingestion, egress e trabalho/latência do banco não medidos. Pendências: SUP-PROP-004 aguarda Usage; 005–007 dependem de publicação ERP; 008/009 aplicadas; 010 aguarda aprovação.
- Próximo recorte: mudança nova em acesso a dados/SQL ou evidência operacional com intervalo identificável. Manter as alterações locais sem relação com a auditoria intactas.

### Checkpoint 09:40 BRT

`fetch` não trouxe commits novos; `main` continua alinhada com `origin/main` em `d89ead94`. O status local permanece igual ao registrado às 09:25. Sem diff de acesso Supabase, nova evidência ou métrica; sem consulta remota, Logs Explorer ou testes. Próximo recorte permanece condicionado a alteração em acesso a dados/SQL ou telemetria nova identificável.

### Checkpoint 09:55 BRT

`fetch` e revisão do estado repetiram o mesmo checkout (`d89ead94`, alinhado ao remoto); os únicos itens modificados seguem sendo este histórico e o arquivo local já anotado. Nenhum diff novo de dados/SQL ou evidência operacional; sem consultas ou medições repetidas. Próximo recorte inalterado.

### Checkpoint 10:10 BRT

`main` e `origin/main` seguem alinhadas em `d89ead94`; status local sem mudança. Sem novo diff relevante, achado ou métrica. Propostas e próximo recorte permanecem como registrados acima; sem consulta remota, Logs Explorer ou testes.

### Checkpoint 10:25 BRT

Sem alteração desde 10:10: `main` permanece em `d89ead94`, alinhada ao remoto; o status local segue igual. Nenhum diff novo de acesso a dados, evidência ou métrica; sem consulta remota, Logs Explorer ou testes. Pendências e próximo recorte permanecem inalterados.

### Checkpoint 10:40 BRT

`fetch` confirmou o mesmo commit (`d89ead94`) em `main` e `origin/main`; status e diffs relevantes seguem iguais. Sem nova evidência, achado ou métrica, e sem consulta remota, Logs Explorer ou teste. Propostas pendentes e próximo recorte continuam inalterados.

### Checkpoint 10:55 BRT

`main` segue alinhada a `origin/main` em `d89ead94`; alterações locais e diffs sem relação com o Supabase não mudaram. Sem achado, métrica ou telemetria nova. Pendências e próximo recorte inalterados; nenhuma consulta remota ou teste executado.

### Checkpoint 11:10 BRT

`fetch` não encontrou novos commits; `main` continua em `d89ead94`, alinhada ao remoto. Status local sem mudança. Nenhum novo diff, achado ou métrica de Supabase; sem consulta remota, Logs Explorer ou testes. Próximo recorte e pendências inalterados.

### Checkpoint 11:25 BRT

Sem mudança desde 11:10: checkout e diffs relevantes iguais, sem nova evidência operacional ou código de dados/SQL. Não consultei banco ou Logs Explorer e não executei testes; métricas e pendências permanecem inalteradas.

### Checkpoint 11:40 BRT

`fetch` confirmou `main` e `origin/main` em `d89ead94`, sem novos commits ou diffs relevantes. Status local inalterado. Sem nova evidência ou métrica; não consultei banco/Logs Explorer nem executei testes. Pendências e próximo recorte sem alteração.

### Checkpoint 11:55 BRT

Sem alteração desde 11:40: `main` e `origin/main` continuam em `d89ead94`, com status local igual. Nenhum diff de acesso Supabase ou evidência nova; métricas e propostas sem mudança. Sem consulta remota, Logs Explorer ou testes.

### Checkpoint 12:10 BRT

Checkout, remoto e status seguem iguais ao checkpoint anterior. A consulta ao inventário de ferramentas não encontrou endpoint oficial de Usage do Supabase; a comparação de SUP-PROP-004 continua pendente. Sem novos dados ou alterações de acesso Supabase; sem consultas remotas, Logs Explorer ou testes.

### Checkpoint 12:25 BRT

`fetch` confirmou o estado inalterado: `main` e `origin/main` em `d89ead94`, sem diff remoto ou mudança no status local. Nenhuma evidência ou métrica nova; SUP-PROP-004 segue aguardando Usage, SUP-PROP-005 a 007 dependem da publicação do ERP, e SUP-PROP-010 aguarda aprovação. Sem consulta remota, Logs Explorer ou testes.

### Checkpoint 12:40 BRT

`main` e `origin/main` permanecem alinhadas em `d89ead94`; status e diffs relevantes sem alteração. Nenhuma evidência ou métrica nova. Propostas e próximo recorte inalterados; sem consulta remota, Logs Explorer ou testes.

### Checkpoint 12:55 BRT

Sem mudanças desde 12:40: `main` permanece alinhada ao remoto e o status local não mudou. Nenhuma alteração de código relevante, evidência ou métrica nova; sem consultas remotas, Logs Explorer ou testes.

### Checkpoint 13:10 BRT

`fetch` confirmou `main` e `origin/main` em `d89ead94`; status e diffs relevantes iguais ao checkpoint anterior. Sem achado, evidência ou métrica nova; sem consulta remota, Logs Explorer ou testes. Pendências e próximo recorte inalterados.

### Checkpoint 13:25 BRT

Fetch e revisão confirmaram o mesmo estado de `main`, remoto e arquivos locais. Sem diff novo de Supabase, evidência ou métrica; sem consultas remotas, Logs Explorer ou testes. Pendências e próximo recorte inalterados.

### Checkpoint 13:40 BRT

`main` e `origin/main` seguem em `d89ead94`; status e diffs relevantes não mudaram. Sem evidência, achado ou métrica nova. Pendências e próximo recorte inalterados; nenhuma consulta remota, Logs Explorer ou teste.

### Checkpoint 13:55 BRT

`fetch` confirmou o mesmo commit e status local. Sem novos diffs de acesso a dados, evidência operacional, achados ou métricas; sem consulta remota, Logs Explorer ou testes. Propostas pendentes e próximo recorte sem alteração.

### Checkpoint 14:10 BRT

`main` permanece alinhada com `origin/main` em `d89ead94`; status e diffs iguais ao checkpoint anterior. Sem alteração de acesso Supabase, evidência ou métrica nova. Pendências e próximo recorte inalterados; sem consulta remota, Logs Explorer ou testes.

### Checkpoint 14:25 BRT

`fetch` não encontrou novos commits; branch, status local e diffs relevantes permanecem iguais. Sem evidência ou métricas novas do Supabase. Pendências e próximo recorte sem alteração; sem consultas remotas, Logs Explorer ou testes.

### Checkpoint 14:40 BRT

`main` e `origin/main` seguem em `d89ead94`, com status local igual e sem diff remoto. Sem nova evidência de Supabase ou métrica; não consultei banco/Logs Explorer nem executei testes. Pendências e próximo recorte inalterados.

### Checkpoint 14:55 BRT

Revisão incremental sem mudanças: `main` e `origin/main` continuam em `d89ead94`; status e diff remoto sem alteração. Sem evidência ou métrica nova, consulta remota, Logs Explorer ou testes. Pendências e próximo recorte inalterados.

### Checkpoint 15:10 BRT

`fetch` confirmou novamente `main` e `origin/main` em `d89ead94`, sem diffs relevantes novos. Status local preservado. Nenhuma evidência ou métrica Supabase nova; sem consulta remota, Logs Explorer ou testes.

## 2026-11-27 — leitura de Usage compartilhada pelo operador

- **Observação:** a captura do painel oficial Supabase Usage mostra Log Query diário de `2.711 GB` em 25/11/2026. O gráfico de Log Ingestion cobre 28/10–27/11 e tem um pico visual próximo de 88 MB em 21/11, mas não mostra tooltip com o valor exato. Escopo de projeto/organização não aparece.
- **Limite de interpretação:** 2.711 GB é uma observação diária, não o acumulado de cobrança. Não confirma nem contradiz os totais relatados de 430,268 GB e 0,942 GB, pois janela e escopo não estão correspondidos. Não foram medidos contagem de chamadas, trabalho do banco, resposta/egress ou eventos.
- **Validação e próximo passo:** registro baseado somente na captura enviada; sem consultas ao banco ou Logs Explorer, sem testes e sem alteração funcional. SUP-PROP-004 segue aguardando comparação do período com o medidor oficial em escopo identificável. Os demais status de propostas permanecem inalterados.

## 2026-11-27 — pico diário de Log Query na captura adicional de Usage

- **Observação (SUP-012):** uma captura adicional do painel Usage mostra `144.317 GB` de Log Query em 05/11/2026, em comparação com 100 GB incluídos exibidos na página. É um valor diário; a comparação é apenas de magnitude e não confirma cobrança adicional. As imagens não identificam o escopo de projeto/organização.
- **Interpretação e limite:** o pico medido não identifica origem, cliente, ferramenta ou processo que gerou as consultas. Não se atribui a captura anterior do Logs Explorer, ao tráfego do ERP/app nem a um sistema específico. O total do período e a contribuição por origem continuam indeterminados.
- **Validação e próximos dados:** tooltip oficial fornecido pelo operador; sem consulta ao banco, Logs Explorer, teste ou mudança funcional. SUP-012 não gera proposta de implementação enquanto escopo e origem não estiverem identificados. Próximo passo é comparar a série e o acumulado de Usage no mesmo escopo visível; SUP-PROP-004 continua aguardando comparação oficial.

## 2026-11-27 — média diária esperada de Log Query informada pelo operador

O operador esclareceu que espera uma média de 10 GB/dia. Registrado como referência operacional fornecida pelo usuário, separada do limite incluído de 100 GB mostrado no painel. O ponto de 05/11 (144,317 GB) corresponde a aproximadamente 14,4× essa média; 25/11 (2,711 GB), aproximadamente 0,27×. A referência diária não é um teto por dia, e não identifica a origem nem o total do período. SUP-012 permanece em investigação; sem nova proposta ou alteração funcional.

### Checkpoint 15:27 BRT

`main` segue alinhada com `origin/main` em `d89ead94`; alterações locais de auditoria e o arquivo de outra tarefa permanecem preservados. As duas capturas e a referência de 10 GB/dia foram registradas; sem nova evidência, consulta remota, Logs Explorer ou teste nesta verificação.

## 27/11/2026 — revisão da causa raiz de Log Query e Log Ingestion

- **Escopo e fontes:** leitura das instruções e documentos de auditoria, memória acessível da automação, inventário de ferramentas, históricos Codex relacionados e busca estática no código/configuração. Documentação oficial Supabase Usage consultada para distinguir Log Query de Log Ingest e confirmar como escopo/período aparecem no medidor.
- **Histórico de consultas a logs:** uma chamada supabase.query_logs confirmada em 26/11, 15:00–15:15 UTC (12:00–12:15 BRT), filtrou postgres_logs e agregou event_message. A janela de 10:55–11:20 BRT continua registrada com contagens de eventos, mas o recibo não está no histórico acessível. Total anterior exato desconhecido. Nenhuma consulta a logs foi feita nesta execução.
- **Candidatos:** auto_explain dominou em bytes do campo event_message na amostra PostgreSQL de 15 minutos; seis de 18 arquivos TypeScript em supabase/functions contêm chamadas console.*; faltam frequência e bytes por serviço. Nenhuma fonte foi confirmada como causa dos medidores agregados.
- **Automação e consultas PostgreSQL:** o histórico acessível mostra 33 chamadas supabase.execute_sql e cinco chamadas supabase.apply_migration em quatro chats relacionados, misturando tarefas de auditoria, aprovação, implementação e validação. Esse inventário não representa somente ciclos automáticos e não mede eventos ou bytes de Log Ingest. Não houve nova atividade remota de banco nesta execução.
- **Usage:** as capturas mantêm escopo de projeto/organização invisível. Log Query tem pontos diários de 144.317 GB (05/11) e 2.711 GB (25/11); a média esperada de 10 GB/dia é referência do operador. Log Ingestion não tem tooltip numérico novo. Sem delta oficial comparável.
- **Registro e próximo passo:** criados os documentos de causa raiz, linha do tempo e experimentos; atualizados README, SUP-012, métricas e histórico. A causa permanece desconhecida. Solicitar captura de Usage com MoranteHub e período visíveis; para E2, solicitar autorização explícita para uma consulta agregada de até 15 minutos. Sem alterações funcionais, de configuração, banco, migration, integração, commit, push, deploy ou OTA. Nenhum teste foi executado.

## 27/11/2026, 16:01 BRT — verificação estática de integrações de logs

- **Nova evidência:** busca estreita nos arquivos de código e configuração não encontrou configuração de Log Drain ou integração com Datadog, Axiom, Better Stack, Logtail, New Relic ou Sentry. A string sentryHint encontrada no bundle de secure-integrations.cjs pertence a uma mensagem do supabase-js sobre trace propagation. O repositório não contém .github nem vercel.json na raiz. Configurações externas permanecem invisíveis.
- **Uso e consultas:** nenhuma nova captura oficial, consulta de logs ou consulta ao banco. A janela proposta para E2 (27/11, 18:30–18:45 UTC) passou sem autorização e não foi executada. O próximo pedido de autorização precisará de limites temporais novos; não reutilizar a janela.
- **Estado e próximo passo:** causa raiz continua desconhecida. E1 permanece proposta para decisão do operador e não houve solicitação para desativar ferramentas. A próxima ação continua sendo obter Usage com projeto/período visíveis; aguardar autorização explícita antes de qualquer leitura de logs. Nenhuma configuração foi alterada; nenhum teste foi executado.

## 27/11/2026, 16:16 BRT — histórico de consultas em 05/11

- **Nova evidência:** busca nas auditorias locais encontrou três chamadas query_logs documentadas em janelas que cruzam 05/11: uma janela de três horas (08:30–11:30 UTC) e duas agregações, uma janela de 24 horas (04/11 15:00–05/11 15:00 UTC) e um detalhe de uma hora (05/11 14:00–14:59 UTC) contido nela. Isso coincide com o dia do pico de 144.317 GB, mas não mede os bytes escaneados nem prova que as chamadas causaram o valor.
- **Histórico adicional:** relatório de Egress registra uma recorrência de três horas como ativa em checkpoint passado e 70 linhas com menções a query_logs entre 25/10 e 06/11; muitas entradas descrevem duas agregações por janela, mas a contagem exata não pode ser recuperada das menções. A lista acessível não mostra o ID ou estado atual dessa automação. Uma tarefa Codex de 09/10 contém nove chamadas query_logs sem limites temporais ISO nos argumentos registrados; fica fora do gráfico de 28/10–27/11 e não é atribuída ao pico.
- **Classificação:** SUP-013 prioriza consultas históricas Codex/MCP em 05/11; SUP-014 registra consumidores externos sem histórico; SUP-004 continua candidato a Log Ingestion no recorte auto_explain; SUP-015–017 registram Edge Functions, outros serviços e SQL/migrations da auditoria. Causa raiz e consumo oficial por chamada permanecem desconhecidos.
- **Uso desta execução:** nenhuma consulta a Logs Explorer, query_logs ou banco; nenhuma variação de Usage disponível. Foram atualizados diagnósticos, linha do tempo, métricas, causa raiz e experimentos. Aguardar captura do Usage com projeto/período visíveis e, se disponível, status/histórico da recorrência Egress. A janela antiga de 27/11 18:30–18:45 UTC não foi executada e não deve ser repetida. Nenhum código, configuração, dado, integração ou logging foi alterado; nenhum teste foi executado.

## 27/11/2026 — comparação histórica e investigação do erro de medição

- **Nova evidência externa:** a equipe Supabase reconheceu em 04–05/11 condições que inflavam Log Query e informou que correções estavam em andamento. Outro projeto Free relatou 138,2 GB em 02/11. O tópico recebeu novos relatos de valores anormais em 13 e 16/11 e não tinha anúncio de resolução até essa atualização. A semelhança temporal com os 144,317 GB do MoranteHub torna falha de medição a hipótese principal, sem provar que esta conta foi afetada. A equipe informou que os valores inflados não seriam cobrados/exigidos durante o lançamento gradual. [Discussão pública](https://github.com/orgs/supabase/discussions/50925).
- **Comparação dos consumidores:** a inspeção do Studio encontrou a prévia legada de Logs consultando contagem a cada 60 segundos, mecanismo compatível com repetição de Log Query se a tela permanecer aberta; o estado da tela nos dias comparados não é recuperável. A busca Vercel para o projeto `morantehub` encontrou zero deployments em 05/11 e 25/11. Históricos Codex locais não disponibilizam 05/11; em 25/11 há apenas a tarefa de `git pull`/`npm run dev`, sem chamada de logs. Isso não cobre sessões externas nem deploys fora de Vercel.
- **Escopo e acesso:** a integração Supabase listou uma organização Free com um único projeto MoranteHub. O recurso Platform Audit Logs não está incluído no plano Free, limitando a atribuição administrativa por essa via. O conector de ferramentas não expõe o medidor oficial Usage; não foram usadas credenciais de terceiros nem consultado o serviço de logs.
- **Log Ingestion:** a comparação de commits encontrou seis novas chamadas warning/error em clientes ERP/app em 05/11, sem encaminhador local conhecido para o Log Ingest Supabase; nenhuma foi adicionada a Edge Functions. As oito mensagens da função `sefaz-inbound-sync` foram movidas de módulo, permanecendo oito. O commit local de 25/11 não mudou loggers/configuração. Sem evidência de aumento versionado de emissão no backend; frequência executada e bytes por serviço continuam sem medida.
- **Conclusão e autorização:** SUP-018 a SUP-020 registram a falha pública de medição, mecanismo Studio e evidência da comparação histórica. Codex não é responsabilizado sem atribuição de bytes. A autorização permanente permite no máximo uma consulta read-only a logs por execução, em intervalo ISO inédito de até 15 minutos, sem payload sensível nem repetição, quando indispensável a hipótese concreta. Nenhuma consulta a logs, banco, teste ou alteração funcional/configuracional ocorreu nesta execução; somente documentos desta auditoria foram atualizados. Arquivos não relacionados do checkout foram preservados.
- **Evidência adicional de Log Ingest:** o artigo Supabase sobre Data API desativada diz que PostgREST pode continuar emitindo erros de schema ausente. Um usuário relatou redução significativa de Log Query após workaround em 16/11. A leitura remota de `pg_roles.rolconfig` mostrou que `authenticator` no MoranteHub não tem `pgrst.db_schemas`; o estado da Data API e a presença de erros continuam desconhecidos. Nenhuma alteração foi aplicada, pois o workaround modifica o schema configurado para a API. SUP-021 registra o mecanismo e os limites. [Artigo oficial](https://supabase.com/kb/troubleshooting/schema-pg_pgrst_no_exposed_schemas-does-not-exist) · [relato público](https://github.com/orgs/supabase/discussions/50925).

## 27/11/2026, 17:08–17:13 BRT — orientação da automação persistida e metadados do projeto

- **Estado Supabase:** uma leitura read-only de `pg_roles.rolconfig` confirmou que `authenticator` tem apenas configurações de preload/timeouts e não tem `pgrst.db_schemas`; uma leitura de metadados confirmou o projeto ativo/saudável. A ferramenta de metadados não expõe estado da Data API. Isso mantém SUP-021 como hipótese sem confirmar erros PostgREST. Nenhum Logs Explorer ou query_logs foi usado; nenhum valor novo de Usage foi consultado.
- **Orientação persistida:** atualizei o prompt da automação existente a pedido do operador para registrar a autorização permanente de leituras, o limite de no máximo uma consulta de logs indispensável por execução em intervalo inédito de até 15 minutos e a exigência de avanço concreto por ciclo. Cadência de 15 minutos, estado ACTIVE, thread e política de notificação foram preservados.
- **Checkout:** branch `main`; modificações em `docs/auditoria-supabase` e o arquivo preexistente `erp/server/testing/test-artifact-operator.cjs` foram preservados. Nenhum código, dado ou configuração do Supabase foi alterado; sem testes, migration, commit, push ou deploy. Próximo recorte: procurar uma fonte não invasiva de metadados que informe se a Data API do projeto está habilitada; se não existir, registrar esse bloqueio e seguir outra hipótese de Log Ingestion.

## 27/11/2026, 17:09–17:24 BRT — amostra limitada de erro PostgREST

- **Hipótese e fonte:** após a documentação Supabase identificar erros PostgREST quando Data API está desativada e a role local não mostrar o override da correção, usei uma chamada de logs para testar somente o erro `pg_pgrst_no_exposed_schemas` em `postgrest_logs`.
- **Consulta:** uma única chamada sequencial e somente leitura, com limites explícitos 2026-11-27T20:09:00Z–2026-11-27T20:24:00Z (15 min), em intervalo inédito. Agregou fonte, quantidade e comprimento de mensagem; não selecionou texto de log nem payload.
- **Resultado e limite:** zero linhas/eventos correspondentes ao filtro. Isso enfraquece a hipótese apenas nessa janela e não informa se Data API está desativada, se o erro ocorreu em outros horários ou se outras fontes geram Ingestion. Bytes escaneados e delta do Usage oficial indisponíveis; a própria consulta pode acrescentar Log Query. Nenhuma consulta de logs foi feita em paralelo ou repetida.
- **Outras verificações:** não há ferramenta Supabase MCP que exponha settings/configuração da Data API; `get_project` retorna estado e metadados sem essa opção. A busca local estreita não encontrou configuração `pgrst.db_schemas` ou código referente ao schema de erro nos caminhos de aplicação/configuração examinados.
- **Estado e próximo passo:** SUP-021 fica sem confirmação; não repetir a janela nem fazer polling. Próximo, buscar somente outra fonte não invasiva que esclareça o estado da API ou avançar para outra origem de Log Ingestion. Sem leitura do Usage oficial, mudança no Supabase/código, teste, migration, commit, push ou deploy.

## 27/11/2026, 17:38 BRT — Management API e leitor de logs do CLI

- **Fonte de configuração:** a documentação oficial revela `GET /v1/projects/{ref}/postgrest`, que retorna configuração como `db_schema` e requer `data_api_config_read`. O MCP conectado não contém ferramenta para esse endpoint; `get_project` omite essa seção. Não usei acesso direto por token/credencial. Portanto, a configuração que distinguiria o caso SUP-021 não está disponível neste fluxo.
- **Fonte potencial de Log Query:** o changelog Supabase anuncia o terminal log explorer no CLI v3 em 10/11/2026, entre os dois dias comparados. A busca local não encontrou `supabase logs` em scripts e `Get-Command supabase` não encontrou CLI no PATH. Isso reduz suporte a uso local rastreável, mas não exclui uso noutro computador/terminal.
- **Uso desta execução:** nenhuma consulta a logs ou banco; nenhuma leitura de Usage; sem teste, DML, configuração do Supabase, commit ou deploy. Próximo passo: seguir outra hipótese de ingestão usando código e amostras já disponíveis, sem sondar repetidamente o mesmo erro.
