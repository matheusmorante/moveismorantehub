# Inventário de arquivos TypeScript acima de 500 linhas do MoranteHub

Atualizado em 31/10/2026. O catálogo inclui somente arquivos `.ts` e `.tsx` acima de 500 linhas; use `.tsx` quando houver JSX e `.ts` nos módulos sem JSX. As responsabilidades ainda não revisadas são inferidas pelo caminho.

## Resultado desta execução
- Escopo de extensão: `.ts` e `.tsx`; formatos diferentes ficam fora deste catálogo e desta automação.
- Arquivos TypeScript acima de 500 linhas atualmente catalogados: 130.
- Arquivos catalogados com alterações locais preexistentes foram preservados; nenhum deles foi editado nesta execução.
- Os estilos estáticos de `ProductFormBasicTab.tsx`, `ProductFormPhotosTab.tsx`, `ProductFormPricesTab.tsx`, `ProductFormScreen.tsx`, `ProductFormTechnicalTab.tsx`, `ProductFormVariationsTab.tsx`, `MobileMoveVariationModal.tsx`, `AttributesManagerModal.tsx` e `ProductTechnicalFieldInput.tsx` foram separados para módulos irmãos `.ts`; telas e chamadores mantiveram seus contratos.
- As operações de ambientes do ERP foram isoladas em `environmentService.ts`; `categoryService.ts` manteve os exports existentes como fachada.
- A consulta/agrupação das métricas de dashboard de APIs foi isolada em `apiUsageDashboardService.ts`; `ApiUsageTracker.getDashboardMetrics` manteve a assinatura pública.
- A configuração estática de menus de `MobileNav.tsx` foi isolada em `mobileNavMenuItems.ts`; permissões e renderização permaneceram no componente.
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
| `mobile/src/features/products/domain/productCharacteristics.ts` | 977 | Tipos e regras estáticas de características técnicas do produto no mobile | Tipos e definições foram extraídos para `productCharacteristicDefinitions.ts`; o módulo original mantém os exports públicos. Imports e referências revisados estaticamente; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx` | 1144 | Orquestra a sessão do editor de arte das etiquetas de preço | Componentes e hooks irmãos já isolam preview, barras, atalhos, interações e sessão de salvamento; o restante integra estado e callbacks. Nenhuma extração pequena com fronteira segura foi identificada; manter. Validação dinâmica pendente. |
| `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx` | 1144 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/customerSupport/customerSupportService.ts` | 1141 |  | Alteração local presente; preservar e não editar. |
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
| `mobile/src/features/products/screens/NativeProductsScreen.tsx` | 828 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx` | 652 | Renderização e coordenação da aba de preços, origem comercial e fornecedores do formulário mobile de produto | Estilos estáticos movidos para `productFormPricesTab.styles.ts`; imports e chamadores revisados estaticamente. Sem validação dinâmica. |
| `digital-catalog/src/app/perfil/page.tsx` | 808 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/AttributesManagerModal.tsx` | 646 | Interface e coordenação do gerenciamento de características e valores de produtos no app | Estilos estáticos movidos para `attributesManagerModal.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. |
| `erp/src/components/shared/AIChatAssistant.tsx` | 804 |  | Alteração local presente; preservar e não editar. |
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
| `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx` | 719 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/services/mobileProductTechnicalService.test.ts` | 717 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/whatsapp-support-send.ts` | 717 | Endpoint de envio de mensagens e arquivos do atendimento pelo WhatsApp/Meta | Sem diff próprio; classificação depende de `SendPayload` e `RequestBodyError`, compartilhados com o parser multipart; a rota é carregada por `whatsapp-webhook.ts` e o classificador tem import de teste. Preservar rota e export; reavaliar a extração junto ao limite do payload e erros. |
| `mobile/src/services/aiAgent/mobileAgentTools.ts` | 707 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/fiscalSnapshot.ts` | 703 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emit.ts` | 699 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/financial/financialIntentValidator.ts` | 614 | Validação de intenções financeiras, extração de fatos e processamento da entrada | A construção de perguntas agrupadas foi movida para `financialQuestionBuilder.ts`; o import local e o export público mantêm as chamadas existentes. Referências revisadas estaticamente; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelCanvasInteractions.ts` | 683 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx` | 681 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/logistics/components/today-summary/TodaySummaryCard.tsx` | 668 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/hooks/useMobileProducts.ts` | 666 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts` | 666 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelArtworkSession.ts` | 664 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx` | 660 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/finance/hooks/useFinancialAiChat.ts` | 651 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/offline/offlineSyncManager.ts` | 571 | Coordena a fila e sincronização de eventos offline; transforma cada evento em patch para o servidor | A transformação pura `eventPatch` foi extraída para `offlineEventPatch.ts`; o chamador interno e os chamadores do gerenciador permanecem iguais. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts` | 646 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts` | 646 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx` | 644 | Modal de recorte quadrado de fotos de produto, da preparação da imagem à confirmação do recorte | O bloco `StyleSheet` tem 37 linhas e pertence só a este modal; manter junto ao componente. Os dois chamadores foram localizados; sem alteração recomendada. |
| `erp/src/pages/App/Products/components/tabs/technical/useProductTechnicalTab.test.ts` | 641 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/ProductList/hooks/actions/catalogPublicationValidation.test.ts` | 634 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/operation-drafts.ts` | 629 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/tabs/technical/hooks/useTechnicalFieldApplicability.ts` | 628 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts` | 615 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/products/components/MobileProductCard.tsx` | 614 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelSession.ts` | 614 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/inventory/screens/InventoryScopeScreenContent.tsx` | 612 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Products/components/modals/product/ProductSaveResultModal.tsx` | 609 | Modal pós-salvamento que calcula prontidão ERP/Catálogo e coordena ativação, publicação e conclusão | Sem diff local; handlers dependem do estado de prontidão e mantêm operações distintas. Nenhuma fronteira pequena e independente identificada; preservar contratos e revisar o fluxo antes de refatorar. |
| `erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx` | 606 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/e2e/orders/order-normalization.spec.ts` | 602 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/orders/services/deliveryFlowService.ts` | 596 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx` | 506 | Campo de entrada de características técnicas no formulário mobile, incluindo seleção, opções e booleanos | Estilos estáticos movidos para `productTechnicalFieldInput.styles.ts`; import e uso no formulário técnico revisados estaticamente. Sem validação dinâmica. |
| `erp/src/pages/App/Stock/Inventory/components/InventoryOperationScreen.tsx` | 595 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/Agendamento.tsx` | 589 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobile.tsx` | 581 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelInteractions.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/financial/financialTextParser.ts` | 574 | Parser heurístico de texto em português para intenções financeiras | Importa o extrator dedicado, eliminando a dependência cíclica com `financialSlotFilling.ts`. Referências revisadas estaticamente; validação dinâmica pendente. |
| `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts` | 571 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/inventory/inventoryParity.test.ts` | 567 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/Router.tsx` | 566 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/__tests__/Agendamento.test.tsx` | 566 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/transportFiscalRules.test.ts` | 565 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/components/LoginScreen.tsx` | 564 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/inbound-manifestation.ts` | 561 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Registrations/shared/components/PersonCard.tsx` | 559 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/inboundNfe/services/inboundDeterministicScorer.ts` | 557 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts` | 557 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts` | 556 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktop.tsx` | 556 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/CustomerSupport/Index.tsx` | 555 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/divergenciasCorrecao.test.ts` | 550 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx` | 550 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/purchases/screens/purchases-screen/PurchasesScreen.tsx` | 549 | Tela e coordenação da lista de compras do estoque | Alteração local preexistente extensa e mudanças correlatas em `PurchaseCard.tsx`, `PurchasesScreenHeader.tsx`, estilos e utilitários; preservar e não editar até estabilizar. |
| `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx` | 549 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` | 548 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/orderCancellationPolicyEndpoint.test.ts` | 546 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts` | 545 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/danfeGeneratorModules.test.ts` | 543 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx` | 540 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/__tests__/financialInvariants.test.ts` | 535 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.test.tsx` | 535 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx` | 534 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelArtRenderer.tsx` | 534 | Renderização do canvas das etiquetas no editor e na impressão | Sem diff próprio; título e grupo preço/oferta já usam componentes irmãos, enquanto as demais camadas compartilham escala, seleção e callbacks de edição. Manter a composição até surgir uma fronteira menor comprovável; validação visual/dinâmica pendente. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeCustomerTab.tsx` | 531 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/fiscalRecipientIe.test.ts` | 528 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Profile/Index.tsx` | 528 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts` | 526 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/tabs/technical/ProductTechnicalTab.test.tsx` | 526 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/components/shared/QRScannerModal.tsx` | 526 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx` | 525 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx` | 520 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Products/modals/characteristicsAi/CharacteristicsDiffTable.tsx` | 518 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Marketing/Posts/index.tsx` | 516 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/fiscalDatabaseTypes.ts` | 512 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/services/technicalFieldService.test.ts` | 512 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx` | 511 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/orderEditFiscalAudit.ts` | 510 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emitHmlTechnical.ts` | 508 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductVariationActionsService.ts` | 504 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/aiService/aiProductCharacteristicsService.ts` | 502 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |

## Histórico de melhorias
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


## Validação e próximos passos

- Contagem de linhas conferida por leitura sequencial das extensões de texto/código. Nenhum teste foi executado.
- Antes de refatorar um candidato, confirmar o estado limpo do próprio arquivo, entender sua responsabilidade e localizar todos os chamadores. Arquivos fiscais, banco/schema, estoque e caminhos ERP/app seguem os gates específicos do `AGENTS.md`.
