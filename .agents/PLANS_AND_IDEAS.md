# Planos e Ideias Pendentes - Morante Hub

Este documento registra ideias, planos arquiteturais e melhorias planejadas para posterior consulta e lembrete.

---

## 0. Impressão Direta e Automática no ERP Windows (Epson EcoTank L3250)
- **Status:** Concluído e Validado no Spooler da Epson L3250! 🖨️⚡🎉
- **Data:** 24/09/2026
- **Objetivo:** Impressão silenciosa sem caixas de diálogo do navegador ou do Windows, preservando 100% dos layouts HTML/CSS/Tailwind existentes para Pedido de Venda, Recibo e DANFE NF-e/NFC-e na Epson EcoTank L3250.
- **Estrutura Implementada:**
  - `desktop-print-agent/`: Agente local em Node.js (`127.0.0.1:40405`), headless Chromium via Playwright com `domcontentloaded` instantâneo, envio ao Spooler via `pdf-to-printer`, fila assíncrona, idempotência e `start-agent.bat`.
  - `erp/src/pages/utils/printing/`: Módulo cliente no ERP com `printAgentClient.ts`, `printHtmlBuilder.ts` (renderização em memória via `renderToStaticMarkup` com zero iframes e zero timeouts), `printFallbackHandler.ts` e `printService.ts`.
  - Integrações: `actionsMap['PRINT_SHIPPING_ORDER']` e `actionsMap['PRINT_RECEIPT']` em `orderActionsConfig.ts` e modais pós-venda, e `openDanfePrintWindow` em `danfeGenerator.ts`.
  - Separação estrita de fluxos: Fluxo Direto (sem abas, sem `window.print()`, sem popups, direto pro spooler) × Fluxo Convencional (contingência isolada).
  - Validação Real: Executado via DevTools no navegador em `http://localhost:5173/sales-order` nos botões "IMPRIMIR RECIBO" e "IMPRIMIR PEDIDO":
    - Spooler da Epson L3250 Series recebeu ambos com sucesso (`sent_to_spooler`).
    - Exibidos toasts: "Recibo enviado para EPSON L3250." e "Pedido enviado para EPSON L3250."
    - Zero abas abertas e zero caixas de diálogo do Chrome.
- **Validação:** 7 testes unitários Vitest 100% aprovados, build do agente Node.js e TypeScript do ERP íntegros.

---

## 0. Modularização Arquitetural de `danfeGenerator.ts`
- **Status:** Concluído com Sucesso! 📄🏛️
- **Arquitetura (`erp/src/pages/utils/nfe/danfe/`):**
  - `danfe.types.ts`: Interface `DanfeData`.
  - `danfeRecipient.ts`: Bloco 3: Destinatário / Remetente.
  - `danfeTaxesAndTotals.ts`: Blocos 4 e 5: Fatura/Duplicatas e Cálculo do Imposto.
  - `danfeTransport.ts`: Bloco 6: Transportador e Volumes.
  - `danfeAdditionalInfo.ts`: Bloco 8: Informações Complementares e Fisco.
  - `danfeHeader.ts`, `danfeItemsTable.ts`, `danfeStyles.ts`: Blocos 1, 2 e 7 preservados.
  - `index.ts`: Barrel consolidado.
  - `danfeGenerator.ts`: Fachada orquestradora limpa reexportando `generateDanfeHtml`, `openDanfePrintWindow` e `DanfeData` com zero quebra de imports.
- **Validação:** Testes unitários focados 100% aprovados (`danfeGeneratorModules.test.ts` e `nfeModules.test.ts`).

---

## 0. Modularização Arquitetural de `orderMutationService.ts`
- **Status:** Concluído com Sucesso! 🏗️✨
- **Arquitetura (`erp/src/pages/utils/orderMutation/`):**
  - `orderCrmSyncService.ts`: Cadastro e sincronização de clientes no CRM.
  - `orderNotificationDispatcher.ts`: Notificações de criação, montagens, alterações e cancelamento.
  - `orderItemStockReconciliation.ts`: Conciliação de estoque de produtos temporários e saídas pendentes.
  - `orderStatusWorkflowService.ts`: Histórico de status, cancelamentos, devoluções e saídas automáticas.
  - `orderCreationService.ts`: Orquestração de `saveOrder`.
  - `orderUpdateService.ts`: Orquestração de `updateOrder`.
  - `orderMutationService.ts`: Fachada limpa (< 25 linhas) com 100% de retrocompatibilidade.
- **Validação:** Testes unitários focados 100% aprovados.

---

## 0. Ação "Desfazer Atendido" no Menu de 3 Pontinhos do Card de Pedido de Venda
- **Status:** Concluído com Sucesso! 🔄📦
- **Objetivo:** Permitir reverter pedidos marcados como `fulfilled` (Atendido) por engano de volta para `scheduled` (Agendado).
- **Regras:**
  - Estoque intacto: a saída de estoque da venda agendada permanece a mesma (não estorna nem refaz saída ao desfazer atendido).
  - Venda atendida não pode ser cancelada diretamente. O fluxo correto é desfazer atendido (volta para agendado) e aí sim acionar "Cancelar venda".
  - Opção aparece exclusivamente para pedidos com status `fulfilled` (vendas e showroom; devoluções bloqueadas).
- **Arquivos:**
  - `erp/src/pages/utils/orderStatusTransitionRules.ts` (`canUndoFulfillment`).
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/UndoFulfillmentModal.tsx` (modal com acessibilidade, texto e botões especificados).
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/UndoFulfillmentButton.tsx` (botão com ícone `bi-arrow-counterclockwise` e separador).
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderMenuActiveActions.tsx` (integração no menu).
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts` (toast "Pedido retornado para Agendado com sucesso." e refresh).
  - Testes: `orderStatusTransitionRules.test.ts` (15 testes) e `undoFulfillmentRules.test.ts` (5 testes).

---

## 0. Correção Definitiva de Erro 22008 em Devolução (Data fora de faixa)
- **Status:** Concluído com Sucesso! 🛠️✅
- **Causa Raiz:** `ReturnOrderModal.tsx`, `OrderActions/Index.tsx` e `PdvActions/Index.tsx` atribuíam `dateNow()`, gravando `order.date` no formato `DD/MM/YYYY` (`24/09/2026`). O trigger `orders_dashboard_metrics_refresh` e a rotina `refresh_dashboard_metric_day` no PostgreSQL executavam cast direto `::timestamptz`, falhando com código `22008` (mês 24 fora de faixa).
- **Ações:**
  1. Frontend: Datas de pedido de devolução alteradas para timestamp ISO (`new Date().toISOString()`).
  2. Frontend: `buildOrderPersistencePayload` higieniza e converte formatos `DD/MM/YYYY` para `YYYY-MM-DD` / ISO.
  3. PostgreSQL: Migration `20260924154500_safe_dashboard_metrics_date_parsing.sql` cria `parse_order_metric_date` com suporte nativo a datas ISO e brasileiras (`to_date`) e fallback seguro. Aplicada no banco.
  4. Testes: Suíte focada `orderSnapshotResolution.test.ts` e `orderLifecycleOperations.undoReturn.test.ts` 100% aprovada.

---

## 1. Modularização e Limpeza de Arquivos Críticos de Estoque

### 1.1 `mobile/src/services/stockService.ts`
- **Diagnóstico:** Arquivo com mais de 1300 linhas agrupando movimentações de estoque, fornecedores, NF-e de entrada, XML parser, reconciliação, SEFAZ direto e inventário.
- **Plano de Modularização:**
  - Extrair para `mobile/src/services/stock/`:
    - `stockMovesService.ts`: Movimentações e fornecedores (`fetchStockMoves`, `fetchSuppliers`).
    - `stockInvoiceService.ts`: Gestão de notas fiscais de entrada, vínculos com produtos e aprovação.
    - `stockSefazService.ts`: Consulta de status SEFAZ, chamadas à Edge Function e consulta de chave pontual.
    - `stockInventoryService.ts`: Sessões de inventário, numeração sequencial, recálculo de saldo (`recalculateInventoryAuditBalance`), estorno e rascunhos.
  - Manter `mobile/src/services/stockService.ts` como Barrel reexportador para garantir 100% de retrocompatibilidade com zero quebra de imports.

### 1.2 `erp/src/pages/App/Stock/Inventory/InventoryAudit.tsx`
- **Diagnóstico:** Arquivo com mais de 400 linhas contendo o card, tabela de sessões, menu de opções flutuante, modal de confirmação de estorno e hook de orquestração no mesmo arquivo.
- **Plano de Modularização:**
  - `components/InventorySessionStatusBadge.tsx`: Badges de status da contagem e status de ajuste (`PENDENTE`, `LANÇADO`, `ESTORNADO`).
  - `components/InventorySessionOptionsMenu.tsx`: Menu contextual flutuante de ações da sessão de inventário.
  - `modals/InventoryReversalConfirmModal.tsx`: Diálogo modal de confirmação para estornar ou reaplicar ajustes.
  - `hooks/useInventoryAuditSessions.ts`: Orquestração de subscrição e mapeamento de sessões e movimentos de ajuste.
  - `InventoryAudit.tsx`: Orquestrador limpo e declarativo (< 100 linhas).

### 1.3 `mobile/src/features/stock/inventory/screens/InventoryOperationScreen.tsx`
- **Diagnóstico:** Arquivo com quase 400 linhas misturando o card de produto com contador manual, a barra de busca e chips de filtro, cabeçalho com barra de progresso, rodapé e modais.
- **Plano de Modularização:**
  - `components/InventoryOperationHeader.tsx`: Cabeçalho de progresso, título e botão de scanner.
  - `components/InventoryOperationFilterBar.tsx`: Barra de busca e chips de filtro de itens ('all', 'uncounted', etc.).
  - `components/InventoryOperationItemCard.tsx`: Card de contagem manual com botões `+` e `-`, input direto e cálculo visual de diferença.
  - `components/InventoryOperationFooter.tsx`: Rodapé com botão de voltar etapa e botão de Revisão.
  - `InventoryOperationScreen.tsx`: Tela enxuta orquestrando o fluxo (< 120 linhas).

---

## 3. Paridade Completa de Inventário (ERP Web × App Mobile)
- **Status:** Concluído com Sucesso! 📋✨
- **Ações Implementadas:**
  - Card de inventário com clique direto para retomar contagem ou ver detalhes (`onPress`).
  - Toggle de "Contagem Cega" (`blindCount`) no formulário de escopo do aplicativo.
  - Botão dedicado de "Salvar como rascunho" na barra inferior de contagem física.
  - Alerta de itens não contados e conformidade sem divergências na tela de revisão final.
  - Badge informativa de itens não contados no modal de detalhes.
  - 6 testes unitários em `inventoryParity.test.ts` e compilação TypeScript 100% íntegra.

---

## 4. Próximas Ideias Registradas
- Sincronização automática contínua de DF-e via cron/pg_cron no backend do Supabase em background de hora em hora.
- Auditoria periódica de divergências de estoque por curva ABC no app mobile com alertas inteligentes.
