# Histórico de correções fiscais — 13/11/2026

## Finalização de pedido de venda sem leituras serializadas e recálculo repetido do painel

- **Problema identificado e sintomas:** ao clicar em **Finalizar** no formulário de pedido de venda, o modal pós-venda demorava cerca de sete segundos para aparecer. O modal já é aberto imediatamente após a gravação; o tempo de espera estava na preparação e na RPC de persistência do pedido.
- **Causa raiz técnica comprovada:** na edição de um rascunho, a leitura do pedido e a verificação de produtos com composição eram feitas em série antes da RPC. Na criação, a mesma verificação precedia duas preparações independentes. No banco operacional, o trigger legado `orders_dashboard_metrics_refresh` recalculava duas vezes o mesmo dia em cada `UPDATE` do pedido, porque processava `OLD` e `NEW` separadamente; a RPC de finalização atualiza o pedido duas vezes. Logs agregados das últimas 24 horas antes da correção mostraram 141 respostas bem-sucedidas da RPC de pedido, com mediana de 1.475 ms, p90 de 4.084 ms e p95 de 5.486 ms. São medições da RPC, sem dados pessoais e sem representar o tempo completo da interface.
- **Arquivos e linhas modificados:**
  - `erp/src/pages/utils/orderMutation/orderCreationService.ts:38-49` — validação de composição em paralelo com os snapshots do cliente e dos itens.
  - `erp/src/pages/utils/orderMutation/orderUpdateService.ts:142-168,189-199` — leitura do rascunho e validação de composição em paralelo; projeção explícita das colunas necessárias à verificação da transição e à preservação do snapshot.
  - `erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts:95-106,187-216` — mock da consulta real de produtos e teste de simultaneidade sem antecipar a gravação.
  - `supabase/migrations/20261113185904_deduplicate_legacy_dashboard_order_refresh.sql:1-67` — precondições de versão/fonte do trigger e eliminação do recálculo duplicado quando a data anterior e a nova são iguais.
- **Solução técnica implementada:** o formulário mantém a mesma gravação atômica e só mostra o modal quando recebe sucesso da RPC. Leituras independentes deixam de bloquear umas às outras. O trigger continua atualizando as métricas legadas, inclusive em inserção, exclusão, mudança de data e transição de pedido de teste; para um `UPDATE` comum da mesma data, chama o recálculo uma vez em vez de duas. A migration foi aplicada ao projeto operacional `hkoxhourxwlddgsfdgws` com versão remota `20261113185904`. Não houve mudança de emissão ou transmissão fiscal.
- **Testes e validações:** as suítes focadas passaram com 29/29 testes de persistência, 31/31 do formulário, 12/12 do modal pós-venda e 8/8 de autosave; lint focado e build do ERP passaram. Antes da correção dos mocks, 12 testes da suíte de persistência falhavam por não simular a consulta de produtos já existente no código. Uma execução adicional de `orderModalBehavior.test.tsx` ficou em 4/5 por uma expectativa de estilo no carregamento do modal de edição, fora do caminho do modal pós-venda. A verificação remota confirmou o novo hash da função `cbbb3931c377fbf35dd7040801261c23`, o histórico da migration e o mesmo fingerprint das 209 linhas de métricas antes e depois (`c018bacaefd9671d80663e7de5ed42ae`). Entre 18:59:04 e 19:09:42 UTC, os logs não registraram nova chamada à RPC de pedido, portanto ainda não há amostra pós-correção. Não foi criado pedido de teste nem emitida NF. Sem uma finalização real controlada após a alteração, não há comprovação de que todas as operações concluirão em até dois segundos; a latência externa e eventuais autosaves em andamento ainda influenciam o tempo.

## Padronização visual dos seletores fiscais de NCM

- **Problema identificado e sintomas:** os campos pesquisáveis de NCM não indicavam a seleção confirmada da mesma forma que os demais seletores do ERP. Um campo não mostrava check; outro usava estilos inconsistentes enquanto apresentava o código já associado à descrição fiscal.
- **Causa raiz técnica comprovada:** `ProductNcmSelector` e `NcmSelect` implementavam estados visuais próprios. A apresentação de um código válido e confirmado não era identificada de forma uniforme e não seguia o padrão visual solicitado para campos selecionados.
- **Arquivos e linhas modificados:**
  - `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:224-240` — borda inferior verde e check para NCM com descrição confirmada, mantendo prioridade para erro de validação.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.tsx:186-215` — borda inferior verde e check para NCM válido com descrição, preservando a seta que abre a lista de opções.
- **Solução técnica implementada:** os dois campos usam a descrição confirmada como estado de seleção. Esse estado exibe a borda inferior verde, o ícone de check e texto em cor neutra; erros continuam com a indicação vermelha e a abertura do seletor permanece disponível. Nenhuma regra de classificação, validação, persistência ou transmissão fiscal foi alterada.
- **Testes e validações:** não foram executados testes automatizados nem transmissão fiscal; a alteração fiscal limita-se à apresentação. Foi executada a verificação estática `git diff --check`, sem erros de whitespace.

## Bordas do DANFE NFC-e A4 preservadas na escala de impressão de 100%

- **Problema identificado e sintomas:** ao imprimir o DANFE NFC-e A4 em escala de 100%, algumas linhas de borda desapareciam; reduzir a escala fazia as linhas voltarem.
- **Causa raiz técnica identificada no código:** o CSS reservava margens de 5 mm e dimensionava a página interna para os 200 × 287 mm restantes. Assim, as bordas ficavam próximas do limite físico de impressão; reduzir a escala criava a folga que faltava. A paginação media esses mesmos 200 × 287 mm, então corrigir apenas o `@page` deixaria o cálculo de quebras incompatível com a área impressa.
- **Arquivos e linhas modificados:**
  - `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts:6,549-562,608` — margens A4 de 6 mm; largura/altura de medição e impressão ajustadas para 198 × 285 mm.
  - `erp/src/pages/utils/nfe/danfe/danfeNfceA4PaginationScript.ts:20` — largura do host de medição alinhada a 198 mm para o cálculo de paginação e quebra de informações complementares.
- **Solução técnica implementada:** o DANFE passa a reservar 1 mm adicional em cada lado da folha, mantendo escala física de 100%; a paginação mede a mesma área útil de 198 × 285 mm usada pela impressão. O formato A4, os dados fiscais, as bordas e o conteúdo do documento permanecem intactos.
- **Testes e validações:** testes automatizados e validação visual com impressora não foram executados. Foi feita revisão estática das dimensões CSS e do host de medição para confirmar a correspondência com a nova área A4; nenhuma emissão, transmissão, chamada externa ou consulta ao banco foi realizada.

## Linhas de separação dos itens no DANFE NFC-e A4

- **Problema identificado e sintomas:** as linhas vazias usadas para completar a área da tabela mostravam divisórias horizontais; as linhas dos itens precisavam usar separadores horizontais tracejados.
- **Causa raiz técnica identificada no código:** as células `td` recebiam borda sólida genérica, e a classe `.table-fill-row` ajustava altura e espaçamento sem remover as bordas horizontais. As linhas de itens também herdavam a mesma borda sólida em todos os lados.
- **Arquivos e linhas modificados:** `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts:275-296`.
- **Solução técnica implementada:** linhas reais do `tbody` mantêm as bordas verticais sólidas e passam a ter bordas horizontais tracejadas. Linhas `.table-fill-row` removem as bordas de cima e de baixo, mantendo apenas as divisórias verticais das colunas.
- **Testes e validações:** testes automatizados e impressão visual não foram executados. A revisão estática confirmou que o seletor de linha vazia só atinge `.table-fill-row` e que as células das colunas mantêm as bordas laterais; `git diff --check` foi executado sem erros de whitespace. Nenhuma emissão, transmissão, chamada externa ou consulta ao banco foi realizada.

## Títulos de seção no estilo do DANFE de referência

- **Problema identificado e sintomas:** os títulos de seção nos DANFEs NF-e A4 e NFC-e A4 apareciam como caixas completas, em vez de títulos sem moldura com uma linha inferior quando seguidos pelos campos/subtópicos.
- **Causa raiz técnica identificada no código:** os títulos do NF-e eram células com borda e fundo aplicados inline; os títulos de seção do NFC-e A4 usavam borda nos quatro lados. O bloco de dados adicionais do NF-e também não tinha um título principal separado dos dois subtópicos.
- **Arquivos e linhas modificados:**
  - `erp/src/pages/utils/nfe/danfe/danfeStyles.ts:54-65` — estilo comum para título de seção sem caixa e com linha inferior.
  - `erp/src/pages/utils/nfe/danfe/danfeRecipient.ts:61`, `danfeTaxesAndTotals.ts:58,72`, `danfeTransport.ts:58` e `erp/src/pages/utils/nfe/danfeGenerator.ts:136` — aplicação do estilo aos títulos de seção do DANFE NF-e A4.
  - `erp/src/pages/utils/nfe/danfe/danfeAdditionalInfo.ts:28-38` — título principal “Dados Adicionais” separado dos campos “Informações Complementares” e “Reservado ao Fisco”.
  - `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts:199-213` — títulos de seção e de produtos do DANFE NFC-e A4 sem moldura, com linha inferior.
- **Solução técnica implementada:** os títulos principais agora aparecem sem preenchimento ou borda lateral/superior, com uma linha abaixo. As células que contêm campos e subtópicos continuam com a grade de separação da referência; os dados, cálculos, tabela de itens e formato térmico não foram alterados.
- **Testes e validações:** testes automatizados e impressão visual não foram executados. `git diff --check` foi executado; nenhuma emissão, transmissão, chamada externa ou consulta ao banco foi realizada.
