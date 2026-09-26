# Contrato do inventário offline

## Auditoria da implementação em 25/09/2026

| Responsabilidade | Mobile | ERP Web | Situação |
| --- | --- | --- | --- |
| Índice de identificação | `inventory_catalog_local.snapshot_json` no SQLite | Store `catalog` do IndexedDB `morante-inventory` | Quatro mapas: produtos, variações, etiquetas e fornecedores. |
| Rascunho de contagem | `inventory_drafts_local.items_json` no SQLite | Store `drafts` do mesmo IndexedDB | Separado do índice; preserva itens e quantidades, mas não registra o horário de cada contagem nem o fornecedor escolhido como campo próprio. |
| Submissão congelada | Não existe outbox específica de inventário | Não existe outbox específica de inventário | `pending_sync` marca o rascunho mutável. O envio é montado novamente a cada tentativa. |
| Estoque final | RPC `finalize_inventory_transaction` | Mesma RPC | A RPC atual define `stock` com a quantidade contada. Não recompõe movimentos posteriores à contagem. |

O índice mobile baixa 15 colunas de `products`, 9 de `product_variations`, 9 de `inventory_labels` e 8 de `people`. O índice Web usa as mesmas consultas. As descrições de produtos, o estoque instantâneo, `created_at` e `printed_at` de etiquetas excedem o necessário para identificar uma variação. Nenhum dos dois índices baixa preços, imagens, NCM ou o histórico completo de movimentos. O hook do inventário Web também assina a lista de Produtos completa ao abrir a tela e mistura seus itens em memória com os do índice.

A primeira sincronização busca todas as linhas das quatro tabelas e filtra produtos e fornecedores depois do download. Em 25/09/2026, a consulta inicial encontrou aproximadamente 486 linhas de produtos, 557 variações, nenhuma etiqueta e 1.896 pessoas: cerca de 886 KB de JSON transferido. O snapshot local filtrado teria cerca de 218 produtos, 557 variações e 23 fornecedores: aproximadamente 389 KB de JSON, sem contar a sobrecarga do SQLite/IndexedDB. Remover apenas as colunas claramente excedentes reduziria a estimativa para 282 KB. O sincronismo posterior usa `updated_at` e cursor de exclusões; existe limite de cinco minutos por processo, mas a consulta com `gte` relê linhas do último timestamp. Uma falha ao ler o log de exclusões pode impedir toda a sincronização. O fallback temporário do mobile relê a base completa quando esse log retorna `42501`; ele deve ser substituído por atualização incremental segura antes do encerramento da migração.

Variações mescladas já eram omitidas da lista operacional e um alias antigo podia resolver para o canônico. A migração local adiciona proteção para cadeia cíclica/canônico ausente, teste `A → B → C`, detecção de merge em item contado e submissão congelada. O índice de transição ainda usa `systemStock` para referência visual; esse valor não pode ser a autoridade para o saldo final.

## Fronteiras obrigatórias

### Índice de identificação

O inventário offline **não replica o módulo de Produtos**. O índice técnico contém somente:

- Produto: `id`, nome curto, `code`, `unit`, indicadores de atividade/rascunho/exclusão, vínculo com fornecedores e `updated_at`.
- Variação: `id`, `product_id`, nome curto, `sku`, estado, `merged_to_variation_id` e `updated_at`.
- Etiqueta: `id`, `variation_id`, `product_id` para etiquetas antigas sem variação, `sku`, `barcode`, estado e `updated_at`.
- Fornecedor: `id`, nome de exibição, estado e `updated_at`.
- Cursores de sincronização e versão do formato do índice. O cursor de exclusões acompanha remoções físicas.

`description`, preços, imagens, NCM, informações técnicas, estoque calculado, ledger e histórico de vendas/recebimentos ficam no servidor. A lista operacional exclui variações mescladas. Identificadores de aliases antigos permanecem no índice e resolvem até a variação canônica. Uma cadeia inválida ou um alvo ausente produz conflito explícito; não cria item independente.

### Rascunho

Contém `inventory_id`, código, escopo, `supplier_id` quando aplicável, responsável, itens observados, quantidade, `counted_at`, etiquetas já contadas, observação e estado local. Atualização do índice não altera contagens nem apaga rascunhos. Se o servidor mesclar uma variação em uso no rascunho, o cliente mantém a observação original e mostra um conflito para resolução antes de concluir.

### Snapshot e outbox

Ao concluir, o cliente grava em armazenamento separado um payload imutável com `audit_id` idempotente, versão do contrato, itens, quantidades, `counted_at`, escopo, estado de envio, número de tentativas e último erro. Grava antes de transmitir. Reinício ou perda de rede não recriam nem modificam esse payload. O servidor valida o identificador e calcula o ajuste considerando os movimentos posteriores a `counted_at`; ele é a única autoridade sobre o saldo.

## Transição segura

1. Expandir os leitores para entender o índice antigo e o novo; preservar `drafts` e qualquer fila já existente.
2. Construir o índice mínimo em paralelo, com versão explícita, sem remover o snapshot antigo. Gravar e reler o novo antes de ativá-lo.
3. Sincronizar por `updated_at` e sequência de exclusões. Filtrar o bootstrap no servidor e tratar mudanças de tipo, merges e desativações sem full download recorrente. Uma falha de permissão não pode ser registrada como sucesso.
4. Migrar SQLite e IndexedDB de forma versionada. Falha parcial mantém o índice antigo legível e não modifica rascunho/outbox.
5. Criar snapshot/outbox independente e adaptar a RPC para reconciliação server-side. Retentativas usam sempre o mesmo `audit_id` e o mesmo payload.
6. Validar online, offline, reinício, reconexão, merge simples e em cadeia, etiqueta antiga, incremento, rascunho aberto durante atualização e retry idempotente.
7. Remover o caminho antigo apenas em mudança posterior, depois da validação do novo em ambas as plataformas.

### Prova exigida antes da contração

O índice mínimo persiste e reabre offline; variações mescladas não aparecem na busca; aliases antigos resolvem ao canônico; rascunhos conservam contagens; a submissão permanece congelada até confirmação; uma repetição não duplica ajustes; o servidor preserva movimentações posteriores ao instante contado. Nenhuma limpeza de dados antigos ocorre antes dessas provas.

## Estado da transição local

- O índice v2 é gravado em chave própria no SQLite/IndexedDB, validado após a gravação e lido com fallback ao índice legado. O registro antigo permanece. O IndexedDB passou à versão 3 com store `outbox`; o SQLite ganhou tabela de outbox e metadados de escopo, sem apagar `inventory_drafts_local`.
- O bootstrap filtra produtos e fornecedores no servidor; os incrementos usam cursores de atualização e exclusão. Aliases de merge em cadeia resolvem ao canônico; variações mescladas não entram na lista. Uma alteração no índice não modifica draft ou outbox.
- O draft grava `supplierId` e `countedAt` para novas contagens. A conclusão grava o primeiro payload em outbox antes de chamar a RPC; retries leem o payload salvo. Uma submissão pendente bloqueia edição da contagem e aparece como envio pendente nas listas.
- A função `finalize_inventory_transaction_v2` está em migração local e é coberta por `supabase/tests/finalizeInventoryV2.cjs` em PostgreSQL isolado: movimentação posterior, idempotência, payload divergente, merge, ajuste concorrente e rollback. Ela ainda requer validação de integração com o schema real e implantação antes de substituir a RPC anterior. O cliente mobile só prepara submissões v2 com `EXPO_PUBLIC_INVENTORY_RPC_V2=true`; o ERP usa `VITE_INVENTORY_RPC_V2=true`. Com as flags ausentes, continuam usando a RPC anterior. Cada outbox mantém sua versão e retry correspondente mesmo após alteração da flag.
- O campo `stock` da variação continua temporariamente no índice porque as telas de revisão ainda o usam como estimativa. O caminho legado e a chave antiga só serão removidos após a RPC v2 e o fluxo offline completo passarem nos testes de dispositivo/navegador.
