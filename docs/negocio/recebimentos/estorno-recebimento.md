# Estorno de Recebimento de Compras — Morante Hub

Este documento descreve as regras de reversão, compensação e cancelamento de recebimentos de compras incorretos ou rejeitados no Morante Hub.

---

## 🛑 Regras de Estorno de Recebimento

1. **Reversão Compensatória de Saldo**:
   - Estornar um recebimento gera um lançamento inverso no livro de estoque, deduzindo do saldo a exata quantidade que havia sido dada entrada pela compra.
2. **Ajuste Compensatório no CMPM**:
   - O CMPM da variação é reajustado proporcionalmente para neutralizar a entrada que havia sido incorporada incorretamente ao custo médio.
3. **Cancelamento no Contas a Pagar**:
   - Os títulos a pagar gerados ao fornecedor por aquele recebimento específico são marcados como cancelados/estornados no módulo financeiro.

---

## 🔗 Mapeamento em Código e Testes

- **Serviço**: `[goodsReceiptService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/goodsReceiptService.ts)` → `reverseGoodsReceipt()`
- **Testes de Proteção**: `[goodsReceiptCostCalculation.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/goodsReceiptCostCalculation.test.ts)`
