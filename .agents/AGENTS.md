# Regras e Comportamentos do Sistema - Morante Hub

Este documento registra as regras e comportamentos **implementados** no sistema, organizados por modulo, para evitar regressoes.

---

## REGRAS GERAIS DO AGENTE

- **Git Push**: Nao executar `git push` automaticamente. Aguardar solicitacao explicita do usuario.
- **Modularizacao**: Arquivos acima de 500 linhas ou com mais de uma responsabilidade devem ser divididos. Aplicar apos cada tarefa.
- **Idioma dos termos no ERP**: Produtos **Ativos** / **Desativados** (nunca publicados/despublicados). No catalogo digital: **Publicado no Catalogo** / **Ocultado do Catalogo**.

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

### Catalogo Digital (E-commerce / Vitrine)

- Ao navegar entre as páginas da lista de produtos (paginação), o catálogo realiza um scroll suave automaticamente para o início da grade de produtos.
- As consultas no Supabase devem carregar a totalidade dos produtos publicados (`limit(5000)`) para que a filtragem em tempo real e a paginação do front-end contemplem todos os itens da loja.

---

## MODULO: PEDIDOS DE VENDA (SalesOrder)

### Status e Restricoes de Rascunho

- Status possiveis: `draft`, `scheduled`, `fulfilled`, `cancelled` (e outros customizados via `settings.orderStatuses`).
- **Cadastramento e Mudança de Status no Formulário**:
  - Ao clicar em **Cadastrar Pedido** (ou **Concluir Pedido**), o pedido deixa de ser rascunho.
  - Para entregas em domicílio ou retiradas com agendamento futuro/pendente: o status torna-se **Agendado** (`scheduled`).
  - Para retiradas imediatas na loja (sem agendamento futuro ou com data de hoje e sem agendamento pendente): o status torna-se diretamente **Atendido** (`fulfilled`).

### Código Sequencial Obrigatório do Pedido (`orderIndex`)

- **Geração Imediata na Abertura do Formulário**:
  - Ao abrir o formulário de cadastro de novo pedido, orçamento ou cópia/duplicação de pedido, o código sequencial de 6 dígitos (`orderIndex`, ex: `#002485`) é **gerado imediatamente** e exibido no cabeçalho do formulário.
  - Cópia/duplicação de pedidos **nunca herda** o código do pedido original; um novo código exclusivo é gerado no ato da abertura.
- **Unicidade Estrita e Bloqueio sem Código**:
  - Nenhum pedido pode ter o mesmo código de outro.
  - Se houver falha na geração do código, o formulário bloqueia tanto o salvamento como rascunho (auto-save desativado) quanto a finalização do cadastro, exibindo erro imediato.
  - É expressamente proibido persistir pedidos sem código (`orderIndex: null` ou `orderIndex: undefined`).

### Restricoes de Rascunho (`status: 'draft'`)

- Pedidos em rascunho **nao** podem ter o status alterado diretamente via menu ou seletor de status nos cards e linhas.
- O seletor de status fica desabilitado para rascunhos, exibindo o aviso de que o cadastro precisa ser finalizado.
- Para um pedido em rascunho tornar-se agendado (`scheduled`) ou atendido (`fulfilled`), e obrigatorio abrir o formulario de cadastro/edicao e clicar em **Cadastrar Pedido / Concluir Pedido**.
- Acoes de **Gerar Devolucao** e **Desfazer Devolucao** sao ocultadas para rascunhos.
- As acoes de mudanca de status ficam no menu de 3 pontos de cada pedido (`OrderHistoryCard` / `OrderHistoryRow`).

### Selos de Triagem nos Cards e Linhas

- **Etiquetado** (`isStockChecked`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos do tipo `assistance`.
- **Bling** (`isRegisteredInBling`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos `draft`, cancelados ou `assistance`.
- Os selos ficam **antes** dos badges informativos na lista de badges.
- Sao botoes clicaveis sem checkbox visivel que alternam o valor diretamente.

### Itens Temporarios (Produto sem Cadastro no Banco) e Conciliação Comercial

- Item e temporario quando nao tem `productId` ou tem `isTemporaryProduct: true`.
- O aviso visual `TemporaryProductAlert` e a prop `highlightAsTemporary` (`BodyRow.tsx`) aparecem **exclusivamente** em itens temporarios.
- Itens com produto cadastrado **nao** recebem aviso.
- Itens temporarios **nao** geram movimentacao de estoque em nenhuma hipotese:
  - Nem na criacao/finalizacao de venda (`sale`).
  - Nem na criacao/atendimento de devolucao (`return`).
  - Nem mesmo na **Conciliacao Comercial**.
- **Regra da Conciliacao Comercial**: serve exclusivamente para o relatorio de vendas indexar um produto cadastrado no lugar do item temporario original para fins analiticos/metricas. Ela **nao** lanca saidas na venda nem entradas na devolucao.
- Criterio de item valido para estoque: `item.productId` valido e `!item.isTemporaryProduct`.
- Avisos de confirmacao e tooltips devem sempre explicitar ao usuario que itens sem cadastro nao movimentam estoque.

### Contagem Regressiva e Auto-Atendimento de Pedidos Vencidos (5 Dias)

- **Botão "Pedido Atendido?"**: exibido para pedidos cuja data de entrega/coleta agendada já passou e o status não é `fulfilled`, nem `cancelled`, nem `draft`.
- **Subtítulo no Botão**:
  - Exibe a contagem regressiva: `'Atendido em X dias'` (calculado como $5 - \text{dias passados desde a entrega}$).
  - Se faltar 1 dia: `'Atendido em 1 dia'`.
  - Se faltar 0 dias / hoje: `'Atendido hoje'`.
- **Auto-Atendimento Automático**:
  - Após 5 dias da data de entrega agendada sem atendimento manual, o sistema altera o status do pedido automaticamente para **Atendido** (`fulfilled`).
  - Executa as regras de estoque e persistência pertinentes (`updateOrder`), com proteção contra execuções concorrentes duplicadas.

### Devolucoes de Pedidos

- Gera novo pedido `orderType: 'return'` vinculado ao original via `returnOrderId`.
- **Gerar Devolucao** (`generateReturn`): visivel apenas se nao ha devolucao ja gerada (`!hasReturn`), o pedido nao for rascunho e `canGenerateReturn(order)` retornar `true` (status `fulfilled`).
- **Desfazer Devolucao** (`undoReturn`): visivel apenas se `hasReturn === true` e nao for rascunho.
- Os dois botoes sao mutuamente exclusivos na exibicao.
- **Tipo de Manuseio em Devolucoes**: Pedidos de devolucao (com ou sem vinculo, `orderType: 'return'`) **nao** possuem e nao exigem o campo `Tipo de Manuseio` (`handlingType`). A coluna e o campo sao ocultados e dispensados da validacao.

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

## MODULO: CONTROLE DE ACESSO E COLABORADORES

### Gestão de Acessos (Configurações > Controle de Acesso)
- A seção de Controle de Acesso gerencia **exclusivamente as áreas permitidas por cargo**, espelhando o comportamento do aplicativo mobile.
- Áreas gerenciadas: `manualStockMovement` (Estoque), `productConfig` (Produtos e Cadastros), `viewFinancials` (Financeiro), `deleteOrders` (Excluir Pedidos), `startDelivery` (Iniciar Entrega).
- **Regra do Administrador**: possui acesso total irrestrito e fixo (não pode ser desmarcado).
- Permissões são persistidas em `settings.data.rolePermissions`.

### Atribuição de Cargos (Colaboradores / Employees)
- A atribuição de cargos aos colaboradores é feita **exclusivamente na tela de Colaboradores** (`PersonFormModal`).
- **Múltiplos Cargos**: Um colaborador pode ter múltiplos cargos simultâneos (`roles: UserRole[]`), permitindo selecionar mais de uma função (ex: Vendedor + Entregador/Montador).
- **Unicidade de E-mail**: Colaboradores possuem restrição estrita de unicidade de e-mail. Não é permitido cadastrar ou atualizar dois colaboradores com o mesmo e-mail.
- Opções de cargo no sistema (`role` / `roles`): `Administrador` (`administrator`), `Gestor` (`manager`), `Vendedor` (`seller`), `Entregador / Montador` (`deliverer`), `Sem Acesso` (`pending`).
- Ao salvar um colaborador, os campos `role`, `roles` e `position` são sincronizados com a tabela `profiles` do Supabase para que as permissões de login entrem em vigor imediatamente.
- A listagem de colaboradores exibe os badges de todos os cargos atribuídos ao colaborador.

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
| `erp/src/pages/utils/orderFulfillmentCountdown.ts` | Pedidos | Contagem regressiva de 5 dias e auto-atendimento de pedidos vencidos |
| `erp/src/pages/App/Settings/components/AccessManagementSection.tsx` | Acessos | Gerenciamento de áreas permitidas por cargo (rolePermissions) |
| `erp/src/pages/App/Registrations/shared/PersonFormModal.tsx` | Colaboradores | Formulário de colaborador com seleção de cargo e sync de perfil |
| `erp/src/pages/App/Stock/components/InventoryMovesHistory.tsx` | Estoque | Listagem e filtros de movimentacoes |
| `erp/src/pages/App/Stock/components/InventoryAuditModal.tsx` | Estoque | Auditoria e correcao manual de estoque |
