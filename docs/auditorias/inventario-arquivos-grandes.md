# Inventário de arquivos TypeScript acima de 500 linhas do MoranteHub — Atualizado em 01/11/2026.

Atualizado em 01/11/2026. O catálogo inclui somente arquivos `.ts` e `.tsx` acima de 500 linhas; use `.tsx` quando houver JSX e `.ts` nos módulos sem JSX. As responsabilidades ainda não revisadas são inferidas pelo caminho.

## Resultado desta execução
- Escopo de extensão: `.ts` e `.tsx`; formatos diferentes ficam fora deste catálogo e desta automação.
- Arquivos TypeScript acima de 500 linhas atualmente catalogados: 123.
- `WhatsAppConfigSection.tsx` teve as opções e a geração dos parâmetros de exemplo extraídas para `whatsappTemplateVariables.ts`, preservando os rótulos, valores e a chamada existente de envio.
- `CharacteristicsDiffTable.tsx` delega a montagem das linhas a `characteristicsDiffRows.ts`; as regras de seleção e a exportação do tipo `DiffRowItem` foram preservadas.
- `Marketing/Posts/index.tsx` delega a resolução da oportunidade do preview a `postPreviewOpportunityResolver.ts`; o componente passou a 500 linhas e saiu do catálogo.
- `Profile/Index.tsx` delega o cartão lateral (avatar, acesso ao app e logout) a `ProfileSidebarCard.tsx`; a validação e o upload do avatar continuam na página proprietária.
- `digital-catalog/src/app/perfil/page.tsx` delega o cabeçalho da conta a `ProfileAccountHeader.tsx`; os fluxos de nome, e-mail e senha continuam na página.
- `ChatComposer.tsx` delega os formatos e as transformações puras de texto para `chatMessageFormatting.ts`; foco, seleção do textarea, formulário e envio continuam no componente.
- `CustomerSupport/Index.tsx` delega o cálculo dos estilos responsivos dos painéis para `customerSupportPanelStyles.ts`; o estado e a montagem das áreas permanecem na página.
- `PriceLabelArtRenderer.tsx` e `PriceLabelDealPriceGroup.tsx` compartilham o componente `PriceLabelArtTransformHandles.tsx` para os controles repetidos de redimensionar e girar; camadas, cores, textos de ajuda e callbacks foram preservados.
- `ProductSquareImageCropModal.tsx` mantém o fluxo de recorte e delega os estilos estáticos ao módulo irmão `productSquareImageCropModal.styles.ts`; os dois chamadores e os estilos foram conferidos.
- `MobileProductCard.tsx` delega a apresentação da identidade do produto (imagem, título, composição e badges) a `MobileProductCardIdentity.tsx`; ações, preços, status e lista de variações continuam no card.
- `AIChatAssistant.tsx` delega a renderização duplicada do histórico e o auto-scroll para `AIChatAssistantMessages.tsx`; envio, voz, validação e persistência permanecem no assistente.
- `offlineSyncManager.ts` delega a preparação e o upload dos comprovantes locais de entrega de eventos pendentes para `deliveryProofQueuePreparation.ts`; a orquestração da fila e a ordem de sincronização permanecem no gerente.
- O alvo limpo `useFinancialAiChat.ts` teve seus schemas Zod específicos extraídos; arquivos com alterações locais próprias e dependências diretas foram preservados.
- Os estilos estáticos de `ProductFormBasicTab.tsx`, `ProductFormPhotosTab.tsx`, `ProductFormPricesTab.tsx`, `ProductFormScreen.tsx`, `ProductFormTechnicalTab.tsx`, `ProductFormVariationsTab.tsx`, `MobileMoveVariationModal.tsx`, `AttributesManagerModal.tsx` e `ProductTechnicalFieldInput.tsx` foram separados para módulos irmãos `.ts`; telas e chamadores mantiveram seus contratos.
- As operações de ambientes do ERP foram isoladas em `environmentService.ts`; `categoryService.ts` manteve os exports existentes como fachada.
- A consulta/agrupação das métricas de dashboard de APIs foi isolada em `apiUsageDashboardService.ts`; `ApiUsageTracker.getDashboardMetrics` manteve a assinatura pública.
- A configuração estática de menus de `MobileNav.tsx` foi isolada em `mobileNavMenuItems.ts`; permissões e renderização permaneceram no componente.
- As ferramentas financeiras do agente mobile foram agrupadas em `mobileAgentFinanceTools.ts`; `mobileAgentTools` preservou suas chaves públicas por spread no mesmo ponto.
- A leitura/normalização dos formatos atuais e legados de atributos de produto foi isolada em `productCharacteristicAttributes.ts`; exports públicos do módulo de domínio foram preservados.
- A sincronização do repositório local e dos caches de pedidos foi separada de `deliveryFlowService.ts` para `deliveryOrderCacheSync.ts`; as dez transições continuam chamando o mesmo helper na mesma ordem.
- A interface da recuperação de senha mobile foi extraída para `PasswordRecoveryScreen.tsx`; `LoginScreen.tsx` mantém os estados, handlers e validação RHF.
- A busca exclui .git, dependências, builds, caches, `tmp`, arquivos gerados, mapas, relatórios/dumps, evidências e binários.

## Arquivos `.ts` e `.tsx` com mais de 500 linhas

| Caminho | Linhas | Área/responsabilidade inferida | Estado e ação |
|---|---:|---|---|
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx` | 2482 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductMutationService.test.ts` | 2027 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/screens/ProductFormScreen.tsx` | 1686 | Orquestra o formulário mobile de produto, suas abas, validação, salvamento e rascunho | Estilos estáticos movidos para `productFormScreen.styles.ts`; import e interfaces públicas revisados estaticamente. Sem validação dinâmica. |
| `erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx` | 1814 | Tela de análise e relatórios de vendas, com filtros, carregamento, ordenação e visualizações | O arquivo está limpo, mas a pasta proprietária tem alterações locais em `Index.tsx` e `ProductReferenceModal.tsx`; evitar edição enquanto essa atividade estiver pendente e reavaliar depois. |
| `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx` | 1373 | Renderização e coordenação da aba de variações do formulário mobile de produto | Estilos estáticos movidos para `productFormVariationsTab.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. |
| `mobile/src/features/products/services/mobileProductFetchService.test.ts` | 1646 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts` | 1505 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx` | 1251 | Renderização e coordenação do formulário mobile de características técnicas de produtos | A definição estática de estilos foi movida para `productFormTechnicalTab.styles.ts`; os chamadores e a API da tela permanecem iguais. Referências revisadas estaticamente; validação dinâmica pendente. |
| `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts` | 1435 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/support-readonly/support-login.spec.ts` | 1336 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` | 1275 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/complementaryFinancialAssistant.test.ts` | 1242 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmission.test.ts` | 1223 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts` | 1216 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/domain/productCharacteristics.ts` | 883 | Regras de aplicabilidade, dependências, seleção e agrupamento de características técnicas no mobile | Tipos/definições estáticas e leitura, normalização e serialização de atributos atuais/legados ficam em módulos irmãos; exports públicos mantidos. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx` | 1144 | Orquestra a sessão do editor de arte das etiquetas de preço | Componentes e hooks irmãos já isolam preview, barras, atalhos, interações e sessão de salvamento; o restante integra estado e callbacks. Nenhuma extração pequena com fronteira segura foi identificada; manter. Validação dinâmica pendente. |
| `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx` | 1114 | Coordena o formulário, anexos, gravação, envio e interação do chat de atendimento | Formatos e transformações puras de texto extraídos para `chatMessageFormatting.ts`; UI e contratos de envio preservados. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/utils/customerSupport/customerSupportService.ts` | 1138 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/latestRulesBattery.test.ts` | 1134 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrix.test.ts` | 1020 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/offline/__tests__/offlineSyncAndModules.test.ts` | 1007 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/e2e/delivery-flow.spec.ts` | 1003 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/domain/productCharacteristics.test.ts` | 976 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/usePriceLabelState.ts` | 962 | Estado e snapshots do editor de artes de etiquetas de preço | Sem diff próprio; os setters alimentam a aplicação/restauração de snapshots e o hook de histórico. Nenhuma extração isolada segura foi identificada; manter até haver um limite de responsabilidade comprovável. |
| `erp/src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts` | 950 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts` | 948 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/interstate-outbound-fiscal-matrix/resolver.ts` | 932 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/components/catalog/ProductCatalogPanel.tsx` | 928 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/domain/mobileProductFormSchema.test.ts` | 890 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx` | 635 | Renderização e coordenação da aba básica do formulário mobile de produto (nome, categorias, origem e campos relacionados) | Estilos estáticos movidos para `productFormBasicTab.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. |
| `api/nfe/transmit-operation-draft.ts` | 873 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/e2e/products/categories-deletion-safety.spec.ts` | 867 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductMutationService.ts` | 854 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/MobileMoveVariationModal.tsx` | 701 | Modal para validar e mover uma variação de produto entre famílias | Estilos estáticos movidos para `mobileMoveVariationModal.styles.ts`; import revisado. O chamador tem diff local preexistente e foi preservado. Validação dinâmica pendente. |
| `mobile/src/features/products/screens/NativeProductsScreen.tsx` | 829 | Tela principal de produtos no app mobile | Arquivo tem alteração local; contagem reconciliada, preservar e não editar. |
| `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx` | 652 | Renderização e coordenação da aba de preços, origem comercial e fornecedores do formulário mobile de produto | Estilos estáticos movidos para `productFormPricesTab.styles.ts`; imports e chamadores revisados estaticamente. Sem validação dinâmica. |
| `digital-catalog/src/app/perfil/page.tsx` | 772 | Coordena edição de nome, e-mail e senha da conta no catálogo digital | Cabeçalho visual extraído para `ProfileAccountHeader.tsx`; formulários e validação Zod permanecem na página. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/modals/AttributesManagerModal.tsx` | 647 | Interface e coordenação do gerenciamento de características e valores de produtos no app | Estilos estáticos movidos para `attributesManagerModal.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. |
| `erp/src/components/shared/AIChatAssistant.tsx` | 623 | Assistente de IA do ERP: coordena conversa, histórico, voz e layouts drawer/flutuante | Renderização compartilhada das mensagens e auto-scroll extraídos para `AIChatAssistantMessages.tsx`; fluxo de conversa permanece no assistente. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/services/financial/financialSlotFilling.ts` | 716 | Preenchimento determinístico de campos ausentes em intenções financeiras | O extrator de campos desconhecidos foi movido para `financialUnknownFieldExtractor.ts`; este módulo preserva o export público. Chamadores revisados estaticamente; validação dinâmica pendente. |
| `supabase/functions/sefaz-inbound-sync/index.ts` | 795 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/fiscalXmlAudit.ts` | 790 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx` | 777 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `scripts/testing/fiscal-audit.ts` | 766 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx` | 755 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts` | 749 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/paymentMethodRules.test.ts` | 748 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/nfeServiceServerBoundary.test.ts` | 740 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductFetchService.ts` | 634 | Consulta e normalização das páginas de produtos do aplicativo mobile | O enriquecimento de disponibilidade de composições foi movido para `mobileProductCompositionAvailability.ts`; as duas chamadas existentes permanecem neste módulo. Referências revisadas estaticamente; validação dinâmica pendente. |
| `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx` | 722 | Modal de cadastro de recebimento de mercadorias no estoque mobile | Arquivo tem alteração local; contagem reconciliada, preservar e não editar. |
| `mobile/src/features/products/services/mobileProductTechnicalService.test.ts` | 717 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/whatsapp-support-send.ts` | 717 | Endpoint de envio de mensagens e arquivos do atendimento pelo WhatsApp/Meta | Sem diff próprio; classificação depende de `SendPayload` e `RequestBodyError`, compartilhados com o parser multipart; a rota é carregada por `whatsapp-webhook.ts` e o classificador tem import de teste. Preservar rota e export; reavaliar a extração junto ao limite do payload e erros. |
| `api/nfe/fiscalSnapshot.ts` | 703 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emit.ts` | 699 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/financial/financialIntentValidator.ts` | 614 | Validação de intenções financeiras, extração de fatos e processamento da entrada | A construção de perguntas agrupadas foi movida para `financialQuestionBuilder.ts`; o import local e o export público mantêm as chamadas existentes. Referências revisadas estaticamente; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelCanvasInteractions.ts` | 683 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx` | 681 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/hooks/useMobileProducts.ts` | 666 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts` | 666 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelArtworkSession.ts` | 664 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx` | 660 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/finance/hooks/useFinancialAiChat.ts` | 633 | Hook do chat financeiro mobile, coordenando mensagens, confirmações e sessão de voz | Schemas Zod específicos do chat foram extraídos para `financialAiChatSchemas.ts`; o hook mantém o mesmo uso de `useZodForm`. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/services/offline/offlineSyncManager.ts` | 506 | Coordena a fila, repetição, estado e resumo da sincronização offline | `eventPatch` fica em `offlineEventPatch.ts`; preparação e upload de comprovantes de entrega ficam em `deliveryProofQueuePreparation.ts`. Chamadores públicos mantidos; revisão estática feita e validação dinâmica pendente. |
| `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts` | 646 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts` | 646 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx` | 606 | Modal de recorte quadrado de fotos de produto, da preparação da imagem à confirmação do recorte | Definições estáticas de `StyleSheet` movidas para `productSquareImageCropModal.styles.ts`; fluxo e chamadores preservados. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Products/components/tabs/technical/useProductTechnicalTab.test.ts` | 641 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/ProductList/hooks/actions/catalogPublicationValidation.test.ts` | 634 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/operation-drafts.ts` | 629 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/tabs/technical/hooks/useTechnicalFieldApplicability.ts` | 628 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts` | 627 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/components/MobileProductCard.tsx` | 534 | Card mobile que integra dados derivados, ações, status e variações de um produto | A apresentação da identidade do produto foi extraída para `MobileProductCardIdentity.tsx`; props públicas e composição restante do card foram preservadas. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelSession.ts` | 614 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/inventory/screens/InventoryScopeScreenContent.tsx` | 613 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Products/components/modals/product/ProductSaveResultModal.tsx` | 609 | Modal pós-salvamento que calcula prontidão ERP/Catálogo e coordena ativação, publicação e conclusão | Sem diff local; handlers dependem do estado de prontidão e mantêm operações distintas. Nenhuma fronteira pequena e independente identificada; preservar contratos e revisar o fluxo antes de refatorar. |
| `erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx` | 606 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/e2e/orders/order-normalization.spec.ts` | 602 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/Inventory/components/InventoryOperationScreen.tsx` | 590 |  | Alteração local presente; contagem reconciliada sem editar o arquivo. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/Agendamento.tsx` | 589 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobile.tsx` | 581 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelInteractions.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/financial/financialTextParser.ts` | 574 | Parser heurístico de texto em português para intenções financeiras | Importa o extrator dedicado, eliminando a dependência cíclica com `financialSlotFilling.ts`. Referências revisadas estaticamente; validação dinâmica pendente. |
| `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts` | 577 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/Router.tsx` | 566 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/inbound-manifestation.ts` | 561 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Registrations/shared/components/PersonCard.tsx` | 591 | Cartão de pessoa na área de cadastros do ERP | Arquivo e pasta de registros têm alterações locais correlatas; contagem reconciliada, preservar e não editar. |
| `erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts` | 557 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktop.tsx` | 556 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/CustomerSupport/Index.tsx` | 520 | Orquestra o estado, os hooks e a montagem do layout do atendimento | Cálculo dos estilos responsivos dos painéis extraído para `customerSupportPanelStyles.ts`; estado, renderização e handlers mantidos. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx` | 550 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/purchases/screens/purchases-screen/PurchasesScreen.tsx` | 531 | Tela e coordenação da lista de compras do estoque | Alteração local extensa e mudanças correlatas em `PurchaseCard.tsx`, cabeçalho, estilos e utilitários; contagem reconciliada, preservar e não editar até estabilizar. |
| `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx` | 549 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` | 548 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx` | 512 | Seção de configuração da integração WhatsApp, consulta de modelos e envio de mensagens de teste | Opções e amostras de variáveis extraídas para whatsappTemplateVariables.ts; valores, chamada e fachada preservados. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.test.tsx` | 535 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx` | 534 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeCustomerTab.tsx` | 531 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx` | 520 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/fiscalDatabaseTypes.ts` | 512 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emitHmlTechnical.ts` | 508 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/inventory/inventoryParity.test.ts` | 567 | Testes de paridade do fluxo de inventário do app | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/__tests__/Agendamento.test.tsx` | 566 | Testes do agendamento de expedição | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/utils/nfe/__tests__/transportFiscalRules.test.ts` | 565 | Testes das regras fiscais de transporte | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `erp/src/pages/utils/inboundNfe/services/inboundDeterministicScorer.ts` | 557 | Pontuação determinística de candidatos de vínculo de NF-e de entrada | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts` | 556 | Testes dos serviços de ambiente de categoria de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/utils/__tests__/divergenciasCorrecao.test.ts` | 550 | Testes de divergências no processamento de correção | Sem diff próprio; responsabilidade inferida pelo caminho; confirmar o domínio antes de mudanças. |
| `erp/src/pages/utils/nfe/__tests__/orderCancellationPolicyEndpoint.test.ts` | 546 | Testes do endpoint de política de cancelamento fiscal | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts` | 545 | Hook de enriquecimento de itens no fluxo de emissão NF-e | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `erp/src/pages/utils/nfe/__tests__/danfeGeneratorModules.test.ts` | 543 | Testes de composição dos módulos do gerador DANFE | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `mobile/src/features/orders/services/deliveryFlowService.ts` | 541 | Coordenação das transições e efeitos do fluxo de entrega de pedidos | Alteração local presente; preservar e reavaliar após estabilizar. |
| `erp/src/pages/utils/__tests__/financialInvariants.test.ts` | 535 | Testes de invariantes financeiras | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/utils/nfe/__tests__/fiscalRecipientIe.test.ts` | 528 | Testes da inscrição estadual do destinatário fiscal | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `erp/src/pages/App/Products/components/tabs/technical/ProductTechnicalTab.test.tsx` | 526 | Testes da aba técnica do formulário de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/components/shared/QRScannerModal.tsx` | 526 | Modal compartilhado para leitura de QR code | Sem diff próprio; responsabilidade inferida pelo caminho; revisar chamadores antes de mudanças. |
| `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts` | 526 | Hook de formulário e estado das variações de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar chamadores antes de mudanças. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx` | 525 | Testes da submissão do formulário de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/App/Products/services/technicalFieldService.test.ts` | 512 | Testes do serviço de campos técnicos de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar referências antes de mudanças. |
| `erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx` | 511 | Modal de busca e seleção de clientes no pedido de venda | Sem diff próprio; responsabilidade inferida pelo caminho; revisar chamadores antes de mudanças. |
| `api/nfe/orderEditFiscalAudit.ts` | 510 | Auditoria fiscal das alterações de pedidos | Fiscal: inventariado por caminho e contagem; consultar a documentação vigente antes de qualquer refatoração. |
| `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx` | 506 | Campo de entrada para características técnicas do produto no app | Sem diff próprio; responsabilidade inferida pelo caminho; revisar chamadores antes de mudanças. |
| `mobile/src/features/products/services/mobileProductVariationActionsService.ts` | 505 | Ações e mutações de variações de produto no app | Alteração local presente; preservar e reavaliar após estabilizar. |
| `erp/src/pages/utils/aiService/aiProductCharacteristicsService.ts` | 502 | Serviço de IA para características de produto | Sem diff próprio; responsabilidade inferida pelo caminho; revisar chamadores antes de mudanças. |

## Histórico de melhorias
### 01/11/2026 — Extração da preparação de comprovantes da fila offline

- **Causa:** `offlineSyncManager.ts` coordenava as filas offline e também implementava a preparação dos comprovantes locais de entregas sem acompanhamento, incluindo upload e persistência progressiva do payload.
- **Solução:** o método `prepareDeliveryProofs` foi movido para `deliveryProofQueuePreparation.ts`; o gerente mantém a chamada no mesmo ponto, antes do envio limitado por timeout.
- **Arquivos:** `mobile/src/services/offline/offlineSyncManager.ts`, `mobile/src/services/offline/deliveryProofQueuePreparation.ts` e este inventário. A API pública `offlineSyncManager` e seus chamadores não mudaram.
- **Revisão estática:** o corpo foi comparado ao original após remover a indentação e permaneceu idêntico; imports, envio sequencial, chave de idempotência, atualização do payload após cada upload e chamadores foram conferidos. O gerente ficou com 506 linhas e o helper com 68. O catálogo continua com 124 arquivos e sem divergências de caminhos; nenhum teste foi executado, validação dinâmica pendente.

### 01/11/2026 — Extração do feed de mensagens do assistente do ERP

- **Causa:** `AIChatAssistant.tsx` mantinha duas cópias da renderização de mensagens, badges de ferramentas e indicador de carregamento, uma para cada layout; também continha o auto-scroll acoplado à tela inteira.
- **Solução:** extraído o feed para `AIChatAssistantMessages.tsx`, que centraliza a apresentação e o auto-scroll e conserva o espaçamento específico de drawer e floating. Envio, validação, voz, persistência e API pública do assistente ficaram no componente proprietário.
- **Arquivos:** `erp/src/components/shared/AIChatAssistant.tsx`, `erp/src/components/shared/AIChatAssistantMessages.tsx` e este inventário. `AppLayout.tsx` e os chamadores existentes seguem usando a mesma fachada.
- **Revisão estática:** as duas versões do feed, classes de espaçamento, conteúdo e indicador foram comparadas; referências e imports do assistente foram conferidos. A tela ficou com 623 linhas e o novo componente com 124. A varredura encontrou e reconciliou a contagem de `InventoryOperationScreen.tsx` (595 → 590), sem editar seu código local. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da tela de recuperação de senha mobile

- **Causa:** `LoginScreen.tsx` reunia o login e a apresentação das três etapas de recuperação de senha.
- **Solução:** a interface de recuperação foi movida para `PasswordRecoveryScreen.tsx`; `LoginScreen` continua proprietário dos estados, das chamadas de autenticação e dos formulários `useZodForm` com os mesmos schemas e handlers.
- **Arquivos:** `mobile/src/components/LoginScreen.tsx`, `mobile/src/components/PasswordRecoveryScreen.tsx` e este inventário. O ponto de entrada `mobile/App.tsx` manteve a mesma importação e props.
- **Revisão estática:** JSX e ações da recuperação conferidos, imports de ícones revisados, schemas e validações RHF permaneceram no componente proprietário. `git diff --check` passou; `LoginScreen.tsx` ficou com 363 linhas e a nova tela com 243. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da sincronização dos caches de entrega mobile

- **Causa:** `deliveryFlowService.ts` coordenava as transições do fluxo de entrega e também implementava a atualização do repositório local e dos dois caches offline de pedidos.
- **Solução:** `syncLocalOrderCaches` foi movida sem alteração para `deliveryOrderCacheSync.ts`; as dez chamadas continuam aguardadas antes do registro do evento offline, e a API pública `deliveryFlowService` permanece igual.
- **Arquivos:** `mobile/src/features/orders/services/deliveryFlowService.ts`, `mobile/src/features/orders/services/deliveryOrderCacheSync.ts` e este inventário.
- **Revisão estática:** corpo extraído comparado ao baseline e preservado; as dez chamadas aguardadas continuam antes do evento offline. O chamador `useDeliveryFlowActions`, os imports e a API pública foram conferidos. `git diff --check` e contagens do catálogo (104/104) passaram; serviço com 481 linhas e helper com 56. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Separação dos schemas do chat financeiro mobile

- **Causa:** `useFinancialAiChat.ts` misturava a coordenação de mensagens e voz com a definição dos schemas Zod específicos do chat.
- **Solução:** os schemas de mensagem, confirmação de intenção e transação foram movidos sem alteração para `financialAiChatSchemas.ts`; o hook continua submetendo os mesmos schemas por `useZodForm` e usando a validação de confirmação nos mesmos pontos.
- **Arquivos:** `mobile/src/features/finance/hooks/useFinancialAiChat.ts`, `mobile/src/features/finance/hooks/financialAiChatSchemas.ts` e este inventário.
- **Revisão estática:** usos, imports e validações de confirmação conferidos; a API retornada pelo hook não mudou. `git diff --check`, contagens do catálogo (105/105) e revisão final passaram. O hook ficou com 604 linhas e o novo módulo com 21. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Extração do parser e serializador de atributos de produto mobile

- **Causa:** `productCharacteristics.ts` misturava regras de aplicabilidade e agrupamento com compatibilidade de formatos legados/atuais de atributos de variação.
- **Solução:** normalização de nomes, parsing/normalização de valores, leitura dos atributos `showName`, resumo de cores e operações de upsert/remoção foram movidos para `productCharacteristicAttributes.ts`. O módulo original importa os helpers usados pela lógica restante e reexporta a API pública existente.
- **Arquivos:** `mobile/src/features/products/domain/productCharacteristics.ts`, `mobile/src/features/products/domain/productCharacteristicAttributes.ts` e este inventário.
- **Validação estática:** blocos transferidos preservados com apenas exportação dos helpers internos necessária ao consumidor; referências existentes continuam pelo caminho público `productCharacteristics.ts`; contagens finais de 883 e 113 linhas. `git diff --check` passou; nenhum teste foi executado e a validação dinâmica permanece pendente.

### 31/10/2026 — Isolamento das ferramentas financeiras do agente mobile

- **Causa:** `mobileAgentTools.ts` reunia ferramentas de operações, produtos, feedback e um grupo independente de consultas e preparações financeiras.
- **Solução:** as seis ferramentas financeiras foram movidas sem alteração de implementação para `mobileAgentFinanceTools.ts`; o objeto público mantém as mesmas chaves e a posição do grupo por spread, preservando o despacho pelo nome.
- **Arquivos:** `mobile/src/services/aiAgent/mobileAgentTools.ts`, `mobile/src/services/aiAgent/mobileAgentFinanceTools.ts` e este inventário.
- **Validação estática:** o bloco foi comparado integralmente ao original e não depende de `this`; dispatcher e declarações continuam apontando para os mesmos nomes em `mobileAgentTools`; contagens finais de 345 e 368 linhas. `git diff --check` e revisão das referências; nenhum teste executado, validação dinâmica pendente.

### 31/10/2026 — Separação da configuração da navegação mobile do ERP

- **Causa:** `MobileNav.tsx` mantinha a árvore estática de menus junto da filtragem por permissão e da renderização.
- **Solução:** a configuração `menuItems` foi movida sem alteração para `mobileNavMenuItems.ts`; o alias de import mantém o uso existente no componente e a lógica de permissões continua no mesmo lugar.
- **Arquivos:** `erp/src/components/layout/MobileNav.tsx`, `erp/src/components/layout/mobileNavMenuItems.ts` e este inventário.
- **Validação estática:** configuração comparada integralmente ao bloco original; `AppLayout` e o export do componente permanecem inalterados; contagens finais de 327 e 283 linhas. `git diff --check` e revisão das referências pendentes; nenhum teste executado, validação dinâmica pendente.

### 31/10/2026 — Extração da transformação de eventos offline

- **Causa:** `offlineSyncManager.ts` misturava a orquestração da fila com a transformação pura de cada evento em patch de estado.
- **Solução:** `eventPatch` foi movida sem alteração de lógica para `offlineEventPatch.ts`; `recordEvent` conserva a mesma chamada e os chamadores do gerenciador não mudaram.
- **Arquivos:** `mobile/src/services/offline/offlineSyncManager.ts`, `mobile/src/services/offline/offlineEventPatch.ts` e este inventário.
- **Validação estática:** o bloco transferido foi comparado ao original com apenas a exportação adicionada; referências verificadas no módulo offline e nos chamadores do gerenciador; contagens finais de 571 e 78 linhas. `git diff --check` passou para o arquivo rastreado. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação da consulta de métricas de APIs

- **Causa:** `ApiUsageTracker` reunia o registro de consumo e a consulta/agrupação do dashboard, que constitui uma responsabilidade de leitura independente.
- **Solução:** a implementação de `getDashboardMetrics` foi movida para `apiUsageDashboardService.ts`; a classe mantém o método estático com a mesma assinatura e delega ao novo serviço.
- **Arquivos:** `erp/src/services/apiMonitoring/apiUsageTracker.ts`, `erp/src/services/apiMonitoring/apiUsageDashboardService.ts` e este inventário.
- **Validação estática:** bloco de implementação conferido por reconstrução normalizada; os dois chamadores continuam usando `ApiUsageTracker.getDashboardMetrics`; o arquivo original ficou com 218 linhas e o novo com 376. `git diff --check` passou para o arquivo rastreado; nenhuma validação dinâmica ou teste foi executado.

### 31/10/2026 — Isolamento das operações de ambientes do ERP

- **Causa:** `categoryService.ts` agrupava a consulta e as mutações de ambientes com as responsabilidades de categorias e características.
- **Solução:** o tipo `Environment` e as funções de buscar, criar, atualizar, excluir e desvincular ambientes foram movidos sem alteração para `environmentService.ts`. `categoryService.ts` mantém a API anterior por importação/reexportação e `fetchGroupsAndCategories` segue usando `fetchEnvironments`.
- **Arquivos:** `erp/src/pages/utils/categoryService.ts`, `erp/src/pages/utils/environmentService.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** tipo e blocos de funções comparados ao baseline; chamadores, testes e reexports revisados. O chamador `useCategoriesAndEnvironments.ts` tinha alterações locais preexistentes e foi preservado. `git diff --check` passou; `categoryService.ts` ficou com 423 linhas e `environmentService.ts` com 144. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da tela do formulário de produto mobile

- **Causa:** `ProductFormScreen.tsx` concentrava a coordenação do formulário multiaba e uma definição estática de estilos compartilhados pela tela.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormScreen.styles.ts`, no mesmo diretório; a tela ficou com 1686 linhas e manteve sua API.
- **Arquivos:** `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/screens/productFormScreen.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; alias `ProductFormModal` e uso em `InboundQuickProductModal.tsx` revisados, sem alterações nos chamadores; `git diff --check` passou. O novo módulo ficou com 236 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do campo técnico mobile

- **Causa:** `ProductTechnicalFieldInput.tsx` agrupava o controle e seus modos de entrada com a definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productTechnicalFieldInput.styles.ts`, no mesmo diretório; o componente ficou com 506 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx`, `mobile/src/features/products/modals/tabs/productTechnicalFieldInput.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e uso em `ProductFormTechnicalTab.tsx` revisados; `git diff --check` passou. O módulo de estilos ficou com 91 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do gerenciador de características mobile

- **Causa:** `AttributesManagerModal.tsx` reunia a coordenação do gerenciamento de características e uma definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `attributesManagerModal.styles.ts`, no mesmo diretório; o componente ficou com 646 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/AttributesManagerModal.tsx`, `mobile/src/features/products/modals/attributesManagerModal.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductConfigModal.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 160 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do modal de movimentação de variação

- **Causa:** `MobileMoveVariationModal.tsx` mantinha a apresentação estática do modal junto à validação e coordenação da movimentação de variações.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `mobileMoveVariationModal.styles.ts`, no mesmo diretório; o componente ficou com 701 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/MobileMoveVariationModal.tsx`, `mobile/src/features/products/modals/mobileMoveVariationModal.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import revisado. O chamador em `NativeProductsScreen.tsx` foi inspecionado e seu diff local preexistente foi preservado. `git diff --check` passou; o novo módulo ficou com 149 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de variações do produto mobile

- **Causa:** `ProductFormVariationsTab.tsx` reunia a coordenação do formulário de variações e uma definição estática extensa de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormVariationsTab.styles.ts`, no mesmo diretório; o componente ficou com 1373 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx`, `mobile/src/features/products/modals/tabs/productFormVariationsTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductFormScreen.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 406 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de preços do produto mobile

- **Causa:** `ProductFormPricesTab.tsx` reunia a renderização e a coordenação de preços, origem comercial e fornecedores com uma definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormPricesTab.styles.ts`, no mesmo diretório; o componente ficou com 652 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx`, `mobile/src/features/products/modals/tabs/productFormPricesTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; imports e referências em `ProductFormScreen.tsx` e `ProductFormPricesTab.header.test.tsx` revisados; `git diff --check` passou. O módulo de estilos ficou com 164 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de fotos do produto mobile

- **Causa:** `ProductFormPhotosTab.tsx` mantinha uma definição estática de estilos de 250 linhas junto à coordenação das fotos e do recorte.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormPhotosTab.styles.ts`, no mesmo diretório; o componente ficou com 464 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormPhotosTab.tsx`, `mobile/src/features/products/modals/tabs/productFormPhotosTab.styles.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; o chamador em `ProductFormScreen.tsx` e os imports foram revisados; `git diff --check` passou. O módulo de estilos ficou com 281 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba básica do produto mobile

- **Causa:** `ProductFormBasicTab.tsx` mantinha a definição estática de estilos junto à coordenação dos campos básicos do produto.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormBasicTab.styles.ts`, no mesmo diretório; a tela permanece com 635 linhas e mantém a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`, `mobile/src/features/products/modals/tabs/productFormBasicTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductFormScreen.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 253 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba técnica do produto mobile

- **Causa:** `ProductFormTechnicalTab.tsx` mantinha a definição estática de estilos junto à coordenação do formulário e das características técnicas.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormTechnicalTab.styles.ts`, no mesmo diretório; a tela ficou com 1251 linhas.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx`, `mobile/src/features/products/modals/tabs/productFormTechnicalTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, imports e dois chamadores revisados e `git diff --check` passou. O novo módulo ficou com 211 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da tela de montagens

- **Causa:** `NativeAssembliesScreen.tsx` mantinha uma definição estática de `StyleSheet` junto com a tela e seu fluxo de dados.
- **Solução:** os estilos foram movidos sem alteração para `nativeAssembliesScreen.styles.ts`, no mesmo diretório; a tela importa o objeto e ficou com 459 linhas.
- **Arquivos:** `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx`, `mobile/src/features/assemblies/screens/nativeAssembliesScreen.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, imports e dois chamadores revisados e `git diff --check` passou. O módulo de estilos ficou com 57 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do detalhe de entrega no mapa

- **Causa:** `DeliveryBottomSheet.tsx` mantinha a definição estática de `StyleSheet` junto com a renderização do modal.
- **Solução:** o bloco de estilos foi movido sem alterações para `deliveryBottomSheet.styles.ts`, no mesmo diretório; o componente importa o mesmo objeto de estilos e ficou com 256 linhas.
- **Arquivos:** `mobile/src/features/logistics/components/deliveryMap/DeliveryBottomSheet.tsx`, `mobile/src/features/logistics/components/deliveryMap/deliveryBottomSheet.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, import e uso pelo chamador revisados e `git diff --check` passou. O módulo de estilos ficou com 266 linhas. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 31/10/2026 — Separação da construção de perguntas financeiras agrupadas

- **Causa:** `financialIntentValidator.ts` também concentrava a formatação de perguntas para lotes de intenções, responsabilidade independente da validação e processamento.
- **Solução:** `buildGroupedQuestion` foi extraída sem alteração do corpo para `financialQuestionBuilder.ts`; o módulo original mantém a função importada para uso interno e o export público. O validador ficou com 614 linhas.
- **Arquivos:** `mobile/src/services/financial/financialIntentValidator.ts`, `mobile/src/services/financial/financialQuestionBuilder.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** corpo comparado ao baseline, chamadas internas e reexport da fachada revisados e `git diff --check` passou. O novo módulo ficou com 76 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação da disponibilidade de produtos compostos no mobile

- **Causa:** `mobileProductFetchService.ts` combinava a consulta e normalização de produtos com o enriquecimento de saldo disponível para composições.
- **Solução:** `applyMobileCompositionAvailability` foi extraída sem alteração do corpo para `mobileProductCompositionAvailability.ts`; as duas chamadas, para resumo e listagem completa, permanecem no fluxo original. O serviço de busca ficou com 634 linhas.
- **Arquivos:** `mobile/src/features/products/services/mobileProductFetchService.ts`, `mobile/src/features/products/services/mobileProductCompositionAvailability.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** corpo comparado ao baseline, imports e duas referências revisados e `git diff --check` passou. O novo módulo ficou com 106 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Extração do reconhecedor de campos desconhecidos do financeiro

- **Causa:** `financialTextParser.ts` importava o extrator de `financialSlotFilling.ts`, que por sua vez importa `parsePtBrNumber` do parser, formando um ciclo de dependências evitável.
- **Solução:** o corpo de `extractUnknownFieldsFromText` foi movido para `financialUnknownFieldExtractor.ts`; o módulo antigo mantém o export público e o parser importa o novo módulo diretamente. `financialSlotFilling.ts` ficou com 716 linhas.
- **Arquivos:** `mobile/src/services/financial/financialSlotFilling.ts`, `mobile/src/services/financial/financialTextParser.ts` e `mobile/src/services/financial/financialUnknownFieldExtractor.ts`.
- **Validação estática:** corpo extraído comparado ao baseline, referências e imports revisados e `git diff --check` passou. O novo módulo ficou com 83 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação das definições de características do produto mobile

- **Causa:** o módulo de características reunia interfaces e definições estáticas com normalização, serialização, agrupamento e validação de domínio.
- **Solução:** os tipos e as definições estáticas foram extraídos para `mobile/src/features/products/domain/productCharacteristicDefinitions.ts`; `productCharacteristics.ts` preserva os exports existentes e ficou com 977 linhas.
- **Arquivos:** `mobile/src/features/products/domain/productCharacteristics.ts` e `mobile/src/features/products/domain/productCharacteristicDefinitions.ts`.
- **Validação estática:** chamadores permanecem no caminho público existente; imports, exports e referências foram revisados; `git diff --check` passou. O novo módulo ficou com 191 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos formatadores de nomes de produto

- **Causa:** `mobile/src/utils/orderUtils.ts` agrupava formatação de nomes e resumos de itens com utilitários de pedido de outras responsabilidades (662 linhas).
- **Solução:** os quatro formatadores foram movidos sem alterar seus corpos para `mobile/src/utils/productNameFormatters.ts`. Três chamadores agora importam do módulo dedicado; os exports antigos continuam reexportados por `orderUtils.ts`.
- **Arquivos:** `mobile/src/utils/orderUtils.ts`, `mobile/src/utils/productNameFormatters.ts`, `mobile/src/utils/aiSummaryHelper.ts`, `mobile/src/features/assemblies/components/AssemblyOrderCard.tsx` e `mobile/src/components/orders/OrderItemChip.tsx`.
- **Validação estática:** os blocos extraídos foram comparados e preservados a partir do baseline limpo; imports e reexports foram conferidos; `git diff --check` passou. `orderUtils.ts` ficou com 499 linhas e o novo módulo com 169. Nenhum teste foi executado.


### 31/10/2026 — Separação dos estilos do resumo de entregas

- **Causa:** `TodaySummaryCard.tsx` concentrava renderização e um bloco de estilos de 234 linhas no mesmo arquivo (900 linhas antes da mudança).
- **Solução:** o bloco `StyleSheet.create` foi movido sem alteração para `todaySummaryCard.styles.ts`; o componente importa `styles` do módulo dedicado e mantém a mesma API.
- **Arquivos:** `mobile/src/features/logistics/components/today-summary/TodaySummaryCard.tsx` e `mobile/src/features/logistics/components/today-summary/todaySummaryCard.styles.ts`.
- **Validação estática:** bloco de estilos preservado; referências `styles.*` continuam no componente; `git diff --check` passou. O componente ficou com 668 linhas e o módulo de estilos com 234. Nenhum teste foi executado.


### 01/11/2026 — Separação das definições de variáveis do WhatsApp

- **Causa:** `WhatsAppConfigSection.tsx` mantinha no componente as opções de quantidade de variáveis e os valores de exemplo usados no comando de teste do modelo.
- **Solução:** as opções e `getWhatsAppTemplateSampleVariables` foram movidos para `whatsappTemplateVariables.ts`; o componente continua controlando o formulário e chamando o mesmo serviço, com os mesmos parâmetros.
- **Arquivos:** `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx` e `erp/src/pages/App/Settings/components/integrations/whatsappTemplateVariables.ts`.
- **Validação estática:** valores, rótulos, condição para 8 variáveis e `slice` foram preservados; o componente, a fachada da seção, o chamador e o teste existente foram localizados. O arquivo de produção ficou com 512 linhas e o helper com 33. Nenhum teste foi executado; validação dinâmica pendente. O diff global também aponta linhas vazias no EOF em três arquivos não relacionados; foram preservados.

### 01/11/2026 — Extração da montagem das linhas de comparação de características

- **Causa:** `CharacteristicsDiffTable.tsx` agrupava renderização da tabela, classificação de valores já preenchidos e montagem das sugestões gerais, dimensões e características técnicas.
- **Solução:** a montagem pura das linhas e o tipo `DiffRowItem` foram movidos para `characteristicsDiffRows.ts`; a tabela mantém a memoização, a mesma dependência derivada de `identifiedProduct` e reexporta o tipo existente.
- **Arquivos:** `erp/src/pages/App/Products/modals/characteristicsAi/CharacteristicsDiffTable.tsx` e `erp/src/pages/App/Products/modals/characteristicsAi/characteristicsDiffRows.ts`.
- **Validação estática:** ordem das linhas, valores, chaves, critérios `Number(value) > 0`, confiança e classificação de campos preenchidos foram comparados ao código anterior; chamadores e barrel foram localizados. A tabela ficou com 385 linhas e o helper com 117. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da resolução de oportunidade do preview de posts

- **Causa:** `Marketing/Posts/index.tsx` combinava montagem da tela com a resolução dos campos legados de oportunidade presentes no produto usado pelo preview.
- **Solução:** a busca por ID, nome ou slug foi movida para `postPreviewOpportunityResolver.ts`; o componente conserva a mesma memoização e todos os consumidores recebem a mesma oportunidade resolvida.
- **Arquivos:** `erp/src/pages/App/Marketing/Posts/index.tsx` e `erp/src/pages/App/Marketing/Posts/services/postPreviewOpportunityResolver.ts`.
- **Validação estática:** condições, ordem de prioridade e retorno da busca foram comparados ao código anterior; uso em selo, dados do preview e chamadores do módulo foram revisados. O componente ficou com 500 linhas e o helper com 24. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cartão lateral do perfil

- **Causa:** `Profile/Index.tsx` misturava os formulários de perfil e senha com a apresentação do avatar, informações básicas, links de instalação do app e ação de logout.
- **Solução:** esse bloco foi extraído para `ProfileSidebarCard.tsx`. A página continua proprietária do upload e da validação Zod do avatar, além de preservar o export padrão e as props necessárias.
- **Arquivos:** `erp/src/pages/App/Profile/Index.tsx` e `erp/src/pages/App/Profile/components/ProfileSidebarCard.tsx`.
- **Validação estática:** o import da rota `/profile`, o import do componente no teste existente, o campo de arquivo, os textos/links e `avatarForm.validateAndRun` foram conferidos. A página ficou com 450 linhas e o novo componente com 104; o catálogo foi reconciliado para 124 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cabeçalho da conta no catálogo digital

- **Causa:** `digital-catalog/src/app/perfil/page.tsx` concentrava operações de conta e a apresentação independente do cabeçalho com identidade e logout.
- **Solução:** o cabeçalho foi movido para `ProfileAccountHeader.tsx`; os valores exibidos e o handler existente são recebidos por props, sem alterar os fluxos de conta.
- **Arquivos:** `digital-catalog/src/app/perfil/page.tsx`, `digital-catalog/src/app/perfil/components/ProfileAccountHeader.tsx` e este inventário.
- **Validação estática:** conteúdo, rótulos, condição do badge de administrador, callback de logout, link de retorno e rota `/perfil` foram revisados; todos os formulários e seus schemas Zod permaneceram na página. A página ficou com 772 linhas e o componente com 67. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração das transformações de formatação do chat

- **Causa:** `ChatComposer.tsx` acumulava configuração visual dos formatos do WhatsApp e a transformação pura do texto selecionado junto à coordenação do formulário e do textarea.
- **Solução:** as opções e os cálculos de texto/cursor foram extraídos para `chatMessageFormatting.ts`; o componente continua controlando foco, seleção, validação RHF/Zod e envio.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`, `erp/src/pages/App/CustomerSupport/components/chat/chatMessageFormatting.ts` e este inventário.
- **Validação estática:** lógica de inclusão/remoção dos marcadores, ordem numerada, seleção/cursor e opções visíveis foram comparados ao código anterior; consumidor, chamador e reexport da pasta foram localizados. O componente ficou com 1114 linhas e o helper com 75. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cálculo de estilos responsivos do atendimento

- **Causa:** `CustomerSupport/Index.tsx` misturava a composição da página e o cálculo detalhado de estilos responsivos para os painéis da caixa de entrada e das conversas.
- **Solução:** o cálculo puro dos dois objetos de estilo foi movido para `customerSupportPanelStyles.ts`; o estado e a renderização continuam na página.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/Index.tsx`, `erp/src/pages/App/CustomerSupport/customerSupportPanelStyles.ts` e este inventário.
- **Validação estática:** posições, larguras, limites, visibilidade, pointer events e transições mobile/desktop foram comparados ao código anterior; uso dos estilos, rota do módulo e estado dos painéis foram revisados. A página ficou com 520 linhas e o helper com 72. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Separação dos estilos do modal de recorte de foto

- **Causa:** `ProductSquareImageCropModal.tsx` concentrava a preparação/interação do recorte e 37 definições estáticas de apresentação no mesmo módulo.
- **Solução:** as definições foram movidas sem alteração para `productSquareImageCropModal.styles.ts`; o modal importa a mesma coleção `styles` e continua proprietário do fluxo, dos formulários e das operações de imagem.
- **Arquivos:** `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx`, `mobile/src/features/products/modals/components/productSquareImageCropModal.styles.ts` e este inventário.
- **Validação estática:** o bloco de estilos foi comparado ao baseline e permaneceu idêntico; os dois chamadores e as referências `styles.*` foram localizados. O modal ficou com 606 linhas e o módulo de estilos com 39. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 01/11/2026 — Extração da identidade visual do card mobile de produto

- **Causa:** `MobileProductCard.tsx` misturava a coordenação de ações, status e variações com o bloco de apresentação de imagem, título, composição e badges do produto.
- **Solução:** o bloco foi extraído para `MobileProductCardIdentity.tsx`, recebendo os mesmos valores já derivados pelo hook do card; a API pública e os handlers permanecem no componente original.
- **Arquivos:** `mobile/src/features/products/components/MobileProductCard.tsx`, `mobile/src/features/products/components/MobileProductCardIdentity.tsx` e este inventário.
- **Validação estática:** condições, dados, rótulos, acessibilidade e estilos da seção foram comparados ao bloco anterior; o único chamador e o teste existente foram localizados, sem alteração de suas interfaces. O card ficou com 534 linhas e o novo componente com 115. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 01/11/2026 — Extração dos controles de transformação das artes de etiqueta

- **Causa:** o renderer repetia a mesma renderização dos controles de redimensionar e girar em quatro camadas; o grupo de preço anterior repetia a mesma estrutura em três elementos.
- **Solução:** controles e handlers foram extraídos para `PriceLabelArtTransformHandles.tsx`; as camadas mantêm seus IDs, classes de redimensionamento e rótulos, inclusive o texto específico do preço promocional.
- **Arquivos:** `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelArtRenderer.tsx`, `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelDealPriceGroup.tsx`, `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelArtTransformHandles.tsx` e este inventário.
- **Validação estática:** as sete chamadas e os dois chamadores do renderer foram localizados; os callbacks, condições de seleção, classes, títulos e ícone foram comparados com o código anterior. `PriceLabelArtRenderer.tsx` ficou com 477 linhas e saiu do catálogo; o helper tem 49 linhas. `git diff --check` passou. Nenhum teste foi executado; validação visual/dinâmica pendente.

## Validação e próximos passos

- Contagem de linhas conferida por leitura sequencial das extensões de texto/código. Nenhum teste foi executado.
- Antes de refatorar um candidato, confirmar o estado limpo do próprio arquivo, entender sua responsabilidade e localizar todos os chamadores. Arquivos fiscais, banco/schema, estoque e caminhos ERP/app seguem os gates específicos do `AGENTS.md`.
