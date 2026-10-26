# Histórico de correções — 26/10/2026

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
