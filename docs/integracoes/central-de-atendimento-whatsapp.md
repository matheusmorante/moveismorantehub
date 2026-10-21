# Central de Atendimento WhatsApp — MoranteHub ERP

> **Módulo:** Central de Atendimento (`/atendimento`)  
> **Integração:** WhatsApp Cloud API Oficial da Meta (Graph API)  
> **Status:** Ativo — consulta e recebimento; envio bloqueado por política da empresa
> **Data:** 20/10/2026

---

## 1. Visão Geral e Objetivo

A **Central de Atendimento** é o novo módulo principal do MoranteHub ERP projetado com a experiência visual e operacional familiar do WhatsApp Web para computadores, enriquecido com integração profunda e em tempo real aos cadastros de clientes e pedidos de venda do ERP.

### Política de envio
A página oficial de preços da [WhatsApp Business Platform](https://whatsappbusiness.com/products/platform-pricing/) informa que mensagens de serviço dentro da janela de atendimento de 24 horas não são cobradas. Isso diverge da franquia mensal de 1.000 mensagens descrita em versões antigas desta documentação; esse número não é uma fonte confirmada para o produto e foi removido da interface.

A empresa mantém o envio desativado por política operacional, independentemente da janela de atendimento ou da categoria de preço da Meta:
1. A Central permite consultar e organizar conversas e receber mensagens.
2. O campo de composição e o botão de envio permanecem desativados, com aviso de política empresarial.
3. O backend rejeita requisições de despacho com `403 Forbidden` (`BLOCKED_FREE_TIER_PROTECTION`).
4. A interface não exibe contagem ou limite numérico de mensagens.

---

## 2. Auditoria e Preservação de Integrações Existentes

Antes da implementação, foram auditadas as estruturas vigentes do MoranteHub:
* **Webhook Oficial:** `api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts` reutilizam `whatsappWebhookProcessor.ts`, preservando confirmação de entregas (`confirm_delivery_{orderId}`) e rastreamento em `whatsapp_dispatches` e `warranty_terms`.
* **Idempotência e Segurança:** O webhook valida `X-Hub-Signature-256` por HMAC-SHA256 sobre o corpo bruto, rejeita segredo ausente em produção e mantém deduplicação por `api_message_id` (`wamid`).
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
* `free_tier_limit` (INT): Campo legado de uma estimativa antiga; não é usado para determinar política nem aparece na interface.
* `service_messages_count` (INT): Contador de mensagens de serviço apuradas.
* `reconciliation_status` (TEXT): `'estimated'`, `'meta_confirmed'`, `'unconfirmed'`.
* `last_reconciliation_at` (TIMESTAMPTZ): Última checagem.

### 3.4. Complemento da Inbox
A migração `supabase/migrations/20261021010859_customer_support_inbox_completion.sql` adiciona pastas compartilhadas e RPCs de consulta paginada, contagem e diretório de atendentes. Ela substitui o acesso anônimo às tabelas da Central por políticas que exigem `viewCustomerSupport`, limita as colunas atualizáveis e encaminha dados comerciais por funções que também exigem `viewCustomerCommercialInfo`. A migration está preparada no repositório; a persistência compartilhada e as novas RPCs dependem de sua aplicação ao projeto remoto antes da publicação da interface.

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
1. **Consultas Seletivas:** As RPCs da Central retornam somente os campos de conversa, resumo de cliente ou pedidos necessários para a interface.
2. **Lazy Loading de Pedidos:** A lista de pedidos só é consultada sob demanda quando há conversa selecionada e o atendente possui `viewCustomerCommercialInfo`; o limite é de 20 registros.
3. **Hidratação em Lote na Listagem:** Cada página busca até 50 conversas e consulta resumos de clientes e contagem de pedidos em lote, sem consultas N+1.
4. **Visão Comercial no Atendimento:** Exibe número do pedido, situação comercial, status da entrega, previsão, resumo legível dos itens e link direto para abrir a tela correspondente no ERP.

---

## 6. Sincronização em Tempo Real (Supabase Realtime)

A Central de Atendimento escuta eventos através de canais dedicados:
* `whatsapp-conversations-realtime`: Notifica novas conversas e atualiza prévias e contadores de não lidas sem recarregar a lista.
* `whatsapp-messages-realtime`: Despeja novas mensagens instantaneamente na conversa aberta.
* Ao abrir uma conversa, o contador de não lidas é atualizado para zero (`unread_count: 0`).

---

## 7. Rastreamento e Mídias Seguras

* **Proxy de Mídias:** `/api/whatsapp-media?id={media_id}` obtém a URL temporária com o token privado no backend e transmite o binário com cabeçalho de cache seguro (`Cache-Control: private, max-age=86400`). O token permanente da Meta nunca é exposto ao navegador do cliente.

---

## 8. Suíte de Testes Automatizados

Em 20/10/2026, 48 testes Vitest passaram nas suítes `customerSupport.test.ts`, `customerSupportInbox.test.tsx` e `whatsappDispatchTracking.test.ts`. A cobertura focada inclui filtros/paginação, contagens, diretório de atendentes, formulários com `zodResolver`, pastas, cópia de snippets, linha do tempo, assinatura do webhook e despacho bloqueado. Esses testes isolados não comprovam persistência, RLS ou RPC no PostgreSQL remoto. A prova Playwright de pastas compartilhadas depende da migration remota e de fixture própria com ownership conforme [`SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md).

---

## 9. Arquitetura de Interface — Redesign Desktop (WhatsApp Web / CRM)

A interface foi estruturada em quatro regiões perfeitamente integradas, espelhando fielmente o fluxo de comunicação de CRM e WhatsApp Web:

* **Região A — Barra Vertical de Navegação (`NavigationRail.tsx`):** filas principais, aviso da política de envio, estado Realtime, atualização manual e perfil do operador. Atalhos de dashboard, campanhas e automações sem fluxo implementado foram removidos.

* **Região B — Lista de Conversas (`ConversationSidebar.tsx` ~380px):**
  - Cabeçalho com título "Conversas", botão de refresh e menu de contexto.
  - Busca por nome, telefone e prévia da mensagem; filtros são aplicados no servidor antes das páginas de 50 conversas.
  - Filas "Todas", "Minhas", "Não atribuídas" e "Não lidas" com contagens agregadas.
  - Filtros adicionais para vínculo, pedidos, fechadas e adiadas; pedidos e dados comerciais exigem `viewCustomerCommercialInfo`.
  - Atendentes reais com permissão da Central e pastas compartilhadas com critérios salvos, autor e abas "Por mim/Outras".
  - Linhas de conversa com densidade otimizada (~74px), avatar circular de 48px com badge do canal WhatsApp, status da conversa (`Closed`, `Snoozed`), prévia de mensagem, data/hora formatada, badges contextuais do ERP e avatar do atendente responsável no canto inferior direito.
  - Estados vazios elaborados e skeletons de carregamento durante a busca inicial.

* **Região C — Área Principal do Chat (`ChatArea.tsx` & `EmptyChatState.tsx`):**
  - Tela inicial com arte vetorial SVG, 3 cartões de recursos e aviso de envio bloqueado pela política da empresa.
  - Cabeçalho fixo (~64px):
    - Dados do contato clicáveis (abrem o painel do cliente) e indicador da Janela de 24h.
    - Seletor de Atendente Responsável (`Assignee Dropdown`): atribuição rápida a si mesmo ("Atribuir a mim") ou a membros da equipe.
    - Ação de Status: Botão dinâmico `[✓ Fechar Atendimento]` / `[Reabrir]` / `[⏰ Adiar]`.
    - Botão de Respostas Rápidas (`⚡`): abre modal de modelos e snippets.
    - Busca interna na conversa e menu de ações.
  - Histórico de mensagens com fundo texturizado suave, separadores de data flutuantes ("Hoje", "Ontem", data completa) e balões alinhados com avatares de remetente:
    - Balões de clientes (à esquerda com avatar).
    - Balões de operadores (à direita com avatar e dupla confirmação).
    - Histórico inicial limitado com carregamento de mensagens anteriores ao rolar até o topo.
    - Balões de **Comentários Internos** em tom âmbar com identificação do colaborador.
    - Linha do tempo composta apenas por comentários e eventos de sistema persistidos.
  - Rodapé de Composição Dual-Mode:
    - **Modo Comentário Interno:** textarea ativo para anotações colaborativas da equipe salvas no Supabase sem envio para a Meta.
    - **Modo WhatsApp:** interface de envio desativada por política da empresa.
    - `QuickSnippetsModal` copia o texto selecionado para a área de transferência; snippets não viram comentários.

* **Região D — Painel Contextual do ERP (`CustomerInfoPanel.tsx` ~380px):**
  - Painel lateral recolhível que opera como gaveta flutuante (drawer) em telas menores (< 1280px) e ancorado lado a lado em telas grandes.
  - Quatro abas temáticas:
    - **Cliente:** metadados do WhatsApp para todos os atendentes; vínculo, cadastro ERP e ações comerciais somente com `viewCustomerCommercialInfo`.
    - **Pedidos:** lista resumida de pedidos de venda somente com a permissão comercial.
    - **Atendimento:** contador regressivo da janela de 24h da Meta, tags internas e notas da equipe com validação `react-hook-form` e `zodResolver`.
    - **Mídias:** galeria de fotos e lista de documentos compartilhados.

* **Integração no Layout (`AppLayout.tsx`):**
  - Quando a rota ativa for `/atendimento`, o contêiner `<main>` adota `p-0 overflow-hidden flex flex-col`, eliminando faixas vazias ou rolagens duplas indesejadas e ocultando botões flutuantes sobrepostos.
