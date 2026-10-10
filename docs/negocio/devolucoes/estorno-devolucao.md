# Estorno de Devolução — Morante Hub

A ação comercial preserva o pedido de devolução e marca suas entradas de estoque como `reversed`. Para devolução agendada a interface apresenta **Cancelar devolução**; para devolução atendida o menu apresenta **Desfazer Devolução**. O modal aguarda cinco segundos antes de habilitar a confirmação.

Ao confirmar, o sistema localiza a devolução vinculada, estorna suas movimentações de estoque relacionadas, atualiza o pedido como cancelado e remove o vínculo de retorno da venda original quando ele existir. Não é criada uma saída duplicada nem a venda original é excluída. A ação não cancela uma NF-e de devolução autorizada; se já houver documento autorizado, a situação fiscal precisa ser reconciliada separadamente. As gravações do helper ocorrem em chamadas separadas e ainda não são atômicas, conforme a [auditoria de 08/10](../../fiscal/auditoria-cancelamento-estorno-devolucao-2026-10-08.md).

## Implementação e teste

- [undoReturn](../../../erp/src/pages/utils/orderLifecycleOperations.ts)
- [Teste de regressão](../../../erp/src/pages/utils/__tests__/orderLifecycleOperations.undoReturn.test.ts)
- [Reversão de estoque](../../../erp/src/pages/utils/inventoryService/inventoryReversalService.ts)
