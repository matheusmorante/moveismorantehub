# Regras e Invariantes Globais do Negócio — Morante Hub

Este documento especifica as **regras de ouro e invariantes de negócio permanentes** do Morante Hub. Qualquer implementação ou refatoração no ERP ou App Mobile DEVE respeitar rigorosamente estes princípios.

---

## 🛑 As 6 Regras de Ouro Invioláveis

### 1. Imutabilidade de Fatos Históricos e Snapshots
- Pedidos de venda, devoluções, recebimentos e notas fiscais gravam **snapshots imutáveis** do momento da operação (nome do cliente, endereço de entrega, nome e código do produto, preço unitário e CMV).
- Alterar o cadastro de um cliente, produto ou fornecedor no presente **NUNCA** altera retroativamente vendas, relatórios ou notas fiscais emitidas no passado.

### 2. CMV Materializado Imutável no Momento da Saída
- No momento em que um pedido de venda ou saída gera movimentação efetiva de estoque, o Custo de Mercadoria Vendida (CMV) é congelado com base no Custo Médio Ponderado Móvel (CMPM) vigente daquela variação naquele instante.
- Reajustes futuros no custo médio do produto **NÃO** alteram o CMV gravado em saídas passadas.

### 3. Toda Variação Possui Identidade Única via UUID
- Todo produto cadastrado possui pelo menos uma variação. Um produto simples é a sua própria variação principal única.
- A identidade de uma variação perante movimentações de estoque, compras e vendas é dada **exclusivamente por seu `UUID` (36 caracteres)**. SKUs e códigos comerciais podem ser ajustados sem perder o histórico do UUID.

### 4. Transparência de Data Efetiva de Estoque e Venda
- A saída de estoque provocada por uma venda agendada ou atendida possui data de movimentação efetiva igual à **data de cadastro do pedido (`order.date`)**, garantindo que relatórios mensais de vendas e estoque sejam perfeitamente alinhados na mesma competência.

### 5. Reversões Exigem Eventos Compensatórios
- O sistema proíbe a exclusão física ou "limpeza silenciosa" de registros com histórico operacional.
- Cancelamentos, desfez e estornos funcionam gerando **movimentações compensatórias inversas** (ex: devolução gera entrada; cancelamento de devolução reverte a entrada via evento compensatório).

### 6. App Mobile Offline-First com Backend Autoridade
- O aplicativo mobile executa operações offline registrando eventos atômicos locais no SQLite (`PENDING`).
- Ao reconectar, a fila é transmitida ao backend, que valida as regras de negócio de forma estrita. O backend Supabase é a **autoridade final de verdade** do estoque e das validações.

---

## 📌 Mapeamento no Código e Testes

| Invariante | Arquivo de Implementação | Teste de Proteção |
| :--- | :--- | :--- |
| **Imutabilidade de Snapshots** | `[orderSnapshotResolution.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderSnapshotResolution.ts)` | `[duplicateOrder.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/duplicateOrder.test.ts)` |
| **CMV Materializado Imutável** | `[movingAverageCostRules.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/movingAverageCostRules.ts)` | `[goodsReceiptCostCalculation.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/goodsReceiptCostCalculation.test.ts)` |
| **Identidade de Variação por UUID** | `[productVariationActionsService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productVariationActionsService.ts)` | `[2026-09-09-identidade-variacao-uuid.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/auditorias/2026-09-09-identidade-variacao-uuid.md)` |
| **Data Efetiva da Venda** | `[saleInventoryRules.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/saleInventoryRules.ts)` | `[latestRulesBattery.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/latestRulesBattery.test.ts)` |
| **Reversões Compensatórias** | `[orderStockOperations.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderStockOperations.ts)` | `[divergenciasCorrecao.test.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/divergenciasCorrecao.test.ts)` |
| **Offline-First Eventos** | `[offlineSyncService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/services/offlineSyncService.ts)` | `[mobile-transactions.spec.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/tests/mobile-transactions.spec.ts)` |
