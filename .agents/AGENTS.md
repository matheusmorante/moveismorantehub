# Regras e Comportamentos do Sistema - Morante Hub

Este documento registra as regras e comportamentos **implementados** no sistema, organizados por modulo, para evitar regressoes.

---

## REGRAS GERAIS DO AGENTE

- **Git Push**: Nao executar `git push` automaticamente. Aguardar solicitacao explicita do usuario.
- **Modularizacao**: Arquivos acima de 500 linhas ou com mais de uma responsabilidade devem ser divididos. Aplicar apos cada tarefa.
- **Idioma dos termos no ERP**: Produtos **Ativos** / **Desativados** (nunca publicados/despublicados). No catalogo digital: **Publicado no Catalogo** / **Ocultado do Catalogo**.
- **Testes de ERP**: Para toda alteracao que possa afetar regras de negocio, banco, estoque, vendas, compras, recebimentos, devolucoes, inventarios, custos, relatorios, financeiro, entregas ou integracoes, consultar e seguir `.agents/skills/testes-seguros-erp/SKILL.md`. Nunca usar dados reais/preexistentes como massa de teste; toda persistencia de teste exige `testRunId` identificavel, cleanup e validacao do cleanup.

---

## MODULO: PRODUTOS

### Ciclo de Vida do Produto (3 Estados Mutuamente Exclusivos)

| Estado | Condicao no Banco |
|---|---|
| **Produto Ativo** | `is_draft: false`, `active: true`, `deleted: false` |
| **Produto Desativado** | `is_draft: false`, `active: false`, `deleted: false` |
| **Rascunho** | `is_draft: true` ou `status == 'draft'` |

- Rascunhos so aparecem no filtro dedicado de Rascunhos. **Nunca** na lista Ativa nem Desativada.
- Produto concluido (`is_draft: false`) **NUNCA** volta para rascunho. Transita apenas entre Ativo e Desativado.
- Rascunho so e criado se o usuario preencher ao menos o nome e nao finalizar. Fechar sem nome = nenhum rascunho criado.
- Ao editar produto ja concluido, o auto-save de rascunho e desativado.

### Variacoes de Produtos

- Ao criar variacao, campos de Informacoes Tecnicas e Precificacao chegam com **Herdar do Pai marcado** por padrao (`syncDescription`, `syncWidth`, `syncHeight`, `syncDepth`, `syncWeight: true`).
- Botao de adicionar atributo a variacao: chama-se **Adicionar** (nao `+ Vinculo`).
- Botao de gerenciar atributos globais: chama-se **Gerenciar Atributos** (nao `+ Criar Atributo`).

### Catalogo Meta (Facebook / Instagram / WhatsApp)

- Ao criar/editar produto, **nao** e feita chamada sincrona a API da Meta.
- O Meta Commerce Manager consome o Feed CSV gerado dinamicamente em `/api/facebook-catalog.csv` a partir dos dados do Supabase.

---

## MODULO: PEDIDOS DE VENDA (SalesOrder)

### Status e Restricoes de Rascunho

- Status possiveis: `draft`, `scheduled`, `fulfilled`, `cancelled` (e outros customizados via `settings.orderStatuses`).
- **Restricoes de Rascunho (`status: 'draft'`)**:
  - Pedidos em rascunho **nao** podem ter o status alterado diretamente via menu ou seletor de status nos cards e linhas.
  - O seletor de status fica desabilitado para rascunhos, exibindo o aviso de que o cadastro precisa ser finalizado.
- Para um pedido em rascunho tornar-se agendado (`scheduled`), e obrigatorio abrir o formulario de cadastro/edicao e clicar em **Concluir Pedido**.
- Pedidos em rascunho exibem no menu de tres pontos a acao **Excluir rascunho**, com confirmacao e exclusao permanente. Nenhum outro status pode ser excluido por essa acao.
- Vendas Agendadas exibem **Cancelar venda** no menu de tres pontos. O cancelamento muda o status para `cancelled` e estorna somente saídas de estoque vinculadas que existirem.
- Ao concluir um novo pedido, o autosave de rascunho e interrompido: entrega e retirada agendada ficam `scheduled`; retirada marcada como **Retirada Imediata** fica `fulfilled`.
  - Acoes de **Gerar Devolucao** e **Desfazer Devolucao** sao ocultadas para rascunhos.
- As acoes de mudanca de status ficam no menu de 3 pontos de cada pedido (`OrderHistoryCard` / `OrderHistoryRow`).

### Selos de Triagem nos Cards e Linhas

- **Etiquetado** (`isStockChecked`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos do tipo `assistance`.
- **Bling** (`isRegisteredInBling`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos `draft`, cancelados ou `assistance`.
- Os selos ficam **antes** dos badges informativos na lista de badges.
- Sao botoes clicaveis sem checkbox visivel que alternam o valor diretamente.

### Itens Temporarios (Produto sem Cadastro no Banco)

- Item e temporario quando nao tem `productId` ou tem `isTemporaryProduct: true`.
- O aviso visual `TemporaryProductAlert` e a prop `highlightAsTemporary` (`BodyRow.tsx`) aparecem **exclusivamente** em itens temporarios.
- Itens com produto cadastrado **nao** recebem aviso.
- Itens temporarios **nao** geram movimentacao de estoque.
- Criterio de item valido para estoque: `item.productId` valido e `!item.isTemporaryProduct`.

### Devolucoes de Pedidos

- Gera novo pedido `orderType: 'return'` vinculado ao original via `returnOrderId`.
- **Gerar Devolucao** (`generateReturn`): visivel apenas se nao ha devolucao ja gerada (`!hasReturn`), o pedido nao for rascunho e `canGenerateReturn(order)` retornar `true` (status `fulfilled`).
- **Desfazer Devolucao** (`undoReturn`): visivel apenas se `hasReturn === true` e nao for rascunho.
- Os dois botoes sao mutuamente exclusivos na exibicao.
- Devolucao `scheduled` nao movimenta estoque. Devolucao `fulfilled` cria entrada somente para item cadastrado; item temporario atendido permanece pendente.
- Ao reconciliar item temporario no pedido de venda, propagar produto/variacao para a devolucao vinculada. Se ela ja estiver atendida, materializar sua entrada historica uma unica vez; se estiver agendada, aguardar o atendimento.
- Devolucao preserva a saida da venda e usa o CMV historico materializado para valorizar a entrada quando disponivel. Custo desconhecido permanece nao apurado.

### Acoes Pos-Venda

- Para vendas com status **Agendado** (`scheduled`), o menu de tres pontos exibe apenas o atalho **Acoes pos-vendas** para impressao, envios, avaliacao e convite VIP.
- Os botoes individuais dessas acoes nao aparecem no menu de tres pontos; ficam reunidos no modal de acoes pos-venda, que tambem e exibido ao concluir o cadastro.
- O atalho nao aparece em rascunho, atendido, cancelado nem em outros tipos de pedido.

### Estoque e CMV (CMPM)

- O histórico válido de `inventory_moves` é a fonte da verdade para auditoria e reprocessamento cronológico.
- `stock` e `costPrice` do produto/variação são o estado materializado usado nas entradas e saídas normais; o valor financeiro do saldo é derivado de `stock × costPrice`.
- O CMV unitário é materializado no item e na movimentação da venda. Recebimentos históricos corrigidos reprocessam o SKU afetado e atualizam seu cache e CMVs posteriores.

---

## MODULO: ESTOQUE (Stock > Movimentacoes)

### Tabela Central: `inventory_moves`

Toda movimentacao de estoque e registrada em `inventory_moves` com:
- `type`: `'entry'` (entrada) ou `'withdrawal'` (saida)
- `relatedEntityType`: `'sales_order'` | `'purchase_order'` | `'adjustment'` | `'manual'`
- `relatedEntityId`: ID da entidade de origem
- `status`: `'effective'`, `'reversed'`, `'cancelled'`

### Comunicacao Entre Modulos e Movimentacoes de Estoque

| Evento no Sistema | Tipo de Movimentacao | Funcao Responsavel |
|---|---|---|
| Pedido agendado (`scheduled`) | **Saida** (`withdrawal`) | `handleStockAndBusinessRules()` em `orderHistoryService.ts` |
| Pedido atendido (`fulfilled`) | **Saida** (`withdrawal`) | `handleStockAndBusinessRules()` em `orderHistoryService.ts` |
| Pedido cancelado (`cancelled`) | **Estorno** das saidas | `cancelInventoryMovesByRelatedEntity()` em `inventoryService.ts` |
| Item do pedido editado (pos estoque lancado) | **Estorno item anterior + nova saida** | `getChangedSaleItems()` + `reverseSaleItemMoves()` em `saleItemInventorySync.ts` |
| Devolucao atendida (`return fulfilled`) | **Entrada** (`entry`) | `processReturnInventoryEntries()` em `returnInventoryService.ts` |
| Recebimento confirmado (`received`) | **Entrada** (`entry`) | `goodsReceiptService.ts` ao confirmar recebimento |
| Recebimento estornado (`estornado`) | **Estorno** das entradas | `goodsReceiptService.ts` ao estornar recebimento |
| Ajuste ou lancamento manual no Estoque | `entry` ou `withdrawal` | `StockLaunchModal.tsx` ou `InventoryAuditModal.tsx` |

### Rastreamento de Estoque por Pedido

- `stockProcessed: boolean` (dentro de `order_data`): rastreia se a saida ja foi lancada. `true` = lancada; `false` = pendente.
- Saidas sao geradas por FIFO (ordem dos lotes de entrada), item a item.
- Ao cancelar pedido: estorno automatico de todas as saidas; `stockProcessed` volta a `false`.
- Ao editar item de pedido ja processado: estorno do item anterior + nova saida do item corrigido.

### Arquivo Central de Estoque

`inventoryService.ts` e o ponto de entrada para toda movimentacao. Todos os modulos importam `saveInventoryMove()` deste arquivo.

---

## MODULO: RECEBIMENTO DE MERCADORIAS (Stock > Recebimentos)

- **Rascunho** (`status: 'draft'`): auto-salvo silenciosamente ao adicionar fornecedor + 1 item.
- **Confirmado** (`status: 'received'`): botao **Confirmar Recebimento** — lanca entradas (`type: 'entry'`) em `inventory_moves`.
- **Estornado** (`status: 'estornado'`): reverte todas as entradas lancadas no estoque.
- Botao de exclusao (lixeira): aparece **exclusivamente para rascunhos**.
- Chave de acesso NF-e: max 44 digitos numericos, formatada em blocos de 4 (`XXXX XXXX ...`). Determina badge **Com NF** vs **Sem NF**.
- Fornecedor selecionado no filtro e persistido em `localStorage` por dispositivo.

---

## MODULO: APLICATIVO MOBILE (Expo / EAS)

### Versionamento Semantico (MAJOR.MINOR.PATCH)

- **PATCH (`x.x.+1`)**: correcoes de bug, ajustes de layout, melhorias de estabilidade.
- **MINOR (`x.+1.0`)**: novas telas, novos modulos, novas integracoes, novas funcionalidades.
- **MAJOR (`+1.0.0`)**: grandes reestruturacoes ou breaking changes de arquitetura.

Ao incrementar versao em `mobile/app.json`, sincronizar:
- `"version"` (ex: `"1.0.1"`)
- `"runtimeVersion"` (ex: `"1.0.1"`)
- `"versionCode"` em android (inteiro sequencial: 1, 2, 3...)

---

## MAPA DE ARQUIVOS CRITICOS

| Arquivo | Modulo | Responsabilidade |
|---|---|---|
| `erp/src/pages/utils/orderHistoryService.ts` | Pedidos | CRUD, status, estoque automatico, notificacoes |
| `erp/src/pages/utils/saleItemInventorySync.ts` | Pedidos | Helpers de sync de estoque por item |
| `erp/src/pages/utils/inventoryService.ts` | Estoque | CRUD central de `inventory_moves`, FIFO, estorno |
| `erp/src/pages/utils/returnInventoryService.ts` | Devolucoes | Entrada de estoque de devolucoes atendidas |
| `erp/src/pages/utils/goodsReceiptService.ts` | Recebimentos | Confirmacao e estorno, lancamento de entradas |
| `erp/src/pages/utils/purchaseService.ts` | Compras | Pedidos de compra e entradas via `purchase_order` |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRow.tsx` | Pedidos | Renderizacao de item com aviso de temporario |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard.tsx` | Pedidos | Card de pedido (visao cards) |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx` | Pedidos | Linha de pedido (visao tabela) |
| `erp/src/pages/App/SalesOrder/OrderActions/orderActionsConfig.ts` | Pedidos | Configuracao dos botoes de acao |
| `erp/src/pages/App/Stock/components/InventoryMovesHistory.tsx` | Estoque | Listagem e filtros de movimentacoes |
| `erp/src/pages/App/Stock/components/InventoryAuditModal.tsx` | Estoque | Auditoria e correcao manual de estoque |
