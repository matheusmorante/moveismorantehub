# Inbox — erros na consulta de pedidos, 21/10/2026

## Estado da entrega

Correção técnica em preparação, ainda **não publicada**. A produção conferida nesta etapa continua em `dpl_ECK4N6TZDNtDXivdinz1Vwqqkdb6`, [Central de Atendimento](https://morantehub.vercel.app/atendimento). A autorização `call_eca8f155dada4ebaa762ff6a94203895` foi aplicada à publicação de leitura/cópia; não é autorização para substituir aquele candidato por este lote.

## Problema e causa comprovada

`getCustomerOrders` convertia erros devolvidos pela RPC e o prazo esgotado em `[]`. A aba mostrava “Nenhum pedido” sem uma consulta bem-sucedida. Rejeições de transporte escapavam do serviço e não eram tratadas no painel; os dados carregados para um cliente anterior podiam continuar no estado quando o novo cliente falhava. Quando o resumo comercial estava oculto por permissão, a ordem dos avisos também sugeria vincular cliente em vez de informar a restrição de acesso.

## Correção delimitada

- `erp/src/pages/utils/customerSupport/supportOrdersService.ts`: preserva RPC, argumentos e prazo de 15 segundos; separa vazio legítimo de recusa comercial, falha de transporte, timeout e resposta inválida. Os erros expostos são mensagens de domínio sem detalhe interno.
- `erp/src/pages/App/CustomerSupport/components/CustomerInfoPanel.tsx`: limpa dados do contexto anterior, trata a rejeição, encerra loading e permite repetir a consulta. Uma resposta de contexto descartado não sobrescreve o cliente atual.
- `erp/src/pages/App/CustomerSupport/components/infoPanel/CustomerOrdersTab.tsx`: informa primeiro a restrição comercial; mostra falha e botão “Tentar novamente”, sem confundir erro com ausência de pedidos. O loading usa região de status acessível.
- `customerSupportOrdersQuery.test.ts` e `customerSupportLinkForms.test.tsx`: regressões do contrato de erro, prazo, nova tentativa, troca de cliente, resposta atrasada e permissões.
- `erp/tests/support-readonly/support-login.spec.ts`: cenário opcional `SUPPORT_READONLY_ORDERS_PANEL=1` para abrir o painel da conversa própria retida, sem cliente, e conferir que não há consulta comercial.

A nova tentativa repete a consulta sem novos campos ou gravação. A consulta comercial, os critérios e o momento do carregamento permanecem os existentes. Sem migration, fixture, conta, despacho, alteração fiscal ou mudança no fluxo de abertura do pedido.

## Provas executadas

| Prova | Resultado | Registro |
| --- | --- | --- |
| Regressões antes da correção | 6 falhas e 11 aprovações, três rejeições sem tratamento | `scratch/central-support-orders-errors-before-2026-10-21.log` |
| Aviso de permissão com resumo oculto, antes | 1 falha e 11 casos não executados | `scratch/central-support-orders-permission-before-2026-10-21.log` |
| Serviço, painel e navegação, depois | 21/21 em três arquivos | `scratch/central-support-orders-errors-after-2026-10-21.log` |
| Seleção consolidada da Central | 243/243 em 24 arquivos, incluindo seis negativas anônimas remotas | `scratch/central-support-orders-errors-consolidated-2026-10-21.log` |

As duas execuções anteriores se sobrepõem e não são somadas. As regressões de consulta comercial usam transporte simulado no Vitest/RTL; não comprovam persistência ou execução positiva do PostgreSQL.

Playwright final visível: **1/1 em 11,2 segundos**, porta 5173, `scratch/central-support-orders-folder-readonly-ui-final-2026-10-21.log`. O clique normal no formulário vazio apresentou a validação real e permitiu cancelar; o filtro de atendente e a rolagem da lista foram exercitados. A conversa própria arquivada passou pelas guardas de identidade/manifesto; histórico e recusa de confirmação de leitura ficaram visíveis. A aba Pedidos abriu e fechou, informou ausência de vínculo e não fez nenhuma consulta de pedidos. Todas as gravações de negócio foram bloqueadas antes do banco. A prova não simula resposta comercial para uma conversa operacional nem comprova o erro/retry comercial no PostgreSQL.

Lint dos três arquivos de pedidos e dos dois arquivos de regressão: exit 0 (`scratch/central-support-orders-errors-lint-2026-10-21.log`). TypeScript do harness: exit 0 (`scratch/central-support-orders-errors-harness-types-2026-10-21.log`). Esses checkpoints precedem a correção de sobreposição descrita abaixo; a seleção final será reconferida.

## Falha de sobreposição descoberta na interface real

Na janela de 1920 × 945, o clique normal em “Criar pasta” era interceptado pelos cards da tela inicial. A primeira execução excedeu 60 segundos; a segunda, com prazos locais e etapas identificadas, localizou a interceptação. O servidor 5173 respondia HTTP 200 e o login/gate concluíram. Logs `scratch/central-support-orders-errors-readonly-ui-2026-10-21.log` e `scratch/central-support-orders-errors-readonly-ui-diagnostic-2026-10-21.log` preservam as falhas.

A inspeção de `getComputedStyle` e `elementFromPoint` confirmou o diálogo com z-index 999999 dentro da camada da fila (flex item com z-index 10); o conteúdo posterior da tela inicial também tinha uma camada z-index 10 e recebia o clique no centro do botão. Aumentar somente o z-index do filho não o retira da camada do pai.

`erp/src/pages/App/CustomerSupport/components/inbox/AddCustomInboxModal.tsx` passou a usar `createPortal` de `react-dom`, já disponível no projeto, para renderizar o mesmo formulário em `document.body`. RHF, resolver, campos, travas, permissões e serviço de gravação são os existentes. Não há clique forçado, nova dependência ou alteração global de estilos.

A regressão estrutural em `customerSupportFolderForm.test.tsx` falhou antes (1 falha/8 aprovações, `scratch/central-support-folder-overlay-before-2026-10-21.log`). Depois, **30/30 em quatro arquivos** passaram, abrangendo pasta, pedidos, vínculo e navegação (`scratch/central-support-orders-folder-after-2026-10-21.log`). A execução de navegador seguinte atravessou o clique e a validação real da pasta, depois falhou no seletor novo do título comercial: o ícone também integra seu nome acessível. O seletor foi ajustado para o nome observado; o log `scratch/central-support-orders-folder-readonly-ui-2026-10-21.log` permanece como tentativa não aprovada.

## Contrato remoto conferido e limites

A consulta de catálogo do PostgreSQL, sem linhas comerciais ou DML, confirmou `customer_support_list_customer_orders(text)` com MD5 da definição `f0d983ebce1aed8d61e3223a1e19e8b5`. A função exige as duas autorizações da Central e de informações comerciais, recusa com `42501`, não oferece execução a `anon`, tem prazo de 10 segundos e retorna até 20 registros. Esta correção não altera a função.

Não há fixture própria de cliente/pedido autorizada nesta etapa. O run retido `8eaed14f-364d-47ab-be41-66be54b3fb65` contém somente conversas próprias arquivadas sem vínculo com cliente; ele não autoriza novos dados. A interface real pode comprovar navegação e ausência de consulta sem vínculo, mas não o caminho positivo comercial nem sua recusa autenticada no banco. A validação de pastas entre duas contas continua adiada pelo proprietário, sem nova solicitação.

## Referência de publicação anterior

Ver `central-de-atendimento-confirmacao-leitura-2026-10-21.md` para a publicação já concluída, seus 232 testes de origem, build, treze hashes de arquivos e sete verificações HTTP antes e sete depois da promoção. Os 243 testes deste lote não devem ser atribuídos retroativamente ao pacote publicado.

## Candidato isolado e gates finais

Preparado em `C:/Users/mathe/morantehub-central-orders-errors-release-20261021`: **24 caminhos selecionados, quatro alterações de runtime em relação à produção atual**. Usa a base Git `39b10c593834b07ed3727bd7f6abad1fcfcad5d2` mais os 17 caminhos do pacote publicado ECK, conferidos pelo manifesto anterior SHA-256 `10C41AC1F0897A07CD528D79C12AD7D8DBBF79E4AC74341D8BD7E08389A43AE5`, e as correções delimitadas deste registro. Preserva as três correções de runtime de leitura/cópia já publicadas. Alterações concorrentes de Produtos, estoque, vendas e mobile não integram este candidato.

| Gate final | Resultado | Registro no candidato |
| --- | --- | --- |
| Vitest/RTL, inclusive negativas anônimas remotas | **244/244 em 24 arquivos**, 5,56s | `unit-final.log` |
| Build completo, com ambiente Vercel Development | **Aprovado**, fase Vite 1m50s | `build-final.log` |
| ESLint dos quatro arquivos de runtime e três de regressão | exit 0 | `lint-final.log` |
| TypeScript do harness | exit 0 | `harness-types-final.log` |
| Playwright visível, origem conferida por hash | **1/1 em 11,2s**, porta 5173 | `scratch/central-support-orders-folder-readonly-ui-final-2026-10-21.log` na origem |

A primeira seleção isolada não tinha ambiente remoto e aprovou 238 casos, sem executar os seis checks anônimos. Foi preservada em `unit-without-environment.log`. A tentativa seguinte recusou o vínculo do diretório de ambiente (`unit-environment-link-attempt.log`). A execução final verificou os IDs do projeto/equipe, usou a ligação do candidato e carregou Vercel Development durante a execução, sem copiar arquivo de credenciais. Os 244 casos são o resultado final, sem somar tentativas.

O build emitiu os avisos existentes de anotação de dependência e tamanho de chunks. Isso não é prova de TypeScript global do ERP: o gate tipado deste lote é o harness. Sem nova migration, fixtures, conta, operação comercial/fiscal, mensagem à Meta, commit ou push. Publicação deste novo candidato ainda requer autorização específica; conferir novamente o alias antes de qualquer operação para preservar uma produção posterior.

Linhas de referência: `supportOrdersService.ts:24` e `:92`; `CustomerInfoPanel.tsx:75`; `CustomerOrdersTab.tsx:24`; `AddCustomInboxModal.tsx:101`; `customerSupportOrdersQuery.test.ts:8`; `customerSupportLinkForms.test.tsx:33`; `customerSupportFolderForm.test.tsx:12`; harness `support-login.spec.ts:214`.
