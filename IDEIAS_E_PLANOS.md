# 🎯 Plano Mestre, Ideias e Pendências - Móveis Morante Hub

Este documento unifica todo o planejamento estratégico, ideias futuras, tarefas pendentes e o histórico recente do projeto.

---

## 🎙️ 1. Direcionamento Estratégico (Plano Mestra Morante)

### 🎙️ BI por Voz (Sales Intelligence)
**Objetivo:** Capturar o "porquê não comprou" e o comportamento do cliente no balcão via áudio.
- [x] **Captura de Voz:** Implementada no botão `Voz BI Morante`.
- [x] **Persistência Resiliente:** Logs salvos mesmo se a IA falhar.
- [x] **Análise Inteligente:** Cruzamento com histórico de compras.
- [ ] **Exportação NotebookLM:** Gerar CSV mensal formatado para análise profunda de padrões.
- [ ] **Salvamento de Áudio Físico:** Implementar upload do `.wav` original para o Supabase Storage (atualmente salvamos a transcrição).

### 🧠 CRM Inteligente e "Me Avise"
**Objetivo:** Reativar vendas e facilitar assistências com contexto histórico.
- [x] **Detecção de Intenção:** Identifica se o cliente quer assistência, comprar algo novo ou apenas uma dúvida.
- [x] **Match de Histórico:** A IA identifica automaticamente de qual produto o cliente está falando baseada no que ele já comprou (ex: "meu guarda-roupa" -> "Guarda-roupa Topázio 6 portas").
- [ ] **Monitoramento de Desejos:** Tabela `customer_desires` para monitorar itens que o cliente quis e não tinha em estoque.
- [ ] **Alerta de Salvados:** Automação que avisa o vendedor quando um 'Salvado' (usado) entra em estoque e coincide com o desejo de um cliente.

### 📱 WhatsApp Automático & Seguro
**Objetivo:** Agilizar comunicação sem risco de banimento (Regras Anti-Bloqueio).
1. **Interação Primeiro:** Priorizar o envio de mensagens para clientes que já iniciaram uma conversa. 
2. **Templates Oficiais:** Usar apenas mensagens pré-aprovadas pela Meta para iniciar conversas (notificações de entrega, etc).
3. **Botão de Sair:** Sempre oferecer uma forma clara do cliente parar de receber mensagens ("Digite SAIR para não receber mais avisos").
4. **Volume Controlado:** Evitar disparos de centenas de mensagens no mesmo segundo. O sistema agora usa a Graph API que gerencia isso, mas a supervisão humana é o filtro final.
5. **Contexto é Rei:** A IA Lisandro garante que a mensagem seja ultra-personalizada ("Olá João, sobre o seu Guarda-roupa comprado em Janeiro..."), o que reduz denúncias de spam quase a zero.
- [x] **Envio Direto (Graph API):** Implementado para Entrega, Assistência e Pedido.
- [ ] **Fila de Mensagens:** Implementar um pequeno delay entre envios automáticos para simular ritmo humano.
- [ ] **Gestão de Opt-Out:** Adicionar checkbox "Aceita receber notificações" no cadastro de clientes.

### 🛠️ Assistência Automática
**Objetivo:** Abrir pedido de assistência em 1 clique.
- [x] **Draft System:** Identificação do produto mencionado na conversa.
- [ ] **Auto-Preenchimento:** Quando a IA detecta 'ASSISTANCE', ela já preenche o formulário de assistência com o ID do produto histórico e a descrição do problema.

---

## 📌 2. Próximos Passos e Pendências Imediatas

### 🧹 Refatoração, Código Limpo e Modularização (`modularizacao_codigo`)
- [ ] **Diretriz Contínua do Usuário**: Em cada arquivo tocado ou analisado (especialmente > 150 linhas), perguntar explicitamente ao usuário no final se deseja modularizá-lo em conformidade com a skill `modularizacao_codigo`.
- [ ] **Meta de Arquitetura**: 30–100 linhas (aceitável até 150). Responsabilidade única estrita. Estratégia segura: COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER.
- [ ] **Backlog de Arquivos Extensos a Modularizar Sob Demanda**:
  - `ProductFormModal.tsx` (> 600 linhas): dividir abas, validação de legibilidade e gerenciadores de variações.
  - `ProductRow.tsx` e `ProductCard.tsx`: isolar ações, menus e renderizadores de status.
  - [x] `OrderHistoryRow.tsx` e `OrderHistoryCard.tsx` + `InventoryMovementBadge.tsx`: modularizados com sucesso segundo a skill `modularizacao_codigo` (redução de mais de 70% das linhas com submódulos coesos).
  - [x] **Detalhamento de Itens no Popover de Estoque**: Exibição da lista de todos os itens da venda com nome, quantidade e status de movimentação (`Efetivada`, `Estornada`, `Não efetivada` e `Item não cadastrado (sem movimentação)` com alerta).
  - `useProducts.ts` e `orderHistoryService.ts`: segregação de queries, mutations e regras de negócio.

### 📱 Mobile Offline-First Baseado em Eventos & Risco Operacional
- [x] **Criação da Skill `mobile-offline-first` (Completa & Fechada)**: Diretrizes baseadas em risco operacional de campo/depósito (entregas, montagens, inventário, conferência), ciclo de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`), idempotência via UUID e backend como autoridade estrita de estoque.
- [ ] **Fila de Eventos de Campo & Depósito (`event_queue`)**: Gravar eventos atômicos (baixas de entrega, inventário físico, conferência de recebimento, checklists) com `event_id` UUID, timestamp `occurred_at` e máquina de estados (`PENDING` / `SYNCING` / `CONFIRMED` / `REJECTED`).
- [ ] **Fila Separada de Mídia (`media_upload_queue`)**: Upload resiliente de fotos de avarias, comprovantes e assinaturas sem poluir o payload JSON dos eventos.
- [ ] **Processador de Eventos no Backend / Supabase RPC**: Endpoint atômico que valida idempotência, processa eventos na ordem de dependência, resolve estoque em `inventory_moves` e retorna confirmação ou rejeição fundamentada.
- [ ] **Working-Set Cache (Read-Only)**: Cache local apenas dos roteiros, pedidos, NFs/recebimentos e clientes atribuídos ao operador do dia.
- [ ] **Status Visual na UI**: Badges dos 4 estados com tratamento visual destacado para `REJECTED` (alerta e motivo claro ao operador).

### 📦 Logística e Estoque
- [ ] **Status de Pedido**: Sincronizar status 'Atendido' com o fluxo de estoque (baixa automática).
- [ ] **Sincronização de Endereço**: Avaliar se mudanças de endereço no pedido também devem atualizar o cadastro principal do cliente (atualmente é manual via botão "Editar").
- [ ] **Sincronização Automática**: Criar um cron job ou script de monitoramento para a pasta `produtosbling` para importar novos produtos assim que o CSV for atualizado.
- [ ] **Batch Release (Lote)**: Criar interface para importação em lote de notas fiscais de entrada para atualizar `warehouseStock`.

### 🛠️ Infraestrutura e Banco de Dados (SQL/DEV/PROD)
- [ ] **Limpeza de Banco de Dados (SQL)**: Avaliar e executar o DROP das colunas removidas da UI na tabela `products` (`line`, `main_differential`, `colors`, `not_included`, `width`, `height`, `depth`, `extra_dimensions`).
- [ ] **Executar Scripts SQL**: Criar tabelas `attendance_logs` e `customer_desires` no Supabase.
- [ ] **Variáveis de Ambiente**: Revisar rotas de API e Supabase para garantir funcionamento perfeito em ambos os ambientes conforme a nova regra.

### 💎 UX / Refinamentos
- [x] **App Mobile - Código e SKU 100% Automáticos (Sem Input Manual)**: Código sequencial de 6 dígitos gerado na abertura via `getNextSequentialProductCode` (`000245`) e SKUs das variações gerados via `generateVariationSku` (`000245-01`), sem inputs de digitação manual para o usuário, idêntico ao ERP.
- [x] **App Mobile - Cadastro Geral com Paridade ERP**: Campos de nomes/títulos diferenciados, slug amigável em tempo real, seleção de oportunidades e múltiplas categorias sincronizadas via tabela intermediária `product_categories`.
- [x] **Catálogo Digital - Logo Ampliado no Header**: Logo aumentado com proporção de destaque visual e header expandido para maior presença da marca.
- [x] **Catálogo Digital - 'Ver todos' na Lista de Categorias**: Dropdown de ambientes e menu mobile ajustados para exibir 'Ver todos' como primeira opção da lista, eliminando cabeçalhos duplicados.
- [x] **Catálogo Digital - Troca Fluida de Fotos na Página do Produto**: Corrigido bug de reset para a 1ª foto ao clicar em thumbnails e sincronização com lightbox.
- [x] **Catálogo Digital - Cores de Título por Oportunidade**: Cor dos títulos de produtos dinamizada tanto nos cards quanto na página de detalhes conforme a oportunidade vinculada.
- [x] **ERP - Modal Completo de Gerenciamento de Atributos na Variação**: Ao clicar em "Gerenciar Atributos" no formulário de variação de produto (`VariationFormModal`), abre o painel oficial completo do sistema (`ManageAttributesModal`) com busca em tempo real, criação de atributos por tags, remoção segura e adição de valores, atualizando automaticamente os atributos da variação ao concluir.
- [x] **ERP - Aba de Fotos da Variação com Input 1:1 e Drag and Drop**: Aba de fotos reformulada com card/slot de adicionar 1:1 (`aspect-square`) que abre o modal de seleção das fotos do pai (`VariationParentImagesSelectModal`), e fotos vinculadas exibidas em sequência com reordenação por Drag & Drop e selo de foto de Capa na primeira imagem.
- [x] **Correção da Tela Branca em Detalhes do Pedido (Mobile)**: Corrigido o `ReferenceError` em `OrderDetailsSections.tsx` restaurando a declaração de `displayOriginalPrice` e `displayFinalPrice` ao renderizar o manuseio e preço com desconto.
- [x] **Card de Formas de Pagamento Dinâmico (Mobile)**:
  - Fundo e borda em **Amarelo/Âmbar** (`#f59e0b` / `#fffbeb`) com alerta quando o status estiver **Pendente**, **A Verificar** ou houver saldo a receber.
  - Fundo e borda em **Verde** (`#10b981` / `#f0fdf4`) com check quando todos os pagamentos estiverem **Pagos**.
- [x] **Exibição do Manuseio do Item e Desconto Sobreposto (Mobile)**:
  - Exibição do tipo de manuseio (ex: *"Item não necessita de montagem"*, *"Montagem de Móvel"*) diretamente abaixo do título de cada produto.
  - Preço original antes do desconto posicionado diretamente **acima** do preço verde final (com efeito riscado/tachado).
- [x] **Checklist com Checkbox Individual por Item/Volume (Mobile)**: Cada volume/item do pedido possui seu próprio checkbox de conferência e carregamento antes de sair.
- [x] **Busca Precisa do Catálogo Digital**: Aprimorada a barra de busca e sugestões para filtrar por palavras completas e sinônimos moveleiros (ex: "roupa" busca guarda-roupas, roupeiros e armários de roupas no título ou categoria) sem misturar letras soltas.
- [x] **Integração Nativa Google Firebase FCM V1 (v1.2.0 / Build 19)**: Arquivos `google-services.json` e `google-services-key.json` vinculados para entrega de notificações push com o app 100% fechado (nível de sistema operacional idêntico ao WhatsApp).
  - Build oficial concluída e links atualizados no ERP: `https://expo.dev/accounts/morante/projects/mobile/builds/7fca3976-4db5-4b11-92c6-caeee69a39c1`
- [x] **Google Maps Places Autocomplete (2 dígitos)**: Ativação instantânea a partir de 2 caracteres digitados no campo Rua/Logradouro em todos os formulários do ERP (Cadastro de Clientes, Pedido de Venda - Dados do Cliente, Dados de Entrega e Assistência Técnica), preenchendo automaticamente Rua, Bairro, Cidade, Estado, CEP e link do Maps.
- [x] **Link de Localização do Google Maps (ERP & Mobile)**: Campo no cadastro de clientes para localização precisa (especialmente quando ruas/números não batem exatamente no GPS), integrado na mensagem do WhatsApp do grupo de entregas e nos detalhes/etapas de entrega do app mobile.
- [x] **Link da Build APK Oficial**: Atualizado em todos os menus e botões de download do ERP para o artifact direto `https://expo.dev/artifacts/eas/2z1WIeabVBd27Zg66LdlZJTyjyR2v895eRnUiXwwHg0.apk`.
- [x] **Stepper Informativo e Sliders Bidirecionais de Entrega**: Indicador visual no topo das 3 etapas e controle seguro por deslizamento (`«` para avançar e `»` para retroceder).
- [x] **Perfis de Acesso de Usuário com Permissões Acumulativas**: Transição da nomenclatura de *Cargo* para *Perfil de Acesso de Usuário* na Gestão de Acessos (`/acessos-e-usuarios` e `/settings`), permitindo múltiplos perfis por usuário com permissões acumulativas (`canPerform`). Usuários que recebem pelo menos um perfil de acesso ativo passam a constar automaticamente como colaboradores com sincronização em tempo real entre `profiles` e `people`. Incluído o novo perfil de `Estoquista` (`stockist`) com permissão padrão para movimentação e inventário de estoque.
- [x] **Tabela de Produtos (Cabeçalho Limpo)**: Removido o botão do olhinho (`bi-eye-slash`) dos cabeçalhos das colunas da tabela de produtos, mantendo a tela mais limpa e a visibilidade de colunas centralizada nas opções de visualização.
- [x] **Lista de Produtos (Fundo Cinza para o Pai e Dropdown de Variações Recolhidas)**:
  - Nas visualizações em Tabela (`ProductRow`) e em Cards (`ProductCard`), os produtos pai agora possuem fundo cinza neutro destacado (`bg-slate-200/70 dark:bg-slate-800/80`).
  - No início da linha da tabela (coluna SKU/código) e no topo do card, foi adicionado um botão de dropdown/chevron (`bi-chevron-right` / `bi-chevron-down`) para alternar a exibição das variações filhas.
  - Por padrão, as variações filhas permanecem recolhidas/ocultas, mantendo a listagem visualmente limpa e objetiva.
  - O selo de oportunidade agora é renderizado exclusivamente no produto pai / produto simples, não poluindo as variações filhas.
  - Inversão da ordem das colunas: **Produto/Variação** agora vem antes de **SKU**, com migração automática da preferência do usuário e o botão dropdown de variações integrado.
  - O modal de edição agora abre **exclusivamente** pelo clique no botão de editar (lápis), evitando aberturas acidentais ao clicar na linha ou card.
  - Exibição de badge com a quantidade de variações ao lado direito do título do produto pai na tabela (ex: `3 variações`).
  - Título do produto pai padronizado na cor preta/escura (`text-slate-900 dark:text-slate-100`), igual às variações e produtos simples, tanto na tabela quanto nos cards.
  - Remoção do rótulo redundante "Produto" da tabela e dos cards, deixando a interface mais enxuta (mantendo apenas selos pertinentes como "Serviço" e "Combo").
  - [Mobile] Aba principal do menu inferior renomeada de "Dashboard" para "Início" (`NativeBottomNav`).
  - [Mobile] Regra da Barra/Bottom Bar de Navegação: máximo de 5 abas visíveis; se ultrapassar 5 abas, a 5ª vaga torna-se o botão de 3 pontinhos ("Mais"), que abre um Bottom Sheet com as abas e opções excedentes.
  - [Acessos & Colaboradores] Inclusão do campo **Cargo Principal do Colaborador** no cadastro, diferenciando explicitamente o cargo/profissão na empresa (ex: Vendedor, Montador, etc.) dos perfis de acesso ao sistema (onde ele pode ser Administrador sem impedimento). Exibição do cargo principal na tabela de usuários e cards.
  - [Produtos] Largura da coluna Produto/Variação na visualização em tabela dobrada para `min-w-[520px] w-[45%]`, proporcionando muito mais espaço e legibilidade aos dados e fotos dos itens.
  - [Produtos] Contagens da sidebar de produtos (Total de Cadastrados, Publicados, Desativados e Rascunhos) atualizadas para contabilizar exclusivamente as variações filhas, tratando o produto pai apenas como referência estrutural/agrupador.
  - [Produtos] Selo de Oportunidade e Contagem de Variações agora ficam alinhados harmoniosamente na mesma linha do título do produto pai na tabela.
  - [Produtos] Remoção do selo redundante 'VARIANTE' nas linhas de variações filhas na tabela de produtos, mantendo a listagem visualmente mais limpa.
  - [Produtos] Clicar na linha da tabela (`ProductRow`) ou no card (`ProductCard`) de um produto pai agora também expande/recolhe suas variações filhas automaticamente, além do botão de chevron, preservando os botões de ação isolados.
  - [Mobile] Criação do menu e módulo nativo de **Produtos** (`NativeProductsScreen`) no painel inferior (`NativeBottomNav`):
    - Visível exclusivamente para quem tem permissão/perfil de vendedor (`seller`), gestor (`manager`) ou administrador (`admin`).
    - Cards nativos fiéis ao ERP: exibição clara do **Produto Pai** com botão de alternância `Variações (X)` (ex: `Variações (1)`), código do pai, selo de oportunidade (`Flame` âmbar), fornecedor (`Truck`), fundo cinza destacado e preços/estoque representados por `-`.
    - Expansão de variações filhas diretamente no card (com fotos das variações, atributos, SKU, estoque e toggle de catálogo por variação).
    - Status de catálogo com botão interativo direto no card (Publicado / Ocultado).
    - Paginação padrão de 30 itens por página com scroll suave ao topo.
    - Cabeçalho limpo com foco na **barra de pesquisa por texto** (sem botão de atualizar nem botões/pills de filtro) e botão de 3 pontinhos com:
      - **Novo Produto**: formulário com abas (Básico, Preços & Estoque, Variações), permitindo salvar como Ativo ou Rascunho.
      - **Configurações de Produto**: modal dedicado com gerenciamento completo (CRUD) de **Categorias** e **Atributos e Variações**.
- [x] **Observações por Item de Pedido de Venda (`item.observation`)**: Campo adicionado ao final da linha de cada item no formulário do pedido (desktop e cards mobile), concatenado com `-` na folha de pedido impressa, no recibo impresso, nas ordens de serviço e nas mensagens de WhatsApp.
- [x] **Carimbo de Assinatura Digital no Recibo (`ReceiptPage` / `DigitalSignatureBadge`)**: Remoção da linha de assinatura manual e inclusão do selo oficial com certificado digital ICP-Brasil/A1, dados da empresa/emissor, hash determinístico e QR Code dinâmico para consulta pública e validação.
- [x] **Independência de Catálogo e Produtos Desativados na Lista Normal**:
  - Remoção da tela/aba separada de "Produtos Desativados", mantendo produtos ativos e desativados juntos na listagem principal com seus respectivos selos visuais.
  - Desacoplamento total entre o estado ativo/desativado no ERP (`active`) e o status do Catálogo Digital (`status: published/hidden`), de modo que ativar/desativar um produto ou variação não altera seu status de catálogo.
- [x] **Status de Canais (ERP e Catálogo) com Botões Bipartidos**:
  - Nova estilização de botões/pills bipartidos conforme layout oficial (`ERP` em azul com status `Ativo`/`Inativo` e `Catálogo` em roxo com status `Publicado`/`Oculto`).
  - Coluna renomeada para **"Status de Canais"** na tabela de produtos e no menu de visibilidade de colunas.
  - Ação de Ativar/Desativar produto movida diretamente para o botão interativo da coluna/card, removida do menu de 3 pontinhos.
  - Padronização aplicada tanto na visualização em **Tabela** (`ProductRow`) quanto em **Cards** (`ProductCard` e na listagem expandida de variações filhas).
- [x] **Flexibilização de Requisitos do ERP e Alerta Específico de Pendências**:
  - Removida a exigência de preço de custo para ativar produtos/variações no ERP (custo só é obrigatório ao lançar estoque inicial ou entrada de mercadoria).
  - O alerta de requisitos agora lista dinamicamente apenas os campos que estiverem de fato faltando (ex: `nome do produto`, `preço de venda`, `categoria`, `fornecedor`).
- [x] **Remoção do Painel de Visibilidade de Colunas da Sidebar**: Eliminada a sanfona de visibilidade de colunas da barra lateral da lista de produtos, simplificando a interface e mantendo as colunas padrão visíveis.
- [ ] **CategorySearchModal**: Avaliar o comportamento em dispositivos móveis.
- [ ] **Feedback de Sincronização de Preços**: Testar se a sincronização de preços entre pai e filhos funciona corretamente em tempo real após a economia.
- [ ] **Feedback visual de Herança**: Adicionar feedback visual mais claro quando a herança está ativa.
- [ ] **Validação de Telefone**: Implementar uma validação mais rigorosa de formato de telefone antes da sincronização com o CRM.
- [ ] **Feedback de Sync**: Adicionar um pequeno indicador visual ou toast informando que o cadastro do cliente foi atualizado com sucesso ao salvar o pedido.

---

## 💡 3. Ideias de Expansão / Futuras

- **Dashboard de Rotas**: Usar os endereços parseados para montar uma rota de entrega otimizada em um mapa.
- **Histórico de Preços**: Melhorar a visualização do `product_price_history` no ERP para mostrar gráficos de flutuação.
- **IA de Atendimento**: Usar a base de produtos importada para responder dúvidas de clientes via WhatsApp (BI de voz citado no `PLANO_MESTRA`).
- **Histórico de Marketing**: Criar um log de mudanças na origem de marketing do cliente para entender mudanças de comportamento.
- **Expansão do Scanner QR/Barcode**:
    - **Check-in de Cliente**: Carregar perfil rápido ao escanear QR do cliente.
    - **Endereçamento (Bins)**: Escanear prateleira + produto para organizar o depósito.
    - **Rastreamento Interno**: Etiquetas de envio com QR para status de expedição.
    - **PDV Web**: Adicionar itens ao carrinho via câmera do celular/tablet.
    - **Motoristas**: Confirmar entregas via QR Code + GPS.
    - **Produção**: Controle de etapas de montagem por escaneamento de peças.
- **Emissão de NF-e e NFC-e Direto SEFAZ-PR (Sem Intermediários)**: Conexão direta com webservices SEFAZ-PR usando certificado digital A1 (.pfx), geração e assinatura de XMLs fiscais e impressão de DANFE sem custo por nota.
- **Conferência Cega no Recebimento de Mercadorias**: Interface para o operador do almoxarifado conferir mercadorias recebidas sem ver previamente a quantidade esperada, garantindo integridade física do estoque.
- **Relatório de Comissões por Vendedor**: Cálculo analítico de comissões com base em vendas efetivamente atendidas no período com abatimento proporcional de devoluções.
- **Análise de BOM**: Processar `belichemilao.csv` para criar variações automáticas de tecido e acabamento no ERP.

---

## 📈 4. Histórico Recente de Entregas

### Concluído Recentemente (Setembro 2026)

#### 🏷️ Status de Canais (ERP e Catálogo) com Botões Bipartidos & Independência Total
- **Desacoplamento Completo:** O estado do produto no ERP (`active: true/false`) não interfere e não altera o status do produto no Catálogo Digital (`status: published/hidden`), e vice-versa.
- **Produtos Desativados na Lista Normal:** Produtos desativados permanecem na listagem normal com selo próprio, sem isolamento em aba separada.
- **Botões Bipartidos Padronizados:** Implementados novos botões/pills bipartidos (`ERP` azul com `Ativo`/`Inativo`, `Catálogo` roxo com `Publicado`/`Oculto`) na Tabela (`ProductRow`), nos Cards (`ProductCard`) e na listagem de variações filhas.
- **Ação Rápida de Ativação:** Ação de ativar/desativar removida do menu de 3 pontinhos e incorporada diretamente no clique do botão `ERP`.
- **Coluna Renomeada:** Coluna atualizada para **"Status de Canais"** na tabela e nas preferências de visualização.

#### ⚡ Flexibilização de Requisitos de Ativação no ERP
- **Custo Desobrigado na Ativação:** Preço de custo não é mais obrigatório para ativar produtos ou variações no ERP (o custo é lançado na compra ou saldo inicial).
- **Alerta Específico de Pendências:** Mensagem de erro ao tentar ativar exibe dinamicamente apenas os campos realmente faltantes (ex: `nome do produto`, `preço de venda`, `categoria`, `fornecedor`).

#### 🧹 Limpeza da Barra Lateral de Produtos
- **Remoção da Visibilidade de Colunas:** Eliminada a sanfona de visibilidade de colunas na sidebar de produtos, tornando a interface mais limpa e mantendo todas as colunas padrão ativas.

#### 🔏 Assinatura Digital ICP-Brasil / A1 com QR Code no Recibo
- **Substituição da Assinatura Manual:** Removida a linha de assinatura manual a caneta do recibo de venda (`ReceiptPage`).
- **Carimbo Digital Oficial:** Implementado componente `DigitalSignatureBadge` com padrão ICP-Brasil / A1, dados da empresa, responsável emissor, hash criptográfico determinístico e QR Code dinâmico via `bwip-js` para validação pública instantânea.

#### 📝 Observações por Item no Pedido de Venda (`item.observation`)
- **Campo de Observação nos Itens:** Suporte a notas específicas por item (cor, detalhe técnico, pedido especial do cliente) na tabela desktop e nos cards mobile.
- **Concatenação nos Comprovantes e WhatsApp:** Observações são automaticamente concatenadas com `" - "` na descrição do produto em folhas de pedido impressas, ordens de serviço, mensagens automáticas de WhatsApp e recibos.

#### 👤 Vendedores em Pedidos Restritos a Colaboradores Habilitados
- **Validação Estrita (`isValidEmployee`):** Apenas colaboradores cadastrados com perfil de acesso ativo no sistema são listados para seleção como vendedor da venda.

#### 🖼️ Editor de Fotos 1:1 e Recorte com Proxy Anti-CORS
- **Fotos Padronizadas:** Recorte proporcional 1:1, moldura de expansão branca sem linhas ou bordas internas, e cards de fotos com cantos retos (`rounded-none`).
- **Bypass de CORS:** Implementado proxy de imagens para contornar bloqueios de CORS em buckets Cloudflare R2 e evitar erro de canvas tainted na exportação.

### Concluído Recentemente (Agosto 2026)

#### 🖼️ Independência Total entre Template de Post Promocional e Template de Etiqueta de Preço
- **Isolamento de Persistência:** Implementado armazenamento isolado para o Template de Post Promocional via chave `morante_digital_marketing_post_template`.
- **Botão de Salvamento de Template:** Adicionados botões "Salvar Template" no topo e rodapé da modal de Editor de Post Promocional (`DigitalMarketingPostModal.tsx`).
- **Tratamento de Presets por Categoria:** Atualizado `Index.tsx` e `applyPresetWithConfig` para garantir que as configurações do modo `posts` (`social_square`) não contaminem as etiquetas de preço (`precos`) e vice-versa ao alternar abas ou salvar layouts.

### Concluído Recentemente (Julho 2026)

#### 🤖 Preenchimento Inteligente de Pedidos via JSON e Prompt para IA
- **Preenchimento via Upload ou Inserção Manual:** Desenvolvido um painel sob a modalidade de entrega/retirada para importação de pedidos de vendas. O preenchimento pode ser feito carregando um arquivo `.json` ou colando o texto diretamente em uma área de texto manual.
- **Estrutura de Dados & Ajuda:** Criado modal com a especificação exata do JSON esperado pelo formulário, com botão de cópia de template em 1 clique.
- **Instruções de Prompt de IA Embutidas:** Inclusão de uma caixa de texto interativa e recolhível dentro do modal de ajuda contendo o prompt do sistema para orientar IAs externas a formatar as informações conforme as regras do ERP (ex: status de pagamento obrigatório com opções `"Pago"`, `"Pendente"` ou `"Verificar"`).
- **Vínculo Automatizado de Clientes:** Se o JSON contiver a chave `client`, o ERP abre primeiramente o formulário de cadastro de cliente (`PersonFormModal` com `collectionName="customers"`) pré-populado, associando-o ao pedido imediatamente após a confirmação. Caso contrário, preenche apenas os campos de pedido e itens.

#### 🔧 Correção de Rascunhos Importados via JSON e Filtro do Cronograma
- **Restauração de Rascunhos Deletados:** Corrigida a marcação indevida de pedidos importados via JSON como excluídos (`deleted: true`), impossibilitando a exibição na lista de pedidos ativa. Foram reativados os pedidos do Matheus Morante e da Francine Franco no Supabase.
- **Filtro de Itens Deletados no Cronograma:** Corrigido bug no hook `useDeliverySchedule.ts` que deixava de filtrar pedidos excluídos do Cronograma Logístico para os tipos "venda" e "retirada".
- **Garantia de Estado Ativo na Duplicação/Importação:** Correção definitiva do bug que trazia as flags `deleted` e `deletedAt` de pedidos de origem da lixeira (ou JSONs desatualizados) ao duplicá-los ou gerá-los a partir de rascunhos antigos, deixando o pedido novo invisível na listagem principal mas ativo no Cronograma. Agora todas as duplicações/gravações de novos pedidos explicitamente limpam e resetam as chaves de exclusão.

### Concluído Recentemente (Maio 2026)

#### 💳 Gestão de Pagamentos
- **Padronização de Status de Pagamento:** O campo de status de pagamento em cada linha da tabela de pagamentos (Sales Order) foi transformado em um `select` com as opções fixas **"Pago"**, **"Pendente"** e **"Verificar"**.
- **Obrigatoriedade e UX:** O campo agora inicia vazio por padrão e é obrigatório para a finalização do pedido, garantindo que todos os pagamentos tenham um status definido manualmente.

#### 🌐 Otimização de Performance e Banda do Supabase (Redução de Egress)
- **Sincronização em Tempo Real Eficiente:** Refatorados os serviços de sincronização (`orderHistoryService.ts`, `personService.ts`, `purchaseService.ts`, `serviceService.ts`) para escutar alterações do Supabase Realtime e aplicar as alterações diretamente no estado em memória, eliminando requisições redundantes de tabelas inteiras.
- **Consultas Pontuais por Cliente:** Substituído o uso de subscrições em tempo real de todos os pedidos no modal `PersonPurchaseHistoryModal.tsx` por consulta direta no banco trazendo exclusivamente os dados do cliente selecionado.
- **Busca de Clientes com Payload Reduzido:** Modal `CustomerSearchModal.tsx` otimizado para fetch único não-realtime de dados mínimos de pedidos.
- **Limitação de Carga Inicial:** Sincronização inicial de pedidos limitada aos 1000 registros mais recentes para evitar download excessivo de JSONB de pedidos antigos.
- **Remoção de Recursos de IA:** Desativados e removidos componentes flutuantes de gravação e IA (`FloatingActionsHub`, `AIChatAssistant`, `AttendanceVoiceInput`), rota do BI de Atendimento, assistências com IA na criação de produtos e no menu de Preferências.
- **Desativação de Recursos de E-commerce no Produto:** Simplificada a aba de e-commerce no cadastro de produtos, renomeando para **"Fotos do Produto"** e removendo SEO, checklist e sincronizações desnecessárias.
- **Compactação de Imagens Eficiente:** Limite ajustado de 0.3 MB para 0.1 MB (100 KB) e resolução para 1200px no upload de fotos em `imageUtils.ts`.
- **Desativação de Canais Realtime:** Canais desativados nos serviços `personService.ts`, `purchaseService.ts`, `serviceService.ts`, `productService.ts`, `variationService.ts`, `inventoryService.ts`, `settingsService.ts` e otimização do `notificationService.ts`. Apenas o `orderHistoryService.ts` mantém canal realtime ativo.
- **Persistência de Templates no Supabase:** Eliminada a dependência do `localStorage` para o Template de Etiqueta de Preço. Todas as posições, dimensões, fontes e mapas de cores de oportunidade foram migrados e são salvos/lidos exclusivamente da tabela `label_art_configs` no Supabase, garantindo sincronização e disponibilidade para todos os usuários em Dev e Prod.

### Concluído Recentemente (Abril 2026)

#### 📊 Relatórios e BI
- **Menu de Relatórios:** Submenu "Relatórios de Venda" renomeado para **"Relatório de Vendas CSV"** para diferenciar claramente dos relatórios via API (Bling).
- **Relatório de Estoque (Giro e Reservas):** Adicionado botão de relatório consolidado de produtos vendidos e quantidades comprometidas em rascunhos.
- **Ajuste de Layout no Cronograma:** Implementada largura mínima para colunas e cards de pedidos na tabela do cronograma logístico para manter a legibilidade.

#### 🔄 Módulo de Devoluções e Reorganização de UI
- **CRUD de Devoluções:** Sistema completo de gestão de devoluções (Criar, Listar, Editar, Excluir).
- **Interface por Abas:** Transição da navegação de pedidos para abas modernas com glassmorphism (Vendas, Orçamentos, Assistências e Devoluções).
- **Identidade Âmbar:** Padronização visual do módulo de devoluções com a cor **Âmbar (#d97706)**.
- **Geração Vinculada:** Permite gerar devoluções a partir de vendas ou showrooms existentes selecionando itens específicos.
- **Formas de Pagamento:** Adição de **"Promissória"** (parcelamento até 10x) e remoção da opção "WhatsApp".
- **Cartão de Crédito:** Parcelamento padrão expandido para até 12x.

#### 📦 Pedidos de Venda - Checagem de Estoque
- **Novo Botão "Checou Estoque":** Fluxo de checagem individual de itens do pedido via checklist.
- **Carga Automatizada Retroativa:** Pedidos até 26/04/2026 marcados automaticamente como checados.

### Concluído Recentemente (Março 2026)

#### 📦 Módulo de Pedidos de Venda
- **Resumo do Pedido (Passo 5):** Interface rica em 2 colunas exibindo itens, pagamentos, logística e dados do cliente para evitar rolagem.
- **Validação Inteligente (Hover):** Botões desativados com overlay detalhando campos obrigatórios faltantes.
- **Navegação Simplificada:** Botões "Anterior" e "Próximo" removidos do rodapé, centralizando no Stepper superior.
- **Identificação Visual:** Verde/Esmeralda para Entrega e Roxo/Índigo para Retirada.
- **Módulo de Orçamentos:** Novo fluxo sem obrigatoriedade de cliente ou pagamento imediato, com botão de impressão de orçamento.
- **Configuração de Juros e Bandeiras:** Interface premium de juros por parcelas (até 10x) para Visa, Master, Elo, Hipercard (0%) e Senff (customizáveis).
- **Logística de Montagem:** Correção de filtros por modalidade e resolução de erros 400/avisos de DOM nesting na `AssemblyListPage.tsx`.
- **Sincronização CRM:** Salvamento automático de Telefone e Origem de Marketing ('paid'/'organic') nos pedidos e no cadastro de cliente.

#### 🛠️ Módulo de Assistência Técnica
- **Ajuste de Fluxo:** Campo de vínculo com pedido original movido para o topo do formulário.
- **Limpeza de Campos:** Remoção de campos financeiros redundantes e ocultação do telefone quando há pedido de venda vinculado.

#### SKU Generation Overhaul (LLL-00000)
- **Nova Lógica:** Geração de prefixo de 3 letras por Tipo de Produto e Linha/Modelo, com trigger `tgr_auto_sku` no Supabase gerando 5 dígitos sequenciais.

#### Marketing & Design Menu Re-architecture
- **Marketing Hub:** Criada seção de marketing no menu contendo controle de canais e WhatsApp Marketplace.

#### Logística & Sincronização Híbrida
- **Estoque Híbrido:** Integração de `showroomStock` e `warehouseStock` ao ERP.
- **AI Profit Margin + Fee:** Inclusão de taxa de cartão (4%) nas sugestões financeiras da IA.
#### 🖼️ Editor & Recorte de Fotos do Produto (1:1 + Moldura Branca)
- **Recorte Livre & Moldura Branca Simultâneos**: Permite ajustar livremente o enquadramento 1:1 e controlar a margem branca (0% por padrão) para estender fotos sem corte.
- **Proxy Anti-CORS para Canvas**: Rota `/api/proxy-image` no Digital Catalog e proxy local no Vite para contornar o bloqueio de CORS de domínios R2 e evitar o erro `Tainted canvases may not be exported` no recorte de fotos.
- **Auto-Ajuste Proporcional**: Exportação padronizada em 1080 × 1080 px com compressão otimizada para catálogo digital e ERP.

#### 👤 Vendedores em Pedidos de Venda
- **Filtro Estrito de Colaboradores com Acesso (`isValidEmployee`)**: Apenas colaboradores ativos cadastrados com perfil de acesso válido (administrador, gestor, estoquista, vendedor, entregador, etc.) e sem restrição `pending` são listados no campo de seleção de vendedor e no modal de busca de atendentes.

#### 📝 Observações por Item no Pedido de Venda
- **Campo de Observação do Item**: Adicionado campo `observation` em cada item do pedido (com suporte na tabela desktop e card mobile), persistindo detalhes como cor, acabamento e especificações do cliente.
- **Concatenação na Impressão e WhatsApp**: O texto preenchido nas observações do item é exibido automaticamente ao lado da descrição do produto separado por `" - "` no papel de pedido (`/order`), no recibo de venda (`/receipt`), na impressão de ordens de serviço e nas mensagens formatadas de WhatsApp enviadas ao cliente e logística.

