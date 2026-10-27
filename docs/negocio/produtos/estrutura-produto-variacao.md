# Estrutura de Produtos e Variações — Morante Hub

Este documento especifica o modelo conceitual de produtos e variações, a regra de variação principal única, a obrigatoriedade de UUID e a gestão de SKUs.

---

## 🧩 Modelo Único "Todo Produto Possui Variação"

No Morante Hub, a arquitetura de catálogo é estritamente uniformizada:
1. **Produto Simples**: É um produto pai que possui exatamente **1 variação única principal** (criada automaticamente por `ensureDefaultVariation` e garantida no banco).
2. **Produto Composto / Com Variações**: É um produto pai que possui **2 ou mais variações** (ex: Cores, Tamanhos, Medidas).

### Invariante e herança da variação única

- Todo registro de produto (`item_type = 'product'`) deve terminar cada transação com pelo menos uma linha em `product_variations`. O banco cria a variação padrão ao gravar um produto sem variações e rejeita a remoção ou transferência da última variação enquanto o produto pai existir. Serviços não entram nessa regra.
- Na variação única, preço, preço promocional, dimensões, descrição e nome ficam herdados do produto pai. A interface bloqueia os controles de personalização enquanto ela for a única variação; ao adicionar uma segunda, os controles voltam a ficar disponíveis.
- Ao abrir produto concluído para edição, o modo com variações é derivado da quantidade operacional: uma linha representa produto simples e duas ou mais representam família com variações. Rascunhos mantêm o modo salvo para que uma família ainda incompleta continue editável. O formulário mobile segue essa mesma regra do ERP; o mapeamento da lista preserva o modo salvo para composições, como no ERP.
- As fotos da variação única refletem as fotos do produto pai. A sincronização usa os URLs já gravados em `product_images` (com `products.images` como fallback), sem copiar arquivos. A partir da segunda variação, a sincronização para e as URLs específicas existentes são preservadas. Ao voltar de duas variações para uma, a herança e a sincronização são reativadas.
- Inserts em lote e a gravação móvel usam a mesma validação no commit, para que a transição de uma para várias ou de várias para uma seja avaliada pelo estado final da transação.

```mermaid
classDiagram
    class Product {
        +UUID id
        +String name
        +String code
        +Array categoryIds
        +Array images
        +Boolean active
        +saveProduct()
    }
    class Variation {
        +UUID id
        +UUID product_id
        +String sku
        +String name
        +Number price
        +Number stock
        +Object attributes
        +Array images
    }
    class Category {
        +UUID id
        +String name
        +defineRequiredAttributes()
    }
    class Attribute {
        +UUID id
        +String name
        +String dataType
        +String unit
    }
    Product "1" -- "1..*" Variation : possui
    Product "0..*" -- "0..*" Category : classificado em
    Category "0..*" -- "0..*" Attribute : exige via category_attributes
```

## Atributos obrigatórios por Categoria

- `attributes` e `attribute_values` são o cadastro global de atributos e opções. A criação e administração desses registros permanece no fluxo próprio de gerenciamento de atributos.
- `category_attributes` é a fonte de verdade para definir quais atributos são obrigatórios em cada Categoria. O vínculo pertence à Categoria e não é multiplicado pelos Ambientes aos quais ela está associada.
- O valor efetivo continua armazenado em `product_variations.attributes`, inclusive para o produto simples, que possui sua variação principal única.
- Associar um Produto a uma Categoria ou adicionar uma nova obrigatoriedade não inventa nem preenche valores. Variações sem valor passam a ter uma pendência na Central de Conciliação.
- Remover uma linha de obrigatoriedade em `category_attributes` não remove nem altera valores já existentes em `product_variations.attributes`.

## Ativação de produtos e variações

- Um produto simples continua tendo uma variação operacional única; essa linha, por si só, não transforma o produto em uma família multi-variação. A ativação do produto simples exige preço de venda no pai.
- Variações podem ser localizadas pelo UUID estável ou pelo identificador legado `produto_SKU`. A validação da variação consulta o pai, bloqueia rascunhos e exige nome, categoria e fornecedor no pai.
- Preço herdado exige preço positivo no pai. Preço próprio exige preço positivo na variação, mesmo que o pai tenha outro preço.
- Uma variação de composição exige pelo menos dois componentes vinculados à própria variação. A composição simples verifica os componentes do produto.
- A regra está em `shared-utils/productActivationValidation.ts`; a tela do ERP e o serviço de mutação mobile usam a mesma validação.
- Para composição simples, ERP e app expõem a aba **Composição** no formulário do produto. Ao carregar, os dois preferem os componentes da variação principal quando ela os tem e recorrem aos componentes do produto quando não tem; ao editar, atualizam o produto e sua variação principal. Essa compatibilidade mantém a edição simples sincronizada com o payload existente.
- Em famílias compostas com várias variações, a edição permanece na composição de cada variação; a aba de composição simples não é exibida. A exigência de dois componentes para ativação é aplicada ao produto simples ou a cada variação ativa da família correspondente.
- Em `combo_items`, `variationId` identifica somente uma linha real de `product_variations`. Quando o componente usa o fallback visual/de estoque do produto pai por não ter linha real, omita essa chave no JSON; não persista o ID sintético da variação virtual nem `null` em seu lugar.

### Disponibilidade calculada e estoque físico de composições

- A disponibilidade de uma composição é calculada em leitura a partir dos saldos atuais de seus componentes. O número exibido no catálogo representa kits montáveis e não uma movimentação física do produto composto.
- Não gravar essa projeção em `products.stock` nem em `product_variations.stock` ao salvar o formulário de Produtos. Esses campos são caches do saldo físico mantido pelos fluxos de estoque; `inventory_moves` permanece a fonte contábil/auditável, conforme [a arquitetura do banco](../../arquitetura/estrutura_banco_supabase.md).
- Alterar preço, componentes, rascunho ou outros dados comerciais de uma composição não altera o estoque físico. A composição continua tendo a disponibilidade recalculada quando consultada.

## Visibilidade do atributo no nome da Variação

- Cada item de `product_variations.attributes` pode persistir `showName: false` para manter o atributo disponível para filtros e regras sem incluir seu valor no nome automático da variação.
- A ausência de `showName` equivale a `true`. Assim, produtos e variações cadastrados antes dessa opção continuam exibindo todos os valores no nome, sem backfill.
- A visibilidade altera somente a composição de `name`, `title` e `marketplaceTitle`; o atributo e seu valor continuam persistidos e participam da identificação de combinações duplicadas.
- A ordem dos valores visíveis segue a ordem dos atributos na aba **Identificação e Atributos**.

### Mapeamento em código e testes

- Configuração da Categoria: `categoryService.ts` e `CategoryEnvironmentModal.tsx`.
- Detecção na Conciliação: `Reconciliation/services/pendencyDetector.ts`.
- Correção de valores: `ReconciliationProductCard.tsx` e `VariationAttributeValueInput.tsx`.
- Regressão: `categories-deletion-safety.spec.ts` e `pendencyDetector.test.ts`.
- Visibilidade no nome: `shared-utils/productVariationNameValidation.ts`, `productVariationDefaults.ts`, `variationGenerationRules.ts`, `VariationIdentificationTab.tsx` e os testes ERP/mobile.

---

## 🆔 Identidade por UUID

- **Chave Primária Fixo (UUID)**: O campo `id` da tabela `product_variations` é a **única chave primária confiável da variação**.
- **SKU Comercial (`sku`)**: O SKU é o código alfanumérico visível nas etiquetas e relatórios. Se um usuário alterar o SKU comercial de uma variação, a alteração é aceita contanto que o SKU seja único no banco, mantendo a variação com o **mesmo `UUID`**.

---

## 🏷️ Códigos dos Fornecedores (`supply_product_links` / `product_supplier_codes`)

Um produto ou variação pode ser adquirido de múltiplos fornecedores ou ter seu código alterado por um fornecedor ao longo do tempo:
- **Tuplas Únicas**: Cada vinculo é salvo como uma tupla `(supplier_id, supplier_product_code)` na tabela `product_supplier_codes`.
- **Múltiplos Códigos por Fornecedor**: O mesmo fornecedor pode ter 2 ou mais códigos associados à mesma variação no ERP (ex: código legado vs. código atualizado no XML de compra).
- **Resolução Automática**: Na entrada de NF-e, qualquer código histórico cadastrado para aquele fornecedor realiza o auto-match automático com a variação correspondente.

---

## 🔗 Mapeamento em Código e Testes

- **Serviço de Códigos de Fornecedores**: `[productSupplierCodesService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productSupplierCodesService.ts)`
- **Serviço de Mutação**: `[productMutationService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productMutationService.ts)`
- **Sincronização Supabase**: `[productPersistenceService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%2520Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productPersistenceService.ts)`
- **Padronização de Variações**: `[productVariationDefaults.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productVariationDefaults.ts)`
- **Relatório de Auditoria**: `[2026-09-09-identidade-variacao-uuid.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/auditorias/2026-09-09-identidade-variacao-uuid.md)`
