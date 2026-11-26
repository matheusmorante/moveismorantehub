# Histórico

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
