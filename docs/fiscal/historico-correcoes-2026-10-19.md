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
