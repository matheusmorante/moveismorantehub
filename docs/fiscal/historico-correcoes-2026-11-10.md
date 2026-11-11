# Histórico de correções fiscais — 2026-11-10

## Vínculo automático do fornecedor nas notas de entrada

### Problema observado

Uma NF-e da Movebol do mês atual ficou sem `supplier_id`, apesar de notas anteriores do mesmo emitente estarem vinculadas ao fornecedor correto. O problema atingia tanto o recebimento pela distribuição SEFAZ quanto importações XML.

### Causa raiz comprovada

`persist_sefaz_inbound_invoice` persistia CNPJ e nome do emitente, mas não incluía `supplier_id` no `INSERT` nem no `ON CONFLICT`. Quando a linha existente já continha XML completo, a cláusula de idempotência ignorava a atualização inteira e não havia etapa para preencher apenas o vínculo faltante. No ERP, o importador XML também salvava o resultado do parser sem localizar o fornecedor.

### Arquivos e linhas modificados

- `supabase/migrations/20261110131608_link_inbound_invoice_supplier_from_history.sql:1-202` — substitui a função de persistência com busca por emitente e atualização isolada do vínculo ausente.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoiceSupplierLookupService.ts:1-128` — busca compacta do cadastro e, como fallback, do fornecedor usado em NF anterior do mesmo CNPJ/CPF.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts:233-254` — passa a data de emissão ao resolvedor antes de salvar a NF.
- `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:30-135` — aplica a mesma resolução por CNPJ e histórico de NF anterior.
- `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:178-302` — permite corrigir uma importação idêntica já salva quando ela ainda não tem fornecedor; se nenhuma correspondência existir, não repete a gravação.
- `docs/fiscal/README.md:8` — referência vigente.
- `docs/auditorias/roadmap-otimizacao-consumo-supabase.md:3-5` — chamadas, projeções e limites de medição.

### Solução implementada

Os importadores ERP e app procuram primeiro o fornecedor cadastrado por CPF/CNPJ normalizado. Se não houver correspondência, consultam somente a NF anterior mais recente do mesmo emitente, limitada à data de emissão da nota atual; o último fallback continua sendo o nome legal exato sem distinção de acentos. As consultas usam filtros no servidor, projeções enxutas e limite de uma linha para o histórico. Nenhum cadastro de fornecedor é criado.

A rotina fiscal da distribuição agora reaproveita o `supplier_id` da NF anterior do mesmo CPF/CNPJ. Para uma NF nova, grava o vínculo junto com os metadados. Se a mesma chave já tiver uma NF completa, mantém XML e itens intactos e preenche `supplier_id` somente quando ainda estiver vazio; um vínculo existente nunca é substituído. A função continua `SECURITY INVOKER`, com execução restrita ao `service_role`.

### Validação e limites

- Revisão do fluxo confirmou que a Edge Function existente chama a RPC alterada; não foi necessário publicar alteração de Edge Function.
- Projeto remoto confirmado como `hkoxhourxwlddgsfdgws`, ativo e saudável. O histórico remoto já continha `20261109203542_persist_sefaz_inbound_invoice_atomically`; a tabela tem `supplier_id text`, FK para `people.id` e índice por `data_emissao`.
- O plano do lookup de histórico usa `idx_inbound_invoices_data_emissao`; a estimativa atual da tabela é de 19 linhas. Nenhum índice novo foi criado.
- Migration `20261110131608_link_inbound_invoice_supplier_from_history` aplicada ao Supabase operacional; função e histórico remoto foram conferidos depois da aplicação. Advisors pós-migration consultados.
- A conferência agregada encontrou uma NF da Movebol de novembro/2026 sem vínculo e um único fornecedor nas notas anteriores do mesmo CNPJ. Uma atualização condicionada ao mês, emitente, CNPJ normalizado e `supplier_id IS NULL` vinculou exatamente uma linha; a leitura posterior confirmou que o vínculo coincide com o das notas anteriores.
- Não foram feitos testes automatizados nem transmissão à SEFAZ. A validação limitou-se à revisão estática, à conferência remota de schema/migration/função e à leitura agregada após a correção do único registro.

