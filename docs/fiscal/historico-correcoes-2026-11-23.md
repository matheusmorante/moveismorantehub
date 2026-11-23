# 23/11/2026 — Vínculo global de itens de NF por fornecedor e código

## Problema identificado e causa raiz

Uma associação escolhida numa ocorrência de item da NF não era uma fonte global confiável para as demais notas do mesmo fornecedor. A tabela `product_supplier_codes` guardava produto e variação, mas não o modo Único/Composto/Não se aplica nem os componentes e seus multiplicadores. Além disso, a seleção manual no app não era lembrada por padrão. Como resultado, notas antigas e recebidas podiam continuar mostrando um vínculo divergente do cadastro atual.

A causa foi comprovada pela estrutura anterior do banco e pelos caminhos de consulta e salvamento do ERP e do app: eles reaproveitavam relações por produto/código sem uma entidade que representasse, em conjunto, fornecedor, código completo e modo de vínculo.

## Solução implementada

O vínculo corrente agora é identificado pelo fornecedor e pelo código completo do item (espaços externos removidos e caixa uniformizada; pontuação preservada). Único, Composto e Não se aplica são gravados globalmente. Em Composto, produtos componentes e multiplicadores acompanham a associação global. Um vínculo ausente permanece pendente. Códigos iguais de fornecedores diferentes não se misturam.

As consultas e telas de listagem, gerenciamento e recebimento do ERP e do app usam o vínculo corrente. O recebimento continua mostrando separadamente o produto, a variação e a quantidade efetivamente registrados no histórico. O XML original, os registros de recebimento e estoque já gravados e os custos e rateios próprios de cada NF não são alterados nem copiados entre notas.

Correspondências legadas conflitantes não foram propagadas automaticamente. Em particular, os códigos Movebol 103.550 e 119.550 divergem entre as NFs 8532 e 8386, e 106.550 descreve um painel América enquanto a memória anterior aponta para uma cômoda Malta. Na NF 8532, a ordem do array JSON também difere dos números dos itens; a associação considera número/código e não a posição do array. Nenhum vínculo legado conflitante foi convertido por inferência.

## Migration e validação remota

A migration `20261121192000_global_inbound_supplier_item_mappings.sql` foi aplicada no projeto Supabase operacional `hkoxhourxwlddgsfdgws`, com registro remoto `20261123123240`. Antes da aplicação foram conferidos o histórico remoto e a ausência dos objetos novos, além das precondições usadas pelo SQL. A verificação posterior encontrou duas tabelas novas com RLS habilitada, políticas de leitura para `authenticated` e três RPCs disponíveis somente aos papéis autorizados; as funções e seus `search_path` foram conferidos. A migration não alterou linhas de NF, recebimento ou estoque.

Não foi iniciado Supabase local, PostgreSQL local, Docker, fixtures ou DML de teste. Não foram executados testes automatizados nesta etapa. As variações de cadastro solicitadas para os produtos internos 004087 e 004086 não foram gravadas: a automação sem cursor recusou os botões repetidos de edição por identidade ambígua, e o clique semântico na célula do produto não abriu um formulário verificável. Portanto, esses dois cadastros permanecem pendentes de operação pelo formulário do ERP.

## Arquivos e linhas modificados

- Migration e permissões: `supabase/migrations/20261121192000_global_inbound_supplier_item_mappings.sql`, linhas 1–364 (tabelas e RLS: 5–52; salvamento: 55–256; leitura em lote: 258–318; consulta de candidatos: 320–356; grants: 358–362).
- Identificação por fornecedor/código e composição global: `shared-utils/inboundInvoiceMappingState.ts`, linhas 3–139; reutilização de vínculos: `shared-utils/inboundInvoiceLinkReuse.ts`, linha 83; validação do modo/formulário: `shared-utils/inboundProductLinkFormSchemas.ts`, linha 1 em diante.
- ERP — consulta, persistência e interface: `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts`, linhas 159–211; `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts`, linhas 168–191; `erp/src/pages/utils/inboundNfe/services/inboundSupplierItemMappingsService.ts`, linhas 1–86; `erp/src/pages/utils/inboundNfe/types/inboundNfeTypes.ts`; `erp/src/pages/utils/productSupplierCodesService.ts`; `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx`, linhas 320–481.
- ERP — preservação do produto recebido no adaptador: `erp/src/pages/App/Stock/Receipts/utils/inboundInvoiceToReceiptAdapter.ts`, linhas 101–205.
- App — tela, estado e consulta: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundInvoiceMappingsModalContent.tsx`; `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundSupplierSection.tsx`; `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundInvoiceMappings.ts`; `mobile/src/features/stock/invoices/modals/inbound-mappings/types.ts`; `mobile/src/services/stock/invoices/inboundInvoiceMappers.ts`, linhas 28–106; `mobile/src/services/stock/invoices/inboundInvoiceMappingsService.ts`, linhas 1–380; `mobile/src/services/stock/invoices/inboundInvoiceQueryService.ts`, linhas 1–101.
- Guia de operação do estoque: `docs/estoque/guia-pratico/gerar_guia.py`, linhas 415–417; PDFs `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` (44 páginas; cópias idênticas). A página 8 foi renderizada e revisada visualmente.
