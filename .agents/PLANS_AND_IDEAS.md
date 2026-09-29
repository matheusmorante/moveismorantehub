# Planos e Ideias Pendentes - Morante Hub

Este documento registra ideias, planos arquiteturais e melhorias planejadas para posterior consulta e lembrete.

---

## 2. Modos de Inventário e Bloqueio de Origem Salvados e Usados (ERP & Mobile)
- **Status:** Concluído e Validado! 📦📋✨
- **Data:** 29/09/2026
- **Contexto:**
  - O usuário solicitou ajuste nos modos de inventário:
    1. Renomear o modo "Estoque Completo" para: `"Estoque Completo: Etapas por Fornecedor"`.
    2. Remover o modo independente "Por Fornecedor", mantendo exclusivamente:
       - `Estoque Completo: Etapas por Fornecedor` (full)
       - `Seleção Personalizada` (custom)
    3. Bloquear seleção e contagem de produtos e fornecedores de origem `salvado` e `usado` em ambos os modos (pois salvados e usados não participam do inventário de rotina de estoque novo).
- **Ações Executadas:**
  1. **ERP Web:**
     - `InventoryScopeTypeSelector.tsx`: atualizado título do modo completo e removida opção individual de fornecedor.
     - `offlineInventoryCatalog.ts`: adicionado campo `product_kind` e filtragem para ignorar `product_kind === 'salvado' || product_kind === 'usado'` tanto no escopo quanto no scanner/match de código de barras.
     - `InventoryProductSearchModal.tsx`: filtrados produtos salvados/usados na listagem de busca avulsa.
  2. **Mobile:**
     - `InventoryScopeTypeSelector.tsx`: renomeado modo completo para "Estoque Completo: Etapas por Fornecedor", removida seleção colapsável de fornecedor e limpos imports/estados órfãos.
     - `InventoryScopeTypeSelector.test.tsx`: atualizado teste unitário validando a nova nomenclatura e ausência do modo removido.
     - `offlineInventoryCatalog.ts`: adicionado `product_kind` à sincronização offline e filtrado no escopo e no scanner/match para ignorar salvados e usados.
     - `InventoryProductSearchModal.tsx`: integrado ao catálogo offline filtrado.

---

## 1. Módulo de Indisponibilidades de Estoque: Refatoração de UX (ERP) e Replicação no Mobile
- **Status:** Concluído e Validado! 📦📱🎉
- **Data:** 29/09/2026
- **Contexto:**
  - O usuário relatou que a tela de indisponibilidades no ERP exibia a mensagem "Nenhuma indisponibilidade encontrada." como se fosse um erro de sistema ou busca que falhou, mesmo sem nenhuma indisponibilidade criada pelo usuário (o que representa o estado ideal e regular do estoque).
  - O aplicativo Mobile ainda não possuía a tela nem o serviço de indisponibilidades implementados.
   - Solicitação posterior do usuário:
     1. Remoção do campo "Local Físico" do formulário de indisponibilidade, fixando o valor padrão "Depósito" no ERP e no Mobile.
     2. Desativação prévia dos campos (quantidade, motivo, tratativa, fornecedor, observação) até que o produto/variação seja selecionado.
     3. Campo de fornecedor renomeado para "Fornecedor Alvo *" e exibido exclusivamente quando a tratativa for "Devolução ao fornecedor".
     4. Restrição estrita de fornecedores: apenas fornecedores vinculados ao produto escolhido (`supplier_id`, `main_supplier_id`, `supplier_ids`) são listados nas opções.
- **Ações Planejadas & Executadas:**
  1. **ERP Web (`erp/src/pages/App/Stock/Unavailabilities/`):**
     - Substituição da mensagem crua da tabela por um Empty State visual amigável e profissional quando a tabela estiver vazia ("Nenhuma indisponibilidade registrada - O estoque está sem bloqueios ou avarias").
     - Diferenciação entre "estoque sem indisponibilidades" (estado positivo normal) e "nenhum registro para os filtros selecionados" (com botão de limpar filtros).
     - Ocultação da barra de paginação quando `totalCount === 0`.
     - Tratamento seguro de parâmetro `:id` no roteador para evitar falsos toasts de erro.
     - Remoção do campo "Local Físico" no modal de cadastro, fixando o envio automático de 'Depósito' para o backend.
     - Campos desativados (`disabled={!selectedVariation || isLoading}`) até a seleção da variação do produto.
     - Campo renomeado para "Fornecedor Alvo *" e condicionado estritamente à tratativa de devolução, filtrando apenas fornecedores associados ao produto.
     - 7 testes unitários do Vitest 100% aprovados sem qualquer erro ou warning.
  2. **Mobile (`mobile/src/features/stock/unavailabilities/` e `mobile/src/services/stock/stockUnavailabilitiesService.ts`):**
     - Replicação completa do módulo no aplicativo React Native, seguindo rigorosamente a skill `erp-web-to-mobile-replication`.
     - Serviço Supabase reutilizando os mesmos contratos, queries e RPCs transacionais (`create_stock_unavailability` e `undo_stock_unavailability`).
     - Telas e componentes nativos: `UnavailabilitiesScreen`, `UnavailabilityCard`, `UnavailabilityFilters`, `UnavailabilityEmptyState` e modal de cadastro `UnavailabilityFormModal`.
     - Campo "Local Físico" removido do modal mobile, mantendo envio de 'Depósito' padrão.
     - Campos dependentes bloqueados (`editable={!isFieldsDisabled}`, `disabled={isFieldsDisabled}` com opacidade visual) até seleção do produto.
     - Campo renomeado para "Fornecedor Alvo *", condicionado a "Devolução ao fornecedor" e filtrando fornecedores vinculados ao produto selecionado com feedback caso o produto não tenha fornecedor cadastrado.
     - Integração na barra de abas de Estoque (`NativeStockScreen.tsx`) com chave `unavailabilities` e preservação dos atalhos de navegação.
     - Validação estática de TypeScript sem nenhum erro no módulo.
  3. **Modularização Arquitetural e Organização de Arquivos (`modularizacao_codigo` e `organizacao-arquivos-diretorios`):**
     - **Separação de Camadas (UI vs Application/Hooks vs Infra/Services)**:
       - No ERP, os estados e regras foram extraídos para o custom hook `hooks/useUnavailabilityForm.ts`.
       - A consulta de fornecedores foi isolada em `services/unavailabilitySupplierService.ts`.
       - Tipos TypeScript estritos e enums foram definidos em `types/unavailabilityForm.types.ts` sem nenhum `any`.
       - O componente visual foi movido para `modals/UnavailabilityFormModal.tsx` com padrão visual de borda apenas embaixo (`border-b-2`) e acessibilidade completa.
       - A raiz de `Unavailabilities/` mantém um proxy reexportador (`UnavailabilityFormModal.tsx`) para preservar 100% dos imports existentes sem regressão.
       - No Mobile, o hook dedicado `hooks/useMobileUnavailabilityForm.ts` desacoplou lógica de busca de produtos/fornecedores e validações, deixando o modal de apresentação puramente declarativo.

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

---

## 4. Gestão de Builds e Ciclo de Cota do EAS (Expo)
- **Status:** Monitorado / Cota Gratuita Mensal Esgotada ⏳📲
- **Data:** 29/09/2026
- **Contexto:**
  - O EAS Build rejeitou nova compilação nativa de Android informando que as builds gratuitas da conta `@morante` do plano Free se esgotaram neste ciclo.
  - **Previsão de Reset:** Quinta-feira, 01/10/2026 (em aproximadamente 1 dia e 9 horas).
  - **Alternativa e Continuidade:** O canal de **Updates OTA (`eas update`)** continua 100% operacional e sem custos, permitindo publicar ajustes de telas, regras de negócio e correções visuais sem necessidade de compilação nativa até a virada do mês.
- **Resolução do Erro checkForUpdateAsync (29/09/2026):**
  - O APK compilado sem a flag `channel` explícita no AndroidManifest recorre ao canal padrão (`default`).
  - O canal `default` não existia no projeto EAS da nuvem, fazendo o servidor responder com status 404 para o app instalado, disparando a rejeição `'expo-updates:checkForUpdateAsync was rejected'`.
  - Canal `default` criado no EAS e vinculado diretamente à branch `production` com `runtimeVersion 1.6.0`, normalizando as respostas para 200 OK tanto em `production` quanto em `default`.

---

## 5. Próximas Ideias Registradas
- Sincronização automática contínua de DF-e via cron/pg_cron no backend do Supabase em background de hora em hora.
- Auditoria periódica de divergências de estoque por curva ABC no app mobile com alertas inteligentes.
