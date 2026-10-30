# Histórico de correções fiscais — 29/10/2026

## Rótulo “NF incompleta” e ação “Obter XML” na lista de NF de entrada

### Problema e causa

As notas resumo apareciam com o rótulo “XML incompleto”, e o título do modal dizia “Completar XML da NF-e”. Os textos eram fixos no botão e nos modais do ERP e do app; o próprio botão já encaminhava à importação do XML da nota selecionada.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/SummaryXmlStatusBadge.tsx:7-26` — rótulo vermelho, ação visual em azul e texto acessível; `modals/InboundDocumentImportModal.tsx:94-104` — título do modal.
- App: `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCardContent.tsx:73-98,234-253` — rótulo vermelho, ação visual sublinhada em azul e texto acessível; `modals/invoice-import/InvoiceImportModal.tsx:148-157` — título do modal.
- Índice: `docs/fiscal/README.md:9` — referência vigente.

### Solução implementada

ERP e app exibem “NF incompleta” em vermelho com “Obter XML” em estilo de link azul no mesmo botão. Clicar no rótulo continua abrindo a importação vinculada àquela nota. O título do modal nesse fluxo é “Obter XML da nota fiscal”; os títulos dos fluxos de importação comum não mudaram.

### Testes e validações

- Revisão estática confirmou que os handlers do ERP e do app continuam passando a nota selecionada ao modal de importação do XML.
- O ajuste posterior de cor manteve vermelho no rótulo e azul no link, nos temas claro e escuro.
- Nenhum teste automatizado foi adicionado ou executado. Não houve alteração de dados, XML, vínculo, recebimento, schema, transmissão SEFAZ ou deploy.

## Vínculo de produto da NF de entrada no app

### Problema e sintomas observados

Ao salvar um vínculo de produto no modal **Gerenciar vínculos** do app, a operação falhava com `null value in column "product_description" of relation "inbound_invoice_items" violates not-null constraint`.

### Causa raiz técnica

`updateInboundInvoiceMappings` fazia `upsert` de uma linha parcial contendo somente `invoice_id`, `item_number`, IDs do produto/variação e `raw_item`. A tabela normalizada exige também `product_description`. O importador do mesmo app já possui `buildInboundInvoiceItemRows`, que monta os campos canônicos da linha e usa `Item sem descrição` como fallback; o fluxo de vínculo não reutilizava esse mapeador.

### Arquivos e linhas alterados

- `mobile/src/services/stock/invoices/inboundInvoiceMappingsService.ts:3,109-114` — importa e usa o construtor canônico de linhas para salvar os vínculos.
- `docs/fiscal/README.md:3,10` — atualiza a data de reconciliação e inclui esta referência vigente.
- `docs/fiscal/historico-correcoes-2026-10-29.md:1-26` — registra sintoma, causa, solução e validação.

### Solução implementada

O salvamento dos vínculos agora monta cada linha normalizada por `buildInboundInvoiceItemRows`, preenchendo `product_description` e os demais campos do item junto com `product_id` e `variation_id`. O vínculo continua preservado em `inbound_invoices.itens` e em `raw_item`; não foi alterado o XML, a entrada de estoque ou a regra fiscal.

### Testes e validações

- Revisão estática comparou o payload que falhava com o mapeador já usado na importação e confirmou que a descrição obrigatória e os demais campos são incluídos no `upsert`.
- Nenhum teste automatizado foi adicionado ou executado. Não houve consulta ou escrita no Supabase operacional, migration, alteração de XML, recebimento, transmissão à SEFAZ ou deploy.

## Modo “Não se aplica” nos vínculos da NF de entrada

### Problema e sintomas observados

Linhas da NF-e que não devem gerar produto ou movimentação de estoque precisavam de um vínculo artificial para liberar o recebimento. No app, essas linhas também continuavam aparecendo como vínculos pendentes.

### Causa raiz técnica

Os modos do formulário aceitavam somente vínculo Único ou Composição. A elegibilidade, os indicadores de pendência, a seleção de NF para recebimento e a conversão para itens de estoque tratavam todas as linhas da nota como produtos que deveriam entrar no estoque.

### Arquivos e linhas alterados

- ERP — escolha e estado do vínculo: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:32-180`, `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemRow.tsx:56,234-238`, `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.tsx:40,57,91`, `erp/src/pages/utils/inboundNfe/types/inboundNfeTypes.ts:58`, `shared-utils/inboundProductLinkFormSchemas.ts:121,139`.
- ERP — conclusão, reimportação e pendências: `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:147`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:173-201,337`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:102-107`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceSuggestions.ts:56,141,159-164`, `erp/src/pages/App/Stock/InboundInvoices/inboundReceiptEligibility.ts:8-43`, `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:75-116`, `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:160-167`.
- ERP — recebimento e etiquetas: `erp/src/pages/App/Stock/Receipts/components/InboundNfeItemsSection.tsx:21-22,52-90`, `erp/src/pages/App/Stock/Receipts/components/InboundReceiptItemRow.tsx:63-148,205-207`, `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts:373,409-413`, `erp/src/pages/App/Stock/Receipts/modals/ReceiptFormModal.tsx:239-241`, `erp/src/pages/App/Stock/Receipts/modals/inbound-invoice-picker/InboundInvoiceReceiptItem.tsx:20-27`, `erp/src/pages/App/Stock/Receipts/utils/inboundInvoiceToReceiptAdapter.ts:104,111,137,154-172`, `erp/src/pages/App/Stock/Receipts/utils/inboundToPurchaseConverter.ts:13`, `erp/src/pages/App/Stock/Receipts/utils/receiptSupplierCodesPersistence.ts:12`.
- App móvel — escolha, persistência e pendências: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:23,57,123-174`, `mobile/src/features/stock/invoices/modals/inbound-mappings/domain/inboundMappingItemRules.ts:9,29-40,219-238`, `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundInvoiceMappings.ts:12,282-291`, `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundMappingSuggestions.ts:31`, `mobile/src/features/stock/invoices/modals/inbound-mappings/types.ts:10`, `mobile/src/features/stock/invoices/screens/invoices-screen/useInvoiceScreenActions.ts:122,136-138`, `mobile/src/features/stock/invoices/utils/invoiceList.ts:114-127`, `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:11-14,206,274`.
- Registro e vigência: `docs/fiscal/historico-correcoes-2026-10-29.md:28-55`, `docs/fiscal/README.md:9`.
- Guia prático: `docs/estoque/guia-pratico/gerar_guia.py:96,342-343,405,410,413,476,488,519,532,692`, `docs/estoque/guia-pratico/README.md:31,34-36`, `docs/estoque/guia-pratico/previews.tsx:7,12,27-132`, `docs/estoque/guia-pratico/imagens/capturas.json:382,387-406`, captura `docs/estoque/guia-pratico/imagens/04-gerenciar-vinculos.png`, PDFs `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.

### Solução implementada

ERP e app agora oferecem o modo **Não se aplica**. Ele limpa os IDs e dados de vínculo da linha, preserva a linha original da NF-e, impede o preenchimento automático por códigos do fornecedor e deixa de contá-la como pendência. A seleção da NF e a geração do recebimento aceitam esse modo; a conversão omite a linha dos produtos do recebimento, das movimentações de estoque e da memória de códigos do fornecedor. Composição continua sendo aceita como vínculo concluído quando houver ao menos um produto associado. O comportamento usa o estado JSON já existente e não exige migration.

### Testes e validações

- Revisão estática acompanhou a seleção do modo, a persistência, os indicadores de pendência e os dois caminhos de geração de recebimento; `git diff --check` não apontou whitespace inválido.
- A prévia visual usou os controles reais do ERP e dados fictícios, sem gravar operações. As páginas 3, 7, 8, 12, 13, 14, 17 e 27 do guia atualizado foram renderizadas e revisadas visualmente; as cópias do PDF foram comparadas após a geração.
- Nenhum teste automatizado foi adicionado ou executado. Não houve escrita ou consulta no Supabase operacional, migration, recebimento real, alteração de XML, transmissão à SEFAZ ou deploy.

## Renomeação do modo de vínculo para “Composto”

### Problema e sintomas observados

O botão do modo de vínculo da NF-e aparecia como “Composição”. O operador pediu que o rótulo fosse “Composto” no ERP e no app.

### Causa raiz técnica

As duas interfaces usavam o nome do modo interno como rótulo do botão. A mudança necessária é somente de apresentação; o estado interno `composition` e as regras de associação das peças permanecem iguais.

### Arquivos e linhas alterados

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:121` — rótulo do botão no ERP.
- `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:149` — rótulo do botão no app.
- `docs/estoque/guia-pratico/README.md:36,79`, `docs/estoque/guia-pratico/imagens/04-gerenciar-vinculos.png`, `docs/estoque/guia-pratico/imagens/capturas.json:395,403`, `erp/public/guias/guia-pratico-estoque.pdf`, `output/pdf/guia-pratico-do-estoque.pdf` — atualização do guia e da captura.
- `docs/fiscal/README.md:10` e `docs/fiscal/historico-correcoes-2026-10-29.md:57-82` — registro e índice vigentes.

### Solução implementada

O texto do botão agora é “Composto” no ERP e no app. O valor salvo e a lógica interna de composição não foram alterados. A captura da página 8 e as duas cópias do guia também mostram o rótulo atualizado.

### Testes e validações

- A prévia visual usou o componente real do ERP e dados fictícios; a captura e a página 8 do PDF foram revisadas visualmente.
- As duas cópias do PDF foram geradas, conferidas com 27 páginas e comparadas; `git diff --check` passou.
- Nenhum teste automatizado foi adicionado ou executado. Não houve consulta ou escrita no Supabase operacional, migration, recebimento real, alteração de XML, transmissão à SEFAZ ou deploy.

## Menu dos modos e cadastro rápido nos vínculos da NF de entrada

### Problema e sintomas observados

Os três modos de vínculo e o cadastro rápido ocupavam controles separados no gerenciamento da NF-e. O operador pediu um seletor único com a opção ativa sempre visível e esclareceu que Cadastro rápido deve permanecer fora desse menu, junto à busca/adicionador de produto, pois o resultado depende de Único ou Composto.

### Causa raiz técnica

ERP e app renderizavam os modos como botões paralelos. O cadastro rápido ficava desacoplado do campo de busca e o salvamento do ERP atualizava apenas o vínculo simples, sem compor corretamente um novo componente quando Composto estava selecionado. No app, o vínculo criado sobre um item marcado “Não se aplica” podia preservar esse modo mesmo após a criação do produto.

### Arquivos e linhas alterados

- ERP — seletor de modo, preparação do cadastro rápido junto à busca e persistência compatível com o modo selecionado: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:1-174`, `InboundInvoiceItemRow.tsx:155-171,240-283`, `InboundItemSingleMode.tsx:26,45,92-117`, `InboundItemCompositionMode.tsx:17,28,106-132`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts:238-277`.
- App — seletor equivalente, botão de cadastro ao lado da busca e mudança de “Não se aplica” para Único quando um produto é vinculado: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:1-3,57-60,122-196,289-321`, `inboundMappings.styles.ts:99-122,180-252`, `domain/inboundMappingItemRules.ts:114-121`.
- Guia e captura didática: `docs/estoque/guia-pratico/README.md:36`, `previews.tsx:7,28-118`, `imagens/capturas.json:382,387-406`, `imagens/04-gerenciar-vinculos.png`, `gerar_guia.py:410`, `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Vigência: `docs/fiscal/README.md:10` e este histórico.

### Solução implementada

ERP e app apresentam a opção ativa em um único dropdown com Único, Composto e Não se aplica. Cadastro rápido fica fora do menu, ao lado do campo para buscar/adicionar produtos. Abrir o cadastro preserva a escolha atual; ao salvar, o produto entra como vínculo único ou componente conforme essa escolha. Nessa versão, em Não se aplica não havia busca nem Cadastro rápido; a revisão posterior mantém o botão visível e o deixa desativado, conforme a seção [Ações do cabeçalho e rolagem do modal](#ações-do-cabeçalho-e-rolagem-do-modal-de-vínculos). A captura e os PDFs do guia foram atualizados.

### Testes e validações

- A prévia visível do ERP confirmou as três opções no menu e Cadastro rápido fora dele, ao lado da busca. A página 8 do PDF foi renderizada e revisada; as duas cópias permanecem idênticas e com 27 páginas.
- `git diff --check` passou. A OTA de produção foi publicada e confirmada no canal `production` para Android e iOS, runtime `1.6.0`, grupo `acd2dcae-3915-4100-a616-0e21818aefce`.
- Nenhum teste automatizado foi adicionado ou executado; não houve leitura/escrita de dados no Supabase, migration, recebimento real ou operação SEFAZ.

## Texto do modo Composto simplificado

### Problema e sintomas observados

O modo Composto exibia uma explicação longa sobre rateio de custos e uma fórmula manual para calcular preço unitário. O operador pediu para remover esse texto.

### Causa raiz técnica

Um parágrafo didático estava fixo no componente de composição e repetido com mais detalhes na nota do guia. O cálculo do rateio continua sendo feito pelo ERP no recebimento, então a fórmula extensa não era necessária nessa etapa.

### Arquivos e linhas alterados

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemCompositionMode.tsx:104-129` — busca mantida com Cadastro rápido ao lado, sem o parágrafo explicativo extenso.
- `docs/estoque/guia-pratico/gerar_guia.py:447-450` e `docs/estoque/guia-pratico/README.md:79` — substituição da fórmula longa por uma instrução curta sobre associação manual e rateio automático.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias regeneradas e revisadas.

### Solução implementada

O texto extenso e a fórmula manual foram removidos da tela e do guia. A busca de componentes permanece disponível no modo Composto; o guia informa apenas que a associação das peças é manual e que o ERP calcula o rateio no recebimento. Nessa revisão, Cadastro rápido ainda ficava oculto em “Não se aplica”; a atualização posterior o manteve visível, desativado, conforme a seção [Ações do cabeçalho e rolagem do modal](#ações-do-cabeçalho-e-rolagem-do-modal-de-vínculos).

### Testes e validações

- Revisão estática do componente, geração de 27 páginas idênticas e revisão visual da página do guia atualizada.
- Nenhum teste automatizado foi adicionado ou executado. Não houve operação de banco, recebimento real ou SEFAZ. Não foi necessária nova OTA, pois esta correção alterou apenas a interface do ERP e o guia; o app já contém a regra solicitada.

## Rótulo do cabeçalho em “Não se aplica”

### Problema e sintomas observados

Ao selecionar “Não se aplica”, o cabeçalho do item mudava de “Vincular produto” para “Item sem vínculo com produto”. O operador pediu para manter o mesmo cabeçalho.

### Causa raiz técnica

Os componentes do ERP e do app condicionavam o texto do cabeçalho ao modo “Não se aplica”, embora o seletor já mostre qual modo está ativo.

### Arquivos e linhas alterados

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:110` — cabeçalho do modo Único e Não se aplica.
- `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:133` — cabeçalho do mapeador no app.
- `docs/estoque/guia-pratico/gerar_guia.py:410,413`, `README.md:36`, `imagens/capturas.json:379-406` e `imagens/04-gerenciar-vinculos.png` — instrução e captura da página 8 atualizadas.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias regeneradas e revisadas.

### Solução implementada

O cabeçalho continua “Vincular produto” nos modos Único e Não se aplica. No modo Composto, permanece “Vincular produtos”. O seletor continua mostrando a opção ativa e as regras de vínculo não mudaram.

### Testes e validações

- A prévia visível do ERP com dados fictícios confirmou “Vincular produto” junto de “Não se aplica”, sem exibir Cadastro rápido. A página 8 foi renderizada e revisada; as duas cópias do guia mantêm 27 páginas e são idênticas.
- A OTA foi publicada e confirmada no canal `production` para Android e iOS, runtime `1.6.0`, grupo `ff215d06-2f00-4720-991a-8b5ce5ba374a` (Android `01a18828-7db2-751a-820d-59db2d4563ce`; iOS `01a18828-7db2-7aeb-8bee-e1750c3fbdab`).
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado; nenhuma gravação no banco foi realizada.

## Ações do cabeçalho e rolagem do modal de vínculos

### Problema e sintomas observados

O operador pediu que o seletor de modo e Cadastro rápido ficassem juntos no fim da linha. Cadastro rápido deve continuar visível e ficar desativado quando indisponível. Também pediu que a página atrás de Gerenciar vínculos não role enquanto o modal estiver aberto.

### Causa raiz técnica

Cadastro rápido era renderizado dentro dos campos de busca e sumia em alguns modos; o seletor ficava separado no cabeçalho. O modal de Gerenciar vínculos não ativava o hook compartilhado de bloqueio do scroll do documento.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:8-137` e `InboundInvoiceItemRow.tsx:241-248` — ações agrupadas no cabeçalho; botão sempre visível e desativado sem fornecedor, em Não se aplica ou quando Único já está vinculado. Os botões antigos nos modos foram removidos de `InboundItemSingleMode.tsx` e `InboundItemCompositionMode.tsx`.
- Rolagem: `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:3,42` — usa `useBodyScrollLock` enquanto o modal com uma nota está aberto.
- App: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:59,138-164` e `inboundMappings.styles.ts:100-115,192` — mesma disposição e estado desativado, incluindo enquanto salva.
- Guia/documentação: `docs/estoque/guia-pratico/gerar_guia.py:410,413`, `README.md:36`, `previews.tsx:84,89`, `imagens/capturas.json:379-394`, `imagens/04-gerenciar-vinculos.png`, `docs/fiscal/README.md:10-11`, `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.

### Solução implementada

O cabeçalho mantém “Vincular produto” em Único e Não se aplica, e “Vincular produtos” em Composto. No fim da linha ficam o botão Cadastro rápido e o seletor Único/Composto/Não se aplica. Cadastro rápido fica desativado quando a ação não está disponível. O hook compartilhado bloqueia o scroll do body e do documento enquanto Gerenciar vínculos está aberto e restaura os valores anteriores ao fechar.

### Testes e validações

- A prévia visível do ERP com dados fictícios confirmou os dois controles no cabeçalho, Cadastro rápido ativo em Único e visível/desativado em Não se aplica. A página 8 do guia foi renderizada e revisada; ambas as cópias têm 27 páginas idênticas e o mesmo SHA-256.
- OTA publicada e confirmada no canal `production`, para Android e iOS, runtime `1.6.0`, grupo `83c80e9c-c7a2-49cc-91a6-409eb4056177` (Android `01a18833-cbba-7ed9-8fc3-ffc291363088`; iOS `01a18833-cbba-73c2-a642-87a0ee4c0825`), mensagem `NF-e: ações no cabeçalho de vínculos`.
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado; não houve gravação no banco nem recebimento real.

## Cabeçalho completo e menu de importação no módulo de NF de entrada do app

### Problema e sintomas observados

O cabeçalho do módulo mostrava “NF Entrada” e a faixa logo abaixo repetia “Notas Fiscais de Entrada” com ícone e subtítulo. O botão de importar ocupava a faixa do título, em vez de ficar dentro das opções do cabeçalho, e o filtro de período não estava ao lado desse menu.

### Causa raiz técnica

O cabeçalho nativo do módulo usava o título curto genérico da navegação. `InvoicesPageHeader` também renderizava o título e o subtítulo completos, além de uma ação de importação independente.

### Arquivos e linhas alterados

- App: `mobile/src/features/stock/overview/native-stock-screen/NativeStockScreen.tsx:43-46` — título completo de NF de entrada no cabeçalho do módulo.
- App: `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesPageHeader.tsx:47-58,65-83,151-184` e `invoicesScreen.styles.ts:14-73` — remoção do bloco redundante, filtro à esquerda e menu de três pontos com a ação “Importar”.
- App: `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:1-5,39-40,113` — remoção da propriedade de layout usada apenas pelo cabeçalho duplicado.
- Guia: `docs/estoque/guia-pratico/gerar_guia.py:395`, `docs/estoque/guia-pratico/README.md:38`, `erp/public/guias/guia-pratico-estoque.pdf` (página 6) e `output/pdf/guia-pratico-do-estoque.pdf`.
- Índice fiscal: `docs/fiscal/README.md:9`.

### Solução implementada

O cabeçalho do módulo mostra “Notas Fiscais de Entrada”. A faixa duplicada foi removida. A disposição final coloca o menu de três pontos no extremo direito dessa linha e alinha o filtro de período à direita na linha inferior. O menu oferece a ação “Importar”; filtros e busca continuam disponíveis. A disposição inicial em uma mesma linha do período e do menu foi substituída pelo [ajuste de 29/10](#menu-de-importação-no-cabeçalho-da-nf-de-entrada-e-período-à-direita-no-app).

### Testes e validações

- A exportação local Expo concluiu para web, Android e iOS (`mobile/dist`); os três bundles foram gerados sem erro.
- O guia foi gerado com 27 páginas; as cópias ERP e `output/pdf` têm SHA-256 idêntico (`82F363F16823AFA307F1B6D4D952CF36571340605B589BB947DD1146D8DAE9C5`). A página 6 foi renderizada e revisada visualmente; o novo texto cabe na página e orienta o caminho de importação no app e no ERP.
- A verificação TypeScript apontou 72 diagnósticos no projeto; nos arquivos alterados, o único resultado foi o erro não relacionado e inalterado em `InvoicesScreenContent.tsx:131` (`string | null` enviado a uma prop `string`). Não houve diagnóstico no cabeçalho ou estilos editados.
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado. Nenhuma OTA foi publicada.

## Menu de importação no cabeçalho da NF de entrada e período à direita no app

### Problema e sintomas observados

Após a primeira alteração, o botão de três pontos ainda ficava na faixa abaixo do cabeçalho do módulo. O operador esclareceu que ele deve ficar no fim da mesma linha do título “Notas Fiscais de Entrada”, com o filtro de período alinhado à direita logo abaixo.

### Causa raiz técnica

O `InvoicesPageHeader` era renderizado numa linha separada da linha do módulo, então seu menu de importação não podia ocupar o extremo direito do cabeçalho principal.

### Arquivos e linhas alterados

- App: `mobile/src/features/stock/overview/native-stock-screen/NativeStockScreen.tsx:32-48` — o cabeçalho aceita e posiciona uma ação no extremo direito.
- App: `mobile/src/features/stock/invoices/screens/InvoicesScreen.tsx:4-9`, `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:25-36,85-112` e `InvoicesPageHeader.tsx:49-80,83` — composição do menu no cabeçalho principal e consolidação da barra de filtros num único cabeçalho fixo.
- App: `mobile/src/features/stock/invoices/screens/invoices-screen/invoicesScreen.styles.ts:3-19` — filtro de período alinhado à direita.
- Índice fiscal: `docs/fiscal/README.md:9`.

### Solução implementada

O cabeçalho fixo combina o título completo e o menu de três pontos à direita. A faixa de filtros abaixo alinha “Período” à direita. A opção “Importar” permanece no menu.

### Testes e validações

- A exportação local do Expo concluiu para web, Android e iOS (`mobile/dist`). A barra unificada permanece fixa durante a rolagem da lista.
- `git diff --check` passou. A verificação TypeScript continua apontando 72 diagnósticos no projeto; nos arquivos alterados, o único é o erro não relacionado em `InvoicesScreenContent.tsx:129` (`string | null` enviado a uma prop `string`). Nenhum diagnóstico foi emitido nos arquivos de cabeçalho alterados.
- Nenhum teste automatizado foi adicionado ou executado. Nenhuma OTA foi publicada.

## Horários de rotina da SEFAZ ocultos no app

### Problema e sintomas observados

Na lista de NF de entrada do app, o estado normal exibia três linhas com a hora da última busca automática e os tempos previstos para as próximas buscas da SEFAZ. O operador pediu que essas linhas fossem ocultadas.

### Causa raiz técnica

O estado estável de `SefazSyncStatusBadge` sempre renderizava os textos de última sincronização, próxima descoberta e recuperação pendente, mesmo quando não havia aviso operacional.

### Arquivos e linhas alterados

- App: `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:14,163-175,216-290` — remove a exibição normal dos horários e mantém avisos operacionais.
- Índice fiscal: `docs/fiscal/README.md:9`.

### Solução implementada

O estado normal da tela não exibe mais os três textos. O componente permanece montado, então a sincronização automática continua funcionando; mensagens de falha, andamento, tentativa manual e avisos da fila automática continuam visíveis.

### Testes e validações

- Exportação local do Expo concluiu para web, Android e iOS (`mobile/dist`). A sincronização automática permanece nos intervalos existentes; somente os textos no estado normal foram removidos.
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado. Nenhuma OTA foi publicada.

## Busca de vínculos da NF-e mostra somente variações

### Problema e sintomas observados

Na busca de produto dentro de Gerenciar vínculos, o app também apresentava o cadastro pai como uma opção de resultado. O operador pediu que só apareçam variações e solicitou a mesma conferência no ERP.

### Causa raiz técnica

No app, `searchInboundInvoiceProducts` montava a lista juntando cadastros da tabela `products` e registros de `product_variations`, permitindo selecionar o pai sem uma variação específica. No ERP, `ProductAutocomplete` já tinha a propriedade `variationsOnly`, mas os seletores de vínculo Único e Composto não a ativavam; por padrão, um produto sem variações podia ser selecionado como pai.

### Arquivos e linhas alterados

- App: `mobile/src/services/stock/invoices/inboundInvoiceCatalogLookupService.ts:16-100` — pesquisa dos campos da variação e do pai, retornando somente linhas de variação com `variationId`.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemSingleMode.tsx:92-101` e `InboundItemCompositionMode.tsx:104-120` — busca do vínculo exige uma variação. `QuickRegisterVariationModal.tsx:452` também exige variações ao selecionar componentes de um produto composto; a busca do produto pai para cadastrar uma variação existente continua separada e intencional.
- Guia: `docs/estoque/guia-pratico/gerar_guia.py:413` e `docs/estoque/guia-pratico/README.md:44` — a página 8 explica que a busca mostra variações disponíveis e orienta a conferir cor, medida ou modelo.
- PDFs sincronizados: `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Índice fiscal: `docs/fiscal/README.md:10`.
- Regra solicitada pelo operador: `AGENTS.md:157-160` — publicar atualização OTA somente mediante pedido explícito.

### Solução implementada

No app, pesquisar pelo nome/código do cadastro pai agora encontra suas variações disponíveis; pesquisar pelo nome/SKU da variação também funciona. Resultados duplicados são removidos e nenhum cadastro pai é apresentado como item selecionável. No ERP, Único, Composto e seleção de componentes passam a usar `variationsOnly`. O campo Produto pai do cadastro rápido continua oferecendo pais, pois sua finalidade é escolher a família na qual a nova variação será criada.

### Testes e validações

- Nenhum teste automatizado foi adicionado ou executado nesta alteração.
- O build completo do ERP concluiu com sucesso. A exportação local do app pelo CLI instalado no projeto concluiu para web, iOS e Android. `git diff --check` passou.
- O gerador produziu 27 páginas e 21 imagens; as cópias servida e de entrega são idênticas. A página 8 foi renderizada e revisada visualmente, sem cortes ou sobreposição; o caminho público no submenu permaneceu igual.
- A tentativa inicial de EAS Update falhou durante a exportação por um erro de sintaxe em `shared-utils/catalogPublication/categoryCharacteristics.ts`, antes da publicação. Nenhuma OTA foi publicada; após o operador determinar que OTA só deve ocorrer mediante pedido explícito, não houve nova tentativa de publicação.

## NF-e de fornecedores exclusivos de Salvados

### Problema e sintomas observados

As NF-e da Multiloja Salvados apareciam como se precisassem de associação de produtos e podiam abrir o fluxo de recebimento. O operador esclareceu que esse fornecedor tem origem de estoque exclusiva de Salvados; essas mercadorias não entram no estoque convencional.

### Causa raiz técnica comprovada

O cadastro ativo da Multiloja Salvados tem `stock_origins = ['salvados']` e não inclui `normal`. A origem era filtrada no seletor de NF do recebimento, mas não era aplicada de modo consistente à lista, ao modal e à importação de vínculos no ERP e no app. Além disso, duas NF-e resumo sem itens estavam sem `supplier_id`, embora o CNPJ do emitente correspondesse ao cadastro ativo.

Antes da correção, a consulta remota confirmou seis NF-e pendentes do mesmo emitente, sem `receipt_id`, sem itens relacionados normalizados, sem produto/composição vinculados e com 96 itens fiscais ao todo. Nenhuma movimentação ou recebimento foi criado durante a correção.

### Arquivos e linhas alterados

- Regra comum: `shared-utils/productSupplierStockOrigin.ts:29-45` normaliza a origem do cadastro e o formato de relação PostgREST; `shared-utils/inboundInvoiceSupplierRules.ts:1-30` remove os campos de produto e fixa `linkMode: 'not_applicable'`.
- ERP: `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts:7-11,110-130,229-385,480-565`; `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:22-23,29-58,145-193`; `erp/src/pages/App/Stock/InboundInvoices/inboundReceiptEligibility.ts:1-38`; `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:61-81,191,291`; `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:19,151-154`; `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:16-17,47-52,98-137,164-171,211-236,271-342,355-362`; `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.tsx:10-28,67-73`; `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemRow.tsx:24-58,88-90,239-244`; `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:5-32,52-55,122-145`.
- App: `mobile/src/services/stock/invoices/inboundInvoiceQueryService.ts:17-21,46-50,81-88`; `mobile/src/services/stock/invoices/inboundInvoiceMappers.ts:5-9,21-48,81-108`; `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:103-107,198-240`; `mobile/src/services/stock/invoices/inboundInvoiceMappingsService.ts:1-9,95-164`; `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundInvoiceMappings.ts:25-27,43-68,74-128,143-198,312-425,438-440`; `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundSupplierSection.tsx:10-43,65-140,166-205`; `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:10-66,140-158,229-232`; `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundInvoiceMappingsModalContent.tsx:33-83,111-170`; `mobile/src/features/stock/invoices/modals/inbound-mappings/types.ts:20-28`; `mobile/src/features/stock/invoices/modals/invoice-actions/InvoiceActionModal.tsx:13,47`; `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCardContent.tsx:4-5,23-36,90-119`; `mobile/src/features/stock/types/stock.types.ts:1-15`.
- Guia obrigatório: `docs/estoque/guia-pratico/gerar_guia.py:410-413,488-491`; `docs/estoque/guia-pratico/README.md:34-44`; cópias sincronizadas `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Índice: `docs/fiscal/README.md:9-11`. Não houve migration nem alteração de schema.

### Solução implementada

ERP e app identificam fornecedores sem origem Normal que têm origem Salvados, fixam as linhas da NF em “Não se aplica”, removem dados de produto vinculados, escondem os alertas/ações de gerenciar vínculo e bloqueiam a geração de recebimento. O seletor de fornecedor fica travado quando a NF pertence a esse fornecedor. Novas importações associam a Multiloja Salvados pelo cadastro correspondente e não fazem busca automática de produto. A atualização do serviço do app também reforça a regra ao persistir vínculos. A NF continua disponível como documento fiscal; não cria recebimento nem movimentação de estoque.

No Supabase operacional (`hkoxhourxwlddgsfdgws`), foram atualizadas somente as seis NF-e com emitente CNPJ correspondente ao cadastro ativo Multiloja Salvados: `125472`, `131202`, `133744`, `134092`, `134093` e `134458`. As duas notas resumo vazias também passaram a apontar para o fornecedor. As outras quatro têm 96 linhas fiscais, todas marcadas `not_applicable`. Status e recibos foram preservados.

### Testes e validações

- Consultas remotas antes/depois confirmaram: 6 notas associadas à Multiloja Salvados, 96 de 96 linhas com `linkMode = 'not_applicable'`, zero links a produtos/composições, zero linhas normalizadas, todas as notas ainda `pendente` e nenhum `receipt_id`.
- O gerador produziu os dois PDFs com 27 páginas idênticas. As páginas 8 e 13 foram renderizadas e revisadas; o caminho público do submenu permanece o mesmo.
- Os bundles web, Android e iOS foram exportados pelo Metro e a OTA foi publicada no canal `production`, runtime `1.6.0`, grupo `b0804131-5ff8-4972-8539-8c8ee008c20f` (Android `01a18894-cc5b-7ef7-b64c-bddc012fe6be`; iOS `01a18894-cc5b-7615-b757-d4b5922ca27f`).
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado. A checagem TypeScript completa segue com diagnósticos preexistentes, incluindo `useInboundInvoiceQuickRegister.ts:259`, `inboundInvoiceToReceiptAdapter.ts:159` e `mobile/src/features/stock/invoices/modals/inbound-mappings/inboundMappings.styles.ts:254`; as execuções filtradas não apontaram diagnósticos nos arquivos diretamente alterados do app.

## Estilo dos controles do cabeçalho de vínculos

### Problema e sintomas observados

O operador pediu que Cadastro rápido não tivesse fundo nem borda, e que o seletor Único/Composto/Não se aplica tivesse somente uma borda inferior e ficasse à esquerda do Cadastro rápido.

### Causa raiz técnica

O botão de Cadastro rápido ainda usava estilo preenchido com borda, e o seletor tinha borda arredondada em todos os lados e aparecia depois do Cadastro rápido.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:119-202` — ordem, fundo/borda e alinhamento dos dois controles.
- App: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:140-221` e `inboundMappings.styles.ts:159-170,261-274` — mesma ordem e aparência nativa.
- Guia: `docs/estoque/guia-pratico/gerar_guia.py:410,413`, `README.md:36`, `imagens/04-gerenciar-vinculos.png`, `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Índice fiscal: `docs/fiscal/README.md:11-12`.

### Solução implementada

Cadastro rápido agora é um botão sem fundo e sem borda. O seletor aparece à esquerda, com somente a linha inferior. A captura e a página 8 do guia foram atualizadas para mostrar o mesmo estado.

### Testes e validações

- A prévia visível do ERP com dados fictícios confirmou o seletor sublinhado à esquerda e Cadastro rápido sem fundo/borda, ainda visível e desativado em “Não se aplica”. A página 8 foi renderizada e revisada; o guia contém 27 páginas e as duas cópias são idênticas.
- OTA publicada e confirmada no canal `production`, para Android e iOS, runtime `1.6.0`, grupo `f1b34ee2-215f-4688-9074-1b02517b5183` (Android `01a18840-4ba1-7dbe-bb1f-aacf4292e28e`; iOS `01a18840-4ba1-7274-94ff-bf2775e53441`), mensagem `NF-e: estilo dos controles de vínculo`.
- `git diff --check` passou. Nenhum teste automatizado foi adicionado ou executado; não houve gravação no banco nem recebimento real.

## Busca e período lado a lado na lista de NF de entrada do app

### Problema e sintomas observados

Na tela do app, o período ficava em uma linha separada da busca, aumentando a altura do cabeçalho e afastando os filtros da lista.

### Causa raiz técnica

`InvoicesPageHeader` renderizava o botão de período antes do campo de busca em linhas distintas; os dois controles usavam apenas borda inferior.

### Arquivos e linhas alterados

- App: `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesPageHeader.tsx:83-122` — busca à esquerda e período à direita na mesma linha.
- App: `mobile/src/features/stock/invoices/screens/invoices-screen/invoicesScreen.styles.ts:13-110` — controles contornados, divisor visual e dimensões compactas.
- Documentação: `docs/fiscal/README.md:10` e `docs/fiscal/historico-correcoes-2026-10-29.md:360-384` — índice e registro desta mudança.

### Solução implementada

A busca ocupa o espaço disponível à esquerda; o período aparece à direita em um controle contornado, separado por um divisor vertical. Os filtros de mês personalizado continuam logo abaixo quando selecionados. O cabeçalho do módulo, o menu de três pontos, os cartões e a navegação inferior permanecem disponíveis. Os horários de rotina da SEFAZ continuam ocultos; alertas operacionais seguem preservados. A mudança altera somente a apresentação, sem mudar as ações ou regras de NF-e.

### Testes e validações

- Revisão estática dos componentes confirmou a composição dos filtros; a navegação inferior permanece no contêiner de estoque, fora dos componentes alterados.
- Nenhum teste automatizado foi adicionado ou executado. Nenhuma OTA foi publicada.
- O guia prático do estoque não foi alterado porque a busca, o filtro de período e os passos operacionais permanecem iguais; somente a posição e a aparência dos controles mudaram.

## Menu de modo de vínculo sobre os itens vizinhos

### Problema e sintomas observados

Ao abrir Único/Composto/Não se aplica no modal de vínculos da NF, o menu ficava atrás do próximo item da lista, impedindo a leitura e a seleção das opções.

### Causa raiz técnica

O `z-index` estava aplicado ao menu absoluto, mas o cabeçalho/linha do item que o contém não criava uma camada de empilhamento acima dos itens seguintes.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:117` — promove o cabeçalho enquanto o menu está aberto.
- App: `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundMappingItemCard.tsx:78-85` e `inboundMappings.styles.ts:32` — eleva o cartão do item aberto com `zIndex` e `elevation`.
- Documentação: `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-29.md:386-410` — índice e registro do ajuste.

### Solução implementada

O cabeçalho no ERP e o cartão no app passam à frente dos itens vizinhos enquanto o seletor está aberto. O z-order normal volta quando o menu fecha; as opções, o salvamento e a navegação não mudam.

### Testes e validações

- Revisão estática confirmou que a elevação depende do estado aberto do menu e retorna ao padrão ao fechar.
- Nenhum teste automatizado foi adicionado ou executado. Nenhuma OTA foi publicada.
- O guia prático do estoque não precisou de atualização: somente a sobreposição visual mudou; as ações e instruções de vínculo permanecem iguais.

## Paginação fixa de 15 notas nas listas de NF de entrada

### Problema e sintomas observados

Na lista de NF de entrada do ERP, o operador podia alterar a quantidade por página pelo seletor de paginação. O app já mantinha 15 notas por página. A regra solicitada é manter a mesma quantidade fixa nas duas interfaces.

### Causa raiz técnica

O ERP guardava `itemsPerPage` em estado e passava um callback de alteração ao componente genérico, que também restaura preferências locais. No app, a consulta e a tela já usavam a constante compartilhada `ITEMS_PER_PAGE = 15`.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesPagination.tsx:4-31` — define a constante 15 e remove a API de alteração do tamanho da página e a chave de preferência.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:13-18,56,78-99,243-249` — envia sempre 15 à consulta e remove o estado do tamanho selecionável.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.pagination.test.tsx:35-43` — atualiza o cenário existente para a paginação fixa, sem executar o teste.
- App, regra já existente: `mobile/src/services/stock/stockPagination.ts:1`, `mobile/src/services/stock/invoices/inboundInvoiceQueryService.ts:7,43-77` e `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:23,156-167` — mantém consulta e navegação em 15 por página.
- Guia: `docs/estoque/guia-pratico/gerar_guia.py:382-390`, `docs/estoque/guia-pratico/README.md:56` e as cópias `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Vigência: `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-29.md:434-462`.

### Solução implementada

O ERP agora usa `INBOUND_INVOICES_PAGE_SIZE = 15` no componente e na busca, sem seletor nem restauração de preferência de tamanho para esta lista. A navegação entre páginas continua disponível. O app já usa 15 na consulta e na tela e não precisou de alteração de código. O guia passou a informar que as duas listas mostram até 15 notas por página.

### Testes e validações

- Revisão estática confirmou que o ERP passa a constante 15 ao serviço e que o componente apresenta “15 por página” sem seletor; no app, o serviço e a tela usam a mesma constante 15.
- O cenário de paginação existente foi alinhado à regra fixa, mas nenhum teste automatizado foi executado. As duas cópias do guia foram regeneradas, comparadas e revisadas visualmente na página 7.
- Nenhuma consulta ou escrita no Supabase operacional, migration, operação fiscal, recebimento real ou publicação OTA foi realizada.

## Cabeçalho compacto e menu Importar no ERP para NF de entrada

### Problema e sintomas observados

O cabeçalho de NF de entrada mostrava o subtítulo, o botão Importar XML da NF-e e três mensagens de rotina da SEFAZ com horários relativos. Isso ocupava altura e repetia informações operacionais que não ajudam a localizar ou importar a nota.

### Causa raiz técnica

`InboundInvoicesHeader` renderizava o subtítulo e a importação como botão direto; o estado normal de `SefazSyncStatusBadge` exibia o último horário de busca e os próximos horários planejados. A busca ficava em uma linha separada do período também em telas largas.

### Arquivos e linhas alterados

- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx:36-218` — título compacto, menu de três pontos, menu Importar e organização responsiva dos filtros.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:163-240` — retira textos e cálculos dos horários de rotina; preserva falha com ação de tentar novamente, sincronização em andamento e avisos de automação.
- Guia: `docs/estoque/guia-pratico/gerar_guia.py:381-390`, `docs/estoque/guia-pratico/README.md:56`, `docs/estoque/guia-pratico/imagens/capturas.json:1-15` e `docs/estoque/guia-pratico/imagens/01-nf-entrada-header.png` — passo atualizado e captura nova do cabeçalho; cópias publicadas em `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- Fiscal: `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-29.md:463-488` — índice e este registro.

### Solução implementada

O ERP mantém apenas o título “NF de entrada” e o botão de três pontos; nele, a ação aparece como “Importar”, seguindo o padrão do app, e abre o modal existente “Importar XML da NF-e”. Os textos normais de horário da SEFAZ foram removidos. Falha, botão para tentar novamente, andamento da sincronização e avisos de automação continuam disponíveis. A partir de 768 px, período e busca aparecem na mesma linha; em telas menores, permanecem empilhados.

### Testes e validações

- Playwright na porta 5173 em 320, 360, 390, 430, 768, 1024 e 1440 px: sem rolagem horizontal nem sobreposição entre título e menu; busca e período empilhados até 430 px e alinhados na mesma linha a partir de 768 px.
- Conferidos a ausência do subtítulo e dos três textos de rotina, a abertura do menu, o fechamento por Escape e a abertura do modal correto. O modal foi fechado sem selecionar arquivo ou concluir uma importação.
- Os PDFs foram regenerados, comparados e a página alterada revisada visualmente. Nenhum registro comercial foi alterado e nenhuma OTA foi publicada.
