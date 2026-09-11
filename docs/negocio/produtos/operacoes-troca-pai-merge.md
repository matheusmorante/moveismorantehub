# Operações Avançadas: Mover Pai e Merge de Variações — Morante Hub

Este documento descreve as operações avançadas de reestruturação de produtos no Morante Hub: a transferência de uma variação para outro produto pai e a mesclagem (merge) de variações duplicadas.

---

## 🔀 Operação 1: Mover Variação para Outro Pai (`moveVariationToFamily`)

### Objetivo
Permite reatribuir o produto pai (`product_id`) de uma variação sem alterar seu `UUID`, preservando integralmente o histórico de vendas, estoque e movimentações.

```mermaid
flowchart TD
    A[Selecionar Variação no ERP] --> B[Abrir MoveVariationFamilyModal.tsx]
    B --> C[Pesquisar Novo Produto Pai Target]
    C --> D{Existe conflito de atributos no Novo Pai?}
    D -- Sim --> E[Solicita alteração/distinção dos atributos]
    D -- Não --> F[Executa RPC move_variation_to_parent]
    F --> G[Atualiza product_id e gera novo SKU comercial]
    G --> H{Pai antigo ficou sem variações?}
    H -- Sim --> I[Remove produto pai antigo automaticamente]
    H -- Não --> J[Conclui movimentação mantendo UUID]
```

---

## 🔀 Operação 2: Mesclar Variações (`mergeVariationIntoCanonical`)

### Objetivo
Unificar cadastros duplicados de uma mesma variação. A variação não-canônica (origem) repassa suas informações e associações para a variação canônica (destino).

```mermaid
flowchart TD
    A[Selecionar Variação Origem] --> B[Abrir MergeVariationModal.tsx]
    B --> C[Pesquisar Variação Canônica Destino]
    C --> D[Executar RPC merge_product_variation_into_canonical]
    D --> E[Aponta origem para a canônica via merged_to_variation_id]
    E --> F[Consolida estoque, compras e fornecedores exclusivos]
```

---

## 🔗 Mapeamento em Código e Testes

- **Serviço de Variações**: `[productVariationActionsService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productVariationActionsService.ts)`
- **Modal Mover Pai**: `[MoveVariationFamilyModal.tsx](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Products/ProductList/MoveVariationFamilyModal.tsx)`
- **Modal Merge**: `[MergeVariationModal.tsx](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/Products/ProductList/MergeVariationModal.tsx)`
