# Migração de todos os formulários — 14/10/2026

## Regra e estado

Pedido explícito do usuário: todos os formulários do sistema devem usar React Hook Form e zodResolver. Abrange ERP, aplicativo móvel e catálogo digital; não apenas tags `<form>`. **Em andamento: não considerar migração global concluída.**

Reutilizar schemas Zod explícitos de domínio e regras puras existentes. Campos dinâmicos continuam provenientes de tabelas; rascunho, finalização, consulta e baixa conservam contratos distintos. O resolver deve bloquear efeitos inválidos, preservar metadata/snapshots e apresentar erro. Instalar ou importar a biblioteca não comprova cobertura.

## Inventário e conferência

O [inventário detalhado do ERP](../audits/fiscal-2026-10-14/form-migration-inventory.md) registra proprietários, modais, autosave, importações e filtros. Checkboxes continuam pendentes até conferir todos os caminhos de cada proprietário. O censo abaixo é somente uma localização de integrações no código, não prova de que todos os callbacks do arquivo estejam migrados.

## Integrações localizadas

| Aplicação | Arquivos com integração localizada |
|---|---|
| erp | 72 |
| mobile | 8 |
| digital-catalog | 8 |

### erp

- `erp/src/components/auth/PasswordSetupPrompt.tsx`
- `erp/src/components/forms/ZodForm.tsx`
- `erp/src/components/shared/QRScannerModal.tsx`
- `erp/src/hooks/useZodForm.ts`
- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.tsx`
- `erp/src/pages/App/DeliverySchedule/ShowroomAssemblyModal.tsx`
- `erp/src/pages/App/Finance/Payables/PayableModal.tsx`
- `erp/src/pages/App/Finance/Receivables/ReceivableModal.tsx`
- `erp/src/pages/App/Finance/Settings/index.tsx`
- `erp/src/pages/App/Finance/Transactions/index.tsx`
- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx`
- `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts`
- `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts`
- `erp/src/pages/App/Logistics/components/ShowcaseAssemblyModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/Assets/AssetLibraryModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/CampaignManagerModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/GeneralCampaignRules.tsx`
- `erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx`
- `erp/src/pages/App/Marketing/Posts/components/PostCreatorModelModal.tsx`
- `erp/src/pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx`
- `erp/src/pages/App/Products/ProductList/modals/MergeVariation/useMergeVariation.ts`
- `erp/src/pages/App/Products/ProductList/modals/MoveVariationFamily/useMoveVariationFamily.ts`
- `erp/src/pages/App/Products/ProductTypes/Index.tsx`
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
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts`
- `erp/src/pages/App/Products/hooks/variation/useVariationDraftAutoSave.ts`
- `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts`
- `erp/src/pages/App/Products/modals/PriceHistoryModal.tsx`
- `erp/src/pages/App/Profile/Index.tsx`
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts`
- `erp/src/pages/App/SalesOrder/AssemblyList/Index.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.tsx`
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx`
- `erp/src/pages/App/SalesOrder/Reports/modals/ProductReferenceModal.tsx`
- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.ts`
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts`
- `erp/src/pages/App/SalesOrder/modals/AssistanceOrderModal.tsx`
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`
- `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx`
- `erp/src/pages/App/Services/ServiceFormModal.tsx`
- `erp/src/pages/App/Settings/components/general/ProductMaterialsSection.tsx`
- `erp/src/pages/App/Settings/index.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx`
- `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx`
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx`
- `erp/src/pages/App/Stock/Movements/modals/InventoryMoveDeleteModal.tsx`
- `erp/src/pages/App/Stock/Movements/modals/InventoryMoveEditModal.tsx`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseFormModal.tsx`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx`
- `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts`
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
- `mobile/src/features/finance/hooks/useTransactionForm.ts`
- `mobile/src/features/products/screens/ProductFormScreen.tsx`
- `mobile/src/features/stock/suppliers/SupplierFormModal.tsx`
- `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts`
- `mobile/src/hooks/useZodForm.ts`

### digital-catalog

- `digital-catalog/src/app/auth/login/page.tsx`
- `digital-catalog/src/app/auth/signup/page.tsx`
- `digital-catalog/src/app/perfil/page.tsx`
- `digital-catalog/src/components/forms/ZodForm.tsx`
- `digital-catalog/src/components/layout/header/search-bar.tsx`
- `digital-catalog/src/components/layout/user-nav.tsx`
- `digital-catalog/src/features/categories/components/categories-manager-modal.tsx`
- `digital-catalog/src/hooks/useZodForm.ts`

## Evidências e limites

Rodada de 131 testes em 10 arquivos aprovada (acesso, financeiro, campanhas, produtos, rascunhos e operações fiscais). Compilação ERP aprovada antes dos últimos ajustes de recebimentos/entrada/edição; startup fiscal e WASM/XSD aprovados. Typecheck do catálogo passou para os formulários já migrados. Typecheck global ERP/móvel possui diagnósticos fora da integração e está sendo separado por arquivos afetados. Rodadas posteriores estão nos logs locais de scratch e no histórico fiscal; não somar execuções sobrepostas.

Permanecem proprietários e callbacks pendentes: importações CSV, formulários de estoque/conferência, etiquetas/editor, relatórios, cadastro administrativo do catálogo, formulários móveis de compra/composição/agenda/atributos e demais itens do inventário. Nenhuma transmissão SEFAZ, gravação comercial remota, nova DDL ou deploy foi usada como verificação.

A auditoria de autoridade do backend e o gerador sintético continuam seguindo sua sequência própria; população em massa não está autorizada por esta migração de interface.
