# Histórico fiscal — 05/11/2026

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
