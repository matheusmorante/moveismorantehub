# Histórico de correções fiscais — 28/10/2026

## Destinatário identificado da NF na linha/card da lista

### Problema e sintomas observados

Uma NF com destinatário identificado no próprio documento aparecia na lista de NF de saída como “Consumidor final”. Os detalhes da NF mostravam o nome e os dados do cliente corretamente.

### Causa raiz técnica

A linha e o card da lista usavam somente `destinatario_nome` e `destinatario_documento` da consulta resumida de `nfe_documents`. Quando o nome estava vazio ou salvo como rótulo genérico, os componentes exibiam “Consumidor final”. Já os detalhes leem o XML persistido e extraem o destinatário por `parseFiscalXmlDetails`, que contém a identificação usada na nota.

### Arquivos e linhas alterados

- `erp/src/pages/App/FiscalDocuments/services/fiscalDocuments/fiscalDocumentsListService.ts:9,45-89,251,254-258` — para registros da página com nome vazio/genérico ou documento ausente, carrega o XML persistido com timeout e completa os campos-resumo usando o mesmo parser dos detalhes.
- `docs/fiscal/README.md:3,10` — atualiza a data do índice e inclui esta correção nas referências atuais.
- `docs/fiscal/historico-correcoes-2026-10-28.md:1-26` — registra o sintoma, causa, solução e validação desta correção.

### Solução implementada

A lista consulta o XML apenas dos documentos exibidos cuja identificação resumida esteja incompleta ou genérica. Nome e CPF/CNPJ são recuperados do próprio XML fiscal; quando o XML não identifica destinatário, permanece o comportamento atual da lista. Nenhum dado fiscal é regravado, e a emissão da NF não foi alterada.

### Testes e validações

- Revisão estática confirmou que a linha e o card continuam usando os campos do registro entregue pela lista, agora completados pelo parser já usado nos detalhes. A leitura adicional do XML tem timeout de 8 segundos.
- Nenhum teste automatizado foi adicionado ou executado nesta correção. Não houve leitura ou escrita no Supabase operacional, migration, alteração de XML, transmissão à SEFAZ ou deploy.

## Exportação contábil exclui notas fiscais canceladas

### Problema e sintomas observados

O modo “Contabilidade” da exportação de NF de saída incluía notas canceladas na prévia, no ZIP e no relatório de conferência.

### Causa raiz técnica

Os valores iniciais do formulário e a troca para a finalidade contábil selecionavam `autorizada` e `cancelada`. A validação da API também aceitava os dois status para `purpose: 'accounting'`. Além disso, a paginação podia anexar uma NF cancelada como documento de referência de uma saída selecionada.

### Arquivos e linhas alterados

- `erp/src/pages/App/FiscalDocuments/modals/FiscalExportModal.tsx:71,171-175,250,326` — remove canceladas do padrão e das opções contábeis e atualiza o texto explicativo; filtros personalizados continuam incluindo situações canceladas quando escolhidos.
- `api/nfe/export-documents.ts:82-83,205-212,376-378` — valida que a contabilidade contenha apenas `autorizada` e exclui NF cancelada também dos documentos de referência e eventos associados.
- `docs/fiscal/README.md:9` — indexa esta correção nas referências atuais.
- `docs/fiscal/historico-correcoes-2026-10-28.md:29-52` — registra o sintoma, causa, solução e validação.

### Solução implementada

O modo contábil agora seleciona e apresenta somente notas autorizadas em Produção. A API valida a mesma regra antes da prévia, paginação e geração do ZIP, e omite originais canceladas anexadas como contexto e seus eventos. Assim, uma NF cancelada não entra no ZIP nem no relatório, inclusive por vínculo. A exportação personalizada permanece com seus filtros de status próprios.

### Testes e validações

- Revisão estática confirmou o filtro de documentos principais, referências vinculadas e eventos associados na prévia e exportação contábil; `.in('status', filters.statuses)` recebe somente `autorizada` nesse modo.
- Nenhum teste automatizado foi adicionado ou executado. Não houve consulta ou escrita no Supabase operacional, alteração de schema, XML, emissão, transmissão à SEFAZ ou deploy.

## A linha da NF abre detalhes e o pedido vinculado abre consulta

### Problema e sintomas observados

Na lista de NF de saída, clicar no código do pedido de origem levava à edição do pedido. Clicar no restante da linha da NF não abria os detalhes fiscais, que só eram acessíveis pelo botão de ações.

### Causa raiz técnica

`FiscalDocumentRow` e `FiscalDocumentCard` navegavam para `/sales-order/edit/:id` no clique do código do pedido e não tinham ação de clique para a NF. A página já possuía o modal de detalhes fiscais e o ERP já oferece `OrderDetailsModal` em modo somente leitura, mas esses fluxos não estavam ligados aos elementos da lista.

### Arquivos e linhas alterados

- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentRow.tsx:1-2,21-25,44-77,116-125` — torna a linha focalizável e clicável para abrir os detalhes da NF, ignora elementos interativos e encaminha o código do pedido para consulta.
- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentCard.tsx:1-2,17-21,27-62,109-120` — aplica as mesmas interações ao card responsivo.
- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsTable.tsx:20-24,42-47,83-90` — conecta cada pedido da lista ao callback de consulta.
- `erp/src/pages/App/FiscalDocuments/index.tsx:15-18,65-69,110-134,330-334,426-435` — busca o pedido com timeout de 15 segundos, exibe o modal em modo somente leitura e mantém o modal fiscal da NF conectado ao clique da linha/card.
- `docs/fiscal/README.md:9` — adiciona esta correção às referências atuais.
- `docs/fiscal/historico-correcoes-2026-10-28.md:54-80` — registra o problema, causa, solução e validação.

### Solução implementada

O código do pedido agora busca o pedido vinculado e abre `OrderDetailsModal` com `isReadOnly`, sem enviar o operador à edição. O clique nas demais áreas da linha ou card abre `IssuedFiscalDocumentDetailsModal`. Cliques em botões e demais controles internos continuam restritos à ação própria, sem propagar para os detalhes da NF. A busca do pedido tem fallback após 15 segundos.

### Testes e validações

- Revisão estática confirmou que os dois layouts usam os mesmos callbacks e que os controles internos não propagam o clique para a abertura dos detalhes da NF. `git diff --check` foi executado sem erros.
- Nenhum teste automatizado foi adicionado ou executado. Não houve consulta ou escrita no Supabase operacional, alteração de schema, XML, emissão, transmissão à SEFAZ ou deploy.

## Modal de confirmação para salvar produto com perda de conformidade do Catálogo Digital

### Problema e sintomas observados

Ao editar um produto publicado, se uma alteração fizesse o produto deixar de atender aos requisitos obrigatórios do Catálogo Digital (por exemplo, desativar característica da categoria, remover fotos, descrição, preço ou dimensões), o modal de confirmação para ocultar do catálogo ou não abria (bloqueando o salvamento com toast genérico quando `missingCategoryCharacteristics` era vazio) ou exibia uma mensagem muito resumida que não explicava adequadamente o motivo da ocultação, não orientava sobre como ajustar a conformidade para manter o produto publicado, nem detalhava de forma estruturada cada campo e o que faltou preencher.

### Causa raiz técnica

Em `useProductFormSubmit.ts` (ERP) e `ProductFormScreen.tsx` (Mobile), a condição `validatePublishedCatalogEdit && !ecomVal.isLegible` continha uma guarda que retornava erro por toast/Alert quando `missingCategoryCharacteristics.length === 0`, impedindo a exibição do modal de confirmação para pendências de fotos, descrição, preço e dimensões. Quando havia características da categoria faltantes, a mensagem gerada era apenas `${characteristicMessage} Se confirmar, as alterações serão salvas e o produto será ocultado do Catálogo Digital.`, sem explicar o motivo técnico de não conformidade, sem instruir o operador a clicar em "Continuar editando" para ajustar a conformidade do campo, e sem listar de modo discriminado todos os campos com pendência e o que faltou em cada um.

### Arquivos e linhas alterados

- `shared-utils/catalogPublication/` — modularização limpa da validação de catálogo aplicando Single Responsibility Principle (SRP):
  - `types.ts` — contratos de prontidão, requisitos de categoria e issues do modal.
  - `characteristicValues.ts` — normalização de chaves, leitura segura de características e checagens numéricas positivas.
  - `categoryCharacteristics.ts` — cálculo de características obrigatórias da categoria e resolução de dependências condicionais (`getMissingCategoryRequiredCharacteristics`).
  - `legibilityValidation.ts` — verificação de legibilidade completa do produto para o catálogo (`checkEcomLegibility`).
  - `publicationActionValidation.ts` — validação de gates de publicação (`validateCatalogPublication`).
  - `editConfirmation.ts` — mapeamento de não conformidades e construção da mensagem explicativa estruturada (`getPublishedCatalogEditIssues`, `buildPublishedCatalogEditConfirmationMessage`).
  - `index.ts` — agregação e reexportação completa do submódulo.
- `shared-utils/catalogPublicationValidation.ts:1-12` — convertido em Facade canônica preservando 100% de compatibilidade retrógrada para todos os consumidores.
- `mobile/src/features/products/domain/mobilePublishedCatalogConfirmation.ts:1-74` — novo serviço/helper de domínio que isola a lógica de verificação e o alerta nativo de confirmação de edição publicada (`verifyAndConfirmMobilePublishedCatalogEdit`), desacoplando a tela de regras de I/O e modal.
- `mobile/src/features/products/screens/ProductFormScreen.tsx:88,1043-1048` — simplificado com a delegação ao helper `verifyAndConfirmMobilePublishedCatalogEdit`, removendo lógica inline de rede, alertas e imports acoplados.
- `erp/src/pages/App/Products/ProductList/hooks/actions/useProductsCatalogActions.ts:1-213` — refatorado com princípios de Clean Code: helper `isUuid`, tipagem explícita (`ResolvedCatalogEntities`), documentação detalhada e organização clara do fluxo de resolução de entidades e persistência em cascata.
- `erp/src/pages/App/Products/domain/productLegibilityRules.ts:13-17` — reexporta `buildPublishedCatalogEditConfirmationMessage`, `getPublishedCatalogEditIssues` e tipos para consumo do ERP.
- `mobile/src/features/products/domain/productRegistrationRules.ts:16-21,98-102` — reexporta as funções compartilhadas para consumo do app móvel.
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts:6,212-225` — substitui a mensagem simplificada e a guarda de características vazias pela mensagem detalhada compartilhada no `Swal.fire`.
- `erp/src/pages/App/Products/ProductList/hooks/actions/catalogPublicationValidation.test.ts:7,445-535` — adiciona 3 novos testes unitários cobrindo citação de característica única, múltiplos campos pendentes e validação de preço promocional.
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx:283-290,323-356` — valida a exibição da mensagem explicativa no `Swal.fire` e adiciona teste de alteração em produto publicado sem descrição.
- `erp/tests/mobile-forms/ProductFormScreen.catalogConfirmation.test.tsx:327-340` — valida que o `Alert.alert` recebe a explicação de ocultação e a orientação de ajuste de conformidade do campo.
- `docs/fiscal/README.md:9` — indexa o registro na seção de referências atuais.
- `docs/fiscal/historico-correcoes-2026-10-28.md:82-120` — documentação obrigatória do histórico de correções.

### Solução implementada

1. **Modularização e Clean Architecture em `shared-utils/catalogPublication/`**: a implementação antes concentrada em um arquivo monolítico de mais de 1000 linhas foi dividida em módulos coesos e focados com responsabilidade única (`types`, `characteristicValues`, `categoryCharacteristics`, `legibilityValidation`, `publicationActionValidation`, `editConfirmation`). A fachada `shared-utils/catalogPublicationValidation.ts` reexporta o pacote completo, garantindo compatibilidade total sem quebras.
2. **Desacoplamento em `ProductFormScreen.tsx`**: a rotina de checagem com timeout, consulta de características obrigatórias da categoria e exibição do alerta nativo de confirmação de edição publicada foi extraída para o módulo de domínio `mobilePublishedCatalogConfirmation.ts`, limpando o componente de formulário móvel.
3. **Refatoração de `useProductsCatalogActions.ts`**: código estruturado com extração de utilitários como `isUuid`, tipagem explícita de retorno e separação evidente das 4 etapas de busca de entidades e da sincronização em cascata de status para produtos e variações.
4. **Mensagens estruturadas de conformidade**: o modal de confirmação no ERP (`Swal.fire`) e no app mobile (`Alert.alert`) detalha o motivo da ocultação, cita cada campo faltante individualmente com marcadores e orienta sobre como deixá-lo correto ajustando a conformidade antes de salvar.

### Testes e validações

- Vitest ERP unitário: `catalogPublicationValidation.test.ts` (14/14 testes aprovados).
- Vitest ERP catálogo ações: `useProductsCatalogActions.test.ts` (3/3 testes aprovados).
- Vitest ERP formulário: `useProductFormSubmit.test.tsx` (27/27 testes aprovados).
- Vitest Mobile forms: `ProductFormScreen.catalogConfirmation.test.tsx` (6/6 testes aprovados).
- Nenhuma regressão identificada. Nenhum schema ou dados do Supabase remoto foram modificados. Não houve transmissão SEFAZ.
