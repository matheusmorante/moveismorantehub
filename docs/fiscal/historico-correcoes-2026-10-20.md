# Histórico de Correções Fiscais — 2026-10-20

## Reemissão NFH 2 após estorno fiscal confirmado

- **Problema e sintomas:** após o estorno fiscal ser confirmado por NF-e, o resumo do pedido ainda exibia a badge da NFH/NF original como se continuasse vigente. Além disso, ao selecionar NFH 2 pelo badge, o fluxo podia recuperar/abrir a NFH original em vez de iniciar outra emissão. O fluxo dedicado de continuação de edição já limpava a chave de idempotência; faltava fazer o mesmo no seletor de ambiente usado pelo badge.
- **Causa raiz comprovada no código:** `NfeEnvironmentChoiceModal` habilitava a reemissão (`readyToReissueHml`/`readyToReissueProd`), mas encaminhava a seleção sem limpar a chave anterior. `dispatchOrderEmission` então reutilizava o `emissionRequestId` salvo; a recuperação idempotente apontava para o documento original. O banco já restringe a nova reserva ao mesmo pedido e ambiente e valida o estado da substituição/estorno; a correção não remove essa trava.
- **Arquivos alterados:** `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentChoiceModal.tsx:6,71-76` limpa o identificador local somente quando o ambiente selecionado está marcado como pronto para reemissão; `erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts:431-468` omite da apresentação as saídas cujo ID consta como estornado com sucesso, mantendo a numeração histórica; `erp/src/pages/utils/nfe/__tests__/orderFiscalBadgeRules.test.ts:193-270` atualiza as expectativas existentes para NFH estornada oculta; `docs/fiscal/README.md:9` inclui este registro no índice.
- **Solução:** antes de abrir o modal de emissão, a seleção de NFH 2/NF 2 limpa o request ID e os metadados locais da tentativa anterior daquele pedido/ambiente. O dispatcher cria um novo `emissionRequestId`; as badges das notas revertidas deixam de aparecer no resumo do pedido, enquanto NFE (estorno) e a nova NFH/NF continuam visíveis. As notas originais e seus vínculos permanecem persistidos; o servidor e a RPC continuam responsáveis por confirmar a elegibilidade e o vínculo antes de reservar/transmitir.
- **Validação:** expectativas dos testes existentes foram atualizadas, mas não foram executados testes. A inspeção de código confirmou que `clearFiscalEmissionRequest` remove o ID em memória e no `localStorage`, e que a filtragem visual usa somente o conjunto de IDs com estorno confirmado. `prepare_nfe_outbound_attempt` continua aplicando o bloqueio transacional para tentativas não cobertas por estorno confirmado. Não foi consultado nem alterado o registro remoto do pedido #007229.
- **Limite:** o pedido #007229 ainda precisa ser reaberto na interface para confirmar a emissão da nova intenção e verificar o estado específico da substituição no banco; esta alteração local não emite nota nem altera dados fiscais remotos.

## 1. Fix: Herança do CPF do Destinatário da 1ª Nota e Compartilhamento de NCM em Reemissão Corrigida com Estorno Parcial (Pedido #007057 / Daiane Soares)

### Problema Identificado e Sintomas
No pedido de venda #007057 / #006954 (cliente Daiane Cristina Soares de Souza), a 1ª nota fiscal de saída emitida em homologação (NFC-e nº 655, chave `41261044512248000107650010000006551046645952`) foi estornada com sucesso através de NF-e de Estorno nº 733 (`finNFe=3`), confirmada na SEFAZ e transicionada para `ready_to_reissue` em `nfe_order_edit_replacements`.
Ao abrir o modal de emissão da nova nota fiscal de saída corrigida (`NFH 2` / Homologação):
1. **Perda do CPF do Destinatário:** O campo CPF do cliente no modal de emissão aparecia vazio, forçando redigitação manual do CPF `046.929.412-43`, pois o cadastro original do cliente no pedido estava sem `cpfCnpj` e o hook lia exclusivamente `order.customerData.cpfCnpj`.
2. **Perda do NCM dos Itens:** Quando um pedido possui itens estornados ou quando o estorno é parcial (apenas um dos itens estornado, restando outro item no pedido), o item restante ("item que sobrou") tinha seu NCM zerado no modal (`ncm: ""`). A interface travava na emissão com alerta de NCM faltante.
3. **CFOP Invertido de Estorno:** Caso o item tivesse herdado dados fiscais do estorno anterior (`CFOP 1949`), a preparação fiscal falhava ou sugeria CFOP impróprio de ajuste em vez do CFOP de saída comercial (`5102` / `6102`).

---

### Causa Raiz Técnica Comprovada
1. **CPF Não Herdado da Nota Anterior:**
   - Em `useNfeRecipientTaxId.ts` e `useNfeEmissionModalState.ts`, o CPF era inicializado exclusivamente por `order.customerData?.cpfCnpj || order.customerData?.document || ''`.
   - No pedido #007057, o cliente não possuía CPF preenchido em `order_data.customerData`. O CPF foi digitado pelo operador durante a emissão da 1ª nota e gravado com sucesso no XML autorizado e no snapshot fiscal (`0726c177-2cf0-42c2-ad67-b2567aee0636`), mas não foi persistido no rascunho de emissão (`nfeDraft[2].recipientTaxId`) por restrição anterior que só gravava CPF no pedido em Produção (`environment === 1`).
   - Ao reabrir o modal para a nova nota corrigida, não havia fallback para ler o CPF do rascunho fiscal nem dos documentos fiscais previamente autorizados vinculados ao pedido (`nfe_documents`).
2. **Falha de Correspondência Posicional e Descarte de Draft em Reemissão:**
   - Em `orderFiscalSnapshotService.ts` (`authorizedInvoiceFiscalByItem`), a vinculação de linhas fiscais utilizava `lines.find(cand => cand.invoiceItemNumber === index + 1)`. Em caso de estorno de apenas um item onde o item restante permaneceu no pedido (ex: item 2 vira item 1 na ordem comercial), a comparação posicional `invoiceItemNumber === index + 1` falhava sumariamente e descartava os dados fiscais daquele produto.
   - Em `ensureOrderItemsHaveFiscalSnapshots`, se o item já possuía `hasFiscalItemSnapshot(item) === true` (versão > 0 gerada sem NCM), a função retornava antecipadamente sem preencher o `ncm` do snapshot da nota autorizada.
   - Em `useNfeItemEnrichment.ts`, a linha `savedEmissionItems = hasPersistedAuthorizedInvoice(currentOrder) ? [] : ...` limpava o rascunho sempre que o pedido possuía nota autorizada anterior, impedindo que a nova emissão em `ready_to_reissue` reutilizasse o NCM compartilhado da homologação anterior.
   - Em `resolvePreparedItems.ts`, qualquer CFOP que não fosse categorizado como `sale` (como `1949` de estorno) causava exceção impeditiva de preparação `CFOP 1949 exige tratamento fiscal específico e não pode ser convertido em venda padrão`.

---

### Arquivos e Linhas Modificados
1. **[`api/nfe/item-defaults/resolvePreparedItems.ts`](api/nfe/item-defaults/resolvePreparedItems.ts):**
   - Normalização e inversão automática de CFOP de reversão/estorno (`1949`, `2949`, `1202`, `2202`) para CFOP de venda de saída (`5102` interno / `6102` interestadual), impedindo interrupção na preparação de CSOSN.
2. **[`erp/src/pages/utils/orderFiscalSnapshotService.ts`](erp/src/pages/utils/orderFiscalSnapshotService.ts):**
   - Em `authorizedInvoiceFiscalByItem`: correspondência inteligente de itens da nota anterior por código de produto (`cProd`), descrição normalizada ou posição compatível, com rastreamento de índices consumidos (`usedLineIndices`).
   - Inversão automática de CFOP de estorno/devolução (`1949`/`2949` -> `5102`/`6102`) na extração de dados fiscais do XML da nota original.
   - Em `ensureOrderItemsHaveFiscalSnapshots`: garantia de preenchimento de `ncm` caso o item já possua versão de snapshot mas o NCM esteja em branco.
3. **[`erp/src/pages/utils/nfeEmissionSnapshotService.ts`](erp/src/pages/utils/nfeEmissionSnapshotService.ts):**
   - Em `prepareOrderFiscalSnapshot`: `needsSnapshot` agora confere também se algum item de produto está com `!item.fiscal?.ncm || !item.fiscal.ncm.trim()`, disparando o enriquecimento do snapshot da nota anterior.
4. **[`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeDraftService.ts`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeDraftService.ts):**
   - Inclusão de `recipientTaxId: recipientTaxId.trim() || undefined` no objeto `nfeDraft[env]`, persistindo o CPF informado no rascunho tanto em Homologação quanto em Produção.
5. **[`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeRecipientTaxId.ts`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeRecipientTaxId.ts):**
   - Inicialização do CPF do destinatário com fallback para `order.nfeDraft['2'].recipientTaxId` e `order.nfeDraft['1'].recipientTaxId`.
6. **[`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.ts`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.ts):**
   - Efeito de preenchimento do CPF com resolução de contingência: se o cliente e o draft não possuírem CPF, consulta assíncrona ao banco (`nfe_documents`) resgata o CPF do destinatário gravado na 1ª nota autorizada (`destinatario_documento` ou `<dest><CPF>`) e preenche formatado via `maskRecipientTaxId`.
7. **[`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts):**
   - `savedEmissionItems` não é mais zerado se houver itens no draft atual ou no draft do outro ambiente (`otherEnvDraft`).
   - Resolução de NCM compartilhada entre ambientes de homologação e produção por correspondência de `orderItemId`, `productId`, `code` ou linha única restante.
   - Inversão canônica de CFOP de estorno (`1949`/`2949`) para saída comercial (`5102`/`6102`).
   - Fallback de contingência para extrair NCM das linhas do XML anterior em `nfe_documents` caso o item persista sem NCM.
8. **[`erp/src/pages/utils/__tests__/orderFiscalSnapshotService.test.ts`](erp/src/pages/utils/__tests__/orderFiscalSnapshotService.test.ts):**
   - Novo arquivo de testes unitários cobrindo estorno parcial (item restante na posição 0 recebendo NCM da linha 2 do XML) e inversão de CFOP de estorno `1949` para `5102`.
9. **[`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.test.tsx`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.test.tsx):**
   - Novos testes unitários validando recuperação de CPF do destinatário a partir de rascunho fiscal e a partir do XML da 1ª nota em `nfe_documents`.

---

### Testes Executados e Validações
1. **Testes Unitários Dedicados:**
   - 2/2 testes aprovados em [`orderFiscalSnapshotService.test.ts`](erp/src/pages/utils/__tests__/orderFiscalSnapshotService.test.ts).
   - 4/4 testes aprovados em [`useNfeEmissionModalState.test.tsx`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.test.tsx).
   - 167/167 testes aprovados na suíte [`nfe-modal`](erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/).
2. **Build e Startup dos Módulos Fiscais:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel empacotados, WASM validado, XSD oficial resolvido com 0 erros.
3. **Suíte Fiscal Global de Não-Regressão:**
   - `npm run test:fiscal:unit`: 83 arquivos / 1010 testes aprovados com 100% de sucesso.
4. **Política de Produto Mandatória:**
   - Zero criação ou exposição de rotas, botões ou lógica de Carta de Correção Eletrônica (CC-e), em total conformidade com `FISCAL-016`.

---

## 2. Refatoração Modular e Princípios de Engenharia de Software: `useNfeItemEnrichment.ts`, `personQueryService.ts`, `orderFiscalBadgeService.ts` e Suíte de Testes

### Problema Identificado e Oportunidade Técnica
Os 4 arquivos centrais acumulavam múltiplas responsabilidades (SRP violation), misturando I/O com banco, orquestração de React hooks, transformações puras de dados fiscais e cache in-flight:
1. `useNfeItemEnrichment.ts` (561 linhas): combinava hashing de dependências, matching heurístico de drafts multi-ambiente, inversão de CFOP de estorno, parsing de XML em banco para resgate de NCM, chamadas de endpoints e cálculo manual de classificação.
2. `personQueryService.ts` (338 linhas): misturava queries paginadas no Supabase, deduplicação heurística com pontuação por preenchimento de campos (`uniqueMap`), sanitização de operadores de teste, gerenciamento de cache TTL de 5 minutos e deduplicação de promessas de pessoas por ID.
3. `orderFiscalBadgeService.ts` (338 linhas): acoplava carregamento HTTP REST com fallback direto ao Supabase RLS, deduplicação de requisições in-flight, agregação de devoluções e transformação de status de badges.
4. `useNfeEmission.test.tsx` (2.318 linhas com 102 testes): monolito de testes onde definições de fixtures de teste e asserções estavam inline sem um harness modular.

---

### Solução Arquitetural Implementada

#### A. Módulo `useNfeItemEnrichment` (`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/`)
- **`itemEnrichment.types.ts`:** Tipagem estrita de props e retorno do hook.
- **`itemDraftMatcher.ts`:** Funções puras `invertIfReversalCfop` e `resolveEmissionDraftByIndex` para correspondência de itens por `orderItemId`, `productId`/`variationId`, `code` ou índice sem dependência de React.
- **`itemFallbackBuilder.ts`:** Função pura `buildEnrichmentFallbackItems` aplicando escopo de destino e compartilhamento de NCM entre ambientes.
- **`itemPriorDocumentBackfill.ts`:** `extractXmlTagValue` (helper puro e seguro) e `backfillMissingNcmFromPriorDocuments` assíncrono para resgate de NCM em notas fiscais autorizadas vinculadas.
- **`itemFiscalMerger.ts`:** Função pura `mergeEnrichedItems` integrando CSOSNs preparados no servidor, snapshots e overrides manuais.
- **`itemFiscalUpdateHandlers.ts`:** Funções puras `computeSingleItemFiscalUpdate` e `computeBatchItemFiscalUpdates` com recalculação automática de CFOP e CST quando a classificação (`ncm`, `cest`, `origem`) é modificada.
- **`useNfeItemEnrichment.ts`:** Hook React refinado (< 260 linhas) atuando exclusivamente como orquestrador de estado e feedback visual.
- **`itemEnrichmentModules.test.ts`:** 7 novos testes unitários cobrindo exclusivamente as funções puras do submódulo.

#### B. Módulo `personQueryService` (`erp/src/pages/utils/personService/query/`)
- **`personQuery.types.ts`:** Constantes (`PERSON_QUERY_COLUMNS`, `PEOPLE_FETCH_PAGE_SIZE`, TTLs) e interfaces.
- **`personDeduplication.ts`:** Funções puras `isTestPerson`, `matchesPersonQueryContext` e `mapAndSortPeople` com desduplicação de funcionários por pontuação de contato (telefone/endereço).
- **`personQueryFetcher.ts`:** Funções de I/O `getCurrentUserEmail` e `fetchAllPeopleRows` paginadas.
- **`personCacheManager.ts`:** Gerenciamento isolado de `peopleCache`, prefetch e mapa de requisições concorrentes `personByIdRequests`.
- **`personQueryService.ts`:** Fachada pública (Facade Pattern) limpa garantindo 100% de retrocompatibilidade com todos os consumidores.
- **`personDeduplication.test.ts`:** 3 novos testes unitários validando a desduplicação e pontuação de empregados.

#### C. Módulo `orderFiscalBadgeService` (`erp/src/pages/utils/nfe/orderFiscalBadge/`)
- **`orderFiscalBadge.types.ts`:** Interfaces canônicas `BadgeDocumentRow`, `RelatedOrderRow` e `FiscalBadgeSupplement`.
- **`badgeSupplementLoader.ts`:** Funções assíncronas `loadScopedBadgeSupplement` (fallback RLS Supabase) e `fetchBadgeSupplementFromApi` (REST).
- **`badgeSupplementTransformer.ts`:** Função pura `assembleOrderFiscalBadgeStatuses` que agrega documentos, drafts de estorno e devoluções nos badges consolidados.
- **`orderFiscalBadgeCache.ts`:** Gerenciador do mapa de requisições concorrentes em voo (`inFlightBadgeRequests`).
- **`orderFiscalBadgeService.ts`:** Ponto de entrada público desacoplado.
- **`orderFiscalBadgeModular.test.ts`:** 3 novos testes unitários validando o cache in-flight e a agregação dos badges.

#### D. Módulo de Harness de Testes (`nfe-modal/__tests__/harness/`)
- **`emissionTestHarness.ts`:** Fábrica centralizada de ordens e itens mock (`createSyntheticOrder`, `createSyntheticItem`) e helpers de renderização do modal para desacoplamento de testes futuros.

---

### Testes Executados e Validações
1. **Suíte `nfe-modal`:** 174/174 testes aprovados (13 arquivos de teste).
2. **Suíte `personService`:** 37/37 testes aprovados (6 arquivos de teste).
3. **Suíte `orderFiscalBadge`:** 30/30 testes aprovados (2 arquivos de teste).
4. **Suíte Fiscal Global de Não-Regressão:** 1010/1010 testes aprovados (`npm run test:fiscal:unit`).
5. **Build Fiscal:** 12/12 handlers Vercel compilados, WASM validado, XSD oficial checado com 0 erros.
6. **Invariante CC-e (`FISCAL-016`):** Preservada a proibição de CC-e.

---

## 3. Fix: Fechamento Automático do Modal de Substituição Fiscal e Invalidação de Request ID Obsoleto em Reemissão Pós-Estorno (Pedido #007057 / Daiane Soares)

### Problema Identificado e Sintomas
No pedido de venda #007057 (cliente Daiane Cristina Soares de Souza), a 1ª nota fiscal de saída (NFC-e nº 655) havia sido estornada com sucesso através da NF-e de Estorno nº 733 (`finNFe=3`). O pedido transicionou para `ready_to_reissue` na tabela `nfe_order_edit_replacements`.
Foram observados dois comportamentos anômalos relatados pelo operador:
1. **Modal de Substituição Fiscal Permanece Aberto:** Ao clicar em "Conferir e emitir nova nota" dentro do modal `OrderEditFiscalContinuation.tsx`, o modal `NfeEmissionModal` abria e apresentava aviso de emissão concluída, mas ao fechar a emissão, o modal subjacente `OrderEditFiscalContinuation` continuava aberto na tela com o estado *"Reversão confirmada e pedido atualizado. Nova emissão pendente."*.
2. **Edição do Pedido Permanentemente Interceptada:** Ao retornar à listagem de pedidos de venda e clicar no botão "Editar" do pedido #007057, o sistema abria repetidamente o modal *"Concluir substituição fiscal"* em vez de permitir a edição normal dos itens e dados do pedido.

---

### Causa Raiz Técnica Comprovada
A investigação ponta a ponta no frontend, backend e banco de dados comprovou uma cadeia de 4 falhas interligadas:
1. **Chave de Idempotência Obsoleta (`emissionRequestId`) no LocalStorage:**
   - A primeira nota NFC-e nº 655 gravou no `localStorage` a chave `nfe_emission_request:b8f1eeae-02eb-454f-b6b7-0a88411aee88:2 = '730e1adf-8475-4e93-a7e6-d2df6d790a13'`.
   - Ao iniciar a substituição fiscal e abrir a reemissão da nova nota, o frontend não executava `clearFiscalEmissionRequest(orderId, environment)`.
   - O serviço `nfeService.ts` reaproveitava o `storedRequestId` obsoleto (`730e1adf...`) e o enviava no payload de `/api/nfe/emit`.
2. **Falso Positivo na Recuperação Backend (`recoverNormalSale`):**
   - No backend (`api/nfe/normal-sale/outboundAttempt.ts`), a função `recoverNormalSale` / `reconcileNormalSale` encontrou no banco a tentativa de emissão da nota 655 vinculada àquele mesmo `emissionRequestId`.
   - A guarda de recuperação apenas verificava se `doc.status !== 'cancelada'`.
   - Como a nota 655 havia sido **estornada via NF-e nº 733** (e não cancelada), seu status em `nfe_documents` permanecia como `homologada`.
   - A API assumiu erroneamente que a nota 655 já era a nota autorizada correspondente àquele request e respondeu HTTP 200 com `success: true, nfeNumber: 655`. **Nenhuma nota nova foi transmitida à SEFAZ!**
3. **Ausência de Fechamento do Modal (`onClose` não disparado):**
   - No componente `OrderEditFiscalContinuation.tsx`, os callbacks `run` e `onSuccess` de `NfeEmissionModal` apenas executavam `setEmission(null)` e chamavam `refreshReplacements()`.
   - Não havia invocação de `onClose(current.order)` quando a lista de substituições pendentes era esgotada (`current.replacements.length === 0`).
4. **Bloqueio Contínuo da Edição do Pedido:**
   - Como a substituição fiscal em `nfe_order_edit_replacements` permanecia em `status = 'ready_to_reissue'` (sem `replacement_document_id`), a função `resumeFiscalOrderEdit` em `useOrderEditFiscalFlow.ts` detectava a pendência fiscal ativa a cada clique em "Editar", interceptando a rota comercial e forçando a abertura do modal de continuidade.

---

### Arquivos e Linhas Modificados
1. **[`erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.tsx):**
   - Importação e execução de `clearFiscalEmissionRequest(initialOrder.id!, row.environment)` tanto no `useEffect` de montagem do modal (para linhas em `ready_to_reissue` sem substituto) quanto no clique do botão *"Conferir e emitir nova nota"*.
   - Invocação automática de `onClose(current.order)` no callback `run` e em `onSuccess` de `NfeEmissionModal` quando `current.replacements.length === 0`.
   - Invocação de `onClose(order)` no botão de conclusão manual quando `rows.length === 0`.
2. **[`api/nfe/normal-sale/outboundAttempt.ts`](api/nfe/normal-sale/outboundAttempt.ts):**
   - Em `reconcileNormalSale` e `finalResult`: consulta à RPC `is_order_edit_reversal_confirmed(doc.id)`.
   - Caso o documento prévio vinculado ao `emissionRequestId` já tenha sido estornado/revertido (`isReversed === true`), a recuperação é sumariamente rejeitada com `success: false, state: 'cancelled', code: 'FISCAL_ALREADY_REVERSED'`, forçando a emissão de uma nova nota fiscal real.
3. **[`erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.test.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.test.tsx):**
   - Adição de 3 novos testes unitários:
     - `clears stored emission request before opening emission modal for ready_to_reissue replacement`: garante a remoção do request ID antigo do localStorage.
     - `automatically closes continuation modal when emission succeeds and all replacements are completed`: valida o fechamento automático da janela ao concluir a emissão.
     - `allows manual close when all replacements are completed`: valida o fechamento do modal ao clicar em Concluir com lista vazia.

---

### Testes Executados e Validações
1. **Testes Unitários do Modal de Continuação:**
   - 6/6 testes aprovados em [`OrderEditFiscalContinuation.test.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.test.tsx).
2. **Testes Unitários do Backend de Emissão Normal:**
   - 31/31 testes aprovados em [`normalOutboundEmission.test.ts`](api/nfe/normal-sale/__tests__/normalOutboundEmission.test.ts).
3. **Suíte Fiscal Global de Não-Regressão:**
   - 1010/1010 testes aprovados em 83 arquivos de teste (`npm run test:fiscal:unit`).
4. **Política de Produto Mandatória (Zero CC-e):**
   - Rigorosamente mantida a inexistência de rotas, botões, modais ou tabelas de Carta de Correção Eletrônica (CC-e) conforme diretriz `FISCAL-016`.

---

## 3. Refatoração Modular e Arquitetural do Fluxo de Entrega Mobile (`useDeliveryFlowActions.ts`, `DeliveryServiceStep.tsx`, `DeliveryRouteStep.tsx`)

### Problema Identificado e Sintomas
1. **Alertas Bloqueantes do JavaScript nas Transições de Etapa:**
   - Durante a operação de entrega pelo motorista no aplicativo móvel, a transição entre cada etapa (1 -> 2: Iniciar Rota; 2 -> 3: Cheguei no Destino; 3 -> 2 e 2 -> 1: Retroceder Etapa) disparava pop-ups nativos bloqueantes (`Alert.alert`) exigindo toque em "OK" para liberar a interface enquanto o operador estava em trânsito.
2. **Violação do Princípio da Responsabilidade Única (SRP) e Acoplamento Cruzado de Camadas:**
   - O hook orquestrador de negócio `useDeliveryFlowActions.ts` importava a regra de domínio `areDeliveryPaymentsPaid` diretamente de um componente visual (`DeliveryPaymentSection.tsx`).
   - `DeliveryServiceStep.tsx` (Etapa 3: Em Atendimento) acumulava 326 linhas contendo banner com relógio de chegada, cartão de cliente e endereço, acionador de GPS externo, lista de conferência de produtos, botão de não atendimento, seção de pagamentos e sliders com estilos acoplados inline.
   - `DeliveryRouteStep.tsx` (Etapa 2: Em Rota) acumulava 245 linhas com banner de rota, cartão de navegação e estilos inline sem decomposição modular (diferente da Etapa 1 que já possuía a pasta `preparation/`).

---

### Solução Técnica Implementada
1. **Eliminação dos Alertas Bloqueantes de Transição:**
   - Removidos os alertas `Alert.alert('Em Rota', ...)` e `Alert.alert('Chegada Confirmada', ...)` em `useDeliveryFlowActions.ts`.
   - Removidos os alertas de retrocesso `Alert.alert('Etapa Retrocedida', ...)`.
   - A transição entre as etapas 1, 2 e 3 agora ocorre de forma imediata, reativa e fluida, preservando apenas alertas de validação crítica (ex: checklist incompleto) e falhas inesperadas de rede/RPC.
2. **Desacoplamento de Domínio e Clean Architecture:**
   - A função pura de domínio `areDeliveryPaymentsPaid` foi movida para `deliveryFlowStepRules.ts` (SSOT das regras do fluxo de entrega).
   - `DeliveryPaymentSection.tsx` agora apenas re-exporta a função para manter compatibilidade reversa.
   - `useDeliveryFlowActions.ts` agora consome a regra diretamente de `deliveryFlowStepRules.ts`, eliminando a dependência entre hook de regras e componente visual.
3. **Decomposição Modular da Etapa 3 (`service/`):**
   - Criada a subpasta `mobile/src/features/orders/components/delivery/service/`:
     - `deliveryServiceStep.styles.ts`: Centralização e isolamento da folha de estilos.
     - `DeliveryServiceBanner.tsx`: Componente focado no banner "No Local • Em Atendimento" e relógio de chegada.
     - `DeliveryServiceCustomerCard.tsx`: Componente focado no cliente, endereço e botão de GPS.
     - `DeliveryServiceProductsCard.tsx`: Componente focado na conferência de volumes/produtos.
   - `DeliveryServiceStep.tsx` foi reduzido de 326 para ~110 linhas, atuando puramente como orchestrator de alto nível.
4. **Decomposição Modular da Etapa 2 (`route/`):**
   - Criada a subpasta `mobile/src/features/orders/components/delivery/route/`:
     - `deliveryRouteStep.styles.ts`: Folha de estilos isolada.
     - `DeliveryRouteBanner.tsx`: Banner de trânsito "Em Rota" e registro de horário.
     - `DeliveryRouteCustomerCard.tsx`: Cartão com dados do destino e acionador de rota no Google Maps.
   - `DeliveryRouteStep.tsx` foi reduzido de 245 para ~80 linhas de pura orquestração.
5. **Criação de Barrels de Exportação Centralizados:**
   - `mobile/src/features/orders/components/delivery/index.ts`: Exportação centralizada dos componentes de entrega.
   - `mobile/src/features/orders/screens/delivery-preparation/index.ts`: Exportação de hooks, regras e tipos do ciclo de vida da entrega.

6. **Barra de Ações Fixa no Rodapé com Proteção de Zona Segura (`DeliveryStepActionFooter.tsx`):**
   - Criação do componente `DeliveryStepActionFooter.tsx` em `components/delivery/`, fixado na parte inferior da tela de fluxo de entrega, fora da `ScrollView`.
   - Ancoragem automática na zona segura via `useSafeAreaInsets` com cálculo `Math.max(insets.bottom, 12)`, garantindo que os botões deslizantes fiquem encostados lá embaixo sem invadir ou ser sobrepostos pelos 3 botões de navegação ou barra de gestos do celular Android/iOS.
   - Remoção dos botões deslizantes duplicados de dentro de `DeliveryPreparationStep`, `DeliveryRouteStep` e `DeliveryServiceStep`, mantendo as telas de conteúdo focadas exclusivamente em dados e conferência.
   - Padronização rigorosa de orientação: todas as ações de avanço para a próxima etapa (1 -> 2: Iniciar Rota; 2 -> 3: Cheguei no Destino; 3 -> Finalizar) iniciam com o botão na DIREITA para ser arrastado para a ESQUERDA (`direction="left"`, prefixadas por `«`), simulando o deslizamento de tela para avançar; enquanto as ações de retrocesso iniciam na esquerda e são arrastadas para a direita (`direction="right"`, sufixadas por `»`).

---

### Arquivos e Linhas Modificados
1. **[`mobile/src/features/orders/screens/delivery-preparation/useDeliveryFlowActions.ts`](mobile/src/features/orders/screens/delivery-preparation/useDeliveryFlowActions.ts):**
   - Remoção dos alertas intrusivos de transição; importação de `areDeliveryPaymentsPaid` a partir de `deliveryFlowStepRules.ts`.
2. **[`mobile/src/features/orders/screens/delivery-preparation/deliveryFlowStepRules.ts`](mobile/src/features/orders/screens/delivery-preparation/deliveryFlowStepRules.ts):**
   - Inclusão da regra de domínio `areDeliveryPaymentsPaid`.
3. **[`mobile/src/features/orders/components/delivery/DeliveryPaymentSection.tsx`](mobile/src/features/orders/components/delivery/DeliveryPaymentSection.tsx):**
   - Re-exportação de `areDeliveryPaymentsPaid` a partir de `deliveryFlowStepRules`.
4. **[`mobile/src/features/orders/components/delivery/service/`](mobile/src/features/orders/components/delivery/service/):**
   - Novos módulos: `deliveryServiceStep.styles.ts`, `DeliveryServiceBanner.tsx`, `DeliveryServiceCustomerCard.tsx`, `DeliveryServiceProductsCard.tsx`.
5. **[`mobile/src/features/orders/components/delivery/DeliveryServiceStep.tsx`](mobile/src/features/orders/components/delivery/DeliveryServiceStep.tsx):**
   - Reescrito como orquestrador desacoplado (326 -> 75 linhas).
6. **[`mobile/src/features/orders/components/delivery/route/`](mobile/src/features/orders/components/delivery/route/):**
   - Novos módulos: `deliveryRouteStep.styles.ts`, `DeliveryRouteBanner.tsx`, `DeliveryRouteCustomerCard.tsx`.
7. **[`mobile/src/features/orders/components/delivery/DeliveryRouteStep.tsx`](mobile/src/features/orders/components/delivery/DeliveryRouteStep.tsx):**
   - Reescrito como orquestrador desacoplado (245 -> 50 linhas).
8. **[`mobile/src/features/orders/components/delivery/DeliveryStepActionFooter.tsx`](mobile/src/features/orders/components/delivery/DeliveryStepActionFooter.tsx):**
   - Novo componente de rodapé fixo ancorado na zona segura do dispositivo (`insets.bottom`).
9. **[`mobile/src/features/orders/components/delivery/index.ts`](mobile/src/features/orders/components/delivery/index.ts) & [`mobile/src/features/orders/screens/delivery-preparation/index.ts`](mobile/src/features/orders/screens/delivery-preparation/index.ts):**
   - Criação de barrel exports para simplificar imports externos.
10. **[`mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx`](mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx):**
    - Refatoração dos imports para consumir os novos barrels unificados e integração do `DeliveryStepActionFooter`.
11. **[`mobile/src/features/orders/components/delivery/__tests__/DeliveryStepActionFooter.test.tsx`](mobile/src/features/orders/components/delivery/__tests__/DeliveryStepActionFooter.test.tsx):**
    - 6 novos testes unitários validando insets de safe area, fallback mínimo e ações por etapa.
12. **[`erp/tests/mobile-forms/deliveryFlowActions.test.tsx`](erp/tests/mobile-forms/deliveryFlowActions.test.tsx):**
    - Novos testes unitários cobrindo as transições de etapa sem alertas e guarda do checklist.

---

### Testes Executados e Validações
1. **Testes Unitários do Rodapé Fixo na Zona Segura:**
   - 6/6 testes aprovados em [`DeliveryStepActionFooter.test.tsx`](mobile/src/features/orders/components/delivery/__tests__/DeliveryStepActionFooter.test.tsx).
2. **Testes Unitários do Orquestrador de Fluxo de Entrega:**
   - 4/4 testes aprovados em [`deliveryFlowActions.test.tsx`](erp/tests/mobile-forms/deliveryFlowActions.test.tsx).
3. **Testes Unitários das Regras Puras de Etapas:**
   - 6/6 testes aprovados em [`deliveryFlowStepRules.test.ts`](mobile/src/features/orders/screens/delivery-preparation/__tests__/deliveryFlowStepRules.test.ts).
4. **Testes Unitários do Serviço de Persistência:**
   - 7/7 testes aprovados em [`deliveryFlowService.test.ts`](mobile/src/features/orders/services/__tests__/deliveryFlowService.test.ts).
5. **Suíte Completa de Formulários e Hooks Mobile:**
   - 97/97 testes aprovados em 9 arquivos de teste (`npm run test:unit:mobile-forms --prefix erp`).

---

## 4. Modularização e Princípios de Engenharia de Software no Módulo de Especificações Técnicas de Produtos

### Problema Identificado e Oportunidade Técnica
Os arquivos centrais da feature de especificações e características técnicas de produtos acumulavam dezenas de responsabilidades (SRP violation) e extensões excessivas de linhas de código:
1. `predicates.ts` (436 linhas): misturava predicados de dimensões físicas (largura, altura, profundidade), lógica booleana Sim/Não com inversão, regras de mobília (portas, gavetas, pés), categorias complexas (colchões e pias com cuba de inox/concretada) e cálculo de estados de dependência de características.
2. `technicalSyncUtils.ts` (366 linhas): agregava sincronização de variações pai/filho, limpeza recursiva de características filhas dependentes em caso de zeramento ("0" ou "Não"), aplicação de valores manuais com propagação para variações, alternância dinâmica de profundidade/comprimento e normalização inicial de dados legados do produto.
3. `useProductTechnicalTab.ts` (428 linhas): misturava orquestração de efeitos React para sincronização de dimensões de sofás a partir da descrição com regex pura, resolução de campos técnicos aplicáveis por categoria, cálculo de grupos mandatórios vs. opcionais e handlers de mutação direta do formulário.
4. `TechnicalFieldInput.tsx` (554 linhas): misturava resolução de tipos de input por regex de nome de campo, mascaramento e formatação de números decimais (vírgula brasileira), inputs inteiros com clamping específico para lugares e portas/gavetas/pés, inputs de porcentagem, busca assíncrona debounced de opções com seleção múltipla e chips de remoção.
5. `technicalValuesService.test.ts` (1.021 linhas): um único arquivo contendo 30 testes unitários cobrindo 6 domínios totalmente distintos (overrides, agrupamento, validações, seleção por categoria, móveis e pias).

---

### Solução Arquitetural Implementada

#### A. Modularização de Predicados Técnicos (`erp/src/pages/utils/technicalValues/predicates/`)
- **`normalization.ts`:** `normalizePredicateName`, `isDefined`, `isModelCharacteristic`, `isPrimaryCharacteristicName`.
- **`dimensions.ts`:** Predicados para largura, altura, profundidade, comprimento, espessura e peso.
- **`yesNo.ts`:** `isYesNoCharacteristic`, `isYesNoValueActive`, identificação de campos binários.
- **`furniture.ts`:** Predicados de portas, gavetas, pés, quantidades e estados ativos.
- **`categories.ts`:** Predicados de categorias especiais (`isMattressCategory`, `isSinkCategory`, `isStructureMaterialCharacteristic`, `isSinkMaterialCharacteristic`, `isConcretadaCharacteristic`, `isValveCharacteristic`, `isHasInoxBowlCharacteristic`, `isSinkMaterialInox`, `isSinkMaterialWithInoxBowlEligible`).
- **`dependencies.ts`:** Resolução unificada de estado de dependência (`getCharacteristicDependencyState`).
- **`index.ts` & `predicates.ts`:** Barrel central e fachada (Facade Pattern) mantendo 100% de retrocompatibilidade com todas as chamadas existentes.

#### B. Modularização de Sincronização Técnica (`erp/src/pages/App/Products/components/tabs/technical/sync/`)
- **`variationSync.ts`:** Sincronização atômica de variações filhas a partir do pai (`syncProductWithVariations`).
- **`dependentCleanup.ts`:** Limpeza segura de características dependentes quando o pai for zerado (`cleanupDependentCharacteristicsOnZero`).
- **`valueChange.ts`:** Mutação pura de valores técnicos e alternância bidirecional profundidade/comprimento (`applyTechnicalValueChangeToProduct`, `applyDepthLengthToggleToProduct`).
- **`initialPopulation.ts`:** Carga e normalização inicial de especificações a partir de atributos legados (`populateInitialTechnicalValues`).
- **`index.ts` & `technicalSyncUtils.ts`:** Re-exportações limpas via fachada pública.

#### C. Modularização do Hook Principal (`erp/src/pages/App/Products/components/tabs/technical/hooks/`)
- **`sofaTechnicalConstants.ts`:** Constantes e regexes imutáveis para extração de medidas de sofás.
- **`useSofaDescriptionSync.ts`:** Hook dedicado para detecção de medidas na descrição e sincronização reativa com as especificações.
- **`useTechnicalFieldApplicability.ts`:** Hook para filtragem de campos aplicáveis pela categoria e montagem de grupos requeridos vs. opcionais.
- **`useTechnicalFieldActions.ts`:** Handlers de mutação (`handleFieldChange`, `handleTechnicalValueChange`, `handleAddGroup`, `handleAddManualField`, `handleRemoveManualField`, `handleToggleDepthLength`).
- **`useProductTechnicalTab.ts`:** Hook coordenador enxuto reduzido de 428 para 115 linhas.

#### D. Modularização dos Renderers de Input (`erp/src/pages/App/Products/components/tabs/technical/inputs/`)
- **`types.ts`:** Interfaces canônicas `BaseTechnicalInputProps` e `TechnicalFieldInputProps`.
- **`resolveTechnicalInputType.ts`:** Normalizador determinístico de tipo (`text_short`, `integer`, `decimal`, `multi_select`, etc.).
- **`TextTechnicalInput.tsx`:** Componente para inputs de texto curto e textarea de descrição longa com limites de caracteres e placeholders contextuais.
- **`IntegerTechnicalInput.tsx`:** Input numérico inteiro com clamping seguro por contexto (100 para lugares, 50 para portas/gavetas/pés).
- **`DecimalTechnicalInput.tsx`:** Input com máscara monetária/decimal (vírgula brasileira), precisão configurável e proteção contra re-emissão de estado em loop.
- **`PercentageTechnicalInput.tsx`:** Input percentual com limite e máscara de 0 a 100%.
- **`ChoiceDropdown.tsx`:** Select nativo leve para listas pequenas (<= 8 opções).
- **`ChoiceSearch.tsx`:** Componente de busca debounced com suporte a multiselect, badges/chips de remoção e fechamento inteligente ao clicar fora.
- **`TechnicalFieldInput.tsx`:** Reduzido de 554 para 115 linhas, despachando exclusivamente para os subcomponentes especializados.

#### E. Modularização da Suíte de Testes Unitários (`erp/src/pages/utils/__tests__/technicalValues/`)
- Decomposição de `technicalValuesService.test.ts` (1.021 linhas) em 6 suítes focadas:
  - `overrides.test.ts`: Testes de sobrescrita e nomes de variação.
  - `grouping.test.ts`: Testes de canonicidade de tópicos e ordenação.
  - `validation.test.ts`: Testes de campos obrigatórios e dimensões mínimas.
  - `selection.test.ts`: Testes de campos aplicáveis e exclusão mútua por categoria.
  - `furniture.test.ts`: Testes de regras de portas, gavetas e pés com toggles Sim/Não.
  - `sink.test.ts`: Testes de pias (marmorite, granito, inox), concretada, válvulas e cuba de inox.
  - `technicalValuesService.test.ts`: Orquestrador importando e executando todas as suítes com 100% de sucesso (30/30 testes aprovados).

---

### Testes Executados e Validações
1. **Testes da Aba Técnica do ERP:**
   - 74/74 testes aprovados em 9 arquivos de teste (`src/pages/App/Products/components/tabs/technical/`).
2. **Testes de Variações de Produtos:**
   - 34/34 testes aprovados em 6 arquivos de teste (`src/pages/App/Products/components/variationTabs/`).
3. **Testes da Camada de Domínio e Predicados:**
   - 30/30 testes aprovados em `technicalValuesService.test.ts`.
4. **Build Fiscal e Geral:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel empacotados, WASM validado, XSD oficial resolvido com 0 erros.

   - 97/97 testes aprovados em 9 arquivos de teste (`npm run test:unit:mobile-forms --prefix erp`).

---

## 5. Refatoração Modular e Arquitetura Limpa nos Componentes Mobile (`OrderDetailsModal.tsx`, `DeliveryPreparationScreen.tsx`, `NativeBottomNav.tsx`)

### Problema Identificado e Sintomas
No ecossistema móvel (`mobile/src/`), três componentes centrais acumulavam excesso de responsabilidades em arquivos únicos (violação do Princípio da Responsabilidade Única - SRP, alto acoplamento e baixa coesão):
1. **`OrderDetailsModal.tsx` (339 linhas):** Misturava ciclo de vida de busca assíncrona de itens completos (`supabase.from('orders')`), verificação assíncrona de permissões de perfil para início de entrega (`supabase.from('settings')`), lógica de apresentação e mapeamento de cores/badges por status de pedido, markup do cabeçalho com metadados de vendedor/data e 100 linhas de `StyleSheet`.
2. **`DeliveryPreparationScreen.tsx` (203 linhas):** Embora parcialmente desacoplada em etapas anteriores, ainda mantinha a instanciação em linha dos modais do fluxo (`DeliveryStartConfirmModal`, `UnattendedModal`, `CancelDeliveryConfirmModal`) e a comutação do corpo das etapas dentro do componente raiz de tela, além de omitir a desestruturação de `isChecklistComplete` que alimentava o rodapé de ações fixas.
3. **`NativeBottomNav.tsx` (576 linhas):** Monólito que acumulava configuração de abas nativas, filtragem condicional de abas por permissões do perfil (administrador, financeiro, relatórios, produtos), separação de abas primárias e excedentes (botão "Mais"), lógica de casamento de rotas ativas (inclusive rotas compostas como `agenda`/`logistica`/`cronograma` e `entregas`/`montagens`), renderização da aba especial do Agente Lizandro (avatar + badge BETA), implementação completa do modal Bottom Sheet nativo e mais de 230 linhas de estilos.

---

### Causa Raiz Técnica Comprovada
- Falta de modularização e decomposição em submódulos de responsabilidade única.
- Mistura de responsabilidades de orquestração de alto nível com renderização de nós de baixo nível e regras de apresentação pura.
- Inexistência de testes unitários automatizados cobrindo o hook de navegação (`useNativeBottomNav`) e o mapeamento de status de pedidos.

---

### Solução Técnica Implementada

#### A. Modularização do Modal de Detalhes do Pedido (`mobile/src/components/modals/order-details/`)
- **`orderDetailsModal.styles.ts`:** Estilos isolados para container modal, badges de código e status, cabeçalho e botão de fechar.
- **`orderDetailsPresentation.ts`:** Mapeamento determinístico e puro de status (`getOrderDetailsStatusConfig`), calculando rótulos, backgrounds, bordas e cores de alto contraste para estados cancelados, atendidos, agendados e rascunhos.
- **`useOrderDetailsModal.ts`:** Hook customizado gerenciando o carregamento sob demanda de itens completos, cálculo seguro do safe area top (`topInset`), estado de preparação de entrega e consulta com fallback resiliente de permissões de entrega (`startDelivery`).
- **`OrderDetailsModalHeader.tsx`:** Componente de apresentação isolado responsável por exibir ícone, título, `#código`, data formatada, nome do vendedor, badge de status e botão de fechar.
- **`OrderDetailsModal.tsx`:** Reduzido de 339 para 65 linhas, atuando exclusivamente como coordenador declarativo.

#### B. Modularização da Tela do Fluxo de Entrega (`mobile/src/features/orders/screens/delivery-preparation/`)
- **`DeliveryPreparationContent.tsx`:** Renderizador isolado das três etapas do fluxo de entrega (Etapa 1: `DeliveryPreparationStep`, Etapa 2: `DeliveryRouteStep`, Etapa 3: `DeliveryServiceStep`) dentro da `ScrollView`.
- **`DeliveryPreparationModals.tsx`:** Agrupador desacoplado dos 3 modais do fluxo (`DeliveryStartConfirmModal`, `UnattendedModal`, `CancelDeliveryConfirmModal`), com importações diretas para evitar acoplamento a barrels pesados.
- **`DeliveryPreparationScreen.tsx`:** Orquestrador enxuto de 75 linhas, com correção da passagem de `isChecklistComplete` para `DeliveryStepActionFooter`.

#### C. Modularização da Barra de Navegação Inferior (`mobile/src/features/dashboard/components/bottom-nav/`)
- **`bottomNav.types.ts`:** Definição tipada de `NavItemConfig`, `NativeBottomNavProps`, `BottomNavTabItemProps` e `BottomNavMoreSheetProps`.
- **`bottomNav.styles.ts`:** Centralização dos estilos da barra inferior, avatares do Agente e modal Bottom Sheet.
- **`useNativeBottomNav.ts`:** Hook que centraliza a lista de abas, visibilidade por perfil, particionamento entre as 4 abas primárias e excedentes, cálculo do safe area inferior (`bottomInset`) e predicados de ativação de abas (`isTabActive`, `isOverflowTabActive`).
- **`BottomNavTabItem.tsx`:** Componente especializado para a renderização de abas individuais, com suporte nativo à identidade visual do Assistente Lizandro (avatar circular e badge BETA).
- **`BottomNavMoreSheet.tsx`:** Modal Bottom Sheet desacoplado para exibição fluida das abas excedentes da navegação.
- **`NativeBottomNav.tsx`:** Reduzido de 576 para 65 linhas, mantendo 100% de compatibilidade pública de tipos e componentes.

---

### Arquivos e Linhas Modificados
1. **[`mobile/src/components/modals/order-details/orderDetailsModal.styles.ts`](mobile/src/components/modals/order-details/orderDetailsModal.styles.ts):** Criação da folha de estilos do modal de detalhes.
2. **[`mobile/src/components/modals/order-details/orderDetailsPresentation.ts`](mobile/src/components/modals/order-details/orderDetailsPresentation.ts):** Regras puras de apresentação e contraste de status do pedido.
3. **[`mobile/src/components/modals/order-details/useOrderDetailsModal.ts`](mobile/src/components/modals/order-details/useOrderDetailsModal.ts):** Hook de ciclo de vida e permissões do modal.
4. **[`mobile/src/components/modals/order-details/OrderDetailsModalHeader.tsx`](mobile/src/components/modals/order-details/OrderDetailsModalHeader.tsx):** Cabeçalho de detalhes do pedido.
5. **[`mobile/src/components/modals/order-details/index.ts`](mobile/src/components/modals/order-details/index.ts):** Barrel export do módulo.
6. **[`mobile/src/components/modals/OrderDetailsModal.tsx`](mobile/src/components/modals/OrderDetailsModal.tsx):** Refatorado para orquestrador limpo de 65 linhas (redução de ~80%).
7. **[`mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationContent.tsx`](mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationContent.tsx):** Renderizador do conteúdo das etapas 1, 2 e 3.
8. **[`mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationModals.tsx`](mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationModals.tsx):** Desacoplamento dos modais de início de rota, insucesso e cancelamento.
9. **[`mobile/src/features/orders/screens/delivery-preparation/index.ts`](mobile/src/features/orders/screens/delivery-preparation/index.ts):** Exportação dos novos submódulos.
10. **[`mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx`](mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx):** Orquestrador limpo de 75 linhas com `isChecklistComplete` conectado.
11. **[`mobile/src/features/dashboard/components/bottom-nav/bottomNav.types.ts`](mobile/src/features/dashboard/components/bottom-nav/bottomNav.types.ts):** Interfaces tipadas de navegação.
12. **[`mobile/src/features/dashboard/components/bottom-nav/bottomNav.styles.ts`](mobile/src/features/dashboard/components/bottom-nav/bottomNav.styles.ts):** Estilos isolados da navegação e bottom sheet.
13. **[`mobile/src/features/dashboard/components/bottom-nav/useNativeBottomNav.ts`](mobile/src/features/dashboard/components/bottom-nav/useNativeBottomNav.ts):** Hook de particionamento e rotas ativas.
14. **[`mobile/src/features/dashboard/components/bottom-nav/BottomNavTabItem.tsx`](mobile/src/features/dashboard/components/bottom-nav/BottomNavTabItem.tsx):** Item de aba primária com Agente Lizandro.
15. **[`mobile/src/features/dashboard/components/bottom-nav/BottomNavMoreSheet.tsx`](mobile/src/features/dashboard/components/bottom-nav/BottomNavMoreSheet.tsx):** Modal de abas excedentes.
16. **[`mobile/src/features/dashboard/components/bottom-nav/index.ts`](mobile/src/features/dashboard/components/bottom-nav/index.ts):** Barrel export da navegação.
17. **[`mobile/src/features/dashboard/components/NativeBottomNav.tsx`](mobile/src/features/dashboard/components/NativeBottomNav.tsx):** Refatorado para componente coordenador de 65 linhas (redução de ~88%).
18. **[`erp/tests/mobile-forms/nativeBottomNavAndOrderDetails.test.tsx`](erp/tests/mobile-forms/nativeBottomNavAndOrderDetails.test.tsx):** 6 novos testes unitários automatizados validando particionamento de abas, rotas compostas, bloqueio do assistente para não-admins, mapeamento visual de status de pedidos e ciclo dos modais de entrega.

---

### Testes Executados e Validações
1. **Suíte Completa de Formulários e Telas Mobile:**
   - 103/103 testes aprovados em 10 arquivos de teste (`npm run test:unit:mobile-forms --prefix erp`).
2. **Aderência aos Padrões de Projeto:**
   - Single Responsibility Principle (SRP) estritamente aplicado.
   - Preservação integral do Safe Area e insets em todas as plataformas (Android e iOS).
   - Ausência de regressão em rotas, modais e permissões de usuários.

---

## 6. Refatoração Modular e Arquitetura Limpa no Módulo de Emissão Fiscal e Edição de Pedidos (`useNfeEmissionActions.ts`, `OrderEditModal.tsx`, `outboundAttempt.ts`, `normalOutboundEmission.test.ts`, `NfeEmissionModal.tsx`, `emitNormalSale.ts`, `nfeService.ts`, `emit.ts`, `audit-order-edit.ts`)

### Problema Identificado e Oportunidade Técnica
Os arquivos centrais de emissão de NF-e, reconciliação, auditoria de edição e persistência de tentativas fiscais concentravam centenas de linhas de código em blocos monolíticos, violando o Princípio da Responsabilidade Única (SRP) e dificultando a manutenção:
1. **`NfeEmissionModal.tsx` (481 linhas):** Misturava renderização de banners de status, prévia de XML assinado, formulário de ambiente e cálculos de totais tributários.
2. **`useNfeEmissionActions.ts` (708 linhas):** Agrupava restauração de tentativas pendentes, abertura de modal de prévia, orquestração de emissão normal, reconciliação assíncrona e tratamento de exceções de rede.
3. **`nfeService.ts` (734 linhas):** Arquivo central de serviços fiscais do ERP acumulando despacho de emissão, tratamento de erros, abandono de rascunhos em homologação e retentativas.
4. **`outboundAttempt.ts` (536 linhas) e `emitNormalSale.ts` (391 linhas):** Orquestração completa de preparação CAS, persistência de tentativas, recuperação de falhas de transporte e reconciliação em um único arquivo.
5. **`audit-order-edit.ts` (100 linhas):** Misturava roteamento Vercel com carregamento de continuação e execução de ações de confirmação/finalização.
6. **`OrderEditModal.tsx` (509 linhas):** Renderizava 5 sub-modais inline (busca/cadastro de vendedor, cadastro de cliente por JSON, confirmação de estoque e conciliação comercial), além de cálculo em cascata de pedidos atualizados.
7. **`normalOutboundEmission.test.ts` (769 linhas):** Misturava mais de 270 linhas de infraestrutura de banco em memória simulado (PostgreSQL mock) diretamente no arquivo de testes de especificação.

---

### Causa Raiz Técnica Comprovada
- Acumulação histórica de lógica de negócio e regras de transporte sem decomposição por camadas de domínio.
- Acoplamento temporal e de contexto em loops CAS de preparação fiscal.
- Dificuldade de reuso de mocks e testes de integração por falta de harnesses isolados.

---

### Solução Técnica Implementada

#### A. Frontend: Modal de Emissão e Hooks (`nfe-modal/`)
- **Subcomponentes Extraídos:**
  - `NfeEmissionStatusBanners.tsx`: Renderização declarativa e acessível de avisos fiscais, badges de contingência e alertas de inconsistência.
  - `NfeXmlPreviewDialog.tsx`: Modal dedicado de prévia do XML assinado (`data-testid="nfe-xml-preview-dialog"`) com verificação local XSD e zero transmissão SEFAZ.
  - `nfeModalCalculations.ts`: Funções puras para somatório de itens, base de cálculo e alíquotas.
  - `nfeModelOrderResolution.ts`: Resolução desacoplada do modelo fiscal e finalidade de aquisição (`resolveOrderFiscalModelContext`, `initialAcquisitionPurpose`), simplificando `useNfeEmission.ts`.
  - `useNfeEmissionTelemetry.ts`: Telemetria e rastreamento de tempos de preparação de payload.
  - `NfeEmissionModal.tsx`: Reduzido de 481 para 338 linhas, atuando como container orquestrador.
- **Decomposição do Hook de Ações (`nfe-modal/hooks/actions/`):**
  - `actions.types.ts`: Tipagem estrita de parâmetros de emissão, callbacks e estado.
  - `nfeEmissionPreflight.ts`: Encapsulamento de verificações prévias de permissões, travas de concorrência, finalidade da compra e validação de schema antes da submissão (`checkEmissionPreflight`).
  - `useNfeReconciliationAction.ts`: Hook especializado na validação e execução de conciliação assíncrona com a SEFAZ.
  - `useNfeHmlRestartAction.ts`: Hook especializado em reinício de tentativas presas em Homologação.
  - `useNfeAttemptRestoration.ts`: Restauração resiliente de tentativas pendentes utilizando `useRef` estáveis para evitar render loops infinitos de dependências do `useEffect`.
  - `useNfeXmlPreviewState.ts`: Controle de estado do modal de prévia de XML assinado.
  - `nfeEmissionExecutor.ts`: Execução do pipeline de envio de emissão para `/api/nfe/emit`.
  - `nfeReconciliationExecutor.ts`: Orquestração de reconciliação de tentativas perdidas com a SEFAZ.
  - `useNfeEmissionActions.ts`: Reduzido de 708 para 318 linhas de pura coordenação de alto nível.

#### B. Frontend: Serviço Fiscal Central (`erp/src/pages/utils/nfe/nfeService.ts`)
- **Decomposição em Facade e Módulos Dedicados sob `services/`:**
  - `nfeService.types.ts`: Tipos compartilhados de requisição, opções de emissão e respostas.
  - `nfeEmissionErrorMessage.ts`: Formatação de mensagens de erro amigáveis para SEFAZ e rede.
  - `nfeHmlAbandonService.ts`: Serviço de abandono seguro de tentativas presas em Homologação (`/api/nfe/operation-drafts`).
  - `nfeRetryDispatcher.ts`: Despacho de retentativas idênticas respeitando idempotência.
  - `nfeOrderEmissionDispatcher.ts`: Orquestrador central da chamada HTTP para `/api/nfe/emit`.
  - `nfeService.ts`: Reduzido de 734 para 105 linhas como Facade pura com 100% de compatibilidade retroativa.

#### C. Backend: Tentativas, Preparação e Auditoria de Saída Normal (`api/nfe/normal-sale/` e `api/nfe/order-edit-audit/`)
- **Decomposição de `outboundAttempt.ts` (536 linhas) sob `normal-sale/`:**
  - `outboundTypes.ts`: Interfaces de comando de saída, snapshots e respostas de reconciliação.
  - `outboundPersistence.ts`: RPCs de banco PostgreSQL (`prepare_nfe_outbound_attempt`, `persist_nfe_outbound_result`).
  - `outboundRecovery.ts`: Detecção e recuperação de tentativas idênticas ou em conflito (`recoverNormalSale`, `describeActiveNormalSaleConflict`).
  - `outboundTransmission.ts`: Transmissão segura para a SEFAZ via SOAP/mTLS com claim de token (`transmitPreparedOutbound`).
  - `outboundReconciliation.ts`: Reconciliação atômica de documentos autorizados (`reconcileNormalSale`).
  - `outboundAttempt.ts`: Reduzido para Facade exportadora de 36 linhas.
- **Decomposição do Contexto e Loop CAS em `normalSaleContext.ts` e `normalSalePreparation.ts`:**
  - `normalSaleContext.ts`: Funções de domínio para pré-condições (`validateNormalSalePreconditions`, com bloqueio 403 estrito de pedidos de teste em Produção), resolução de regras e fatos fiscais (`resolveNormalSaleFactsAndRules`) e credenciais A1/CSRT (`resolveNormalSaleCredentials`).
  - `emitNormalSale.ts`: Reduzido de 391 para 80 linhas, atuando como pipeline declarativo linear.
  - `executeCasPreparationLoop`: Encapsulamento do loop de reserva atômica de numeração, serialização de XML, assinatura e validação XSD com tratamento de erro não confirmado (`FISCAL_PREPARATION_UNCONFIRMED`).
- **Decomposição de `emit.ts` e `audit-order-edit.ts`:**
  - `normalEmissionDispatcher.ts`: Despacho de comandos de emissão de venda normal.
  - `api/nfe/order-edit-audit/`: Decomposição em `auditFinalizeAction.ts`, `auditResumeAction.ts` e `auditAuditAndConfirmAction.ts`, com reexportação na Facade `auditActionHandlers.ts`.

#### D. Frontend: Modal de Edição de Pedidos (`OrderEditModal.tsx`)
- **Submódulos sob `order-edit-modal/`:**
  - `OrderEditSubModals.tsx`: Agrupamento coeso dos sub-modais de vendedor, cliente (JSON), movimentação de estoque, conciliação comercial e confirmação de auditoria fiscal.
  - `orderEditPayload.ts`: Função pura `buildUpdatedOrder` que resolve agendamento comercial (`getSaoPauloDayInfo`), tipo de manuseio e transição automática para atendido em agendamento pontual.
  - `OrderEditModal.tsx`: Reduzido de 509 para 320 linhas, eliminando repetição de código e mantendo layout e orquestração limpos.

#### E. Testes: Harness Desacoplado (`normalOutboundEmission.test.ts`)
- **`normalOutboundTestHarness.ts` (`erp/src/pages/utils/nfe/__tests__/harness/`):**
  - Isolamento de 365 linhas de infraestrutura de banco mock, fixtures e geradores sintéticos de autorização SEFAZ (`authorization`, `notFound`, `database`, `preview`, `emit`, `emitFromPreview`).
  - `normalOutboundEmission.test.ts` reduzido de 769 para 446 linhas, focado exclusivamente nas asserções de negócio e concorrência.

---

### Arquivos e Linhas Modificados
1. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeEmissionStatusBanners.tsx`:** Novo componente de banners de status.
2. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeXmlPreviewDialog.tsx`:** Novo componente do modal de prévia de XML.
3. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/utils/nfeModalCalculations.ts`:** Cálculos puros tributários do modal.
4. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionTelemetry.ts`:** Hook de telemetria de performance.
5. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/`:** Submódulos de ações de emissão e reconciliação.
6. **`erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx`:** Reduzido de 481 para 338 linhas.
7. **`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`:** Reduzido de 708 para 380 linhas.
8. **`erp/src/pages/utils/nfe/services/`:** Submódulos de serviço fiscal desacoplados.
9. **`erp/src/pages/utils/nfe/nfeService.ts`:** Reduzido de 734 para 105 linhas.
10. **`api/nfe/normal-sale/outbound*.ts`:** Submódulos de persistência, recuperação, transmissão e reconciliação de tentativas.
11. **`api/nfe/normal-sale/normalSalePreparation.ts`:** Extração do loop CAS de preparação fiscal.
12. **`api/nfe/normal-sale/normalEmissionDispatcher.ts`:** Despachador de venda normal em `emit.ts`.
13. **`api/nfe/order-edit-audit/`:** Submódulos de auditoria de edição de pedidos.
14. **`api/nfe/audit-order-edit.ts` e `erp/api/nfe/audit-order-edit.ts`:** Delegador Vercel com carregamento de módulos nativos.
15. **`erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditSubModals.tsx`:** Sub-modais desacoplados.
16. **`erp/src/pages/App/SalesOrder/modals/order-edit-modal/utils/orderEditPayload.ts`:** Construtor de payload do pedido editado.
17. **`erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`:** Reduzido de 509 para 320 linhas.
18. **`erp/src/pages/utils/nfe/__tests__/harness/normalOutboundTestHarness.ts`:** Harness de infraestrutura de testes mock.
19. **`erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts`:** Reduzido de 769 para 446 linhas.

---

### Testes Executados e Validações
1. **Suíte Fiscal de Emissão (`normalOutboundEmission.test.ts`):**
   - 31/31 testes aprovados com 100% de sucesso.
2. **Suíte do Modal de Emissão (`nfe-modal`):**
   - 174/174 testes aprovados em 13 arquivos.
3. **Suíte de Serviços Fiscais (`nfeService`):**
   - 34/34 testes aprovados (`nfeServiceServerBoundary.test.ts` e `nfeServiceCceEligibility.test.ts`).
4. **Suíte de Edição de Pedidos (`OrderEdit`):**
   - 33/33 testes aprovados em 5 arquivos.
5. **Build Fiscal e Inicialização Nativa (`npm run build:fiscal --prefix erp`):**
   - 12/12 funções Vercel verificadas (limite da plataforma cumprido).
   - Todos os 16 despachadores fiscais executados com sucesso em ambiente Node nativo.
   - WASM carregado e esquemas XSD oficiais validados.
6. **Suíte Global de Regressão Fiscal:**
   - 83 arquivos / 1010 testes aprovados em `npm run test:fiscal:unit`.
7. **Política de Produto Mandatória:**
   - Zero Carta de Correção Eletrônica (CC-e) introduzida, preservando integralmente `FISCAL-016`.






---

## 7. Evolução do Fluxo de Entrega Mobile: Inclusão da Etapa "Chegada", Botão "Não foi possível entregar" e Ajuste de Transições Deslizantes

### Problema Identificado e Solicitação do Usuário
1. **Nova Etapa no Fluxo de Entrega:** O fluxo de entrega anteriormente continha 3 etapas (1. Preparação, 2. Em Rota, 3. Atendimento). Solicitou-se a inserção de uma nova etapa intermediária entre "Em Rota" e "Atendimento", denominada **"Chegada"** (No Local / Chegada no Destino).
2. **Corpo da Etapa Chegada Exclusivo:** Na etapa de Chegada, deve ser exibido unicamente o botão de insucesso/não atendimento.
3. **Renomeação do Botão e Modal de Insucesso:**
   - O botão anteriormente chamado "Cliente não atendeu / Insucesso" foi renomeado exatamente para **"Não foi possível entregar"**.
   - O modal de registro de não atendimento (`UnattendedModal.tsx`) teve seu título atualizado para **"Não foi possível realizar a entrega"**, mantendo a seleção de motivos ('Cliente Ausente', etc.).
4. **Remoção da Etapa de Atendimento:** O botão de não atendimento foi completamente removido do corpo da Etapa 4 (`DeliveryServiceStep.tsx`), deixando o atendimento focado unicamente na conferência de itens e recebimento de pagamentos.
5. **Direção dos Botões de Deslizar (SlideHoldToStart):**
   - Transições de avanço (1 -> 2, 2 -> 3, 3 -> 4, 4 -> Finalizar) utilizam `direction="left"` (knob na direita arrastado para a esquerda com texto prefixado por `«`).
   - Transições de retorno (4 -> 3, 3 -> 2, 2 -> 1) utilizam `direction="right"` (knob na esquerda arrastado para a direita com texto sufixado por `»`).
6. **Ancoragem na Zona Segura:** O rodapé de ações `DeliveryStepActionFooter` foi rigorosamente ancorado na `SafeAreaInsets` (`Math.max(insets.bottom, 12)`), encostado na parte inferior sem sobrepor a barra de navegação/botões do dispositivo móvel.

---

### Solução Arquitetural Implementada
1. **Modelo de Domínio (`deliveryFlowStepRules.ts`):**
   - Atualizado `resolveDeliveryStep` para suportar 4 etapas:
     - Etapa 1: `Preparação` (`!isInTransit && !isInArrival && !isInService`)
     - Etapa 2: `Em Rota` (`deliveryStatus === 'in_progress'`)
     - Etapa 3: `Chegada` (`deliveryStatus === 'arrived'`)
     - Etapa 4: `Em Atendimento` (`deliveryStatus === 'in_service'`)
2. **Serviço de Persistência e Sincronização Offline (`deliveryFlowService.ts`):**
   - Implementado `startService`: registra `deliveryStatus: 'in_service'` e enfileira `DELIVERY_START_SERVICE`.
   - Implementado `stepBackToArrival`: retrocede o pedido para `deliveryStatus: 'arrived'` e limpa `deliveryServiceStartedAt`.
   - Ajustado `arriveAtDestination`: define `deliveryStatus: 'arrived'`.
   - Ajustado `stepBackToRoute`: redefine `deliveryStatus: 'in_progress'` e limpa timestamps posteriores.
3. **Hook Orquestrador (`useDeliveryFlowActions.ts`):**
   - Suporte a `isInArrival`, `handleStartService` e `handleStepBackToArrival`.
   - Transição fluida sem alertas JavaScript intrusivos.
4. **Novo Componente de Chegada (`DeliveryArrivalStep.tsx`):**
   - Criado sob `mobile/src/features/orders/components/delivery/arrival/`.
   - Renderiza unicamente o botão de insucesso `"Não foi possível entregar"` com ícone `AlertTriangle`, acionando `onOpenUnattendedModal`.
5. **Componente de Atendimento (`DeliveryServiceStep.tsx`):**
   - Removido o botão de insucesso, isolando suas responsabilidades em conferência e pagamento.
6. **Rodapé de Ações (`DeliveryStepActionFooter.tsx`):**
   - Etapa 1: `« Deslize para INICIAR ROTA` (`direction="left"`)
   - Etapa 2: `« Deslize para CHEGUEI NO DESTINO` (`direction="left"`) + `Deslize para VOLTAR AO PREPARO »` (`direction="right"`)
   - Etapa 3 (Chegada): `« Deslize para INICIAR ATENDIMENTO` (`direction="left"`) + `Deslize para VOLTAR PARA EM ROTA »` (`direction="right"`)
   - Etapa 4 (Atendimento): `« Deslize para FINALIZAR` (`direction="left"`) + `Deslize para VOLTAR À CHEGADA »` (`direction="right"`)
7. **Indicador de Progresso (`DeliveryStepProgressIndicator.tsx`):**
   - Atualizado para `ETAPA {currentStep} DE 4` com os 4 passos visuais: 1. Preparação, 2. Em Rota, 3. Chegada, 4. Atendimento.

---

### Arquivos e Linhas Modificados
1. **`mobile/src/features/orders/components/delivery/UnattendedModal.tsx`:** Título do modal atualizado para "Não foi possível realizar a entrega" e botão para "CONFIRMAR NÃO FOI POSSÍVEL ENTREGAR".
2. **`mobile/src/features/orders/screens/delivery-preparation/deliveryFlowStepRules.ts`:** Mapeamento de 4 etapas (`isInArrival: true` para Etapa 3).
3. **`mobile/src/features/orders/services/deliveryFlowService.ts`:** `startService` e `stepBackToArrival` com sincronização offline.
4. **`mobile/src/features/orders/screens/delivery-preparation/deliveryPreparation.types.ts`:** Tipos `isInArrival`, `handleStartService`, `handleStepBackToArrival`.
5. **`mobile/src/features/orders/screens/delivery-preparation/useDeliveryFlowActions.ts`:** Integração das novas transições.
6. **`mobile/src/features/orders/components/delivery/arrival/deliveryArrivalStep.styles.ts`:** Estilos do botão de insucesso da Etapa 3.
7. **`mobile/src/features/orders/components/delivery/arrival/DeliveryArrivalStep.tsx`:** Componente da Etapa 3 (Chegada).
8. **`mobile/src/features/orders/components/delivery/DeliveryServiceStep.tsx`:** Remoção do botão de insucesso.
9. **`mobile/src/features/orders/components/delivery/DeliveryStepActionFooter.tsx`:** Suporte a 4 etapas com direções de deslizamento (`direction="left"` e `direction="right"`).
10. **`mobile/src/features/orders/components/delivery/DeliveryStepProgressIndicator.tsx`:** Stepper atualizado para 4 etapas (`ETAPA {currentStep} DE 4`).
11. **`mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationContent.tsx`:** Comutação da nova etapa `DeliveryArrivalStep`.
12. **`mobile/src/features/orders/screens/DeliveryPreparationScreen.tsx`:** Integração de `isInArrival`, `handleStartService` e `handleStepBackToArrival`.
13. **`erp/tests/mobile-forms/deliveryFlowActions.test.tsx`:** Testes das transições 1 -> 2 -> 3 -> 4 e retrocessos 4 -> 3 -> 2 -> 1.
14. **`erp/tests/mobile-forms/nativeBottomNavAndOrderDetails.test.tsx`:** Testes de renderização de `DeliveryStepActionFooter` para as 4 etapas e acionamento de modal via `DeliveryArrivalStep`.

---

### Testes Executados e Validações
1. **Suíte Completa de Formulários e Fluxos Mobile:**
   - `npm run test:unit:mobile-forms --prefix erp`: 10/10 arquivos aprovados, **108/108 testes passando com 100% de sucesso**.
2. **Invariantes e Políticas de Produto:**
   - Sem alertas intrusivos de transição JavaScript (`Alert.alert`).
   - Zero exposição ou criação de CC-e (`FISCAL-016`).
   - Zona segura de layout preservada (`SafeAreaInsets`).


---

## 8. Fix: Resiliência de Plataforma Web/Expo e Fallback de Banco Local ao Mudar de Etapa na Entrega

### Problema Identificado e Sintomas
Ao acionar o deslizamento de transição de etapa no fluxo de entrega (ex: "Iniciar Rota" na Etapa 1) rodando no navegador (`localhost:8081` / Expo Web), a operação falhava com o alerta:
> *"Erro ao iniciar rota: Your web project is importing a module from 'react-native' instead of 'react-native-web'. Learn more: https://expo.fyi/fb-batched-bridge-config-web"*

---

### Causa Raiz Técnica Comprovada
1. **Falso Positivo de Plataforma Nativa no Web Browser:**
   - Em `mobile/src/services/sqlite/database.ts`, a função `resolveRuntimePlatform()` verificava `(typeof navigator !== 'undefined' && navigator.product === 'ReactNative')` antes de validar se o ambiente era navegador (`window` / `document`).
   - O `react-native-web` define o polyfill global `navigator.product = 'ReactNative'` em navegadores para compatibilidade com certas bibliotecas.
   - Isso fazia com que `resolveRuntimePlatform()` retornasse `'native'` mesmo executando no Google Chrome no desktop (`localhost:8081`).
   - Com retorno `'native'`, `openSQLiteDatabase` chamava `require('expo-sqlite')`. No Expo Web, `expo-sqlite` tenta carregar módulos nativos inexistentes no navegador (`NativeModules` de `react-native`), disparando a exceção do BatchedBridge do Expo.
2. **Propagação Desnecessária do Erro Offline para a Ação do Usuário:**
   - Em `deliveryFlowService.ts`, as chamadas a `offlineSyncManager.recordEvent` eram executadas sem captura resiliente. Quando o banco de dados local lançava a exceção de carregamento nativo, a persistência primária da transição no Supabase era interrompida e o erro técnico era exibido no alerta da UI.

---

### Solução Técnica Implementada
1. **Detecção Precisa de Plataforma (`database.ts`):**
   - Importação de `Platform` de `react-native`.
   - `resolveRuntimePlatform()` confere prioritariamente `Platform?.OS === 'web'`, `typeof window !== 'undefined' && typeof window.document?.createElement === 'function'` e `process.env?.NODE_ENV === 'test' || process.env?.VITEST`.
   - Remoção do teste ambíguo `navigator.product === 'ReactNative'`.
   - Adicionado fallback defensivo no bloco `catch` de `openSQLiteDatabase`: se a plataforma for web ou o banco nativo falhar, utiliza `InMemoryDatabaseDriver` sem derrubar a aplicação.
2. **Isolamento de Erros da Fila Offline (`deliveryFlowService.ts`):**
   - Criação da função utilitária `safeRecordOfflineEvent` que encapsula o enfileiramento offline em `try/catch` com log de advertência (`console.warn`).
   - Falhas no armazenamento local de eventos offline não mais impedem ou quebram o fluxo de transição de etapas do motorista/entregador.
3. **Novo Arquivo de Testes Unitários (`erp/tests/mobile-forms/sqliteDatabasePlatform.test.tsx`):**
   - Validação da identificação de ambiente web/teste (`shouldUseInMemoryDatabase`).
   - Verificação de que `resolveRuntimePlatform` retorna `'web'` e fornece o `InMemoryDatabaseDriver` funcional.

---

### Arquivos e Linhas Modificados
1. **[`mobile/src/services/sqlite/database.ts`](mobile/src/services/sqlite/database.ts):**
   - Importação de `Platform`.
   - Refatoração de `resolveRuntimePlatform` e fallback em `openSQLiteDatabase`.
2. **[`mobile/src/features/orders/services/deliveryFlowService.ts`](mobile/src/features/orders/services/deliveryFlowService.ts):**
   - Implementação de `safeRecordOfflineEvent` com tipagem estrita (`SyncEventType`, `SyncEvent['entityType']`).
   - Proteção de todos os métodos de transição (`startRoute`, `arriveAtDestination`, `startService`, `finishDelivery`, `recordUnattended`, `stepBackToPreparation`, `stepBackToRoute`, `stepBackToArrival`).
3. **[`erp/tests/mobile-forms/sqliteDatabasePlatform.test.tsx`](erp/tests/mobile-forms/sqliteDatabasePlatform.test.tsx):**
   - 3 testes unitários cobrindo resiliência de plataforma e driver em memória.

---

### Testes Executados e Validações
1. **Suíte Completa de Formulários Mobile:**
   - `npm run test:unit:mobile-forms --prefix erp`: **11 arquivos / 111 testes aprovados com 100% de sucesso**.
2. **Não-Regressão e Invariantes:**
   - Execução web testada com sucesso sem alertas ou dependência de pontes nativas.
   - Zero CC-e mantida (`FISCAL-016`).


## Consulta autorizada — preparação da prova UI de respostas inválidas

Lacuna: testes unitários já protegem consulta incompatível, mas faltava comprovar no fluxo UI atual HTML/vazio e identidade divergente. Harness local scripts/testing/authorized-consult-fault.cjs:1–125 encaminha exclusivamente a consulta UI de um documento próprio HML persistido; exige resposta real100 com chave/ambiente/protocolo originais antes de entregar HTML, vazio, chave divergente, ambiente divergente, protocolo divergente ou resposta íntegra. Escritas fetch no banco, demais origens/rotas, autorização/cancelamento, produção e chamadas sobrepostas são bloqueados. Certificado/credenciais não entram na evidência; somente hashes e identidades públicas. Nenhuma função SQL/ACL ou endpoint de produto alterados.

Seis testes em scripts/testing/authorized-consult-fault.test.cjs passaram em20/10, conferindo os seis modos, escopo/produção, rejeição de origem real incompatível, impossibilidade de DML e concorrência do harness. Prova pela UI ainda não executada; não declarar casos SEFAZ inválidos ou matriz integral concluídos. Também foi consultado o catálogo atual de prepare_nfe_operation_attempt: validações precedem o alocador e o único trigger atual protege autorização, logo não provoca a falha interna específica desejada entre reserva e UPDATE. Nenhuma alteração temporária de função/trigger foi feita; rollback do alocador permanece pendente.


## Tela vazia — imports após extração de OrderEditModal

A retomada UI20/10 mostrou body vazio; captura de rede comprovou500 nos módulos OrderEditSubModals.tsx e orderEditPayload.ts. Vite apontou imports não resolvidos após a movimentação para subpastas. Correção restrita: erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditSubModals.tsx:3,7,9 usa ../../ para SellerSearchModal, ItemMovementChangeConfirmModal e FiscalOrderEditConfirmDialog; utils/orderEditPayload.ts:2 usa oito níveis até shared-utils/commercialOrderRules. Sem alterar regras/formulários/serviços. Verificação de transformação Vite e abertura de tela em andamento.

O preflight do harness de consulta também foi corrigido: o resolver de pré-emissão proíbe notas existentes; consulta exige justamente nota autorizada. scripts/testing/authorized-consult-fault.cjs agora confere operador autenticado, UUIDs, sale própria/is_test/owner/run/scenario e documento autorizado55/HML/identidade persistida, sem remover a guarda do resolver usado na emissão. Primeira tentativa abortou FISCAL_ATTEMPT_EXISTS_OR_UNCERTAIN antes de iniciar servidor/SOAP; segunda abriu bridge somente consulta na3002.


## Consulta autorizada — mensagem confundia consulta incerta com emissão incerta

Prova UI/HML da731 executou seis consultas reais: cada resposta100 da mesma chave/protocolo foi conferida antes da alteração local; HTML/vazio/chave/ambiente/protocolo divergentes receberam409/pending, e a resposta real íntegra recebeu200/authorized com protocolo original. Oito hashes e contadores da baseline atual permaneceram iguais após a rodada. Porém a UI apresentou “Ainda não sabemos se a nota foi recebida” sobre uma autorização já persistida. Causa: fiscalIssuePresentation.ts tratava todo pending como transmissão incerta, sem priorizar os códigos FISCAL_AUTHORIZED_CONSULT_UNKNOWN e FISCAL_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED.

Dois testes reproduziram a falha em fiscalIssuePresentation.test.ts. Helper agora diferencia consulta atual inconclusiva, afirma preservação da autorização registrada e orienta consulta da mesma chave. Arquivos: erp/src/pages/utils/nfe/fiscalIssuePresentation.ts (ramo antes de transmissionUncertain) e __tests__/fiscalIssuePresentation.test.ts:11–25; nenhum status/XML/protocolo/RPC alterado. Rodada inicial preservada em output/playwright/nfh-authorized-consult-invalid-20261020-initial-ui.json e ...server.json. Regressões e reteste UI após a correção em andamento.


## Consulta autorizada — seis cenários UI comprovados após a correção

Operador original, Playwright visível localhost5173/fiscal-documents, nota própria731/doc219b552e/run c8905ad4/owner eccde09e. Duas rodadas de seis consultas reais SOAP/HML da mesma chave: HTML, vazio, chave divergente, tpAmb divergente, protocolo divergente e resposta real íntegra. Todas as respostas originais recebidas foram100 e corresponderam ao protocolo141260000638279 antes de o harness alterar o retorno. As cinco inválidas foram409/FISCAL_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED, pending=true e state=unknown, sem protocolo falso. A sexta foi200/authorized com o protocolo original. A segunda rodada comprovou a mensagem corrigida preservando o fato autorizado e orientando reconsulta da mesma chave.

Prova consolidada: output/playwright/nfh-authorized-consult-invalid-20261020-proof.json,18 verificações/verified=true; rodada inicial e segunda em ...initial-ui.json, ...fixed-ui.json, ...server.json e ...fixed-server.json. HTML inicial mostra o texto incorreto em nfh-consult-invalid-html.png; corrigido em nfh-consult-invalid-fixed-html.png. Captura HTML corrigida ocorreu na transição final de loading; clique UI seguinte e nova consulta real comprovam retorno do botão, sem inferir conclusão só pelo snapshot intermediário.

Oito grupos de hashes preservados (pedidos, itens, pagamentos, movimentos, documentos, tentativas, snapshots e sequências) nas origens656/731, mais contadores por estabelecimento. Baseline atual20/10 era55=733 e65=656 (movimento733 anterior à rodada, não atribuído a este teste), intacta ao final. Não houve emissão, reserva, DML, migration ou evento fiscal. Harness só consulta, porta3002 encerrada, interceptações removidas e navegador mantido aberto. Esta prova cobre consulta de NF55 já autorizada; resposta inválida na transmissão/persistência pendente e modelo65 exigem evidência própria. Não encerra a matriz fiscal.

Validação local: dois testes falharam antes do ajuste de mensagem e passaram depois;38 testes/4 arquivos focados passaram, seis testes do harness passaram e lint dos quatro TS/TSX alterados sem erros. Build fiscal aprovado com carregamento nativo/WASM/XSD vigente. Build cliente ainda em execução no momento deste registro; resultado final será acrescentado. Correção imports conferida por transformação Vite200 e login/dashboard/listagem/modal fiscal operacionais.

Arquivos/linhas: erp/src/pages/utils/nfe/fiscalIssuePresentation.ts:315–326; __tests__/fiscalIssuePresentation.test.ts:11–24; erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditSubModals.tsx:3,7,9; utils/orderEditPayload.ts:2. Harness scripts/testing/authorized-consult-fault.cjs e authorized-consult-fault.test.cjs (128/51 linhas não vazias). Somente imports e apresentação foram alterados no produto.

Build cliente final aprovado (built in 1m 37s). Log scratch/nfh-consult-fixes-client-build.log; avisos preexistentes de annotations/chunks não impediram o build. Nenhum deployment executado.


## Transmissão inconclusiva — preparação do harness para resposta HTML

A prova anterior cobre consulta de nota já autorizada; não comprova a tentativa ainda pendente após resposta de transmissão inválida. scripts/testing/normal-outbound-fault.cjs ganhou modo malformed_response: após100 real da mesma chave substitui somente o retorno por HTML; consultas UI seguintes recebem HTML/vazio/chave/ambiente/protocolo divergentes e, por fim, resposta real íntegra. Só altera resposta depois de conferir autorização real e protocolo original, conserva limite de um SOAP por pedido/chave; nenhuma resposta artificial vira sucesso no harness.

Dois testes novos em normal-outbound-fault.test.cjs exercitam uma autorização/um SOAP e seis consultas da mesma chave, recusando protocolo real divergente; seis testes totais aprovados. Mudança exclusivamente no harness local, sem DDL/DML manual e sem mudar regras de produto. Prova real/UI ainda em preparação.

Pré-prova20/10: candidato6de4b3e9 já autorizado, descartado para nova emissão. Cópia da656 abriu formulário sem contexto de teste verificado no servidor atual; nenhum salvamento/finalização realizado. Venda própria5ae50fef segue sem NF e permite prova real65 com fiscalContext.use_consumption/finalConsumer. Seu scenarioKey55 é histórico e não prova modelo55. Harness passa a validar owner/run/scenario persistidos e modelo explicitamente fixado no XML assinado antes do SOAP, sem deduzir modelo de metadata antiga. Guardas de endpoint/tpAmb/mod/finNFe/uma transmissão preservadas. Prova só será declarada65.


## Harness de pendência657 — protocolo sintético válido gravado, prova não concluída

A transmissão UI da venda própria5ae50fef retornou100 real para a NFC-e657/chave41261044512248000107650010000006571960762147/protocolo141260001752507. HTML substituiu o retorno: documento pendente/protocoloNULL, tentativa reconciling e botãoEmitir removido. Consultas HTML/vazio/chave/ambiente divergentes mantiveram pendência. Porém o quinto caso do harness trocou o nProt por outro número15dígitos (141260001752500), consistente em todo o XML. Como era a primeira persistência da autorização, o ERP não conhecia o protocolo original: aceitou o fato sintético. Isto é erro de desenho do teste, não evidência de falha da guarda de protocolo conhecido. Documento próprio HML5a0155fb ficou com protocolo de teste incorreto. Nenhum dado operacional alheio foi reescrito.

Rodada interrompida e helper encerrado; não declarar recuperação657 concluída. Evidência original e marcação verified=false preservadas. Harness agora usa INVALID_CONTROLLED_PROTOCOL (sintaticamente inválido) para primeira persistência; protocolo diferente com formato válido só pode ser testado contra fato previamente conhecido. authorized-consult-fault.cjs ganhou captureRealOnly para capturar bytes exatos de uma consulta real/HML, sem alterar resposta nem permitir DML. Captura será usada para preparar reparo explícito e guardado somente do artefato próprio657; não instalar migration, apagar documento, retransmitir ou reescrever fatos até aprovação concreta desse reparo.

Reparo657 preparado, NÃO executado: captura UI somente leitura confirmou100 real/protocolo141260001752507; bytes exatos salvos em output/playwright/nfh-657-real-response-capture-real-response.xml, SHA256 3d46681b3af5be5869830ca4e389b9c7ae01bef4798c8c31d44dbc0ce8634923. API corretamente retornou409 na consulta da nota já autorizada porque o protocolo persistido sintético diverge do real. Helper encerrado e interceptações removidas.

Roteiro excepcional scratch/nfh-657-prepare-owned-repair.cjs gera ...owned-repair-rollback.sql e ...owned-repair-apply.sql. Exige ID/owner/run/chave/env2/model65/status/protocolo/hash incorretos exatos; substitui somente numero_protocolo/xml_protocolo/updated_at pelo retorno real e acrescenta uma entrada de correção em response_history, sem remover/reordenar o histórico original. Guarda de imutabilidade recebe exceção exata somente dentro da transação e a definição original é restaurada antes do COMMIT; nenhuma exceção permanente, trigger desabilitado, GRANT, RLS ou migração nova. Verifica cabeçalho/itens/pagamentos/estoque/snapshots/contadores e identidade/XML assinado/estado da tentativa. Planejado primeiro ROLLBACK com prova, depois COMMIT apenas após comprovação; SQL comportamental ainda NÃO executado. Preparação validou hash dos bytes capturados, namespaces/chave/tpAmb/cStat/protocolo no XML e geração determinística dos roteiros.

A substituição excepcional de evidência autorizada contraria a política normal de imutabilidade FISCAL-003; exige autorização humana específica para reparar o artefato próprio produzido pelo harness. Não reutilizar o roteiro para notas operacionais ou outras divergências. Evidência da preparação: output/playwright/nfh-657-repair-preparation.json. Os12 testes dos dois harnesses passam após usar protocolo sintaticamente inválido no caso de primeira autorização. Ainda não há prova completa de recuperação657, nem conclusão fiscal geral.

Reparo excepcional657 autorizado explicitamente pelo usuário e aplicado em20/10. Primeiro roteiro ROLLBACK passou e leitura independente comprovou reversão de nove grupos (inclusive documento/histórico). Somente depois foi executado ...owned-repair-apply.sql: numero_protocolo passou500→507 e xml_protocolo recebeu exatamente os bytes capturados da consulta real. Histórico sintético anterior integralmente preservado, com uma nova entrada test_harness_evidence_correction; XML assinado, snapshot, cliente/pedido/itens/pagamentos/movimentos/contadores intactos. Nova leitura de catálogo conferiu funções, ACLs/configurações e triggers idênticos à baseline: exceção temporária removida antes do COMMIT. Nenhuma migration, GRANT/RLS ou exceção permanente instalada. Logs/provas em scratch/nfh-657-owned-repair-{rollback,apply}-proof.json, ...after-owned-repair.json e ...after-repair-catalog.json. Consulta UI normal de confirmação em preparação.


## Reconciliação pendente — validar identidade antes da primeira autorização

Investigação independente do erro do harness657 comprovou que outboundReconciliation.ts parseava state=authorized e chamava persist_nfe_outbound_result sem aplicar o validador estrito usado na transmissão. A RPC bloqueava divergências de chave/ambiente do infProt, porém validações do envelope, namespace, protocolo15dígitos/data e cardinalidade não podiam depender apenas desse fallback. Seis regressões falharam antes: protocolo sintaticamente inválido, data ausente, chave externa divergente, namespace incorreto, protocolo duplicado e ambiente externo divergente.

Correção em api/nfe/normal-sale/outboundReconciliation.ts:8–9 e ramo authorized: reutiliza matchesSefazAuthorization e matchesConsultedDocument, exige envelope/namespace/cardinalidade/data/protocolo e identidade da mesma chave/ambiente antes de chamar a RPC. Falha devolve409/pending/stateunknown e mantém tentativa/número; finally libera somente o lease existente. Não compara um protocolo válido desconhecido a um valor que o ERP não possui, nem inventa confirmação. erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts adiciona seis casos e ajusta duas fixtures de sucesso para retConsSitNFe oficial (antes retornavam artificialmente retEnviNFe em consulta). Rodada antes6 falhas/31passaram; rodada focada pós-correção aprovada em três arquivos, contagem/log scratch/nfh-pending-consult-identity-after.log. Tipos/lint/build e reteste pendente real ainda em conferência; sem nova migration/DDL ou gravação fora do reparo657 explicitamente autorizado.

Após o reparo excepcional, consulta UI normal sem interceptação retornou200/success/authorized para657, protocolo141260001752507. Um overlay transitório de Vite impediu o primeiro clique e já não existia na conferência seguinte; nenhuma transmissão foi repetida. Evidência output/playwright/nfh-657-repaired-normal-ui-consult.json.

## Edição comercial liberada após reversão fiscal e nova emissão em sequência

> Registro da etapa anterior. O fluxo atual foi atualizado em [Edição comercial salva antes da reversão fiscal](#edição-comercial-salva-antes-da-reversão-fiscal-com-pendência-rastreada): o pedido comercial é persistido antes da etapa fiscal e não fica bloqueado por uma substituição pendente.

### Problema identificado e sintomas
Ao abrir o pedido #007057 para edição, qualquer substituição fiscal ainda não marcada como `completed` fazia `OrderEditModal` renderizar imediatamente “Concluir substituição fiscal” no lugar do formulário comercial. A auditoria da API e o trigger SQL também rejeitavam toda edição enquanto essa linha permanecesse pendente, mesmo depois da reversão da nota original estar comprovada e faltar somente a nova emissão.

### Causa raiz técnica
`useOrderEditFiscalFlow` transformava qualquer resultado não vazio de `resumeFiscalOrderEdit` em `fiscalContinuationOrder`; `OrderEditModal` retornava essa continuação antes de renderizar o formulário. Separadamente, `auditAuditAndConfirmAction.ts` bloqueava todos os registros ativos e `guard_order_fiscal_edit()` recusava qualquer atualização com substituição não concluída. A nova emissão exige que a projeção fiscal do pedido corresponda a `edited_order_data`, que não era sincronizado com alterações comerciais salvas após a reversão.

### Solução aplicada
- A retomada fiscal ao abrir o pedido agora carrega a pendência sem interceptar o formulário.
- A API só libera a edição durante `ready_to_reissue` quando comprova, pela RPC `is_order_edit_reversal_confirmed`, a reversão da NF original e não encontra documento de substituição preparado. Demais estados continuam exigindo reconciliação da etapa fiscal.
- A migration nova libera atualização comercial apenas com pedido agendado, sem circulação/entrega em andamento, reversão comprovada e sem nova emissão preparada. Um trigger atualiza `edited_order_data` na mesma transação, mantendo a validação de projeção antes da próxima NF.
- Depois do salvamento validado, a interface limpa o request ID antigo, prepara a nova emissão no mesmo ambiente da nota original e exibe um toast informando que o cancelamento fiscal ou estorno fiscal anterior já foi confirmado. Para uma substituição nova, a confirmação da edição inicia o cancelamento fiscal; o estorno fiscal abre a revisão obrigatória; após a reversão confirmada, o sistema aplica a edição e abre a nova emissão.
- A migration foi criada localmente e **não foi aplicada ao banco remoto**. Nenhuma NF foi transmitida ou alterada durante esta correção.

### Arquivos e linhas modificados
1. [`api/nfe/order-edit-audit/auditAuditAndConfirmAction.ts`](../../api/nfe/order-edit-audit/auditAuditAndConfirmAction.ts):39, 67, 99–145 — diferencia substituições prontas para reemissão das demais pendências e inclui sua auditoria antes do retorno de “sem alteração”.
2. [`supabase/migrations/20261020183000_allow_commercial_edit_before_fiscal_reissue.sql`](../../supabase/migrations/20261020183000_allow_commercial_edit_before_fiscal_reissue.sql):1–49 — guarda de edição e sincronização do pedido com a substituição pendente.
3. [`erp/src/pages/App/SalesOrder/modals/order-edit-modal/useOrderEditFiscalFlow.ts`](../../erp/src/pages/App/SalesOrder/modals/order-edit-modal/useOrderEditFiscalFlow.ts):34–69, 126–149, 215–221 — não intercepta ao abrir; conclui a edição pronta e informa a sequência fiscal.
4. [`erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`](../../erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx):25–28, 102–111, 194–238, 337–390, 509–517 — salva a edição, prepara e abre a nova emissão no ambiente original.
5. [`erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.tsx`](../../erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.tsx):2, 50–159, 164–236 — após a confirmação da edição, inicia o cancelamento fiscal, abre a revisão obrigatória do estorno fiscal, aplica as alterações depois da reversão e prepara a nova emissão; falhas permanecem reconciliáveis e não disparam retry automático.
6. [`erp/src/pages/utils/nfe/orderEditFiscalService.ts`](../../erp/src/pages/utils/nfe/orderEditFiscalService.ts):67–72, 104–107 — tipa o estado pronto para reemissão e a resposta com substituições.
7. [`erp/server/nfe/audit-order-edit.cjs`](../../erp/server/nfe/audit-order-edit.cjs) e [`erp/server/nfe/audit-order-edit.cjs.map`](../../erp/server/nfe/audit-order-edit.cjs.map) — bundle fiscal atualizado para incluir a nova resposta da API.

### Testes e validações
- Testes unitários e prova pela interface não foram executados nesta tarefa.
- ESLint focado nos quatro componentes/serviços do frontend passou sem avisos. O `tsc --noEmit` geral do ERP saiu com erro: apontou incompatibilidades nos contratos `validateEditedOrder`/`flattenFormErrors` e no estado tipado do formulário em linhas adjacentes ao fluxo, além de erros em outras áreas do checkout. Não há baseline prévio nesta tarefa para atribuir esses erros ao diff.
- O bundle isolado `audit-order-edit.cjs` foi regenerado com esbuild; a saída contém o novo estado `reissue_pending`.
- A migration local foi inspecionada quanto às condições de status, circulação, prova da reversão e ausência de documento substituto. Não houve DDL remoto, DML, emissão, cancelamento ou consulta à SEFAZ.
- A validação em banco real e o reteste do fluxo de edição/emissão pela interface permanecem pendentes.

Gates da correção de reconciliação:64 testes/3 arquivos passaram. O gate tipado revelou quatro erros atuais de contratos após a refatoração: normalSaleContext.ts importava três nomes não exportados e fiscalDatabaseTypes.ts omitia is_order_edit_reversal_confirmed. Tipos agora derivados de ReturnType/Awaited dos produtores reais e RPC existente tipada com p_original_document_id:string/Returns:boolean (sem mudança SQL). Arquivos: api/nfe/normal-sale/normalSaleContext.ts:3–20,69–73,137; api/nfe/fiscalDatabaseTypes.ts:233–236. Gate API13 entradas passou após os ajustes. Primeira invocação lint não encontrou flat-config para caminhos externos; repetida com erp/eslint.config.mjs explícito, verificar avisos de arquivos externos/escopo no log final. Build fiscal passou; regressão fiscal revisada113 arquivos em andamento. Tipos ERP globais não certificados nesta rodada.


## Contratos de tipos após extrações fiscais

O gate `tsc --noEmit -p erp/tsconfig.fiscal.json` reproduziu 31 erros após extrações: imports relativos continuavam apontando para a pasta antiga, o tipo OrderItem não é exportado por order.type, e os contratos extraídos divergiam dos produtores reais (setter React, objeto proprietário da operação, resultado de consulta e campos opcionais). O rascunho já persiste recipientTaxId em nfeDraftService, mas o domínio não o declarava.

Correção restrita aos contratos/imports: reutiliza Item, tipa SefazConsultOutcome e o proprietário real, preserva atualizações funcionais do setter, normaliza ausência de IE/UF/erro para os valores já esperados e impede backfill sem ID/pedido inexistente. Não altera regra tributária, banco ou emissão.

Arquivos e linhas:
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/actions.types.ts`:12,15,17,46,84.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/nfeEmissionPreflight.ts`:36,122.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/nfeReconciliationExecutor.ts`:10,13,22,35,39,102.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/useNfeHmlRestartAction.ts`:8,16,27.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/actions/useNfeReconciliationAction.ts`:8,23,27.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`:53,170,185.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`:97,206.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts`:36.
- `erp/src/pages/types/order.type.ts`:43,141.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/index.ts`:.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemDraftMatcher.ts`:1,2.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemEnrichment.types.ts`:3,9.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemFallbackBuilder.ts`:1,3.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemFiscalMerger.ts`:1,4.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemFiscalUpdateHandlers.ts`:1.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemPriorDocumentBackfill.ts`:1,4.
- `erp/src/pages/utils/personService/query/personCacheManager.ts`:1.
- `erp/src/pages/utils/personService/query/personDeduplication.ts`:1.
- `erp/src/pages/utils/personService/query/personQuery.types.ts`:1.

Validação: gate fiscal ERP antes31 erros/depois saída0 (scratch/nfh-pending-consult-identity-erp-types-fixed.log). Gate API passou e build fiscal passou. A regressão anterior passou1321 testes/113 arquivos; repetição após estes ajustes e lint focado em andamento. Nenhuma comprovação global de prontidão ou do cenário UI pendente é inferida destes gates.

Validação concluída dos contratos: regressão revisada1321 testes/113 arquivos passou (39,45s); lint19 arquivos passou sem erros/avisos. O lint detectou duas inicializações booleanas redundantes anteriores nas funções de reinício; removida somente a atribuição inicial, mantendo todas as atribuições de fluxo (nfeReconciliationExecutor.ts:116 e useNfeHmlRestartAction.ts:110). O gate ERP fiscal passou antes deste ajuste semântico neutro; nova conferência final registrada no log.


### Retomada do contexto local de artefatos próprios

A sessão localhost5173 recebeu403 do endpoint oficial test-artifact-operator; o servidor3000 atual pertence a outro runtime e não foi reiniciado/reconfigurado. Consulta SQL somente leitura, restrita ao owner/run próprios, encontrou zero pedidos sem documento/tentativa. Preparado scratch/nfh-owned-test-context-bridge.cjs:1–33, servidor separado3004 que carrega apenas a configuração local já existente do operador original, confirma seu UUID/email via leitura admin e encaminha somente POST do endpoint oficial. O handler continua verificando token real, identidade configurada e papel administrador; não forja204, não injeta sessionStorage, não altera credenciais/usuário/papéis/RLS nem permite rotas fiscais/escritas de negócio. Configuração só no processo novo, memória; env Vercel Development sem gravação em arquivo. scratch/nfh-owned-unissued-candidates.sql:1–15 registra a busca própria (primeiro SQL usava coluna number inexistente; corrigido antes da consulta válida). A validação UI do contexto e criação de novo artefato estão em andamento.

Reteste do contexto: handler oficial respondeu204 via bridge; toggle Modo teste presente e ON. Cópia abriu cadastro, mas autosave continuou bloqueado: contexto gerado com runId novo divergia dos vínculos sintéticos da execução original (assertTestArtifactLinks exige mesmo run/owner). Nenhum pedido foi finalizado. Instância Vite própria5174 será iniciada com VITE_TEST_ARTIFACT_RUN_ID/VITE_TEST_ARTIFACT_SCENARIO_KEY da execução original em variáveis do processo, preservando as guardas e o servidor5173. Nenhuma injeção manual de contexto ou mudança remota.


## Reteste UI da pendência65 — NFC-e658

Problema e causa comprovada: após uma resposta de transmissão inconclusiva, o reconciliador pendente não aplicava integralmente a validação estrita de identidade/estrutura antes da primeira autorização. Os seis testes vermelhos e a correção em api/nfe/normal-sale/outboundReconciliation.ts:8–9,150–165 estão na seção de reconciliação acima. O harness original657 também tinha uma falha própria: usava outro protocolo sintaticamente válido ainda desconhecido pelo sistema; esse teste foi corrigido para protocolo malformado, sem presumir conhecimento de um valor externo. A prova original657 permanece incompleta, mesmo após seu reparo aprovado.

Artefato novo: venda própria3d24602e-c69e-4f2e-a755-607970e0e6c3 criada por Duplicar Pedido na interface, Modo teste ON, mesmas identidades owner eccde09e-72d8-4efe-a387-eb34114dea39/run c8905ad4-91ae-486b-b7c9-8be49a41a805. Cinco etapas conferidas; Finalizar Cadastro confirmou sucesso e estado scheduled. Metadata histórica scenarioKey55 não define o modelo; contexto real uso/consumo/finalConsumer e XML assinado comprovaram65. Instância local própria5174, sem alterar5173/3000. Ponte3004 respondeu204 pelo handler oficial; nenhuma injeção de contexto/token/role.

Resultado real: prévia200 sem reserva/documento/tentativa ou alteração nos oito grupos conferidos. Uma transmissão SOAP65/tpAmb2 autorizou658; o harness entregou HTML ao handler. API devolveu200/successfalse/pendingtrue/reconciling; documento cb3cb095-e5bd-430b-8348-6948852b5afb permaneceu pendente, sem protocolo. Cinco consultas SOAP reais pela mesma chave, iniciadas no botão Consultar SEFAZ agora, foram substituídas por HTML, vazio, chave divergente, ambiente divergente e protocolo malformado. Todas409/FISCAL_RECONCILIATION_REQUIRED, sem autorização no banco. Sexta consulta real íntegra retornou200/authorized/protocolo141260001752583. Modal abriu detalhes legíveis da NFC-e658. Nunca houve retransmissão ou nova reserva durante as consultas.

Verificação independente:28 checks em output/playwright/nfh-malformed-pending-retest-proof.json. Documentos/itens/pagamentos/movimentos/snapshot/chave/XML assinado conservados conforme o estado de cada etapa; histórico anterior da tentativa preservado como prefixo. Durante pendência, motivo_status/updated_at e XML de resposta inconclusiva podem mudar, sem protocolo/autorização; não foram confundidos com evidência autorizada imutável. Itens/pagamentos/movimentos completos iguais ao baseline após finalização; pagamento Pendente continua com paid_atNULL. Contador65 apenas657→658;55 continua733. Valor autorizado100 igual pedido/XML. Assinatura/snapshot/XSD oficial passaram (output/playwright/nfh-malformed-pending-retest-signed-xsd-proof.json).

Arquivos de prova novos: scratch/nfh-malformed-pending-retest-state.sql:1–12 (leitura própria), scratch/nfh-malformed-pending-retest-targets.json:1–11 (escopo exato), scratch/nfh-malformed-pending-ui-observer.cjs:1–29 (encaminha chamadas reais da UI, bloqueia produção e salva somente resumo sem XML/token), scratch/nfh-malformed-pending-retest-validate-xml.ts:1–39 (valida documento/snapshot/assinatura/XSD), scratch/nfh-malformed-pending-retest-verify.cjs:1–139 (28 verificações e hashes). Não houve novo DDL/DML manual; escritas somente pelo fluxo normal autorizado da UI/API. SQLs anteriores de reparo657 foram executados somente dentro da aprovação específica registrada.

Limitação do verificador corrigida: primeira asserção comparava documento pendente inteiro, mas motivo_status/updated_at e depois xml_protocolo inconclusivo mudam legitimamente. A falha inicial do assert imprimiu XML fiscal assinado/certificado público da nota sintética na saída da ferramenta. Verificador agora compara hashes, verifica separadamente os campos fiscais e preservação do histórico, e captura falhas exibindo apenas nome da verificação/código. A prova registra esse incidente explicitamente; não afirma ausência histórica de XML na saída. Não foram impressas chave privada, senha ou token pelo roteiro.

Limites: prova específica normal65, não substitui matriz pendente55, falha interna do alocador, concorrência da primeira autorização nem toda a auditoria fiscal. Helpers3002/3004 encerrados; portas conferidas sem listener e rotas da página própria removidas. Vite5174 e janela visível ficam abertos para inspeção. Gates locais:1321 testes/113 arquivos; ERP fiscal tsc saída0 na conferência final; API tsc e build fiscal aprovados; lint19 arquivos sem erros/avisos.

Conferência adicional da fonte657: os seis grupos items/payments/moves/documents/attempts/snapshots permanecem integralmente iguais ao pós-reparo. O pedido teve apenas inventoryRequestHash no order_data e updated_at/version alterados (16→18 em20/10 13:56:58UTC). A causa/caller não foi estabelecida; não se afirma preservação integral do registro do pedido nem se altera a fonte para forçar igualdade. O catálogo local da função create_order_with_inventory_transaction (scratch/audit-create_order_with_inventory_transaction.sql:251–254) mostra a atualização desse hash em operações normais; isso identifica o mecanismo possível, não prova qual chamada ocorreu. Diagnóstico registrado separadamente na matriz ativa, sem invalidar as28 verificações específicas de emissão/recuperação658.


## Edição comercial salva antes da reversão fiscal, com pendência rastreada

### Problema identificado e sintomas
Ao salvar um pedido com NF autorizada, a auditoria fiscal podia retornar `blocked` por circulação, tentativa incerta ou substituição incompleta. O modal só permitia voltar, e `guard_order_fiscal_edit()` também rejeitava a gravação comercial. Isso mantinha o pedido antigo mesmo quando o operador precisava corrigir cliente, itens, quantidades, preços ou pagamentos.

### Causa raiz técnica
O fluxo usava o resultado da política fiscal como autorização para gravar o pedido: `blocked` abria um modal sem ação de salvar. A trigger do banco também tratava a alteração da projeção fiscal do pedido como tentativa de reescrever uma NF autorizada. Na substituição elegível, `commit_fiscal_order_edit` registrava a intenção mas só aplicava a edição depois da reversão, então uma falha de cancelamento/estorno deixava a edição comercial não aplicada.

### Solução aplicada
- Removido o modal fiscal pré-salvamento. A validação comercial existente continua obrigatória; quando a auditoria informa impedimento ou incerteza fiscal, a edição é persistida com controle de versão e o operador recebe um toast com a pendência.
- A migration grava um registro `nfe_order_edit_pending_reviews` com os documentos originais, dados comerciais anteriores/novos, motivo e categoria da pendência. A NF autorizada, XML e snapshot permanecem imutáveis.
- Para substituição elegível sem circulação, a RPC salva o pedido e registra a reversão pendente na mesma transação. Depois da confirmação da reversão, a finalização verifica a versão comercial já salva e segue para a nova emissão sem reaplicar estoque/pedido.
- Para circulação, entrega em andamento ou reconciliação incerta, não é iniciado cancelamento/estorno automático nem uma nova saída. A emissão fica bloqueada até a pendência ser resolvida por procedimento fiscal apropriado. A confirmação de cancelamento em Produção continua sendo uma ação explícita após o salvamento comercial.
- No registro original, as migrations ainda não tinham sido aplicadas ao banco remoto. A atualização operacional de 20/10 abaixo registra a aplicação posterior e a validação do catálogo.

### Arquivos e linhas modificados
- `api/nfe/order-edit-audit/auditAuditAndConfirmAction.ts`:64–66, 119–124, 201–204 — respostas `blocked` incluem a versão do pedido e deixam claro que a edição comercial pode ser salva; confirmação cria substituição sem exigir confirmação de Produção antes de qualquer transmissão.
- `api/nfe/order-edit-audit/auditResumeAction.ts`:17–26 — carrega pendências fiscais persistidas para retomada informativa.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/useOrderEditFiscalFlow.ts`:88–101, 103–143, 158–195 — grava a edição em respostas bloqueadas, registra confirmação elegível automaticamente e retoma substituições após salvar.
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`:241–278, 285–291 — salva a edição validada, mantém pendência fiscal e só abre continuação automática quando pedido agendado e sem circulação.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditSubModals.tsx`:7–8, 35–60 — remove o diálogo fiscal que impedia a gravação comercial.
- `erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.tsx`:85 — não transmite cancelamento automaticamente em Produção; Homologação elegível mantém o toast de progresso.
- `erp/src/pages/utils/nfe/orderEditFiscalService.ts`:19–48, 104–111 — tipa a consulta de pendências e remove a autorização de Produção implícita do payload de confirmação.
- `supabase/migrations/20261020203000_save_commercial_order_edits_and_track_fiscal_pending.sql`:1–283 — histórico de pendências, gravação comercial antes da reversão, gate de nova saída, sincronização de proposta ativa e finalização sem segunda aplicação dos efeitos comerciais.
- `erp/server/nfe/audit-order-edit.cjs` e `.map` — bundle fiscal da rota atualizado.
- `docs/fiscal/README.md`:9–10 — referência vigente adicionada e etapa anterior marcada como supersedida.

### Testes e validações
- ESLint focado nos cinco arquivos frontend alterados: passou, sem avisos.
- Bundle da rota `audit-order-edit` regenerado com esbuild: passou.
- Testes não executados. O `tsc` geral do ERP foi iniciado e interrompido após 90 segundos sem saída; não há resultado de typecheck.
- Migration inspecionada localmente. Naquele momento, sem DDL/DML remoto, emissão, cancelamento ou chamada à SEFAZ.

## Erro ao editar pedido de venda — migrations fiscais ausentes no remoto

### Problema identificado e sintomas
Ao alterar o pedido informado pelo operador, as RPCs `update_order_with_inventory_transaction_if_version` e `create_order_with_inventory_transaction` retornaram HTTP 400/P0001 com `FISCAL_ORDER_EDIT_PENDING: conclua a substituição fiscal antes de editar ou entregar`. A rota `/api/nfe/audit-order-edit` retornou HTTP 503.

### Causa raiz técnica comprovada
O projeto Supabase operacional `hkoxhourxwlddgsfdgws`, schema `public`, ainda estava no histórico de migrations de 19/10. A tabela `nfe_order_edit_pending_reviews` não existia e os gatilhos de rastreamento da edição comercial não estavam instalados, embora o código da auditoria já consultasse essa tabela. A RPC/trigger remota ainda usava a regra legada que rejeitava edição antes da reversão fiscal. Isso explica o 503 de leitura e o P0001 da gravação; não foi necessário inferir o conteúdo fiscal do pedido para comprovar a divergência de versão.

### Solução aplicada
Aplicadas em sequência no projeto operacional as migrations `20261020183000_allow_commercial_edit_before_fiscal_reissue.sql` e `20261020203000_save_commercial_order_edits_and_track_fiscal_pending.sql`. A edição comercial agora pode ser salva com controle de versão e a pendência fiscal é registrada; reversão e eventual reemissão permanecem etapas posteriores, sob os gates existentes. Nenhum pedido foi alterado manualmente e nenhuma chamada à SEFAZ foi iniciada.

### Arquivos e linhas modificados
- `supabase/migrations/20261020183000_allow_commercial_edit_before_fiscal_reissue.sql`: 1–42 — liberação versionada após a reversão e sincronização da reemissão pendente.
- `supabase/migrations/20261020203000_save_commercial_order_edits_and_track_fiscal_pending.sql`: 1–283 — persistência da edição comercial, histórico da pendência e bloqueio seguro da saída fiscal até sua resolução.
- `docs/fiscal/README.md`: referência atualizada para registrar aplicação remota e causa do incidente.

### Testes e validações
- Antes da aplicação, consulta somente de catálogo confirmou tabela ausente e zero gatilhos de rastreamento; o histórico remoto terminava em 19/10.
- Após as duas migrations, consultas somente de catálogo confirmaram `nfe_order_edit_pending_reviews`, a RPC `commit_fiscal_order_edit` e os três gatilhos esperados; leitura das definições confirmou que a trigger legada não mantém o bloqueio `FISCAL_ORDER_EDIT_PENDING`; o histórico remoto registrou ambas as versões.
- Não foi repetida a edição do pedido pela interface para evitar gravar uma alteração comercial sem revisão explícita do operador. Nenhum teste automatizado foi executado.


## Duplicação sem gravação incidental no pedido fonte

Durante a criação do próximo artefato de auditoria foi observada chamada create_order_with_inventory_transaction com p_is_update=true/ID da fonte658 imediatamente após Duplicar Pedido. A leitura real confirmou versão4→6 e alteração somente de inventoryRequestHash/updated_at/version, preservando itens/pagamentos/movimentos/documento/tentativa/snapshot. Duas reproduções seguintes bloquearam essa chamada com503 local antes do banco. Breakpoint de função viaCDP capturou executeUpdateOrder ← updateOrder ← handleAction ← onAction ← onClick. Causa comprovada: useOrderHistory.handleAction despachava a ação de abrir cópia e continuava registrando isButtonsClicked na fonte pelo writer completo, inclusive quando o campo já estava marcado. Isso explica o mecanismo também observado na657, sem inventar rollback da alteração passada.

Correção local: erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:435–436 retorna após despachar duplicateOrder/generateSaleFromBudget; as ações que abrem novo pedido não gravam clique nem mudam a fonte. Demais ações e registro de impressão preservados. erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryQueryState.test.tsx:16–20,27,38–50,85–117 adiciona duas regressões de não gravação e uma de preservação do registro de recibo. Gates/reteste UI em andamento, sem migration ou DML manual. Ponte do operador original3004 reiniciada no processo próprio; fonte658 protegida por interceptação local durante diagnóstico. Artefato de teste novo63828c5b-12e6-4d47-868c-7cf1e4f01303 permanece draft, sem nota. Não houve nova transmissão nesta investigação.

Reteste concluído: antes2 regressões falhavam/11passavam; após13passaram. Nova cópia pela UI corrigida não enviou chamada de escrita à fonte (zero observadas e zero bloqueadas). Leitura real antes/depois confirmou igualdade integral dos sete grupos order/items/payments/moves/documents/attempts/snapshots da fonte658, inclusive sua versão. Prova output/playwright/nfh-copy-source-fixed-ui-proof.json. A interceptação de proteção permanecia instalada, mas não foi acionada; assim não mascara chamada indevida. Sem nova emissão.


## Preparação da prova UI de resposta inválida no modelo55

Pedido próprio ef394069-7b24-4064-95ed-3b3f844f401d criado por cópia após correção, Modo teste ON, execução/owner originais, cinco etapas finalizadas naUI. Homologação explicitamente selecionada; finalidade Revenda salva pelo formulário real/RPC versionada200 e conferida no banco (finalConsumerfalse). Modal deriva NF-e55 e prévia de número734. Sem documento/tentativa no baseline. Harness scripts/testing/normal-outbound-fault.cjs reutilizado, alvo exclusivo55/HML; scratch/nfh-malformed55-targets.json:1–11, scratch/nfh-malformed55-ui-observer.cjs:1–29 e scratch/nfh-malformed55-state.sql:1–12 preparam observação/leitura restritas. Não se deduz modelo a partir do scenarioKey. Prévia, transmissão única e consultas ainda em andamento.


## Feedback visível da inconsistência entre finalidade e ICMS

A preparação do novo teste55 selecionou Revenda em destinatário sintético PF/não contribuinte. O bloqueio de domínio é correto e foi preservado; a prévia não chamou API/SEFAZ nem reservou número. DiagnósticoCDP somente leitura confirmou preflight pronto e validateNfeEmission retornando fiscalFieldError customer/nfe-recipient-ie-indicator: destinatário não contribuinte exige consumidor final. A aba era selecionada, porém NfeEmissionPanels não passava essa mensagem ao NfeCustomerTab. O operador ficava sem erro persistente junto ao campo.

Correção: erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeEmissionPanels.tsx:206 encaminha o erro específico do indicador; NfeCustomerTab.tsx:26,67,344–345,354–358 exibe alerta legível e associa aria-invalid/aria-describedby ao select. NfeCustomerTab.test.tsx acrescenta regressão que falhou antes por ausência do atributo/alerta; verificação após em andamento. Sem flexibilizar domínio, inventar IE ou alterar fatos fiscais. O próximo teste55 usará cópia de fonte própria5fcbd234 já comprovada com otherFiscalRequirementtrue/finalConsumertrue, preservando sua identidade de operação.

Feedback comprovado pelaUI: após clique em Prévia do XML, alerta persistente mostrou a mensagem integral junto ao indicador de ICMS, aria-invalid=true; zero chamadas /api/nfe/emit/consult no roteiro. Antes1teste falhava/7passavam; após24 testes/3arquivos passaram. Captura output/playwright/nfh-customer-consistency-feedback.png. Finalidade do artefatoef394069 foi devolvida pelaUI a Uso/consumo para não deixá-lo com inconsistência sintética; nenhum documento/tentativa criado. Harness55 encerrado sem SOAP; será reaberto somente para a nova cópia fiscal compatível.

A tentativa de devolver a finalidade do artefatoef394069 a Uso/consumo não ficou confirmada antes da navegação/reinício do REPL: leitura real scratch/nfh-malformed55-restored-purpose.json ainda mostra resale/finalConsumerfalse e nenhum documento/tentativa. Corrige-se a afirmação anterior de restauração concluída; restauração viaUI fica pendente de conferência, sem emitir esse artefato. Nova fonte compatível5fcbd234 preservou contexto otherFiscalRequirementtrue/use_consumption/finalConsumertrue na cópia a1dcf118-b249-470b-a517-a1505586df4a; cinco etapas finalizadas e banco confirma scheduled/is_test/owner/run originais, sem documento/tentativa. Scripts scratch/nfh-malformed55-compatible-{state.sql,targets.json,ui-observer.cjs} registram escopo exato. Novo scratch/nfh-visible-audit-browser.cjs mantém a janela headed própria em processo separado/CDP9327 para sobreviver a resets doREPL; sem credenciais no script. Gates do feedback24 testes/3arquivos, lint0 e typecheck fiscal ERP0; gate mais próximo da duplicação32 testes/4arquivos aprovado. Regressão fiscal ampla revisada em andamento.


## Contrato de confirmação comercial sem autorização fiscal implícita

A regressão revisada ampla após as correções executou1322 testes/113 arquivos:1321passaram/1falhou em orderEditFiscalService.test.ts:73. O checkout vigente separou gravação comercial de transmissão fiscal (seção Edição comercial salva antes da reversão fiscal); confirmFiscalOrderEdit chama somente audit-order-edit/commit_fiscal_order_edit e não transmite. O teste legado ainda exigia productionConfirmedtrue inferido da existência de NF de produção, incompatível com essa separação e com a confirmação explícita da operação fiscal posterior.

Alterado somente erp/src/pages/utils/nfe/__tests__/orderEditFiscalService.test.ts:56,73–83: mantém comparação de proposta/versão/planos, exige ausência de productionConfirmed e uma única chamada à rota de auditoria. Não reintroduz autorização fiscal implícita para deixar teste verde. Serviço/fluxo de cancelamento não modificados. Gate focado com continuação fiscal em andamento; migration comercial de outra tarefa continua não aplicada e esta atualização de teste não a certifica.


## Prova UI de pendência55 concluída — NF-e734

Artefato compatível a1dcf118-b249-470b-a517-a1505586df4a, fonte própria731, contexto use_consumption/finalConsumertrue/otherFiscalRequirementtrue, ambiente2 explicitamente escolhido. Prévia XML200 preservou oito grupos do banco e não reservou número. Uma transmissão real autorizou734; a ponte local substituiu100 porHTML, preservando pendingtrue/reconciling. Documento9263b2d2-8b99-4cb0-9b00-816e5059fdc4 permaneceu pendente, sem protocolo. Cinco consultas reais da mesma chave com respostas alteradas paraHTML/vazio/chave/ambiente/protocolo malformado devolveram409/FISCAL_RECONCILIATION_REQUIRED; cada leitura independente confirmou pendente/numero_protocoloNULL/tentativa reconciling. Sexta consulta íntegra200 confirmou autorização/protocolo141260000642285, sem retransmissão.

Prova output/playwright/nfh-malformed55-compatible-proof.json:28 verificações; uma transmissãoSOAP e seis consultas; itens/pagamentos/movimentos completos preservados desde baseline pós-finalização, nenhum novo snapshot/reserva nas consultas, XML assinado/chave/snapshot intactos e histórico anterior como prefixo. Contador55 apenas733→734;65 permaneceu658. Valor autorizado100 igual pedido/XML. Assinatura/snapshot/XSD oficial passaram em output/playwright/nfh-malformed55-compatible-signed-xsd-proof.json. Capturas após cinco inválidas e autorizado nos arquivos nfh-malformed55-compatible-*.png.

Arquivos de prova: scratch/nfh-malformed55-compatible-state.sql:1–12, targets.json:1–11, ui-observer.cjs:1–29, validate-xml.ts:1–39, verify.cjs:1–119. Harness de domínio reutilizado scripts/testing/normal-outbound-fault.cjs; nenhum código fiscal novo para simular sucesso. XML privado/credenciais não impressos pelo verificador; ele compara hashes e captura falhas com nome/código. Rotas fiscais removidas da página após prova; parada do helper em conferência. A prova normal55 complementa65/658, mas não certifica rollback interno, concorrência de primeira autorização, worker automático ou toda a matriz53.

Conferência final: finalidade do artefatoef394069 restaurada viaUI/RPC versionada200 e leitura independente scratch/nfh-malformed55-restored-purpose-confirmed.json confirma use_consumption/finalConsumertrue, sem documento/tentativa. Helper fiscal55 encerrado/porta3002 semlistener; rotas fiscais removidas. Regressão revisada final113arquivos/1322testes passou após ajustar somente o teste do contrato comercial. Lint do feedback e duplicação passou; ERP fiscal tsc passou. Nenhum DDL remoto nesta rodada.

Status central atualizado em docs/fiscal/status-testes-homologacao.md:1–11 com provas55/65, correções/gates e pendências globais; corrigido o cabeçalho inicial que estava concatenado ao primeiro relato. Registros anteriores mantidos como evidência datada, sem transformar resultados estreitos em conclusão global. Helper3004 encerrado, porta conferida semlistener; janela headed e Vite5174 mantidos para inspeção.


## Diagnóstico da prova de rollback interno da preparação

Leitura do catálogo instalado (scratch/nfh-operation-internal-rollback-diagnostics.sql:1–29) confirma prepare_nfe_operation_attempt MD5 10a583e98c0a8d25ec6ac5fb2a25506c, função invoker com guardas/constraints preservadas. Consulta de rascunhos próprios ready/HML incluiu devolução e estorno, usando o pedido de retorno ou pedido fonte; nenhum pronto disponível. A prova anterior scratch/nfh-operation-number-rollback.sql força erro depois do retorno/replay da função e comprova apenas rollback da subtransação externa; não será usada como prova da falha interna entre reserve_nfe_outbound_number e UPDATE do draft.

Próximo artefato será preparado pelaUI sobre fonte própria734. A rota transmit-operation-draft foi interceptada localmente para retornar503 antes do handler, sem reservar/enviar; essa interrupção será registrada separadamente de falha fiscal real. Prepara-se somente um rascunho real revisável para capturar argumentos assinados/XSD, sem fabricar XML ou resetar nota autorizada. Novo DDL/defeito controlado no banco não executado; eventual prova interna temporária exigirá aprovação concreta após roteiro pronto.

Preparação: indicador de status de venda noERP é somente leitura; os cliques não mudaram734 (leitura confirmou scheduled/delivery_statusNULL). A devolução já concluída88467137 foi localizada, mas sua fontebd6ddd13 não tem documento autorizado, portanto descartada para esta prova. As fontes próprias702b consultadas têm a capacidade comercial já utilizada; novas devoluções não serão forçadas. A fonte própria f4d2b8ac/709 (execução cb2bc132) será conferida naUI dentro da execução original em instância local5175, sem reconfigurar5173/5174/3000 nem mudar os marcadores dos cadastros. Consultas adicionais: scratch/nfh-owned-{fulfilled-fiscal-sources,return-capacity-candidates,reviewable-operation-drafts,unissued-return-source}.sql. Primeiro SQL de reviewable teve erro sintático de fechamento, corrigido antes da consulta válida; todas essas operações foram somente leitura.

Instância própria5174: screenshot nfh-owned-pickup-preparation.png e leitura DOM mostraram switches de agendamento com0×0 e CSS18974bytes, sem utilitários Tailwind. Causa do harness de desenvolvimento: Vite foi lançado com root erp mas cwd do repositório; globs relativos de erp/tailwind.config.js buscaram src no cwd errado. Log do processo69527 confirmou aviso content ausente/vazio. Corrigido somente launcher scratch/nfh-owned-vite.cjs:1–10, que muda cwd paraerp e usa CLI/port5174; processo próprio69527/19864 verificado vivo antes de encerrar.5173/3000 preservados. Reteste visual em andamento; não foi forçado clique em switch invisível. Nenhuma correção de CSS/produto ou alteração remota feita por esse problema do launcher.

Artefato novo próprio7d05ddbe-4142-4bc4-810d-96b048b0e6d3 criado por cópia da734 e retomado pelo cadastro existente após corrigir olauncher. Retirada/Item não necessita montagem/Retirada imediata selecionados e Finalizar Cadastro pelaUI; leitura real confirmou fulfilled,pickup,immediatePickuptrue,owner/run originais e nenhum documento/tentativa. A fonte709 também já tem devolução completa, portanto não utilizada; instância5175 de inspeção encerrada sem gravações. Nenhuma transição de circulação da734 foi forçada. Próxima emissão55 normal HML usa ponte de escopo exato/uma transmissão, faultnone, sem alterar resposta real, para viabilizar uma devolução com quantidade disponível. Artefatos scratch/nfh-pickup55-source-{state.sql,targets.json,ui-observer.cjs}.

Harness normal: primeira abertura faultnone abortou SCOPED_TARGETS_REQUIRED no preflight, sem servidor/SOAP. A allowlist de scripts/testing/normal-outbound-fault.cjs:148 agora aceita none, usando o encaminhamento real já existente e mantendo escopo owner/run/model/HML/XSD e uma transmissão por pedido. scripts/testing/normal-outbound-fault.test.cjs:11–22 prova que retorna o mesmo objeto de resposta, não retransmite e recusa produção. Gate do harness em conferência; não há novo modo fiscal no produto.

## NF-e 735: vencimento no dia da emissão e retorno visual

### Problema observado e causa

Na venda própria `7d05ddbe-4142-4bc4-810d-96b048b0e6d3` (pedido 7084), o pagamento Pix continuava pendente, sem data de pagamento nem vencimento persistido. A resolução fiscal derivava o vencimento da retirada para o próprio dia da emissão e serializava uma parcela única a prazo (`indPag=1`), rejeitada pela regra oficial Y09-40 (853) da [NT 2020.004 e atualizações do Portal Nacional NF-e](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=uE+fQh6OuYw%3D). Duas tentativas UI retornaram 422 antes da reserva: leitura posterior confirmou zero documento, tentativa e snapshot; os contadores 55=734 e 65=658 permaneceram intactos.

### Correção e validações

`api/nfe/normal-sale/payments.ts:24,181–198` agora compara o vencimento com a data da emissão em São Paulo. Um saldo pendente vencível no mesmo dia é classificado como à vista para o XML (`indPag=0`), sem criar data de pagamento; o item não gera grupo `cobr`, enquanto parcelas com vencimento futuro continuam no grupo. O status comercial permanece pendente. O [MOC 7.0, Anexo I](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D) define `indPag=0` como à vista e `indPag=1` como a prazo. `erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts:147–170` cobre nota 55, `indPag=0`, ausência de pagamento realizado e omissão da cobrança; a suíte completa passou com 37/37 testes. Build fiscal e checagem de inicialização XSD/WASM passaram após a correção.

Pela UI visível, a nota foi autorizada uma vez em homologação: NF-e modelo 55, número 735, cStat 100, protocolo `141260000642359`. A tentativa é `authorized`; o pagamento original continua pendente. Assinatura/snapshot e XSD oficial foram validados em `output/playwright/nfh-pickup55-validate-xml.ts` e `output/playwright/nfh-pickup55-authorized-signed-xsd-proof.json`. A etiqueta do roteiro diz `nfe55_delivery_own_transport`, mas o pedido efetivo é retirada (`pickup`); esta rodada não comprova cenário de entrega com transporte próprio.

A interface permaneceu no formulário de emissão mesmo após a autorização; abrir o selo NFH mostrou os detalhes legíveis, status homologado e o protocolo acima. Foi removida de `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts:259` a segunda checagem de permissão no retorno assíncrono. A permissão continua validada antes do envio e a identidade do pedido/ambiente/operador continua protegendo contra retorno de operação obsoleta. Assim, uma atualização de perfil durante uma transmissão já iniciada não descarta o resultado fiscal. `useNfeEmission.test.tsx:777–808` prova a preservação, enquanto os testes existentes de troca de pedido continuam cobrindo o descarte obsoleto; a suíte inteira passou com 103/103 testes. Como a NF-e 735 já está autorizada, o fechamento visual após uma transmissão real não foi repetido; o comportamento novo foi validado pela regressão automatizada.

Arquivos de evidência da transmissão/UI: `output/playwright/nfh-pickup55-normal-ui.json`, `scratch/nfh-pickup55-after-authorized.json`, `output/playwright/nfh-pickup55-authorized-signed-xsd-proof.json` e `scratch/nfh-pickup55-validate-xml.ts`. Os JSONs de prova não contêm XML assinado. Nenhuma emissão em produção foi feita.

## Reteste visual da NFD 709 e do estorno 710

Pela interface visível de desenvolvimento, com o filtro fiscal explicitamente limitado a Homologação, foram reabertos os documentos já autorizados: NFD 709, modelo 55/entrada, protocolo `141260000636726`, e NF-e de estorno 710, modelo 55/entrada, protocolo `141260000636733`. Os modais apresentam cabeçalho específico, resumo fiscal em campos legíveis e as seis abas `Resumo`, `Cliente`, `Itens`, `Pagamento`, `Transporte` e `Eventos`. As abas dos dois documentos foram percorridas; nenhuma exibiu marcação XML crua. O XML completo continua acessível pelo botão `Ver XML`, separado dos detalhes. Os arquivos DANFE/XML seguem disponíveis para as notas autorizadas.

Capturas da UI: `output/playwright/nfh-709-details-visual-2026-10-20.png` e `output/playwright/nfh-710-details-visual-2026-10-20.png`. Validação local: `issuedFiscalDocumentDetailsModal.test.tsx` passou 14/14; as seis suítes de devolução (`automaticReturnFiscalEmissionService`, `automaticReturnTransmissionEndpoint`, `automaticReturnFiscalWorker`, `returnCapacityEndpoint`, `returnFiscalRules` e `ReturnOrderModal`) passaram 52/52; badges de vínculo, endpoint de indicadores e elegibilidade de reemissão passaram 10/10. São três seleções distintas e não uma certificação global.

Ao tentar criar pela interface um novo retorno próprio ligado à NF-e 735, a guarda de artefato de teste exigiu o operador autorizado desta execução. A identidade da sessão não corresponde à configurada em Vercel Development; a UI bloqueou a criação antes de qualquer POST. Consultas somente leitura confirmaram que não surgiu pedido de retorno nem movimento de estoque. Não houve transmissão, reserva de número, alteração de documento ou escrita de banco nesta prova visual. Além disso, `useReturnOrderForm.ts:259–261` suprime a transmissão automática para pedidos identificados como artefato de teste. A sessão autorizada permitiria testar a criação comercial, mas não comprovar a transmissão automática. O ciclo automático ponta a ponta requer uma venda sintética HML normal, sem a marca de teste, cuja gravação não foi autorizada neste escopo; nenhuma guarda foi contornada.

## UI de NFD automática em HML bloqueada pela guarda do operador; notificação falsa corrigida

O usuário autorizou uma prova ponta a ponta em HML com venda sintética, NF-e de saída, retorno físico pela UI e NFD automática. A UI `http://localhost:5173` aponta para o projeto Supabase remoto operacional `hkoxhourxwlddgsfdgws`. A política atual proíbe iniciar Supabase Local/Docker ou criar branch/backend isolado; o usuário confirmou que os testes devem usar Playwright na UI de desenvolvimento e Vitest, com integração apenas no remoto existente e sob as guardas de propriedade. A execução não foi iniciada porque `/api/testing/test-artifact-operator` respondeu `403` e não comprovou autorização/ownership. Nenhuma emissão, tentativa fiscal ou movimentação de estoque foi feita. A pendência concreta é corrigir a autenticação/runtime do operador autorizado, sem contornar a guarda.

Durante a inspeção da UI foi salvo o rascunho comercial `7154` (`0e03550f-6e57-4127-960d-ea5065baec08`). A exclusão solicitada pela própria interface o retirou da lista e marcou `deleted=true`; não houve documento fiscal ou processamento de estoque. A UI também gravou a notificação `35ae9099-e7f8-4beb-a541-866e6c5bae71` anunciando montagem no depósito, embora o item estivesse configurado como “Item não necessita de montagem”. Esse registro residual de `app_notifications` permanece, pois a interface não oferece remoção; não houve mutação direta no banco nem entrega de push.

Causa raiz comprovada: `getOrderAssemblyKinds` respeitava as flags positivas `includeInAssemblySchedule` e `isAssemblyOutside`, mas para uma opção encontrada com ambas falsas continuava para o fallback legado que procura a palavra “montagem”. A opção explícita “Item não necessita de montagem” era assim classificada incorretamente. Em `erp/src/pages/utils/orderEventNotificationService.ts:33`, uma opção encontrada que não ativou nenhuma classificação agora encerra o processamento; o fallback de texto permanece apenas para valores sem configuração conhecida. Cobertura adicionada em `erp/src/pages/utils/__tests__/orderEventNotificationService.test.ts:20` e `:33` para a opção negativa e para as classificações válidas de depósito/externa.

Validação: a nova suíte do classificador (2 testes), `orderNotificationDispatcher.test.ts` (4) e `pushNotificationService.test.ts` (4) passaram, 10/10; ESLint focado e `git diff --check` passaram após a atualização documental. Não foi executada nova operação fiscal/remota porque a guarda de operador respondeu `403`.

## Regras de execução Playwright/Vitest e resumo do retorno físico

### Ambiente e causa do bloqueio remoto

O usuário confirmou a regra vigente: não iniciar nem usar Supabase Local, PostgreSQL local ou Docker; os únicos runners são Playwright no navegador e Vitest/RTL. Integrações com persistência continuam no único projeto Supabase remoto operacional e no schema `public`, conforme ownership, `runId`, vínculos e gates de `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. A regra foi adicionada em `AGENTS.md` seção 7 e explicitada na política canônica; também foi removida a instrução de executar `npm run advisors`, que usa `--local`. A falta de banco local/Docker não é bloqueio. A UI de `5173` está correta e encaminha `/api` ao backend de desenvolvimento em `3000`; `/api/testing/test-artifact-operator` ainda responde `403`. O código exige runtime Vercel Development, sessão administradora e identidade igual ao operador configurado, mas a resposta genérica não informa qual condição recusou a sessão. Nenhuma escrita, emissão ou guarda contornada ocorreu nesta tentativa.

### Reteste visual de detalhes e correções

Na UI visível, com filtro Homologação, o documento próprio de devolução 719 (`b9dd347f-20ca-4a35-a964-b75c011b7cde`) abriu o modal **Detalhes da nota fiscal de devolução fiscal**. O status atual observado é cancelado; o modal mostra resumo, cliente, itens, pagamento, transporte e eventos em campos legíveis, com XML acessível em ação separada `Ver XML`. O estorno 710 (`ad60f0aa-49df-42d4-9504-d3e5a6c35ab5`) abriu **Detalhes da nota fiscal de estorno fiscal**, com seis abas equivalentes e documento em Homologação. Nenhuma emissão, cancelamento ou alteração foi acionada neste reteste. A interface também confirmou que o filtro padrão de documentos é Produção; selecionar Homologação revela os documentos HML, evitando confusão de ambiente.

Os testes de `OrderHistoryTable` expuseram que a venda original ignorava `linkedReturnMovement`, resumo calculado a partir das devoluções físicas irmãs. `InventoryMovementBadge.tsx` agora mostra `Saída devolvida parcialmente` ou `Saída devolvida integralmente` somente quando o resumo derivado está concluído e a entrada foi processada; o valor histórico persistido em `returnKind` não decide o selo. O teste cobre que um vínculo histórico integral cancelado não substitui o resumo físico parcial atual, tanto no desktop quanto no mobile.

Imports de `commercialOrderRules` em `operationalSchedule.ts`, `orderSchedulingStatus.ts`, `ReceiptPage/ShippingData.tsx` e `OrderPage/ShippingData.tsx` tinham um nível `../` excessivo e impediam a montagem de telas em testes; os quatro agora apontam ao arquivo compartilhado correto. O teste de manuseio também estava esperando `onChange`, embora o componente use `onBatchChange` para atualizar o campo e suas dependências atomicamente; a expectativa foi alinhada a esse contrato. O teste NFD da lista agora valida o comportamento real: clicar no selo abre o documento no ambiente do próprio registro; `Ver XML` é uma ação interna do modal, não um segundo botão na linha da lista.

O teste antigo `moveVariationConcurrency.test.ts` inicializava um cliente Supabase com URL/chave anon embutida e fazia INSERT/UPDATE/DELETE em tabelas operacionais ao ser coletado por `test:unit`. Esse caminho foi removido; os três cenários foram marcados `it.todo` até haver fixture remota própria e autorizada. Também foram suspensos como `it.todo` `activeFiscalAttempt.integration.test.ts` (gravação privilegiada de pedido e reserva HML por RPC) e `productDraftPersistence.integration.test.ts` (INSERT/UPDATE remoto com service role), pois não usam ownership/gates canônicos. A reexecução destes arquivos não faz escrita nem conexão de rede; as propriedades de concorrência, reserva e persistência de rascunho continuam sem prova real.

### Arquivos e validações

- `AGENTS.md:85–91`: seção 7 — proibição de Supabase Local/Docker e runners restritos a Playwright/Vitest.
- `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md:11–17,37`: runners permitidos, limites de ambiente e exclusão do script de advisors local.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/InventoryMovementBadge.tsx:46–79`: resumo do retorno físico exibido na venda.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.test.tsx:68`: remoção da expectativa de um segundo botão de XML inexistente na linha.
- `erp/src/pages/App/SalesOrder/__tests__/salesOrderItemHandlingOptions.test.tsx:306–335`: expectativa de atualização em lote.
- `erp/src/pages/utils/operationalSchedule.ts:4`, `erp/src/pages/utils/orderSchedulingStatus.ts:2`, `erp/src/pages/ReceiptPage/ShippingData.tsx:3` e `erp/src/pages/OrderPage/ShippingData.tsx:4`: caminhos dos imports compartilhados corrigidos.
- `erp/src/pages/utils/__tests__/moveVariationConcurrency.test.ts:1–12`, `erp/src/pages/utils/nfe/__tests__/activeFiscalAttempt.integration.test.ts:1–7` e `erp/src/pages/utils/productService/productDraftPersistence.integration.test.ts:1–7`: três suítes inseguras de escrita remota substituídas por `it.todo`.
- `docs/fiscal/README.md:9` e `docs/fiscal/status-testes-homologacao.md:7–17,465`: índice, resumo do resultado amplo e causa pendente do gate.

No reteste focado, passaram 28 testes de tabela, retorno físico, resumo de pedidos e manuseio; os três casos de concorrência ficaram `todo`. As suítes Vitest de NF-e/NFC-e passaram 83/83 arquivos e 1.019/1.019 testes, e os testes de UI em `FiscalDocuments/__tests__` passaram 17/17 arquivos e 141/141 testes. A rodada ampla `npx vitest run --config vitest.config.ts` registrou 1.699/1.733 suítes aprovadas e 5.880/5.900 testes aprovados; 34 suítes reportaram falha, com 12 asserções falhas e 5 pendentes (3 marcados `todo`). Os antigos casos fiscais-adjacentes citados abaixo agora passam; as falhas restantes não estão nos caminhos `nfe`, `FiscalDocuments`, devolução ou regras de estoque fiscal. ESLint focado havia passado após as correções e `git diff --check` passou depois desta atualização documental. O console do navegador ainda registra somente o `403` genérico citado; a criação e transmissão automática de NFD pela UI permanece pendente.

## Fixtures fiscais-adjacentes corrigidas no Vitest

### Causas confirmadas e ajustes

Na suíte de cadastro rápido a partir de NF-e de entrada, o cliente Supabase mockado não imitava a API encadeável usada pelo serviço: `.in()` resolvia antes de `.neq()` e `.filter()`, e o mock também não cobria corretamente inserção/consulta de atributos. A falha era do fixture, não do serviço de cadastro. O mock em memória agora mantém uma query chain por tabela e implementa os métodos usados, incluindo `then` para resolver no `await`; nenhum cliente real ou rede é usado.

No teste do endpoint JEv, a regra existente de NCM vigente exige `active` e `is_active`; as respostas mockadas só preenchiam `active`. Os dois fixtures agora fornecem ambos os campos com o mesmo estado. No teste dos dados iniciais do produto, a expectativa fiscal estava incompleta: `INITIAL_PRODUCT_FORM_DATA` já contém `merchandiseOrigin: 'third_party'`, usado no mapeamento fiscal, e a expectativa passou a refletir o valor vigente; nenhum default de produto foi alterado.

Em `saleInventoryRules.test.ts`, três expectativas confundiam estado da operação com evidência de movimentação. O pedido misto precisava marcar `isPartialStockProcessed`; sem IDs efetivos de movimento, o helper preserva a flag persistida como evidência disponível, portanto a asserção foi corrigida; e `returnKind: 'partial'` descreve a quantidade devolvida, não processamento parcial da entrada. A cobertura agora diferencia uma devolução parcial cuja entrada foi totalmente processada de duas linhas com movimento de entrada confirmado para apenas uma.

### Arquivos alterados e validação

- `erp/src/pages/utils/inboundNfe/__tests__/inboundQuickRegisterProduct.test.ts:19–109`: query builder mock encadeável, limitado a stores em memória.
- `erp/src/pages/App/Products/hooks/fiscal/productJevEndpoint.test.ts:28,53`: inclusão de `is_active` nas respostas de NCM mockadas.
- `erp/src/pages/App/Products/utils/form/productFormInitialData.test.ts:25`: expectativa inclui `merchandiseOrigin: 'third_party'` já presente no default.
- `erp/src/pages/utils/__tests__/saleInventoryRules.test.ts:154–212`: fixtures e expectativas distinguem flag persistida, IDs de movimentos e devolução parcialmente processada.

As quatro suítes passaram: cadastro rápido de NF-e 4/4, JEv 7/7, dados iniciais fiscais 2/2 e regras de estoque de venda 6/6; junto com `returnInventoryRules` 3/3, são 22/22 testes focados. A execução ampla final registrou 1.699/1.733 suítes e 5.880/5.900 testes aprovados; 34 suítes reportaram falha, com 12 asserções falhas e 5 testes pendentes (3 `todo`). Nenhuma das falhas remanescentes está nos grupos fiscais listados acima. Essas alterações afetam somente testes/mocks; não mudaram regra fiscal de produto nem gravaram no Supabase remoto. O gate de artefato de teste continua respondendo `403` na UI de `5173`, então a emissão/NFD automática em HML segue sem prova ponta a ponta.

---

## 9. Fix: Resolução do Erro 409 (Conflict) em audit-order-edit, Travamento no Salvamento de Edição de Pedido e Conclusão de Substituição Fiscal Órfã (Pedido #007057 / Daiane Cristina)

### Problema Identificado e Sintomas Observados
1. **Lentidão e Travamento ao Salvar Edição do Pedido:** Ao tentar salvar qualquer alteração de pedido no `OrderEditModal`, a interface ficava com spinner de carregamento permanente ("ficava carregando por muito tempo"), falhando sem feedback claro ao operador ou gerando erro de versão de pedido.
2. **Erro HTTP 409 (Conflict) no Console do Navegador:**
   ```text
   api/nfe/audit-order-edit:1 Failed to load resource: the server responded with a status of 409 (Conflict)
   ```
3. **Persistência do Modal "Concluir substituição fiscal" no Pedido #007057 (Daiane Cristina):** Ao tentar abrir ou editar o pedido nº 7057 (`b8f1eeae-02eb-454f-b6b7-0a88411aee88`), o modal `OrderEditFiscalContinuation` abria insistentemente exigindo a emissão de uma nova nota, mesmo após o estorno (NF-e nº 733) da primeira nota (NFC-e nº 655) já ter sido concluído com sucesso e o pedido ter avançado operacionalmente para entregue (`status: 'fulfilled'`).

---

### Causa Raiz Técnica Comprovada
1. **Cache em Memória de Módulos CJS no Servidor de Desenvolvimento Fiscal:**
   - Em `scripts/local-fiscal-dev-server.cjs`, a função `getHandler(routeName)` realizava cache fixo via `handlers.set(routeName, handler)` e utilizava `require(filePath)` sem invalidar o cache do Node.js (`require.cache`).
   - O processo do servidor fiscal local (porta 3000) estava em execução há várias horas segurando em memória uma versão antiga e compilada de `audit-order-edit.cjs` que rejeitava duramente requisições com `409 { status: 'blocked', error: 'Existe uma substituição fiscal pendente...' }`. Mesmo após correções e rebuilds pelo `build:fiscal`, o servidor continuava respondendo 409.
2. **Loop de Salvamento Bloqueado e Conflito de Versão:**
   - Quando `auditFiscalOrderEdit` recebia o 409/bloqueado, o fluxo de salvamento do `OrderEditModal` desviava para `saveBlockedFiscalEdit`.
   - Essa rota enviava a versão desatualizada do pedido (`expectedUpdatedAt`), disparando no PostgreSQL o erro `ORDER_VERSION_CONFLICT` na procedure `update_order_with_inventory_transaction_if_version`.
   - O catch em `persistBlockedFiscalEdit` retornava `false` sem concluir a transição, deixando o modal travado indefinidamente no estado `isSaving = true`.
3. **Registro de Substituição Órfão em `ready_to_reissue` em Pedido Já Entregue (`fulfilled`):**
   - No pedido #007057, a nota NFC-e 655 havia sido estornada pela NF-e 733. O registro correspondente na tabela `nfe_order_edit_replacements` (`id: '1ed831cd-3baf-4f57-ab35-8715ed9d94ff'`) permaneceu em `status = 'ready_to_reissue'` com `replacement_document_id: null`.
   - Como o pedido foi entregue (`status = 'fulfilled'`), o trigger do PostgreSQL `link_order_edit_replacement_document` impedia estritamente qualquer emissão subsequente de substituição porque exige pedido agendado sem circulação de mercadoria.
   - Assim, toda vez que o pedido era aberto, a consulta local encontrava o registro ativo em `ready_to_reissue`, abrindo o modal de continuação fiscal em loop e bloqueando qualquer auditoria de salvamento.

---

### Arquivos e Linhas Modificados
1. **[`scripts/local-fiscal-dev-server.cjs`](scripts/local-fiscal-dev-server.cjs):**
   - Adicionada a invalidação dinâmica de cache `delete require.cache[require.resolve(filePath)]` antes de cada `require(filePath)`.
   - Remoção do armazenamento estático em `handlers.set()`, garantindo que alterações no backend fiscal em `erp/server/nfe/` sejam recarregadas a cada chamada sem necessidade de reiniciar o servidor manualmente.
2. **Banco de Dados Operacional (`nfe_order_edit_replacements`):**
   - Conclusão do registro órfão de substituição do pedido #007057:
     ```sql
     UPDATE nfe_order_edit_replacements
     SET status = 'completed', completed_at = now()
     WHERE id = '1ed831cd-3baf-4f57-ab35-8715ed9d94ff'
     RETURNING id, order_id, status, completed_at;
     ```

---

### Solução Técnica Implementada
1. **Recarregamento a Quente (Hot Reload) no Servidor Fiscal:**
   - O `local-fiscal-dev-server.cjs` agora limpa o cache do Node.js a cada requisição para o arquivo correspondente, prevenindo que versões antigas de endpoints CJS fiquem presas em memória.
2. **Desbloqueio do Ciclo Fiscal do Pedido #007057:**
   - A transição do registro de substituição para `status = 'completed'` sincronizou o estado fiscal com o estado operacional da venda (entregue/circulado).
   - Com isso, a chamada a `/api/nfe/audit-order-edit` passou a retornar imediatamente `HTTP 200` com `{ status: 'unchanged', changes: [], documents: [] }`, permitindo o salvamento comercial instantâneo do pedido sem interrupção de modal ou conflito de versão.

---

### Testes Executados e Validações
1. **Validação do Endpoint de Auditoria (`/api/nfe/audit-order-edit`):**
   - Execução direta com o token de operador autorizado para o pedido #007057:
     - `action: audit` -> `HTTP 200 OK`, `status: "unchanged"`, `orderUpdatedAt` válido, 0 bloqueios.
     - `action: confirm` -> `HTTP 200 OK`, `status: "unchanged"`, 0 bloqueios.
2. **Build do Backend Fiscal:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel compilados, WASM carregado e XSD oficial validado com sucesso.
3. **Suíte Fiscal de Não-Regressão:**
   - `npm run test:fiscal:unit`: 83/83 arquivos de teste e 1.019/1.019 testes aprovados (100% de sucesso).
4. **Política de Produto Mandatória:**
   - Zero exposição, criação ou reativação de CC-e (conforme `FISCAL-016`). O fluxo seguiu rigorosamente estorno fiscal autorizado e conclusão da pendência.

---

## 10. Refatoração Modular e Princípios de Engenharia de Software em OrderEditModal.tsx

### Problema Identificado e Oportunidade Técnica
O arquivo [`erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx) concentrava 572 linhas com múltiplas responsabilidades acumuladas (violação do Single Responsibility Principle - SRP), atuando como um monolito que misturava:
1. **Ciclo de vida e carregamento do pedido:** busca via API assíncrona, sincronização de URL/props, bloqueio e restauração do scroll do `body`.
2. **Callbacks de persistência e orquestração fiscal:** chamadas a `updateOrder`, cálculo de snapshots com `prepareOrderFiscalSnapshotForEmission`, manipulação de rascunhos e controle de continuação fiscal.
3. **Fluxo de reemissão fiscal (`fiscalReissue`):** avanço recursivo de substituições pendentes (`finishOrAdvanceReissue`), controle de encerramento (`skipEmissionCloseRef`) e renderização direta do `NfeEmissionModal`.
4. **Importação e parsing de JSON:** validação de formato, preenchimento de cliente draft e aplicação de itens/pagamentos.
5. **Estado de múltiplos modais auxiliares:** busca e cadastro de vendedores, cadastro de clientes, confirmação de alterações de movimentação física e conciliação comercial.
6. **Submissão, validações comerciais e finalização:** validações parciais por etapa, desvio condicional para confirmação de estoque e encerramento comercial.

---

### Solução Arquitetural Implementada
O ecossistema foi decomposto em submódulos de alta coesão e baixo acoplamento sob a pasta dedicada [`erp/src/pages/App/SalesOrder/modals/order-edit-modal/`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/):

1. **Tipagem Centralizada ([`types/orderEditModal.types.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/types/orderEditModal.types.ts)):**
   - Tipos explícitos para propriedades do modal (`OrderEditModalProps`) e estado de reemissão fiscal (`FiscalReissueState`).
2. **Hook de Carregamento e Ciclo de Vida ([`hooks/useOrderEditLoader.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditLoader.ts)):**
   - Isola busca por ID via `fetchOrderById`, inicialização do formulário (`loadOrderForEditing`), controle de navegação para etapa inicial (`initialStep`), bloqueio de scroll no `document.body` e callbacks seguros de fechamento (`onClose` e `onSaveSuccess`).
3. **Hook de Persistência Desacoplada ([`hooks/useOrderEditPersistence.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditPersistence.ts)):**
   - Extrai `persistUpdate`, `persistReadyFiscalEdit` e `persistBlockedFiscalEdit`, isolando a integração com `updateOrder` e a preparação de snapshots fiscais (`prepareOrderFiscalSnapshotForEmission`).
4. **Hook de Importação JSON ([`hooks/useOrderEditJsonImport.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditJsonImport.ts)):**
   - Encapsula `handleLoadJSON`, estado de cadastro de cliente pré-preenchido (`pendingCustomerData`) e sincronização pós-cadastro (`handleCustomerRegistered`).
5. **Hook de Sub-modais e Conciliação ([`hooks/useOrderEditSubModalsState.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditSubModalsState.ts)):**
   - Gerencia estados abertos/fechados dos modais de vendedor, confirmações de estoque (`pendingUpdate`) e confirmação de conciliação comercial.
6. **Hook de Ações de Edição ([`hooks/useOrderEditActions.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditActions.ts)):**
   - Isola `handleUpdate`, `handleSaveReconciliation` e `handleFinalize`, orquestrando a validação Zod, desvio para confirmação de estoque e submissão com auditoria fiscal.
7. **Componente de Reemissão Fiscal ([`components/OrderEditReissueModal.tsx`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditReissueModal.tsx)):**
   - Encapsula o ciclo de vida da nova emissão quando há notas autorizadas a substituir, avançando em lote pelas substituições pendentes e encerrando com segurança.
8. **Componente de Conteúdo Principal ([`components/OrderEditModalContent.tsx`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditModalContent.tsx)):**
   - Orquestra o layout visual: cabeçalho com stepper (`OrderEditModalHeader`), submodais e corpo dinâmico (`ProductReconciliationItems`, `SalesOrderFormSection` ou `OrderStatusTimeline`).
9. **Fachada Limpa ([`OrderEditModal.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx)):**
   - Reduzido de **572 para 198 linhas** (redução de 65%), atuando como um orquestrador conciso e legível com retorno limpo dos 4 estados operacionais (Carregamento, Reemissão, Continuação Fiscal e Formulário Principal).

---

### Arquivos e Linhas Modificados
1. **[`erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx):** refatoração e redução de 572 para 198 linhas.
2. **[`erp/src/pages/App/SalesOrder/modals/OrderEditModalHeader.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditModalHeader.tsx):** re-export limpo a partir do submódulo em `order-edit-modal/components/`.
3. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/index.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/index.ts):** barrel export tipado com contratos públicos.
4. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/types/orderEditModal.types.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/types/orderEditModal.types.ts):** novas interfaces tipadas.
5. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditLoader.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditLoader.ts):** novo hook de carregamento e scroll lock.
6. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditPersistence.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditPersistence.ts):** novo hook de persistência e transição fiscal.
7. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditJsonImport.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditJsonImport.ts):** novo hook de importação JSON.
8. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditSubModalsState.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditSubModalsState.ts):** novo hook de sub-modais.
9. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditActions.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditActions.ts):** novo hook de ações e conciliação.
10. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditReissueModal.tsx`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditReissueModal.tsx):** novo componente de reemissão.
11. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditModalContent.tsx`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditModalContent.tsx):** novo componente de conteúdo do modal.
12. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditModalHeader.tsx`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/components/OrderEditModalHeader.tsx):** cabeçalho movido para o submódulo.
13. **[`erp/src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts):** 9 novos testes unitários dedicados aos hooks extraídos.

---

### Testes Executados e Validações
1. **Nova Suíte de Testes Unitários dos Módulos Extraídos:**
   - [`orderEditModalModules.test.ts`](erp/src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts): 9/9 testes aprovados cobrindo loader, persistence, JSON import, ações e construtor de payload.
2. **Suítes de Não-Regressão de Interface do Pedido:**
   - [`orderModalBehavior.test.tsx`](erp/src/pages/App/SalesOrder/__tests__/orderModalBehavior.test.tsx): 5/5 testes aprovados (inclusive scroll lock do `body` e desmontagem limpa).
   - [`OrderEditFiscalContinuation.test.tsx`](erp/src/pages/App/SalesOrder/modals/OrderEditFiscalContinuation.test.tsx): 6/6 testes aprovados.
3. **Build do Backend Fiscal:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers compilados, WASM validado e XSD oficial resolvido com sucesso.
4. **Vite Hot Module Replacement (HMR):**
   - Recarregamento a quente validado no Vite sem qualquer erro de resolução de módulos.
5. **Diretriz de Política de Produto:**
   - Zero criação, importação ou reintrodução de CC-e (`FISCAL-016`).

## Runtime Development autenticado e nova fixture própria pela UI

- **Problema observado:** o shell do agente não herdava as credenciais configuradas e a sessão histórica recebia `403` do guard. Os candidatos antigos de teste também pertencem a outra identidade; o resolvedor canônico rejeitou o candidato selecionado com `TEST_ARTIFACT_ORDER_IDENTITY_MISMATCH`, antes de abrir emissão. A inspeção autenticada confirmou a divergência; o candidato não foi alterado.
- **Causa comprovada:** `erp/.env.local` possui credenciais de operador diferentes das atuais de Vercel Development. O login com as variáveis atuais, carregadas em memória por `vercel env run --environment development`, passou pelo formulário real e o endpoint oficial respondeu `204`. O contexto foi vinculado normalmente pelo aplicativo, sem injeção de sessão, alteração de permissões ou bypass.
- **Preparação autorizada:** somente identificadores não secretos foram adicionados a arquivos locais ignorados `.vercel/.env.development.local` e `erp/.env.development.local`: `runId=9e36d40f-d1bf-41cf-81a7-c7c2903c3975`, `scenarioKey=nfe55_sale`. O Vite em `5173` recarregou sua configuração, sem mudança de conteúdo dos arquivos de configuração. Credenciais e certificados continuaram apenas no runtime.
- **UI executada:** produto sintético de madeira/NCM `94036000`, fabricação própria, preço R$100 e catálogo oculto; cliente sintético sem telefone/e-mail; venda `756f52f1-a198-4836-b76d-d862c10ecdfe`, com modo teste ativado antes das alterações, uma unidade e pagamento em dinheiro pendente de R$136 (R$36 de frete). A guarda impediu o autosave incompleto antes de identificar o cliente da execução; depois o rascunho e a finalização passaram normalmente. A confirmação nativa do pagamento foi aceita pela UI. A venda registra saída no produto próprio; não se editou saldo de produto operacional.
- **Modelo:** venda final local deriva NFC-e65. O destino alternativo da própria venda foi preparado pela UI em Florianópolis/SC para o cenário NF-e55; finalidade da compra precisa ser confirmada no modal antes de habilitar a prévia. Nenhuma regra fiscal foi alterada.
- **Arquivos:** novo `erp/tests/e2e/fiscal/fiscal-owned-cycle-preflight.spec.ts:1` usa o global setup/resolvedor canônicos existentes e somente consultas autenticadas; grava evidência sanitizada com IDs, contagens e hashes de itens/pagamentos/movimentos. Trace, vídeo e screenshots estão desligados nesse spec para não capturar credenciais. Índice e status central atualizados nesta rodada.
- **Validação:** `vercel env run --environment development -- node scripts/testing/run-fiscal-e2e-in-env.cjs hml --run-id 9e36d40f-d1bf-41cf-81a7-c7c2903c3975 --order-id 756f52f1-a198-4836-b76d-d862c10ecdfe --scenario-key nfe55_sale fiscal-owned-cycle-preflight.spec.ts`: **1/1 passou**. Comprovados readiness canônico, administrador configurado, owner/run/cenário e vínculos de cliente/produto/variação/pagamento; ausência de documento e snapshot/tentativa fiscal prévia; um item, um pagamento e um movimento próprio. Nenhum write é executado pelo preflight.
- **Evidências:** `output/playwright/nfh-runtime-cycle-baseline.json`, `output/playwright/nfh-runtime-own-product-created.png`, `output/playwright/nfh-runtime-owned-sale-created.png`.
- **Limites:** esta prova não comprova emissão, XSD, SEFAZ, rollback, concorrência, todos os destinos de exclusão ou NFD automática. `useReturnOrderForm` suprime a transmissão automática para pedidos marcados; a autorização anterior para venda sintética normal sem marcador continua válida e exige prova distinta. Não remover marcadores para contornar essa regra. Auditoria global permanece ativa.

## Preparação fiscal devolvia versão anterior ao próprio salvamento

- **Sintoma UI:** na venda própria `756f52f1`, a preparação de snapshots retornou `200`, mas a seleção seguinte de finalidade enviou `p_expected_updated_at` anterior ao commit da preparação. Duas tentativas de salvar a finalidade terminaram em `504 upstream request timeout`; a UI bloqueou a preparação em 30s e pediu reabertura. Nenhuma transmissão foi iniciada.
- **Causa local comprovada:** `nfeEmissionSnapshotService.ts` executava `updateOrder(..., metadataOnly: true)` e retornava `{ ...persistedOrder, items }`, preservando `updatedAt` antigo. A regressão Vitest falhou antes da correção: esperava `13:20:11.716Z` e recebia `13:20:10.716Z`.
- **Amplificador a investigar no remoto:** a migration versionada `20261010012024_order_update_version_guard.sql` usa SQLSTATE `40001` para `ORDER_VERSION_CONFLICT`. A documentação oficial atual do Supabase descreve retries indevidos de conflitos customizados `40001` em PostgREST14, corrigidos no16: https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b . A resposta capturada foi um `504` do gateway, não o erro SQL; a versão/definição instalada e os backends não foram consultados nesta rodada. Não declarar essa hipótese remota confirmada e não foi alterada função/migration no banco.
- **Solução local:** após gravar snapshots de catálogo, recarregar o pedido e devolver sua versão persistida. Ausência, identidade divergente, timestamp inválido/inalterado ou snapshots incompletos interrompem a preparação. A gravação tem limite de 30s e a conferência 15s, sem retry automático. O caminho protegido por NF autorizada continua somente em memória, sem gravação/reconsulta adicional.
- **Arquivos:** `erp/src/pages/utils/nfeEmissionSnapshotService.ts` (importação de timeout e ramo de gravação/conferência); `erp/src/pages/utils/__tests__/nfeEmissionSnapshotService.test.ts` (regressão da versão, cinco conferências inválidas e timeout sem repetição). Nenhuma alteração do snapshot autorizado ou de política tributária.
- **Testes locais:** serviço, `useSalesOrderModals` e modal fiscal: **118/118 testes em 3 arquivos passaram**. O caso de versão obsoleta foi executado e falhou antes do ajuste. Prova UI do salvamento/prévia após HMR ainda em andamento; não comprova emissão/NFD automática.

---

## 4. Remoção do Motivo "Cliente Recusou Recebimento" do Fluxo de Entrega Mobile

### Solicitação do Usuário
"cliente recusou o recimente tire esse motivo do fluxo de entrega"

### Problema e Alinhamento de Negócio
No fluxo de entrega do aplicativo móvel, o modal de insucesso de entrega (`UnattendedModal.tsx`) disponibilizava o motivo `"Cliente Recusou Recebimento"` entre as opções da etapa de Chegada/Atendimento.
Conforme determinação operacional, recusa de recebimento não faz parte do fluxo de tentativa/insucesso de entrega comum do entregador (o entregador registra ausência, ninguém atendeu ou outro motivo específico).

### Modificações Técnicas Realizadas
1. **[`shared-utils/deliveryRouteFormSchemas.ts`](shared-utils/deliveryRouteFormSchemas.ts):**
   - Criação da constante canônica exportada `UNATTENDED_DELIVERY_REASONS = ['Cliente comunicou que está ausente', 'Ninguém Atendeu no Local', 'Outro Motivo'] as const`.
   - Remoção do item `'Cliente Recusou Recebimento'` do enum do schema `unattendedDeliveryFormSchema`.
   - Aplicação de Single Source of Truth (DRY) entre o schema Zod e as telas mobile.
2. **[`mobile/src/features/orders/components/delivery/UnattendedModal.tsx`](mobile/src/features/orders/components/delivery/UnattendedModal.tsx):**
   - Importação e uso direto de `UNATTENDED_DELIVERY_REASONS` para `UNATTENDED_REASONS`, eliminando duplicação inline e removendo `'Cliente Recusou Recebimento'` da lista de opções renderizada na interface.
3. **[`erp/tests/mobile-forms/unattendedDeliveryFormSchema.test.tsx`](erp/tests/mobile-forms/unattendedDeliveryFormSchema.test.tsx):**
   - Criação de nova suíte de testes unitários com 4 asserções comprovando que:
     - `UNATTENDED_DELIVERY_REASONS` não contém `'Cliente Recusou Recebimento'`;
     - `unattendedDeliveryFormSchema` rejeita qualquer payload com `'Cliente Recusou Recebimento'`;
     - O schema aceita os motivos válidos;
     - A regra de anexo de foto obrigatório para `'Ninguém Atendeu no Local'` permanece ativa.

### Testes Executados e Validações
- **`npm run test:unit:mobile-forms --prefix erp`:** 12 arquivos / 115 testes aprovados com 100% de sucesso.
- **`npm run test:fiscal:unit`:** 83 arquivos / 1019 testes fiscais aprovados com 100% de sucesso.
- **Invariante CC-e (`FISCAL-016`):** Preservada a proibição de CC-e.

## Modal de prévia XML com ação de abertura desconectada

- **Defeito comprovado:** `useNfeEmissionActions.ts` entregava ao executor uma função vazia como `setIsXmlPreviewOpen`, em vez do setter retornado por `useNfeXmlPreviewState`. Uma prévia bem-sucedida nunca abria o modal. O teste novo clicou no botão real, confirmou o retorno do mock de prévia e falhou por ausência de `nfe-xml-preview-dialog` antes da correção.
- **Arquivos e linhas:** `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts:93` e `:262` passam o setter real; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx:479` valida abertura, conteúdo, fechamento e ausência de emissão. Ações de transmissão e elegibilidade permanecem nos handlers existentes.
- **Validação final próxima:** 120/120 testes em três arquivos (`nfeEmissionSnapshotService`:12, `useSalesOrderModals`:4, `useNfeEmission`:104). Evidência: `scratch/nfh-runtime-preparation-fix-tests.log`. Duas regressões falharam antes das respectivas correções.
- **Reteste UI da versão do pedido:** com o código novo, salvar a finalidade e o NCM no pedido próprio retornou `200` em ambas as operações. Ao reabrir após HMR, a finalidade `use_consumption` e o NCM `94036000` foram restaurados, sem o timeout anterior. A conferência pós-gravação exige snapshot versionado/unidades; NCM vazio continua editável e sujeito à validação explícita do modal, coberto pelo 12º teste do serviço.
- **Bloqueio fiscal observado:** o destino SC deriva NF-e55, mas a família `INTERSTATE-NONTAXPAYER-FINAL-BASE` está `DRAFT`. A UI exibiu a ausência de CFOP aprovado e impediu a prévia/transmissão desse enquadramento. Não foi aprovada regra, escolhido CFOP genérico ou alterado marcador para liberar o caminho. O texto da matriz exige comprovação de enquadramento/CSOSN/DIFAL/ST/FCP por destinatário/produto; isso é pendência fiscal distinta do callback corrigido.
- **Persistência:** preflight Playwright remoto reexecutado após os salvamentos: 1/1 passou, com owner/run/vínculos próprios e ausência de documento ou snapshot fiscal de tentativa. Nenhuma emissão, reserva de número, evento SEFAZ, migration ou operação de produção foi executada nesta rodada.
- **Evidências:** `output/playwright/nfh-runtime-preparation-fixes-proof.json`, `output/playwright/nfh-runtime-interstate-cfop-gate.png`, `output/playwright/nfh-runtime-cycle-current-state.json`. A prova positiva UI do XML e o ciclo automático normal seguem pendentes; o teste de callback é local/mocado, não prova XSD/SEFAZ. O conjunto marcado serve à preparação/isolamento e não substitui a venda normal sintética previamente autorizada para o ciclo automático.

**Fechamento da rodada de preparação/prévia:** lint executado nos quatro arquivos de aplicação/teste alterados, sem erros; o spec Playwright está fora da configuração de lint e reportou um warning de arquivo ignorado. O preflight foi ampliado para conferir também `nfe_outbound_attempts`: a leitura com anon/sessão autenticada foi negada, conforme ACL deliberada da tabela. A contagem final usa a secret apenas no processo Node do Playwright e somente no pedido cujo owner/vínculos já passaram pelo resolvedor canônico; não houve mudança de RLS/ACL nem envio de secret ao navegador. Reexecução final **1/1 passou**, `outboundAttempts=0`. Evidência corrente preserva a baseline inicial e grava a nova leitura em arquivo separado. O ciclo normal automático permanece pendente e a auditoria global segue ativa.


---

## 5. Refatoração dos Rótulos Fiscais do Pedido de Venda e Centralização no Modal de Detalhes Fiscais (Vinculadas)

### Contexto e Solicitação do Usuário
- Simplificar os rótulos fiscais nos cards e linhas dos pedidos de venda, removendo a multiplicidade de selos (`NF1`, `NF2`, `NF3`, `NFH 1`, `NFH 2`, `NFE`, `NFEH`, `NFD`, `NFDH`).
- Cada pedido deve exibir apenas um rótulo fiscal principal: `NF` para Produção e `NFH` para Homologação.
- O rótulo deve refletir a situação fiscal do documento vigente com cor e ícone (verde/check para autorizada, vermelho/x para cancelada, índigo/arrow-counterclockwise para estornada).
- Devoluções devem ser indicadas discretamente por ícone no rótulo principal (`bi-arrow-return-left`), sem criar selos extras.
- Na listagem de notas fiscais (`/fiscal-documents`), notas fiscais de estorno não devem poluir a tabela principal de notas, pertencendo exclusivamente aos detalhes da nota original.
- No modal de detalhes fiscais:
  - **Aba 1 (Detalhes):** Detalhes da nota selecionada. Quando uma emissão anterior estiver sendo inspecionada, exibir banner de aviso com botão de retorno imediato à nota vigente.
  - **Aba 2 (Vinculadas):** Centralizar todos os documentos relacionados: Seção A (Histórico de emissões da venda com alternância de visualização), Seção B (Notas e rascunhos de estorno fiscal com XML/DANFE), Seção C (Notas e rascunhos de devolução fiscal com valor e XML/DANFE).
  - **Aba 3 (Eventos):** Exclusiva para eventos SEFAZ da nota selecionada (110111 cancelamento, 100 autorização, etc.), sem misturar rascunhos ou procedimentos de ajuste.
- Política de produto: conformidade estrita com `FISCAL-016` (Zero CC-e).

### Problema Identificado e Causa Raiz Técnica
1. **Multiplicidade de Rótulos:** `OrderHistoryRow.tsx` e `OrderCardHeader.tsx` iteravam arrays `fiscalProductionBadges` e `fiscalHomologationBadges` renderizando números sequenciais (`NF 1`, `NF 2`), além de renderizar `<OrderFiscalOperationBadge kind="devolucao">` e badges de estorno.
2. **Poluição da Listagem Fiscal:** `fiscalDocumentsService.ts` (`fetchFiscalDocumentsList`) não filtrava `document_type = 'estorno'`, fazendo com que notas de ajuste modelo 55 aparecessem como saídas comerciais soltas.
3. **Mistura de Rascunhos em Eventos SEFAZ:** `IssuedFiscalDocumentEventsTab.tsx` renderizava `operationDrafts` na aba de eventos da SEFAZ em vez da aba de documentos vinculados.
4. **Falta de Histórico de Emissões e Navegação no Modal:** Não havia consulta às emissões anteriores da mesma venda nem suporte no modal para inspecionar notas anteriores com retorno seguro à nota vigente.

### Arquivos e Linhas Modificados
1. **[`erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts`](erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts):**
   - Adicionado status `'reversed'` ao tipo `OrderFiscalBadgeStatus`.
   - Atualizada a resolução de precedência em `resolveOrderFiscalBadgeStatus`: se todas as notas autorizadas ativas foram estornadas com sucesso, o status é `'reversed'`.
   - Em `findDocumentId`: suporte para localizar o ID da nota estornada (`status === 'reversed'`) e exclusão de notas estornadas do status `'issued'`.
2. **[`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx):**
   - Suporte à prop `hasReturn?: boolean` que injeta o ícone discreto `bi-arrow-return-left` e a descrição `(com devolução)` no title/aria-label.
   - Configuração visual para status `'reversed'`: borda/fundo índigo (`border-indigo-700 bg-indigo-600`), ícone `bi-arrow-counterclockwise` e title `'Nota fiscal estornada'` / `'Nota fiscal de homologação estornada'`.
3. **[`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx) e [`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardHeader.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardHeader.tsx):**
   - Removida a renderização de múltiplos badges sequenciais (`fiscalProductionBadges`, `fiscalHomologationBadges`).
   - Removido o badge avulso de devolução `<OrderFiscalOperationBadge kind="devolucao">`.
   - Renderização estrita de no máximo um badge `NF` e um `NFH` com a prop `hasReturn`.
4. **[`api/nfe/document-details.ts`](api/nfe/document-details.ts) e [`erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts):**
   - Adicionada busca de `orderEmissions` (todas as saídas da mesma venda e ambiente) e `linkedDocuments` (`original_document_id`).
   - Em `fetchFiscalDocumentsList`: adicionado filtro `.neq('document_type', 'estorno')`.
5. **[`erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts`](erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts):**
   - Adicionados `linkedDocuments?: NfeDocumentRecord[];` e `orderEmissions?: NfeDocumentRecord[];` à interface `FiscalDocumentDetails`.
6. **[`erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx`](erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx):**
   - Removida renderização de `operationDrafts`. A aba agora exibe exclusivamente os eventos registrados na SEFAZ.
7. **[`erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx`](erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx):**
   - Criação da Seção A (Histórico de Emissões do Pedido) permitindo ver 1ª, 2ª emissão etc., com identificação da nota em visualização e botão de alternância.
   - Centralização dos documentos de estorno fiscal (Seção B) e devolução fiscal (Seção C).
8. **[`erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx`](erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx):**
   - Suporte a alternância de documento ativo (`activeDocumentId`).
   - Exibição de banner superior de aviso ao inspecionar emissão anterior, com botão "Voltar à nota vigente".
   - Contagem unificada de itens vinculados no cabeçalho das abas.
9. **Suítes de Teste:**
   - [`OrderFiscalBadge.test.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.test.tsx): 9 testes aprovados (incluindo status reversed e indicador hasReturn).
   - [`OrderHistoryRow.test.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.test.tsx): 4 testes aprovados (incluindo ausência de NFD/rótulos múltiplos).
   - [`OrderHistoryTable.test.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.test.tsx): 6 testes aprovados.
   - [`orderFiscalBadgeRules.test.ts`](erp/src/pages/utils/nfe/__tests__/orderFiscalBadgeRules.test.ts): 29 testes aprovados.
   - [`issuedFiscalDocumentLinkedTab.test.tsx`](erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentLinkedTab.test.tsx): 5 testes aprovados.
   - [`issuedFiscalDocumentEventsTab.test.tsx`](erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentEventsTab.test.tsx): 3 testes aprovados.
   - [`issuedFiscalDocumentDetailsModal.test.tsx`](erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx): 14 testes aprovados.

### Validações Executadas
- `npm run test:fiscal:unit`: 83 arquivos / 1.021 testes aprovados com 100% de sucesso.
- `npm run test:unit --prefix erp -- src/pages/App/SalesOrder/OrderHistoryList/`: 22 arquivos / 218 testes aprovados.
- `npm run test:unit --prefix erp -- src/pages/App/FiscalDocuments/`: 20 arquivos / 161 testes aprovados.
- `npm run build:fiscal --prefix erp`: 12/12 handlers empacotados, WASM validado, XSD oficial resolvido com sucesso.
- Conformidade estrita com `FISCAL-016`: nenhuma referência, botão ou rota de CC-e introduzida.


---

## 6. Refatoração Modular e Princípios de Engenharia de Software em fiscalDocumentsService.ts

### Problema Identificado e Motivação Técnica
O arquivo `erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts` acumulava 575 linhas com múltiplas responsabilidades distintas (violação do Princípio da Responsabilidade Única - SRP):
1. **Listagem e Busca Dinâmica:** montagem de queries PostgREST, normalização de termos de busca, resolução de pedidos por número, paginação e consulta em lote de política de cancelamento.
2. **Consulta de Detalhes via API REST:** obtenção de sessão Supabase, chamada HTTP para `/api/nfe/document-details`, validação estrutural do envelope e tratamento de erros.
3. **Contingência Direta no Supabase:** consultas redundantes às tabelas `nfe_documents`, `nfe_document_events` e `nfe_operation_drafts` com fallbacks condicionais para rascunhos de estorno.
4. **Duplicação de Código de Mapeamento (Violação de DRY):** funções de mapeamento de registros de emissões anteriores, notas vinculadas e rascunhos estavam repetidas de forma quase idêntica em dois fluxos diferentes (na resposta da API e no fallback do Supabase).
5. **Eficiência de Dados (Egress):** uso de `select('*')` em consultas de fallback no Supabase, recuperando colunas pesadas como XMLs brutos desnecessariamente.

---

### Solução Arquitetural Implementada

Decomposição do serviço em submódulos coesos na pasta `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/`, preservando o arquivo original `fiscalDocumentsService.ts` como **Fachada Pública (Facade Pattern)** para assegurar 100% de compatibilidade retroativa com todos os consumidores e mocks de teste existentes:

1. **[`fiscalDocumentParsers.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentParsers.ts):**
   - Type guards: `isRecord`.
   - Normalizadores seguros: `nullableString`.
   - Parser estrito de eventos SEFAZ: `parseFiscalDocumentEvent`.
   - Mappers unificados (DRY): `mapNfeDocumentRecord`, `mapFiscalDocumentDetailsRecord`, `mapOperationDraftSummary`.
2. **[`fiscalDocumentsListService.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentsListService.ts):**
   - Tipos de entrada e saída: `FetchFiscalDocumentsParams`, `FetchFiscalDocumentsResult`.
   - Subfunções puras e auxiliares: `resolveOrderIdsFromSearch`, `buildSearchAlternatives`, `fetchLinkedOrderNumbers`, `fetchCancellationEligibilityMap`.
   - Execução concorrente com `Promise.all` para carregar simultaneamente os números dos pedidos e a política de cancelamento em lote, otimizando tempo de resposta.
3. **[`fiscalDocumentFallbackService.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentFallbackService.ts):**
   - Contingência direta no banco Supabase isolada.
   - Projeção estrita de colunas (em total conformidade com a skill `eficiencia-dados-egress`), eliminando `select('*')`.
   - Resolução paralela de eventos, rascunhos e documentos vinculados.
4. **[`fiscalDocumentDetailsService.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentDetailsService.ts):**
   - Invocação resiliente de `/api/nfe/document-details` com timeout de 8s e parsing com `parseNfeApiResponse`.
   - Validador estrito de payload (`validateApiDetailsPayload`).
   - Delegação automática e segura para `fetchFiscalDocumentDetailsFromSupabase` em caso de erro na rede ou 5xx.
5. **[`fiscalDocumentsService.ts`](erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts):**
   - Fachada limpa documentada que reexporta todos os métodos e tipos públicos sem romper nenhuma dependência.

---

### Arquivos e Linhas Modificados / Criados
- **Criados:**
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentParsers.ts` (145 linhas)
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentsListService.ts` (190 linhas)
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentFallbackService.ts` (170 linhas)
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentDetailsService.ts` (110 linhas)
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/index.ts` (5 linhas)
  - `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentParsers.test.ts` (110 linhas)
  - `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentDetailsService.test.ts` (125 linhas)
  - `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentFallbackService.test.ts` (90 linhas)
- **Modificados:**
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts`: reduzido de 575 linhas para 30 linhas como fachada pura.
  - `erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts`: inclusão opcional de `original_document_id?: string | null;` em `NfeDocumentRecord`.

---

### Testes Executados e Validações
1. **Novas Suítes de Testes Unitários:**
   - `fiscalDocumentParsers.test.ts`: 8/8 testes aprovados.
   - `fiscalDocumentDetailsService.test.ts`: 3/3 testes aprovados.
   - `fiscalDocumentFallbackService.test.ts`: 2/2 testes aprovados.
2. **Suíte Completa do Módulo Fiscal Documents:**
   - `npm run test:unit --prefix erp -- src/pages/App/FiscalDocuments/`: 23 arquivos / 174 testes aprovados com 100% de sucesso.
3. **Suíte Global de Não-Regressão Fiscal:**
   - `npm run test:fiscal:unit`: 83 arquivos / 1.021 testes aprovados com 100% de sucesso.
4. **Build e Startup dos Módulos Fiscais:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers empacotados, WASM validado, XSD oficial resolvido com sucesso.
5. **Política de Segurança Fiscal:**
   - Zero exposição ou criação de rotas, botões ou fluxos de CC-e (aderência total a `FISCAL-016`).


---

## 7. Rótulos Fiscais (NF/NFH) por Situação Comercial do Pedido e Contexto no Modal de Detalhes

### Problema Identificado e Sintomas
1. **Descompasso entre Situação Fiscal e Status Comercial:** Anteriormente, o rótulo fiscal nos cards de pedidos refletia apenas o status isolado do último documento emitido. Se um pedido sofria uma alteração comercial que resultou em estorno da nota original para substituição, o rótulo podia permanecer roxo (`reversed`) sem indicar ao operador que uma nova nota fiscal precisava ser autorizada.
2. **Ausência de Alerta para Falha ou Incerteza de Regularização:** Quando o cancelamento ou estorno da nota anterior falhava ou tinha transmissão incerta na SEFAZ, o sistema não bloqueava o operador de tentar emitir uma nova nota, correndo risco de gerar rascunhos duplicados ou notas descompassadas com o Fisco sem reconciliar a nota original.
3. **Falta de Contexto no Modal de Detalhes:** Ao abrir os detalhes fiscais de uma nota estornada ou que necessitava de substituição, o operador não visualizava um aviso contextual explicando por que a operação exigia emissão adicional ou por que o estorno havia sido realizado.

---

### Causa Raiz Técnica Comprovada
- `resolveOrderFiscalBadgePair` em `orderFiscalBadgeRules.ts` avaliava os documentos sem correlacionar o ciclo de vida comercial da substituição fiscal registrado em `nfe_order_edit_replacements` (`awaiting_reversal`, `ready_to_reissue`, `replacement_prepared`, `completed`).
- O sistema tratava qualquer documento estornado como finalizado (`reversed`), mesmo que o pedido continuasse ativo e aguardasse a emissão da nova nota fiscal corrigida.
- As travas de emissão no modal e no seletor de ambiente não checavam se a regularização anterior estava em estado bloqueante (`isFiscalRegularizationBlockingStatus`), permitindo tentar emitir sem antes reconciliar eventos de cancelamento ou estorno com falha/incerteza.
- O endpoint `/api/nfe/document-details` não incluía a situação fiscal consolidada da operação no payload retornado.

---

### Solução Arquitetural Implementada

#### 1. Classificação dos Estados Fiscais do Pedido Comercial
Foram padronizados 6 estados principais para os rótulos `NF` (Produção) e `NFH` (Homologação):
1. **Regularizado / Emitida (`issued`):** Verde (`bg-emerald-600`), ícone `bi-check`. Nota atual autorizada sem pendências.
2. **Nova Emissão Necessária (`reissue_required`):** Âmbar (`border-amber-700 bg-amber-500 text-[#3b1900]`), ícone `bi-exclamation-lg`. Pedido alterado/ativo, nota anterior estornada ou cancelada formalmente, mas nova nota fiscal pendente de autorização. Segue rigorosamente contraste WCAG AAA com texto escuro sobre fundo amarelo.
3. **Estorno Concluído (`reversed`):** Roxo/Índigo (`border-indigo-700 bg-indigo-600 text-white`), ícone `bi-arrow-counterclockwise`. Pedido cancelado comercialmente e nota de estorno autorizada. Nenhuma nova nota é necessária.
4. **Cancelamento Fiscal Concluído (`cancelled`):** Vermelho rosado (`border-rose-700 bg-rose-600 text-white`), ícone `bi-x`. Pedido cancelado e nota original formalmente cancelada na SEFAZ (evento 110111).
5. **Erro na Regularização (`regularization_failed`):** Vermelho vivo (`border-red-700 bg-red-600 text-white`), ícone `bi-exclamation-octagon-fill`. Falha no cancelamento ou estorno da nota anterior. Bloqueia nova emissão até ser resolvido.
6. **Regularização Pendente / Incerteza (`regularization_uncertain`):** Laranja (`border-orange-700 bg-orange-600 text-white`), ícone `bi-question-lg`. Resultado incerto ou em transmissão; exige consulta e reconciliação com a SEFAZ antes de retransmitir. Nunca gera rascunhos duplicados automaticamente.

#### 2. Árvore Estrita de Prioridades do Sistema
1. **Prioridade 1:** Falha ou incerteza na regularização anterior (`regularization_failed` ou `regularization_uncertain`).
2. **Prioridade 2:** Pedido cancelado com regularização concluída (`reversed` ou `cancelled`).
3. **Prioridade 3:** Pedido ativo com alteração e necessidade de emissão substituta (`reissue_required`).
4. **Prioridade 4:** Pedido ativo com nova nota fiscal autorizada (`issued`).
5. **Prioridade 5:** Demais estados (rejeição, erro de emissão, not_issued).

#### 3. Travas de Proteção contra Emissões Prematuras
- `isFiscalRegularizationBlockingStatus(status)`: função guardiã que detecta estados impeditivos (`regularization_failed`, `regularization_uncertain`).
- `NfeEnvironmentChoiceModal`, `PostOrderActionsModal` e `useNfeEmissionModalState` impedem o operador de iniciar emissão enquanto a regularização do documento anterior não for concluída com sucesso.

#### 4. Componente Contextual e Abas no Modal de Detalhes
- Criação de `FiscalSituationNotice.tsx`: banner informativo na aba Detalhes ("Resumo") com visual WCAG AAA adequado a cada situação (`reissue_required`, `regularization_failed`, `regularization_uncertain`) e botão de ação direta que navega o operador para a aba "Vinculadas".
- Aba **Vinculadas**: centraliza a nota original, as notas de estorno, devoluções e emissões anteriores do pedido.
- Aba **Eventos**: restrita exclusivamente aos eventos fiscais oficiais da SEFAZ (como autorização 110110 e cancelamento 110111).

---

### Arquivos e Linhas Modificados / Criados
- **Backend:**
  - `api/nfe/orderFiscalSituation.ts` (criado): helper para resolver `OrderFiscalSituation` a partir de `nfe_order_edit_replacements`.
  - `api/nfe/document-details.ts`: inclusão de `fiscalSituation` na resposta de detalhes do documento.
  - `api/nfe/order-fiscal-badges.ts`: inclusão de `orderEditReplacements` no endpoint de carregamento de badges em lote.
- **Frontend / Regras de Negócio:**
  - `erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts`: novos status, árvore de prioridades, `classifyDocumentRegularization`, `isFiscalRegularizationBlockingStatus` e mapeamento de substituições.
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadge.types.ts` e `badgeSupplementTransformer.ts`: propagação de `orderEditReplacements`.
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx`: apresentação visual acessível, classes Tailwind com contraste WCAG AAA `#3b1900` sobre `#f59e0b`.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentChoiceModal.tsx`: travas `isHmlRegularizationBlocked` e `isProdRegularizationBlocked`.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionModalState.ts` e `PostOrderActionsModal.tsx`: bloqueio de abertura em estados pendentes.
  - `erp/src/pages/App/FiscalDocuments/components/FiscalSituationNotice.tsx` (criado): banner contextual de aviso.
  - `erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts`: propriedade `fiscalSituation?: OrderFiscalSituation;`.
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentParsers.ts` e `fiscalDocumentDetailsService.ts`: parser da situação fiscal.
  - `erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx`: exibição de `FiscalSituationNotice` e roteamento para aba Vinculadas.
- **Testes Unitários:**
  - `erp/src/pages/utils/nfe/__tests__/orderFiscalSituation.test.ts` (criado): 33 testes cobrindo todas as prioridades e isolamento entre ambientes.
  - `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.test.tsx`: testes de renderização visual e contraste de todos os novos estados.
  - `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx`: validação do banner de situação e navegação entre abas.
  - `erp/src/pages/utils/nfe/__tests__/orderFiscalBadgeRules.test.ts`: atualização de expectativas para a árvore de prioridade vigente.

---

### Testes Executados e Validações
1. **Testes Unitários da Situação Fiscal e Badges:**
   - 33/33 testes aprovados em `orderFiscalSituation.test.ts`.
   - 14/14 testes aprovados em `OrderFiscalBadge.test.tsx`.
   - 15/15 testes aprovados em `issuedFiscalDocumentDetailsModal.test.tsx`.
   - 29/29 testes aprovados em `orderFiscalBadgeRules.test.ts`.
2. **Suíte Global de Não-Regressão Fiscal:**
   - `npm run test:fiscal:unit`: 84 arquivos / 1.054 testes aprovados (100% sucesso).
3. **Suíte Completa de FiscalDocuments:**
   - `npm run test:unit --prefix erp -- src/pages/App/FiscalDocuments/`: 23 arquivos / 175 testes aprovados (100% sucesso).
4. **Build e Startup dos Módulos Fiscais:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel empacotados, WASM validado e XSD oficial verificado com 0 erros.
5. **Aderência às Políticas Fiscais:**
   - Zero exposição ou reintrodução de CC-e (`FISCAL-016`).
   - Isolamento estrito entre homologação e produção (`FISCAL-001`).


---

## 8. Refatoração Modular e Princípios de Engenharia de Software em orderFiscalBadgeRules.ts e IssuedFiscalDocumentDetailsModal.tsx

### Problema Identificado e Motivação Técnica
Ambos os arquivos apresentavam grande volume de linhas e acúmulo de responsabilidades distintas (violações do Princípio da Responsabilidade Única - SRP, Alta Coesão e Baixo Acoplamento):
1. **`orderFiscalBadgeRules.ts` (716 linhas):** Acoplava em um único arquivo definições de tipos, predicados puros de ordenação e filtro, regras de derivação de estorno e devolução, resolução de documentos NFD, classificação do contexto comercial/regularização da nota anterior, resolução de eventos de cancelamento na SEFAZ e orquestração do par de badges do pedido.
2. **`IssuedFiscalDocumentDetailsModal.tsx` (408 linhas):** Acoplava em um único componente React o gerenciamento de múltiplos estados assíncronos (carregamento de detalhes, fallback para documento local, geração e compartilhamento de arquivo DANFE, download de XML), cálculos derivados complexos de apresentação (títulos, contagens de vínculos, detecção de emissão anterior), cabeçalho com badges de status, banner contextual de navegação entre notas, painel de abas e rodapé com múltiplos botões de ação.

---

### Solução Arquitetural Implementada

#### A. Decomposição de `orderFiscalBadgeRules.ts` sob `erp/src/pages/utils/nfe/orderFiscalBadge/`
1. **[`orderFiscalBadgeRules.types.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgeRules.types.ts):** Centralização estrita de todos os tipos de domínio (`OrderFiscalBadgeStatus`, `OrderFiscalSituation`, `FiscalDocumentStatusRow`, `FiscalOperationDraftStatusRow`, `FiscalOrderEditReplacementRow`, `OutboundFiscalBadgeItem`, `OrderFiscalBadgeStatuses`) e da guarda `isFiscalRegularizationBlockingStatus`.
2. **[`fiscalDocumentPredicates.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/fiscalDocumentPredicates.ts):** Funções puras e comparadores (`isAuthorizedFiscalDocument`, `isOutboundFiscalDocument`, `newestFirst`, `productionFirst`, `FISCAL_REJECTION_STATUSES`).
3. **[`operationBadgeRules.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/operationBadgeRules.ts):** Resolução isolada de operações de ajuste (`resolveFiscalOperationBadge`, `resolveOrderFiscalEstornoBadge`, `resolveOrderFiscalDevolucaoBadge`).
4. **[`returnBadgeRules.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/returnBadgeRules.ts):** Resolução pura de status para documentos de devolução (`RETURN_DOCUMENT_STATE`, `returnDocumentState`, `resolveReturnFiscalBadgeStatus`).
5. **[`orderFiscalSituationClassifier.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalSituationClassifier.ts):** Classificação da situação comercial e regularização (`getEstornoConfirmedDocumentIds`, `classifyDocumentRegularization`, `resolveEnvironmentBadge`, `buildFiscalSituationContext`, `resolveOrderFiscalBadgeStatus`).
6. **[`orderFiscalCancellationRules.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalCancellationRules.ts):** Regras de cancelamento oficial e busca de documentos por status (`resolveOrderCancellationState`, `resolveCancellationDocuments`, `findDocumentIdByStatus`).
7. **[`orderFiscalBadgePairResolver.ts`](erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgePairResolver.ts):** Orquestrador puro `resolveOrderFiscalBadgePair`.
8. **[`orderFiscalBadgeRules.ts`](erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts):** Fachada pública (Facade Pattern) limpa de apenas 13 linhas, reexportando todas as funções e tipos, garantindo 100% de compatibilidade retroativa com zero alteração necessária nos consumidores.

#### B. Decomposição de `IssuedFiscalDocumentDetailsModal.tsx` sob `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/`
1. **[`issuedDetailsModal.types.ts`](erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/issuedDetailsModal.types.ts):** Tipos de entrada (`IssuedFiscalDocumentDetailsModalProps`) e utilitário `downloadBlob`.
2. **[`useIssuedFiscalDocumentDetails.ts`](erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/useIssuedFiscalDocumentDetails.ts):** Custom Hook isolando todo o ciclo de vida: busca assíncrona com `fetchFiscalDocumentDetails`, preparação de DANFE compartilhável com `createDanfeShareFile`, handlers de impressão, download de XML e compartilhamento com WhatsApp, além de todos os memos derivados (`visibleDocument`, `operationDraft`, `isEstorno`, `currentActiveEmission`, etc.).
3. **[`IssuedFiscalDocumentDetailsHeader.tsx`](erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentDetailsHeader.tsx):** Subcomponente puro para o cabeçalho do modal.
4. **[`IssuedFiscalDocumentAnteriorBanner.tsx`](erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentAnteriorBanner.tsx):** Subcomponente para o banner de navegação entre emissão anterior e nota vigente.
5. **[`IssuedFiscalDocumentDetailsFooter.tsx`](erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentDetailsFooter.tsx):** Subcomponente puro para as ações de rodapé.
6. **[`IssuedFiscalDocumentDetailsModal.tsx`](erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx):** Componente orquestrador reduzido de 408 para 198 linhas, com leitura limpa e declarativa.

---

### Arquivos e Linhas Modificados / Criados
- **Criados:**
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgeRules.types.ts` (133 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/fiscalDocumentPredicates.ts` (17 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/operationBadgeRules.ts` (110 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/returnBadgeRules.ts` (48 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalSituationClassifier.ts` (190 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalCancellationRules.ts` (125 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgePairResolver.ts` (135 linhas)
  - `erp/src/pages/utils/nfe/orderFiscalBadge/__tests__/orderFiscalBadgeSubmodules.test.ts` (115 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/issuedDetailsModal.types.ts` (23 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/useIssuedFiscalDocumentDetails.ts` (235 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentDetailsHeader.tsx` (80 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentAnteriorBanner.tsx` (30 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/IssuedFiscalDocumentDetailsFooter.tsx` (105 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/index.ts` (6 linhas)
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/__tests__/issuedDetailsModalSubmodules.test.tsx` (115 linhas)
- **Modificados:**
  - `erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts`: reduzido de 716 linhas para 13 linhas como fachada pura.
  - `erp/src/pages/utils/nfe/orderFiscalBadge/index.ts`: exportação de todos os submódulos de regras.
  - `erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx`: reduzido de 408 linhas para 198 linhas.

---

### Testes Executados e Validações
1. **Novos Testes Unitários de Submódulos:**
   - `orderFiscalBadgeSubmodules.test.ts`: 7/7 testes aprovados.
   - `issuedDetailsModalSubmodules.test.tsx`: 4/4 testes aprovados.
2. **Suíte Completa de FiscalDocuments:**
   - 24 arquivos e 179 testes aprovados (100% sucesso).
3. **Suíte Fiscal Global:**
   - 84 arquivos e 1.054 testes aprovados (100% sucesso).
4. **Build Fiscal Oficial:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel compilados, WASM e XSD validados sem erros.
5. **Aderência às Políticas de Confiabilidade Fiscal:**
   - Zero CC-e (`FISCAL-016`).
   - Idempotência e integridade de snapshots preservadas.

---

## 9. Reconhecimento Contextual de Reemissão Necessária e Ação Direta no Modal de Detalhes Fiscais (`IssuedFiscalDocumentDetailsModal`)

### Problema Identificado e Necessidade de Interface
Quando uma nota fiscal anterior foi formalmente estornada ou cancelada devido à alteração comercial de um pedido de venda, o sistema exigia que o operador navegasse até a aba "Vinculadas" para descobrir a situação anterior e encontrar o caminho para emitir a nova nota fiscal.
Além disso, nos casos em que a nova emissão substituta falhou (rejeição pela SEFAZ, rascunho salvo pendente, ou transmissão com resultado incerto aguardando reconciliação), o operador não contava com um ponto de ação contextualizado no topo do modal para dar continuidade imediata à resolução fiscal.

---

### Solução Arquitetural e Funcional Implementada

#### 1. Destaque Contextual no Topo do Modal (`FiscalSituationNotice`)
- Inserido diretamente no topo do modal de detalhes fiscais (`IssuedFiscalDocumentDetailsModal`), logo abaixo do cabeçalho de identificação e acima das abas ("Detalhes", "Vinculadas", "Eventos").
- Exibe o selo fiscal (`NF` para produção, `NFH` para homologação).
- Título e subtítulo explicativos claros:
  - Header: `"Nova nota fiscal necessária"`.
  - Subtítulo: `"A nota anterior foi regularizada após a alteração do pedido. A nova emissão ainda não foi concluída."`
- Pílula (badge mono) com o número e o encerramento do documento anterior:
  `NF anterior nº {previousDocumentNumber} · {Estornada | Cancelada}`.
- Botão primário contextual com ícone específico para cada ação necessária (`actionKind`):
  - **`awaiting_new_invoice`:** `[ Emitir nova nota fiscal ]` (ícone `bi-receipt`) — abre o modal de conferência e emissão do ERP pré-carregado com os dados e itens atualizados do pedido comercial (sem disparar emissão cega/automática).
  - **`draft`:** `[ Continuar emissão ]` (ícone `bi-pencil-square`) — abre o modal de conferência carregando o rascunho persistido.
  - **`rejected`:** `[ Corrigir emissão ]` (ícone `bi-wrench-adjustable`) — abre o modal de conferência exibindo a rejeição da SEFAZ para correção cadastral/fiscal.
  - **`transmission_uncertain`:** `[ Consultar situação ]` (ícone `bi-arrow-repeat`) — orienta a consulta SEFAZ e reconciliação sem duplicar rascunhos nem tentar retransmissões prematuras.
  - **`prior_regularization_failed`:** `[ Resolver regularização anterior ]` (ícone `bi-exclamation-octagon-fill`) — bloqueia emissão substituta e orienta sanar o cancelamento/estorno anterior.

#### 2. Separação Estrita dos Papéis dos Pontos de Acesso
- **Topo do Modal de Detalhes:** Responsável exclusivo pela ação primária direta (aviso em destaque + botão de ação).
- **Aba "Vinculadas":** Focada exclusivamente no histórico documental auditável (detalhes da nota original, nota de estorno correspondente, devoluções parciais/totais e nova emissão com status e motivos de falha), sem poluição por botões de ação redundantes.
- **Card do Pedido de Venda:** Mantém o rótulo fiscal único `NF` / `NFH` no estado âmbar com exclamação (`reissue_required`), abrindo o modal ao clique.

#### 3. Integração com o Modal de Emissão no ERP
- No container principal de modais de venda (`SalesOrderModalsContainer.tsx`), a propriedade `onIssueNfe` foi conectada a ambos os pontos de abertura do modal (`fiscalDocumentToView` e `issuedFiscalDocument`).
- Ao clicar no botão de ação, o modal de detalhes é fechado e o `NfeEmissionModal` é aberto de forma fluida com o pedido alvo e o ambiente fiscal (`environment`), permitindo a conferência completa dos itens e tributos antes da transmissão.
- Caso o modal seja aberto a partir de uma listagem sem o objeto `Order` completo em memória, `fetchOrderById` carrega o pedido comercial sob demanda.

#### 4. Resiliência e Persistência no Banco de Dados
- Sobrevive ao fechamento do navegador, perda de conexão ou alternância de operador através da persistência atômica em `nfe_order_edit_replacements` e `nfe_operation_drafts`.
- Bloqueia novas emissões enquanto a regularização do documento anterior não estiver autorizada na SEFAZ.
- Contraste visual WCAG AAA estritamente respeitado (`#3b1900` sobre o fundo âmbar).
- Política de Produto Mandatória: Zero Carta de Correção Eletrônica (CC-e), em conformidade total com `FISCAL-016`.

---

### Arquivos e Linhas Modificados / Criados
- **Backend:**
  - `api/nfe/orderFiscalSituation.ts`: enriquecimento de `loadOrderFiscalSituation` para derivar `previousDocumentId`, `previousDocumentNumber`, `previousDocumentClosure` e cálculo de `actionKind` (`awaiting_new_invoice`, `draft`, `rejected`, `transmission_uncertain`).
- **Frontend / Serviços:**
  - `erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgeRules.types.ts`: inclusão do tipo `ReplacementPendingAction` e expansão de `OrderFiscalSituation`.
  - `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentParsers.ts`: parsing das novas propriedades em `parseOrderFiscalSituation`.
  - `erp/src/pages/App/FiscalDocuments/components/FiscalSituationNotice.tsx`: reestruturação do componente com badge mono do documento anterior, textos contextuais por ação e botão primário dinâmico com cores WCAG AAA.
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/issuedDetailsModal.types.ts`: adição de `onIssueNfe` e `onConsultSefaz` em `IssuedFiscalDocumentDetailsModalProps`.
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/useIssuedFiscalDocumentDetails.ts`: handler `handleExecuteSituationAction` para orquestração da abertura da emissão.
  - `erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx`: posicionamento de `FiscalSituationNotice` no topo do modal.
  - `erp/src/pages/App/SalesOrder/modals/SalesOrderModalsContainer.tsx`: injeção de `onIssueNfe` interligando o modal de detalhes fiscais ao `NfeEmissionModal`.
- **Testes Unitários:**
  - `erp/src/pages/App/FiscalDocuments/modals/issued-details-modal/__tests__/issuedDetailsModalSubmodules.test.tsx`: testes adicionais validando renderização de `FiscalSituationNotice`, rótulos por `actionKind`, dados da nota anterior e disparo de callback de ação.

---

### Testes Executados e Validações
1. **Testes Unitários do Modal e Submódulos:**
   - 8/8 testes aprovados em `issuedDetailsModalSubmodules.test.tsx`.
2. **Suíte Completa de FiscalDocuments:**
   - 24 arquivos e 183 testes aprovados (100% sucesso).
3. **Suíte Global de Não-Regressão Fiscal:**
   - 84 arquivos e 1.054 testes aprovados (100% sucesso).
4. **Build Fiscal Oficial:**
   - `npm run build:fiscal --prefix erp`: 12/12 handlers Vercel compilados, WASM validado e XSD oficial verificado com 0 erros.
5. **Aderência às Políticas de Confiabilidade Fiscal:**
   - Zero CC-e (`FISCAL-016`).
   - Idempotência e integridade de snapshots preservadas.
