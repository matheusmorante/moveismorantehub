# Histórico de correções fiscais — 26/11/2026

## Dispatcher de devolução fiscal consulta a fila antes do POST

O cron da devolução fiscal registrou 720 execuções nas 24 horas até aproximadamente 12h14 BRT, com 702 concluídas e 18 falhas de inicialização. A fila estava vazia na leitura de verificação. A definição anterior do dispatcher conferia apenas a configuração do worker antes de enfileirar o HTTP. A primeira operação da API do worker já era reservar um item e retornar `processed: 0` quando a fila não tinha trabalho disponível. O código explica por que um ciclo podia realizar ida à API e uma chamada de reserva sem trabalho. A causa das falhas de inicialização do cron permanece indeterminada.

A migration consulta a mesma elegibilidade da reserva. A consulta inclui `pending`, `retryable` e `reconciling` cujo `next_attempt_at` já venceu, além de `processing` com lease expirada. A função retorna antes de acessar o Vault ou enfileirar o POST se a fila não tiver trabalho elegível. A reserva atômica continua no worker e resolve concorrência. Quando um item fica pronto após a checagem, o ciclo seguinte pode capturá-lo. O `pg_net` realiza o HTTP de forma assíncrona. [Documentação do pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).

| Arquivo e linhas | Alteração |
|---|---|
| [20261126152514_skip_dispatch_when_return_fiscal_queue_idle.sql](../../supabase/migrations/20261126152514_skip_dispatch_when_return_fiscal_queue_idle.sql#L7) (7–20) | Precondições de versão para a reserva e o dispatcher. |
| [20261126152514_skip_dispatch_when_return_fiscal_queue_idle.sql](../../supabase/migrations/20261126152514_skip_dispatch_when_return_fiscal_queue_idle.sql#L22) (22–69) | Checagem da fila antes da leitura das configurações e do HTTP. |

A migration 20261126152514 está aplicada ao schema `public` do Supabase operacional MoranteHub. O catálogo confirmou a mesma ACL do dispatcher, reservada a `postgres` e `service_role`, a mesma definição da reserva e a frequência de dois minutos dos jobs. Às 12h26 BRT, o primeiro ciclo do dispatcher após a mudança concluiu em 12,1 ms com a fila vazia. Essa prova cobre o caminho sem trabalho. A validação de uma devolução elegível requer fixture autorizada conforme a [política de testes remotos](../testing/SUPABASE_REMOTE_TEST_POLICY.md). A SEFAZ não foi acionada durante a validação. [Métricas e contexto da auditoria](../auditoria-supabase/metricas.md#cron-em-2611).

A reversão pode restaurar somente o corpo anterior da função a partir da [migration original](../../supabase/migrations/20261011024729_automatic_return_nfe_fiscal_jobs.sql#L157). Usar `CREATE OR REPLACE FUNCTION` preserva a ACL vigente e mantém o cron e a fila atuais.

## Ações necessárias e operação única da assistência

O fluxo de ações pós-venda estava limitado a vendas, enquanto a assistência tinha ações próprias fora do modal. O modal compartilhado também continha atalhos de venda e emissão fiscal. Ao habilitar ações para assistência sem separar os conjuntos, recibo e emissão de NF poderiam ficar disponíveis nesse contexto. Os cartões ainda apresentavam a assistência vinculada como entrega ou retirada, e agendamentos legados com várias operações podiam ser interpretados como várias operações da assistência.

A causa técnica era a falta de um conjunto de ações e de uma apresentação próprios para `orderType = assistance`. A assistência passa a ter somente ações de OS/compartilhamento no modal “Ações necessárias”; o botão de informações de entrega/venda e a consulta de status fiscal não são exibidos/executados para ela. O agendamento salvo remove operações múltiplas, e os resumos e selos no ERP e no app identificam a operação como Assistência. As ações de venda e os rótulos de entrega das vendas permanecem no contexto de venda.

| Arquivo e linhas | Alteração |
|---|---|
| [postSaleActions.ts](../../erp/src/pages/utils/sales/postSaleActions.ts#L9) (9–11, 39–43, 58), [PostSaleActionMenuButton.tsx](../../erp/src/pages/App/SalesOrder/OrderHistoryList/components/PostSaleActionMenuButton.tsx#L20) (20, 31, 48, 52) | Abertura das ações para assistência, rótulo “Ações necessárias” e chaves próprias para OS e compartilhamento. |
| [postOrderActionsHelpers.ts](../../erp/src/pages/App/SalesOrder/OrderActions/postOrderActionsHelpers.ts#L22) (22–35), [PostOrderActionsModal.tsx](../../erp/src/pages/App/SalesOrder/OrderActions/PostOrderActionsModal.tsx#L43) (43, 55–67, 84–85, 210, 251, 270) | Filtragem por tipo de pedido; recibo, emissão de NF, ações de venda/entrega e consulta fiscal não entram no modal de assistência. |
| [operationActionScope.ts](../../erp/src/pages/App/SalesOrder/OrderActions/operationActionScope.ts#L16) (15–16, 29), [assistanceOrderService.ts](../../erp/src/pages/App/SalesOrder/Assistance/services/assistanceOrderService.ts#L78) (78–79, 124) | Uma única operação e remoção de agendamentos múltiplos no payload de assistência. |
| [AssistanceOrderModal.tsx](../../erp/src/pages/App/SalesOrder/Assistance/AssistanceOrderModal.tsx#L226) (226), [Agendamento.tsx](../../erp/src/pages/App/SalesOrder/ShippingComponents/Agendamento.tsx#L60) (60, 78, 107, 418) | Vocabulário de agendamento da assistência. |
| [OrderOperationalBadges.tsx](../../erp/src/pages/App/SalesOrder/OrderHistoryList/components/OrderOperationalBadges.tsx#L135) (35–37, 135, 191–198), [OrderCardBody.tsx](../../erp/src/pages/App/SalesOrder/OrderHistoryList/components/OrderHistoryCard/OrderCardBody.tsx#L90) (42–43, 82–91), [OrderHistoryRow.tsx](../../erp/src/pages/App/SalesOrder/OrderHistoryList/components/OrderHistoryRow.tsx#L236) (232–240), [OrderScheduleSummary.tsx](../../erp/src/pages/App/SalesOrder/OrderHistoryList/components/OrderScheduleSummary.tsx#L27) (27, 94–95, 149–163, 183–200) | Selos, descrições e resumos do ERP identificam a assistência como operação própria. |
| [OrderCardScheduleSection.tsx](../../mobile/src/features/orders/components/card/OrderCardScheduleSection.tsx#L90) (89–90, 262) | O resumo de agendamento do app mostra Assistência para esse tipo de pedido. |
| [assistencias-tecnicas.md](../negocio/assistencias/assistencias-tecnicas.md#L19) (19, 21) | Registra a regra de operação única e as ações disponíveis ao operador. |

Nenhum teste foi executado nesta alteração. A conferência foi somente estática; não houve acesso ao Supabase nem transmissão à SEFAZ.
