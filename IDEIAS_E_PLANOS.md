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

### 🐛 Bugs e Correções Críticas
- [ ] **Erro de Sincronização de Pedidos**: Corrigir `TypeError` ao acessar `date` no `useDashboardData.ts`.
- [ ] **Validação de Estoque**: Implementar lógica que impede venda de itens sem estoque (atualmente scripts de importação permitem stock 0).
- [ ] **Sincronização ERP-Automation**: Garantir que as baixas no Showroom reflitam instantaneamente na API de estoque.

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
- [x] **Link da Build APK Oficial**: Atualizado em todos os menus e botões de download do ERP para a build `cf9aa69d-99ba-4467-9941-cc62588c407e`.
- [x] **Stepper Informativo e Sliders Bidirecionais de Entrega**: Indicador visual no topo das 3 etapas e controle seguro por deslizamento (`«` para avançar e `»` para retroceder).
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
- **Análise de BOM**: Processar `belichemilao.csv` para criar variações automáticas de tecido e acabamento no ERP.

---

## 📈 4. Histórico Recente de Entregas

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
- **Dimensional Weight & LTL:** Cálculo de peso volumétrico integrado e alertas de carga LTL (> 68kg).
- **Label Printing System:** Visual premium para etiquetas, botão "Baixar PNG" e layout vertical com QR Code maximizado.
