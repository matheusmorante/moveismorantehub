# Histórico de correções fiscais — 06/11/2026

## Seleção da matriz interestadual extraída da suíte

**Escopo:** extração estrutural de testes da responsabilidade de seleção da matriz fiscal interestadual. Nenhuma regra de produção, decisão fiscal ou contrato foi alterado.

**Solução e preservação:** sete registros de teste contíguos (cinco `it` e dois `it.each`, cobrindo onze cenários) foram movidos para `interstateOutboundFiscalMatrixSelectionCases.ts`. O spec chama o registro no mesmo ponto, dentro do mesmo `describe`, e passa as mesmas factories locais para fatos e regras. O corpo movido coincide integralmente com o baseline (SHA-256 `81907dd4a56c3ef144839a8b14f80db9addb47e3076398329b3ec3e87f18b8a9`). O helper não tem sufixo de descoberta e permanece registrado pelo spec proprietário.

**Arquivos e linhas:** `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrix.test.ts` (863 linhas), `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrixSelectionCases.ts` (187 linhas), inventário, índice fiscal e este histórico. A configuração Vitest do ERP inclui o spec proprietário por `src/**/*.test.{ts,tsx}`.

**Revisão e validação:** posição do registro, imports, tipos, factories e referências das dependências diretas foram conferidos estaticamente. O inventário físico continua com 53 arquivos `.ts`/`.tsx` acima de 500 linhas, sem ausências ou obsoletos; a suíte segue acima do limite e o helper fica abaixo. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve chamada externa, acesso a banco, operação ou emissão fiscal, alteração de XML/snapshot, nem mudança em lógica de produção.


## Verificação PostgREST de filtros de artefatos de teste extraída do runner

**Escopo:** extração estrutural do modo `artifact-reads`, que confirma que consultas PostgREST filtram artefatos de teste. Nenhuma regra de domínio, filtro ou comportamento de acesso remoto foi alterado.

**Solução e preservação:** `testArtifactPostgrestReads` foi movida integralmente para `scripts/testing/fiscal-audit/artifactReads.ts` e exportada para o dispatcher. O corpo coincide com o baseline após reverter apenas a palavra `export` (SHA-256 `8b8156efefc213a75290c52717dedb0341513b079054d14cc47fd2fc908d98a5`). O mesmo ramo `artifact-reads` chama a função uma vez; guardas de projeto/ambiente/credenciais, autenticação, validação de administrador, consultas, filtros, limite, JSON, erros e logout mantêm ordem e conteúdo. O wrapper continua empacotando `fiscal-audit.ts` como entry point.

**Arquivos e locais:** `scripts/testing/fiscal-audit.ts:17,28` (novo import e chamada existentes no mesmo ramo), `scripts/testing/fiscal-audit/artifactReads.ts:1-156` (função extraída), `scripts/testing/run-fiscal-audit.cjs:16` (entry point conferido, sem alteração), `shared-utils/testArtifactQueries.ts` (imports preservados), inventário, índice fiscal e este histórico. O runner ficou com 511 linhas e o helper com 156.

**Revisão e validação:** imports e chamadores, dependências diretas, resposta JSON, guardas e corpo comparados estaticamente. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. O modo não foi executado; não houve chamada remota, autenticação, consulta, escrita ou operação fiscal.

## Identificação do destinatário e presença da operação HML extraídas da suíte de venda normal

**Escopo:** extração estrutural de nove casos de teste que cobrem identificação CPF/CNPJ, exceção de retirada e presença/transporte em NFC-e. Nenhuma regra fiscal ou lógica de produção foi alterada.

**Solução e preservação:** os casos contíguos foram movidos para `hmlRecipientPresenceCases.ts`. A factory `makeFacts`, a ordem dos cenários e o `describe` com seus hooks permanecem no spec proprietário; o helper é chamado no ponto original e recebe a mesma factory. O bloco coincide com o baseline (SHA-256 `753cb6112bceceba6adc32c3bcff7c528655c3c2fc869f6e607f7917c6285e22`).

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts` (947 linhas), `erp/src/pages/utils/nfe/__tests__/hmlRecipientPresenceCases.ts` (287 linhas), inventário, `docs/fiscal/README.md` e este histórico. O helper não tem sufixo de teste, não é descoberto isoladamente e é registrado pelo spec proprietário.

**Revisão e validação:** imports, export e referências foram conferidos estaticamente. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve consulta/escrita de banco, geração/exibição/transmissão de documento fiscal, chamada externa ou mudança de regra de produto.

## Persistência dos rascunhos de emissão extraída da suíte NF-e

**Escopo:** extração estrutural de três casos de teste sobre fila de persistência, validação e descarte/restauração de rascunhos fiscais. Nenhuma lógica de produção, regra fiscal ou contrato foi alterado.

**Solução e preservação:** os três casos contíguos foram movidos para `useNfeEmissionDraftPersistenceCases.ts` e continuam registrados na posição original do mesmo `describe`, sob os mesmos hooks, mocks e fixture. O hook `useNfeEmission` é passado pelo chamador para preservar o grafo de mocks da suíte. O corpo dos casos coincide com o baseline (SHA-256 `3767827696642f0d1d55662b4473d53134baad953dff3cc63679a90a0ffb6333`); o total permanece em 85 ocorrências de `it`/`it.each`.

**Arquivos:** `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx` (2.419 linhas), `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmissionDraftPersistenceCases.ts` (84 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`. A configuração Vitest descobre arquivos `*.test.ts(x)`; o helper não é descoberto separadamente e só é incluído pela suíte proprietária. Nenhum código de produção, schema, migration ou transmissão foi alterado.

**Revisão e validação:** imports, export e chamada do helper foram conferidos estaticamente. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente.

## Resumo do catálogo NCM extraído do painel

**Escopo:** refatoração estrutural da apresentação do catálogo NCM; regras de consulta, sincronização, revisão, permissões e validação não foram alteradas.

**Solução e preservação:** título, descrição, botão de prévia, seis métricas e rótulo da última sincronização foram movidos para `erp/src/pages/App/Settings/components/fiscal/NcmCatalogSummary.tsx`. O painel continua calculando os mesmos dados e rótulos, controlando a permissão administrativa e o estado ocupado, e fornece o callback no mesmo ponto da renderização. `NcmManagementPanel` mantém o export e o caminho consumido por `FiscalSettingsSection.tsx` e pelo teste existente; os tipos de resumo agora são definidos pelo componente interno e usados pelo estado do painel.

**Arquivos e linhas:** `NcmManagementPanel.tsx:10-15,42-46,395-407`; novo `NcmCatalogSummary.tsx:1-89`; `docs/fiscal/README.md`; `docs/auditorias/inventario-arquivos-grandes.md` e este histórico. O painel ficou com 870 linhas. Nenhuma consulta, RPC, schema, permissão, filtro, paginação, conteúdo XML, snapshot, regra tributária, banco ou transmissão fiscal foi alterada.

**Revisão e validação:** a estrutura e a ordem do JSX foram comparadas ao bloco anterior, incluindo os seis valores, fallback de sincronização, condição administrativa e callback. Chamadores e referências aos tipos foram conferidos. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente.

## CSS estático do DANFE NFC-e A4 isolado

**Escopo:** refatoração estrutural do stylesheet de apresentação do DANFE; nenhuma validação, decisão fiscal ou conteúdo do documento foi alterado.

**Solução e preservação:** o CSS estático foi movido de `generateDanfeNfceA4Html` para `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts`. O bloco não tinha interpolação; a comparação textual antes/depois confirmou o mesmo conteúdo, incluindo quebras e regras. O gerador mantém `const css` no ponto original e o mesmo `<style>${css}</style>`. Dados, preflight, paginação, script, HTML dinâmico, funções exportadas pela fachada e o caminho de impressão permanecem iguais.

**Arquivos e linhas:** `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts:2,272` (497 linhas após a extração); novo `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts:1-688`; `erp/src/pages/utils/nfe/danfe/index.ts` e `erp/src/pages/utils/nfe/danfeGenerator.ts` apenas conferidos, sem alterações; inventário, README fiscal e este histórico.

**Revisão e validação:** referências de `generateDanfeNfceA4Html` conferidas em `danfeGenerator.ts`; a fachada continua reexportando o módulo original e não expõe o stylesheet. Nenhum XML, snapshot, banco, serviço fiscal, emissão ou chamada externa foi tocado. Inventário físico reconciliado em 58 arquivos TypeScript acima de 500 linhas. Nenhum teste, build ou typecheck executado; validação dinâmica da saída impressa pendente.

## Controles de período do seletor de recebimento extraídos

**Escopo:** refatoração estrutural dos controles visuais de período das NF-e disponíveis para recebimento; nenhuma regra de seleção ou operação fiscal mudou.

**Solução e preservação:** a apresentação dos filtros de período, mês personalizado e faixa foi extraída para `mobile/src/features/stock/receipts/modals/ReceiptSourceDateFilterControls.tsx`. `ReceiptSourcePicker.tsx` mantém o estado do filtro, as validações e a consulta; os controles continuam condicionados a NF-e, preservam valores, textos, acessibilidade e estilos. Os callbacks mantêm a ordem anterior: redefinir a página e atualizar apenas o campo correspondente. Modais de período e mês continuam no mesmo ponto de renderização e com o mesmo estado. O caminho público e a prop `kind` do seletor não mudaram.

**Arquivos e linhas:** `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx:32,286-300`; novo `mobile/src/features/stock/receipts/modals/ReceiptSourceDateFilterControls.tsx:1-78`; `docs/auditorias/inventario-arquivos-grandes.md`; `docs/fiscal/README.md`; este histórico. ERP, APIs, consultas, schemas, contratos, XML e banco não foram alterados.

**Revisão e validação:** o JSX anterior foi comparado ao componente e aos callbacks após a extração; `NewGoodsReceiptModal.tsx` segue importando e renderizando `ReceiptSourcePicker` pelo caminho original. Nenhum passo operacional do estoque foi alterado, portanto os PDFs do guia prático não precisaram de atualização. Inventário físico reconciliado em 58 arquivos TypeScript acima de 500 linhas. Nenhum teste, build ou typecheck executado; validação dinâmica pendente.

## Derivação dos sinais fiscais extraída da apresentação

**Escopo:** refatoração estrutural, sem mudança de regra ou de resultado fiscal. A fachada de apresentação reunia a leitura do código API, do código de transporte e do cStat junto à classificação visual.

**Solução e preservação:** as três funções puras foram movidas para `erp/src/pages/utils/nfe/fiscalIssueSignals.ts`. `getFiscalIssuePresentation` continua chamando os mapeamentos na mesma ordem, com as mesmas prioridades de fallback e a mesma expressão para extrair cStat da mensagem SEFAZ. Exports públicos e chamadores permanecem no caminho original. Não houve chamada a serviço fiscal, emissão, alteração de XML, snapshot, banco ou transmissão.

**Arquivos:** `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts` (494 linhas após a extração), `erp/src/pages/utils/nfe/fiscalIssueSignals.ts` (16 linhas), `docs/auditorias/inventario-arquivos-grandes.md` e este índice/histórico.

**Revisão e validação:** comparação estática do bloco movido, referências/imports e exports da fachada; inventário físico reconciliado em 59 arquivos TypeScript acima de 500 linhas. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente.

## SCE-013 — Interromper características de uma seleção inválida no cadastro rápido

**Autorização:** aceite “pode implentar todos”, no chat da auditoria de consumo. Implementação local; publicação e validação funcional pendentes.

**Problema e causa comprovada:** ao cadastrar uma variação pela Nota Fiscal de Entrada ou pelo Recebimento por NF, o efeito de `QuickRegisterVariationModal` consultava o produto pai e seguia para as características mesmo se a consulta falhasse. Ao fechar o modal ou trocar o pai durante a espera, a marca de seleção obsoleta só impedia mudanças no estado; a segunda busca ainda começava. Uma falha também podia ser substituída por mensagem de erro de características, menos específica.

**Arquivo alterado:** `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:188`. No tratamento da falha do pai, liberar o indicador técnico da seleção vigente e retornar; o `finally` existente libera o indicador do pai. Antes de iniciar a consulta de características, exigir seleção ainda vigente e componente ativo. Não modificar indicadores de uma seleção posterior nem cancelar requisições que já foram enviadas.

**Consumidores conferidos:** `InboundInvoiceItemsReview` e `Receipts/components/InboundNfeItemsSection` usam o mesmo modal. A contraparte mobile `useInboundQuickRegistration` abre o formulário com o pai já disponível e não usa essa sequência; não recebeu mudança equivalente artificial. O carregador técnico do app tem sua otimização própria SCE-008, separada deste problema.

**Preservação do contrato:** mantidos produto pai ativo e não excluído, tipo produto, rejeição de variação como pai, categorias do pai, validações finais, limites de 15 segundos e mensagens reais de falha. Nenhuma alteração de XML, snapshot, NCM, unidade, cálculos, conciliação, banco ou transmissão fiscal. Foram consultados índice fiscal, invariantes e históricos/revisão vigentes pertinentes. Não houve mudança da operação do estoquista; o guia prático não exige atualização.

**Efeito esperado:** para N continuações inválidas, N invocações da busca técnica deixam de ocorrer. Quantas chamadas remotas isso evita depende do cache e da deduplicação já existentes no serviço. Frequência real, bytes/egress faturável e carga/latência do banco não foram medidos. Não atribuir o incidente remoto de `category_attributes` a esse modal sem evidência de uso e janela.

**Validações:** revisão estática da sequência válida, falha/timeout, fechamento e troca de seleção; TypeScript amplo do ERP sem diagnóstico neste modal. A checagem ampla continua com erros em outros trechos e não passou globalmente. Nenhum teste adicionado ou executado, conforme a guarda da auditoria. Ainda validar em uso a seleção válida, pai indisponível, fechamento/troca durante a espera e conclusão do cadastro. Não houve acesso a dados operacionais, fixtures, migration, commit, deploy ou OTA.

**Rollback:** reverter somente o hunk desta SCE no modal. Não há dados ou schema a desfazer. Registro completo do lote e das limitações no [roadmap de consumo](../auditorias/roadmap-otimizacao-consumo-supabase.md).

## Descontos de campanha informativos, sem alterar preço do produto ou do pedido

**Problema e causa:** o percentual de campanha era tratado como um desconto sucessivo e convertia-se em preço final na seleção de produtos e no catálogo público. O valor também podia ser salvo no item como `promotionDiscountAmount`. Isso aplicava automaticamente uma condição que depende do atendimento e da elegibilidade do cliente.

**Solução:** o preço do item agora usa somente o preço regular ou o preço promocional salvo no cadastro do produto/variação. ID, nome, percentual e condições da campanha permanecem como informação para o atendente. Ao selecionar o produto, o sistema não grava valor monetário de campanha nem o soma ao desconto do produto; o atendente pode lançar manualmente o desconto no pedido depois de confirmar as condições. Itens já salvos e preços do cadastro não foram regravados.

**Arquivos e linhas:** `erp/src/pages/utils/productPricing.ts:63–90`; `erp/src/pages/App/SalesOrder/hooks/useOrderProductSelection.ts:91,160`; `erp/src/pages/types/items.type.ts:56–62`; `erp/src/pages/App/SalesOrder/components/ProductSearchItem.tsx:54`; `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktopCollapsed.tsx:63`; `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobileCompact.tsx:51`; `erp/src/pages/App/Products/ProductList/components/Card/ProductCard.tsx:101–108`; `erp/src/pages/App/Products/ProductList/components/Card/CardPriceStock.tsx:38`; `erp/src/pages/App/Products/ProductList/components/Variations/ProductCardVariationItem.tsx:84–91,168`; `erp/src/pages/utils/productService/productQueryService.ts:221,260,270`; `erp/src/pages/App/Products/Promotions/PromotionEditor.tsx:260,284–285,311`; `erp/src/pages/App/Products/MetaCatalog/services/metaCatalogDataService.ts:81–121`; `digital-catalog/src/features/products/hooks/useCatalogProductsQuery.ts:165,212–214`; `digital-catalog/src/features/products/hooks/useProductPageDisplayState.ts:49`; `digital-catalog/src/features/products/components/product-card.tsx:62–64,249,267`; `digital-catalog/src/features/products/components/product-grid.tsx:156–166`; `digital-catalog/src/features/products/components/product-page-content.tsx:198`; migration `supabase/migrations/20261106164925_campaign_discounts_informational_only.sql:1–290`.

**Banco e contratos:** a migration foi aplicada ao projeto operacional Supabase `hkoxhourxwlddgsfdgws`, versão remota `20261106164925`. `active_campaign_prices.final_price`, `catalog_current_prices.effective_price` e `search_catalog_with_campaign_prices.final_unit_price` agora refletem o preço cadastrado, incluindo somente eventual promoção fixa do produto. Os JSONs públicos mantêm os metadados da campanha, mas enviam `final_price: null` para compatibilidade com clientes antigos. Views e funções mantêm execução como invoker e os grants/permissões existentes. Não houve DML, alteração de snapshot fiscal, regra tributária, cálculo de imposto, XML ou transmissão SEFAZ.

**Validação e limites:** confirmação do histórico remoto da migration e leitura somente de definições do schema após aplicação verificaram as expressões de preço e `security_invoker=true`/`SECURITY INVOKER`. Advisors de segurança/performance consultados; avisos gerais do projeto não foram atribuídos a esta mudança. Revisão estática e `git diff --check`; nenhum teste foi executado e validação funcional do ERP/catálogo continua pendente. O preço/estoque segue sendo consultado quando usado. O app beta não tem módulo de campanhas; não foi criado um fluxo mobile.

**Rollback:** em caso de decisão futura para mudar a regra, reverter o cliente e aplicar uma migration nova e compatível. Não alterar a migration aplicada nem modificar retroativamente produtos, pedidos ou snapshots.

## Campo de fornecedor do recebimento extraído

**Escopo:** refatoração estrutural da apresentação do formulário mobile de recebimento; nenhum critério de fornecedor, bloqueio, estado fiscal ou operação de estoque foi alterado.

**Solução e preservação:** o rótulo, nome informado, seletor manual, erro de carregamento, indicador de espera e dica de bloqueio foram movidos para `mobile/src/features/stock/receipts/modals/ReceiptSupplierField.tsx`. `NewGoodsReceiptModal.tsx` continua controlando os estados e callbacks, computando as mesmas condições e renderizando o componente na posição anterior. O export do modal e o uso em `ReceiptsScreen.tsx` permanecem no mesmo caminho.

**Arquivos e linhas:** `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx:54,945-972` (1.159 linhas após a extração); novo `ReceiptSupplierField.tsx:1-115`; `docs/auditorias/inventario-arquivos-grandes.md`; este índice/histórico.

**Revisão e validação:** textos, fallbacks, condições do botão, seleção manual, estado expandido, dica acessível, status visual, spinner e exibição condicional do erro foram comparados ao JSX anterior e às props de controle. Nenhuma consulta, RPC, schema, submissão RHF/Zod ou regra fiscal foi alterada. O caminho de NF-e continua exibindo o fornecedor somente para leitura. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. A operação do estoquista não mudou, portanto o guia prático não precisou de atualização.

## Estado dos seletores fiscais extraído da aba do produto

**Escopo:** refatoração estrutural do formulário fiscal mobile; comportamento, permissões e regras de produto permanecem iguais.

**Solução e preservação:** os seis estados locais dos seletores CFOP, CEST, CSOSN/CST, origem, PIS e COFINS, junto do efeito que fecha os seletores conforme permissão e tipo do item, foram movidos para `useProductFiscalPickerState.ts`. `ProductFormFiscalTab` chama o hook no ponto original da sequência de hooks e continua controlando os campos, a consulta de NCM e as atualizações fiscais.

**Arquivos e linhas:** `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:32,66-82` (622 linhas); novo `mobile/src/features/products/modals/tabs/useProductFiscalPickerState.ts:1-49`; `docs/auditorias/inventario-arquivos-grandes.md`; este índice/histórico.

**Revisão e validação:** inicializadores, ordem dos seis estados, setters, ramos de fechamento e dependências do efeito foram comparados ao bloco anterior. O export e os props públicos da aba permanecem iguais; o chamador em `ProductFormScreen.tsx` e o teste de permissões existente continuam importando a fachada. Nenhum fluxo de emissão, consulta, schema ou submissão RHF/Zod foi alterado. Nenhum teste, build ou typecheck executado; validação dinâmica pendente.

## Histórico de emissões separado da aba de documentos vinculados

**Escopo:** refatoração estrutural da apresentação fiscal; nenhuma regra de emissão, seleção, persistência ou consulta foi modificada.

**Solução e preservação:** a seção visual do histórico de emissões do pedido foi movida para `OrderEmissionHistorySection.tsx`. `IssuedFiscalDocumentLinkedTab` continua controlando a condição de exibição, a emissão atual e os callbacks de copiar chave, visualizar XML, imprimir DANFE, baixar XML e selecionar outra emissão.

**Arquivos e linhas:** `erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx:14,116` (420 linhas); novo `erp/src/pages/App/FiscalDocuments/components/tabs/OrderEmissionHistorySection.tsx:1-174`; `docs/fiscal/README.md`; `docs/auditorias/inventario-arquivos-grandes.md`; este índice/histórico.

**Revisão e validação:** a condição `orderEmissions.length > 1`, sequência das emissões, comparação do documento atual, textos, badges, valores, chave, protocolo, datas, ações e ordenação foram comparados ao JSX anterior. O export direto, o reexport em `IssuedFiscalDocumentDetailsTabs.tsx`, as props e o teste existente permanecem no mesmo caminho. Nenhum XML, snapshot, evento, schema, banco, transmissão SEFAZ ou regra de produto foi alterado. Nenhum teste, build ou typecheck executado; validação dinâmica pendente.

## Auditoria do snapshot comercial isolada da auditoria do XML assinado

**Problema e causa:** o módulo combinava a conferência do documento comercial resolvido com a verificação do XML assinado; cada etapa constitui uma responsabilidade independente dentro da mesma fronteira de auditoria.

**Solução e preservação:** `assertFiscalDocumentMatchesCommercialSnapshot` foi movida para `fiscalCommercialSnapshotAudit.ts`. O tipo `FiscalXmlAuditMismatch`, a classe `FiscalXmlAuditError` e os comparadores de texto/número ficaram em `fiscalXmlAuditHelpers.ts`. `fiscalXmlAudit.ts` conserva os exports públicos e continua executando a comparação comercial primeiro, seguida pela validação XMLDSig e pela comparação do XML assinado.

**Arquivos e linhas:** `api/nfe/fiscalXmlAudit.ts` (imports/exports atuais nas linhas 1–10 e 35–39; blocos removidos do baseline nas linhas 7–15, 34–52, 56–110 e 310–468); `api/nfe/fiscalCommercialSnapshotAudit.ts:1–183`; `api/nfe/fiscalXmlAuditHelpers.ts:1–67`; `docs/fiscal/README.md:8`; este histórico:105–113; inventário:6–7 e remoção da antiga entrada da linha 530. Chamadores revisados e sem alterações: `api/nfe/emitNormalSale.ts`, `api/nfe/orderEditFiscalAudit.ts`, `api/nfe/normal-sale/normalSalePreparation.ts`, `api/nfe/normal-sale/outboundTransmission.ts` e `api/nfe/operation-draft/draftXmlAudit.ts`.

**Revisão e validação:** o bloco movido foi comparado ao baseline e ficou idêntico após normalizar finais de linha. Identidade da classe de erro e do tipo, mensagem, regras, sequência das verificações, exports e importadores foram conferidos estaticamente. Nenhum schema, snapshot persistido, XML, emissão, transmissão, chamada externa ou regra fiscal mudou. Nenhum teste, build ou typecheck executado; validação dinâmica pendente.

## Pedido de reserva do snapshot HML extraído

**Problema e causa:** `emitHmlTechnical.ts` combinava a orquestração da emissão com a escolha entre quatro RPCs e a montagem dos argumentos para a reserva atômica do snapshot. Essa conversão do comando fiscal para o contrato de reserva é uma responsabilidade separável e sem I/O.

**Solução e preservação:** o bloco foi movido para `hml-technical/snapshotReservationRequest.ts`. `emitHmlTechnical` chama o helper no ponto original e entrega o mesmo nome e argumentos a `db.rpc`. Valores, fallbacks, normalização condicional, variantes com número manual e ordem das operações foram preservados.

**Arquivos e linhas:** `api/nfe/emitHmlTechnical.ts:33,235–241` (480 linhas; bloco removido do baseline:234–268); novo `api/nfe/hml-technical/snapshotReservationRequest.ts:1–54`; `docs/fiscal/README.md:8`; este histórico:115–123; inventário:6–7 e remoção da entrada antiga da linha 547. Chamadores revisados e inalterados: `api/nfe/emit.ts`, `api/nfe/consult.ts`, `api/nfe/abandon-hml-attempt.ts`, `api/nfe/normal-sale/normalEmissionDispatcher.ts`, `erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmission.test.ts` e `erp/src/pages/utils/nfe/__tests__/hmlConsultBoundary.test.ts`.

**Revisão e validação:** o mapeamento foi comparado linha a linha ao bloco original, normalizando apenas o alias `preflight.document` recebido como parâmetro. Nomes de RPC, argumentos, posição antes da chamada ao banco, export e importadores foram conferidos estaticamente. Nenhum número foi reservado e não houve leitura/escrita de banco, chamada externa ou transmissão à SEFAZ. Nenhum teste, build ou typecheck executado; validação dinâmica pendente.

## Diagnóstico de candidatos CFOP isolado do resolver

**Problema observado e causa:** `resolver.ts` acumulava a seleção de regras da matriz interestadual com a montagem do contexto e dos conflitos explicativos usados para avaliar candidatos CFOP. A classificação depende do resultado da matriz, dos fatos, das regras e do catálogo CFOP, formando uma responsabilidade separável da decisão da matriz.

**Solução e preservação:** o cálculo e os tipos do diagnóstico foram extraídos para `api/nfe/interstate-outbound-fiscal-matrix/cfopCandidateDiagnostic.ts`. O export `diagnoseInterstateOutboundCfopCandidate` continua em `resolver.ts` como fachada: resolve a matriz no mesmo ponto, preserva os defaults e o fallback `resolution || resolve(...)`, e passa o mesmo resolvedor de papel ST ao helper. Catálogo, regras, conflitos, contexto, mensagens e ordem do retorno não mudaram.

**Arquivos e linhas:** `api/nfe/interstate-outbound-fiscal-matrix/resolver.ts:1–35,411–432` (432 linhas; bloco de implementação removido do baseline:411–643); novo `api/nfe/interstate-outbound-fiscal-matrix/cfopCandidateDiagnostic.ts:1–261`; `api/nfe/interstate-outbound-fiscal-matrix/index.ts` e `api/nfe/interstateOutboundFiscalMatrix.ts` (barrels inalterados); `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/domain/itemFiscalCfopOptions.ts` (consumidor inalterado); `docs/auditorias/inventario-arquivos-grandes.md` (resumo e remoção da linha do resolver); este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** o corpo de classificação extraído foi comparado ao baseline e resultou em 7.653 caracteres idênticos após normalizar somente a referência ao callback injetado `resolveStRole`. A fachada preserva a ordem de leitura dos parâmetros, valores padrão, resolução opcional e exports antigos; os imports do consumidor e o caminho dos barrels foram conferidos. Nenhum teste, build ou typecheck foi executado conforme a instrução desta automação; validação dinâmica pendente. Não houve leitura/escrita de banco, chamada externa, reserva fiscal ou transmissão à SEFAZ.

## Validação do XML revisado de devolução extraída da rota

**Problema e causa:** `transmit-operation-draft.ts` concentrava a conferência do XML revisado de devolução junto da orquestração de acesso, preparação e transmissão. A validação dos blocos estruturais, da compatibilidade do CFOP e da correspondência entre quantidade, produto e tributos da linha é uma responsabilidade pura que pode ser isolada sem mudar a elegibilidade ou o fluxo da rota.

**Solução e preservação:** a lógica passou para `validateReturnDraftReview` em `api/nfe/operation-draft/draftValidation.ts`. O handler continua verificando os vínculos e o cenário aprovado antes de chamar a função; em seguida converte o primeiro erro para a mesma resposta HTTP 409 `{ success: false, error }`. A rota mantém seu export default e os mesmos consumidores.

**Arquivos e linhas:** `api/nfe/transmit-operation-draft.ts:49,401–412` (786 linhas); `api/nfe/operation-draft/draftValidation.ts:359–423` (423 linhas no módulo); `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts:732–797` (casos existentes de transporte, pagamento e CFOP, não executados); `docs/fiscal/README.md` (Referências atuais); inventário de arquivos grandes; este histórico. Também foram conferidos o dispatcher ERP `api/nfe/operations.ts`, `api/nfe/automaticReturnFiscalWorker.ts`, `erp/src/pages/App/FiscalDocuments/services/fiscalOperationDraftService.ts` e a validação de rascunhos em `api/nfe/operation-drafts.ts`; nenhum contrato de chamador mudou.

**Revisão e validação:** expressões e ordem da validação foram comparadas estaticamente com o bloco do baseline, normalizando apenas o XML fonte recebido como argumento, a conversão de erros internos em HTTP 409 e a formatação; os blocos canonizados ficaram idênticos. As quatro mensagens e a regra de primeira falha permanecem iguais; o novo helper não faz I/O. A varredura física reconciliou 53 arquivos `.ts`/`.tsx` acima de 500 linhas com 53 entradas no inventário e sem divergência de contagem. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Nenhum acesso a banco, chamada externa, reserva/transmissão SEFAZ, emissão ou mudança de regra fiscal foi realizado.

## Validação do XML imutável de retry extraída

**Problema e causa:** `api/nfe/emit.ts` concentrava a validação do XML persistido de retry dentro da orquestração da retransmissão. CSRT obrigatório, identidade do envelope e XSD formam uma unidade de validação do documento armazenado e precisam continuar completos antes de reativar o registro.

**Solução e preservação:** essas verificações foram extraídas para `validateStoredRetryDocumentXml` em `api/nfe/normal-sale/retryXmlValidation.ts`. O endpoint fornece os mesmos valores convertidos do documento persistido, mantém os mesmos dois bloqueios HTTP 409 e só segue para certificado e reativação depois que CSRT, envelope e schema passam. A exceção do XSD continua chegando ao mesmo `catch` da rota; seu export default, payloads públicos e transmissão não mudaram.

**Arquivos e linhas:** `api/nfe/emit.ts:21,390–402` (661 linhas); novo `api/nfe/normal-sale/retryXmlValidation.ts:1–33`; `erp/src/pages/utils/nfe/__tests__/fiscalEmissionApi.test.ts:332–425` (casos existentes de metadados do retry e bloqueio XSD, não executados); chamadores `erp/src/pages/utils/nfe/services/nfeRetryDispatcher.ts:38`, `erp/src/pages/utils/nfe/services/nfeOrderEmissionDispatcher.ts:187,385` e `erp/src/pages/App/FiscalDocuments/services/fiscalSefazService.ts:35`; `docs/fiscal/README.md` (Referências atuais); inventário; este histórico.

**Revisão e validação:** predicado de CSRT, conversões dos campos do documento, argumentos e casts do envelope, mensagens, execução do XSD e posição antes do compare-and-set foram conferidos contra o baseline. A ordem CSRT → envelope → XSD → reativação permanece. O schema continua sendo validado localmente pelo pacote fixado, sem chamada de rede. Inventário físico reconciliado em 53 arquivos `.ts`/`.tsx` acima de 500 linhas, com 53 linhas de catálogo e sem divergências. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Nenhum documento foi reservado/reativado, nenhuma consulta/escrita ao banco, transmissão SEFAZ, chamada externa ou emissão foi realizada.

## Projeção da resposta de status do sincronizador extraída

**Problema e causa:** `supabase/functions/sefaz-inbound-sync/index.ts` mantinha junto ao entry point o cálculo de cooldown e a composição dos campos retornados pela ação `status`. Essa projeção é uma transformação pura da linha já consultada, separável da coordenação das consultas e da sincronização.

**Solução e preservação:** o cálculo e o payload passaram para `buildSyncStatusData` em `supabase/functions/sefaz-inbound-sync/utils/syncStatusPayload.ts`. O handler ainda executa a mesma consulta no mesmo ponto, captura `Date.now()` após a leitura e envolve o mesmo objeto em `{ success: true, data }` com status 200 e os mesmos cabeçalhos. A fórmula, duração de uma hora, condição de sincronização ativa, condição de rate limit, nomes de campos, `||` fallbacks e conversão de data foram movidos sem alteração. O default handler e as chamadas de sincronização/recuperação permanecem iguais.

**Arquivos e linhas:** `supabase/functions/sefaz-inbound-sync/index.ts:8,37-50` (515 linhas); novo `supabase/functions/sefaz-inbound-sync/utils/syncStatusPayload.ts:1-42`; `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts` e `mobile/src/services/stock/stockSefazService.ts` (consumidores revisados; status é consultado diretamente e os triggers continuam chamando o mesmo entry point); `docs/fiscal/README.md` (Referências atuais); inventário de arquivos grandes; este histórico.

**Revisão e validação:** as expressões e os campos foram comparados ao bloco anterior; a consulta Supabase, sua projeção, ordem, momento de captura do relógio, resposta HTTP e payload externo não mudaram. A extração não faz I/O nem modifica o tipo ou os dados persistidos. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Nenhuma consulta/escrita de banco, chamada SEFAZ/externa, migration, emissão fiscal ou mudança operacional foi realizada.
