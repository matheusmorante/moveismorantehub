# Devoluções Vinculadas e Livres — Morante Hub

Uma devolução é um novo pedido com `orderType: return`; ela não apaga a venda que a originou. A devolução vinculada guarda `linkedOrderId`, o tipo (`complete` ou `partial`) e os snapshots financeiros `originalSoldTotal` e `returnedTotalAmount`.

## Cadastro, retorno físico e estoque

Criar o pedido de devolução registra a solicitação e o vínculo comercial. A entrada de estoque só pode ocorrer quando os itens retornarem fisicamente:

| Situação física | Estado da devolução | Efeito de estoque esperado |
| --- | --- | --- |
| Coleta ainda será feita no endereço | `scheduled` (**Coleta agendada**) | Nenhuma entrada ao cadastrar; a equipe pode confirmar a coleta antes do prazo. Sem confirmação, o Cron do Supabase conclui como **Devolvido** à meia-noite BRT após a data agendada (ou o último dia da janela) e registra a entrada. |
| Cliente já trouxe os itens à loja | `fulfilled` (**Devolvido**) | Registrar a entrada junto à conclusão do pedido de devolução. |
| Devolução sem venda vinculada, aguardando recebimento | `scheduled` | Nenhuma entrada ao cadastrar; receber fisicamente e concluir antes de lançar estoque. |

Quando concluída, cada entrada é uma `inventory_move` do tipo `entry`, vinculada ao pedido de devolução, para item de catálogo elegível. A devolução vinculada preserva o CMV da venda; a devolução livre usa o custo registrado no item. A conclusão ocorre pela confirmação da coleta ou, sem confirmação, à meia-noite BRT após a data agendada (último dia da janela, quando houver). Depois do commit, a regra fiscal é transmitir automaticamente uma NFD se a venda vinculada tiver NF-e autorizada no mesmo ambiente e o cenário passar as validações habilitadas. O disparo já existe após entrega na loja e confirmação manual; a conclusão pelo Cron ainda não aciona o trabalhador fiscal de servidor, então esse caminho segue pendente. Sem NF-e autorizada, não há NFD. A NF-e original é preservada.

```mermaid
flowchart TD
  A[Criar pedido de devolução] --> B{Itens já retornaram fisicamente?}
  B -->|Não, coleta futura| C[Manter scheduled sem entrada de estoque]
  C --> D{Coleta confirmada antes do prazo?}
  D -->|Sim| F[Concluir como Devolvido]
  D -->|Não, prazo venceu| F
  B -->|Sim, trazidos à loja| E[Concluir como Devolvido]
  E --> G
  F --> G[Gravar conclusão e entrada de estoque atomicamente]
  G --> H{Venda vinculada tem NF-e autorizada no mesmo ambiente?}
  H -->|Sim, cenário fiscal habilitado| I[Transmitir NFD automaticamente após o commit]
  H -->|Não| J[Concluir sem NFD]
```

## Estado verificável da implementação

- [ReturnOrderModal.tsx](../../../erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx) cria a coleta futura como `scheduled`; quando o cliente já entregou os itens na loja, cria a devolução como `fulfilled` e mantém `returnStockProcessed: false`.
- [useOrderHistory.ts](../../../erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts) permite confirmar a coleta antes do prazo e chama a transmissão automática após o commit da confirmação manual. O vencimento de pedidos agendados é concluído por `public.auto_fulfill_scheduled_orders()` no Cron do Supabase; esse caminho ainda não aciona a transmissão fiscal de servidor.
- O fluxo de atualização usa [orderUpdateService.ts](../../../erp/src/pages/utils/orderMutation/orderUpdateService.ts); a criação vinculada usa [orderCreationService.ts](../../../erp/src/pages/utils/orderMutation/orderCreationService.ts), que chama `create_return_order_with_capacity` ou `create_return_order_with_fiscal_capacity`.
- Em 09/10/2026, uma consulta somente de leitura ao projeto Supabase configurado confirmou as definições remotas dessas duas RPCs e de `create_order_with_inventory_transaction`. A RPC principal trata devolução `fulfilled` como entrada, grava pedido, movimento de estoque, saldo e histórico na mesma transação PostgreSQL e usa lock de transação/idempotência. A RPC de capacidade valida o saldo da venda, chama essa transação e atualiza o vínculo comercial; a versão fiscal também grava as alocações fiscais na mesma chamada.
- A atomicidade do caminho normal está confirmada pela definição atualmente instalada no banco, mas as migrations que criaram essas RPCs base não estão neste checkout. O teste [orderInventoryAtomic.cjs](../../../supabase/tests/orderInventoryAtomic.cjs) aponta para uma migration de origem que também não foi encontrada. O helper [returnInventoryService.ts](../../../erp/src/pages/utils/returnInventoryService.ts) não é chamado pelo caminho normal de atualização; o lançamento normal é feito pela RPC.

Essa leitura confirma a implementação remota, mas não prova o rollback em falha, retries ou concorrência, e não recupera a origem versionada das RPCs. Esses pontos continuam pendentes de fonte SQL local e validação automatizada; veja o [status fiscal e de fluxos relacionados](../../fiscal/status-testes-homologacao.md). Nesta verificação das RPCs não houve escrita no banco nem execução de testes.

## Referências

- [Criação de devolução vinculada](../../../erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx)
- [Confirmação de coleta/recebimento](../../../erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnFulfillmentConfirmModal.tsx)
- [Entrada de estoque](../../../erp/src/pages/utils/returnInventoryService.ts) e [regras da entrada](../../../erp/src/pages/utils/returnInventoryRules.ts)
- [Regras fiscais da NF-e de devolução](../../fiscal/nfe-devolucao.md)
- [Desfazer uma devolução](estorno-devolucao.md)
