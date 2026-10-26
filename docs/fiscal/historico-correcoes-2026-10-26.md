# Histórico de correções — 26/10/2026

## Título do modal de recebimento com NF de entrada

### Problema e sintomas observados

Ao abrir um recebimento vinculado a uma nota de entrada, o título era “Registrar Recebimento com NF-e”. O operador pediu que o modal identificasse a origem como “NF de Entrada”.

### Causa raiz técnica comprovada

A ramificação de apresentação para recebimentos com chave fiscal ou nota de entrada inicial já usava o rótulo “Registrar Recebimento com NF-e”. Não havia falha no vínculo da nota, na validação ou na gravação do recebimento.

### Arquivos e linhas modificados

| Arquivo | Linhas |
|---|---:|
| `erp/src/pages/App/Stock/Receipts/modals/ReceiptFormModal.tsx` | 112 |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | 3–31 |
| `docs/fiscal/README.md` | 9 |

### Solução implementada

O modal agora exibe “Registrar Recebimento com NF de Entrada”. A seleção, os dados e a confirmação do recebimento permanecem iguais. O guia prático já descreve a opção como “Com nota fiscal de entrada”, então seu conteúdo continua alinhado e não precisou ser regenerado.

### Testes e validações

- `git diff --check` não apontou erros de whitespace; Git avisou que CRLF será normalizado para LF no TSX e no índice existentes.
- Busca textual confirmou o novo título no modal e que o rótulo anterior não permanece no fluxo de Recebimentos; a fonte do guia já usa “Com nota fiscal de entrada”.
- Testes automatizados não foram executados para esta troca de texto.
- Nenhum serviço fiscal, dado, regra tributária, banco, snapshot ou comunicação SEFAZ foi alterado.

## Autosave do recebimento por NF de entrada resiliente a timeouts

### Problema e sintomas observados

Ao selecionar “Usar Nota” para a NF de entrada da Rodial, já completa e com os produtos vinculados, o modal apresentava “Não foi possível salvar o rascunho do recebimento.” durante o preenchimento automático.

### Causa técnica identificada e limite da evidência

O autosave exibe o aviso quando a gravação do cabeçalho falha. Durante a investigação, o projeto operacional registrou timeouts repetidos no serviço PostgREST, e o ERP resolvia localmente `@supabase/supabase-js` `2.99.1`, anterior às retentativas automáticas para erros transitórios, disponíveis a partir da versão `2.102.0`. Isso identifica uma falha de resiliência compatível com o sintoma. Como os logs não incluem rota nem o erro detalhado da chamada da Rodial, não é possível provar que um timeout específico causou aquele aviso; a correção cobre essa classe de falha transitória.

### Arquivos e linhas modificados

| Arquivo | Linhas |
|---|---:|
| `erp/package.json` | 12 |
| `erp/package-lock.json` | 15, 6433–6503 |
| `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts` | 299–302 |
| `docs/fiscal/README.md` | 10 |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | 32–65 |

### Solução implementada

- Atualizada a dependência do ERP para `@supabase/supabase-js ^2.115.0`, versão alinhada ao cliente já usado na raiz do repositório e que inclui retentativas automáticas limitadas para falhas transitórias do PostgREST.
- O autosave cria o UUID do rascunho antes de enviar o primeiro `upsert` e o mantém em memória até o modal reinicializar. Se a resposta se perder após a gravação, a próxima tentativa reutiliza o mesmo ID, sem criar outro recebimento.
- Não foi criado nem alterado rascunho operacional da NF da Rodial durante o diagnóstico. O fluxo de conferência e finalização continua igual; como os passos do estoquista não mudaram, o guia prático permanece correto.

### Testes e validações

- Consultados os logs remotos de PostgREST em modo somente leitura; a janela de 15 minutos exibiu timeouts repetidos. A consulta não identificou a rota do pedido.
- Confirmado que antes da correção o ERP resolvia `2.99.1`; agora `package.json` e `package-lock.json` declaram `^2.115.0` e o workspace resolve `2.118.0`. A documentação oficial do Supabase descreve retentativas padrão para PostgREST a partir de `2.102.0`.
- `git diff --check` passou nos arquivos desta correção, com avisos de normalização CRLF/LF em arquivos existentes.
- Testes automatizados e gravação de recebimento não foram executados; não foram criados fixtures nem escritos dados operacionais.
- Nenhuma migration, alteração de schema, regra tributária, snapshot ou comunicação com a SEFAZ foi realizada.

## Paginação segmentada padronizada em listas do ERP e do aplicativo

### Problema

Os controles de paginação das listas tinham estilos e comportamentos diferentes. O componente compartilhado mantinha cinco posições fixas e deixava lacunas nas extremidades; outras listas usavam botões separados de página anterior e próxima. A página atual nem sempre ficava na terceira posição quando havia páginas disponíveis dos dois lados, e algumas listas não voltavam ao topo após a troca.

### Causa raiz

`shared-utils/fixedPagination.ts` calculava páginas por offsets fixos `[-2, -1, 0, 1, 2]`, produzindo valores vazios fora do intervalo. ERP e app reaproveitavam esse cálculo, enquanto o Catálogo Digital e listas de suporte e opções mantinham componentes independentes.

### Solução implementada

- Padronizados os controles para até cinco páginas consecutivas, com a atual centralizada quando possível e alinhada às extremidades no início e no fim.
- Aplicados fundo cinza-claro, seleção azul com texto branco, botões de 42 px e larguras iguais; o controle exibe “Página atual de total”.
- A troca de página volta a lista ao topo em controles web, nativos e no Catálogo Digital.
- Migradas as listas que ainda tinham somente setas para o mesmo padrão.
- Atualizadas as expectativas existentes do componente compartilhado; não houve alteração de regra, status, dado fiscal, banco ou transmissão.

### Arquivos e linhas alterados

| Arquivo | Linhas |
|---|---:|
| `shared-utils/fixedPagination.ts` | 1, 10–25 |
| `erp/src/components/shared/FixedPageSlots.tsx` | 24–111 |
| `mobile/src/components/shared/FixedPageSlots.tsx` | 4–118 |
| `erp/src/components/shared/FixedPageSlots.test.tsx` | 12–68 |
| `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` | 614, 825, 937–943 |
| `digital-catalog/src/features/products/components/ProductGridPagination.tsx` | 1–78 |
| `erp/src/pages/App/AccessAndUsers/components/UsersTab.tsx` | 247–255 |
| `erp/src/pages/App/CustomerSupport/components/infoPanel/CustomerOrderRecordsView.tsx` | 5, 327–340 |
| `erp/src/pages/App/Marketing/ChannelCatalog/components/ChannelCatalogPagination.tsx` | 17, 27–32 |
| `erp/src/pages/App/Products/ProductList/index.tsx` | 253–270 |
| `erp/src/pages/App/Products/Reconciliation/ProductReconciliation.tsx` | 326–337 |
| `erp/src/pages/App/Stock/Inventory/screens/InventoryAudit.tsx` | 59–67 |
| `erp/src/pages/App/Stock/Receipts/modals/PurchaseReceiptPickerModal.tsx` | 170–177 |
| `erp/src/pages/App/Variations/components/CharacteristicOptionsSection.tsx` | 2, 177–190 |
| `mobile/src/features/products/components/MobileProductPagination.tsx` | 76–82, 95 |
| `mobile/src/features/stock/moves/screens/StockMovesScreen.tsx` | 1, 45, 83–87, 133, 176–185 |
| `mobile/src/features/stock/moves/screens/stockMovesStyles.ts` | 52–54 |
| `mobile/src/features/stock/inventory/screens/InventoryScreen.tsx` | 1, 33, 75–80, 101, 150–158 |
| `mobile/src/features/stock/inventory/screens/inventory-screen/inventoryScreen.styles.ts` | 49–59 |
| `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx` | 1, 48, 89–94, 112, 165–181 |
| `mobile/src/features/stock/invoices/screens/invoices-screen/invoicesScreen.styles.ts` | 143–164 |
| `docs/fiscal/README.md` | 3, 9 |

### Validação

- `git diff --check` não apontou erros de whitespace; Git emitiu avisos de normalização CRLF/LF para arquivos já existentes no checkout.
- Testes não foram executados nesta tarefa.
- Não foram feitas alterações em serviços fiscais, banco de dados, snapshots, efeitos comerciais ou comunicação com a SEFAZ.
