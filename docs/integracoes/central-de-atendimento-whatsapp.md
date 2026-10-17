# Central de Atendimento WhatsApp — MoranteHub ERP

> **Módulo:** Central de Atendimento (`/atendimento`)  
> **Integração:** WhatsApp Cloud API Oficial da Meta (Graph API)  
> **Status:** Ativo — Modo de Visualização Gratuita (Custo Zero Garantido)  
> **Data:** 16/10/2026  

---

## 1. Visão Geral e Objetivo

A **Central de Atendimento** é o novo módulo principal do MoranteHub ERP projetado com a experiência visual e operacional familiar do WhatsApp Web para computadores, enriquecido com integração profunda e em tempo real aos cadastros de clientes e pedidos de venda do ERP.

### Regra Fundamental: Custo Zero e Proteção contra Cobranças da Meta
A Meta atualizou sua política de preços da WhatsApp Business Platform em **1º de outubro de 2026**, passando a faturar mensagens de serviço individualmente após as primeiras 1.000 mensagens entregues por mês por número empresarial (franquia mensal não cumulativa por WABA/número).

Para proteger a empresa contra qualquer cobrança não autorizada:
1. **O módulo opera exclusivamente em modo de recebimento e visualização gratuita.**
2. O campo de composição inferior e os botões de envio na Central de Atendimento estão fisicamente desabilitados, com ícone de cadeado (`bi bi-lock-fill`) e aviso explícito: *"Envio indisponível. Central em modo de visualização gratuita."*.
3. O backend rejeita terminantemente qualquer requisição de despacho com código `403 Forbidden` (`BLOCKED_FREE_TIER_PROTECTION`).
4. Um painel interativo de **Consumo de Mensagens** monitora a franquia de 1.000 mensagens em 4 estágios de alerta (0-799 normal, 800-899 atenção, 900-999 proximidade crítica e 1.000 esgotamento).

---

## 2. Auditoria e Preservação de Integrações Existentes

Antes da implementação, foram auditadas as estruturas vigentes do MoranteHub:
* **Webhook Oficial:** Auditados `api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts`. A nova implementação preservou 100% da lógica existente de confirmação de entregas (botões interativos `confirm_delivery_{orderId}`) e rastreamento assíncrono em `whatsapp_dispatches` e `warranty_terms`.
* **Idempotência e Segurança:** Adicionada validação de assinatura criptográfica `X-Hub-Signature-256` via HMAC-SHA256 e deduplicação estrita de `api_message_id` (`wamid`) da Meta.
* **Limite de Funções da Vercel (Hobby 12/12):** O ERP possui verificação em `erp/scripts/check-fiscal-startup.cjs` limitando a 12 funções serverless em `erp/api/`. As operações de download de mídia (`/api/whatsapp-media`) e bloqueio de envio (`/api/whatsapp-dispatch`) foram unificadas no despachador do webhook via rewrites em `erp/vercel.json`, garantindo `12/12` funções sem quebrar a compilação do módulo fiscal.

---

## 3. Modelo de Dados no Supabase (Schema `public`)

A migração `supabase/migrations/20261016030000_customer_support_whatsapp.sql` foi aplicada com sucesso no projeto remoto operacional (`hkoxhourxwlddgsfdgws`):

### 3.1. Tabela `public.whatsapp_conversations`
* `id` (UUID, PK): Identificador único da conversa.
* `business_phone_number_id` (TEXT): ID do número empresarial na Meta.
* `contact_phone` (TEXT): Telefone normalizado no padrão internacional E.164.
* `contact_wa_id` (TEXT): Identificador oficial do remetente no WhatsApp (`wa_id`).
* `contact_name` (TEXT): Nome informado no perfil do WhatsApp pelo cliente.
* `customer_id` (TEXT, FK `public.people(id)`): Vínculo auditável com o cliente no ERP.
* `customer_link_status` (TEXT): `'unlinked'`, `'auto_matched'`, `'manually_linked'`, `'ambiguous'`.
* `last_message_text` (TEXT): Prévia da última mensagem recebida.
* `last_message_at` (TIMESTAMPTZ): Data/hora da última mensagem para ordenação cronológica.
* `last_customer_message_at` (TIMESTAMPTZ): Registro para cálculo dinâmico da Janela de 24h da Meta.
* `unread_count` (INT): Contador de mensagens não lidas.
* `is_archived` (BOOLEAN): Controle de arquivamento.
* `internal_notes` (TEXT): Anotações internas da equipe (nunca compartilhadas com o cliente).
* `tags` (TEXT[]): Marcadores internos (`#urgente`, `#orcamento`, `#pos-venda`).
* `assigned_to` (UUID, FK `public.profiles(id)`): Atendente responsável.

### 3.2. Tabela `public.whatsapp_messages`
* `id` (UUID, PK): Identificador interno.
* `conversation_id` (UUID, FK): Vínculo com a conversa.
* `api_message_id` (TEXT, UNIQUE): Identificador oficial da Meta (`wamid`) para deduplicação.
* `direction` (TEXT): `'inbound'` ou `'outbound'`.
* `message_type` (TEXT): `'text'`, `'image'`, `'document'`, `'audio'`, `'video'`, `'interactive'`, `'sticker'`, `'unsupported'`.
* `text_content` (TEXT): Conteúdo textual.
* `media_id`, `media_mime_type`, `media_filename`, `media_caption` (TEXT): Metadados de mídias.
* `reply_to_wamid` (TEXT): Citação/resposta à mensagem anterior.
* `status` (TEXT): `'received'`, `'sent'`, `'delivered'`, `'read'`, `'failed'`.
* `timestamp` (TIMESTAMPTZ): Timestamp oficial do evento na Meta.

### 3.3. Tabela `public.whatsapp_usage_monthly`
* `id` (UUID, PK): Identificador.
* `business_phone_number_id` (TEXT): Número empresarial.
* `year_month` (TEXT): Período no formato `'YYYY-MM'` (ex: `'2026-10'`).
* `free_tier_limit` (INT): Limite mensal de 1.000 mensagens gratuitas de serviço.
* `service_messages_count` (INT): Contador de mensagens de serviço apuradas.
* `reconciliation_status` (TEXT): `'estimated'`, `'meta_confirmed'`, `'unconfirmed'`.
* `last_reconciliation_at` (TIMESTAMPTZ): Última checagem.

---

## 4. Regras de Identificação de Clientes

Implementadas no serviço `customerMatchingService.ts` e utilitários `phoneUtils.ts`:
1. **Normalização E.164:** Tratamento de DDI `+55`, DDD (2 dígitos) e número de telefone.
2. **Tratamento do 9º Dígito:** Gera candidatos com e sem o nono dígito (ex: `11987654321` e `1187654321`), prevenindo falso-negativos comuns no WhatsApp brasileiro.
3. **Detecção de Ambiguidade:** Se dois ou mais cadastros distintos no ERP possuírem o mesmo telefone, a conversa é sinalizada como `'ambiguous'` e exibida com badge amarelo na listagem. O sistema **não** vincula automaticamente para evitar associação incorreta.
4. **Vinculação Manual Auditável:** Modal com validação estrita via `react-hook-form` e `zodResolver` permitindo pesquisar por nome, CPF/CNPJ ou telefone e vincular explicitamente.
5. **Integridade Cadastral:** O sistema nunca altera os dados nem telefones do cadastro original e não cria clientes fictícios automaticamente.

---

## 5. Integração com Pedidos de Venda e Egress Eficiente

Seguindo as diretrizes de prevenção contra Egress excessivo do Supabase (`eficiencia-dados-egress`):
1. **Consultas Seletivas:** Apenas as colunas necessárias são projetadas (`id, order_number, status, total_amount, payment_method, delivery_status, scheduled_date, delivery_finished_at, items, created_at`).
2. **Lazy Loading de Pedidos:** A lista completa de pedidos só é consultada sob demanda quando o usuário abre o painel lateral do cliente na conversa selecionada, com limite de 20 registros.
3. **Hidratação em Lote na Listagem:** Ao listar 30 conversas, os clientes vinculados são carregados em uma única query com cláusula `in(id, ...)`, sem consultas N+1.
4. **Visão Comercial no Atendimento:** Exibe número do pedido, situação comercial, status da entrega, previsão, resumo legível dos itens e link direto para abrir a tela correspondente no ERP.

---

## 6. Sincronização em Tempo Real (Supabase Realtime)

A Central de Atendimento escuta eventos através de canais dedicados:
* `whatsapp-conversations-realtime`: Notifica novas conversas e atualiza prévias e contadores de não lidas sem recarregar a lista.
* `whatsapp-messages-realtime`: Despeja novas mensagens instantaneamente na conversa aberta.
* Ao abrir uma conversa, o contador de não lidas é zerado atipicamente no banco (`unread_count: 0`).

---

## 7. Rastreamento e Mídias Seguras

* **Proxy de Mídias:** `/api/whatsapp-media?id={media_id}` obtém a URL temporária com o token privado no backend e transmite o binário com cabeçalho de cache seguro (`Cache-Control: private, max-age=86400`). O token permanente da Meta nunca é exposto ao navegador do cliente.

---

## 8. Suíte de Testes Automatizados

Implementados 25 testes automatizados em `erp/src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts`:
1. Recebimento de mensagem válida.
2. Rejeição de assinatura inválida (`X-Hub-Signature-256`).
3. Deduplicação de eventos (idempotência por `wamid`).
4. Processamento de múltiplas mensagens em lote.
5. Recebimento de mensagem de texto.
6. Recebimento de mídia (imagem, documento, áudio, vídeo).
7. Identificação correta de cliente com nono dígito.
8. Tratamento de telefones ambíguos.
9. Vinculação de pedidos de venda.
10. Proteção das informações por permissão (`canPerform`).
11. Paginação server-side de conversas.
12. Atualização incremental de leitura e arquivamento.
13. Contador de consumo da franquia.
14. Alertas aos 900 e 1.000 mensagens.
15. Contador com consumo desconhecido / falha de rede.
16. Bloqueio de envio pelo frontend.
17. Bloqueio de envio pelo backend.
18. Garantia de que nenhum teste envia mensagens reais pela Meta.
19. Formatação de tempo relativo (estilo WhatsApp Web).
20. Agrupamento de mensagens por data com separadores contextuais.
21. Atribuição de conversa a atendente e geração de evento de sistema.
22. Atualização de status da conversa (`open`, `closed`, `snoozed`).
23. Criação e persistência de comentários internos no fluxo do chat.
24. Filtragem por filas "Minhas" (`mine`) e "Não atribuídas" (`unassigned`).
25. Catálogo de modelos e respostas rápidas (`DEFAULT_QUICK_SNIPPETS`).

Todos os 25 testes executados com 100% de sucesso.

---

## 9. Arquitetura de Interface — Redesign Desktop (WhatsApp Web / CRM)

A interface foi estruturada em quatro regiões perfeitamente integradas, espelhando fielmente o fluxo de comunicação de CRM e WhatsApp Web:

* **Região A — Barra Vertical de Navegação (`NavigationRail.tsx` ~60px):**
  - Ícone de marca WhatsApp com badge de status.
  - Botões rápidos de alternância de filas: Todas, Minhas (atribuídas ao usuário logado), Não atribuídas (fila geral), Não lidas (com badge numérico em tempo real), Com pedidos.
  - Indicador de consumo da franquia com gatilho para o modal de regras Meta.
  - Indicador pulsante de conexão Realtime da Cloud API.
  - Botão de sincronização manual com feedback animado de carregamento.
  - Avatar do operador autenticado com indicador online.

* **Região B — Lista de Conversas (`ConversationSidebar.tsx` ~380px):**
  - Cabeçalho com título "Conversas", botão de refresh e menu de contexto.
  - Campo de busca estendido por cliente, telefone ou pedido.
  - Abas prioritárias: "Todas", "Minhas", "Não atribuídas" e "Não lidas" com contadores dinâmicos.
  - Dropdown "Mais" com filtros secundários (Cadastrados, Com pedidos, Não identificados, Fechadas, Arquivadas).
  - Linhas de conversa com densidade otimizada (~74px), avatar circular de 48px com badge do canal WhatsApp, status da conversa (`Closed`, `Snoozed`), prévia de mensagem, data/hora formatada, badges contextuais do ERP e avatar do atendente responsável no canto inferior direito.
  - Estados vazios elaborados e skeletons de carregamento durante a busca inicial.

* **Região C — Área Principal do Chat (`ChatArea.tsx` & `EmptyChatState.tsx`):**
  - Tela inicial com arte vetorial SVG, 3 cartões de recursos e nota de proteção de custo zero.
  - Cabeçalho fixo (~64px):
    - Dados do contato clicáveis (abrem o painel do cliente) e indicador da Janela de 24h.
    - Seletor de Atendente Responsável (`Assignee Dropdown`): atribuição rápida a si mesmo ("Atribuir a mim") ou a membros da equipe.
    - Ação de Status: Botão dinâmico `[✓ Fechar Atendimento]` / `[Reabrir]` / `[⏰ Adiar]`.
    - Botão de Respostas Rápidas (`⚡`): abre modal de modelos e snippets.
    - Busca interna na conversa e menu de ações.
  - Histórico de mensagens com fundo texturizado suave, separadores de data flutuantes ("Hoje", "Ontem", data completa) e balões alinhados com avatares de remetente:
    - Balões de clientes (à esquerda com avatar).
    - Balões de operadores (à direita com avatar e dupla confirmação).
    - Balões de **Comentários Internos** em tom âmbar suave com ícone de nota e identificação do colaborador (`"Leaving a comment here"`).
    - **Eventos de Sistema** centralizados na timeline (atribuições de atendente, alterações de status e vínculos).
  - Rodapé de Composição Dual-Mode:
    - **Modo Comentário Interno:** textarea ativo para anotações colaborativas da equipe salvas no Supabase sem envio para a Meta.
    - **Modo WhatsApp:** interface bloqueada em modo seguro com feedback de proteção contra faturamento da Meta.
    - Botão de atalho rápido `/` para modelos de mensagens (`QuickSnippetsModal`).

* **Região D — Painel Contextual do ERP (`CustomerInfoPanel.tsx` ~380px):**
  - Painel lateral recolhível que opera como gaveta flutuante (drawer) em telas menores (< 1280px) e ancorado lado a lado em telas grandes.
  - Quatro abas temáticas:
    - **Cliente:** vínculo ERP com status de correspondência, dados cadastrais, atalho para `/registrations/customers` e botões de vincular/desvincular.
    - **Pedidos:** lista resumida de pedidos de venda com número, data, previsão de entrega, valor (BRL), itens e link direto para o pedido no ERP.
    - **Atendimento:** contador regressivo da janela de 24h da Meta, tags internas e notas da equipe com validação `react-hook-form` e `zodResolver`.
    - **Mídias:** galeria de fotos e lista de documentos compartilhados.

* **Integração no Layout (`AppLayout.tsx`):**
  - Quando a rota ativa for `/atendimento`, o contêiner `<main>` adota `p-0 overflow-hidden flex flex-col`, eliminando faixas vazias ou rolagens duplas indesejadas e ocultando botões flutuantes sobrepostos.
