# Ideias e Planos Pendentes — Morante Hub

Este arquivo centraliza planos, ideias e tarefas pendentes do projeto Morante Hub para posterior consulta e continuidade, evitando esquecimento e garantindo rastreabilidade.

---

## 0. Persistência de Impressoras por Computador Físico (`C:\ProgramData\MoranteHub\print-config.json`)
- **Status**: Concluído e Validado no Windows! 🏢💻🖨️
- **Data**: 24/09/2026
- **Arquitetura Implementada**:
  1. **Arquivo Físico Machine-Level (`C:\ProgramData\MoranteHub\print-config.json`)**:
     - Cada computador/terminal físico grava sua própria configuração de hardware independente do usuário do ERP ou do perfil do Windows.
     - Mesmo com o mesmo operador logado em máquinas diferentes (Ex: Caixa vs Escritório), cada máquina mantém suas próprias impressoras sem conflito.
     - Estrutura gravada:
       ```json
       {
         "defaultPrinter": "EPSON L3250 Series",
         "orderPrinter": "",
         "receiptPrinter": "",
         "danfePrinter": "",
         "orderQuality": "normal",
         "receiptQuality": "draft",
         "danfeQuality": "normal",
         "orderScale": 0.92,
         "receiptScale": 1.0,
         "danfeScale": 1.0
       }
       ```
  2. **Endpoints no Print Agent (`127.0.0.1:40405`)**:
     - `GET /config`: lê `C:\ProgramData\MoranteHub\print-config.json` e retorna o estado atual e o path do arquivo.
     - `PUT /config` / `POST /config`: atualiza e persiste atomicamente as alterações daquela máquina física.
     - `resolvePrinterForDocument`: resolve a impressora física para Pedido, Recibo ou DANFE priorizando as configurações da máquina física e caindo para a impressora padrão.
  3. **Interface do ERP ([`PrintConfigSection.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Settings/components/operations/PrintConfigSection.tsx))**:
     - Selo verde: `✓ Configuração salva somente neste computador`.
     - Exibição do caminho exato do arquivo local: `C:\ProgramData\MoranteHub\print-config.json`.
     - Dropdowns independentes para: Impressora Padrão, Pedido, Recibo e DANFE (com opção `[ Usar impressora padrão ]`).
     - Controles de velocidade/qualidade (Rascunho ~2s, Padrão ~5s, Alta ~20s).
  4. **Suíte de Testes (11/11 aprovados)**:
     - 100% de isolamento e blindagem sem toques no spooler físico.

---

## 0. Impressão Direta e Automática no ERP Windows (Epson EcoTank L3250)
- **Status**: Concluído e Validado no Spooler da Epson L3250! 🖨️⚡🎉
- **Data**: 24/09/2026
- **Objetivo**: Sistema de impressão direta, sem abrir caixas de diálogo do navegador ou do Windows, 100% gratuito e open-source, mantendo a integridade absoluta dos layouts HTML/CSS/Tailwind existentes para Pedido de Venda, Recibo e DANFE NF-e/NFC-e.
- **Arquitetura Implementada**:
  1. **Agente Local Windows (`desktop-print-agent/`)**:
     - Servidor HTTP leve em Node.js (`127.0.0.1:40405`).
     - Renderizador headless via Playwright Chromium (`playwright-core`) com presets e escala proporcional (Pedido: 92% A4; Recibo e DANFE: 100% A4), utilizando `domcontentloaded` para geração instantânea sem bloqueio de rede.
     - Envio silencioso ao Spooler do Windows via utilitário nativo (`pdf-to-printer`) com detecção automática da impressora padrão (`EPSON L3250 Series` na porta `USB001`).
     - Controle de concorrência com fila, idempotência por `printJobId` e limpeza imediata de arquivos temporários de spool.
     - Script de inicialização rápida em 1 clique: `desktop-print-agent/start-agent.bat`.
  2. **Camada Cliente no ERP (`erp/src/pages/utils/printing/`)**:
     - `printAgentClient.ts`: Cliente HTTP com timeouts defensivos, healthcheck, listagem de impressoras e presets.
     - `printHtmlBuilder.ts`: Geração ultrarrápida do HTML estático em memória via `renderToStaticMarkup` (`ReceiptPrintDocument` e `OrderPrintDocument`) com injeção automática de todas as classes CSS/Tailwind e tag `<base href>`, eliminando iframes, requisições de rede lentas e risco de timeouts.
     - `printFallbackHandler.ts`: Fallback transparente para o navegador caso o operador opte explicitamente pela impressão convencional.
     - `printService.ts`: Orquestrador com isolamento estrito: fluxo direto (sem popups, sem `window.print()`, sem abas) e fluxo convencional separado.
  3. **Integrações de Documentos**:
     - **Recibo de Venda**: Conectado à ação `PRINT_RECEIPT` em `orderActionsConfig.ts` e modal de pós-venda.
     - **Pedido de Venda**: Conectado à ação `PRINT_SHIPPING_ORDER` em `orderActionsConfig.ts` e modal de pós-venda.
     - **DANFE (NF-e / NFC-e)**: Conectado a `openDanfePrintWindow` em `danfeGenerator.ts`.
  4. **Painel de Configuração e Diagnóstico**:
     - Aba de configurações em `erp/src/pages/App/Settings/` (`PrintConfigSection.tsx`).
     - Monitoramento em tempo real do status do agente, seleção de impressora e botão de página de teste.
- **Validação Prática Ponta a Ponta**:
  - Testado via Chrome DevTools MCP no ERP real (`http://localhost:5173/sales-order`).
  - Clique em **"IMPRIMIR RECIBO"**:
    - Zero novas abas abertas (permanecendo 1 única aba).
    - Zero chamadas a `window.print()` e zero janelas de preview do Chrome.
    - Log do Agente: `[RECEIPT] #job_receipt_... -> EPSON L3250 Series [sent_to_spooler]` em 4s.
    - Toast no ERP: *"Recibo enviado para EPSON L3250."*
  - Clique em **"IMPRIMIR PEDIDO"**:
    - Zero novas abas abertas.
    - Zero chamadas a `window.print()` e zero janelas de preview do Chrome.
    - Log do Agente: `[SALES_ORDER] #job_order_... -> EPSON L3250 Series [sent_to_spooler]` em 3s.
    - Toast no ERP: *"Pedido enviado para EPSON L3250."*
  - Testes unitários com Vitest (7 testes) 100% aprovados.

---

## 0. Modularização e Organização de Arquivos: `danfeGenerator.ts`
- **Status**: Concluído com Sucesso! 📄🏛️
- **Data**: 24/09/2026
- **Skills e Diretrizes**: `principios-de-programacao` (SOLID, Responsabilidade Única, código limpo, meta 30–100 linhas), `organizacao-arquivos-diretorios` (subpastas semânticas, zero perda de lógica).
- **Diagnóstico Inicial**:
  - `danfeGenerator.ts` possuía cerca de 350 linhas acumulando a geração procedural de todos os blocos do DANFE oficial A4 Retrato (MOC 7.0 Anexo II).
- **Estrutura Modular Implementada (`erp/src/pages/utils/nfe/danfe/`)**:
  1. `danfe.types.ts` (~15 linhas): Interface `DanfeData`.
  2. `danfeRecipient.ts` (~75 linhas): Bloco 3: Destinatário / Remetente (`buildDanfeRecipientOfficialHtml`).
  3. `danfeTaxesAndTotals.ts` (~80 linhas): Blocos 4 e 5: Fatura/Duplicatas e Cálculo do Imposto (`buildDanfeTaxesAndTotalsOfficialHtml`).
  4. `danfeTransport.ts` (~60 linhas): Bloco 6: Transportador e Volumes Transportados (`buildDanfeTransportOfficialHtml`).
  5. `danfeAdditionalInfo.ts` (~40 linhas): Bloco 8: Informações Complementares e Reservado ao Fisco (`buildDanfeAdditionalInfoOfficialHtml`).
  6. `danfeHeader.ts` & `danfeItemsTable.ts` & `danfeStyles.ts`: Blocos 1, 2 e 7 já coesos preservados.
  7. `index.ts`: Barrel consolidado.
  8. `danfeGenerator.ts` (~100 linhas): Orquestrador declarativo elegante reexportando `generateDanfeHtml`, `openDanfePrintWindow` e `DanfeData` com zero quebra de imports.
- **Validação**: Testes unitários focados (`danfeGeneratorModules.test.ts` e `nfeModules.test.ts`) 100% aprovados.

---

## 0. Modularização e Organização de Arquivos: `orderMutationService.ts`
- **Status**: Concluído com Sucesso! 🏗️✨
- **Data**: 24/09/2026
- **Skills e Diretrizes**: `principios-de-programacao` (SOLID, Responsabilidade Única, 30–100 linhas), `organizacao-arquivos-diretorios` (Zero perda de lógica, Barrels reexportadores).
- **Diagnóstico Inicial**:
  - `orderMutationService.ts` possuía mais de 530 linhas acumulando criação, atualização, regras transacionais, CRM, notificações push, conciliação de estoque de produtos temporários e controle de status.
- **Estrutura Modular Implementada (`erp/src/pages/utils/orderMutation/`)**:
  1. `orderCrmSyncService.ts` (~50 linhas): Resolução e cadastro prévio de clientes novos no CRM (`ensureCustomerInCrm`) e sincronização em segundo plano (`syncCustomerToCrmBackground`).
  2. `orderNotificationDispatcher.ts` (~65 linhas): Notificações push de vendas, montagens, alterações e cancelamento de pedidos.
  3. `orderItemStockReconciliation.ts` (~85 linhas): Conciliação de produtos temporários conciliados, estorno de itens alterados, verificação de saídas ausentes no banco (`inventory_moves`) e flags de baixa parcial (`isPartialStockProcessed`).
  4. `orderStatusWorkflowService.ts` (~120 linhas): Registro em `order_status_history`, estorno de cancelamento via `cancelInventoryMovesByRelatedEntity`, entrada de devolução atendida via `processReturnInventoryEntries` e saídas automáticas de estoque.
  5. `orderCreationService.ts` (~95 linhas): Caso de uso isolado para criação atômica e sequencial de pedidos (`executeSaveOrder`).
  6. `orderUpdateService.ts` (~100 linhas): Caso de uso isolado para atualização transacional atômica de pedidos (`executeUpdateOrder`).
  7. `index.ts` & Fachada `orderMutationService.ts` (~25 linhas): Fachada limpa mantendo 100% de retrocompatibilidade com todos os importadores diretos e indiretos (`orderHistoryService`).
- **Validação**: Testes unitários (`orderMutationModules.test.ts`, `undoFulfillmentRules.test.ts`, `orderStatusTransitionRules.test.ts`, `duplicateOrder.test.ts`, `orderSnapshotResolution.test.ts`) 100% aprovados.

---

## 0. Ação "Desfazer Atendido" no Menu de 3 Pontinhos do Card de Pedido de Venda
- **Status**: Concluído com Sucesso! 🔄📦
- **Data**: 24/09/2026
- **Objetivo**: Permitir corrigir casos em que um pedido de venda foi marcado como **Atendido** (`fulfilled`) por engano, restaurando-o para **Agendado** (`scheduled`) para que possa ser reagendado ou subsequentemente cancelado.
- **Regra de Negócio & Integridade de Estoque**:
  - No status **Agendado**, a saída de estoque da venda já foi lançada.
  - Ao transicionar de **Agendado** para **Atendido**, a movimentação de estoque permanece idêntica.
  - Ao **Desfazer Atendido** (voltar para **Agendado**), as movimentações de estoque **NÃO** são alteradas (sem estorno e sem nova saída).
  - Caso o usuário queira cancelar a venda, o fluxo canônico é:
    1. Acionar **Desfazer Atendido** → status volta para **Agendado**.
    2. No status **Agendado**, o menu de 3 pontinhos libera a opção **Cancelar venda** → onde aí sim é executado o cancelamento com estorno seguro de estoque.
- **Implementações**:
  1. **Regra de Transição (`orderStatusTransitionRules.ts`)**:
     - `canUndoFulfillment`: Refinado para autorizar exclusivamente pedidos com status `fulfilled` (vendas e showroom) e bloquear devoluções.
  2. **Modal de Confirmação (`UndoFulfillmentModal.tsx`)**:
     - Título: *"Desfazer status de atendido?"*
     - Mensagem: *"O pedido voltará para o status Agendado. As movimentações de estoque não serão alteradas."*
     - Botões *"Cancelar"* e *"Confirmar"*, com suporte a ESC, overlay de fechamento e renderização em portal (`document.body`).
  3. **Botão Modular (`UndoFulfillmentButton.tsx`)**:
     - Renderizado condicionalmente via `canUndoFulfillment` no menu de 3 pontinhos (`OrderMenuActiveActions.tsx`).
     - Ícone `bi bi-arrow-counterclockwise` e tipografia padronizada em tom âmbar.
  4. **Feedback & Ciclo de Vida (`useOrderHistoryOperations.ts`)**:
     - Toast de sucesso dedicado: *"Pedido retornado para Agendado com sucesso."*
     - Disparo de `refresh()` imediato para recarregar o pedido e atualizar as opções do menu no card.
     - Histórico registrado na tabela `order_status_history` via `orderMutationService`.
  5. **Cobertura de Testes**:
     - 15 testes em `orderStatusTransitionRules.test.ts` e 5 testes em `undoFulfillmentRules.test.ts` (100% aprovados).

---

## 0. Correção de Erro 22008 ao Gerar Devolução (Data fora de faixa: "24/09/2026")
- **Status**: Concluído com Sucesso! 🛠️✅
- **Data**: 24/09/2026
- **Causa Raiz Identificada**:
  - No `ReturnOrderModal.tsx`, a data do pedido de devolução estava sendo preenchida com `dateNow()`, que retornava a data no formato brasileiro `"24/09/2026"` (`DD/MM/YYYY`).
  - O mesmo ocorria ao disparar ações em `OrderActions/Index.tsx` e `PdvActions/Index.tsx` onde `order.date` era sobrescrito por `dateNow()`.
  - Ao persistir o pedido no PostgreSQL, o trigger `orders_dashboard_metrics_refresh` e a função `refresh_dashboard_metric_day` executavam um cast direto `(new.order_data->>'date')::timestamptz`. Como o Postgres usa datestyle ISO (`YYYY-MM-DD` / `MM/DD/YYYY`), o dia 24 foi interpretado como mês inválido, disparando `ERROR 22008: date/time field value out of range: "24/09/2026"`.
- **Correções Aplicadas**:
  1. **Frontend (`ReturnOrderModal.tsx`, `OrderActions/Index.tsx`, `PdvActions/Index.tsx`)**:
     - `ReturnOrderModal.tsx`: Substituído `dateNow()` por `new Date().toISOString()`.
     - `OrderActions/Index.tsx` e `PdvActions/Index.tsx`: Preservada a data real do pedido `order.date || new Date().toISOString()`.
  2. **Normalização em `orderSnapshotResolution.ts`**:
     - `buildOrderPersistencePayload`: Higieniza `scheduled_date` e `order_data.date`, convertendo qualquer data `DD/MM/YYYY` para `YYYY-MM-DD` / ISO válido antes do envio ao Supabase.
  3. **Backend / PostgreSQL (Migration `20260924154500_safe_dashboard_metrics_date_parsing.sql`)**:
     - Criada a função `public.parse_order_metric_date(raw_date text, fallback_date timestamptz)` que faz o parse seguro tanto de formato ISO quanto de formato brasileiro (`DD/MM/YYYY`) com `to_date`, protegida por bloco `EXCEPTION` com fallback para `created_at`.
     - Atualizados o trigger `refresh_dashboard_metrics_trigger` e a rotina `refresh_dashboard_metric_day`.
     - Migration aplicada diretamente no banco de dados do Supabase.
- **Validação**: Testes unitários focados (`orderSnapshotResolution.test.ts` e `orderLifecycleOperations.undoReturn.test.ts`) 100% aprovados.

---

## 0. Auditoria e Paridade Completa de Inventário (ERP Web × App Mobile)
- **Status**: Concluído com Sucesso! 📋✨
- **Data**: 24/09/2026
- **Skills e Diretrizes**: `erp-web-to-mobile-replication`, `regras-de-negocio-erp`, `principios-de-programacao`
- **Itens Auditados e Corrigidos**:
  1. **Lista de Inventários (`InventoryCard.tsx` e `InventoryScreen.tsx`)**:
     - *Divergência*: No ERP, clicar em qualquer card abre diretamente a sessão (`onOpen` continua rascunho se `in_progress`, ou abre detalhes se `completed`). No mobile, o card era estático e forçava clicar no menu de 3 pontinhos.
     - *Correção*: Implementado `onPress` no `InventoryCard` redirecionando com 1 toque para continuar a contagem ou visualizar detalhes do inventário.
  2. **Formulário de Escopo (`InventoryScopeScreen.tsx`)**:
     - *Divergência*: No ERP, o operador pode ativar "Contagem Cega" (`blindCount`) para auditar sem viés do saldo do sistema. No mobile, o `blindCount` estava fixo em `false` sem chave de controle para o usuário.
     - *Correção*: Adicionado switch e card visual de "Contagem Cega" com ícone `EyeOff`, permitindo ao usuário alternar livremente o modo cego antes de iniciar a contagem.
  3. **Tela de Operação de Contagem (`InventoryOperationScreen.tsx` e `InventoryOperationFooter.tsx`)**:
     - *Divergência*: No ERP, a barra inferior possui botão dedicado para "Salvar como rascunho" sem sair da tela. No mobile, só era possível salvar rascunho tentando sair da contagem no botão voltar.
     - *Correção*: Adicionado o botão "Salvar rascunho" com ícone `Save` na barra de rodapé (`InventoryOperationFooter`), permitindo salvar o progresso da contagem física em tempo real com feedback instantâneo.
  4. **Tela de Revisão Final (`InventoryReviewScreen.tsx`)**:
     - *Divergência*: No ERP, produtos do escopo sem contagem são destacados com banner em tom âmbar explicando que manterão o saldo intacto, e quando não há divergências um card de conformidade é exibido. No mobile, não havia o card de sucesso e a terminologia dizia "Itens Ignorados".
     - *Correção*: Padronizado com card de aviso de "Itens não contados" e card de sucesso "Nenhuma divergência encontrada! Todos os itens contados batem exatamente com o estoque reconciliado".
  5. **Modal de Detalhes (`InventoryDetailsModal.tsx`)**:
     - *Correção*: Adicionada badge clara "Não contado" para itens que não receberam contagem física, preservando total paridade com o ERP.
  6. **Validação**: 6 testes unitários em `inventoryParity.test.ts` aprovados e zero erros de TypeScript no módulo de inventário.

---

## 0. Ajuste de UI e Espaçamento dos Botões "Hoje" e "Dias Seguintes" (Operações / Logística Mobile)
- **Status**: Concluído com Sucesso! 📱✨
- **Data**: 24/09/2026
- **Arquivo**: [`mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx)
- **Especificações Aplicadas**:
  - **Padding externo (topo)**: 16px
  - **Padding lateral (esquerda/direita)**: 16px
  - **Espaçamento entre botões**: 14px (dentro da faixa 12–16px)
  - **Altura dos botões**: 44px (área de toque mínima recomendada)
  - **Fonte**: 15px semibold/bold
  - **Raio de borda**: 22px nos botões e 26px no container (formato pílula)
  - **Visual**: Container com fundo branco/neutro e borda fina `#e2e8f0`; botão ativo azul `#0055ff` com texto branco e elevação; botão inativo com texto azul e fundo transparente.
- **Validação**: Testes de logística 100% aprovados (31 testes passando).

---

## 0. Modularização Arquitetural e Código Limpo: stockService, InventoryAudit e InventoryOperationScreen
- **Status**: Concluído com Sucesso! 📦✨
- **Data**: 24/09/2026
- **Arquivos Refatorados conforme `modularizacao_codigo` e `organizacao-arquivos-diretorios`**:
  1. **`mobile/src/services/stockService.ts`**:
     - Era um monólito de 1367 linhas misturando notas fiscais, movimentações, fornecedores, recebimentos, inventário e sincronização SEFAZ.
     - Dividido na subpasta modular `mobile/src/services/stock/`:
       - `stockMovesService.ts`: Movimentações de estoque, fornecedores, pedidos de compra e recebimentos.
       - `stockInvoiceService.ts`: Gestão de notas fiscais de entrada, reconciliação e parsing de XML.
       - `stockSefazService.ts`: Chamadas e status do SEFAZ via Edge Function e consulta de chave de acesso.
       - `stockInventoryService.ts`: Sessões de inventário, estornos, rascunhos e recálculo de saldo.
     - `stockService.ts` foi transformado em um Barrel reexportador de 5 linhas com 100% de compatibilidade retroativa.
  2. **`mobile/src/features/stock/inventory/screens/InventoryOperationScreen.tsx`**:
     - Reduzido de 413 linhas para ~120 linhas.
     - Extraídos componentes coesos em `mobile/src/features/stock/inventory/components/`:
       - `InventoryOperationHeader.tsx`: Barra de progresso, botão voltar e scan.
       - `InventoryOperationFilterBar.tsx`: Barra de pesquisa e chips horizontais de filtro.
       - `InventoryOperationItemCard.tsx`: Card de contagem manual com botões `+`/`-`, input direto e modo foco.
       - `InventoryOperationFooter.tsx`: Rodapé com botão de voltar etapa e revisão.
  3. **`erp/src/pages/App/Stock/Inventory/InventoryAudit.tsx`**:
     - Reduzido de 420 linhas para ~140 linhas puramente declarativas.
     - Extraídos:
       - `components/InventoryAuditBadges.tsx`: Badges de status da contagem e de ajustes.
       - `components/InventoryAuditContextMenu.tsx`: Menu contextual flutuante de ações.
       - `hooks/useInventoryAuditSessions.ts`: Orquestração de subscrições em tempo real, estorno e exclusão de rascunhos.
- **Validação**: 100% dos testes unitários de estoque e inventário do ERP e Mobile aprovados (vitest).

---

## 0. Especificações Técnicas: Obrigatórias com Asterisco (*) e Regra Global Antidesperdício
- **Status**: Concluído com Sucesso! 🏷️⚡
- **Data**: 21/09/2026
- **Solicitação**:
  1. No produto pai e variações, exibir o asterisco vermelho (*) de obrigatório em todas as especificações técnicas ativas.
  2. Eliminar dependência do `is_globally_required` do banco, tratando todas as especificações ativas como obrigatórias (`isRequired: true`).
  3. Adicionar regra global no Antigravity contra leituras repetitivas dos mesmos blocos de código e exploração ampla sem necessidade.
- **Implementações Executadas**:
  1. **Regra Global Antigravity ([`C:\Users\Rosilene\.gemini\config\rules\GEMINI.md`](file:///C:/Users/Rosilene/.gemini/config/rules/GEMINI.md))**:
     - Proibição estrita de releituras repetitivas do mesmo arquivo ou mesmos blocos de linhas quando o conteúdo já está no contexto recente.
     - Proibição de exploração preventiva ampla de pastas e diagramas; acesso cirúrgico direto aos arquivos-alvo.
  2. **Regra Local do Workspace ([`.agents/AGENTS.md`](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/AGENTS.md))**:
     - Atualizado com as regras de execução direta sem burocracia e antidesperdício.
  3. **Interface do Produto Pai ([`ProductTechnicalTab.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/components/tabs/ProductTechnicalTab.tsx))**:
     - `isRequired: true` para todas as especificações ativas, garantindo o asterisco vermelho (*) em cada campo.
  4. **Interface da Variação ([`VariationTechnicalTab.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx))**:
     - `isRequired: true` garantindo o asterisco vermelho (*) em todas as especificações ativas.
  5. **Validação no Salvamento do Produto ([`useProductFormSubmit.ts`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/hooks/useProductFormSubmit.ts))**:
     - Valida todas as especificações ativas cadastradas em `attributes` (sem filtrar `is_globally_required`), alinhando 100% com a validação que já existia na variação (`useVariationForm.ts`).
  6. **Testes Unitários**:
     - `variationService.test.ts` e `technicalValuesService.test.ts` executados e 100% aprovados (14 testes passaram).

---

## 0. Correção de TypeError: onPriceChange is not a function na Precificação do Produto
- **Status**: Concluído com Sucesso! 🛠️⚡
- **Data**: 14/09/2026
- **Problema Reportado**:
  - `ProductPricingFields.tsx:89 Uncaught TypeError: onPriceChange is not a function` ao digitar ou alterar preços e descontos no formulário de produtos.
- **Causa Raiz**:
  - Divergência de nomenclatura de props entre o componente pai `ProductFormModal.tsx` e o componente intermediário `ProductInventoryTab.tsx`:
    - `ProductFormModal.tsx` passava `onPriceChange`, `onDiscountPercentChange`, `onDiscountFixedChange`, `onPromoPriceChange`.
    - `ProductInventoryTabProps` declarava e desestruturava `handlePriceChange`, `handleDiscountPercentChange`, `handleDiscountFixedChange`, `handlePromoPriceFieldChange`.
    - Como `handlePriceChange` chegava como `undefined`, `ProductInventoryTab` repassava `undefined` para `ProductPricingFields`. Ao disparar o evento `onChange` do `CurrencyInput`, ocorria o `TypeError`.
- **Implementações Executadas**:
  1. **[`ProductInventoryTab.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/components/tabs/ProductInventoryTab.tsx)**:
     - Aceita tanto a convenção `onPriceChange` quanto `handlePriceChange` (e o mesmo para `onDiscount*` e `onPromoPriceChange`).
     - Resolve via fallback seguro: `finalOnPriceChange = onPriceChange || handlePriceChange || (() => {})`.
  2. **[`ProductPricingFields.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Products/components/tabs/ProductPricingFields.tsx)**:
     - Tornou todos os callbacks opcionais e atribuiu funções vazias `() => {}` como default, prevenindo qualquer quebra por invocação direta caso alguma prop não seja fornecida.
  3. **Validação e Testes**:
     - Bateria completa de testes em `src/pages/App/Products/` executada com sucesso (63 testes aprovados).

---

## 0. Atributo e Valor Obrigatórios no Cadastro de Produtos e Variações
- **Status**: Concluído com Sucesso! 🏷️✅
- **Data**: 14/09/2026
- **Solicitação**: No cadastro de um produto, deve ser obrigatório escolher um atributo e valor para esse atributo; para todo atributo adicionado é obrigatório definir valor a esse atributo.
- **Causas Raízes e Vulnerabilidades Encontradas**:
  1. **Fallback indevido em `hasVariationAttribute`**: Havia um fallback `if (variation.name && variation.name.trim().length > 0) return true;`. Como toda variação recebia um nome gerado automaticamente pelo ERP, o método retornava `true` mesmo quando o array de `attributes` estava vazio ou quando continha atributos com valores em branco.
  2. **Validação permissiva**: O método utilizava `some()` em vez de `every()`, o que permitia variações com 1 atributo preenchido e outros adicionados sem valor.
  3. **Ausência de trava explícita de valores no Modal de Variação**: Ao clicar em "Salvar" no `useVariationForm.ts`, não havia validação bloqueando atributos com `value === ""` nem indicativo visual de erro nos campos correspondentes.
- **Implementações Executadas**:
  1. **Motor Central de Validação (`productVariationDefaults.ts`)**:
     - `hasVariationAttribute`: Agora exige estritamente que existam atributos (`length > 0`) e que **TODOS** possuam tanto nome quanto valor não-vazios (`every(...)`). Removido o fallback enganoso de `variation.name`.
     - `getIncompleteVariationAttributes`: Função que inspeciona cada atributo e aponta especificamente se falta o nome ou o valor (`missing_name` ou `missing_value`).
     - `hasMissingRequiredAttributes`: Retorna `true` se a lista for vazia ou se qualquer variação falhar em `hasVariationAttribute`.
  2. **Formulário de Variação (`useVariationForm.ts` & `VariationIdentificationTab.tsx`)**:
     - Bloqueio no `handleSubmit`: Impede salvar se não houver atributo (`"É obrigatório escolher pelo menos um atributo e definir seu valor para a variação."`) ou se algum atributo estiver sem valor (`"O atributo \"X\" está sem valor. Todo atributo adicionado deve ter seu valor definido."`).
     - Feedback visual imediato: Destaque com borda vermelha e tag `* Obrigatório` / `Defina o valor` caso o usuário adicione o atributo e deixe o valor em branco.
     - Aviso em destaque caso a lista de atributos esteja vazia.
  3. **Listagem e Tabela de Variações (`VariationRow.tsx` & `ProductVariationsTab.tsx`)**:
     - Badge de alerta na linha da variação (`"⚠️ Definir valor do atributo"` ou `"⚠️ Definir atributo e valor"`) indicando ao usuário que a variação precisa de atenção.
     - O botão "Adicionar variação" fica bloqueado até que a Variação 1 possua atributo e valor válidos preenchidos.
  4. **Formulário Principal do Produto (`useProductFormModal.ts`)**:
     - Notificação amigável e precisa ao tentar salvar o produto com atributos pendentes, detalhando o nome do atributo faltante e direcionando para a aba de variações.
  5. **Testes Automatizados (`productVariationDefaults.test.ts`)**:
     - 12 testes unitários cobrindo variações sem atributos, atributos parciais sem valor, sem nome, com múltiplos atributos e compatibilidade de objetos. Todos passaram com 100% de sucesso.

---

## 0. Resiliência Total a Esgotamento de Cota de IA e Abertura do Formulário no Cadastro Rápido
- **Status**: Concluído com Sucesso! 🛡️⚡
- **Data**: 14/09/2026
- **Problema Reportado**:
  1. O formulário de cadastro rápido não estava abrindo (`setIsProductModalOpen(true)` era disparado mas ficava invisível).
  2. Falha HTTP 400 do Supabase na query: `hkoxhourxwlddgsfdgws.supabase.co/rest/v1/products?select=code%2Csku:1`.
  3. Falha HTTP 429 da API Gemini (`model: "gemini-3.5-flash-lite"`, `operation: "catalog_suggest_category"` / `catalog_extract_color`), disparando circuit breaker de IA.
  4. Necessidade de o sistema funcionar 100% manual e sem interrupções quando a cota de qualquer modelo for atingida, alertando com `toast.warn` específico indicando o modelo exato.
- **Causas Raízes Identificadas**:
  1. **Z-Index Stacking Context**: O modal pai `ManageInboundInvoiceMappingsModal.tsx` renderizava com `z-[1000002]`, enquanto `ProductFormModal.tsx` abria via `createPortal` com `z-50`, ficando completamente escondido atrás da tela de conferência de notas.
  2. **Erro 400 no Supabase**: A função `getNextSequentialProductCode` em `productSkuService.ts` tentava `.select('code, sku')` na tabela `products`, mas a coluna `sku` não existe nessa tabela (pertence a `product_variations`), falhando a requisição PostgREST com 400.
  3. **Quebra de Categorias**: `fetchCategories` em `useProductFormModal.ts` esperava `groups.forEach`, mas grupos foram unificados em categorias, lançando `TypeError`.
  4. **Queda em Cascata por 429**: O circuit breaker de IA abria e bloqueava a preparação de itens da nota quando chamadas do Gemini atingiam limite de cota.
- **Implementações Executadas**:
  1. **Correção de Camadas (Z-Index)**:
     - `ProductFormModal.tsx`: Elevado para `z-[1000010]`.
     - Modais filhos (`ProductSaveResultModal`, `CategorySearchModal`, `ProductConversionModal`): Ajustados para `z-[1000020]`.
  2. **Correção da Consulta PostgREST no Supabase**:
     - `productSkuService.ts`: Corrigido para `.select('code')` na tabela `products`.
  3. **Correção em `useProductFormModal.ts`**:
     - `fetchCategories` agora consome com segurança `result?.categories || []` sem referenciar `groups` inexistente.
  4. **Aviso Elegante de Cota de IA no Header do ERP (`AiQuotaHeaderNotice.tsx` & `aiQuotaNotifier.ts`)**:
     - Local: `erp/src/services/aiGateway/aiQuotaNotifier.ts` e `erp/src/components/shared/AiQuotaHeaderNotice.tsx`.
     - Removeu toasts intrusivos/flutuantes a pedido do usuário.
     - Exibe um banner fixo e discreto no topo do Header do ERP indicando o modelo exato que atingiu a cota (ex: `gemini-3.5-flash-lite`, `gemini-3.8-flash`), funcionalidade associada e tranquilizando que o ERP opera 100% manual sem travamento.
     - Suporta fechamento individual por modelo ou dispensa geral ("Fechar avisos").
  5. **Proteção contra Reset Acidental de Campos (`useProductFormModal.ts`)**:
     - O `useEffect` de inicialização rodava com dependência em `initialData` (objeto em memória). Toda vez que ocorria uma validação com erro ou re-renderização do modal pai, o React detectava nova referência e executava `setFormData`, resetando tudo o que havia sido digitado pelo usuário.
     - Implementado controle de sessão com referências (`prevOpenRef` e `loadedProductIdRef`). O formulário agora só é inicializado na transição de abertura (`isOpen = true`) ou troca de produto. Durante o preenchimento ou falha de validação, os dados digitados permanecem intactos.
  6. **Validação Amigável de Preço de Venda**:
     - Substituída a mensagem crua de erro de banco de dados (`null value in column "price" violates not-null constraint`) por uma validação preventiva no formulário e direcionamento suave para a aba "Estoque e Precificação".
  7. **Proteção Total contra Erros nos Serviços de Catálogo**:
     - `aiDirectClient.ts`: Registra o alerta de modelo no Header e propaga erro catalogado sem travar o app.
     - `aiProductCatalogService.ts`: Bloco `try/catch` defensivo em `generateDescription`, `generateProductDescription`, `extractProductColor` e `suggestCategory`, retornando fallbacks limpos.
     - `inboundProductPreparationService.ts`: `extractProductColor` protegido com fallback automático para heurística local de título (`extractColorCandidateFromTitle`).
     - `useProductFormAi.ts`: Suprime toasts de erro intrusivos quando a notificação já está visível no Header.

---

## 0. Skill de Limpeza Segura de Projeto (`limpeza-projeto-segura`)
- **Status**: Concluído e Homologado com Sucesso! 🧹🛡️
- **Data**: 14/09/2026
- **Solicitação**: Criar uma skill de limpeza de projeto para remover arquivos e pastas desnecessários com total segurança (sem risco de apagar código ativo, migrações ou arquivos críticos), reportando métricas precisas em KB/MB e contagem de itens removidos.
- **Implementação Realizada**:
  1. **Documento Canônico da Skill**:
     - Local: `.agents/skills/limpeza-projeto-segura/SKILL.md`.
     - Define os 4 níveis de risco (Nível 1: Lixo/Logs; Nível 2: Builds/Caches; Nível 3: Backups Órfãos; Nível 4: Scratches).
     - Lista rígida de bloqueio (arquivos sagrados): `.git`, `.env*`, `package.json`, `supabase/migrations/`, `docs/`, `.agents/`, etc.
  2. **Motor Executável de Limpeza (`safe_cleanup.js`)**:
     - Local: `.agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js`.
     - Análise estática automática: verifica se arquivos de código candidatos possuem qualquer import ou menção em `erp/src`, `mobile/src` ou `src/` antes de permitir remoção.
     - Suporte a `--dry-run` (modo padrão seguro), `--execute`, `--clean-builds` e `--include-scratch`.
     - Métricas detalhadas: cálculo exato de bytes convertidos para KB e MB, contagem de arquivos e contagem de diretórios.
  3. **Suíte de Testes Automatizados**:
     - Local: `.agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.test.js`.
     - 100% de cobertura e aprovação em testes de proteção de arquivos sagrados, formatação decimal de KB/MB, simulação de dry-run e exclusão real.
  4. **Como Executar**:
     - Simulação (sem apagar nada): `node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --dry-run`
     - Execução da limpeza real: `node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute`
     - Limpeza profunda com builds: `node .agents/skills/limpeza-projeto-segura/scripts/safe_cleanup.js --execute --clean-builds`

---

## 0. Desativação Temporária da Sugestão de Vínculo de Produtos na NF de Entrada
- **Status**: Desativado sob Demanda / Código e Arquitetura Preservados 💤
- **Data**: 14/09/2026
- **Solicitação**: Retirar a sugestão de vínculo de produtos para NF de entrada no momento, mantendo a implementação desativada, sem consumo de cotas de IA nem chamadas de catálogo, preservando 100% da arquitetura construída para futura reativação.
- **Implementação Realizada**:
  1. **Flag Centralizada de Controle (`INBOUND_SUGGESTIONS_FEATURE_ENABLED`)**:
     - Local: `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts`.
     - Definida como `export const INBOUND_SUGGESTIONS_FEATURE_ENABLED = false;`.
     - Desativa o gancho `isSuggestionsActuallyEnabled`, impedindo chamadas à API do Gemini (`gemini-embedding-2` e `gemini-3.8-flash`), buscas no banco e processamento de catálogo em segundo plano.
  2. **Ocultação de Elementos da Interface**:
     - O botão "Sugestão de vínculos" no cabeçalho de itens da NF (`InboundInvoiceItemsReview.tsx`) é condicionado a `INBOUND_SUGGESTIONS_FEATURE_ENABLED && suggestionsEnabled`.
     - Nenhum aviso de erro, loading ou sugestão fantasma é renderizado na tela.
  3. **Preservação de Código e Testes**:
     - Toda a lógica de similaridade híbrida (`inboundHybridProductScorer.ts`, `inboundTextSimilarity.ts`, `inboundEmbeddingService.ts`), batch de sugestões (`aiInboundBatchSuggestions.ts`) e suíte de testes permanecem intactos.
  4. **Como Reativar no Futuro**:
     - Alterar `INBOUND_SUGGESTIONS_FEATURE_ENABLED = true;` em `useInboundInvoiceItemsReview.ts`.
     - Todas as funcionalidades, botões e sugestões automáticas voltarão a operar instantaneamente com o pipeline atualizado de modelos (`gemini-embedding-2` + Top 5 + `gemini-3.8-flash`).

---

## 0. Estratégia de Especialização de Modelos Gemini, Score Híbrido e Telemetria no Dashboard
- **Status**: Planejado / Em Andamento 🧠⚡
- **Data**: 14/09/2026
- **Diretriz**: Separar busca de similaridade e recuperação de geração/raciocínio, eliminando desperdício de cota do Gemini e impedindo novos erros 429.
- **Matriz de Especialização de Modelos**:
  1. **Vinculação de NF-e (Recuperação e Similaridade)**:
     - **Estratégia**: Pipeline em camadas: Fornecedor da NF → Produtos daquele fornecedor → Score Híbrido (`códigoFornecedor` + `similaridadeNome` + `atributos/medidas/cor` + `embedding`) → Top 3 a 5 candidatos.
     - **Vínculo Direto**: Código do fornecedor bateu ou Score > 90% sem ambiguidade = sugestão/vínculo imediato com 0 chamadas de LLM.
     - **Modelo de Embedding**: `gemini-embedding-2` para similaridade semântica e busca vetorial (com cache local por hash/descrição).
     - **Casos Ambíguos**: Apenas quando houver dúvida entre os Top 3 (score 60-85%), invocar `gemini-3.8-flash` (thinking low) enviando estritamente os 3 candidatos (e nunca mais listas de 40 produtos!).
  2. **Classificação Fiscal e Sugestão de NCM**:
     - **Modelo**: `gemini-3.8-flash` com `thinking: 'low'` ou `'medium'`.
     - **Raciocínio Estruturado**: Structured Outputs via JSON Schema rígido (`{ ncm, confidence, reason, needsReview }`).
     - **Autoridade Fiscal Própria**: Se já existir produto similar no ERP com NCM já validado e confirmado, a base do sistema prevalece com 100% de confiança, sem gastar cota de IA.
  3. **Catálogo, Descrições Comerciais e Categorias**:
     - **Modelo**: `gemini-3.5-flash-lite` (US$ 0,30/M in, US$ 2,50/M out).
     - **Funções**: Geração e melhoria de descrições, títulos SEO para marketplaces, extração de cores, sugestão de categoria e resumos de entrega.
  4. **Assistente Conversacional / Agente**:
     - **Modelo**: `gemini-3.8-flash` (thinking low/medium) substituindo `gemini-2.5-flash` legado.
  5. **Telemetria de APIs no Dashboard**:
     - Exibição de cards/tabelas com:
       - Gastos e tokens consumidos agrupados por **Modelo de IA** (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-embedding-2`, `gemini-2.5-flash-image`, `gemini-3.1-flash-tts`).
       - Gastos e consumo agrupados por **Módulo do Sistema** (Estoque/NF-e, Produtos, Financeiro, Marketing, Logística, Vendas).

---

## 0. Modularização de InboundInvoiceItemsReview.tsx e Organização de Pastas em InboundInvoices
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 14/09/2026
- **Solicitação**: Aplicar princípios de codificação das skills (SOLID, Clean Code, responsabilidade única, alvo 30-100/150 linhas) e organização de pastas pais e filhas em `InboundInvoiceItemsReview.tsx`.
- **Implementações Executadas**:
  1. **Decomposição Modular de `InboundInvoiceItemsReview.tsx` (626 → 150 linhas)**:
     - O arquivo original acumulava 626 linhas contendo orquestração de criação de produtos, chamadas à IA de fornecedor, cache de produtos, gerenciamento de 4 modais inline, cálculo de markup e renderização de listas complexas.
     - **Criação do Hook de Aplicação `useInboundInvoiceItemsReview.ts` (~330 linhas)**:
       - Extraída toda a orquestração de negócios: cache de fornecedor, classificação de IA, criação de produto, ações de vínculo (`selectProduct`, `acceptSuggestion`, `removeLink`), controle de fila e estados de modais.
     - **Criação do Componente de Linha `InboundInvoiceItemRow.tsx` (~175 linhas)**:
       - Extraída a renderização isolada de cada linha de item da NF (coluna esquerda de dados fiscais/NF e coluna direita de vínculo, busca e sugestão suave).
     - **Criação de Modais Especializados em `modals/`**:
       - `InboundIndividualProductModal.tsx` (~70 linhas): modal isolado para confirmação de novo cadastro individual e definição de markup.
       - `InboundClassificationModals.tsx` (~150 linhas): modais de feedback e decisão da IA (`isPreparingProduct`, `isClassifying`, `EXISTING_VARIATION`, `NEW_VARIATION_OF_EXISTING_PRODUCT`).
     - **Componente Principal `InboundInvoiceItemsReview.tsx`**:
       - Reduzido para 150 linhas puramente declarativas, orquestrando os componentes especializados.
  2. **Organização e Limpeza de Pastas**:
     - `InboundInvoiceItemCard.tsx`: transformado em proxy de compatibilidade para `InboundInvoiceItemRow.tsx`.
     - `sections/`: pasta vazia não utilizada removida.
  3. **Validação de Regressão**:
     - 100% de aprovação na suíte de testes de InboundInvoices (5 arquivos, 23 testes passando).

---

## 0. Remoção do Carregamento Intrusivo de Sugestão de Vínculo na NF de Entrada
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 14/09/2026
- **Solicitação**: Remover o carregamento de sugestão de produto para vincular; a sugestão deve rodar de forma transparente em background e aparecer silenciosamente ("do nada se achado") enquanto o formulário de NF de entrada estiver aberto.
- **Implementações Executadas**:
  1. **Remoção do Indicador Visual de Carregamento**:
     - Removido o banner amarelo com spinner animado (`Buscando sugestão de vínculo...`) em `InboundInvoiceItemsReview.tsx`.
     - Removida a barra shimmer e o spinner âmbar de `isLoadingSuggestions` no `ProductAutocomplete.tsx` e `InboundInvoiceItemCard.tsx`.
  2. **Exibição Suave e Transparente**:
     - A sugestão agora surge suavemente com transição (`animate-in fade-in slide-in-from-top-1 duration-200`) somente quando encontrada, sem poluir visualmente a tela enquanto processa em segundo plano.
  3. **Desbloqueio do Formulário de NF**:
     - O processamento de sugestões em background (`isProcessingSuggestions`) não bloqueia mais a confirmação da nota fiscal nem os botões do formulário (`onProcessingSuggestionsChange` só bloqueia durante salvamento explícito de vínculo do usuário).
  4. **Validação**:
     - Suíte de testes de `InboundInvoices` e `InboundInvoiceItemsReview` atualizada e 100% aprovada (5 arquivos de teste, 23 testes passando).

---

## 0. Correção da Categorização Indevida como "Aparadores Buffets" (Erro 429 da IA + Fallback Cego)
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 14/09/2026
- **Problema**: O sistema atribuiu "Aparadores Buffets" a um produto cujo nome era "Armario Multiuso Notavel Nt 4015 2pt Nt4015.448459 Branco New".
- **Causa Raiz Comprovada**:
  1. **Cota Esgotada no Google Gemini (HTTP 429 RESOURCE_EXHAUSTED)**: A chave de API do Gemini configurada no sistema esgotou os créditos pré-pagos no Google AI Studio.
  2. **Fallback Cego para `categories[0]`**: Tanto em `aiProductCatalogService.ts` (`suggestCategory`) quanto em `InboundInvoiceItemsReview.tsx`, ao falhar a IA, o código recorria a `categories[0]`.
  3. **Ordem Alfabética do Supabase**: A tabela `categories` é carregada com `ORDER BY name ASC`. O índice `0` é literalmente **"Aparadores Buffets"**. Toda e qualquer falha na IA forçava qualquer produto a virar "Aparadores Buffets".
  4. **Ignorava as Regras Determinísticas**: O Morante Hub possui regras locais em `categoryResolutionService.ts` que identificam "multiuso" como "Armários Multiuso" em 0ms sem chamar a IA, mas `InboundInvoiceItemsReview.tsx` e `useProductFormAi.ts` chamavam direto o Gemini.
- **Implementações Executadas**:
  1. **Eliminação do Fallback Perigoso `categories[0]`**:
     - `aiProductCatalogService.ts`: no `catch` de `suggestCategory`, agora retorna `{ category: "" }`, nunca mais forçando a primeira categoria do alfabeto.
     - `InboundInvoiceItemsReview.tsx`: removido o fallback `|| categories[0]`. Se nenhuma categoria for resolvida, `categoryIds` permanece vazio `[]` para escolha consciente do usuário.
  2. **Priorização de Regras Determinísticas Locais**:
     - `InboundInvoiceItemsReview.tsx`: integrado com `resolveAutoCategory`, aplicando primeiro `matchCategoryByRules`. Para o "Armario Multiuso Notavel...", ele resolve imediatamente para "Armários Multiuso" em 0ms e com custo R$ 0,00 de API.
     - `useProductFormAi.ts`: `handleGenerateCategory` agora executa `matchCategoryByRules` antes de invocar a IA.
     - `categoryResolutionService.ts`: enriquecida a regra para "multiuso" cobrindo "Armários Multiuso", "Armario Multiuso" e "Multiuso".
  3. **Testes Automatizados**:
     - Criados novos testes em `categoryResolutionService.test.ts` cobrindo o produto real e garantindo retorno `null` seguro em caso de falha da IA.
     - 100% de aprovação nos testes de IA, Categorias e Inbound Invoices (23 testes passando).

---

## 0. Modularização de ProductFormModal.tsx e Organização de Pastas em Products
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 14/09/2026
- **Solicitação**: Aplicar princípios de programação (Clean Code, SOLID, responsabilidade única) em `ProductFormModal.tsx` e reorganizar arquivos e pastas soltos em `src/pages/App/Products/`.
- **Implementações Executadas**:
  1. **Decomposição do `ProductFormModal.tsx` (757 → 215 linhas)**:
     - O arquivo original continha 757 linhas misturando gerenciamento de estado complexo, chamadas ao Supabase (`getFullProduct`), atalhos de teclado (Ctrl+S, ESC), sequenciamento de código manual, validação de regras de catálogo, lógica de tabs e renderização de formulário.
     - **Criação do Hook Especializado `useProductFormModal.ts` (~260 linhas)**:
       - Centraliza os estados locais do modal (tab ativa, confirmações, alertas, tags temporárias).
       - Orquestra carregamento completo com `productQueryService.getFullProduct(product.id)`.
       - Gerencia geração do próximo código sequencial com `productQueryService.fetchNextCode()`.
       - Lida com atalhos de teclado de forma segura e limpa.
       - Aplica validação e chamada ao `onSave` desacoplada da camada visual.
     - **Criação do Componente `ProductFormFooter.tsx` (~115 linhas)**:
       - Extrai todo o rodapé de ações: status visual de rascunho/publicação, botões de exclusão de rascunho, cancelar, salvar rascunho e salvar definitivo.
     - **Criação do Utilitário `productRequirementNavigation.ts` (~40 linhas)**:
       - Extrai a navegação automática com foco e efeito visual de pulso para campos com pendências de conformidade do e-commerce.
     - **Componente Visual Declarativo `ProductFormModal.tsx`**:
       - Reduzido para ~215 linhas puramente focadas em montar o layout do modal, tabs de navegação e renderizar os componentes filhos.
  2. **Organização Semântica da Pasta `priceHistory/`**:
     - Arquivos dispersos na raiz de `Products` (`priceHistoryService.ts`, `priceHistory.types.ts`, `priceHistoryBalance.ts`, `priceHistoryBalance.test.ts`) foram agrupados na subpasta dedicada `src/pages/App/Products/priceHistory/`.
     - Criado `index.ts` em `priceHistory/` como ponto único de entrada do módulo.
     - Criados proxies de compatibilidade na raiz de `Products/` para garantir que nenhum import legado quebre.
     - `PriceHistoryModal.tsx` atualizado para importar diretamente de `../priceHistory`.
  3. **Validação e Regressão**:
     - 100% dos testes da suíte de Produtos (18 arquivos, 63 testes vitest) executados e aprovados com sucesso.

---

## 0. Correção de Publicação Indevida no Catálogo Digital ao Cadastrar Produto
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 14/09/2026
- **Solicitação**: Ao cadastrar produto, o sistema estava marcando como "publicado" no catálogo mesmo sem o usuário ter clicado para publicar e mesmo sem ter conformidade com os campos obrigatórios (fotos, dimensões, título e categoria).
- **Causa Raiz Identificada**:
  1. `productPersistenceService.ts`: no upsert de `product_variations`, variações sem status explícito (`v.status`) recebiam fallback `|| 'published'`.
  2. `productVariationMapper.ts`: no mapeamento do banco para a aplicação, variações com status nulo recebiam fallback `|| 'published'`.
  3. `ensureDefaultVariation` e `useProductFormVariations.ts`: variações criadas na inicialização ou adição no formulário não continham a propriedade `status`, chegando ao salvamento como `undefined`.
  4. `ProductFormModal.tsx`: ao cadastrar produto, o `targetCatalogStatus` era ajustado para `'hidden'`, porém o array de variações filhas (`formData.variations`) não era normalizado com esse status, enviando variações com status `undefined` que eram gravadas como `'published'`. Além disso, a verificação `isProductCreation` não cobria a finalização de rascunhos onde `product.id` já existia.
  5. `useProductsCatalogActions.ts`: a validação `validateCatalogPublication` não validava os critérios completos de conformidade do e-commerce (`checkEcomLegibility`).
- **Implementações Executadas**:
  1. `ProductFormModal.tsx`: Ajustado `targetCatalogStatus` para sempre definir `'hidden'` em novos cadastros ou promoção de rascunhos. Preserva `'published'` unicamente em produtos já previamente cadastrados e publicados que mantenham 100% de conformidade com `checkEcomLegibility`. Variações filhas agora são normalizadas com o `targetCatalogStatus`.
  2. `productPersistenceService.ts`: Fallback de status de variação alterado de `'published'` para `v.status || product.status || 'hidden'`.
  3. `productVariationMapper.ts`: Fallback no mapper de `mapDbVariations` e `createDefaultVariation` alterado para `'hidden'`.
  4. `productVariationDefaults.ts` e `useProductFormVariations.ts`: Variação inicial e novas variações criadas recebem `status: 'hidden'` (ou `'draft'` se em rascunho).
  5. `ProductSaveResultModal.tsx`: Sincronização estrita de `status` nas variações ao alternar o status do catálogo no modal de resultado.
  6. `useProducts.ts` e `useProductsCatalogActions.ts`: Fallback corrigido para `'hidden'` e validação integrada com `checkEcomLegibility` impedindo publicação se houver campos obrigatórios pendentes.
  7. Bateria de testes unitários criada e validada em `catalogPublicationValidation.test.ts` (100% de aprovação na suíte de 63 testes de Produtos).

---

## 0. Desligamento do READ Legado e Paridade 100% de Pedidos
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Desligamento operacional da leitura legada (`order_data` e `orders.items`) no ERP e Mobile, mantendo integridade com as tabelas normalizadas (`orders`, `order_items`, `order_payments`), mantendo dual-write ativo e limpando dados residuais de teste.
- **Implementações Executadas**:
  1. **Auditoria Definitiva de Paridade Executada**:
     - 875 de 875 pedidos de produção auditados e 100% equivalentes.
     - 1.539 itens e 974 pagamentos perfeitamente mapeados e correspondentes.
     - Relatório formal gerado em `docs/auditorias/order-normalization-parity-report.md`.
     - Matriz canônica de paridade gerada em `erp/src/types/orderParityMapping.ts`.
  2. **Desligamento do READ Legado**:
     - `orderMapper.ts`: Mapeamento de itens migrado para priorizar `order_items` vindo do join relacional, mapeando colunas físicas (`product_id`, `variation_id`, `unit_price`, `unit_discount`, `cost_price`, `handling_type`) com fallback de segurança.
     - `orderSearchQueries.ts`: `fetchOrderById` atualizado para fazer join explícito com `order_items (*)` e `order_payments (*)`.
     - `orderSyncQueries.ts`: `subscribeToOrders` e queries de listagem padronizadas para consumir via `mapOrderFromDatabase` com colunas físicas normalizadas.
     - `orderLifecycleOperations.ts`: `permanentDeleteDraftOrder` e `undoReturn` atualizados para consumir e alterar o status relacional físico de `orders`.
  3. **Limpeza de Dados de Teste no Banco de Dados**:
     - Pedidos de teste (`id LIKE 'test_%'` e `order_number LIKE '99000%'`) excluídos com sucesso das tabelas `orders`, `order_items` e `order_payments`.
     - Zero pedidos de teste e zero clientes de teste remanescentes no banco de dados em produção.
     - Preservação estrita das regras de negócio (sem exclusão física indevida de produtos para não violar integridade referencial).
  4. **Garantia de Regras Invioláveis**:
     - WRITE (dual-write na RPC `save_order_transaction`) mantido 100% ativo.
     - Snapshots históricos autorizados (`item_snapshot`, `fullAddress`, `routeGeoJSON`) intactos.
  5. **Diretriz de Identificador Único Obrigatório de Testes**:
     - Qualquer rotina de teste (Playwright, E2E, Vitest de integração ou testes manuais) que persista dados no banco deve usar obrigatoriamente um identificador único padronizado (`testRunId`, prefixo `[TESTE_AUT]` ou sufixo `_test_<runId>`).
     - É estritamente proibido criar dados de teste com identificação ambígua.
     - O teardown / cleanup no `finally` deve referenciar esse ID único para garantir 100% de remoção sem resíduos na interface.

---

## 0. Auditoria e Normalização Segura do Banco Supabase / PostgreSQL
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Auditoria completa e normalização segura de campos JSONB em entidades de negócio (pedidos, itens de pedido, recebimentos, notas fiscais, compras, financeiro, produtos e variações), seguindo boas práticas de PostgreSQL, sem perda de dados, com estratégia incremental e preservação de snapshots históricos.
- **Implementações e Migrações Executadas**:
  1. **Auditoria Real do Catálogo**:
     - `orders`: 849 registros históricos totalmente preservados.
     - `inbound_invoices`: 1 nota com 21 itens.
     - `purchases`: 8 compras com 6 itens.
     - `product_variations`: 269 variações já consolidadas em tabela própria com FK.
     - `products`: 83 colunas estruturadas já existentes; JSONBs remanescentes mantidos para metadados fiscais e atributos dinâmicos.
  2. **Novas Tabelas Relacionadas Criadas (Categoria B)**:
     - `inbound_invoice_items`: Normalização de 1:N de itens de NF-e (21 itens migrados, FK para `inbound_invoices`, índices em `ean`, `ncm`, `product_id`, `variation_id`).
     - `purchase_items`: Normalização 1:N de compras (6 itens migrados, FK para `purchases`).
     - `goods_receipt_items`: Normalização 1:N de recebimentos físicos de mercadorias (tabela criada com FK, RLS e índices para CMPM/CMV).
     - `order_items`: Normalização 1:N de pedidos de venda (1.508 itens migrados, FK para `orders`, índices B-Tree e RLS).
     - `order_payments`: Normalização 1:N de formas de pagamento e parcelas (949 pagamentos migrados, FK para `orders`).
  3. **Colunas Estruturadas Adicionadas em `orders` (Categoria A)**:
     - `order_type`, `order_index`, `scheduled_date`, `scheduled_start_time`, `scheduled_end_time`, `delivery_method`, `delivery_status`, `delivery_arrived_at`, `delivery_started_at`, `delivery_finished_at`, `marketing_origin`, `items_subtotal`, `total_discount`, `total_cost`, `stock_processed`, `is_stock_checked`, `is_registered_in_bling`, `deleted`, `deleted_at`, `return_order_id`, `linked_order_id`.
     - Índices B-Tree especializados em `status`, `order_type`, `order_number`, `order_index`, `customer_id`, `seller_id`, `scheduled_date`, `delivery_method`, `delivery_status`, `stock_processed`, `deleted` e `created_at DESC`.
  4. **View `order_list_items` Otimizada**:
     - Atualizada para ler preferencialmente das novas colunas físicas, acelerando a listagem de pedidos no ERP e no Mobile sem full scan JSONB.
  5. **Arquitetura Definitiva Transacional (RPC `save_order_transaction`)**:
     - Implementada a RPC atômica `public.save_order_transaction` no PostgreSQL.
     - Persiste em uma única transação: `orders` (cabeçalho), `order_items` (itens normalizados com `item_snapshot`), `order_payments` (parcelas) e `order_data` (snapshot de compatibilidade temporário).
     - Garantia de `ROLLBACK` total caso qualquer etapa falhe, impedindo pedidos parcialmente salvos.
     - `orderHistoryService.ts` atualizado para invocar a RPC com fallback resiliente.
  6. **Trigger de Fallback Legado Anti-Colisão (`sync_order_items_fallback`)**:
     - Trigger temporário `AFTER INSERT OR UPDATE ON orders` que só atua se a requisição vier de clientes legados e se `order_items` estiver vazio para o pedido.
     - Detecta automaticamente quando a RPC moderna já executou (`morante.in_order_transaction = true`), evitando duplicação, concorrência e trabalho redundante no banco.
  7. **Migração de Readers e Writers Operacionais (Etapa 2 Concluída)**:
     - `orderMapper.ts`: Migrado para priorizar a leitura de pagamentos da tabela normalizada `order_payments`, com fallback seguro e não-duplicante para `order_data.payments`.
     - `orderSearchQueries.ts`: `fetchOrderById` atualizado para carregar `order_payments(*)` de forma eficiente via PostgREST join relacional.
     - `operationalSchedule.ts`: `getOperationalScheduleDate` migrado para priorizar as colunas normalizadas `scheduled_date`, `scheduled_start_time` e `scheduled_end_time` com fallback para JSONB.
     - `AgendaScreen.tsx`: Query ajustada para carregar colunas estruturadas de agendamento e filtrar por `deleted` relacional.
     - `aiSummaryService.ts`: Migrado para filtrar primariamente por `orders.deleted` relacional.
     - `order_fallback_telemetry`: Criada tabela leve de telemetria no PostgreSQL que monitora se e quando o fallback precisa atuar (`execution_count`, `items_fallback_count`, `payments_fallback_count`, `last_triggered_at`, `last_order_id`).
     - **Comprovado em Banco:** Updates operacionais leves de campo (ex: `delivery_status = 'in_service'`) são 100% no-op para o trigger e não acionam telemetria nem reconstroem filhos.
     - **Preservação Categoria C:** Mantidos permanentemente como JSONB: `item_snapshot`, endereço histórico da entrega, checklists operacionais com fotos e `payment_details` de adquirentes.
  8. **Otimização de Egress e Eliminação de `select('*')`**:
     - `fetchOrderById` migrado de `select('*, order_payments(*)')` para projeção explícita estrita de 34 colunas físicas de `orders` + 8 campos estruturais de `order_payments`, preservando `order_data` exclusivamente para os snapshots históricos e metadados Categoria C.
  9. **Critérios para Descontinuação Futura do Fallback**:
     - Somente após a telemetria do trigger registrar 0 acionamentos por 30+ dias em produção e a fila offline do mobile adotar o contrato direto de persistência.

---

## 0. Renomeação da Aba de Entregas para 'Operações' com Ícone Route
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Na barra inferior de abas do app mobile, mudar o nome da aba de "Entregas" para "Operações" e utilizar o ícone `Route` da Lucide (`https://lucide.dev/icons/route`).
- **Implementações Realizadas**:
  - Em `mobile/src/features/dashboard/components/NativeBottomNav.tsx`:
    - Importado o ícone `Route` de `lucide-react-native`.
    - Atualizado o item da aba com `label: 'Operações'` e `icon: Route`.
    - Preservada a chave interna `key: 'entregas'` e as rotas operacionais sem quebra de estado ou navegação existente.

---

## 0.1. Ícones de Navegação no Mapa: Seta Azul Pura & Equipe com Nome no Hover
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**:
  1. O ícone da minha posição (usuário logado / motorista) no mapa deve ser **apenas a seta mesmo, na cor azul**, sem círculo em volta nem halo.
  2. A localização de quem está em processo de entrega (membros da equipe) deve continuar sendo o **caminhão (`🚚`)**, com o nome do usuário sendo mostrado **apenas quando houver hover** em cima do ícone do caminhão (e toque no nativo).
- **Implementações Realizadas**:
  1. **Minha Posição (Apenas a Seta Azul Pura)**:
     - Removidos círculo azul de fundo, borda branca e halo.
     - Marcador agora renderiza **apenas o glifo da seta de navegação** (`Navigation` de `lucide-react-native` rotacionado em -45° para apontar para o Norte/trajeto) em azul royal (`#2563eb` preenchido com contorno `#1d4ed8` e drop shadow suave de profundidade).
     - Aplicado no app nativo ([DeliveryMarker.tsx](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/features/logistics/components/deliveryMap/DeliveryMarker.tsx)) e no mapa Web/Leaflet ([DeliveryMapView.web.tsx](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/features/logistics/components/deliveryMap/DeliveryMapView.web.tsx)).
  2. **Equipe com Nome Apenas no Hover/Toque**:
     - No web (`DeliveryMapView.web.tsx`): a badge do nome do entregador (`.team-member-badge`) oculta por padrão (`opacity: 0; visibility: hidden;`), revelando-se sob hover (`.team-member-container:hover .team-member-badge`).
     - No app nativo (`DeliveryMarker.tsx`): o nome agora é condicionado a interação/toque no marcador (`showTeamName`), mantendo o mapa limpo.
  3. **Manutenção de Status Operacional**: O indicador de integridade (bolinha verde se ativo ou `?` vermelho se sem sinal de GPS) continua presente no topo do caminhãozinho da equipe.

---

## 0.1. Calibração da Posição da Loja e Precisão Contínua do GPS no Mapa
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Problema**: Usuários dentro da loja física apareciam deslocados/afastados do pin da loja e sobre a rua.
- **Causa Raiz**:
  1. A coordenada da loja (`storeOriginCoords`) estava em `[-49.16948, -25.35205]`, cerca de 20 metros recuada no fundo do lote, longe do salão e da frente da loja.
  2. O serviço de localização (`locationService.ts`) utilizava `Location.Accuracy.Balanced` (baseado em triangulação de Wi-Fi/torres celulares), que tem margem de erro de 30-50m, provocando drift para a rua.
  3. O hook `useDriverLocation.ts` capturava a posição uma única vez na inicialização sem monitoramento ativo por satélite.
  4. O âncora visual do marcador do membro da equipe (`anchor: { x: 0.5, y: 0.5 }`) projetava o caminhão 14px abaixo da coordenada real de GPS devido à etiqueta com o nome.
- **Soluções Aplicadas**:
  1. **Calibração da Loja Física (R. Cascavel, 306)**: Atualizadas as coordenadas da loja para `latitude: -25.35212, longitude: -49.16933` no Supabase (`settings.storeOriginCoords`), no ERP e no Mobile.
  2. **GPS de Alta Precisão (Satélite GNSS)**: Alterado `accuracy` para `Location.Accuracy.High` e reduzido o tempo de cache para 10s.
  3. **Monitoramento Contínuo com Calibração Ativa**: Implementado `watchDriverLocation` com `Location.watchPositionAsync`, atualizando a posição em tempo real a cada 2 metros ou 3 segundos conforme os satélites refinam a posição.
  4. **Correção de Âncora Visual**: Ajustado `anchor: { x: 0.5, y: 0.72 }` para alinhar o corpo do caminhãozinho perfeitamente no ponto exato do GPS.

---

## 0.1. Compartilhamento de Localização Condicional à Entrega & Modal de Confirmação de Privacidade
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Privacidade Operacional (Visibilidade Condicional)**: A localização de um usuário só fica visível para os outros membros no mapa quando ele estiver ativamente com uma entrega em andamento (`is_delivering = true`), da 1ª etapa até a finalização do pedido.
  2. **Encerramento Imediato**: Ao finalizar o pedido (`DELIVERY_FINISH`), registrar insucesso (`unattended`) ou cancelar a rota, o app aciona `stopDeliveringBroadcast` e o usuário é ocultado imediatamente do mapa dos colegas.
  3. **Modal de Confirmação de Privacidade**: Criado `DeliveryStartConfirmModal.tsx`, que intercepta o início da saída e esclarece: *"Ao iniciar a entrega, a sua posição em tempo real ficará visível no mapa para os outros membros da equipe até que todas as etapas deste pedido sejam finalizadas."*
  4. **Banco Supabase**: Aplicada migration `20260912123500_add_delivering_state_to_team_locations.sql` adicionando `is_delivering`, `active_order_id` e `active_order_code` com índice condicional.
  5. **Testes Unitários**: Criada suíte `teamLocationPrivacy.test.ts` com 3 testes aprovados (100%).

---

## 0.1. Centralização do Modal de Pedido no Meio da Tela & Botões Verticais
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Posicionamento no Meio da Tela**: O modal de parada no mapa (`DeliveryBottomSheet.tsx`) foi centralizado vertical e horizontalmente (`justifyContent: 'center'`, `paddingHorizontal: 18`, `paddingVertical: 24`, `maxHeight: '82%'`), removendo o estilo encostado na base e o drag handle.
  2. **Botões de Ação Verticais (Empilhados)**:
     - **Botão Primário (Topo)**: `[ ▶ INICIAR ETAPAS DA ENTREGA ]` com largura total (100%), altura 46px, texto destacado (13px, bold 900) e azul sólido.
     - **Botão Secundário (Abaixo)**: `[ 📄 Detalhes do Pedido ]` com largura total (100%), altura 44px, texto (13px, bold 800) e contorno suave.
  3. **Usabilidade Otimizada**: Visibilidade total sobre o mapa sem sobrepor a barra de navegação inferior e fácil acionamento pelo motorista.

---

## 0.1. Unificação do Seletor de Período (Hoje/Dias Seguintes) e Ajuste no Cabeçalho de Operações
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Remoção do Seletor Redundante no Resumo**: O card de resumo (`TodaySummaryCard.tsx`) não possui mais botão de filtro duplicado internamente; agora recebe o período ativo (`periodFilter`) vindo do filtro mestre no cabeçalho da tela (`DeliveriesHubScreen.tsx`).
  2. **Estilo Fiel de Cápsula com Pílula Ativa Branca**: O seletor "Hoje / Dias Seguintes" no topo da Operação foi estilizado exatamente como o design de referência: cápsula azul arredondada (`#0055ff`, `borderRadius: 22`), com a pílula ativa em branco e tipografia em destaque (`#0055ff`, `fontWeight: '900'`) e a inativa com texto branco suave.
  3. **Cabeçalho Mais Alto e Arejado**: Aumentado o espaçamento superior e inferior do cabeçalho da tela de Operações (`paddingBottom: 14`, `titleRow` com `marginBottom: 12` e respiro seguro para a barra de status).

---

## 0.1. Correção de Localização de Entrega no Mapa & Redesign do Modal de Parada
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Problema 1 (Coordenadas Erradas no Pedido #002550 - R. Evaristo da Veiga, 312, Campo Pequeno)**:
  - A entrega do pedido #002550 aparecia no mapa do app em local errado (Rua Abel Scuissiato, 312, Maracanã), a mais de 1,1 km de distância da localização real.
  - **Causa Raiz**:
    1. O endereço continha complemento no campo de texto de rua/busca (`destination=Rua%20Evaristo%20da%20Veiga%20312%20Muro%20Marrom`) sem coordenadas na URL.
    2. Durante o cálculo de rota no ERP, a busca do Google Maps não encontrou a rua com o texto adicional e recaiu sobre o número 312 mais relevante da cidade (Rua Abel Scuissiato, 312), gravando `destinationCoords: [-49.1860165, -25.3644204]`.
    3. Havia fallbacks cegos de aproximação por bairro/cidade em `maps.ts` (`getNeighborhoodCoords`) e no `DeliveryMap.tsx` que geravam coordenadas arbitrárias ao invés de indicar ausência de precisão.
  - **Solução Aplicada**:
    1. Atualizado o registro do pedido #002550 no Supabase (`orders`) com as coordenadas exatas: `latitude: -25.3600699, longitude: -49.1962085` (`destinationCoords: [-49.1962085, -25.3600699]`) e URL do Google Maps limpa com coordenadas diretas.
    2. Removidos fallbacks arbitrários de bairro em `maps.ts` e `DeliveryMap.tsx`: se um endereço não for localizado com precisão pelo geocodificador, o sistema não gera coordenadas genéricas falsas.
- **Problema 2 (Ajustes no Modal de Detalhes da Parada no Mapa do App - `DeliveryBottomSheet.tsx`)**:
  - Modal era encostado embaixo, alto demais, com seções pesadas de cobrança e sanfona de itens, sem botão direto para abrir os detalhes do pedido e com rótulo "volumes" em vez de "itens".
  - **Soluções Aplicadas**:
    1. **Layout Compacto e Flutuante**: O modal agora é um card flutuante com bordas arredondadas (`borderRadius: 22`), margens laterais (`paddingHorizontal: 16`) e respiro inferior (`paddingBottom: 24`), sem encostar na base da tela.
    2. **Remoção de Cobrança / Valor a Receber**: Removida a seção de pagamento pendente/valor a receber.
    3. **Remoção de Sanfona de Itens**: Removida a lista expansível de itens da entrega.
    4. **Troca de Volumes para Quantidade de Itens**: A pílula agora exibe a contagem de produtos/itens distintos do pedido: `${item.itemsCount} ${item.itemsCount === 1 ? 'item' : 'itens'}`.
    5. **Botão "Detalhes do Pedido"**: Adicionado botão secundário destacado com ícone `FileText` que chama `onViewOrder(item)` e abre o `OrderDetailsModal` full screen.

---

## 0.1. Correção do Código Sequencial em Recebimentos de Mercadorias (Card #—)
- **Status**: Concluído com Sucesso! 🚀
- **Problema**: Os cards de recebimento de mercadoria exibiam `#—` (sem código) quando o recebimento era finalizado ou rascunho sem `receiptIndex` gravado.
- **Causa Raiz**:
  1. `finalizeGoodsReceipt` em `goodsReceiptService.ts` não preservava nem gerava `receiptIndex`, sobrescrevendo o registro local e persistindo `undefined`.
  2. `ReceiptFormModal.tsx` não mantinha `receiptIndex` no estado e não o enviava na chamada de finalização.
  3. Não havia rotina de auto-cura para registros legados ou já salvos sem `receiptIndex`.
- **Solução Implementada**:
  - `goodsReceiptCode.ts`: Criado helper `getGoodsReceiptIndex` compatível com camelCase (`receiptIndex`) e snake_case (`receipt_index`), com tratamento seguro em `formatGoodsReceiptCode` e `getNextGoodsReceiptIndex`.
  - `goodsReceiptService.ts`: `finalizeGoodsReceipt` e `reverseGoodsReceipt` agora preservam/geram o `receiptIndex`. Implementada função `ensureReceiptIndexes` com auto-cura e sincronização transparente com o Supabase.
  - `ReceiptFormModal.tsx`: Estado `receiptIndex` integrado com exibição no cabeçalho do modal e persistência contínua.
- **Melhoria no Formulário de Recebimento (Busca de Fornecedor com 2 Dígitos)**:
  - Implementado parâmetro `minChars` em `SupplierAutocomplete` e `useSupplierAutocomplete`.
  - No formulário de recebimento (`ReceiptFormModal.tsx`), configurado `minChars={2}` para só abrir e listar sugestões de fornecedor quando o usuário digitar pelo menos 2 caracteres, evitando listas intrusivas ao focar no campo.
  - Testes: Criada suíte unitária `useSupplierAutocomplete.test.ts` com 4 testes aprovados (100%).

---

## 1. Atualização do App Mobile (Build 17 e Atualização Obrigatória)
- **Status**: Concluído com Sucesso! 🚀
- **Detalhes da Build Nativa**:
  - Expo EAS Build: `https://expo.dev/accounts/morante/projects/mobile/builds/27e6a150-0697-4e47-8297-5ecf8ef34751`
  - Version Code: **17**, Version: **1.6.0**, Runtime Version: **1.6.0**
  - APK URL Oficial: `https://expo.dev/artifacts/eas/c6GuI7KSgOnw0kSY-zI9S_5dxaFMuc9lCT37XL-ynYE.apk`
- **Sincronização dos Pontos de Download do APK Oficial (Concluído)**:
  - `mobile/app.json`: versionCode 17
  - `mobile/android/app/build.gradle`: versionCode 17
  - `mobile/src/constants/appVersion.ts`: APP_BUILD 17
  - `mobile/src/hooks/useMandatoryAppUpdate.ts`: TARGET_OFFICIAL_BUILD 17 e URL do APK 17
  - Banco Supabase (`settings` -> `app`): `minimumAndroidBuild: 17`, `requiredAndroidBuild: 17`, URL atualizada
  - Landing Page ERP (`MobileAppLanding.tsx`): Botão de download e QR Code apontando para a Build 17
  - Perfil do Usuário ERP (`erp/src/pages/App/Profile/Index.tsx`): Botão "Baixar App Android Oficial"
  - Menu de Perfil no Topo do ERP (`erp/src/AppLayout.tsx`): Botão "Baixar App Android"
  - Menu de Logística do ERP (`erp/src/components/layout/DesktopNav.tsx`): Botão "Baixar App Android"
- **Publicação OTA (Concluído com Sucesso)**:
  - Data: 12/09/2026
  - Mensagem: *"Ajustes layout operacao e botoes mapa"*
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `a37f10fd-05e9-4e09-b678-5d0f3d8ee131`
  - Android Update ID: `01a09638-87b4-7e32-9c2d-595bca816de0`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/a37f10fd-05e9-4e09-b678-5d0f3d8ee131`

---

## 2. Refatoração e Aplicação de Princípios de Código Limpo (10 Arquivos Concluídos)
- **Status**: Concluído com Sucesso! 🚀
- **Diretriz**: Aplicados princípios de Clean Code, Responsabilidade Única (SRP), Coesão de Camadas e Desacoplamento Seguro (`modularizacao_codigo` e `AGENTS.md`).

### Lista dos 10 Arquivos Refatorados:
1. `erp/src/pages/App/Stock/InboundInvoices/InboundInvoiceItemsReview.tsx`:
   - Reduzido de 618 linhas para 260 linhas.
   - Extraídos: `useInboundInvoiceSuggestions.ts`, `inboundProductPreparationService.ts`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`.
   - Testes vitest: 9 arquivos de teste / 31 testes aprovados.

2. `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`:
   - Reduzido de 628 linhas para 240 linhas.
   - Extraídos: `OpportunitySelectModal.tsx` e `CategoryMultiSelectList.tsx` em `mobile/src/features/products/modals/components/`.
   - Compilação TypeScript: 0 erros.

3. `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx`:
   - Reduzido de 595 linhas para 330 linhas.
   - Extraído: `AssemblyOrderCard.tsx` em `mobile/src/features/assemblies/components/`.
   - Compilação TypeScript: 0 erros.

4. `mobile/src/features/logistics/components/TodaySummaryCard.tsx`:
   - Reduzido de 628 linhas para 275 linhas.
   - Extraídos: `DeliveryShiftMetricsGrid.tsx` e `DeliverySummaryControlsBar.tsx`.
   - Compilação TypeScript: 0 erros.

5. `mobile/src/features/logistics/screens/NativeLogisticsScreen.tsx`:
   - Reduzido de 843 linhas para 370 linhas.
   - Extraído: `LogisticsOrderCard.tsx` em `mobile/src/features/logistics/components/`.
   - Compilação TypeScript: 0 erros.

6. `mobile/src/services/financial/financialIntentValidator.ts`:
   - Reduzido de 731 linhas para 535 linhas.
   - Extraídos: `validators/loanIntentValidator.ts` e `validators/businessPurposeValidator.ts`.
   - Compilação TypeScript: 0 erros.

7. `mobile/src/services/financial/financialSlotFilling.ts`:
   - Reduzido de 694 linhas para 490 linhas.
   - Extraído: `patchers/installmentSlotPatcher.ts`.
   - Compilação TypeScript: 0 erros.

8. `erp/src/pages/utils/whatsapp.ts`:
   - Reduzido de 694 linhas para 346 linhas.
   - Extraído: `whatsappTemplates.ts` reunindo todos os geradores e builders de mensagens/orçamentos.
   - Testes vitest: 100% aprovados.

9. `erp/src/pages/utils/whatsappGraphService.ts`:
   - Reduzido de 656 linhas para 590 linhas.
   - Extraído: `whatsappHttpClient.ts` isolando chamadas HTTP autenticadas e testes de conexão da Meta Graph API.
   - Testes vitest: 100% aprovados.

10. `erp/src/pages/App/Stock/components/InventoryAuditModal.tsx`:
    - Reduzido de 634 linhas para 495 linhas.
    - Extraído: `InventoryAuditTable.tsx` desacoplando a tabela física de contagem, inputs de ajuste e ações de itens.
    - Testes vitest: 100% aprovados.

---

## 3. Correção do Assistente de IA e Marcadores do Mapa no Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Problema 1: "Desculpe, ocorreu uma falha ao consultar assistente" no App**:
  - **Causa Raiz**: O `MobileAgentClient.getApiKey()` buscava apenas da tabela `settings` (que não continha a chave do Gemini configurada) e de `process.env`. No APK compilado do React Native, `process.env` em runtime retornava vazio/indefinido, disparando erro de chave não configurada.
  - **Solução Aplicada**:
    - Adicionada chave de contingência padrão do projeto (`DEFAULT_GEMINI_API_KEY`) no `mobileAgentClient.ts`.
    - Melhorado o tratamento de erro em `useFinancialAiChat.ts` para reportar diagnósticos claros (chave/rede/servidor) em vez de ocultar a causa raiz.
- **Problema 2: Ícones do Depósito e Destinos não aparecendo no Mapa de Entregas**:
  - **Causa Raiz**: No `DeliveryMarker.tsx`, os componentes `<Marker>` estavam com `tracksViewChanges={false}` fixo e estático. No Google Maps nativo para Android, componentes filhos customizados com SVGs/Views são renderizados em branco/invisíveis se `tracksViewChanges` estiver desligado antes do primeiro ciclo de desenho.
  - **Solução Aplicada**:
    - Implementado `tracksViewChanges` dinâmico via state/timer (`1200ms`) em `DeliveryMarker.tsx`. O mapa renderiza todos os ícones (`Store`, `Truck`, `Check`, números de sequência) e, após desenhados, desativa o tracking para máxima performance e economia de bateria/GPU.
  - **Validação**: `npx tsc --noEmit` executado com **0 erros**.
- **Publicação OTA (Concluído com Sucesso)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Android Update ID: `01a091bb-4a85-71ac-a10f-9e4772aff91c`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Mensagem: *"Fix Gemini AI agent key fallback and delivery map markers visibility"*
- **Atualização da Chave do Gemini em Produção (Concluído com Sucesso - 13/09/2026)**:
  - **Causa Raiz**: O banco de dados Supabase na tabela `settings` (registro `id: 'app'`) não possuía o campo `data.geminiApiKey` gravado, e o fallback de contingência no bundle mobile estava com string vazia. Além disso, `financialAiAssistantService.ts` consultava uma tabela inexistente (`secrets`).
  - **Solução**:
    1. Gravada a chave oficial ativa do Gemini diretamente na tabela `settings` (`id: 'app'`) no Supabase, permitindo que qualquer instância instalada recupere a chave dinamicamente.
    2. Adicionado o fallback padrão ativo em `DEFAULT_GEMINI_API_KEY` dentro de `mobileAgentClient.ts` e exportado em `mobile/.env` (`EXPO_PUBLIC_GEMINI_API_KEY`).
    3. Unificada a busca de chave de `financialAiAssistantService.ts` apontando para `MobileAgentClient.getApiKey()`.
    4. Adicionado campo de gerenciamento da Chave de API do Gemini nas Configurações do ERP (`AIPromptsSection.tsx` e `settingsService.ts`).
  - **Publicação OTA**:
    - Branch: `production`
    - Runtime Version: `1.6.0`
    - Plataforma: `android`
    - Update Group ID: `f9427258-bb13-46c8-9d9e-3c4039f17dce`
    - Android Update ID: `01a09c33-ab44-70cf-bc81-e3892bd20e82`
    - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/f9427258-bb13-46c8-9d9e-3c4039f17dce`
    - Mensagem: *"Fix-Gemini-AI-key-activation"*
- **Ponteiro / Seta de Localização Branca no Mapa (Concluído com Sucesso - 13/09/2026)**:
  - **Solicitação**: Alterar a cor da seta/ponteiro da minha localização no mapa do app para branca.
  - **Arquivos alterados**:
    - `mobile/src/features/logistics/components/deliveryMap/DeliveryMarker.tsx`: `color` atualizado para `#0f172a` (contorno de alto contraste) e `fill` para `#ffffff` (seta branca com sombra de elevação).
    - `mobile/src/features/logistics/components/deliveryMap/DeliveryMapView.web.tsx`: SVG sincronizado com `fill="#ffffff"` e `stroke="#0f172a"`.
  - **Publicação OTA**:
    - Branch: `production`
    - Runtime Version: `1.6.0`
    - Plataforma: `android`
    - Update Group ID: `cd0a097c-028d-4c10-8564-8c9c8b64db88`
    - Android Update ID: `01a09c37-7852-73e4-bc18-28b6310b4448`
    - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/cd0a097c-028d-4c10-8564-8c9c8b64db88`
    - Mensagem: *"White-navigation-pointer-color"*
- **Redesign do Cabeçalho da Agenda & Correção de pointerEvents no Mobile (Concluído com Sucesso - 13/09/2026)**:
  - **Solicitação**:
    1. Remover o botão/banner "Entregas de hoje no mapa" da tela de Agenda.
    2. Remover o subtítulo "Cronograma Logístico e Agendamentos".
    3. Posicionar o botão seletor de período diretamente abaixo do título "Agenda".
    4. Adicionar botão de 3 pontinhos (`MoreVertical`) no canto superior direito no lugar do antigo seletor.
    5. Eliminar o warning de deprecação `props.pointerEvents is deprecated. Use style.pointerEvents` no React Native Web / Mobile.
  - **Arquivos alterados**:
    - `mobile/src/features/logistics/screens/NativeLogisticsScreen.tsx`: Novo layout do cabeçalho com alinhamento vertical do título com o seletor de período abaixo e botão de 3 pontinhos no topo direito; remoção do banner de mapa.
    - `mobile/src/features/orders/components/MobileOrderCard.tsx`: Substituído o prop `pointerEvents="none"` por `pointerEvents: 'none'` nos estilos de `cancelledOverlay` e `stampContainer`.
    - `mobile/src/features/products/components/MobileProductCard.tsx`: Substituído o prop `pointerEvents="box-none"` por `pointerEvents: 'box-none'` no estilo de `headerActions`.
  - **Publicação OTA**:
    - Branch: `production`
    - Runtime Version: `1.6.0`
    - Plataforma: `android`
    - Update Group ID: `299e978d-f132-46d9-a564-9ef27d2f0f08`
    - Android Update ID: `01a09c44-b12f-73e6-a541-9db4ad8639b3`
    - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/299e978d-f132-46d9-a564-9ef27d2f0f08`
    - Mensagem: *"Fix-pointerEvents-and-agenda-header"*

---

## 4. UI/UX do Gerador de Posts & Prompts (Elementos da Campanha)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**: No gerador de prompts para posts, na aba "Elementos da Campanha", o tópico de **Imagens** deve ficar fechado/recolhido por padrão, e abrir somente quando o usuário clicar nele, exatamente como funcionam os outros tópicos (accordions).
- **Alteração Realizada**:
  - Em `erp/src/pages/App/Marketing/Posts/components/CampaignElementsPanel.tsx`:
    - Adicionado o estado `openImages` inicializado como `false`.
    - Transformada a visualização estática anterior em um item de acordeão com botão expansível (`▸` / `▾`), título "Fotos do Produto (Prompt)" e badge de status ("Configurado ✓", "Disponível" ou "Nenhum produto").
    - A faixa de fotos `PromptImagesStrip` só é exibida ao expandir o bloco, mantendo a tela limpa e padronizada com os demais tópicos.

---

## 5. UI/UX do Gerador de Posts (Texto Estruturado e Selo de Oportunidade)
- **Status**: Concluído com Sucesso! 🚀
- **Texto Estruturado Recolhido**: Em `erp/src/pages/App/Marketing/Posts/components/PromptPreview/PromptPreview.tsx`, o bloco "Texto Estruturado do Prompt" agora inicia fechado por padrão (`openPromptText: false`) e expande ao clicar no tópico, mantendo o botão "Copiar Prompt" permanentemente acessível no cabeçalho.
- **Selo de Oportunidade**: Em `PromptCopyableImagesList.tsx`, ajustada a resolução prioritária da imagem do selo de oportunidade a partir do produto (`opportunityImageUrl`, `opportunity.image_url`), fallback canônico para "Queima dos Salvados" (`OFFICIAL_QUEIMA_BADGE_URL`) e `fallbackUrl` gerado em SVG dinâmico acionado automaticamente no evento `onError` da tag `<img>`, evitando qualquer ícone quebrado.

---

## 6. App Mobile — Mapa de Entregas (Marcadores Operacionais, Card Compacto e OTA)
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Tela Limpa ao Entrar**: Nenhum card abre forçado ao carregar e nenhuma rota é traçada sem clique (`isCardDismissed: true` inicial). O card só aparece ao tocar em uma parada.
- **Card Compacto (`NextDeliveryCard`)**: Removidos textos redundantes ("PARADA SUGERIDA", "⭐ SUGERIDA PELO ROTEIRO") e eliminado o modal grande redundante (`DeliveryBottomSheet`).
- **Marcadores no Mapa (`DeliveryMarker`)**: Substituída a numeração fixa por ícones de operação com as cores canônicas do ERP:
  - 🚚 **Entrega**: Fundo Verde (`#16a34a`) com ícone `Truck`.
  - 📦 **Retirada**: Fundo Roxo (`#7c3aed`) com ícone `Package`.
  - 🔧 **Assistência**: Fundo Amarelo (`#eab308`) com ícone `Wrench`.
  - ↩️ **Coleta de Devolução**: Fundo Laranja (`#f97316`) com ícone `RotateCcw`.
  - Concluída: Fundo Esmeralda com ícone `Check`.
  - Depósito/Loja: Ícone `Store`.
- **Publicação OTA**:
  - Update Group ID: `01f23275-5cfe-4d0e-8f03-8277601d487a`
  - Android Update ID: `01a091d3-863d-758f-9c73-3fd2e9a24b43`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/01f23275-5cfe-4d0e-8f03-8277601d487a`

---

## 7. App Mobile — Mapa de Entregas (Ajuste Visual do Card de Parada)
- **Status**: Concluído! 🚀
- **Card de Parada**: Removido o texto `"PARADA · #1"` / sequência do topo do card para deixar a interface limpa e focada exclusivamente nas informações do cliente, endereço e ações operacionais (`INICIAR ETAPAS DA ENTREGA` e `Ver pedido`).
- **Estabilidade do ERP Dev**: Garantida integridade e compatibilidade total de caminhos na tela de Etiquetas (`LabelPrinting`) e Recebimentos (`Receipts`), mantendo o ambiente de desenvolvimento funcionando 100% perfeitamente sem erros 404.


---

## 7. Organização e Criação de Subpastas em Módulos Extensos
- **Status**: Concluído com Sucesso! 🚀
- **Módulo `Stock/Receipts` (Recebimento de Mercadorias)**:
  - Antes: 18 arquivos misturados na raiz da pasta.
  - Subpastas criadas e organizadas:
    - `components/`: `InboundNfeItemsSection`, `ReceiptActionButtons`, `ReceiptCard`, `ReceiptFiscalDocumentsSection`, `ReceiptPeriodSelector`, `ReceiptsHeader`, `ReceiptsTable`.
    - `modals/`: `ConfirmReverseModal`, `InboundInvoiceReceiptPickerModal`, `PurchaseReceiptPickerModal`, `ReceiptAIFillModal`, `ReceiptDetailsModal`, `ReceiptFormModal`.
    - `hooks/`: `useReceipts`.
    - `utils/`: `receiptPeriodFilter.types`, `receiptPeriodUtils`, `receiptPeriodUtils.test`.
    - Raiz limpa contendo apenas o orquestrador `Index.tsx`.
- **Módulo `Stock/LabelPrinting` (Impressão e Editor de Etiquetas)**:
  - Antes: 21 arquivos soltos na raiz.
  - Subpastas criadas e organizadas:
    - `modals/`: `LabelGridModelModal`, `LabelImageModal`, `LabelModelCreationModal`, `PriceLabelArtEditorModal`.
    - `services/`: `FabricLabelEngine`, `fixedLabelTextSize`, `LabelPhysicalGeometry`, `LabelUtils`, `priceLabelTemplateSync`, `PriceLabelArtRenderer`.
    - `hooks/`: `useLabelPrintMode`, `usePriceLabelFonts`.
    - Raiz mantendo apenas `Index.tsx`, `LabelConstants.ts`, `LabelGrid.tsx`, `LabelItem.tsx` e `LabelQueue.tsx`.
- **Validação de Testes e Integridade**: Todos os testes unitários foram executados com 100% de sucesso e nenhum caminho de importação quebrado.

---

## 8. Gerador de Prompt para Posts — Correção da Imagem do Selo de Oportunidade
- **Status**: Concluído com Sucesso! 🚀
- **Problema Reportado**: No preview de prompt e assets copiáveis (`PromptPreview` e `PromptCopyableImagesList`), o selo `#4 Selo de Oportunidade` estava exibindo a imagem antiga/horizontal da tabela geral de oportunidades do ERP em vez do selo configurado na aba de Elementos da Campanha (`BADGE`).
- **Causa Raiz Identificada**: `PromptCopyableImagesList` priorizava `product?.opportunityImageUrl` sobre os modelos configurados na campanha, e não recebia a lista completa `elementModels` da biblioteca de elementos da campanha.
- **Solução Implementada**:
  1. `PromptCopyableImagesList`: Passou a receber `models` e `elementModels` e agora busca prioritariamente o modelo configurado no elemento `BADGE` da oportunidade (`generatedAssetUrl` ou anexo `referenceFiles[0]`). Somente se não houver selo configurado no elemento é que aplica os fallbacks.
  2. `PromptPreview`: Repassa os `elementModels` e `effectiveModels` tanto para a geração do prompt estruturado quanto para o `PromptCopyableImagesList`.
  3. `postOfficialAssetResolver` e `postSpecificationBuilder`: Suportam `elementModels` para resolução resiliente do selo oficial mesmo antes de persistir links no banco.
  4. Testes Vitest: 11 testes aprovados (`postOfficialAssets.test.ts`), cobrindo a prioridade estrita do selo da campanha sobre a lista do ERP.

---

## 9. Skill de Organização de Pastas & Organização de `Stock/InboundInvoices`
- **Status**: Concluído com Sucesso! 🚀
- **Nova Skill Criada**: `.agents/skills/organizacao-arquivos-diretorios/SKILL.md`
  - Define o padrão canônico de subpastas (`components/`, `modals/`, `sections/`, `services/`, `hooks/`, `utils/`, `types/`).
  - Estabelece a regra fundamental de Zero Perda de Código, retrocompatibilidade com barrels (`export * from ...`) e verificação obrigatória de imports antes e depois da migração.
  - Registrada no [AGENTS.md](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/AGENTS.md) na tabela de Roteamento de Skills Especializadas.
- **Módulo `Stock/InboundInvoices` Organizado**:
  - Antes: 15 arquivos misturados na raiz do módulo.
  - Subpastas organizadas:
    - `modals/`: `InboundAccessKeyModal.tsx`, `InboundDocumentImportModal.tsx`, `InboundDuplicateKeyAlertModal.tsx`, `InboundInvoiceDetailsModal.tsx`, `InboundXmlImportModal.tsx`, `ManageInboundInvoiceMappingsModal.tsx`.
    - `components/`: `InboundAdditionalCostsSection.tsx`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`, `InboundInvoiceFiscalReview.tsx`, `InboundInvoiceItemCard.tsx`, `InboundInvoiceItemFiscalReview.tsx`, `InboundInvoiceItemsReview.tsx`, `InboundInvoicesHeader.tsx`, `InboundInvoicesPagination.tsx`, `InboundInvoicesTable.tsx`.
    - Barrels de retrocompatibilidade mantidos na raiz para consumidores externos (`InboundInvoicesHeader.tsx` e `InboundDocumentImportModal.tsx`).
    - Raiz limpa e focada no orquestrador `Index.tsx`.
- **Validação de Testes e Integridade**:
  - Testes do módulo de notas (`inboundInvoicesService.test.ts`) executados e aprovados com 100% de sucesso.
  - Nenhum import quebrado ou tela afetada.

---

## 10. Correção de `elementModels` no PromptPreview & Publicação OTA do App Mobile
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Correção no ERP (`PromptPreview.tsx`)**:
  - Corrigido o `ReferenceError: elementModels is not defined`. A propriedade `elementModels` constava na interface `PromptPreviewProps`, porém não havia sido desestruturada na assinatura da função do componente, causando erro em tempo de execução ao tentar renderizar a lista de assets. Corrigido com sucesso.
- **Publicação OTA do App Mobile (EAS Update)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Android Update ID: `01a0922c-0d4e-7627-a9db-cb09dda20b35`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Os aparelhos dos operadores receberão a atualização automaticamente na próxima reinicialização/abertura do aplicativo.

---

## 11. Resolução Estrita do Selo de Oportunidade no Gerador de Prompts
- **Status**: Concluído com Sucesso! 🚀
- **Problema**: O preview de assets exibia o selo horizontal legado em vez do selo configurado no elemento `BADGE` da campanha (Queima dos Salvados).
- **Causa Raiz**: Presença de fallback hardcoded (`OFFICIAL_QUEIMA_BADGE_URL`) que interceptava e forçava a imagem antiga retangular, além de busca que pegava o primeiro item sem priorizar o modelo com asset gerado/atualizado.
- **Solução Aplicada**:
  - `PromptCopyableImagesList.tsx`: Remoção do fallback hardcoded e ordenação para priorizar modelos com `generatedAssetUrl` / anexo válido mais recente.
  - `postOfficialAssetResolver.ts`: Eliminação de sobreposição por URL legada, assegurando que o asset configurado no elemento tenha prioridade absoluta.
  - `PromptPreview.tsx`: Inclusão de `elementModels` no cálculo de `effectiveModels` e no `specKey` para re-renderização imediata após edição de selos.

---

## 12. Melhorias na Experiência do Mapa de Entregas Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Melhorias Aplicadas**:
  - **Ícone do Caminhão (Posição Atual)**: Removido o círculo azul/borda em volta do caminhão no mapa (tanto no Leaflet web quanto no React Native Maps nativo). Agora exibe estritamente o ícone do caminhão estilizado de forma limpa, com sombra suave e sem moldura circular.
  - **Comportamento Inicial do Mapa**:
    - Removida a seleção automática de entrega e rota ao entrar no mapa.
    - O card inferior (`NextDeliveryCard`) e a linha tracejada da rota (`Polyline`) só aparecem quando o operador clica em um marcador de entrega específico no mapa.
    - Adicionado botão de fechar (`onCloseCard`) no card para permitir desmarcar e voltar à visão limpa panorâmica.

---

## 13. UI/UX do Recebimento de Mercadorias (Seleção Direta de Produto no Item e Layout Compacto)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - No recebimento de mercadorias, remover o bloco/input separado de adicionar item no topo que ocupava muito espaço vertical.
  - O input de seleção de produto deve ficar diretamente no próprio item / linha.
  - O botão de adicionar novo item deve ficar na mesma linha do título "Adicionar Item", reduzindo drasticamente o consumo de espaço em tela.
- **Implementação Realizada**:
  - `erp/src/components/PurchaseItemsSection.tsx`:
    - No modo de recebimento (`isReceiptMode = true`), o cabeçalho "ITENS DO RECEBIMENTO" agora possui o botão compacto `+ Adicionar Item` alinhado à direita na mesma linha.
    - O formulário vertical separado no topo com input e botão `+` foi removido no modo de recebimento.
    - Cada item agora suporta seleção direta de produto via `ProductAutocomplete` na própria linha/card: se o item for novo ou não tiver produto vinculado, o input inline aparece diretamente na linha. Após selecionar o produto, a descrição e o custo base são preenchidos automaticamente.
    - O botão de alterar produto permite trocar o produto do item a qualquer momento diretamente na linha.
  - `erp/src/pages/App/Stock/Receipts/ReceiptFormModal.tsx`:
    - Validação em `handleFinalize` para impedir confirmação caso haja algum item adicionado sem produto selecionado (`items.some((item) => !item.productId)`).
- **Validação de Testes**:
  - `goodsReceiptCode.test.ts`: 7 testes aprovados.
  - `useSupplierAutocomplete.test.ts`: 4 testes aprovados.
  - `receiptPeriodUtils.test.ts`: 6 testes aprovados.

---

## 14. Remoção de Produtos de Teste da Lista de Produtos
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**: Remover os produtos de teste da lista de produtos do ERP.
- **Investigação da Causa Raiz**:
  - 66 produtos com nomes como `"Pai B Teste Concorrencia"`, `"Pai A Teste Origem"`, `"Pai Origem Rollback"`, `"Pai B Concorrencia Mesma Var"` e `"Pai C Concorrencia Mesma Var"` estavam salvos com `deleted: false`, fazendo com que aparecessem na lista de produtos.
  - Esses produtos foram gerados durante execuções de testes de concorrência (`moveVariationConcurrency.test.ts`). O cleanup do teste tentava realizar `DELETE` físico via chave anon, mas uma trigger de integridade do Postgres impedia a exclusão física (`"Não é permitido excluir produtos do banco de dados para preservar o histórico. Utilize o campo active como false para desativar o produto."`).
- **Solução Aplicada**:
  1. Todos os 66 produtos de teste foram atualizados no banco de dados com `deleted: true`, `active: false` e `status: 'trash'`, sendo removidos imediatamente da lista de produtos ativa.
  2. Ajustado o cleanup dos testes em `erp/src/pages/utils/moveVariationConcurrency.test.ts` para realizar o soft delete correto (`update({ deleted: true, active: false, status: 'trash' })`), garantindo que novas execuções dos testes não voltem a poluir a listagem de produtos.
- **Validação**:
  - Consulta ao banco confirmou **0 produtos de teste restantes** na lista ativa (`Remaining test products in active list: 0`).
  - Suíte `moveVariationConcurrency.test.ts` executada com **3 testes aprovados (100%)** e cleanup validado.

---

## 15. Padrão Visual Canônico de Inputs (Fundo Branco vs Cinza, Borda Inferior e Focus Azul)
- **Status**: Concluído com Sucesso! 🚀
- **Regra Canônica de UI/UX**:
  - **Campos Editáveis**:
    - **Fundo**: Branco (`bg-white dark:bg-slate-900`).
    - **Borda**: Apenas embaixo (`border-0 border-b-2 border-slate-200 dark:border-slate-700 rounded-none`).
    - **Foco (Focus)**: Borda inferior azul (`focus:border-blue-600 dark:focus:border-blue-500 outline-none`).
  - **Campos Não-Editáveis (Calculados / Fixados / Somente Leitura)**:
    - **Fundo**: Cinza (`bg-slate-100` / `bg-slate-50 dark:bg-slate-800/60`), sem borda de foco azul.
- **Arquivos Ajustados**:
  - `erp/src/components/PurchaseItemsSection.tsx` (tabela desktop e cards mobile nos itens do recebimento e compras).
  - `erp/src/pages/App/Stock/Receipts/ReceiptFormModal.tsx` (data do recebimento e campos de despesas `ToggleValueField`).
  - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx` (itens da NF-e vinculados).
  - `erp/src/components/SupplierAutocomplete.tsx` (input de busca e seleção de fornecedores).
  - `docs/negocio/operacao/padroes-visuais-ui.md` (Seção 6 oficializada).

---

## 16. Subtotal e Total do Item Final no Recebimento de Mercadorias e Compras
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "Total do item deve se chamar total do item final, antes dele crie um campo de subtotal que é o valor total antes do frete, desconto, outras despesas".
- **Regra de Negócio e Visual**:
  - **Subtotal**: Calculado como `quantity * baseCost` (ou `quantity * unitCost` na importação de NF-e). É o valor bruto do item antes da aplicação de frete, desconto, outras despesas ou IPI rateados.
    - Como campo calculado/não-editável, segue o padrão canônico com fundo cinza (`bg-slate-50/70 dark:bg-slate-900/30`).
  - **Total do item final**: Nome oficial atualizado (antigo "Total do item"). Representa o montante geral do item após a incidência de todos os custos, fretes, descontos e despesas adicionais (`quantity * unitCostFinal`).
    - Fundo cinza (`bg-slate-100/60 dark:bg-slate-900/50`).
- **Arquivos Atualizados**:
  - `erp/src/components/PurchaseItemsSection.tsx`:
    - Tabela desktop: Adicionada a coluna `Subtotal` imediatamente antes de `Total do item final`. O cabeçalho foi renomeado de "Total do item" para "Total do item final".
    - Linha de itens: Inserida a célula de `Subtotal` (`formatCurrency(itemSubtotal)`). `colSpan` do `tfoot` e da linha vazia ajustados de forma consistente (8 e 10 respectivamente).
    - Cards mobile: Inserido o bloco de `Subtotal` antes do `Total do item final`.
  - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx`:
    - Grid expandida para 8 colunas.
    - Inserido card de `Subtotal` (`item.quantity * item.unitCost`) antes do card de `Total do item final`.
- **Validação de Testes**:
  - Testes unitários do recebimento e componentes executados: 17 testes aprovados (100%).

---

## 17. Largura Mínima dos Campos de Métricas dos Itens (Responsividade Fluida por Conteúdo Interno)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "a alrgura minima desses campso é igual ao tamanho do conteudo interno deles, entao se precisa chegar ao taamanho minimo para caber outros campos na linha, nao tem problema, pode diminuir ate chegar no minimo"
- **Solução Implementada**:
  - Em vez de uma grid fixa com colunas engessadas (`grid-cols-2 sm:grid-cols-3` ou `grid-cols-8`) que forçava espaços em branco gigantescos e quebras de linha artificiais, foi implementado layout flexível responsivo:
    - Container: `flex flex-wrap gap-2 pt-2 items-stretch`.
    - Cada campo (Custo unitário, Desconto, Frete, Outras despesas, Custo final, Subtotal e Total do item final):
      - `flex-1 min-w-fit`: Permite diminuir até a largura mínima intrínseca necessária para o seu conteúdo interno (`min-w-fit` / `whitespace-nowrap`).
      - Se a tela/janela tiver espaço, acomoda o máximo de campos possíveis na mesma linha (cabendo de 4 a todos os 7 campos lado a lado).
      - Os campos que dividem a linha expandem harmoniosamente com `flex-1` para preencher 100% da largura, sem sobrar lacunas vazias.
  - Aplicado em:
    - `erp/src/components/PurchaseItemsSection.tsx` (cards de itens de recebimento e compras).
    - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx` (itens vinculados de NF-e).

---

## 18. Alinhamento Estrutural e Modal Full Screen no Recebimento com NF-e
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "o modal de adicionar nfe que abre ao cadasstrar recibimento de mercadoria com nfe, deve seer o mesmo form do cadastro normmal da nf de entrada do moidul oide nf entrada, a diferença é soi que esta em modal msm"
  - Clarificação: "a opçao 2 mas em um modal full screen esse form" (manter o picker seletor de notas existentes, mas a tela de preenchimento/conferência do recebimento com base na NF-e ter a mesma estrutura do form de NF de entrada, e ser renderizado em modal full screen).
- **Implementações Realizadas**:
  1. **Full Screen no Cadastro de NF de Entrada (`InboundDocumentImportModal.tsx`)**:
     - O modal de importação e cadastro de NF de entrada foi atualizado de `max-w-5xl` para **Full Screen** (`w-screen h-screen rounded-none`), proporcionando máximo aproveitamento de tela tanto no módulo de NF de entrada quanto ao ser disparado pelo picker de recebimento ("+ Cadastrar nova NF de entrada").
  2. **Full Screen no Recebimento com NF-e (`ReceiptFormModal.tsx`)**:
     - Quando `initialInboundInvoice` está ativo, o modal agora opera em **Full Screen** (`h-screen w-screen rounded-none`) com cabeçalho rico, identificação da NF-e e emitente.
  3. **Mesma Estrutura de Formulário do Módulo de NF de Entrada**:
     - **Resumo Fiscal Oficial**: Inserido o componente canônico `<InboundInvoiceFiscalReview invoice={initialInboundInvoice} />` no topo, exibindo Natureza da Operação, Total dos Produtos, Total da NF, Frete, IPI, Desconto, Seguro e Outras Despesas.
     - **Dados da NF e Fornecedor**: Card padronizado exibindo Emitente, CNPJ, Chave de Acesso formatada em blocos de 4 dígitos e fornecedor vinculado no ERP.
     - **Itens da NF-e (`InboundNfeItemsSection.tsx`)**: Cabeçalho com indicador dinâmico de progresso de vínculos (`X de Y itens vinculados ao ERP`), dados fiscais detalhados por item (Cód. fornecedor, Descrição, NCM, CFOP, Unidade) e métricas alinhadas com o padrão (`min-w-fit`).
     - **Footer Fixo**: Total final com destaque, indicador de vínculos, botão de cancelar e confirmação de recebimento.
- **Validação de Testes**:
  - Bateria de testes de código de recebimento, autocomplete e filtros executada: 17 testes aprovados (100%).

---

## 19. Regra Global de 2 Dígitos para Pesquisa/Sugestões de Fornecedor no ERP e App Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "todos os campos de pesquisa de fornecedor do nnosso erp e do app deve ter de dgitiar 2 digitos para aparecer as sdugestoes"
- **Princípio e Experiência do Usuário (UX)**:
  - Eliminar poluição visual e abertura intrusiva de listas gigantes ao apenas focar ou clicar no campo de fornecedor.
  - Exigir obrigatoriamente a digitação de pelo menos 2 caracteres (`query.trim().length >= 2`) antes de disparar filtros ou apresentar o dropdown/cards com sugestões.
  - Informar de forma amigável no placeholder e dicas textuais que são necessários 2 caracteres para pesquisar.
- **Implementações Realizadas**:
  1. **ERP — Hook Central `useSupplierAutocomplete.ts`**:
     - Parâmetro padrão de `minChars` alterado para `minChars = 2`.
     - Sugestões só são calculadas e o menu flutuante só é aberto quando `query.trim().length >= minChars`.
  2. **ERP — Componente Global `SupplierAutocomplete.tsx`**:
     - Prop padrão atualizada para `minChars = 2`.
     - Placeholder padrão atualizado para `"Digite 2 ou mais letras para buscar fornecedor..."`.
     - Como `SupplierAutocomplete` é o componente oficial de seleção de fornecedores em todo o ERP, todas as telas herdaram a regra instantaneamente:
       - **Compras**: `Purchases/PurchaseFormModal.tsx`
       - **Recebimento de Mercadorias**: `Receipts/ReceiptFormModal.tsx` e `Receipts/PurchaseReceiptPickerModal.tsx`
       - **Filtros de Recebimentos**: `Receipts/ReceiptsHeader.tsx`
       - **Estoque & Auditoria**: `Stock/components/InventoryAuditModal.tsx`
  3. **ERP — Cadastro e Edição de Produtos (`ProductSupplierField.tsx`)**:
     - Busca com debounce e filtro interno ajustada com a guarda: `if (query.length < 2) return [];`.
     - Placeholder atualizado para `"Digite 2 ou mais letras para buscar fornecedor..."`.
  4. **App Mobile — Cadastro e Edição de Produtos (`ProductFormPricesTab.tsx`)**:
     - Implementado campo de busca estilizado com ícone de lupa, botão para limpar campo e feedback interativo.
     - Filtro `visibleSuppliers` implementado com verificação estrita: `if (q.length < 2) return selectedSup ? [selectedSup] : [];`.
     - Mensagem de orientação caso o usuário digite apenas 1 caractere: `"Digite pelo menos 2 caracteres para exibir as sugestões."`.
     - Preserva o fornecedor atualmente selecionado visível no card para fácil identificação e desmarcação.
  5. **Testes Unitários Automatizados**:
     - Atualizada a suíte `erp/src/components/supplier-autocomplete/useSupplierAutocomplete.test.ts`.
     - Validação do valor padrão `minChars = 2` e testes de digitação de 0, 1 e 2 caracteres.
     - 5 testes executados e 100% aprovados.

---

## 20. Alinhamento dos Ícones de Tipo de Pedido e Caminhão de Local Atual no Mapa de Entregas
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "aqui na foto é no wb expo em dev, os icones estao em numeros, mas o certo é icone de tipo do pedido, igual fica no app em produçao. ja o icone do local aatual, ta certo, é so um caminhao sem container, mas o app q nao ta terndo esse caminhçao igual o do web"
- **Diagnóstico da Causa Raiz**:
  1. **Números no Web (`DeliveryMapView.web.tsx`)**: O mapa web embutido em Leaflet renderizava `p.seq` (os números `1`, `2`, `3`...) dentro dos círculos das paradas, enquanto no app nativo em produção (`DeliveryMarker.tsx`) eram renderizados os ícones semânticos de atividade (`Truck`, `Package`, `Wrench`, `RotateCcw`, `Check`, `AlertTriangle`) com suas respectivas cores de status.
  2. **Caminhão do Local Atual no App Nativo (`DeliveryMarker.tsx`)**: O marcador nativo do motorista utilizava `<Truck size={28} color="#2563eb" fill="#2563eb" />` do Lucide, que desenha um caminhão baú fechado/container retangular. No web, por sua vez, era renderizado o emoji nativo `🚚`, que representa um caminhão sem container alto (estilo picape/mini truck com caçamba aberta).
  3. **Camada de Tiles no Web**: O mapa web do Leaflet utilizava os tiles do CartoDB que exibiam a marca d'água "API KEY REQUIRED".
- **Soluções Implementadas**:
  1. **Sincronização dos Ícones de Pedido no Web (`DeliveryMapView.web.tsx`)**:
     - Integrada a função canônica `getOperationActivityType`.
     - Adicionados os mesmos SVGs vetoriais dos ícones oficiais:
       - **Entrega**: Caminhão (`Truck`) com fundo verde (`#16a34a`).
       - **Retirada**: Pacote (`Package`) com fundo roxo (`#7c3aed`).
       - **Assistência Técnica**: Chave (`Wrench`) com fundo amarelo (`#eab308`).
       - **Coleta de Devolução**: Retorno (`RotateCcw`) com fundo laranja (`#f97316`).
       - **Concluída**: Check (`✓`) com fundo verde esmeralda (`#10b981`).
       - **Não Atendida**: Alerta (`!`) com fundo vermelho (`#ef4444`).
     - Adicionado o pino indicador inferior (`pinTip`), alinhando o formato visual exatamente com o do app nativo.
     - Atualizados os tiles para OpenStreetMap limpo sem marcas d'água.
  2. **Caminhão Sem Container no App Nativo (`DeliveryMarker.tsx`)**:
     - O marcador de motorista do app nativo agora utiliza o emoji `🚚` (`<Text style={styles.driverEmoji}>🚚</Text>`), idêntico ao do web, proporcionando o caminhãozinho sem container em ambas as plataformas.

---

## 21. Rastreamento em Tempo Real dos Outros Usuários no Mapa com Alerta de Sinal Vermelho "?"
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "quero que os outros usuarios parecem no mapa tbm, se a pessoa desligar ou ficar sem gps, ponteiro dele no mapa fica parado na ultima localziaçao que tava com sinal de ? do lado em vermelho"
- **Princípio e Experiência Operacional**:
  - Toda a equipe (motoristas, entregadores, montadores) pode acompanhar a localização geográfica mútua no mapa de operações em tempo real.
  - Se um membro da equipe desligar o GPS, fechar o aplicativo ou ficar sem sinal por mais de 3 minutos:
    - O ponteiro dele **permanece visível no mapa, exatamente na última localização conhecida**.
    - Ao lado do caminhãozinho, é exibido um **badge circular vermelho com o sinal `?` em destaque**.
    - O popup explicativo informa: *"⚠️ Sem sinal de GPS / Desligado • Visto pela última vez às HH:mm"*.
  - Quando o usuário está com GPS ativo e sinal recente, o caminhãozinho é exibido com badge ativo e nome do membro.
- **Implementações Realizadas**:
  1. **Banco de Dados Supabase (`team_locations`)**:
     - Criada migration oficial `20260912110000_create_team_locations.sql` com colunas:
       - `user_id`: Identificador único do membro da equipe.
       - `user_name`: Nome da pessoa exibido no marcador.
       - `latitude`, `longitude`: Coordenadas do último sinal de GPS.
       - `is_gps_active`: Booleano que indica se o sinal está ativo.
       - `last_seen`: Timestamp do último ping recebido.
     - Habilitado Row Level Security (RLS) e ativado **Supabase Realtime** (`supabase_realtime`) para propagação imediata entre os aparelhos conectados.
  2. **Camada de Domínio Puro (`teamLocationStatus.ts`)**:
     - Função `evaluateDisconnectedState`: Detecta se `!is_gps_active` ou se o tempo decorrido desde `last_seen` ultrapassou 3 minutos (`DISCONNECT_THRESHOLD_MS = 180.000 ms`).
     - Função `formatTeamMemberStatusLabel`: Gera os textos de status para tooltips e listas.
  3. **Serviço de Comunicação e Hook (`teamLocationService.ts` e `useTeamLocations.ts`)**:
     - `broadcastMyLocation`: Persiste a localização do usuário logado e atualiza para `is_gps_active = false` caso o GPS seja desligado, preservando a última latitude e longitude.
     - `subscribeToTeamLocations`: Escuta eventos de banco via Realtime Postgres Changes e atualiza a lista instantaneamente.
  4. **Marcador Nativo Android (`DeliveryMarker.tsx`)**:
     - Suporte a `isTeamMember` e `teamMember`.
     - Exibe o caminhãozinho `🚚`, pílula com o nome do colega e o badge circular vermelho com o símbolo `?` quando desligado ou sem sinal.
  5. **Marcador Web Leaflet (`DeliveryMapView.web.tsx`)**:
     - Renderiza os outros membros da equipe com pins HTML personalizados, nome do membro, caminhão e badge flutuante vermelho com `?`.
  6. **Integração nas Telas de Operação**:
     - Conectado em `DeliveriesHubScreen.tsx`, `TodayDeliveriesScreen.tsx`, `NativeLogisticsScreen.tsx` e `App.tsx`.
  7. **Validação e Testes**:
     - Testes unitários de domínio executados: **6 de 6 testes aprovados**.
     - Compilação TypeScript (`npx tsc --noEmit`): **0 erros**.

---

## 22. Correção Crítica na Persistência de Manuseios em Pedidos de Venda
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "os manuseios nao esta persistindo, na ediçao de um pedido de venda, ou estao persistindo como manuseio de montagem no local da entrega, msm que eu selecione outro, verifique e corrija isso, pois o manuseio selecionado deve persistir como manuseio selecionado realmente."
- **Diagnóstico e Causa Raiz**:
  1. **Efeito Destrutivo no Hook (`useSalesOrderForm.ts`)**:
     - Havia um `useEffect` nas linhas 213–221 que escutava `shipping.orderType` e forçava `setItems(currentItems => currentItems.map(item => ({ ...item, handlingType: shipping.orderType })))`.
     - Ao abrir o modal de edição de qualquer pedido existente (`loadOrderForEditing`), `shipping.orderType` era carregado do banco (onde frequentemente havia o valor legado ou padrão `"Na caixa > Montagem no local da entrega"`).
     - Como a referência inicial começava vazia `""`, o efeito disparava no primeiro render e **sobrescrevia o manuseio de todos os itens do pedido**, anulando as escolhas operacionais salvas.
  2. **Assimetria de Sincronização**:
     - O manuseio no Morante Hub pertence a cada item individualmente (`item.handlingType`). Quando o usuário alterava o manuseio de um item na tabela de produtos, o valor de `shipping.orderType` não era sincronizado com o item, mantendo o shipping em descompasso com o que o usuário escolheu.
  3. **Migração Agressiva (`handlingMigration.ts`)**:
     - A função `migrateOrderHandlings` aplicava o `fallbackHandling = order.shipping?.orderType` mesmo quando o item já possuía um manuseio válido preenchido, e dava prioridade ao `order.shipping.orderType` em vez de extrair o manuseio prioritário dos itens (`firstItemHandling`).
- **Soluções Implementadas**:
  1. **Remoção do Efeito Destrutivo em `useSalesOrderForm.ts`**:
     - Removido o efeito que sobrescrevia itens a partir de `shipping.orderType`.
     - Implementada sincronização unidirecional correta: `shipping.orderType` acompanha o manuseio definido nos itens (`firstHandling = items.find(i => i.handlingType?.trim())?.handlingType`).
     - Em `getOrderData` e `currentOrder`, assegurado que `shipping.orderType` reflete o manuseio selecionado nos itens.
  2. **Garantia de Atualização no Modal de Edição (`OrderEditModal.tsx`)**:
     - No momento de submissão da edição (`handleUpdate`), `updatedOrder` garante explicitamente que `items` e `shipping.orderType` refletem o estado mais recente de `form.state.items`, sem risco de reversão para valores legados.
  3. **Preservação Estrita em `handlingMigration.ts`**:
     - Ajustado para que `fallbackHandling` seja aplicado exclusivamente quando o item não possui nenhum manuseio informado (`!item.handlingType?.trim()`).
     - `migratedOrderType` prioriza o manuseio real dos itens (`firstItemHandling || resolveHandlingLabel(order.shipping?.orderType)`).
  4. **Bateria de Testes Automatizados**:
     - Criado teste unitário `src/pages/utils/handlingMigration.test.ts` (4 testes cobrindo preservação de manuseios individuais, fallbacks e legados do Bling).
     - Criado teste de integração de hook `src/pages/App/SalesOrder/salesOrderHandlingPersistence.test.ts` (2 testes em ambiente jsdom validando que o carregamento para edição e a alteração de manuseio persistem perfeitamente).
     - **Todos os 6 testes aprovados com 100% de sucesso**.

---

## 23. Remoção do Tooltip do Mapa e Preservação do Modal Resumido do Pedido
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "vc retirou o odal de pedido de quando clcia no icoene do pedido no mapa, eu so queria que tirasse o tooltip o pedido, nao o modal resimido do pedido que tem ate o botao de mostrar detalhes do pedido"
- **Ajustes Realizados**:
  1. **Remoção Estrita do Tooltip/Balão do Mapa (`DeliveryMapView.web.tsx`)**:
     - O `m.bindPopup(...)` dos marcadores de paradas foi removido do Leaflet.
     - Aquele balãozinho branco flutuante com o triângulo verde sobre o mapa não abre mais ao tocar ou clicar no ícone do pedido.
  2. **Preservação do Modal Resumido do Pedido (`DeliveryBottomSheet`)**:
     - Ao clicar no ícone do pedido no mapa, abre normalmente o **modal resumido do pedido** (`DeliveryBottomSheet`), que exibe a contagem de itens, o container avermelhado de observações com rótulos individuais e o botão *"Ver Detalhes do Pedido"*.
     - O botão *"Ver Detalhes do Pedido"* dentro do modal resumido abre o modal maior e completo (`OrderDetailsModal`).
  3. **Observações da Entrega em Flex Wrap Horizontal**:
     - O container de observações (`obsTagsContainer`) foi ajustado de `flexDirection: 'column'` para `flexDirection: 'row'`, com `flexWrap: 'wrap'` e `gap: 6`.
     - Os rótulos de observação agora ficam organizados lado a lado, aproveitando a largura do modal e quebrando linha apenas quando necessário, tornando o card muito mais compacto e limpo.
  4. **Validação**:
     - Compilação TypeScript do mobile (`npx tsc --noEmit`): **0 erros**.
     - Testes unitários do mobile: **100% aprovados**.

---

## 24. Exibição de Distância (KM) e Tempo Estimado no Modal Resumido de Entrega
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "nesse modal tem que ter a km e tempo estimado"
- **Implementações Realizadas**:
  1. **Propagação de Métricas da Routes API (`DeliveriesHubScreen.tsx`)**:
     - O hook `useRoutesApi` já calcula em tempo real o trajeto da localização atual até a parada selecionada. As métricas `distanceKm` e `durationMin` foram passadas diretamente como props para o `<DeliveryBottomSheet ... />`.
  2. **Pílulas Elegantes de KM e Duração (`DeliveryBottomSheet.tsx`)**:
     - Calculados `effectiveKm` e `effectiveDuration` com suporte a tempo real da Routes API e fallback inteligente para o cadastro do pedido.
     - Inseridas as novas pílulas na linha de métricas (`pillsRow`):
       - **Quilometragem**: `<Navigation size={12} /> {effectiveKm} km` em pílula azul suave (`#eff6ff` / `#1e293b`).
       - **Tempo Estimado**: `<Timer size={12} /> ~{effectiveDuration} min` em pílula ciano suave (`#f0f9ff` / `#0c4a6e30`).
  3. **Validação**:
     - Compilação TypeScript do mobile (`npx tsc --noEmit`): **0 erros**.
     - Testes unitários do mobile: **100% aprovados**.

---

## 25. Correção da Exibição de Nome e Código/SKU de Produtos Vinculados na NF de Entrada
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "nao ta mostrando o codigo de fato do produto cadastrado vinculado nem o nome dele, corrija isso deve msotrar os 2 dados e nao um '-'"
- **Causa Raiz**:
  - Quando um item da NF de entrada era mapeado via fornecedor (`findProductSupplierCodes`) ou restaurado do banco, apenas `matchedProductId` e `matchedVariationId` eram atribuídos, deixando `productErpName` como indefinido ou string genérica (`"Produto já vinculado..."` / `"Produto vinculado"`) e `linkedProductCode` como `undefined` / `—`.
  - Além disso, se o produto tivesse sido recém-cadastrado no modal ou em produtos com variação, o objeto local não trazia os SKUs persistidos sem um reload.
- **Solução Aplicada**:
  1. Criado serviço coeso `erp/src/pages/utils/inboundNfe/inboundItemProductResolver.ts` com funções `resolveLinkedProductDetails`, `enrichInboundItemsWithProductDetails` e `isGenericOrEmptyProductName`.
  2. Implementado cache de consulta em memória por ID e resolução tanto de produto simples quanto de variações específicas (`sku` e `name`).
  3. Integrado auto-enriquecimento reativo em `useInboundInvoiceItemsReview.ts`, `ManageInboundInvoiceMappingsModal.tsx` e fallback direto em `InboundInvoiceItemRow.tsx`.
  4. Testes automatizados criados em `inboundItemProductResolver.test.ts` com 100% de aprovação.

---

## 26. Auditoria de Cota e Consumo do Google Gemini (HTTP 429 e Otimização de Custos)
- **Status**: Diagnosticado e Documentado
- **Causa Raiz do Erro 429**:
  - Resposta do Google: `RESOURCE_EXHAUSTED: Your prepayment credits are depleted. Please add more credits or switch to a different plan.`
  - A conta do Google AI Studio associada à chave configurada esgotou seu saldo de créditos pré-pagos.
- **Vilões Potenciais de Consumo de Cota Identificados**:
  1. **Geração de Imagens no Criador de Posts / Marketing (`gemini-2.5-flash-image`)**: Imagens consomem de 10x a 50x mais saldo que chamadas de texto normais.
  2. **Áudio / TTS (`gemini-3.1-flash-tts` / `gemini-2.5-flash-preview-tts`)**: Modelos de voz possuem custos e quotas por minuto mais restritas.
  3. **Loops e Consultas em Lote Não Intencionais**: Abertura de telas com N itens pendentes sem interrupção de erro (corrigido: agora aborta imediatamente no primeiro 429 e prioriza regras locais determinísticas a R$ 0,00 e 0ms).
---

## 27. Sincronização Automática de NF-e de Entrada com SEFAZ / Ambiente Nacional (Distribuição DF-e)
- **Status**: Planejado / Em Backlog de Execução 📋
- **Objetivo**:
  - Evoluir o módulo existente de NF-e de Entrada do MoranteHub para receber automaticamente NF-e destinadas ao CNPJ da empresa por meio do serviço oficial `NFeDistribuicaoDFe`, mantendo integralmente os mecanismos manuais que já existem (upload de XML e bipagem/consulta de DANFE).
- **Regra de Ouro Inegociável (Fluxo de Execução)**:
  1. **Auditoria Prévia**: Mapear o que já existe no MoranteHub (tabelas, serviços, Edge Functions, componentes, parser/importador de XML, validação de chave, certificado digital e uploads manuais). Não criar arquitetura fiscal paralela.
  2. **Documentação Oficial Vigente**: Consultar o Portal Nacional da NF-e (NT 2014.002 e atualizações vigentes), MOC e SEFA/PR. Nunca implementar por suposição ou páginas obsoletas.
  3. **Desenho Arquitetural Conciso**: Reutilizar o importador existente e estruturar a Distribuição DF-e apenas como mais uma fonte de entrada.
  4. **Implementação Backend Segura**: Comunicação 100% no backend (segurança mTLS, sem certificados no front), locks atômicos por CNPJ/ambiente, controle de cursor NSU e prevenção de consumo indevido.
  5. **Testes e Homologação**: Mockar serviços SEFAZ em testes automatizados e validar integralmente em Homologação antes de liberar para Produção.

- **Fontes Oficiais Vigentes Confirmadas**:
  - [Portal Nacional da NF-e — NT 2014.002 / Distribuição DF-e](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=C%2FxkRclIh74%3D)
  - [SEFA/PR — Eventos da NF-e e Manifestação do Destinatário](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) (confirma que eventos de manifestação do destinatário são registrados no Ambiente Nacional).
  - [Portal Nacional da NF-e — Documentos e Schemas XML Oficiais](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=BttMW6T7ib8%3D)

- **Pilares Técnicos e Arquitetura Detalhada (44 Diretrizes)**:
  1. **Ambiente Nacional**: A Distribuição DF-e (`NFeDistribuicaoDFe` método `nfeDistDFeInteresse`) e os eventos de Manifestação do Destinatário ocorrem no Ambiente Nacional (não em endpoints estaduais do SEFAZ-PR).
  2. **Cursor distNSU**: Mecanismo principal de busca sequencial contínua a partir de `ultNSU` persistido. Nunca inventar, calcular ou tentar extrair NSU do corpo do XML.
  3. **Persistência de Estado e Locks**: Tabela de sincronização (ex: `fiscal_dfe_sync` com `company_id`, `cnpj`, `environment`, `last_nsu`, `max_nsu`, `last_sync_at`, `next_allowed_sync_at`, `last_cstat`, `sync_status`). Lock distribuído por CNPJ/ambiente para impedir chamadas concorrentes entre scheduler automático e clique do usuário.
  4. **Primeira Sincronização**: Respeitar regras oficiais da NT 2014.002 para primeiro acesso sem assumir histórico infinito (o fluxo manual atua como contingência).
  5. **Processamento de Lotes e docZip**: Descompactação segura de `retDistDFeInt -> loteDistDFeInt -> docZip` identificando os schemas (`resNFe`, `procNFe`, eventos).
  6. **resNFe vs procNFe**: Resumos não contêm itens da nota. Armazenar metadados em estado de resumo (`SUMMARY_ONLY`) e exibir na interface fiscal.
  7. **Manifestação do Destinatário**:
     - *Ciência da Operação* (`210210`): Dá ciência para liberar o download do XML completo no Ambiente Nacional. NÃO significa confirmação de recebimento da mercadoria.
     - *Confirmação da Operação* (`210200`): Conclusiva; nunca registrar automaticamente em silêncio.
  8. **Consulta Pontual pela Chave (`consChNFe`)**: Permitir consulta por 44 dígitos (respeitando a regra: se não houver manifestação adequada, SEFAZ devolve apenas o resumo).
  9. **consNSU**: Apenas para resolução pontual de falhas/lacunas, nunca para polling contínuo.
  10. **Tratamento Estrito de Códigos de Status (cStat)**:
      - `138`: Sucesso / documento localizado, avança cursor.
      - `137`: Nenhum documento localizado. Ativar cooldown de 1h antes da próxima consulta (`next_allowed_sync_at`), sem loops.
      - `656`: Consumo indevido. Bloqueio absoluto de retry imediato com registro de log técnico detalhado.
  11. **Continuidade de Lotes**: Se `ultNSU < maxNSU`, prosseguir sequencialmente até `ultNSU == maxNSU`.
  12. **Unificação com o Pipeline Existente**: O XML completo da SEFAZ converge para o mesmo `inboundInvoiceParser`, vinculação de fornecedor, vinculação de itens por código/SKU e cálculo de custos do upload manual.
  13. **Sem Duplicidade Fiscal**: Chave de 44 dígitos como autoridade (`UNIQUE(company_id, access_key)`). Não duplicar registros nem fornecedores/produtos.
  14. **Preservação Integral do Fluxo Manual**: Upload manual de XML e consulta por chave permanecem 100% disponíveis para notas antigas, contingência ou fornecedores diretos.
  15. **Segurança de Certificado Digital**: Backend-only, mTLS seguro, chaves privadas nunca expostas ao frontend nem registradas em logs.
  16. **Scheduler Backend**: Execução a cada ~1 hora, sempre checando `next_allowed_sync_at`, locks e cooldown antes de disparar.
  17. **Decisão de UX & Design (Tela Limpa e Sem Botão Permanente)**:
      - **Sem botão permanente de sincronização**: O funcionário não precisa operar rotinas fiscais no dia a dia. Sincronização 100% em background de hora em hora.
      - **Indicador discreto no topo**: Localizado na linha do filtro de período:
        `SEFAZ ✓ Atualizada há 18 min • Próxima verificação em ~42 min`.
        Botão "Tentar novamente" surge apenas excepcionalmente em caso de erro.
      - **Lista Única Integrada**: As notas descobertas entram na listagem padrão com o badge `NOVA • SEFAZ`. Se tiver apenas resumo, badge `XML PENDENTE` com ação `[ Obter XML ]`. Após processamento do XML completo, passa aos estados normais (`DISPONÍVEL`, `VINCULAÇÕES PENDENTES`).


- **Status**: Concluído com Sucesso! 🚀 (ERP e Mobile integrados)
- **Resumo da Entrega**:
  - **Banco de Dados (Supabase)**: Migration `20260924110000_expand_sefaz_nsu_control_and_manifestation.sql` aplicada com sucesso em produção (`hkoxhourxwlddgsfdgws`), adicionando controle de cooldown (`next_allowed_sync_at`), status, cStat, logs e suporte a eventos de manifestação.
  - **Backend / Edge Function (`sefaz-inbound-sync`)**:
    - Suporte a `action: "status"` (consulta instantânea do cursor/cooldown com R$ 0,00 e sem risco de 656).
    - Suporte a consulta pontual por chave de 44 dígitos (`consChNFe`) com download de docZip.
    - Suporte a busca em lote por cursor `distNSU` no Ambiente Nacional com mTLS seguro e cooldown de 1h obrigatório para `cStat 137`.
  - **ERP Web**:
    - `InboundInvoicesHeader.tsx`: Preservado o botão azul `IMPORTAR XML DA NF-E` no canto superior direito como fluxo de contingência/manual.
    - `SefazSyncStatusBadge.tsx`: Adicionado indicador minimalista e discreto ao lado do seletor de período (`SEFAZ sincronizada há X min • Próxima verificação em ~Y min`), sem botão de sincronização permanente na tela; link "Tentar novamente" apenas em erro.
    - `InboundInvoicesTable.tsx`: Tabela unificada exibindo badges `NOVA • SEFAZ`, `XML PENDENTE`, quantidade `— itens` para resumos (`resNFe`) e botão de ação `[ Obter XML ]`.
    - `InboundDocumentImportModal.tsx`: Adicionado botão `Buscar SEFAZ Direto` ao lado de `Consultar no Portal`, permitindo consultar o Ambiente Nacional diretamente pela chave digitada ou escaneada.
  - **App Mobile**:
    - `SefazSyncStatusBadge.tsx`: Criado componente nativo React Native discreto e integrado em `InvoicesScreen.tsx` na mesma linha do filtro de período.
    - `InvoiceCard.tsx`: Suporte a badges `NOVA • SEFAZ`, `XML PENDENTE`, exibição de `— itens` e ação direta para notas em estado de resumo.
    - `InvoiceImportModal.tsx`: Botões `Buscar SEFAZ Direto` e `Consultar no Portal` integrados, permitindo busca pontual com feedback nativo e recarregamento automático.
    - `stockService.ts`: Funções `fetchSefazSyncStatus`, `triggerSefazSync` e `consultSefazByAccessKey` adicionadas.
  - **Validação Estática e Testes**:
    - TypeScript Mobile: 0 erros nas telas de estoque/notas fiscais.
    - Vitest ERP: 14 suítes e 94 testes unitários de regras e parsing de NF-e aprovados.


