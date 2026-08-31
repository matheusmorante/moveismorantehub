# Documentação de engenharia: operação do ERP

A referência navegável fica em **Perfil > Documentação do sistema > Para engenharia**. A mesma página também oferece a **Documentação para usuários**, organizada pelos cargos Vendedor, Entregador e montador, e Almoxarifado.

## Gatilhos de pedidos, estoque e cronograma

| Evento / status | Estoque e movimentações | Cronograma |
| --- | --- | --- |
| **Rascunho** | Não gera saída, entrada ou alteração de saldo. O preenchimento permanece editável. | Se a data/agendamento já foi preenchido, aparece somente para planejamento. |
| **Cadastro válido → Agendado** | Cada item real (variação com `productId`) pode gerar saída quando Agendado estiver configurado como status de baixa — este é o padrão. Itens temporários não geram movimento, sem bloquear os demais. | Entra no cronograma conforme data, tipo e filtros ativos. |
| **Agendado → Atendido** | Mantém a saída já registrada. Caso ainda não exista, o status pode acionar a baixa configurada; não deve duplicar movimentos. | Sai do cronograma. Desfazer atendimento devolve o pedido a Agendado e ele pode reaparecer conforme a data/filtro. |
| **Agendado → Cancelado** | Estorna todos os movimentos vinculados ao pedido, recompõe saldo e redefine `stockProcessed`. Registra motivo de cancelamento na movimentação e gera notificação para o aplicativo; push depende de token ativo. | Sai imediatamente do cronograma. |
| **Pedido de devolução criado** | Pode ser vinculado a uma venda atendida ou criado sem venda vinculada, com cliente e itens próprios. Não cria entrada; nasce Agendado. | Segue o fluxo de agendamento da própria devolução. |
| **Pedido de devolução → Atendido** | Após confirmação com espera de cinco segundos, gera entradas somente para os itens e quantidades selecionados, com observação de origem. Depois disso, não pode ser cancelado ou desfeito. | Sai do cronograma. |

## Regras adicionais

- Depois de cadastrado, o pedido não volta a Rascunho. Um pedido Cancelado não pode ser editado ou reaberto; para corrigir, use **Copiar pedido**.
- Pedido de devolução em Rascunho pode ser excluído. Uma devolução Atendida é definitiva; para corrigir a operação, crie um novo pedido de venda.
- Na lista de pedidos, Agendado e Atendido podem ser editados. A comparação dos itens e qualquer efeito de estoque só ocorrem ao clicar em **Salvar alterações**; abrir o formulário ou alterar campos sem salvar não cria nem estorna movimento.
- Se produto ou quantidade de item real mudou, o salvamento abre uma confirmação com o estado anterior e o atual. O estorno e a nova saída só acontecem após clicar em **Confirmar e salvar**.
- Ao salvar a alteração de um item real que já teve baixa, o sistema identifica o item modificado (produto, quantidade, preço ou desconto), estorna a saída vinculada ao item anterior e cria uma nova saída para a versão atual. Itens que não mudaram preservam suas movimentações.
- Se o item alterado for temporário, ele não gera saída nem estorno próprio. Ao trocar um item temporário por um produto real, a nova saída é criada ao salvar.
- Produto pai é referência. Operações de estoque usam somente variações, que são os itens físicos.
- Entradas, saídas e ajustes atualizam saldo. Saídas de venda usam FIFO quando existem lotes.

## Riscos a tratar

1. Pedido, movimento e saldo ainda são operações separadas; migrar para transação/RPC.
2. Movimentos originados de pedido precisam de vínculo relacional obrigatório, não de busca por texto.
3. Criar testes de integração para venda, cancelamento, devolução, recebimento e inventário.
4. Criar conciliação automática de saldo cadastrado contra movimentos efetivos.
5. Implementar nos relatórios o abatimento líquido de quantidade, valor e lucro das devoluções atendidas. Hoje essa regra ainda não é aplicada automaticamente.

Toda alteração de fluxo deve atualizar este arquivo e a página de documentação, registrando estado inicial, evento, efeitos de estoque, reversão e teste de regressão.
