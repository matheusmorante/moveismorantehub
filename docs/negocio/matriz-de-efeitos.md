# Matriz de Efeitos Globais — Morante Hub

Esta matriz permite consultar rapidamente o impacto exato que qualquer ação operacional provoca em todo o ecossistema Morante Hub (Estoque, Custos, Financeiro, Operação, Auditoria e Reversibilidade).

---

## 📊 Matriz Completa de Efeitos por Ação

| Ação Operacional | Efeito em Estoque | Efeito em Custo / CMV | Efeito Financeiro | Efeito Operacional / Logística | Auditoria / Histórico | Reversibilidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Venda Rascunho / Orçamento** | Nenhum | Nenhum | Nenhum | Nenhum | Registra rascunho em `orders` (`status: draft`) | Total (edição ou exclusão direta) |
| **Venda Agendada (`scheduled`)** | Saída efetiva na data do pedido (`order.date`) | Materializa CMV imutável com base no CMPM | Gera contas a receber (`status: pending`) | Envia para a grade de entregas e gera selos `Drill` | Grava histórico em `order_status_history` e `inventory_moves` | Reversível via Cancelamento ou Estorno |
| **Venda Atendida (`fulfilled`)** | Saída efetiva mantida ou ajustada | Mantém CMV materializado | Titulo em contas a receber concluído/recebido | Marca entrega como concluída | Grava histórico de transição | Reversível via Devolução ou Cancelamento |
| **Venda Cancelada** | Reverte a saída de estoque (se `stockProcessed`) | Neutraliza a saída de CMV | Cancela os títulos a receber pendentes | Remove da grade de entregas e oculta selos `Drill` | Registra histórico de cancelamento | Irreversível (exige nova venda ou duplicação) |
| **Devolução Cadastrada (Vinculada ou Livre)** | Entrada imediata de estoque no momento do cadastro | Reutiliza CMV da venda original (ou CMPM vigente se livre) | Gera crédito ao cliente ou estorno em contas a pagar | Oculta selos de montagem no pedido de devolução | Grava `inventory_moves` tipo `entry` (Devolução) | Reversível via Modal de Desfazer com timer de 5s |
| **Desfazer / Estorno de Devolução** | Reverte a entrada de estoque gerada pela devolução | Reajusta o histórico de custos | Neutraliza o crédito/estorno financeiro gerado | Restaura estado prévio do pedido de venda | Registra evento de estorno | Reversível mediante confirmação em modal |
| **Assistência Técnica com Troca** | Lança saída de estoque da peça substituída | Registra custo da peça utilizada | Registra valor de serviço cobrado ao cliente (se houver) | Gera Ordem de Serviço (OS) de assistência | Grava `assistanceItems` e `inventory_moves` | Reversível via edição da OS |
| **Recebimento de Compra Confirmado** | Lança entrada por compra | Recalcula o Custo Médio Ponderado Móvel (CMPM) | Gera fatura em contas a pagar ao fornecedor | Atualiza histórico de suprimentos e fornecedor | Grava registro em `goods_receipts` e `inventory_moves` | Reversível via Estorno de Recebimento |
| **Estorno de Recebimento de Compra** | Reverte a entrada de estoque por compra | Recalcula retroativamente o CMPM histórico | Estorna a fatura em contas a pagar | Notifica responsável de compras | Grava evento de estorno de recebimento | Reversível mediante confirmação |
| **Conclusão de Inventário Físico** | Lança movimentação de ajuste (`adjustment`) | Não altera o custo unitário (ajusta valor total em estoque) | Nenhum impacto direto | Atualiza saldo físico contado no depósito | Grava histórico de inventário | Reversível via novo ajuste |
| **Variação Movida Para Outro Pai** | Nenhum (saldo mantido no UUID) | Nenhum | Nenhum | Atualiza nome e SKU comercial da variação | Mantém o UUID histórico e chama RPC `move_variation_to_parent` | Reversível movendo novamente |
| **Merge de Variações** | Transfere histórico da origem para o canônico | Transfere custo e consolida histórico | Nenhum | Variação origem aponta para a variação canônica | Grava `merged_to_variation_id` via RPC | Irreversível (requer manutenção externa) |
| **Lançamento IA Gemini (Texto/Voz)** | Nenhum | Nenhum | Lança despesa/receita física (*batch-aware*) | Nenhum | Grava histórico no fluxo de caixa | Reversível via edição/exclusão financeira |

---

## 🔍 Regras de Bloqueio e Proteção de Erros

1. **Vendas Canceladas**: Não podem ter seu status alterado para ativo. Para reutilizar, o usuário deve acionar a opção "Duplicar Pedido".
2. **Estoque Negativo**: Movimentações que levariam o saldo a ficar inconsistente são logadas e alertadas, mantendo o rascunho até regularização de estoque.
3. **Itens Temporários (`isTemporaryProduct: true`)**: NUNCA geram movimentação de estoque ou saída de CMV até que ocorra a conciliação comercial com um produto cadastrado.
