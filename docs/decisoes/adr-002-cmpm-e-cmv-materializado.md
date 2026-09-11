# ADR-002: Cálculo do CMPM e Materialização Imutável do CMV

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Estoque, Custos e Contabilidade

---

## 🎯 Contexto e Problema

O custo de aquisição de mercadorias oscila constantemente com novos recebimentos de compras, fretes e descontos. Se o custo unitário da venda fosse calculado dinamicamente no momento de gerar relatórios, a margem de lucro de vendas passadas mudaria cada vez que uma nova compra entrasse no estoque.

---

## 💡 Decisão Arquitetural

1. **Custo Médio Ponderado Móvel (CMPM)**: O custo unitário do estoque é atualizado exclusivamente nas entradas por compra (`purchase_entry`) ou recebimento físico utilizando a fórmula de média ponderada.
2. **CMV Materializado na Saída**: No instante em que uma venda gera saída efetiva de estoque, o CMV unitário é congelado na movimentação (`inventory_moves.unit_cost`) com o valor do CMPM vigente.
3. **Reversão com Custo Original em Devoluções**: Devoluções de vendas reutilizam o CMV da saída original, anulando a margem da venda sem distorcer o custo médio do estoque.

---

## ⚖️ Consequências

- **Positivas**:
  - DRE e relatórios de margem de lucro por pedido são imutáveis e auditáveis.
  - Saídas não alteram o custo médio do produto.
- **Negativas**:
  - Exige validação rigorosa nas funções de inserção e estorno de movimentações de estoque.

---

## 🔗 Mapeamento no Código

- **Fórmulas de Custo**: `[movingAverageCostRules.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/movingAverageCostRules.ts)`
- **Movimentação de Estoque**: `[inventoryService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/inventoryService.ts)`
