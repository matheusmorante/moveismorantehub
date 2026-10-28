# Central de Atendimento WhatsApp — MoranteHub ERP

> Estado revisto em 28/10/2026 BRT: antes dos ajustes descritos no fim deste documento, Production estava no deployment `dpl_EytB8Eo2JocQjs4PHVgPtjFpbTx6` (`READY`) nos aliases `morantehub.com` e `morantehub.vercel.app`. Uma consulta agregada, somente leitura, encontrou mensagens inbound recentes, incluindo eventos `131051` e registros com mídia. Isso confirma eventos persistidos na Central, mas não comprova o download de cada binário privado da Meta. O envio comercial e em Production continua bloqueado; o Development permanece limitado ao sandbox Meta. O build e `test:unit` executam `build:support`, que gera a fronteira CJS do processador compartilhado; o adaptador local usa o mesmo produtor. Ver [diagnóstico de runtime](central-de-atendimento-runtime-esm-2026-10-21.md).

## Confirmação de Production e do WABA — 23/10/2026 BRT

O deployment `dpl_BCAGQ1EV6ES448Aprnfz2xGX1gbJ` ficou `READY` e recebeu os aliases `morantehub.com` e `morantehub.vercel.app`. Ele contém a rota `verify_waba_subscription`, protegida por `manageSettings`, que consulta `/{WABA-ID}/subscribed_apps` usando o token e o App Secret do ambiente server-side e retorna somente `valid` e `subscribed`.

O Playwright `npm run test:support:readonly` passou **1/1 em 25,0s**, usando a pilha de desenvolvimento na porta `5173` e API `3000`. O login autônomo e o gate do operador passaram; a Inbox carregou **50 conversas iniciais → 100 de 113**, com HTTP 200 na segunda página. O probe de Production confirmou `verify_app_credentials` e a inscrição do app no WABA (`valid=true`, `subscribed=true`). A consulta não registrou segredos, identificadores de outros apps nem payload Graph.

Nenhuma migration, fixture, gravação no banco, alteração de configuração Meta ou mensagem foi feita nesta prova. A entrega real originada pela Meta e a leitura autorizada de mídia continuam sem comprovação; o despacho permanece bloqueado.

> **Módulo:** Central de Atendimento (`/atendimento`)  
> **Integração:** WhatsApp Cloud API Oficial da Meta (Graph API)  
> **Status:** Inbox publicada em Production; eventos inbound recentes persistidos, incluindo 131051 e mensagens com mídia; leitura de áudio confirmada em Development; download de binário privado recente em Production não comprovado; envio comercial e em Production bloqueado
> **Data:** 28/10/2026 (BRT)

---

## 1. Visão Geral e Objetivo

A **Central de Atendimento** é o novo módulo principal do MoranteHub ERP projetado com a experiência visual e operacional familiar do WhatsApp Web para computadores, enriquecido com integração profunda e em tempo real aos cadastros de clientes e pedidos de venda do ERP.

### Política de envio
A página oficial de preços da [WhatsApp Business Platform](https://whatsappbusiness.com/products/platform-pricing/) informa que mensagens de serviço dentro da janela de atendimento de 24 horas não são cobradas. Isso diverge da franquia mensal de 1.000 mensagens descrita em versões antigas desta documentação; esse número não é uma fonte confirmada para o produto e foi removido da interface.

A empresa mantém bloqueado o envio comercial e em Production. Para validar a integração sem usar o número comercial, o Development admite apenas o fluxo do número sandbox da Meta:
1. O atendimento permite consulta, organização e recebimento nos ambientes autorizados.
2. O compositor só habilita quando a conversa foi recebida pelo Phone Number ID sandbox, o destinatário abriu a janela de 24 horas e o atendente tem permissão na Central.
3. O backend repete a validação de ambiente, remetente, janela, sessão e permissão antes de chamar a Graph API. O adaptador local da porta `3000` encaminha `/api/whatsapp-dispatch` para esse mesmo handler.
4. `WHATSAPP_TEST_PHONE_NUMBER`, `WHATSAPP_TEST_PHONE_NUMBER_ID` e `WHATSAPP_TEST_WABA_ID` ficam somente em Development; `WHATSAPP_ACCESS_TOKEN` permanece server-side.
5. Em 24/10/2026, a consulta RLS da conta de teste encontrou zero conversas para o Phone Number ID sandbox. Nenhuma mensagem foi enviada; uma conversa recebida pelo número de teste e um destinatário autorizado na Meta ainda são necessários para comprovar entrega.
6. A interface não exibe contagem ou limite numérico de mensagens.

---

## 2. Auditoria e Preservação de Integrações Existentes

Antes da implementação, foram auditadas as estruturas vigentes do MoranteHub:
* **Webhook Oficial:** `api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts` reutilizam `whatsappWebhookProcessor.ts` para recebimento, idempotência e rastreamento em `whatsapp_dispatches` e `warranty_terms`. O callback legado `confirm_delivery_{orderId}` ainda é recebido, mas a rechecagem remota de 24/10/2026 encontrou ausentes em `public.orders` as colunas que o handler tenta atualizar (`delivery_confirmed_at` e `delivery_confirmed_by`); portanto, não há confirmação persistida comprovada. O ajuste desse fluxo comercial requer escopo e migração próprios.
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
* `message_type` (TEXT): `'text'`, `'image'`, `'document'`, `'audio'`, `'video'`, `'interactive'`, `'sticker'`, `'unsupported'`, `'deleted'`.
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
* Abrir uma conversa não altera o contador de não lidas. O atendente alterna manualmente `unread_count` entre zero e um pelo ícone de olho/olho riscado no cabeçalho; esse estado é interno da Central e não envia confirmação de leitura ao WhatsApp.

---

## 7. Rastreamento e Mídias

* **Proxy de Mídias:** `/api/whatsapp-media?id={media_id}` e a operação consolidada usam `whatsappMediaProxy.ts`. Exigem Bearer validado por `auth.getUser`, permissão `customer_support_can_view()` e mensagem visível sob RLS com aquele `media_id`, antes de consultar a Meta. Respostas usam `Cache-Control: private, no-store`. Tokens não são colocados na URL. O proxy lê a resposta em blocos e limita o arquivo a 4 MiB; acima disso cancela o download e responde HTTP 413 com explicação, mantendo margem abaixo do limite de 4,5 MB documentado para respostas de Functions da Vercel.

* O frontend busca o binário autenticado e fornece URLs locais `blob:` para imagem, figurinha, áudio, vídeo, documento e galeria. Cancela consultas antigas e revoga URLs ao trocar contexto ou sair. Há progresso, erro e repetição. URLs arbitrárias persistidas não são abertas diretamente; a consulta agregada encontrou 54 registros com ID e nenhum dependente somente de URL.
* O proxy de mídia usa `WHATSAPP_ACCESS_TOKEN` exclusivamente do ambiente server-side e falha fechado se estiver ausente; não há fallback para `settings/app`. O handler verifica JWT, permissão, mensagem visível pela RLS e correspondência do canal antes de consultar a Meta. A presença da variável foi conferida sem ler seu valor; não comprova acesso válido à Meta nem download de binário real.
* O fallback HTTP de desenvolvimento agora reconhece as três rotas WhatsApp, preservando os bytes do webhook para HMAC. A API continua na porta 3000, atrás do frontend na porta 5173.

**Limite:** registros inbound recentes foram encontrados no banco operacional, mas binários privados de clientes não foram baixados para esta validação. Isso não substitui a prova de mídia em Production; os sucessos anteriores de transporte/MIME com permissão são provas isoladas. O webhook legítimo ainda não foi exercitado aqui com uma assinatura capturada da Meta; as verificações públicas cobrem recusas sem assinatura ou com assinatura forjada.

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

**Transição de compatibilidade concluída:** o deployment com as cinco RPCs precedeu a migration `20261021162004_customer_support_internal_commands_contract`, confirmada no histórico do Supabase operacional. A consulta de catálogo em 23/10 confirmou que `authenticated` não pode inserir/atualizar mensagens nem alterar campos de comando em conversas; a única atualização direta de conversa mantida é `unread_count`, para o controle manual de lido/não lido na Central. A policy `whatsapp_messages_insert` também rejeita `authenticated`, e `anon` não possui as permissões verificadas. Atribuição, status, comentário, notas e tags continuam pelas RPCs que derivam usuário/estado do servidor. [Objetos, efeitos, retenção e próximos gates](central-de-atendimento-comandos-2026-10-21.md).

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
  - Tela inicial com arte vetorial SVG, 3 cartões de recursos e aviso compatível com o ambiente: regras do sandbox em Development e bloqueio de envio comercial nos demais ambientes.
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

## Leitura de áudio real em Development — 24/10/2026 BRT

Com autorização do operador para selecionar qualquer conversa existente, o Playwright abriu uma conversa com áudio recebido pela UI. `/api/whatsapp-media` respondeu HTTP 200 e o player carregou o arquivo em URL `blob:` com metadados de aproximadamente 7 segundos. O áudio não foi reproduzido nem transcrito. A conversa estava não lida e o guard bloqueou a atualização automática do contador. Nenhuma gravação, migration, fixture, alteração da Meta ou mensagem foi feita.

A prova passou **1/1 em 46,4s** com ambiente Vercel Development, servidor ERP na `5173` e API na `3000`; a paginação carregou **50 → 100 de 181**. Isso comprova o caminho real do proxy e do player em Development, não a leitura em Production nem uma entrega de webhook originada pela Meta. O envio de mensagens permanece bloqueado.

No mesmo deployment, o webhook respondeu **401** sem assinatura, **401** para HMAC inválida e **200 `EVENT_RECEIVED`** para HMAC válida com `entry: []`; nenhum evento foi processado. `POST /api/whatsapp-dispatch` respondeu **403** via Vercel CLI autenticado; o despacho segue bloqueado. Nenhuma fixture, migration, gravação no banco, mudança Meta ou mensagem foi feita nesta revalidação. O log de aceite registra o build remoto e os avisos de dependências.

Continuam pendentes uma entrega legítima originada pela Meta e a leitura de mídia real. A conferência de edição/exclusão de pastas entre duas identidades permanece adiada pelo proprietário. O domínio customizado é informado como verificado pela Vercel, mas o resolvedor do ambiente não permitiu validar seu HTTP; a UI foi conferida pelo alias público `morantehub.vercel.app`. Consulte [Central de Atendimento — aceite e validação](central-de-atendimento-aceite-2026-10-21.md) para o registro pós-publicação completo.

## Mensagens enviadas pelo WhatsApp Business no celular — Production, 24/10/2026

Em números conectados à Cloud API pelo modo Coexistence, a Meta entrega mensagens enviadas pelo WhatsApp Business no campo separado `smb_message_echoes`. O webhook reconhece `value.message_echoes`, identifica o destinatário em `to` e persiste a mensagem como saída na conversa compartilhada. O `wamid` torna o recebimento idempotente; a gravação não aumenta não lidas nem altera a janela de atendimento, atribuição, status, arquivamento ou notas. A origem aparece como “WhatsApp Business (celular)”. Revogações atualizam a linha da mensagem original, removem texto e referências de mídia e exibem o marcador `Esta mensagem foi apagada`, sem criar um balão separado para o evento nem incrementar não lidas. Referência: [documentação Meta do evento `smb_message_echoes`](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes).

A migration local `supabase/migrations/20261024170000_customer_support_whatsapp_app_echoes.sql` foi aplicada ao Supabase operacional `hkoxhourxwlddgsfdgws`, registrada remotamente na versão `20261024195230`. Ela adiciona uma RPC `SECURITY INVOKER`, executável somente por `service_role`, que cria a conversa se o eco for a primeira atividade e atualiza a prévia sem substituir vínculos já existentes. O rollback remove somente a RPC e preserva os registros.

A migration `supabase/migrations/20261027184402_customer_support_message_revocation.sql` foi aplicada ao mesmo projeto na versão remota `20261027184402`. A RPC `customer_support_revoke_message` só pode ser executada por `service_role`, valida conversa, direção e ID original, limpa o texto e as mídias da mensagem revogada e mantém um marcador idempotente no histórico.

O novo endpoint protegido `ensure_smb_message_echoes_subscription` exige `manageSettings`, lê a inscrição atual do app e só a atualiza se o campo estiver ausente, preservando callback, `messages`, os demais campos e `include_values`. O App Secret e o token de verificação ficam no runtime. A consulta de Production encontrou `smb_message_echoes` já inscrito; portanto, retornou `changed=false` e não alterou a configuração Meta. A verificação separada confirmou `valid=true`, `subscribed=true` para o WABA.

O candidato foi publicado como `dpl_B1qZgVLZRjEjMvzVdDooHhTEQpmM` (`READY`), nos aliases `morantehub.com` e `morantehub.vercel.app`. No banco, `whatsapp_messages` está com RLS habilitada, política SELECT para authenticated e na publicação Realtime. A leitura de confirmação encontrou zero mensagens de origem `whatsapp_business_app`, então a entrega de uma mensagem real pelo celular ainda não foi observada. Nenhum evento sintético ou envio pela API foi feito.

A seleção de cinco arquivos focados passou em **50 testes** e `npm run build -- --minify false` passou por completo. O build Production da Vercel terminou com sucesso. A suíte do banco não foi executada com fixtures: a autorização cobriu somente migration, publicação e inspeção/ajuste da assinatura. O fluxo ficará comprovado quando um eco natural do WhatsApp Business chegar e aparecer na conversa; o envio comercial e em Production segue bloqueado.

### Autorização permanente para migrations — 24/10/2026

O operador autorizou o agente a aplicar migrations de schema necessárias a tarefas explicitamente solicitadas no Supabase operacional, sem confirmação repetida por migration. Cada execução continua exigindo revisão do SQL, confirmação do project ref, leitura do histórico e validação do resultado. Esta autorização não cobre fixtures, dados sintéticos, limpeza de dados ou envio de mensagens; esses efeitos seguem os gates de [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md).

## Mensagens não suportadas pela Cloud API — 28/10/2026

Quando o webhook informa `type=unsupported` ou `type=unknown` com o erro 131051, a Central salva o ID da mensagem, o contato e o horário recebidos no evento, além do código, da descrição e do objeto de erro original da Meta. O histórico exibe “Mensagem não suportada pela API do WhatsApp”; código, descrição e ID ficam em “Detalhes técnicos”. Como a API não entrega o conteúdo original nesses eventos, a Central não tenta baixar mídia, reconstruir cartões ou botões nem reenviar a mensagem. Referência: [exemplo oficial da Meta para mensagens desconhecidas](https://www.postman.com/meta/whatsapp-business-platform/request/yuuxr2c/received-unknown-messages).

A migration local `supabase/migrations/20261028135544_customer_support_unsupported_messages.sql` foi aplicada ao projeto operacional `hkoxhourxwlddgsfdgws` e consta no histórico remoto na versão `20261028135544`. Ela preserva a validação, a idempotência e a permissão exclusiva de execução por `service_role`, passando a gravar os campos de erro já existentes em `whatsapp_messages`. O webhook e a interface foram publicados posteriormente no deployment Production `dpl_EytB8Eo2JocQjs4PHVgPtjFpbTx6` (`READY` nos dois aliases); o evento real `131051` consta na consulta agregada recente.

Na coexistência com o WhatsApp Business app, o webhook também envia ecos de saída (`smb_message_echoes`). A RPC desses ecos registrava a mensagem como enviada, mas descartava `error_code`, `failure_reason` e os detalhes do erro em `raw_payload`; por isso, um eco `unsupported` podia aparecer apenas como o texto de erro sem os detalhes técnicos. A migration `supabase/migrations/20261028171004_customer_support_echo_unsupported_details.sql` atualiza essa RPC para persistir os mesmos metadados, mantendo o `wamid` idempotente, a origem `whatsapp_business_app` e a execução exclusiva por `service_role`. O eco continua com status `sent`: ele confirma uma mensagem enviada pelo app, enquanto `unsupported` descreve apenas o que a Cloud API consegue representar. Essa situação não deve disparar reenvio automático. Para registros antigos que já contêm a frase e o código explícito, a interface reconhece `131051` ao mapear o histórico, sem editar os dados gravados e sem inventar o detalhe original ausente.

### Cobertura dos formatos recebidos — 28/10/2026

O parser e os balões da Central também reconhecem as respostas `interactive.button_reply`, `interactive.list_reply` e `interactive.nfm_reply`. Respostas de botões/listas mostram título, descrição e identificador; respostas de WhatsApp Flows mostram os campos devolvidos em `response_json` e o nome do fluxo, removendo `flow_token` da exibição e dos metadados persistidos.

Cartões de contato exibem nome, telefones e tipos, e-mail, endereços, URLs, organização e aniversário. Localizações exibem nome, coordenadas, endereço e URL; o balão oferece “Abrir localização” somente quando o endereço é HTTP(S) válido. Pedidos do catálogo mostram itens, quantidades, preços, mensagem do cliente e ID do catálogo. Mensagens com produto consultado ou origem de anúncio mostram esses metadados junto ao texto.

Reações ficam ligadas ao `wamid` da mensagem reagida, são apresentadas como emojis na mensagem original e desaparecem quando chega uma remoção. O contexto `forwarded`/`frequently_forwarded` aparece no balão para qualquer tipo de mensagem. Dados de identidade e origem de anúncio recebidos junto a mídia são preservados e exibidos como metadados; o hash de identidade não é persistido nem mostrado, e URLs de mídia de anúncio não são carregadas automaticamente. Figurinhas recebidas em WebP podem ser encaminhadas como figurinha; o envio valida o contêiner e as dimensões de 512 × 512 pixels, limita estáticas a 100 KB e animadas a 500 KB, e não adiciona legenda. O MIME determina o ícone de documento (PDF ou arquivo genérico). Eventos `unsupported` e `unknown` com erro 131051 continuam sendo exibidos como não suportados com detalhes técnicos; nenhum conteúdo ausente é reconstruído.

Validação anterior do candidato no workspace: `customerSupport.test.ts`, `customerSupportInbound.test.ts`, `customerSupportMedia.test.tsx` e `customerSupportForwarding.test.ts` passaram em **98 testes**; a cobertura inclui extratores dos formatos, persistência inbound do erro 131051, proteção do token de Flow, localização, encaminhamento, metadados, reações, MIME de documentos, limites WebP e avisos de mensagem não suportada. A regressão dos ecos do WhatsApp Business e a leitura de registros antigos foram cobertas por `customerSupportInbound.test.ts` (22 testes focados), e a migration específica atualiza apenas a RPC de eco; nenhuma mensagem foi enviada à Meta durante a validação.

### Encaminhamento de templates e limite de mídia — 28/10/2026

Templates agora podem ser encaminhados pela Central. O encaminhamento compõe cabeçalho textual, corpo, rodapé e ações disponíveis; quando o cabeçalho tem imagem, vídeo ou documento acessível, inclui também o arquivo. Ações seguem como texto — rótulos e destinos HTTP(S)/telefone válidos — porque o envio da Central não reproduz botões interativos de um template. Sem mídia disponível, o conteúdo textual ainda pode ser encaminhado.

O proxy da Meta passou a limitar a leitura a 4 MiB por arquivo, verificando `Content-Length` quando presente e interrompendo o stream se o corpo exceder o limite. Assim a Central apresenta um erro claro em vez de alocar um corpo sem limite; o teto deixa margem para o limite de 4,5 MB das [respostas de Vercel Functions](https://vercel.com/docs/errors/function_response_payload_too_large). O build local do ERP passou. A consulta agregada de produção encontrou eventos inbound recentes de mídia e `131051`, mas nenhum binário de cliente foi baixado ou usado como fixture; esse caminho real de mídia continua sem validação nesta revisão.

## Formatação de texto na Central — 28/10/2026

O compositor oferece ações para negrito (`*texto*`), itálico (`_texto_`), tachado (`~texto~`), código inline (`` `texto` ``) e monoespaçado (três crases). Os estilos em negrito, itálico e tachado podem ser combinados com marcadores diferentes, como `*_texto_*`; o histórico renderiza esses estilos aninhados. Ações adicionais formatam linhas como lista com marcadores (`* texto`), lista numerada (`1. texto`) e citação (`> texto`).

O envio preserva os marcadores digitados. `**texto**` e `***texto***` não são convertidos para `*texto*`; o guia oficial define um asterisco em cada lado para negrito, e não documenta asteriscos repetidos como estilo separado. A referência oficial também apresenta listas, citação, código inline e monoespaçado: [guia de formatação do WhatsApp](https://faq.whatsapp.com/539178204879377/?cms_platform=web&locale=pt_BR).

## Identidade do WhatsApp e Pedidos por Snapshot de Telefone — 28/10/2026

Por especificação de produto:
1. **Preservação do nome do WhatsApp:** Na Central de Atendimento (`ConversationItem`, `ChatArea` e cabeçalho do `CustomerInfoPanel`), o nome exibido para o contato é rigorosamente o nome cadastrado no perfil do WhatsApp pelo próprio usuário (`conversation.contactName`), com fallback para o telefone formatado. O nome **nunca** é sobrescrito pelo nome do cliente cadastrado no ERP (`customer.fullName`) nem pelo nome contido no snapshot de pedidos. As iniciais do avatar derivam do nome de perfil do WhatsApp.
2. **Histórico e Pedidos por Telefone:** Se o número da conversa estiver associado a algum pedido pelo snapshot (`order_data -> customerData -> phone` ou `additionalContacts`), esses pedidos aparecem na listagem de pedidos do perfil do contato na Central de Atendimento, mesmo se a conversa não estiver formalmente vinculada a um registro na tabela `people` (`customer_id` nulo ou `isLinked = false`).
3. **RPCs e Migrations:**
   * `customer_support_list_customer_records_page`: aceita tanto UUID de cliente quanto telefone de contato com variações de DDI/DDD e nono dígito, buscando em `order_data #>> '{customerData,phone}'` e `additionalContacts`, e retorna `customer_name` do snapshot.
   * `customer_support_count_customer_orders`: conta pedidos por telefone e cliente, alimentando os badges da Inbox e o filtro de conversas com pedidos (`with_orders`).
   * Migration aplicada: `supabase/migrations/20261028154127_customer_support_orders_snapshot_phone_lookup.sql` e `20261028160000_customer_support_count_orders_additional_contacts.sql` no projeto Supabase operacional `hkoxhourxwlddgsfdgws`.
