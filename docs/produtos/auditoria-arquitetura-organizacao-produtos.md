# Auditoria de Arquitetura e Organização: Módulo de Produtos

## Resumo executivo

O módulo de Produtos do MoranteHub possui um esforço visível de modularização em várias frentes (como a separação do `productService`), mas estruturalmente sofre com **dispersão do domínio**, **acoplamento de UI com o Banco de Dados**, e um **risco crítico de performance na arquitetura de cache**. A dívida técnica é **alta** devido à separação inadequada entre regras de negócio e utilitários genéricos, além da duplicação de lógicas estruturais entre o ERP Web e o App Mobile. O módulo requer refatoração estrutural voltada para a consolidação do subdomínio.

---

## Mapa atual

O domínio de Produtos hoje está fragmentado em quatro polos principais:

```text
erp/src/pages/
├─ App/Products/                 -> (Polo 1: UI e Apresentação)
│  ├─ components/
│  ├─ hooks/ (useVariationForm, useProducts, etc.)
│  ├─ modals/
│  ├─ ProductList/ (Sub-arquitetura gigante de UI)
│  └─ Index.tsx (God Component orquestrador)
│
├─ utils/productService/         -> (Polo 2: Acesso a Dados / Infra)
│  ├─ productQueryService.ts
│  ├─ productMutationService.ts
│  └─ productLocalCache.ts
│
├─ utils/                        -> (Polo 3: Lixeira de Regras de Negócio)
│  ├─ productVariationDefaults.ts (Regras de herança e SKU)
│  ├─ productKindRules.ts         (Regras de origem de estoque)
│  ├─ technicalValuesService.ts   (Domínio técnico)
│  └─ variationParentSync.ts      (Lógica de mescla e overrides)
│
└─ types/                        -> (Polo 4: Contratos)
   ├─ product.type.ts            (Tipos de Banco + Flags de UI misturados)
   └─ variation.type.ts
```

---

## Pontos positivos

1. **Modularização do `productService`**: A separação prévia de `productService` em submódulos (`productQueryService`, `productMutationService`, etc.) é uma boa aplicação do SRP na infraestrutura.
2. **Delegação de `useProducts`**: O hook `useProducts.ts` funciona como uma Facade bem feita, delegando validações e deleções para hooks menores (`useProductsActivationValidation`, `useProductsCatalogActions`).
3. **Módulo Fiscal Isolado**: Componentes como `ProductNcmSelector.tsx` delegam responsabilidades fiscais para o seu domínio nativo em `@/services/fiscal/ncmService`.

---

## Problemas Encontrados

| Severidade | Arquivo(s) | Problema | Evidência | Impacto | Recomendação |
|---|---|---|---|---|---|
| **Crítico (P0)** | `productLocalCache.ts`, `productQueryService.ts` | **Cache Front-end de Dados Críticos** | `getLocalProducts()` carrega e gerencia o catálogo inteiro em `localStorage`. `initializeProductsIfEmpty` puxa todo o banco via paginação forçada `0 a 1000`. | Vazamento de memória, crash em bases grandes, limite de 5MB do LocalStorage e estado inconsistente com banco. | Remover armazenamento de catálogo em `localStorage` e refatorar listagem para requisições com paginação server-side/React Query puro. |
| **Alto (P1)** | `Index.tsx` (App/Products) | **God Component Orquestrador** | Mantém múltiplos estados de modais (`isFormModalOpen`, `isVariationModalOpen`, `isHistoryModalOpen`, `isStockModalOpen`) e orquestra a tela inteira. | Fere a coesão. Qualquer ação re-renderiza toda a árvore principal, prop-drilling acentuado. | Descer modais e seus estados correspondentes para dentro do `ProductList` ou usar Context API/Store zustand. |
| **Alto (P1)** | `ProductTechnicalTab.tsx`, `useVariationForm.ts` | **Supabase sendo acessado na UI** | Ambos os arquivos importam `ecommerceSupabase as supabase` e fazem `.select()` do banco diretamente nos efeitos visuais. | Fere o princípio das camadas, inviabiliza testes locais unitários para estas lógicas e dificulta rastreabilidade de requisições. | Mover essas consultas para `productService` ou hooks de queries abstratos. |
| **Médio (P2)** | `erp/src/pages/utils/*` | **Domínio tratado como utilitário** | `productVariationDefaults.ts` possui regras cruciais de variação, mas vive na pasta `utils/` junto com formatações de data e regex. | A lógica essencial de Produto é difícil de achar e falta ownership claro; utilitários deveriam ser funções puras transversais. | Criar `erp/src/domain/products/` para acomodar todas as regras pai/filho, validações e mescla. |
| **Médio (P2)** | `product.type.ts` | **Mistura de Entidade de Banco e Estado UI** | O tipo estende o DTO da tabela com propriedades de frontend como `isVirtual?: boolean`. | Confusão nas transações atômicas de escrita. Uma API pode tentar persistir `isVirtual` e falhar. | Separar os tipos: `ProductEntity` (banco) vs `ProductDraft` / `ProductFormState` (UI). |

---

## Top arquivos candidatos a refatoração

### 1. `productLocalCache.ts`
- **Responsabilidade atual**: Cacheia o array `Product[]` global em `localStorage` para gerar SKUs comerciais (`generateUniqueCode`) e alimentar a interface global.
- **Problema**: Abordagem inviável em produção (carrega milhares de itens). `generateUniqueCode` puxa todos os produtos para iterar e pegar o último número.
- **Proposta**: A geração de SKU deve ser feita com uma query `select('code').order('desc').limit(1)` via RPC no banco, e o catálogo em cache precisa morrer em favor do Zustand + React Query.

### 2. `ProductTechnicalTab.tsx`
- **Responsabilidade atual**: Renderizar campos de Informações Técnicas da aba.
- **Problema**: Lógica acoplada. Executa queries diretamente com `supabase.from('attributes').select()` toda vez que monta e roda lógicas complexas de fallback.
- **Proposta**: Abstrair chamadas de rede para um hook `useTechnicalFields()` fornecido pela camada de application, deixando o componente responsável apenas por desenhar.

### 3. `useVariationForm.ts` (592 linhas)
- **Responsabilidade atual**: Gerencia o form modal de variação, estado das abas, faz requisição de atributos e processa a mutação.
- **Problema**: Faz simultaneamente regras de banco de dados, transformações (ex. ordem de tamanho) e manuseio de interface (tabs/toasts).
- **Proposta**: Separar em `useVariationFormState` (UI tabs, loadings) e usar o `productVariationActionsService` nativamente com um pattern de Adapter.

---

## Duplicações (Web × Mobile)

Existe duplicação real e idêntica de regras de negócio estritas de Produtos entre as plataformas:

1. **Definição de Nomes e Variações**:
   - Web: `erp/src/pages/utils/productVariationDefaults.ts` (`computeVariationName`, etc).
   - Mobile: `mobile/src/features/products/domain/productVariationName.ts` (`resolveProductVariationName`, `ensureAtLeastOneOperationalVariation`).
2. **Serviços de Persistência**:
   - A lógica de montagem e delegação para o backend é parcialmente replicada no `mobileProductMutationService.ts`.

Essas regras são fortes candidatas para ficarem num sub-pacote compartilhado ou em um repositório central de domínio que o monorepo possibilite importar em comum, caso os projetos web e mobile estejam no mesmo espaço.

---

## Arquivos mal localizados

1. **`productVariationDefaults.ts`**
   → **Local Sugerido**: `erp/src/domain/products/variation/rules.ts`
   → **Motivo**: Não é um helper utilitário. Contém as invariantes cruciais do sistema sobre geração de variações.
2. **`technicalValuesService.ts`**
   → **Local Sugerido**: `erp/src/domain/products/technicalValues/service.ts`
   → **Motivo**: Regras complexas (override pai→filho) misturadas em `/utils`.
3. **`variationService.ts` & `variationCanonicalService.ts`**
   → **Local Sugerido**: Devem se unir à pasta do novo Domínio ou compor a orquestração do `productVariationActionsService`.

---

## Estrutura recomendada

O padrão sugerido consolida tudo o que pertence a Produtos num módulo coeso e protegido:

```text
erp/src/features/products/
├─ api/                 (Antigo productService e queries Supabase encapsuladas)
├─ components/          (Componentes visuais e Modals menores)
├─ domain/              (Regras de SKU, Nomes, Herança, Tipos Estritos limpos de UI)
├─ hooks/               (Hooks orquestradores como useProducts)
├─ pages/               (O God Component desmontado e ProductList)
└─ types/               (Separação de Entidade vs FormDraft)
```

Essa estrutura evitaria o vazamento das regras do produto para a pasta genérica `utils/`.

---

## Plano de refatoração seguro

### P0 — Risco Estrutural de Performance e Escalabilidade
- Extinguir `productLocalCache.ts`.
- Alterar `productSkuService.ts` para parar de listar `getLocalProducts()` na geração de código e buscar via banco (`select limit 1 order desc`).

### P1 — Desacoplamento da Interface de Banco (UI ↔ Supabase)
- Remover todo uso direto da variável `supabase` dentro de `ProductTechnicalTab.tsx` e `useVariationForm.ts`. Centralizar nas query functions apropriadas da camada Service e reimportar como Promise/Hooks de query.

### P2 — Migração de Domínio (utils → domain)
- Mover os arquivos pesados de regras ( `productVariationDefaults.ts`, `technicalValuesService.ts`, `variationParentSync.ts`) para uma nova estrutura de domínio sem mexer na lógica interna. Criar arquivos re-exportadores (`barrels`) em `/utils/` durante o período de transição seguindo as regras da Skill *organizacao-arquivos-diretorios*.

### P3 — Desmontagem do God Component
- Fatiar o estado massivo do `App/Products/Index.tsx` e descentralizar `isFormModalOpen` / `isVariationModalOpen` para dentro dos contextos de lista onde eles realmente operam.

---
**Conclusão**: O módulo não requer uma reescrita do zero. As regras existem e muitas estão bem escritas. O problema real reside no fato de que os componentes "engordaram" absorvendo a camada de dados (Supabase) localmente, as regras vitais do ERP caíram na pasta de utilitários, e o cache simulou perigosamente o catálogo em memória. A ordem natural deve focar primeiro no gargalo do Cache (P0), depois no acoplamento (P1), e terminar com o reposicionamento estrutural (P2 e P3).
