# Inventário de formulários para React Hook Form + zodResolver — 14/10/2026

Levantamento estático do ERP, incluindo submissões por botão, autosave, importação e filtros. As linhas são referências do checkout durante a migração; podem deslocar-se com as alterações em andamento. Um checkbox pendente exige conferir a integração e seu teste, mesmo quando o arquivo já foi alterado em paralelo. A mera presença de `useForm`, `FormProvider` ou um schema permissivo não comprova validação da operação.

Critério de conclusão por formulário: o payload que efetivamente chega ao serviço passa por `zodResolver`/React Hook Form; erros impedem a operação e ficam visíveis; intenções distintas (rascunho, finalizar, pagar, importar, salvar automaticamente) conservam seus contratos; componentes filhos reutilizam o contexto do formulário proprietário. Regras contextuais de estoque, duplicidade, fiscal e permissões continuam sendo verificadas no serviço/backend.

## Proprietários e caminhos de operação

Todos os caminhos abaixo precisam de conferência individual. `Manual` significa que o caminho original contém condições imperativas; não afirma completude de domínio. Schemas já existentes devem ser reaproveitados.

| Conferir | Área / proprietário (`erp/src/`) | Estado / payload | Caminho de operação | Validação existente ou observação |
|---|---|---|---|---|
| [ ] | `pages/Login/index.tsx:29` | email, password | handleSubmit; recuperação por botão | required/email HTML e auth |
| [ ] | `pages/Signup/index.tsx:24` | email, password, confirmPassword, fullName | handleSubmit | manual/HTML |
| [ ] | `pages/ResetPassword/index.tsx:75` | email, code, password, confirmation | enviar código; verificar código; saveNewPassword | três intenções separadas |
| [ ] | `components/auth/PasswordSetupPrompt.tsx:18` | password, confirmation | handleSubmit | manual |
| [ ] | `pages/App/Profile/Index.tsx:57` | fullName, position, phone, address, city, stateValue | handleUpdateProfile | manual |
| [ ] | `pages/App/Profile/Index.tsx:84` | email, currentPassword, reauthCode | handleChangeEmail / reautenticação | botão fora do form principal |
| [ ] | `pages/App/Profile/Index.tsx:98` | newPassword, confirmPassword, currentPassword, passwordReauthCode | handleChangePassword / reautenticação | botão fora do form principal |
| [ ] | `pages/App/Users/UserRolesModal.tsx:30` | roles, selectedRole | save | papéis permitidos/permissão |
| [ ] | `pages/App/Registrations/shared/modals/personForm/usePersonForm.ts:388` | formData, collectionName, requiredFields | handleSubmit; pessoas em todos os cadastros | createPersonFormSchema; integração em andamento |
| [ ] | `pages/App/Registrations/shared/modals/PersonImportModal.tsx:137` | file, encoding, mapping, selectedIndexes | processMappingToPreview → runImport | schema por linha, não apenas arquivo/mapping |
| [ ] | `pages/App/Products/hooks/form/useProductFormSubmit.ts:53` | formData, saveAsDraft, isStockistOnly | handleSubmit(false/true) | createProductFormSchema + contextual variation rules; integração em andamento |
| [ ] | `pages/App/Products/hooks/form/useProductFormDraft.ts` | draft snapshot | autosave de rascunho | distinto de formulário final |
| [ ] | `pages/App/Products/modals/VariationFormModal.tsx` | variation + parentProduct | salvar variação | campos de abas são filhos |
| [ ] | `pages/App/Variations/hooks/useCharacteristicForm.ts:67` | formData/options | fila de autosave + closeModal | validateCharacteristicSnapshot; não tem botão submit final |
| [ ] | `pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx:70` | newAttrName, newDataType, newDecimalPlaces, newUnit, tempValues | handleSaveAttribute; handleAddValueToExisting | múltiplas operações |
| [ ] | `pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx:60` | attributeId, value | handleRegisterNewValue | gravação independente dentro de formulário |
| [ ] | `pages/App/Products/ProductTypes/Index.tsx:78` | newName | handleAdd | manual/required |
| [ ] | `pages/App/Products/components/modals/product/ProductTypeManagementModal.tsx:132` | newName | handleAdd | mesmo domínio, outro proprietário |
| [ ] | `pages/App/Products/components/modals/product/ProductMaterialManagementModal.tsx:144` | newName | handleAdd | manual |
| [ ] | `pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx:77` | formData | onSave (hook de categorias) | categoria dinâmica, não ENUM |
| [ ] | `pages/App/Products/components/modals/variations/CartesianVariationModal.tsx:84` | selectedOptions/attributes | handleGenerate | geração de variantes locais |
| [ ] | `pages/App/Products/components/modals/product/ProductConversionModal.tsx:118` | attrName, attrValue | handleConvert | conversão altera agregado |
| [ ] | `pages/App/Products/ProductList/modals/MoveVariationFamilyModal.tsx` | destino e conflitos de atributos | confirmação de mudança | filhos FamilySearchSelector/AttributeConflictResolver |
| [ ] | `pages/App/Products/ProductList/modals/MergeVariationModal.tsx:97` | variação destino | confirmação de merge | proprietário por callback |
| [ ] | `pages/App/Products/modals/PriceHistoryModal.tsx:305` | editCost, editQty | salvar edição de lote/custo | operação independente |
| [ ] | `pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:136` | supplierId, categoryId, ncm, price, variations | handleSave → handleSaveSingleProduct | gravação direta de card |
| [ ] | `pages/App/Products/Reconciliation/modals/ApplySupplierModal.tsx:74` | selectedSupplierId | handleConfirm → handleApplySupplier | alteração em lote |
| [ ] | `pages/App/Products/Reconciliation/modals/ApplyCategoryModal.tsx:23` | categoria selecionada | handleConfirm → handleApplyCategory | alteração em lote |
| [ ] | `pages/App/Products/Reconciliation/modals/ApplyNcmModal.tsx:16` | ncm | handleConfirm → handleApplyNcm | alteração em lote fiscal |
| [ ] | `pages/App/Products/Reconciliation/modals/ApplyAttributeModal.tsx:38` | attributeName, attributeValue | handleConfirm → handleApplyAttribute | alteração em lote |
| [ ] | `pages/App/Services/ServiceFormModal.tsx:35` | formData | handleSubmit | manual/HTML |
| [ ] | `pages/App/SalesOrder/hooks/useSalesOrderForm.ts:329` | getOrderData(savedStatus) | handleSaveOrder / handleCompleteOrder:396 | shared orderDomainValidation; dois caminhos |
| [ ] | `pages/App/SalesOrder/modals/OrderEditModal.tsx:296` | pedido atualizado | saveWithFiscalAudit; handleSaveReconciliation:396 | caminho de edição/reconciliação separado |
| [ ] | `pages/App/SalesOrder/modals/AssistanceOrderModal.tsx:348` | assistência, cliente, itens, scheduling | handleSaveBase(draft/final); autosave | contrato de assistência preservado |
| [ ] | `pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx:246` | selected quantities/prices, collectAtAddress, scheduling | generateReturn | shared commercialReturnRules + saldo consultado |
| [ ] | `pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx:73` | customer, items, collection, scheduling, observations | saveReturn | devolução sem vínculo, contrato distinto |
| [ ] | `pages/App/SalesOrder/OrderActions/StockActionModal.tsx:39` | observation | handleConfirm | observação de movimento |
| [ ] | `pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx:198` | confirmed, productionConfirmed | confirmação comercial/fiscal | confirmação por operação, não flag global |
| [ ] | `pages/App/SalesOrder/OrderHistoryList/StockCheckModal.tsx:64` | quantidades/seleção de estoque | handleConfirm | conferência antes de operação |
| [ ] | `pages/App/SalesOrder/OrderHistoryList/ReturnConfirmationModal.tsx` | confirmação/itens de devolução | callback de confirmação | conferir payload efetivo |
| [ ] | `pages/App/SalesOrder/OrderHistoryList/ReturnFulfillmentConfirmModal.tsx` | confirmação recebimento | callback de confirmação | conferir payload efetivo |
| [ ] | `pages/App/SalesOrder/components/SmartAIFillModal.tsx:116` | promptText, manualJSON, lastParsedResult | handleGenerateAI; handleProcessManualJSON; handleConfirmApply | entrada assistida não deve contornar schema do pedido |
| [ ] | `pages/App/SalesOrder/AssemblyList/Index.tsx:69` | item, date, time, type, status | handleSave | montagem |
| [ ] | `pages/App/Logistics/components/ShowcaseAssemblyModal.tsx:42` | formData | handleSubmit | montagem de mostruário |
| [ ] | `pages/App/DeliverySchedule/ShowroomAssemblyModal.tsx:61` | item, date, time | handleSave | outro caminho de montagem |
| [ ] | `pages/App/SalesOrder/Reports/modals/ReportConfigModal.tsx:149` | source, mapping, name, thresholds | importar CSV / callback de configuração | configuração e validação por linha |
| [ ] | `pages/App/SalesOrder/Reports/modals/ProductReferenceModal.tsx:147` | newMaster, newReference, selectedSupplier | handleAdd | referência de produto |
| [ ] | `pages/App/SalesOrder/Reports/modals/ItemExclusionModal.tsx:117` | localExcludedItems | aplicar exclusões | seleção que altera relatório |
| [ ] | `pages/App/SalesOrder/Reports/components/ReportView.tsx:516` | reportName, reportConfig, productMappings | autosave / handleUpdateReport | debounce também é submissão |
| [ ] | `pages/App/Finance/Transactions/index.tsx:70` | formData | handleSaveTransaction | modal por botão |
| [ ] | `pages/App/Finance/Payables/PayableModal.tsx:52` | formData, expenseType, installmentsCount, recurringFrequency | handleSave; handlePay:135 | criar/editar/pagar são contratos distintos |
| [ ] | `pages/App/Finance/Receivables/ReceivableModal.tsx:48` | formData | handleSave; handleReceive:72 | criar/editar/receber |
| [ ] | `pages/App/Finance/Settings/index.tsx:47` | config | handleSave | configuração financeira |
| [ ] | `pages/App/Stock/Purchases/modals/PurchaseFormModal.tsx:318` | supplierId, items, purchaseDate, impostos/frete, anexos | handleSave(ordered/fulfilled); autosave:294 | validar rascunho e final separadamente |
| [ ] | `pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx:43` | products, date, observation | handleSave | entrada de compra |
| [ ] | `pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:235` | scannedItems, invoicedQuantities, invoiceNumber/date, discrepancyNote | handleSave | conferência NF/compra |
| [ ] | `pages/App/Stock/Receipts/hooks/useReceiptForm.ts:352` | supplierId, items/inboundItems, custos, receiptDate, fiscalKey, attachments | handleFinalize; draft autosave:285 | validação manual de vínculos/itens/chave |
| [ ] | `pages/App/Stock/Receipts/modals/ReceiptAIFillModal.tsx:178` | text | interpretar/aplicar entrada assistida | schema final no recebimento |
| [ ] | `pages/App/Stock/Movements/modals/InventoryMoveEditModal.tsx:55` | type, quantity, date, observation | handleSave | edição de movimento |
| [ ] | `pages/App/Stock/Movements/modals/InventoryMoveDeleteModal.tsx:43` | reason | handleSubmit | justificativa de exclusão |
| [ ] | `pages/App/Stock/modals/StockLaunchModal.tsx:96` | type, quantity, newDesiredStock, reason | handleSave | múltiplos tipos de lançamento |
| [ ] | `pages/App/Stock/Unavailabilities/modals/UnavailabilityFormModal.tsx:47` | hook form state | actions.handleSubmit | indisponibilidade |
| [ ] | `pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx:45` | scopeType, selectedSupplierId, selectedResponsibleId | handleConfirm | campos em InventoryScopeConfigForm |
| [ ] | `pages/App/Stock/Inventory/modals/InventoryReviewModal.tsx:271` | reconciledItems/physicalCount | onConfirm | contagem/conferência antes de persistir |
| [ ] | `pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:58` | sku/suffix/ean/attributes | handleSubmit | cadastro rápido independente |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx:36` | accessKey | handleSubmit (Enter e botão) | duas entradas para mesmo handler |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:178` | accessKey | handleDirectSefazQuery / handleScan | consulta externa; não executar na migração |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx:52` | xmlText/file | handleProcessImport | parser XML + domínio |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundAiNewVariationModal.tsx:108` | atributos de nova variação | callback de cadastro | campos por props |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundIndividualProductModal.tsx:45` | vínculo/classificação produto | callback de confirmar | campos por props |
| [ ] | `pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx` | mapeamentos de itens/NCM/fornecedores | salvar mapeamento | modal composto |
| [ ] | `pages/App/Stock/InboundInvoices/modals/InboundClassificationModals.tsx:183` | classificação/vínculos | callbacks de confirmar | vários submodais |
| [ ] | `pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx:371` | recipient, items, transport, tpAmb, productionConfirmed, retryNumber | preview/transmit/retry callbacks | regras fiscais atuais; prévia opcional |
| [ ] | `pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts:43` | justificativa/confirmations | handleConfirmCancel | cancelamento fiscal/contextual |
| [ ] | `pages/App/FiscalDocuments/components/NfeOperationDraftSetup.tsx:147` | kind/source/justification | onPrepare | preparar devolução/estorno fiscal |
| [ ] | `pages/App/FiscalDocuments/hooks/useFiscalCceModal.ts:94` | cceText | handleSubmit / handleReconcile | CC-e histórica; não habilitar nova transmissão |
| [ ] | `pages/App/Settings/index.tsx:61` | settings + path/value | handleChange → debounce/saveSettings | proprietário de todas as seções de configuração abaixo |
| [ ] | `pages/App/Settings/components/general/ProductMaterialsSection.tsx:44` | newMaterial/newType | handleAddMaterial; handleAddType:65 | duas submissões nativas independentes |
| [ ] | `pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx:32` | csosn | save | CSOSN restrito à homologação |
| [ ] | `pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:318` | preview, selectedProducts, destination, correlationType/version | applySync; applyProductReview:337; saveCorrelation:370 | três operações; busca separada |
| [ ] | `pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx:55` | settings/testPhone/template parameters | handleTestConnection; handleTestTemplateSend:99 | envio externo requer autorização prévia, só integrar validação |
| [ ] | `pages/App/ApiUsage/components/ApiConfigEditModal.tsx:25` | formData | handleSave | configuração API |
| [ ] | `pages/App/Marketing/Posts/components/CampaignManagerModal.tsx:34` | editing | save | campanha |
| [ ] | `pages/App/Marketing/Posts/components/GeneralCampaignRules.tsx:59` | rules | onSubmit → saveGlobalRules | regras de campanha |
| [ ] | `pages/App/Marketing/Posts/components/ModelFormModal.tsx:248` | name,prompt,format,assets,extras | submit; generatePreview | modelo de post |
| [ ] | `pages/App/Marketing/Posts/components/PostCreatorModelModal.tsx:85` | name,prompt,references,opportunityId | submit | outro modelo de criador |
| [ ] | `pages/App/Marketing/Posts/components/Assets/AssetLibraryModal.tsx:57` | uploadUrl, uploadName | handleAddCustomAsset | ativo por URL |
| [ ] | `pages/App/Marketing/Posts/components/PostsLibrary/UploadPostModal.tsx:116` | form, file, produto/campanha | handleUpload | upload de post |
| [ ] | `pages/App/Marketing/Posts/components/Editor/ElementModelsPanel.tsx:35` | name/layer props | save | modelo de elemento |
| [ ] | `pages/App/Marketing/Posts/index.tsx:234` | campaign/global rules/model config | saveCampaign; autosave configuration | caminhos inline fora dos modais |
| [ ] | `pages/App/Marketing/Posts/components/Ambientation/AmbientationStudioModal.tsx:29` | prompt | handleGeneratePrompt; handleSimulateAmbientation | geração assistida |
| [ ] | `pages/App/Stock/LabelPrinting/modals/LabelGridModelModal.tsx:626` | model/layout/style/data | handleSave | editor composto |
| [ ] | `pages/App/Stock/LabelPrinting/modals/LabelCustomDesignModal.tsx:163` | nome/dimensões/design props | handleSaveCustomLabel | callback por props |
| [ ] | `pages/App/Stock/LabelPrinting/modals/LabelModelCreationModal.tsx:163` | imageSrc, scale, crop | handleApply | cadastro de modelo de imagem |
| [ ] | `pages/App/Stock/LabelPrinting/modals/LabelImageModal.tsx:43` | file | handleUpload | upload de imagem |
| [ ] | `pages/App/Stock/LabelPrinting/modals/LabelNewAssetModal.tsx:87` | nome/url do ativo (props) | onConfirm | cadastro de ativo |
| [ ] | `pages/App/Stock/LabelPrinting/modals/PriceLabelDataFillModal.tsx:325` | title, normalPrice, promoPrice, centsText, currencySymbol, installments | aplicar dados manuais | entrada da etiqueta |
| [ ] | `pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx:1534` | layers/style/values | aplicar arte; alterações contínuas | filhos toolbar/color picker/menu |
| [ ] | `pages/App/Stock/LabelPrinting/components/LabelQueue.tsx:191` | quantity, prices, positions | updateItem / impressão | fila editável, não só seleção |
| [ ] | `components/shared/SendWhatsAppModal.tsx:35` | phone,message | handleSendDirect; handleOpenManual | entrada externa; não enviar durante migração |
| [ ] | `components/shared/AIChatAssistant.tsx:258` | input/textToSend | handleSendMessage | chat também envia payload |
| [ ] | `components/shared/AttendanceVoiceInput.tsx:28` | customerPhone/transcript | handleProcess | entrada assistida |

## Filhos, filtros e seleções

### Caminhos adicionais localizados nos hooks

| Conferir | Proprietário (`erp/src/`) | Estado / payload | Operação | Observação |
|---|---|---|---|---|
| [ ] | `pages/App/Products/hooks/variation/useVariationForm.ts:345` | formData de variação | handleSubmit | responsável efetivo do VariationFormModal |
| [ ] | `pages/App/Products/hooks/variation/useVariationDraftAutoSave.ts:26` | snapshot de variação | flush/save | autosave distinto do submit |
| [ ] | `pages/App/Products/hooks/form/useProductFormModal.ts:387` | variação atualizada | handleSaveVariation | gravação intermediária do agregado |
| [ ] | `pages/App/Products/ProductList/modals/MoveVariationFamily/useMoveVariationFamily.ts:116` | família destino/conflitos | handleConfirm | responsável efetivo da mudança de família |
| [ ] | `pages/App/Products/Categories/hooks/useCategoriesAndEnvironments.ts:94` | formData de categoria/ambiente | handleSave | responsável efetivo do CategoryEnvironmentModal |
| [ ] | `pages/App/Stock/Unavailabilities/hooks/useUnavailabilityForm.ts:76` | item, quantidade, motivo, fotos | handleSubmit | responsável efetivo da indisponibilidade |
| [ ] | `pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts:201` | ScopeConfiguration | handleConfirmScope | início de auditoria |
| [ ] | `pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts:253` | AuditItem[]/physicalCount | saveDraft; handleFinalize:292 | contagem, gravação local/remota e fechamento |
| [ ] | `pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:70` | parsedInvoice | persistAndFinish | destino comum das importações de NF |
| [ ] | `pages/App/SalesOrder/hooks/useOrderAutoSave.ts:112` | draft order | saveDraft | não impor requisitos do pedido final ao rascunho |
| [ ] | `pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts:160` | fiscal review | saveFiscalReview | revisão de rascunho fiscal |
| [ ] | `pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts:214` | emissão em rascunho | handleSaveDraft | distinto de transmitir |
| [ ] | `pages/App/Marketing/Posts/components/Editor/usePostEditor.ts:227` | template | templateService.save | salvar modelo/editor |
| [ ] | `pages/App/Marketing/Posts/services/templateAutosave.ts:22` | template snapshot | execução da fila autosave | validar no proprietário e preservar fila |
| [ ] | `pages/App/SalesOrder/ReportsBling/useSalesReport.ts:375` | nome/config/intervalo | saveReport | relatório Bling independente |
| [ ] | `pages/App/Stock/LabelPrinting/hooks/useLabelModalsAndAssets.ts:69` | nome/url/logo | handleConfirmNewLogo; handleSaveCustomLabel:135 | responsáveis dos modais de etiquetas |

O censo abaixo inclui todos os arquivos TSX não-testes com controles nativos ou componentes de entrada identificados estaticamente. **Não são formulários independentes automaticamente**: campos de pessoa/produto/pedido/pagamento/transporte devem participar do contexto do proprietário; filtros e buscas têm schema de consulta próprio quando submetidos. Wrappers que só reexportam não precisam criar outro formulário.

Casos particularmente fáceis de esquecer: filtro fiscal com `onSearchSubmit`; entrada manual do QRScanner; busca de rota/endereço em `OrderRouteMap`; relatórios por intervalo; catálogo/campanha; permissões por papel; cadastro inline de valores de atributo; edição de parâmetros de etiquetas; configurações com autosave. Modais de confirmação sem entrada e modais estritamente de leitura não são novos formulários.

As colunas de validação abaixo registram símbolos encontrados, não certificam que são executados antes da persistência. A lista é um censo estático; a conferência final deve mapear cada callback ao proprietário acima e provar todos os caminhos de submissão.

<!-- INPUT_CENSUS -->
| Conferir | Arquivo / primeira entrada (`erp/src/`) | Estado local (ou props/contexto) | Handlers / callbacks encontrados | Símbolos de validação |
|---|---|---|---|---|
| [ ] | components/access/RolePermissionsMatrix.tsx:42 | selectedRole | savedRoles, applyRole, applyWithChildren | nenhum símbolo explícito neste arquivo |
| [ ] | components/AttributeAutocomplete.tsx:114 | query, suggestions, allNodes, isLoading, showSuggestions, activeIndex | handleToggle | nenhum símbolo explícito neste arquivo |
| [ ] | components/auth/PasswordSetupPrompt.tsx:64 | password, confirmation, isSubmitting, message | handleSubmit | useZodForm, passwordSetupFormSchema |
| [ ] | components/CategoryAutocomplete.tsx:153 | query, suggestions, allNodes, isLoading, showSuggestions | handleSelect, onSearch | nenhum símbolo explícito neste arquivo |
| [ ] | components/CurrencyInput.tsx:199 | displayValue | handleChange, handlePaste, handleInputChange, handleFocusInternal, handleBlurInternal | nenhum símbolo explícito neste arquivo |
| [ ] | components/DistanceInput.tsx:15 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | components/MaskedNumericInput.tsx:240 | displayValue | handleChange, handlePaste, handleInputChange, handleFocusInternal, handleBlurInternal | nenhum símbolo explícito neste arquivo |
| [ ] | components/MeasurementInput.tsx:19 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | components/NoticeInput.tsx:118 | inputValue, frequencies, showSuggestions, editingIndex, editingValue | saveEdit | nenhum símbolo explícito neste arquivo |
| [ ] | components/PercentInput.tsx:14 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | components/ProductAutocomplete.tsx:95 | props/contexto | onSearch, onCreateNew | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/AddressAutocompleteInput.tsx:206 | suggestions, isOpen, loading | handleInputChange, handleSelectSuggestion | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/AIChatAssistant.tsx:493 | internalIsOpen, settings, messages, geminiHistory, input, isLoading, isListening, isCallMode, isAutoSpeakEnabled | handleGlobalOpen, handleSendMessage, handleClearHistory, toggleCallMode, toggleListening | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/AttendanceVoiceInput.tsx:137 | isOpen, customerPhone | handleProcess, startRecording, pauseRecording, clearTranscript | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/QRScannerModal.tsx:412 | error, step, isInitializing, showManualInput, manualCode, isRecognizingText, isProcessingScan | processingScanRef, startScanner | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/SendWhatsAppModal.tsx:109 | phone, message, isSending | handleSendDirect, handleOpenManual | nenhum símbolo explícito neste arquivo |
| [ ] | components/shared/ShowTestDataToggle.tsx:17 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | components/SmartInput.tsx:154 | isOpen, dynamicSuggestions, activeIndex, inputValue | handleSelect | nenhum símbolo explícito neste arquivo |
| [ ] | components/SupplierAutocomplete.tsx:74 | props/contexto | handleClear | nenhum símbolo explícito neste arquivo |
| [ ] | components/TagInput.tsx:76 | inputValue | handleBlur | nenhum símbolo explícito neste arquivo |
| [ ] | components/ValidatedInput.tsx:26 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/AccessAndUsers/components/UsersTab.tsx:266 | search, selectedRole, isModalOpen, editingPerson, pageWithRole, pageWithoutRole | handleOpenAdd, handleOpenEdit, handleToggleActive | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/ApiUsage/components/ApiConfigEditModal.tsx:82 | formData, saving | handleSave | useZodForm, apiConfigFormSchema |
| [ ] | pages/App/ApiUsage/components/ApiUsageHeader.tsx:78 | props/contexto | loadData | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Customers/CustomerDesiresPage.tsx:207 | desires, matches, loading | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Dashboard/components/ProfitHeatMap.tsx:246 | metric, opacity, isLoaded, ordersWithCoords | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Dashboard/components/RegionalHeatmap.tsx:311 | metric, opacity, isLoaded | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Dashboard/Index.tsx:81 | activeTab, period, customStartDate, customEndDate | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/DeliverySchedule/index.tsx:127 | showShowroomModal, orderToEdit, sidebarOpen | handleShare | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/DeliverySchedule/ShowroomAssemblyModal.tsx:158 | assemblies, loading, editingId, item, date, time | handleSave, handleEdit, handleDelete | ZodForm, assemblyScheduleFormSchema |
| [ ] | pages/App/Finance/Payables/index.tsx:137 | payables, loading, loadError, isModalOpen, selectedPayable, search, statusFilter | handleEdit, handleNew, handleModalClose | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Finance/Payables/PayableModal.tsx:200 | loading, categories, formData, expenseType, installmentsCount, recurringFrequency | handleChange, handleSave, handlePay | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Finance/Receivables/index.tsx:137 | receivables, loading, loadError, isModalOpen, selectedReceivable, search, statusFilter | handleEdit, handleNew, handleModalClose | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Finance/Receivables/ReceivableModal.tsx:137 | loading, categories, formData | handleChange, handleSave, handleReceive | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Finance/Settings/index.tsx:103 | loading, config, transactions | handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Finance/Transactions/index.tsx:201 | transactions, loading, loadError, search, typeFilter, isModalOpen, categories, saving, formData | handleSaveTransaction | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx:47 | isMoreFiltersOpen | handlePeriodChange, onSearchSubmit | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/FiscalDocuments/components/NfeOperationDraftReview.tsx:37 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/FiscalDocuments/components/NfeOperationDraftSetup.tsx:89 | props/contexto | onPrepare | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/FiscalDocuments/modals/FiscalCancelModal.tsx:124 | props/contexto | onConsultSituation, onConfirmCancel | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/FiscalDocuments/modals/FiscalCceModal.tsx:94 | props/contexto | onReconcile, onSubmit | validateNfeCce |
| [ ] | pages/App/Logistics/AssemblyListPage.tsx:122 | searchTerm, collapsedSections, isModalOpen, selectedAssembly, selectedOrder | handleDeleteShowcase, handleEditShowcase, handleAddShowcase, handleShareWhatsApp | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Logistics/components/ShowcaseAssemblyModal.tsx:93 | formData, isSaving | handleSubmit | ZodForm, showcaseAssemblyFormSchema |
| [ ] | pages/App/Marketing/ChannelCatalog/components/ChannelCatalogHeader.tsx:46 | props/contexto | onSyncAllActive, onRefresh | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Ambientation/AmbientationStudioModal.tsx:108 | prompt, isGenerating, previewUrl | handleGeneratePrompt, handleSimulateAmbientation | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Assets/AssetLibraryModal.tsx:104 | assets, search, selectedCategory, uploadUrl, uploadName | handleAddCustomAsset, handleDelete | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/CampaignManagerModal.tsx:67 | editing, busy | save | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Campaigns/CampaignSelector.tsx:41 | campaigns, error | createCampaign | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Editor/ElementModelsPanel.tsx:140 | models, busy | save | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Editor/ModelProductPicker.tsx:62 | open | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Editor/ProductPostControls.tsx:30 | prompt | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/Editor/TemplateSelector.tsx:26 | templates | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/GeneralCampaignRules.tsx:66 | value, open, saving, loaded | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/ModelFormModal.tsx:289 | name, prompt, format, assets, extras, saving, previewImage, previewHash, previewStatus, previewBusy | submit | validateGenerationPreFlight |
| [ ] | pages/App/Marketing/Posts/components/PostCreatorModelModal.tsx:124 | name, prompt, references, opportunityId, saving | submit | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/PostsLibrary/PostsLibraryPage.tsx:161 | posts, loading, uploadOpen, deletingId, filterProductId, filterProductName, filterCampaignId, filterFormat, productSearch, productSuggestions | handleSearchProducts, handleProductSearch, handleDelete, handleDownload | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/components/PostsLibrary/UploadPostModal.tsx:169 | form, productQuery, productResults, searching, uploading | handleSearchProduct, handleFileChange, handleUpload | validateImageRatio |
| [ ] | pages/App/Marketing/Posts/components/PreviewProductPicker.tsx:45 | open | clear | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/HeaderFooterModelEditor.tsx:50 | cropRequest | props.onClose | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/ImageGridControls.tsx:31 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/index.tsx:302 | activeTab, editorTab, isFocused, campaigns, campaignId, models, links, managerOpen, savingChanges, lastUpdated | saveGlobalRules, handleSavingChange, handleChangePrimary, handleChangeOpenView, handleChangeVariation, handleResetOverrides, saveCampaign, createModel | imagesValidation |
| [ ] | pages/App/Marketing/Posts/InstallmentByImageGallery.tsx:58 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/InstallmentImageEditor.tsx:63 | props/contexto | onRemoveImage | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/InstallmentImageGallery.tsx:47 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/OpportunitySealImageEditor.tsx:66 | cropFile | onRemoveImage | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/TextBackgroundControls.tsx:42 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Marketing/Posts/TextColorPicker.tsx:87 | isOpen, openedColor, pendingColor, popupPosition | openPicker, closePicker | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Categories/components/CategoriesHeader.tsx:121 | props/contexto | onNewEnvironment, onNewCategory, onViewOrphans | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx:100 | props/contexto | onSave | ZodForm, catalogNameFormSchema |
| [ ] | pages/App/Products/components/ComboItemSelector.tsx:97 | search, results, loading | handleAddItem | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/InitialStockList.tsx:61 | entry | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/attributes/AttributeSelectionModal.tsx:102 | availableVariations, selectedAttribute, searchTerm | onManageAttributes | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx:218 | searchTerm, newAttrName, newDataType, newDecimalPlaces, newUnit, tempValues, currentValInput, isSaving, existingValInputs | handleSaveAttribute, handleDeleteValue, handleAddValueToExisting | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/product/CategorySearchModal.tsx:88 | search | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/product/LabelPrintSelectionModal.tsx:197 | allProducts, search, loading, selected | handleConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/product/ProductConversionModal.tsx:118 | attrName, attrValue | handleConvert | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/modals/product/ProductMaterialManagementModal.tsx:147 | materials, newName, loading, fetching | handleAdd, handleDelete | ZodForm, catalogNameFormSchema |
| [ ] | pages/App/Products/components/modals/product/ProductTypeManagementModal.tsx:135 | types, newName, loading, fetching | handleAdd, handleDelete | ZodForm, catalogNameFormSchema |
| [ ] | pages/App/Products/components/modals/variations/CartesianVariationModal.tsx:175 | availableVariations, selectedOptions | handleAddAttribute, handleAttributeChange, handleValueToggle, handleGenerate | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/ProductFilters.tsx:98 | availableCategories | resetFilters | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/fiscal/ProductFiscalTab.tsx:121 | isInfoModalOpen, pendingCsosn, isCsosnConfirmationOpen | confirmCsosnChange | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:98 | searchQuery, isDropdownOpen, results, isLoadingNcms, currentCatalogEntry, hasCheckedCatalogEntry | onAcceptSuggestion, onRejectSuggestion | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/images/SquareImageCropper.tsx:276 | selection, imageSrc, loading, loadError, isApplying, paddingPercent | onCancel, resetToFull, finish | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductDescriptionTab.tsx:38 | props/contexto | onImprove | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductEcommerceTab.tsx:223 | draggedIndex, replacingIndex, croppingIndex, activeImageIndex | handleReplacePhoto, handleCropPhoto | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductGeneralTab.tsx:124 | props/contexto | handleToggleCategory | hasValidationError |
| [ ] | pages/App/Products/components/tabs/ProductInventoryTab.tsx:181 | props/contexto | handleToggleOrigin | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductPricingFields.tsx:57 | props/contexto | handleBlurPrice | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductSupplierField.tsx:151 | search, isOpen, isPersonFormOpen, extraSuppliers | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/ProductTitleTab.tsx:154 | props/contexto | applyTitle | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/sections/ProductCategoryPicker.tsx:132 | categorySearch | onChange / callback inline; conferir proprietário | hasValidationError |
| [ ] | pages/App/Products/components/tabs/technical/ProductTechnicalTab.tsx:297 | refreshKey, isAttributeModalOpen, allTechnicalFields, manualFieldNames, loadingFields, characteristicSearchTerm, debouncedCharacteristicSearchTerm | handleFieldChange, handleTechnicalValueChange, handleAddManualField, handleRemoveManualField, handleToggleDepthLength | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/technical/TechnicalCombobox.tsx:126 | isOpen, searchTerm | handleInputChange, handleSelectOption | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/technical/TechnicalFieldInput.tsx:54 | draft, query, debouncedTerm | handleMaskedChange, handleBlur | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/tabs/technical/TechnicalValueSelectModal.tsx:97 | searchTerm | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/VariationRow.tsx:99 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx:94 | isOpenSuggestions, isSaving | handleRegisterNewValue | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationCompositionItemsTab.tsx:169 | props/contexto | handleAddNewEmptyRow, handleSelectProduct, handleRemoveItem, handleQuantityChange, handlePriceChange | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationDescriptionTab.tsx:133 | isImprovingDescription | handleToggleSync, handleImproveDescriptionWithAI | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationIdentificationTab.tsx:95 | props/contexto | handleSuffixChange | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationPricingTab.tsx:80 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx:296 | isImprovingDescription, refreshKey, isAttributeModalOpen, allTechnicalFields, manualFieldNames, loadingFields, characteristicSearchTerm, debouncedCharacteristicSearchTerm | handleSetOverride, handleRemoveOverride, handleAddManualField, handleRemoveManualField, handleToggleDepthLength, handleImproveDescriptionWithAI | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Index.tsx:205 | hasTestProducts, filters, searchInput, showTestProducts, visibilitySettings, isFormModalOpen, editingProduct, viewingProduct, initialFormData, isVariationModalOpen | handleSearchBlur, handleSort, handleCloseSpecialView | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/MetaCatalog/index.tsx:259 | copied, isSyncing, syncProgress, stats, loadingStats | handleCopy, handleDownload, handleGraphApiSync | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/modals/PriceHistoryModal.tsx:305 | activeTab, priceHistory, batchHistory, loading, editingId, editCost, editQty, isSaving | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/ProductList/index.tsx:260 | trashModalProduct, isTrashing | refresh, onCloseTrash | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/ProductList/modals/MergeVariationModal.tsx:97 | props/contexto | handleCancel, confirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/ProductList/modals/MoveVariationFamily/AttributeConflictResolver.tsx:39 | props/contexto | onAddAttribute | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/ProductList/modals/MoveVariationFamily/FamilySearchSelector.tsx:39 | familySearch, isFamilySuggestionsOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/ProductTypes/Index.tsx:83 | types, newName, loading, fetching | handleAdd, handleDelete | ZodForm, catalogNameFormSchema |
| [ ] | pages/App/Products/Reconciliation/components/ReconciliationFiltersBar.tsx:46 | searchTerm | handleClearFilters | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:181 | supplierId, categoryId, categoryName, ncm, price, variations, isExpanded, isSaving, hasChanges | handleUpdateVariationAttribute, handleApplySharedAttribute, handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/components/SupplierReconciliationFilters.tsx:121 | searchTerm | clearFilters | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/modals/ApplyAttributeModal.tsx:82 | attributeName, attributeValue, isSubmitting | handleConfirm, resetAndClose | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/modals/ApplyNcmModal.tsx:63 | ncm, isSubmitting | handleConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/modals/ApplySupplierModal.tsx:249 | selectedSupplierId, suppliers, isSearching, isSubmitting, query, open, debounceTimer | handleQueryChange, handleConfirm, handleSelect, handleChange, handleClear, handleSelectItem | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Products/Reconciliation/ProductReconciliation.tsx:262 | products, isLoading, totalCount, page, filters, summary, selectedIds, isAllFilteredSelected, isSupplierModalOpen, isCategoryModalOpen | handleSelectAllOnPage, handleSelectProduct, handleClearSelection, handleSaveSingleProduct, handleApplySupplier, handleApplyCategory, handleApplyNcm, handleApplyAttribute | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Profile/Index.tsx:233 | loading, uploading, fullName, position, phone, address, city, stateValue, email, newPassword | handleUpdateProfile, handleChangeEmail, handleChangePassword, logout | validatePasswordSetup |
| [ ] | pages/App/Registrations/shared/components/PersonCard.tsx:335 | isMenuOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/components/PersonFilters.tsx:54 | props/contexto | handleChange, resetFilters | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/components/PersonList.tsx:297 | supplierProductCounts, confirmModal, customerOrderCounts | handleDelete, handlePermanentDelete, handleBulkTrash, handleBulkPermanentDelete, refresh, confirmModal.onConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/components/PersonPageToolbar.tsx:44 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/components/PersonRow.tsx:389 | isMenuOpen, showDeleteModal | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/components/PersonTable.tsx:226 | orderedColumns, draggedColumn | savedOrder, savedColumns, onClearSelection, onBulkTrash, onBulkRestore, onBulkPermanentDelete | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/personForm/PersonAddressSection.tsx:87 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/personForm/PersonContactsSection.tsx:107 | props/contexto | addAdditionalContact | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/personForm/PersonEmployeeRolesSection.tsx:78 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/personForm/PersonIdentificationSection.tsx:92 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/personForm/PersonObservationsSection.tsx:25 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Registrations/shared/modals/PersonImportModal.tsx:352 | file, importData, isImporting, isCompleted, progress, encoding, selectedIndexes, step, csvHeaders, csvRows | handleFileLoad, handleMappingChange, processMappingToPreview, runImport, toggleAll | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/AssemblyList/Index.tsx:209 | assemblies, loading, showForm, editingAssembly, item, date, time, type, status | handleSave, handleDelete, resetForm | ZodForm, assemblyListFormSchema |
| [ ] | pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceCustomerSection.tsx:114 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceDescriptionSection.tsx:34 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceSchedulingSection.tsx:29 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/CustomerData.tsx:253 | customers, searchTerm, isOpen, isNewCustomerOpen, editingPerson | handleEditCustomer, toggleFinalConsumer, clearCustomer | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/OrderFilters.tsx:159 | props/contexto | handleChange, handleDateTypeChange, resetFilters | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/OrderRouteMap.tsx:202 | loading, error, suggestions, routeResult, addressForm | handleSearch, handleSelectSuggestion, calculateFreight | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/SalesOrderFormSection.tsx:114 | itemsTab | actions.goToNextStep | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/Seller.tsx:30 | employeeNames | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/SellerInput.tsx:110 | isOpen, employees, filterText | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/ShippingData.tsx:179 | props/contexto | handleCepBlur | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/components/SmartAIFillModal.tsx:328 | promptText, isListening, isProcessingAI, lastParsedResult, activeTab, manualJSON, liveTranscript | handleGenerateAI, handleConfirmApply, handleFileUpload, handleProcessManualJSON, toggleListening | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/ItemsTable/BodyRow.tsx:105 | tempUnitPrice, tempDiscountValue, tempDiscountPercent, tempSubtotal, tempObservation | handleStockOriginChange, handleSelectService, onToggleExpand, onDelete | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/ItemsTable/ServiceAutocomplete.tsx:48 | services, isOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/CustomerSearchModal.tsx:289 | search, people, orders, loadingPeople, loadingOrders, selectedType | onAddNew | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/EmployeeSearchModal.tsx:74 | search, employees, loading | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/OrderSelectionModal.tsx:86 | searchTerm, sortField, sortOrder | handleSort | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/ProductSearchModal.tsx:82 | isProductFormOpen, selectingKey | handleItemClick | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/SellerSearchModal.tsx:70 | searchTerm, employees, filteredEmployees, loading | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx:178 | customer, items, collectAtAddress, scheduling, observations, customerSearchOpen, customerSearchTerm, newCustomerOpen, submitting, activeTab | saveReturn | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeFiscalIssueModal.tsx:219 | props/contexto | onAbandonHmlTlsAttempt, onStartFreshHmlEmission, onRetry, onCorrectFiscalData, onReconcile | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.tsx:103 | searchQuery, isDropdownOpen, results, isLoading, dropdownPosition | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/NfeCustomerTab.tsx:267 | isInfoModalOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentSelector.tsx:40 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/NfeGeneralTab.tsx:96 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemRow.tsx:181 | isExpanded, cfopSearch, activeCfopReason | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/nfe-modal/ThirdPartyTransporterFormFields.tsx:45 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/ReturnCollectionSection.tsx:34 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/ReturnItemsSelection.tsx:136 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/ReturnObservationTags.tsx:59 | draft | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderActions/StockActionModal.tsx:136 | observation, isSaving | handleConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx:198 | secondsLeft, confirmed, productionConfirmed | confirmedRef, confirmationLabel, onCancel | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/OrderHistoryList/OrderCustomerSearchBar.tsx:26 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/PaymentsTable/BodyRow.tsx:201 | isPixModalOpen, isDropdownOpen, tempFeeReais, tempFeePercent | onDelete | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/Reports/components/ReportView.tsx:1646 | reportName, viewMode, reportType, showFilters, abcBasis, reportSource, reportConfig, selectedSuppliers, searchTerm, minProfit | handleRowClick, handleCloseModal, handleShareWhatsApp, handleSort, handleUpdateReport, saveTimeout | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/Reports/modals/ItemExclusionModal.tsx:117 | localExcludedItems, searchTerm, selectedSupplier, selectedQuadrant, sortConfig | handleSort | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/Reports/modals/ProductReferenceModal.tsx:127 | references, loading, newMaster, newReference, searchTerm, selectedSupplier | handleAdd, handleDelete | ZodForm, productReferenceFormSchema |
| [ ] | pages/App/SalesOrder/Reports/modals/ReportConfigModal.tsx:149 | source, abcBasis, csvData, headers, mapping, name, turnoverThresholdMode, profitThresholdMode, turnoverThreshold, profitThreshold | handleFileUpload | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/ReportsBling/Index.tsx:86 | openMenuId, dateRange | handleCreateReport | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/ShippingComponents/Agendamento.tsx:163 | props/contexto | handleImmediatePickupToggle | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SalesOrder/ShippingComponents/FreteDistancia.tsx:116 | props/contexto | handleDistanceInput, onAutoCalculateDistance | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Services/Index.tsx:74 | searchTerm, isFormOpen, editingService, visibility, showVisibilityMenu | openAdd | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Services/ServiceFormModal.tsx:82 | loading, formData | handleSubmit | useZodForm, serviceFormSchema |
| [ ] | pages/App/Settings/components/ai/AIPromptsSection.tsx:61 | isCompressing | handleFileChange | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/ai/AiQualityFeedbackSection.tsx:176 | feedbacks, loading, statusFilter, categoryFilter, selectedItem | handleStatusChange, handleCopySnippet, loadData | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/fiscal/CompanyFiscalDataSection.tsx:32 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx:172 | mappingSource, mappingTarget, mappingError | addInverseMapping | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx:62 | csosn, saved, busy, error | save | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:607 | summary, storeSummary, rows, total, filter, storeFilter, searchDraft, search, page, isLoading | applySync, applyProductReview, confirmed, saveCorrelation, requestSyncPreview | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/general/AutoScrollSection.tsx:32 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/general/CardFlagSettings.tsx:75 | newFlag, addingRateFor, installments, rate | addFlag | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/general/ChannelDescriptionsSection.tsx:104 | activeChannel | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/general/CompanySettingsSection.tsx:49 | props/contexto | openWhatsApp | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/general/ProductMaterialsSection.tsx:146 | materials, productTypes, newMaterial, newType, loadingMaterial, loadingType, fetching | handleAddMaterial, handleAddType, handleDeleteMaterial, handleDeleteType | ZodForm, catalogNameFormSchema |
| [ ] | pages/App/Settings/components/general/StatusLabelsSection.tsx:89 | props/contexto | addStatus | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/integrations/BlingConfigSection.tsx:80 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx:192 | isTesting, isTestingTemplate, isLoadingTemplates, fetchedTemplates, testPhone | handleFieldChange, handleTestConnection, handleFetchTemplates, handleTestTemplateSend | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/integrations/WhatsAppTemplatesSection.tsx:117 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/HandlingSection.tsx:59 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/InventoryAutomationSection.tsx:122 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/LogisticsSection.tsx:28 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/OrderAutomationSection.tsx:182 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/ReceiptConfigSection.tsx:17 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/components/operations/ScannerConfigSection.tsx:24 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Settings/index.tsx:138 | settings, search, isSaving | saveTimeoutRef, handleChange | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/BlingStock/index.tsx:141 | loading, searchTerm, products, page, totalPages, selectedProduct, isDetailOpen | handleOAuthCallback, handleViewDetail | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/components/purchase-items/PurchaseItemsEntrySection.tsx:117 | props/contexto | onAddNewItemRow, onAddItemClick | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/components/purchase-items/PurchaseItemsMobileList.tsx:100 | props/contexto | handleAddNewItemRow | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/components/purchase-items/PurchaseItemsTable.tsx:120 | props/contexto | handleAddNewItemRow | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/components/StockList.tsx:66 | products, loading, search, isScannerOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/components/InboundAdditionalCostsSection.tsx:63 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx:86 | props/contexto | handleModeChange, onOpenAddInvoice | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx:97 | accessKey | handleSubmit, handleFormSubmit | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundAiNewVariationModal.tsx:108 | props/contexto | onDiscardAndCreateNew, onConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundClassificationModals.tsx:183 | props/contexto | onDiscardAndCreateNew, onConfirmExistingVariation, onConfirmNewVariation | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:178 | accessKey, isScannerOpen, isDirectSyncing | handleScan, handleDirectSefazQuery, confirmed | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundIndividualProductModal.tsx:45 | props/contexto | onConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx:117 | xmlText, isLoading | handleFileChange, handleProcessImport | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/components/InventoryAuditCards.tsx:98 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/components/InventoryAuditTable.tsx:65 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/components/InventoryManualMode.tsx:56 | itemSearchOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/components/InventoryResponsibleSelect.tsx:73 | query, isOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/InventoryAudit.tsx:47 | props/contexto | handleToggleAdjustments | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Inventory/modals/InventoryProductSearchModal.tsx:60 | props/contexto | handleSelect | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview.tsx:51 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/components/LabelQueue.tsx:191 | dragOverIdx | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/components/ProductSearchInput.tsx:270 | isOpen, filterText, dbSearchResults, isLoading, dropdownMaxHeight | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelCanvasElement.tsx:111 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelSettingsPanel.tsx:66 | props/contexto | handlers.onDecreaseImageScale, handlers.onIncreaseImageScale | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelToolbar.tsx:101 | props/contexto | handlers.onExitDesignMode, handlers.onAddExtraField, handlers.onToggleSnap, handlers.onCycleAlign, handlers.onCycleVerticalAlign, handlers.onTogglePriceFormat, handlers.onClearSelection | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/LabelAssetLibraryModal.tsx:28 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/LabelCustomDesignModal.tsx:78 | props/contexto | handleSaveCustomLabel | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/LabelImageModal.tsx:145 | images, loading, uploading | handleUpload, handleDelete | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/LabelModelCreationModal.tsx:326 | imageSrc, scale, scaleInput, crop, dragging, dragStart, previewUrl, imgNaturalSize | handleScaleSlider, handleScaleInput, handleFileChange, handleApply, generateCroppedImage | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/LabelNewAssetModal.tsx:67 | props/contexto | onConfirm | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/price-label-editor/PriceLabelColorPickerPopup.tsx:121 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/price-label-editor/PriceLabelMenuBar.tsx:123 | isFileMenuOpen | onOpenLayersModal, onToggleSafetyMargin, onOpenDataFillModal, onOpenTestValuesModal | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/price-label-editor/PriceLabelSelectedElementToolbar.tsx:159 | props/contexto | onClearSelection, onToggleColorPicker | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/PriceLabelDataFillModal.tsx:136 | dataFillTab, productSearchTerm, searchResults, isSearchingProducts | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/LabelPrinting/modals/PriceLabelTestValuesModal.tsx:117 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/modals/StockLaunchModal.tsx:264 | type, quantity, newDesiredStock, reason, isSaving, moves | handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Movements/modals/InventoryMoveDeleteModal.tsx:81 | reason | handleSubmit | ZodForm, inventoryReversalFormSchema |
| [ ] | pages/App/Stock/Movements/modals/InventoryMoveEditModal.tsx:179 | type, quantity, date, observation, isSaving | handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/components/PurchaseAttachmentsSection.tsx:43 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/components/PurchaseSupplierFilter.tsx:61 | query, isOpen | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/components/PurchaseTable.tsx:80 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/modals/PurchaseFormModal.tsx:467 | suppliers, products, selectedSupplierId, items, isSaving, attachments, isUploading, purchaseDate, ipiPercent, freightPercent | handleAddItem, handleRemoveItem, handleUpdateItem, handleFileUpload, handleRemoveAttachment, processedItems, handleCancelOrClose, savedId, handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:349 | scannedItems, invoicedQuantities, isScannerOpen, isSaving, products, invoiceNumber, invoiceDate, discrepancyNote | handleScan, handlePrint, handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx:183 | products, date, observation, isSaving | handleSave | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Purchases/modals/SupplierSearchModal.tsx:93 | search, suppliers, loading | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/components/InboundCompositionManager.tsx:101 | props/contexto | handleAdd, handleRemove, handleUpdateQuantity | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/components/InboundReceiptItemRow.tsx:137 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/components/ReceiptFiscalDocumentsSection.tsx:129 | isUploading | handleRemove | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/components/ReceiptFormHeader.tsx:67 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/components/ReceiptPeriodSelector.tsx:31 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/modals/InboundInvoiceReceiptPickerModal.tsx:207 | invoices, searchTerm, isCreateModalOpen, mappingInvoice, isLoading, loadError, dateFilter | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Receipts/modals/ReceiptAIFillModal.tsx:178 | text, listening, loading | toggleVoice, analyze | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Unavailabilities/index.tsx:97 | unavailabilities, totalCount, currentPage, statusFilter, productKindFilter, isLoading, isModalOpen, labelItem, selectedPhotosItem | handleUndo | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Stock/Unavailabilities/modals/UnavailabilityFormModal.tsx:84 | props/contexto | actions.handleSubmit | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/SystemDocs/Index.tsx:129 | activeTab, searchTerm | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Users/UserRolesModal.tsx:68 | roles, selectedRole, saving | save, addRole | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Variations/components/AttributeDetailsModal.tsx:99 | showAll, valueSearch | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Variations/components/CharacteristicOptionsSection.tsx:74 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Variations/Index.tsx:76 | searchTerm, editingAttribute, formOpen | refresh | nenhum símbolo explícito neste arquivo |
| [ ] | pages/App/Variations/modals/VariationFormModal.tsx:103 | props/contexto | onChange / callback inline; conferir proprietário | nenhum símbolo explícito neste arquivo |
| [ ] | pages/Login/index.tsx:78 | email, password, showPassword, isSubmitting | handleForgotPassword, handleSubmit | useZodForm, loginFormSchema |
| [ ] | pages/ResetPassword/index.tsx:156 | stage, email, code, password, confirmation, isSubmitting, message | saveNewPassword | useZodForm, passwordRecoveryCodeSchema, passwordRecoveryEmailSchema, passwordSetupFormSchema |
| [ ] | pages/Signup/index.tsx:85 | email, password, confirmPassword, fullName, showPassword, isSubmitting | handleSubmit | useZodForm, signupFormSchema |
