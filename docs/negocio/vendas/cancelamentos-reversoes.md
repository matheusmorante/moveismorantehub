# Cancelamento comercial, estorno e devolução

**Reconciliado com o código em 09/10/2026.** Este documento cobre pedidos de venda vinculados a documentos fiscais de saída. A cobertura e os bloqueios de implementação ficam no [status fiscal](../../fiscal/status-testes-homologacao.md).

## Regras por estado da operação

| Estado | Efeito comercial e de estoque | Tratamento fiscal |
|---|---|---|
| Sem circulação, documento ausente/rejeitado/nunca autorizado | Cancelar pedido e reverter estoque na operação transacional. | Não criar evento fiscal. |
| Sem circulação, documento autorizado e dentro do prazo estadual aplicável | Confirmar cancelamento comercial/estoque na transação. | Selecionar automaticamente cancelamento SEFAZ; não expor escolha do efeito ao usuário. |
| Sem circulação, prazo de cancelamento vencido | Confirmar cancelamento comercial/estoque na transação, quando a política permitir. | Selecionar estorno somente quando permitido e após revisão fiscal aplicável. |
| Com circulação ou evidência de saída/trânsito | Bloquear cancelamento como operação não realizada e não gerar estorno. | Preservar a NF-e original; tratar retorno físico por devolução vinculada à venda. |

## Invariantes operacionais

- O Pedido de Venda e a tela de Notas Fiscais de Saída iniciam a mesma operação comercial transacional e usam a mesma política/serviço fiscal central. A tela fiscal não altera status diretamente.
- `hasGoodsCirculated(order)` trata `fulfilled` como circulação tanto para entrega quanto para retirada, além das evidências de saída/trânsito definidas pelo serviço central. Trânsito ou estado não reconciliado não pode ser presumido como operação não realizada.
- No Paraná, a janela é 168 horas para NF-e modelo 55 e 30 minutos para NFC-e modelo 65. Centralizar os prazos e cobrir o instante exato do limite a partir da autorização.
- Atualização comercial e efeitos de estoque são confirmados na transação do pedido. A chamada à SEFAZ ocorre após o commit; falha ou timeout fiscal exige tentativa idempotente e reconciliação sem desfazer o fato comercial confirmado.
- Criar uma devolução não confirma retorno físico nem emite documento fiscal. Coleta só conclui como “Coletada” depois da confirmação da coleta; quando o cliente já trouxe a mercadoria à loja, conclui como “Recebida”. A entrada de estoque acompanha a confirmação física na transação do pedido. A NF-e de devolução é preparada na área fiscal depois desse retorno.
- A criação de devolução fiscal a partir de NFC-e modelo 65 não tem cobertura comprovada; consulte o [status central](../../fiscal/status-testes-homologacao.md). A NF-e original deve ser preservada.

## Implementação relacionada

- Pedido de Venda: [useOrderHistoryOperations.ts](../../../erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts).
- Iniciação pela tela fiscal: [fiscalCancellationService.ts](../../../erp/src/pages/App/FiscalDocuments/services/fiscalCancellationService.ts).
- Operação comercial compartilhada: [orderMutationService.ts](../../../erp/src/pages/utils/orderMutationService.ts) e [orderUpdateService.ts](../../../erp/src/pages/utils/orderMutation/orderUpdateService.ts).
- Política/efeito fiscal compartilhados: [nfeService.ts](../../../erp/src/pages/utils/nfe/nfeService.ts), [order-cancellation-policy.ts](../../../api/nfe/order-cancellation-policy.ts) e [cancel.ts](../../../api/nfe/cancel.ts).
- Fontes normativas e decisões fiscais: [manuais e fontes oficiais](../../fiscal/manuais/README.md), [modelo de varejo no Paraná](../../fiscal/decisao-modelo-varejo-pr.md) e [devolução fiscal](../../fiscal/nfe-devolucao.md).
