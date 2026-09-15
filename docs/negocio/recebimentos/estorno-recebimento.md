# Estorno de Recebimento — Morante Hub

O recebimento permanece registrado após um estorno. O cabeçalho passa de `received` para `estornado` e as entradas de estoque associadas passam de `effective` para `reversed`.

| Ação | Recebimento | Movimentações vinculadas | Saldo |
| --- | --- | --- | --- |
| Finalizar | `received` | `entry` / `effective` | soma a entrada |
| Estornar | `estornado` | mesmas entradas / `reversed` | desfaz a entrada |
| Desfazer estorno | `received` | mesmas entradas / `effective` | reaplica a entrada |

O serviço impede estorno manual de movimento vinculado a documento. A reversão deve partir do recebimento para preservar a ligação, o motivo e a capacidade de reativação.

Para recebimentos anteriores à vinculação por ID, há busca de compatibilidade e recriação somente quando não existir movimento a reativar. Esse caminho é uma medida de compatibilidade, não o fluxo padrão.

## Implementação

- [reverseGoodsReceipt e unreverseGoodsReceipt](../../../erp/src/pages/utils/goodsReceiptService.ts)
- [Reversão de movimentos](../../../erp/src/pages/utils/inventoryService/inventoryReversalService.ts)
