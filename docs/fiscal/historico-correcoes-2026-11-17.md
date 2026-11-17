# Histórico de correções fiscais — 17/11/2026

## Vínculo histórico do fornecedor na importação de NF de entrada

### Problema identificado

A NF-e 8567, série 1, da Movebol foi importada sem fornecedor, embora notas anteriores do mesmo emitente já estivessem vinculadas à Mopar.

### Causa raiz

O importador XML da tela de documento (`useInboundDocumentImport`) procurava fornecedores carregando a lista de pessoas e comparando somente o CNPJ do cadastro ou o nome exato do emitente. Como o cadastro da Mopar não usa o CNPJ da Movebol e seu nome difere da razão social do XML, essa rota não encontrou o vínculo histórico. O importador XML principal e o app já usavam `findInboundInvoiceSupplier`, que consulta notas anteriores do mesmo emitente.

### Solução aplicada

- O importador de documento do ERP agora reutiliza `findInboundInvoiceSupplier`, passando nome, CNPJ/CPF do emitente e data de emissão. Ele procura o cadastro pelo documento, reaproveita a associação da nota anterior do mesmo emitente e mantém o fallback por nome, sem criar fornecedores.
- O app móvel foi conferido: sua importação já usa a mesma resolução por documento e histórico, portanto não precisou de alteração.
- A NF-e 8567 foi corrigida no banco operacional, preenchendo somente `supplier_id` com o fornecedor já usado nas notas Movebol anteriores. XML, itens, valores, chave e demais metadados foram preservados.

### Arquivos e pontos alterados

- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:17,104-114`: remoção da busca que baixava e filtrava a lista completa de fornecedores; chamada ao resolvedor comum com a data de emissão.
- `docs/fiscal/README.md:8`: referência atual para este registro.
- `docs/auditorias/roadmap-otimizacao-consumo-supabase.md`: registro do acesso mais específico e dos limites de medição.
- Supabase operacional `hkoxhourxwlddgsfdgws`: atualização condicional do vínculo ausente da NF-e 8567; nenhuma migration.

### Validação e limites

A leitura remota confirmou que a NF-e 8567 estava sem `supplier_id` e que as notas Movebol anteriores já apontavam para Mopar; após a correção, o vínculo foi relido e confirmado. A revisão de código confirmou que a importação XML do ERP e o app já chamam o resolvedor por histórico. Não foram executados testes automatizados ou build. A consulta anterior de fornecedores completos foi substituída por buscas com projeções explícitas e limite; não medi bytes, egress oficial, CPU, plano, latência ou rapidez, portanto não afirmo economia quantitativa. Não houve mudança de regra fiscal, XML, itens, emissão ou transmissão à SEFAZ.

## Busca de NCM no cadastro preserva espaços durante a digitação

### Problema identificado

Ao digitar uma busca de NCM com espaços no cadastro de produto, o texto podia voltar para uma sequência de dígitos, interrompendo a busca por descrição ou por um código parcialmente digitado.

### Causa raiz

O efeito de sincronização do `ProductNcmSelector` normalizava para dígitos o valor fiscal em cada atualização local do campo. Como a busca digitada também era gravada em `formData.fiscal.ncm`, o efeito confundia o texto intermediário da busca com um NCM externo confirmado e substituía o valor do input.

### Solução aplicada

- O seletor registra o último valor de NCM que ele próprio escreveu. A sincronização só altera a busca quando recebe um valor diferente do estado local, como um código carregado ou uma sugestão aceita.
- A normalização de códigos externos continua usando o parser existente; a digitação de termos com espaços fica intacta e a seleção de um resultado continua definindo o código escolhido.
- O seletor correspondente no app móvel foi revisado. Ele mantém a busca em estado local e sincroniza o texto sem remover espaços, portanto não apresenta a mesma normalização que causava o rollback e não precisou de alteração.
- Nenhuma regra de vigência, classificação, validação fiscal ou persistência do código selecionado foi modificada.

### Arquivos e pontos alterados

- `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:36,48-57,183`: sincronização externa protegida pelo último valor local; texto digitado permanece íntegro.
- `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:84-90,225-243`: caminho móvel conferido; sem alteração porque o efeito reflete o valor original sem sanitização.
- `docs/fiscal/README.md:8`: referência atual para este registro.
- `docs/fiscal/historico-correcoes-2026-11-17.md:3-29`: este registro.

### Validação e limites

Não foram executados testes automatizados, conforme o escopo solicitado. A revisão estática confirmou que o valor digitado é registrado antes da atualização do estado proprietário e que mudanças externas de NCM continuam sincronizadas. `git diff --check` foi executado sem erros de whitespace. Nenhum acesso ao Supabase, gravação de dados, cálculo de tributos, emissão ou transmissão à SEFAZ ocorreu.

## Edição comercial sem ação automática sobre a NF emitida

### Problema identificado

O fluxo principal do modal de edição já havia deixado de abrir cancelamento ou reemissão fiscal, mas a camada de persistência ainda expunha métodos de edição fiscal (`persistReadyFiscalEdit` e `persistBlockedFiscalEdit`). O primeiro atualizava a venda, limpava a solicitação de emissão e preparava um novo snapshot fiscal para reemissão. Um teste ainda afirmava esse caminho como comportamento suportado.

### Causa raiz

A remoção anterior havia desligado os pontos de entrada da interface, mas não retirado a capacidade de cancelamento/reemissão do contrato do hook de persistência. Isso deixava uma ação fiscal residual no módulo e permitia que ela fosse conectada novamente ao modal de edição.

### Solução aplicada

- `useOrderEditPersistence` agora expõe somente `persistUpdate`, que grava a alteração comercial por `updateOrder` e mantém os callbacks de sucesso/fechamento. Os caminhos de cancelamento, estorno, consulta de circulação, limpeza de solicitação fiscal e preparação de nova NF foram removidos dessa camada.
- O teste do módulo agora confirma que a persistência de edição oferece somente `persistUpdate` e grava a atualização comercial esperada. O teste que exercitava preparação de reemissão foi removido.
- A nota autorizada, seu XML, protocolo e snapshots não são alterados por editar a venda. Cancelamento/estorno fiscal e emissão continuam disponíveis somente em seus fluxos próprios e explícitos, fora da edição comercial.

### Arquivos alterados

- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditPersistence.ts:4–36`: dependências fiscais e métodos de cancelamento/reemissão removidos; a persistência expõe somente `persistUpdate`.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts:125–149`: o teste agora confere a API comercial única e os argumentos da gravação.
- `docs/fiscal/README.md:3,8`: data de reconciliação e referência atualizadas.
- `docs/fiscal/historico-correcoes-2026-11-17.md:1–29`: este registro.

### Validação e limites

Foi executado `npm run test --prefix erp -- --run src/pages/App/SalesOrder/modals/order-edit-modal/__tests__/orderEditModalModules.test.ts`: **1 arquivo e 8 testes passaram**. `git diff --check` também passou. Não houve acesso ou gravação no Supabase, consulta ou transmissão à SEFAZ, cancelamento/estorno de NF, emissão de novo documento ou alteração de schema. O comportamento fiscal da nota permanece respaldado pelos invariantes `FISCAL-003`, `FISCAL-012` e `FISCAL-013`; esta validação local não substitui teste de banco remoto ou de integração com a SEFAZ.

## Rótulos diretos para as ações no menu da NF

### Problema identificado

No menu de ações da nota, os rótulos eram longos: “Cancelamento fiscal da NF-e” e “Aplicar política fiscal (estorno)”. O usuário pediu nomes curtos, “Cancelar” e “Estornar”.

### Causa e solução

O componente apresentava explicações de política no próprio rótulo. Agora o rótulo é “Cancelar” quando `cancellationEligibility.action` é `cancel` e “Estornar” quando a política retorna `estorno`. A política continua determinando qual opção aparece; o handler, as condições de elegibilidade e o fluxo fiscal não foram alterados.

### Arquivos e pontos alterados

- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentRowActions.tsx:190–192`: textos dos itens do menu.
- `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentRowActions.test.tsx:44–83`: expectativas para os dois rótulos e teste do caminho de estorno.
- `docs/fiscal/README.md:8`: referência atual para este registro.
- `docs/fiscal/historico-correcoes-2026-11-17.md:31–47`: este registro.

### Validação e limites

Foi executado `npm run test --prefix erp -- --run src/pages/App/FiscalDocuments/__tests__/fiscalDocumentRowActions.test.tsx`: **1 arquivo e 19 testes passaram**. `git diff --check` foi executado após a alteração. Nenhuma ação de cancelamento ou estorno foi acionada; não houve consulta ou transmissão à SEFAZ, nem gravação no Supabase.

## Cancelamento comercial aplica a política fiscal às NFs vinculadas

### Problema identificado

Quando a política retornava várias NFs autorizadas vinculadas à venda (`batch`), o modal exibia as decisões por documento, mas a confirmação da venda rejeitava `batch`. Também bloqueava `reconcile`, embora o serviço fiscal já tivesse um caminho seguro para consultar a tentativa anterior antes de decidir. Assim, algumas vendas não chegavam a executar o cancelamento comercial nem a regularização fiscal prevista para todas as notas.

### Causa raiz

A guarda da interface aceitava somente as decisões fiscais individuais `none`, `cancel` e `estorno`. Ela não reconhecia lotes cujas notas tivessem decisões processáveis e não encaminhava a reconciliação ao serviço existente.

### Solução aplicada

- A decisão compartilhada agora considera processável um lote não vazio quando todas as notas têm ação conhecida: cancelamento fiscal, preparação de estorno fiscal ou reconciliação. O fluxo aplica a venda e o serviço processa cada documento individualmente conforme a política central.
- A confirmação de `reconcile` segue para o serviço que consulta a SEFAZ antes de qualquer nova ação. Não retransmite evento incerto.
- Lotes com qualquer documento que exija revisão manual, bloqueio ou pendência continuam sem confirmação; a confirmação explícita para cancelamento fiscal em Produção permanece obrigatória.
- O estorno fiscal continua sendo preparado como rascunho vinculado à NF original para revisão fiscal antes da transmissão, conforme o fluxo vigente.

### Arquivos e pontos alterados

- `shared-utils/saleCancellationFormSchemas.ts:20–36`: regra compartilhada para decisões fiscais individuais e lotes processáveis.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.tsx:166–169`: encaminha ao cancelamento comercial as decisões processáveis.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx:10, 46–51, 189–195, 224–226`: usa o contrato compartilhado, bloqueia lotes sem tratamento automático, explica reconciliação segura e mantém o aviso de irreversibilidade para ações confirmáveis.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.test.tsx:103–130`: cobre lote misto elegível, reconciliação e bloqueio de lote com revisão manual.
- `erp/src/pages/utils/nfe/__tests__/orderCancellationEffects.test.ts:64–97`: cobre processamento individual de cancelamento e estorno em notas do mesmo lote.
- `docs/fiscal/README.md:8`: referência atual para este registro.
- `docs/fiscal/historico-correcoes-2026-11-17.md`: este registro.

### Validação e limites

Executado `npm run test --prefix erp -- --run src/pages/App/SalesOrder/OrderHistoryList/CancelScheduledSaleButton.test.tsx src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.test.ts src/pages/utils/nfe/__tests__/orderCancellationEffects.test.ts src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.test.tsx`: **4 arquivos e 38 testes passaram**. As suítes cobrem a seleção dos caminhos pela interface, o processamento por documento e a preservação do cancelamento comercial diante de falha ou timeout fiscal; a quarta suíte verifica a remoção do aviso na linha da tabela. `git diff --check` passou. Nenhuma venda real foi cancelada, nenhum documento foi consultado ou transmitido à SEFAZ e não houve gravação no Supabase.
