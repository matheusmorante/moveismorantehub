# Central de Atendimento WhatsApp — MoranteHub ERP

> Estado atualizado em 22/10/2026: candidato combinado publicado em produção; ver [publicação e validações](central-de-atendimento-publicacao-combinada-2026-10-22.md). O build e `test:unit` executam `build:support`, que gera a fronteira CJS do processador compartilhado; o adaptador local usa o mesmo produtor. Ver [diagnóstico de runtime](central-de-atendimento-runtime-esm-2026-10-21.md).

> **Módulo:** Central de Atendimento (`/atendimento`)  
> **Integração:** WhatsApp Cloud API Oficial da Meta (Graph API)  
> **Status:** Inbox publicada em produção; webhook legítimo da Meta ainda não comprovado; envio bloqueado por política da empresa
> **Data:** 22/10/2026

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

Metadados e seis checks Vitest reais confirmaram acesso anônimo negado. Isso não comprova ainda o CRUD compartilhado autenticado nem os filtros em múltiplas páginas. Registro detalhado, reversão e limitações: [migração de 21/10/2026](central-de-atendimento-migracao-2026-10-21.md).

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
* Na ausência de token Meta no ambiente, o backend consulta somente a configuração WhatsApp existente em `settings/app`, após validar JWT, permissão e mensagem pela RLS. O canal da conversa deve corresponder ao número configurado; leitura privilegiada e token permanecem no servidor. Treze testes isolados conferem esse complemento. Metadata remota confirmou presença/vínculo do token, sem validar seu acesso externo nem baixar arquivos reais.
* O fallback HTTP de desenvolvimento agora reconhece as três rotas WhatsApp, preservando os bytes do webhook para HMAC. A API continua na porta 3000, atrás do frontend na porta 5173.

**Limite:** o deploy de produção está concluído, mas binários privados de clientes reais não foram usados como fixture e os sucessos de transporte/MIME com permissão são provas isoladas, sem comprovar RLS autenticada de uma fixture real. O webhook legítimo ainda não foi exercitado com uma assinatura da Meta; as verificações públicas cobrem somente recusas sem assinatura ou com assinatura forjada.

### Achado de segurança em configurações compartilhadas

Em 22/10/2026, uma consulta somente de metadados e presença confirmou que a política `Authenticated can read settings` permite `SELECT` em `public.settings` para qualquer sessão autenticada (`USING (true)`). A linha `id='app'` contém campos de credenciais não vazios de WhatsApp, Gemini e Bling, além de uma chave de mapas cuja classificação e restrições precisam ser verificadas. Nenhum valor foi selecionado ou registrado. A leitura do proxy de mídia sob JWT e RLS não impede a consulta direta à tabela por uma sessão autenticada. A evidência e o plano de correção entre módulos estão em [segurança das configurações](central-de-atendimento-seguranca-configuracao-2026-10-22.md).

O escopo atravessa consumidores fora da Central e exige um candidato próprio, inventário de consumidores, proteção server-side e autorização específica para migration remota. Nenhuma alteração de banco, rotação ou implantação foi feita para esse achado. Não há conclusão de acesso `anon` a partir desta verificação.

---

## 8. Suíte de Testes Automatizados

Em 21/10/2026, **191 testes Vitest passaram em 19 arquivos**, incluindo seis checks reais de leitura anônima negada nas quatro tabelas e duas RPCs de permissão e seis testes das rotas do layout. Esses seis checks remotos só fazem `SELECT ... LIMIT 0` e chamadas de permissão; não criam fixtures. A cobertura inclui mídia protegida, paginação/contexto, drafts/conflitos, resolvers reais dos comandos e formulários, seleção do pedido, altura da Central e adaptador HTTP/raw-body. [Conferência atual](central-de-atendimento-validacao-2026-10-21.md).

A prova Playwright dedicada **somente leitura passou (1/1, 24s)**: login autônomo com identidade canônica e gate 204, entrada em `/atendimento`, pasta vazia recusada pelo resolver, filtro de atendente aplicado/limpo, rolagem carregando a segunda página (99/99 conversas) e mídia sem sessão recusada com 401. A lista agora rola dentro do viewport. Credenciais vêm do launcher oficial Vercel Development, em memória, sem storage state, trace ou captura de senha. Gravações de negócio são bloqueadas no transporte; navegador visível preservado.

Build Vite final aprovado (1m59s). TypeScript dos harnesses sem diagnósticos; global retornou 424 diagnósticos, nenhum nos caminhos da Central; o erro anterior de assistência em `AppLayout.tsx:100` permanece fora das duas alterações de classes do layout. Lint focado sem erros e um aviso anterior de Fast Refresh; spec Playwright sem configuração de lint aplicável. Logs: `scratch/central-inbox-unit-2026-10-21.log`, `scratch/central-inbox-build-2026-10-21.log` e `scratch/central-inbox-tsc-2026-10-21.log`.

A [operação limitada autorizada](central-de-atendimento-fixtures-proposta-2026-10-21.md) teve **quatro testes remotos Vitest aprovados** com ownership, autoria, replay sem nova massa, paginação 50+1, eventos idempotentes, tags concorrentes, conflito de notas e metadata preservada. Playwright gravável passou em 36,3s: pasta criada/reaberta/editada/excluída, histórico 80+1, snippet sem nota, comentário, atribuição/status, tags/notas e timeline sem IDs duplicados. A limpeza, autorizada separadamente, passou em 2/2 testes: 51 conversas arquivadas e 190 mensagens preservadas. As configurações específicas exigem ambiente oficial, gate real, identidade e IDs próprios; a suíte geral conserva sua guarda. Persistem limites para outra identidade autorizada, ausência de permissão comercial, vínculos comerciais próprios e mídia própria. Todos seguem a [`SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md). O agente executa os logins, conforme `AGENTS.md`, seção 9.

## 8.1. Comandos internos e compatibilidade de implantação

A migration `20261021041610_customer_support_internal_commands.sql` foi aplicada. O frontend usa RPCs para atribuição, status, comentário, notas e tags; autor/horário e estado atual são derivados no servidor. As funções mantêm alteração/evento na mesma transação e não criam evento ao repetir atribuição/status já persistidos. Notas têm comparação do texto-base; tags não sobrescrevem notas nem snapshots de status. Rascunhos em edição são preservados.

**Transição ainda aberta:** o frontend publicado anterior usa comandos diretos. Seus privilégios autenticados foram conservados na expansão. A revogação final está preparada em `docs/integracoes/sql/customer-support-internal-commands-contract.sql`, fora das migrations automáticas, para executar somente após deploy e prova com fixtures autenticadas. Até lá, não declarar impossível forjar autoria pelo contrato legado. [Objetos, efeitos, retenção e próximos gates](central-de-atendimento-comandos-2026-10-21.md).

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

As escolhas ainda abertas sobre prévia de mensagem citada, cobertura integral de timeline/galeria e separação entre comentário e resumo interno estão comparadas em [decisões pendentes de histórico e comentários](central-de-atendimento-decisoes-historico-2026-10-23.md). Nenhuma foi implementada por inferência.

## Revalidação do segredo do webhook — 23/10/2026

O código das duas entradas (`api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts`) lê `WHATSAPP_APP_SECRET` e aceita `META_APP_SECRET` como fallback. A lista de configuração da Vercel para o projeto `morantehub` contém `WHATSAPP_APP_SECRET` nos ambientes Production, Development e Preview. Foram consultados apenas nome, ambiente e tipo da variável; o valor não foi aberto nem registrado.

Vitest continua cobrindo assinatura HMAC válida com segredo de teste, assinatura inválida e segredo ausente; a produção já respondeu `401` sem assinatura nas verificações públicas anteriores. A presença da variável elimina a hipótese de ausência de configuração, mas não comprova que o valor corresponde ao App Secret da Meta nem que um webhook legítimo será aceito. Nenhum POST válido foi enviado, e o envio de mensagens continua bloqueado.

Reexecução local pelo adaptador HTTP em 23/10: **6/6 Vitest passaram**. As rotas standalone e consolidada de despacho retornaram `403`; assinatura inválida retornou `401`, segredo ausente em produção simulada retornou `503`, e o caso positivo usou somente segredo/body sintéticos. Nenhuma chamada externa foi feita por essa suíte.

## Revalidação da Inbox — 23/10/2026

Nesta continuidade passaram **87/87 Vitest/RTL em cinco arquivos**: `customerSupport.test.ts`, `customerSupportInbox.test.tsx` e `customerSupportLinkForms.test.tsx` (64); `customerSupportLocalApi.test.ts` (6); `customerSupportPaging.test.tsx` (17). Cada execução também concluiu `build:support`. A paginação foi exercitada com mocks isolados.

A reexecução real da UI passou **1/1** por `npm run test:support:readonly` em `localhost:5173`: login com Development da Vercel, gate de operador, Inbox, tentativas de recuperação do diretório de pastas e atendentes, validação de pasta e consulta restrita por atendente. O guard de rede bloqueou gravações de negócio. O teste agora espera `DOMContentLoaded` na rota de login e usa os seletores existentes para aguardar a interface; a execução anterior excedia 15 s esperando o evento `load`, apesar do servidor responder em `5173`. Nenhuma fixture foi criada, mensagem enviada ou chamada à Meta feita nessa validação.
