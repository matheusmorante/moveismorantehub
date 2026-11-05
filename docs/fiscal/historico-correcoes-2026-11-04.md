# Histórico de correções fiscais — 04/11/2026

## Resumos comerciais separados dos snapshots completos de pedidos

**Problema e causa comprovada.** Os IDs da página já eram selecionados no servidor, mas a leitura ainda transferia `order_data`, itens JSON, itens normalizados e seus snapshots fiscais juntos. Uma mesma página de 15 IDs ocupou 123.413 bytes na projeção anterior e 66.816 bytes no resumo, em comparação pela sessão do operador com Playwright.

**Solução.** `read_order_summaries` é somente leitura, `SECURITY INVOKER`, sem execução por `anon`. Mantém os dados operacionais e pagamentos normalizados; evita duplicar itens e transportar geometria de rota e snapshots fiscais dos itens na listagem. ERP e app hidratam o registro completo por ID antes de detalhes, edição ou ações. A gravação rejeita um objeto marcado como resumo. O mapper não registra resumos no WeakMap de snapshots persistidos. Os resumos mobile usam conjuntos separados dos snapshots offline completos e preservam alterações locais pendentes. Para manter operações offline, o app também atualiza os snapshots completos ausentes ou com versão/data alterada dos IDs selecionados, sem repetir esse download quando já estão atuais. Na checagem de estoque, os itens são recompostos a partir do detalhe completo antes de alterar as marcações.

**Arquivos e pontos alterados.** `supabase/migrations/20261105002327_order_read_summaries.sql:3`; `supabase/migrations/20261105004008_order_summary_payment_projection.sql:3`; `shared-utils/orderSummaryQuery.ts:1`; `shared-utils/orderScheduleServerQuery.ts:1`; `erp/src/pages/types/order.type.ts:23`; `erp/src/pages/utils/orderMapper/mapOrderFromDatabase.ts:123`; `erp/src/pages/utils/orderDetailsLoader.ts:1`; `erp/src/pages/utils/orderSearchQueries.ts:216`; `erp/src/pages/utils/orderMutationService.ts:17`; `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:23`; `erp/src/pages/utils/orderSyncQueries/scheduledOrdersQuery.ts:14`; `erp/src/pages/App/SalesOrder/OrderHistoryList/index.tsx:150`; `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:253`; `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts:334`; `erp/src/pages/App/SalesOrder/modals/OrderSelectionModal.tsx:289`; `erp/src/pages/App/SalesOrder/Assistance/hooks/useAssistanceOrderForm.ts:102`; `erp/src/pages/App/DeliverySchedule/OrderDetailsModal.tsx:209`; `erp/src/pages/App/Logistics/services/assemblyOrderListService.ts:6`; `mobile/src/features/orders/services/mobileOrderListService.ts:315`; `mobile/src/features/orders/hooks/useMobileOrders.ts:23`; `mobile/src/features/logistics/hooks/useScopedOrderSchedule.ts:1`; `mobile/src/services/offline/orderSnapshotCache.ts:1`; `mobile/src/services/orderDetailsReadService.ts:1`; `mobile/src/components/modals/order-details/useOrderDetailsModal.ts:51`; `mobile/src/components/modals/OrderDetailsModal.tsx:54`; `mobile/src/navigation/MainNavigator.tsx:107`. Testes específicos em `erp/src/pages/utils/__tests__/orderDetailsLoader.test.ts:1` e `mobile/src/services/offline/orderSnapshotCache.test.ts:1`, além dos consumidores descritos no relatório.

**Validação.** Migrations aplicadas no projeto operacional existente; ACL e modo invoker conferidos. Playwright abriu lista e detalhe completo; a comparação dos mesmos 15 IDs não encontrou divergência em cliente, status, descrição/quantidade dos itens, total ou valor pago. Confirmou ausência de snapshot fiscal no resumo e presença no objeto completo. Testes focados cobrem carregamento por ID, recusa de respostas inválidas, pagamentos, estoque, leitura offline e mudanças pendentes; 146 testes ERP e 14 mobile passaram. Build ERP e typecheck do catálogo passaram. Os typechecks globais de ERP/app continuam com erros preexistentes fora do escopo; não se declara validação global. Ver [relatório completo e limites](../auditorias/egress-cargas-compactas-2026-11-04.md).

**Limites.** Nenhum pedido real foi alterado, nenhuma fixture foi criada, nenhuma emissão/cancelamento/estorno foi executado, sem SEFAZ, deploy ou OTA. Leituras e mocks não certificam transações graváveis, concorrência nem operações fiscais reais.

## Consultas de pedidos filtradas antes da paginação

**Problema e causa comprovada.** A lista comercial do ERP retirava o filtro de cliente da consulta e carregava lotes de até 1.000 candidatos para selecionar a página no navegador. O app e leitores relacionados também descartavam candidatos depois de um limite/amostra, causando transferência desnecessária e cobertura incompleta. A leitura dos selos fiscais acompanhava o conjunto entregue à lista.

**Solução.** A seleção, ordenação, contagem e soma comerciais passaram à RPC `list_order_page_ids`, com no máximo 15 IDs. Os dados e selos fiscais são consultados somente para esses pedidos. Agendas, montagens, impressão, seletor do atendimento, histórico de contato, pesquisa do assistente e contagem de rascunhos recebem critérios no servidor. No app sem rede, mantém-se a consulta ao cache, explicitamente escolhida pelo operador, com indicação local e nova consulta quando reconectar. A gravação do cache preserva alterações pendentes.

**Arquivos e linhas.** `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:38,126`; `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:12,52`; `scheduledOrdersQuery.ts:9`; `erp/src/pages/utils/orderSearchQueries.ts:135,189`; `shared-utils/orderListServerQuery.ts:11`; `shared-utils/orderScheduleServerQuery.ts:6,23`; `mobile/src/features/orders/services/mobileOrderListService.ts:282,322`; `mobile/src/features/orders/hooks/useMobileOrders.ts:23`. A relação completa dos demais consumidores, testes e dos oito arquivos SQL aplicados, com pontos de alteração, está no [registro de implementação e evidências](../auditorias/pedidos-filtros-servidor-2026-11-04.md#arquivos-e-pontos-de-alteração). Regra permanente em `AGENTS.md:211`.

**Banco e integridade.** Migrations compatíveis aplicadas no projeto operacional `hkoxhourxwlddgsfdgws`, somente em `public`, após revisão do SQL, colunas, assinaturas e histórico. RPCs de listas com `SECURITY INVOKER`, `search_path` vazio, RLS existente e execução autenticada; a RPC do atendimento conserva o guard comercial anterior. Grants `anon` herdados dos defaults do Supabase foram revogados explicitamente e reconferidos. Nenhum snapshot, estado fiscal, XML, numeração ou regra de emissão/cancelamento foi alterado. Nenhum evento ou dado operacional foi escrito pelas verificações.

**Validação.** 112 testes Vitest/RTL do ERP e 15 do app passaram. Playwright em Chrome visível autenticado comprovou busca de 5 pedidos e página de 15, sem leitura global de candidatos nessas ações; agendas e busca de montagens retornaram somente seus escopos. A função de datas no PostgreSQL coincidiu com o helper do ERP em 35 pedidos e em 7 casos adicionais de argumentos somente leitura. Build final do ERP passou. O typecheck global contém erros fora do escopo; não representa aprovação global do repositório. UI Android em telefone físico e publicação OTA não foram executadas.


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

## Critérios de elegibilidade da NF-e para recebimento isolados

**Causa.** `ReceiptSourcePicker.tsx` mantinha os predicados puros que verificam a aptidão de uma NF-e para recebimento e identificam XML incompleto junto à apresentação e orquestração da lista. A extração reorganiza a responsabilidade sem alterar as regras vigentes de recebimento.

**Solução.** `invoiceReason` e `isInvoiceXmlIncomplete` foram movidos para `receiptInvoiceEligibility.ts`. A forma dos itens, a ordem das verificações, as mensagens, os usos no seletor e o comportamento de seleção permanecem iguais.

**Arquivos e linhas.** `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx:32,251,254,455,461`; novo `mobile/src/features/stock/receipts/modals/receiptInvoiceEligibility.ts:1-16`; `docs/auditorias/inventario-arquivos-grandes.md`; índice fiscal em `docs/fiscal/README.md`.

**Revisão estática.** Os dois corpos extraídos foram comparados ao baseline após remover apenas o modificador `export` e normalizar finais de linha: 505 caracteres idênticos. Chamador público em `NewGoodsReceiptModal.tsx`, tipos e referências foram conferidos. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta externa, leitura/gravação de banco, transmissão ou operação fiscal foi realizada.

## Exemplos internos ampliados nos NCMs ativos

**Problema e causa comprovada.** A consulta ao catálogo operacional encontrou 21 NCMs habilitados e vigentes, com 173 aliases ativos. O `94035000`, de móveis de madeira para quartos de dormir, não tinha beliche, treliche, bicama nem berço como exemplos internos. Além das lacunas de conteúdo, os serviços do ERP e do app limitavam a descrição interna a três categorias de exemplos, e os resultados dos dois seletores do ERP cortavam o texto após duas linhas.

**Solução e alcance.** Foram acrescentados 105 aliases aos 21 códigos já habilitados. Entre os novos exemplos estão beliches de madeira em `94035000`, beliches de metal em `94032090`, paneleiros e cozinhas moduladas de madeira, gaveteiros de escritório, móveis de plástico, partes próprias de móveis e variantes de colchões. O beliche de madeira tem prioridade na descrição interna do seu código. Os dois clientes passam a resumir até oito categorias distintas de exemplos, preservando a prioridade do termo pesquisado; os resultados do ERP permitem a leitura do texto completo. Todos os aliases ativos continuam pesquisáveis, inclusive os que excedem os oito exemplos do resumo.

A revisão das descrições também corrigiu cinco aliases antigos. `colcha acolchoada`, `edredom`, `edredom de cama` e `manta acolchoada` foram desativados em `94049000`, pois a abertura atual `94044000` abrange colchas e edredões. O termo genérico `base box` foi desativado em `94041000` e substituído por exemplos qualificados: estrutura rígida de madeira em `94035000` e somiê com molas em `94041000`. Esses registros foram preservados como inativos. Nenhum NCM foi ativado ou desativado nesta revisão; o `94044000` continua fora do conjunto habilitado pela loja.

**Arquivos e linhas modificados.**

- `supabase/migrations/20261104202304_expand_active_ncm_internal_examples.sql:6`: confere e trava brevemente os 21 códigos esperados, suas descrições oficiais e vigência antes da escrita; `:55` registra os 105 exemplos sem duplicar ou sobrescrever aliases existentes; `:115` inclui o beliche de madeira; `:173` e `:180` desativam somente os cinco termos especificados acima.
- `erp/src/services/fiscal/ncmService.ts:66` e `mobile/src/features/products/services/mobileProductFiscalService.ts:64`: ampliam de três para oito exemplos na consulta por código e na pesquisa de NCM.
- `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:331` e `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.tsx:261`: permitem a quebra normal do texto dos resultados em lugar do corte em duas linhas.
- `docs/fiscal/README.md:9`: referência desta revisão; este histórico registra causas, aplicação e evidências.

**Aplicação e preservação.** Migration de conteúdo aplicada ao projeto operacional MoranteHub (`hkoxhourxwlddgsfdgws`), schema `public`, com a versão remota `20261104202304` conferida no histórico. A escrita foi restrita a `public.ncm_aliases`. A leitura posterior confirmou os 105 termos novos ativos, os cinco termos antigos inativos e 273 aliases ativos nos mesmos 21 NCMs. A comparação com a leitura anterior confirmou as descrições oficiais, `active`, `is_active` e datas de vigência intactas. Produtos, enquadramentos já gravados, tributos, documentos fiscais e snapshots não foram regravados. O conteúdo é idempotente; eventual reversão deve ocorrer em nova migration restrita aos termos explicitamente listados, preservando o histórico aplicado.

**Fontes oficiais consultadas em 04/11/2026.** [TIPI vigente da Receita Federal](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/legislacao/documentos-e-arquivos/tipi.pdf), atualizada até o ADE RFB nº 1/2026: posições 68.10 e 73.24 e capítulo 94, especialmente as distinções entre assentos, móveis por material/uso, partes, somiês, colchões e a abertura `94044000`. A [RC SEFAZ-SP 28973/2023](https://legislacao.fazenda.sp.gov.br/Paginas/RC28973_2023.aspx), itens 7 e 9.1, reproduz o alcance dos somiês nas NESH e cita a Solução de Consulta COSIT nº 98.279/2020 para a cama box de madeira com estrado rígido. Os novos nomes são vocabulário interno exemplificativo compatível com esses escopos, não substituições da descrição oficial.

**Validações e limites.**

| Verificação | Resultado | Camada e limite |
|---|---|---|
| Serviço e seletores NCM do ERP | 16 testes existentes aprovados em três arquivos (`ncmService`, `ProductNcmSelector`, `NcmSelect`) | Vitest/RTL com serviços simulados; não prova interface nativa nem persistência |
| Estado após a atualização | 105 novos aliases ativos, cinco antigos inativos, 21 códigos preservados | Leitura do Supabase operacional; escrita de conteúdo solicitada, sem fixtures ou DML de teste |
| Busca real `public.search_ncms` | 29 conferências aprovadas | Um exemplo de cada código, beliche de madeira/metal, ordem livre, caixa/acentos, bases rígidas/elásticas e ausência de edredom no `94049000`; consultas somente leitura |
| Paridade da descrição interna | Serviços e consumidores reais do ERP e app revisados | Ambos usam os mesmos aliases remotos e o limite de oito; não houve teste no Android físico |

A mudança no app está no código local; nenhuma OTA foi publicada nesta tarefa. A revisão altera o vocabulário e a apresentação do catálogo fiscal, sem mudar passos de operação do Estoque; o guia prático não precisou de revisão.

## Mapeamento dos custos dos itens de recebimento centralizado

**Causa.** A criação e a edição de recebimentos mobile construíam separadamente o mesmo `p_items` para as RPCs transacionais, incluindo a cópia dos itens e os mesmos fallbacks numéricos dos custos. Não havia falha operacional reportada; a responsabilidade de mapear os itens estava duplicada no serviço.

**Solução.** `mapGoodsReceiptItemsForRpc` foi extraída para `goodsReceiptItemPayload.ts` e é usada nos dois caminhos. A cópia dos campos e os seis fallbacks `valor || 0` mantêm a ordem e a semântica originais; cabeçalhos, status, RPCs, timeouts, reconciliação, erros e contratos não mudaram.

**Arquivos e linhas.** `mobile/src/services/stock/stockReceiptsService.ts:14,220,295`; novo `mobile/src/services/stock/goodsReceiptItemPayload.ts:1-21`; `docs/auditorias/inventario-arquivos-grandes.md`; índice fiscal em `docs/fiscal/README.md`.

**Revisão estática.** Os dois mapeamentos de origem foram comparados ao helper, incluindo spread, nomes e ordem das seis propriedades normalizadas. A API usada por `NewGoodsReceiptModal.tsx`, os exports pelos barrels de estoque e os cenários existentes de `stockReceiptCreation.test.ts` foram conferidos; nenhum chamador foi alterado. A extração não muda os passos do estoquista, então o guia prático permanece aplicável. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta/gravação no banco, migration, transmissão fiscal, publicação OTA ou commit foi realizada.

## Prévia de sincronização do catálogo NCM extraída

**Causa.** `NcmManagementPanel.tsx` combinava a coordenação dos dados e ações da tabela NCM com um bloco extenso que apresentava a prévia da sincronização oficial e a lista paginada de mudanças.

**Solução.** O bloco visual foi movido para `NcmManagementSyncPreview.tsx`. O painel continua proprietário das consultas, estado, validação e callbacks; o componente recebe dados e handlers explícitos. Os tipos locais da prévia foram movidos junto ao componente. O export nomeado do painel e seus chamadores não mudaram.

**Arquivos e linhas modificados.** `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:11-12,497-527`; novo `erp/src/pages/App/Settings/components/fiscal/NcmManagementSyncPreview.tsx:1-170`; `docs/fiscal/README.md:10`; `docs/auditorias/inventario-arquivos-grandes.md:5-9,253`. Os chamadores existentes revisados foram `FiscalSettingsSection.tsx:4,495`, `NcmCatalogPage.tsx:1,10` e `NcmManagementPanel.test.tsx:4,19,26,34`.

**Revisão estática.** Textos, ordem dos elementos, condições, classes, fallback da data local, status de carregamento e transformação de páginas foram comparados ao bloco original. A execução das ações continua nos mesmos callbacks do painel; `FiscalSettingsSection.tsx`, `NcmCatalogPage.tsx` e o teste existente continuam importando `NcmManagementPanel` pelo caminho original. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta ou gravação no banco, migration, transmissão fiscal, publicação OTA ou commit foi realizada.

## Helpers de QR Code do DANFE NFC-e extraídos

**Causa.** `danfeNfceA4.ts` reunia a preparação e validação do HTML do DANFE com duas responsabilidades coesas de QR Code: renderizar o SVG e interpretar o payload fiscal da URL de consulta.

**Solução.** `generateQrCodeSvg` e `getQrPayload` foram movidos para `danfeNfceQrCode.ts`. Os mesmos parâmetros do `bwip-js`, a recusa de esquemas diferentes de HTTP(S), a leitura do parâmetro `p`, a normalização da chave e os retornos vazios/nulos em erro foram preservados. Os pontos de chamada no renderizador e a API pública da fachada permanecem inalterados.

**Arquivos e linhas modificados.** `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts:1-8,39-43,127-128`; novo `erp/src/pages/utils/nfe/danfe/danfeNfceQrCode.ts:1-32`; `docs/fiscal/README.md`; `docs/auditorias/inventario-arquivos-grandes.md`. O módulo principal ficou com 1178 linhas e o helper tem 32.

**Revisão estática.** Os corpos dos dois helpers foram comparados à origem; os usos permanecem nos mesmos pontos, e `danfe/index.ts` continua exportando o módulo principal com `export *`. O chamador `danfeGenerator.ts` conserva o import de `getDanfeNfceA4UnavailableReason` e seu caminho. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta ou gravação no banco, migration, transmissão à SEFAZ, publicação OTA ou commit foi realizada.

## Sanitização das mensagens de erro fiscal extraída

**Causa.** `fiscalIssuePresentation.ts` combinava a classificação dos resultados fiscais com a triagem das mensagens destinadas à interface: identificação de códigos técnicos e valores sensíveis, bloqueio de combinações interestaduais pendentes e escolha de texto seguro.

**Solução.** As regex `INTERNAL_IDENTIFIER` e `SENSITIVE_VALUE` e as funções `isHmlInterstateMatrixBlock`, `containsTechnicalFiscalIdentifier` e `safeFiscalIssueMessage` foram movidas para `fiscalIssueMessageSafety.ts`. A fachada preserva os três exports e continua usando `containsTechnicalFiscalIdentifier` durante a leitura do motivo da SEFAZ e `safeFiscalIssueMessage` na mesma classificação. Predicados, ordem, fallback e textos não mudaram.

**Arquivos e linhas modificados.** `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts:11-20` (import e reexport atuais; bloco movido estava nas linhas 106-135 do baseline); novo `erp/src/pages/utils/nfe/fiscalIssueMessageSafety.ts:1-40`; `docs/fiscal/README.md:11`; esta seção do histórico; `docs/auditorias/inventario-arquivos-grandes.md:6-9,295,938-949`. O módulo principal ficou com 598 linhas e o helper tem 40.

**Revisão estática.** Os corpos das três funções e as duas regex foram comparados exatamente ao baseline. Os chamadores existentes e o teste continuam importando pela fachada `fiscalIssuePresentation.ts`; os exports dos outros tipos, constantes e classificadores permanecem. Os cenários existentes de mensagens técnicas e códigos interestaduais foram inspecionados, mas nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhum dado, schema, migration, transmissão SEFAZ, publicação OTA ou commit foi alterado.

## Cartão de rascunho de estorno fiscal extraído da aba de documentos vinculados

**Causa.** `IssuedFiscalDocumentLinkedTab.tsx` mantinha o JSX do cartão de rascunho de estorno e a tradução de seus status dentro do renderizador das seções de documentos vinculados.

**Solução.** A apresentação foi movida para `EstornoOperationDraftCard.tsx`, que recebe o mesmo `FiscalOperationDraftSummary`. A filtragem por `operation_kind`, a condição de exibição da seção, a ordem dos rascunhos e as ações da aba permanecem no componente proprietário. Não houve mudança em estado fiscal, regras, dados ou persistência.

**Arquivos e linhas modificados.** `erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx:13,377-379`; novo `erp/src/pages/App/FiscalDocuments/components/tabs/EstornoOperationDraftCard.tsx:1-51`; `docs/fiscal/README.md:9`; `docs/auditorias/inventario-arquivos-grandes.md` (resultado, linha do catálogo e reconciliação). O módulo proprietário ficou com 552 linhas.

**Revisão estática.** Foram conferidos o texto do cartão, mapeamento dos status e fallback para valores desconhecidos, formatação de data, distinção Homologação/Produção, condição da motivação, classes e posição na lista. A chave React continua ligada ao mesmo `draft.id`; a assinatura/export da aba e seu uso em `IssuedFiscalDocumentDetailsTabs.tsx` permanecem. O teste existente continua importando a aba pelo mesmo caminho e contém asserções para status e motivação. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhum dado, schema, migration, transmissão SEFAZ, publicação OTA ou commit foi alterado.

## Impressão digital do preview fiscal extraída da auditoria XML

**Causa.** `fiscalXmlAudit.ts` também calculava a impressão digital determinística do preview de emissão, embora essa responsabilidade não dependa da leitura, assinatura ou comparação do XML fiscal.

**Solução.** `fiscalPreviewFingerprint` foi movida sem alterações para `fiscalPreviewFingerprint.ts`. O cálculo continua removendo `capturedAt`, `persistedHash`, `decisionTrace` e `snapshotHash`, serializando os mesmos fatos com `canonicalFiscalCommand` e incluindo o SHA-256 do mesmo XML assinado. A fachada `fiscalXmlAudit.ts` reexporta a função pelo caminho público atual.

**Arquivos e linhas modificados.** `api/nfe/fiscalXmlAudit.ts:1,12,55-78`; novo `api/nfe/fiscalPreviewFingerprint.ts:1-28`; `docs/fiscal/README.md:9`; `docs/auditorias/inventario-arquivos-grandes.md` (resultado e linha do catálogo). A auditoria ficou com 738 linhas.

**Revisão estática.** O corpo completo da função, sua ordem, campos excluídos, identidade, comando canônico e hash do XML foram comparados ao baseline. `normalSalePreparation.ts` e o teste existente continuam importando `fiscalPreviewFingerprint` do caminho original; os exports de assinatura e comparação da auditoria permanecem. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhum snapshot, dado, schema, migration, transmissão SEFAZ, publicação OTA ou commit foi alterado.

## Contratos de tabelas fiscais separados das assinaturas de RPC

**Problema identificado.** O arquivo que define o contrato de banco da API fiscal mantinha mapeamentos de tabelas e contratos de funções RPC dentro do mesmo tipo público.

**Causa raiz técnica.** `FiscalDatabase` cresceu para 512 linhas com duas famílias independentes sob `public`: linhas/operações das tabelas e assinaturas de RPC. A extração deve reduzir a unidade de manutenção sem mudar o tipo usado pelos clientes Supabase.

**Solução técnica.** Os 15 contratos de tabela e o helper genérico `FiscalTable` foram movidos para `fiscalDatabaseTables.ts`. A fachada existente mantém `FiscalDatabase['public']['Tables']` como o mesmo conjunto de propriedades, e suas referências a `FiscalSnapshot` e `FiscalDatabase['public']['Functions']` continuam apontando para os tipos existentes.

**Arquivos e linhas modificados.** `api/nfe/fiscalDatabaseTypes.ts:1,3,5`; novo `api/nfe/fiscalDatabaseTables.ts:1-227`; `docs/fiscal/README.md:3,8`; `docs/auditorias/inventario-arquivos-grandes.md` (resultado da execução e remoção da linha do proprietário, agora com 287 linhas).

**Revisão estática.** As 15 propriedades e seus mapeamentos de `Row`, `Insert`, `Update` e `Relationships` foram comparados ao baseline com normalização apenas de whitespace; o bloco de assinaturas RPC permaneceu idêntico. Os 18 módulos que importam `FiscalDatabase` seguem no mesmo caminho. Os dois novos limites têm 287 e 227 linhas, portanto nenhum permanece no catálogo. Nenhum dado, schema, migration ou comportamento de consulta/persistência foi alterado.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.

## Sondagem WSDL do auditor fiscal extraída

**Problema identificado.** O runner multimodo do auditor fiscal mantinha a consulta de endpoints WSDL e a extração da cadeia TLS ao lado da coordenação dos modos de auditoria.

**Causa raiz técnica.** `chainMetadata` e `wsdl` formam uma unidade de sondagem de conectividade: ambas preparam o agente TLS, consultam um endpoint, coletam os metadados da conexão e encerram o agente. A responsabilidade é invocada somente pelo modo `wsdl`, sem acoplar a seleção/ordem dos serviços ao runner principal.

**Solução técnica.** As duas funções foram movidas para `scripts/testing/fiscal-audit/wsdlDiagnostics.ts`. O script importa `wsdl` pelo novo módulo; preserva validação do modelo, ambiente padrão, lista/ordem dos serviços, formato JSON, timeout e entry point do bundler.

**Arquivos e linhas modificados.** `scripts/testing/fiscal-audit.ts:5-17` (imports e novo import interno; arquivo com 665 linhas; remoções nas posições 27-39 e 195-225 do baseline); novo `scripts/testing/fiscal-audit/wsdlDiagnostics.ts:1-52`; `scripts/testing/run-fiscal-audit.cjs` (entry point conferido, sem alteração); `docs/fiscal/README.md` (Referências atuais); `docs/auditorias/inventario-arquivos-grandes.md` (resultado e catálogo).

**Revisão estática.** `chainMetadata` e `wsdl` coincidem exatamente com o baseline (SHA-256 `A35FCBA896E3A417383725EC388CCEC2B9AE61C869E83AF0918DB1C67C8A986C` e `5EA2136E671EA575D40AC60B632BA380AA7FD2E0B2E4E4E5C72EB12BF7237456`). Foram conferidos o import e o único chamador no ramo `wsdl`, o bundler que continua usando `fiscal-audit.ts` como entry point e todas as referências locais aos helpers; os imports movidos agora apontam aos mesmos módulos fiscais. Nenhum comportamento de consulta, certificado, autorização, transmissão ou persistência foi alterado.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação. O modo `wsdl` não foi invocado; nenhuma consulta externa foi realizada.

## Projeção de alterações fiscais do pedido extraída da auditoria

**Problema identificado.** A projeção dos dados submetidos pelo operador e a detecção de alteração fiscal potencial dividiam o mesmo módulo da comparação detalhada com o snapshot e o XML autorizado.

**Causa raiz técnica.** `projectOrderDataForFiscalEdit` aplica o subconjunto permitido da submissão; `hasPotentialFiscalOrderEdit` compara somente os campos relevantes à emissão. Nenhuma das funções depende da leitura ou da comparação do XML assinado executada pelo restante do módulo.

**Solução técnica.** As duas funções foram movidas sem alterações para `order-edit-audit/fiscalOrderEditProjection.ts`. `orderEditFiscalAudit.ts` reexporta os nomes existentes, preservando os caminhos dos chamadores.

**Arquivos e linhas modificados.** `api/nfe/orderEditFiscalAudit.ts:43-46`; novo `api/nfe/order-edit-audit/fiscalOrderEditProjection.ts:1-103`; `docs/fiscal/README.md:8`; `docs/auditorias/inventario-arquivos-grandes.md` (resultado e remoção da linha do proprietário, agora com 412 linhas).

**Revisão estática.** Os corpos das duas funções foram comparados exatamente ao baseline, incluindo a ordem dos campos projetados, a lista permitida e a serialização usada na comparação. `cancellationPreflight.ts` e `auditAuditAndConfirmAction.ts` continuam importando pela fachada; o teste existente permanece no mesmo caminho. O módulo proprietário ficou com 412 linhas e o novo helper com 103, abaixo do limite do inventário. Nenhuma regra de autorização, snapshot, XML, transmissão ou persistência mudou.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.
## Validações estruturais da matriz interestadual extraídas do resolver

**Problema identificado.** O resolver da matriz interestadual mantinha junto à seleção da regra os predicados de validação de fatos, escopo de fontes normativas e completude do tratamento aprovado.

**Causa raiz técnica.** `requiredFacts`, os comparadores de critérios, a identificação de rota interestadual e a verificação da aprovação formam uma unidade de validação de regras. Ela é consumida pelo resolver, mas não depende do diagnóstico textual de candidatos CFOP nem da orquestração de seleção.

**Solução técnica.** O bloco foi movido para `api/nfe/interstate-outbound-fiscal-matrix/ruleValidation.ts`. `resolver.ts` importa as mesmas funções e a lista de fatos; as APIs de `resolveInterstateOutboundFiscalMatrix`, `hasApprovedInterstateOutboundRoute` e `diagnoseInterstateOutboundCfopCandidate` seguem exportadas pelo resolver e pelo barrel existente.

**Arquivos e linhas modificados.** `api/nfe/interstate-outbound-fiscal-matrix/resolver.ts:13-30` (imports atualizados; o bloco movido ocupava as linhas 25-212 do baseline); novo `api/nfe/interstate-outbound-fiscal-matrix/ruleValidation.ts:1-196`; `docs/fiscal/README.md:8`; `docs/auditorias/inventario-arquivos-grandes.md:5-9,287,295`; este histórico:155-167. O resolver ficou com 643 linhas.

**Revisão estática.** O conteúdo movido (6.930 caracteres) foi comparado ao baseline, mudando somente `const` para exports internos necessários entre módulos. Importadores e barrel foram conferidos; nenhuma condição, ordem, critério, cálculo tributário ou resultado público foi alterado.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.

## Estilos da aba fiscal de produto extraídos

**Causa.** `ProductFormFiscalTab.tsx` mantinha a configuração estática de apresentação do React Native no mesmo módulo que coordena os campos e o estado da aba.

**Solução.** O `StyleSheet.create` foi movido, sem alteração de chaves, valores ou ordem, para `productFormFiscalTab.styles.ts`. O componente importa `styles` do novo módulo e conserva o export e o caminho público originais.

**Arquivos e linhas.** `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:8,31,52`; novo `mobile/src/features/products/modals/tabs/productFormFiscalTab.styles.ts:1-92`; `docs/fiscal/README.md:9`; `docs/auditorias/inventario-arquivos-grandes.md` (resultado e catálogo).

**Revisão estática.** As 2.837 letras do bloco de estilo foram comparadas ao baseline, normalizando somente a declaração para exportar `styles` do módulo interno. A exportação pública `ProductFormFiscalTab` e os chamadores em `ProductFormScreen.tsx` e `ProductFormFiscalTab.permission.test.tsx` permanecem iguais. Nenhum campo, regra fiscal, consulta/autocomplete de NCM, permissão ou ação foi alterado.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.
## Leitura e hidratação de rascunhos fiscais extraídas da rota

**Problema identificado.** A rota `operation-drafts.ts` concentrava a consulta GET do rascunho, reconstrução dos itens de origem e composição do contexto/JSON de revisão junto aos fluxos de gravação e preparação.

**Causa raiz técnica.** A leitura e hidratação formam uma responsabilidade de consulta independente da validação e preparação de POST/PUT; o helper `extractFiscalBlock` é compartilhado pela resposta de leitura e pela preparação existente.

**Solução técnica.** O corpo de leitura (172 linhas) e `extractFiscalBlock` foram extraídos para `api/nfe/operation-draft/readOperationDraft.ts`. A rota conserva o handler default, CORS, autorização, validação do UUID e o `try/catch`; no GET, aguarda e retorna o mesmo resultado do helper dentro do tratamento de erros original.

**Arquivos e linhas modificados.** `api/nfe/operation-drafts.ts:28,63-67` (415 linhas); novo `api/nfe/operation-draft/readOperationDraft.ts:1-208`; `docs/fiscal/README.md` (Referências atuais); `docs/auditorias/inventario-arquivos-grandes.md` (resultado, exclusão do proprietário e reconciliação).

**Revisão estática.** As 172 linhas do corpo extraído foram comparadas com o baseline e resultaram no mesmo SHA-256 (`B01AF8446578F4696088F870090F4C745D00ABDD414C5532E0F52B9773FFA81B`); o corpo de `extractFiscalBlock` também coincide integralmente. Foram conferidos o parser/contrato de `fiscalOperationDraftService.ts`, o consumo de identidade/estado pelo `automaticReturnFiscalWorker.ts`, e o dispatcher `erp/api/nfe/operations.ts`. A resposta e a sequência de consultas permanecem iguais; nenhuma regra de ambiente, autorização, CFOP, snapshot, persistência ou transmissão foi alterada.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.
## Recuperação pontual de NSU extraída do sincronizador

**Problema identificado.** `sefaz-inbound-sync/index.ts` reunia o worker da fila consNSU, a liquidação de claims e a persistência de NF recebida com a orquestração do ciclo distNSU e da consulta direta.

**Causa raiz técnica.** A recuperação pontual tem uma sequência coesa própria: reivindicar um intervalo, reservar a consulta de cinco minutos, consultar um NSU, interpretar a resposta e liquidar a claim. Ela é acionada por dois caminhos do entry point, enquanto a persistência da NF é compartilhada também pelo processamento da distribuição normal.

**Solução técnica.** O worker, sua claim e `persistParsedInvoice` foram movidos para `supabase/functions/sefaz-inbound-sync/utils/nsuRecovery.ts`. O entry point importa os dois helpers; conserva `DIST_NSU_INTERVAL_MS`, a distribuição distNSU, a consulta direta, os pontos de chamada, as respostas e o tratamento externo de erros.

**Arquivos e linhas modificados.** `supabase/functions/sefaz-inbound-sync/index.ts:6-7,14` (534 linhas); novo `supabase/functions/sefaz-inbound-sync/utils/nsuRecovery.ts:1-218`; `docs/fiscal/README.md` (Referências atuais); `docs/auditorias/inventario-arquivos-grandes.md` (resultado e contagem atual).

**Revisão estática.** O bloco extraído de 213 linhas coincide com o baseline após manter `DIST_NSU_INTERVAL_MS` no entry point e exportar apenas `persistParsedInvoice` e `processNextNsuRecovery`; o SHA-256 é `7D8A0092DDB7E9039EB46B6D66FE4B29C06068F8572BD6788D8FB74127E4A97D`. Foram conferidos os dois chamadores de recuperação no próprio entry point, os dois usos da persistência, os clientes ERP/mobile que continuam invocando a mesma Edge Function e seu payload. Não houve alteração de fila, cursores, status, XML, ambiente ou política SEFAZ.

**Validação dinâmica pendente.** Nenhum teste, build ou typecheck foi executado, conforme as instruções da automação.
