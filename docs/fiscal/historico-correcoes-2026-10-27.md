# Edição de pedido após cancelamento da emissão fiscal

**Data:** 27/10/2026

**Escopo:** preparação/cancelamento da emissão fiscal e edição de pedido no ERP.

## Problema e sintomas

Ao abrir a emissão de NF, preencher campos e fechar sem emitir, o usuário podia receber ao salvar o pedido: “O pedido mudou durante a conferência fiscal. Reabra a edição para revisar os dados atuais.” A edição usava a versão que já estava carregada na lista antes de a preparação fiscal atualizar o pedido.

Além disso, o autosave do modal escrevia o documento do destinatário em `customerData` em Produção e a finalidade da compra em `fiscalContext`. Esses campos pertencem aos dados comerciais/fiscais persistidos do pedido, embora fossem preenchidos apenas para preparar a emissão.

## Causa raiz comprovada

O fluxo de escolha do ambiente chama `prepareOrderFiscalSnapshotForEmission`, que pode persistir os snapshots fiscais dos itens e avançar `updated_at`. A lista de pedidos não atualiza a cópia já aberta no cliente. `useOrderEditLoader` preferia a prop antiga e só buscava do banco quando recebia apenas um ID; o salvamento versionado então retornava `ORDER_VERSION_CONFLICT`, apresentado como pedido alterado durante a conferência fiscal.

O autosave também tratava campos transitórios do emissor como campos comerciais. A correção separa esses valores por ambiente em `nfeDraft` e restaura o rascunho inicial ao fechar sem sucesso ou tentativa pendente.

## Arquivos alterados

- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditLoader.ts:27-107` — busca a versão persistida antes de abrir a edição, limita a espera a 15 segundos e expõe erro de carregamento em vez de permitir salvar a versão antiga.
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx:41,106-115` — apresenta o erro e permite fechar se não foi possível obter a versão atual.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeDraftService.ts:6-47` — grava documento, finalidade e itens de preparação somente em `nfeDraft` do ambiente selecionado.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfePreparationForms.ts:42-54,105-205` — captura o rascunho inicial, aguarda autosaves pendentes e restaura somente os campos do rascunho que o modal alterou, preservando mudanças simultâneas em outros campos.
- `erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx:151-157,259,310,362` — aplica a rotina de cancelamento ao fechar pelo cabeçalho, painéis ou rodapé; emissões concluídas ou pendentes preservam seus dados.
- `erp/src/pages/types/order.type.ts:142` — tipa a finalidade de compra no rascunho fiscal por ambiente.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts:92-117` — cobre recarga da versão persistida antes da edição.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx:327-388,1826-1894` — cobre restauração de rascunho, cancelamento pelo rodapé e persistência isolada da finalidade.
- `docs/fiscal/README.md:3,7-11` — atualiza a data de reconciliação e adiciona esta referência.

## Solução implementada

O editor busca o pedido atual pelo ID, mesmo quando recebe uma cópia da lista. A edição só começa após a resposta atual ser carregada; se a consulta falhar ou exceder o prazo, a interface mostra um erro e não tenta salvar dados obsoletos.

Os campos do emissor ficam no rascunho do ambiente e não alteram `customerData`, `fiscalContext` ou os itens comerciais. Se o operador fecha antes de uma emissão concluída ou pendente, o modal aguarda seus autosaves, busca novamente o pedido e restaura o rascunho que existia ao abrir. Se não conseguir confirmar essa restauração, mantém o modal aberto e informa o problema.

## Validação

- Suíte `orderEditModalModules.test.ts`: 9 testes aprovados.
- Testes focados de finalidade, salvamento em fila e cancelamento do rascunho, incluindo fechar pelo rodapé: 5 testes aprovados.
- Suíte completa `useNfeEmission.test.tsx`: 106 aprovados e 1 falha no caso “exige CPF/CNPJ para NFC-e não presencial, mesmo abaixo de R$ 10.000”. Esse teste espera a mensagem de entrega sem selecionar “Informar entrega?” no modal; a falha não envolve o fluxo de edição/cancelamento alterado.
- ESLint direcionado não iniciou: a resolução de dependências falhou em `zod-validation-error`, que não exporta o subcaminho `./v4` solicitado pelo ESLint 10.
- `npx tsc --noEmit --project tsconfig.json` segue bloqueado por erros existentes de fixtures incompletas no módulo de pedidos e por incompatibilidades de tipos no fluxo do formulário; a repetição após a correção não apontou erros no carregador ou nos hooks de emissão alterados.
- `git diff --check` passou. Não houve escrita em banco remoto, migration ou transmissão à SEFAZ.

## Leitura de QR fora do quadrado e sequência rápida no scanner

**Data:** 27/10/2026

**Escopo:** região visual e sequência de leituras no scanner compartilhado do ERP e no scanner móvel de inventário. A leitura da chave de acesso e seus critérios fiscais permanecem iguais.

### Problema e sintomas

No modo QR do ERP, o leitor limitava a detecção ao `qrbox` quadrado central; no app, o scanner de inventário descartava leituras quando os cantos do código ficavam fora do quadrado desenhado. O intervalo configurável de leituras e a janela de 1,5 segundo no scanner móvel também impediam leitura imediata do mesmo payload. No ERP, códigos diferentes detectados enquanto um processamento estava em andamento eram descartados.

### Causa raiz comprovada

`Html5Qrcode.start` recebia uma região `qrbox` para todos os formatos, e o scanner móvel aplicava `isBarcodeWithinScannerFrame` antes de chamar a contagem. A configuração `scannerConfig.delay` era comparada ao payload mais recente no ERP; o app mantinha uma janela temporal por payload. O callback web retornava imediatamente enquanto outro estava ativo, embora a interface móvel já enfileirasse payloads distintos.

### Arquivos alterados

- `erp/src/components/shared/QRScannerModal.tsx:57-64,87-90,112-160,192-239` — remove o intervalo temporal, deixa QR usar toda a prévia, serializa leituras diferentes e descarta a fila quando a câmera para.
- `erp/src/pages/App/Settings/components/operations/ScannerConfigSection.tsx:9-12` — remove o controle sem efeito útil de intervalo; mantém beep e vibração. O campo legado continua aceito no JSON persistido por compatibilidade, mas deixou de controlar o scanner.
- `mobile/src/features/stock/inventory/screens/InventoryScannerScreen.tsx:21-27,34-40,82-89,159-191,257-335` — remove o filtro geométrico e a janela temporal; preserva fila/antirrepetição enquanto um payload está pendente e mantém o quadrado visual como referência.
- `mobile/src/features/stock/inventory/screens/InventoryOperationScreenContent.tsx:239` — renomeia a opção visual `restrictToScannerFrame` para `inventoryLayout`, sem alterar cabeçalho, tamanho ou desenho do quadrado.
- `docs/estoque/guia-pratico/gerar_guia.py:598`, `docs/estoque/guia-pratico/README.md:87` e `docs/fiscal/README.md:10` — explica que o quadrado serve para posicionar, que QRs podem ser lidos fora dele, que etiquetas diferentes podem ser lidas sem intervalo e que unidade física já contada não incrementa de novo; inclui o histórico no índice vigente.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias geradas e sincronizadas, com instrução atualizada na página 22.

### Solução implementada

O quadrado continua visível no ERP e no app, mas a detecção QR usa toda a área da câmera e não depende de os quatro cantos estarem dentro da moldura. O ERP mantém uma trava de processamento único e enfileira payloads distintos enquanto a leitura anterior termina; no app, a fila que já existia fica sem o bloqueio de 1,5 segundo. Payloads ainda pendentes são deduplicados para evitar filas repetidas. O inventário identifica cada unidade pela etiqueta física e continua ignorando uma etiqueta já contabilizada. O controle de intervalo foi removido da tela de configurações; beep e vibração seguem configuráveis.

### Validação

- Revisão estática dos caminhos de detecção, fila, interrupção da câmera e preservação da moldura; `git diff --check` aprovado.
- Não foram executados testes automatizados nem sessões de scanner por Playwright/Maestro nesta alteração.
- Guia regenerado em 27 páginas. Página 22 renderizada e revisada visualmente; ambas as cópias têm o mesmo hash. O acesso pelo submenu Estoque continua no caminho existente. A revisão Expo Web, se usada, não provaria comportamento nativo.
- Nenhuma alteração de dados, migration, operação fiscal ou transmissão à SEFAZ foi realizada.

## Confirmação da memória do código do fornecedor nos vínculos da NF-e

**Data:** 27/10/2026

**Escopo:** associação individual de produto/variação à linha de uma NF-e de entrada no modal **Gerenciar vínculos** do app. O contrato de importação, o XML original e a entrada de estoque permanecem inalterados.

### Problema e causa comprovada

No ERP, a seleção passa pelo schema RHF/Zod de vínculo, salva a memória `(supplier_id, supplier_product_code)`, consulta novamente o registro e só então aplica o produto/variação à nota. A remoção também valida antes de excluir e confere que a memória deixou de existir.

No app, a seleção gravava primeiro a associação da nota e tratava a memória do código como melhor esforço; se essa segunda gravação falhasse, a nota continuava vinculada. Na remoção, o código era apagado antes da validação do formulário proprietário e não havia confirmação da exclusão.

### Arquivos alterados

- `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundInvoiceMappings.ts:32-429` — valida seleção e item proprietário, confirma salvar/remover memória por leitura limitada e só então aplica a alteração da nota. Resultado incerto bloqueia repetição às cegas até reabrir o modal.
- `docs/estoque/guia-pratico/gerar_guia.py:414` — orienta reabrir Gerenciar vínculos quando uma tentativa ficar sem confirmação.
- `docs/estoque/guia-pratico/README.md:44` — registra a atualização da página 8; `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`, página 8 — artefatos entregues.
- `docs/fiscal/README.md:10` — adiciona esta referência atual; este histórico fica preservado como registro do ciclo.
- `docs/produtos/paridade-erp-app.md:6075-6099` e `docs/geral/roadmap_pendente.md:878` — evidência do ciclo de paridade e situação da validação.

### Solução e efeitos

Os formulários continuam usando seus schemas de domínio e o `zodResolver` real. Para o vínculo individual, o app valida seleção e nota antes do serviço, salva e relê a memória do fornecedor com prazo máximo e, somente se produto e variação corresponderem, atualiza a NF. Na remoção, valida primeiro, exclui e confirma a ausência do código antes de limpar a associação da NF. Produto composto não cria memória de código individual.

Falha ou timeout depois de iniciar uma escrita permanece como resultado incerto: o mesmo modal não permite repetir às cegas. A mensagem orienta reabrir **Gerenciar vínculos**, que recarrega a nota e as memórias. A sequência corresponde ao ERP e não presume rollback entre gravações separadas. Nenhuma chamada ao banco foi feita durante esta alteração; não houve fixture, DML, migration, recebimento ou transmissão à SEFAZ.

### Validação e limites

- Comparação estática de services, schemas, proprietário RHF/Zod, normalização e importação. `git diff --check` não encontrou erros de whitespace. O typecheck `mobile/node_modules/.bin/tsc.cmd --noEmit --project mobile/tsconfig.json` falhou por diagnósticos em arquivos não relacionados; não houve diagnóstico em `useInboundInvoiceMappings.ts`.
- Guia regenerado em 27 páginas; página 8 renderizada e revisada; os dois PDFs têm SHA-256 idêntico `9DFDA27B691C48AC24C50FB0D2FD7199EC1CF89009032E8A798AC5426A0D218D`.
- Nenhum teste Vitest/RTL, Playwright, Maestro, servidor, consulta/escrita remota, migration, operação fiscal/de estoque ou deploy foi executado nesta etapa.
- A revisão do código não comprova RLS, persistência remota ou atomicidade entre memória e NF; são gravações separadas, e a recuperação de resultado incerto depende de reler a nota pelo fluxo normal.
