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
