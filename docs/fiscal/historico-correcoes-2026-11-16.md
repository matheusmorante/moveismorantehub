# Histórico de correções fiscais — 16/11/2026

## Acesso sem login às notas de entrada bloqueado

**Problema e efeito prático.** Os catálogos do banco mostravam que uma conexão sem login podia ler e alterar a tabela de cabeçalhos das notas de entrada. O mesmo visitante também podia ler e gravar os itens normalizados da nota. Notas fiscais podem conter dados do emitente, valores, produtos e o documento XML. A auditoria não abriu nenhum registro ou XML; a evidência veio de privilégios e políticas do banco.

**Consumidores verificados.** As telas e serviços do ERP e do aplicativo acessam as tabelas usando a sessão autenticada. As rotas fiscais de servidor verificam sessão e papel, e as funções de integração usam o papel técnico de serviço. Não foi encontrado consumidor anônimo legítimo nem uso pelo catálogo público. O cliente sem login agora recebe recusa de permissão. Para quem está autenticado, as telas e os fluxos fiscais permanecem iguais.

**Correção no banco.** A migration `20261117003650_revoke_anon_inbound_invoice_read_insert_update.sql` removeu de `anon` leitura, inclusão e alteração em `public.inbound_invoices`. A migration `20261117004534_revoke_anon_inbound_invoice_items_access.sql` removeu todos os privilégios diretos de `anon` em `public.inbound_invoice_items` e restringiu as duas políticas de leitura e escrita a `authenticated` e `service_role`. As regras de acesso por linha continuam ligadas. Os direitos de usuários autenticados e de serviço foram mantidos.

**Validação e limites.** O projeto operacional foi confirmado como `hkoxhourxwlddgsfdgws`; ambas as migrations aparecem no histórico remoto. A leitura dos catálogos depois da mudança confirmou que `anon` não tem leitura/gravação e que os outros dois papéis permanecem permitidos. Não houve consulta a conteúdo de nota, XML, mensagem ou dados operacionais, nem testes, compilação, DML ou fixtures. Chamadas, bytes reais de rede/egress e carga/latência do banco não foram medidos; não se afirma redução de consumo. Preço, estoque, atualização ao reconectar e modo offline não mudaram.

**Reversão.** A restauração dos privilégios e da participação de `anon` nas políticas reabriria a exposição; não executar sem investigação e revisão de segurança. Uma migration local para criação inicial de `inbound_invoice_items` não foi localizada nesta auditoria; a segunda migration pressupõe que essa tabela exista, como foi confirmado no projeto operacional. A lacuna anterior de reprodutibilidade permanece registrada para correção separada.

## Ordem visual dos ambientes fiscais na escolha de emissão

**Problema e sintomas.** No modal de escolha do ambiente fiscal, o cartão Produção aparecia à direita de Homologação em telas com duas colunas. O operador pediu que Produção fique à esquerda.

**Causa técnica.** O cartão Homologação era o primeiro item do grid e Produção o segundo; a ordem automática do grid seguia a ordem do JSX.

**Arquivos e pontos alterados.**

- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeEnvironmentChoiceModal.tsx:235` e `:270`: classes de ordem CSS dos cartões de Homologação e Produção, respectivamente.
- `docs/fiscal/README.md`: referência atual a este histórico.

**Solução e compatibilidade.** Produção recebeu `order-1` e Homologação `order-2`, posicionando Produção primeiro (à esquerda em duas colunas e acima em coluna única). Handlers, valores `tpAmb`, regras de bloqueio, textos de confirmação e transmissão fiscal não foram alterados.

**Validação e limites.** Testes dinâmicos não foram executados: a alteração é exclusivamente visual e não modifica o fluxo fiscal. Não houve seleção de ambiente, emissão ou transmissão à SEFAZ.

## Finalização de venda reaproveita rascunho autosalvo

**Problema e sintomas.** Ao concluir uma venda que já havia sido gravada pelo autosave, o formulário enviava novamente o pedido inteiro. Isso repetia a resolução do snapshot do cliente e, quando o destino era agendado, a preparação dos snapshots fiscais dos itens antes da transação de conclusão.

**Causa técnica comprovada no fluxo.** `useOrderAutoSave` já aguardava e confirmava o salvamento do rascunho, mas `handleCompleteOrder` seguia pelo caminho de gravação integral (`saveOrder`) mesmo quando o snapshot validado era idêntico ao autosalvo. A transição podia ser feita pelo caminho existente de atualização somente de status, que preserva o snapshot persistido e as validações de transição, agendamento e operações independentes.

**Arquivos alterados.**

- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.ts`: assinatura estável do conteúdo validado salvo, invalidada ao carregar outro rascunho; comparação somente quando o autosave mais recente corresponde ao formulário atual.
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts`: repasse do identificador de rascunho confirmado ao fluxo de conclusão.
- `erp/src/pages/App/SalesOrder/hooks/useOrderFormSubmission.ts`: após validar o formulário completo e confirmar o autosave, usa `updateOrder(id, { status })` apenas quando o conteúdo Zod completo coincide com o snapshot autosalvo. Em qualquer divergência ou ausência de rascunho confirmado, mantém `saveOrder` integral e sua idempotência.
- `docs/fiscal/README.md`: inclusão desta referência.

**Solução e invariantes preservados.** O pedido não é declarado concluído antes da confirmação da atualização. O caminho de status somente reaproveita os itens, pagamentos, endereços e snapshots que a gravação do rascunho já persistiu; não altera snapshots fiscais nem XML. A validação Zod completa continua antes da gravação, e o serviço de atualização conserva as verificações de transição de status, programação, composição e bloqueio de entregas independentes. O caminho não se aplica a artefatos de teste. Não houve migration nem mudança na função SQL de estoque.

**Evidência de desempenho e limites.** `pg_stat_statements`, consultado somente por agregados no projeto operacional `hkoxhourxwlddgsfdgws`, acumulava desde `2026-10-18T11:21:04Z` 2.658 chamadas PostgREST ao contrato de `create_order_with_inventory_transaction`, média de `1.420,2 ms` e máximo de `7.843,5 ms`. O agregado inclui criações, rascunhos e atualizações; não identifica finalizações individuais nem permite atribuir o máximo a esta tela. Os logs agregados das últimas 24 horas mostraram 122 respostas `200`, 12 `500` e 1 `409` para essa rota, sem duração por chamada. A mudança remove trabalho de preparação redundante em rascunhos autosalvos exatos, mas a RPC transacional e os efeitos de estoque continuam necessários; não há medição pós-alteração que comprove redução do tempo total.

**Validação.** Nenhum teste, gravação remota, emissão fiscal ou transmissão à SEFAZ foi executado nesta alteração. A revisão foi estática e preservou uma alternativa integral para todo caso em que não seja possível provar equivalência do snapshot.

## Edição de venda atendida sem fluxo fiscal automático

### Problema identificado e sintomas
Vendas atendidas não ofereciam o botão de edição. Ao abrir uma venda para edição, a interface também consultava a situação fiscal e podia exibir avisos de pendência/reversão antes ou depois de salvar, embora a solicitação comercial fosse apenas alterar o pedido.

### Causa raiz técnica comprovada
Os dois caminhos de lista — menu da tabela e ações do cartão — tratavam `fulfilled` como bloqueio de edição para vendas, showroom e devoluções. No modal, `useOrderEditFiscalFlow` chamava `resumeFiscalOrderEdit` ao abrir e após salvar, exibindo avisos fiscais; `OrderEditModal` ainda continha pontos de entrada para os modais de cancelamento/reemissão e continuação fiscal.

### Solução aplicada
- Vendas do tipo `sale` com status `fulfilled` agora podem ser editadas pela tabela e pelos cartões. Pedidos cancelados e pedidos atendidos de showroom/devolução mantêm as restrições existentes.
- A edição segue validando os dados pelo schema Zod e grava a atualização comercial com a versão esperada do pedido. O modal não consulta pendências fiscais, não apresenta avisos sobre elas e não abre ações para cancelamento, estorno ou reemissão.
- A nota autorizada e seus snapshots/XML não são atualizados nem removidos. Os gatilhos que registram revisões comerciais pendentes e o bloqueio de nova saída fiscal permanecem inalterados; uma eventual emissão continua fora da edição e sujeita ao fluxo fiscal existente.

### Arquivos e pontos modificados
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderOptionsMenu.tsx:55–59`: regra de bloqueio do menu; libera somente venda atendida.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/orderCardPresentation.ts:9,13–17`: regra equivalente para o botão de edição do cartão.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/useOrderEditFiscalFlow.ts:1,27–62`: removidas a consulta fiscal ao abrir e a retomada/avisos depois de salvar; validação Zod, controle de versão e gravação comercial preservados.
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx:12–22,40–57,68–75,146`: removidos os pontos de entrada dos modais de continuação e reemissão fiscal.
- `erp/src/pages/App/SalesOrder/modals/order-edit-modal/hooks/useOrderEditPersistence.ts:15,50`: setter de reemissão tornou-se opcional e a preparação retorna sem efeito quando o modal comum não o fornece.
- `docs/fiscal/README.md:8`: referência atual adicionada.
- `docs/fiscal/historico-correcoes-2026-11-16.md:37–60`: este registro.

### Validação e limites
Revisão estática confirmou que `updateOrder` aceita alteração comercial sem transicionar o status (`validateOrderStatusTransition` permite status ausente ou igual ao atual) e que a edição normal não altera o snapshot fiscal diretamente. Nenhum teste foi executado, conforme a instrução da tarefa. Não houve consulta ou gravação remota, migration, emissão, cancelamento/estorno fiscal ou transmissão à SEFAZ. O gate existente para nova emissão enquanto houver revisão fiscal pendente foi mantido deliberadamente.

## Projeção enxuta de fornecedores e gravação parcial dos vínculos da NF de entrada

### Problema e sintomas

Ao abrir “Gerenciar vínculos” no ERP, o modal buscava todos os fornecedores em páginas de até 1.000 linhas usando a projeção genérica de 23 colunas da tabela `people`. O seletor local precisava de menos campos. Ao salvar uma troca de fornecedor ou um vínculo, o mesmo caminho de gravação usado pela importação reenviava o cabeçalho completo da nota, inclusive `xml_conteudo`, embora a operação altere somente `supplier_id` e `itens`.

### Causa técnica

O modal chamava `fetchPersons('suppliers')` sem projeção própria e `saveInboundInvoice(..., { requireConfirmation: true })`. A forma genérica de gravação faz `upsert` do cabeçalho completo e confirma a escrita lendo `id`, `supplier_id` e o JSON completo `itens`. Os dois consumidores do modal recebem notas das consultas paginadas do ERP ou do seletor de recebimentos; não são o fluxo de importação recém-criado.

### Solução aplicada e compatibilidade

- `fetchPersons` aceita agora uma projeção opcional. O padrão de 23 colunas continua igual para todos os demais consumidores.
- O modal de vínculos seleciona oito campos: identificador, tipos de pessoa, nome, apelido, documento, endereço e origens de estoque. O endereço continua incluído porque a classificação de registros de teste lê os marcadores dentro dele. Filtros, ordenação, paginação de 1.000 linhas, seleção local e regra de fornecedor de Salvados permanecem iguais.
- Somente o modal de vínculos pede `mappingOnly`. Esse modo exige confirmação e identificador de nota válido, atualiza por `id` apenas `supplier_id`, `itens` e `updated_at`, e mantém a mesma leitura de confirmação. A importação e os outros consumidores de `saveInboundInvoice` continuam no `upsert` completo.
- A validação do destinatário, o controle de contexto atual, a gravação e confirmação das linhas normalizadas, a proteção contra exclusão/duplicidade e a resposta de estado incerto foram preservados. A atualização continua sob as permissões atuais; não foi criada política nova nem migration.
- O XML fiscal armazenado não é alterado por esta operação. O JSON de itens continua sendo sincronizado na nota e na tabela normalizada para preservar os consumidores existentes.

### Arquivos e pontos modificados

- `erp/src/pages/utils/personService/query/personQuery.types.ts`: projeção de oito colunas e opção `columns` opcional.
- `erp/src/pages/utils/personService/personQueryService.ts`: mantém a projeção genérica como padrão e encaminha a projeção somente quando um consumidor a informa.
- `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx`: usa a projeção compacta ao abrir e solicita o modo de gravação parcial ao salvar vínculos.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts`: adiciona a gravação parcial por identificador para este consumidor, mantendo o `upsert` para importação.
- `docs/fiscal/README.md`: referência atual adicionada.
- `docs/fiscal/historico-correcoes-2026-11-16.md`: este registro.

### Validação e limites

`git diff --check` passou nos arquivos alterados. Nenhum teste ou compilação foi executado. Não houve consulta ao Supabase, gravação de dados, abertura de nota/XML, migration, mudança de permissão, emissão ou transmissão à SEFAZ. A mudança preserva o número de etapas de consulta/gravação: abertura continua buscando as mesmas páginas de fornecedores e o mesmo lookup de vínculos; salvar continua confirmando o cabeçalho e gravando as linhas normalizadas. O pedido do cabeçalho, porém, deixa de incluir o XML e os demais campos inalterados.

Não há medição de chamadas reais, bytes de rede ou cobrança oficial de egress. A quantidade de fornecedores, os tamanhos de XML/itens e a frequência de salvamentos por nota não foram consultados. O trabalho do banco, inclusive o trigger que valida o destinatário em atualizações, não foi medido. A interface continua mostrando os mesmos estados de carregamento, salvamento confirmado e resultado incerto. O modo offline, preços, estoque e regras de vínculo não mudam.

Para medir depois, comparar antes/depois contagem de chamadas e bytes das rotas `people`, `inbound_invoices` e `inbound_invoice_items` em condições equivalentes, usando apenas agregados sem identificador de nota; conferir egress oficial separadamente e estatísticas agregadas de chamadas/latência do banco. O limite provisório para validar com a equipe é p95 de até 3 s entre abrir o modal e os vínculos estarem prontos e entre salvar e mostrar a confirmação, em rede normal. LCP p75 ≤ 2,5 s e INP p75 ≤ 200 ms devem ser medidos separadamente no ERP para celular e desktop. Ainda não há linha de base.

Para reverter, remover `mappingOnly` do modal e sua ramificação no serviço para voltar ao `upsert` completo; retirar a projeção do modal para retornar às 23 colunas genéricas. Nenhuma mudança remota precisa ser revertida.
