# Contrato do inventário offline

## Auditoria da implementação em 25/09/2026

| Responsabilidade | Mobile | ERP Web | Situação |
| --- | --- | --- | --- |
| Índice de identificação | `inventory_catalog_local.snapshot_json` no SQLite | Store `catalog` do IndexedDB `morante-inventory` | No mobile, os quatro mapas anteriores continuam e há um mapa mínimo adicional de colaboradores elegíveis para selecionar o responsável. |
| Rascunho de contagem | `inventory_drafts_local.items_json` no SQLite | Store `drafts` do mesmo IndexedDB | Separado do índice; preserva itens, quantidades, fornecedor, responsável e nome do responsável; novas contagens registram o horário. |
| Submissão congelada | `inventory_outbox_local` no SQLite | Store `outbox` do IndexedDB `morante-inventory` | Separada do rascunho e imutável após o primeiro freeze; retry usa o mesmo payload, versão e `audit_id`. |
| Estoque final | RPC `finalize_inventory_transaction` (v1) e `finalize_inventory_transaction_v2` | Mesmas RPCs | A migration local `20261024165305_inventory_audit_submission_claims.sql` versiona o claim autenticado antes da finalização, o gate `finalizeStockInventory` e a v2 com rebase por `countedAt`. O remoto ainda expõe somente v1 e não contém esse gate/claim/v2; nenhuma migration foi aplicada. O saldo v1 continua definido pela contagem e não recompõe movimentos posteriores. |

O índice mobile baixa dados mínimos de `products`, `product_variations`, `inventory_labels` e `people`. O índice Web usa as consultas de catálogo equivalentes. Para permitir a atribuição do responsável, o mobile também sincroniza uma lista reduzida de pessoas elegíveis em `people`, sem baixar endereço, e-mail ou telefone. As descrições de produtos, o estoque instantâneo, `created_at` e `printed_at` de etiquetas excedem o necessário para identificar uma variação. Nenhum dos dois índices de catálogo baixa preços, imagens, NCM ou o histórico completo de movimentos. O hook do inventário Web também assina a lista de Produtos completa ao abrir a tela e mistura seus itens em memória com os do índice.

A sincronização inicial busca as linhas necessárias às quatro tabelas do índice e filtra produtos e fornecedores no bootstrap. Em 25/09/2026, a consulta inicial encontrou aproximadamente 486 linhas de produtos, 557 variações, nenhuma etiqueta e 1.896 pessoas: cerca de 886 KB de JSON transferido. O snapshot local filtrado teria cerca de 218 produtos, 557 variações e 23 fornecedores: aproximadamente 389 KB de JSON, sem contar a sobrecarga do SQLite/IndexedDB. Remover apenas as colunas claramente excedentes reduziria a estimativa para 282 KB. A lista de colaboradores responsáveis usa uma consulta própria, limitada no servidor a pessoas não excluídas que o ERP admite no seletor; sincroniza apenas os campos de identificação e de elegibilidade, sem dados de contato ou endereço, com limite de espera de 15 segundos e retenção do último índice disponível. O sincronismo incremental do catálogo usa `updated_at` e cursor de exclusões; existe limite de cinco minutos por processo, mas a consulta com `gte` relê linhas do último timestamp. Uma falha ao ler o log de exclusões pode impedir toda a sincronização. O fallback temporário do mobile relê a base completa quando esse log retorna `42501`; ele deve ser substituído por atualização incremental segura antes do encerramento da migração.

Variações mescladas já eram omitidas da lista operacional e um alias antigo podia resolver para o canônico. A migração local adiciona proteção para cadeia cíclica/canônico ausente, teste `A → B → C`, detecção de merge em item contado e submissão congelada. O índice de transição ainda usa `systemStock` para referência visual; esse valor não pode ser a autoridade para o saldo final.

## Fronteiras obrigatórias

### Índice de identificação

O inventário offline **não replica o módulo de Produtos**. O índice técnico contém somente:

- Produto: `id`, nome curto, `code`, `unit`, indicadores de atividade/rascunho/exclusão, vínculo com fornecedores e `updated_at`.
- Variação: `id`, `product_id`, nome curto, `sku`, estado, `merged_to_variation_id` e `updated_at`.
- Etiqueta: `id`, `variation_id`, `product_id` para etiquetas antigas sem variação, `sku`, `barcode`, estado e `updated_at`.
- Fornecedor: `id`, nome de exibição, estado e `updated_at`.
- Colaborador responsável: `id`, tipo, nomes de exibição, cargo/função, situação e `updated_at`. O cache não armazena e-mail, telefone, endereço ou documentos pessoais. A lista é sincronizada separadamente, com filtro no servidor equivalente ao seletor do ERP.
- Cursores de sincronização e versão do formato do índice. O cursor de exclusões acompanha remoções físicas.

`description`, preços, imagens, NCM, informações técnicas, estoque calculado, ledger e histórico de vendas/recebimentos ficam no servidor. A lista operacional exclui variações mescladas. Identificadores de aliases antigos permanecem no índice e resolvem até a variação canônica. Uma cadeia inválida ou um alvo ausente produz conflito explícito; não cria item independente.

### Rascunho

Contém `inventory_id`, código, escopo, `supplier_id` quando aplicável, ID e nome do responsável, itens observados, quantidade, `counted_at`, etiquetas já contadas, observação e estado local. A versão 4 da migração SQLite adiciona `responsible_name` ao escopo local preservando rascunhos existentes sem esse campo. Atualização do índice não altera contagens nem apaga rascunhos. Se o servidor mesclar uma variação em uso no rascunho, o cliente mantém a observação original e mostra um conflito para resolução antes de concluir.

### Snapshot e outbox

Ao concluir, o cliente grava em armazenamento separado um payload imutável com `audit_id` idempotente, versão do contrato, itens, quantidades, `counted_at`, escopo, estado de envio, número de tentativas e último erro. Grava antes de transmitir. Reinício ou perda de rede não recriam nem modificam esse payload. No primeiro envio online, uma conta autenticada com `finalizeStockInventory` reivindica o `audit_id`; o servidor registra `auth.uid()`, versão e hash do snapshot. Retentativas só são aceitas pela mesma conta, versão e hash. Essa conta pode ser diferente da pessoa escolhida para contar, que não é fonte de autorização.

**Contrato desejado da RPC v2:** o servidor valida a submissão e calcula o ajuste considerando os movimentos posteriores a `counted_at`; ele é a única autoridade sobre o saldo. A proveniência futura do `audit_id` já foi decidida para preservar criação/contagem offline, mas o vínculo só existe no backend depois da aplicação e validação da migration protegida.

## Transição segura

1. Expandir os leitores para entender o índice antigo e o novo; preservar `drafts` e qualquer fila já existente.
2. Construir o índice mínimo em paralelo, com versão explícita, sem remover o snapshot antigo. Gravar e reler o novo antes de ativá-lo.
3. Sincronizar por `updated_at` e sequência de exclusões. Filtrar o bootstrap no servidor e tratar mudanças de tipo, merges e desativações sem full download recorrente. Uma falha de permissão não pode ser registrada como sucesso.
4. Migrar SQLite e IndexedDB de forma versionada. Falha parcial mantém o índice antigo legível e não modifica rascunho/outbox.
5. Reconciliar/aplicar primeiro a migration protegida no backend; só depois publicar clientes que dependem do endpoint claim. Criar snapshot/outbox independente e adaptar a RPC para reconciliação server-side. No primeiro envio online autorizado, o servidor reivindica `audit_id` + versão + hash do payload; retentativas usam a mesma conta, ID e snapshot.
6. Validar online, offline, reinício, reconexão, primeiro envio concorrente, retry com mesma conta/snapshot, conta diferente, payload alterado, permissão, merge simples/em cadeia, etiqueta antiga, incremento e rascunho aberto durante atualização.
7. Remover o caminho antigo somente depois da validação do novo em ambas as plataformas. Marcadores legados já concluídos sem claim recebem ACK sem ownership retroativo e sem ajuste de estoque.

### Prova exigida antes da contração

O índice mínimo persiste e reabre offline; variações mescladas não aparecem na busca; aliases antigos resolvem ao canônico; rascunhos conservam contagens; a submissão permanece congelada até confirmação; uma repetição não duplica ajustes; o servidor preserva movimentações posteriores ao instante contado. Nenhuma limpeza de dados antigos ocorre antes dessas provas.

## Estado da transição local

- O índice v2 é gravado em chave própria no SQLite/IndexedDB, validado após a gravação e lido com fallback ao índice legado. O registro antigo permanece; o mapa opcional de colaboradores é aditivo e leitores aceitam os snapshots anteriores sem essa lista. O IndexedDB passou à versão 3 com store `outbox`; o SQLite ganhou tabela de outbox e metadados de escopo, sem apagar `inventory_drafts_local`, e passou a armazenar o nome do responsável na migração local v4.
- O bootstrap filtra produtos e fornecedores no servidor; os incrementos usam cursores de atualização e exclusão. Aliases de merge em cadeia resolvem ao canônico; variações mescladas não entram na lista. Uma alteração no índice não modifica draft ou outbox.
- O draft grava `supplierId` e `countedAt` para novas contagens. A conclusão grava o primeiro payload em outbox antes de chamar a RPC; retries leem o payload salvo. Uma submissão pendente bloqueia edição da contagem e aparece como envio pendente nas listas.
- A inspeção remota atual registrada nos Ciclos 141–143 encontrou apenas `public.finalize_inventory_transaction` v1; a RPC v2 e o endpoint claim não existem no projeto operacional. O SQL histórico v2 (`62a896f8`, removido em `617cc3c4`) não foi restaurado. A nova migration local `20261024165305_inventory_audit_submission_claims.sql` acrescenta `SECURITY DEFINER` com `search_path` vazio, claim autenticado, tabela privada com RLS/ACL restrita, gate `auth.uid()` + `finalizeStockInventory`, hash SHA-256, idempotência por owner/versão/hash, fallback para clientes v1 antigos e rebase v2 por `countedAt`. O usuário decidiu preservar a operação offline: primeiro envio reivindica a submissão; a identidade de acesso não é o responsável operacional da contagem. Clientes atuais reivindicam v1 e v2; marcadores legados concluídos são apenas reconhecidos sem ownership retroativo ou nova escrita de estoque. A migration não foi aplicada e a flag v2 continua desligada. `supabase/tests/finalizeInventoryV2.cjs` é simulação PGlite, não prova o runtime remoto. O cálculo de CMPM pela cadeia de movimentos ainda não foi comprovado na RPC operacional. Cada outbox mantém sua versão e retry correspondente após alteração da flag.
- O campo `stock` da variação continua temporariamente no índice porque as telas de revisão ainda o usam como estimativa. O caminho legado e a chave antiga só serão removidos após a RPC v2 e o fluxo offline completo passarem nos testes de dispositivo/navegador.
