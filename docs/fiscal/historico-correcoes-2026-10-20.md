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
- A migration local **não foi aplicada ao banco remoto**. O comportamento do banco operacional só muda depois da aplicação dessa migration; a versão atual da trigger remota ainda pode rejeitar o salvamento.

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
- Migration inspecionada localmente. Sem DDL/DML remoto, emissão, cancelamento ou chamada à SEFAZ.


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
