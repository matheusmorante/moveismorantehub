# Histórico de Correções — 2026-10-19

> Registro mandatório conforme AGENTS.md §2. Toda correção realizada nesta sessão está documentada abaixo.

---

## 7. Fix: "Confirme operação não realizada e ausência de circulação" no estorno — estado inicial incorreto

### Problema
Ao abrir o modal de estorno fiscal com um rascunho já existente (`mode='estorno'` + `initialDraftId`), a mensagem de erro **"Confirme operação não realizada e ausência de circulação para preparar o estorno fiscal."** aparecia mesmo com todos os checkboxes de revisão marcados, e o botão "Transmitir NF-e revisada" permanecia desabilitado.

### Causa Raiz
`useNfeOperationDraft.ts` inicializava `operationDidNotOccur` e `goodsDidNotCirculate` como `false` independentemente do modo. O schema `fiscalOperationPreparationFormSchema` valida os dois flags como pré-requisito para `kind === 'estorno'`, fazendo `canPrepare = false`. O botão de transmissão usa `canPrepare` indiretamente — quando o setup de confirmação não passou, o `preparationValues` falha e a validação de transmissão bloqueia.

Quando `mode === 'estorno'` (modal aberto diretamente para revisar/transmitir um rascunho existente), as confirmações já ocorreram ao criar o rascunho originalmente. Não faz sentido pedir confirmação novamente, mas o estado local não refletia isso.

### Arquivos Modificados

| Arquivo | Linha | Alteração |
|---|---|---|
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 49-50 | `useState(false)` → `useState(() => mode === 'estorno')` para ambos os flags |
| `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts` | 98-107 | `useEffect` que sincroniza `mode` agora também seta os flags para `true` quando `mode === 'estorno'` |

### Solução Técnica
```ts
// Antes:
const [operationDidNotOccur, setOperationDidNotOccur] = useState(false);
const [goodsDidNotCirculate, setGoodsDidNotCirculate] = useState(false);

// Depois:
const [operationDidNotOccur, setOperationDidNotOccur] = useState(() => mode === 'estorno');
const [goodsDidNotCirculate, setGoodsDidNotCirculate] = useState(() => mode === 'estorno');
```

Quando o modal abre no modo estorno (rascunho já existe), os flags já iniciam `true`, passando o schema de preparação e desbloqueando o botão de transmissão.

### Testes
- `FiscalDocuments/__tests__/` — 158/158 ✅
- `nfe/__tests__/transmitOperationDraft.test.ts` — 87/87 ✅
- Nenhuma regressão detectada.

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
