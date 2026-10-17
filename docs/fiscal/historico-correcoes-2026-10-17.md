# Histórico de correções — 17/10/2026

## Política de produto — reforço da proibição de CC-e

**Problema e causa:** o usuário reiterou que o MoranteHub não faz Carta de Correção. Embora a retirada da interface já estivesse registrada em 16/10 e em FISCAL-016, referências históricas e a menção à circulação poderiam levar outro agente a reintroduzir CC-e como alternativa.

**Solução:** reforçada a regra de produto: não oferecer CC-e, inclusive quando houver circulação. Correções seguem por cancelamento fiscal ou estorno fiscal direto da NF, conforme a elegibilidade vigente. Este reforço não redefine a elegibilidade por circulação nem autoriza modificar as regras fiscais existentes. Artefatos legados permanecem exclusivamente técnicos/de auditoria.

**Arquivos e linhas:** `AGENTS.md:37`, `docs/fiscal/README.md:5` e referência em `docs/fiscal/README.md:9`; esta seção registra a decisão. FISCAL-016 e a política de 16/10 continuam vigentes.

**Validação:** conferência textual dos pontos de entrada e de FISCAL-016; alteração documental, sem mudança de serviço, XML, schema, banco ou regra de circulação. Nenhuma operação fiscal, transmissão, migration ou deploy executado.

## Entrada de mercadorias — bibliotecas de classificação e proprietário

**Problemas e causas comprovadas:** o proprietário encerrava a confirmação antes do callback de vínculo terminar; a classificação aceitava cadastro sem código do fornecedor e podia aplicar um produto sugerido que não fora encontrado. A repetição após falha em uma etapa posterior podia cadastrar outra variação. A nota não integrava a identidade do contexto e o painel de mapeamentos não recebia toda a ocupação do filho. Três provas iniciais reproduziram essas falhas (`scratch/rhf-inbound-classification-baseline-tests.log`).

**Solução:** contrato compartilhado explícito e resolver RHF real para vincular existente, cadastrar variação de família ou preparar rascunho independente. Dados parseados seguem para os efeitos, e a submissão acompanha consultas, gravações, confirmação do código do fornecedor e callback do item. A intenção independente não exige markup de finalização nem reaproveita metadados inválidos da sugestão descartada. Erros são visíveis; todos os fechamentos e ações concorrentes respeitam a mesma trava. Consultas têm prazo de 15s, gravações/aplicação de 20s e preparação de 60s; troca de item/fornecedor/nota/proposta e desmontagem descartam a continuação antiga. O painel fica ocupado até o filho terminar e remonta seu proprietário ao mudar de nota.

O progresso por item conserva UUID e etapas confirmadas durante a montagem: recusa conhecida permite continuar sem recadastrar variação/código já salvos; resposta perdida após escrita bloqueia repetição automática. Não trocar os dados nem criar outro produto depois de uma variação já confirmada. O avanço da fila ocorre depois da liberação da trava. Os dois componentes de sugestão são reutilizados pelo contêiner, sem duplicação do diálogo.

**Disposição das bibliotecas:** a busca de acionadores confirma que a linha operacional recebe somente `onRequestQuickRegister`; `requestIndividualCreation` aparece no hook e em testes, sem botão ativo. `InboundIndividualProductModal`, `InboundClassificationModals` e seus componentes de sugestão permanecem bibliotecas retidas, conferidas com o proprietário real e sem reativação. Encerrar sua conferência não significa adicionar três formulários operacionais. O cadastro rápido ativo mantém seus 25 testes de regressão.

**Arquivos e pontos alterados:**

| Arquivo | Linhas / responsabilidade |
|---|---|
| `shared-utils/inboundProductLinkFormSchemas.ts` | 58, 64: proposta explícita e três intenções de classificação |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts` | 22, 67, 74, 83, 233: contexto da nota, resolver/progresso e confirmação até o callback; também espera do vínculo encontrado na preparação |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts` | 42, 202, 224: contexto e ocupação agregada |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.tsx` | 12, 45, 90: contexto, trava e erro no filho |
| `erp/src/pages/App/Stock/InboundInvoices/modals/InboundClassificationModals.tsx` | 15, 42, 81: erro/progresso e composição dos diálogos reais |
| `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAiNewVariationModal.tsx` | 11, 33, 62, 116, 129, 137: `isBusy`, Escape, backdrop, campo e botões protegidos |
| `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAiExistingVariationModal.tsx` | 24, 41, 64, 115, 123: `isBusy`, Escape, backdrop e botões protegidos |
| `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx` | 32, 135, 138, 200, 280: ocupação do filho e identidade/remontagem por nota |
| `erp/src/pages/App/Stock/InboundInvoices/modals/inboundClassificationOwner.test.tsx` | 1, 26: 29 regressões com proprietário/RHF/diálogos reais e fixture com `relations` |
| `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.suggestions.test.tsx` | 63, 74: provas de bloqueio do fechamento e troca de nota, além das três existentes |
| `erp/src/pages/App/CustomerSupport/components/NavigationRail.tsx` | 5: import explícito de `navigationRail/index`, evitando autorreferência no Windows durante o build |
| `erp/src/pages/App/CustomerSupport/components/index.ts` | 19: mesmo caminho explícito no export da pasta, eliminando a ambiguidade de maiúsculas/minúsculas no TypeScript |

**Inventário e continuidade:** `docs/audits/fiscal-2026-10-14/form-migration-inventory.md:7` e linhas 103, 104, 106, 382, 383, 385 registram os três itens como bibliotecas retidas conferidas. O principal passa a **126/132 itens encerrados (95,5%), 6 pendentes**; isso não representa 126 formulários operacionais migrados. `docs/forms/continuidade-formularios-2026-10-16.md:5` e 11 e `docs/fiscal/README.md:11` apontam para estas provas. Censo adicional, mobile e catálogo permanecem abertos.

**Validação final:** **89 testes em cinco arquivos aprovados**, com composição real dos diálogos/proprietário e regressões do cadastro rápido. Lint dos 12 arquivos conferidos: zero erros e 17 avisos de variáveis não usadas. **Build ERP completo, incluindo startup fiscal, aprovado em 1m46s.** TypeScript global continua falhando com **364 diagnósticos**, nenhum nos arquivos deste lote; não há aprovação global de tipos. O primeiro build revelou o import da navegação que resolvia para o próprio arquivo no Windows; os dois caminhos foram explicitados antes do último gate. A fixture de categorias foi alinhada ao retorno real (`relations`). Logs: `scratch/rhf-inbound-classification-verified-tests.log`, `scratch/rhf-inbound-classification-verified-lint.json`, `scratch/rhf-inbound-classification-navigation-barrel-lint.json`, `scratch/rhf-inbound-classification-final-verified-tsc.log` e `scratch/rhf-inbound-classification-final-verified-build.log`. A repetição intermediária com filtro no diretório errado executou somente quatro arquivos/79 testes; não é a prova final de 89.

**Limites:** os serviços existentes `saveVariation`/`saveProductSupplierCode` retornam `Promise<void>`; o gate local confirma a conclusão dessas promessas e a leitura do vínculo, sem provar integralmente preço/persistência/RLS no banco remoto. A consulta de produto conserva o fallback local existente. Progresso e bloqueio de incerteza são locais à montagem; idempotência entre sessões continua responsabilidade do backend. Testes usam mocks e não certificam concorrência em PostgreSQL. Sem Supabase de negócio, IA paga, transmissão SEFAZ, migration, deploy ou reativação de biblioteca. CC-e continua ausente.

## Cancelamento da venda — confirmação até o resultado

**Problemas e causas comprovadas:** três regressões iniciais falharam no proprietário: fechamento liberado durante callback pendente, recusa sem erro visível e confirmação de Produção preservada ao trocar a venda (`scratch/rhf-sale-cancellation-baseline.log`). A leitura do pai comprovou que ele fechava antes da consulta de devolução ou do resultado da alteração de status. `useOrderHistory` descartava o booleano devolvido por `commitStatusUpdate`; a atualização otimista de cancelamento retirava o acionador antes de concluir o tratamento fiscal.

**Solução:** a confirmação RHF acompanha o callback até seu resultado, com trava comum aos botões/Escape/backdrop, revisão por contexto, prazo de 45s e erro visível; resposta incerta impede nova tentativa local. A consulta da política passa por contrato explícito com resolver, ID parseado e prazos de sessão (10s) e HTTP/leitura do JSON (15s), com aborto e validação da resposta antes de abrir o modal. A devolução vinculada é aguardada por até 15s e falha de consulta preserva a confirmação. O histórico devolve o resultado comercial e posterga a atualização local do cancelamento até o tratamento fiscal, evitando desmontar o modal por atualização otimista. A operação compartilhada limita espera comercial/fiscal a 30s por etapa e refresh a 10s. Troca de contexto impede iniciar o fiscal depois da confirmação comercial tardia; o fato comercial confirmado permanece preservado. Lote continua exigindo conferência neste acionador, sem habilitar um cancelamento que o pai antes recusava. Elegibilidade, circulação, ambientes e ausência de CC-e permanecem nas regras vigentes.

**Arquivos e linhas:**

| Arquivo | Linhas / responsabilidade |
|---|---|
| `shared-utils/saleCancellationFormSchemas.ts` | 1, 5, 6: contratos explícitos da consulta e resposta; lote vazio não abre confirmação |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx` | 29, 44, 107, 254: callback aguardado no resolver, contexto, prazo, bloqueio de resultado incerto e feedback |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.tsx` | 36, 39, 57, 127, 137, 145: consulta com RHF, prazo/aborto, resposta validada, ID parseado e confirmação/devolução aguardadas |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` | 274: resultado booleano propagado ao proprietário, inclusive recusa/erro |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts` | 117, 122, 146, 163, 196, 203, 250: contexto, atualização de cancelamento após resultado e espera comercial/fiscal/refresh limitada |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.test.tsx` | 14, 42, 49: callback confirmado e sua guarda; asserção DOM tipada sem acesso inválido a `HTMLElement.disabled` |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.submission.test.tsx` | 1: seis provas do proprietário real, prazo, contexto, recusa e incerteza |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.test.tsx` | 1: 13 provas de consulta/composição, ID parseado, prazo/aborto, confirmação, devolução e lote |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.test.ts` | 135, 206: atualização não otimista e cinco regressões de ordem, contexto e prazo |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryQueryState.test.tsx` | 69: resultado real de cancelamento propagado para sucesso e recusa |

**Validação final:** **133 testes em dez arquivos aprovados**, incluindo 43 provas do agregado e regressões de recebimento/cancelamento de devolução comercial, menus, tabela e serviço de efeitos fiscais. Os 31 testes intermediários são subconjunto, não somar como provas distintas. **Lint dos dez arquivos sem erros nem avisos. Build ERP completo, incluindo startup fiscal, aprovado em 1m35s.** TypeScript global permanece com **363 diagnósticos**, nenhum nos arquivos deste lote; não há aprovação global de tipos. Logs: `scratch/rhf-sale-cancellation-final-tests.log`, `scratch/rhf-sale-cancellation-final-lint.json`, `scratch/rhf-sale-cancellation-final-tsc.log` e `scratch/rhf-sale-cancellation-final-build.log`.

**Inventário:** encerrado o agregado de `CancelSaleModal` com seu pai de consulta e o resultado do histórico. Principal ERP: **127/132 itens conferidos/encerrados (96,2%), cinco pendentes**. O censo adicional, mobile e catálogo continuam abertos; não há conclusão global. As bibliotecas retidas do checkpoint anterior continuam sem acionador.

**Limites:** o booleano `true` da operação representa conclusão do contrato comercial existente, podendo haver pendência fiscal já informada pelo serviço; não certifica autorização/cancelamento na SEFAZ nem uma nova leitura transacional do banco. A promessa comercial existente pode continuar no servidor após expirar a espera; o proprietário não inicia nova etapa fiscal ao receber uma confirmação comercial atrasada. Bloqueios de incerteza são locais à montagem; a reconciliação/idempotência entre sessões continua pertencendo ao backend. Provas com mocks, sem operação comercial remota, consulta/transmissão SEFAZ, migration ou deploy. Nenhuma regra de circulação ou política fiscal foi alterada; CC-e permanece ausente do produto.

## Assistência técnica — formulário base, agendamento comercial e autosave

**Problemas e causas comprovadas:** o fluxo de assistência técnica em `useAssistanceOrderForm.ts` liberava `validateAndRun` antes de invocar `saveOrder`, não assegurando que o serviço rodasse dentro do ciclo do resolver. Além disso, o autosave e o salvamento manual concorriam sem serialização rígida de fila, arriscando sobrescrita ou corrupção de snapshot caso uma requisição ficasse presa ou devolvesse status incerto. Os contratos de itens vinculados e avulsos e os dados de agendamento comercial careciam de schema Zod unificado.

**Solução:** migração integral para React Hook Form e zodResolver utilizando `createAssistanceOrderFormSchema` e `assistanceOrderDraftFormSchema`. O salvamento base (`handleSaveBase`) foi refatorado para executar a persistência (`saveOrder`) estritamente dentro do callback `onValid` de `validateAndRun`. A fila de autosave agora checa `saveInProgressRef`, evitando colisões. Em caso de falha ou timeout, a flag `uncertain` ativa `saveBlocked`, exibindo banner visual explicativo e bloqueando novas ações até ação explícita do usuário. A tipagem e schemas de agendamento comercial foram centralizados em `shared-utils/commercialSchedulingFormSchema.ts`.

**Arquivos alterados:**
- `erp/src/pages/App/SalesOrder/Assistance/AssistanceOrderModal.tsx`
- `erp/src/pages/App/SalesOrder/Assistance/hooks/useAssistanceOrderForm.ts`
- `shared-utils/commercialSchedulingFormSchema.ts`
- `shared-utils/orderDomainValidation.ts`

**Validação:** 14 testes unitários e de integração aprovados em `erp/src/pages/App/SalesOrder/Assistance/` cobrindo rascunho, finalização, agendamento, concorrência e tratamento de incerteza.

## Edição de pedido — auditoria fiscal e persistência no resolver

**Problemas e causas comprovadas:** em `OrderEditModal.tsx`, a rotina `saveWithFiscalAudit` executava `validateEditedOrder`, mas disparava `auditFiscalOrderEdit` e `persistUpdate` após a resolução externa, permitindo que a operação comercial e a auditoria fiscal corressem fora da cadeia de validação do resolver.

**Solução:** reestruturação de `saveWithFiscalAudit` para que tanto a auditoria fiscal (`auditFiscalOrderEdit`) quanto a atualização do pedido (`persistUpdate`) ocorram estritamente dentro do callback de validação do schema Zod (`validateEditedOrder`). Erros de validação interrompem a chamada antes de qualquer auditoria ou persistência no backend.

**Arquivos alterados:**
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`
- `erp/src/pages/App/SalesOrder/modals/__tests__/OrderEditFiscalContinuation.test.tsx`

**Validação:** 4 testes aprovados em `OrderEditFiscalContinuation.test.tsx`, garantindo que edições de itens e totais do pedido respeitam as regras fiscais de snapshot e auditoria.

## Movimentação de estoque — biblioteca e modal dormente

**Problemas e causas comprovadas:** `InventoryMoveEditModal.tsx` consistia em uma biblioteca dormente no ERP cuja submissão executava imperativamente sem validação de resolver Zod e sem garantias contra travamentos de requisições de rede.

**Solução:** integração com `useZodForm(inventoryMoveFormSchema)`. O método `handleSave` foi reescrito para acionar `updateInventoryMove` dentro da função de callback de `form.validateAndRun`, envolto em `withTimeout(15000)`. Mantida a conformidade arquitetural: o editor permanece dormente no fluxo de produção para impedir alterações arbitrárias de ledger sem RPC transacional autorizada.

**Arquivos alterados:**
- `erp/src/pages/App/Stock/Movements/modals/InventoryMoveEditModal.tsx`
- Proxies mantidos em `Stock/modals` e `Stock/components`
- `erp/src/pages/App/Stock/Movements/modals/__tests__/InventoryMoveEditModal.test.tsx`

**Validação:** 4 testes unitários em `InventoryMoveEditModal.test.tsx` aprovados.

## Emissão de NF-e e NFC-e — submissão e prévia envelopadas no resolver

**Problemas e causas comprovadas:** `useNfeEmissionActions.ts` invocava validação manual (`validateNfeEmission`) e chamava `form.validateAndRun` apenas como verificador passivo, efetuando o backfill de snapshots e as chamadas a `emitNfeForOrder` no escopo externo.

**Solução:** as rotinas de transmissão fiscal e geração de prévia XML foram integradas ao resolver RHF (`nfeEmissionFormSchema`), de modo que as mutações e chamadas ao serviço fiscal ocorrem exclusivamente no callback assíncrono `onValid`. Em `useNfeEmission.ts`, o salvamento de rascunho fiscal e o registro da finalidade de aquisição (`handleAcquisitionPurposeChange`) foram migrados para `draftForm.validateAndRun` (`nfeEmissionDraftFormSchema`) e `purposeForm.validateAndRun` (`nfeAcquisitionPurposeFormSchema`). Mantidos os invariantes: ausência estrita de CC-e, isolamento entre Homologação e Produção, numeração atômica e snapshots imutáveis.

**Arquivos alterados:**
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts`
- `shared-utils/nfeEmissionFormValidation.ts`

**Validação:** 120 testes aprovados na suíte `nfe-modal` (`useNfeEmission.test.tsx`).

## Sincronização de Salvados no Meta Catalog e Catálogo Digital

**Problemas e causas comprovadas:** produtos marcados como salvados (`is_salvado: true` ou `product_kind: 'salvado'`) tinham suas variações publicadas bloqueadas caso estivessem com status `active: false`, impedindo a sincronização para o Facebook Catalog / Meta Catalog.

**Solução:** adaptação nos serviços de payload e estatísticas do ERP (`metaCatalogPayload.ts`, `metaCatalogStats.ts`, `metaCatalogDataService.ts`) e no feed mapper do catálogo digital (`feed-mapper.ts`, `types.ts`, `route.ts`), permitindo que variações publicadas de salvados sejam incluídas no feed com o availability correto.

**Validação:** 13 testes unitários no ERP (`src/pages/App/Products/MetaCatalog/`) e 9 testes no Catálogo Digital (`facebook-catalog-feed.test.ts`) aprovados.

## Fechamento do Inventário Principal de Formulários do ERP

Com a conclusão dos cinco proprietários pendentes, o inventário principal em `docs/audits/fiscal-2026-10-14/form-migration-inventory.md` alcança **132/132 itens conferidos e encerrados (100%)**. Todas as submissões executam o resolver real de schemas Zod explícitos antes de chamar serviços externos ou APIs de persistência.

## Catálogo Digital e App Mobile — Agregados, Modais e Resolução de Formulários

**Problemas identificados e sintomas observados:**
- No Catálogo Digital (`digital-catalog`), o modal de edição agregada de produto mantinha pendências reportadas no inventário (`ideias_planos.md`): `ImageActionModal` recebia um callback vazio de substituição de foto (`onReplaceImage`), `Step1Photos.tsx` realizava uploads, colagem (`paste`) e drag-and-drop sem validação de resolver RHF unificada, `VariationFormModal.tsx` gerava dados de variação sem envolver o cálculo e salvamento no ciclo `onValid` do schema, e `AttributeManagerModal.tsx` persistia atributos diretamente no Supabase fora do `onValid`. Na navegação (`user-nav.tsx`), o login por e-mail consistia em um placeholder que apenas exibia alertas informativos sem autenticar o usuário.
- No App Mobile (`mobile`), o formulário de produto (`ProductFormScreen.tsx`), o cadastro de fornecedores (`SupplierFormModal.tsx`) e o registro de indisponibilidade de estoque (`useMobileUnavailabilityForm.ts`) possuíam esquemas Zod instanciados mas disparavam suas persistências (`onSave`, `createStockUnavailability`) antes ou fora do encerramento seguro do resolver. Além disso, `useMobileProducts.ts` apresentava erro de importação de `isTestProduct`.

**Causa raiz técnica comprovada:**
- Ausência de conexão entre os schemas Zod de domínio (`storefrontProductFormSchemas.ts`, `personDomainValidation.ts`, `operationsFormSchemas.ts`) e as chamadas assíncronas de gravação, permitindo que mutações corressem sem a validação do schema ou com dados não parseados, violando a Regra 5 de `AGENTS.md`.

**Lista de arquivos e pontos modificados:**
1. `digital-catalog/src/features/products/components/admin-product-modal.tsx`: implementação de `handleReplaceImage` validado via `storefrontImageUploadFormSchema`, com upload seguro no Cloudflare R2 e vínculo real ao `<ImageActionModal onReplaceImage={handleReplaceImage} />`.
2. `digital-catalog/src/features/products/components/admin-modal/steps/Step1Photos.tsx`: validação de uploads de arquivos e URLs remotas via `uploadForm.validateAndRun` em `handleGlobalPaste`, `handleImageUpload`, `handleReplaceImage` e `handleDropArea`.
3. `digital-catalog/src/features/products/components/admin-modal/dialogs/VariationFormModal.tsx`: geração de SKU automático, identificação e fechamento executados estritamente no callback `onValid` de `variationForm.validateAndRun`.
4. `digital-catalog/src/features/products/components/admin-modal/dialogs/AttributeManagerModal.tsx`: criação de atributos e inserção de novos valores encapsulados em `attributeForm.validateAndRun` e `attributeValueForm.validateAndRun`.
5. `digital-catalog/src/components/layout/user-nav.tsx`: formulário de autenticação conectado a `useForm` com `zodResolver(loginFormSchema)`, timeout protegido via `waitForAuthOperation`, invocação de `supabase.auth.signInWithPassword`, feedback com toast e redirecionamento de cadastro para `/auth/signup`.
6. `mobile/src/features/products/domain/productSaveState.ts`: re-exportação de `isTestProduct` de `shared-utils/isTestProduct`.
7. `mobile/src/features/products/hooks/useMobileProducts.ts`: importação canônica de `isTestProduct` a partir de `shared-utils`.
8. `mobile/src/features/products/screens/ProductFormScreen.tsx`: submissão unificada de rascunho (`draftForm`) e publicação final (`finalForm`) envolvendo geração de código sequencial e `onSave` no callback `onValid`.
9. `mobile/src/features/stock/suppliers/SupplierFormModal.tsx`: submissão encapsulada no callback `onValid` de `personForm.validateAndRun(form, ...)` antes de `onSave`.
10. `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts`: validação estrita com `stockUnavailabilityFormSchema`, bloqueando estoque insuficiente e devolução sem fornecedor no callback `onValid` de `form.validateAndRun`.
11. `erp/tests/catalog-forms/catalogAggregateModals.test.tsx`: suíte de 5 testes unitários cobrindo `UserNav`, `AttributeManagerModal` e `VariationFormModal`.
12. `erp/tests/mobile-forms/mobileProductAndSupplierOwners.test.tsx`: suíte de 5 testes unitários cobrindo `SupplierFormModal`, `useMobileUnavailabilityForm` e `ProductFormScreen`.

**Validação e Não-Regressão:**
- **53/53 testes aprovados** em `npm run test:unit:catalog-forms --prefix erp` (6 arquivos de teste).
- **47/47 testes aprovados** em `npm run test:unit:mobile-forms --prefix erp` (5 arquivos de teste).
- **100/100 testes de formulário aprovados (100% de sucesso)**.
- **Typecheck**: `npx tsc --noEmit -p "digital-catalog/tsconfig.json"` executado com 0 erros.
- **Build de Produção**: `npm run build --prefix digital-catalog` (Next.js 16.3.6 Turbopack) concluído com sucesso (código 0).
- **Invariante de Segurança e Política Fiscal**: Estrita ausência de CC-e em qualquer tela, modal ou componente.


## Refatoração Arquitetural e Princípios de Engenharia de Software (Clean Code, DRY, SRP, SSOT)

**Problemas identificados e motivação técnica:**
1. **Violação de DRY no upload de fotos do catálogo digital**: O fluxo de otimização de imagem via WebP (`optimizeProductImage`) e upload para o Cloudflare R2 (`uploadToR2`) estava duplicado em 5 pontos distintos dentro de `Step1Photos.tsx` e `admin-product-modal.tsx`.
2. **Violação de Single Source of Truth (SSOT) no domínio de indisponibilidades**: Os arrays de motivos (`REASONS` / `UNAVAILABILITY_REASONS`) e tratamentos (`TREATMENTS` / `UNAVAILABILITY_TREATMENTS`) de estoque estavam definidos simultaneamente em `shared-utils/operationsFormSchemas.ts` e duplicados em `mobile/src/features/stock/unavailabilities/types.ts`.
3. **Acoplamento e quebra de Single Responsibility Principle (SRP) na tela de produto mobile**: A verificação de permissões do usuário e perfil fiscal (`isStockistOnly`, `canConfigureProductTaxes`, `canManageCategories`, `hideCatalogPublicationStatus`) estava misturada dentro do corpo do componente de tela `ProductFormScreen.tsx`, em vez de isolada em um hook dedicado.
4. **Ausência de tipagem estrita e validação redundante no cadastro de fornecedores mobile**: `SupplierFormModal.tsx` utilizava tipagem aberta (`any`) para o formulário, campos e propriedades, além de manter validações manuais de presença de nome duplicando a regra já inspecionada pelo schema Zod (`createPersonFormSchema`).
5. **Falta de tipagem explícita nos retornos de hooks e schemas operacionais**: `useMobileUnavailabilityForm.ts` e `operationsFormSchemas.ts` careciam de interfaces exportadas para facilitar o consumo seguro por outros componentes e testes.

**Soluções arquiteturais implementadas:**
1. **Extração de utilitário reaproveitável de upload (`DRY & SRP`)**:
   - Criação de `digital-catalog/src/features/products/components/admin-modal/utils/productImageUploadUtils.ts`, fornecendo `processAndUploadSingleProductImage` e `processAndUploadProductImages`.
   - Substituição de todas as rotinas repetitivas em `Step1Photos.tsx` (colagem, input file, drag-and-drop de arquivos e URL) e `admin-product-modal.tsx` (`handleReplaceImage`).
2. **Harmonização de Domínio e SSOT (`SSOT`)**:
   - Centralização de `UNAVAILABILITY_REASONS` e `UNAVAILABILITY_TREATMENTS` e seus tipos inferidos (`UnavailabilityReason`, `UnavailabilityTreatment`) em `shared-utils/operationsFormSchemas.ts`.
   - `mobile/src/features/stock/unavailabilities/types.ts` passa a re-exportar essas definições mantendo compatibilidade retroativa para consumidores legados.
3. **Extração do hook de permissões (`SRP & Clean Code`)**:
   - Criação de `mobile/src/features/products/hooks/useProductFormPermissions.ts` encapsulando as checagens de perfil e papéis com tipagem completa na interface `ProductFormPermissions`.
   - Limpeza em `ProductFormScreen.tsx`, removendo importações diretas de `useAuth` e das funções de cálculo de papéis.
4. **Tipagem estrita e validação limpa em `SupplierFormModal`**:
   - Criação das interfaces `SupplierAddress`, `SupplierFormData`, `FieldOptions` e `SupplierFormItem`.
   - Delegação integral da validação de obrigatoriedade de Nome/Razão Social para o resolver Zod, eliminando checagens manuais no callback `onValid`.
5. **Tipagem e formatação estruturada de Schemas e Hooks**:
   - Exportação de tipos inferidos em `shared-utils/operationsFormSchemas.ts` (`StockUnavailabilityFormValues`, `AssemblyScheduleFormValues`, etc.).
   - Criação da interface de retorno `UseMobileUnavailabilityFormReturn` em `useMobileUnavailabilityForm.ts`.
   - Refinamento dos mocks em `erp/tests/mobile-forms/mobileProductAndSupplierOwners.test.tsx` com tipos explícitos para elementos do React Native e chamadas do cliente Supabase.

**Arquivos modificados e criados:**
- `digital-catalog/src/features/products/components/admin-modal/utils/productImageUploadUtils.ts` (criado)
- `digital-catalog/src/features/products/components/admin-modal/steps/Step1Photos.tsx`
- `digital-catalog/src/features/products/components/admin-product-modal.tsx`
- `mobile/src/features/products/hooks/useProductFormPermissions.ts` (criado)
- `mobile/src/features/products/screens/ProductFormScreen.tsx`
- `mobile/src/features/stock/suppliers/SupplierFormModal.tsx`
- `mobile/src/features/stock/unavailabilities/hooks/useMobileUnavailabilityForm.ts`
- `mobile/src/features/stock/unavailabilities/types.ts`
- `shared-utils/operationsFormSchemas.ts`
- `erp/tests/mobile-forms/mobileProductAndSupplierOwners.test.tsx`

**Validação e Não-Regressão:**
- **Testes Unitários Mobile**: 47/47 aprovados (`npm run test:unit:mobile-forms --prefix erp`).
- **Testes Unitários Catálogo Digital**: 53/53 aprovados (`npm run test:unit:catalog-forms --prefix erp`).
- **Total de Testes**: 100/100 aprovados (100% de sucesso).
- **Typecheck Catálogo**: `npx tsc --noEmit -p "digital-catalog/tsconfig.json"` executado com 0 erros.
- **Typecheck Mobile (arquivos modificados)**: 0 diagnósticos de erro.
- **Build de Produção**: `npm run build --prefix digital-catalog` (Next.js 16 Turbopack) concluído com sucesso (código 0).
- **Invariante Fiscal Mandatório**: Total conformidade com a ausência de CC-e e execução real do resolver Zod antes de qualquer mutação.


## Auditoria Integral e Fechamento de Formulários Mobile e Catálogo Digital

**Problemas identificados e motivação técnica:**
1. **Mojibake e dupla codificação UTF-8 em `MobileCompositionFormModal.tsx`**: Caracteres corrompidos em strings visíveis ao usuário (`PadrÃ£o`, `ComposiÃ§Ã£o`, `VariaÃ§Ãµes`, `InformaÃ§Ãµes BÃ¡sicas`, `Modo de PrecificaÃ§Ã£o`, etc.).
2. **Conflito de sintaxe JSX em genérico de snapshot local no SQLite (`inventoryCatalog.ts`)**: A assinatura de função seta `async <T>(): Promise<T | null>` colidia com a interpretação de tag JSX `<T>` no esbuild/Vite runner forçado pelo ambiente de testes móveis.
3. **Falso-positivo em leitor de código físico para placeholders de prévia (`inventoryScanRules.ts`)**: A leitura de etiquetas com identificador simulado `MH:L:000XXX|*` estava sendo convertida indevidamente para `qr:...` em vez de ser descartada como placeholder de prévia (`undefined`).
4. **Inconsistência lógica no helper de paridade de inventário (`inventoryParity.test.ts`)**: O helper de teste `canFinalize` calculava `uncountedCount = totalCount - countedCount`, mas não utilizava a variável na condição de retorno, gerando divergência com a regra de negócio de `inventoryFinalizer.ts` (que impede conclusão quando `hasStages && uncountedCount > 0`).
5. **Auditoria de todos os formulários e presenters de Mobile e Catálogo Digital**: Mapeamento e verificação de que todos os formulários proprietários acionam seus resolvers Zod reais dentro do fluxo de submissão (`validateAndRun` / `onValid`), impedindo submissões inválidas e mantendo feedback acessível e amigável ao usuário.

**Soluções técnicas implementadas:**
1. **Saneamento de Codificação (`MobileCompositionFormModal.tsx`)**:
   - Correção de todas as sequências de mojibake para caracteres UTF-8 limpos em títulos, abas, avisos de confirmação e alertas de validação (`Padrão`, `Composição`, `Variações`, `Informações Básicas`, `Modo de Precificação`, `Preço`, `Automático`).
2. **Desambiguação de Sintaxe JSX em Genérico (`inventoryCatalog.ts`)**:
   - Ajuste da assinatura para `export const getLocalInventoryCatalogSnapshot = async <T,>(): Promise<T | null> => {`, desambiguando o tipo genérico da tag JSX no esbuild e desbloqueando a suíte de testes de persistência local em SQLite.
3. **Descarte Correto de Preview Placeholders (`inventoryScanRules.ts`)**:
   - Inclusão da guarda `if (!raw || raw.includes('000XXX')) return undefined;` em `getPhysicalInventoryScanId`, garantindo que etiquetas de modelo/prévia não sejam computadas como unidades físicas reais de estoque.
4. **Alinhamento do Helper de Paridade (`inventoryParity.test.ts`)**:
   - Ajuste em `canFinalize` para respeitar a exigência de contagem integral em inventários por etapas: `return !(countedCount === 0 || loading || (hasStages && uncountedCount > 0));`.
5. **Atualização do Inventário (`docs/forms/inventario-mobile-catalogo-2026-10-15.md`)**:
   - Registro de conferência de todos os formulários proprietários e presenters com schemas Zod reais.

**Arquivos modificados:**
- `mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx`
- `mobile/src/services/sqlite/inventoryCatalog.ts`
- `mobile/src/features/stock/inventory/services/inventoryScanRules.ts`
- `mobile/src/features/stock/inventory/inventoryParity.test.ts`
- `docs/forms/inventario-mobile-catalogo-2026-10-15.md`

**Validação e Não-Regressão:**
- **Testes Unitários de Formulários Catálogo**: 53/53 aprovados (`npm run test:unit:catalog-forms --prefix erp`).
- **Testes Unitários de Formulários Mobile**: 47/47 aprovados (`npm run test:unit:mobile-forms --prefix erp`).
- **Total de Testes de Formulário**: 100/100 aprovados (100% de sucesso).
- **Testes Unitários Mobile Gerais**: 339/339 aprovados em 64 arquivos de teste (`npm run test:unit:mobile --prefix erp`), sem nenhuma falha residual.
- **Build de Produção do Catálogo Digital**: Next.js 16.3.6 Turbopack build compilado com sucesso (código 0).
- **Invariante Fiscal Mandatório**: Total conformidade com a política de Zero CC-e e validação por Zod antes de persistência.

## Refatoração e Arquitetura Limpa: Catálogo Digital e Módulos Móveis

**Problemas identificados e motivação técnica:**
1. **Monolito em `product-page-content.tsx` (~567 linhas)**:
   - Acoplamento excessivo misturando rastreamento analítico por IP/geolocalização, resolução de overrides dinâmicos de variações (título, preço pai vs filho, medidas e espessura), extração de especificações técnicas, compartilhamento via WhatsApp/clipboard e layout de tela complexo.
2. **Monolito em `MobileCompositionFormModal.tsx` (~665 linhas)**:
   - Componente acumulava lógica de busca de produtos com debounce, normalização de variações, estado do formulário e de itens, validação Zod, cabeçalho de abas e markup visual das quatro abas em um único arquivo. Havia também resíduos de arquivos de texto de rascunho (`MobileCompositionFormModal_*.txt`) na pasta `modals/`.
3. **Monolito em `PurchaseFormModal.tsx` (~559 linhas)**:
   - Misturava busca e filtragem de fornecedores, modal embutido de seleção, recálculo dinâmico de fatores de IPI e frete sobre itens, gerenciamento de picker de produtos e layout extenso de formulário em uma única estrutura.

**Soluções técnicas implementadas:**
1. **Catálogo Digital (`product-page-content.tsx`)**:
   - Criado hook `digital-catalog/src/features/products/hooks/useProductViewTracking.ts` com responsabilidade única de rastreamento de acessos de visitantes.
   - Criado hook `digital-catalog/src/features/products/hooks/useProductPageDisplayState.ts` encapsulando overrides de título, preços, medidas (largura, profundidade, altura, espessura), sincronização de imagens ativas e resolução de especificações técnicas.
   - Criado hook `digital-catalog/src/features/products/hooks/useProductShare.ts` para montagem de texto formatado de compartilhamento, link do WhatsApp e cópia de URL para o clipboard.
   - Componente `product-page-content.tsx` simplificado e coeso, reduzido para coordenador declarativo.
2. **Composições Mobile (`MobileCompositionFormModal.tsx`)**:
   - Isolamento do schema Zod em `mobile/src/features/compositions/schemas/compositionFormSchema.ts`.
   - Criado hook `mobile/src/features/compositions/hooks/useCompositionProductSearch.ts` gerenciando busca debounced e mapeamento de variações de estoque.
   - Criado hook `mobile/src/features/compositions/hooks/useCompositionForm.ts` gerenciando dados do formulário, manipulação atômica de itens, validação `useZodForm` e chamada assíncrona ao serviço de persistência.
   - Componentização modular das abas e cabeçalho em `mobile/src/features/compositions/components/`:
     - `CompositionTabsHeader.tsx`
     - `CompositionInfoTab.tsx`
     - `CompositionItemsTab.tsx`
     - `CompositionConstructionTab.tsx`
   - Remoção de três arquivos obsoletos de rascunho (`MobileCompositionFormModal_*.txt`).
3. **Pedidos de Compra Mobile (`PurchaseFormModal.tsx`)**:
   - Criado hook `mobile/src/features/stock/purchases/hooks/usePurchaseForm.ts` responsável pelo carregamento e filtro de fornecedores, aplicação de fatores de IPI/frete, gerenciamento de itens, validação com `mobilePurchaseFormSchema` via `validateAndRun` e envio do payload normalizado.
   - Componentização modular em `mobile/src/features/stock/purchases/components/`:
     - `PurchaseOrderDetailsSection.tsx`
     - `PurchaseSupplierPickerModal.tsx`
     - `PurchaseItemsSection.tsx`
   - `PurchaseFormModal.tsx` reorganizado de forma concisa e elegante.

**Arquivos modificados, criados e excluídos:**
- `digital-catalog/src/features/products/hooks/useProductViewTracking.ts` (criado)
- `digital-catalog/src/features/products/hooks/useProductPageDisplayState.ts` (criado)
- `digital-catalog/src/features/products/hooks/useProductShare.ts` (criado)
- `digital-catalog/src/features/products/components/product-page-content.tsx` (refatorado)
- `mobile/src/features/compositions/schemas/compositionFormSchema.ts` (criado)
- `mobile/src/features/compositions/hooks/useCompositionProductSearch.ts` (criado)
- `mobile/src/features/compositions/hooks/useCompositionForm.ts` (criado)
- `mobile/src/features/compositions/components/CompositionTabsHeader.tsx` (criado)
- `mobile/src/features/compositions/components/CompositionInfoTab.tsx` (criado)
- `mobile/src/features/compositions/components/CompositionItemsTab.tsx` (criado)
- `mobile/src/features/compositions/components/CompositionConstructionTab.tsx` (criado)
- `mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx` (refatorado)
- `mobile/src/features/compositions/modals/MobileCompositionFormModal_renderItemsTab.txt` (excluído)
- `mobile/src/features/compositions/modals/MobileCompositionFormModal_replace.txt` (excluído)
- `mobile/src/features/compositions/modals/MobileCompositionFormModal_useEffect.txt` (excluído)
- `mobile/src/features/stock/purchases/hooks/usePurchaseForm.ts` (criado)
- `mobile/src/features/stock/purchases/components/PurchaseOrderDetailsSection.tsx` (criado)
- `mobile/src/features/stock/purchases/components/PurchaseSupplierPickerModal.tsx` (criado)
- `mobile/src/features/stock/purchases/components/PurchaseItemsSection.tsx` (criado)
- `mobile/src/features/stock/purchases/PurchaseFormModal.tsx` (refatorado)

**Validação e Não-Regressão:**
- **Testes Unitários de Formulários Catálogo**: 53/53 aprovados (`npm run test:unit:catalog-forms --prefix erp`).
- **Testes Unitários de Formulários Mobile**: 47/47 aprovados (`npm run test:unit:mobile-forms --prefix erp`).
- **Testes Gerais Mobile**: 339/339 aprovados em 64 arquivos (`npm run test:unit:mobile --prefix erp`).
- **Build de Produção do Catálogo Digital**: Next.js 16.3.6 Turbopack build compilado com sucesso (código 0).
- **Invariante Fiscal Mandatório**: Total conformidade com a política de Zero CC-e e execução do resolver real em todos os formulários.

## NF de Saída (NF-e 55 e NFC-e 65) — Auditoria de Homologação e Prontidão para Produção

**Problemas identificados e sintomas observados:**
1. **Desalinhamento do marcador de sequência (high-water mark) de NF-e 55 em Homologação (`modelo = '55', serie = '1', ambiente = 2`)**:
   - No banco (`hkoxhourxwlddgsfdgws`), `public.nfe_sequences` registrava `ultimo_numero = 130` e `public.nfe_establishment_sequences` registrava `last_number = 112`, enquanto `public.nfe_documents` e `public.nfe_fiscal_snapshots` possuíam registros históricos com `numero_nfe = 700` e `701` (de `30/09/2026`).
   - Como consequência, `public.peek_nfe_outbound_number('44512248000107', '55', 2, '1', 102)` retornava `702`, mas `GET /api/nfe/reserve-number` (consumido por `useNfeSequencePreview.ts`) lia `nfe_sequences.ultimo_numero` (`130`) e exibia `131` na prévia do modal, além de `reserve_next_nfe_number` (usado por `transmit-operation-draft.ts` em estornos/devoluções) alocar a partir de `131`, gerando divergência com o alocador de venda normal e risco de conflito futuro com `700`/`701`.
2. **Falhas de compilação TypeScript nos projetos fiscais (`erp/tsconfig.fiscal.json` e `api/tsconfig.nfe.json`)**:
   - Em `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts:149`, a chamada `updateOrder(order.id, ...)` dentro do callback assíncrono de `purposeForm.validateAndRun` perdia o estreitamento de tipo (`string | undefined`), causando `TS2345`.
   - Em `api/tsconfig.nfe.json:2`, `"extends": "../tsconfig.json"` apontava para um arquivo inexistente na raiz do monorepo (movido para `../erp/tsconfig.json`), fazendo o compilador cair para configuração legada sem `strictNullChecks`.
   - Em `api/nfe/emit.ts:117,338` e `api/nfe/consult.ts:32`, a passagem de `{ db: { retry: false } }` para `createClient<FiscalDatabase>` impedia a inferência do parâmetro de schema `"public"` nas sobrecargas de `@supabase/supabase-js`, gerando erros `TS2353`, `TS2322` e `TS18048`.
3. **Fronteira de comando de emissão para pedidos sintéticos (`TEST_AUT_*`) e alinhamento de fixtures de teste**:
   - `parseFiscalEmissionCommand` (`api/nfe/fiscalSnapshot.ts:411`) não bloqueava `orderId` com prefixo `TEST_AUT_` quando `environment === 1` antes de atingir a RPC do banco (`prepare_nfe_outbound_attempt`), quebrando a regressão de integridade do modal (`fiscalModalIntegrity.test.ts`).
   - Fixtures unitárias em `fiscalXmlAudit.test.ts` (CNPJ `12345678000199` com DV inválido em vez de `12345678000195`), `hmlNormalSaleRuleSet.test.ts` (asserção legada de CPF `11111111111` antes da validação de Módulo 11) e `reserveNfeNumberEndpoint.test.ts` (papel `seller` em vez de `manager` após restrição de `FISCAL_OPERATOR_ROLES`) estavam dessincronizadas com as regras vigentes.

**Causa raiz técnica comprovada:**
1. Emissões anteriores de estorno/devolução em HML incrementaram apenas `nfe_sequences` (`112 -> 130`), enquanto a atualização da RPC `peek_nfe_outbound_number` passou a considerar `MAX(numero_nfe)` em `nfe_documents` (`701`) sem atualizar retroativamente os contadores de `(55, '1', 2)` em `nfe_sequences` e `nfe_establishment_sequences`.
2. Reorganização de diretórios do monorepo (`erp/tsconfig.json`) e endurecimento das validações matemáticas de CPF/CNPJ (Módulo 11) e papéis de operadores fiscais (`['manager', 'administrator']`).

**Lista exata dos arquivos, linhas e registros modificados:**
- **Banco de Dados (`hkoxhourxwlddgsfdgws`)**:
  - Sincronização do high-water mark de Homologação modelo `55` série `'1'` (`ambiente = 2`) em `public.nfe_sequences` (`ultimo_numero = 701`) e `public.nfe_establishment_sequences` (`last_number = 701`). Todos os 4 escopos ativos da série `'1'` estão 100% alinhados entre `nfe_sequences`, `nfe_establishment_sequences` e `peek_nfe_outbound_number`:
    - `(55, '1', 1)` Produção: `ultimo_numero = 101`, `last_number = 101`, próximo `102`.
    - `(65, '1', 1)` Produção: `ultimo_numero = 599`, `last_number = 599`, próximo `600`.
    - `(55, '1', 2)` Homologação: `ultimo_numero = 701`, `last_number = 701`, próximo `702`.
    - `(65, '1', 2)` Homologação: `ultimo_numero = 644`, `last_number = 644`, próximo `645`.
- **Backend / API Fiscal**:
  - [`api/tsconfig.nfe.json`](../../api/tsconfig.nfe.json#L1-L10): correção de `extends` para `../erp/tsconfig.json`, `baseUrl: "../erp"` e `types: ["node"]`.
  - [`api/nfe/emit.ts`](../../api/nfe/emit.ts#L117-L121) e linhas `338-342`: preservação da inferência de `createClient<FiscalDatabase>` ao informar `{ db: { retry: false } }`.
  - [`api/nfe/consult.ts`](../../api/nfe/consult.ts#L32-L36): tipagem explícita das opções de `createClient`.
  - [`api/nfe/fiscalSnapshot.ts`](../../api/nfe/fiscalSnapshot.ts#L408-L418): bloqueio imediato de `environment === 1 && orderId.startsWith('TEST_AUT_')` em `parseFiscalEmissionCommand` (`FISCAL-002`).
- **Frontend / Modal Fiscal e Testes**:
  - [`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts`](../../erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts#L146-L152): uso de `validated.orderId` dentro do callback `onValid` de `purposeForm.validateAndRun`.
  - [`erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts`](../../erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts#L419-L435): alinhamento da asserção de rejeição de CPF com dígitos repetidos (`11111111111`) à validação Módulo 11.
  - [`erp/src/pages/utils/nfe/__tests__/reserveNfeNumberEndpoint.test.ts`](../../erp/src/pages/utils/nfe/__tests__/reserveNfeNumberEndpoint.test.ts#L4-L9) e linhas `37, 114`: mock direto de `@supabase/supabase-js` e uso do papel autorizado `'manager'`.
  - [`erp/src/pages/utils/nfe/__tests__/fiscalXmlAudit.test.ts`](../../erp/src/pages/utils/nfe/__tests__/fiscalXmlAudit.test.ts#L31-L60) e linhas `167, 233, 290`: substituição do CNPJ sintético por `12345678000195` (DV Módulo 11 válido).

**Validações e testes executados:**
- **Typecheck Fiscal Frontend (`npx --prefix erp tsc --noEmit -p erp/tsconfig.fiscal.json`)**: aprovado com **0 erros**.
- **Typecheck Fiscal Backend (`npx --prefix erp tsc --noEmit -p api/tsconfig.nfe.json`)**: aprovado com **0 erros**.
- **Suíte Completa de Testes Fiscais e Ações de Pedido (`npx vitest run src/pages/utils/nfe src/pages/App/SalesOrder/OrderActions`)**: **95/95 arquivos de teste aprovados (1.011/1.011 testes passando)**.
- **Gate de Startup, Bundle Fiscal, Limite Vercel e XSD/WASM (`npm --prefix erp run test:fiscal-startup`)**: aprovado (**15 handlers fiscais empacotados, 12/12 Vercel API functions, WASM carregado e schema XSD oficial `PL_010f_v1.04` resolvido**).
- **Auditoria do Estado Remoto (`hkoxhourxwlddgsfdgws`)**: `0` tentativas não-terminais em `nfe_outbound_attempts`; configuração do emitente (`44512248000107`, IE `9090300704`, CRT `1`, UF `PR`, `companyCMun = 4101408`) e decisão `fiscal_decision_simples_normal_sale_v1` (`models: ["55", "65"]`, PIS/COFINS CST `99` / zero) íntegras; `idle_in_transaction_session_timeout <= 60s` preservado; política de Zero CC-e (`FISCAL-016`) integralmente respeitada.

## Refatoração Arquitetural e Modularização Limpa — ERP, Mobile e Catálogo Digital

**Problemas identificados e motivação:**
Diversos componentes críticos e modais centrais no ERP, Mobile e Catálogo Digital haviam acumulado múltiplas responsabilidades (God Components > 500 a 900 linhas), misturando:
1. Chamadas diretas a APIs externas e queries complexas de dados.
2. Manipulação e normalização de strings, URLs, slugs e cálculos matemáticos tributários/de frete inline no JSX.
3. Centenas de linhas de `StyleSheet.create` ou regras de layout intercaladas com lógica de negócio.
4. Falta de isolamento de hooks e submódulos testáveis de forma independente.

**Soluções implementadas:**
Aplicação estrita dos princípios Clean Code, Single Responsibility Principle (SRP) e Separation of Concerns:

1. **Catálogo Digital — `product-grid.tsx` (~827 linhas → ~220 linhas)**:
   - `digital-catalog/src/features/products/utils/productSearchSynonyms.ts`: utilitário puro com sinônimos de mobília, normalização fonética e matching de ambientes.
   - `digital-catalog/src/features/products/hooks/useCatalogProductsQuery.ts`: hook com React Query, fallback de compatibilidade de schema RPC e sincronização em tempo real via BroadcastChannel.
   - `digital-catalog/src/features/products/hooks/useCatalogProductsFiltering.ts`: hook de filtragem secundária client-side (preço, salvos, categorias e ambientes).
   - `digital-catalog/src/features/products/components/ProductGridPagination.tsx`: paginação numérica desacoplada.
   - `digital-catalog/src/features/products/components/ProductGridEmptyState.tsx`: estados vazios para perfil administrador e clientes.

2. **Catálogo Digital — `categories-manager-modal.tsx` (~560 linhas → ~125 linhas)**:
   - `digital-catalog/src/features/categories/types/categoryManager.types.ts`: contratos de domínio para categorias, vínculos e formulário.
   - `digital-catalog/src/features/categories/utils/slugUtils.ts`: função pura `generateSlug`.
   - `digital-catalog/src/features/categories/hooks/useCategoriesManager.ts`: isolamento de toda a sincronização com Supabase, concorrência (`querySequence`, `uncertain`, `context.generation`), `withTimeout` e submissões com `useZodForm(categoryEnvironmentFormSchema)` e `useZodForm(catalogSelectionFormSchema)`.
   - `digital-catalog/src/features/categories/components/CategoryListTable.tsx`: componente apresentacional de listagem de categorias e ambientes.
   - `digital-catalog/src/features/categories/components/CategoryEditDialog.tsx`: diálogo secundário para criação e edição de itens com auto-slug e amarração de vínculos.

3. **App Mobile — `MobileProductCard.tsx` (~899 linhas → ~280 linhas)**:
   - `mobile/src/features/products/domain/mobileProductCardDisplay.ts`: funções puras de exibição (`normalizeVariationNamePart`, `getTechnicalColor`, `getVariationAttributeValues`, `getSingleVariationDisplayName`).
   - `mobile/src/features/products/components/MobileProductCard.styles.ts`: extração completa de mais de 270 linhas de `StyleSheet`.
   - `mobile/src/features/products/hooks/useMobileProductCardState.ts`: hook encapsulando cálculo de status do produto, faixa de preços, estoque consolidado e detecção de variação única.

4. **App Mobile — `ProductsHeader.tsx` (~698 linhas → ~160 linhas)**:
   - `mobile/src/features/products/components/header/ProductsHeader.styles.ts`: estilos dedicados.
   - `mobile/src/features/products/components/header/ProductsHeaderModeSelector.tsx`: seletor de modos (produtos padrão, composições e categorias).
   - `mobile/src/features/products/components/header/ProductsHeaderMenuDropdown.tsx`: modal de dropdown contextual com 3 pontos.
   - `mobile/src/features/products/components/header/ProductsHeaderFiltersSheet.tsx`: bottom sheet de filtros avançados.

5. **App Mobile — `UnavailabilityFormModal.tsx` (~554 linhas → ~170 linhas)**:
   - `mobile/src/features/stock/unavailabilities/modals/UnavailabilityFormModal.styles.ts`: 245 linhas de estilos isoladas.
   - `mobile/src/features/stock/unavailabilities/components/UnavailabilityProductPicker.tsx`: seletor de produto com autocomplete e lista de sugestões.

6. **App Mobile — `SupplierFormModal.tsx` (~513 linhas → ~200 linhas)**:
   - `mobile/src/features/stock/suppliers/types/supplierForm.types.ts`: tipagem de fornecedor e endereços.
   - `mobile/src/features/stock/suppliers/domain/supplierFormDomain.ts`: formatadores puros de documentos (CPF/CNPJ) e telefone.
   - `mobile/src/features/stock/suppliers/hooks/useSupplierForm.ts`: hook de controle do formulário com validação via `createPersonFormSchema('suppliers')` no callback de `validateAndRun`.
   - `mobile/src/features/stock/suppliers/SupplierFormModal.styles.ts`: folha de estilos dedicada.

7. **ERP — `PurchaseFormModal.tsx` (~617 linhas → ~180 linhas)**:
   - `erp/src/pages/App/Stock/Purchases/utils/purchaseCalculationUtils.ts`: função pura `calculatePurchaseCosts` aplicando cálculo dinâmico de IPI e Frete.
   - `erp/src/pages/App/Stock/Purchases/hooks/usePurchaseAttachmentUpload.ts`: hook com `purchaseAttachmentUploadFormSchema`, compressão de imagens via web worker e upload no Supabase Storage.
   - `erp/src/pages/App/Stock/Purchases/hooks/usePurchaseModalForm.ts`: hook gerenciando inscrições ativas (`subscribeToPeople`, `subscribeToProducts`), adição/edição de itens, fila de auto-salvamento de rascunhos (`purchaseDraftFormSchema`) e confirmação do pedido (`purchaseFormSchema`).

**Validações e Testes Executados:**
- **Formulários Catálogo (`npm run test:unit:catalog-forms --prefix erp`)**: 53/53 testes passando.
- **Formulários Mobile (`npm run test:unit:mobile-forms --prefix erp`)**: 47/47 testes passando.
- **Suíte Completa Mobile (`npm run test:unit:mobile --prefix erp`)**: 339/339 testes em 64 suítes passando.
- **Testes de Compras ERP (`npx vitest run src/pages/App/Stock/Purchases`)**: 29/29 testes passando, incluindo `PurchaseFormModal.test.tsx` (3/3).
- **Build de Produção do Catálogo Digital (`npm run build --prefix digital-catalog`)**: Compilação Turbopack com sucesso (código 0).
- **Invariantes Arquiteturais**: 100% preservados (Zero CC-e, React Hook Form + zodResolver real e isolamento transacional).

## Refatoração de Módulos Fiscais — Princípios de Engenharia de Software (Clean Code, DRY, SRP, SSOT)

**Problemas identificados e motivação técnica:**
Quatro arquivos centrais do fluxo de emissão fiscal apresentavam alta densidade de linhas e acoplamento de múltiplas responsabilidades (validação interestadual, resolução de destinatário, auditoria XML de rascunhos, concorrência/reconciliação SEFAZ, backfill de snapshots e prévia de numeração):
1. `api/nfe/normalSaleRuleSet.ts` (~529 linhas): acumulava validação de rotas interestaduais, CSOSN/CFOP aprovados, normalização de dados cadastrais do destinatário, cálculo de código IBGE de municípios e montagem da regra tributária.
2. `api/nfe/transmit-operation-draft.ts` (~1.169 linhas): combinava parsing de requisição, pré-condições fiscais de rascunhos de estorno e devolução, validação estrutural e integridade de XML assinado contra revisão fiscal, chamadas SOAP à SEFAZ, persistência autorizada e reconciliação assíncrona.
3. `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeSequencePreview.ts` (~173 linhas): misturava efeitos de consulta de numeração com cálculos puros de escopo, resolução de cache e prévia de numeração.
4. `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts` (~665 linhas): continha lógica de serialização de hash de contexto de prévia XML, backfill assíncrono de snapshots legados do pedido (`backfillLegacyOrderItemSnapshots`) e mapeamento de falhas técnicas diretamente no corpo do hook.

**Soluções arquiteturais implementadas:**
1. **Decomposição de `api/nfe/normalSaleRuleSet.ts` (~529 linhas → ~260 linhas)**:
   - `api/nfe/normal-sale/interstateValidation.ts`: isolamento de `resolveInterstateFinalConsumer` e `validateInterstateNormalSaleMatrix` (validação de rota interestadual aprovada, conferência de CFOP de serviço não aplicável e tratamentos CSOSN).
   - `api/nfe/normal-sale/recipientScope.ts`: isolamento de `resolveNormalSaleCustomer`, `resolveRecipientIeContext`, `resolveNormalSaleRecipientAddress` e `validateNormalSaleRecipientRequirements`.
2. **Decomposição de `api/nfe/transmit-operation-draft.ts` (~1.169 linhas → ~460 linhas)**:
   - `api/nfe/operation-draft/draftXmlAudit.ts`: funções puras `brazilTimestamp`, `readTag`, `extractXmlBlock`, `asFiscalSettings`, `getPersistableItems` e `assertDraftXmlMatchesReview`.
   - `api/nfe/operation-draft/draftValidation.ts`: validações de pré-condições do rascunho (`validateDraftPreconditions`), do documento de saída de origem (`validateSourceDocument`), pré-condições de estorno (`validateEstornoPreconditions`) e conferência de itens do estorno (`validateEstornoItems`).
   - `api/nfe/operation-draft/draftPersistence.ts`: isolamento das rotinas `consultDraftKey`, `persistDraftAuthorized` e `reconcileStoredDraftAttempt`.
3. **Decomposição de `useNfeSequencePreview.ts` (~173 linhas → ~110 linhas)**:
   - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/nfeSequencePreviewHelpers.ts`: funções puras `resolveInitialPreviewState`, `resolveInitialSequenceSettings` e `computeDerivedSequencePreview`.
4. **Decomposição de `useNfeEmissionActions.ts` (~665 linhas → ~450 linhas)**:
   - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeSnapshotBackfillService.ts`: extração de `backfillLegacyOrderItemSnapshots`.
   - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfePreviewContextService.ts`: extração de `createPreviewContextKey`, `notifyEmissionIssue` e `buildFailedEmissionResult`.

**Validação e Não-Regressão:**
- **95 suítes de teste (1.011 testes) passaram com 100% de sucesso** em `npx vitest run src/pages/utils/nfe src/pages/App/SalesOrder/OrderActions`.
- **`npm run test:fiscal-startup`** aprovado (15 handlers empacotados pelo esbuild, limite Vercel mantido em 12/12, WASM carregado e schema XSD oficial validado).
- **TypeScript**: `npx tsc -p api/tsconfig.nfe.json --noEmit` e `npx tsc -p erp/tsconfig.fiscal.json --noEmit` com 0 erros.
- **Invariantes fiscais preservados**: Zero CC-e (`FISCAL-016`), numeração atômica com reserva via PostgreSQL, isolamento estrito de ambientes e obrigatoriedade de formulários RHF com zodResolver.


