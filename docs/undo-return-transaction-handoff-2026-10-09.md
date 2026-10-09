# Retomada: reversão transacional de devolução

Atualizado em 2026-10-09. Este arquivo registra o estado da tarefa para continuar em outro computador.

## Pedido e autorização

Continuar a correção de `undoReturn` descrita no texto colado “Finalização do fluxo de devoluções — Reversão transacional e segurança comercial/fiscal”. Preservar o agrupamento NFD, múltiplas devoluções por venda e os demais trabalhos já presentes no checkout.

O usuário autorizou explicitamente a consulta NFD agrupada e limitada: partir somente das vendas visíveis (até 15), consultar suas devoluções vinculadas e documentos relacionados, retornar campos compactos, contar apenas NFs de devolução existentes, reutilizar relacionamentos/serviços atuais e evitar N+1. Essa autorização também já foi dada no diálogo anterior; não perguntar novamente.

Não cancelar NF-e real, não transmitir à SEFAZ e não fabricar status/documentos fiscais para teste. A reversão comercial deve ser bloqueada quando uma NFD estiver autorizada ou em estado fiscal incerto.

## Estado no momento da pausa

- Nenhum código de `undoReturn` foi editado nesta retomada.
- Nenhuma migration foi criada ou aplicada nesta retomada.
- Nenhum dado do banco remoto foi alterado. As consultas remotas feitas foram apenas de metadados de schema/índices e da regra de isolamento de pedidos de teste.
- Não há comando ou processo ainda em execução.
- Serena MCP não apareceu entre as ferramentas disponíveis nesta sessão; navegação foi feita por buscas `rg` e leitura pontual.

## Diagnóstico confirmado

- `erp/src/pages/utils/orderLifecycleOperations.ts`: `undoReturn` ainda reverte movimentos, atualiza a devolução e limpa o vínculo da venda em chamadas separadas. Quando parte da venda, pode escolher uma devolução arbitrária com `.limit(1)`.
- `erp/src/pages/utils/inventoryService/inventoryReversalService.ts`: o estorno procura por `order_id` e também por texto em `observation`/`label`; marca o movimento como estornado e só depois chama uma atualização separada do saldo do produto. Uma falha no meio pode deixar movimento e estoque divergentes.
- `erp/src/pages/utils/inventoryService/inventoryStockCalculator.ts`: o comportamento atual de reversão decrementa o saldo em devoluções do tipo `entry`; variações atualizam o saldo da variação e recalculam o total do produto. O estorno não altera o custo médio. A nova operação deve preservar essa semântica.
- `erp/src/pages/utils/returnInventoryService.ts`: entradas confirmadas da devolução são gravadas com `order_id` igual ao ID da devolução e tipo `entry`.
- `api/nfe/return-capacity.ts` calcula capacidade usando devoluções vinculadas não canceladas; a mudança de status para cancelado libera o saldo. Não apagar alocações nem fatos históricos.
- O relacionamento de origem está em `orders.linked_order_id` e legado `order_data.linkedOrderId`; a venda tem apenas ponteiro singular `return_order_id`/`order_data.returnOrderId`, que precisa apontar para outra devolução ativa após cancelar uma delas.
- NFDs usam `nfe_documents.document_type='return'`, com associação por `related_return_order_id` (também verificar `order_id` legado). Autorizadas (`autorizada`, `homologada`) devem bloquear o cancelamento comercial; `transmitting`/`unknown` e estados fiscais desconhecidos também devem bloquear para reconciliação. Canceladas/rejeitadas são terminais não autorizados. Não chamar automaticamente `api/nfe/cancel.ts`.
- `nfe_operation_drafts` pode estar em `ready`, `transmitting`, `unknown`, `rejected` ou `authorized`; os estados incertos/autorizados bloqueiam. Há uma corrida possível entre a checagem fiscal e o início da transmissão, então avaliar uma proteção de banco que exija retorno `fulfilled` ao transicionar rascunho de devolução para `transmitting`/`unknown`.
- `erp/src/pages/utils/orderMutation/orderUpdateService.ts` chama um RPC de atualização genérica que recria `order_payments`; não reutilizar esse caminho para a reversão. O RPC especializado deve deixar pagamentos e restituições intactos. Não foi encontrada integração de gateway de reembolso neste fluxo; registrar essa limitação em vez de presumir reembolso externo.
- Registrar histórico de status (`order_status_history`) na mesma transação. Preservar movimentos e documentos; marcar movimento como reversed, com razão/horário e metadados, sem excluir.

## Banco e segurança já verificados

- Projeto remoto configurado: `hkoxhourxwlddgsfdgws` (MoranteHub, sa-east-1, PostgreSQL 17.6), corresponde ao projeto do app.
- Histórico remoto contém migration `20261009023404 allow_cancelling_return_orders`, que não existe localmente. Não reescrever histórico remoto nem fingir que arquivo local ausente foi aplicado.
- Schema remoto confirmado: `orders` tem `status`, `order_type`, `order_data`, `stock_processed`, `return_order_id`, `linked_order_id`, `return_kind`; `inventory_moves` tem `product_id text`, `variation_id text`, `order_id`, `related_entity_id`, `related_entity_type`, `status`, `reason`, `reversal_reason`, `reversed_at`, `observation`; `products.stock` é numeric; `product_variations.stock` é integer; `order_status_history` tem `order_id`, `old_status`, `new_status`, `changed_by`; NFD/drafts têm as colunas citadas acima.
- Índices remotos: `inventory_moves.related_entity_id` existe, mas não foi visto índice em `inventory_moves.order_id`; também não há índice remoto em `orders.linked_order_id`, `nfe_documents.related_return_order_id` ou `nfe_operation_drafts.return_order_id`. Se necessários, criar índices B-tree parciais, inclusive no fallback `order_data->>'linkedOrderId'`.
- O trigger comercial existente permite atualizar/cancelar linha com `order_type='return'`; mantém o bloqueio de venda concluída.
- A regra remota `is_nfe_hml_test_order` identifica fixture ativa com ID UUID e `order_data.is_test=true`, `test_environment='homologation'` e `testRunId` UUID. Para a identificação humana `TEST_AUT_<uuid>`, usar o marcador em `order_number`/observação e `testRunId` UUID; a regra especial de ID literalmente `TEST_AUT_<uuid>` só a reconhece no caso já arquivado em rascunho fiscal.

## Próxima implementação sugerida

1. Criar migration versionada posterior ao histórico remoto, com RPC transacional especializada `undo_return_order_transaction`. Ela deve resolver/validar a devolução e o vínculo, bloquear ambiguidade quando a chamada vier da venda, serializar chamadas, validar estados fiscal/comercial, reverter movimentos exatos e saldos de estoque, cancelar a devolução, recalcular o ponteiro da venda para outra devolução ativa e registrar histórico dentro da mesma transação.
2. Para idempotência, gravar metadado identificável da própria transação nos movimentos revertidos. Movimentos antigos marcados como “Estorno de devolução” sem esse marcador podem representar falha parcial do fluxo antigo: bloquear e pedir reconciliação manual, sem ajustar estoque às cegas.
3. Considerar proteção contra corrida fiscal: travar rascunhos/documentos em ordem consistente com o trigger de transmissão, e garantir que uma nova tentativa de emissão não avance depois que a devolução deixar `fulfilled`. Não alterar o requisito de retorno físico.
4. Alterar `erp/src/pages/utils/orderLifecycleOperations.ts` e `erp/src/pages/utils/orderHistoryService.ts` para chamar somente o RPC e retornar resultado compacto. Atualizar `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` para preservar, na UI, o ponteiro/status de outra devolução ativa.
5. Substituir as expectativas antigas em `erp/src/pages/utils/__tests__/orderLifecycleOperations.undoReturn.test.ts`; adicionar teste SQL/PGlite da função para sucesso, bloqueio fiscal, falhas com rollback e retry. Usar evidência separada: PGlite não prova integração remota nem concorrência entre sessões.
6. Antes de aplicar migration remota: rever SQL completo, verificar novamente ref/histórico, rodar `npm run advisors`, aplicar apenas esta migration versionada e confirmar versão + schema. O contexto do projeto autoriza o SQL necessário à tarefa Supabase; não usar reset, DROP/TRUNCATE, Supabase Local/Docker nem fault injection remota.
7. Rodar primeiro testes focados de `undoReturn`/NFD/múltiplas devoluções, lint aplicável e depois o typecheck completo solicitado. Houve antes 29 testes focados aprovados e o typecheck completo retornou erros preexistentes fora da alteração; rerodar e discriminar os erros atuais.

## Alterações preexistentes a preservar

O checkout já tinha mudanças não relacionadas no mobile/produtos e alterações da etapa anterior de NFD. Em especial, preservar os arquivos listados por `git status` no momento da pausa; não fazer reset, checkout destrutivo ou limpeza. Os arquivos centrais `orderLifecycleOperations.ts`, `orderHistoryService.ts`, `useOrderHistory.ts` e o teste `orderLifecycleOperations.undoReturn.test.ts` estavam sem diff local nesta pausa.

O relatório completo da etapa fiscal anterior está em `docs/fiscal/auditoria-cancelamento-estorno-devolucao-2026-10-08.md`.
