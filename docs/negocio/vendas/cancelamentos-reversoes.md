# Cancelamentos, Estornos e Reversões de Vendas — Morante Hub

Este documento define a semântica, diferenças operacionais e regras de reversão aplicadas a vendas e pedidos no Morante Hub.

---

## 🧭 Diferença Semântica de Operações de Reversão

| Operação | Quando se Aplica | Efeito no Estoque | Efeito no Financeiro | Reversibilidade |
| :--- | :--- | :--- | :--- | :--- |
| **Cancelar Pedido (`cancel`)** | Pedido agendado ou em aberto que não será entregue. | Reverte a saída de estoque gerada anteriormente (`cancelInventoryMovesByRelatedEntity`). | Cancela títulos a receber pendentes. | Irreversível (exige duplicação do pedido). |
| **Estornar Venda (`reverse`)** | Erro operacional imediato antes da emissão fiscal. | Exclui/compensa as movimentações e restaura saldo. | Cancela movimentação no caixa. | Reversível via ajuste. |
| **Devolução de Venda (`return`)** | Cliente devolveu o produto após o recebimento/entrega. | Gera **nova entrada** por devolução sem alterar o histórico da saída original. | Gera crédito ou devolução financeira. | Reversível via modal com timer de 5s. |

---

## ⚙️ Regras de Cancelamento de Venda

1. **Reversão Automática de Movimentações**:
   - Quando um pedido com `stockProcessed: true` tem seu status alterado para `cancelled`, o sistema busca as movimentações em `inventory_moves` vinculadas a esse `order_id` e dispara a reversão compensatória.
2. **Preservação de Histórico de Status**:
   - Toda alteração de status grava um registro de auditoria na tabela `order_status_history` contendo `old_status`, `new_status`, `changed_by` e `created_at`.

---

## 🔗 Mapeamento em Código e Testes

- **Serviço de Operações**: `[orderLifecycleOperations.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderLifecycleOperations.ts)`
- **Estorno de Estoque**: `[inventoryService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/inventoryService.ts)` → `cancelInventoryMovesByRelatedEntity()`
- **Testes de Proteção**: `[divergenciasCorrecao.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/divergenciasCorrecao.test.ts)`
