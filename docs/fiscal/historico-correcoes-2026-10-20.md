# Histórico de Correções Fiscais — 2026-10-20

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
