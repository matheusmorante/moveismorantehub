# Movimentações de Estoque e Custos — Morante Hub

`inventory_moves` é o livro de fatos do estoque. O saldo e o custo exibidos no catálogo são projeções desse histórico; uma movimentação confirmada nunca é apagada para corrigir uma operação.

## Tipos e estado de uma movimentação

| Campo | Valores usados | Efeito |
| --- | --- | --- |
| `type` | `entry` | Soma quantidade; uma entrada com custo pode recalcular o CMPM. |
| `type` | `exit` ou `withdrawal` | Subtrai quantidade; a aplicação normaliza ambos como saída. |
| `type` | `adjustment` ou `balance` | Ajusta o saldo da contagem/inventário. |
| `status` | `effective` | Fato ativo na projeção de estoque. |
| `status` | `reversed` | Fato preservado para auditoria, mas compensado fora da projeção. |

O banco persiste os tipos normalizados `entry`, `exit` e `adjustment`. A interface pode apresentar `withdrawal` e `balance` por compatibilidade.

```mermaid
flowchart LR
  A[Operação de negócio] --> B[Cria inventory_move effective]
  B --> C[Atualiza saldo da variação e do produto]
  C --> D{Estorno?}
  D -->|Não| E[Histórico efetivo]
  D -->|Sim| F[Marca o mesmo fato como reversed]
  F --> G[Aplica o inverso no saldo]
  G --> H[Histórico auditável preservado]
```

## CMPM e CMV

O CMPM é calculado por SKU/variação. Em uma entrada valorizada:

$$\text{novo CMPM} = \frac{(\text{saldo anterior} \times \text{CMPM anterior}) + (\text{quantidade entrada} \times \text{custo unitário})}{\text{saldo anterior} + \text{quantidade entrada}}$$

- Com saldo anterior zero, a entrada define o novo custo.
- Saídas não recalculam o CMPM. A saída de venda materializa o custo vigente no item e na movimentação como CMV histórico.
- Custo indisponível permanece não apurado; não se deve inventar custo zero para produzir margem artificial.
- Uma devolução vinculada volta com o CMV materializado da venda. Correções retroativas podem disparar reprocessamento cronológico do SKU afetado.

## Vínculo, reversão e auditoria

Movimentos de vendas, devoluções e recebimentos carregam o identificador da entidade relacionada. O estorno do documento altera o estado do movimento relacionado para `reversed`; desfazer o estorno o reativa como `effective`. A operação manual não deve estornar movimento que pertença a pedido ou recebimento: ela deve ocorrer pelo ciclo de vida do documento de origem.

## Implementação e testes

- [Mapeamento e compatibilidade de tipos](../../../erp/src/pages/utils/inventoryService/inventoryTypeRules.ts)
- [Persistência e normalização](../../../erp/src/pages/utils/inventoryService/inventoryMapper.ts)
- [Estorno e reativação](../../../erp/src/pages/utils/inventoryService/inventoryReversalService.ts)
- [Saldo projetado](../../../erp/src/pages/utils/inventoryService/inventoryStockCalculator.ts)
