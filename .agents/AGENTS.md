# Regras e Comportamentos do Sistema - Morante Hub

# Regras e Comportamentos do Sistema - Morante Hub

Este documento registra as regras e comportamentos **implementados** no sistema, organizados por modulo, para evitar regressoes.

---

## REGRAS GERAIS DO AGENTE

- **Gatilho Obrigatório Pré-Edição de Arquivo (Pre-Flight de Skills)**: Antes de propor ou realizar qualquer edição (`replace_file_content` / `write_to_file`) em QUALQUER arquivo, o agente DEVE obrigatoriamente executar a verificação prévia de conformidade com as skills do projeto:
  1. **Tamanho e Coesão (`modularizacao_codigo`)**: Quantas linhas tem o arquivo? Possui responsabilidade única clara? Se ultrapassar 150–200 linhas ou misturar múltiplos domínios, o agente é OBRIGADO a apontar a infração ao usuário e propor/consultar a modularização segura.
  2. **Regras de Negócio (`regras-de-negocio-erp`)**: O arquivo toca pedidos, estoque, custos, devoluções, recebimentos ou fiscal? As regras oficiais de negócio estão sendo estritamente preservadas sem alterações silenciosas?
  3. **Retrocompatibilidade e Histórico (`analise-compatibilidade-mudancas`)**: A alteração afeta snapshots, formatos de dados legados ou estruturas persistidas? Garantir fallbacks resilientes.
  4. **Proteção Contra Custos Cloud (`cloud-free-tier-guard`)**: Se a alteração tocar APIs externas, Cloud, Google Maps, Gemini ou requisições faturáveis, respeita estritamente o teto de R$ 0,00, margem de segurança de 70% do Free Tier, cota diária conservadora, debounce, cache e circuit breaker contra loops?
  5. **Mobile Offline-First (`mobile-offline-first`)**: Se for código do App Mobile em contexto operacional, respeita o ciclo de 4 estados de eventos e autoridade do backend?
  6. **Testes e Validação (`testes-seguros-erp`)**: Validar com testes automatizados antes de concluir a resposta.
- **Git Push**: Nao executar `git push` automaticamente. Aguardar solicitacao explicita do usuario.
- **Modularização Segura e Código Limpo (`modularizacao_codigo`)**: Cada arquivo deve possuir uma única responsabilidade clara. Alvo recomendado de 30–100 linhas (aceitável até aproximadamente 150 linhas; acima de 200 linhas ou infração real analisar divisão). Estratégia conservadora sem perda de código: **COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER**. Nunca alterar regras de negócio silenciosamente durante refatorações. **O agente deve perguntar explicitamente ao usuário no final da resposta se ele deseja modularização SOMENTE se o arquivo tocado realmente infringir responsabilidade única, código limpo ou ultrapassar 200 linhas**, evitando perguntas em arquivos pequenos e coesos.
- **Idioma dos termos no ERP**: Produtos **Ativos** / **Desativados** (nunca publicados/despublicados). No catalogo digital: **Publicado no Catalogo** / **Ocultado do Catalogo**.
- **Ícone e Selos de Montagem (`Drill` - Parafusadeira / Furadeira Preenchida & Cores Padronizadas ERP/Mobile)**:
  - Em todos os módulos (cards e linhas de pedidos, cronograma logístico, lista de montagens, modais e itens), os rótulos e elementos referentes a **Montagem** utilizam o componente preenchido **`Drill`** (`@/components/shared/DrillIcon` no ERP e `MobileDrill` no mobile), com design sólido/preenchido (Filled), em substituição ao martelo e ao ícone linear.
  - **Cores dos Selos**:
    - **Montagem Fora** (na casa do cliente): Fundo **Vermelho** (`bg-red-600` / `#dc2626`).
    - **Montagem Depósito** (antes da entrega/retirada): Fundo **Amarelo** (`bg-amber-500` / `#d97706`).
  - **Exibição Simultânea**: Quando um pedido contém itens com montagem fora e outros com montagem no depósito, o sistema exibe obrigatoriamente **ambos os selos à mostra** lado a lado tanto no ERP quanto no App Mobile.
  - **Rótulos Padronizados**: O rótulo é uniformemente **"Montagem Depósito"** (nunca "Montagem na Loja") e **"Montagem Fora"**, mantendo a mesma linguagem e estilo visual no ERP e no App.
- **Emissão Fiscal SEFAZ-PR — Lista de Itens da Venda e Campos Tributários (`NfeEmissionModal` / `NfeItemsSection`)**:
  - O modal de emissão fiscal exibe a lista completa de itens da venda que estão sendo passados para a NF-e/NFC-e, sem numeração estática `#1, #2...`.
  - Produtos não cadastrados no ERP (`!item.productId`) recebem destaque visual indicativo.
  - O campo de **NCM** é selecionável e pesquisável através do componente `NcmSelect` (com lista de NCMs comuns e digitação livre), exatamente igual ao cadastro de produtos.
  - Não há botões de geração por IA no modal de emissão de NF-e.
  - Todos os campos tributários essenciais (**CFOP**, **CSOSN / CST**, **Origem da Mercadoria** e **CEST**) são padronizados através de `<select>` tanto no cadastro de produtos quanto na emissão de notas fiscais.
- **Preservação Fiel do Manuseio de Itens do Pedido**: O manuseio individual selecionado pelo usuário para cada item no formulário do pedido é estritamente preservado e nunca sobrescrito por valores genéricos. No modal de detalhes do pedido (`ItemsTable`), o badge de manuseio respeita as cores oficiais de montagem (amarelo para depósito, vermelho para fora com ícone `Drill`).
- **Inputs Numéricos (Sem Borda Divisória em Símbolos)**: Nos inputs numéricos de todo o sistema (`CurrencyInput`, `CurrencyOrPercentInput`, `UnitInput`), os símbolos monetários (`R$`), unidades de quantidade (`UN`) e símbolos percentuais (`%`) não possuem linha ou borda vertical separadora (`border-r` / `border-l`) dividindo o símbolo do valor digitado, garantindo visual limpo, contínuo e moderno.
- **Cálculo Automático de Distância, Rotas e Frete (Google Maps)**:
  - O cálculo de distância via Google Maps no formulário de pedidos (`handleAutoCalculateDistance`) prioriza e resolve dinamicamente o endereço ativo selecionado: se `shipping.useCustomerAddress === false` e houver endereço de entrega alternativo, calcula para o endereço alternativo; caso contrário, calcula para o endereço principal do cliente.
  - A função de geocodificação (`geocodeAddress` em `maps.ts`) possui suporte a fallback resiliente (se a busca com número falhar, tenta sem número e, em último caso, aproxima pelas coordenadas cadastradas do bairro/cidade), evitando falhas silenciosas.
  - Na busca de endereços (`searchAddressSuggestions`) e nos componentes de formulário (`AddressAutocompleteInput`, `usePersonForm`, `ShippingData`), o estado padrão é **Paraná (`PR`)**, garantindo que consultas do Google Places fiquem restritas a municípios paranaenses e que preenchimentos via CEP ou seleção nunca limpem ou deixem o estado em branco.
  - **Autopreenchimento Completo na Seleção de Sugestão de Endereço (`AddressAutocompleteInput` / `addressParsing`)**: Ao clicar em qualquer sugestão retornada pelo Google Places, o sistema preenche de forma imediata e síncrona os campos de **Rua/Logradouro**, **Bairro**, **Cidade** e **Estado (UF)** (normalizado estritamente para sigla de 2 letras maiúsculas, ex: `PR`, `SP`), refinando de forma não bloqueante via Place Details (número, CEP e coordenadas). O algoritmo prioriza os termos estruturados (`terms`) do Google Places e garante que a cidade nunca seja confundida com o bairro caso a via não possua bairro cadastrado.
- **Retrocompatibilidade e Análise de Impacto**: Antes e durante a criação/alteração de novas estruturas de dados ou snapshots, analisar o impacto em registros históricos legados. Sempre garantir fallbacks resilientes e consultar o usuário sobre decisões de adaptação/migração quando houver ambiguidade.
- **Buscas e Filtros Insensíveis a Acentos (Accent-Insensitive) em Todo o Sistema**:
  - Em todos os inputs de busca, autocompletes, modais e filtros de listagem (em especial **Itens do Pedido / `ProductAutocomplete`**, busca de clientes, vendedores, produtos, serviços, etiquetas, financeiro e logística), a digitação do operador é **100% insensível a acentuações**.
  - O usuário pode digitar letras com ou sem qualquer acento (ex: `sofa` acha `Sofá`, `comoda` acha `Cômoda`, `armario` acha `Armário`, `joao` acha `João`), devendo utilizar o utilitário `normalizeSearchTerm` (Unicode NFD + remoção de diacríticos `\u0300-\u036f`) em memória e/ou `buildAccentInsensitiveRegex` em consultas com suporte a regex (`imatch`).
- **Mobile Offline-First Baseado em Eventos (`mobile-offline-first`)**: No aplicativo Mobile, o suporte offline-first é restrito ao **risco operacional de campo e depósito**: entregas, montagens, checklists, assinaturas, fotos, vistorias, **inventário físico e recebimento/conferência de mercadorias**. Operações administrativas (criação/edição de produtos, precificação, dashboard/métricas) são estritamente **Online-First**. O mobile nunca grava estados absolutos (como `stock = X`), mas registra **eventos de negócio com UUID idempotente, timestamp e ciclo de 4 estados: `PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`** (onde `REJECTED` interrompe retentativas e exige atenção do operador). O backend é a autoridade estrita para validar regras, encadeamentos e movimentações de estoque. Mídias possuem fila separada de upload. Avaliar automaticamente o escopo em novos recursos mobile sem perguntas repetitivas.

---

## MODULO: PRODUTOS

### Ciclo de Vida do Produto e Independência de Catálogo

| Estado | Condicao no Banco |
|---|---|
| **Produto Ativo** | `is_draft: false`, `active: true`, `deleted: false` |
| **Produto Desativado** | `is_draft: false`, `active: false`, `deleted: false` |
| **Rascunho** | `is_draft: true` ou `status == 'draft'` |

- **Presença na Lista Principal (Rascunhos e Desativados)**: Tanto produtos desativados quanto rascunhos de produtos (`is_draft: true` ou `status == 'draft'`) aparecem diretamente na listagem normal com seus respectivos selos indicativos (âmbar para Rascunho, vermelho para Desativado), sem telas isoladas. O botão segregador de rascunhos do cabeçalho foi removido.
- **Independência Total entre Ativo/Desativado e Catálogo Digital**: A ativação/desativação no ERP (`active: true/false`) não interfere nem altera o status do produto no Catálogo Meta/Digital (`status: published/hidden`), e vice-versa.
- **Rascunhos**: Aparecem na listagem normal e podem ser filtrados no select avançado de Situação no ERP ou na sanfona de Resumo.
- Produto concluído (`is_draft: false`) **NUNCA** volta para rascunho.
- **Requisitos de Ativação no ERP**:
  - Para ativar um produto ou variação no ERP, **não** é obrigatório preencher preço de custo (o custo é preenchido na entrada de compras ou quando se lança estoque inicial).
  - Os requisitos mínimos para ativação no ERP são: **Nome do Produto**, **Preço de Venda** (para produtos simples ou na variação), **Categoria** e **Fornecedor**.
  - O alerta de requisitos pendentes exibe **apenas e exclusivamente os campos que estiverem de fato faltando**, e não uma mensagem genérica fixa.
- Rascunho só é criado se o usuário preencher ao menos o nome e não finalizar. Fechar sem nome = nenhum rascunho criado.
- Ao editar produto já concluído, o auto-save de rascunho é desativado.
- **Descarte de Rascunho nos 3 Pontinhos**: Produtos em rascunho possuem a opção **"Descartar Rascunho"** (ícone `bi-trash3-fill` em vermelho) no menu de 3 pontinhos tanto na tabela (`ProductRow`) quanto nos cards (`ProductCard`). Ao confirmar a exclusão definitiva, o rascunho e suas variações filhas associadas são removidos de forma permanente.
- **Bloqueio de Ativação e Publicação para Rascunhos**: Produtos em rascunho (`is_draft: true` ou `status == 'draft'`) **não podem ser ativados no ERP nem publicados no Catálogo Digital**. Os botões de status de canais (`ChannelStatusBadges`) exibem o estado Inativo / Oculto com tooltips orientativos. Ao clicar para ativar ou publicar, o sistema impede a operação e emite um aviso explicativo via toast informando que o usuário deve terminar o cadastramento do produto antes de ativá-lo ou publicá-lo.

### Variacoes de Produtos

- Ao criar variacao, campos de Informacoes Tecnicas e Precificacao chegam com **Herdar do Pai marcado** por padrao (`syncDescription`, `syncWidth`, `syncHeight`, `syncDepth`, `syncWeight: true`).
- Botao de adicionar atributo a variacao: chama-se **Adicionar** (nao `+ Vinculo`).
- Botao de gerenciar atributos globais: chama-se **Gerenciar Atributos** (nao `+ Criar Atributo`).

### Fotos do Produto e Recorte 1:1 (`SquareImageCropper`)

- **Proporção Quadrada 1:1**: Imagens enviadas para produtos e variações utilizam proporção 1:1 padronizada para exibição uniforme no ERP e catálogo.
- **Moldura sem Borda Interna**: Ao aplicar moldura branca de expansão, a foto interna não possui bordas ou traçados visíveis sobrepostos.
- **Cantos Retos nos Cards de Foto**: Os cards e slots de foto na aba de fotos e no modal de recorte utilizam bordas retas sem cantos arredondados (`rounded-none`).
- **Resolução de CORS e Canvas Tainted**: O carregamento de fotos externas (ex: Cloudflare R2) para manipulação em `<canvas>` utiliza proxy anti-CORS para prevenir o bloqueio de segurança `Tainted canvases may not be exported` na exportação do Blob.

### Listagem de Produtos (Tabela e Cards)

- **Cards em Telas Menores que XL (< 1280px)**: A listagem de produtos transita automaticamente para a visualização em **Cards** (`ProductCard`) em qualquer resolução menor que `xl` (`width < 1280px`), tablets ou ambiente mobile/webview (utilizando controle duplo via Tailwind `hidden xl:block` / `xl:hidden` e hook de `window.innerWidth`). A **Tabela** (`ProductTable`) é reservada para telas largas a partir de 1280px (`xl` em diante).
- **Remoção do Rótulo Redundante 'Produto'**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o selo/badge redundante com texto "Produto" foi removido, mantendo a listagem mais limpa. Selos especiais como "Serviço", "Combo" ou "Oportunidade" continuam ativos normalmente.
- **Cor do Título do Produto Pai**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o título/nome do produto pai utiliza a cor padrão escura (`text-slate-900 dark:text-slate-100`), harmonizada com as variações e produtos simples.
- **Contagem de Variações ao Lado do Título (Tabela)**: Na tabela de produtos (`ProductRow`), ao lado direito do título/nome do produto pai, é exibido um selo/badge indicando o quantitativo de variações filhas cadastradas (ex: `3 variações` ou `1 variação`).
- **Abertura de Edição via Botão de Editar e Menu de 3 Pontinhos**: Clicar na linha da tabela (`ProductRow`) ou na área livre do card (`ProductCard`) **NÃO** abre o modal de edição de produto. A abertura do modal de edição (`onEdit`) é acionada pelo clique no botão de edição (ícone de lápis `bi-pencil`) ou pela opção **"Editar Produto"** presente no menu de 3 pontinhos tanto na tabela quanto nos cards. As variações filhas não possuem botões de editar (lápis) nem menu de 3 pontinhos nas linhas/cards; a edição de qualquer variação é realizada exclusivamente acessando o formulário modal de edição do produto pai (aba Variações).
- **Expansão de Variações ao Clicar na Linha / Card**: Ao clicar na linha da tabela (`ProductRow`) ou no card (`ProductCard`) de um produto pai que possui variações, as variações filhas são exibidas/recolhidas automaticamente (com cursor pointer). Os botões de ação (editar com lápis, 3 pontinhos e tags de catálogo) contam com stopPropagation e executam suas respectivas ações isoladamente.
- **Cards em Telas Menores que XL (< 1280px)**: A listagem de produtos transita automaticamente para visualização em **Cards** (`ProductCard`) em resoluções menores que `xl` (`width < 1280px`) ou ambiente mobile/webview, reservando a visualização em **Tabela** (`ProductTable`) para telas largas a partir de 1280px (`xl` em diante).
- **Fundo Cinza para o Produto Pai e Fundo Branco para Variações**: Tanto na visualização em Tabela (`ProductRow`) quanto em Cards (`ProductCard`), o produto pai (`isParent`) recebe background cinza destacado (`bg-slate-200/70 dark:bg-slate-800/80`), diferenciando-o visualmente. Cada variação (tanto no card isolado quanto na lista expandida do produto pai ou na tabela) possui obrigatoriamente **background branco puro** (`bg-white dark:bg-slate-900`).
- **Ordem das Colunas na Tabela**: A coluna **Produto/Variação** vem posicionada antes da coluna **SKU** por padrão. O botão dropdown de expandir/recolher variações filhas (`isExpanded`) e o recuo `↳` ficam localizados no início da coluna de Produto/Variação.
- **Dropdown de Variações (Ocultas por Padrão)**:
  - No início da linha da tabela (coluna de Produto/Variação) e no topo do card do produto pai, há um botão dropdown/chevron (`bi-chevron-right` / `bi-chevron-down`).
  - Por padrão, as variações filhas vêm **recolhidas/ocultas**, deixando a listagem de produtos mais limpa e organizada.
  - Ao clicar no botão dropdown, as variações filhas daquele produto pai são exibidas (na tabela como linhas filhas indentadas com `↳`, e nos cards como lista interna de variações).
- **Selo de Oportunidade e Contagem de Variações Alinhados na Mesma Linha**: Na tabela de produtos (`ProductRow`), o selo/badge de oportunidade (`oppName`) e a contagem de variações (`X variações`) ficam posicionados na mesma linha do título/nome do produto pai, organizados de forma fluida (`flex items-center gap-2 flex-wrap`).
- **Remoção do Selo 'VARIANTE' nas Linhas Filhas**: O badge com texto 'VARIANTE' foi removido das linhas de variações filhas na tabela de produtos, mantendo a listagem mais limpa, visto que o recuo hierárquico `↳` e o dropdown do produto pai já identificam claramente a condição de variação.
- **Cabeçalho da Tabela e Sidebar Limpos**: As colunas da tabela de produtos não exibem botão de olhinho de ocultação rápida no cabeçalho e a seção de visibilidade de colunas na sidebar foi removida, mantendo todas as colunas padrão sempre visíveis e a interface limpa e focada.
- **Largura Expandida da Coluna Produto/Variação (Tabela)**: A coluna de **Produto/Variação** possui largura dobrada com `min-w-[520px] w-[45%]`, garantindo espaço visual amplo e confortável para fotos, chevrons expansíveis de variação, nomes longos, tags de oportunidade e contagem de variações.
- **Contagens da Sidebar Exclusivas para Variações**: Nas contagens de resumo da sidebar de produtos (Total de Cadastrados, Publicados, Desativados e Rascunhos), são contabilizadas **exclusivamente as variações filhas** (`product_variations`), visto que os produtos pais são apenas agrupadores/referências estruturais e não produtos reais de venda/estoque.
- **Coluna e Botões de Status de Canais (ERP e Catálogo)**:
  - A coluna de canais chama-se **"Status de Canais"** na tabela (`COLUMNS_DEF`) e nas preferências de visibilidade de colunas.
  - Utiliza botões/pills bipartidos (`ChannelStatusBadges`):
    - **Botão ERP**: Tag fixa `ERP` em azul suave + status interativo `Ativo` (verde com ponto) ou `Inativo` (cinza com ponto). Alterna o estado ativo/inativo no ERP ao clicar.
    - **Botão Catálogo**: Tag fixa `Catálogo` em roxo suave + status interativo `Publicado` (verde com ponto) ou `Oculto` (cinza com ponto). Alterna publicação no Catálogo Digital ao clicar.
  - A ação de Ativar/Desativar produto foi removida do menu de 3 pontinhos e agora é acionada diretamente pelo botão de ERP na coluna e nos cards.
  - O mesmo padrão bipartido aplica-se na visualização em **Tabela** (`ProductRow`), nos **Cards** (`ProductCard`) e na listagem expandida de variações filhas.
  - **Alternância de Catálogo Digital Resiliente**: O toggle de catálogo sincroniza o status (`published`/`hidden`) tratando tanto variações simples quanto compostas no Supabase, garantindo integridade de slugs (`normalizeSlug` e `resolveUniqueSlug`) sem interrupções por ReferenceError.
- **Sincronização Total no App Mobile (`MobileProductCard` e `MobileProductVariationList`)**:
  - A listagem de produtos no app mobile segue rigorosamente a mesma lógica e linguagem visual do ERP:
    - Rascunhos aparecem na listagem principal com badge indicativo em tom âmbar (`Rascunho`).
    - Produtos desativados aparecem na listagem principal com badge indicativo em vermelho (`Desativado`).
    - Botões bipartidos de canais (`ERP: Ativo/Inativo` e `Catálogo: Publicado/Oculto`) com cores e dots de status padronizados.
    - Bloqueio para rascunhos: produtos em rascunho não podem ser ativados nem publicados; o app emite aviso preventivo orientando a concluir o cadastro.
    - Variações filhas com cards individuais em fundo branco puro (`#ffffff`), cantos arredondados, bordas sutis e botões de canais bipartidos.
- **Atualização Instantânea e Otimista de Status sem Recarregamento de Tela (`toggleActive` / `deactivateCatalog`)**:
  - Ao clicar no botão de status de canais (tanto **ERP: Ativo/Inativo** quanto **Catálogo: Publicado/Oculto**) na tabela ou nos cards, o status é alternado **imediatamente na interface** através de atualização de estado local otimista (`setServerProducts`), sem recarregar a página, sem flicker/piscar de tela e sem exibir o spinner de loading global.
  - As funções `toggleActive` e `deactivateCatalog` em `useProducts.ts` nunca disparam `refresh()` bloqueante; a sincronização com o banco de dados (`products` e `product_variations`) ocorre de forma resiliente em segundo plano (background).
  - Em caso de falha na persistência no banco, o sistema realiza rollback automático para o status anterior e notifica o operador via toast de erro.

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

- **Edição de Pedido Exclusiva no Menu de 3 Pontinhos**:
  - Na listagem de pedidos (tanto na visualização em Tabela quanto em Cards), o nome do cliente não exibe botão ou ícone de lápis de edição (`bi-pencil`) nem aciona edição ao ser clicado.
  - A ação de editar pedido fica centralizada e disponível exclusivamente através da opção **"Editar Pedido"** presente no menu de 3 pontinhos (`OrderOptionsMenu`).

### Código Sequencial Obrigatório do Pedido (`orderIndex`)

- **Geração Imediata na Abertura do Formulário**:
  - Ao abrir o formulário de cadastro de novo pedido, orçamento ou cópia/duplicação de pedido, o código sequencial de 6 dígitos (`orderIndex`, ex: `#002485`) é **gerado imediatamente** e exibido no cabeçalho do formulário.
  - Cópia/duplicação de pedidos **nunca herda** o código do pedido original; um novo código exclusivo é gerado no ato da abertura.
- **Unicidade Estrita e Bloqueio sem Código**:
  - Nenhum pedido pode ter o mesmo código de outro.
  - Se houver falha na geração do código, o formulário bloqueia tanto o salvamento como rascunho (auto-save desativado) quanto a finalização do cadastro, exibindo erro imediato.
  - É expressamente proibido persistir pedidos sem código (`orderIndex: null` ou `orderIndex: undefined`).
  - **Blindagem em Updates (`updateOrder`)**: Atualizações em pedidos (inclusive auto-saves parciais) nunca podem sobrescrever o `orderIndex` existente com `undefined`. Propriedades `undefined` são filtradas e o código sequencial prévio é estritamente preservado. Se algum pedido legado ou corrompido for atualizado sem código, um código sequencial único de 6 dígitos é gerado imediatamente. Sincroniza também a coluna `order_number` da tabela `orders`.


### Modais de Cadastro e Edição de Pedido em Tela Cheia (`NewSaleOrder` / `OrderEditModal`)

- **Sobreposição Completa do Cabeçalho (Full Screen) e Bloqueio de Scroll**: Tanto o modal de novo pedido ([`NewSaleOrder.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/SalesOrder/NewSaleOrder.tsx)) quanto o modal de edição ([`OrderEditModal.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/SalesOrder/OrderEditModal.tsx)) e assistência ([`AssistanceOrderModal.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/SalesOrder/AssistanceOrderModal.tsx)) são renderizados em **tela cheia (full screen)** (`fixed inset-0 w-screen h-screen`) com camada superior `z-[999999]`, ficando estritamente por cima do header principal da aplicação (`AppLayout` com `z-[99999]`). Modais auxiliares disparados de dentro do pedido (como edição/criação de cliente via [`PersonFormModal.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/erp/src/pages/App/Registrations/shared/PersonFormModal.tsx) e confirmações) utilizam camada `z-[9999999]`, garantindo que fiquem sempre visíveis sobre o formulário full screen. O toast container utiliza `z-[9999999]` para manter notificações sempre visíveis. Enquanto abertos, bloqueiam o scroll da página de trás (`document.body.style.overflow = 'hidden'`), restaurando o scroll original ao fechar.

### Itens do Pedido em Cards para Telas Menores que XL (< 1280px) (`ItemsTable` / `BodyRow`)

- **Transição Automática para Cards**: Em qualquer resolução menor que `xl` (`width < 1280px`), a aba de itens do formulário de pedidos transita automaticamente para a visualização em **Cards** (`isCardsView = width < 1280`), reservando a tabela de 8 colunas exclusivamente para monitores largos (>= 1280px).
- **Estrutura Organizada dos Cards (`BodyRow`)**:
  - Cada card possui fundo branco puro com cantos arredondados (`rounded-3xl`), botão de exclusão ágil no canto superior direito (`absolute top-3.5 right-3.5`), sem cabeçalhos redundantes de `#1` ou repetição de nome, iniciando diretamente pelos campos funcionais.
  - **Linha 1 (Descrição em Largura Total)**: O campo de descrição/busca do item ocupa toda a largura da linha (`w-full`), com check verde de confirmação exclusivamente dentro do próprio input (`ProductAutocomplete`), com borda inferior verde, mantendo o rótulo "Descrição do Item *" limpo, neutro e sem checks duplicados.
  - **Linha 2 (Manuseio e Observação Lado a Lado)**: O campo **Tipo de Manuseio** (`Tipo de Manuseio *`) e o campo **Observação** (`Ex: salvados, peça do mostruário com avaria...`) ficam dispostos na mesma linha de forma fluida e alinhada.
  - **Linha 3 (Valores Numéricos)**: A linha numérica de valores utiliza um grid fluido e simétrico (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end`), alinhando Qtd, Preço Un., Desc. R$, Desc. %, Preço Un. Líq. e Total do Item sem quebras desordenadas.
- **Cabeçalho Compacto da Seção de Itens (`SectionCard` / `compactHeader`)**:
  - O cabeçalho da seção **Itens do Pedido** utiliza modo compacto (`compactHeader`), reduzindo a altura ocupada com ícone menor (`w-7 h-7 sm:w-8 sm:h-8`), tipografia ajustada (`text-sm sm:text-base font-black tracking-wider`), padding vertical contido e botão de adicionar item harmonizado (`px-3 py-1.5 sm:py-2 rounded-xl`).
  - A adição de novos itens é acionada exclusivamente pelo botão "Adicionar Item" do cabeçalho, mantendo a visualização limpa e sem botões redundantes no rodapé.

### Etapa Cliente no Formulário de Pedido (`CustomerData`)

- **Feedback Visual de Cliente Selecionado**: Quando um cliente está selecionado (`isCustomerSelected` com ID/nome e termo ativo), o input de busca/seleção exibe um ícone de check circular verde no início (`bi-check-circle-fill text-emerald-600 dark:text-emerald-400`), padding adaptado (`pl-9`), e a borda inferior em tom verde vibrante (`border-emerald-500 focus:border-emerald-600 dark:border-emerald-500 dark:focus:border-emerald-400`) para confirmação imediata ao operador de que o cliente foi selecionado com sucesso.
- **Campo de Logradouro com Sugestões do Google Places (`PersonFormModal`)**:
  - O rótulo é simplificado para **"Logradouro"** (com `*` para clientes), com placeholder `Ex: Rua das Flores, Avenida Brasil...` e botão **"Rota"** (`bi-geo-alt-fill` em azul).
  - **Autocomplete do Google Places**: Ao digitar 2 ou mais caracteres no campo de Logradouro (clientes, fornecedores ou colaboradores), é exibido um dropdown suspenso via `DropdownPortal` com sugestões em tempo real do Google Places.
  - Ao selecionar uma sugestão, os detalhes oficiais são obtidos via `fetchPlaceDetails` (`Geocoder.geocode({ placeId })`), preenchendo automaticamente rua, bairro, cidade, estado, número (se retornado) e CEP caso ainda não preenchidos.
  - O input possui busca com debounce de 300ms e fechamento automático ao clicar fora.
- **Remoção do Campo 'Nome Social' no Formulário de Cliente**: O campo desnecessário de "Nome Social" foi removido do cadastro/edição de clientes PF no `PersonFormModal`, alinhando simetricamente o grid com Nome Completo em destaque (`col-span-2`), CPF e Telefone.

### Etapa Logística: Frete e Distância Automáticos (`FreteDistancia` / `ShippingData`)

- **Uso Exclusivo da API do Google Maps (Sem APIs de Fallback)**:
  - O sistema opera **única e exclusivamente com a API oficial do Google Maps** para serviços geoespaciais, rotas e distâncias.
  - Não são utilizadas APIs de fallback ou serviços terceiros abertos (proibido o uso de OSRM, OpenRouteService, Nominatim/OSM, ArcGIS, Photon ou cálculos por aproximação geodésica em linha reta).
  - Geocodificação de endereços: realizada exclusivamente via `google.maps.Geocoder`.
  - Cálculo de rotas e distâncias: realizado exclusivamente via `google.maps.DirectionsService`.
  - Sugestões e autocompletar de endereços: realizado via cache de endereços e `google.maps.places.AutocompleteService` / Geocoder.
  - Caso a API do Google Maps esteja sem chave configurada ou retorne erro (ex: `REQUEST_DENIED` por falta de faturamento vinculado no Google Cloud Console), o sistema reporta o status sem recorrer a APIs secundárias de terceiros.
- **Botão Único "Auto" com Ícone de Raio**:
  - Na seção de frete e distância da etapa logística, há um botão único **"Auto"** com ícone de raio à esquerda (`bi-lightning-charge-fill`).
  - O botão vem **ligado por padrão** (`autoCalculateValue: true`) em novos pedidos.
  - Quando ativo, calcula automaticamente a distância via rotas da Directions API do Google Maps e o valor proporcional do frete.
  - Ao ligar o botão, se houver endereço de entrega informado, dispara imediatamente o recálculo automático da rota.
- **Bloqueio Condicional dos Inputs**:
  - **Com "Auto" Ligado**: Ambos os inputs (**Valor do Frete** e **Distância KM**) ficam bloqueados para alteração (`disabled` com estilo desativado `cursor-not-allowed bg-slate-50/60 dark:bg-slate-800/30`), garantindo que o frete e a quilometragem reflitam com precisão a rota calculada pela API do Google Maps.
  - **Com "Auto" Desligado**: Os dois inputs tornam-se imediatamente editáveis para preenchimento manual livre pelo operador.
  - O link/botão **"Ver Rota"** permanece sempre clicável para abrir o Google Maps em uma nova aba com o trajeto traçado.



### Vendedor da Venda (Apenas Colaboradores Habilitados)

- Apenas colaboradores ativos com perfil de acesso válido (`isValidEmployee`) aparecem listados para seleção como vendedor da venda no formulário e no modal de busca.
- O pedido persiste o snapshot do nome (`seller`) e do identificador do colaborador (`sellerId`), garantindo consistência histórica mesmo se o colaborador for editado posteriormente.

### Paginação e Busca na Listagem de Pedidos (`OrderPagination` / `OrderCustomerSearchBar`)

- **Barra de Pesquisa por Nome do Cliente**:
  - No início da listagem de pedidos (tanto para visualização em tabela quanto em cards), há uma barra de pesquisa rápida (`OrderCustomerSearchBar`) permitindo filtrar instantaneamente pedidos pelo nome do cliente com botão de limpeza rápida (`X`).
- **Paginação Padrão Obrigatória**:
  - A listagem de pedidos utiliza paginação fixa de **30 pedidos por página** (`itemsPerPage = 30`).
  - Aplica-se uniformemente tanto à visualização em **Tabela** (`OrderHistoryTable` / `OrderHistoryRow`) quanto à visualização em **Cards** (`OrderHistoryCard`).
  - Os botões de navegação de páginas (anterior, páginas numéricas com reticências inteligentes, próxima e indicador de contagem) ficam localizados **no rodapé da listagem**.
  - Ao navegar entre as páginas, a página realiza um scroll suave automaticamente para o topo da lista de pedidos.

### Restricoes de Rascunho (`status: 'draft'`)

- Pedidos em rascunho **nao** podem ter o status alterado diretamente via menu ou seletor de status nos cards e linhas.
- O seletor de status fica desabilitado para rascunhos, exibindo o aviso de que o cadastro precisa ser finalizado.
- Para um pedido em rascunho tornar-se agendado (`scheduled`) ou atendido (`fulfilled`), e obrigatorio abrir o formulario de cadastro/edicao e clicar em **Cadastrar Pedido / Concluir Pedido**.
- **Abertura do Formulário ao Clicar no Card ou Linha de Rascunho**: Clicar na área livre do card (`OrderHistoryCard`) ou na linha da tabela (`OrderHistoryRow`) de um pedido com status `draft` abre diretamente o formulário para retomar e finalizar o cadastramento.
- Acoes de **Gerar Devolucao** e **Desfazer Devolucao** sao ocultadas para rascunhos.
- **Menu de Ações do Rascunho (3 pontinhos)**: Exibe as opções **Retomar Cadastramento** (azul com `bi-arrow-repeat`) e **Descartar Rascunho** (vermelho com `bi-trash3-fill`), com tipografia (`text-xs font-black uppercase tracking-widest`) e espaçamento vertical uniformizados.
- **Cancelamento de Venda Agendada (`CancelScheduledSaleButton`)**:
  - Para pedidos de venda (`sale` ou `showroom`) com status **Agendado** (`scheduled`), o menu de 3 pontos exibe o botão **"Cancelar venda"** em vermelho com ícone `bi-x-circle-fill`.
  - Ao clicar, abre o modal de confirmação `CancelSaleModal`, esclarecendo que a ação é definitiva e que as saídas de estoque vinculadas serão estornadas. O botão de confirmação possui um contador regressivo de 5 segundos (`5s`) para prevenir cliques acidentais antes de ser liberado para clique.
  - Ao confirmar, o status é alterado para `cancelled` e o estoque estornado automaticamente via regras centrais de estoque.
  - **Ocultação do Botão de Editar em Cancelados e Atendidos**: O botão de editar (ícone de lápis) é ocultado tanto nos cards quanto no menu de 3 pontinhos para pedidos com status **Cancelado** (`cancelled`) ou **Atendido** (`fulfilled`).
  - O carimbo **"CANCELADO"** (`CancelledOrderBadge`) mantém **100% de opacidade e brilho normal/vívido** (`bg-red-600` com texto e borda brancos nítidos), posicionado no centro sem inclinação na Tabela e com inclinação nos Cards.
  - **Botão de 3 Pontinhos com Cor Normal e Camada Superior**: Tanto nos cards quanto na tabela, o botão de 3 pontinhos fica em `z-20` sobre o overlay escurecido com 100% de nitidez e brilho vívido para permitir a cópia do pedido.
  - **Fundo Escurecido em Toda a Largura da Linha na Tabela (`OrderHistoryRow`)**: Em pedidos cancelados, o efeito visual acinzentado/escurecido de baixa luminosidade e opacidade atenuada estende-se por todas as células da linha. O carimbo **"CANCELADO"** e o botão de 3 pontinhos permanecem com 100% de nitidez e brilho vívido.
  - **Remoção de Checkbox de Seleção na Tabela**: A coluna de checkbox foi removida da visualização em tabela de pedidos, deixando o layout mais limpo e focado.
  - **Cor do Selo/Botão de Rascunho (`status: 'draft'`)**: O botão/selo de status dos pedidos em rascunho utiliza exatamente o mesmo tom de cinza do selo de etiquetado (`bg-slate-400 dark:bg-slate-600 border-slate-500 dark:border-slate-600`), mantendo perfeita consistência visual com ícone branco `bi-clock` tanto na tabela quanto nos cards.
  - **Cor do Selo/Botão de Cancelado (`status: 'cancelled'`)**: O botão/selo de status dos pedidos cancelados utiliza background vermelho (`bg-red-600 border-red-700`) com ícone branco tanto na tabela quanto nos cards.




### Selos de Triagem nos Cards e Linhas

- **Etiquetado** (`isStockChecked`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos do tipo `assistance`.
- **Bling** (`isRegisteredInBling`): verde solido (`bg-emerald-600`) quando marcado; cinza slate quando nao marcado. Nao aparece para pedidos `draft`, cancelados ou `assistance`.
- Os selos ficam **antes** dos badges informativos na lista de badges.
- Sao botoes clicaveis sem checkbox visivel que alternam o valor diretamente.

### Observações por Item de Pedido de Venda (`item.observation`)

- Cada item do pedido suporta um campo de texto de observação (`observation`), acessível tanto na visualização em tabela desktop quanto nos cards mobile.
- **Concatenação na Impressão e WhatsApp**: Quando preenchido, o texto da observação do item é anexado ao nome/descrição do produto no formato `${item.description} - ${item.observation}` na folha de pedido impressa (`OrderPage`), no recibo impresso (`ReceiptPage`), nas ordens de serviço (`orderActionsConfig`) e nas mensagens automáticas de WhatsApp (`formatters.ts` / `whatsapp.ts`).
- **Alinhamento da Tabela de Itens e Resumo (`OrderPage/ItemsTable`)**: A tabela de especificações dos itens e o resumo de rodapé (`Footer`) possuem rigorosamente 5 colunas alinhadas: (1) Descrição/Resumo, (2) Qtd, (3) Preço Un./Subtotal, (4) Desc. Un./Desc. Total, e (5) Valor Total/Total Itens. A célula de Resumo não utiliza `colSpan={2}` para evitar empurrar as colunas de valores para a direita.

### Assinatura Digital no Recibo do Pedido (`ReceiptPage` / `DigitalSignatureBadge`)

- **Remoção de Assinatura Manual**: O campo/linha em branco de assinatura manual do vendedor foi removido do recibo (`ReceiptPage`).
- **Carimbo com Assinatura Digital e QR Code**: O recibo passa a exibir um selo/carimbo oficial (`DigitalSignatureBadge`) com:
  - Rótulo de documento assinado digitalmente com padrão ICP-Brasil / A1.
  - Dados da empresa (Razão/Nome e CNPJ), emissor/vendedor responsável, data e hora da assinatura.
  - Código de validação determinístico do pedido.
  - QR Code dinâmico gerado via `bwip-js` para consulta e autenticação pública do comprovante/recibo.

### Preenchimento Automático de Desconto e Preço Líquido ao Selecionar Produto (`getSelectedProductPricing`)

- Ao selecionar um produto ou variação cadastrada na lista de itens do pedido (`useSalesOrderForm.ts` e `ReturnItemsTable.tsx` via `getSelectedProductPricing`):
  - **Preço Unitário de Tabela (`unitPrice`)**: Puxa o preço original do produto/variação (sem promoção).
  - **Desconto Unitário (`unitDiscount`)**: Se o produto possuir preço promocional (`promoPrice > 0 && promoPrice < unitPrice`), o desconto é calculado automaticamente (`unitPrice - promoPrice`) e preenchido como valor fixo (`discountType: 'fixed'`).
  - **Preço Unitário Líquido (`Preço Un. Líq.` / `tempSubtotal`)**: Reflete o valor promocional final do produto (`promoPrice`), exibindo claramente a economia do cliente no item.
  - **Sem Promoção**: Se o produto não tiver preço promocional cadastrado, o desconto é preenchido com zero (`0,00`) e o preço líquido torna-se idêntico ao preço unitário de tabela.

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

### Edição de Pedido, Substituição de Itens Temporários e Recálculo de Status de Estoque

- **Geração de Baixa na Troca para Produto Cadastrado**: Ao editar um pedido de venda e substituir itens temporários por produtos cadastrados do catálogo (ou adicionar novos produtos cadastrados), o sistema gera automaticamente a baixa de saída de estoque (`handleStockAndBusinessRules`) para todos os itens cadastrados que ainda não possuíam saída vinculada ao pedido.
- **Estorno de Itens Alterados ou Excluídos**: Se itens cadastrados prévios forem alterados ou removidos na edição, as saídas de estoque vinculadas ao item anterior são estornadas automaticamente via `reverseSaleItemMoves`.
- **Recálculo Fidedigno de Status de Estoque**:
  - A função `isPartialSaleStockMovement` avalia a cobertura real entre os itens elegíveis do pedido e os produtos com saída efetiva no banco (`movedProductIds`).
  - Quando **todos os itens vendáveis** do pedido forem produtos cadastrados e possuírem saída de estoque registrada, `isPartialStockProcessed` é atualizado para `false` no banco e o selo de estoque torna-se **Verde** (**Saída Efetivada**).
  - Quando houver itens sem cadastro (temporários) misturados com itens cadastrados, ou quando nem todos os itens cadastrados possuírem saída no banco, o selo é **Laranja/Âmbar** (**Saída Parcial**).

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
- Ao cancelar pedido: estorno automatico de todas as saidas; `stockProcessed` volta a `false` e `stockReversed` torna-se `true`.
- Ao editar item de pedido ja processado: estorno do item anterior + nova saida do item corrigido.
- **Selo de Movimentação de Estoque no Pedido (`InventoryMovementBadge` - Ícone da Caixa)**:
  - **Amarelo (`border-amber-600 bg-amber-500 text-white`)**: Movimentação parcial de estoque (ícone `PackageCheck` do lucide-react). Exibido quando apenas alguns itens do pedido tiveram saída/entrada gerada (ex: pedido misto com produtos cadastrados e itens sem cadastro/temporários ou serviços, saídas de apenas parte dos itens, ou devolução parcial com `returnKind === 'partial'`).
  - **Verde (`bg-emerald-600`)**: Saída/Entrada completa efetivada para todos os itens no estoque (ícone `PackageCheck`).
  - **Cinza (`bg-slate-400 dark:bg-slate-600`)**: Sem movimentação lançada (ícone `Package`).
  - **Vermelho (`bg-red-600 border-red-700`)**: Movimentação de estoque estornada / cancelada (ícone `PackageX` do lucide-react).
  - **Detalhamento de Itens no Popover (`InventoryBadgePopover`)**: Ao passar o mouse sobre o selo, o modal flutuante exibe a lista de todos os itens da venda com nome, quantidade e status de movimentação: `Efetivada` (verde), `Estornada` (vermelho), `Não efetivada` (cinza) e `Item não cadastrado (sem movimentação)` (âmbar com aviso explícito).
- **Rótulo Visual no Histórico de Movimentações (Stock > Movimentações)**: Movimentações estornadas (`status === 'reversed'` ou `cancelled`) exibem rótulos de tipo e status com **fundo amarelo / âmbar** (`bg-amber-100 / bg-amber-50 dark:bg-amber-950`).

### Arquivo Central de Estoque

`inventoryService.ts` e o ponto de entrada para toda movimentacao. Todos os modulos importam `saveInventoryMove()` deste arquivo.
- **Custo Médio Ponderado Móvel (CMPM / CMV)**: Apurado a partir do histórico de movimentações em `inventory_moves` (`unit_cost`). A tabela `product_variations` **não possui** a coluna `cost_price`; o custo cadastral base reside exclusivamente em `products.cost_price` (do qual as variações filhas herdam). Nunca tentar selecionar ou atualizar `product_variations.cost_price`.


---

## MODULO: RECEBIMENTO DE MERCADORIAS (Stock > Recebimentos)

- **Rascunho** (`status: 'draft'`): auto-salvo silenciosamente ao adicionar fornecedor + 1 item.
- **Confirmado** (`status: 'received'`): botao **Confirmar Recebimento** — lanca entradas (`type: 'entry'`) em `inventory_moves`.
- **Estornado** (`status: 'estornado'`): reverte todas as entradas lancadas no estoque, exibindo o selo de status com **fundo vermelho** (`bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400`).
- Botao de exclusao (lixeira): aparece **exclusivamente para rascunhos**.
- Chave de acesso NF-e: max 44 digitos numericos, formatada em blocos de 4 (`XXXX XXXX ...`). Determina badge **Com NF** vs **Sem NF**.
- **Seleção Obrigatória de Fornecedor para Registrar Recebimento**: Na tela de recebimentos de mercadorias (`/stock/receipts`), o botão **"Registrar recebimento"** é exibido exclusivamente quando um fornecedor está selecionado no campo de busca/filtro.
- **Estilo Verde de Confirmação em Campos de Fornecedor (`SupplierAutocomplete`)**: Todos os campos de seleção de fornecedor no sistema exibem estilo visual verde esmeralda suave com borda destacada, ícone de check preenchido (`bi-check-circle-fill`), badge "Selecionado" e botão de limpar seleção (`X`) quando um fornecedor válido está selecionado.
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
| `erp/src/pages/Stock/components/InventoryAuditModal.tsx` | Estoque | Auditoria e correcao manual de estoque |
| `erp/src/pages/App/Dashboard/Index.tsx` | Dashboard | Orquestrador principal do Dashboard |
| `erp/src/pages/App/Dashboard/useDashboardData.ts` | Dashboard | Métricas de vendas, cálculo real de CMV/CMPM e séries |
| `erp/src/pages/App/Dashboard/hooks/useDashboardOperational.ts` | Dashboard | Indicadores operacionais (abertos, entregas, montagens, recebimentos) |
| `erp/src/pages/App/Dashboard/hooks/useDashboardStock.ts` | Dashboard | Alertas de estoque zerado, mínimo e inventários em andamento |
| `erp/src/pages/App/Dashboard/hooks/useDashboardProducts.ts` | Dashboard | Performance de produtos e identificador de produtos parados |
| `erp/src/pages/utils/nfe/nfeService.ts` | Fiscal | Orquestrador central de validação, numeração e emissão NF-e/NFC-e |
| `erp/src/pages/utils/nfe/nfeXmlBuilder.ts` | Fiscal | Montador de XML Layout 4.00 com suporte a homologação SEFAZ |
| `erp/src/pages/utils/nfe/nfeAccessKey.ts` | Fiscal | Cálculo de chave de acesso (44 dígitos) e DV módulo 11 |
| `erp/src/pages/utils/nfe/danfeGenerator.ts` | Fiscal | Gerador e impressor de DANFE oficial |
| `erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx` | Fiscal | Modal de emissão, teste de homologação, XML e DANFE |

---

## MODULO: EMISSÃO FISCAL SEFAZ (NF-e / NFC-e)

### Separação entre Domínio Comercial e Documento Fiscal
- **Fronteira Comercial vs Fiscal**:
  - **Regra de Ouro:** Nenhum fluxo comercial deve montar diretamente XML, CFOP, finalidade, referências (NT 2026.002) ou eventos SEFAZ. Essas decisões pertencem exclusivamente ao módulo fiscal.
  - A NF-e/NFC-e autorizada **NUNCA** é editada ou excluída. Cancelamentos e devoluções são registrados via novos estados fiscais ou emissão de documentos reversos vinculados.
  - O módulo fiscal **NUNCA altera estoque diretamente**. O estoque é governado exclusivamente pelas operações comerciais/pedidos (`orders` / `inventory_moves`), e o módulo fiscal apenas reflete/documenta a operação.
- **Ações na Tela Fiscal (`/fiscal-documents` — Vendas > Notas Fiscais)**:
  - Exclusivamente voltada para administração de eventos SEFAZ: **Consultar Situação SEFAZ**, **Cancelar NF (se cancelável/não entregue)**, **Carta de Correção (CC-e - EXCLUSIVA PARA NF-e 55, proibida para NFC-e 65)**, **Reenviar/Consultar Transmissão**, **Baixar XML**, **Visualizar/Imprimir DANFE** e **Inutilizar Numeração**.
- **Ações na Tela de Pedidos (`/sales-order` — Pedidos de Venda / Pós-Venda)**:
  - **Cancelar Venda (Apenas pedidos NÃO ATENDIDOS / antes da entrega)**: Desfaz a operação comercial, estorna saídas de estoque e, se houver NF-e/NFC-e autorizada e cancelável (`canCancelFiscalDocument`), solicita o cancelamento SEFAZ. Pedidos com status **Atendido (`fulfilled`) NÃO podem ser cancelados**; devem seguir obrigatoriamente para Devolução.
  - **Registrar Devolução Total / Parcial (Para mercadorias já entregues)**: Cria a devolução comercial, lança a entrada dos itens no estoque, calcula o financeiro e solicita ao módulo fiscal a determinação e emissão do documento fiscal de entrada apropriado (considerando UF, documento original e NT 2026.002).
  - **Troca de Mercadoria**: Devolução do item antigo (entrada de estoque + solicitação fiscal de devolução) + Novo Pedido de Venda do novo produto (saída de estoque + solicitação de nova NF-e).

### Regras de Emissão e Homologação (`tpAmb = 2`)
- **Regra de Modelo do Documento (`fiscalDocumentRule.ts`)**:
  - Pedidos com entrega (`shipping.deliveryMethod === 'delivery'`): Sugerida **NF-e (Modelo 55)**.
  - Pedidos com retirada no balcão/loja (`shipping.deliveryMethod === 'pickup'`): Sugerida **NFC-e (Modelo 65)**.
- **Ambiente de Homologação (Testes SEFAZ)**:
  - Destinatário recebe nome oficial obrigatório: `"NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"`.
  - Tarja de aviso visual no DANFE: `"NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL"`.
  - Chave de acesso de 44 dígitos calculada rigorosamente pelo algoritmo Módulo 11 (ponderação 2 a 9).
  - XML estruturado no padrão Layout 4.00 com detalhamento de produtos (NCM, CST/CSOSN 102, CFOP, PIS/COFINS CST 49) e totais.
- **Configurações Fiscais da Empresa (`CompanyFiscalDataSection.tsx` / `FiscalSettingsSection.tsx`)**:
  - Cadastro de Inscrição Estadual (IE), Inscrição Municipal, CRT (Simples Nacional), Endereço completo com Código IBGE do Município (PR), Ambiente padrão e Série.
- **Persistência do Histórico Fiscal**:
  - Dados da nota fiscal autorizada/homologada (`accessKey`, `nfeNumber`, `series`, `model`, `environment`, `protocolNumber`, `xml`, `emittedAt`) são vinculados diretamente ao pedido (`order.nfeData`) e salvos no histórico `nfe_documents`.
  - O DANFE gerado pode ser impresso ou visualizado a qualquer momento via botão no modal e ações do pedido.

---

## MODULO: DASHBOARD PRINCIPAL DO ERP (`/`)

### Hierarquia e Componentes
- **KPIs Principais (`KpiRow.tsx`)**: Faturamento, Vendas, Ticket Médio, Lucro Bruto, Margem Bruta (%) e CMV apurado por CMPM histórico (`item.unitCost ?? item.costPrice`).
- **Gráfico de Vendas (`SalesChart.tsx`)**: Alternância entre Faturamento, Lucro e Pedidos, com granularidade temporal dinâmica (por hora em Hoje/Ontem; por dia em semanas/mês; por mês em ano/semestre).
- **Central de Atenção (`AttentionPanel.tsx`)**: Restrita **exclusivamente** a Estoque Baixo (zerado e mínimo) e Inventário em Andamento. Nunca incluir outros tipos de alerta.
- **Central Operacional (`OperationPanel.tsx`)**: 6 cards clicáveis com contagem em tempo real (Em Aberto, Agendados, Entregas Hoje, Atrasadas, Montagens e Recebimentos pendentes).
- **Performance de Produtos (`ProductsPanel.tsx`)**: Top 5 por Faturamento, Pedidos, Lucro e aba **Parados** com seletor de 30, 60 e 90 dias sem vendas.
- **Pedidos Recentes (`RecentOrders.tsx`)**: Últimos 5 pedidos com status, valores e link para o pedido de venda.
- **Radar Geográfico (`GeoMapPanel.tsx`) & Logística (`LogisticsPanel.tsx`)**: Mapa térmico de vendas com expansão/retração e métricas de entregas e KM rodados.
- **Atalhos Rápidos (`QuickActions.tsx`)**: Localizados no cabeçalho do Dashboard para acesso imediato a Novo Pedido, Recebimento, Novo Produto, Cronograma e Inventário.
- **Card de Monitoramento de APIs (`ApiUsageSummaryCard.tsx`)**: Exibe no Dashboard o total de requisições do mês, franquia configurada, estimativa de custo em R$, status dos limites e atalho para a tela completa de gerenciamento de APIs (`/api-usage`).

---

## MODULO: ENDEREÇOS E SUGESTÕES DE LOGRADOURO (`AddressAutocompleteInput`)

- **Padronização Global de Logradouro com Google Places API**:
  - Em **todos os campos de endereço/logradouro** do ERP (`PersonFormModal` - clientes, fornecedores e colaboradores; `ShippingData` - entrega de pedidos; `AssistanceCustomerSection` - assistência técnica; `CompanyFiscalDataSection` - dados fiscais da empresa emitente; `OrderRouteMap` - mapa e rotas), a digitação do logradouro utiliza exclusivamente o componente padronizado **`AddressAutocompleteInput`** (`@/components/shared/AddressAutocompleteInput`).
  - O componente desacopla o menu de sugestões em **`AddressSuggestionsMenu`** (`@/components/shared/AddressSuggestionsMenu`), respeitando o princípio de responsabilidade única e modularização limpa.
  - **UF Padrão "PR" (Paraná) e Filtro Geográfico por Estado**:
    - O campo de Estado / UF vem preenchido por padrão com `PR` em todos os formulários (`PersonFormModal`, `ShippingData`, `AssistanceCustomerSection`, `CompanyFiscalDataSection`, `OrderRouteMap`).
    - A função de busca (`searchAddressSuggestions`) recebe o estado selecionado (`stateHint`, padrão `PR`), injeta o estado no payload da consulta e filtra os resultados do Google Places e Geocoder para o estado alvo, impedindo a exibição de endereços irrelevantes de outros estados do país.
  - **Portal Suspenso (`DropdownPortal`)**: As sugestões são renderizadas via portal diretamente no `document.body` com camada `z-[99999999]`, evitando que fiquem ocultas ou cortadas por modais full screen (`z-[999999]`) ou containers com `overflow-hidden`.
  - **Economia de Cota e Cache Local**: As consultas de endereço utilizam a função `searchAddressSuggestions`, que verifica primeiro a tabela `address_cache` no Supabase antes de consumir requisições pagas da API do Google Places, com chaves de cache indexadas por estado (`v2_pr_...`).
  - **Variantes Visuais**:
    - `variant="default"`: Caixa moderna arredondada (`rounded-2xl`) com suporte a modo escuro, utilizada em formulários gerais de cadastro e configurações.
    - `variant="underline"`: Borda inferior minimalista (`border-b-2 bg-transparent`), perfeitamente integrada aos formulários de Pedido de Venda e Assistência Técnica.
  - **Preenchimento Automático em Cascata**: Ao selecionar uma sugestão, o componente resolve os dados oficiais via Places API e preenche automaticamente rua, número, bairro, município, UF, CEP e link oficial do Google Maps (`mapsUrl`).

---

## MODULO: MONITORAMENTO DE APIS EXTERNAS E CONTROLE DE CUSTOS (`/api-usage`)

- **Tabelas de Monitoramento no Supabase**:
  - `api_configurations`: Limites mensais, franquias gratuitas, custos por requisição (em R$), limite de segurança diário, limite por minuto e flags de bloqueio.
  - `api_usage_daily`: Agregação diária por API com contadores de requisições, chamadas bem-sucedidas, falhas, cache hits e custo diário apurado.
  - `api_usage_logs`: Auditoria de cada chamada externa contendo API, módulo de origem, tempo de resposta (ms), status, payload, erro e flag de cache.
  - `record_api_usage_atomic`: RPC Postgres para gravação atômica concorrente e incremento de métricas sem perdas.
- **Circuit Breaker e Hard Limit (`apiUsageGuard.ts`)**:
  - **Hard Limit**: Bloqueia preventivamente chamadas não-críticas caso o consumo mensal atinja 95% do teto definido na configuração, evitando custos descontrolados de cartão de crédito.
  - **Circuit Breaker**: Detecta loops de requisições anômalas (ex: mais de N chamadas em 1 minuto) e bloqueia temporariamente a API com esfriamento programado.
  - **Alertas Preventivos**: Níveis de alerta visual no ERP (70% Atenção, 90% Crítico).
- **Tela de Gerenciamento (`/api-usage`)**:
  - Visualização de cards de status por serviço (Google Maps / Places / Routes, Google Gemini AI, WhatsApp Cloud API, SEFAZ-PR).
  - Gráfico de tendência diária de chamadas (`ApiUsageLineChart.tsx`) e distribuição por módulo (`ApiModuleDistributionChart.tsx`).
  - Modal de edição de limites, preços e franquias (`ApiConfigEditModal.tsx`), garantindo que nenhum valor comercial fique hardcoded no código.

---

## MODULO: LOGÍSTICA E ENTREGAS NO MOBILE (`DeliveriesHubScreen`)

- **Unificação Operacional das Entregas**:
  - As telas anteriormente fragmentadas de Cronograma, Entregas e Mapa de Entregas foram unificadas em uma única tela principal: **`DeliveriesHubScreen`** (`src/features/logistics/screens/DeliveriesHubScreen.tsx`).
  - **Tabs de Topo**: Seletor moderno com 3 abas operacionais:
    - **`[ Hoje ]`**: Foco do entregador para o dia atual — roteiro das paradas, próxima entrega destacada, botão "Iniciar Entrega", otimização de rota e lista de pedidos.
    - **`[ Cronograma ]`**: Visão diária e semanal com filtros de status e agendamentos futuros e passados.
    - **`[ Mapa ]`**: Google Maps Platform interativo em tela cheia com marcadores geocodificados dos pedidos, localização em tempo real do entregador e traçado de rotas.
  - **Barra de Navegação Inferior (`NativeBottomNav.tsx`)**: Aba central atualizada para **"Entregas"** (ícone `Truck`), eliminando o item separado de mapa e centralizando o fluxo logístico do entregador.
- **Fluxo de "Iniciar Entrega" e Navegação Externa no Google Maps Android**:
  - **Botão "Iniciar Entrega"**: No card de entregas (`NextDeliveryCard`), o botão é uniformemente **"Iniciar Entrega"** (nunca "Iniciar e Navegar").
  - **Abertura da Tela de Etapas Existente**: Ao tocar em "Iniciar Entrega", o app registra o início operacional (`status = in_progress`, `deliveryStartedAt = now`) e abre a tela de etapas existente (`DeliveryPreparationScreen`) na **Primeira Etapa** (`DeliveryPreparationStep`).
  - **Ação "ABRIR ROTA NO GOOGLE MAPS" na Primeira Etapa**: A primeira etapa contém o botão destacado `[ 🧭 ABRIR ROTA NO GOOGLE MAPS ]` e a exibição do horário agendado (período ou fixo). Tocar neste botão não conclui a etapa, não altera status e não duplica início de entrega.
  - **Intent Direto Android (`com.google.android.apps.maps`)**: Abertura gerenciada pelo service centralizado `openGoogleMapsNavigation` (`externalMapsNavigation.ts`) via URI `google.navigation:q=LAT,LNG&mode=d` (origem assumida pelo GPS do aparelho).
  - **Validação de Coordenadas e Fallback Seguro**:
    - Rejeita `null`, `undefined`, `NaN`, `0,0` e fora de -90..90, -180..180.
    - Prioridade: 1º Coordenadas válidas (`destinationCoords`, `coords`); 2º Endereço formatado e codificado; 3º Caso sem destino, emite alerta sem crash.
    - Se o Google Maps não estiver instalado, utiliza fallback web oficial sem travar o aplicativo.
  - **Preservação de Estado**: Ao retornar do Google Maps ao app (ou ao reabrir uma entrega em andamento), o fluxo, o checklist e a etapa atual são estritamente preservados.
- **Aba "Mapa" das Entregas (Android e Web)**:
  - **Mapa Real e Interativo em Ambos os Ambientes**: A aba Mapa exibe obrigatoriamente um mapa interativo da Google Maps Platform ocupando o espaço principal da tela, sem substituir a visualização por listas estáticas ou fallbacks textuais.
  - **Android / iOS Nativo (`DeliveryMapView.tsx`)**: Utiliza `react-native-maps` com `PROVIDER_GOOGLE`, marcadores nativos (`DeliveryMarker`), polylines da rota e `fitToCoordinates` com padding inferior reservado para o card flutuante.
  - **Web / Expo Web (`DeliveryMapView.web.tsx`)**: Utiliza a Google Maps JavaScript API oficial com carregador assíncrono via singleton, pins personalizados com cores por status (depósito em azul escuro, entrega em andamento em verde, horário fixo em roxo com 🔒, concluída em verde esmeralda com ✓, não atendida em vermelho com !), traçado de rota e `fitBounds` dinâmico com padding inferior. O clique em qualquer marcador seleciona a entrega no app abrindo o card/bottom sheet.
  - **Responsividade e Troca de Abas**: O container do mapa ocupa `flex: 1` absoluto e ouve eventos de resize/troca de aba para disparar `google.maps.event.trigger(map, 'resize')`, evitando telas cinzas ou colapsadas.

---

## MODULO: CADASTROS (Clientes, Fornecedores e Colaboradores)

- **Modularização do Formulário de Pessoas (`PersonFormModal.tsx` / `personForm/`)**:
  - O componente formulário monolítico foi desacoplado seguindo a skill `modularizacao_codigo`:
    - **`usePersonForm.ts`**: Hook responsável pelo estado unificado (`formData`), validações específicas de cada tipo (`customers`, `suppliers`, `employees`), submissão, verificação de duplicidade de e-mail/nome, vinculação automática com conta de usuário (`employee_profiles`) e persistência.
    - **`PersonIdentificationSection.tsx`**: Identificação básica: tipo PF/PJ, indicação de marketing/tráfego pago, nome completo/razão social (`SmartInput`), nome fantasia, CPF/CNPJ (`PatternFormat`) e lead time para fornecedores.
    - **`PersonEmployeeRolesSection.tsx`**: Seleção de perfis de acesso do colaborador (`EMPLOYEE_ROLES`) e smart input de cargo principal com orientações funcionais.
    - **`PersonContactsSection.tsx`**: Telefone principal, toggle "S/ Telefone", atalho WhatsApp (`wa.me`), e-mail (com bloqueio para contas existentes) e contatos adicionais dinâmicos para clientes.
    - **`PersonAddressSection.tsx`**: Accordion de endereço com toggle "Não Informar", busca por CEP (`getAddressByCep`), autocomplete de logradouro (`AddressAutocompleteInput` com UF padrão PR), campos complementares, moradia, link Maps e validação com `AddressVerificationMap`.
    - **`PersonObservationsSection.tsx`**: Bloco de anotações e observações importantes.
    - **`PersonFormModal.tsx`**: Atua como orquestrador limpo (< 160 linhas) com `createPortal` e rodapé de ações com salvamento rápido.
