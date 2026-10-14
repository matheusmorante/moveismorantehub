# Migração de todos os formulários — 14/10/2026

## Regra e estado

Pedido explícito do usuário: todos os formulários do sistema devem usar React Hook Form e zodResolver. Abrange ERP, aplicativo móvel e catálogo digital; não apenas tags `<form>`. **Em andamento: não considerar migração global concluída.**

Reutilizar schemas Zod explícitos de domínio e regras puras existentes. Campos dinâmicos continuam provenientes de tabelas; rascunho, finalização, consulta e baixa conservam contratos distintos. O resolver deve bloquear efeitos inválidos, preservar metadata/snapshots e apresentar erro. Instalar ou importar a biblioteca não comprova cobertura.

## Inventário e conferência

O [inventário detalhado do ERP](../audits/fiscal-2026-10-14/form-migration-inventory.md) registra proprietários, modais, autosave, importações e filtros. Checkboxes continuam pendentes até conferir todos os caminhos de cada proprietário. O censo abaixo é somente uma localização de integrações no código, não prova de que todos os callbacks do arquivo estejam migrados.

## Integrações localizadas

| Aplicação | Arquivos com integração localizada |
|---|---|
| erp | 110 |
| mobile | 29 |
| digital-catalog | 10 |

### erp

- `erp/src/components/auth/PasswordSetupPrompt.tsx`
- `erp/src/components/forms/ZodForm.tsx`
- `erp/src/components/shared/AIChatAssistant.tsx`
- `erp/src/components/shared/QRScannerModal.tsx`
- `erp/src/components/shared/SendWhatsAppModal.tsx`
- `erp/src/hooks/useAttendanceVoice.ts`
- `erp/src/hooks/useZodForm.ts`
- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.tsx`
- `erp/src/pages/App/DeliverySchedule/ShowroomAssemblyModal.tsx`
- `erp/src/pages/App/Finance/Payables/PayableModal.tsx`
- `erp/src/pages/App/Finance/Receivables/ReceivableModal.tsx`
- `erp/src/pages/App/Finance/Settings/index.tsx`
- `erp/src/pages/App/Finance/Transactions/index.tsx`
- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx`
- `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts`
- `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCceModal.ts`
- `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts`
- `erp/src/pages/App/Logistics/components/ShowcaseAssemblyModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/Ambientation/AmbientationStudioModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/Assets/AssetLibraryModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/CampaignManagerModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/Editor/ElementModelsPanel.tsx`
- `erp/src/pages/App/Marketing/Posts/components/Editor/usePostEditor.ts`
- `erp/src/pages/App/Marketing/Posts/components/Editor/useTemplateWorkspace.ts`
- `erp/src/pages/App/Marketing/Posts/components/GeneralCampaignRules.tsx`
- `erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/PostCreatorModelModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/PostsLibrary/UploadPostModal.tsx`
- `erp/src/pages/App/Products/Categories/hooks/useCategoriesAndEnvironments.ts`
- `erp/src/pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx`
- `erp/src/pages/App/Products/ProductList/modals/MergeVariation/useMergeVariation.ts`
- `erp/src/pages/App/Products/ProductList/modals/MoveVariationFamily/useMoveVariationFamily.ts`
- `erp/src/pages/App/Products/ProductTypes/Index.tsx`
- `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx`
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyAttributeModal.tsx`
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyCategoryModal.tsx`
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyNcmModal.tsx`
- `erp/src/pages/App/Products/Reconciliation/modals/ApplySupplierModal.tsx`
- `erp/src/pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx`
- `erp/src/pages/App/Products/components/modals/product/ProductConversionModal.tsx`
- `erp/src/pages/App/Products/components/modals/product/ProductMaterialManagementModal.tsx`
- `erp/src/pages/App/Products/components/modals/product/ProductTypeManagementModal.tsx`
- `erp/src/pages/App/Products/components/modals/variations/CartesianVariationModal.tsx`
- `erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx`
- `erp/src/pages/App/Products/hooks/form/useProductFormDraft.ts`
- `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts`
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts`
- `erp/src/pages/App/Products/hooks/variation/useVariationDraftAutoSave.ts`
- `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts`
- `erp/src/pages/App/Products/modals/PriceHistoryModal.tsx`
- `erp/src/pages/App/Profile/Index.tsx`
- `erp/src/pages/App/Registrations/shared/modals/PersonImportModal.tsx`
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts`
- `erp/src/pages/App/SalesOrder/AssemblyList/Index.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts`
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx`
- `erp/src/pages/App/SalesOrder/OrderHistoryList/StockCheckModal.tsx`
- `erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx`
- `erp/src/pages/App/SalesOrder/Reports/modals/ItemExclusionModal.tsx`
- `erp/src/pages/App/SalesOrder/Reports/modals/ProductReferenceModal.tsx`
- `erp/src/pages/App/SalesOrder/Reports/modals/ReportConfigModal.tsx`
- `erp/src/pages/App/SalesOrder/ReportsBling/Index.tsx`
- `erp/src/pages/App/SalesOrder/components/SmartAIFillModal.tsx`
- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.ts`
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts`
- `erp/src/pages/App/SalesOrder/modals/AssistanceOrderModal.tsx`
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`
- `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx`
- `erp/src/pages/App/Services/ServiceFormModal.tsx`
- `erp/src/pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx`
- `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx`
- `erp/src/pages/App/Settings/components/general/ProductMaterialsSection.tsx`
- `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx`
- `erp/src/pages/App/Settings/index.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts`
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts`
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx`
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts`
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelLayouts.ts`
- `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelModalsAndAssets.ts`
- `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelPrintingState.ts`
- `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelQueue.ts`
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelGridModelModal.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelImageModal.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelModelCreationModal.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelDataFillModal.tsx`
- `erp/src/pages/App/Stock/Movements/modals/InventoryMoveDeleteModal.tsx`
- `erp/src/pages/App/Stock/Movements/modals/InventoryMoveEditModal.tsx`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseFormModal.tsx`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx`
- `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts`
- `erp/src/pages/App/Stock/Receipts/modals/ReceiptAIFillModal.tsx`
- `erp/src/pages/App/Stock/Unavailabilities/hooks/useUnavailabilityForm.ts`
- `erp/src/pages/App/Stock/modals/StockLaunchModal.tsx`
- `erp/src/pages/App/Users/UserRolesModal.tsx`
- `erp/src/pages/App/Variations/hooks/useCharacteristicForm.ts`
- `erp/src/pages/Login/index.tsx`
- `erp/src/pages/ResetPassword/index.tsx`
- `erp/src/pages/Signup/index.tsx`

### mobile

- `mobile/src/components/LoginScreen.tsx`
- `mobile/src/components/modals/PasswordChangeModal.tsx`
- `mobile/src/components/modals/PasswordSetupModal.tsx`
- `mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx`
- `mobile/src/features/finance/components/TransactionEditModal.tsx`
- `mobile/src/features/finance/components/TransactionFilterModal.tsx`
- `mobile/src/features/finance/hooks/useFinancialAiChat.ts`
- `mobile/src/features/finance/hooks/useTransactionForm.ts`
- `mobile/src/features/orders/components/delivery/UnattendedModal.tsx`
- `mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx`
- `mobile/src/features/products/categories/hooks/useCategoryFormModal.ts`
- `mobile/src/features/products/modals/AttributesManagerModal.tsx`
- `mobile/src/features/products/modals/EnvironmentsManagerModal.tsx`
- `mobile/src/features/products/modals/MobileMergeVariationModal.tsx`
- `mobile/src/features/products/modals/MobileMoveVariationModal.tsx`
- `mobile/src/features/products/modals/ProductTypesManagerModal.tsx`
- `mobile/src/features/products/screens/ProductFormScreen.tsx`
- `mobile/src/features/schedule/components/CreateEventModal.tsx`
- `mobile/src/features/stock/inventory/hooks/useInventoryAuditWorkflow.ts`
- `mobile/src/features/stock/inventory/hooks/useInventoryPersistenceQueue.ts`
- `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx`
- `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx`
- `mobile/src/features/stock/moves/modals/InventoryMoveDeleteModal.tsx`
- `mobile/src/features/stock/moves/modals/InventoryMoveEditModal.tsx`
- `mobile/src/features/stock/moves/modals/StockPeriodModal.tsx`
- `mobile/src/features/stock/purchases/PurchaseFormModal.tsx`
- `mobile/src/features/stock/suppliers/SupplierFormModal.tsx`
- `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts`
- `mobile/src/hooks/useZodForm.ts`

### digital-catalog

- `digital-catalog/src/app/auth/login/page.tsx`
- `digital-catalog/src/app/auth/signup/page.tsx`
- `digital-catalog/src/app/page.tsx`
- `digital-catalog/src/app/perfil/page.tsx`
- `digital-catalog/src/components/forms/ZodForm.tsx`
- `digital-catalog/src/components/layout/header/search-bar.tsx`
- `digital-catalog/src/components/layout/user-nav.tsx`
- `digital-catalog/src/features/categories/components/categories-manager-modal.tsx`
- `digital-catalog/src/features/products/components/admin-product-modal.tsx`
- `digital-catalog/src/hooks/useZodForm.ts`

## Evidências e limites

Rodada anterior de 131 testes em 10 arquivos aprovada. Na continuação, 41 testes em 9 arquivos passaram (importação assistida, mensagens, catálogo, etiquetas, inventário, conciliação e relatórios), além de 6 testes de domínio/cadastro, 7 de chave/parser móvel e 4 dos handlers móveis com RN/serviços simulados. Execuções podem se sobrepor; não somar como uma contagem global. Compilação completa ERP passou em `scratch/rhf-erp-build-current.log`, incluindo startup fiscal e WASM/XSD, antes dos últimos ajustes de filtros e schemas móveis. Typecheck completo do catálogo passou; TypeScript global ERP/móvel continua com diagnósticos legados, conferidos separadamente dos arquivos alterados.

A interface ERP voltou a carregar após reiniciar o servidor local que mantinha um módulo compartilhado antigo. Submissão vazia do login foi bloqueada com erro visível; evidência `scratch/rhf-login-validation.png`. Isso não comprova todos os fluxos pela interface nem execução nativa do móvel.

CSV de pessoas, estoque/conferência, editores de etiquetas/marketing, relatórios e cadastro administrativo do catálogo receberam integração. No móvel, compra, composição, agenda, atributos, importação/vínculos, inventário e edição financeira receberam integração. Ainda é necessário fechar a conferência individual de callbacks e provas dos grupos recentes e dos filtros/buscas inline; o inventário ERP e o censo móvel não são listas encerradas. `StockCheckModal` não possui uso ativo: seu teste não cobre o fluxo operacional de badge. `ProductConfigModal` móvel é navegação e `InventoryReviewModal` ERP é revisão/confirmacão; seus campos pertencem aos proprietários correspondentes. Nenhuma transmissão SEFAZ, gravação comercial remota, nova DDL ou deploy foi usada como verificação.

A auditoria de autoridade do backend e o gerador sintético continuam seguindo sua sequência própria; população em massa não está autorizada por esta migração de interface.
