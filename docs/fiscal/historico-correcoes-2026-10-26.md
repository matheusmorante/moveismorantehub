# Histórico de correções — 26/10/2026

## Prévia automática e exportação direta de documentos fiscais

### Problema e sintomas observados

O operador precisava clicar em “Pré-visualizar documentos” para carregar os totais. A área de prévia não aparecia antes da resposta e “Exportar ZIP” ficava desativado sem uma prévia com documentos.

### Causa raiz técnica comprovada

O envio do formulário chamava `handlePreview`; a área de resumo era renderizada somente quando já existia uma prévia válida, e o botão de exportação era bloqueado enquanto não havia resultado atual ou quando a contagem era zero. Assim, a consulta era manual e pré-requisito da exportação.

### Arquivos e linhas modificados

| Arquivo | Linhas |
|---|---:|
| `erp/src/pages/App/FiscalDocuments/modals/FiscalExportModal.tsx` | 168–221, 258–286, 309, 418–442 |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | 3–29 |
| `docs/fiscal/README.md` | 9 |

### Solução implementada

A prévia é consultada automaticamente ao abrir o modal e quando os filtros mudam. Os totais e a tabela de grupos permanecem visíveis; durante a consulta, os valores mostram um estado de carregamento. Removi o botão “Pré-visualizar documentos”. “Exportar ZIP” fica habilitado até começar a geração; ao clicar, reutiliza a prévia atual ou aguarda uma consulta em andamento. Quando nenhum documento corresponder aos filtros, exibe essa informação sem iniciar um ZIP vazio. Os filtros continuam passando pelo resolver Zod antes da operação.

### Testes e validações

- Revisão estática confirmou que o formulário agora submete a exportação validada por `react-hook-form`/Zod, o botão só é desativado durante a geração e a área de resumo é sempre renderizada.
- Testes automatizados e execução no navegador não foram realizados.
- Nenhuma chamada à SEFAZ nem alteração de dados ou schema foi feita.

## Histórico de exportações fiscais indisponível

### Problema e sintomas observados

Ao abrir “Exportar documentos fiscais”, a seção “Exportações recentes” mostrava “Não foi possível carregar o histórico de exportações.” A API usa essa resposta quando a consulta da tabela de histórico falha (`api/nfe/export-documents.ts:272-281`).

### Causa raiz técnica comprovada

A migration `20261022183100_fiscal_document_export_history.sql` existia no repositório, mas não estava aplicada no projeto operacional: a versão não constava no histórico remoto e `to_regclass('public.nfe_document_export_history')` retornava `NULL`. Portanto, a consulta autenticada com `service_role` falhava porque a tabela ainda não existia. A mensagem da tela correspondia ao erro genérico retornado pela API.

### Arquivos e linhas modificados

| Arquivo/registro | Linhas |
|---|---:|
| `supabase/migrations/20261026235830_fiscal_document_export_history.sql` | 1–36 (SQL existente, aplicado sem alteração e renomeado para corresponder à versão remota) |
| Histórico remoto do Supabase MoranteHub (`hkoxhourxwlddgsfdgws`) | versão registrada `20261026235830`, nome `fiscal_document_export_history` |
| `docs/fiscal/rollbacks/20261026235830_fiscal_document_export_history.sql` | 1–8 (arquivo de reversão renomeado para acompanhar a migration) |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | 3–34 |
| `docs/fiscal/historico-correcoes-2026-10-22.md` | 127, 129 (referências para os nomes atuais) |
| `docs/fiscal/README.md` | 9 |

Nenhum arquivo da API ou da interface precisou ser alterado; os caminhos de consulta envolvidos são `api/nfe/export-documents.ts:272-281` e `erp/src/pages/App/FiscalDocuments/modals/FiscalExportModal.tsx:174-188`.

### Solução implementada

A migration foi aplicada ao projeto Supabase operacional MoranteHub. Ela cria somente a tabela de auditoria de exportações, que guarda filtros e contagens sem XMLs ou dados de destinatários; mantém RLS ativo, revoga o acesso de `PUBLIC`, `anon` e `authenticated` e concede `SELECT`/`INSERT` somente ao `service_role` usado pela API. A migration e seu arquivo de reversão foram renomeados para `20261026235830`, a versão efetivamente registrada no banco, evitando reaplicação futura do mesmo DDL. A API pode agora consultar o histórico sem mudar a autorização por usuário (`requested_by`).

### Testes e validações

- Antes da aplicação: consulta somente leitura confirmou `migration_applied=false` e `history_table_exists=false`.
- Depois da aplicação: histórico remoto registrou `20261026235830`; o catálogo confirmou a tabela presente, RLS ativo, `SELECT`/`INSERT` concedidos ao `service_role` e `SELECT` negado a `authenticated` e `anon`.
- Os avisos dos advisors sobre RLS sem política incluem esta tabela de propósito: sem grants para clientes e com leitura/escrita restritas ao `service_role`, nenhuma política de cliente deve ser aberta.
- Testes automatizados não foram executados. Não houve leitura ou alteração de documentos fiscais, geração de ZIP, transmissão ou consulta à SEFAZ.

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

## Prazo e erros do gateway de IA compartilhado pela classificação fiscal

**26/10/2026 — auditoria estática IA-01/IA-06.** O gateway usado por `aiDirectClient` e pelos serviços de classificação fiscal aguardava sessão, fetch e JSON sem prazo. Uma espera travada mantinha a promessa deduplicada e a vaga de concorrência até a resolução. Erros HTTP liam o corpo bruto e o interpolavam em erros, no rastreador de latência e na telemetria; o catch também copiava mensagens arbitrárias. Essa é evidência do código, sem afirmar ocorrência ou exposição real em produção.

**Correção:** `callGeminiApiProxied` reutiliza withTimeout para limitar sessão + fetch + leitura do JSON a 60 s, com margem sobre os 45 s do proxy. AbortController é passado ao fetch e encerrado em finally. Sessão que resolve após o encerramento não inicia fetch. A conclusão tardia do transporte não passa pelo parsing/registro de sucesso externo ao wrapper. Erro HTTP usa apenas status; JSON inválido usa mensagem fixa; rastreadores recebem mensagens fixas e HTTP 429 mantém RATE_LIMITED. O registro duplicado de falha no tracker de latência foi removido junto do ramo de corpo HTTP. A reserva de cota anterior ao transporte não integra esse prazo; a operação interna de autenticação não oferece cancelamento por este contrato, e abortar o fetch não comprova interrupção do provedor.

**Arquivos e linhas desta correção:** `erp/src/services/aiGateway/AiGateway.ts:14,267–375` (import, ciclo limitado, sinal, erros e telemetria); `docs/auditorias/roadmap-apis-ia-google-maps.md` (inventário/IA-01/IA-06 e registro de 26/10); esta seção em `docs/fiscal/historico-correcoes-2026-10-26.md`; referência em `docs/fiscal/README.md:9`. Nenhum backend fiscal, migration, SQL, XML, snapshot, regra tributária ou operação SEFAZ alterado. Modelos, payload de geração, ferramentas, cotas e política de retry preservados. Sem efeito nos passos operacionais do estoquista; guia não requer atualização.

**Validação:** revisão estática integral do diff, contrato de erro do execute/aiDirectClient, parser e tracker de latência, helper withTimeout e chamadas de classificação que usam esse transporte. Nenhum teste adicionado ou executado, typecheck, build ou API real, conforme restrição desta automação. Pendentes: sessão travada/tardia, fetch/corpo lento, timeout e limpeza da deduplicação/concorrência após quota concedida, HTTP 429/500, JSON inválido, sucesso e erros com conteúdo sensível fictício. Não há comprovação dinâmica de não regressão. Sanitização do proxy, diagnóstico de resposta vazia e mensagens de quota seguem fora desta correção parcial.

## Busca e filtros da lista fiscal com borda apenas inferior

### Problema e sintomas observados

A barra superior da lista de documentos fiscais aparecia dentro de um painel com borda, e os campos de busca, seletores e período tinham contorno completo. A mesma aparência se repetia nos seletores e datas da janela “Mais filtros”.

### Causa raiz técnica comprovada

O `ZodForm` aplicava borda, fundo e espaçamento ao formulário inteiro; cada campo também declarava classes próprias de borda completa, fundo preenchido e cantos arredondados. A janela “Mais filtros” repetia essas classes nos controles.

### Arquivos e linhas modificados

| Arquivo | Linhas |
|---|---:|
| `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx` | 63, 85, 197, 212–243, 315, 329, 343, 373, 385 |
| `docs/fiscal/README.md` | 9 |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | 127–153 |

### Solução implementada

Removido o contorno, fundo e espaçamento do formulário externo. Os campos de busca, modelo, tipo, status, período e datas personalizadas agora compartilham estilo transparente com borda somente inferior, inclusive os controles dentro de “Mais filtros”. Os checkboxes e botões de ação mantêm sua aparência. Nenhum valor, filtro, consulta ou operação fiscal foi alterado.

### Testes e validações

- `git diff --check` foi executado nos arquivos alterados e não apontou erros de whitespace.
- Testes automatizados, typecheck e build não foram executados; a alteração restringe-se às classes visuais dos campos.
- Nenhum backend fiscal, banco, migration, regra tributária, snapshot ou comunicação com a SEFAZ foi alterado.

## Paginação compartilhada e busca automática das notas fiscais

### Problema e causa raiz

As listas usavam paginações próprias com botões distribuídos em células flexíveis, que se alargavam desnecessariamente. Na NF de saída, o envio da busca dependia do botão “Buscar”; o termo digitado não era aplicado automaticamente. A quantidade dessa lista deve permanecer fixa em 15 documentos. Na NF de entrada, uma resposta antiga podia substituir a página de um filtro mais recente porque as leituras concorrentes não eram identificadas.

### Solução

O ERP usa `ERPListPagination`, com botões de 34 px, reticências, setas desabilitadas nos limites e adaptação pela largura do contêiner: abaixo de 768 px, duas linhas compactas; a partir de 768 px, uma linha. Onde a quantidade é ajustável, a escolha é validada, reinicia a lista e é guardada no navegador por usuário e módulo. A NF de saída mantém 15 por página e não oferece seletor. A busca da NF de saída usa o resolver Zod após 350 ms sem digitação, aplica termos com pelo menos três caracteres e limpa o filtro quando o termo fica menor; cada mudança efetiva retorna à primeira página. O componente fiscal mantém o estado de carregamento visível e oculta a paginação no resultado vazio.

O painel de NCM usa o mesmo componente, com opções de 15 e 30 registros. Na NF de entrada, cada nova consulta invalida respostas anteriores, inclusive ao mudar o tamanho de página. A lista comercial agrupa as consultas dos selos fiscais em lotes de até 30 IDs ao exibir páginas maiores, respeitando o limite do serviço de selos.

### Arquivos e linhas modificados

| Arquivo | Linhas relevantes nesta revisão |
|---|---:|
| `erp/src/components/shared/ERPListPagination.tsx` | 1–188 |
| `erp/src/components/shared/ERPListPagination.css` | 1–99 |
| `erp/src/components/shared/ERPListPaginationPreferenceContext.ts` | 1–3 |
| `erp/src/Router.tsx` | 4, 191–204, 559 |
| `shared-utils/listingFormSchemas.ts` | 8–25, 61–64 |
| `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsFilterBar.tsx` | 1–24, 158–260 |
| `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsPagination.tsx` | 1–30 |
| `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts` | 6, 34–59, 190–210 |
| `erp/src/pages/App/FiscalDocuments/index.tsx` | 86, 250, 317–323 |
| `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` | 8, 81, 115–118, 179–199, 256–325, 616–631, 832–847, 912, 951–963 |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesPagination.tsx` | 1–38 |
| `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx` | 1, 52–101, 240–250 |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` | 58–64, 135–176, 182, 240, 515–518 |
| `erp/src/pages/App/Finance/Payables/index.tsx` | 6, 27–28, 101–107, 146, 159, 197, 243–244 |
| `erp/src/pages/App/Finance/Receivables/index.tsx` | 6, 27–28, 101–107, 146, 159, 197, 243–244 |
| `erp/src/pages/App/Finance/Transactions/index.tsx` | 12, 31–32, 93–101, 203, 215, 270, 317–318 |
| `erp/src/pages/App/Stock/Purchases/Index.tsx` | 17, 28–29, 56–64, 115–121, 141–152 |
| `erp/src/pages/App/Logistics/AssemblyListPage.tsx` | 10, 24–25, 71, 129, 190–214, 345–355 |
| `erp/src/components/shared/ERPListPagination.test.tsx` | 1–90 |
| `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentsComponents.test.tsx` | 4–84 |
| `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts` | 2–106 |
| `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.pagination.test.tsx` | 1–60 |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryQueryState.test.tsx` | 266–287 |
| `erp/src/pages/App/Finance/FinancePagination.test.tsx` | 1–51 |
| `erp/src/pages/App/Stock/Purchases/PurchasesPagination.test.tsx` | 1–40 |
| `erp/src/pages/App/Logistics/AssemblyListPagination.test.tsx` | 1–35 |
| `docs/estoque/guia-pratico/gerar_guia.py` e `docs/estoque/guia-pratico/README.md` | 628 e 79, respectivamente |
| `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` | página 24, arquivos binários |
| `docs/fiscal/README.md` | 9 |
| `docs/fiscal/historico-correcoes-2026-10-26.md` | esta seção |

### Testes e validações

- Vitest/RTL: 96 testes passaram nas suítes focadas do ERP, cobrindo paginação compartilhada, notas fiscais, NCM, produtos, pedidos, estoque, compras, finanças, montagens, catálogo e agenda. Os testes verificaram debounce, mínimo de caracteres, ausência do botão e do seletor fiscal, mudança de tamanho, retorno à primeira página, lotes de selos e respostas fora de ordem.
- Os dois testes móveis afetados pelo schema compartilhado passaram: 16 casos. São testes de lógica/componente, sem alegação de validação nativa no telefone.
- Playwright, em prévia isolada com os componentes reais: larguras de contêiner de 320, 740, 768 e aproximadamente 881 px; botões de 34 px, sem transbordamento nas larguras medidas; troca de quantidade retorna à primeira página; NF de saída sem seletor e com navegação de 15 em 15. A prévia não valida autenticação nem dados reais.
- `git diff --check` não apontou erros de whitespace nos arquivos conferidos. O typecheck completo permanece com erros fora desta alteração, como a propriedade `pending` duplicada em `api/nfe/consult.ts:123` e o conflito de maiúsculas/minúsculas de `NewSaleOrder` em `erp/src/Router.tsx:57`.
- Não houve alteração de backend fiscal, banco, migration, XML, snapshots ou transmissão à SEFAZ. As provas com mocks não comprovam persistência no banco remoto.
