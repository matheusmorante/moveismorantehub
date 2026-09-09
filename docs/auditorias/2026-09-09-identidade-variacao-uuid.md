# Auditoria de identidade de variações — MoranteHub

Data: 09/09/2026

## Resultado

**Mesclagem bloqueada.** A base já possui bons pontos de uso de `variation_id`, mas ainda há consultas de histórico e compatibilidade que usam SKU/código comercial para reencontrar uma variação. A mesclagem não deve ser iniciada antes de substituir esses vínculos por UUID e cobrir a alteração de SKU com testes.

## Escopo analisado

- ERP: produtos e variações, vendas, pedidos, devoluções, assistência, estoque, inventário, compras, recebimentos e NF-e, dashboard, agenda/operação, catálogo Meta, marketing e relatórios.
- Aplicativo: pedidos, entregas/agenda, repositório de pedidos, sincronização e cache local.
- Catálogo digital: vitrine, carrinho/pedido, feed Meta e administração.
- Backend: migrations, esquema-base de testes e Edge Functions.

## Estruturas que possuem a identidade da variação

| Estrutura | Campo | Situação |
| --- | --- | --- |
| `product_variations` | `id` UUID | Identidade canônica da variação; `sku` é único, mas comercial. |
| `inventory_moves` | `variation_id` | Usado pelas movimentações e pelo cálculo/replay de CMPM. Migrações recentes o declaram UUID, mas sem FK explícita. |
| `orders.order_data.items` | `variationId` | JSON histórico de vendas, devoluções e assistência. |
| `purchases.items` | `variationId` | JSON de pedidos de compra. |
| `goods_receipts.items` | `variationId` | JSON de recebimentos. |
| `product_supplier_codes` | `product_variation_id` UUID FK | Correto; código do fornecedor é apenas a chave de busca externa. |
| `product_resolution_feedback` | `final_variation_id` UUID FK | Correto. |
| `product_posts` | `variation_id` UUID | Referência de marketing. |
| `post_share_tokens` | `variation_id` UUID | Referência de compartilhamento. |
| `product_price_history` | `variation_id` | Histórico, porém ainda definido como `text` no esquema-base. |
| inventário salvo em `inventory_moves.observation` | `items[].variationId` | Snapshot JSON com UUID. |

## Módulos que já usam UUID corretamente

- Seleção de produto em novos pedidos e devoluções grava `productId` e `variationId`; `code` é salvo como snapshot comercial.
- Entrada de NF-e e recebimentos guardam `linkedVariationId`/`variationId`; o código do fornecedor só localiza um mapeamento confirmado que então devolve UUID.
- Compras, recebimentos, entradas, saídas, estornos e devoluções enviam `variationId` para `inventory_moves`.
- Serviço de estoque consulta variações por `product_variations.id`, e os cálculos de custo/replay filtram `inventory_moves.variation_id`.
- Dashboard de estoque mantém `productId` e `variationId`.
- Marketing, posts e links compartilhados carregam a variação por `variation_id`.
- Catálogo digital lê `product_variations.id`; SKU é usado para pesquisa e para o feed Meta, que é uso externo permitido.

## SKU/código usado somente como snapshot, exibição ou integração permitida

- `items[].code` nos pedidos, devoluções, compras e recebimentos: snapshot para leitura/impressão.
- `linkedProductCode` na NF-e: exibição do código ERP.
- `supplier_product_code`: chave comercial do fornecedor; o vínculo final é `product_variation_id`.
- Busca por SKU em seletores, leitores de código de barras e etiquetas.
- `retailer_id`/SKU do CSV Meta e filtros de busca do catálogo digital.

## Bloqueadores críticos encontrados

1. **Histórico de vendas por SKU/código/descrição**
   - `erp/src/pages/utils/orderHistoryService.ts` (`getOrdersByProductId`) busca primeiro por IDs, mas também por `items[].code`, `items[].sku` e descrição.
   - `erp/src/pages/App/Products/components/ProductSalesModal.tsx` passa o ID visual da linha e depois filtra itens novamente por SKU/código.
   - Em uma alteração de SKU, pedidos antigos sem `variationId` podem deixar de ser encontrados; além disso, uma busca por SKU pode misturar históricos de cadastros diferentes. **Não é seguro para mesclagem.**

2. **Linhas visuais compostas usadas como pseudoidentidade**
   - `erp/src/pages/App/Products/ProductList/productListTransformers.ts` cria `id` visual no formato `produtoId_SKU`.
   - `erp/src/pages/App/Products/ProductList/useProducts.ts`, `productCatalogState.ts` e `erp/src/pages/App/Products/Index.tsx` contêm resoluções alternativas por SKU/índice para recuperar a variação.
   - Essas alternativas devem ficar limitadas a dados legados de leitura; operações de edição, catálogo, histórico e futura mesclagem devem receber explicitamente `variationId` UUID.

3. **Movimentação entre pais possui fallback por SKU para registro legado**
   - `erp/src/pages/utils/productService.ts` (`moveVariationToFamily`) procura uma variação por SKU quando recebe um identificador visual legado.
   - Esse fallback foi necessário para cadastros antigos sem linha real em `product_variations`, mas não é uma identidade segura. Antes de mesclagem, esses cadastros precisam ser materializados e passar a expor seu UUID real na interface.

4. **Históricos operacionais em JSON sem FK no banco**
   - `orders.order_data`, `purchases.items` e `goods_receipts.items` preservam UUID no JSON, mas o banco não garante integridade referencial nem exige a chave.
   - A migração de mesclagem não pode alterar esses históricos. O requisito é adicionar validação nas novas gravações e fallback de leitura para legado, sem usar SKU como substituto de identidade.

5. **Schema de estoque sem FK explícita e legado textual**
   - `inventory_moves.variation_id` aparece como `text` no `supabase/test/schema-base.sql`, embora migrations recentes o tratem como UUID.
   - É necessário confirmar o tipo e a FK no banco de produção e alinhar schema-base/migrations antes de usar a coluna como fundamento transacional da mesclagem.

## Riscos não bloqueadores, mas que exigem regra explícita

- Leitor de código de barras em recebimento de compra pesquisa SKU para identificar o item lido. Isso é permitido se, depois da leitura, a operação continuar usando o `variationId` já gravado no item de compra.
- Relatórios e dashboard atuais agregam principalmente pelos snapshots do pedido e por `productId`; ainda não existe serviço central que resolva uma família de variações mescladas.
- Não foi encontrada estrutura atual de `merged_to_variation_id`, histórico de mesclagem, RPC transacional ou proteção contra ciclos/concorrência.

## Migrations necessárias antes da mesclagem

1. Confirmar e alinhar `inventory_moves.variation_id` como UUID com FK para `product_variations(id)` (preservando linhas legadas nulas e tratando valores inválidos por auditoria/backfill aprovado).
2. Adicionar `product_variations.merged_to_variation_id UUID NULL REFERENCES product_variations(id)` e índice correspondente.
3. Criar histórico auditável de mesclagem com origem, destino, estados anteriores, responsável, data e reversão.
4. Criar RPC transacional para mesclar/desfazer, com bloqueio da origem, validação de ciclo e rollback integral.
5. Não migrar pedidos, estoque, recebimentos, devoluções ou documentos históricos para o UUID canônico; eles mantêm o UUID original.

## Correções necessárias antes de liberar

1. Alterar a abertura de histórico de vendas para receber `variationId` UUID da linha, e buscar/filtrar primeiro e exclusivamente por ele quando existir.
2. Converter IDs visuais compostos em propriedades de interface (`rowId`), mantendo `variationId` obrigatório em ações de variação.
3. Materializar as variações legadas sem registro físico e eliminar fallback operacional por SKU após a migração de dados aprovada.
4. Criar um resolvedor central de canônico/família de UUID, ainda sem ativar mesclagem, para uso posterior por relatórios e novas operações.
5. Fazer inventário remoto das linhas legadas sem `variationId` antes de qualquer backfill. Isso requer decisão separada do usuário, pois não é seguro inferir a variação apenas pelo SKU em todos os históricos.

## Testes obrigatórios ainda ausentes

- Teste de alteração de SKU mantendo o mesmo UUID em venda, `inventory_moves`, compra, recebimento, devolução, assistência, inventário, dashboard e relatórios.
- Teste específico do histórico de vendas para garantir que alteração de SKU não remove pedidos da listagem.
- Testes de contrato para novas gravações de pedido, compra e recebimento exigindo `variationId` quando o item é um produto cadastrado.
- Teste de schema/RPC confirmando que `inventory_moves.variation_id` aceita apenas UUID válido e permanece ligado ao mesmo UUID após mudança de SKU.

## Conclusão

O sistema possui uma base consistente para estoque, compras e recebimentos quando a variação já está materializada. Contudo, os bloqueadores acima significam que a garantia “trocar SKU não rompe relações” ainda não pode ser comprovada. Portanto, a funcionalidade `merged_to_variation_id` não deve ser iniciada até essas correções e testes serem concluídos.
