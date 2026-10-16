# Inventário de formulários — mobile e catálogo — 15/10/2026

Censo de localização por AST de TS/TSX: controles de entrada/formulário, integrações RHF e hooks com handlers. Não prova completude por si só nem representa formulários independentes: campos filhos e componentes de UI devem ser vinculados ao proprietário. Os itens ficam pendentes até conferir cada callback e seu efeito. A presença da biblioteca não certifica validação real ou uso do payload parseado. API/backend não deve receber React Hook Form; suas validações de domínio/contexto continuam próprias.

Os testes móveis e do catálogo já existentes continuam válidos em seu escopo; este inventário ainda precisa ligar cada prova aos caminhos atuais. Não declarar 0% de implementação com base em checkboxes pendentes. A conferência ERP permanece no inventário separado de auditoria.

Conferência de compatibilidade do inventário em 15/10: seis regressões de finalização/conflitos mobile passaram com parser por extensão (`scratch/rhf-inventory-mobile-parser-corrected.log`), sem conferir os formulários mobile. O runner legado força TSX em arquivos `.ts` com generics; o runner temporário está em `scratch/vitest-mobile-inventory.config.mjs`. O teste `inventoryScanRules.test.ts` reproduziu uma falha preexistente: `MH:L:000XXX|SKU-1`, identificador de prévia, vira identidade física `qr:...` quando deveria ser descartado. Os arquivos estavam idênticos ao baseline `94097f55`; falha pendente no próximo lote de inventário mobile. Nenhuma dependência ou serviço de produto mobile foi alterado nesta conferência.

## mobile

91 arquivos candidatos localizados; inclui filhos e wrappers, não apenas proprietários.

| Conferir | Arquivo / linha | Controles ou filhos localizados | Handlers | Integração localizada |
|---|---|---|---|---|
| [x] | `mobile/src/components/LoginScreen.tsx:290` | TextInput | handleEmailPasswordLogin, handleGoogleLogin | Login e três estágios de recuperação executam resolver até o serviço terminar; trava comum com Google/cancelamento e prazo local. Testes de dados parseados, concorrência, senhas e resposta tardia em erp/tests/mobile-forms/authOwners.test.tsx. |
| [x] | `mobile/src/components/modals/PasswordChangeModal.tsx:155` | TextInput | props/contexto; conferir proprietário | Resolver até alteração; requisitos dinâmicos de senha atual e código preservados. Reenvio é ação de identidade sem campos, protegido pela mesma trava. Prazo local e erro visível; provas no teste móvel de Auth. |
| [x] | `mobile/src/components/modals/PasswordSetupModal.tsx:72` | TextInput | handleCreatePassword | Resolver acompanha onCreatePassword, senha de oito caracteres e confirmação. Senha não é aparada; criação e saída compartilham trava; falha permite retomar. Provas no teste móvel de Auth. |
| [ ] | `mobile/src/components/shared/CurrencyInput.tsx:99` | TextInput | handleChangeText | conferir proprietário |
| [ ] | `mobile/src/components/shared/DistanceInput.tsx:11` | MaskedNumericInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/components/shared/MaskedNumericInput.tsx:96` | TextInput | handleChangeText | conferir proprietário |
| [ ] | `mobile/src/components/shared/MeasurementInput.tsx:11` | MaskedNumericInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/components/shared/PercentInput.tsx:10` | MaskedNumericInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx:229` | TextInput, Search | handleAddItem, handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/dashboard/hooks/useAISummary.ts:1` | hook/proprietário | handleToggleSpeech | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/CategorySelectModal.tsx:77` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/chat/ChatMessageItem.tsx:60` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/chat/FinancialChatInputBar.tsx:24` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/FinancialAiChatView.tsx:104` | FinancialChatInputBar | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/NewTransactionModal.tsx:80` | TransactionTypeSelector, UnselectedTypePrompt, TransactionDateSelector, TransactionPurposeSelector, CurrencyInput, TextInput, TransactionCategoryField, TransactionCollaboratorSelector | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/TransactionCategoryField.tsx:76` | Search | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/TransactionEditModal.tsx:131` | TextInput | handleSave, handleUpdateInstallment | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/finance/components/TransactionFilterBar.tsx:93` | SlidersHorizontal | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/TransactionFilterModal.tsx:98` | TextInput | handleApply, handleClear | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/finance/components/TransactionPreviewCard.tsx:160` | CardNeedsInputBox | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/components/TransactionsTabContent.tsx:63` | MonthCarouselSelector, TransactionFilterBar | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/finance/hooks/useFinanceHubData.ts:1` | hook/proprietário | handleMonthChange, handleRefresh | conferir proprietário |
| [ ] | `mobile/src/features/finance/hooks/useFinancialAiChat.ts:1` | hook/proprietário | handleClearChat, handleCopyMessage, handleStartEditMessage, handleCancelEdit, handleSaveAndResend, handleSendMessage, handleStartVoice, handleStopVoice, handleStartLive, handleToggleLivePause | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/finance/hooks/useTransactionForm.ts:1` | hook/proprietário | handlePurposeChange, handleTypeChange, handleSave, handleOpenCategoryModal | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/finance/screens/FinanceHubScreen.tsx:43` | TransactionFilterModal | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/orders/components/delivery/DeliveryPaymentSection.tsx:67` | CurrencyInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/orders/components/delivery/DeliveryStartConfirmModal.tsx:55` | Radio | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/orders/components/delivery/UnattendedModal.tsx:131` | TextInput | handleConfirm | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/orders/components/OrdersHeader.tsx:57` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/orders/hooks/useMobileOrders.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx:1` | hook/proprietário | handleStartRoute, handleArriveAtDestination, handleFinishDelivery, handleConfirmUnattended, handleStepBackToPreparation, handleStepBackToRoute, handleConfirmCancelDelivery, handleConfirmStartRoute | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/categories/components/CategoryAttributesPicker.tsx:45` | Sliders | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/categories/components/MobileCategoriesHeader.tsx:135` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/categories/hooks/useCategoryFormModal.ts:1` | hook/proprietário | handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/categories/hooks/useMobileCategoriesAndEnvironments.ts:1` | hook/proprietário | handleDataChanged, handleDelete, handleUnlink, handleViewOrphans | conferir proprietário |
| [ ] | `mobile/src/features/products/categories/modals/MobileCategoryEnvironmentModal.tsx:150` | TextInput, CategoryLinksPicker, CategoryAttributesPicker | handleDeletePress | conferir proprietário |
| [ ] | `mobile/src/features/products/components/ProductsHeader.tsx:164` | Search, TextInput | handleOpenMenu | conferir proprietário |
| [ ] | `mobile/src/features/products/hooks/useMobileProducts.ts:1` | hook/proprietário | handleToggleCatalog, handleToggleActive, handleDelete, handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/AttributesManagerModal.tsx:319` | Sliders, TextInput, Switch | handleAddAttr, handleDeleteAttr, handleAddValue, handleDeleteValue, handleAddNewOption, handleSaveEdit | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/components/CategoryMultiSelectList.tsx:47` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/EnvironmentsManagerModal.tsx:122` | TextInput | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/MobileMergeVariationModal.tsx:167` | TextInput | handleMerge | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/MobileMoveVariationModal.tsx:312` | TextInput | handleMove | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/ProductConfigModal.tsx:119` | Sliders | handleOpenCategories | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/ProductFormBasicSection.tsx:25` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/ProductFormPriceStockSection.tsx:39` | TextInput | handleAddImage, handleRemoveImage | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/ProductFormVariationsSection.tsx:60` | TextInput | handleAddVariation | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/ProductTypesManagerModal.tsx:105` | TextInput | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx:280` | TextInput, CategoryMultiSelectList, OpportunitySelectModal | handleToggleCategory, handleSelectOrigin | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormCompositionTab.tsx:133` | Search, TextInput | handleAddItem, handleUpdateQuantity, handleRemove | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormDescriptionTab.tsx:18` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:214` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx:356` | Search, TextInput, SupplierFormModal | handlePromoChange, handleUnitPriceChange, handleDiscountPercentChange, handleDiscountFixedChange, handleCostFieldChange, handleToggleOrigin | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx:334` | Search, TextInput, Switch, ProductTechnicalFieldInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx:649` | TextInput, ProductFormTechnicalTab, ProductFormCompositionTab | handleAdd, handleRemove | conferir proprietário |
| [ ] | `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx:86` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/products/screens/NativeProductsScreen.tsx:349` | ProductFormModal | handlePageChange, handleOpenNew, handleOpenEdit, handleDuplicate, handleOpenReconciliation | conferir proprietário |
| [ ] | `mobile/src/features/products/screens/ProductFormScreen.tsx:657` | ProductFormBasicTab, ProductFormPhotosTab, ProductFormTechnicalTab, ProductFormDescriptionTab, ProductFormPricesTab, ProductFormVariationsTab, ProductFormFiscalTab | handleRequestClose, handleSubmit, handleTouchStart, handleTouchEnd, handleTabChange, handleNextStep | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/schedule/components/CreateEventModal.tsx:110` | TextInput | handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/settings/screens/NativeSettingsScreen.tsx:132` | Switch | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/components/InventoryFocusItemCard.tsx:60` | TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/components/InventoryOperationFilterBar.tsx:36` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/components/InventoryOperationItemCard.tsx:49` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/components/InventoryScopeTypeSelector.tsx:69` | Filter | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/hooks/useInventoryAuditWorkflow.ts:1` | hook/proprietário | handleConfirmScope, handleUpdateCount, handleFinalize | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/inventory/hooks/useInventoryPersistenceQueue.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/inventory/hooks/useInventoryScopeBuilder.ts:1` | hook/proprietário | handleNextStep | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/modals/InventoryProductSearchModal.tsx:163` | Search, TextInput | handleSelect | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/screens/InventoryAuditFlow.tsx:217` | InventoryProductSearchModal | handleAddBlankItem, handleAddProductFromSearch | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/screens/InventoryOperationScreen.tsx:171` | InventoryOperationFilterBar | handleScan | conferir proprietário |
| [ ] | `mobile/src/features/stock/inventory/screens/InventoryScopeScreen.tsx:242` | InventoryScopeTypeSelector, InventoryProductSearchModal | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/invoices/hooks/useInvoices.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx:735` | Search, TextInput, SupplierFormModal, ProductFormScreen | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:187` | TextInput | handlePickDocument, handleDirectSefazQuery, handleScan | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/invoices/screens/InvoicesScreen.tsx:277` | TextInput, Search | handleFetchXml | conferir proprietário |
| [ ] | `mobile/src/features/stock/moves/components/StockProductSearchFilter.tsx:82` | Search, TextInput | handleSelect, handleClear | conferir proprietário |
| [ ] | `mobile/src/features/stock/moves/modals/InventoryMoveDeleteModal.tsx:78` | TextInput | handleConfirm | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/moves/modals/InventoryMoveEditModal.tsx:118` | StockMoveTypeSelector, TextInput | handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/moves/modals/StockPeriodModal.tsx:72` | TextInput | handleApplyCustom | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/moves/screens/StockMovesScreen.tsx:100` | StockProductSearchFilter | handleSelectProduct, handleClearProduct | conferir proprietário |
| [ ] | `mobile/src/features/stock/purchases/PurchaseFormModal.tsx:226` | TextInput, CurrencyInput, InventoryProductSearchModal | handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/purchases/PurchasesScreen.tsx:114` | Search, TextInput, PurchaseFormModal | handleStatusChange | conferir proprietário |
| [ ] | `mobile/src/features/stock/purchases/usePurchases.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:141` | TextInput | handleSave | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/suppliers/SuppliersScreen.tsx:137` | Search, TextInput, SupplierFormModal | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/suppliers/useSuppliers.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/unavailabilities/components/UnavailabilityEmptyState.tsx:24` | FilterX | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts:1` | hook/proprietário | handleClose, handleSubmit | RHF/Zod localizado; conferir callback |
| [ ] | `mobile/src/features/stock/unavailabilities/modals/UnavailabilityFormModal.tsx:86` | Search, TextInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `mobile/src/features/stock/unavailabilities/screens/UnavailabilitiesScreen.tsx:155` | UnavailabilityFilters, UnavailabilityFormModal | handleRefresh, handleLoadMore, handleUndo | conferir proprietário |
| [ ] | `mobile/src/hooks/useZodForm.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |

## digital-catalog

31 arquivos candidatos localizados; inclui filhos e wrappers, não apenas proprietários.

| Conferir | Arquivo / linha | Controles ou filhos localizados | Handlers | Integração localizada |
|---|---|---|---|---|
| [x] | `digital-catalog/src/app/auth/login/page.tsx:183` | form, Input | handleLogin, handleSendResetCode, handleVerifyCodeAndResetPassword | Login, envio de recuperação e verificação/alteração executam resolver real até concluir; trava comum e prazo local. Sete testes de proprietários incluem erro e resposta tardia. Cadastro/recuperação conservam seis caracteres. |
| [x] | `digital-catalog/src/app/auth/signup/page.tsx:97` | form, Input | handleChange, handleSignup | Cadastro e perfil ficam dentro do mesmo callback de resolver; valores parseados e proteção até update do perfil. Provas no teste do catálogo; Auth/Supabase simulados. |
| [ ] | `digital-catalog/src/app/categorias/[slug]/page.tsx:120` | ProductFilter, FilterContent | handleFilterChange | conferir proprietário |
| [ ] | `digital-catalog/src/app/page.tsx:337` | ProductFilter, SlidersHorizontal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, FilterContent | handleFilterChange | RHF/Zod localizado; conferir callback |
| [x] | `digital-catalog/src/app/perfil/page.tsx:375` | form, Input | handleUpdateName, handleRequestEmailChangeCode, handleVerifyEmailCode, handlePasswordUpdateWithCurrentPassword, handleRequestPasswordCode, handleVerifyPasswordCodeAndSave, handleLogoutAccount | Seis contratos de formulário com resolver ativo até o serviço; trava comum entre intenções, payload parseado e erros visíveis. Dez testes do proprietário incluem chegada/saída da sessão, duplicidade, erro, prazo e alternativa OTP. Logout sem campos compartilha a trava e verifica o erro retornado pelo provedor. |
| [x] | `digital-catalog/src/components/forms/ZodForm.tsx:21` | FormProvider, form | onValid parseado | Fronteira sem consumidor ativo localizado. Callback obrigatório recebe dados parseados; três testes conferem erro, espera/duplicidade e falha/retomada. Não representa página operacional adicional. |
| [ ] | `digital-catalog/src/components/layout/header/index.tsx:38` | DesktopSearchBar, form, SearchInput, Search | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/layout/header/search-bar.tsx:26` | Search, input, form, SearchInput | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/layout/header/use-search.ts:1` | hook/proprietário | handleClickOutside | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/components/layout/user-nav.tsx:83` | form, Input | handleLoginGoogle, handleLogout, handleEmailLoginPlaceholder | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/components/ui/checkbox.tsx:11` | CheckboxPrimitive.Root, CheckboxPrimitive.Indicator | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/dropdown-menu.tsx:84` | DropdownMenuPrimitive.CheckboxItem, DropdownMenuPrimitive.RadioGroup, DropdownMenuPrimitive.RadioItem | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/input.tsx:7` | input | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/select.tsx:10` | SelectPrimitive.Root, SelectPrimitive.Group, SelectPrimitive.Value, SelectPrimitive.Trigger, SelectPrimitive.Icon, SelectPrimitive.Portal, SelectPrimitive.Content, SelectScrollUpButton | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/slider.tsx:22` | SliderPrimitive.Root, SliderPrimitive.Track, SliderPrimitive.Range, SliderPrimitive.Thumb | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/switch.tsx:16` | SwitchPrimitive.Root, SwitchPrimitive.Thumb | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/components/ui/textarea.tsx:7` | textarea | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/features/categories/components/categories-manager-modal.tsx:260` | form, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Checkbox, Input | handleSave, handleDelete, handleNameChange | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/dialogs/AttributeManagerModal.tsx:251` | Input, input | handleKeyDownFastAttrVal, handleFastSaveAttribute, handleDeleteDbAttribute, handleStartEditDbAttribute, handleCancelEditDbAttribute, handleDeleteDbAttributeValue, handleAddDbAttributeValueToExisting | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/dialogs/ImageActionModal.tsx:60` | input | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/dialogs/VariationFormModal.tsx:217` | form, Input, select, Textarea | handleVarPriceChange, handleVarDiscountPercentChange, handleVarDiscountFixedChange, handleVarPromoPriceFieldChange, handleSaveVarForm | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductSave.ts:1` | hook/proprietário | handleFinish | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/steps/Step1Photos.tsx:323` | input | handleWheelNative, handleGlobalPaste, handleImageUpload, handleReplaceImage, handleDragOverArea, handleDragLeaveArea, handleDropArea | RHF/Zod localizado; conferir callback |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/steps/Step2Identification.tsx:91` | Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Checkbox | handlePriceChange, handleDiscountPercentChange, handleDiscountFixedChange, handlePromoPriceFieldChange | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/admin-modal/steps/Step3TechnicalSheet.tsx:26` | Textarea, Input | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/admin-product-modal.tsx:177` | form, VariationFormModal | handleOpenAddVar, handleOpenEditVar, handleSaveVariation, handleSetImages | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/filter-sidebar.tsx:34` | SlidersHorizontal, Input, Slider, FilterContent | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/product-filter.tsx:25` | SlidersHorizontal | props/contexto; conferir proprietário | conferir proprietário |
| [ ] | `digital-catalog/src/features/products/components/product-page-content.tsx:446` | ProductVariantSelector | handleAddToCart, handleWhatsApp, handleShareWhatsApp, handleCopyLink | conferir proprietário |
| [ ] | `digital-catalog/src/hooks/use-admin-mode.ts:1` | hook/proprietário | handleStorageChange | conferir proprietário |
| [ ] | `digital-catalog/src/hooks/useZodForm.ts:1` | hook/proprietário | props/contexto; conferir proprietário | RHF/Zod localizado; conferir callback |

## Provas de autenticação — primeira conferência individual

Três arquivos móveis e dois do catálogo conferidos. Nove testes novos de autenticação móvel, sete de catálogo e três do prazo compartilhado passaram. O conjunto móvel completo soma 16 testes com os sete proprietários anteriores; não são 16 testes novos de Auth. Os serviços de Auth, e-mail, callbacks de sessão e componentes nativos/router são simulados, sem login real, alteração de conta ou envio de e-mail. O runner utiliza React do ERP; não substitui prova em dispositivo RN ou navegação real Next/React 19. TypeScript completo do catálogo passou; mobile continua com erros fora dos três componentes/contrato modificados. Lint dos componentes móveis e das páginas do catálogo passou sem erros/avisos. A compilação Next passou antes do ajuste final de tratamento dos erros, que foi conferido por testes, TypeScript e lint.

Prazo local de 20s (30s para o navegador do Google): libera o indicador e informa que o estado da conta precisa ser conferido. Não cancela a operação no provedor, não reenvia automaticamente e não aplica sucesso tardio nos callbacks destes formulários. Eventos independentes de sessão do provedor continuam pertencendo ao contexto de autenticação.

Comandos: `npm run test:unit:mobile-forms --prefix erp`; `npm run test:unit:catalog-forms --prefix erp`; `npm run test:unit --prefix erp -- src/hooks/authOperationTimeout.test.ts`. Logs em scratch/rhf-mobile-auth-final-tests.log, rhf-catalog-auth-final-tests.log e rhf-auth-timeout-tests.log. A conferência integral das três aplicações permanece aberta.

## Perfil do catálogo — conferência adicional

Agora são três arquivos móveis e três páginas do catálogo conferidos. O perfil tinha seis hooks de formulário após retornos condicionais de sessão, causando mudança na ordem dos hooks ao carregar. Todos foram movidos antes dos retornos. O nome editado pertence ao ID da conta, sem efeito que substitua o rascunho a cada atualização do objeto de sessão. Os seis callbacks de formulário mantêm a validação real até terminar Auth, inclusive reautenticação/OTP e logout após alterar e-mail. E-mail e código parseados seguem para o provedor; as senhas preservam espaços e a política existente de seis caracteres. Erros de logout retornados sem exceção também impedem anunciar saída/navegar.

O pedido de código mostra espera, impede voltar/salvar enquanto pendente e pode ser retomado após erro. A alternativa de verificação OTP existente só ocorre após resposta de erro confirmada; timeout não gera nova tentativa. O prazo local não cancela operações externas ou eventos do contexto de sessão.

Oito testes reproduziram as falhas antes da correção (scratch/rhf-catalog-profile-before.log). Dez testes finais do perfil passaram; junto de autenticação, são 17 em dois arquivos (scratch/rhf-catalog-profile-final-tests.log). TypeScript completo, lint da página e build Next finais passaram (rhf-catalog-profile-final-tsc.log, rhf-catalog-profile-final-lint.log, rhf-catalog-profile-build.log). Serviços, UI de abas e router são simulados; não houve alteração real de conta ou envio de e-mail. Permanece pendente a navegação real Next/React 19.

`mobile/src/components/modals/ProfileModal.tsx` foi lido: apresenta dados e ações de navegação; a alteração de senha pertence ao PasswordChangeModal já conferido. Não é um novo formulário nem foi incluído no total do censo por conter apenas botões; ações nativas de atualização/push não foram executadas.

## Fronteira de formulário do catálogo

ZodForm não tem consumidor ativo localizado em src. O contrato anterior executava onSubmit bruto sem entregar os valores parseados, portanto não garantia o requisito do domínio para novos consumidores. Agora onValid é obrigatório e recebe o resultado do resolver, mantendo o callback inteiro sob a trava do formulário. Falhas do callback ficam visíveis e permitem retomar. Um teste reproduziu a falta de entrega antes da correção (scratch/rhf-catalog-boundary-before.log); três testes finais passaram.

O conjunto do catálogo soma 20 testes em três arquivos (rhf-catalog-profile-boundary-final-tests.log). TypeScript completo, lint da fronteira e build Next finais passaram (rhf-catalog-profile-boundary-final-tsc.log, rhf-catalog-boundary-lint.log, rhf-catalog-profile-boundary-final-build.log). Continuam sendo três páginas operacionais e uma fronteira técnica conferidas no censo de 31 candidatos; não converter esse total em porcentagem global. Não houve Auth, e-mail ou persistência remota real.
