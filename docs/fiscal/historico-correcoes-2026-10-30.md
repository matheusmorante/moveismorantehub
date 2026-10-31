# Correções fiscais — 30/10/2026

## Filtro de data e fornecedor na seleção de NF-e para recebimento no app

### Problema observado

Na seleção de NF-e para iniciar um recebimento pelo app, faltava o filtro por data de emissão que já existe no ERP. Depois de escolher a nota, o formulário também podia mostrar “Não foi possível carregar os fornecedores” mesmo com o fornecedor vindo da própria NF.

### Causa raiz técnica

- `ReceiptSourcePicker` carregava as notas por páginas de 15, pesquisando apenas pelo texto; `fetchReceiptInvoiceSources` não aplicava limites de emissão à consulta. O seletor do ERP já filtra por mês/ano e intervalo.
- `NewGoodsReceiptModal` buscava a lista geral de fornecedores ao abrir, independentemente da origem. O formulário mostrava o erro dessa consulta mesmo para NF-e, cuja origem já fornece `supplierId` e `supplierName`; o erro não indicava falha ao carregar a NF.

### Solução

- O app agora oferece as mesmas seis opções de período do ERP, com Mês Atual como padrão. O filtro é validado pelo schema Zod de listagem e aplicado no Supabase antes da paginação e da contagem de resultados.
- A lista geral de fornecedores só é consultada quando necessária para selecionar um fornecedor manualmente ou conferir o fornecedor de um pedido. Recebimentos por NF usam os dados de fornecedor trazidos pela nota e não dependem dessa consulta.

### Arquivos e validação

- `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx:1-29,126-202,284-340,433-444,492-508` — filtro de período na lista e validação das condições antes da busca.
- `mobile/src/services/stock/stockReceiptsService.ts:6-11,152-179` — limites de `data_emissao` aplicados à consulta paginada.
- `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx:76-95,135-201,444-472` — busca sob demanda dos fornecedores e uso do fornecedor da NF no formulário.
- `docs/estoque/guia-pratico/gerar_guia.py:490`, `docs/estoque/guia-pratico/README.md:17`, `erp/public/guias/guia-pratico-estoque.pdf` (página 13) e `output/pdf/guia-pratico-do-estoque.pdf` (página 13) — caminho do seletor e filtro documentados.
- `docs/fiscal/README.md:15` e este histórico — referência vigente atualizada.
- Revisão estática comparou as seis opções com o seletor do ERP e confirmou que o filtro acontece no servidor antes do `range`. O gerador confirmou 27 páginas e cópias idênticas; a página 13 foi renderizada a 130 dpi e revisada visualmente, sem cortes ou sobreposições. Os PDFs têm SHA-256 `124CB387911BD4E73871FF2D4B712D36C24B7C519FE7CAD802F0397646FB1FF0`. Nenhum teste automatizado, escrita remota ou publicação OTA foi executado.

## Erro de compilação na tabela de NF-e de entrada

- **Problema observado:** o Vite interrompia a compilação de `InboundInvoicesTable.tsx` com `Unexpected token, expected "}"` na linha do status de vínculos.
- **Causa raiz técnica:** os condicionais encadeados para os selos da lista já tinham um ramo final para “Vinculações Pendentes”, mas terminavam com um `: null` adicional. Isso deixava inválidas as expressões JSX desktop e mobile.
- **Solução:** removi o ramo ternário excedente nas duas apresentações. A lógica dos estados incompleto, Salvados, vínculo completo e pendente foi preservada.
- **Arquivos e linhas:** `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:260-281,356-375`; este histórico e `docs/fiscal/README.md`.
- **Validação:** `npx vite build` no ERP concluiu com sucesso após transformar 6.048 módulos. Permanecem avisos preexistentes de imports mistos e tamanho de chunks. `git diff --check` não apontou erros; testes não foram executados.

## Nome da NF de entrada no app

- **Problema observado:** o módulo aparecia como “NF Entrada” no menu Estoque e como “Notas Fiscais de Entrada” no cabeçalho; a descrição do cartão dizia “Notas fiscais recebidas”.
- **Causa:** os rótulos do cartão de navegação e do cabeçalho usavam textos diferentes e mais longos que o nome solicitado.
- **Solução:** o cartão e o cabeçalho agora usam “Nota Fiscal de Entrada”, e a descrição do cartão usa “NF Recebidas”.
- **Arquivos e linhas:** `mobile/src/features/stock/overview/native-stock-screen/nativeStockScreen.types.ts:42-43`; `mobile/src/features/stock/overview/native-stock-screen/NativeStockScreen.tsx:46`; `docs/estoque/guia-pratico/gerar_guia.py:301,305,382`; `docs/estoque/guia-pratico/README.md:46`; `docs/fiscal/README.md:9` e este histórico `:3-9`.
- **Validação:** revisão estática dos rótulos e revisão visual das páginas 3 e 5 do guia. Nenhum teste automatizado ou publicação OTA foi executado.

## NF-e de Salvados fora da seleção de novo recebimento

### Problema observado

Ao iniciar um recebimento por NF-e no app, notas de fornecedores classificados como Salvados ainda apareciam na lista, embora não devessem gerar entrada de estoque. O filtro equivalente do ERP dependia do helper que trata origem ausente como Normal em alguns contextos.

### Causa raiz

O app desativava essas linhas, mas ainda as exibia. Além disso, os filtros dos dois clientes aceitavam a classificação Normal inferida quando a origem do fornecedor não estava explicitamente carregada.

### Solução

- A consulta paginada do app agora filtra no Supabase a origem `normal` e exige fornecedor relacionado; a tela repete a checagem antes de renderizar as linhas.
- O ERP aceita somente notas cuja lista de origens inclua explicitamente `normal`. A NF de fornecedor classificado apenas como Salvados deixa de aparecer no seletor de novo recebimento.
- A lista de NF de entrada permanece inalterada: fornecedores exclusivos de Salvados continuam com linhas em “Não se aplica”, sem gerar estoque.
- O guia prático foi atualizado e as duas cópias do PDF foram regeneradas.

### Arquivos e validação

- `erp/src/pages/App/Stock/Receipts/utils/inboundInvoicePickerFilters.ts:81-84` — exige origem Normal explícita.
- `mobile/src/services/stock/stockReceiptsService.ts:148-166` e `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx:81-86,131-142` — filtro de servidor e guarda antes da apresentação.
- `docs/estoque/guia-pratico/gerar_guia.py:490`, `docs/estoque/guia-pratico/README.md:54`, `erp/public/guias/guia-pratico-estoque.pdf` (página 13) e `output/pdf/guia-pratico-do-estoque.pdf` (página 13) — regra operacional atualizada.
- `docs/fiscal/README.md:9` e este histórico `:3-25` — referência atualizada. Revisão estática confirmou que ambos os seletores exigem origem Normal explícita e que a paginação mobile conta apenas resultados do filtro Supabase. Nenhum teste automatizado, escrita no banco ou publicação OTA foi executado.

## Confirmação fiscal em modal estilizado no ERP

- **Problema observado:** a revisão de NCM de produtos e o reprocessamento de cancelamento fiscal em Produção ainda chamavam `window.confirm`, usando a confirmação nativa do navegador.
- **Causa técnica:** esses dois caminhos não utilizavam o modal compartilhado do ERP. O serviço de cancelamento fiscal aceitava somente um callback síncrono, incompatível com a confirmação assíncrona do modal.
- **Solução:** ambos agora usam `requestConfirmation` e `ConfirmDialogHost`/`ConfirmModal`. `processOrderCancellationFiscalEffects` aceita callback assíncrono e aguarda a decisão somente depois de obter a política do documento e antes de enviar a tentativa; sem confirmação, o gate de Produção continua bloqueando a ação. A revisão NCM mantém a confirmação antes da RPC e informa que documentos já emitidos não são alterados.
- **Arquivos e localização:** `erp/src/App.tsx`; `erp/src/components/shared/ConfirmDialogHost.tsx`; `erp/src/components/shared/confirmationService.ts`; `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:369`; `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts:286`; `erp/src/pages/utils/nfe/orderCancellationFiscalService.ts:77,124,239`.
- **Revisão/validação:** inspeção estática dos caminhos até a RPC/cancelamento fiscal e `git diff --check` sem erros. Testes e chamadas remotas não foram executados nesta alteração; permanecem pendentes validação de interface e regressão fiscal.

## NF-e de entrada automática com dados e chave de acesso sem itens — 30/10/2026

### Problema observado

A distribuição automática da SEFAZ podia gravar também os produtos e o XML integral quando recebia um documento completo. Depois da Ciência da Emissão, uma fila adicional consultava a chave para tentar obter o XML. O fluxo deixava os itens entrarem sem que o operador baixasse o XML atualizado no Portal. Na NF-e #270892, seis itens foram exibidos com quantidade, preço unitário, total da linha e total da nota zerados; como havia seis linhas, a interface não oferecia Obter XML. A chegada automática deve servir para localizar a nota e sua chave; itens utilizáveis devem vir da importação manual do XML mais recente.

### Causa raiz técnica

parseNfeXml extrai as linhas de produto e guarda o XML de origem em xml_conteudo. persistParsedInvoice gravava o objeto parseado inteiro por upsert, sem remover itens ou o XML completo recebido pela distribuição. Separadamente, api/nfe/inbound-manifestation.ts mantinha uma fila de consultas automáticas por chave após Ciência aceita e chamava a função de sincronização com accessKey. No ERP, o rótulo incompleto considerava apenas se a lista de itens estava vazia; a cópia mobile também não classificava como incompletas linhas existentes com todos os valores comerciais zerados. O menu da NF permitia abrir Gerenciar vínculos sem considerar esse estado incompleto.

### Solução implementada

- A descoberta automática conserva os dados identificadores da NF-e, totais disponíveis e chave de acesso, mas persiste itens vazio e não guarda o XML completo recebido pela distribuição. Se já existir XML resumido, ele é preservado para manter os dados da chave e a elegibilidade da Ciência.
- Linhas e XML completos previamente importados pelo operador são preservados: a sincronização não os substitui nem os apaga.
- A fila de consulta automática por chave e suas retentativas foram removidas da fila de Ciência. Pedidos de consulta automática com accessKey são recusados com orientação para obter o XML no Portal da NF-e.
- No ERP e no app, notas sem itens aparecem como **NF incompleta / Obter XML**, inclusive quando não há mais um resNFe salvo. O botão abre a nota correspondente, mostra o Portal da NF-e e permite importar o XML atualizado nela. Ciência automática continua limitada ao evento 210210 e não preenche os itens.
- O ERP e o app também marcam como incompleta uma nota cujas linhas não tenham quantidade nem preço unitário nem total diferente de zero. O recebimento fica bloqueado até que o operador confira/importa o XML atualizado. Isso permite abrir Obter XML na NF-e #270892 sem apagar seus vínculos existentes.
- NFs incompletas não oferecem Gerenciar vínculos no selo, no card nem no menu de ações do ERP ou do app. O operador atualiza primeiro o XML no Portal; depois de importar dados comerciais válidos, pode associar fornecedor/produtos.
- Configurações, mensagens, detalhes e guia prático de estoque agora deixam explícita a obtenção manual do XML atualizado no Portal.

### Arquivos alterados

- `api/nfe/inbound-manifestation.ts:20-172,460-609` (trechos removidos da versão anterior) — remove a consulta e as retentativas automáticas do XML da fila de Ciência; mensagens vigentes em `:306-371`.
- `erp/server/nfe/inbound-manifestation.cjs:1` e `erp/server/nfe/inbound-manifestation.cjs.map:1` — bundle fiscal correspondente ao código fonte.
- `supabase/functions/sefaz-inbound-sync/index.ts:72-102,335-342` — persiste metadados sem itens/XML completo e bloqueia consulta por chave.
- ERP: `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:46-48,257-259`; `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:72-78`; `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx:167-173`; `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:11,71-74,140,169,176,257,279,352`; `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:37-38 (removidos),130-132`; `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:101` — remoção de retorno/estado de busca automática e instruções de obtenção/importação manual.
- App: `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:73-79`; `mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsItemsSection.tsx:6,22,25`; `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:157` — instruções equivalentes no fluxo existente do app.
- `shared-utils/inboundSummaryHelp.ts:2` — orientação comum para notas automáticas incompletas/desatualizadas.
- `docs/estoque/guia-pratico/gerar_guia.py:390,404,407`; `docs/estoque/guia-pratico/README.md:58,62`; `erp/public/guias/guia-pratico-estoque.pdf` (páginas 5 e 7); `output/pdf/guia-pratico-do-estoque.pdf` (páginas 5 e 7) — instrução operacional e cópias idênticas do guia.
- `shared-utils/inboundInvoiceCompleteness.ts:1-26` — reconhece dados comerciais ausentes/zerados nos formatos usados pelo ERP e app.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/inboundReceiptEligibility.ts:3,20-24,42`; `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:5,130-133` — bloqueio de vínculos/recebimento e aviso nos detalhes.
- App: `mobile/src/services/stock/invoices/inboundInvoiceMappers.ts:10,31`; `mobile/src/features/stock/invoices/modals/invoice-actions/InvoiceActionModal.tsx:34` — classificação e bloqueio equivalentes no app.
- `shared-utils/inboundSummaryHelp.ts:2` — orientação comum para notas automáticas incompletas/desatualizadas.
- `docs/estoque/guia-pratico/gerar_guia.py:386,390,404,407`; `docs/estoque/guia-pratico/README.md:58,62`; `erp/public/guias/guia-pratico-estoque.pdf` (páginas 5 e 7); `output/pdf/guia-pratico-do-estoque.pdf` (páginas 5 e 7) — instrução operacional e cópias idênticas do guia.
- `docs/fiscal/README.md:9,58,84-86` e este histórico `:11-38` — referência vigente e registro da correção.

### Validação e limites

- Revisão estática dos caminhos distNSU/consNSU, fila de Ciência e importação manual confirmou persistência de metadados e associação do upload pela chave. A interface aberta no ERP confirmou que a NF-e #270892 tem seis linhas zeradas; após a mudança, ela passou a exibir “NF incompleta / Obter XML” e não exibe Gerenciar vínculos.
- O bundle fiscal da rota inbound-manifestation foi gerado localmente. Não foram executados testes automatizados nem migrations. A consulta do Portal foi aberta pela ação da nota, mas o hCaptcha bloqueou o acesso ao documento; nenhum XML foi baixado/importado e nenhum vínculo foi alterado nesta etapa. Os quatro vínculos existentes e o fornecedor permaneceram intactos; dois itens continuam pendentes até a importação do XML atualizado.
- A function Edge do Supabase e a aplicação ERP ainda precisam ser publicadas para que a regra entre nos ambientes remotos; publicação não foi realizada nesta tarefa.

## Bloqueio do scroll de fundo no modal Obter XML da NF 30-10-2026

### Problema observado

Com o modal “Obter XML da nota fiscal” aberto, ainda era possível rolar o conteúdo da tela de notas fiscais que fica atrás dele.

### Causa raiz técnica

- No ERP, o modal usava uma camada fixa sobre a tela, mas não ativava o hook compartilhado que bloqueia a rolagem de `html` e `body`.
- No app, o modal nativo transparente permanecia sobre uma `FlatList` com a rolagem habilitada.

### Solução implementada

- ERP: `InboundDocumentImportModal` ativa `useBodyScrollLock(isOpen)` enquanto o modal está visível.
- App: a lista de notas recebe `scrollEnabled={!showImportModal}`, desativando a rolagem de fundo durante a importação/obtenção do XML.

### Arquivos alterados

- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:4,56` — usa o hook compartilhado de bloqueio de rolagem.
- `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:104` — desativa a rolagem da lista enquanto o modal de importação está aberto.
- `docs/fiscal/README.md:10` — inclui esta correção nas referências atuais.

### Validação e limites

- Revisão estática confirmou que a condição de abertura do modal controla o bloqueio no ERP e no app. Não foram executados testes automatizados; não foram feitas alterações em dados fiscais nem publicação OTA.
- A mudança só controla a interação com o conteúdo de fundo e não altera os passos operacionais do estoquista; o guia prático de estoque não precisou ser atualizado.

## Modal Obter XML em tela cheia no celular

### Problema observado

Em janelas estreitas, o modal de Obter XML aparecia como um cartão centralizado com margens, deixando a lista de notas visível ao redor e reduzindo o espaço para o formulário.

### Causa raiz técnica

- No ERP, o modal mantinha `p-4`, largura máxima `max-w-xl` e cantos arredondados em qualquer largura.
- No app, o cartão mantinha margem vertical, largura máxima de 640 px e altura máxima de 92% também em telas de celular.

### Solução implementada

- ERP: em larguras menores que o breakpoint `sm`, o modal ocupa a viewport sem margens ou cantos arredondados; o conteúdo central rola dentro do modal. Em telas maiores, permanece centralizado e limitado a `max-w-xl`.
- App: abaixo de 600 px, o cartão ocupa a tela inteira, sem margens nem cantos; cabeçalho e rodapé respeitam as áreas seguras do dispositivo. Em telas maiores, preserva-se o cartão centralizado.

### Arquivos alterados

- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:86,88,120` — adiciona apresentação responsiva em tela cheia e rolagem interna.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:54,142-165,263` — aplica o layout compacto e preserva áreas seguras no cabeçalho e rodapé.
- `mobile/src/features/stock/invoices/modals/invoice-import/invoiceImportModal.styles.ts:12-50` — define os estilos de tela cheia para celular.
- `docs/fiscal/README.md:11` — registra esta correção nas referências atuais.

### Validação e limites

- Revisão estática confirmou os breakpoints responsivos e a rolagem interna do formulário. Não foram executados testes automatizados nem houve alteração de dados fiscais ou publicação OTA.
- O ajuste visual não altera os passos de operação do estoquista; o guia prático de estoque não precisou ser atualizado.

## Importação de XML sem dados comerciais bloqueada

### Problema observado

Ao arrastar para o ERP o XML fornecido para a NF-e #270892, o aviso exibia `Too small: expected number to be >0` em inglês, sem explicar o motivo. O operador confirmou que o Portal da SEFAZ também mostrava a nota incompleta.

### Causa raiz técnica

- O arquivo baixado do Portal tem estrutura `nfeProc`, assinatura e protocolo; apesar disso, suas seis linhas contêm `qCom=0.0000`, `vUnCom=0.0000000000` e `vProd=0.00`.
- `parseInboundNfeXml` preserva `qCom` como `quantity=0`; a validação da NF exige quantidade positiva e mostrava a mensagem padrão do Zod antes de qualquer gravação. O erro não era causado pelo arraste do arquivo.
- O importador mobile não tinha uma barreira equivalente antes de persistir o XML sem dados comerciais.

### Solução implementada

- ERP e app agora usam `hasInboundItemCommercialData` antes de validar ou persistir a NF. Quando todos os itens estão sem quantidades e valores utilizáveis, a importação é bloqueada com uma mensagem em português que explica os dados zerados e evita sugerir que o operador baixe novamente o mesmo arquivo do Portal.
- O XML sem dados comerciais não é gravado como se fosse uma importação completa; a NF incompleta já cadastrada permanece disponível para atualização.

### Arquivos alterados

- `shared-utils/inboundSummaryHelp.ts:4` — define mensagem comum para XML sem dados comerciais.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:8,19,114-115` — bloqueia XML incompleto antes da validação e persistência.
- `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:11-12,87-88` — aplica a mesma barreira antes de consultar ou gravar no Supabase.
- `docs/fiscal/README.md:12` — registra a correção nas referências atuais.

### Validação e limites

- Inspeção local do XML anexado confirmou seis linhas zeradas, estrutura processada/assinada com protocolo e que a causa ocorre antes da chamada de persistência no ERP. Não foram executados testes automatizados nem feitas alterações no banco ou publicação OTA.
- O guia prático já orienta baixar e importar o XML completo quando a NF aparece com quantidades e valores zerados; o procedimento não mudou e o PDF permanece vigente.

## Cancelamento da sobreposição azul de arraste de XML

### Problema observado

Enquanto a sobreposição de arraste de XML estava visível, clicar no fundo azul ou no painel branco podia acionar controles da lista de notas que ficava atrás. Também não havia uma ação para cancelar o arraste clicando no fundo azul.

### Causa raiz técnica

A sobreposição global usava `pointer-events-none`, deixando todos os cliques passarem para os elementos subjacentes. O cartão branco não tinha uma camada interativa própria para bloquear esses eventos.

### Solução implementada

- A sobreposição agora cobre a área inteira e captura os cliques.
- O fundo azul é um botão acessível que fecha a sobreposição e limpa o arquivo pendente; o cartão branco fica acima dele, não cancela e não permite acionar a lista.
- O app nativo não tem a sobreposição de arraste: o XML é selecionado pelo Document Picker, por isso o ajuste fica somente no ERP.

### Arquivos alterados

- `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:128-131,203-228` — cancela pelo fundo azul, bloqueia cliques atrás e mantém o painel branco sobre a camada de cancelamento.
- `docs/estoque/guia-pratico/gerar_guia.py:397` — documenta a ação de cancelar no painel azul e diferencia ERP do seletor do app.
- `docs/estoque/guia-pratico/README.md:5` — registra a atualização da página 6 do guia.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias regeneradas e sincronizadas do guia.
- `docs/fiscal/README.md:13` — registra esta correção nas referências atuais.

### Validação e limites

- Revisão estática confirmou que o painel azul captura os cliques fora do cartão e que o cartão branco fica acima do botão de cancelamento. Nenhum teste automatizado foi executado.
- Os PDFs foram gerados pelas fontes mantidas, renderizados e conferidos visualmente na página 6; as cópias servida e de entrega foram comparadas. Nenhum dado fiscal foi gravado nem publicação OTA foi realizada.
## Atualização automática da lista de vínculos de NF-e — 30/10/2026

### Problema observado

Depois de concluir os vínculos de uma NF-e em outra aba ou computador, a lista já aberta permanecia com o estado anterior e ainda indicava vínculos pendentes.

### Causa raiz técnica

As listas paginadas do ERP e do app carregavam a NF-e apenas ao abrir, pesquisar, trocar período ou página. Não havia assinatura para invalidar esses dados após gravação remota. As tabelas `inbound_invoices` e `inbound_invoice_items` também não participavam de um canal de Realtime.

### Solução implementada

- Um trigger de banco envia o mesmo evento privado de atualização quando há escrita em uma NF ou em seus itens. A mensagem contém somente um indicador de atualização, sem dados de emitente, chave, valores ou itens; cada cliente relê a página usando a consulta existente.
- ERP e app assinam o evento com canal privado e atualizam a página atual após uma breve consolidação das alterações. Ao voltar para uma aba ou app em primeiro plano, a lista também é consultada novamente.
- As tabelas fiscais não foram adicionadas à publicação `supabase_realtime`. A política `realtime.messages` permite receber esse tópico somente a clientes autenticados.

### Arquivos alterados

- `supabase/migrations/20261030200714_inbound_invoice_list_refresh.sql` — função privada e triggers `AFTER ... FOR EACH STATEMENT` em `inbound_invoices` e `inbound_invoice_items`, além da política autenticada do tópico.
- `shared-utils/inboundInvoiceListRealtime.ts` — nome comum do tópico e do evento.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesRealtime.ts` e `erp/src/pages/utils/inboundNfe/services/inboundInvoicesService.ts` — assinatura privada exportada pelo serviço de NF-e.
- `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx` — recarrega a página atual após evento/foco, sem spinner nem toast para atualizações silenciosas.
- `mobile/src/services/stock/invoices/inboundInvoiceRealtimeService.ts` — assinatura privada do app.
- `mobile/src/features/stock/invoices/hooks/useInvoices.ts` — recarrega a página atual após evento e retorno ao primeiro plano, preservando o conteúdo durante a atualização.
- `docs/estoque/guia-pratico/gerar_guia.py` e `docs/estoque/guia-pratico/README.md` — instrução adicionada à página 8 do guia.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias regeneradas e sincronizadas.
- `docs/fiscal/README.md` — inclui esta correção nas referências atuais.

### Validação e limites

- No projeto operacional `MoranteHub` (`hkoxhourxwlddgsfdgws`), a migration foi aplicada como `20261030200714` e o pós-check confirmou função/triggers, `search_path` vazio, ACL restrita da função, tópico autorizado apenas para `authenticated` e ausência das tabelas fiscais na publicação Realtime. Os Advisors não apontaram achados para as tabelas ou objetos Realtime alterados; avisos preexistentes de outras áreas não foram modificados.
- Não foram feitas gravações DML de teste nem alterações em linhas fiscais. `git diff --check` passou. Os typechecks amplos ERP e app falham por erros existentes em outras áreas; a saída filtrada não apontou erros nos arquivos desta correção. O lint focado não iniciou: no ERP o pacote `zod-validation-error/v4` não resolve pela instalação atual; o app não tem configuração ESLint compatível. A página 8 do PDF foi renderizada e revisada; as duas cópias têm o mesmo SHA-256 e a geração confirmou 27 páginas.
- As telas foram revisadas para manter debounce, ignorar abas em segundo plano e limpar assinaturas ao desmontar. Não houve teste automatizado nem prova comportamental com duas sessões conectadas. A atualização depende de conexão e sessão Supabase autenticada. Não houve publicação OTA do app.
- A atualização em segundo plano depende de conexão e sessão Supabase autenticada. Não houve publicação OTA do app.

## Criação de recebimentos no app e alinhamento dos cabeçalhos fiscais

### Problema e causa

O módulo mobile de Recebimentos apenas listava e abria registros: `ReceiptsScreen` não oferecia ação nem formulário para criar uma entrada. O ERP já oferecia as origens manual, NF-e e pedido de compra. Os cabeçalhos de NF de entrada e saída no ERP tinham espaço vertical interno reduzido.

### Solução

- O app mostra “Recebimentos de Mercadorias” e oferece **três pontinhos > Novo**, seguido das três origens. O acesso ao módulo segue os perfis Administrador e Estoquista do ERP.
- O formulário valida a submissão com RHF/Zod e usa a RPC de confirmação já existente no ERP para gravar recebimento e movimentos. O caminho por pedido preserva o pedido de origem e aplica os percentuais de IPI/frete carregados.
- O caminho por NF-e exige fornecedor de estoque normal, dados comerciais e vínculos. Itens “Não se aplica” são ignorados; componentes são expandidos e seus custos rateados. Entradas anteriores confirmadas são descontadas e a nota é conferida novamente antes da confirmação. A nota só é marcada recebida quando o saldo é completado; se sua atualização falhar após a entrada, o app informa que o recebimento foi confirmado e pede conferência.
- Os cabeçalhos de NF de entrada e saída do ERP receberam altura e espaço vertical para centralizar seus controles. O guia diferencia o formulário direto do app dos anexos, rascunho e despesas não fiscais disponíveis no ERP.

### Arquivos alterados

- `mobile/src/features/stock/overview/native-stock-screen/nativeStockScreen.types.ts:48` e `NativeStockScreen.tsx:31,44,89,126` — título completo, quebra responsiva e acesso por perfil.
- `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx:34,72,246,265`; `modals/ReceiptSourcePicker.tsx:30,99`; `modals/NewGoodsReceiptModal.tsx:170,193,247,383,464` — menu, escolhas, busca e formulário.
- `mobile/src/features/stock/receipts/utils/receiptSource.ts:41,55,93,241` — conversão de origens, custos, composição e saldo restante.
- `mobile/src/services/stock/stockReceiptsService.ts:69,148,165` e `mobile/src/services/stock/invoices/inboundInvoiceMappingsService.ts:10,14` — confirmação, consultas e dados da origem fiscal. Nenhuma migration ou SQL foi alterado nesta tarefa.
- `shared-utils/receiptFormSchemas.ts:25,36`; `mobile/src/features/stock/purchases/modals/purchase-form/PurchaseItemsSection.tsx:22,51,78`; `mobile/src/features/stock/inventory/modals/InventoryProductSearchModal.tsx:26` e `InventoryProductSearchModalContent.tsx:28,144` — contratos de validação e controles reutilizados.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx:76`, `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsHeader.tsx:43` e `erp/src/pages/App/Stock/Receipts/components/ReceiptsHeader.tsx:42` — alinhamento vertical dos cabeçalhos.
- `mobile/src/features/stock/receipts/utils/receiptSource.test.ts`, `mobile/src/services/stock/stockReceiptCreation.test.ts`, `mobile/src/services/stock/stockReceiptsService.test.ts` e `erp/tests/mobile-forms/receipt-creation.test.tsx` — provas isoladas de lógica, serviço e formulário.
- `docs/estoque/guia-pratico/gerar_guia.py:487,489,505`, `docs/estoque/guia-pratico/README.md`, `docs/estoque/guia-pratico/manifesto.json`, `erp/public/guias/guia-pratico-estoque.pdf`, `output/pdf/guia-pratico-do-estoque.pdf`, `docs/forms/inventario-mobile-catalogo-2026-10-15.md` e `docs/fiscal/README.md` — guia, inventário e índice atualizados.

### Validação e limites

- Vitest: 16 testes de lógica/serviço em três arquivos e três testes de formulário passaram com serviços simulados. Cobrem origens, composição, saldo parcial, bloqueios, timeout e atualização da nota após confirmação. Mais cinco testes do conjunto de componentes fiscais passaram.
- A leitura somente de catálogo no Supabase operacional confirmou a assinatura e o comportamento da RPC existente e as colunas consultadas; não houve gravação de teste, transmissão fiscal nem migration. O Playwright autenticado conferiu os cabeçalhos de NF e Recebimentos do ERP em 434 e 1.280 px. As páginas 13 a 15 do guia foram renderizadas e revisadas; as duas cópias geradas são idênticas.
- A RPC existente trava pelo identificador do recebimento, não pela NF; confirmações concorrentes da mesma nota em aparelhos diferentes não foram comprovadas atomicamente. Não havia telefone físico conectado para Maestro; a persistência do novo fluxo no aplicativo e sua apresentação nativa permanecem sem prova de ponta a ponta. O typecheck global do app apresenta erros preexistentes em outras áreas; a publicação OTA não foi realizada.

## Motivo do fornecedor bloqueado exibido sob demanda

### Problema observado

Em Gerenciar Vínculos, a explicação para o campo de fornecedor bloqueado aparecia permanentemente sob o campo e se repetia em outro aviso no ERP. O app também mantinha mensagens explicativas sempre visíveis.

### Causa raiz

O `SupplierAutocomplete` renderizava `disabledReason` para todo campo desabilitado, enquanto o modal de NF adicionava avisos para fornecedor de Salvados e para notas com produtos já vinculados. O componente mobile repetia os mesmos motivos em texto fixo.

### Solução implementada

- No ERP, o campo bloqueado da NF permanece visualmente igual e abre um tooltip somente ao clique. O tooltip informa por que a troca está bloqueada; o campo continua sem aceitar alteração.
- No app, o campo bloqueado permanece visível e abre um alerta nativo ao toque. Para fornecedor de Salvados, explica que as linhas ficam em “Não se aplica” e não movimentam estoque; nos demais casos, orienta desvincular todos os produtos antes de trocar o fornecedor.
- Foram removidos os avisos permanentes sobre o bloqueio nas duas telas. Os avisos normais de fornecedor vinculado ou ainda não selecionado continuam quando o campo está desbloqueado.
- A página 8 do guia prático foi atualizada para ensinar a consultar o motivo por clique/toque. Os dois PDFs foram regenerados e conferidos visualmente.

### Arquivos alterados

- `erp/src/components/SupplierAutocomplete.tsx` — controle por clique acessível, tooltip e remoção do aviso inline somente para o uso opt-in.
- `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx` — usa o comportamento sob demanda e remove os avisos duplicados.
- `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundSupplierSection.tsx` e `inboundMappings.styles.ts` — alerta sob toque, área clicável acessível e remoção de mensagens permanentes.
- `docs/estoque/guia-pratico/gerar_guia.py`, `docs/estoque/guia-pratico/README.md`, `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — instrução operacional atualizada e cópias sincronizadas.
- `docs/fiscal/README.md` e este histórico — referência vigente e registro da correção.

### Validação e limites

- Revisão estática dos estados bloqueados e desbloqueados no ERP e no app confirmou que o motivo só é apresentado depois da ação explícita e que a lógica que impede a troca não foi alterada.
- Testes automatizados e builds não foram executados nesta alteração. O guia foi regenerado, a página 8 foi renderizada e revisada, e as duas cópias foram comparadas. Nenhuma publicação OTA foi realizada.

## Salvados no status da lista de NF-e

### Problema observado

Na lista de notas fiscais, o app usava “Salvados” como status da nota e ocultava o estado de vínculo. No ERP, o status da nota já era normal, mas fornecedores exclusivos de Salvados não tinham um selo de vínculo nem uma explicação acessível na lista.

### Causa raiz

O card mobile incluía a origem do fornecedor no texto e na cor do status da NF-e. Os dois clientes suprimiam os selos de vínculo para esses fornecedores, sem apresentar um estado que explicasse que a vinculação não era necessária.

### Solução implementada

- O status fiscal da nota continua mostrando “Disponível” ou “Recebida”; a origem Salvados deixa de substituir esse status no app.
- O ERP e o app mostram o selo azul “Vinculação não se aplica” para fornecedores exclusivos de Salvados, inclusive quando a nota está marcada como incompleta.
- O ícone de informação abre uma explicação de que essa origem não movimenta estoque e não requer vínculo com produtos. O app usa um alerta nativo; o ERP usa um diálogo acessível com fechamento pelo botão, pelo fundo ou pela tecla Escape.
- O guia prático explica a apresentação do selo na página da lista de NF de entrada.

### Arquivos e validação

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:14-72,245-261,341-357` — status de vínculo nas linhas desktop e nos cards ERP, além do diálogo aberto pelo ícone.
- `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCardContent.tsx:28-39,91-154` — status fiscal normal e selo azul com explicação nativa.
- `docs/estoque/guia-pratico/gerar_guia.py:387,415`, `docs/estoque/guia-pratico/README.md:15`, `erp/public/guias/guia-pratico-estoque.pdf` (página 5) e `output/pdf/guia-pratico-do-estoque.pdf` (página 5) — orientação do selo nas cópias do guia.
- `docs/fiscal/README.md:11` e este histórico `:292-316` — referência fiscal vigente e registro da correção.
- Revisão estática confirmou que o estado especial depende do fornecedor ser exclusivamente de Salvados; fornecedores que também possuem origem Normal mantêm o fluxo de vínculos regular. A página 5 e a página 8 do guia foram renderizadas e revisadas; as duas cópias têm o mesmo SHA-256 e o arquivo contém 27 páginas. Testes automatizados e revisão visual do app/ERP não foram executados nesta alteração; nenhuma publicação OTA foi feita.

## Ajustes de estoque ao editar pedido de venda

### Problema e causa

Ao salvar alterações de itens em uma venda agendada ou atendida, a RPC transacional comparava a quantidade de movimentos ativos com a quantidade esperada de linhas. Uma mudança física em qualquer linha fazia a função estornar e recriar os movimentos do pedido inteiro, inclusive linhas não alteradas. Um acréscimo não tinha saída separada e a existência de mais de uma saída por linha também era interpretada como divergência na próxima gravação. Parte do histórico antigo registra estorno na observação, mesmo quando a coluna `status` ainda diz `effective`.

### Solução

A RPC continua gravando pedido e estoque na mesma transação, com o mesmo bloqueio por pedido. Alterar somente preço não cria nem estorna movimentação. Um acréscimo cria uma saída com a quantidade adicionada e observação de ajuste; uma linha nova cria sua própria saída. Redução, troca ou remoção estornam somente as saídas efetivas da linha afetada e, quando necessário, registram uma saída para a quantidade atual. A conciliação acompanha as origens por linha, inclusive quando existem duas linhas da mesma variação, preserva o CMV das linhas inalteradas e recusa alterações quando o histórico antigo não permite identificar a origem com segurança. Os estornos gravam o status também na observação para manter a leitura do app consistente. Não houve mudança de XML, snapshot fiscal, transmissão ou numeração fiscal.

### Arquivos modificados

- `supabase/migrations/20261031005746_sale_order_item_stock_adjustments.sql:6,30,148,568,724,858`: verificações prévias, planejamento por linha, reconciliação e integração na RPC existente. Aplicada ao projeto operacional `hkoxhourxwlddgsfdgws` sob a versão remota `20261031005746`; assinatura, `SECURITY DEFINER` e permissões da RPC original foram preservadas.
- `supabase/migrations/20261031010352_guard_unclaimed_sale_order_exits.sql:4,270`: reforça a conciliação para rejeitar saídas efetivas não atribuídas a uma linha, inclusive quando outro cliente grava uma cópia antiga do pedido. Aplicada ao mesmo projeto sob a versão remota `20261031010352`, com a permissão da função auxiliar preservada.
- `erp/src/pages/App/SalesOrder/modals/ItemMovementChangeConfirmModal.tsx:80`: explicação da confirmação de acréscimo, redução, troca e remoção.
- `erp/src/pages/App/Stock/Movements/hooks/useInventoryMovesHistory.ts:202` e `mobile/src/features/stock/moves/domain/inventoryTimelineBalance.ts:88`: exibição da observação de ajuste no ERP e no app.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditActions.stock.test.tsx:26` e `mobile/src/features/stock/moves/domain/inventoryMovesRules.test.ts:81`: verificações isoladas da confirmação e da observação.
- `erp/tests/sale-stock-owned/preflight.test.ts:6`, `provision.test.ts:22`, `adjustment.test.ts:14`, `rollback.test.ts:9`, `guard-readonly.test.ts:6`, `fresh-order-guard.test.ts:1` e `vitest.config.ts:4`: guardas, preparação autorizada e testes de integração remota.
- `docs/estoque/guia-pratico/gerar_guia.py:636`, `docs/estoque/guia-pratico/README.md:5`, `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`: orientação da página 24 e cópias do guia.
- `docs/fiscal/README.md:9` e esta seção: registro e referência vigente.

### Validação

Preflight Vitest confirmou projeto, operador administrador, guardas de artefatos e política pronta. Com autorização explícita, foram criados um cliente, dois produtos com suas variações e uma venda sintética da execução `7b70cd0c-54f0-49a3-8c46-c2b8ab045a82`; os vínculos e o proprietário foram verificados pelo banco. A saída original e os saldos foram conferidos antes da migration. Após a aplicação, testes reais da RPC validaram somente preço, acréscimo de três unidades, inclusão, redução, troca, duas linhas da mesma variação e rejeição de versão antiga. Outra prova rejeitou quantidade fracionária sem alterar pedido, movimentos ou saldos; ao cancelar a venda sintética, as saídas foram estornadas e os saldos das duas variações voltaram a 20. A venda foi excluída da consulta operacional de agenda e não gerou notificações. O histórico da fixture foi preservado; não houve envio fiscal.

Vitest passou nos cinco casos da confirmação do ERP e nos seis casos da formatação de movimentos no app; `npm exec -- vite build` concluiu a compilação do ERP. O guia foi regenerado com 27 páginas; a página 24 foi renderizada e revisada visualmente, as duas cópias possuem o mesmo SHA-256 e o build contém o PDF no caminho do submenu. Após as migrations, o preflight confirmou o projeto operacional `hkoxhourxwlddgsfdgws`, o operador e a política de artefatos. A nova prova remota criou uma venda agendada com três linhas, duas da mesma variação, pela criação normal do ERP e confirmou três saídas ligadas a linhas distintas. Alterar só o preço manteve movimentos e saldos; acrescentar três unidades criou uma saída de ajuste. O fluxo real `deliveryFlowService.startRoute` gravou no pedido sintético um snapshot anterior que não continha esse ajuste; a tentativa seguinte de aumentar outra linha foi rejeitada pela guarda `Há saídas sem origem confirmada no pedido`, sem alterar pedido, saídas ou saldo. Restaurado o snapshot vigente pelo fluxo `cancelDelivery`, o aumento foi aceito; o cancelamento normal estornou os movimentos e devolveu os saldos a 20. A venda de teste permaneceu cancelada para auditoria, foi excluída da consulta operacional e não gerou notificações. O primeiro ensaio foi cancelado e preservado após constatar que uma edição somente de preço, corretamente, não aciona a conciliação. A validação nativa Android não pôde ser executada: `npm --prefix mobile run test:mobile:device` retornou `NENHUM_CELULAR_WIFI` e `adb devices -l` não mostrou aparelho. A interface nativa instalada permanece sem prova; nenhuma OTA foi publicada.
