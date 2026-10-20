# Histórico de Correções — 2026-10-19

> Registro mandatório conforme AGENTS.md §2. Toda correção realizada nesta sessão está documentada abaixo.

---

## 7. Fix: "Confirme operação não realizada e ausência de circulação" no estorno — estado inicial incorreto

### Problema
Ao abrir o modal de estorno fiscal com um rascunho já existente (`mode='estorno'` + `initialDraftId`), ou ao tentar clicar em "Iniciar nova tentativa fiscal" após uma rejeição, a mensagem de erro **"Confirme operação não realizada e ausência de circulação para preparar o estorno fiscal."** aparecia mesmo com todos os checkboxes de revisão marcados e com a ausência de circulação confirmada comercialmente.

### Causa Raiz
1. `useNfeOperationDraft.ts` inicializava `operationDidNotOccur` e `goodsDidNotCirculate` como `false`.
2. Quando um rascunho de estorno já existia (ou era carregado com status `rejected`), a tela exibia `NfeOperationDraftReview`, onde os checkboxes de setup não são renderizados (apenas os 3 de revisão tributária).
3. Ao acionar `prepareDraft()` para criar uma nova tentativa ou validar o formulário, `fiscalOperationPreparationFormSchema` falhava por encontrar os flags como `false`.

### Arquivos Modificados

| Arquivo | Linha | Alteração |
|---|---|---|
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 49-50 | `useState(false)` → `useState(() => mode === 'estorno')` para ambos os flags |
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 73 | `reason` passa a ter fallback para `payload?.draft.reason` |
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 98-107 | `useEffect` que sincroniza `mode` seta os flags para `true` |
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 134-142 | `applyDraft` sincroniza `operationDidNotOccur`, `goodsDidNotCirculate` e `reason` do rascunho de estorno carregado |

---

## 8. Fix: SEFAZ cStat 328 — CFOP 1202 indevido em estorno fiscal (finNFe=3)

### Problema
Ao transmitir um estorno fiscal de uma venda interna (CFOP 5102 original), a SEFAZ rejeitava com:
`cStat 328: CFOP de devolucao de mercadoria para NF-e que nao e de devolucao ou de retorno de mercadoria. [nItem:1]`
O rascunho recebia status `rejected` e exibia:
`Esta tentativa rejeitada é somente leitura; é necessário criar uma nova tentativa fiscal após corrigir os dados.`

### Causa Raiz Técnica
A Regra de Validação 328 da SEFAZ (MOC NF-e) proíbe taxativamente CFOPs de devolução (1.2xx / 2.2xx) quando a nota fiscal **não é de devolução** (`finNFe != 4`).
O estorno fiscal possui finalidade `finNFe = 3` (NF-e de Ajuste).
A função `suggestEstornoCfop` em `fiscalCfopResolution.ts` estava utilizando indevidamente o mapa de devolução (`OUTBOUND_TO_INBOUND_CFOP_MAP`), que convertia `5102 -> 1202`. Como `1202` é CFOP de devolução, a SEFAZ rejeitava a nota de ajuste imediatamente.

Conforme a legislação tributária (RICMS/PR art. 298) e o próprio catálogo do sistema (`catalog.ts:436`):
- O CFOP canônico de estorno de mercadoria para operação interna é **1949** ("Outra entrada de mercadoria ou prestação de serviço não especificada - estorno conforme art. 298").
- Para operação interestadual é **2949**.

### Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `erp/src/pages/utils/nfe/fiscalCfopResolution.ts` | Criado `OUTBOUND_TO_ESTORNO_INBOUND_CFOP_MAP` mapeando operações internas (5xxx) para `1949` e interestaduais (6xxx) para `2949`. Atualizado `suggestEstornoCfop` e `getEstornoCfopOptions`. |
| `erp/src/pages/utils/nfe/__tests__/fiscalCfopResolution.test.ts` | Testes unitários atualizados para validar CFOP 1949/2949 em estorno. |
| `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts` | Fixtures de estorno ajustadas para CFOP 1949. |

### Validações
- `FiscalDocuments/__tests__/` — 19/19 arquivos, 158/158 testes aprovados ✅
- `utils/nfe/__tests__/` — 83/83 arquivos, 990/990 testes aprovados ✅
- Zero regressões em devoluções (`finNFe=4`) e saídas normais (`finNFe=1`).

---

## 1. Modularização do AuthContext (Auth Feature)

### Problema
`AuthContext.tsx` concentrava ~800 linhas com responsabilidades misturadas: cache de perfil, sincronização de funcionário, simulação de papel, credenciais de senha e ciclo de vida de sessão. Qualquer modificação em uma área gerava risco de regressão em outras.

### Causa Raiz
Violação de SRP (Single Responsibility Principle) e ausência de separação por bounded context.

### Arquivos Criados / Modificados

| Arquivo | Ação |
|---|---|
| `erp/src/context/auth/auth.types.ts` | Criado — tipos `UserRole`, `Profile`, `PasswordCredentialStatus`, `AuthContextType` |
| `erp/src/context/auth/profileCache.ts` | Criado — helpers `getCachedProfile`, `setCachedProfile`, `clearCachedProfile` (localStorage) |
| `erp/src/context/auth/masterIdentity.ts` | Criado — `isMasterEmail`, `createMasterProfile` |
| `erp/src/context/auth/employeeSyncService.ts` | Criado — `syncEmployeeRecord` (sync tabela `people` com `withTimeout`) |
| `erp/src/context/auth/profileService.ts` | Criado — `fetchUserProfile` (renovação JWT, retry, cache fallback, upsert) |
| `erp/src/context/auth/useRoleSimulation.ts` | Criado — hook para modo preview de papel admin |
| `erp/src/context/auth/usePasswordCredentials.ts` | Criado — hook para ciclo de vida de credenciais de senha |
| `erp/src/context/auth/useAuthSession.ts` | Criado — hook de sessão completo: failsafe 5 s, URL params mobile, hash token, `onAuthStateChange`, WebView postMessage, logout seguro |
| `erp/src/context/auth/index.ts` | Criado — barrel de exportação |
| `erp/src/context/AuthContext.tsx` | Refatorado — fachada de ~85 linhas compondo todos os hooks |

### Testes
- `profileCache.test.ts` — 7 testes ✅
- `masterIdentity.test.ts` — 6 testes ✅
- `useRoleSimulation.test.ts` — 5 testes ✅
- `usePasswordCredentials.test.ts` — 6 testes ✅
- 33 testes de contexto + 48 de serviços de auth ✅

### Não-regressão
Todas as re-exportações preservadas para retrocompatibilidade: `useAuth`, `AuthProvider`, `UserRole`, `Profile` continuam importáveis de `@/context/AuthContext`.

---

## 2. Fix: Campo Vendedor no Pedido de Venda — Remover ícone e subtítulo

### Problema
Dropdown de seleção de vendedor exibia ícone de avatar, apelido `@nickname` e cargo do colaborador.

### Causa Raiz
`SellerInput.tsx` renderizava `<div>` com `bi-person-fill`, subtítulo de apelido e subtítulo de cargo.

### Arquivos Modificados
- `erp/src/pages/App/SalesOrder/components/SellerInput.tsx`
  - Removidos: box do ícone esquerdo, linha `@nickname`, linha de cargo
  - Resultado: dropdown exibe apenas o `fullName` do colaborador

### Testes
5 testes ✅

---

## 3. Fix: AddressSuggestionsMenu — Remover ícone das sugestões de endereço

### Problema
Cada item de sugestão de endereço exibia um ícone `bi-signpost-2` desnecessário.

### Causa Raiz
`AddressSuggestionsMenu.tsx` renderizava um `<div>` wrapper com o ícone antes do texto do endereço.

### Arquivos Modificados
- `erp/src/components/shared/AddressSuggestionsMenu.tsx`
  - Removido: div wrapper com `bi-signpost-2`
  - Resultado: sugestões exibem apenas texto (mainText + subText)

### Testes
16 testes ✅

---

## 4. Fix: Erro 400 — `column orders.observation does not exist`

### Problema
`SmartInput` com `tableName="orders"` e `columnName="observation"` gerava query `SELECT observation FROM orders` que falhava com status 400 porque o campo vive no JSONB `order_data`, não como coluna direta.

### Causa Raiz
Props `tableName`/`columnName` do `SmartInput` acionam autocomplete via Supabase contra colunas SQL diretas. Campos dentro de JSONB não podem ser referenciados assim.

### Arquivos Modificados
- `erp/src/pages/App/SalesOrder/components/shipping/CustomDeliveryAddressFields.tsx` (linhas 40-41)
  - Removidos: `tableName="orders"` e `columnName="observation"` do SmartInput de "Ponto de Referência"

---

## 5. Fix: Mesmo erro 400 — `column orders.assistanceDescription does not exist`

### Problema
Mesmo padrão do item 4, mas no formulário de Assistência Técnica.

### Causa Raiz
Idem — `assistanceDescription` vive no JSONB `order_data`, não é coluna direta de `orders`.

### Arquivos Modificados
- `erp/src/pages/App/SalesOrder/Assistance/components/AssistanceDescriptionSection.tsx` (linhas 40-41)
  - Removidos: `tableName="orders"` e `columnName="assistanceDescription"` do SmartInput de "Descrição do Serviço"

---

## 6. Fix: Crash WebGL — `Failed to initialize WebGL` ao navegar em pedidos

### Problema
`new maplibregl.Map(...)` lançava erro síncrono `Error: Failed to initialize WebGL` em ambientes Chromium sandboxed/headless (VENDOR = 0xffff, DEVICE = 0xffff, GL_VENDOR = Disabled). O erro não estava em try/catch, derrubando toda a árvore React com uncaught error.

### Causa Raiz
MapLibre GL JS lança erro síncrono (não Promise rejection) em `Map._setupPainter` quando o WebGL context não pode ser criado. Sem tratamento, o erro propagava até o React error boundary ou crashava a tela.

### Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `erp/src/pages/App/SalesOrder/components/OrderRouteMap.tsx` | Adicionado `webGlError` state; `new maplibregl.Map(...)` envolvido em `try/catch`; fallback UI "Mapa indisponível" quando WebGL falha |
| `erp/src/pages/App/SalesOrder/components/AddressVerificationMap.tsx` | Idem (feito em sessão anterior) |
| `erp/src/pages/App/SalesOrder/ShippingComponents/MapRoute.tsx` | Adicionado `webGlError` state; init envolvido em `try/catch`; fallback UI |
| `erp/src/pages/App/Dashboard/components/ProfitHeatMap.tsx` | Adicionado `webGlError` state; init envolvido em `try/catch`; fallback UI |
| `erp/src/pages/App/Dashboard/components/RegionalHeatmap.tsx` | Adicionado `webGlError` state; init envolvido em `try/catch`; fallback UI |
| `erp/src/pages/App/DeliverySchedule/DeliveryMap.tsx` | Adicionado `webGlError` state; init envolvido em `try/catch`; fallback UI |

### Solução Técnica
Padrão uniforme aplicado em todos os 6 componentes de mapa:

```tsx
let map: maplibregl.Map;
try {
  map = new maplibregl.Map({ container: mapContainer.current, ... });
} catch (e) {
  console.warn('[NomeDoComponente] WebGL context creation failed:', e);
  setWebGlError(true);
  return;
}

// No JSX:
{webGlError ? (
  <div className="...fallback...">
    <i className="bi bi-map text-4xl text-slate-300" />
    <p>Mapa indisponível neste ambiente</p>
  </div>
) : (
  <div ref={mapContainer} ... />
)}
```

### Validações
- Em ambiente com WebGL: comportamento idêntico ao anterior (try não lança, mapa carrega normalmente)
- Em ambiente sandboxed: catch captura o erro, `webGlError = true`, fallback estático é exibido, zero uncaught error
- Nenhuma regressão funcional nos demais componentes da tela

---

## 9. Refatoração e Modularização Arquitetural: Modelo Canônico de CFOP (`fiscal-cfop-model`)

### Problema
Os arquivos `shared-utils/fiscal-cfop-model/catalog.ts` (~575 linhas) e `shared-utils/fiscal-cfop-model/selection.ts` (~200 linhas) violavam os princípios de responsabilidade única (SRP), alta coesão e baixo acoplamento:
- `catalog.ts` misturava em um único arquivo: tipos TypeScript, uma tabela estática com centenas de linhas de metadados regulatórios (`CFOP_CATALOG_BASE`), dicionário semântico (`CFOP_SEMANTICS`), lógica de validação de invariantes em runtime e funções utilitárias de busca (`getCfopDefinition`, `isCfopValid`, etc.).
- `selection.ts` agregava validação de conformidade de itens (`validateItemCfopMatch`), resolução de regras de venda padrão (`determineSaleCfop`) e formatação/filtragem de listas para componentes de UI (`listActiveCfopOptions`).

### Solução Arquitetural Aplicada
Organização em módulos coesos e bem delimitados sob `shared-utils/fiscal-cfop-model/`:

1. **`types.ts`:** Centraliza todos os tipos escalares, enums e contratos de interface do modelo de CFOP (`FiscalCfopDefinition`, `FiscalCfopScope`, `ValidateItemCfopMatchParams`, `DetermineSaleCfopParams`, `ActiveCfopOption`, etc.).
2. **`data/`:**
   - `data/cfopBaseCatalog.ts`: Tabela estática de CFOPs com notas fiscais e legais regulatórias (Convênio S/Nº 15/12/1970, Ajustes SINIEF e SEFAZ-PR).
   - `data/cfopSemantics.ts`: Mapa semântico desacoplado que relaciona cada código à operação e origem de mercadoria.
   - `data/index.ts`: Barrel de exportação de dados brutos.
3. **`catalog.ts`:** Domain repository e registry com asserções de integridade estrutural, construção de `CANONICAL_CFOPS` e buscas indexadas `O(1)` (`getCfopDefinition`, `isCfopValid`, `isCfopActive`, `isCfopApplicableToModel`). Re-exporta tipos para garantir 100% de retrocompatibilidade.
4. **`validation.ts`:** Regras formais de validação de CFOP do item (`validateItemCfopMatch`: compatibilidade de direção entrada/saída, modelo 55 vs 65, destino interno/interestadual e aplicabilidade de ST).
5. **`resolution.ts`:** Lógica de determinação canônica para operações padrão de venda (`determineSaleCfop`).
6. **`options.ts`:** Geração e filtragem de opções de interface para selects/dropdowns (`listActiveCfopOptions`).
7. **`selection.ts`:** Fachada de compatibilidade re-exportando `validation`, `resolution` e `options`.
8. **`index.ts`:** Ponto único de entrada re-exportando toda a API pública.

### Arquivos Criados / Modificados

| Arquivo | Ação |
|---|---|
| `shared-utils/fiscal-cfop-model/types.ts` | Criado — Tipos e interfaces estritas do modelo CFOP |
| `shared-utils/fiscal-cfop-model/data/cfopBaseCatalog.ts` | Criado — Definições estáticas do catálogo regulatório |
| `shared-utils/fiscal-cfop-model/data/cfopSemantics.ts` | Criado — Dicionário semântico por CFOP |
| `shared-utils/fiscal-cfop-model/data/index.ts` | Criado — Barrel de exportação de dados |
| `shared-utils/fiscal-cfop-model/catalog.ts` | Refatorado — Reduzido de 574 para 52 linhas focadas no repositório de consulta |
| `shared-utils/fiscal-cfop-model/validation.ts` | Criado — Validação de correspondência de item e documento |
| `shared-utils/fiscal-cfop-model/resolution.ts` | Criado — Resolução canônica de CFOP de venda |
| `shared-utils/fiscal-cfop-model/options.ts` | Criado — Formatação e filtros de opções para UI |
| `shared-utils/fiscal-cfop-model/selection.ts` | Refatorado — Fachada re-exportando validação, resolução e opções |
| `shared-utils/fiscal-cfop-model/scope.ts` | Atualizado — Import de tipos direcionado a `./types` |
| `shared-utils/fiscal-cfop-model/index.ts` | Atualizado — Re-exportação completa de todos os módulos |
| `erp/src/pages/utils/nfe/__tests__/fiscalCfopModularModel.test.ts` | Criado — Suíte completa com 17 testes cobrindo todas as novas camadas |

### Validações e Não-Regressão
- Nova suíte de testes unitários: `fiscalCfopModularModel.test.ts` (17 testes aprovados ✅).
- Suíte completa de CFOP: `fiscalCfopResolution.test.ts`, `fiscalCfopMatrix.test.ts`, `itemFiscalCfopOptions.test.ts` (45/45 testes aprovados ✅).
- Suíte fiscal abrangente: 84 arquivos de teste, 1.007 testes executados com 100% de sucesso ✅.
- Verificação de tipos TypeScript: Zero erros em `shared-utils/fiscal-cfop-model/` e `fiscalCfopModel.ts`.
- 100% retrocompatível com todos os consumidores existentes no ERP e catálogo digital.


---

## 10. Validação das Fronteiras Exatas de Prazo de Cancelamento Fiscal (Cenários A05 e A08) e Preflight de Prontidão HML

### Problema
No plano cíclico de testes fiscais (`docs/fiscal/plano-ciclo-testes-fiscais.md`), os cenários **A05** (NF-e 55 no limite exato de 168 horas) e **A08** (NFC-e 65 no limite exato de 30 minutos) constavam como pendências sem asserções dedicadas cobrindo fuso oficial da SEFAZ-PR (`-03:00`), precisão de milissegundos antes/depois da fronteira legal e transição de ação (`cancel` -> `estorno`).

### Causa Raiz
As suítes existentes validavam apenas amostras com datas UTC arbitrárias, sem cobrir explicitamente ambos os lados da fronteira legal no instante exato (`now == deadline`, `now == deadline - 1ms`, `now == deadline + 1ms`) em consonância com a regra de "não superior ao limite" do RICMS/PR.

### Arquivos Criados / Modificados

| Arquivo | Ação |
|---|---|
| `erp/src/pages/utils/nfe/__tests__/fiscalCancellationBoundaryLimits.test.ts` | Criado — Suíte dedicada com 14 testes cobrindo os cenários A05 e A08 com timestamps reais SEFAZ-PR (`-03:00`). |

### Validações Executadas
1. **Cenário A05 (NF-e 55 — 168 horas / 7 dias):**
   * Cálculo de deadline exato: `limitMs = 168 * 3600 * 1000`.
   * `now = deadline - 1ms`: `action = 'cancel'`, `expired = false`, tempo restante formatado como `7 dias e 0 min`.
   * `now = deadline` (instante exato): `action = 'cancel'`, `expired = false` (legalmente elegível).
   * `now = deadline + 1ms`: `action = 'estorno'`, `expired = true` (transição atômica).
   * `now = deadline + 1s`: `action = 'estorno'`.
   * Sem confirmação de que a operação não ocorreu: transiciona para `action = 'manual_review'`.
   * Ambiente de homologação (`environment = 2`, `status = 'homologada'`): comportamento idêntico.
2. **Cenário A08 (NFC-e 65 — 30 minutos):**
   * Cálculo de deadline exato: `limitMs = 30 * 60 * 1000`.
   * `now = deadline - 1ms`: `action = 'cancel'`, `expired = false`, tempo restante formatado como `30 min`.
   * `now = deadline` (instante exato): `action = 'cancel'`, `expired = false`.
   * `now = deadline + 1ms`: `action = 'estorno'`, indicando NF-e 55 de ajuste no Paraná.
   * Não aplicação por analogia: aos 31 minutos pós-autorização, a NF-e 55 permanece em `cancel`, enquanto a NFC-e 65 já expirou e exige `estorno`.
3. **Preflight de Prontidão da Infraestrutura HML:**
   * Executado `node scripts/testing/nfe-hml-readiness.cjs`:
     * Guards de artefatos remotos: `ready: true`, `behavioralProofRequired: false`, HTTP 200.
     * Operador HML autenticado com perfil de administrador.
     * 24 WSDLs dos modelos 55 e 65 respondendo HTTP 200.
     * Status SEFA/PR de ambos os modelos respondendo `cStat = 107` ("Serviço em Operação").
     * Evidências capturadas em `docs/audits/fiscal-2026-10-19/evidence/`.
4. **Testes Unitários:** 14/14 testes aprovados em `fiscalCancellationBoundaryLimits.test.ts`. Zero regressões.

---

## 11. Princípios de Programação e Organização em `transmit-operation-draft.ts` e Módulos Mobile de Logística

### Problema
O endpoint de transmissão de rascunhos fiscais (`api/nfe/transmit-operation-draft.ts#L665-770`) e componentes chave de logística mobile continham acoplamento desnecessário, duplicações de código e violações de SRP (Single Responsibility Principle) e DRY:
1. `api/nfe/transmit-operation-draft.ts`: chamava diretamente a RPC `prepare_nfe_operation_attempt` e mutações atômicas de status `transmitting` inline no endpoint HTTP, além de duplicar uma verificação de 15 linhas de `assertDraftXmlMatchesReview` tanto no branch de retry quanto após a condicional de preparação.
2. `mobile/src/components/order-details/OrderDeliveryStartFooter.tsx#L110-145`: botões de ação duplicavam estilos e lógica condicional de apresentação por status de entrega sem tipagem estrita de props e sem atributos de acessibilidade.
3. `mobile/src/features/logistics/components/LogisticsOrderCard.tsx#L101-240`: ternários aninhados repetitivos para badges de manuseio/entrega/assistência, estilos inline repetidos no bloco de métricas e chave instável (`idx`) em listas de itens.
4. `mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx#L155-175`: callbacks de clique (`handleStartDelivery` e `handleViewOrder`) eram funções idênticas recriadas em todo ciclo de render sem `useCallback`.
5. `mobile/src/navigation/MainNavigator.tsx#L145-165`: renderização de telas em ternário aninhado de 15 ramificações de difícil leitura e manutenção, com lambdas de navegação inline sem memoização.
6. `mobile/src/features/logistics/components/deliveryMap/DeliveryBottomSheet.tsx#L200-265`: duplicação de blocos JSX nos botões de iniciar vs continuar etapas de entrega, estilo de fundo inline repetido e erro TypeScript na propriedade `StyleSheet.absoluteFillObject`.
7. `mobile/src/features/logistics/components/schedule/ScheduleCard.tsx#L145-185`: verificação repetida 4 vezes consecutivas de `item.activityType === 'delivery'` em labels, ícones e ações, além de handlers de clique complexos embutidos diretamente no JSX.

### Causa Raiz Técnica
Falta de extração de responsabilidades de persistência no módulo `draftPersistence.ts`, ausência de objetos de configuração de apresentação (pattern state/lookup) nos cards de logística e componentes de UI mobile, e acumulação de ternários encadeados e lambdas não memoizados.

### Soluções Técnicas Implementadas
1. **`api/nfe/operation-draft/draftPersistence.ts`:**
   - Adicionadas funções de persistência encapsuladas: `executePrepareDraftAttemptRpc`, `claimReadyDraftForTransmission` e `confirmDraftTransmissionStart`.
   - Garantida a conformidade com as regras de concorrência atômica e versionamento otimista (`updated_at` / `transmissionVersion`).
2. **`api/nfe/transmit-operation-draft.ts`:**
   - Orquestração delegada para as novas funções de persistência em `draftPersistence.ts`.
   - Remoção da verificação redundante duplicada de `assertDraftXmlMatchesReview`.
3. **`OrderDeliveryStartFooter.tsx`:**
   - Tipagem estrita de interfaces `OrderDeliveryStartFooterProps` e `OrderDeliveryStartFooterOrder`.
   - Consolidação de estilos em `baseButton` (DRY).
   - Extração do helper de configuração `resolveActiveDeliveryStatusConfig`.
   - Inclusão de `accessibilityRole="button"` e labels acessíveis.
4. **`LogisticsOrderCard.tsx`:**
   - Configuração declarativa unificada para badges de manuseio (`primaryBadgeConfig`).
   - Normalização dos estilos de métricas de rota (`metricItemRow`, `metricKmText`, `metricDivider`, `metricDurationText`).
   - Chave estável de identificação de itens (`itemKey`).
5. **`DeliveriesHubScreen.tsx`:**
   - Memoização com `useCallback` do handler unificado `handleSelectDeliveryOrder` e alias semântico para `handleStartDelivery` e `handleViewOrder`.
   - Memoização de `handleOpenDeliveryFlow`.
6. **`MainNavigator.tsx`:**
   - Extração da renderização de telas para `renderActiveScreen()` via switch estruturado, eliminando a cascata de ternários aninhados.
   - Memoização dos callbacks de navegação (`handleNavigateToDeliveriesMap`, `handleLaunchStock`, `handleBackFromSettings`).
   - Preservação estrita da hierarquia de módulos de vendas (Regra 6 do MoranteHub).
7. **`DeliveryBottomSheet.tsx`:**
   - Unificação do botão primário de etapas em `primaryDeliveryAction` declarativo.
   - Correção do erro de tipagem TS (`StyleSheet.absoluteFillObject` -> `StyleSheet.absoluteFill`).
   - Estilização canônica sem background inline redundante.
8. **`ScheduleCard.tsx`:**
   - Isolamento da flag booleana `isDeliveryActivity`.
   - Handlers dedicados extraídos (`handlePrimaryPress` e `handleDeliveryFlowPress`).
   - Objeto declarativo `primaryActionConfig` para ícone, label e acessibilidade.

### Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `api/nfe/operation-draft/draftPersistence.ts` | Extração de funções encapsuladas de RPC e locking de tentativa |
| `api/nfe/transmit-operation-draft.ts` | Refatoração de concorrência e eliminação de asserção redundante |
| `mobile/src/components/order-details/OrderDeliveryStartFooter.tsx` | Tipagem estrita, extração de config de estado e unificação de estilos |
| `mobile/src/features/logistics/components/LogisticsOrderCard.tsx` | Badges declarativos, estilos de métricas e chaves estáveis |
| `mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx` | Handlers memoizados com `useCallback` e eliminação de duplicação |
| `mobile/src/navigation/MainNavigator.tsx` | Eliminação do ternário de 15 níveis com `renderActiveScreen` e callbacks estáveis |
| `mobile/src/features/logistics/components/deliveryMap/DeliveryBottomSheet.tsx` | Unificação de ação primária, correção `absoluteFill` e estilos |
| `mobile/src/features/logistics/components/schedule/ScheduleCard.tsx` | Handlers extraídos e configuração declarativa de ações |

### Validações e Não-Regressão
- Suíte `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts`: 87/87 testes aprovados ✅
- Suíte `mobile/src/features/logistics/`: 9/9 arquivos, 39/39 testes aprovados (incluindo `ScheduleCardActions.test.tsx`) ✅
- Build fiscal Vercel (`npm run build:fiscal --prefix erp`): 12/12 funções empacotadas com sucesso, WASM e XSD oficial validados ✅

---

## 12. Fix & Desbloqueio Fiscal: Fluxo de Edição com Estorno Homologado e Sequenciamento de Badges (NFH 2) — Pedido #006954

### Problema Identificado e Sintomas
No pedido de venda **#006954** (cliente *Daiane Cristina Soares de Souza*, ID `b8f1eeae-02eb-454f-b6b7-0a88411aee88`):
1. O pedido possuía uma NFC-e modelo 65 nº 655 autorizada em ambiente de Homologação (`status = 'homologada'`).
2. Posteriormente, o pedido foi editado comercialmente (alteração de item de venda). Como a mercadoria não circulou e a operação foi alterada fora do prazo legal de cancelamento de NFC-e (limite de 30 minutos conforme RICMS/PR), o ERP iniciou corretamente o fluxo de substituição fiscal com emissão de NF-e modelo 55 de estorno (`finNFe=3`).
3. A primeira tentativa de estorno falhou devido à Rejeição SEFAZ 328 (CFOP indevido 1202). O usuário reiniciou uma nova tentativa fiscal (`operation_drafts` ID `1063dc45-08f7-43d8-a5d4-37de173ef8ef`), que transmitiu e autorizou com sucesso a NF-e modelo 55 nº 733 na SEFAZ (`status = 'authorized'`, `cStat = 100`, protocolo `141260000637042`).
4. **Sintomas:** Apesar da nota de estorno estar autorizada com sucesso, o pedido permaneceu travado no status de substituição fiscal `awaiting_reversal`. O formulário bloqueava novas edições e a interface não permitia emitir a nova nota fiscal de saída corrigida. Além disso, a listagem de pedidos não refletia a cronologia dos documentos fiscais do pedido, faltando exibir a nota original emitida (`NFH`), a nota de estorno emitida (`NFE`) e a nova nota de saída pronta para emissão com a nomenclatura solicitada (`NFH 2`).

### Causa Raiz Técnica
1. **Regra de Validação de Estorno no Banco de Dados (`is_order_edit_reversal_confirmed`):**
   A RPC SQL verificava estritamente:
   ```sql
   SELECT EXISTS (
     SELECT 1 FROM nfe_operation_drafts draft
     JOIN nfe_order_edit_replacements r ON r.id = p_replacement_id
     WHERE draft.id = r.operation_draft_id
       AND draft.operation_type = 'estorno'
       AND draft.status = 'authorized'
   );
   ```
   Quando o primeiro rascunho de estorno foi rejeitado e o operador reiniciou uma nova tentativa, o registro em `nfe_order_edit_replacements.operation_draft_id` permaneceu vinculado ao UUID do primeiro rascunho. O novo rascunho autorizado possuía um UUID diferente, fazendo com que `is_order_edit_reversal_confirmed` retornasse `false`, impedindo a chamada de `finalize_fiscal_order_edit` e travando a transição para `ready_to_reissue`.
2. **Ausência de Sincronização em Retries no Backend:**
   Em `api/nfe/operation-draft/draftPersistence.ts`, a função `persistDraftAuthorized` confiava exclusivamente no vínculo original de `operation_draft_id`, sem atualizar substituições pendentes (`awaiting_reversal`) cujo documento original e ambiente coincidissem.
3. **Limitação de Apresentação das Badges Fiscais e Modal de Ambiente:**
   - `orderFiscalBadgeRules.ts` calculava apenas uma única badge de homologação (`homologationBadge`), ocultando ou substituindo notas quando múltiplos documentos existiam.
   - A nota original estornada corria risco de receber badge de cancelamento indevido, quando na verdade seu protocolo original de autorização deve permanecer como emitido (`issued`), enquanto o estorno tem seu próprio documento e badge (`NFE`).
   - O modal `NfeEnvironmentChoiceModal` desabilitava o botão de Homologação quando já havia uma nota homologada anterior, mesmo que o replacement estivesse em `ready_to_reissue` aguardando a emissão da nova saída corrigida.

### Arquivos Modificados

| Arquivo | Linhas | Alteração |
|---|---|---|
| `supabase/migrations/20261019220000_fix_order_edit_reversal_confirmed_retry.sql` | 1-45 | Migration criando versão atualizada de `is_order_edit_reversal_confirmed` que verifica tanto `draft.id = r.operation_draft_id` quanto a existência de qualquer rascunho de estorno autorizado vinculado ao mesmo documento original e ambiente. |
| `api/nfe/operation-draft/draftPersistence.ts` | 510-535 | Fallback adicionado em `persistDraftAuthorized`: quando um rascunho de estorno é autorizado, localiza replacements em `awaiting_reversal` do mesmo `original_document_id`, atualiza `operation_draft_id` e dispara `finalize_fiscal_order_edit`. |
| `erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts` | 45-125 | Criação de `OutboundFiscalBadgeItem`, geração sequencial de saídas (`homologationBadges`: `NFH`, `NFH 2`, etc.), flags `readyToReissueHml` e `readyToReissueProd`, preservando a nota original estornada como `issued` com check verde. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx` | 20-55 | Suporte a `label` explícito (ex: `"NFH 2"`), renderizando o badge com numeração e permitindo emissão direta quando `status === 'not_issued'`. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentChoiceModal.tsx` | 80-105 | Liberação do botão "Homologação" quando `readyToReissueHml === true`, com subtítulo claro "Emitir nota corrigida (NFH 2)". |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx` | 110-140 | Renderização sequencial cronológica: `NF` (produção) → `NFH` (original) → `NFE` (estorno) → `NFH 2` (nova saída). |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard.tsx` | 115-145 | Renderização sequencial idêntica para o modo de cards. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.tsx` | 90-105 | Passagem das listas sequenciais de badges para os componentes visuais. |
| `erp/src/pages/utils/nfe/__tests__/orderFiscalBadgeRules.test.ts` | 240-295 | Adicionados 2 novos testes unitários validando a geração sequencial de `NFH` e `NFH 2` e a flag `readyToReissueHml`. |

### Solução Técnica e Desbloqueio Executados
1. **Aplicação no Banco de Dados Supabase (`hkoxhourxwlddgsfdgws`):**
   - Migration `20261019220000_fix_order_edit_reversal_confirmed_retry.sql` executada com sucesso.
   - `operation_draft_id` em `nfe_order_edit_replacements` atualizado para o draft autorizado `1063dc45-08f7-43d8-a5d4-37de173ef8ef`.
   - Executada a RPC `finalize_fiscal_order_edit('1ed831cd-3baf-4f57-ab35-8715ed9d94ff')`.
2. **Resultado no Pedido #006954:**
   - O pedido da cliente *Daiane Cristina Soares de Souza* teve seus itens e dados comerciais atualizados (`orders.updated_at = '2026-10-20 01:51:54 UTC'`).
   - `nfe_order_edit_replacements.status` transicionou com sucesso para `'ready_to_reissue'`.
   - Pedido completamente desbloqueado para visualização, novas edições ou emissão da nova nota fiscal corrigida.
3. **Ordem Visual e Nomenclatura das Badges:**
   - Badge 1: `NF` — Produção (cinza, não emitida).
   - Badge 2: `NFH` — Homologação original (verde com check, NFC-e 65 nº 655 autorizada).
   - Badge 3: `NFE` — Estorno fiscal (verde com check, NF-e 55 nº 733 autorizada).
   - Badge 4: `NFH 2` — Segunda emissão de homologação (azul interativa pronta para emissão da nota fiscal corrigida).

### Validações Executadas
- Suíte `orderFiscalBadgeRules.test.ts`: 27/27 testes aprovados ✅
- Suíte geral de testes fiscais (`npm run test:fiscal:unit`): 83 arquivos / 1010 testes aprovados ✅
- Zero CC-e introduzida ou referenciada (estrita observância a `FISCAL-016`).
- Idempotência e integridade do banco de dados preservadas.

---

## 13. Fix: Erro "Failed to execute 'json' on 'Response': Unexpected end of JSON input" ao abrir Detalhes da Nota Fiscal de Estorno (#007057)

### Problema Identificado e Sintomas
Ao clicar no badge `NFE` do pedido **#007057** (*Daiane Cristina Soares de Souza*) para consultar a NF-e de Estorno nº 733 em Homologação, o modal "Detalhes da nota fiscal" abria com o erro:
`Failed to execute 'json' on 'Response': Unexpected end of JSON input`
O cabeçalho exibia `NF-e — · Série 1` sem dados carregados, e ao clicar no botão **"Tentar carregar novamente"**, nada acontecia (o botão não emitia feedback visual e a tela permanecia com a mesma mensagem de erro).

### Causa Raiz Técnica
1. **API Local na Porta 3000 Inativa:**
   O processo do backend fiscal local em `http://127.0.0.1:3000` (`scripts/run-vercel-dev.cjs` / `local-fiscal-dev-server.cjs`) havia sido encerrado.
2. **Proxy Reverso do Vite e Resposta Vazia:**
   O servidor de desenvolvimento do Vite (porta 5173), configurado para repassar `/api` para `127.0.0.1:3000`, recebia `ECONNREFUSED` e gerava uma resposta com status HTTP 500 e corpo totalmente vazio (`body.length === 0`).
3. **Ausência de Sanitização na Desserialização do Frontend:**
   Em `erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts`, a função `fetchFiscalDocumentDetails` executava `const result: unknown = await response.json()` sem usar o helper canônico `parseNfeApiResponse`. Ao tentar converter uma resposta vazia para JSON, o motor JavaScript do navegador lançava imediatamente um `SyntaxError` antes mesmo de o código verificar se a resposta era `response.ok`.
4. **Ausência de Fallback para o Banco e Falta de Feedback no Botão:**
   - Caso a rota HTTP `/api/nfe/document-details` falhasse ou sofresse timeout, a função não possuía rota alternativa de contingência, apesar de o cliente autenticado do Supabase possuir permissão `SELECT` em `nfe_documents`.
   - O botão "Tentar carregar novamente" em `IssuedFiscalDocumentDetailsModal.tsx` não apresentava indicador de carregamento (`isLoading`), dando a impressão de inoperância.

### Arquivos Modificados

| Arquivo | Linhas | Alteração |
|---|---|---|
| `erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts` | 199-365 | Implementado tratamento com `parseNfeApiResponse` em `fetchFiscalDocumentDetails` e adicionada a função de contingência resiliente `fetchFiscalDocumentDetailsFromSupabase`. Se a rota HTTP falhar, cair ou retornar 5xx, o frontend consulta de forma transparente e imediata as tabelas `nfe_documents`, `nfe_document_events` e `nfe_operation_drafts` via cliente Supabase, populando todas as 6 abas e o XML armazenado sem travar a interface. |
| `erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx` | 271-285 | Adicionado estado `disabled={isLoading}` e spinner no botão "Tentar carregar novamente", além de acionar imediatamente `setIsLoading(true)` ao clicar para garantir feedback visual transparente (Regra 4 do MoranteHub). |

### Soluções e Verificações Executadas
1. **Reinício e Validação do Backend Fiscal:**
   - Servidor local iniciado via `node scripts/run-vercel-env-dev.cjs api` na porta 3000 com o conjunto completo de variáveis de ambiente.
   - Rotas `/health` e `/api/nfe/document-details` testadas com requisições autenticadas reais (HTTP 200 retornado com sucesso).
2. **Resiliência a Falhas de Rede e Servidor:**
   - Se o backend de API estiver ativo: a resposta estruturada é entregue via `/api/nfe/document-details` e validada com `parseNfeApiResponse`.
   - Se o backend de API estiver desligado ou sob manutenção: o fallback aciona `fetchFiscalDocumentDetailsFromSupabase`, carregando o documento, itens, destinatário e o XML completo diretamente do banco.
3. **Nenhum erro de JSON Input:** A interface nunca mais lança o erro de sintaxe de JSON.
4. **Testes Unitários:**
   - 14/14 testes aprovados em `issuedFiscalDocumentDetailsModal.test.tsx`.
   - 141/141 testes aprovados em `FiscalDocuments/__tests__/`.
   - 1010/1010 testes aprovados na suíte de testes fiscais unitários.


---

## 14. Fix: Ícone de Retirada (duas mãos pegando numa caixa preenchida) nos rótulos de pedido de venda e configurações

### Problema Identificado e Sintomas
Nos cards e tabelas de pedidos de venda (`OrderHistoryList`), o rótulo/selo operacional do tipo de pedido para pedidos de Retirada (`order.shipping?.deliveryMethod === 'pickup'`) exibia o ícone de lojinha (`bi-shop`) em vez do ícone oficial de Retirada (duas mãos pegando numa caixa com mãos e caixa preenchidas).
Além disso, em Configurações > Rótulos do Sistema (`StatusLabelsSection`), o tipo "Retirada" exibia um dedo indicador apontando (`bi-hand-index-thumb-fill`), assim como na Agenda de Entregas (`DeliverySchedule`), tornando impossível visualizar e identificar o ícone oficial de retirada.

### Causa Raiz Técnica
1. Em `OrderOperationalBadges.tsx`, a constante de seleção de ícones operacionais `tIcon` usava `'bi-shop'` para `isPick`:
   `const tIcon = isAssis ? 'bi-tools' : isRet ? 'bi-arrow-return-left' : isPick ? 'bi-shop' : 'bi-truck';`
   e renderizava `<i className="bi bi-shop text-[11px] text-white" />` sobre o selo roxo.
2. Em `StatusLabelsSection.tsx`, o componente `OrderTypeRow` aceitava apenas strings de classes Bootstrap Icons e recebia `icon="bi-hand-index-thumb-fill"`.
3. Em `DeliverySchedule/index.tsx`, `ScheduleCardView`, `TableCell` e `ShippingData.tsx`, o método pickup estava mapeado para `bi-hand-index-thumb-fill`.
4. O componente oficial [`PickupIcon.tsx`](erp/src/components/shared/PickupIcon.tsx), que implementa a máscara CSS sobre o asset vetorial [`pickup-hands-parcel-white.png`](erp/src/assets/pickup-hands-parcel-white.png) (duas mãos preenchidas segurando o pacote/caixa), não estava conectado a esses badges e telas.

### Arquivos Modificados

| Arquivo | Linhas | Alteração |
|---|---|---|
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderOperationalBadges.tsx` | 6, 195-201 | Importado `PickupIcon` e renderizado `<PickupIcon white className="h-3.5 w-3.5" />` quando `isPick` é verdadeiro no rótulo de tipo de pedido, eliminando `bi-shop`. |
| `erp/src/pages/App/Settings/components/general/StatusLabelsSection.tsx` | 4, 31, 42, 55, 231 | Adicionada propriedade `iconComponent?: React.ReactNode` ao `OrderTypeRow` e renderizado `<PickupIcon className="h-3.5 w-3.5" />` na seção de Tipos de Pedido de Retirada em Configurações. |
| `erp/src/pages/App/DeliverySchedule/index.tsx` | 9, 175-179 | Renderizado `PickupIcon` na gaveta mobile de filtros de tipo de pedido para Retiradas. |
| `erp/src/pages/App/DeliverySchedule/ScheduleCardView/Index.tsx` | 307-320 | Renderizado `PickupIcon` nos botões e tooltips de detalhes de retirada vinculada a tarefas de montagem. |
| `erp/src/pages/App/DeliverySchedule/ScheduleTableViewComponents/TableCell.tsx` | 172-185 | Renderizado `PickupIcon` no badge circular de retirada na tabela de cronograma. |
| `erp/src/pages/OrderPage/ShippingData.tsx` | 2, 20-25 | Renderizado `PickupIcon` no cabeçalho da seção de entrega/retirada. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderOperationalBadges.test.tsx` | 1-78 | Criado teste unitário verificando que pedidos de Retirada renderizam o `PickupIcon` com máscara de imagem e nunca renderizam `bi-shop`. |

### Testes Executados
- 3/3 testes aprovados em `OrderOperationalBadges.test.tsx`.
- 1010/1010 testes da suíte fiscal aprovados sem regressões.


---

## 15. Refatoração e Aplicação de Princípios de Programação e Organização Modular em OrderHistoryCard e useDeliveryFlowActions

### Problema Identificado e Diagnóstico Arquitetural
1. **`OrderHistoryCard.tsx` (Monólito de 539 linhas):**
   - Violava o **Princípio da Responsabilidade Única (SRP)**: acumulava cálculos de classes CSS dinâmicas, regras de títulos e horários de agendamento, mapeamento de múltiplos badges fiscais (produção, homologação, estorno e devolução), orquestração de badges operacionais, renderização do corpo com avisos de cancelamento e ações de rodapé (total, botões de atalho e menu de opções).
   - Dificuldade de manutenção e reuso, além de acoplamento direto entre apresentação pura e regras de negócio.
2. **`useDeliveryFlowActions.ts` (Mistura de Estados e Mutação de Props):**
   - Realizava mutações diretas em propriedades do objeto `order` (`order.order_data = ...`, `order.status = ...`), quebrando princípios de imutabilidade e previsibilidade do React.
   - Misturava regras de domínio puras (cálculo de etapas 1/2/3, determinação de título do cabeçalho, parsing de pagamentos e validação de checklist) com estado de modais de confirmação e efeitos de geolocalização.
   - Retorno extenso sem contrato tipado explícito de interface.

### Solução Técnica e Princípios Aplicados

#### A. Modularização de `OrderHistoryCard` (`erp/.../OrderHistoryCard/`)
Separado em submódulos coesos e desacoplados:
1. **[`orderCardPresentation.ts`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/orderCardPresentation.ts):** Módulo de funções puras (`resolveCardCapabilities`, `buildOrderCardStatusConfig`, `resolveCardHeaderAccentClass`, `resolveCardBgBorderClass`, `resolveCardTimeDisplay`) 100% testável sem renderizar DOM.
2. **[`OrderCardHeader.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardHeader.tsx):** Subcomponente focado exclusivamente no topo colorido, identificador do pedido e orquestração de badges fiscais e operacionais.
3. **[`OrderCardBody.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardBody.tsx):** Subcomponente focado nos dados do cliente, alertas de falha de cancelamento, avisos de agendamento pendente, botões de pedidos vinculados e datas de entrega/retirada.
4. **[`OrderCardFooter.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardFooter.tsx):** Subcomponente focado na exibição monetária, botões de atalho de edição/retomada e menu `OrderOptionsMenu`.
5. **[`OrderHistoryCard.types.ts`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderHistoryCard.types.ts):** Contratos estritos de tipos e interfaces.
6. **[`OrderHistoryCard.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard.tsx):** Orquestrador principal reduzido de 539 linhas para apenas 140 linhas limpas e declarativas.

#### B. Modularização de `useDeliveryFlowActions` (`mobile/.../delivery-preparation/`)
1. **[`deliveryFlowStepRules.ts`](mobile/src/features/orders/screens/delivery-preparation/deliveryFlowStepRules.ts):** Extração de lógica de domínio pura para determinação de etapa (`resolveDeliveryStep`), inicialização de pagamentos (`resolveInitialDeliveryPayments`) e completude do checklist (`isDeliveryChecklistComplete`).
2. **[`useDeliveryModals.ts`](mobile/src/features/orders/screens/delivery-preparation/useDeliveryModals.ts):** Hook isolado para gerenciar abertura/fechamento dos modais de não atendimento, cancelamento e confirmação de rota.
3. **[`deliveryPreparation.types.ts`](mobile/src/features/orders/screens/delivery-preparation/deliveryPreparation.types.ts):** Adicionados os tipos estritos `UseDeliveryFlowActionsOptions` e `UseDeliveryFlowActionsReturn`.
4. **[`useDeliveryFlowActions.ts`](mobile/src/features/orders/screens/delivery-preparation/useDeliveryFlowActions.ts):** Eliminação de mutações arbitrárias, sincronização segura e contrato de retorno estruturado por categorias.

### Testes Executados
- 6/6 testes aprovados em [`orderCardPresentation.test.ts`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/orderCardPresentation.test.ts).
- 15/15 testes aprovados em [`OrderCardAndMenuActions.test.tsx`](erp/src/pages/App/SalesOrder/OrderHistoryList/OrderCardAndMenuActions.test.tsx).
- 5/5 testes aprovados em [`deliveryFlowStepRules.test.ts`](mobile/src/features/orders/screens/delivery-preparation/__tests__/deliveryFlowStepRules.test.ts).
- 12/12 testes aprovados nos serviços e fluxos mobile.
- 1010/1010 testes fiscais unitários aprovados sem qualquer regressão.
