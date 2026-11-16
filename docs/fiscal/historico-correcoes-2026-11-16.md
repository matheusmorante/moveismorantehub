# Histórico de correções fiscais — 16/11/2026

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
