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

## Reconciliação Integral de Homologação e Provas Comportamentais Transacionais no PostgreSQL (pgTAP)

**Problemas identificados e sintomas observados:**
1. **Três documentos NFC-e modelo 65 históricos em estado `pendente` em Homologação (`ambiente = 2`)**:
   - Na tabela `public.nfe_documents` (`hkoxhourxwlddgsfdgws`), restavam 3 registros históricos de NFC-e modelo `65` série `'1'` em `status = 'pendente'`:
     - `3707d4f2-27e9-4bfe-9c6c-3216e2f5b189` (`numero_nfe = 616`, pedido `b4a0d6e8-9c1f-45f5-a39c-4b47bc25066b`, `HML_NORMAL_SALE_V2`, de `05/10/2026`), interrompido na fase TLS antes da inclusão do bundle ICP-Brasil.
     - `235ff0f8-4708-4dd0-9080-c1a991b364d3` (`numero_nfe = 618`, pedido `baa795c2-874e-4edb-8717-e8319bce3638`, `HML_NORMAL_SALE_V2`, de `05/10/2026`), interrompido na fase TLS antes da inclusão do bundle ICP-Brasil.
     - `dd6edbe0-cb10-45d6-9770-354b0579328c` (`numero_nfe = 637`, pedido `TEST_AUT_5c1925ae-435b-4fbe-a5cf-42a92a8de37c`, `HML_TECHNICAL_V1`, de `09/10/2026`), sem protocolo registrado.
2. **Provas comportamentais transacionais pendentes no PostgreSQL remoto (`hkoxhourxwlddgsfdgws`)**:
   - Na revisão de `13/10/2026` (`docs/fiscal/revisao-fluxos-saida-2026-10-13.md`), as RPCs atômicas de cancelamento fiscal (`reserve_nfe_cancellation_event`, `persist_nfe_cancellation_result`), reconciliação de consulta legada (`persist_nfe_legacy_consultation`) e persistência atômica de rascunhos de estorno/devolução (`persist_authorized_nfe_operation_draft`) possuíam 12 testes pgTAP de catálogo/ACL aprovados, mas aguardavam bateria comportamental transacional (`BEGIN ... ROLLBACK`) no PostgreSQL real com fixtures sintéticas.

**Solução técnica e validações executadas:**
1. **Consulta somente leitura à SEFAZ-PR (`NFeConsultaProtocolo4`) e reconciliação técnica sem retransmissão (`allowRetransmission = false`)**:
   - Seguindo estritamente `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md` (linha 19), foi executada a reconciliação oficial via `retryHmlTechnical(supabase, documentId, false)` (`api/nfe/emitHmlTechnical.ts`) para os 3 documentos pendentes (`616`, `618`, `637`).
   - A SEFAZ-PR Homologação (`tpAmb = 2`) respondeu `cStat = 217` (*NF-e não consta na base de dados da SEFAZ*) para os 3 documentos, e a RPC `persist_hml_nfe_result` transicionou os 3 registros de `pendente` para `erro` (`code = 'HML_NEW_EMISSION_REQUIRED'`, `pending = false`), preservando numeração, XML original e histórico.
   - **Estado consolidado de `public.nfe_documents`, `public.nfe_outbound_attempts` e `public.nfe_document_events` em Homologação (`ambiente = 2`)**:
     - `outbound` modelo `55`: `9 homologada`, `1 cancelada`, `2 erro`, **`0 pendente`**, **`0 processando`**.
     - `outbound` modelo `65`: `17 homologada`, `2 cancelada`, `24 erro`, **`0 pendente`**, **`0 processando`**.
     - `return` modelo `55`: `5 homologada`, `2 cancelada`, **`0 pendente`**, **`0 processando`**.
     - `nfe_outbound_attempts` (`environment = 2`): `8 authorized`, `1 rejected`, **`0 prepared`**, **`0 transmitting`**, **`0 reconciling`**.
     - `nfe_document_events` (`environment = 2`): `5 registered`, `1 rejected`, **`0 transmitting`**, **`0 unknown`**.
   - **Invariância comercial, de estoque e financeira**: conferido antes e depois da reconciliação que `orders.updated_at`, `order_data->>'status'`, `inventory_moves` (`0`) e `order_payments` (`1`, `1`, `0`) dos 3 pedidos permaneceram 100% inalterados.
2. **Execução de 48 assertivas comportamentais pgTAP em PostgreSQL real (`hkoxhourxwlddgsfdgws`) sob `BEGIN ... ROLLBACK`**:
   - **Suíte 1 (`1..17` — `17/17 ok`) — Cancelamento Fiscal Atômico, Consulta Legada e Persistência de Estorno/Devolução Fiscal**:
     1. `reserve_nfe_cancellation_event` rejeita justificativa com menos de 15 caracteres (`23514 / CANCELLATION_DOCUMENT_INVALID`).
     2. `reserve_nfe_cancellation_event` cria tentativa `#1` com `status = 'transmitting'` para NF-e `homologada` elegível.
     3. `reserve_nfe_cancellation_event` bloqueia tentativa concorrente duplicada enquanto `transmitting` (`40001 / CANCELLATION_ATTEMPT_CHANGED`).
     4. `persist_nfe_cancellation_result` bloqueia encerramento prematuro por consulta (`cStat = 100`) antes do piso de 30 segundos (`40001 / CANCELLATION_CONSULTATION_TOO_EARLY`).
     5. `persist_nfe_cancellation_result` rejeita XML da SEFAZ com `<chNFe>` divergente do documento (`23514 / CANCELLATION_RESPONSE_MISMATCH`).
     6. `persist_nfe_cancellation_result` atualiza atomicamente `nfe_documents.status = 'cancelada'` e `nfe_document_events.status = 'registered'` na mesma transação (`cStat = 135`).
     7. `persist_nfe_cancellation_result` garante replay idempotente (`{"idempotent": true}`) ao receber novamente o mesmo protocolo confirmado.
     8. `persist_nfe_cancellation_result` bloqueia regressão/downgrade de cancelamento já `registered` (`23514 / REGISTERED_CANCELLATION_IMMUTABLE`).
     9. `persist_nfe_legacy_consultation` bloqueia documentos de rulesets modernos (`NORMAL_SALE_V1`, `HML_NORMAL_SALE_V2`, etc.) (`23514 / LEGACY_CONSULT_DOCUMENT_MISMATCH`).
     10. `persist_nfe_legacy_consultation` promove atomicamente documento legado `pendente` para `homologada` (`cStat = 100`) e encerra tentativa de cancelamento `unknown` (> 30s) como `rejected`.
     11. `persist_authorized_nfe_operation_draft` rejeita XML de item adulterado em relação a `reviewed_product_xml` (`P0001`).
     12. `persist_authorized_nfe_operation_draft` persiste atomicamente NF-e de estorno fiscal (`document_type = 'estorno'`, `finalidade = 3`, `status = 'homologada'`), `nfe_document_items` e `nfe_operation_drafts.status = 'authorized'`.
     13. `persist_authorized_nfe_operation_draft` retorna o mesmo `document_id` em replay idempotente.
     14. `persist_authorized_nfe_operation_draft` bloqueia replay conflitante com outro `document_id` (`P0001`).
     15. `persist_authorized_nfe_operation_draft` persiste atomicamente NF-e de devolução fiscal (`document_type = 'return'`, `finalidade = 4`) e vincula `nfe_return_item_allocations.fiscal_return_document_id`.
     16. `uq_nfe_estorno_draft_source` bloqueia segundo rascunho de estorno para o mesmo `(original_document_id, environment)` (`23505`).
     17. Trigger `enforce_nfe_draft_authorized_attempt_match` bloqueia transição para `authorized` se `access_key` divergir da tentativa em transmissão (`P0001`).
   - **Suíte 2 (`1..12` — `12/12 ok`) — Ciclo Transacional de Emissão Outbound e Imutabilidade Fiscal**:
     1. Trigger `attach_nfe_fiscal_snapshot_to_outbound` bloqueia `nfe_documents` `outbound` sem `emission_request_id` (`23514 / MISSING_FISCAL_SNAPSHOT`).
     2. Trigger `attach_nfe_fiscal_snapshot_to_outbound` bloqueia `nfe_documents` `outbound` com `numero_nfe` divergente do snapshot reservado (`23514 / FISCAL_SNAPSHOT_MISMATCH`).
     3. `start_nfe_outbound_transmission` bloqueia `attempt_token` inválido (`23514 / FISCAL_ATTEMPT_STATE_CHANGED`).
     4. `start_nfe_outbound_transmission` transiciona `nfe_outbound_attempts.state` de `prepared` para `transmitting`.
     5. `persist_nfe_outbound_result` bloqueia `confirmed_not_found` quando o XML de consulta não comprova `cStat = 217` (`23514 / FISCAL_NOT_FOUND_UNVERIFIED`).
     6. `persist_nfe_outbound_result` transiciona para `confirmed_not_found` e `nfe_documents.status = 'erro'` quando `cStat = 217` é comprovado.
     7. `start_nfe_outbound_transmission` permite reentrada em `transmitting` a partir de `confirmed_not_found`.
     8. `persist_nfe_outbound_result` bloqueia `authorized` quando `<infProt><chNFe>` diverge da chave da tentativa (`23514 / FISCAL_PROTOCOL_MISMATCH`).
     9. `persist_nfe_outbound_result` grava atomicamente `nfe_documents` (`homologada`), `nfe_outbound_attempts` (`authorized`) e `nfe_document_items`.
     10. `persist_nfe_outbound_result` bloqueia downgrade de tentativa `authorized` para `rejected` (`23514 / AUTHORIZED_FISCAL_IMMUTABLE`).
     11. Trigger `guard_normal_outbound_identity` bloqueia `DELETE` em documento `NORMAL_SALE_V1` (`23514 / FISCAL_HISTORY_IMMUTABLE`).
     12. Trigger `guard_normal_outbound_items` bloqueia `DELETE` em itens de documento `NORMAL_SALE_V1` homologado (`23514 / FISCAL_HISTORY_IMMUTABLE`).
   - **Suíte 3 (`1..7` — `7/7 ok`) — Reserva Atômica de Sequência e Fronteira de Preparação Outbound**:
     1. `reserve_nfe_outbound_number` reserva atomicamente o número inicial `1` para CNPJ sintético isolado.
     2. `reserve_nfe_outbound_number` bloqueia `expected_number` defasado com `23514 / FISCAL_SEQUENCE_CHANGED`.
     3. `reserve_nfe_outbound_number` avança atomicamente para `2`.
     4. `prepare_nfe_outbound_attempt` bloqueia pedido `TEST_AUT_*` em Produção (`environment = 1`) (`22023 / INVALID_OUTBOUND_PREPARATION`).
     5. `prepare_nfe_outbound_attempt` bloqueia divergência entre `p_request_command` e `p_snapshot->'emissionRequest'` (`23514 / FISCAL_COMMAND_SNAPSHOT_MISMATCH`).
     6. `prepare_nfe_outbound_attempt` bloqueia pedido em rascunho (`draft`) (`23514 / ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL`).
     7. `prepare_nfe_outbound_attempt` bloqueia snapshot com `order.version` desatualizado (`40001 / FISCAL_SOURCE_CHANGED`).
   - **Suíte 4 (`1..12` — `12/12 ok`) — Controle de Versão na Edição de Pedido, Capacidade Fiscal de Devolução, Revisão de Rascunho e Elegibilidade de Estorno**:
     1. `update_order_with_inventory_transaction_if_version` atualiza pedido com sucesso quando `p_expected_updated_at` coincide (`T01_UPDATE_ORDER_IF_VERSION_MATCH`).
     2. `update_order_with_inventory_transaction_if_version` bloqueia atualização concorrente com `p_expected_updated_at` defasado (`40001 / ORDER_VERSION_CONFLICT`, `T02_UPDATE_ORDER_IF_VERSION_CONFLICT`).
     3. Trigger `guard_order_fiscal_edit` bloqueia alteração da projeção fiscal de pedido que possui NF-e `homologada` sem confirmação fiscal (`P0001 / FISCAL_ORDER_EDIT_CONFIRMATION_REQUIRED`, `T03_GUARD_ORDER_FISCAL_EDIT_CONFIRMATION_REQUIRED`).
     4. `create_return_order_with_fiscal_capacity` cria devolução comercial parcial (`1` de `2` unidades) e grava alocação em `public.nfe_return_item_allocations` (`T04_CREATE_PARTIAL_RETURN_1_OF_2`).
     5. `create_return_order_with_fiscal_capacity` garante replay idempotente (`idempotent_replay = true`) ao repetir a mesma requisição (`T05_CREATE_RETURN_IDEMPOTENT_REPLAY`).
     6. `create_return_order_with_fiscal_capacity` bloqueia devolução que excede o saldo faturado disponível (`Quantidade acima do saldo faturado: faturado 2.0000, já reservada 1.0000, solicitada 2`, `T06_CREATE_RETURN_OVERFLOW_BLOCKED`).
     7. `prepare_nfe_operation_draft('return', ...)` cria rascunho de devolução fiscal (`status = 'draft'`, `finalidade = 4`) e vincula `nfe_operation_draft_lines` e `nfe_operation_draft_allocations` (`T07_PREPARE_DRAFT_RETURN`).
     8. `save_nfe_operation_draft_review` valida CFOP de entrada (`1202`), `<qCom>` e blocos XML e transiciona o rascunho para `status = 'ready'` (`T08_SAVE_DRAFT_REVIEW_READY`).
     9. Trigger `prevent_cancelling_fulfilled_order` bloqueia cancelamento comercial de pedido já atendido (`23514 / A mercadoria já circulou; registre uma devolução.`, `T09_PREVENT_CANCELLING_FULFILLED_ORDER`).
     10. `prepare_nfe_operation_draft('estorno', ...)` bloqueia estorno quando a venda comercial não está cancelada (`Venda comercial precisa estar cancelada antes de preparar estorno`, `T10_ESTORNO_REQUIRES_CANCELLED_SALE`).
     11. `prepare_nfe_operation_draft('estorno', ...)` bloqueia estorno quando há evidência de circulação da mercadoria (`Venda com evidência de circulação não é elegível a estorno; verifique devolução ou retorno`, `T11_ESTORNO_BLOCKED_BY_CIRCULATION`).
     12. `prepare_nfe_operation_draft('estorno', ...)` cria rascunho de estorno (`finalidade = 3`) para venda cancelada sem circulação e retorna o mesmo `draft_id` em chamadas idempotentes (`T12_ESTORNO_DRAFT_CREATED_AND_IDEMPOTENT`).
   - **Verificação pós-rollback**: `residual_people = 0`, `residual_orders = 0`, `residual_docs = 0`, `residual_drafts = 0`, `leftover_seqs = 0` confirmados em `hkoxhourxwlddgsfdgws`.
3. **Validação XSD Oficial (`PL_010f_v1.04` e `Evento_NT2026.004`) de 15 Documentos e Eventos Reais de Homologação (`hkoxhourxwlddgsfdgws`)**:
   - **5/5 Documentos Outbound HML (`nfe_v4.00.xsd`)**: `#111` (`55`, `HML_NORMAL_SALE_V1`, protocolo `141260000606080`), `#115` (`55`, `HML_TECHNICAL_V1`, protocolo `141260000620376`), `#127` (`55`, `HML_TECHNICAL_V1`, protocolo `141260000620439`), `#629` (`65`, `HML_NORMAL_SALE_V2`, protocolo `141260001723540`) e `#644` (`65`, `NORMAL_SALE_V1`, protocolo `141260001742457`) — todos `xsdValid = true`.
   - **5/5 NF-e 55 de Devolução Fiscal HML (`nfe_v4.00.xsd`)**: `#121` (protocolo `141260000620388`), `#122` (protocolo `141260000620389`), `#124` (protocolo `141260000620391`), `#129` (protocolo `141260000620442`) e `#130` (protocolo `141260000620443`) — todos `xsdValid = true`.
   - **5/5 Eventos de Cancelamento (`110111`, `cStat = 135`) Registrados em HML (`envEvento_v1.00.xsd` + `e110111_v1.00.xsd`)**: NF-e 55 `#114` (protocolo `141260000620325`), `#126` (protocolo `141260000620437`), `#128` (protocolo `141260000620441`) e NFC-e 65 `#632` (`NORMAL_SALE_V1`, protocolo `141260001726170`), `#640` (`HML_TECHNICAL_V1`, protocolo `141260001728423`) — todos `xsdValid = true`.

### Matriz de Evidências (`SUPABASE_REMOTE_TEST_POLICY.md`)

| Teste | Executado | Projeto/ref (sem credenciais) | Massa sintética/runId | Resultado | Limitação/evidência pendente |
|---|---|---|---|---|---|
| Reconciliação somente leitura (`NFeConsultaProtocolo4`, `allowRetransmission=false`) dos 3 documentos NFC-e 65 `pendente` em HML (`#616`, `#618`, `#637`) | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` + SEFAZ-PR HML (`tpAmb=2`) | Documentos HML existentes `3707d4f2-27e9-4bfe-9c6c-3216e2f5b189`, `235ff0f8-4708-4dd0-9080-c1a991b364d3`, `dd6edbe0-cb10-45d6-9770-354b0579328c` | **Aprovado**: SEFAZ-PR retornou `cStat=217`; todos os 3 reconciliados para `erro` (`pending=false`); `0 pendente` em HML; zero efeitos em pedidos, estoque ou pagamentos | Comprova reconciliação backend/SEFAZ/banco; novas emissões continuam exclusivas pela UI do ERP |
| Suíte pgTAP 1: Cancelamento fiscal atômico, consulta legada e persistência de estorno/devolução (`reserve_nfe_cancellation_event`, `persist_nfe_cancellation_result`, `persist_nfe_legacy_consultation`, `persist_authorized_nfe_operation_draft`) | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` (PostgreSQL 17) | Fixtures sintéticas `TEST_PGTAP_*` isoladas em transação `BEGIN ... ROLLBACK` (`0` linhas retidas) | **17/17 aprovados (`1..17 ok`)** | Execução em transação única com rollback; não substitui transmissão SOAP pela UI |
| Suíte pgTAP 2: Ciclo transacional outbound e imutabilidade (`attach_nfe_fiscal_snapshot_to_outbound`, `start_nfe_outbound_transmission`, `persist_nfe_outbound_result`, `guard_normal_outbound_*`) | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` (PostgreSQL 17) | Fixtures sintéticas `TEST_PGTAP_OUT_*` isoladas em transação `BEGIN ... ROLLBACK` (`0` linhas retidas) | **12/12 aprovados (`1..12 ok`)** | Execução em transação única com rollback |
| Suíte pgTAP 3: Reserva atômica de numeração e fronteira `prepare_nfe_outbound_attempt` | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` (PostgreSQL 17) | Emissor sintético `99999999000191` e pedidos `TEST_PGTAP_*` em `BEGIN ... ROLLBACK` (`0` linhas retidas) | **7/7 aprovados (`1..7 ok`)** | Execução em transação única com rollback |
| Suíte pgTAP 4: Controle de versão (`update_order_with_inventory_transaction_if_version`), guarda fiscal (`guard_order_fiscal_edit`), capacidade de devolução (`create_return_order_with_fiscal_capacity`), preparação/revisão de rascunho (`prepare_nfe_operation_draft`, `save_nfe_operation_draft_review`) e bloqueio pós-circulação (`prevent_cancelling_fulfilled_order`) | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` (PostgreSQL 17) | `runId = 88888888-4444-4444-8444-222222222222`, pedidos `TEST_AUT_88888888-*` em `BEGIN ... ROLLBACK` (`0` linhas retidas) | **12/12 aprovados (`T01..T12 ok`)** | Execução em transação única com rollback |
| Validação XSD oficial (`PL_010f_v1.04` e `Evento_NT2026.004`) de 15 documentos/eventos reais de Homologação (`5` outbound 55/65, `5` devoluções 55, `5` cancelamentos `110111` 55/65) | Sim (`17/10/2026`) | `hkoxhourxwlddgsfdgws` / `public` + `libxml2-wasm` local | Documentos HML `#111`, `#115`, `#127`, `#629`, `#644`; devoluções `#121`, `#122`, `#124`, `#129`, `#130`; eventos `#114`, `#126`, `#128`, `#632`, `#640` | **15/15 aprovados (`xsdValid = true`)** | Valida XMLs assinados persistidos contra schemas oficiais |
| Typecheck Fiscal (`api/tsconfig.nfe.json` e `erp/tsconfig.fiscal.json`), Startup Fiscal (`test:fiscal-startup`) e Suíte Vitest Fiscal (`95` arquivos) | Sim (`17/10/2026`) | Local / Node `v22.18.0` | Fixtures unitárias/integração local | **0 erros TS, 12/12 Vercel functions, 15 handlers + XSD `PL_010f_v1.04`, 95/95 suítes (1.011/1.011 testes) aprovados** | Testes locais não substituem jornada visual E2E na UI |

## Refatoração de Arquitetura e Modularização de Componentes Monolíticos (Clean Code & SRP)

Em cumprimento às diretrizes de arquitetura limpa, Princípio da Responsabilidade Única (SRP) e organização modular de pastas, foram identificados e refatorados quatro componentes monolíticos de alta complexidade no ERP que acumulavam lógica de negócio, chamadas assíncronas, gerenciamento de estado e renderização de interface em arquivos únicos de 500 a 700+ linhas:

### 1. `SmartAIFillModal.tsx` (Preenchimento Assistido por IA e Transcrição de Voz)
- **Problema:** Componente de 613 linhas centralizando integração com Web Speech API, leitura assíncrona de arquivos com `FileReader`, formulários Zod (`textPromptFormSchema`, `assistedOrderFormSchema`), bounding de timeouts (45s IA, 30s aplicação, 10s arquivo, 15s fechamento), controle de contexto transacional e renderização das abas de IA e JSON manual.
- **Solução implementada:** Criada a pasta modular `erp/src/pages/App/SalesOrder/components/smart-ai-fill/`:
  - `types.ts`: Contratos e tipagens do preenchimento inteligente e resultados parciais.
  - `useSmartAIFillForm.ts`: Hook desacoplado com ciclo de vida de voz, máquina de estados com cancelamento, locking transacional e validações RHF.
  - `SmartAIFillHeader.tsx`: Cabeçalho com badge do modelo Gemini, alternador de abas e controle de fechamento.
  - `SmartAIFillAiVoiceTab.tsx`: Painel de gravação de áudio ao vivo, transcrição contínua, editor de prompt e feedback.
  - `SmartAIFillFeedback.tsx`: Grid de campos identificados, alertas de campos faltantes e botão de injeção no pedido.
  - `SmartAIFillManualJsonTab.tsx`: Aba de upload de arquivos JSON e área de texto para inserção manual.
  - `SmartAIFillModal.tsx`: Reduzido de 613 linhas para 109 linhas como coordenador declarativo.
- **Validação:** 21 testes aprovados (`SmartAIFillModal.test.tsx` [18/18] e `FormHeader.smartFill.test.tsx` [3/3]).

### 2. `ProductAiCharacteristicsModal.tsx` (Extração de Características e Ficha Técnica com IA)
- **Problema:** Modal de 709 linhas contendo regras de seleção e proteção de campos já preenchidos no ERP, dois formulários Zod distintos (pesquisa na web e texto descritivo), integração com `aiService`, busca de atributos técnicos e tabela de conferência de diferenças.
- **Solução implementada:** Criada a estrutura modular em `erp/src/pages/App/Products/modals/characteristicsAi/`:
  - `useProductAiCharacteristicsModal.ts`: Hook com regras de pré-requisitos, consultas à IA, quota e regras de proteção contra sobreposição de dados existentes.
  - `ProductAiModalHeader.tsx`: Cabeçalho com título responsivo e badge de modo.
  - `ProductAiModeTabs.tsx`: Seletor de abas (Modo 1: Pesquisa Web vs Modo 2: Texto Descritivo).
  - `ProductAiWebSearchForm.tsx`: Formulário do Modo 1 com card de pré-requisitos e campo de informações adicionais.
  - `ProductAiDescriptiveTextForm.tsx`: Formulário do Modo 2 com orientações e textarea para texto descritivo/catálogo.
  - `ProductAiReviewPhase.tsx`: Painel da fase de revisão com tabela diff unificada e aplicação seletiva.
  - `ProductAiCharacteristicsModal.tsx`: Reduzido de 709 linhas para 154 linhas.
- **Validação:** 5 testes aprovados (`ProductAiCharacteristicsModal.test.tsx` [5/5]).

### 3. `PersonImportModal.tsx` (Importação em Lote de Pessoas / Clientes / Fornecedores via CSV)
- **Problema:** Modal de 576 linhas acumulando parser próprio de CSV com suporte a aspas e múltiplos delimitadores, heurísticas de mapeamento de cabeçalhos, validação individual de linhas com schema de domínio, controle de timeout de I/O e processamento em lotes atômicos de 50 registros no Supabase.
- **Solução implementada:** Criada a pasta modular `erp/src/pages/App/Registrations/shared/modals/personImport/`:
  - `types.ts`: Tipos do modal, linhas de importação (`ImportRow`), estados de processamento e mapeamento vazio.
  - `csvParser.ts`: Funções utilitárias puras de parsing de CSV, normalização de booleanos e de origem de marketing.
  - `csvMappingHeuristics.ts`: Algoritmo de mapeamento heurístico inteligente de cabeçalhos por palavras-chave e lista de campos.
  - `usePersonImportModal.ts`: Hook orquestrador do ciclo de vida, sessões concorrentes, leitura segura com `withTimeout` e persistência em lotes com tratamento de estados incertos.
  - `PersonImportHeader.tsx`: Cabeçalho com alternador de encoding (UTF-8 e ANSI/ISO-8859-1).
  - `PersonImportUploadStep.tsx`: Zona de arrastar e soltar arquivo CSV com input oculto.
  - `PersonImportMappingStep.tsx`: Grade com seleção de colunas mapeadas e origem padrão para clientes.
  - `PersonImportPreviewStep.tsx`: Tabela de pré-visualização com status de validação por registro e checkboxes.
  - `PersonImportProgressBar.tsx`: Barra de progresso animada durante a importação.
  - `PersonImportFooter.tsx`: Rodapé com botões de voltar e finalizar importação com contagem dinâmica.
  - `PersonImportModal.tsx`: Reduzido de 576 linhas para 134 linhas.
- **Validação:** 16 testes aprovados (`PersonImportModal.test.tsx` [16/16]).

### 4. `ReturnOrderModal.tsx` (Ações Comerciais e Fiscais de Devolução de Pedido)
- **Problema:** Modal de 566 linhas reunindo busca de devoluções anteriores, localização de NF-e autorizada, consulta de capacidade fiscal faturada na API, conferência de saldos devolvíveis, montagem de pedido de devolução comercial, alocação de itens a notas fiscais e disparo de transmissão fiscal automática.
- **Solução implementada:** Criada a pasta modular `erp/src/pages/App/SalesOrder/OrderActions/return-order-modal/`:
  - `types.ts`: Tipos e interfaces de dados do modal e estado de capacidade fiscal.
  - `useReturnOrderData.ts`: Hook dedicado exclusivamente à busca de histórico de devoluções, NF-e autorizada e conferência de capacidade com timeout resiliente de 15s.
  - `useReturnOrderForm.ts`: Hook com formulário RHF/Zod (`createLinkedReturnFormSchema`), cálculos de valores originais e devolvidos, alocação fiscal e geração de pedido de devolução.
  - `ReturnOrderHeader.tsx`: Cabeçalho com ícone de devolução, código da venda e cliente.
  - `ReturnOrderNotice.tsx`: Banner contextual explicativo da separação entre retorno físico, estoque e NF-e de devolução.
  - `ReturnOrderFooter.tsx`: Rodapé com totais, contador de itens selecionados e botão protegido contra submissões prematuras.
  - `ReturnOrderModal.tsx`: Reduzido de 566 linhas para 134 linhas.
- **Validação:** 14 testes aprovados (`ReturnOrderModal.test.tsx` [14/14]).

### Invariantes Garantidos
- **Política Zero CC-e**: Nenhum fluxo de Carta de Correção Eletrônica foi criado ou alterado.
- **RHF + zodResolver**: Todas as operações de submissão e validação executam os resolvers reais antes dos serviços.
- **Não-regressão**: Todas as suítes de testes (`catalog-forms` [53/53], `mobile-forms` [47/47], `mobile` [339/339], `Purchases` [29/29] e componentes refatorados [56/56]) permaneceram 100% verdes. Build do catálogo digital aprovado com código 0.

---

## Refatoração e Arquitetura Limpa: `emitHmlTechnical.ts` e Módulo `hml-technical` — 17/10

### 1. Problema Identificado e Sintomas Observados
O arquivo [`api/nfe/emitHmlTechnical.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/emitHmlTechnical.ts) acumulava **1.558 linhas de código**, violando o Princípio da Responsabilidade Única (SRP) e a arquitetura limpa de pastas. O arquivo continha simultaneamente:
- Tratamento e classificação de erros de banco de dados e PostgREST de snapshots.
- Formatação de timestamps e expiração temporal de NFC-e.
- Consultas SEFAZ de documentos em andamento e documentos autorizados.
- Transmissão SOAP, envelopamento XML, assertivas de integridade e auditoria de linhas autorizadas.
- Lógica de reativação, retry e recuperação de fatos fiscais históricos de rascunhos/tentativas HML.
- Orquestração central de emissão técnica e venda normal em homologação (`tpAmb = 2`).

### 2. Causa Raiz Técnica
A evolução orgânica dos testes técnicos HML (modelos 55 e 65) concentrou rotinas utilitárias de serialização, consulta SOAP, classificação de erros da migration de reserva de snapshots e gestão de tentativas concorrentes em um único arquivo de backend.

### 3. Solução Técnica Implementada
Criação da pasta dedicada [`api/nfe/hml-technical/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/) e segregação das responsabilidades segundo os princípios de Clean Code, DRY, SRP e SSOT:

1. **[`types.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/types.ts) (~10 linhas):**
   - Tipos TypeScript desacoplados: `Database`, `Result` e `HmlDocumentRow`.
2. **[`constants.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/constants.ts) (~115 linhas):**
   - Constantes e mensagens de rejeição (`SNAPSHOT_REASON_MESSAGES`).
   - Resolução de endpoints de homologação (`hmlEndpoint`).
   - Verificação de ruleset (`isHmlRuleSet`) e conferência de chave de protocolo (`hasProtocolKey`).
   - Helpers de timezone (`saoPauloTimestamp`), controle de frescor temporal de NFC-e (`nfceXmlNeedsFreshEmission`) e erro de emissão expirada (`freshNfceEmissionRequired`).
   - Construtor padronizado de falhas estruturadas (`failure`).
3. **[`snapshotClassification.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/snapshotClassification.ts) (~125 linhas):**
   - Extração segura de códigos e check constraints (`snapshotReasonOf`).
   - Classificação taxonômica de erros de reserva atômica (`classifySnapshotReservationError`).
   - Consulta de metadata de tentativa ativa concorrente (`activeAttemptMetadata`).
4. **[`transmission.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/transmission.ts) (~155 linhas):**
   - Transmissão SOAP para `NFeAutorizacao4` (`transmitAndPersist`), auditoria de hash e snapshot antes do envio, conferência de protocolo e persistência via RPC `persist_hml_nfe_result`.
   - Liberação segura de lease de tentativa (`releaseAttempt`) sem mascarar resultados fiscais.
5. **[`consultation.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/consultation.ts) (~200 linhas):**
   - Consulta de protocolo e reconciliação atômica de documentos em andamento (`consultExisting`).
   - Consulta estritamente somente leitura de documentos autorizados (`consultAuthorizedHmlTechnical`) com validação de invariantes, certificado A1 e auditoria sem escrita.
6. **[`retryAndRecovery.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/retryAndRecovery.ts) (~260 linhas):**
   - Reexecução controlada de tentativas com validação de status e cStat (`retryHmlTechnical`).
   - Recuperação de fatos persistidos e proteção contra divergência de rascunhos (`recoverHmlTechnical`).
7. **[`index.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/hml-technical/index.ts):**
   - Re-exportação unificada de tipos, utilitários, classificações e funções de domínio.
8. **[`emitHmlTechnical.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/api/nfe/emitHmlTechnical.ts) (reduzido de 1.558 para ~360 linhas):**
   - Orquestrador limpo e legível do fluxo de emissão técnica e venda normal em homologação.
   - Re-exporta integralmente `isHmlRuleSet`, `consultAuthorizedHmlTechnical`, `retryHmlTechnical` e `recoverHmlTechnical` mantendo 100% de retrocompatibilidade com todos os importadores (`consult.ts`, `emit.ts`, `abandon-hml-attempt.ts` e testes unitários).

### 4. Validações Executadas e Não-Regressão
1. **Compilação TypeScript Estrita:**
   - `npx tsc -p api/tsconfig.nfe.json --noEmit`: 0 erros.
   - `npx tsc -p erp/tsconfig.fiscal.json --noEmit`: 0 erros.
2. **Empacotamento e Startup Fiscal:**
   - `npm --prefix erp run test:fiscal-startup`: 15 handlers empacotados, 12/12 funções Vercel dentro do limite, WASM + XSD oficial `PL_010f_v1.04` resolvidos com código 0.
3. **Testes Unitários e de Integração:**
   - `npx vitest run erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmission.test.ts erp/src/pages/utils/nfe/__tests__/hmlConsultBoundary.test.ts`: **52/52 testes aprovados**.
   - `npx vitest run src/pages/utils/nfe src/pages/App/SalesOrder/OrderActions`: **95/95 suítes aprovadas (1.011/1.011 testes)**.
4. **Invariantes Fiscais:**
   - Zero CC-e (`FISCAL-016`) preservado.
   - Terminologia estrita (`FISCAL-023`) mantida em todos os logs, comentários e mensagens.






---

## Auditoria e Refatoração de Arquitetura: Módulo de Estoque (`Stock / Inventory`) — 17/10

### 1. Problema Identificado e Sintomas Observados
Auditoria do módulo de estoque no ERP (`erp/src/pages/App/Stock/`) e no Mobile (`mobile/src/features/stock/`) identificou componentes monolíticos na impressão e design de etiquetas de preço com excesso de responsabilidades em arquivos únicos:
1. `PriceLabelArtEditorModal.tsx` com **1.894 linhas (76 KB)** acumulando:
   - Gerenciamento de ciclo de vida de persistência remota e autosave debounced no Supabase.
   - Manipulação manual de eventos de mouse e touch para arrasto, redimensionamento com escala de fonte e rotação com guias magnéticas (snap magnético).
   - Definição estática repetitiva de 9 camadas de arte (`title`, `deText`, `normalPrice`, `porText`, `currencySymbol`, `promoPrice`, `cents`, `installments`, `background`).
   - Renderizador em linha de pré-visualização contendo lógica de grandezas (dezenas, centenas, milhares) e renderizador 1:1.
2. `LabelGridModelModal.tsx` com **1.452 linhas (65 KB)** acumulando:
   - Definições e cálculos geométricos da folha, colunas, linhas e margens.
   - Painel de configurações visuais e prévia em folha inteira.
   - Tela completa de design interativo com canvas de sangria, guias horizontais e verticais, e mapeamento de campos extras e promoções.

### 2. Causa Raiz Técnica
A evolução do subsistema de etiquetas de gôndola e precificação física concentrou manipulação de canvas, drag-and-drop, redimensionamento interativo e controle de transações assíncronas dentro do mesmo componente React do modal, violando o Princípio da Responsabilidade Única (SRP) e dificultando a manutenção modular.

### 3. Soluções Técnicas Implementadas

#### A. Decomposição de `PriceLabelArtEditorModal.tsx` (1.894 -> 750 linhas)
Criação e enriquecimento de submódulos na pasta [`price-label-editor/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/):
- **[`priceLabelLayersConfig.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/priceLabelLayersConfig.ts)**: Função de fábrica `buildPriceLabelLayers` isolando a configuração estrutural das 9 camadas visuais, seus ícones, posições e alternâncias de visibilidade.
- **[`usePriceLabelCanvasInteractions.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelCanvasInteractions.ts)**: Hook dedicado exclusivamente aos manipuladores de mouse e touch (`startDragging`, `startResizing`, `startRotating`), tratamento de alinhamento magnético (`SNAP_THRESHOLD = 6`), listeners em `window` com ciclo de vida e cleanup seguros.
- **[`usePriceLabelArtworkSession.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelArtworkSession.ts)**: Hook de gerenciamento da sessão de arte, auto-save com debounce, sincronização de oportunidades do Supabase, exportação PNG/área de transferência e controle de timeout de I/O com `withTimeout`.
- **[`PriceLabelArtEditorPreview.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/PriceLabelArtEditorPreview.tsx)**: Componente isolado para a área de pré-visualização da etiqueta 1:1, cálculo de fontes dinâmicas por ordem de grandeza e contêiner interativo com `PriceLabelArtRenderer`.

#### B. Decomposição de `LabelGridModelModal.tsx` (1.452 -> 1.200 linhas)
Criação de componentes dedicados na pasta [`label-grid-model-editor/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/):
- **[`LabelGridModelHeader.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelHeader.tsx)**: Cabeçalho desacoplado com resumo de margens/gaps, nome do modelo e botões de ação contextuais ("Salvar Modelo" / "Confirmar Design").
- **[`LabelGridModelDesignCanvas.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelDesignCanvas.tsx)**: Contêiner de design visual interativo, cálculo de proporção de folha/etiqueta, área de sangria e renderização de elementos interativos com `LabelGridModelCanvasElement` e `LabelGridModelElementSelector`.

### 4. Validações e Não-Regressão
1. **Testes Unitários de `LabelPrinting`:**
   - **34 arquivos de teste aprovados (397/397 testes verdes)** sem nenhuma regressão.
2. **Testes do Módulo de Compras e Estoque:**
   - `PurchaseStockEntryModal.test.tsx`: 13/13 testes aprovados.
   - `purchaseReceiptCheckModal.test.ts` e regras de negócio: 13/13 aprovados.
3. **Testes do Ecossistema Mobile e Catálogo:**
   - `mobile-forms`: 47/47 aprovados.
   - `mobile`: 339/339 aprovados.
   - `catalog-forms`: 53/53 aprovados.
   - `digital-catalog`: build Next.js Turbopack concluído com código 0.
4. **Invariantes Arquiteturais:**
   - Invariante Zero CC-e (`FISCAL-016`) estritamente respeitado.
   - Invariante RHF + zodResolver preservado integralmente.

---

## Cancelamento Fiscal de NF-e 55 de Devolução e Estorno e Suporte Integral a CNPJ Alfanumérico (NT 2026.004 v1.01) — 17/10

### 1. Problemas Identificados e Motivação Técnica
1. **Bloqueio no Cancelamento Fiscal de Devolução e Estorno:**
   - O endpoint de cancelamento fiscal (`cancel.ts`) e o preflight (`cancellationPreflight.ts`) estavam restritos exclusivamente a `document_type = 'outbound'`. Qualquer tentativa de cancelamento fiscal de uma NF-e de devolução (`finNFe = 4`) ou estorno (`finNFe = 3`) autorizada era rejeitada na entrada, sem suporte ao cancelamento (`tpEvento = 110111`) previsto pela SEFAZ.
2. **Travamento de Reemissão por Índices Parciais e Alocações Presas:**
   - Quando um documento de devolução ou estorno precisava ser cancelado, o rascunho de operação (`nfe_operation_drafts`) permanecia com status `authorized`, impedindo nova emissão por causa de índices parciais únicos no banco (`uq_nfe_return_draft_source_order` e `uq_nfe_estorno_draft_source`).
   - As alocações de itens de devolução (`nfe_return_item_allocations.fiscal_return_document_id`) ficavam presas ao documento cancelado, impedindo a reemissão da devolução fiscal do pedido atendido.
3. **Incompatibilidades Ponta a Ponta com CNPJ Alfanumérico (`NT 2026.004 v1.01`):**
   - Havia incompatibilidades remanescentes na validação e normalização de chaves de acesso de 44 posições e CNPJ alfanumérico em manifestação de notas de entrada (`inbound_manifestation_events`, `inboundManifestationProtocol.ts`, `inbound-manifestation.ts`), `shared-utils/fiscalNumbering.ts`, `api/nfe/fiscalXmlAudit.ts` e `api/nfe/orderEditFiscalAudit.ts`, onde CNPJs com letras podiam ter os caracteres alfanuméricos removidos por `\D` ou violar check constraints do banco.

### 2. Soluções Técnicas Implementadas

#### A. Banco de Dados (PostgreSQL Remoto - Supabase `hkoxhourxwlddgsfdgws`)
- Migration [`20261017150000_nfe_return_estorno_cancellation_and_inbound_alphanumeric.sql`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/supabase/migrations/20261017150000_nfe_return_estorno_cancellation_and_inbound_alphanumeric.sql) aplicada:
  1. **Constraints Alfanuméricas:** Atualização das check constraints em `inbound_manifestation_events` para aceitar chaves `^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$` e CNPJ destinatário `^[A-Z0-9]{12}[0-9]{2}$`.
  2. **Status `cancelled` em Rascunhos:** Adição de `'cancelled'` na constraint `nfe_operation_drafts_status_check`.
  3. **Índices Parciais Únicos:** Ajuste de `uq_nfe_estorno_draft_source` e `uq_nfe_return_draft_source_order` para ignorar rascunhos com status `'cancelled'`.
  4. **Preparação de Rascunhos:** Atualização de `prepare_nfe_operation_draft` para ignorar rascunhos cancelados.
  5. **Cancelamento Atômico de Devolução e Estorno:** Atualização de `reserve_nfe_cancellation_event` e `persist_nfe_cancellation_result`:
     - Validação e aceitação de `document_type in ('outbound', 'return', 'estorno')` com `modelo = '55'`.
     - Rejeição de cancelamento de estorno se houver substituição de edição fiscal ativa (`status in ('ready_to_reissue', 'replacement_prepared', 'completed')`).
     - Ao confirmar o cancelamento (`persist_nfe_cancellation_result`), se o documento for `return` ou `estorno`, atualiza atomicamente `nfe_operation_drafts.status = 'cancelled'`.
     - Se for `return`, atualiza atomicamente `nfe_return_item_allocations.fiscal_return_document_id = NULL`, liberando os itens faturados para nova emissão.

#### B. Backend API & Preflight (`api/nfe/`)
- **[`cancellationPreflight.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancellationPreflight.ts):**
  - Ampliado `validateCancellationDocument` para aceitar `document_type in ('outbound', 'return', 'estorno')` (exigindo estritamente `modelo === '55'` para return e estorno).
  - Atualizado `validateCancellationOrderAndCirculation` para validar vínculos com pedidos de devolução comercial (`order_type === 'return'`) ou checar ausência de substituições ativas em `nfe_order_edit_replacements` para estorno, mantendo a verificação do prazo de 168h da SEFAZ.
- **Unificação de Regexes Alfanuméricas:**
  - Atualização em [`shared-utils/fiscalNumbering.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/shared-utils/fiscalNumbering.ts), [`api/nfe/fiscalXmlAudit.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/fiscalXmlAudit.ts), [`api/nfe/orderEditFiscalAudit.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/orderEditFiscalAudit.ts), [`api/nfe/inboundManifestationProtocol.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/inboundManifestationProtocol.ts), [`api/nfe/inbound-manifestation.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/inbound-manifestation.ts), [`api/nfe/cce.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cce.ts) e [`erp/src/pages/utils/nfe/nfeCce.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeCce.ts). Preservado integralmente o bloqueio de emissão de CC-e (`FISCAL-016`).

#### C. Testes Unitários de API
- **[`cancelEndpoint.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts):**
  - Adição de 5 testes unitários dedicados cobrindo:
    1. Cancelamento fiscal de NF-e 55 de Devolução vinculada a pedido comercial atendido.
    2. Rejeição de cancelamento de Devolução quando pedido de devolução não é do tipo `return`.
    3. Cancelamento fiscal de NF-e 55 de Estorno sem substituição ativa vinculada.
    4. Rejeição de cancelamento de Estorno quando há substituição ativa em andamento (`ready_to_reissue`).
    5. Rejeição de cancelamento de Devolução ou Estorno em modelo 65.
  - Total: **25/25 testes aprovados**.

### 3. Provas Comportamentais Transacionais no PostgreSQL Remoto (Suíte 5 pgTAP)
Execução transacional em ambiente de Homologação no projeto `hkoxhourxwlddgsfdgws` sob `BEGIN ... ROLLBACK` (garantindo **0 linhas residuais** no banco):
- **`T01`**: Cancelamento de NF-e de Devolução (`finNFe = 4`): documento status `cancelada`, rascunho status `cancelled`, alocação liberada (`fiscal_return_document_id IS NULL`) -> **PASSED** (`doc_status=cancelada, draft_status=cancelled, alloc_is_null=true`).
- **`T02`**: Idempotência do cancelamento de Devolução (retorna `idempotent = true`, `status = registered`) -> **PASSED**.
- **`T03`**: Nova emissão de Devolução liberada após cancelamento fiscal da anterior (`new_draft_id <> prev_draft_id`) -> **PASSED**.
- **`T04`**: Cancelamento de NF-e de Estorno (`finNFe = 3`): documento status `cancelada`, rascunho status `cancelled` -> **PASSED** (`doc_status=cancelada, draft_status=cancelled`).
- **`T05`**: Idempotência do cancelamento de Estorno (retorna `idempotent = true`, `status = registered`) -> **PASSED**.
- **`T06`**: Nova emissão de Estorno liberada após cancelamento fiscal da anterior (`new_draft_id <> prev_draft_id`) -> **PASSED**.
- Resultado: **6/6 asserções aprovadas com sucesso**, comprovando integridade e não-regressão.

### 4. Validações e Não-Regressão
1. **Compilação TypeScript:**
   - `npx.cmd tsc -p api/tsconfig.nfe.json --noEmit`: **0 erros**.
   - `npx.cmd tsc -p erp/tsconfig.fiscal.json --noEmit`: **0 erros**.
2. **Empacotamento e Startup Fiscal:**
   - `npm.cmd --prefix erp run test:fiscal-startup`: 15 módulos empacotados, 12/12 funções Vercel, WASM + XSD oficial `PL_010f_v1.04` resolvidos com sucesso.
3. **Suíte Completa de Testes Fiscais:**
   - `npx.cmd vitest run src/pages/utils/nfe/`: **76 arquivos de teste, 842/842 testes aprovados**.
4. **Invariantes Arquiteturais:**
   - Invariante Zero CC-e (`FISCAL-016`) estritamente respeitado em todo o fluxo.
   - Terminologia estrita (`FISCAL-023`) mantida em todos os schemas, RPCs e documentações.


---

## Decomposição e Refatoração Modular do Módulo de Estoque (`Stock / Inventory`) — ERP & Mobile — 17/10

### 1. Problema Identificado e Sintomas Observados
Auditoria exaustiva de contagem de linhas e responsabilidades nos módulos de Estoque do ERP (`erp/src/pages/App/Stock/`) e Mobile (`mobile/src/features/stock/`) identificou componentes monolíticos com excessiva complexidade ciclomática e acoplamento entre regras de negócio, layouts e manipulações visuais:

1. **`InboundInvoiceMappingsModal.tsx` no Mobile (1.591 linhas, 68 KB)**:
   - O maior monolito do app mobile, acumulando em um único arquivo: tipos, cálculo de custos landed (`landedUnitCost`), debounced search de fornecedores, scoring determinístico de correspondências (`rankInboundSuggestions`), fluxo de cadastro rápido de produtos/variações via `ProductFormScreen`, gerenciamento de vínculos individuais e em composição, detalhamento fiscal com mais de 25 campos tributários e mais de 340 linhas de `StyleSheet`.
2. **`InvoicesScreen.tsx` no Mobile (784 linhas, 28 KB)**:
   - Acumulava cabeçalho com múltiplos tipos de filtros de período (mês atual, mês anterior, custom_month, custom_range), busca com debounce, estados vazios/erro/carregamento, paginação e modais múltiplos.
3. **`PurchaseDetailsModal.tsx` no ERP (481 linhas, 25 KB)**:
   - Acumulava geração em linha de documento HTML de impressão com mais de 90 linhas de template string, cabeçalho de status de pedido, grid de cards de estatísticas, tabela de produtos com quantidades pedida/recebida e seções fiscais.
4. **`useReceiptForm.ts` no ERP (554 linhas, 24 KB)**:
   - Misturava ciclo de vida de rascunhos com validação Zod, parsing manual de data ISO para o fuso brasileiro, persistência manual de códigos de fornecedor em laço com Promise.all e montagem manual duplicada de payloads de recebimento.
5. **`InvoiceDetailsModal.tsx` no Mobile (527 linhas, 23 KB)**:
   - Acumulava formatação de moeda e datas fiscais, layout de partes (emitente/destinatário), grid fiscal com 15 indicadores, listagem de itens e mais de 130 linhas de estilos.

### 2. Causa Raiz Técnica
Violação do Princípio de Responsabilidade Única (SRP) e falta de granularidade em subcomponentes puros, tornando a leitura, manutenção e evolução dos módulos de entrada e conferência de notas fiscais complexa e propensa a efeitos colaterais.

### 3. Soluções Técnicas Implementadas

#### A. Modularização de Vínculos de Notas Fiscais no Mobile (`InboundInvoiceMappingsModal.tsx` -> 496 linhas)
Criação do diretório estruturado [`mobile/src/features/stock/invoices/modals/inbound-mappings/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/):
- **[`types.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/types.ts)**: Tipos de domínio desacoplados (`MappingItem`, `Supplier`, `ProductSuggestion`, `CompositionLink`).
- **[`inboundCostUtils.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/inboundCostUtils.ts)**: Funções de cálculo landed (`amount`, `formatMoney`, `landedUnitCost`).
- **[`inboundMappings.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/inboundMappings.styles.ts)**: Extração integral do `StyleSheet.create`.
- **[`InboundSupplierSection.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/InboundSupplierSection.tsx)**: Componente para seleção, busca com debounce e criação de fornecedores.
- **[`InboundQuickProductModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/InboundQuickProductModal.tsx)**: Sub-modais de opções de cadastro e integração isolada com `ProductFormScreen`.
- **[`InboundMappingItemCard.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx)**: Card atômico do item com custos rateados, painel fiscal colapsável, toggle de modo único/composição, sugestões determinísticas e busca de produtos.
- **[`index.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/inbound-mappings/index.ts)**: Barril de exportação limpa.
- **[`InboundInvoiceMappingsModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx)**: Reduzido de 1.591 linhas para 496 linhas, atuando como orquestrador limpo e declarativo de estado e persistência.

#### B. Modularização da Tela de Notas Fiscais no Mobile (`InvoicesScreen.tsx` -> 365 linhas)
Criação do diretório estruturado [`mobile/src/features/stock/invoices/screens/invoices-screen/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/):
- **[`invoicesScreen.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/invoicesScreen.styles.ts)**: Extração de 215 linhas de `StyleSheet`.
- **[`InvoicePeriodFilterModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/InvoicePeriodFilterModal.tsx)**: Modal dedicado de seleção de período e exportação de `periodOptions`.
- **[`InvoicesPageHeader.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesPageHeader.tsx)**: Cabeçalho com título, botão de importar XML, badge SEFAZ, filtro de período e campo de busca.
- **[`InvoicesListStates.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesListStates.tsx)**: Componentes atômicos para `InvoicesLoadingState`, `InvoicesErrorState` e `InvoicesEmptyState`.
- **[`index.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/invoices-screen/index.ts)**: Barril de exportação limpa.
- **[`InvoicesScreen.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/screens/InvoicesScreen.tsx)**: Reduzido de 784 para 365 linhas.

#### C. Modularização do Modal de Detalhes da Nota Fiscal no Mobile (`InvoiceDetailsModal.tsx` -> 99 linhas)
Criação do diretório estruturado [`mobile/src/features/stock/invoices/modals/invoice-details/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/):
- **[`invoiceDetailsModal.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/invoiceDetailsModal.styles.ts)**: Estilos isolados.
- **[`invoiceDetailsFormatters.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/invoiceDetailsFormatters.ts)**: Funções puras `money` e `fiscalDate`.
- **[`InvoiceDetailsHeader.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsHeader.tsx)**: Cabeçalho com badges de status, chave de acesso e datas.
- **[`InvoiceDetailsFiscalSection.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsFiscalSection.tsx)**: Dados das partes e grid com 15 tributos e despesas acessórias.
- **[`InvoiceDetailsItemsSection.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsItemsSection.tsx)**: Lista de itens ou estado vazio com ação de obter XML SEFAZ.
- **[`InvoiceDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/InvoiceDetailsModal.tsx)**: Reduzido de 527 para 99 linhas.

#### D. Modularização do Modal de Detalhes de Pedido de Compra no ERP (`PurchaseDetailsModal.tsx` -> 105 linhas)
Criação do diretório estruturado [`erp/src/pages/App/Stock/Purchases/modals/purchase-details/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/):
- **[`purchasePrintService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/utils/purchasePrintService.ts)**: Serviço dedicado isolando o template HTML e o fluxo de impressão em janela separada.
- **[`PurchaseDetailsHeader.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/PurchaseDetailsHeader.tsx)**: Cabeçalho desacoplado com status e ações rápidas.
- **[`PurchaseDetailsStats.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/PurchaseDetailsStats.tsx)**: Grid de estatísticas numéricas do pedido.
- **[`PurchaseDetailsItemsTable.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/PurchaseDetailsItemsTable.tsx)**: Tabela limpa de produtos pedidos e recebidos.
- **[`PurchaseDetailsFiscalAndNotes.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/PurchaseDetailsFiscalAndNotes.tsx)**: Seções de dados fiscais com cópia de chave e arquivos anexos.
- **[`PurchaseDetailsFooter.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/purchase-details/PurchaseDetailsFooter.tsx)**: Botões de fechamento, conferência e edição.
- **[`PurchaseDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Purchases/modals/PurchaseDetailsModal.tsx)**: Reduzido de 481 para 105 linhas.

#### E. Refatoração de Utilitários de Recebimento no ERP (`useReceiptForm.ts`)
Criação de utilitários de domínio em [`erp/src/pages/App/Stock/Receipts/utils/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/utils/):
- **[`receiptDateUtils.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/utils/receiptDateUtils.ts)**: Função pura `getSafeReceivedAt` para normalização de datas de recebimento.
- **[`receiptSupplierCodesPersistence.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/utils/receiptSupplierCodesPersistence.ts)**: Função pura `persistInboundSupplierProductCodes` desacoplando a persistência de códigos de fornecedor para vínculos individuais e de composição.
- **[`receiptPayloadBuilders.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/utils/receiptPayloadBuilders.ts)**: Construtor tipado `buildGoodsReceiptPayload` unificando a formatação de payloads de rascunho e finalização.
- **[`ReceiptsPagination.test.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/components/ReceiptsPagination.test.tsx)**: Ajustado ambiente de teste para `happy-dom`, sanando o erro de módulo nativo do canvas.

### 4. Validações e Não-Regressão
1. **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**:
   - **64 arquivos de teste aprovados (339/339 testes verdes)**.
2. **Suíte Móvel de Formulários (`npm run test:unit:mobile-forms --prefix erp`)**:
   - **5 arquivos de teste aprovados (47/47 testes verdes)**.
3. **Suíte de Formulários do Catálogo Digital (`npm run test:unit:catalog-forms --prefix erp`)**:
   - **6 arquivos de teste aprovados (53/53 testes verdes)**.
4. **Suíte de Recebimentos do ERP (`npm run test:unit -- src/pages/App/Stock/Receipts/ --prefix erp`)**:
   - **8 arquivos de teste aprovados (36/36 testes verdes)**.
5. **Suíte de Compras do ERP (`npm run test:unit -- src/pages/App/Stock/Purchases/ --prefix erp`)**:
   - **4 arquivos de teste aprovados (29/29 testes verdes)**.
6. **Suíte de Impressão de Etiquetas do ERP (`npm run test:unit -- src/pages/App/Stock/LabelPrinting/ --prefix erp`)**:
   - **34 arquivos de teste aprovados (397/397 testes verdes)**.
7. **Build de Produção do Catálogo Digital (`npm run build --prefix digital-catalog`)**:
   - Next.js 16.3.6 (Turbopack) compilado com sucesso com código de saída 0.
8. **Invariantes Arquiteturais**:
   - Zero CC-e (`FISCAL-016`) estritamente verificado (0 ocorrências em todo o código).
   - Validação Zod prévia à submissão garantida em todos os fluxos.

---

## Auditoria e Refatoração de Arquitetura no Módulo de Estoque (Fase 2)

### 1. Problemas Identificados e Diagnóstico
Em continuidade à auditoria profunda do módulo de Estoque/Inventário no ERP e no App Mobile, identificou-se arquivos com alto acoplamento, mistura de renderização de interface com regras de negócio, manipulação direta de estilos inline e acumulação massiva de hooks de estado em um único componente:
- **`SuppliersScreen.tsx` (Mobile - 488 linhas)**: Tela agregava estilos complexos de StyleSheet, renderização direta do card do fornecedor com contagem de produtos e menu de contexto, barra de filtros com ordenação cíclica e chips de status, e múltiplos estados de carregamento e erro com tentativa de recarga.
- **`InvoiceImportModal.tsx` (Mobile - 488 linhas)**: Modal combinava cabeçalho, cartão de status de progresso, seção de busca por chave de acesso com consulta direta via SEFAZ / Portal Nacional, seção de upload por drag-and-drop de arquivo XML e modal de scanner.
- **`StockMoveCard.tsx` (Mobile - 446 linhas)**: Componente de card continha mais de 118 linhas de estilos, funções puras de parsing de observações em JSON, mapeamento de paletas de cor para os tipos de movimentação (entrada, saída, ajuste, estorno) e formatação de datas e valores monetários.
- **`InboundInvoiceReceiptPickerModal.tsx` (ERP - 449 linhas)**: Modal de seleção de NF-e para recebimento de mercadorias mantinha lógica de normalização de dígitos, formatação de períodos (`getCurrentYearMonth`, `getPreviousYearMonth`), predicados de filtragem por data e busca, barra de filtros e card de exibição da nota fiscal.
- **`LabelGridModelModal.tsx` (ERP - 1.303 linhas)**: Monólito responsável pela edição de grades de etiquetas físicas, mantendo mais de 50 hooks `useState` simultâneos para tipografia (normal, promocional, preço antigo, preço dividido), posições (X, Y), dimensões, campos extras e canvas interativo com manipulação de mouse (drag, resize, snap, guias magnéticas).

### 2. Causa Raiz Técnica
Falta de segregação de responsabilidades (SRP) e ausência de camadas intermediárias de custom hooks de domínio para orquestrar sessões e interações de canvas, sobrecarregando os componentes de visualização com detalhes de infraestrutura e manipulação de estado de baixo nível.

### 3. Soluções Técnicas Implementadas

#### A. Modularização da Tela de Fornecedores Mobile (`SuppliersScreen.tsx` 488 -> 171 linhas)
Criados arquivos especializados em [`mobile/src/features/stock/suppliers/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/):
- **[`suppliersScreen.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/suppliersScreen.styles.ts)**: Extração completa de 103 linhas de `StyleSheet.create`.
- **[`SupplierToolbar.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/components/SupplierToolbar.tsx)**: Barra de ferramentas isolada com busca por texto, ciclo de ordenação (A-Z, Z-A, Recentes, Antigos), botão de novo fornecedor e chips de status.
- **[`SupplierCard.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/components/SupplierCard.tsx)**: Card individual com exibição de documento (CPF/CNPJ), razão social/fantasia, contagem de produtos associados com retry sob demanda, atalho de histórico de pedidos e menu de ações (editar, mover para lixeira).
- **[`SupplierListStates.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/components/SupplierListStates.tsx)**: Tratamento limpo de estados de loading, erro e lista vazia com mensagens orientadas a filtros.
- **[`SuppliersScreen.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/suppliers/SuppliersScreen.tsx)**: Simplificado para 171 linhas, atuando como orquestrador limpo.

#### B. Modularização do Modal de Importação de XML Mobile (`InvoiceImportModal.tsx` 488 -> 225 linhas)
Criados arquivos especializados em [`mobile/src/features/stock/invoices/modals/invoice-import/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-import/):
- **[`invoiceImportModal.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-import/invoiceImportModal.styles.ts)**: Estilos do modal extraídos de forma independente.
- **[`InvoiceImportAccessKeySection.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportAccessKeySection.tsx)**: Seção de consulta por chave de acesso de 44 dígitos com acionamento do leitor de código de barras/DANFE, busca direta na SEFAZ e consulta no Portal Nacional.
- **[`InvoiceImportXmlUploadSection.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportXmlUploadSection.tsx)**: Área de toque e seleção de arquivo XML oficial da NF-e via `expo-document-picker`.
- **[`InvoiceImportModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx)**: Reduzido para 225 linhas, preservando integralmente os fluxos validados por Zod (`inboundAccessKeyFormSchema` e `inboundXmlFileFormSchema`).

#### C. Modularização do Card de Movimentação de Estoque (`StockMoveCard.tsx` 446 -> 263 linhas)
Criados arquivos especializados em [`mobile/src/features/stock/moves/components/stock-move-card/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/moves/components/stock-move-card/):
- **[`stockMoveCard.styles.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/moves/components/stock-move-card/stockMoveCard.styles.ts)**: 118 linhas de estilos desacopladas.
- **[`stockMoveCardUtils.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/moves/components/stock-move-card/stockMoveCardUtils.ts)**: Funções puras para determinação visual do tipo de movimentação (`getTypeVisualConfig`), formatação de moeda (`formatCurrency`), datas (`formatDateAndTime`), texto de estorno (`getReversedLabel`), parsing de observações em JSON (`parseObservationAndReason`) e cálculo de prefixos e cores de quantidade (`getQuantityDisplay`).
- **[`StockMoveCard.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/moves/components/StockMoveCard.tsx)**: Reduzido para 263 linhas, com layout declarativo e legibilidade impecável.

#### D. Modularização do Seletor de NF-e para Recebimento no ERP (`InboundInvoiceReceiptPickerModal.tsx` 449 -> 191 linhas)
Criados arquivos especializados em [`erp/src/pages/App/Stock/Receipts/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/):
- **[`inboundInvoicePickerFilters.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/utils/inboundInvoicePickerFilters.ts)**: Funções puras de filtragem (`normalizeDigits`, `getCurrentYearMonth`, `getPreviousYearMonth`, `statusLabel`, `isInDateFilter`, `filterInboundInvoicesForReceipt`).
- **[`InboundInvoiceReceiptFilterBar.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/modals/inbound-invoice-picker/InboundInvoiceReceiptFilterBar.tsx)**: Barra de pesquisa por texto e seletor de períodos (Mês Atual, Mês Anterior, Este Ano, Ano Passado, Outro Mês, Intervalo Personalizado).
- **[`InboundInvoiceReceiptItem.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/modals/inbound-invoice-picker/InboundInvoiceReceiptItem.tsx)**: Card individual da nota fiscal com badges de conferência, emissão, total e ações (Usar NF ou Finalizar Vinculação).
- **[`InboundInvoiceReceiptPickerModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/Receipts/modals/InboundInvoiceReceiptPickerModal.tsx)**: Reduzido de 449 para 191 linhas.

#### E. Desacoplamento do Editor de Grades de Etiquetas no ERP (`LabelGridModelModal.tsx` 1.303 -> 437 linhas)
Criados hooks dedicados em [`erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/):
- **[`useLabelGridModelSession.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelSession.ts)**: Gerenciamento unificado de todos os estados do modelo de etiqueta (papel, dimensões, margens, espaçamentos, tipografia normal/promocional/antigo, preço dividido, cores de fundo, posições e campos extras), sincronização com o modelo em edição e fábrica do estado `buildEditorState()`.
- **[`useLabelGridModelInteractions.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelInteractions.ts)**: Isolamento de toda a interação do canvas: seleção de elementos, dragging, redimensionamento (largura e fonte), guias magnéticas (snap), alternância de modos de visualização (design, promoção, paleta de cores) e manipuladores de estilo (`updateStyle`, `cycleAlign`, `cycleVAlign`).
- **[`LabelGridModelModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/LabelGridModelModal.tsx)**: Reduzido de 1.303 para 437 linhas, atuando puramente na orquestração da validação Zod via `labelGridModelSaveFormSchema` e na composição dos componentes `LabelGridModelHeader`, `LabelGridModelToolbar`, `LabelGridModelDesignCanvas`, `LabelGridModelSettingsPanel` e `LabelGridSheetPreview`.

### 4. Validações e Não-Regressão
1. **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**: 339/339 testes aprovados (64 arquivos).
2. **Suíte Móvel de Formulários (`npm run test:unit:mobile-forms --prefix erp`)**: 47/47 testes aprovados (5 arquivos).
3. **Suíte de Modelos de Grade de Etiquetas (`npm run test:unit -- src/pages/App/Stock/LabelPrinting/__tests__/labelGridModel`)**: 29/29 testes aprovados (4 arquivos).
4. **Suíte Geral de Impressão de Etiquetas (`npm run test:unit -- src/pages/App/Stock/LabelPrinting`)**: 397/397 testes aprovados (34 arquivos).
5. **Suíte de Recebimentos do ERP (`npm run test:unit -- src/pages/App/Stock/Receipts`)**: 36/36 testes aprovados (8 arquivos).
6. **Suíte de Compras do ERP (`npm run test:unit -- src/pages/App/Stock/Purchases`)**: 29/29 testes aprovados (4 arquivos).
7. **Invariante Fiscal de Segurança (`FISCAL-016`)**: Verificação estrita confirma **0 menções** a CC-e / Carta de Correção Eletrônica em todo o módulo de estoque.


## Refatoração Modular e Princípios de Engenharia — Módulos de Logística e Fluxo de Entrega

### 1. Problemas Identificados e Motivação
- **`NextDeliveryCard.tsx` (Mobile - 502 linhas)** e **`RouteListItem.tsx` (Mobile - 380 linhas)**: Monólitos visuais com estilos acoplados e lógica duplicada de detecção de serviços (Entrega, Retirada, Assistência, Coleta de Devolução) e montagem (Depósito vs Externa), violando o princípio DRY e gerando divergências com as regras de negócio consolidadas de `orderAssemblyRules.ts`.
- **`DeliveryPreparationScreen.tsx` (Mobile - 522 linhas)**: Monólito que acumulava busca de staff em banco, gerenciamento de múltiplos modais, formulários Zod (`routeForm`, `finishForm`), emissão de broadcast de localização em background e persistência offline e online, violando o Princípio da Responsabilidade Única (SRP).
- **`DeliveryPreparationStep.tsx` (Mobile - 519 linhas)**: Card com mais de 200 linhas de estilos inline e acoplamento de seleção de múltiplos colaboradores com chips, sugestões e inputs manuais misturados ao checklist operacional.

### 2. Soluções Técnicas Implementadas

#### A. Centralização do Domínio Logístico (SSOT e DRY)
Criado [`mobile/src/features/logistics/domain/deliveryServiceClassification.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/logistics/domain/deliveryServiceClassification.ts):
- Função pura `classifyDeliveryService(order)` que extrai tipo de serviço, labels, cores temáticas e necessidade de montagem (depósito vs externa) consumindo `getOrderAssemblyFlags` de `orderAssemblyRules.ts`.
- Suíte de testes unitários dedicada em [`deliveryServiceClassification.test.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/logistics/domain/deliveryServiceClassification.test.ts) (5 testes aprovados).

#### B. Modularização do Card de Próxima Parada (`NextDeliveryCard.tsx` 502 -> 75 linhas)
Criada subpasta [`mobile/src/features/logistics/components/deliveryMap/next-delivery-card/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/logistics/components/deliveryMap/next-delivery-card/):
- `nextDeliveryCard.types.ts` e `nextDeliveryCard.styles.ts` (estilos desacoplados).
- `NextDeliveryCompletedCard.tsx` (estado de roteiro concluído).
- `NextDeliveryCardHeader.tsx` (status EM ANDAMENTO, pedido e botão fechar).
- `NextDeliveryCardBadges.tsx` (badges de serviço e montagens).
- `NextDeliveryCardMetrics.tsx` (métricas de janela/horário, distância, duração e volumes).
- `NextDeliveryCardActions.tsx` (ações operacionais de navegação e detalhes).
- `NextDeliveryCard.tsx`: orquestrador declarativo enxuto de 75 linhas.

#### C. Modularização do Item de Roteiro (`RouteListItem.tsx` 380 -> 72 linhas)
Criada subpasta [`mobile/src/features/logistics/components/routeList/route-list-item/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/logistics/components/routeList/route-list-item/):
- `routeListItem.types.ts` e `routeListItem.styles.ts`.
- `RouteListItemBadges.tsx` (badges operacionais).
- `RouteListItemHeader.tsx` (sequência, cliente, pedido e status pill).
- `RouteListItemFooter.tsx` (métricas e atalhos rápidos de navegação externa e visualização).
- `RouteListItem.tsx`: orquestrador declarativo de 72 linhas.

#### D. Desacoplamento da Tela do Fluxo de Entrega (`DeliveryPreparationScreen.tsx` 522 -> 167 linhas)
Criada subpasta [`mobile/src/features/orders/screens/delivery-preparation/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/screens/delivery-preparation/):
- `deliveryPreparation.types.ts` e `deliveryPreparation.styles.ts`.
- `deliveryStaffRules.ts`: funções puras de seleção a 0s, adição sem duplicatas, remoção segura e filtragem de sugestões.
- `useDeliveryStaff.ts`: hook especializado de consulta e gestão de colaboradores.
- `useDeliveryFlowActions.ts`: hook de ciclo de vida (início de rota, chegada no cliente, finalização com validação Zod, não atendimento, retrocesso de etapas e cancelamento seguro).
- `deliveryStaffRules.test.ts`: 7 testes unitários cobrindo todas as regras de colaboradores.
- `DeliveryPreparationScreen.tsx`: orquestrador limpo de 167 linhas.

#### E. Modularização da Etapa 1 de Preparação (`DeliveryPreparationStep.tsx` 519 -> 106 linhas)
Criada subpasta [`mobile/src/features/orders/components/delivery/preparation/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/delivery/preparation/):
- `deliveryPreparationStep.styles.ts`.
- `DeliveryDestinationInfoCard.tsx` (cliente, endereço, janela e atalho Maps).
- `DeliveryResponsiblesSection.tsx` (gestão de múltiplos responsáveis, chips, sugestões e inputs).
- `DeliveryPreparationStep.tsx`: reduzido de 519 para 106 linhas.

### 3. Validações e Não-Regressão
1. **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**: 351/351 testes aprovados (66 arquivos de teste, 100% de sucesso).
2. **Novos Testes de Domínio e Regras Adicionados**:
   - `deliveryServiceClassification.test.ts`: 5 testes aprovados.
   - `deliveryStaffRules.test.ts`: 7 testes aprovados.
   - `deliveryRouteFormSchema.test.ts`: 8 testes aprovados.
3. **Compatibilidade Total**: Nenhuma interface, contrato de exportação ou rota externa sofreu alteração que quebre compatibilidade com os demais componentes do sistema.


## Refatoração Modular e Princípios de Engenharia — Módulo de Estoque e Inventário (ERP e Mobile)

### 1. Problemas Identificados e Diagnóstico Técnico
- **ERP - `LabelGridModelModal.tsx` (1.303 linhas) e `PriceLabelArtEditorModal.tsx` (1.262 linhas)**: Componentes monólitos de altíssima complexidade no subsistema de impressão de etiquetas que acumulavam orquestração visual, drag & drop de canvas, redimensionamento com snap magnético, serialização e histórico de desfazer/refazer, formatação em lote e mapeamento temático de cores de oportunidade.
- **ERP - `InboundInvoiceReceiptPickerModal.tsx` (449 linhas)**: Modal de seleção e vinculação de notas fiscais de entrada com regras de filtragem por fornecedor/número/data e renderização de cards aninhados sem desacoplamento de responsabilidades.
- **Mobile - `PurchasesScreen.tsx` (434 linhas)**: Tela de pedidos de compra do estoque móvel com modal de seleção de fornecedores, filtros de busca, cards com metadados de status e estados de lista misturados a estilos de mais de 100 linhas.
- **Mobile - `InventoryScannerScreen.tsx` (438 linhas)**: Scanner com câmera, controle de áudio de contagem, temporizadores de borda de feedback, OCR web via worker Tesseract vs mobile nativo MLKit e cards de status da sessão no mesmo arquivo.
- **Mobile - `InventoryScreen.tsx` (424 linhas)**: Tela principal de inventário auditando estoque com handlers de estorno, reaplicação de ajustes, duplicação e exclusão de rascunhos acoplados ao corpo do componente e paginação.
- **Mobile - `SuppliersScreen.tsx` (488 linhas), `InvoiceImportModal.tsx` (488 linhas) e `StockMoveCard.tsx` (446 linhas)**: Componentes com estilos extensos e lógica de negócio misturada à visualização.

### 2. Soluções Arquiteturais Implementadas (Clean Code, DRY, SRP, Desacoplamento)

#### A. Impressão de Etiquetas do ERP (`PriceLabelArtEditorModal.tsx` e `LabelGridModelModal.tsx`)
1. **`usePriceLabelElementFormatting.ts`** criado em [`erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelElementFormatting.ts):
   - Encapsula histórico de cores, centralização de componentes, seleção de cores com gradiente, mapeamento de temas por oportunidade (`oppColorsMap`), alteração de famílias tipográficas e ajuste em lote de tamanhos de fonte (`handleBatchFontSize`, `handleBatchFontFamily`).
   - Reduz `PriceLabelArtEditorModal.tsx` em mais de 200 linhas de código imperativo redundante.
2. **`useLabelGridModelSession.ts` e `useLabelGridModelInteractions.ts`** criados em [`erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/):
   - `LabelGridModelModal.tsx` reduzido de **1.303 linhas para 437 linhas** (redução de 66%), isolando a máquina de estados da sessão e os cálculos de arrasto/redimensionamento/snap do canvas.

#### B. Seletor de Recebimento de Notas Fiscais no ERP (`InboundInvoiceReceiptPickerModal.tsx`)
- Reduzido de **449 linhas para 191 linhas**.
- Criada a subpasta [`erp/src/pages/App/Stock/InboundInvoices/modals/inbound-invoice-picker/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Stock/InboundInvoices/modals/inbound-invoice-picker/):
  - `inboundInvoicePickerFilters.ts`: funções puras de filtragem por texto, data e fornecedor.
  - `InboundInvoiceReceiptFilterBar.tsx`: barra de filtros e busca.
  - `InboundInvoiceReceiptItem.tsx`: card de item de nota fiscal.

#### C. Pedidos de Compra Mobile (`PurchasesScreen.tsx`)
- Reduzido de **434 linhas para 148 linhas**.
- Criada a subpasta [`mobile/src/features/stock/purchases/screens/purchases-screen/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/purchases/screens/purchases-screen/):
  - `purchasesScreen.styles.ts`: folha de estilo isolada.
  - `purchasesScreenUtils.ts`: funções puras de formatação (`money`, `date`, `statusMeta`).
  - `PurchaseCard.tsx`: card de pedido com badge de status e valor total.
  - `PurchasesListStates.tsx`: estados de carregamento, erro e vazio.
  - `PurchasesScreenHeader.tsx`: cabeçalho com campo de busca e filtro de fornecedor.
  - `PurchaseSupplierFilterModal.tsx`: modal dedicado para seleção e busca de fornecedor.

#### D. Scanner e Contagem de Inventário Mobile (`InventoryScannerScreen.tsx`)
- Reduzido de **438 linhas para 239 linhas**.
- Criada a subpasta [`mobile/src/features/stock/inventory/screens/inventory-scanner/`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/features/stock/inventory/screens/inventory-scanner/):
  - `inventoryScanner.styles.ts`: estilos desacoplados do scanner e overlay.
  - `inventoryScannerOcr.ts`: utilitário isolado de OCR e extração de chave de acesso de NF-e (separação web vs nativo).
  - `InventoryScannerFeedbackView.tsx`: componente de feedback contínuo da contagem e métricas de sessão.

#### E. Tela Principal de Inventário Mobile (`InventoryScreen.tsx`)
- Reduzido de **424 linhas para 198 linhas**.
- Criados:
  - `mobile/src/features/stock/inventory/hooks/useInventoryScreenActions.ts`: hook customizado encapsulando todo o ciclo de vida e ações operacionais de sessões de inventário (`handleContinueInventory`, `handleDuplicateInventory`, `handleReverseInventory`, `handleApplyAdjustments`, `handleDeleteDraft`).
  - `mobile/src/features/stock/inventory/screens/inventory-screen/inventoryScreen.styles.ts`.
  - `mobile/src/features/stock/inventory/screens/inventory-screen/InventoryScreenPageHeader.tsx`.
  - `mobile/src/features/stock/inventory/screens/inventory-screen/InventoryScreenEmptyState.tsx`.

#### F. Fornecedores, Importação e Movimentação Mobile
- `SuppliersScreen.tsx` (488 -> 171 linhas) decomposto com `SupplierCard`, `SupplierToolbar`, `SupplierListStates` e estilos isolados.
- `InvoiceImportModal.tsx` (488 -> 225 linhas) decomposto em `InvoiceImportAccessKeySection` e `InvoiceImportXmlUploadSection`.
- `StockMoveCard.tsx` (446 -> 263 linhas) desacoplado com `stockMoveCardUtils.ts` e `stockMoveCard.styles.ts`.

#### G. Tela de Revisão Final de Inventário Mobile (`InventoryReviewScreen.tsx`)
- Reduzido de **404 linhas para 148 linhas**.
- Criados:
  - `mobile/src/features/stock/inventory/hooks/useInventoryReconciliation.ts`: hook de consulta em lotes e cálculo da reconciliação de movimentações ocorridas durante a contagem.
  - `mobile/src/features/stock/inventory/screens/inventory-review/inventoryReview.styles.ts`: estilos dedicados.
  - `mobile/src/features/stock/inventory/screens/inventory-review/InventoryReviewSummaryCard.tsx`: card de contagem concluída e aviso de não contados.
  - `mobile/src/features/stock/inventory/screens/inventory-review/InventoryReviewDifferencesList.tsx`: lista de divergências e ajustes.

#### H. Renderizador de Etiqueta ERP (`LabelItem.tsx`)
- Reduzido de **527 linhas para 260 linhas**.
- Criada a subpasta `erp/src/pages/App/Stock/LabelPrinting/components/label-item/`:
  - `LabelBarcode.tsx`: renderização isolada de código de barras via BWIP-JS (EAN-13 e Code 128).
  - `LabelQRCode.tsx`: renderizador canvas de QR Code e componente de preview placeholder.
  - `labelItemUtils.ts`: helpers puros de formatação monetária e alinhamento CSS.
  - `LabelIdentificationLayout.tsx`: layout modular para etiquetas de identificação patrimonial com SKU e QR Code.

#### I. Contêiner Principal de Estoque Mobile (`NativeStockScreen.tsx`)
- Reduzido de **374 linhas para 198 linhas**.
- Criada a subpasta `mobile/src/features/stock/overview/native-stock-screen/`:
  - `nativeStockScreen.styles.ts`: folha de estilo isolada.
  - `nativeStockScreen.types.ts`: tipagem e constantes de abas do estoque.
  - `StockModuleTabBar.tsx`: barra de abas navegável com scroll animado, botões de avanço e retrocesso e indicadores de foco.

### 3. Validações e Não-Regressão
1. **Suíte Completa de Impressão de Etiquetas do ERP**: **397/397 testes aprovados** em 34 arquivos (`src/pages/App/Stock/LabelPrinting`).
2. **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**: **352/352 testes aprovados** em 66 arquivos de teste.
3. **Suíte Móvel de Formulários (`npm run test:unit:mobile-forms --prefix erp`)**: **47/47 testes aprovados** em 5 arquivos de teste.
4. **Suíte de Inventário Móvel (`stock/inventory`)**: **42/42 testes aprovados** em 7 arquivos de teste.
5. **Suíte de Pedidos de Compra Móvel (`stock/purchases`)**: **4/4 testes aprovados**.
6. **Suíte de Notas Fiscais Móvel (`stock/invoices`)**: **14/14 testes aprovados**.
7. **Suíte de Compras do ERP (`Stock/Purchases`)**: **29/29 testes aprovados** em 4 arquivos.
8. **Suíte de Recebimentos do ERP (`Stock/Receipts`)**: **36/36 testes aprovados** em 8 arquivos.
9. **Verificação Mandatória de Invariantes Fiscais**:
   - **`FISCAL-016` (Zero CC-e)**: Varredura regex `\bcce\b|CC-e|Carta de Corre|cartadecorrecao` executada em todos os arquivos de estoque resultando em 0 correspondências.
   - **Formulários**: Todos os formulários preservam estritamente o uso de `react-hook-form` com `zodResolver`.

---

## Higienização de Artefatos de Teste e Defesa em Profundidade contra Vazamento de Registros Sintéticos

**Data:** 17/10/2026  
**Problema identificado e sintomas:**
1. **Presença de Pessoas de Teste nas Telas Operacionais (`public.people`)**: 24 registros sintéticos (18 clientes e 2 funcionários) estavam gravados na tabela `public.people`. Destes, 17 registros criados em 06/10 e 11/10 (incluindo `[HML NF TEST] 01` a `13`, `Cliente Pr Teste`, `TEST_AUT_NFE_HML_OPERATOR`, `playwright.test`) não possuíam metadado `testArtifact` no JSON e estavam ativos (`active = true, deleted = false`). O serviço de consulta do ERP (`personQueryService.ts` e `CustomerSearchModal.tsx`) não filtrava registros de teste, fazendo com que esses clientes e funcionários fictícios vazassem para a interface operacional da loja (`Cadastros > Clientes`, `Cadastros > Funcionários` e modal de busca de cliente em novas vendas).
2. **Produtos de Teste Vencidos no Catálogo (`public.products`)**: Os produtos `[HML NF TEST] P1` a `P5` (códigos `NFEHML26P1` a `NFEHML26P5`) foram cadastrados em 06/10 sem `is_test: true` em `technical_specs`, vazando para buscas de catálogo que dependiam exclusivamente do filtro PostgREST `NON_TEST_PRODUCT_ARTIFACT_FILTER`.
3. **Resíduos de Pedidos Cancelados de Fixtures (`public.orders`)**: 4 pedidos de fixtures de teste (`0dbb970d-...`, `386ef984-...`, `41e80be4-...`, `4d21e2ba-...`) estavam com `status = 'cancelled'` e 0 itens, não tendo sido marcados como excluídos após as execuções de testes sintéticos.

**Causa raiz técnica:**
- No backend/banco, as factories de testes antigas (anteriores a 12/10) inseriam pessoas e produtos sem preencher a metadata canônica `testArtifact` com `is_test: true`.
- No frontend, `personQueryService.ts` (`fetchAllPeopleRows`, `mapAndSortPeople`, `searchPeople`, `getRecentPeople`) e `CustomerSearchModal.tsx` confiavam apenas no status de soft delete (`deleted.eq.false,deleted.is.null`), sem implementar a camada de defesa em profundidade por `isIdentifiedTestArtifact` e identificadores canônicos de teste.

**Soluções técnicas implementadas:**
1. **Higienização Atômica no Supabase Remoto (`hkoxhourxwlddgsfdgws`)**:
   - **Pessoas (`public.people`)**: Soft-delete executado com sucesso em todos os 24 registros de teste (`deleted = true, active = false, deleted_at = NOW()`), respeitando os invariantes do trigger `guard_test_artifact_record` via contexto de sessão de administrador autenticado (`13eab361-be48-4e49-be4b-4ad79813b812` e `eccde09e-72d8-4efe-a387-eb34114dea39`). Total de clientes/funcionários de teste ativos restantes: **0**.
   - **Produtos (`public.products` e `product_variations`)**: Soft-delete e inativação de `NFEHML26P1` a `P5`, `004037`, `004039` e `004042` e de todas as suas variações de produto (`deleted = true, active = false`). Total de produtos de teste ativos restantes: **0**.
   - **Pedidos (`public.orders`)**: Marcação de `deleted = true` para os 4 pedidos de fixture cancelados e vazios. Os 5 pedidos válidos e estruturados da matriz de homologação (`#T-32f63cc6`, `#4347`, `#4348`, `#4349`, `#4350`) foram preservados 100% íntegros com `is_test = true` e dados tributários completos.
2. **Defesa em Profundidade no Frontend (`personQueryService.ts` e `CustomerSearchModal.tsx`)**:
   - Criação e exportação da função `isTestPerson` em [`erp/src/pages/utils/personService/personQueryService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/personService/personQueryService.ts), combinando `isIdentifiedTestArtifact` com expressões regulares de nomes de teste (`[HML NF TEST]`, `TEST_AUT_`, `playwright.test`).
   - Aplicação do filtro em `mapAndSortPeople` (quando `includeDeleted = false`), `searchPeople` e `getRecentPeople`, impedindo que qualquer registro de teste seja retornado pela API de frontend mesmo se reintroduzido no banco.
   - Aplicação de `isTestPerson` e `isTestOrder` na montagem do mapa de clientes em [`erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx).

**Validações e Não-Regressão:**
- **Zero registros de teste ativos**: `SELECT COUNT(*) FROM public.people WHERE ... AND deleted = false` = 0.
- **Zero produtos de teste ativos**: `SELECT COUNT(*) FROM public.products WHERE ... AND deleted = false` = 0.
- **Testes Unitários de Pessoas**: `npx vitest run erp/src/pages/utils/personService/personQueryService.test.ts` (6/6 aprovados).
- **TypeScript Check**: `npx tsc -p api/tsconfig.nfe.json --noEmit` (0 erros) e `npx tsc -p erp/tsconfig.fiscal.json --noEmit` (0 erros).
- **Suíte Fiscal Startup**: `npm run test:fiscal-startup --prefix erp` (12/12 handlers, WASM e XSD validados com código 0).
- **Suíte Fiscal Vitest NFE**: 842/842 testes aprovados em 76 arquivos (`src/pages/utils/nfe/`).
- **Formulários Mobile e Catálogo**: 100/100 testes aprovados (47 mobile + 53 catálogo).

---

## Auditoria Arquitetural e Modularização do Módulo de Estoque — Fase 4

**Data:** 17/10/2026  
**Problema identificado:**
Arquivos remanescentes do módulo de Estoque ainda concentravam centenas de linhas de lógica de orquestração mista, estado de drag-and-drop, sliders repetitivos e ações de I/O em componentes de interface:
1. `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx` (~806 linhas): misturava ciclo de vida de mapeamento de NF-e de entrada, buscas com debounce para fornecedores, produtos e produtos-pai, sugestões determinísticas e mutações com Zod.
2. `mobile/src/features/stock/invoices/screens/InvoicesScreen.tsx` (~398 linhas): acumulava métodos imperativos de I/O de XML (FileSystem e Web Blob), chamadas à SEFAZ, deleção e controle de múltiplos diálogos no corpo da tela.
3. `erp/src/pages/App/Stock/LabelPrinting/components/LabelQueue.tsx` (~451 linhas): misturava lógica de drag-and-drop, leitura assíncrona de arquivos com AbortController e RHF Zod, com um renderizador monolítico de cartões da fila.
4. `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelTestValuesModal.tsx` (~422 linhas): repetia 12 blocos de markup idênticos para sliders de dígitos de dezenas, centenas, milhares e preço anterior ("DE").

**Soluções técnicas implementadas:**
1. **`InboundInvoiceMappingsModal.tsx` (~806 linhas → ~226 linhas)**:
   - Criado o hook `useInboundInvoiceMappings.ts` em `mobile/src/features/stock/invoices/modals/inbound-mappings/`.
   - Isolamento da carga de detalhes da NF com vínculos persistidos, scoring determinístico com cache em memória, timers de busca debouncada e métodos de mutação transacional (`persist`, `chooseSupplier`, `createSupplier`, `linkProduct`, `removeLink`, `toggleLinkMode`, `saveQuickRegisteredProduct`).
2. **`InvoicesScreen.tsx` (~398 linhas → ~180 linhas)**:
   - Criado o hook `useInvoiceScreenActions.ts` em `mobile/src/features/stock/invoices/screens/invoices-screen/`.
   - Encapsulamento de `loadInvoiceDetails`, `downloadInvoiceXml`, `consultSefaz`, `importXml`, `confirmInvoiceDeletion` e `handleFetchXml`, tornando a tela estritamente declarativa.
3. **`LabelQueue.tsx` (~451 linhas → ~109 linhas)**:
   - Criada a subpasta `erp/src/pages/App/Stock/LabelPrinting/components/label-queue/`:
     - `useLabelQueueImageUpload.ts`: hook isolando leitura de imagens com `AbortController`, ciclo de vida do owner e `useZodForm(labelQueueImageUploadFormSchema)`.
     - `useLabelQueueDragDrop.ts`: hook de controle de arraste e reordenação de itens da fila de impressão.
     - `LabelQueueEmptyState.tsx`: componente apresentacional de fila vazia.
     - `LabelQueueCard.tsx`: componente de cartão da fila com miniatura interativa, paginação de fotos do produto, campo de busca de produto, quantidade com step e ajuste de escala de logotipo.
4. **`PriceLabelTestValuesModal.tsx` (~422 linhas → ~240 linhas)**:
   - Criada a subpasta `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-test-values/`:
     - `PriceLabelDigitSlider.tsx`: componente atômico reutilizável para inputs tipo slider (`range`) de dígitos 0-9 com suporte total a acessibilidade WCAG (`aria-label`, `aria-invalid`, `aria-describedby`).
   - Mapeamento declarativo dos sliders de Dezena, Centena, Milhar e Preço Anterior.

**Validações e Testes Executados:**
- **Suíte de Impressão de Etiquetas do ERP**: **397/397 testes aprovados** em 34 arquivos (`src/pages/App/Stock/LabelPrinting`).
- **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**: **352/352 testes aprovados** em 66 arquivos de teste.
- **Suíte Móvel de Formulários (`npm run test:unit:mobile-forms --prefix erp`)**: **47/47 testes aprovados** em 5 arquivos de teste.
- **Suíte de Inventário Móvel (`stock/inventory`)**: **42/42 testes aprovados** em 7 arquivos de teste.
- **Suíte de Notas Fiscais Móvel (`stock/invoices`)**: **14/14 testes aprovados** em 3 arquivos de teste.
- **Suíte de Compras do ERP (`Stock/Purchases`)**: **29/29 testes aprovados** em 4 arquivos.
- **Suíte de Recebimentos do ERP (`Stock/Receipts`)**: **36/36 testes aprovados** em 8 arquivos.
- **Suíte de Inventário do ERP (`Stock/Inventory`)**: **77/77 testes aprovados** em 13 arquivos.
- **Testes de Mapeamento de Entrada do ERP**: `ManageInboundInvoiceMappingsModal.test.tsx` (9/9) e `ManageInboundInvoiceMappingsModal.suggestions.test.tsx` (5/5).
- **Verificação de Invariantes Fiscais**:
  - `FISCAL-016` (Zero CC-e): 0 ocorrências no diff ou nos módulos auditados.
  - Formulários com Zod: Todos os formulários operam com `react-hook-form` e `zodResolver`.

---

## Auditoria Arquitetural e Modularização do Módulo de Estoque — Fase 5: Mobile Stock Components, Modals & Barrel Exports

**Data:** 17/10/2026  
**Problema identificado:**
No módulo móvel de estoque (`mobile/src/features/stock/`), diversos componentes e modais centrais concentravam lógica de apresentação, handlers de transição de modal, lifecycle de teclado, estilização inline volumosa e mapeamento de eventos em arquivos monolíticos (> 250 a 450 linhas). Além disso, a ausência de arquivos de barril (`index.ts`) em várias subpastas obrigava importações profundas e aumentava o acoplamento interno.

**Soluções técnicas implementadas:**
1. **Decomposição em Arquitetura Thin Wrapper + Content Presentation Component**:
   Para cada componente/modal que acumulava responsabilidades de ciclo de vida de modal e renderização profunda, aplicou-se o padrão Thin Wrapper + Content:
   - `mobile/src/features/stock/inventory/components/InventoryCard.tsx` (Thin Wrapper) + `InventoryCardContent.tsx`
   - `mobile/src/features/stock/inventory/components/InventoryStagesView.tsx` (Thin Wrapper) + `InventoryStagesViewContent.tsx`
   - `mobile/src/features/stock/inventory/screens/InventoryOperationScreen.tsx` (Thin Wrapper) + `InventoryOperationScreenContent.tsx`
   - `mobile/src/features/stock/inventory/modals/InventoryProductSearchModal.tsx` (Thin Wrapper) + `InventoryProductSearchModalContent.tsx`
   - `mobile/src/features/stock/inventory/screens/InventoryScopeScreen.tsx` (Thin Wrapper) + `InventoryScopeScreenContent.tsx`
   - `mobile/src/features/stock/invoices/components/InvoiceCard.tsx` (Thin Wrapper) + `InvoiceCardContent.tsx`
   - `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx` (Thin Wrapper) + `InboundInvoiceMappingsModalContent.tsx`
   - `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx`: decomposto com extração de `InboundItemFiscalDetails.tsx` (detalhes tributários/fiscais de NF de entrada) e `InboundItemSuggestionsCard.tsx` (sugestões determinísticas de correspondência de produto).
   - `mobile/src/features/stock/moves/components/StockMoveCard.tsx` (Thin Wrapper) + `StockMoveCardContent.tsx`
   - `mobile/src/features/stock/moves/modals/InventoryMoveEditModal.tsx` (Thin Wrapper) + `InventoryMoveEditModalContent.tsx`
   - `mobile/src/features/stock/moves/modals/InventoryMoveDeleteModal.tsx` (Thin Wrapper) + `InventoryMoveDeleteModalContent.tsx`
   - `mobile/src/features/stock/purchases/PurchaseFormModal.tsx` (Thin Wrapper) + `PurchaseFormModalContent.tsx`
   - `mobile/src/features/stock/purchases/PurchaseDetailsModal.tsx` (Thin Wrapper) + `PurchaseDetailsModalContent.tsx`
   - `mobile/src/features/stock/receipts/ReceiptCheckScreen.tsx` (Thin Wrapper) + `ReceiptCheckScreenContent.tsx`
   - `mobile/src/features/stock/suppliers/SupplierFormModal.tsx` (Thin Wrapper) + `SupplierFormContent.tsx`
   - `mobile/src/features/stock/suppliers/SupplierPurchaseHistoryModal.tsx` (Thin Wrapper) + `SupplierPurchaseHistoryModalContent.tsx`
   - `mobile/src/features/stock/unavailabilities/components/UnavailabilityCard.tsx` (Thin Wrapper) + `UnavailabilityCardContent.tsx`
   - `mobile/src/features/stock/unavailabilities/screens/UnavailabilitiesScreen.tsx` (Thin Wrapper) + `UnavailabilitiesScreenContent.tsx`
   - `mobile/src/features/stock/unavailabilities/modals/UnavailabilityFormModal.tsx` (Thin Wrapper) + `UnavailabilityFormContent.tsx`

2. **Criação de Barrel Exports (`index.ts`) Padronizados**:
   Criados arquivos de índice com exportações públicas organizadas em todas as subpastas de estoque móvel:
   - `mobile/src/features/stock/inventory/components/index.ts`
   - `mobile/src/features/stock/inventory/modals/index.ts`
   - `mobile/src/features/stock/invoices/components/index.ts`
   - `mobile/src/features/stock/invoices/modals/inbound-mappings/index.ts`
   - `mobile/src/features/stock/moves/components/index.ts`
   - `mobile/src/features/stock/moves/modals/index.ts`
   - `mobile/src/features/stock/purchases/index.ts`
   - `mobile/src/features/stock/receipts/index.ts`
   - `mobile/src/features/stock/suppliers/index.ts`
   - `mobile/src/features/stock/unavailabilities/components/index.ts`
   - `mobile/src/features/stock/unavailabilities/modals/index.ts`
   - `mobile/src/features/stock/unavailabilities/screens/index.ts`

3. **Invariantes e Conformidade de Produto**:
   - **`FISCAL-016` (Zero CC-e)**: Rigorosamente mantido. Nenhuma menção ou elemento de interface para Carta de Correção Eletrônica foi adicionado ou reintroduzido.
   - **Regra de Formulários RHF + Zod**: Todos os formulários continuam utilizando schemas explícitos em `shared-utils` com execução via `validateAndRun` e `useZodForm`.

**Validações e Testes Executados:**
- **Suíte Móvel Geral (`npm run test:unit:mobile --prefix erp`)**: **352/352 testes aprovados** em 66 arquivos de teste.
- **Suíte Móvel de Formulários (`npm run test:unit:mobile-forms --prefix erp`)**: **47/47 testes aprovados** em 5 arquivos de teste.



## Refatoração por princípios de programação (SRP, funções puras, early return) — fiscal/NF-e

**Problema:** `parseFiscalEmissionCommand` (≈220 linhas), a cadeia `if/else` de mensagens de erro em `emitNfeForOrder` e blocos inline em `useNfeEmissionActions` misturavam validação, mapeamento e apresentação, dificultando manutenção.

**Causa raiz:** crescimento incremental sem extração de responsabilidades.

**Arquivos alterados (sem mudança de contrato público, assinaturas ou textos):**
- `api/nfe/fiscalSnapshot.ts`: constantes `ALLOWED_COMMAND_FIELDS`/`PROOF_ALLOWED_KEYS` e funções `parsePreviewProofPayload`, `parseTransporterPayload`, `parseItemSelectionsAndOverrides`, `validateTransportRules`; `parseFiscalEmissionCommand` apenas orquestra. Mantida a ordem das validações e todas as mensagens.
- `erp/src/pages/utils/nfe/nfeService.ts`: tabela `EMISSION_CODE_MESSAGES` + função pura `resolveEmissionErrorMessage` (precedência preservada: conflito ativo → mensagem por código → blockers → error → xMotivo → padrão).
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`: helpers puros `isUuid` e `buildOrderWithFiscalItems`.

**Validações:** `tsc --noEmit` sem erros nos três arquivos; `npm run build:fiscal` OK (XSD/WASM carregados); testes `src/pages/utils/nfe` + `nfe-modal`: 962/964 aprovados. As 2 falhas (`useNfeEmission.test.tsx`: "permite emitir diretamente…" e "informa exatamente o CFOP faltante…") **são pré-existentes** — reproduzidas idênticas com as alterações revertidas via `git stash`.

**Invariantes:** FISCAL-016 (zero CC-e) preservado; nenhum campo arbitrário injetado em snapshots; nenhuma transmissão à SEFAZ realizada nesta etapa.

## NFH pela interface — matriz de cenários e autorização do modo teste local

- **Problema observado:** os testes reais de navegação e prévia XML de NFC-e 65/retirada passaram, mas o console da interface registrou HTTP 404 ao autorizar o operador de artefatos de teste.
- **Causa comprovada:** `scripts/local-fiscal-dev-server.cjs` só resolvia `/api/nfe/*`; o bundle local também não incluía `erp/api/testing/test-artifact-operator.ts`. Assim, o fallback não executava a política existente de administrador/identidade em Vercel Development.
- **Correção:** `erp/scripts/build-fiscal.cjs:21` inclui o handler de autorização no bundle `server/testing`; `scripts/local-fiscal-dev-server.cjs:19` valida o nome do módulo e resolve o bundle exato, e `:61` atende a rota de teste. As regras do handler, ownership, guards e snapshots permanecem preservadas.
- **Validação inicial:** `npm run build:fiscal --prefix erp` aprovado, 12/12 funções, handlers nativos e XSD/WASM. Playwright visível: navegação desktop, formulários em viewport móvel e prévia NFC-e 65/retirada aprovados (3/3). Demais cenários e reteste da autorização em execução; nenhuma transmissão nesta etapa inicial.

### Cancelamento fiscal elegível bloqueado por motivo nulo

- **Sintoma reproduzido pela UI:** no pedido de teste `d19d63cb-8658-49a9-951b-ddccab98f5da`, com NF-e HML 705, clicar em “Cancelar venda” mostrava “A consulta retornou consequências fiscais incompletas”, sem abrir confirmação.
- **Causa comprovada:** `/api/nfe/order-cancellation-policy` retornou HTTP 200, `action=cancel`, `hasAuthorizedInvoice=true`, `environment=2`, `model=55` e `reason=null`, representação válida do backend quando não há impedimento. O schema da resposta aceitava somente string/undefined em `reason`, inclusive nas operações em lote.
- **Arquivos/linhas:** `shared-utils/saleCancellationFormSchemas.ts:5,12,15` normaliza motivo nulo/ausente para undefined sem relaxar ação, ambiente, identificação ou campos obrigatórios; `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.test.tsx:52` acrescenta regressões da confirmação de documento único e lote com motivo nulo.
- **Prova local:** 35/35 testes em `CancelScheduledSaleButton`, `orderCancellationPolicyEndpoint` e `orderCancellationEffects` passaram. A confirmação continua aguardando ação do operador; resposta incompleta continua bloqueada; os testes não transmitem à SEFAZ. Reteste visível em andamento.
- **Reteste do servidor local:** login pelo formulário real e navegação retornaram HTTP 204 na rota de autorização do operador (duas chamadas); o 404 anterior foi eliminado.
- **Prova real pela interface:** após a correção, o modal abriu “Cancelamento fiscal disponível” com ambiente Homologação. Confirmação comercial/fiscal da NF-e 705 retornou HTTP 200, `success=true`, `cStat=135`, `pending=false`, protocolo `141260000636694`. A lista passou a exibir pedido cancelado, NFH cancelada e saída de estoque revertida; o detalhe/Eventos mostrou `110111` registrado. Evidência visual local: `output/playwright/nfh-705-cancelada.png`. Não houve operação fiscal de Produção.
- **Regressão do fallback:** `scripts/testing/local-fiscal-dev-server.test.cjs:5` passou em Node, exercitando a rota real com 405 (GET), 401 (POST sem sessão), 403 fora de Development e 404 para nome de módulo com traversal.

### Rascunho de estorno com identidade/XML da origem e revisão inacessível

- **Prova pela interface:** NFC-e HML 647 (`8f236b07-04d5-4578-8cff-52c3e1009d18`, execução `c4ffe068-8423-4aef-acd8-d0269f249e29`, ownership conferido) fora de 30 minutos encaminhou corretamente o cancelamento comercial para `action=estorno`. A transação comercial foi confirmada e `/api/nfe/operation-drafts` retornou sucesso; NFH original preservada e badge NFE de revisão criado. A tentativa anterior feita no runId diferente foi bloqueada pelo guard local sem gravação, conforme consulta posterior do pedido ainda `scheduled`; não foi removido nenhum guard.
- **Falha reproduzida:** detalhes do rascunho exibiam “NF-e de Estorno Fiscal nº 647”, “VENDA DE MERCADORIA”, finalidade normal e chave artificial `ESTORNO-...`, usando XML/protocolo da NFC-e original. Não havia ação para continuar a revisão nesse modal.
- **Causa:** `api/nfe/document-details.ts` preenchia os dados fiscais ausentes do rascunho com a identidade e XML da origem. O modal tratava o resultado como documento emitido e preparava seus arquivos de DANFE.
- **Correção:** detalhes usam somente a chave/numeração/XML/protocolo próprios do rascunho; a origem é uma referência separada. Falhas na leitura de documento já emitido exigem reconciliação em vez de sintetizar autorização. Estados `draft`/`ready` são apresentados como rascunho em revisão, sem exportar o documento de origem. “Revisar estorno fiscal” abre o modal existente, mantendo RHF/Zod, confirmações e validações do backend. Erro ao preparar DANFE passa a exibir “DANFE indisponível”.
- **Arquivos:** `api/nfe/document-details.ts` (leitura/identidade e referência de origem); `erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts` (`FiscalOperationDraftSummary.sourceDocument`); `services/fiscalDocumentsService.ts` (validação da referência); `modals/IssuedFiscalDocumentDetailsModal.tsx` (rascunho, arquivos e continuidade da revisão); `erp/src/pages/utils/nfe/__tests__/documentDetailsDraft.test.ts` (4 regressões); `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx` (regressão da abertura da revisão).
- **Prova inicial:** 30/30 testes em endpoint/detalhes/formulários fiscais passaram; TypeScript fiscal ERP aprovado antes dos novos testes. Reteste real da revisão em andamento. Não houve nova emissão de estorno nesta etapa.
- **Reteste visível:** rascunho da NFC-e 647 passou a exibir “Rascunho em revisão”, origem separada e botão “Revisar estorno fiscal”. O modal real carregou os itens/tributos e manteve a transmissão desabilitada antes de salvar a revisão. Não existe CFOP inverso aprovado configurado para o item original `5101`; solicitada a definição fiscal ao operador, mantendo o rascunho sem transmissão.
- **Menu após cancelamento:** a mudança de status desmontava o formulário de confirmação antes de seu callback fechar o menu; o backdrop continuava interceptando cliques. `OrderOptionsMenu.tsx:54` fecha o menu quando a identidade/status muda. Regressão em `OrderCardAndMenuActions.test.tsx` cobre fechamento e reabertura das opções de duplicação do pedido cancelado.

### Devolução HML com identidade canônica e geração da imagem do DANFE

- **Contexto/prova real:** pedido sintético `f4d2b8ac-8ee7-4d94-b325-6df63b82c9c8` (execução `cb2bc132-8bc3-487d-9831-cf0f04cc7a96`, cenário `nfe55_sale`, ownership conferido) foi validado pelo wizard real: manuseio, retirada imediata e pagamento. Status `fulfilled` e metadata canônica `is_test/testArtifact` conferidos após salvar. Prévia mostrou modelo 55, `tpAmb=2`, CFOP `5101`, consumidor final. Emissão pelo botão HML autorizou NF-e **708**, protocolo **141260000636723**. Cancelar venda após circulação abriu corretamente “Devolução comercial necessária”, preservando original.
- **Falha de saldo reproduzida:** `/api/nfe/return-capacity` retornou 409 “Identificação do ambiente de teste incompleta” para metadata canônica válida. Causa: endpoint exigia exclusivamente `test_environment/testRunId` antigos. `api/nfe/return-capacity.ts` passou a reutilizar a identidade canônica compartilhada e exigir owner igual ao operador autorizado; metadata inválida não cai em Produção nem usa fallback legado. Compatibilidade de leitura histórica preservada. Duas regressões em `returnCapacityEndpoint.test.ts`; 21 testes de capacidade/modal passaram.
- **Falha de DANFE reproduzida:** NF-e autorizada exibiu “Não foi possível montar a imagem do DANFE”. `fiscalDanfeXmlService.ts` anexava o iframe vazio antes de atribuir `srcdoc`; o evento `load` de about:blank podia liberar a consulta antes do HTML fiscal. O iframe agora recebe HTML antes de ser anexado e fica apenas fora da tela, sem `visibility:hidden` que impediria a renderização. Regressões dos modelos 55/65 em `fiscalDanfeShareFile.test.ts`; reteste visual em andamento.
- **Reteste real do DANFE:** NF-e 708 passou a mostrar “Compartilhar DANFE” habilitado após gerar a imagem. Nenhuma mensagem foi enviada; o navegador possui compartilhamento nativo e o seletor externo não foi acionado. Evidência: `output/playwright/nfh-708-danfe-pronto.png`. Duas regressões de iframe/modelo aprovadas.
- **Bloqueio adicional no PostgreSQL:** a UI com quantidade válida chegou a `create_return_order_with_fiscal_capacity`, que rejeitou a metadata canônica com “Devolução HML exige pedido de venda identificado como teste de homologação”. Consultada a definição vigente no projeto `hkoxhourxwlddgsfdgws`: fingerprint `a630ccfd4306d32117f3a6175f480f41`, assinatura `(text,jsonb,jsonb,jsonb,jsonb)`. Causa comprovada: validação/replay da RPC ainda leem `testRunId/test_environment` antigos.
- **Migration aplicada:** `supabase/migrations/20261018021813_canonical_hml_fiscal_return_identity.sql:1` (nome criado pelo CLI e alinhado à versão efetivamente registrada pelo MCP) adiciona somente uma ponte de compatibilidade na RPC atual, com hash contra drift. Reutiliza `assert_test_artifact_identity` (administrador autenticado e owner), exige identidade igual entre venda/devolução e recusa marcadores legados divergentes. Os aliases legados são criados na variável local da venda e no payload da nova devolução, preservando metadata canônica; a venda original não é reescrita pela migration. Corpo de capacidade/replay/locks e ACLs permanecem. Reversão: nova migration removendo exclusivamente o bloco marcado `CANONICAL_HML_RETURN_IDENTITY_V1`, após interromper novas devoluções canônicas; registros/documentos já confirmados devem ser preservados.
- **Validação remota:** catálogo confirmou `SECURITY DEFINER` e ACLs preexistentes preservados, sem grant a anon/PUBLIC. Hash da venda e hash do XML/protocolo 708 permaneceram idênticos após DDL. Após o ajuste, a UI cadastrou a devolução **`ced7fdf0-7942-4cbb-aa61-5f34d0226727`**, HTTP 200, `fulfilled`, entrada de estoque confirmada, uma alocação de quantidade 1 e identidade da mesma execução/owner. `supabase/tests/canonical_hml_return_identity.sql` passou **7/7** provas pgTAP em `BEGIN ... ROLLBACK`, usando replay de registro próprio já existente: owner/run divergentes e ambiente legado divergente bloqueados, sem duplicar estoque e preservando XML/protocolo da origem. Nenhuma fixture foi criada pelo SQL. Advisors de segurança retornaram seis grupos de alertas do projeto; nenhum associado à RPC alterada.
- **Rota fiscal ausente:** ao abrir o menu da devolução confirmada, a UI recebeu 404 em `/api/nfe/return-fiscal-eligibility`. O handler existia no código mas não integrava bundle, dispatcher nem rewrite. Incluído em `erp/scripts/build-fiscal.cjs`, `erp/api/nfe/auxiliary.ts` e `erp/vercel.json`; `erp/scripts/check-fiscal-startup.cjs` passa a exigir o caminho e sua allowlist. Não foi criada nova Vercel function.
- **Emitente descartado na devolução fiscal:** o menu encontrou a origem autorizada, mas a elegibilidade acusou CNPJ ausente porque a presença de `fiscalDefaults` fazia o leitor descartar `companyCnpj/companyUF/companyCRT` na raiz de `settings.data`. `api/nfe/returnFiscalRules.ts` centraliza a leitura com precedência da configuração raiz e `api/nfe/return-fiscal-eligibility.ts` reutiliza o leitor, exibindo a causa real do bloqueio. A regressão cobre configuração com e sem `fiscalDefaults`; 46 testes de regras/transmissão/formulários passaram. Reteste de interface em andamento.
- **Reteste fiscal concluído:** a UI preparou o rascunho da devolução confirmada, permitiu somente CFOP `1201` para a origem `5101`, exigiu as duas confirmações de revisão e habilitou transmissão somente depois de salvar. A SEFAZ HML autorizou a NF-e **709**, protocolo **141260000636726**, `cStat=100`. Reabrir o menu passou a oferecer “Visualizar NF-e autorizada”, sem preparar segunda nota. Evidência: `output/playwright/nfh-709-devolucao-autorizada.png`.
- **Indicador da devolução escondido:** `OrderHistoryRow.tsx` e `OrderHistoryCard.tsx` excluíam explicitamente NFD quando `orderType=return`, exibindo em seu lugar NF de saída não emitida com ação de Produção. Os componentes agora exibem a NFD persistida também na devolução e reservam NF/NFH/NFE de saída para os demais pedidos. `OrderHistoryTable.test.tsx` cobre tabela/card, ausência da ação de saída e abertura da nota no ambiente 2. Validação em andamento.
- **Manutenção das provas:** a suíte ampliada inicial passou 1028 testes e apontou duas expectativas antigas no modal de emissão (prévia administrativa restaurada e CFOP recomposto automaticamente pela matriz), uma espera de alerta sensível à concorrência e ausência do binário nativo `canvas.node` no ambiente jsdom. A investigação confirmou que `NfeItemsSection` recompõe o CFOP aprovado após limpar a busca; o teste agora prova o valor transmitido e sua exibição ao perder foco, sem alterar essa regra. O teste do parser XML utiliza Node e o `DOMParser` da dependência existente `@xmldom/xmldom` (happy-dom não implementa a busca de namespace necessária), sem instalar dependência. Reteste focado: **76/76**, incluindo parser, emissão e tabela/card.

## Matriz E2E HML pela interface — NF-e 55 (cenários 3 e 4) e fechamento da matriz

**Execução:** Playwright (`run-fiscal-e2e-in-env.cjs hml … --authorize-hml-transmission`), exclusivamente pela UI do ERP, `tpAmb=2`, emissor Móveis Morante, SEFAZ-PR. Nenhuma transmissão por script/HTTP direto. Produção não tocada.

| Cenário | Modelo | Pedido | Nº | Protocolo (cStat 100) | Chave | Observação |
|---|---|---|---|---|---|---|
| `nfce65_pickup` | 65 | `8f236b07-04d5-4578-8cff-52c3e1009d18` | 647 | 141260001749051 | 41261044512248000107650010000006471984765280 | retirada |
| `nfce65_delivery` | 65 | `d876abbc-3c43-4077-b001-c7287a04c479` | 648 | 141260001749052 | 41261044512248000107650010000006481634924360 | entrega, `indPres=4` |
| `nfe55_sale` | 55 | `d19d63cb-8658-49a9-951b-ddccab98f5da` | 705 | 141260000636687 | 41261044512248000107550010000007051862896820 | `modFrete=4`, `indPres=1`, `indFinal=1` |
| `nfe55_delivery_own_transport` | 55 | `b735d9c4-3fdd-49b1-8781-e3d1bc0b7cac` | 707 | 141260000636690 | 41261044512248000107550010000007071545832869 | `modFrete=3`, `indPres=9`, `indIntermed=0` |

Persistência confirmada em `nfe_documents` (status `homologada`, `xml_protocolo` com `cStat 100`, snapshot íntegro validado pelo próprio spec). Os cenários 1–2 foram autorizados em rodada anterior; 3–4 em rodadas posteriores (UUIDs de run distintos).

### Problemas encontrados e corrigidos
1. **Rej. 696 (indIEDest=9 com indFinal=0)** — causa: cenário provisionado como revenda para não contribuinte. Correção: cenários NF-e 55 provisionados como PF não contribuinte, `finalConsumer=true` (RV E16a-40).
2. **Rej. 900 (dVenc ausente em `<dup>`)** — causa: pagamento `Pendente` sem vencimento. Correção: pagamento `PAGO` com `dueDate` futuro no provisionamento.
3. **Rej. 234 (IE não vinculada ao CNPJ)** — causa: CNPJ/IE sintéticos; SEFAZ-PR confere o cadastro real mesmo em HML. Correção: abandonado contribuinte sintético; usa-se PF.
4. **Bloqueio `OTHER_FISCAL_REQUIREMENT`** — `api/nfe/normalSaleRuleSet.ts` (≈L121-125): condição passa a aceitar `ieIndicator==='1' || contextData.otherFiscalRequirement===true` (antes exigia `!== true`, tornando o flag inutilizável).
5. **Rej. "NFe sem indicativo do intermediador"** (cenário 4, doc de teste #706, status `erro`) — causa: `api/nfe/fiscalXmlSerializer.ts` não emitia `indIntermed`; NT 2020.006 (B25c) exige para NF-e 55 com `indPres` 2/3/4/9. Correção (≈L142-152): emite `<indIntermed>0</indIntermed>` logo após `indPres` (posição do XSD), somente modelo 55 (canal próprio = 0). NFC-e 65 inalterada. Documento #706 permanece como histórico imutável da rejeição.
6. **Provisionamento** — `scripts/testing/provision-matrix-run.cjs`: `otherFiscalRequirement` persistido em `fiscalContext`; pagamento `PAGO`; PF não contribuinte nos cenários 55.

### Validações
`npm run test:unit --prefix erp -- src/pages/utils/nfe`: 76 arquivos aprovados; `npm run build:fiscal --prefix erp` OK (XSD/WASM); E2E dos cenários 3 e 4: 3/3 testes cada. Pendência pré-existente e não relacionada: 2 testes de `useNfeEmission.test.tsx` já falhavam antes (confirmado via `git stash`).

**Invariantes:** FISCAL-016 (zero CC-e), isolamento HML, XSD validado antes do envio e snapshot sem campos arbitrários preservados.
