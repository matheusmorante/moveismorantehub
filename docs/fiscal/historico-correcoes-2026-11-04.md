# Histórico de correções fiscais — 04/11/2026

## Busca textual sem dependência da ordem das palavras

**Problema e causa comprovada.** Buscas de produtos e de emitentes podiam exigir a frase digitada como substring contínua. Assim, “balcão florença pia” não correspondia ao cadastro “Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença”. Na consulta remota, a comparação ocorria antes do limite; filtrar uma página depois da consulta não recuperaria o item ausente.

**Solução.** A comparação exige todas as palavras, sem distinção de acentos ou maiúsculas e sem exigir a ordem digitada. Consultas PostgREST combinam as condições antes do limite; buscas de um campo usam regex própria, sem aspas de expressão OR. Foram preservados os campos, filtros de fornecedor, tipo, status e busca numérica de cada caminho. As regras fiscais, os snapshots e a transmissão não foram alterados.

No banco operacional, `inbound_invoices.numero_nfe` é inteiro. As consultas do ERP deixaram de aplicar `imatch` a essa coluna e usam igualdade para números válidos; ERP e app evitam comparar valores fora do intervalo inteiro. A chave e o CNPJ continuam nos seus filtros textuais.

**Arquivos modificados relacionados aos fluxos fiscais e suas linhas:**

- `shared-utils/searchText.ts:73`, `:87`, `:103` e `:111`: padrões e comparação textual compartilhados entre ERP e app.
- `shared-utils/productListSearch.ts:44`: busca de nomes e SKUs de variações por palavras.
- `erp/src/pages/utils/textUtils.ts:12`: mantém a equivalência entre hífen e espaço na busca textual.
- `erp/src/pages/utils/inboundNfe/services/inboundQueriesService.ts:125` e `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts:132`: pesquisa remota de emitente.
- `erp/src/pages/App/Stock/Receipts/utils/inboundInvoicePickerFilters.ts:88`: pesquisa local de emitente no seletor de NF.
- `mobile/src/features/stock/invoices/utils/invoiceList.ts:56` e `mobile/src/features/stock/invoices/utils/invoiceList.test.ts:59`: limite numérico da busca por número da NF.
- `erp/src/pages/App/SalesOrder/hooks/useProductSearch_new.ts:34`: uma consulta completa substitui a união de consultas por palavras isoladas.
- `supabase/migrations/20261104130632_search_words_any_order.sql:2` e `:150`: funções de catálogo e de clientes da central, com assinaturas e permissões preservadas. Aplicada no projeto operacional `hkoxhourxwlddgsfdgws`, schema `public`.
- `supabase/migrations/20261104134242_compact_people_search_fields.sql:1`: campos calculados para buscas de pessoas e fornecedores, com `SECURITY INVOKER` e sem alterar RLS. Aplicada no mesmo projeto e schema para manter as consultas compactas.
- `erp/src/pages/utils/__tests__/searchWords.test.ts:1` e `erp/src/pages/utils/__tests__/searchWords.remote.test.ts:1`: comparação local e consulta remota somente leitura.

No app, `mobile/src/services/stock/invoices/inboundInvoiceCatalogLookupService.ts:19` e `:229` e `mobile/src/features/products/services/mobileProductFetchService.ts:183` consomem os filtros compartilhados; seus escopos existentes foram mantidos.

**Validação.** Vitest passou em 68 testes focados do ERP e 17 do app. Um teste Vitest autenticado com o operador autorizado consultou o produto solicitado no Supabase remoto em duas ordens e confirmou filtros PostgREST de produtos, etiquetas, pessoas e fornecedores, inclusive os campos calculados. Foram leituras, sem fixtures, alterações de cadastro ou emissão fiscal. A interface autenticada e fluxos graváveis não foram cobertos por essa prova.
