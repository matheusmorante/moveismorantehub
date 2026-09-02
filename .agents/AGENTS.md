# Regras e Comportamentos do Sistema - Morante Hub

Este documento registra as regras e comportamentos **implementados** no sistema, organizados por modulo, para evitar regressoes.

---

## REGRAS GERAIS DO AGENTE

- **Git Push**: Nao executar `git push` automaticamente. Aguardar solicitacao explicita do usuario.
- **Modularizacao**: Arquivos acima de 500 linhas ou com mais de uma responsabilidade devem ser divididos. Aplicar apos cada tarefa.
- **Idioma dos termos no ERP**: Produtos **Ativos** / **Desativados** (nunca publicados/despublicados). No catalogo digital: **Publicado no Catalogo** / **Ocultado do Catalogo**.
- **Retrocompatibilidade e Análise de Impacto**: Antes e durante a criação/alteração de novas estruturas de dados ou snapshots, analisar o impacto em registros históricos legados. Sempre garantir fallbacks resilientes e consultar o usuário sobre decisões de adaptação/migração quando houver ambiguidade.

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

### Listagem de Produtos (Tabela e Cards)

- **Cards em Telas Menores que XL (< 1280px)**: A listagem de produtos transita automaticamente para a visualização em **Cards** (`ProductCard`) em qualquer resolução menor que `xl` (`width < 1280px`), tablets ou ambiente mobile/webview (utilizando controle duplo via Tailwind `hidden xl:block` / `xl:hidden` e hook de `window.innerWidth`). A **Tabela** (`ProductTable`) é reservada para telas largas a partir de 1280px (`xl` em diante).
- **Remoção do Rótulo Redundante 'Produto'**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o selo/badge redundante com texto "Produto" foi removido, mantendo a listagem mais limpa. Selos especiais como "Serviço", "Combo" ou "Oportunidade" continuam ativos normalmente.
- **Cor do Título do Produto Pai**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o título/nome do produto pai utiliza a cor padrão escura (`text-slate-900 dark:text-slate-100`), harmonizada com as variações e produtos simples.
- **Contagem de Variações ao Lado do Título (Tabela)**: Na tabela de produtos (`ProductRow`), ao lado direito do título/nome do produto pai, é exibido um selo/badge indicando o quantitativo de variações filhas cadastradas (ex: `3 variações` ou `1 variação`).
- **Abertura Exclusiva de Edição via Botão de Editar**: Clicar na linha da tabela (`ProductRow`) ou na área livre do card (`ProductCard`) **NÃO** abre o modal de edição de produto. A abertura do modal de edição (`onEdit`) é acionada **exclusivamente** pelo clique no botão de edição (ícone de lápis `bi-pencil` / `bi-pencil-fill`).
- **Expansão de Variações ao Clicar na Linha / Card**: Ao clicar na linha da tabela (`ProductRow`) ou no card (`ProductCard`) de um produto pai que possui variações, as variações filhas são exibidas/recolhidas automaticamente (com cursor pointer). Os botões de ação (editar com lápis, 3 pontinhos e tags de catálogo) contam com stopPropagation e executam suas respectivas ações isoladamente.
- **Cards em Telas Menores que XL (< 1280px)**: A listagem de produtos transita automaticamente para visualização em **Cards** (`ProductCard`) em resoluções menores que `xl` (`width < 1280px`) ou ambiente mobile/webview, reservando a visualização em **Tabela** (`ProductTable`) para telas largas a partir de 1280px (`xl` em diante).
- **Fundo Cinza para o Produto Pai**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o produto pai (`isParent`) recebe background cinza destacado (`bg-slate-200/70 dark:bg-slate-800/80`), diferenciando-o visualmente dos produtos simples e das variações filhas.
- **Ordem das Colunas na Tabela**: A coluna **Produto/Variação** vem posicionada antes da coluna **SKU** por padrão. O botão dropdown de expandir/recolher variações filhas (`isExpanded`) e o recuo `↳` ficam localizados no início da coluna de Produto/Variação.
- **Dropdown de Variações (Ocultas por Padrão)**:
  - No início da linha da tabela (coluna de Produto/Variação) e no topo do card do produto pai, há um botão dropdown/chevron (`bi-chevron-right` / `bi-chevron-down`).
  - Por padrão, as variações filhas vêm **recolhidas/ocultas**, deixando a listagem de produtos mais limpa e organizada.
  - Ao clicar no botão dropdown, as variações filhas daquele produto pai são exibidas (na tabela como linhas filhas indentadas com `↳`, e nos cards como lista interna de variações).
- **Selo de Oportunidade e Contagem de Variações Alinhados na Mesma Linha**: Na tabela de produtos (`ProductRow`), o selo/badge de oportunidade (`oppName`) e a contagem de variações (`X variações`) ficam posicionados na mesma linha do título/nome do produto pai, organizados de forma fluida (`flex items-center gap-2 flex-wrap`).
- **Remoção do Selo 'VARIANTE' nas Linhas Filhas**: O badge com texto 'VARIANTE' foi removido das linhas de variações filhas na tabela de produtos, mantendo a listagem mais limpa, visto que o recuo hierárquico `↳` e o dropdown do produto pai já identificam claramente a condição de variação.
- **Cabeçalho da Tabela Limpo**: As colunas da tabela de produtos não exibem botão de olhinho de ocultação rápida no cabeçalho; o gerenciamento de visibilidade é feito no menu dedicado.
- **Largura Expandida da Coluna Produto/Variação (Tabela)**: A coluna de **Produto/Variação** possui largura dobrada com `min-w-[520px] w-[45%]`, garantindo espaço visual amplo e confortável para fotos, chevrons expansíveis de variação, nomes longos, tags de oportunidade e contagem de variações.
- **Contagens da Sidebar Exclusivas para Variações**: Nas contagens de resumo da sidebar de produtos (Total de Cadastrados, Publicados, Desativados e Rascunhos), são contabilizadas **exclusivamente as variações filhas** (`product_variations`), visto que os produtos pais são apenas agupadores/referências estruturais e não produtos reais de venda/estoque.

---

## MODULO: PEDIDOS DE VENDA (SalesOrder)

### Status e Restricoes de Rascunho

- Status possiveis: `draft`, `scheduled`, `fulfilled`, `cancelled` (e outros customizados via `settings.orderStatuses`).
- **Cadastramento e Mudança de Status no Formulário**:
  - Ao clicar em **Cadastrar Pedido** (ou **Concluir Pedido**), o pedido deixa de ser rascunho.
  - Para entregas em domicílio ou retiradas com agendamento futuro/pendente: o status torna-se **Agendado** (`scheduled`).
  - Para retiradas imediatas na loja (sem agendamento futuro ou com data de hoje e sem agendamento pendente): o status torna-se diretamente **Atendido** (`fulfilled`).
- **Ações Pós-Venda (`PostOrderActionsModal`) e Preservação de Status**:
  - Ao concluir ou cadastrar um pedido, o status é resolvido imediatamente para `scheduled` ou `fulfilled`.
  - O modal de ações pós-venda (`PostOrderActionsModal`) registra cliques nos botões de pós-venda (como imprimir comprovante, enviar WhatsApp) atualizando exclusivamente o mapa `isButtonsClicked` no banco, sem passar snapshot estático/desatualizado que possa reverter o status para rascunho ou sobrescrever o código sequencial (`orderIndex`).

### Código Sequencial Obrigatório do Pedido (`orderIndex`)

- **Geração Imediata na Abertura do Formulário**:
  - Ao abrir o formulário de cadastro de novo pedido, orçamento ou cópia/duplicação de pedido, o código sequencial de 6 dígitos (`orderIndex`, ex: `#002485`) é **gerado imediatamente** e exibido no cabeçalho do formulário.
  - Cópia/duplicação de pedidos **nunca herda** o código do pedido original; um novo código exclusivo é gerado no ato da abertura.
- **Unicidade Estrita e Bloqueio sem Código**:
  - Nenhum pedido pode ter o mesmo código de outro.
  - Se houver falha na geração do código, o formulário bloqueia tanto o salvamento como rascunho (auto-save desativado) quanto a finalização do cadastro, exibindo erro imediato.
  - É expressamente proibido persistir pedidos sem código (`orderIndex: null` ou `orderIndex: undefined`).
  - **Blindagem em Updates (`updateOrder`)**: Atualizações em pedidos (inclusive auto-saves parciais) nunca podem sobrescrever o `orderIndex` existente com `undefined`. Propriedades `undefined` são filtradas e o código sequencial prévio é estritamente preservado. Se algum pedido legado ou corrompido for atualizado sem código, um código sequencial único de 6 dígitos é gerado imediatamente. Sincroniza também a coluna `order_number` da tabela `orders`.


### Vendedor da Venda (Snapshot de Nome e ID)

- Qualquer colaborador cadastrado pode ser selecionado como vendedor na venda.
- O pedido persiste o snapshot do nome (`seller`) e do identificador do colaborador (`sellerId`), garantindo consistência histórica mesmo se o colaborador for editado posteriormente.

### Paginação na Listagem de Pedidos (`OrderPagination`)

- **Paginação Padrão Obrigatória**:
  - A listagem de pedidos utiliza paginação fixa de **30 pedidos por página** (`itemsPerPage = 30`).
  - Aplica-se uniformemente tanto à visualização em **Tabela** (`OrderHistoryTable` / `OrderHistoryRow`) quanto à visualização em **Cards** (`OrderHistoryCard`).
  - Os botões de navegação de páginas (anterior, páginas numéricas com reticências inteligentes, próxima e indicador de contagem) ficam localizados **no rodapé da listagem**.
  - Ao navegar entre as páginas, a página realiza um scroll suave automaticamente para o topo da lista de pedidos.

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

## MODULO: GESTÃO DE ACESSOS E USUÁRIOS (`/acessos-e-usuarios`)

### Central Unificada de Acessos e Usuários
- Acessível no menu de perfil do ERP e rotas `/acessos-e-usuarios` (com aliases legíveis `/access-and-users` e `/users`).
- **Aba Colaboradores & Usuários**:
  - Gerenciamento completo (CRUD: listagem, busca, criação, edição, inativação e exclusão) dos usuários e colaboradores.
  - Atribuição de **Perfis de Acesso de Usuário** (`roles: UserRole[]`), permitindo que um usuário possua múltiplos perfis simultâneos (ex: Vendedor + Entregador/Montador).
  - Opções de perfil de acesso: `Administrador` (`administrator`), `Gestor` (`manager`), `Estoquista` (`stockist`), `Vendedor` (`seller`), `Entregador / Montador` (`deliverer`), `Sem Acesso` (`pending`).
  - **Regra de Colaborador por Perfil de Acesso**: Todo usuário que recebe pelo menos um perfil de acesso ativo (diferente de pendente/sem acesso) torna-se automaticamente um colaborador e passa a constar na lista de colaboradores do sistema.
  - **Cargo Principal vs Perfis de Acesso**:
    - **Cargo Principal (`position`)**: Representa a profissão / função desempenhada pelo colaborador na empresa (ex: Vendedor, Gerente Comercial, Montador, Auxiliar Administrativo, Estoquista).
    - **Perfis de Acesso (`roles`)**: Representam as permissões de acesso ao sistema (ex: Administrador, Gestor, Vendedor, Estoquista).
    - Ambas as dimensões são independentes: um colaborador pode ter Cargo Principal de "Vendedor" e possuir Perfil de Acesso de "Administrador" ou vice-versa, sem qualquer conflito.
- **Aba Permissões por Perfil de Acesso**:
  - Configuração granular de ações permitidas organizadas por **Tópico Principal (Perfil de Acesso)**, **Subtópicos (Áreas do Sistema: Vendas & Pedidos, Estoque & Produtos, Financeiro & Relatórios, Cadastros, Configurações & Acessos)** e **Ações Executáveis com Checkbox** (Visualizar, Criar/Editar, Excluir/Cancelar, Iniciar Entrega, Movimentar Estoque, Exportar, etc.).
  - **Permissões Acumulativas**: Usuários com múltiplos perfis de acesso acumulam todas as permissões concedidas a qualquer um dos seus perfis (`canPerform` avalia via união lógica/acumulativa).
  - Administrador possui acesso total fixo e irrestrito.
  - Permissões são persistidas em tempo real no `localStorage` e Supabase via `settings.data.rolePermissions` com fallbacks resilientes.
- **Unicidade Estrita e Sincronização Google (1 Colaborador por E-mail)**:
  - Cada e-mail possui apenas 1 colaborador único no sistema.
  - Ao logar/cadastrar via Google Auth, se já existir um colaborador com o e-mail, ele recebe e atualiza as informações do Google (`full_name`, etc.), sem criar duplicados. Se não existir, cria exatamente 1 novo colaborador.

---

## MODULO: APLICATIVO MOBILE (Expo / EAS)

### Navegação e Rótulos do App Mobile

- A aba principal no menu inferior (`NativeBottomNav`) é identificada pelo rótulo **Início** (anteriormente "Dashboard"), correspondendo à tela principal de visão geral e atalhos operacionais.
- **Regra de Abas na Barra / Bottom Bar de Navegação (Máximo de 5)**:
  - A barra inferior exibe no máximo **5 botões**.
  - Se a quantidade de abas visíveis ultrapassar 5 (`> 5`), as primeiras **4 abas** permanecem fixas e a **5ª posição** é automaticamente preenchida por um botão de 3 pontinhos (**Mais** com ícone `MoreHorizontal`).
  - Ao clicar no botão de 3 pontinhos, abre-se um **Bottom Sheet** animado contendo todas as opções de menu e abas excedentes da 5ª em diante.
- **Menu e Módulo de Produtos no App Mobile (`NativeProductsScreen`)**:
  - Visibilidade restrita aos usuários que possuem perfil de **Vendedor** (`seller`), Gestor (`manager`) ou Administrador (`admin` / `administrator`). A opção no painel inferior só aparece para quem possui essa permissão.
  - Tela completa de produtos em formato de Cards responsivos com busca rápida (nome, código, SKU), paginação (30 itens por página) e filtros rápidos (Todos, Ativos, Desativados, Rascunhos e Categorias).
    - **Cards Mobile Idênticos ao ERP**:
      - **Foto Exclusiva nas Variações**: O card principal não exibe foto; as fotos são mostradas exclusivamente nas variações filhas expandidas.
      - **Selo de Oportunidade**: Destaque com ícone de fogo (`Flame`) e cor âmbar quando vinculado a uma oportunidade.
      - **Selo de Fornecedor**: Exibição do fornecedor com ícone de caminhão (`Truck`).
      - **Fundo Cinza para o Produto Pai**: Produtos com variações (`isParent`) recebem fundo cinza suave destacado, diferenciando-os dos produtos simples.
      - **Identificação do Produto Pai e Dropdown Variações (X)**: Produtos que possuem 1 ou mais variações filhas são exibidos com o card do **Produto Pai** (título, código do pai, tags de oportunidade e fornecedor) e botão de alternância `Variações (X)` (ex: `Variações (1)`). Ao tocar no card ou no botão, as variações filhas são reveladas internamente com suas respectivas fotos, SKUs formatados obrigatoriamente com o sufixo numérico `${parentCode}-${suffix}` (ex: `000244-01`), preços e estoques.
      - **Preço e Estoque**: Produtos com variações indicam que preço e estoque pertencem às variações filhas (`-`); produtos simples exibem seus valores diretamente.
      - **Status e Catálogo**: Selos de Ativo/Desativado/Rascunho e toggle de catálogo (no produto simples ou em cada variação filha).
  - **Cabeçalho Limpo com Busca Direta**: O cabeçalho de produtos mobile mantém foco e limpeza visual: não exibe botão de atualizar nem botões/pills de filtro; possui apenas o título/contador, a **barra de pesquisa por texto** (nome, código, SKU) e o botão de 3 pontinhos no canto direito:
    - **Novo Produto**: formulário modal com abas (Básico, Preços & Estoque, Variações), permitindo salvar como Ativo ou Rascunho.
    - **Configurações de Produto**: modal com acesso direto ao gerenciamento de **Categorias** (CRUD completo) e **Atributos e Variações** (CRUD completo de atributos globais e opções/valores de variação).
  - **Geração 100% Automática de Código / SKU (Sem Input Manual)**:
    - No app mobile, o código principal do produto e os SKUs das variações filhas **não possuem input manual** de texto.
    - Ao abrir o formulário para criar um novo produto, o código sequencial de 6 dígitos (ex: `000245`) é gerado imediatamente via `getNextSequentialProductCode` e exibido no cabeçalho do modal.
    - As variações filhas têm seus SKUs gerados automaticamente via `generateVariationSku` no padrão oficial `${parentCode}-${suffix}` (ex: `000245-01`, `000245-02`), idêntico à regra do ERP.

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
