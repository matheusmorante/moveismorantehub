# Central de Atendimento WhatsApp — MoranteHub ERP

> Estado conferido em 24/10/2026 BRT: `morantehub.com` resolve para o deployment Production `dpl_BCAGQ1EV6ES448Aprnfz2xGX1gbJ` (`READY`). `verify_app_credentials` confirmou as credenciais Meta de Production, e `verify_waba_subscription` confirmou `valid=true` e `subscribed=true` no WABA configurado. A Meta também confirmou a inscrição do callback `whatsapp_business_account` em `morantehub.vercel.app`, caminho `/api/whatsapp-webhook`, campo `messages`. HMAC válida calculada em memória foi aceita pelo webhook Production para payload vazio; assinaturas ausente e inválida foram recusadas. Ainda não houve entrega originada pela Meta nem leitura autorizada de mídia real. O envio permanece bloqueado por política. O build e `test:unit` executam `build:support`, que gera a fronteira CJS do processador compartilhado; o adaptador local usa o mesmo produtor. Ver [diagnóstico de runtime](central-de-atendimento-runtime-esm-2026-10-21.md).

## Confirmação de Production e do WABA — 23/10/2026 BRT

O deployment `dpl_BCAGQ1EV6ES448Aprnfz2xGX1gbJ` ficou `READY` e recebeu os aliases `morantehub.com` e `morantehub.vercel.app`. Ele contém a rota `verify_waba_subscription`, protegida por `manageSettings`, que consulta `/{WABA-ID}/subscribed_apps` usando o token e o App Secret do ambiente server-side e retorna somente `valid` e `subscribed`.

O Playwright `npm run test:support:readonly` passou **1/1 em 25,0s**, usando a pilha de desenvolvimento na porta `5173` e API `3000`. O login autônomo e o gate do operador passaram; a Inbox carregou **50 conversas iniciais → 100 de 113**, com HTTP 200 na segunda página. O probe de Production confirmou `verify_app_credentials` e a inscrição do app no WABA (`valid=true`, `subscribed=true`). A consulta não registrou segredos, identificadores de outros apps nem payload Graph.

Nenhuma migration, fixture, gravação no banco, alteração de configuração Meta ou mensagem foi feita nesta prova. A entrega real originada pela Meta e a leitura autorizada de mídia continuam sem comprovação; o despacho permanece bloqueado.

> **Módulo:** Central de Atendimento (`/atendimento`)  
> **Integração:** WhatsApp Cloud API Oficial da Meta (Graph API)  
> **Status:** Inbox publicada em produção; inscrição WABA, validação HMAC e credenciais Graph confirmadas, entrega legítima da Meta ainda não comprovada; envio bloqueado por política da empresa
> **Data:** 24/10/2026 (BRT)

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

As tabelas legadas descritas abaixo estão presentes no projeto remoto operacional (`hkoxhourxwlddgsfdgws`). A consulta de histórico não localizou a versão exata do arquivo-base `20261016030000_customer_support_whatsapp.sql`; sua existência no repositório não comprova essa origem. O complemento da Inbox tem aplicação rastreada conforme a seção 3.4.

### Revalidação do histórico base — 23/10/2026

O projeto MoranteHub foi confirmado `ACTIVE_HEALTHY` (PostgreSQL 17.6.1). O histórico remoto contém as dez migrations `customer_support_*` da Inbox, começando em `20261021032348`, mas não contém `20261016030000_customer_support_whatsapp`. As três tabelas base (`whatsapp_conversations`, `whatsapp_messages` e `whatsapp_usage_monthly`) e `customer_support_inboxes` existem no schema `public`, com RLS habilitada. A consulta de privilégios confirmou `anon` sem `SELECT`, `INSERT` ou `UPDATE`; as políticas instaladas são destinadas a `authenticated` e verificam `customer_support_can_view()` onde aplicável. As políticas de `INSERT` direto em conversas/mensagens e de `UPDATE` direto em mensagens são negativas.

O arquivo-base local ainda declara políticas permissivas para `authenticated, anon`. Ele não deve ser tratado como prova da origem do schema remoto nem aplicado/reaplicado por inferência: isso poderia divergir do estado protegido que está instalado. Não houve DDL nem consulta de conteúdo operacional nesta revalidação. Qualquer reconciliação futura do baseline precisa ser preparada como operação separada, com leitura do catálogo atual e comparação de compatibilidade, sem substituir as migrations incrementais rastreadas.

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
A migração `supabase/migrations/20261021032348_customer_support_inbox_completion.sql` foi aplicada em 21/10/2026 no projeto operacional e consta no histórico remoto com o nome `customer_support_inbox_completion`. O arquivo foi alinhado à versão registrada pela ferramenta; o nome local anterior era `20261021010859_customer_support_inbox_completion.sql`.

Ela adiciona pastas compartilhadas e RPCs de consulta paginada, contagem e diretório de atendentes. Substitui o acesso anônimo às tabelas da Central por políticas que exigem `viewCustomerSupport`, limita as colunas atualizáveis e encaminha dados comerciais por funções que também exigem `viewCustomerCommercialInfo`. As políticas existentes foram atualizadas sem `DROP`. O predicado de pastas foi corrigido antes da aplicação para que a exclusão padrão de fechadas não anule uma pasta de fechadas/todos os estados.

No checkpoint de 21/10, metadados e seis checks Vitest confirmaram acesso anônimo negado; naquele momento, ainda não comprovavam CRUD compartilhado autenticado nem filtros em múltiplas páginas. A revalidação posterior do catálogo, CRUD/pastas e paginação real está registrada nas seções de 23/10 abaixo. Registro detalhado da migration e reversão: [migração de 21/10/2026](central-de-atendimento-migracao-2026-10-21.md).

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
4. **Visão Comercial no Atendimento:** Exibe número do pedido, situação comercial, status da entrega, previsão e resumo dos itens. O atalho abre `/sales-order` com `saleOrderIdToOpen`, contrato existente para filtrar/destacar o pedido do próprio cartão. Conferido por componente, preservando a permissão comercial; navegação para pedido persistido ainda não exercitada nesta massa.

---

## 6. Sincronização em Tempo Real (Supabase Realtime)

A Central de Atendimento escuta eventos através de canais dedicados:
* `whatsapp-conversations-realtime`: Eventos disparam novas consultas das páginas de conversas abertas; há também polling de seis segundos.
* `whatsapp-messages-realtime`: Eventos disparam atualização do histórico carregado da conversa aberta, com deduplicação; isso não é prova de entrega instantânea nem de comportamento sob reconexão.
* Ao abrir uma conversa, o contador de não lidas é atualizado para zero (`unread_count: 0`).

---

## 7. Rastreamento e Mídias

* **Proxy de Mídias:** `/api/whatsapp-media?id={media_id}` e a operação consolidada usam `whatsappMediaProxy.ts`. Exigem Bearer validado por `auth.getUser`, permissão `customer_support_can_view()` e mensagem visível sob RLS com aquele `media_id`, antes de consultar a Meta. Respostas usam `Cache-Control: private, no-store`. Tokens não são colocados na URL.

* O frontend busca o binário autenticado e fornece URLs locais `blob:` para imagem, figurinha, áudio, vídeo, documento e galeria. Cancela consultas antigas e revoga URLs ao trocar contexto ou sair. Há progresso, erro e repetição. URLs arbitrárias persistidas não são abertas diretamente; a consulta agregada encontrou 54 registros com ID e nenhum dependente somente de URL.
* O proxy de mídia usa `WHATSAPP_ACCESS_TOKEN` exclusivamente do ambiente server-side e falha fechado se estiver ausente; não há fallback para `settings/app`. O handler verifica JWT, permissão, mensagem visível pela RLS e correspondência do canal antes de consultar a Meta. A presença da variável foi conferida sem ler seu valor; não comprova acesso válido à Meta nem download de binário real.
* O fallback HTTP de desenvolvimento agora reconhece as três rotas WhatsApp, preservando os bytes do webhook para HMAC. A API continua na porta 3000, atrás do frontend na porta 5173.

**Limite:** o deploy de produção está concluído, mas binários privados de clientes reais não foram usados como fixture e os sucessos de transporte/MIME com permissão são provas isoladas, sem comprovar RLS autenticada de uma fixture real. O webhook legítimo ainda não foi exercitado com uma assinatura da Meta; as verificações públicas cobrem somente recusas sem assinatura ou com assinatura forjada.

### Achado de segurança em configurações compartilhadas

O achado de 22/10 foi corrigido pelo pacote transversal: a migration remota `20261023103833_remove_bling_and_settings_credentials` (versão `20261023130851`) removeu os campos secretos de `public.settings`, e os consumidores ativos passaram a usar variáveis de ambiente no servidor. A conferência atual encontrou zero campos de credencial não vazios, nenhum `whatsappConfig.accessToken` e nenhuma configuração Bling. `anon` não pode ler a tabela; `authenticated` ainda pode ler o JSON não secreto pela política `Authenticated can read settings` (`USING (true)`). Portanto, a migração retirou os segredos, mas não alterou a política de leitura do documento de configurações. Detalhes e limites estão em [segurança das configurações](central-de-atendimento-seguranca-configuracao-2026-10-22.md).

---

## 8. Suíte de Testes Automatizados

Em 21/10/2026, **191 testes Vitest passaram em 19 arquivos**, incluindo seis checks reais de leitura anônima negada nas quatro tabelas e duas RPCs de permissão e seis testes das rotas do layout. Esses seis checks remotos só fazem `SELECT ... LIMIT 0` e chamadas de permissão; não criam fixtures. A cobertura inclui mídia protegida, paginação/contexto, drafts/conflitos, resolvers reais dos comandos e formulários, seleção do pedido, altura da Central e adaptador HTTP/raw-body. [Conferência atual](central-de-atendimento-validacao-2026-10-21.md).

A prova Playwright dedicada **somente leitura passou (1/1, 24s)**: login autônomo com identidade canônica e gate 204, entrada em `/atendimento`, pasta vazia recusada pelo resolver, filtro de atendente aplicado/limpo, rolagem carregando a segunda página (99/99 conversas) e mídia sem sessão recusada com 401. A lista agora rola dentro do viewport. Credenciais vêm do launcher oficial Vercel Development, em memória, sem storage state, trace ou captura de senha. Gravações de negócio são bloqueadas no transporte; navegador visível preservado.

Build Vite final aprovado (1m59s). TypeScript dos harnesses sem diagnósticos; global retornou 424 diagnósticos, nenhum nos caminhos da Central; o erro anterior de assistência em `AppLayout.tsx:100` permanece fora das duas alterações de classes do layout. Lint focado sem erros e um aviso anterior de Fast Refresh; spec Playwright sem configuração de lint aplicável. Logs: `scratch/central-inbox-unit-2026-10-21.log`, `scratch/central-inbox-build-2026-10-21.log` e `scratch/central-inbox-tsc-2026-10-21.log`.

A [operação limitada autorizada](central-de-atendimento-fixtures-proposta-2026-10-21.md) teve **quatro testes remotos Vitest aprovados** com ownership, autoria, replay sem nova massa, paginação 50+1, eventos idempotentes, tags concorrentes, conflito de notas e metadata preservada. Playwright gravável passou em 36,3s: pasta criada/reaberta/editada/excluída, histórico 80+1, snippet sem nota, comentário, atribuição/status, tags/notas e timeline sem IDs duplicados. A limpeza, autorizada separadamente, passou em 2/2 testes: 51 conversas arquivadas e 190 mensagens preservadas. As configurações específicas exigem ambiente oficial, gate real, identidade e IDs próprios; a suíte geral conserva sua guarda. Persistem limites para outra identidade autorizada, ausência de permissão comercial, vínculos comerciais próprios e mídia própria. Todos seguem a [`SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md). O agente executa os logins, conforme `AGENTS.md`, seção 9.

## 8.1. Comandos internos e compatibilidade de implantação

A migration `20261021041610_customer_support_internal_commands.sql` foi aplicada. O frontend usa RPCs para atribuição, status, comentário, notas e tags; autor/horário e estado atual são derivados no servidor. As funções mantêm alteração/evento na mesma transação e não criam evento ao repetir atribuição/status já persistidos. Notas têm comparação do texto-base; tags não sobrescrevem notas nem snapshots de status. Rascunhos em edição são preservados.

**Transição de compatibilidade concluída:** o deployment com as cinco RPCs precedeu a migration `20261021162004_customer_support_internal_commands_contract`, confirmada no histórico do Supabase operacional. A consulta de catálogo em 23/10 confirmou que `authenticated` não pode inserir/atualizar mensagens nem alterar campos de comando em conversas; a única atualização direta de conversa mantida é `unread_count` para confirmação de leitura. A policy `whatsapp_messages_insert` também rejeita `authenticated`, e `anon` não possui as permissões verificadas. Atribuição, status, comentário, notas e tags continuam pelas RPCs que derivam usuário/estado do servidor. [Objetos, efeitos, retenção e próximos gates](central-de-atendimento-comandos-2026-10-21.md).

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

## Autorização de mídia — revalidação em 23/10/2026

O proxy exige GET, JWT válido e `customer_support_can_view()`. Pela mesma sessão sujeita à RLS, encontra exatamente uma mensagem com o `media_id` e carrega o `business_phone_number_id` da conversa vinculada; ausência, duplicidade, erro ou canal não numérico falham fechados. O backend envia esse canal em `phone_number_id` ao consultar a URL da mídia na Graph API v26.0, conforme o [fluxo oficial da Meta](https://www.postman.com/meta/whatsapp-business-platform/request/ptjyi84/retrieve-media-url). O token vem somente de `WHATSAPP_ACCESS_TOKEN` no servidor. Não aceita URL ou canal informado pelo cliente, usa timeout e cabeçalhos privados.

Após a vinculação do canal à conversa, **42/42 testes focados do proxy passaram** e o build completo do ERP passou (11/12 slots de API, verificações fiscais/XSD e 5.903 módulos Vite). O Playwright somente leitura da Inbox já havia passado na porta `5173` antes desta mudança; não foi repetido porque a correção foi restrita ao proxy server-side. Nenhum valor de credencial foi lido para validar a configuração Vercel.

Isso comprova autorização/negação e o contrato do transporte simulado, **não** um download real. Os artefatos remotos de teste examinados não possuem `media_id` próprio e a rota autorizada ainda não foi exercitada contra um binário real da Meta. A alternativa de menor impacto é localizar uma mídia já pertencente a uma conversa de teste/operator-owned com ownership confirmado; se não houver, qualquer geração de fixture com mídia real exige uma operação e autorização específicas. Nenhuma conversa de cliente será usada como fixture.

Rechecagem remota somente de metadados em 23/10: há 56 conversas marcadas como fixtures `test-artifact`, todas arquivadas; nenhuma tem `media_id` e nenhuma mensagem de fixture contém mídia. Assim, não existe fixture própria ativa para provar o download autorizado sem criar uma nova entrada de mídia no canal.

As decisões sobre prévia de mensagem citada, paginação integral de timeline/galeria e separação entre comentário e resumo interno foram implementadas e aprovadas pelo proprietário; a prova remota do comentário e a publicação condicionada foram concluídas. O registro e os limites restantes estão em [decisões de histórico e comentários](central-de-atendimento-decisoes-historico-2026-10-23.md).

## Revalidação do segredo do webhook — 23/10/2026

O código das duas entradas (`api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts`) lê `WHATSAPP_APP_SECRET` e aceita `META_APP_SECRET` como fallback. A lista de configuração da Vercel para o projeto `morantehub` contém `WHATSAPP_APP_SECRET` nos ambientes Production, Development e Preview. Foram consultados apenas nome, ambiente e tipo da variável; o valor não foi aberto nem registrado.

Vitest continua cobrindo assinatura HMAC válida com segredo de teste, assinatura inválida e segredo ausente; a produção já respondeu `401` sem assinatura nas verificações públicas anteriores. A presença da variável elimina a hipótese de ausência de configuração, mas não comprova que o valor corresponde ao App Secret da Meta nem que um webhook legítimo será aceito. Nenhum POST válido foi enviado, e o envio de mensagens continua bloqueado.

## Verificação após a publicação de histórico — 23/10/2026

O candidato de histórico foi publicado como `dpl_7nPegi5o1D8f9xtNCDh2ga6YnEJW` (`READY`, Production). A implantação atual verificada é `dpl_9wN2dRxXZ3GjQX1QW4yRmy8jw7nh` (`READY`, commit `e45141b736592f6f92d6b928ffb8a479fb8c999b`), com aliases `morantehub.vercel.app` e `morantehub.com`; `/` e `/atendimento` responderam HTTP 200. A lista de variáveis da Vercel confirma `WHATSAPP_APP_SECRET` em Production, consultada sem descriptografar o valor.

A telemetria da implantação registrou um POST em `/api/whatsapp-webhook` com HTTP 401. O log agregado não trouxe detalhe suficiente para atribuir a causa a assinatura ausente, inválida ou configuração divergente; portanto, isso não prova que o App Secret corresponda ao aplicativo Meta nem que um webhook legítimo será processado. Nenhum POST válido foi enviado. O envio de mensagens segue bloqueado.

O operador informou o Meta App ID `1364259738556530`, confirmado em `WHATSAPP_APP_ID` nos ambientes Production, Preview e Development da Vercel. O nome do aplicativo e a confirmação de que esse ID está inscrito no WABA do canal ainda não foram verificados. A ferramenta Vercel foi consultada com `decrypt=true`, mas retornou `decrypted:false` e sem valores para `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` e `WHATSAPP_VERIFY_TOKEN`. A leitura autenticada da Meta pelo navegador também não pôde ser feita: a sessão informa que o uso do navegador local está desativado. Nenhuma inscrição do webhook foi alterada. [Documentação da Vercel sobre variáveis Secret](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

Na revalidação da rota segura em 23/10, um POST de conexão autenticado retornou HTTP 500. O log da Vercel associou a falha à importação ESM de `authenticatedErpRequest` sem extensão pelo runtime Node 24. `erp/api/secure-integrations.ts` agora importa as dependências locais com extensão `.js`, compatível com a resolução ESM de produção e com o build TypeScript. O candidato foi publicado como `dpl_H92Mmz8tUHcxc8Lby95XP1hXQ91x`; GET sem método aceito respondeu 405 e POST sem sessão respondeu 401. A agregação de runtime retornou um grupo `DEP0169` (`url.parse`, uma ocorrência, primeira observação em 26/08 e última em 23/10); os logs detalhados não retornaram a stack, e a busca no código da Central não encontrou uso direto. A tentativa de `connection_test` com a identidade de operador autenticada chegou à aplicação e recebeu 403 (`Perfil sem acesso ao serviço`); nenhuma permissão foi ampliada para contornar o gate. Assim, o HTTP 500 foi corrigido, mas o acesso à Graph API e a assinatura do webhook Meta continuam sem prova.

Reexecução local pelo adaptador HTTP em 23/10: **6/6 Vitest passaram**. As rotas standalone e consolidada de despacho retornaram `403`; assinatura inválida retornou `401`, segredo ausente em produção simulada retornou `503`, e o caso positivo usou somente segredo/body sintéticos. Nenhuma chamada externa foi feita por essa suíte.

## Correção de runtime publicada — 23/10/2026

O candidato autorizado foi promovido em produção como `dpl_9MVeLZy52dyjVMsZm56zoTEiDKz5` (`READY`). O build otimizado remoto passou. A causa do HTTP 500 — import local sem `.js` carregado pelo Node 24 ESM — não se reproduziu após a publicação: `/api/meta-graph` sem JWT de atendente respondeu 401, como esperado. A rota `/` e a Inbox responderam 200; webhook sem assinatura respondeu 401; despacho continuou bloqueado com 403. As chamadas não continham sessão de atendente, token Meta ou mensagem e não gravaram dados.

Correção a registros anteriores: a lista de variáveis da Vercel confirma `WHATSAPP_APP_SECRET` como variável sensível em Production, Preview e Development. Somente os metadados (nome, ambiente e tipo) foram consultados; o conteúdo não foi aberto. Portanto a variável estar presente não demonstra que o valor corresponde ao Meta App ID `1364259738556530`. A chamada positiva à Graph, o webhook assinado legítimo e o download autorizado de mídia continuam sem validação. Não houve alteração de inscrição Meta, migration, fixture ou envio.

## Revalidação da Inbox — 23/10/2026

Nesta continuidade passaram **87/87 Vitest/RTL em cinco arquivos**: `customerSupport.test.ts`, `customerSupportInbox.test.tsx` e `customerSupportLinkForms.test.tsx` (64); `customerSupportLocalApi.test.ts` (6); `customerSupportPaging.test.tsx` (17). Cada execução também concluiu `build:support`. A paginação foi exercitada com mocks isolados.

A reexecução real da UI passou **1/1** por `npm run test:support:readonly` em `localhost:5173`: login com Development da Vercel, gate de operador, Inbox, tentativas de recuperação do diretório de pastas e atendentes, validação de pasta e consulta restrita por atendente. O guard de rede bloqueou gravações de negócio. O teste agora espera `DOMContentLoaded` na rota de login e usa os seletores existentes para aguardar a interface; a execução anterior excedia 15 s esperando o evento `load`, apesar do servidor responder em `5173`. Nenhuma fixture foi criada, mensagem enviada ou chamada à Meta feita nessa validação.

Rechecagem adicional após publicar o runtime, em 23/10: a mesma suíte passou **1/1 em 45,3s**, com autenticação automática e gate confirmados. Recuperação de pastas/atendentes, carregamento da Inbox, validação do formulário e filtro por atendente passaram; o guard reteve as gravações. O ambiente foi iniciado pela raiz via `npm run dev` após encerrar a pilha existente do mesmo repositório; a inicialização fiscal e XSD passou, Vite respondeu 200 na porta 5173 e a API 3000 rejeitou GET em `/api/meta-graph` com 405.

## `connection_test` de produção — 23/10/2026

Uma reexecução Playwright opcional passou **1/1 em 53,0s**. Com a sessão Development do operador, o Vercel CLI encaminhou o JWT via stdin (sem registrá-lo) para `POST /api/meta-graph` na implantação de produção `dpl_9MVeLZy52dyjVMsZm56zoTEiDKz5`. A função retornou HTTP 200 para a operação somente leitura `connection_test`, confirmando que o token Meta de produção pode consultar o `phoneNumberId` configurado. O corpo Graph, que contém metadados do número, não foi registrado. Nenhuma mensagem ou escrita no banco ocorreu.

Esta consulta não usa `WHATSAPP_APP_SECRET`; a correspondência do segredo com `WHATSAPP_APP_ID=1364259738556530` continua pendente. O webhook sem assinatura segue respondendo 401 e não foi enviado um POST válido. O ambiente Development respondeu 503 por não ter `WHATSAPP_ACCESS_TOKEN`; a chave de produção não foi copiada.

### Revalidação contínua — 23/10/2026

**Atualização posterior:** a produção passou a `dpl_2tZb4TRyA8K2iZfnx5kMRvLqe611` e reintroduziu os imports ESM sem extensão. A recusa de acesso do operador também teve causa comprovada no conflito entre `role` legado e `roles` atuais. Correções locais de autorização, continuidade após citação e busca no histórico completo estão registradas em [papéis, busca e histórico](central-de-atendimento-papeis-busca-historico-2026-10-23.md), com estado de validação e publicação próprios.

A suíte focada `npm run test:unit --prefix erp -- src/pages/App/CustomerSupport src/pages/utils/customerSupport src/pages/utils/metaService` passou em **31 arquivos: 301 testes aprovados e seis verificações remotas opt-in ignoradas**; `build:support` também passou. Incluiu teste da API em Node nativo, validação HMAC e recusas 401/403/503, paginação, pastas, formulários, mídia, contexto comercial e recebimento. O Playwright `npm run test:support:readonly` passou **1/1 em 17,8s** na porta `5173` (`strictPort`), com API `3000`: login autônomo, gate do operador, falha/recuperação de pastas e atendentes e consulta por atendente. A repetição com `SUPPORT_READONLY_SECURE_API_IMPORT=1` passou **1/1 em 15,6s**, validando também o carregamento da rota Meta local antes do login. Nenhuma fixture ou gravação de negócio foi criada; o envio permaneceu bloqueado.

## Validação protegida do App Secret — implementação local em 23/10/2026

Foi preparada uma operação server-side `verify_app_credentials` em `/api/meta-graph`, autorizada por `manageSettings`. Ela usa `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET` e `WHATSAPP_ACCESS_TOKEN` do ambiente da função para consultar `debug_token`. O App Secret bruto não é transmitido: o servidor calcula `appsecret_proof` por HMAC-SHA256; o token segue em `input_token` e no cabeçalho Bearer. A resposta só contém validade, motivo seguro e, em falha da Graph, status/códigos numéricos e classe sanitizada do erro — nunca mensagem bruta ou segredo. Não lê/escreve configurações no banco, não altera webhook e não habilita envio. O endpoint oficial da [Meta](https://www.postman.com/meta/whatsapp-business-platform/request/i1mz7w8/debug-token) documenta `input_token`.

A suíte focada passou em **35 arquivos: 333 aprovados e sete ignorados** (seis verificações remotas opt-in e a prova real de credenciais, desligada por padrão); `build:support` também passou. A cobertura nova testa autorização `manageSettings`, booleano sem segredos, falta de configuração, bloqueio sem sessão e a fronteira nativa Node/CJS. Um Playwright somente leitura da Inbox passou **1/1 em 47,2s** na porta `5173`, com login autônomo, gate real e consulta por atendente; a verificação Meta de produção permaneceu desligada nessa execução. A tentativa de executar a prova diretamente com `vercel env run -e production` carregou o App ID, mas o processo filho não recebeu `WHATSAPP_APP_SECRET` nem `WHATSAPP_ACCESS_TOKEN`; os nomes/alvos continuam presentes nos metadados da Vercel, sem valores descriptografados. Portanto a correspondência real do segredo **ainda não foi conferida** e depende de uma Function de produção que acesse as variáveis no runtime.

A compilação Vite otimizada do candidato (`npx vite build`) passou em 1m37s, transformando 5.927 módulos; `npx vite build --minify false` também passou em 1m09s. `npm run build --prefix erp` no checkout local para antes do Vite na checagem fiscal preexistente, que conta 13 funções de API acima do limite Hobby. O deployment `dpl_FpxMtvQY32eVxd5VX3zGHGwZ5AqZ` foi sucedido por `dpl_AcN3jt9UXSbyTDGcGdQmRn8oLmbN`, publicado em produção após autorização. Nenhuma migration, fixture, mensagem, mudança de variável ou envio à Meta ocorreu.

## Diagnóstico protegido em produção — 23/10/2026

O deployment `dpl_AcN3jt9UXSbyTDGcGdQmRn8oLmbN` está `READY` e atende os aliases de produção. O Playwright autenticado executou somente a operação de leitura `verify_app_credentials`, que atingiu a Graph API e recebeu HTTP 400, código 100, classificado como `invalid_appsecret_proof`. Nenhum segredo ou corpo bruto da Meta foi registrado. Isso comprova que a combinação de `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_APP_SECRET` carregada no runtime não passa a validação da Meta; não identifica, isoladamente, se o segredo pertence a outro app, foi rotacionado ou se o token está vinculado a outro app. A variável existe na Vercel, mas o conteúdo permanece oculto.

Revalidação local anterior aos checks remotos: a seleção Vitest/RTL da Central e do proxy Meta passou em **35 arquivos, 334 testes aprovados e 7 ignorados**; `build:support` passou. Os ignorados eram seis provas remotas opt-in e uma verificação real de credenciais desativada por padrão. A cobertura RTL confirma busca separada por nome de pasta e atendente. Nenhuma fixture foi criada nessa execução.

Playwright visível somente leitura passou **1/1 em 32,1s** com login/gate autônomos, recuperação de pastas e atendentes, validação de pasta, consulta por atendente e guard de gravação; usou `npm run dev` na raiz (ERP `5173`, API `3000`). A rolagem confirmou paginação real de **50 para 98 de 98 conversas**, com HTTP 200 na segunda página. A rota de produção `/atendimento` respondeu HTTP 200 após a publicação.

Não houve migration, fixture, escrita de dados, mudança de variável ou inscrição do webhook. O envio permanece bloqueado. O próximo passo para validar o webhook é corrigir a credencial em fonte protegida e repetir somente `debug_token`; o painel Meta exige reautenticação para revelar o App Secret e não há credencial de senha nas variáveis Vercel consultadas.

### Rechecagem remota das permissões — 23/10/2026

Com `RUN_CUSTOMER_SUPPORT_REMOTE_READONLY_TESTS=1`, os seis checks de integração foram executados contra o Supabase operacional: quatro leituras `anon` com `LIMIT 0` e duas chamadas `anon` a RPCs retornaram `42501`, sem consultar linhas. A seleção completa da Central e do proxy Meta passou em **35 arquivos, 343 aprovados e 1 ignorado**; `build:support` passou. Regressões estáticas protegem a ordem dos filtros de pedidos, os gates das RPCs comerciais e a saída restrita do diretório. O catálogo remoto confirmou os dois gates e execução anônima revogada nas sete RPCs comerciais; a RPC de atendentes expõe somente `id`, `full_name` e `role`, com acesso restrito à Central. O único caso ignorado é a validação real das credenciais Meta. Nenhuma escrita ou fixture ocorreu.

A aba Meta disponível estava redirecionada à tela de entrada, sem sessão autenticada. Nenhuma senha foi solicitada ou digitada e nenhum App Secret foi lido. A validação de `debug_token` em Production continua retornando `invalid_appsecret_proof`; o webhook legítimo permanece sem prova e o envio continua bloqueado.

Playwright adicional em 23/10 passou **1/1 em 54,6s**, mantendo a pilha raiz em `5173`/API `3000` e usando o run próprio arquivado `8eaed14f-364d-47ab-be41-66be54b3fb65` para comprovar ownership. Respostas de leitura da timeline foram interceptadas no navegador para apresentar 80 mensagens iniciais e mais uma página anterior; rolar ao topo carregou a anterior e renderizou 81 mensagens. Nenhuma escrita alcançou o banco. A prova valida a interação de UI, não uma página anterior persistida no PostgreSQL; isso depende de uma fixture própria com volume aprovado.

Auditoria posterior do catálogo remoto (projeto `hkoxhourxwlddgsfdgws`, `ACTIVE_HEALTHY`): `anon` não tem privilégios de tabela `SELECT`, `INSERT`, `UPDATE` ou `DELETE` nas quatro tabelas da Central. `customer_support_inboxes` mantém UPDATE somente nas colunas `name`, `criteria` e `updated_at`, sem permissão de alteração de `id`, `created_by` ou `created_at`; a RLS permite manutenção a qualquer usuário com `customer_support_can_view()`, e limita INSERT ao próprio `auth.uid()`. O usuário adiou a prova end-to-end entre duas contas.

A função de listagem efetivamente instalada foi conferida via catálogo. Contagem, filtros `with_orders`/`without_orders` e critério de pedidos das pastas são aplicados antes do limite da página; a consulta também exige `customer_support_can_view_commercial_info()` para os critérios comerciais. Nenhum dado operacional foi consultado.

### Revalidação de credenciais e HMAC do webhook Production — 23/10/2026 BRT

A consulta Vercel por `morantehub.com` resolveu para o deployment `dpl_4P8QZFMJZPgc7Db3dU4ufvx135Hn` (`READY`). O Playwright `npm run test:support:readonly` passou **1/1 em 32,7s**, com o ERP de desenvolvimento em `localhost:5173` e API na porta `3000`; o login e o gate de operador foram confirmados sem exibir credenciais. A Inbox carregou 50 conversas e, ao paginar, 100 de 104; a segunda página respondeu HTTP 200. A operação protegida `verify_app_credentials` confirmou as credenciais de Production na Graph API.

O teste enviou três requisições ao deployment de Production com o corpo fixo `{"object":"whatsapp_business_account","entry":[]}`: sem assinatura, HTTP 401; com HMAC inválida, HTTP 401; com HMAC-SHA256 calculada em memória usando `WHATSAPP_APP_SECRET` de Development, HTTP 200 e `EVENT_RECEIVED`. Como `entry` está vazio, o processador encerra antes de consultar ou alterar dados. Nenhum registro, fixture, mensagem ou configuração foi criado/alterado; o despacho segue bloqueado.

Esta prova confirma que Production valida HMAC e que o segredo de Development utilizado no teste corresponde ao segredo aceito pelo runtime de Production. Com `verify_app_credentials`, também foi confirmada a aceitação da credencial de Production pela Graph API. **Não** comprova uma entrega assinada pela Meta, a inscrição/configuração do webhook no WABA, o handshake `hub.challenge` ou a leitura de mídia real.

### Inscrição do callback do app e preparação da verificação do WABA — 23/10/2026 BRT

Uma consulta Graph somente de leitura ao endpoint de assinaturas do app confirmou o objeto `whatsapp_business_account`, o host `morantehub.vercel.app`, o caminho `/api/whatsapp-webhook` e a inscrição do campo `messages`. A URL não contém query string. Não foram alterados callback ou campos.

O GET oficial de inscrições do WABA usa `/{WABA-ID}/subscribed_apps` ([coleção oficial Meta WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/request/tl2wk2j/get-all-subscriptions-for-a-waba)). O token de Production está marcado como sensível e a Vercel não o disponibilizou ao processo local; nenhum valor foi descriptografado. Foi preparada em `verify_waba_subscription`, protegida por `manageSettings`, uma consulta server-side ao WABA configurado em `public.settings`. Ela usa o token e o segredo apenas no runtime, pagina por cursor Graph em endpoint fixo e reduz a resposta a `{ valid, subscribed }`, sem expor outros aplicativos. A prova remota ainda depende da publicação desse candidato.

Validação local do candidato: os testes focados passaram (**10/10**); a seleção completa `npm run test:unit --prefix erp -- src/pages/App/CustomerSupport src/pages/utils/metaService` passou em **36 arquivos, 345 aprovados e 7 ignorados**. `build:support` gerou `secure-integrations.cjs`; o teste nativo também aprovou a montagem isolada incluindo o helper novo. Playwright visível passou **1/1** com `npm run dev` na pilha existente (`5173`/`3000`): login/gate, recuperação de pastas/atendentes, validação e filtro por atendente passaram; paginação real carregou **50 → 100 de 110** com HTTP 200. O probe novo de inscrição WABA ainda aguarda publicação. Sem migration, alteração de dados, escrita no Supabase ou operação de envio.

### Revalidação do WABA e dos painéis da Inbox — 24/10/2026 BRT

O deployment Production `dpl_BCAGQ1EV6ES448Aprnfz2xGX1gbJ` já atende os aliases `morantehub.com` e `morantehub.vercel.app` e contém `verify_waba_subscription`. Com login e gate reais do operador, a consulta autenticada somente de leitura confirmou as credenciais Meta válidas e `valid=true`, `subscribed=true` para o WABA configurado. Nenhuma inscrição, configuração, fixture ou registro foi alterado; a entrega real de um webhook pela Meta e a leitura de mídia real continuam sem prova. O envio de mensagens permanece bloqueado.

Na Inbox, as duas laterais são independentes, redimensionáveis e recolhíveis; o reset restaura 220/340 px e os filtros da Inbox permanecem selecionados ao fechar e reabrir o painel. Foi corrigida a ordem dos callbacks ao escolher um filtro: a limpeza de pasta/atendente não redefine mais a seleção para “Todas”. Preferências permanecem isoladas por usuário no navegador e não são alteradas ao usar o breakpoint móvel.

Vitest/RTL passou **28/28 em três arquivos**, incluindo a regressão de filtros, preferências e teclado. A seleção completa Central/Meta repetiu no pacote isolado em **38 arquivos, 352 aprovados e 7 ignorados** (os checks remotos opt-in e a prova Graph real). O build completo `npm run build --prefix erp` passou em **1m40s**, incluindo 12/12 funções fiscais, `build:support` e Vite, com avisos de imports com carregamento misto e de um chunk acima de 500 kB. Playwright somente leitura passou **1/1 em 25,9s** pela pilha `npm run dev` (`localhost:5173`, API `3000`): arraste/teclado, os dois limites simultâneos de 360/600 px, recolhimento independente e simultâneo, reabertura, busca/filtro/scroll e seleção desktop, persistência após reload, overlay em 390 px, adaptação em 768 px, reset global e paginação real de **50 → 100 de 124** conversas. O guard bloqueou escritas de negócio; nenhuma fixture foi criada.

Rechecagem somente de catálogo no Supabase operacional confirmou RLS e ausência de privilégios `anon` nas quatro tabelas da Central. As 22 funções `customer_support_*` consultadas não podem ser executadas por `anon`, mantêm `search_path` vazio, e as definições atuais incluem as verificações de permissão correspondentes. A migration de comentários/histórico aparece aplicada como versão `20261023145037`. A consulta não acessou conteúdo de clientes, conversas ou pedidos.

## Paginação do histórico publicada e Production — 24/10/2026 BRT

O ajuste que impede usar o cursor da conversa anterior enquanto o novo histórico carrega foi publicado em `dpl_DKqHpJ4nKNGSYieTVBnQxYFG5jiW` (`READY`). Playwright oficial passou **1/1 em 55,1s** pela pilha raiz `npm run dev` (`5173`, API `3000`), com login e gate do operador. A Inbox carregou **50 → 100 de 172 conversas**, com HTTP 200 na segunda página; os painéis, filtros, persistência visual e breakpoints também passaram. As credenciais Meta de Production foram confirmadas e o app consta inscrito no WABA (`valid=true`, `subscribed=true`).

No mesmo deployment, o webhook respondeu **401** sem assinatura, **401** para HMAC inválida e **200 `EVENT_RECEIVED`** para HMAC válida com `entry: []`; nenhum evento foi processado. `POST /api/whatsapp-dispatch` respondeu **403** via Vercel CLI autenticado; o despacho segue bloqueado. Nenhuma fixture, migration, gravação no banco, mudança Meta ou mensagem foi feita nesta revalidação. O log de aceite registra o build remoto e os avisos de dependências.

Continuam pendentes uma entrega legítima originada pela Meta e a leitura de mídia real. A conferência de edição/exclusão de pastas entre duas identidades permanece adiada pelo proprietário. O domínio customizado é informado como verificado pela Vercel, mas o resolvedor do ambiente não permitiu validar seu HTTP; a UI foi conferida pelo alias público `morantehub.vercel.app`. Consulte [Central de Atendimento — aceite e validação](central-de-atendimento-aceite-2026-10-21.md) para o registro pós-publicação completo.
