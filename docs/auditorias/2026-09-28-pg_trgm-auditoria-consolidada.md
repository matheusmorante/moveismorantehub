# Auditoria Consolidada de Busca Textual e Governança do `pg_trgm`

**Data de Conclusão**: 28 de Setembro de 2026  
**Status**: `ENCERRADA`  
**Escopo**: Supabase/PostgreSQL, ERP Web, App Mobile, RPCs, Serviços e Hooks de Busca.

---

## 1. Sumário Executivo e Classificação

- **`pg_trgm`**: **APROVADO tecnicamente.**
- **Anti-egress dos fluxos auditados**: **Corrigido.**
- **Governança**: **Adequada e calibrada.**
- **Garantia global de consumo**: **Não aplicável como garantia absoluta.** Os fluxos auditados tiveram os principais riscos de egress corrigidos; o consumo global do Supabase continua dependendo dos demais módulos e do uso real da aplicação. Há cobertura automatizada e regras de governança que reduzem o risco de regressão.

---

## 2. Matriz Consolidada de Auditoria

| Fluxo / Tabela | Implementação Anterior | Correção Aplicada | Índice Usado | `EXPLAIN` Validado? | Egress Corrigido? | Teste Funcional? | Estado Canônico |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`ncms` (Descrição Oficial)** | `ILIKE '%termo%'` com `unaccent()` volátil | RPC `search_ncms` reescrita com `immutable_unaccent` e `SET search_path` | `idx_ncms_desc_unaccent_trgm` (`GIN`) | **Sim** (8,33 ms vs 322,7 ms; 13 buffers vs 1.173 buffers; Bitmap Index Scan) | **Sim** (`LIMIT 20` server-side) | **Sim** (`textSearchIntegration.test.ts` e `ncmClassificationPrompt.test.ts`) | `VALIDADO` |
| **`ncm_aliases` (Sinônimos Comerciais)** | Varredura sequencial sem índice especializado | Criação de índice GIN trigram com `immutable_unaccent` | `idx_ncm_aliases_term_unaccent_trgm` (`GIN`) | **Sim** (1,48 ms; 5 buffers; sintaticamente utilizável) | **Sim** (integrado na RPC com limit) | **Sim** (`textSearchIntegration.test.ts`) | `VALIDADO` |
| **`product_variations` (Nome da Variação)** | ILIKE em tabela física sem índice trigram | Criação de índice GIN trigram `idx_product_variations_name_trgm` | `idx_product_variations_name_trgm` (`GIN`) | **Sim** (6,60 ms; 37 buffers; Bitmap Index Scan) | **Sim** (consumo via `fetchVariationsPage` com paginação server-side) | **Sim** (`textSearchIntegration.test.ts` e `variationService.test.ts`) | `VALIDADO` |
| **`products` (Catálogo Principal)** | Já possuía `idx_products_name_trgm` | Mantido e alinhado com `productFilterBuilder.ts` (removido regex POSIX frágil `imatch`) | `idx_products_name_trgm` (`GIN`) | **Sim** (schema verificado) | **Sim** (limite de 25 itens no autocomplete) | **Sim** (`textSearchIntegration.test.ts`) | `VALIDADO` |
| **`people` (Nome Completo)** | Busca com `.or(full_name.ilike...)` sem índice trigram | Criação de índice GIN trigram em `full_name` | `idx_people_full_name_trgm` (`GIN`) | **Sim** (9,91 ms; 88 buffers; Bitmap Index Scan) | **Sim** (`LIMIT 30` no `searchPeople`) | **Sim** (`textSearchIntegration.test.ts` e `customerSearch.test.ts`) | `VALIDADO` |
| **`people` (Nome Social)** | Não era pesquisado nem indexado | Adicionado filtro `social_name.ilike` e criado índice GIN trigram | `idx_people_social_name_trgm` (`GIN`) | **Sim** (1,45 ms; 5 buffers; Bitmap Index Scan) | **Sim** (`LIMIT 30` no `searchPeople`) | **Sim** (`textSearchIntegration.test.ts`) | `VALIDADO` |
| **`orders` (Busca por Cliente)** | `select('*')` e `.ilike('customer_name')` sem LIMIT | Projeção enxuta de colunas, `.limit(30)` e índice GIN em `customer_name` | `idx_orders_customer_name_trgm` (`GIN`) | **Sim** (34,39 ms; 72 buffers; Bitmap Index Scan) | **Sim** (Eliminado `select('*')` e imposto `LIMIT 30`) | **Sim** (`orderSearchQueries.test.ts` e `textSearchIntegration.test.ts`) | `VALIDADO` |
| **`orders` (`getOrdersCustomerDataOnly`)** | Download de toda a tabela `orders` sem filtro nem limit | Adicionado `limit(50)` default e suporte a `searchTerm` com trigram | `idx_orders_customer_name_trgm` (`GIN`) | **Sim** (compartilhado) | **Sim** (Varredura irrestrita eliminada) | **Sim** (`orderSearchQueries.test.ts`) | `VALIDADO` |
| **`ProductAutocomplete` / `productAutocompleteUtils`** | Loop `while(true)` baixando todo o catálogo ou fallback de 500 itens | Removido loop e fallback; busca estrita com `maxResults = 25` | `idx_products_name_trgm` | N/A (Camada de Aplicação) | **Sim** (Download em massa eliminado) | **Sim** (Build e testes aprovados) | `VALIDADO` |
| **`useProductSearch` (Vendas & Estoque)** | `subscribeToProducts` baixando todos os produtos e filtrando em memória no cliente | Eliminado `useProductSearch_old.ts` morto; migrado `InventoryProductSearchModal` e `useProductSearch` para `useProductSearch_new` com busca server-side | N/A (Camada de Aplicação) | N/A (Camada de Aplicação) | **Sim** (Filtro JS local sobre snapshot completo eliminado) | **Sim** (Build e testes aprovados) | `VALIDADO` |
| **`compositions` (Nome do Kit)** | Sem índice trigram | Criação de índice GIN trigram `idx_compositions_name_trgm` | `idx_compositions_name_trgm` (`GIN`) | **Sim** (1,26 ms; 3 buffers; sintaticamente utilizável) | **Sim** (`LIMIT` na query) | **Sim** (`compositionService.test.ts`) | `VALIDADO` |
| **SQLite Offline (Mobile)** | N/A (SQLite nativo) | Preservado uso de `LIKE` / normalização local em memória sem dependência de extensões | Nenhum (B-tree / Full text local) | N/A | N/A | **Sim** (`mobile-offline-first`) | `NÃO APLICÁVEL` |

---

## 3. Contexto de Volume de Dados e Evidências de Performance

### Análise de Volume
- **Tabelas com Massa Real e Evidência Forte de Performance**:
  - `ncms` (10.515 linhas): O ganho é inequívoco, caindo de **322,7 ms para 8,33 ms** e de **1.173 buffers para 13 buffers** lidos.
  - `orders` (1.053 linhas): Consulta por cliente executa em **~34,39 ms** com 72 buffers lidos em `Bitmap Index Scan`.
  - `people` (1.900 linhas): Executa em **~9,91 ms** com 88 buffers lidos em `Bitmap Index Scan`.
  - `product_variations` (557 linhas): Executa em **~6,60 ms** com 37 buffers lidos em `Bitmap Index Scan`.
- **Tabelas Menores (`products` - 510 linhas, `product_variations` - 557 linhas)**:
  - O uso de `pg_trgm` nelas é justificado primariamente por:
    1. Busca textual aproximada e tolerância a pequenos erros de digitação;
    2. Experiência do usuário (UX);
    3. Crescimento futuro da base;
    4. Evitar arquiteturas frágeis que dependam de filtro de grandes datasets no frontend.
- **Tabelas Atualmente Vazias (`compositions` e `ncm_aliases` - 0 linhas)**:
  - Ambas receberam índices de 16 KB cada. Os índices estão sintaticamente preparados para o fluxo futuro; o benefício prático de performance nesses dois casos ainda não pode ser medido com massa real de dados.

---

## 4. Mitigação de Riscos de Egress

- **Medição Qualitativa Sustentada**: O Egress foi significativamente reduzido através de **projeção seletiva de colunas**, imposição de **LIMIT** (15 a 30 itens nas interfaces e autocompletes) e **eliminação de downloads em massa** (remoção do loop `while(true)` e dos fallbacks de 500 itens).
- **Escopo e Governança**: A correção dos três gargalos P1 elimina os vetores conhecidos de vazamento de tráfego nesses fluxos de consulta textual. O consumo total da conta Supabase segue condicionado aos demais módulos e ao volume real de requisições.

---

## 5. Diretrizes de Fechamento da Iniciativa

A iniciativa `pg_trgm` encontra-se **ENCERRADA**.
Nenhuma nova auditoria, alteração de índices ou modificação de queries desse escopo deve ser executada sem solicitação explícita fundamentada em nova evidência de regressão ou alteração drástica de arquitetura/volume.
