# Assistências Técnicas e Ordens de Serviço — Morante Hub

Este documento descreve as regras do módulo de Assistência Técnica (`orderType: 'assistance'`), atendimento a clientes, substituição de peças e apuração de custos de mão de obra versus valor cobrado.

---

## 🛠️ Estrutura de uma Ordem de Serviço de Assistência

Um pedido do tipo `assistance` é composto por:
1. **Dados do Cliente e Venda Original Vinculada (`linkedOrderId`)**: Vínculo opcional ou obrigatório com a venda que originou a garantia/assistência.
2. **Itens de Assistência (`assistanceItems`)**: Lista de peças ou componentes envolvidos na assistência.
3. **Custo de Mão de Obra / Custo Interno (`assistanceCost`)**: Valor gasto internamente pela empresa com o técnico ou montador (não é cobrado do cliente).
4. **Valor de Serviço Cobrado (`assistanceServiceValue`)**: Valor efetivamente cobrado do cliente pelo atendimento/reparo.

---

## 📦 Consumo de Estoque em Assistências

- Quando uma peça cadastrada em estoque é utilizada na assistência técnica, é gerada uma movimentação de saída (`exit`) reduzindo o saldo em estoque.
- Peças de assistência sem cadastro de produto são registradas como itens informativos sem movimentar estoque físico.

---

## 🔗 Mapeamento em Código e Testes

- **Modal de Assistência**: `[AssistanceOrderModal.tsx](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/AssistanceOrderModal.tsx)`
- **Serviço de Pedidos**: `[orderHistoryService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderHistoryService.ts)`
