# Migração de todos os formulários — 14/10/2026

## Regra e estado

Pedido explícito do usuário: todos os formulários do sistema devem usar React Hook Form e zodResolver. Abrange ERP, aplicativo móvel e catálogo digital; não apenas tags `<form>`. **Em andamento: não considerar migração global concluída.**

Reutilizar schemas Zod explícitos de domínio e regras puras existentes. Campos dinâmicos continuam provenientes de tabelas; rascunho, finalização, consulta e baixa conservam contratos distintos. O resolver deve bloquear efeitos inválidos, preservar metadata/snapshots e apresentar erro. Instalar ou importar a biblioteca não comprova cobertura.

## Inventário e conferência

### Continuação — 15/10/2026

No cadastro de produtos, o contrato compartilhado passou a reutilizar os números e campos de variação de `productVariationDraftSchema`. Foi removido o `z.any()` das variações; campos ausentes continuam permitidos no rascunho, mas números inválidos ou itens incompatíveis são rejeitados. Metadados são preservados. Submissão manual entrega o agregado parseado ao serviço, mantém o resolver ativo durante a gravação, compartilha uma trava entre rascunho/conclusão e aguarda identidade/versão do autosave. Ao concluir, uma chamada atrasada não transforma o cadastro de volta em rascunho. Histórico com causa, arquivos e evidências em [15/10](../fiscal/historico-correcoes-2026-10-15.md).

Na fila de etiquetas, adicionar produto e adicionar em branco passam pelo resolver antes de montar a fila; quantidades inválidas/fracionárias não são convertidas silenciosamente em um. A seleção em lote executa cada entrada em fila e preserva os vínculos de variação. Substituição conserva a etiqueta original quando a validação falha. Impressão conserva a trava durante geração dos identificadores e preparação da prévia. Leitura de arquivo conserva a trava até terminar e apresenta erros. Campos editáveis permanecem no proprietário da impressão, com validação real antes do efeito.

O cadastro de pessoas conserva o resolver durante duplicidade, persistência e sincronização de perfil; buscas de CEP/e-mail têm contratos próprios e ignoram respostas obsoletas. O cancelamento fiscal conserva uma trava comum durante execução, incluindo a intenção de abrir estorno, e mantém a confirmação por operação de Produção. Preparação, revisão e transmissão do rascunho fiscal também compartilham uma trava; cada resolver acompanha todo o serviço, preservando o resultado pendente e impedindo gravação de revisão durante transmissão. Os imports dos modais de pedido foram corrigidos após falha real da compilação, sem mudar a política fiscal/comercial.

**Prova atual:** 103 testes em 16 arquivos passaram (`scratch/rhf-all-form-owners-2026-10-15.log`), com adaptador, produtos, variações, características, etiquetas, arquivos, recortes, pessoas e cancelamento. São testes locais com serviços/canvas/impressão simulados, sem gravar produtos, pessoas ou identificadores remotos ou transmitir notas. O único teste existente de `PersonFormModal` simula seu hook e cobre o marcador autorizado; os cinco novos testes de `usePersonForm` exercitam o proprietário real com serviços simulados. Lint dos arquivos desta continuação passou sem erros, com avisos de dependências/variáveis existentes registrados em `scratch/rhf-product-label-lint.log`, `rhf-person-cancel-lint.log` e `rhf-sales-order-imports-lint.log`. Typecheck fiscal passou (`scratch/rhf-person-cancel-fiscal-tsc.log`). Compilação completa ERP passou. O TypeScript global continua com diagnósticos fora dos arquivos alterados; a migração global permanece aberta. O censo do catálogo foi atualizado para 13 arquivos após conferir os subformulários e o novo proprietário de salvamento; isso é localização estática, não nova prova ponta a ponta do catálogo.

O [inventário detalhado do ERP](../audits/fiscal-2026-10-14/form-migration-inventory.md) registra proprietários, modais, autosave, importações e filtros. Checkboxes continuam pendentes até conferir todos os caminhos de cada proprietário. O censo abaixo é somente uma localização de integrações no código, não prova de que todos os callbacks do arquivo estejam migrados.

**Fechamento da rodada de 15/10:** compilação completa ERP passou (`scratch/rhf-erp-build-person-cancel-final.log`, startup fiscal/WASM/XSD incluídos). O TypeScript global continua reprovado por diagnósticos fora deste lote; o relatório `scratch/rhf-person-cancel-tsc.log` não contém diagnósticos dos proprietários/contratos alterados nesta continuação. Typecheck fiscal passou. Não houve deploy nem validação visual de todas as telas. Próximas conferências continuam nos itens pendentes do inventário, incluindo proprietários de importação, reconciliação e formulários móveis/catálogo que ainda não possuem prova individual.

## Integrações localizadas

| Aplicação | Arquivos com integração localizada |
|---|---|
| erp | 132 |
| mobile | 34 |
| digital-catalog | 13 |

### erp

- `erp/src/pages/App/Products/Reconciliation/ProductReconciliation.tsx`
- `erp/src/pages/App/Products/Reconciliation/components/useReconciliationSupplierSearch.ts`
- `erp/src/pages/App/Products/Reconciliation/modals/useReconciliationSubmit.ts`

- `erp/src/components/shared/AddressAutocompleteInput.tsx`
- `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx`
- `erp/src/pages/App/Marketing/Posts/OpportunitySealLibrary.tsx`
- `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.tsx`
- `erp/src/pages/App/Products/components/tabs/images/SquareImageCropper.tsx`
- `erp/src/pages/App/Products/hooks/form/useProductFormImages.ts`
- `erp/src/pages/App/SalesOrder/components/OrderRouteMap.tsx`
- `erp/src/pages/App/Settings/components/ai/AIPromptsSection.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelQueue.tsx`
- `erp/src/pages/App/Stock/Receipts/components/ReceiptFiscalDocumentsSection.tsx`

- `erp/src/pages/App/SalesOrder/hooks/useOrderDistanceCalculator.ts`
- `erp/src/pages/App/Products/hooks/form/useProductFormAi.ts`
- `erp/src/pages/App/Products/components/variationTabs/VariationDescriptionTab.tsx`
- `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalDescriptionSection.tsx`
- `erp/src/pages/App/Products/components/modals/variations/VariationParentImagesSelectModal.tsx`
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
- `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts`
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
- `erp/src/pages/App/Marketing/Posts/index.tsx`
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
- `erp/src/pages/App/Products/components/modals/product/LabelPrintSelectionModal.tsx`
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
- `mobile/src/features/orders/hooks/useMobileOrders.ts`
- `mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx`
- `mobile/src/features/products/categories/hooks/useCategoryFormModal.ts`
- `mobile/src/features/products/hooks/useMobileProducts.ts`
- `mobile/src/features/products/modals/AttributesManagerModal.tsx`
- `mobile/src/features/products/modals/EnvironmentsManagerModal.tsx`
- `mobile/src/features/products/modals/MobileMergeVariationModal.tsx`
- `mobile/src/features/products/modals/MobileMoveVariationModal.tsx`
- `mobile/src/features/products/modals/ProductTypesManagerModal.tsx`
- `mobile/src/features/products/screens/ProductFormScreen.tsx`
- `mobile/src/features/schedule/components/CreateEventModal.tsx`
- `mobile/src/features/stock/inventory/hooks/useInventoryAuditWorkflow.ts`
- `mobile/src/features/stock/inventory/hooks/useInventoryPersistenceQueue.ts`
- `mobile/src/features/stock/invoices/hooks/useInvoices.ts`
- `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx`
- `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx`
- `mobile/src/features/stock/moves/modals/InventoryMoveDeleteModal.tsx`
- `mobile/src/features/stock/moves/modals/InventoryMoveEditModal.tsx`
- `mobile/src/features/stock/moves/modals/StockPeriodModal.tsx`
- `mobile/src/features/stock/purchases/PurchaseFormModal.tsx`
- `mobile/src/features/stock/purchases/usePurchases.ts`
- `mobile/src/features/stock/suppliers/SupplierFormModal.tsx`
- `mobile/src/features/stock/suppliers/useSuppliers.ts`
- `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts`
- `mobile/src/hooks/useZodForm.ts`

### digital-catalog

- `digital-catalog/src/app/auth/login/page.tsx`
- `digital-catalog/src/app/auth/signup/page.tsx`
- `digital-catalog/src/app/page.tsx`
- `digital-catalog/src/app/perfil/page.tsx`
- `digital-catalog/src/components/forms/ZodForm.tsx`
- `digital-catalog/src/components/layout/header/use-search.ts`
- `digital-catalog/src/components/layout/user-nav.tsx`
- `digital-catalog/src/features/categories/components/categories-manager-modal.tsx`
- `digital-catalog/src/features/products/components/admin-modal/dialogs/AttributeManagerModal.tsx`
- `digital-catalog/src/features/products/components/admin-modal/dialogs/VariationFormModal.tsx`
- `digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductSave.ts`
- `digital-catalog/src/features/products/components/admin-modal/steps/Step1Photos.tsx`
- `digital-catalog/src/hooks/useZodForm.ts`

## Evidências e limites

Rodada anterior de 131 testes em 10 arquivos aprovada. Na continuação, 41 testes em 9 arquivos passaram (importação assistida, mensagens, catálogo, etiquetas, inventário, conciliação e relatórios), além de 6 testes de domínio/cadastro, 7 de chave/parser móvel e 4 dos handlers móveis com RN/serviços simulados. Execuções podem se sobrepor; não somar como uma contagem global. Compilação completa ERP passou em `scratch/rhf-erp-build-current.log`, incluindo startup fiscal e WASM/XSD, antes dos últimos ajustes de filtros e schemas móveis. Typecheck completo do catálogo passou; TypeScript global ERP/móvel continua com diagnósticos legados, conferidos separadamente dos arquivos alterados.

A interface ERP voltou a carregar após reiniciar o servidor local que mantinha um módulo compartilhado antigo. Submissão vazia do login foi bloqueada com erro visível; evidência `scratch/rhf-login-validation.png`. Isso não comprova todos os fluxos pela interface nem execução nativa do móvel.

CSV de pessoas, estoque/conferência, editores de etiquetas/marketing, relatórios e cadastro administrativo do catálogo receberam integração. No móvel, compra, composição, agenda, atributos, importação/vínculos, inventário e edição financeira receberam integração. Ainda é necessário fechar a conferência individual dos demais proprietários do inventário; o inventário ERP e o censo móvel não são listas encerradas. `StockCheckModal` não possui uso ativo: seu teste não cobre o fluxo operacional de badge. `ProductConfigModal` móvel é navegação e `InventoryReviewModal` ERP é revisão/confirmacão; seus campos pertencem aos proprietários correspondentes. Nenhuma transmissão SEFAZ, gravação comercial remota, nova DDL ou deploy foi usada como verificação.

A auditoria de autoridade do backend e o gerador sintético continuam seguindo sua sequência própria; população em massa não está autorizada por esta migração de interface.

### Continuação conferida

Foram retiradas as oito cópias de schemas do catálogo; os antigos caminhos reexportam a fonte em `shared-utils`. O Next.js inclui a raiz compartilhada no bundler e no rastreamento de arquivos. ERP e catálogo compilaram; o typecheck completo do catálogo passou separadamente, pois o build está configurado previamente para não validar tipos.

`ZodForm.onValid` entrega o resultado parseado ao salvamento; montagens, referências, materiais, tipos, ativos, leitura manual e seleção rápida de variação utilizam esse callback. O modelo de post valida nome/prompt/formato, anexos e extras, com contratos próprios para salvar, gerar prévia sem nome e ler arquivos. Seleção de produtos/quantidades para etiquetas e seleção de modelo padrão passam pelo resolver antes de navegar/persistir.

A rodada do ERP passou em 58 testes em 6 arquivos (`scratch/rhf-latest-regression.log`), incluindo 7 de UI e 21 de API para consulta/transmissão em Produção. Os 11 testes móveis de busca/chave passaram. Os 6 testes de handlers móveis foram preservados em `erp/tests/mobile-forms/owners.test.tsx`; repetir com `npm run test:unit:mobile-forms --prefix erp`. Eles usam RN/serviços simulados e React do ERP, sem substituir prova de execução nativa. Teste real do modal de seleção de etiquetas também passou. As execuções têm sobreposições.

O badge ativo de checagem de estoque dispara somente uma alternância de estado, sem campos: `OrderOperationalBadges.tsx` → `createOrderHistoryOperations.handleStockCheckUpdate`. Ele não usa o modal legado e não é um formulário de quantidades. O teste de `StockCheckModal` continua limitado ao componente legado.

A conferência adicional localizou a busca móvel do catálogo fora do formulário desktop. Ambas agora usam `useSearch.submit`, com schema de busca submetida e prévias passando pela validação em fila em uma intenção separada. Campos filhos permanecem no proprietário; não foi acrescentada uma validação artificial em cada input.

O formulário móvel de composição tinha um componente inexistente e uma dependência de ícones ausente, que impediam a renderização; a busca inline também não tinha requisição conectada. O formulário reutiliza `lucide-react-native` e `fetchMobileProductsPage`, preserva a identidade da variação selecionada, ignora respostas obsoletas e valida o preço manual sem converter texto inválido em zero. O runner móvel passou em 7 testes, incluindo abrir/buscar/selecionar e salvar a composição com preço decimal. Continua sendo teste com serviços/RN simulados, sem gravação remota.

**Verificação final desta rodada:** 48 testes em 9 arquivos ERP passaram, mais 8 testes do boundary de busca/formulário após o ajuste do catálogo; os conjuntos têm sobreposições. Compilação ERP atualizada passou (`scratch/rhf-erp-build-completed-batch.log`); compilação e typecheck completo do catálogo passaram (`rhf-catalog-build-final.log`, `rhf-catalog-typecheck-final.log`); typecheck fiscal ERP passou (`rhf-fiscal-completed-tsc.log`). ESLint dos arquivos ERP alterados: zero erros e 23 avisos. TypeScript global ERP/móvel mantém diagnósticos legados; não está aprovado globalmente. Cobertura ponta a ponta de todas as telas e execução nativa móvel seguem pendentes, além da conferência dos demais proprietários marcados no inventário.

O runner de proprietários móveis fica em `erp/tests/mobile-forms`, fora do `src` do ERP, pois simula superfícies RN de outro projeto/versão de React; não é código de produção. Nenhuma aplicação foi excluída de typecheck para fazer os testes passarem.

### Continuação dos autosaves e proprietários restantes

O adaptador oferece `enqueueAndRun` para autosave e mantém `validateAndRun` com proteção contra duplo clique. Campanhas/regras/modelos não descartam mais um snapshot novo durante uma gravação lenta; falhas de validação e serviço ficam visíveis. Referências de imagens do criador de elementos foram incorporadas ao contrato e o upload valida os arquivos antes de ler.

O recebimento valida todos os custos, datas, anexos e observações persistidos, reutiliza a validação central da chave e envia os campos parseados. A conclusão aguarda a escrita pendente do rascunho, reutiliza sua identidade e impede conclusão duplicada/reescrita como rascunho após concluir. O pedido de compra recebeu a mesma proteção de identidade/concorrência, usa o estado atual ao fechar por Escape e valida arquivos PDF/imagem/limite de cinco antes do Storage.

Arquivos/linhas da compra nesta continuação:
- `shared-utils/purchaseFormSchemas.ts`: `20`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseFormModal.tsx`: `11`, `54`, `55`, `56`, `57`, `59`, `65`, `110`, `184`, `252`, `253`, `254`, `255`, `266`, `267`, `269`, `289`, `300`, `302`, `325`, `326`, `348`, `352`, `367`, `370`, `389`, `390`, `417`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseFormModal.test.tsx`: `1`

Provas específicas concluídas: 18 testes em `scratch/rhf-autosave-owners-tests.log`, três em `rhf-ncm-owners-tests.log` e seis em `rhf-purchase-receipt-tests.log`. As rodadas têm sobreposições. Todos os serviços externos são simulados; não houve compra, recebimento, mensagem, Storage ou transmissão real. A conferência global continua aberta.

### Recortes de imagem

Os proprietários `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx` e `erp/src/pages/App/Products/components/tabs/images/SquareImageCropper.tsx` também usam RHF + zodResolver. O recorte valida dimensões finitas/positivas, posição, limites da seleção e margem de 0 a 35% já oferecida na interface. O processamento usa os valores parseados e a trava acompanha compressão e confirmação. O recorte de marketing valida o arquivo antes de criar uma URL local e descarta a leitura quando o arquivo muda ou o componente fecha. Falhas de contexto/canvas/imagem geram feedback.

Cinco testes dos proprietários/contratos e regressões da galeria/geometria passaram: 18 testes em quatro arquivos, com sobreposição às rodadas anteriores (`scratch/rhf-image-crop-owner-tests.log`). Os testes simulam canvas/compressão; não afirmam qualidade visual do resultado no navegador. Compilação completa ERP após os recortes passou (`scratch/rhf-erp-build-image-crop.log`), incluindo o startup fiscal/XSD. Lint dos recortes e seu teste passou sem erros ou avisos (`scratch/rhf-image-crop-lint.log`). TypeScript global continua reprovado fora deste lote; não foram encontrados diagnósticos dos recortes/contratos no relatório `scratch/rhf-erp-image-crop-tsc.log`.

### Uploads e indisponibilidade

Mais sete entradas de integração localizadas no ERP:

- `erp/src/pages/App/Marketing/Posts/OpportunitySealLibrary.tsx`
- `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.tsx`
- `erp/src/pages/App/Products/hooks/form/useProductFormImages.ts`
- `erp/src/pages/App/Settings/components/ai/AIPromptsSection.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview.tsx`
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelQueue.tsx`
- `erp/src/pages/App/Stock/Receipts/components/ReceiptFiscalDocumentsSection.tsx`

O contrato em `shared-utils/fileFormSchemas.ts` exige arquivos `File` de imagem ou PDF conforme a intenção. Avatar, assistente, imagens de produto/substituição, anexos de recebimento e leitura de imagens para etiquetas passam pelo resolver antes da operação. Seletores de imagem de etiquetas reutilizam o contrato; os demais campos da fila continuam no proprietário da impressão, cuja conferência permanece pendente no inventário.

A indisponibilidade ganhou um contrato ERP que preserva os refinamentos existentes de quantidade/estoque/fornecedor e inclui fotos, observação e localização. Fotos inválidas são bloqueadas antes da prévia; o serviço recebe os campos parseados. O resolver permanece ativo durante a gravação para impedir dois salvamentos simultâneos.

O upload de elementos de marketing também mantém o resolver ativo durante o envio, sem liberar a trava após apenas parsear o arquivo. O schema preserva os formatos PNG/WebP/JPEG já permitidos. Os dois testes do proprietário bloqueiam GIF e envio concorrente, confirmando atualização da camada original.

**Prova desta rodada:** 46 testes em 12 arquivos passaram (`scratch/rhf-upload-owner-final-tests.log`), incluindo cinco dos proprietários de arquivos, dois da indisponibilidade, dois do upload de selos, dois do upload de elementos, cinco do perfil e regressões de compra, recebimento, produtos e contratos de marketing/catálogo. O teste do avatar inválido não substitui prova de upload válido do perfil. Typecheck fiscal passou (`scratch/rhf-fiscal-upload-tsc.log`); lint dos arquivos desta rodada passou com zero erros e oito avisos, em `scratch/rhf-file-owner-lint.log` e `scratch/rhf-element-owner-lint.log`. Compilação completa ERP passou (`scratch/rhf-erp-build-upload-batch.log`) antes do último ajuste do upload de elementos, que passou pelos testes específicos. O TypeScript global continua com diagnósticos fora deste lote; os diagnósticos dos proprietários e contratos alterados são conferidos separadamente. Todos os serviços são simulados.

### Devoluções e importação de NF-e — continuação de 15/10

Conferidos os proprietários ReturnOrderModal, UnlinkedReturnOrderModal e useInboundDocumentImport. O resolver acompanha a montagem e a chamada de gravação, e os serviços recebem os valores parseados. Agendamento/observações pertencem ao formulário de devolução; o contrato permite agendamento ainda vazio, preservando a política comercial existente. A devolução vinculada mantém a conferência de saldo, alocações fiscais e identidade idempotente anteriores.

ReturnItemsSelection preserva quantidade decimal e não converte campo vazio/zero em uma unidade. O proprietário rejeita uma linha selecionada inválida em vez de omiti-la e salvar apenas as demais. Os botões de quantidade preservam os limites anteriores. A divergência preexistente entre texto e status da devolução sem vínculo recebida na loja foi registrada no histórico fiscal para a auditoria de regra comercial.

Importação usa schemas distintos de arquivo XML, conteúdo XML e nota de entrada, antes de ler, interpretar e consultar/gravar, respectivamente. Arquivo, texto e arquivo inicial compartilham uma trava síncrona; a chave normalizada pelo resolver é a mesma consultada e salva, preservando letras de CNPJ/chave alfanumérica. Não cria fornecedores, nem transmite ou recebe estoque nesta operação.

**Validação:** 87 testes em 10 arquivos passaram (scratch/rhf-returns-import-regression.log), incluindo os proprietários, campo filho de quantidade, adapter RHF e regressões de saldo, política de devolução, parser XML, arquivos e recortes. Lint dos oito arquivos ERP desta rodada: zero erros, um aviso preexistente do efeito de importação (scratch/rhf-returns-import-lint.log). TypeScript global segue reprovado fora destes proprietários; não há diagnósticos dos arquivos alterados no relatório scratch/rhf-returns-import-tsc.log. Serviços são simulados; não constitui prova de navegador/nativo ou SEFAZ. Build ERP completo aprovado, incluindo startup fiscal/XSD (scratch/rhf-erp-build-returns-import.log); inventário global continua aberto.

As três entradas alternativas de NF de entrada (InboundAccessKeyModal, InboundXmlImportModal e InboundDocumentImportModal) também foram conferidas: callbacks protegidos durante o serviço, arquivo validado antes de leitura, scanner com resolver real e proteção mútua entre consulta e arquivo. A confirmação de Ciência da Emissão e ambiente da reconsulta permanecem explícitos. Doze testes de componentes com serviços e hook de importação simulados comprovam esses caminhos; complementam os 12 testes do hook real com serviços simulados, sem afirmar integração remota completa.

A busca até o serviço real encontrou perda de letras da chave nos módulos ativos de persistência/duplicidade. Eles agora reutilizam normalizeFiscalIdentifier em save/check/delete/markReceived, com cinco testes do gateway ativo; não altera o fallback offline existente nem recupera registros antigos truncados. A rodada consolidada passou em **106 testes / 13 arquivos** (scratch/rhf-returns-inbound-final-tests.log), com sobreposição aos 87 anteriores. Lint final: zero erros, um aviso preexistente. Build ERP completo aprovado após os ajustes de importação e persistência (scratch/rhf-erp-build-returns-inbound-final.log), incluindo startup fiscal/XSD; os últimos ajustes de fixture e scanner passaram também em 17 testes focados. TypeScript global continua reprovado fora deste lote, sem diagnósticos dos arquivos modificados no relatório final scratch/rhf-returns-inbound-final-tsc.log. A migração global permanece aberta.

### Meta integral e avanço de variações/categorias — 15/10

A meta ativa cobre todos os caminhos de formulário nas três aplicações. O inventário principal ERP tem **46 de 119 itens conferidos (38.7%), com 73 pendentes**. São itens de conferência/intenções, com proprietários e wrappers relacionados, não percentuais de código implementado ou de prontidão fiscal. O censo nativo inclui filhos e componentes sem submissão independente; mobile e catálogo ainda precisam de conferência individual. Um seletor composto só por botões foi descoberto e acrescentado ao denominador nesta rodada, por isso o total pode crescer durante a auditoria.

O salvamento intermediário de variação passa pelo resolver até concluir, tanto no cadastro definitivo quanto no agregado de rascunho. Dois testes de concorrência falharam antes da correção e passaram depois. O editor da variação entrega somente valores parseados, preservando campos fiscais e metadados. Doze testes do editor + sete do proprietário pai cobrem validação, SKU, rascunho/cadastro, variação única e falha/retomada. A expectativa antiga de impedir salvar metadados da variação única com pai incompleto foi substituída por duas provas distintas: metadados da única variação preservam o rascunho do pai; variação independente incompleta continua bloqueada.

O cadastro de categorias/ambientes já executava o resolver durante o serviço; oito testes conferiram criar/editar os dois tipos, nome parseado, vínculos/atributos, duplicidade e estados pendente/erro. O modal de seleção de fotos ganhou schema explícito e RHF, bloqueia identidades ausentes, indisponíveis, duplicadas e excesso de seleção; seleção vazia continua permitida. São sete testes do modal/contrato e dois de regressão do campo filho de fotos. As abas assistidas de variação permanecem pendentes, sem marcar o modal completo como concluído.

**Verificação:** 68 testes em sete arquivos aprovados (scratch/rhf-variation-category-regression.log), mais nove testes de fotos em dois arquivos (scratch/rhf-variation-photo-selection.log). Serviços/callbacks simulados, sem cadastro remoto ou upload. Lint dos proprietários passou com zero erros e três avisos preexistentes; lint do seletor/fotos sem avisos. Build ERP completo aprovado (scratch/rhf-erp-build-variation-category.log), incluindo startup fiscal/XSD. TypeScript global segue reprovado fora dos arquivos desta rodada; não há diagnósticos destes proprietários/contratos/testes em scratch/rhf-variation-category-photo-tsc.log. Não representa encerramento da meta.

### Intenções assistidas e atributos — continuação de 15/10

Conferidos ManageAttributesModal e VariationAttributeValueInput. O cadastro inline conserva o resolver até gravar; create/update/delete de opções do modal já usavam o resolver e ganharam provas de payload, coleção mínima, falha e concorrência. A remoção integral sem campos é uma ação de confirmação, não um formulário novo.

VariationDescriptionTab e VariationTechnicalDescriptionSection executam resolver antes de improveProductDescription, com schema compartilhado de título/descrição/medidas/peso e características dinâmicas escalares/listas. Não se exige conclusão do cadastro para uma sugestão; título ausente e números inválidos impedem a chamada. O indicador de processamento pertence ao callback válido: uma chamada concorrente recusada não libera o indicador da primeira. Campos de edição e herança permanecem no proprietário de variação.

**Provas:** 52 testes em oito arquivos aprovados em scratch/rhf-variation-assisted-regression.log, incluindo dez dos dois proprietários de IA, seis do cadastro inline, seis de gerenciamento, regressões de herança/campos técnicos e dos proprietários de variação. O teste inline, restrito a DOM, usa happy-dom como os demais componentes deste lote; o ambiente jsdom não iniciou por falta do binário opcional de canvas no Windows. Não foi substituído nenhum teste de canvas ou de navegador. Lint do lote sem erros/avisos; TypeScript global reprova fora dos arquivos alterados (scratch/rhf-variation-assisted-tsc.log não contém diagnósticos destes proprietários/contrato/testes). Build ERP completo aprovado (scratch/rhf-erp-build-variation-assisted.log), incluindo startup fiscal/XSD. Serviços de IA e persistência simulados.

O inventário principal ERP agora tem **50/122 itens conferidos (41.0%), 72 pendentes**. Foram acrescentados os dois proprietários assistidos conferidos e o hook de IA do produto ainda pendente, que não apareciam na lista principal. A métrica não mede a prontidão do sistema nem a cobertura global das três aplicações. A meta continua ativa.

### Sugestões do produto, conversão e abrangência das três aplicações — 15/10

useProductFormAi foi conferido nas sete intenções: categoria, combo, descrições WhatsApp/ecommerce, título, sugestão fiscal, aperfeiçoamento e preços. Cada uma tem schema explícito e resolver ativo durante o serviço; valores derivados usam dados parseados. Os requisitos existentes de medida/categoria e custo foram preservados. Corrigido o consumo dos retornos reais { name } / { description }, que antes eram atribuídos como objetos a campos textuais. Textos/preços inválidos ficam bloqueados sem substituir dados; margem zero informada é preservada. Não dispara classificação NCM ao abrir, mantém rascunho e conserva revisão fiscal antes de salvar.

Conversão ganhou contrato de números herdados, preserva transferências de código/SKU/estoque e mantém a variação de rascunho inativa/oculta. Seleção cartesiana deixa de descartar linhas incompletas antes da validação; ambos aguardam callbacks e conservam estado após falha. O cartesiano não tem consumidor ativo encontrado e seus três testes cobrem apenas o componente, sem declarar fluxo operacional.

**Provas:** 49 testes do proprietário de IA/abertura e dez dos modais de operações; consolidação final de 133 testes em 13 arquivos aprovada (scratch/rhf-product-ai-conversion-final-tests.log). Cinco testes dos modais falharam antes da correção (scratch/rhf-variation-operations-before.log). Todos os serviços/callbacks são simulados. Lint sem erros/avisos; TypeScript global reprova fora deste lote, sem diagnósticos dos arquivos alterados em scratch/rhf-product-ai-conversion-final-tsc.log. Build ERP completo aprovado (scratch/rhf-erp-build-product-ai-conversion-final.log), incluindo startup fiscal/XSD.

O checkpoint de sugestões/conversão registrou **53/122 itens conferidos (43.4%), 69 pendentes**. Para preservar o escopo integral, foi criado o [inventário mobile/catálogo](inventario-mobile-catalogo-2026-10-15.md): 91 arquivos candidatos no mobile e 31 no catálogo, incluindo filhos/wrappers/hooks. As localizações de integração continuam em 34 e 13 arquivos, respectivamente; isso não comprova cobertura. Os novos itens seguem pendentes até mapear os callbacks e a prova específica. Nenhuma porcentagem global das três aplicações é inferida desses censos.

### Autenticação mobile e catálogo — em conferência

Os proprietários de login, recuperação, criação e troca de senha já possuem schemas compartilhados, mas encerravam o resolver antes do serviço. A continuação mantém o resolver ativo durante cada operação e uma trava comum entre intenções concorrentes da mesma tela. Políticas de senha existentes permanecem: login aceita senha de conta legada; mobile exige oito caracteres na criação/troca; catálogo mantém seis no cadastro/recuperação. Nenhuma chamada real de Auth, e-mail ou alteração de conta será feita para os testes. Conferidos os três componentes móveis e as duas páginas do catálogo no inventário individual. Os nove testes móveis de Auth, sete do catálogo e três do prazo compartilhado passaram. O conjunto móvel soma 16 com os sete proprietários anteriores; todas as chamadas são simuladas, sem criação/alteração de conta, e-mail ou login real. Logs: scratch/rhf-mobile-auth-final-tests.log, rhf-catalog-auth-final-tests.log, rhf-auth-timeout-tests.log.

O limite compartilhado usa withTimeout e libera timers em sucesso/erro/prazo. A tela apresenta resultado não confirmado e não aplica sucesso tardio pelo callback; não há cancelamento do pedido no provedor nem retry automático. Os contexts de sessão permanecem responsáveis pelos eventos reais de Auth. Mobile e catálogo compartilham exatamente o helper via reexport no catálogo. Testes móveis/catálogo usam React do ERP com RN/router simulados; não substituem prova visual ou execução nativa. TypeScript completo do catálogo passou e o build Next passou (scratch/rhf-catalog-auth-build.log) antes do último ajuste de catch/erro, coberto por teste/TypeScript/lint posteriores. TypeScript móvel mantém erros de base fora dos componentes alterados, sem diagnóstico destes em scratch/rhf-mobile-auth-final-tsc.log. Lint dos componentes móveis/páginas do catálogo passou sem erros/avisos. As verificações de lint inicialmente rodadas fora de seu diretório ignoraram arquivos e não foram aceitas como prova; foram refeitas nas aplicações.

### Perfil do catálogo — seis intenções conferidas

Nome, solicitação/confirmação de novo e-mail, senha atual, pedido de recuperação e OTP/nova senha mantêm resolver real até a conclusão. Corrigido hook de formulário após retorno condicional de sessão, e-mail de contexto sem parse na reautenticação/recuperação e concorrência entre intenções. Logout verifica erro retornado pelo provedor; prazos não disparam alternativa OTP automaticamente. O rascunho de nome pertence ao ID da conta e as senhas mantêm o contrato existente. Dez testes do perfil passam após oito falhas comprovadas antes do ajuste; 17 testes totais do catálogo, TypeScript completo, lint da página e build Next finais aprovados (scratch/rhf-catalog-profile-*). Não há operação real de Auth ou prova de navegação nativa. O inventário individual agora registra três componentes móveis e três páginas do catálogo; Nesse checkpoint, o ERP principal registrava 53/122, 69 pendentes.

### Autenticação ERP — quatro proprietários adicionais conferidos

Login, cadastro, recuperação de senha e PasswordSetupPrompt mantêm RHF/zodResolver real durante seus efeitos. O botão de recuperação do login agora usa contrato de e-mail sem exigir senha. Os callbacks usam dados parseados; senhas preservam espaços, login conserva senhas legadas, cadastro exige seis e redefinição/criação exige oito caracteres. A trava comum de cada tela começa antes da validação e inclui OAuth/reenvio/saída quando aplicável. Serviços de Auth têm prazo local, erro visível e nenhuma repetição automática ou navegação/limpeza por sucesso tardio do callback.

AuthContext ignorava erro retornado por signOut e limpava a conta local mesmo sem confirmação: agora limita a espera, verifica o resultado e só limpa a conta após sucesso confirmado. Os eventos reais de sessão continuam pertencendo ao contexto; o prazo não cancela o provedor. As ações de saída e OAuth não têm campos e não recebem schemas artificiais.

Doze testes reproduziram falhas antes dos ajustes (scratch/rhf-erp-auth-before.log). Os testes finais somam 58 em oito arquivos, incluindo 35 dos quatro proprietários/contexto e 23 dos serviços/limite compartilhado (rhf-erp-auth-final-tests.log). São 14 testes novos sobre esses proprietários/contexto. Supabase, OAuth e navegação simulados, sem conta/e-mail real. TypeScript global ainda reprova fora deste lote, sem diagnósticos dos arquivos alterados (rhf-erp-auth-tsc.log). Lint dos cinco arquivos passou sem erros e com dois avisos existentes em AuthContext (dependência fetchProfile/fast refresh), preservados por estarem fora do ajuste.

**Checkpoint após autenticação do ERP: 57/122 itens conferidos (46,7%), 65 pendentes.** Censo de entradas também vincula os quatro proprietários; isso não transforma os 258 arquivos em formulários independentes. Mobile permanece com três componentes e catálogo com três páginas conferidos no inventário individual, sem percentual global presumido.

### Conferência posterior — cargos e fronteira do catálogo

UserRolesModal e seu caller tratam falha/prazo sem fechar a edição ou aplicar sucesso tardio; bloqueiam repetição e fechamento enquanto a validação/gravação estiver pendente. Opções permitidas vêm de SYSTEM_ROLES; lista vazia mantém a remoção intencional de acesso. Seis testes do modal/caller e lint passaram (scratch/rhf-user-roles-tests.log, rhf-user-roles-lint.log); TypeScript global continua reprovando fora destes arquivos, sem diagnósticos do lote (rhf-user-roles-tsc.log). O build ERP final passou (rhf-erp-auth-roles-final-build.log), incluindo as mudanças de autenticação. Aviso de tamanho dos chunks permanece. O modal de cargos é legado: Router encaminha /users para AccessAndUsersPage/PersonFormModal; os testes não representam execução da gestão ativa de permissões ou prova das regras do backend.

A fronteira ZodForm do catálogo também não tem consumidor ativo localizado. Seu contrato agora exige callback onValid com dados parseados, espera até sua conclusão e apresenta falhas; três testes específicos passaram. Com autenticação/perfil, são 20 testes do catálogo, TypeScript completo, lint da fronteira e build Next finais aprovados (scratch/rhf-catalog-profile-boundary-final-*, rhf-catalog-boundary-lint.log). Não contar a fronteira como uma quarta página operacional.

**Checkpoint anterior de autenticação: ERP principal 58/122 itens conferidos (47,5%), 64 pendentes.** O número inclui itens legados mapeados e conferidos, não significa 47,5% do código ou de todos os formulários das três aplicações. Mobile: três componentes conferidos; catálogo: três páginas e uma fronteira técnica. A conferência integral, os demais candidatos e as provas reais de navegação/dispositivo permanecem abertos.

Consolidação final destes lotes: 64 testes do ERP em dez arquivos (scratch/rhf-erp-auth-roles-final-tests.log), 16 móveis em dois (rhf-mobile-auth-account-final-tests.log) e 20 do catálogo em três (rhf-catalog-profile-boundary-final-tests.log): 100 execuções aprovadas, incluindo regressões existentes, não 100 testes novos ou cobertura de todos os formulários. Builds finais ERP e catálogo aprovados; TypeScript completo do catálogo aprovado, enquanto ERP/mobile mantêm as pendências globais já delimitadas. Nenhum teste realizou operação real de Auth, permissões, negócio, e-mail ou SEFAZ.

### Pedidos: submissões, autosave, data e consulta de distância — 15/10

Salvar rascunho manual reutiliza o mesmo contrato básico do autosave. Finalizar e salvar uma edição cadastrada preservam seus requisitos/status. O resolver fica ativo até código e persistência, recebe o snapshot antes da espera e entrega valores parseados; erros numéricos usam as chaves dos campos filhos. Artefatos de teste persistidos sem código comercial mantêm seu ID ao reabrir, e a conclusão não reinjeta um código comercial no retorno. Data apagada/inválida não vira horário atual: rascunho conserva o campo vazio inclusive na reabertura, enquanto a conclusão fica bloqueada. A conversão de datas preenchidas e a inicialização de pedido novo permanecem.

A consulta de distância foi identificada como proprietário adicional, incluindo disparo automático pelo cliente e botão de logística. Reutiliza schema de endereço/rota, valida por RHF antes do serviço, envia endereço parseado e impede resposta antiga após consulta nova/endereço inválido/troca de pedido. Compartilha pedido idêntico pendente, inclui coordenadas/placeId na chave e não substitui frete por números/rota/preço inválidos. Prazo local de 15s libera feedback sem retry ou aplicação tardia; não cancela o provedor. Mapa independente e autocomplete continuam pendentes no censo.

**Provas:** 45 testes em quatro arquivos (19 do formulário principal com cálculo real do hook, oito de autosave, 13 da consulta e cinco de manuseio), scratch/rhf-sales-order-distance-final-tests.log. Há falhas comprovadas antes das correções: rhf-sales-order-before.log, rhf-order-distance-before.log, rhf-order-context-before.log, rhf-order-date-before.log e rhf-order-draft-date-reopen-before.log. A fixture antiga de orçamento foi completada com produto/atendente; não se retirou validação para fazê-la passar. Lint dos três hooks/formatador sem erros/avisos e build ERP completo aprovado (rhf-sales-order-distance-final-lint.log, rhf-sales-order-distance-final-build.log), com aviso existente de chunks grandes. TypeScript global reprova fora do lote, sem diagnóstico dos arquivos alterados (rhf-sales-order-distance-final-tsc.log). Nada foi exercitado no provedor Maps, interface real, PostgreSQL transacional ou SEFAZ; serviços, código comercial e notificações são simulados. Nenhuma escrita comercial remota, alteração de SQL ou deploy. [Histórico fiscal e linhas alteradas](../fiscal/historico-correcoes-2026-10-15.md).

**Checkpoint anterior do inventário principal: ERP 61/123 itens conferidos (49,6%), 62 pendentes.** O denominador passou de 122 para 123 ao explicitar a consulta de distância já existente; não é aumento de escopo nem percentual de todo o ERP. Permanecem a composição dos campos filhos, edição/assistência/ações de pedidos, outros proprietários do ERP e conferência integral de mobile/catálogo. Mobile conserva três componentes conferidos e catálogo três páginas mais uma fronteira técnica, sem percentual global presumido.

### Endereços compartilhados e mapa de frete — 15/10

Busca, escolha da sugestão e consulta da localização executam resolvers reais antes de seus efeitos, com schemas compartilhados explícitos e dados parseados. Não tornam o autocomplete obrigatório para preencher manualmente o endereço. Consulta e complemento têm prazo local de 15s e ignoram retornos obsoletos. O complemento não substitui uma edição posterior de rua, número, CEP ou coordenadas; a mescla funcional preserva os demais campos. Nova seleção e edição física limpam coordenadas, identidade e links da localização anterior. Pessoa, entrega, assistência, emitente e mapa compartilham essa regra; os campos continuam pertencendo ao formulário de cadastro.

O mapa independente reutiliza o autocomplete nas duas entradas e valida o endereço antes de calcular. Solicitação idêntica pendente fica bloqueada; mudanças invalidam o cálculo anterior. Distância, duração, coordenadas, geometria e preço inválidos impedem resultado, e o valor exibido corresponde ao cálculo aprovado. Não houve alteração do provedor Maps nem das regras de transmissão fiscal.

**Provas:** 73 testes em seis arquivos (15 do autocomplete, 12 do mapa, seis de pessoa, 19 do pedido, oito de autosave e 13 de distância), `scratch/rhf-address-freight-final-tests.log`. Há falhas anteriores comprovadas de contrato/concorrência (rhf-address-autocomplete-before.log, rhf-route-map-before.log, rhf-address-context-before.log); um seletor incorreto do teste foi corrigido sem retirar a validação. Build ERP completo aprovado (rhf-address-freight-final-build.log); lint do lote sem erros e cinco avisos existentes (rhf-address-freight-final-lint.log). TypeScript global reprova fora dos arquivos fonte/testes deste lote (rhf-address-freight-final-tsc.log). Serviços e MapLibre são simulados: não há prova visual de WebGL, requisição real Maps ou escrita remota. [Causas e linhas alteradas](../fiscal/historico-correcoes-2026-10-15.md).

**Checkpoint após endereços/mapa: ERP 63/125 itens conferidos (50,4%), 62 pendentes.** Autocomplete e mapa, já presentes no censo, foram explicitados como proprietários de consulta. O denominador pode crescer ao conferir outros caminhos existentes; não mede a prontidão fiscal nem todos os formulários das três aplicações. A lista estática foi reconciliada com 129 arquivos ERP que contêm integração; importar biblioteca não comprova o efeito. Mobile permanece com três componentes e catálogo com três páginas e uma fronteira técnica conferidos. A meta integral permanece aberta.

### Importação de pessoas — leitura, prévia e gravação conferidas

Arquivo CSV/codificação e mapeamento/colunas recebem contratos compartilhados explícitos. O resolver antecede a leitura e a preparação da prévia; cada linha reutiliza o domínio de pessoa vigente, mostra seu erro e só linhas válidas escolhidas seguem à importação. Flags sem telefone/endereço e origem são reconhecidas no mapeamento, sem confundi-las com os campos de telefone/logradouro. CSV com aspas abertas é rejeitado. Nome/razão social precisa de uma coluna disponível.

A submissão permanece no callback RHF durante a gravação e usa os valores parseados. Estados por bloco de 50 conservam registros confirmados; erro/prazo marca o bloco sem confirmação e o exclui de qualquer repetição na mesma sessão. Registros ainda não enviados podem seguir, mas remapear não apaga os estados depois da primeira tentativa. Uma importação parcial com registros sem confirmação permanece aberta para conferência. Leitura tem prazo de 15s e gravação 30s, sem retry nem aplicação tardia de sucesso. O prazo não cancela a gravação no provedor. Fechamento, reabertura, desmontagem ou troca do destino invalidam callbacks e próximos blocos da sessão antiga; não desfazem uma gravação já enviada.

**Provas:** 16 testes do proprietário em rhf-person-import-final-tests.log; 89 testes conjuntos em sete arquivos em scratch/rhf-address-import-final-tests.log. Seis de sete casos iniciais falhavam antes da correção (rhf-person-import-before-corrected-fixtures.log); duas fixtures foram antes alinhadas ao label ANSI e aos matchers instalados, sem relaxar a regra. Lint do modal sem erros/avisos; build ERP aprovado (rhf-person-import-final-lint.log, rhf-person-import-final-build.log). TypeScript apontou três erros próprios de tipagem, corrigidos; a execução final mantém apenas diagnósticos fora dos arquivos deste lote (rhf-person-import-types-corrected.log). Serviços de persistência simulados; FileReader exercitado localmente, com simulação controlada nos casos de falha/prazo. Nenhum banco, Auth, dado comercial, SEFAZ ou deploy real. [Causas, arquivos e linhas](../fiscal/historico-correcoes-2026-10-15.md).

**Checkpoint anterior: ERP principal 64/125 itens conferidos (51,2%), 61 pendentes.** A integração estática continua em 129 arquivos ERP, 34 móveis e 13 do catálogo, sem constituir prova de todos os efeitos. Mobile e catálogo mantêm os itens conferidos descritos no inventário individual e a conferência integral segue aberta.

### Reconciliação de produtos — cinco itens e dois proprietários explicitados

Os quatro modais mantêm RHF/resolver até terminar o callback e consomem valores parseados. Busca de fornecedor é compartilhada com o card; tem schema próprio, resposta validada, revisão, prazo e cleanup. O seletor de categoria recebe somente categorias e conserva a escolha durante a confirmação pendente. Atributos revalidam opções/tipos disponíveis e rejeitam frações em inteiro/valores booleanos inválidos. O card usa contrato compartilhado de correção parcial: campos ainda incompletos podem permanecer, enquanto os valores tipados fornecidos precisam ser válidos. Controles permanecem editáveis até persistir; salvar um snapshot não apaga edições posteriores.

O proprietário valida filtros/página antes da consulta e o agregado de IDs/operação antes de alterar o lote. Debounce conserva outros filtros recentes, retornos antigos não substituem a lista e erro/prazo não aparece como ausência de pendências. replaceExisting chega ao serviço de fornecedor; IDs, NCM e valores são parseados. Callbacks retornam confirmação/falha/incerteza; erro mantém modal/seleção, prazo interrompe a espera sem reenvio nem sucesso tardio.

Os serviços reutilizam os contratos estruturais, verificam leitura e cada gravação e restringem variações ao produto de origem. Contagem usa linhas confirmadas, erro interrompe os próximos registros, NCM conserva os demais campos fiscais e dados malformados são rejeitados. Consultas preservam metadados/zero de atributos e propagam falhas de configuração/fornecedor. Categoria continua usando múltiplas chamadas; esta validação não comprova transação, rollback, concorrência ou todas as regras contextuais no banco.

**Provas:** 56 testes em seis arquivos (13 de mutação, seis de consulta, 12 de modais, dez do card, oito do proprietário e sete existentes de detecção), scratch/rhf-reconciliation-final-tests.log. Treze falhas de serviço, seis de consulta e uma de atributo inteiro inline foram comprovadas antes dos ajustes (rhf-reconciliation-service-before.log, rhf-reconciliation-query-before.log, rhf-reconciliation-inline-attribute-before.log). Lint das fontes sem erros/avisos e build ERP aprovado (rhf-reconciliation-verified-lint.log, rhf-reconciliation-verified-build.log). TypeScript global reprova fora dos arquivos deste lote (rhf-reconciliation-verified-tsc.log). RHF/resolver e proprietários são reais; HTTP/Supabase, CategoryAutocomplete e o controle filho de atributo são simulados nos testes conforme o caso. Não há navegação real nem escrita no banco. [Causas, arquivos e linhas](../fiscal/historico-correcoes-2026-10-15.md).

**Estado atual: ERP principal 71/127 itens conferidos (55,9%), 56 pendentes.** Consulta/lote da página e consulta compartilhada de fornecedor foram acrescentados ao inventário principal para explicitar caminhos existentes. O censo registra também os filhos/wrappers, sem criar formulários proprietários para cada campo. São 132 localizações ERP, incluindo chamadas ao adaptador useReconciliationSubmit cuja cadeia RHF foi exercitada; mobile continua com 34 e catálogo 13 localizações, sem inferir conclusão pelas importações. A conferência integral das três aplicações permanece aberta.
