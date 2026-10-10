# Matriz de Efeitos Globais — Morante Hub

Esta matriz permite consultar rapidamente o impacto exato que qualquer ação operacional provoca em todo o ecossistema Morante Hub (Estoque, Custos, Financeiro, Operação, Auditoria e Reversibilidade).

---

## 📊 Matriz Completa de Efeitos por Ação

| Ação Operacional | Efeito em Estoque | Efeito em Custo / CMV | Efeito Financeiro | Efeito Operacional / Logística | Auditoria / Histórico | Reversibilidade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Venda Rascunho / Orçamento** | Nenhum | Nenhum | Nenhum | Nenhum | Registra rascunho em `orders` (`status: draft`) | Total (edição ou exclusão direta) |
| **Venda Agendada (`scheduled`)** | Saída efetiva na data do pedido (`order.date`) | Materializa CMV imutável com base no CMPM | Gera contas a receber (`status: pending`) | Envia para a grade de entregas e gera selos `Drill` | Grava histórico em `order_status_history` e `inventory_moves` | Cancelamento antes da circulação; o tratamento fiscal é escolhido pela política central após o commit |
| **Venda Atendida (`fulfilled`)** | Saída efetiva mantida ou ajustada | Mantém CMV materializado | Título em contas a receber concluído/recebido | Entrega ou retirada confirmada | Grava histórico de transição | Devolução vinculada após retorno físico; não cancelamento/estorno por operação não realizada |
| **Venda Cancelada** | Reverte a saída de estoque (se `stockProcessed`) | Neutraliza a saída de CMV | Cancela os títulos a receber pendentes | Remove da grade de entregas e oculta selos `Drill` | Registra histórico de cancelamento | Irreversível (exige nova venda ou duplicação) |
| **Devolução Cadastrada (Vinculada ou Livre)** | Sem entrada ao cadastrar; entrada após retorno físico confirmado. A atomicidade está confirmada nas RPCs remotas; a fonte SQL não está no checkout e ainda faltam testes de rollback/retry/concorrência. | Reutiliza CMV da venda original quando aplicável | Segue o fluxo financeiro comercial da devolução | Oculta selos de montagem no pedido de devolução | Registra a devolução e o retorno físico em seus históricos | Pode ser cancelada/desfeita pelo fluxo comercial; isso não cancela uma NF-e de devolução autorizada |
| **Desfazer / Estorno de Devolução** | Reverte a entrada de estoque gerada pela devolução | Reajusta o histórico de custos | Neutraliza o crédito/estorno financeiro gerado | Restaura estado prévio do pedido de venda | Registra evento de estorno | Reversível mediante confirmação em modal |
| **Assistência Técnica com Troca** | Lança saída de estoque da peça substituída | Registra custo da peça utilizada | Registra valor de serviço cobrado ao cliente (se houver) | Gera Ordem de Serviço (OS) de assistência | Grava `assistanceItems` e `inventory_moves` | Reversível via edição da OS |
| **Pedido de Compra** | Nenhum | Nenhum | Nenhum | Registra a intenção de compra e serve de referência para o recebimento | Grava o pedido e seus itens planejados | Editável ou cancelável enquanto operacionalmente permitido |
| **Recebimento de Compra Confirmado** | Lança entrada por compra | Recalcula o Custo Médio Ponderado Móvel (CMPM) | Gera fatura em contas a pagar ao fornecedor | Atualiza histórico de suprimentos e fornecedor | Grava registro em `goods_receipts` e `inventory_moves` | Reversível via Estorno de Recebimento |
| **Estorno de Recebimento de Compra** | Reverte a entrada de estoque por compra | Recalcula retroativamente o CMPM histórico | Estorna a fatura em contas a pagar | Notifica responsável de compras | Grava evento de estorno de recebimento | Reversível mediante confirmação |
| **Conclusão de Inventário Físico** | Lança movimentação de ajuste (`adjustment`) | Não altera o custo unitário (ajusta valor total em estoque) | Nenhum impacto direto | Atualiza saldo físico contado no depósito | Grava histórico de inventário | Reversível via novo ajuste |
| **Variação Movida Para Outro Pai** | Nenhum (saldo mantido no UUID) | Nenhum | Nenhum | Atualiza nome e SKU comercial da variação | Mantém o UUID histórico e chama RPC `move_variation_to_parent` | Reversível movendo novamente |
| **Merge de Variações** | Transfere histórico da origem para o canônico | Transfere custo e consolida histórico | Nenhum | Variação origem aponta para a variação canônica | Grava `merged_to_variation_id` via RPC | Irreversível (requer manutenção externa) |
| **Lançamento IA Gemini (Texto/Voz)** | Nenhum | Nenhum | Lança despesa/receita física (*batch-aware*) | Nenhum | Grava histórico no fluxo de caixa | Reversível via edição/exclusão financeira |

---

## 🔍 Regras de Bloqueio e Proteção de Erros

> **Atualização de regras fiscais em 09/10/2026:** `fulfilled` não autoriza cancelar uma venda como operação não realizada. A devolução só gera entrada de estoque após confirmação física; a transação desse caminho foi confirmada na definição das RPCs do banco remoto, mas a fonte SQL ainda falta no checkout e rollback/retry/concorrência não foram testados nesta auditoria. Consulte a [política de cancelamento](vendas/cancelamentos-reversoes.md), o [fluxo de devolução](devolucoes/devolucoes-vinculadas-e-livres.md) e o [status fiscal atual](../fiscal/status-testes-homologacao.md). O helper para desfazer devolução faz atualizações sequenciais e não cancela uma NFD autorizada; veja a [auditoria de 08/10](../fiscal/auditoria-cancelamento-estorno-devolucao-2026-10-08.md).

1. **Vendas Canceladas**: Não podem ter seu status alterado para ativo. Para reutilizar, o usuário deve acionar a opção "Duplicar Pedido".
2. **Estoque Negativo**: Movimentações que levariam o saldo a ficar inconsistente são logadas e alertadas, mantendo o rascunho até regularização de estoque.
3. **Itens Temporários (`isTemporaryProduct: true`)**: NUNCA geram movimentação de estoque ou saída de CMV até que ocorra a conciliação comercial com um produto cadastrado.
