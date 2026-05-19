# 💡 Ideias e Planos Pendentes - Móveis Morante HUB

Este arquivo contém o registro de melhorias, ideias e planos pendentes para o sistema, servindo como guia para futuras sessões de desenvolvimento.

---

## ✅ Concluído Recentemente (Março 2026)

### 📦 Módulo de Pedidos de Venda
- **Resumo do Pedido (Passo 5):** Interface rica e compacta em duas colunas, otimizada para evitar rolagem. Exibe itens, pagamentos, dados do cliente e logística (Entregue vs Retirada) em uma única tela.
- **Validação Inteligente (Hover):** Botões de ação desativados (Imprimir, Enviar) agora exibem um overlay premium ao passar o mouse, detalhando quais campos obrigatórios ainda faltam.
- **Navegação Simplificada:** Remoção dos botões "Anterior" e "Próximo" do rodapé nos passos intermediários, centralizando o controle no Stepper superior.
- **Identificação Visual:** Cores associadas aos métodos de logística: **Esmeralda/Verde** para Entrega e **Roxo/Índigo** para Retirada na Loja.
- **Módulo de Orçamentos:** Novo fluxo de "Orçamento" integrado ao menu de Pedidos. Permite criar propostas sem obrigatoriedade de cliente ou forma de pagamento imediata, com interface simplificada que foca nos itens e logística de frete. Botão de impressão de orçamento adicionado.
- **Configuração de Juros e Bandeiras:** Nova interface premium para configurar taxas de juros por número de parcelas (limitado a 10x). Pré-configuradas bandeiras VISA, MASTER, ELO e HIPERCARD com 0% e SENFF com juros customizáveis.
- **Logística de Montagem:** Corrigida a lista de montagem para filtrar corretamente os itens baseando-se na modalidade (Entrega vs Retirada) e nas configurações de cada opção de manuseio. Resolvidos erros de carregamento (400) e avisos de DOM nesting.

### 🛠️ Módulo de Assistência Técnica
- **Ajuste de Fluxo:** Campo de vínculo com pedido original movido para o topo do formulário.
- **Limpeza de Campos:** Remoção de campos financeiros redundantes (Custo Interno, Valor de Serviço no corpo da descrição) para simplificar a criação.
- **Lógica de Dados:** Ocultação automática do campo de telefone quando há um pedido de venda vinculado (evita redundância).

## ✅ Concluído Recentemente (Abril 2026)

### 📊 Relatórios e BI
- **Menu de Relatórios:** O submenu "Relatórios de Venda" foi renomeado para **"Relatório de Vendas CSV"** em todas as interfaces (Desktop, Mobile e título da página). Isso visa diferenciar claramente os relatórios baseados em importação de dados manuais (CSV) dos relatórios integrados via API (Bling).
- **Relatório de Estoque (Giro e Reservas):** Adicionado novo botão de relatório na gestão de estoque que exibe de forma consolidada os produtos vendidos (finalizados) e a quantidade de pedidos/unidades em rascunho ou agendados, permitindo uma visão clara do comprometimento do estoque.
- **Ajuste de Layout no Cronograma:** Implementada largura mínima para as colunas e cards de pedidos na visualização de tabela do cronograma logístico. Isso garante que as informações permaneçam legíveis e bem estruturadas, evitando o esmagamento das colunas em dias com muitos horários.

### 🔄 Módulo de Devoluções e Reorganização de UI
- **CRUD de Devoluções:** Implementado sistema completo de gestão de devoluções (Criar, Listar, Editar, Excluir).
- **Interface por Abas:** Transformação da navegação principal de pedidos em um sistema de abas (Vendas, Orçamentos, Assistências e Devoluções) com visual moderno e glassmorphism.
- **Identidade Âmbar:** Padronização visual do módulo de devoluções com a cor **Âmbar (#d97706)** para fácil distinção.
- **Geração Vinculada:** Adicionada funcionalidade para gerar devoluções a partir de vendas ou showrooms existentes, permitindo a seleção seletiva de itens.
- **Formas de Pagamento:** Removida a opção "WhatsApp" e adicionada a modalidade **"Promissória"** permitindo parcelamento em até 10x detalhado no resumo do pedido.
- **Cartão de Crédito:** Expandido o parcelamento padrão para até 12x.

### 📦 Módulo de Pedidos de Venda - Checagem de Estoque
- **Novo Botão "Checou Estoque":** Implementado fluxo de checagem individual de itens do pedido de venda através de um modal interativo com checklists de produtos. 
- **Carga Automatizada Retroativa:** Atualização em massa marcando pedidos efetuados até 26/04/2026 como estoque checado de forma retroativa.

## ✅ Concluído Recentemente (Maio 2026)

### 💳 Gestão de Pagamentos
- **Padronização de Status de Pagamento:** O campo de status de pagamento em cada linha da tabela de pagamentos (Sales Order) foi transformado em um `select` com as opções fixas **"Pago"**, **"Pendente"** e **"Verificar"**. 
- **Obrigatoriedade e UX:** O campo agora inicia vazio por padrão e é obrigatório para a finalização do pedido, garantindo que todos os pagamentos tenham um status definido manualmente. O design segue o padrão premium com ícones de chevron e estilização condizente com o sistema.

### 🌐 Otimização de Performance e Banda do Supabase (Redução de Egress)
- **Sincronização em Tempo Real Eficiente:** Refatorados os serviços de sincronização (`orderHistoryService.ts`, `personService.ts`, `purchaseService.ts`, `serviceService.ts`) para escutar alterações do Supabase Realtime e aplicar as mudanças (`INSERT`, `UPDATE`, `DELETE`) diretamente no estado local em memória. Isso elimina a requisição redundante de tabelas inteiras (`select('*')`) a cada evento de tempo real, mitigando a amplificação de tráfego em rede.
- **Consultas Pontuais por Cliente:** Substituído o uso de subscrições em tempo real de todos os pedidos no modal `PersonPurchaseHistoryModal.tsx` por uma consulta direta no banco de dados (`getOrdersByCustomerInfo`) trazendo exclusivamente os pedidos do cliente selecionado.
- **Busca de Clientes com Payload Reduzido:** O modal de busca de clientes (`CustomerSearchModal.tsx`) foi otimizado para realizar um fetch único não-realtime de dados mínimos de pedidos (`getOrdersCustomerDataOnly`), selecionando apenas campos parciais do JSONB do pedido (`customerData` e data), diminuindo o egress em mais de 90% na abertura desse componente.
- **Limitação de Carga Inicial de Pedidos:** A busca inicial em tempo real de pedidos de venda (`subscribeToOrders`) foi limitada para retornar no máximo os 1000 registros mais recentes (`.limit(1000)`). Isso evita o download desnecessário de milhares de registros antigos armazenados na tabela `orders` que pesam muito devido à estrutura do JSONB, reduzindo severamente o tráfego de saída do Supabase.
- **Remoção Completa de Recursos de IA (BI, Assistente, Produtos e Configurações):** Removidos os componentes de gravação de áudio e inteligência artificial flutuantes (`FloatingActionsHub`, que agregava `AIChatAssistant` e `AttendanceVoiceInput`). O item de navegação do menu e a respectiva rota de "BI de Atendimento" (`/attendance-dashboard`) foram excluídos do ERP. Adicionalmente, todos os botões de assistência com IA no cadastro de produtos (sugestão de nome de combo, descoberta de NCM fiscal por IA, geração de descrição otimizada para site/WhatsApp e geração de título para marketplace) foram desativados e removidos da interface de usuário. A seção de configurações do "Assistente de IA" também foi ocultada do menu de Preferências do sistema.
- **Desativação de Recursos de E-commerce no Produto:** Simplificada a aba de "Vitrine / E-commerce" no cadastro de produtos (`ProductFormModal.tsx`) e renomeada para **"Fotos do Produto"**. Removemos todas as sub-abas e campos de dados voltados ao e-commerce (como status de sincronização, SEO, checklist de vitrine e templates de descrição), exibindo de forma limpa e objetiva apenas o painel de upload e a galeria de imagens do produto.
- **Compactação de Imagens mais Eficiente:** Reduzimos as diretrizes padrão de compressão de imagens em `imageUtils.ts` (usada no upload de fotos). O tamanho máximo comprimido foi ajustado de `0.3 MB` para `0.1 MB` (100 KB), a resolução máxima permitida de `1920px` para `1200px`, e a qualidade de compressão inicial para `0.75`. Isso garante fotos extremamente leves e com ótima nitidez no ERP, economizando significativamente o tráfego de download (egress) a cada abertura de tela.
- **Remoção de Canais Realtime do Supabase (Redução de Conexões Simultâneas e Mensagens):** Todos os canais `supabase.channel()` foram desativados nos seguintes serviços, reduzindo drasticamente o consumo do limite de "Conexões Simultâneas em Tempo Real" (200) e "Mensagens em Tempo Real" (2.000.000) do plano gratuito:
  - `personService.ts` → Removido canal da tabela `people` e `profiles`
  - `purchaseService.ts` → Removido canal da tabela `purchases`
  - `serviceService.ts` → Removido canal da tabela `services`
  - `productService.ts` → Removido canal da tabela `products`
  - `variationService.ts` → Removido canal da tabela `variations`
  - `inventoryService.ts` → Removido canal da tabela `inventory_moves`
  - `settingsService.ts` → Removido canal da tabela `app_settings`
  - `notificationService.ts` → Removidos 2 canais (produtos + pedidos). Além disso, a busca de pedidos para notificações foi otimizada de `select('*')` para `select('id, order_data->status').limit(500)`, eliminando o download de todo o payload JSONB desnecessariamente.
  - `useDeliverySchedule.ts` → Removido canal da tabela `showroom_assemblies`
  - **Mantido apenas:** `orderHistoryService.ts` — único serviço que permanece com realtime ativo, pois é essencial para exibir novos pedidos e atualizações em tempo real no sistema de vendas.

---

## 🚀 Planos e Ideias Futuras

### 📊 Estoque e Logística
- **[IDEIA] Mapa de Entregas Iterativo:** No Filtro de Cronograma de Entregas, adicionar uma visualização de mapa com pins coloridos para as entregas do dia selecionado.
- **[IDEIA] Baixa de Estoque Automática:** Integrar o botão "Baixar Estoque" com um log de movimentações mais detalhado (quem, quando, por que).
- **[IDEIA] Sugestão de Rota:** Agrupar entregas por bairro/cidade automaticamente no cronograma.

### 💳 Financeiro
- **[IDEIA] Link de Pagamento Dinâmico:** Gerar QR Code Pix dinâmico diretamente no resumo do pedido (Passo 5). (Parcialmente implementado: QR Code Pix estático/manual disponível no modal de pagamento).
- **[IDEIA] Fluxo de Caixa:** Criar uma aba de "Entradas do Dia" baseada nos pagamentos de pedidos finalizados.

### 🧩 Experiência do Usuário (UX/UI)
- **[MELHORIA] Dark Mode Polish:** Revisar contrastes em tabelas durante o modo escuro para garantir legibilidade 100%.
- **[IDEIA] Atalhos de Teclado:** Adicionar `Ctrl + S` para salvar rascunhos ou `Enter` para avançar steps no formulário de venda.

---

> [!NOTE]
> Este documento deve ser atualizado ao final de cada grande ciclo de mudanças para garantir que o contexto histórico e as ideias criativas não se percam.
