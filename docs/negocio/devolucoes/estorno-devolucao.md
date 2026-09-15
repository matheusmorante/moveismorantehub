# Estorno de Devolução — Morante Hub

A ação de cancelamento preserva o pedido de devolução e marca suas entradas de estoque como `reversed`. Para devolução agendada a interface apresenta **Cancelar devolução**; para devolução atendida apresenta **Estornar devolução**. Ambas exigem confirmação protegida por contagem regressiva de cinco segundos.

Ao confirmar, o sistema localiza a devolução vinculada, estorna suas movimentações de estoque relacionadas, atualiza o pedido como cancelado e remove o vínculo de retorno da venda original quando ele existir. Não é criada uma saída duplicada nem a venda original é excluída.

## Implementação e teste

- [undoReturn](../../../erp/src/pages/utils/orderLifecycleOperations.ts)
- [Teste de regressão](../../../erp/src/pages/utils/orderLifecycleOperations.undoReturn.test.ts)
- [Reversão de estoque](../../../erp/src/pages/utils/inventoryService/inventoryReversalService.ts)
