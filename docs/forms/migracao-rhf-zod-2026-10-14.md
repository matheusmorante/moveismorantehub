# Migração de todos os formulários — 14/10/2026

## Regra e estado

Pedido explícito do usuário: todos os formulários do sistema devem usar React Hook Form e zodResolver. Abrange ERP, aplicativo móvel e catálogo digital; não apenas tags `<form>`. **Em andamento: não considerar migração global concluída.**

Reutilizar schemas Zod explícitos de domínio e regras puras existentes. Campos dinâmicos continuam provenientes de tabelas; rascunho, finalização, consulta e baixa conservam contratos distintos. O resolver deve bloquear efeitos inválidos, preservar metadata/snapshots e apresentar erro. Instalar ou importar a biblioteca não comprova cobertura.

## Inventário e conferência

O [inventário detalhado do ERP](../audits/fiscal-2026-10-14/form-migration-inventory.md) registra proprietários, modais, autosave, importações e filtros. Checkboxes continuam pendentes até conferir todos os caminhos de cada proprietário. O censo abaixo é somente uma localização de integrações no código, não prova de que todos os callbacks do arquivo estejam migrados.

## Integrações localizadas

| Aplicação | Arquivos com integração localizada |
|---|---|
| erp | 122 |
| mobile | 34 |
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
- `digital-catalog/src/features/products/components/admin-product-modal.tsx`
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
