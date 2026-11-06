# Histórico fiscal — 05/11/2026

## Verificação da assinatura XMLDSig isolada

### Causa

`fiscalXmlAudit.ts` mantinha a verificação estrutural e criptográfica da assinatura XMLDSig junto da comparação do documento fiscal e do XML com o snapshot. A separação é somente estrutural: nenhum critério de assinatura ou de comparação foi alterado.

### Solução

`assertNfeSignature` foi movida intacta para `fiscalXmlSignatureAudit.ts`. `fiscalXmlAudit.ts` importa a função para continuar usando-a em `assertSignedFiscalXmlMatchesSnapshot` e a reexporta pela fachada existente, preservando os caminhos usados pelas rotas e chamadores atuais.

### Arquivos e linhas

- `api/nfe/fiscalXmlAudit.ts:26,54,478` — import interno, reexport público e chamada da auditoria combinada.
- `api/nfe/fiscalXmlSignatureAudit.ts:1-44` — novo módulo com a implementação da verificação.
- `docs/fiscal/README.md:8` — referência atual.
- `docs/auditorias/inventario-arquivos-grandes.md:6-7,458` — resultado da execução e contagem atual do catálogo.
- `docs/fiscal/historico-correcoes-2026-11-05.md:3-25` — este registro.

### Revisão estática e validações

- O corpo da função foi comparado ao baseline após a extração; a comparação normalizada foi idêntica. Permanecem iguais o parser estrito, as exigências de raiz/quantidade/posição, URI e algoritmos XMLDSig, transforms, certificado opcional, mensagens e resultado da verificação criptográfica.
- `assertSignedFiscalXmlMatchesSnapshot` continua chamando a mesma função; export e referências de rotas/testes continuam pela fachada original. Nenhuma chamada à SEFAZ, leitura/gravação em banco, emissão, mudança de schema ou publicação foi realizada.
- Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente.

## Feedback de validação do formulário mobile isolado

### Causa

`ProductFormScreen.tsx` acumulava os estados de feedback dos campos e a tradução dos erros do React Hook Form para mensagens, navegação e alertas junto à orquestração de abas e salvamento. Não foi identificada nem corrigida uma falha de regra fiscal; a mudança é somente estrutural.

### Solução

Os estados de feedback e a apresentação dos erros foram extraídos para `useProductFormValidationFeedback.ts`. A tela continua usando os mesmos formulários RHF com `zodResolver` por `useZodForm`, os mesmos callbacks `validateAndRun`, os mesmos dados de erro e as mesmas ações de salvamento. O estado `ncmError` permanece ligado ao marcador visual já existente.

### Arquivos afetados

- `mobile/src/features/products/screens/ProductFormScreen.tsx`
- `mobile/src/features/products/screens/useProductFormValidationFeedback.ts` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- Os parâmetros e o corpo de `presentValidationErrors` e o callback `clearVariationValidationTarget` foram comparados ao baseline; conteúdo e ordem das atualizações foram preservados.
- Os valores iniciais dos oito estados, o reset dos seis erros de campo ao abrir/trocar produto, a posição dos callbacks de falha dos formulários de rascunho e final e o mapeamento do erro NCM foram conferidos.
- A API/export de `ProductFormScreen` e seus chamadores em `ProductFormModal.tsx` e `InboundQuickProductModal.tsx` permaneceram iguais. `ProductFormVariationsTab.tsx` continua usando o tipo compartilhado de navegação de erros pelo caminho existente.
- A tela ficou com 1.378 linhas e o hook novo tem 99. O catálogo foi reconciliado em 65 arquivos TypeScript acima de 500 linhas.

Nenhum teste foi adicionado ou executado; build, typecheck e validação dinâmica permanecem pendentes conforme a política desta automação. Não foram alterados schemas, critérios tributários, valores de NCM, payloads, persistência, permissões, consultas, emissão ou transmissão fiscal. Nenhum acesso ao banco ou serviço externo foi feito.

## Elegibilidade para desfazer estorno do recebimento isolada

### Causa

`ReceiptsScreen.tsx` mantinha junto da coordenação da lista a verificação assíncrona que habilita ou bloqueia a ação “Desfazer estorno” no menu de um recebimento estornado. A mudança é estrutural e não altera critérios fiscais.

### Solução

A verificação de disponibilidade, a proteção contra respostas obsoletas e as mensagens de estado foram extraídas para `useReceiptUnreverseAvailability.ts`. A consulta continua usando `fetchInUseInvoiceKeys`, a mesma chave fiscal normalizada e o mesmo ID de recebimento excluído; estado, fallback e apresentação da ação mantêm o comportamento anterior.

### Arquivos afetados

- `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx`
- `mobile/src/features/stock/receipts/hooks/useReceiptUnreverseAvailability.ts` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- O efeito e a derivação de `unreverseBlocked`/`unreverseReason` foram comparados ao baseline; consulta, normalização, fallback, guarda `active` e estado inicial de conferência permanecem iguais.
- O setter estável de `useState` foi incluído explicitamente nas dependências do efeito após a extração do hook.
- A extração ocupa a mesma posição dos hooks na tela. O export de `ReceiptsScreen` pelo barrel e o chamador `NativeStockScreen.tsx` permanecem inalterados.
- A tela ficou com 589 linhas e o novo hook tem 51; o inventário foi reconciliado em 63 arquivos TypeScript acima de 500 linhas.

Nenhum teste foi adicionado ou executado; build, typecheck e validação dinâmica permanecem pendentes. Nenhuma consulta foi executada durante a refatoração, e nenhum banco, migration, emissão/transmissão fiscal ou serviço externo foi acessado. A extração não muda passos nem regras de operação do estoquista; o guia prático segue aplicável.

## Filtros do catálogo NCM extraídos do painel

### Causa

`NcmManagementPanel.tsx` reunia a apresentação da busca e dos controles de filtro à coordenação do catálogo. A mudança é estrutural; não houve alteração de critério fiscal ou de consulta.

### Solução

O campo de busca e os dois grupos de filtros foram extraídos para `NcmCatalogFilters.tsx`. O painel mantém o estado, a validação React Hook Form/Zod, a reinicialização da página e o carregamento dos dados. Os callbacks conservam a ordem de atualizar a página antes do filtro.

### Arquivos afetados

- `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx`
- `erp/src/pages/App/Settings/components/fiscal/NcmCatalogFilters.tsx` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- O JSX e as opções foram comparados ao baseline; sequência, rótulos, classes, comportamento dos botões e atributos de acessibilidade foram preservados.
- O `searchDraft` segue ligado ao mesmo campo e à validação existente. Consultas, permissões, paginação e chamadas RPC não foram movidas nem modificadas.
- `NcmManagementPanel` mantém o export usado por `NcmCatalogPage`, `FiscalSettingsSection` e pelo teste existente. O painel ficou com 1.071 linhas e o componente novo tem 88; o inventário segue reconciliado em 63 arquivos acima de 500 linhas.

Nenhum teste foi adicionado ou executado; build, typecheck e validação dinâmica permanecem pendentes. Nenhuma chamada externa ou operação fiscal foi realizada.

## Renderização da tabela de itens do DANFE NFC-e A4 extraída

### Causa

`danfeNfceA4.ts` continha a detecção de colunas NCM/CFOP, o cálculo das larguras e a transformação das linhas de itens dentro do renderizador do documento completo. A refatoração é estrutural e não altera o conteúdo ou a regra de emissão.

### Solução

A formatação monetária e a construção da tabela HTML foram movidas para `danfeNfceA4Presentation.ts`. O renderizador continua interpolando os mesmos valores no mesmo template, e mantém o cálculo da quantidade total de itens.

### Arquivos afetados

- `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts`
- `erp/src/pages/utils/nfe/danfe/danfeNfceA4Presentation.ts` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- Os blocos de item foram comparados ao baseline: colunas condicionais, larguras, contagem, escaping, rótulos/fallbacks, substituição de texto em homologação e formatação de valores permanecem iguais.
- O renderizador mantém os mesmos exports e continua servindo `danfeGenerator.ts` pelo barrel `danfe/index.ts`; os consumidores e o teste existente da disponibilidade do DANFE permanecem no caminho atual.
- O módulo ficou com 1.183 linhas e a extração tem 55. O inventário foi reconciliado em 63 arquivos TypeScript acima de 500 linhas.

Nenhum teste foi adicionado ou executado; build, typecheck e conferência dinâmica do HTML/impressão permanecem pendentes. Nenhuma regra fiscal, dado persistido, consulta, emissão ou transmissão foi modificada ou executada.

## Estilos do modal de recebimento isolados

### Causa

`NewGoodsReceiptModal.tsx` reunia a configuração estática de apresentação do modal com o formulário, seu estado e seus efeitos. A mudança é somente estrutural.

### Solução

O objeto `StyleSheet.create` foi movido para `newGoodsReceiptModal.styles.ts`; o modal importa e consome o mesmo objeto de estilos, sem mudança nos campos ou nas ações.

### Arquivos afetados

- `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx`
- `mobile/src/features/stock/receipts/modals/newGoodsReceiptModal.styles.ts` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- O bloco de estilos foi comparado ao baseline e movido sem alteração; nomes, propriedades e valores permanecem iguais, e as referências no JSX seguem no mesmo arquivo.
- O export e as props de `NewGoodsReceiptModal` e o chamador `ReceiptsScreen.tsx` permaneceram iguais. Schemas RHF/Zod, cálculos, consultas, efeitos, payloads e ações não foram alterados.
- O modal ficou com 1.263 linhas, o módulo de estilos tem 116 e o catálogo foi reconciliado em 63 arquivos TypeScript acima de 500 linhas.

Nenhum teste foi adicionado ou executado; build e validação dinâmica permanecem pendentes. Não houve alteração nos passos de operação do estoquista, portanto o guia prático não precisou de atualização. Nenhuma consulta, chamada externa ou operação fiscal foi executada.

## Opções de origem do recebimento separadas do seletor

### Causa

`ReceiptSourcePicker.tsx` exportava tanto a apresentação das opções iniciais de origem quanto a pesquisa paginada de NF-e e pedidos de compra. A apresentação inicial tem responsabilidade própria: oferecer os caminhos manual, NF-e e pedido.

### Solução

`ReceiptSourceOptions` foi extraído para `ReceiptSourceOptions.tsx`, e o objeto de estilos compartilhado foi movido intacto para `receiptSourcePicker.styles.ts`. O seletor original reexporta `ReceiptSourceOptions` pelo mesmo caminho, mantendo o import e o ponto de montagem em `NewGoodsReceiptModal.tsx`.

### Arquivos afetados

- `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx:38-41,46-54`
- `mobile/src/features/stock/receipts/modals/ReceiptSourceOptions.tsx:1-81` (novo)
- `mobile/src/features/stock/receipts/modals/receiptSourcePicker.styles.ts:1-122` (novo)
- `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx:52,936-944` (chamador conferido; sem alteração)
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- O bloco de opções e o JSX de retorno foram comparados ao baseline: ordem, textos, ícones, callback, condição de desabilitação do pedido beta, acessibilidade e cores permanecem iguais. O `StyleSheet.create` foi movido sem diferenças.
- `NewGoodsReceiptModal` continua importando o mesmo nome do mesmo caminho e renderizando as mesmas opções. Busca, paginação, critérios de elegibilidade, importação de XML, vínculos e ações fiscais não mudaram.
- A operação do estoquista permanece igual; o guia prático não exigiu atualização. Nenhuma consulta, chamada externa ou operação fiscal foi executada.

Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente.

## Normalização dos itens do rascunho de recebimento extraída

### Causa

`NewGoodsReceiptModal.tsx` continha a conversão dos registros persistidos de itens do rascunho para o modelo interno do recebimento, apesar de `utils/receiptSource.ts` já concentrar os mapeamentos de itens vindos de compra e nota fiscal. A alteração é estrutural; não muda regras fiscais ou de recebimento.

### Solução

`normalizeReceiptDraftItem` foi movida para `mobile/src/features/stock/receipts/utils/receiptSource.ts`. A restauração continua aplicando o mesmo mapper somente quando `draft.items` é uma lista; reconstrução e rateio subsequentes permanecem na mesma sequência.

### Arquivos afetados

- `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx`
- `mobile/src/features/stock/receipts/utils/receiptSource.ts`
- `docs/auditorias/inventario-arquivos-grandes.md`
- `docs/fiscal/README.md`

### Revisão estática

- O corpo foi comparado ao baseline: precedência dos campos persistidos/snapshot, fallbacks, `Number`/`String`, campos opcionais fiscais e custo total estão iguais.
- A chamada permanece em `draft.items.map(normalizeReceiptDraftItem)` sob a mesma guarda; os demais consumidores e exports públicos de `NewGoodsReceiptModal` não mudaram.
- O modal ficou com 1.227 linhas e `receiptSource.ts` com 361. Não houve mudança nos passos ou ações disponíveis ao estoquista; o guia prático permanece aplicável.

Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta, chamada externa ou operação fiscal foi realizada.

## Apresentação responsiva dos resultados do catálogo NCM extraída

### Causa

`NcmManagementPanel.tsx` misturava a apresentação dos resultados de NCM em cartões mobile e tabela desktop com a coordenação de consultas, filtros, sincronização e revisão. A mudança é estrutural e não altera os critérios nem as ações do catálogo.

### Solução

O tipo `NcmRow`, a classificação visual de situação e as duas apresentações de resultados foram movidos para `NcmCatalogResults.tsx`. O painel fornece as linhas, estado de carregamento, permissão e callbacks; estado, validação, consultas, ações e paginação seguem no componente proprietário.

### Arquivos afetados

- `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:13,19-29,65-69,515-521`
- `erp/src/pages/App/Settings/components/fiscal/NcmCatalogResults.tsx:1-183` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md:6,432`
- `docs/fiscal/README.md:8`
- `docs/fiscal/historico-correcoes-2026-11-05.md:182` (este registro)

### Revisão estática

- Os blocos mobile e desktop foram comparados com o anterior: textos, classes, estados vazio/carregando, badges, condições de situação e permissões, elegibilidade para ativação e callbacks foram preservados.
- `NcmManagementPanel` mantém seu export e os chamadores em `NcmCatalogPage`, `FiscalSettingsSection` e no teste existente. Consultas/RPCs, resolver Zod, filtros, handlers de revisão e paginação de 15 registros não foram movidos nem alterados.
- O painel ficou com 920 linhas e o novo componente tem 184. A interface do operador não mudou, então o guia do Estoque não precisou de atualização.

Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma chamada externa ou operação fiscal foi realizada.

## Menu de ações dos recebimentos extraído

### Causa

`ReceiptsScreen.tsx` combinava a apresentação condicional do menu de ações por status com a coordenação da lista de recebimentos. A alteração é estrutural; não muda as ações disponíveis nem critérios de recebimento ou elegibilidade fiscal.

### Solução

O modal e suas opções por status foram extraídos para `ReceiptActionsMenu.tsx`. A tela mantém o estado do menu, a elegibilidade de impressão e de desfazer estorno, além dos callbacks que abrem formulários ou apresentam as confirmações existentes.

### Arquivos afetados

- `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx:25,114-159,359-378`
- `mobile/src/features/stock/receipts/screens/ReceiptActionsMenu.tsx:1-162` (novo)
- `docs/auditorias/inventario-arquivos-grandes.md:6,473`
- `docs/fiscal/README.md:8`
- `docs/fiscal/historico-correcoes-2026-11-05.md:208-232` (este registro)

### Revisão estática

- Foram comparadas as condições por status/rascunho, ordem e rótulos das ações, ícones, estilos, mensagens, estados desabilitados e atributos de acessibilidade; o JSX permanece na mesma posição relativa à lista e ao modal de confirmação.
- Cada callback conserva a ordem anterior para fechar o menu, preparar edição/retomada ou abrir a confirmação. A guarda de impressão e a chamada de etiquetas continuam na tela; a consulta de elegibilidade continua no hook existente.
- `ReceiptsScreen` mantém o mesmo export e o chamador `NativeStockScreen.tsx`/barrel não mudou. A tela ficou com 505 linhas e o componente tem 162; o catálogo foi reconciliado em 63 arquivos acima de 500 linhas.
- Nenhum passo ou regra operacional do estoquista foi alterado, então o guia prático permanece aplicável.

Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta, chamada externa ou operação fiscal foi executada.

## Projeção de detalhes técnicos fiscais extraída

### Causa

`fiscalIssuePresentation.ts` reunia a classificação principal da mensagem ao usuário com a projeção separada dos metadados técnicos destinados aos detalhes de suporte. A alteração é estrutural; não muda classificação, emissão, transmissão, consulta ou persistência fiscal.

### Solução

O tipo de entrada `FiscalIssueResult`, o tipo `FiscalIssueTechnicalDetails` e `getFiscalIssueTechnicalDetails` foram movidos para `fiscalIssueResultDetails.ts`. `fiscalIssuePresentation.ts` importa o tipo de entrada e reexporta os dois tipos e a função, preservando a API existente dos consumidores.

### Arquivos afetados

- `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts:15-21` (fachada adicionada; blocos removidos do baseline: `44-60`, `69-109` e `544-586`)
- `erp/src/pages/utils/nfe/fiscalIssueResultDetails.ts:1-100` (novo)
- `erp/src/pages/App/FiscalDocuments/utils/fiscalFormatters.ts` e `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeFiscalIssueModal.tsx` (chamadores conferidos; sem alteração)
- `erp/src/pages/utils/nfe/__tests__/fiscalIssuePresentation.test.ts` (contratos existentes conferidos; não executado)
- `docs/auditorias/inventario-arquivos-grandes.md:6-7,464`
- `docs/fiscal/README.md:8`
- `docs/fiscal/historico-correcoes-2026-11-05.md:235-261` (este registro)

### Revisão estática

- Os tipos e o corpo do mapper foram comparados com o baseline. A precedência `technicalDetails`/resultado, fallbacks de transporte, códigos, número, ambiente e modelo, inclusão condicional de campos e retorno `undefined` para objeto vazio permanecem iguais.
- O export de `getFiscalIssuePresentation` e a API de `FiscalIssueResult`, `FiscalIssueTechnicalDetails` e `getFiscalIssueTechnicalDetails` continuam disponíveis pelo caminho original. Formatadores, componentes fiscais e teste existente ainda importam da fachada; nenhum chamador precisou mudar.
- A fachada ficou com 504 linhas e o novo módulo com 100. Nenhuma regra da interface ou operação fiscal foi alterada.

Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma consulta ou chamada externa foi realizada.
