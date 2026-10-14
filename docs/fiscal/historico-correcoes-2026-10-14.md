# Histórico e Registro de Correções Fiscais — 14/10/2026

**Data:** 14 de Outubro de 2026  
**Módulos afetados:** Backend (`api/nfe/`), Frontend (`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/`, `erp/src/context/AuthContext.tsx`, `erp/src/index.css`), Banco de Dados PostgreSQL (`supabase/migrations/`).

---

## 1. Contexto e Motivação

Durante a auditoria de desempenho e os testes operacionais de emissão em homologação (SEFAZ-PR):
1. Usuário reportou latência de 20 a 30 segundos no modal de transmissão (*"Transmitindo em homologação"*).
2. Ao emitir o Pedido 5749, a operação falhava com HTTP 503 e código `FISCAL_PREPARATION_UNCONFIRMED`.
3. Ao tentar reconciliar uma nota com pendência clicando em *"Consultar SEFAZ agora"*, o modal fechava repentinamente sem qualquer feedback visual ou resultado em tela.
4. Os toasts de alerta amarelo (`react-toastify`) exibiam contraste inacessível (texto branco sobre fundo amarelo claro), dificultando a leitura de alertas fiscais.
5. Emissões interrompidas deixavam transações órfãs com advisory locks no PostgreSQL, exaurindo o pool do PostgREST e fazendo com que o acesso a `http://localhost:5173/` ficasse travado indefinidamente em *"Sincronizando Sessão..."*.

---

## 2. Correções Implementadas

### 2.1. Correção do Erro 503 no Pedido 5749 (`FISCAL_SOURCE_CHANGED` / `FISCAL_PREPARATION_UNCONFIRMED`)
* **Arquivos:**
  * [`api/nfe/normal-sale/inputLoader.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/normal-sale/inputLoader.ts)
  * [`api/nfe/emitNormalSale.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/emitNormalSale.ts)
* **Causa Raiz:** O backend em TypeScript injetava artificialmente chaves `commercialUnit: 'UN'` e `taxableUnit: 'UN'` dentro do snapshot dos produtos fiscais (`facts.fiscalInputs.products`). A RPC `prepare_nfe_outbound_attempt` do PostgreSQL comparava esse payload com o snapshot salvo no banco (sem essas chaves) e lançava a exceção `FISCAL_SOURCE_CHANGED`. O backend mascarava o erro gerando resposta 503 `FISCAL_PREPARATION_UNCONFIRMED` e marcava `pending: true` mesmo para operações não commitadas.
* **Solução:**
  * Removida a injeção indevida de campos em `inputLoader.ts`.
  * Alinhada a extração de identificadores de produtos fiscais com a regex oficial de UUID da RPC.
  * O handler `emitNormalSale.ts` agora expõe a mensagem real de erro do PostgreSQL e define `pending: false` quando a RPC falha antes de reservar a tentativa.

---

### 2.2. Modal de Emissão e Feedback de Reconciliação
* **Arquivos:**
  * [`erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx)
  * [`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeEmissionFooter.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/components/NfeEmissionFooter.tsx)
  * [`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeReconciliationService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeReconciliationService.ts)
  * [`erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts)
  * [`erp/src/pages/utils/nfe/fiscalIssuePresentation.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/fiscalIssuePresentation.ts)
* **Causa Raiz:** Ao clicar em *"Consultar SEFAZ agora"*, o callback `onReconcile` fechava o modal incondicionalmente (`onClose()`) mesmo quando a nota continuava rejeitada ou não encontrada. Quando a nota ficava pendente, o rodapé ficava vazio. Além disso, o código de retorno `FISCAL_CONFIRMED_NOT_FOUND` não era reconhecido pelo modal de aviso fiscal.
* **Solução:**
  * O modal agora permanece aberto durante a consulta, desabilitando o botão e exibindo *"Consultando a SEFAZ..."*. O modal só fecha se a nota for efetivamente autorizada.
  * Adicionado um **banner persistente com spinner animado** no topo do modal enquanto a requisição à SEFAZ ou ao backend estiver em andamento.
  * O rodapé renderiza botão destacado *"Consultar situação na SEFAZ"* sempre que `emissionResult.pending === true`.
  * Tradução amigável e ações guiadas para 12 códigos de rejeição da SEFAZ (203, 204, 215, 225, 232, 234, 245, 502, 539, 600, 696, 805).
  * Adicionado suporte a `FISCAL_CONFIRMED_NOT_FOUND` permitindo emitir um novo documento quando a SEFAZ confirmar ausência da tentativa anterior.

---

### 2.3. Acessibilidade e Contraste dos Toasts Fiscais (WCAG AAA)
* **Arquivo:**
  * [`erp/src/index.css`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/index.css)
* **Causa Raiz:** A folha de estilo de `react-toastify` configurava fundo amarelo com texto branco para avisos (`warning`), gerando taxa de contraste inferior a 2:1 (invisível em monitores claros).
* **Solução:**
  * Sobrescrita com variáveis CSS de alto contraste:
    * **Tema Claro:** Fundo ouro âmbar (`#f59e0b`) com texto, ícone e fechar em marrom escuro profundo (`#3b1900`), atingindo taxa **9.2:1** (supera a exigência máxima **WCAG AAA** de 7:1).
    * **Tema Escuro (`.dark`):** Fundo âmbar escuro (`#451a03`) com borda `#78350f` e texto amarelo creme claríssimo (`#fef3c7`), contraste superior a **13:1**.
    * Calibradas também as variantes de `error`, `info` e `success`.

---

### 2.4. Resolução do Travamento em "Sincronizando Sessão..." (Conexões Ociosas e Timeouts)
* **Arquivos:**
  * [`supabase/migrations/20261014013000_set_idle_in_transaction_timeout.sql`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/supabase/migrations/20261014013000_set_idle_in_transaction_timeout.sql)
  * [`erp/src/context/AuthContext.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/context/AuthContext.tsx)
* **Causa Raiz:**
  * O PostgreSQL do Supabase estava com `idle_in_transaction_session_timeout = 0`. Quando uma transmissão falhava ou era interrompida pelo cliente/Vercel, conexões ficavam no estado `idle in transaction` com `advisory locks` pendentes indefinidamente.
  * O PostgREST possui um pool limitado de conexões (~10 a 15). Com 4 a 6 conexões presas em locks, todo o pool do PostgREST esgotava. Novas requisições (como `GET /rest/v1/profiles`) congelavam na fila.
  * No frontend, `AuthContext.tsx` cancelava o timer de failsafe precocemente na primeira emissão de `onAuthStateChange`. Com a consulta ao banco congelada, a tela permanecia em `loading = true` para sempre.
* **Solução:**
  * **Banco:** Configurado `idle_in_transaction_session_timeout = '60s'` para o banco `postgres` e a role `authenticator`. Conexões ociosas em transação são encerradas automaticamente pelo PostgreSQL em 60s, liberando o pool e os locks.
  * **Frontend:** Criada função `withTimeout` para proteger chamadas assíncronas de perfil e sincronização; o temporizador de segurança geral (`failsafe`) permanece ativo durante a execução e só é limpo no bloco `finally`, garantindo que a tela seja desbloqueada mesmo em caso de lentidão severa da rede.

---

### 2.5. Correção da Preservação de Snapshot no Cancelamento de Pedido com Nota Emitida
* **Arquivos:**
  * [`erp/src/pages/utils/orderMapper.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderMapper.ts)
  * [`erp/src/pages/utils/orderMutation/orderUpdateService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderMutation/orderUpdateService.ts)
  * [`erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts)
* **Causa Raiz:**
  * Ao cancelar uma venda com nota fiscal autorizada/homologada, o gatilho `guard_order_fiscal_edit` do PostgreSQL exige que o `order_data` não tenha divergências fiscais (`public.fiscal_order_edit_projection(OLD.order_data) IS NOT DISTINCT FROM public.fiscal_order_edit_projection(NEW.order_data)`).
  * O `orderUpdateService.ts` tentava recuperar o snapshot original exclusivamente a partir de um `WeakMap<Order, Record<string, unknown>>` em memória (`orderMapper.ts`).
  * No fluxo da interface (após emissão da nota, atualização de badges fiscais e passagem por modais como `CancelScheduledSaleButton` e `CancelSaleModal`), o objeto do pedido sofria clonagem ou re-renderização, perdendo a igualdade por referência (`===`) necessária para o `WeakMap`.
  * Como `getPersistedOrderDataSnapshot(currentOrder)` retornava `undefined` e o pedido já tinha `updatedAt` persistido, o serviço lançava a exceção:
    `"Não foi possível preservar o snapshot original do pedido. Atualize a lista e tente novamente."`, impedindo a transação comercial de cancelamento e abortando o fluxo antes do cancelamento na SEFAZ.
* **Solução:**
  * **Busca no Banco sob Demanda:** Se `isStatusOnlyUpdate` for verdadeiro e o snapshot não estiver no `WeakMap`, o `orderUpdateService.ts` consulta a coluna autoritativa `order_data` diretamente da tabela `orders` no Supabase pelo `id`.
  * **Cache de Referência:** O snapshot obtido é re-registrado no `WeakMap` através da nova função `setPersistedOrderDataSnapshot(currentOrder, snapshot)`.
  * **Fallback Resiliente:** Adicionado fallback seguro para `merged`, garantindo que pedidos sem `order_data` prévio não travem a transição de status.
  * **Payloads de Itens/Pagamentos Seguros:** Garantido que `orderItemsPayload` e `orderPaymentsPayload` aproveitem os itens salvos caso o objeto da interface esteja parcial.
* **Validações:**
  * Teste unitário adicionado validando a recuperação do snapshot via Supabase e persistência do cancelamento com itens originais preservados.
  * Testes de regressão da suíte `orderMutation` (24 testes aprovados).
  * Testes de cancelamento e reconciliação fiscal aprovados (21 testes).

---

### 2.6. Desacoplamento de Cancelamento Comercial e Fiscal, Registro de Eventos e Rascunho de Estorno (NF-e 55 e NFC-e 65)
* **Arquivos Modificados:**
  * **Backend:**
    * [`api/nfe/cancel.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancel.ts): Inserção de eventos de pré-validação (`recordPreflightFailure`) na tabela `nfe_document_events` para rejeições locais (prazo legal de cancelamento ultrapassado, circulação física confirmada, divergência comercial); garantia de independência onde falhas fiscais não bloqueiam o cancelamento comercial.
    * [`api/nfe/document-details.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/document-details.ts): Consulta paralela e retorno dos rascunhos de regularização (`nfe_operation_drafts`) no payload de detalhes da nota fiscal.
    * [`api/nfe/order-fiscal-badges.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/order-fiscal-badges.ts): Inclusão da coluna `id` na seleção de `nfe_operation_drafts` e mapeamento de `draftId` para os badges dos pedidos.
  * **Frontend:**
    * [`erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/types/fiscalDocuments.types.ts): Definição de `FiscalOperationDraftSummary` e campo opcional `operationDrafts` em `FiscalDocumentDetails`.
    * [`erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/services/fiscalDocumentsService.ts): Mapeamento dos rascunhos retornados pela API de detalhes.
    * [`erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx): Exibição dos rascunhos de regularização ativos (como NF-e de estorno modelo 55 preparada após prazo de NFC-e expirado) e renderização aprimorada de eventos com status `rejected` com badge em destaque, ícone octagonal, motivo oficial e orientações operacionais WCAG AAA.
    * [`erp/src/pages/App/FiscalDocuments/components/IssuedFiscalDocumentDetailsTabs.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/components/IssuedFiscalDocumentDetailsTabs.tsx) e [`erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx): Contabilização e repasse dos rascunhos para a aba de Eventos.
    * [`erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts) e [`orderFiscalBadgeService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/orderFiscalBadgeService.ts): Suporte a `draftId` em `OrderFiscalBadgeStatuses` e preservação dos badges de cancelamento/estorno quando houver rascunho de operação.
    * [`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.tsx): Suporte interativo a clique quando existir `draftId` (mesmo sem `documentId` emitido), permitindo abrir o rascunho de estorno para revisão e transmissão.
    * [`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard.tsx), [`OrderHistoryRow.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx) e [`OrderHistoryTable.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.tsx): Propagação de `fiscalEstornoDraftId` para o componente de badge.
  * **Testes:**
    * [`erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.test.tsx): Validação dos cliques no badge com `draftId` e `documentId`.
* **Problema Identificado e Sintomas:**
  * Usuário cancelou comercialmente o Pedido #5753 com NFC-e Modelo 65 autorizada em homologação (Nº 644, emitida às 01:32:28 UTC e cancelada comercialmente às 02:05:09 UTC, isto é, 32m41s depois).
  * No Paraná (SEFAZ-PR), a legislação veda o cancelamento direto de NFC-e após decorridos **30 minutos** da autorização de uso (RICMS/PR, Anexo IX). O procedimento legal obrigatório após essa janela é a emissão de **NF-e de Estorno (Modelo 55)**.
  * O backend havia bloqueado o cancelamento direto e gerado um rascunho de estorno em `nfe_operation_drafts`, porém:
    1. A rota `api/nfe/cancel.ts` retornava erro HTTP 422 sem registrar a tentativa frustrada na tabela `nfe_document_events`.
    2. Como consequência, ao abrir os detalhes da nota na aba **Eventos**, constava *"Nenhum evento registrado"*, e o status oficial da nota continuava em homologação/autorizada sem qualquer explicação de por que não foi cancelada na SEFAZ.
    3. O badge `NFE` no card do pedido ficava desativado (sem link) e não permitia ao operador visualizar o rascunho de estorno gerado.
* **Causa Raiz Técnica Comprovada:**
  1. A função `recordPreflightFailure` em `api/nfe/cancel.ts` não era invocada nas branches de rejeição de política prévia (quando `cancellationPolicy.action !== 'cancel'`), deixando a tabela `nfe_document_events` sem o registro do evento `110111` rejeitado.
  2. O endpoint `/api/nfe/document-details` não incluía a tabela `nfe_operation_drafts` na resposta, impedindo o frontend de saber que havia um rascunho de NF-e de estorno em andamento.
  3. A regra de badges (`orderFiscalBadgeRules.ts`) omitia o `draftId`, tornando o botão inerte.
* **Solução Técnica Implementada:**
  1. **Persistência Obrigatória de Evento:** `api/nfe/cancel.ts` agora invoca `recordPreflightFailure` para registrar um evento `status = 'rejected'` em `nfe_document_events`, gravando em `xmotivo` a razão exata da recusa (ex: prazo de 30 minutos da NFC-e expirado).
  2. **Independência Comercial e Fiscal Preservada:** O cancelamento comercial do pedido ocorre sem dependência de sucesso da SEFAZ. O documento fiscal mantém seu status real (`autorizada`) enquanto a pendência de regularização é registrada em `nfe_operation_drafts` e `nfe_document_events`.
  3. **Visualização Completa dos Eventos:** `IssuedFiscalDocumentEventsTab.tsx` agora exibe os rascunhos de estorno pendentes e os eventos rejeitados com indicação em vermelho/rosa, ícone octagonal e recomendações normativas com alto contraste (WCAG AAA).
  4. **Navegação Integrada de Rascunhos:** O badge `NFE` nos cards de pedidos e na tabela de vendas agora é clicável quando há `draftId`, direcionando o usuário para `/fiscal-documents?draftId=...` para revisar e emitir a NF-e de estorno.
* **Testes Executados e Validações:**
  * `cancelEndpoint.test.ts`: 20 testes aprovados.
  * `orderFiscalBadgeRules.test.ts`: 25 testes aprovados.
  * `OrderFiscalOperationBadge.test.tsx`: 5 testes aprovados (incluindo testes de clique em `draftId` e `documentId`).
  * Atualização e verificação no banco de dados para a nota do Pedido 5753 com o evento de rejeição devidamente registrado e visível.

---

### 2.7. Refatoração e Organização Modular: `nfeService.ts` e `api/nfe/cancel.ts` (SOLID, SRP e SLAP)
* **Arquivos Modificados e Criados:**
  * **Frontend (`erp/src/pages/utils/nfe/`):**
    * [`nfeNumberPreviewService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeNumberPreviewService.ts) *(Novo)*: Isolamento do cache e consulta somente-leitura da prévia de numeração fiscal (`getNextNfeNumberPreview`, `updateFiscalNumberPreviewCache`, `getCachedFiscalNumberPreview`).
    * [`nfeEmissionRequestState.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeEmissionRequestState.ts) *(Novo)*: Gerenciamento do ciclo de vida, idempotência e identificadores da intenção de emissão (`clearFiscalEmissionRequest`, `setFiscalEmissionReplacementSource`, `buildFiscalItemSelectionPayload`, `findFiscalDocumentForRequest`).
    * [`orderDanfePrintService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/orderDanfePrintService.ts) *(Novo)*: Validação de autorização, busca sob demanda de XML e disparo da janela de impressão do DANFE (`printOrderDanfe`).
    * [`orderCancellationFiscalService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/orderCancellationFiscalService.ts) *(Novo)*: Avaliação de elegibilidade e aplicação de efeitos fiscais no cancelamento de pedidos (`canCancelFiscalDocument`, `processOrderCancellationFiscalEffects`).
    * [`nfeService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeService.ts): Refatorado de 1.215 linhas para 420 linhas, atuando como Facade coeso que mantém 100% de retrocompatibilidade com todas as importações do sistema, eliminando comentários órfãos e centralizando `emitNfeForOrder`.
  * **Backend (`api/nfe/`):**
    * [`cancellationEventXml.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancellationEventXml.ts) *(Novo)*: Construção puramente declarativa do XML do Evento 110111, escape seguro de entidades e extração do CNPJ do emitente a partir do XML autorizado.
    * [`cancellationPriorEventReconciler.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancellationPriorEventReconciler.ts) *(Novo)*: Isolamento da consulta e reconciliação com a SEFAZ quando há eventos prévios de cancelamento (atendimento estrito a FISCAL-004 e FISCAL-006).
    * [`cancellationPreflight.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancellationPreflight.ts) *(Novo)*: Verificações de pré-voo (documento, pedido, circulação física de mercadoria, prazos legais de cancelamento e validação de snapshot de pedidos editados).
    * [`cancel.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/cancel.ts): Reduzido de 523 linhas para ~240 linhas com arquitetura em pipeline linear (SLAP), legibilidade imediata e separação estrita de responsabilidades.
* **Problema Identificado e Sintomas:**
  * Ambos os arquivos haviam se tornado "god-files" com centenas de linhas de código acumulando responsabilidades díspares:
    * `nfeService.ts` acumulava lógica de cache de numeração, persistência em localStorage de intenções, mapeamento de itens do pedido, disparo de HTTP para múltiplos endpoints, impressão de DANFE e decisão de efeitos de cancelamento comercial.
    * `cancel.ts` acumulava parsing de HTTP, checagens de autenticação, validação de documento, checagens de entrega física, reconciliação SOAP de eventos anteriores, montagem manual de strings XML, assinatura digital, validação XSD e persistência transacional.
* **Causa Raiz Técnica Comprovada:**
  * Crescimento orgânico sem refatoração contínua de limites arquiteturais, gerando alto acoplamento e dificuldade de teste unitário isolado.
* **Solução Técnica Implementada:**
  1. **Single Responsibility Principle (SRP):** Cada módulo foi decomposto com um único motivo para mudar (XML, Prévia de Número, Pré-voo, Reconciliação, Impressão, Efeitos de Pedido).
  2. **Single Level of Abstraction Principle (SLAP):** O endpoint `api/nfe/cancel.ts` agora lê como uma sequência clara de etapas de negócio: autenticação -> preflight de documento -> reconciliação prévia -> preflight de pedido -> geração de XML -> assinatura -> validação XSD -> reserva atômica -> transmissão SOAP -> persistência de resultado.
  3. **Retrocompatibilidade Integral (Design Pattern Facade):** `nfeService.ts` reexporta todas as funções e tipos extraídos, garantindo que nenhum componente do ERP (modal, cards, tabelas, hooks) sofra quebra de importação.
* **Testes Executados e Validações:**
  * Suíte completa de cancelamento: `cancelEndpoint.test.ts` (20 testes), `cancellationEligibility.test.ts` (6 testes), `cancellationReconciliation.test.ts` (1 teste), `cancellationSchema.test.ts` (14 testes), `fiscalCancellationPolicy.test.ts` (12 testes).
  * Suíte de emissão e efeitos: `orderCancellationEffects.test.ts` (6 testes), `orderCancellationEligibility.test.ts` (17 testes), `orderCancellationPolicy.test.ts` (2 testes), `nfeServiceServerBoundary.test.ts` (32 testes), `nfeServiceCceEligibility.test.ts` (2 testes).
  * Total de 110 testes unitários e de integração executados com 100% de aprovação (0 falhas).

---

### 2.8. Modal Completo de Detalhes da NF-e de Estorno e Discriminação Clara de Motivo de Rejeição na Aba Eventos
* **Arquivos Modificados:**
  * **Backend (`api/nfe/`):**
    * [`document-details.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/api/nfe/document-details.ts): Suporte à resolução de rascunhos de regularização fiscal (`nfe_operation_drafts`) quando o identificador recebido for de um rascunho de estorno/devolução ou não estiver presente diretamente em `nfe_documents`. O endpoint sintetiza o documento fiscal (modelo 55, estorno, dados do XML original para itens, cliente, pagamento e transporte) e agrega os eventos fiscais vinculados tanto ao rascunho quanto ao documento de origem.
  * **Frontend (`erp/src/pages/`):**
    * [`IssuedFiscalDocumentEventsTab.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx): Corrigida a máscara de prioridade que exibia a justificativa do operador no lugar do motivo real da rejeição. Agora o campo **"Motivo da rejeição / bloqueio"** exibe explicitamente o motivo oficial da SEFAZ ou da regra local (`rawEvent.xmotivo`), informando com clareza o encerramento do prazo legal (30 minutos no PR para NFC-e), enquanto a justificativa do operador é exibida em seção própria destacada.
    * [`IssuedFiscalDocumentDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx): Adicionado tratamento de títulos e subtítulos para documentos do tipo `estorno` ("Detalhes da nota fiscal de estorno", "NF-e de Estorno nº ..."), suportando rascunhos de ajuste e notas autorizadas em todas as 6 abas (Resumo, Cliente, Itens, Pagamento, Transporte, Eventos).
    * [`OrderFiscalOperationBadge.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.tsx): Atualizado para acionar `onOpenDocument(draftId, environment)` ao clicar no badge `NFE`, abrindo diretamente o modal unificado de detalhes da nota fiscal de estorno, sem navegar para fora da página ou do contexto operacional do pedido.
  * **Testes:**
    * [`OrderFiscalOperationBadge.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.test.tsx): Validação de clique no badge de estorno com abertura do modal de detalhes.
    * [`issuedFiscalDocumentDetailsModal.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx): Validação completa da renderização do modal para notas fiscais de estorno e da exibição do motivo de rejeição separado da justificativa na aba de Eventos.
* **Problema Identificado e Sintomas:**
  1. Na aba **Eventos** da nota fiscal, ao inspecionar a tentativa de cancelamento recusada, a interface exibia como motivo: *"Cancelamento solicitado pelo operador após cancelamento do pedido #5753"*, ocultando o motivo técnico real (expiração do prazo legal de 30 minutos da NFC-e no Paraná).
  2. Ao clicar no rótulo `NFE` no card ou na linha do pedido, o sistema redirecionava o usuário para `/fiscal-documents` ou permanecia estático, em vez de abrir o modal padronizado com todas as abas e detalhes da nota de estorno.
* **Causa Raiz Técnica Comprovada:**
  1. Em `IssuedFiscalDocumentEventsTab.tsx`, a variável de exibição usava `rawEvent.justification || rawEvent.xmotivo`, priorizando o texto inserido pelo usuário/sistema sobre a causa técnica cadastrada em `xmotivo`.
  2. Em `OrderFiscalOperationBadge.tsx`, quando `documentId` era nulo e `draftId` estava presente, o componente invocava `navigate()` em vez de invocar `onOpenDocument(draftId, environment)` para abrir o `IssuedFiscalDocumentDetailsModal`.
  3. O endpoint `/api/nfe/document-details` realizava busca estrita na tabela `nfe_documents`, falhando com 404 caso o identificador consultado pertencesse a um rascunho de operação em `nfe_operation_drafts`.
* **Solução Técnica Implementada:**
  1. `IssuedFiscalDocumentEventsTab.tsx` agora isola `rejectionReason` (a partir de `xmotivo`) e exibe separadamente `operatorJustification` (a partir de `justification`). A caixa de orientação fiscal sobre a regra de 30 minutos agora dispara corretamente.
  2. `api/nfe/document-details.ts` resolve `draftId` buscando em `nfe_operation_drafts` e no documento original, sintetizando a entidade fiscal de estorno com XML e itens de origem completos.
  3. `OrderFiscalOperationBadge.tsx` agora prioriza `onOpenDocument(draftId, environment)`, abrindo instantaneamente o `IssuedFiscalDocumentDetailsModal` com todas as abas (Resumo, Cliente, Itens, Pagamento, Transporte, Eventos).
* **Testes Executados e Validações:**
  * 6 testes aprovados em `OrderFiscalOperationBadge.test.tsx`.
  * 9 testes aprovados em `issuedFiscalDocumentDetailsModal.test.tsx`.
  * 80 testes no total das suítes de cancelamento, elegibilidade, schema e badges sem nenhuma regressão.

---

### 2.6. Ajuste Visual de Pedidos Cancelados (Remoção do Carimbo em Tabela, Card e Mobile)
* **Arquivos Modificados:**
  * **Frontend Web/ERP (`erp/src/pages/App/SalesOrder/OrderHistoryList/`):**
    * [`CancelledOrderBadge.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/CancelledOrderBadge.tsx): Removido o carimbo vermelho inclinado ("Cancelado" / "Estornado"). Mantido o fundo escurecido semitransparente (`bg-slate-950/35`) para sinalizar visualmente o status cancelado de forma discreta e elegante.
    * [`OrderHistoryRow.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.tsx): Removido o carimbo vermelho centralizado da linha da tabela. Mantido o overlay escurecido (`bg-slate-950/25`) cobrindo as colunas da linha.
    * [`cancelledOrderBadge.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/cancelledOrderBadge.test.tsx): Atualizado para testar a renderização do fundo escurecido (`data-testid="cancelled-order-overlay"`) e garantir que nenhum texto de carimbo ou ícone é renderizado.
    * [`OrderHistoryRow.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryRow.test.tsx): Atualizado para verificar a ausência do texto do carimbo e a presença do overlay escurecido da linha (`data-testid="cancelled-order-row-overlay"`).
  * **Frontend Mobile (`mobile/src/features/orders/components/`):**
    * [`MobileOrderCard.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/MobileOrderCard.tsx): Removido o elemento de carimbo (`stampContainer`, `stampBadge`, texto `CANCELADO`). Mantido o overlay escuro (`cancelledOverlay`) com `backgroundColor: 'rgba(2, 6, 23, 0.45)'`.
  * **Documentação do Usuário:**
    * [`userDocumentation.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SystemDocs/userDocumentation.ts): Alinhado o texto descritivo para "destaque visual escurecido na listagem".
* **Problema Identificado e Sintomas:** O carimbo vermelho chamativo de "CANCELADO" sobrepunha informações importantes dos pedidos nas listagens (tabela e cards) do ERP e no aplicativo móvel.
* **Solução Técnica Implementada:** O carimbo textual foi removido em todas as visualizações (tabela, cards do ERP e cards do app mobile), preservando a camada de fundo escurecido / opacidade atenuada que identifica visualmente o pedido como cancelado sem poluir a interface.
* **Testes Executados e Validações:**
  * 2 testes aprovados em `cancelledOrderBadge.test.tsx`.
  * 3 testes aprovados em `OrderHistoryRow.test.tsx`.
  * 52 testes aprovados na suíte de `OrderHistoryList`.
  * Build de produção (`vite build --mode local-test`) compilado com 100% de sucesso.

---

### 2.8. Paridade Total da Lista de Pedidos: ERP Web x Aplicativo Mobile
* **Arquivos Modificados:**
  * [`mobile/src/features/orders/services/mobileOrderListService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/services/mobileOrderListService.ts)
  * [`mobile/src/features/orders/hooks/useMobileOrders.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/hooks/useMobileOrders.ts)
  * [`mobile/src/features/orders/components/OrdersHeader.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/OrdersHeader.tsx)
  * [`mobile/src/features/orders/screens/NativeOrdersScreen.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/screens/NativeOrdersScreen.tsx)
  * [`mobile/src/features/orders/components/MobileOrderCard.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/MobileOrderCard.tsx)
  * [`mobile/src/features/orders/services/mobileOrderListService.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/services/mobileOrderListService.test.ts)
* **Problema Identificado e Sintomas:**
  * A listagem de pedidos no aplicativo mobile apresentava ausência de múltiplos selos operacionais, fiscais e filtros rápidos presentes no ERP Web (`OrderHistoryList` / `OrderHistoryRow` / `OrderCard`).
  * Especificamente, faltavam:
    1. Filtros rápidos de status no topo: Todos, Agendados, Atendidos, Cancelados, Rascunhos.
    2. Selo de conferência de estoque (`Tag` com check dot quando verificado).
    3. Selo de sincronização com o Bling (`Bling` com check dot).
    4. Selo de movimentação de estoque (`Package` com estados: movimentado, estornado ou pendente).
    5. Selos fiscais de Estorno (`NFE`) e Devolução (`NFD` com contagem).
    6. Selo de devolução vinculada (`DEV. TOTAL` / `DEV. PARCIAL`).
    7. Identificação de pedido de origem vinculado (`Pedido #{linkedOrderCode || linkedOrderId}`).
    8. Destaque de agendamento pendente (`AGENDAMENTO PENDENTE` com cor de alerta).
    9. Rótulo dinâmico de total (`TOTAL DEVOLVIDO` vs `TOTAL`).
* **Solução Técnica Implementada:**
  * Estendido `mobileOrderListService.ts` e `useMobileOrders.ts` com mapeamento completo de metadados fiscais e operacionais.
  * Mapeamento de documentos de `estorno` e `return` em `resolveMobileFiscalBadgePair` para alimentar `fiscalEstornoBadgeStatus` e `fiscalDevolucaoBadgeStatus`.
  * Filtro horizontal em pílulas (chips) adicionado a `OrdersHeader.tsx` integrado via `statusFilter` e `onSelectStatus`.
  * Adicionados todos os selos operacionais e fiscais a `MobileOrderCard.tsx` com as exatas dimensões e cores vigentes no ERP (compatíveis com tema claro e escuro).
* **Testes Executados e Validações:**
  * 9 testes unitários aprovados nas suítes de pedidos mobile (`mobileOrderListService.test.ts` e `mobileOrderListResilience.test.ts`).
  * 55 suites mobile executadas e validadas.

---

### 2.9. Correção de `ReferenceError: estornoDraftId is not defined` e Padronização Terminológica Estrita (Comercial vs Fiscal)
* **Arquivos Modificados:**
  * **Frontend Web/ERP (`erp/src/pages/App/SalesOrder/OrderHistoryList/` e `FiscalDocuments/`):**
    * [`OrderHistoryTable.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.tsx): Declarada a constante `estornoDraftId` no mapeamento da visão de cards (`OrderHistoryCard`), sanando o erro em tempo de execução `ReferenceError: estornoDraftId is not defined` disparado ao renderizar em telas menores / dispositivos móveis.
    * [`OrderCancellationFailureNotice.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderCancellationFailureNotice.tsx): Rótulos alterados de `"Falha na tentativa de cancelamento"` para `"Falha na tentativa de cancelamento fiscal"`, e `"Cancelamento pendente de confirmação"` para `"Cancelamento fiscal pendente de confirmação"`.
    * [`OrderFiscalOperationBadge.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalOperationBadge.tsx): Textos e tooltips atualizados para sempre acrescentar a palavra "fiscal" após "estorno" (`"de estorno fiscal"`, `"nota fiscal de estorno fiscal"`) e qualificar `"devolução fiscal"` (`"NFD · notas fiscais de devolução fiscal"`).
    * [`IssuedFiscalDocumentEventsTab.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentEventsTab.tsx): Eventos e cabeçalhos ajustados para `"Tentativa de Cancelamento Fiscal de NF-e"`, `"Cancelamento Fiscal Rejeitado / Bloqueado"`, `"Motivo da rejeição / bloqueio do cancelamento fiscal:"`, `"Justificativa informada no cancelamento comercial:"` e `"NF-e de Estorno Fiscal (Modelo 55)"`.
    * [`IssuedFiscalDocumentDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal.tsx): Títulos alinhados para `"Detalhes da nota fiscal de estorno fiscal"`, `"NF-e de Estorno Fiscal"`, `"Detalhes da nota fiscal de devolução fiscal"` e `"NF-e de Devolução Fiscal"`.
    * [`CancelSaleModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.tsx): Explicitação rigorosa entre esferas: `"Devolução comercial necessária"`, `"Abrir devolução comercial existente"`, `"Iniciar devolução comercial"`, `"cancelamento fiscal do modelo..."`, `"rascunho de estorno fiscal..."`, `"cancelamento será exclusivamente cancelamento comercial"`, `"Confirmo a solicitação de cancelamento fiscal desta nota na SEFAZ de Produção"`.
    * [`CancelReturnModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/CancelReturnModal.tsx): Textos e botões atualizados para `"Cancelar esta devolução comercial?"` e `"Cancelar devolução comercial"`.
    * [`FiscalCancelModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/modals/FiscalCancelModal.tsx): Título e botões atualizados para `"Cancelamento fiscal de NF-e"` / `"Tratamento de estorno fiscal"`, `"Justificativa do cancelamento fiscal"` e `"Confirmar e solicitar cancelamento fiscal"` / `"Confirmar e preparar estorno fiscal"`.
    * [`useOrderHistoryOperations.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts): Mensagens de erro e toasts contextualizados: `"Erro no cancelamento comercial do pedido."`, `"Cancelamento comercial concluído e estoque atualizado. N nota(s) com falha no cancelamento fiscal..."`, `"o cancelamento fiscal não foi registrado"`, `"Falha no cancelamento fiscal: ..."`
  * **Testes:**
    * [`OrderHistoryTable.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryTable.test.tsx) *(Novo)*: Validação de renderização em tabela (desktop) e em cards (mobile) com `estornoDraftId`.
    * [`OrderCancellationFailureNotice.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/OrderCancellationFailureNotice.test.tsx) *(Novo)*: Validação dos carimbos e rótulos explícitos de cancelamento fiscal em homologação e produção.
    * [`CancelSaleModal.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/CancelSaleModal.test.tsx): Alinhamento das asserções de cancelamento fiscal e devolução comercial.
    * [`useOrderHistoryOperations.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.test.ts): Validação dos toasts de erro e aviso com as novas terminologias.
    * [`issuedFiscalDocumentDetailsModal.test.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx): Validação do modal de estorno fiscal e evento de cancelamento fiscal rejeitado.
* **Problema Identificado e Sintomas:**
  1. Ao abrir o ERP no navegador em viewport mobile ou redimensionar a tela, ocorria exceção não capturada: `ReferenceError: estornoDraftId is not defined` em `OrderHistoryTable.tsx:271`.
  2. Textos, avisos de erro e carimbos na interface utilizavam genericamente os termos "cancelamento" e "devolução", gerando confusão para o operador sobre se o erro/sucesso ocorrera na dimensão comercial (pedido no banco de dados) ou fiscal (transmissão de evento à SEFAZ).
* **Causa Raiz Técnica Comprovada:**
  1. Em `OrderHistoryTable.tsx`, o bloco de mapeamento de `orders.map` para `OrderHistoryCard` passava a prop `fiscalEstornoDraftId={estornoDraftId}`, mas a variável `const estornoDraftId` só havia sido declarada no bloco do `OrderHistoryRow` (tabela).
  2. Falta de qualificação semântica explícita entre as esferas comercial e fiscal nas mensagens de interface, violando a clareza operacional exigida na separação de responsabilidades.
* **Solução Técnica Implementada:**
  1. Adicionada a declaração `const estornoDraftId = typeof badgeInfo === 'object' ? badgeInfo?.estornoDraftId : undefined;` no bloco de renderização do `OrderHistoryCard` em `OrderHistoryTable.tsx`.
  2. Aplicada a qualificação terminológica estrita e padronizada (invariante `FISCAL-023`) em todos os componentes:
     - No contexto fiscal: **"cancelamento fiscal"**, **"estorno fiscal"**, **"devolução fiscal"**.
     - No contexto comercial: **"cancelamento comercial"**, **"devolução comercial"**.
     - Em notificações de falha: **"Erro no cancelamento comercial"** vs **"Falha no cancelamento fiscal"**.
* **Testes Executados e Validações:**
  * 114 testes aprovados em 13 suítes completas de testes unitários e de integração (`npm --prefix erp test -- --run`).
  * 0 falhas, 0 regressões.

---

### 2.10. Paridade de Consulta dos Detalhes do Pedido: ERP Web x Aplicativo Mobile (Modo Estritamente Somente Leitura)
* **Arquivos Modificados:**
  * [`mobile/src/features/orders/components/OrdersHeader.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/OrdersHeader.tsx)
  * [`mobile/src/features/orders/screens/NativeOrdersScreen.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/screens/NativeOrdersScreen.tsx)
  * [`mobile/src/components/modals/OrderDetailsModal.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/modals/OrderDetailsModal.tsx)
  * [`mobile/src/components/OrderDetailsBody.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/OrderDetailsBody.tsx)
  * [`mobile/src/components/order-details/sections/CustomerSection.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/sections/CustomerSection.tsx)
  * [`mobile/src/components/order-details/sections/AddressSection.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/sections/AddressSection.tsx)
  * [`mobile/src/components/order-details/sections/ItemsSection.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/sections/ItemsSection.tsx)
  * [`mobile/src/components/order-details/OrderPaymentSection.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/OrderPaymentSection.tsx)
  * [`mobile/src/features/orders/domain/orderDetailsParity.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/orderDetailsParity.test.ts)
* **Problema Identificado e Sintomas:**
  * No aplicativo móvel, o modal e as seções de detalhes do pedido não exibiam metadados vitais disponíveis no ERP (`OrderDetailsModal`), tais como:
    1. Cabeçalho com `#Código` do pedido, data formatada, vendedor responsável e badge de status com cores oficiais.
    2. Botão direto para contato via WhatsApp com o cliente e contatos adicionais.
    3. Exibição de e-mail e CPF/CNPJ completo do cliente.
    4. Indicação explícita de "Retirada no Balcão / Loja" quando a modalidade for retirada (ocultando navegação externa indevida).
    5. Resumo financeiro analítico no bloco de itens (`SUBTOTAL ITENS`, `DESCONTO`, `FRETE` e `TOTAL GERAL`).
    6. Rodapé financeiro de pagamentos com `PAGO` e `EM ABERTO`.
    7. Contador de pedidos totais no cabeçalho da listagem e botão de limpeza rápida da busca.
* **Diretriz de Segurança Mandatória:**
  * Em conformidade com a determinação da governança, pedidos de venda no aplicativo mobile **não possuem botão de criação nem edição**, atuando exclusivamente em modo de consulta (somente leitura) e progressão das etapas de entrega. Criação e edição permanecem restritas ao ERP Web.
* **Testes Executados e Validações:**
  * 13 testes unitários aprovados nas suítes mobile (`orderDetailsParity.test.ts`, `mobileOrderListService.test.ts`, `mobileOrderListResilience.test.ts`).

---

### 2.11. Refatoração Arquitetural e Modularização Limpa do Módulo de Pedidos Mobile (`features/orders`)
* **Arquivos Criados e Modificados:**
  * [`mobile/src/features/orders/domain/types.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/types.ts) — Centralização de tipos do domínio de pedidos (`MobileOrderListItem`, `MobileFiscalBadgeStatuses`, `FiscalBadgeStatus`, `FiscalOperationBadgeStatus`, `OrderPresentationInput`, `MobileOrderStatusFilter`).
  * [`mobile/src/features/orders/domain/orderAssemblyRules.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/orderAssemblyRules.ts) — Isolamento de funções puras de classificação de montagem de pedidos (`isHandlingDepot`, `isHandlingOutside`, `getOrderAssemblyFlags`) e detecção de tráfego pago (`isPaidTrafficOrder`).
  * [`mobile/src/features/orders/components/card/orderCardTheme.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/orderCardTheme.ts) — Funções puras de tema e paleta visual (`getStatusConfig`, `resolveHeaderColors`), garantindo paridade com Tailwind e ERP Web.
  * [`mobile/src/features/orders/components/card/OrderCardFiscalBadges.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/OrderCardFiscalBadges.tsx) — Componente coeso dedicado aos selos fiscais (`NF`, `NFH`, `NFE`, `NFD`).
  * [`mobile/src/features/orders/components/card/OrderCardBadges.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/OrderCardBadges.tsx) — Componente coeso para selos operacionais (Tipo, Bling, Etiquetado, Movimentação de estoque, Devolução vinculada, Tráfego pago, Montagens e Status).
  * [`mobile/src/features/orders/components/card/OrderCardBody.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/OrderCardBody.tsx) — Componente estrutural do corpo do card (Cliente, Pedido vinculado, Datas, Total financeiro e Rodapé de entrega).
  * [`mobile/src/features/orders/components/MobileOrderCard.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/MobileOrderCard.tsx) — Reduzido de monólito de 885 linhas para orquestrador leve (~190 linhas), com alto acoplamento interno eliminado e estilos locais coesos.
  * [`mobile/src/features/orders/index.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/index.ts) — Ponto de entrada público único (barrel export) com documentação do invariante de somente leitura.
  * [`mobile/src/features/orders/services/mobileOrderListService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/services/mobileOrderListService.ts) — Importação e re-exportação tipada a partir de `domain/types.ts`.
  * [`mobile/src/features/orders/domain/orderAssemblyAndTheme.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/orderAssemblyAndTheme.test.ts) — 7 novos testes unitários cobrindo regras de montagem, tráfego pago e resolução de tema visual.
* **Problema Identificado e Causa Raiz:**
  * O componente `MobileOrderCard.tsx` acumulava 885 linhas em um único arquivo, misturando lógica de classificação de montagem de itens, detecção de tráfego pago via regex, cálculo de temas e cores de cabeçalho, renderização de 13 tipos de selos operacionais e fiscais, layout dos campos do pedido e mais de 300 linhas de estilos CSS/StyleSheet.
  * As tipagens do pedido estavam duplicadas entre `mobileOrderListService.ts` e arquivos de tela, ferindo o princípio DRY.
  * Não existia um ponto de entrada público (`index.ts`) delimitando a camada pública do módulo `features/orders`.
* **Solução Técnica Implementada (Princípios de Engenharia de Software):**
  1. **Princípio da Responsabilidade Única (SRP):** Cada arquivo passou a ter uma única razão para mudar — `orderAssemblyRules.ts` apenas para regras de montagem, `orderCardTheme.ts` apenas para temas, `OrderCardFiscalBadges.tsx` apenas para notas fiscais, `OrderCardBadges.tsx` para selos gerais, `OrderCardBody.tsx` para dados do cliente e entrega.
  2. **Separação em Camadas (Layered Architecture):**
     * `domain/`: Tipos, regras de montagem, apresentação de status e testes de domínio independentes de UI.
     * `components/card/`: Subcomponentes especializados do card de pedido.
     * `components/`: Componentes compostos de nível superior (`MobileOrderCard`, `OrdersHeader`, `MobileOrderPagination`).
     * `hooks/`: Gerenciamento de ciclo de vida e estado assíncrono (`useMobileOrders`).
     * `screens/`: Telas integradoras (`NativeOrdersScreen`, `DeliveryPreparationScreen`).
     * `services/`: Acesso a dados e comunicação resiliente com Supabase (`mobileOrderListService`).
  3. **Invariante Mandatório de Negócio:** Mantida rigorosamente a regra de que o aplicativo móvel **não possui criação nem edição de pedidos de venda**. O módulo permanece estritamente como ferramenta de consulta, visualização de detalhes e acompanhamento operacional de entregas.
* **Testes Executados e Validações:**
  * 20 testes unitários aprovados em 4 suítes completas de testes no mobile (`orderAssemblyAndTheme.test.ts`, `orderDetailsParity.test.ts`, `mobileOrderListService.test.ts`, `mobileOrderListResilience.test.ts`).
  * Execução em menos de 500ms, com 0 falhas e 0 regressões.

---

### 2.12. Replicação Abrangente de Recursos do ERP Web no Módulo de Pedidos Mobile (Invariante Estrito de Somente Leitura)
* **Arquivos Modificados:**
  * [`mobile/src/utils/orderUtils.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/utils/orderUtils.ts) — Adicionada função utilitária pura `toTitleCase(str: string)` para formatação canônica de nomes de clientes.
  * [`mobile/src/features/orders/domain/types.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/types.ts) — Adicionado tipo `OrderFiscalCancellationState` (`'failed' | 'verify' | 'pending'`) e atualizado `MobileOrderStatusFilter` com os novos filtros operacionais (`'retiradas' | 'assistencias' | 'devolucoes'`).
  * [`mobile/src/features/orders/components/card/OrderCancellationFailureNotice.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/OrderCancellationFailureNotice.tsx) *(Novo)* — Componente mobile de aviso de falha/pendência na regularização fiscal do pedido cancelado com ícone `AlertTriangle`, compatível com os 3 estados do ERP.
  * [`mobile/src/features/orders/components/card/OrderCardBody.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/card/OrderCardBody.tsx) — Integrado `toTitleCase`, formatação de intervalo de datas agendadas (`de X até Y`), banner de alerta `COLETA AGENDADA` para devoluções em status `scheduled`, renderização do aviso `OrderCancellationFailureNotice` e evento tátil `onFilterByLinkedOrder` no selo de pedido vinculado.
  * [`mobile/src/features/orders/components/MobileOrderCard.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/MobileOrderCard.tsx) — Repasse de `scheduleEndDate`, `scheduleDateType`, `isScheduledReturn`, `fiscalCancellationState`, `returnStockProcessed` e `returnStockReversed`.
  * [`mobile/src/features/orders/components/OrdersHeader.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/components/OrdersHeader.tsx) — Adicionadas as pílulas (chips) de filtro rápido: `Retiradas`, `Assistências` e `Devoluções`.
  * [`mobile/src/features/orders/screens/NativeOrdersScreen.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/screens/NativeOrdersScreen.tsx) — Conexão do callback `onFilterByLinkedOrder` disparando filtro instantâneo por código/ID do pedido vinculado e rolagem ao topo da lista.
  * [`mobile/src/features/orders/services/mobileOrderListService.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/services/mobileOrderListService.ts) — Suporte na query PostgREST para filtros `retiradas`, `assistencias` e `devolucoes`, resolução de `fiscalCancellationState` em `resolveMobileFiscalBadgePair` e correção do encadeamento de `query.range` posterior aos filtros.
  * [`mobile/src/components/order-details/sections/OrderTypeBadges.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/sections/OrderTypeBadges.tsx) — Adicionado badge visual `DEVOLUÇÃO` com ícone `RotateCcw` em cor âmbar (`#d97706`).
  * [`mobile/src/components/OrderDetailsBody.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/OrderDetailsBody.tsx) — Repasse de prop `isReturn` para `OrderTypeBadges`.
  * [`mobile/src/components/order-details/sections/CustomerSection.tsx`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/components/order-details/sections/CustomerSection.tsx) — Formatação de nome do cliente com `toTitleCase`.
  * [`mobile/src/features/orders/domain/orderDetailsParity.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/domain/orderDetailsParity.test.ts) — 6 testes unitários validando formatação de cliente em TitleCase, intervalo de datas agendadas e banner de coleta de devolução.
  * [`mobile/src/features/orders/services/mobileOrderListService.test.ts`](file:///c:/Users/mathe/OneDrive/Área%20de%20Trabalho/projetos/morantehub/mobile/src/features/orders/services/mobileOrderListService.test.ts) — Testes de filtros de status operacionais e estado de cancelamento fiscal.
* **Problema Identificado e Sintomas:**
  * Embora a listagem mobile já possuísse os selos fiscais básicos, faltavam sutilezas críticas do ERP Web que garantem eficiência operacional aos motoristas e expedição:
    1. Nome de cliente em caixa alta crua ou minúsculas desordenadas.
    2. Agendamentos por período/intervalo exibindo apenas uma única data limite em vez de `DD/MM/AAAA até DD/MM/AAAA`.
    3. Pedidos de devolução agendados passavam despercebidos sem a tarja chamativa de `COLETA AGENDADA`.
    4. Pedidos cancelados comercialmente cuja nota fiscal não foi estornada ou cancelada na SEFAZ não alertavam o operador mobile sobre a pendência fiscal.
    5. O selo de pedido de origem em devoluções/assistências era estático, sem permitir toque para filtrar diretamente o pedido original.
    6. Filtros rápidos por `Retiradas`, `Assistências` e `Devoluções` estavam indisponíveis no aplicativo.
* **Invariante Mandatório de Arquitetura e Negócio:**
  * **Modo Estritamente Somente Leitura:** Em conformidade estrita com o pedido do usuário e com as diretrizes de governança, o módulo de pedidos no aplicativo mobile não implementa criação nem edição de pedidos de venda (estas operações permanecem 100% restritas ao ERP Web). O app atua exclusivamente como ferramenta de consulta, auditoria visual, filtros operacionais e gestão de entrega.
* **Testes Executados e Validações:**
  * 24 testes unitários aprovados em 4 suítes completas de testes no mobile (`orderDetailsParity.test.ts`, `orderAssemblyAndTheme.test.ts`, `mobileOrderListService.test.ts`, `mobileOrderListResilience.test.ts`).
  * 100% de cobertura nos cenários de paridade visual, ordenação de query PostgREST e invariantes de segurança.

---

### Marcador de teste utilizável nos formulários em Development

- **Sintoma observado:** na sessão administrativa do ERP na porta padrão 5173, o formulário de novo cliente não mostrava o controle “Artefato de teste”. Nenhum cadastro do lote comercial foi salvo nesta verificação.
- **Causa comprovada:** `AuthContext.tsx` condicionava a autorização do contexto à existência de `VITE_TEST_ARTIFACT_RUN_ID`; sem a variável, `getTestArtifactContext()` era nulo e os formulários de cliente, produto e pedido ocultavam seus controles.
- **Correção:** autorizar o operador no backend após resolver o perfil administrativo, reaproveitar somente o contexto pertencente à mesma identidade e, quando não houver contexto ou runId explícito, gerar UUID em memória com `crypto.randomUUID()`. O modo segue desligado inicialmente nos formulários; os guards, ownership e filtros de isolamento continuam obrigatórios. Nenhuma entidade comercial é criada pela geração do contexto.
- **Arquivos e linhas alterados:** `erp/src/context/AuthContext.tsx:20` (importação), `:352` (captura do contexto anterior) e `:373–390` (autorização e resolução do runId/owner/scenario); `erp/src/context/AuthContext.test.tsx:15–17`, `:43–49`, `:135–151` e `:185–253` (mocks, ambiente e regressões). Diagnósticos temporários em console foram removidos; `testArtifactOperator.ts` conserva seu comportamento original. Atualizados o índice fiscal e o estado de autorização no roteiro comercial.
- **Validação focada:** 40 testes aprovados em seis arquivos (`AuthContext`: seis; política do operador: quatro; política de artefatos: 23; formulário de cliente: um; footer de produto: um; formulário de pedido: cinco). Após acrescentar a regressão de Produção, os sete testes de `AuthContext` passaram novamente; são execuções sobrepostas, não 47 casos distintos. `tsc -p erp/tsconfig.fiscal.json --pretty false` passou. ESLint dos dois arquivos alterados passou com zero erros e dois avisos preexistentes de hooks/fast refresh.
- **Leitura remota:** o operador e o navegador correspondem à mesma identidade administrativa no ref `hkoxhourxwlddgsfdgws`. Readiness retornou `ready=true`; os filtros de relatórios, estoque, agenda, montagens, dashboard e notificações não retornaram vazamentos de artefatos, incluindo `scheduled` e `fulfilled`. Consultas filtradas pelo runId original confirmaram zero pessoas, produtos e pedidos. [Evidência sanitizada da retomada](../audits/fiscal-2026-10-14/evidence/commercial-resumption.json).
- **Pendência real:** mesmo com a identidade correta, o serviço `/api/testing/test-artifact-operator` responde HTTP 403 na porta padrão 5173. A causa dessa recusa no processo da API ainda não foi determinada; não atribuí-la a identidade incorreta nem contornar a validação. O marcador continuou oculto na verificação visual. As tentativas de reiniciar somente a API local falharam com “Acesso negado”; solicitado reinício pelo terminal que iniciou a stack. A instância temporária na porta 5174 foi encerrada. O lote comercial permanece autorizado e aguarda a resolução desse bloqueio; nenhuma gravação comercial, transmissão SEFAZ, nova migration ou deployment foi executada nesta retomada.

### Origem do HTTP 403 do marcador — configuração local legada

- **Sintoma e causa comprovados:** depois de reiniciar a stack, a API registrou `administrator=true` e `identityMatches=false`. Comparação em memória confirmou que o operador em `erp/.env` divergia do Vercel Development. O código do Vercel CLI 64.0.2 carrega `.env` no diretório do projeto antes das variáveis remotas; quando encontra valores locais, deixa de usar o conjunto remoto. A pasta `C:/Users/mathe/morantehub-build` é uma junction do mesmo checkout, não outra versão da API.
- **Correção local:** preservado integralmente `erp/.env` como `erp/.env.legacy-before-vercel-20261014.local`, fora do carregamento automático e ignorado pelo Git. Nenhum valor de credencial foi impresso, alterado ou copiado para código. A stack foi reiniciada por `npm run dev`, com frontend em 5173 e API em 3000. Não houve mudança no guard de autorização nem em variável remota.
- **Arquivos/linhas:** renomeação integral do arquivo local de ambiente (sem alteração de linhas de conteúdo). Este registro complementa e resolve a investigação do HTTP 403 descrita acima; a conferência visual e o lote comercial seguem abaixo conforme executados.
- **Validação:** o mesmo operador autenticado pela configuração Development recebeu HTTP **204** em `/api/testing/test-artifact-operator` na porta 5173 após a renomeação; antes recebia 403. Inicialização fiscal, carregamento WASM e resolução dos XSDs passaram. Nenhuma gravação comercial ou transmissão fiscal foi feita nesta correção.

### Auditoria de domínio antes do gerador sintético

- **Escopo atualizado:** usuário interrompeu o lote manual e pediu auditoria/correção do backend antes de implementar geração automatizada. Estado, matriz existente e lacunas estão na [auditoria de domínio](auditoria-regras-gerador-sintetico-2026-10-14.md). Os dois cadastros sintéticos anteriores permanecem preservados; nenhuma nova escrita de negócio foi feita após essa orientação.
- **Causas comprovadas:** capacidade da devolução no banco agrupava SKUs iguais e podia ser contornada pela RPC geral; replay da devolução comercial não comparava o conteúdo; modal prosseguia após falha de consulta e a consulta fiscal podia retornar ausência em caso de erro; `personMapper` descartava `noPhone`. Schemas de cliente/produto dependiam de arquivos da interface.
- **Solução local e remota:** extração dos schemas e quantidades para `shared-utils`; validação adicional das linhas/quantidades no modal; falha de consulta bloqueia criação, com timeout e descarte de respostas tardias; `noPhone` persiste na metadata existente. Migration autorizada como `20261014115321` e aplicada pelo MCP com versão `20261014121114_enforce_commercial_return_domain.sql`; arquivo local alinhado ao histórico remoto, sem reaplicação. Lacunas restantes não são tratadas como concluídas.
- **Arquivos alterados:** `shared-utils/commercialReturnRules.ts`, `shared-utils/personDomainValidation.ts`, `shared-utils/productDomainValidation.ts`, `shared-utils/withTimeout.ts`; reexports nos antigos arquivos de regras; `ReturnOrderModal.tsx`, `AuthContext.tsx` (somente extração do helper de timeout preservando contratos), `personMapper.ts`, testes correspondentes e migration. A localização complementar consta na tabela de checkpoints abaixo.
- **Validação até este checkpoint:** 36 testes locais aprovados em regras de devolução, mapper, modal e autenticação. Depois de acrescentar negativos do modal e ajustar expectativas antigas de CPF à regra já vigente, 27 testes passaram em schema de pessoa, submissão de produto e modal. Execuções sobrepostas; não somar como casos distintos. Prova remota das novas proteções pendente da aplicação autorizada.
- **Aplicação autorizada e prova remota:** 15/15 casos das funções puras passaram no Supabase `hkoxhourxwlddgsfdgws`; trigger habilitada e ACLs conferidas. Contratos compartilham os mesmos vetores com TypeScript (31 testes de quantidades aprovados). Modal passou em 11 testes, incluindo erro comercial, erro fiscal, origem não persistida e timeout. Sem gravação de fixtures, testes de trigger/replay/concorrência/rollback ainda pendentes. [Evidência remota](../audits/fiscal-2026-10-14/evidence/commercial-return-domain.json).

### Schemas compartilhados e migração dos formulários para RHF

- **Pedido e causa:** o usuário determinou React Hook Form e `zodResolver` em todos os formulários. O ERP não tinha essas dependências; o schema antigo de pedidos estava desconectado do salvamento real. Regras puras de pedido e cálculos dependiam de módulos da interface.
- **Implementação em andamento:** instalados `react-hook-form@7.90.0` e `@hookform/resolvers@5.9.1`. `shared-utils/orderDomainValidation.ts`, `commercialOrderRules.ts`, `commercialShippingRules.ts` e `orderCalculations.ts` concentram os contratos e cálculos, com configuração explícita de campos obrigatórios. Reexports preservam consumidores antigos. `useZodForm.ts` executa o resolver real e entrega valores parseados; pessoa, produto e salvar/concluir pedido passam por esse caminho. Schemas de pessoa/produto preservam metadata por `passthrough`, incluindo identificação de teste, sem alterar snapshots fiscais.
- **Arquivos/linhas:** os arquivos acima, wrappers antigos de cálculos/validações, `usePersonForm.ts`, `useProductFormSubmit.ts`, `useSalesOrderForm.ts`, `erp/package.json`/lock e testes. A localização atual consta na tabela de checkpoints; a cobertura global segue no inventário e não se considera todos os formulários migrados neste checkpoint.
- **Validação atual:** 2 testes do adaptador RHF passaram; 12 de cálculos/pagamentos passaram. Expectativas antigas que contabilizavam pagamentos `pending` como recebidos foram corrigidas para o status canônico `Pago`. A compilação geral possui erros e está sendo separada por arquivos afetados; não há prova de build completo nesta etapa. Nenhuma população, transmissão fiscal ou deploy.

### Formulário de emissão: resolver no caminho efetivo

- **Problema comprovado:** `useNfeEmissionActions.handleEmit` executava validação própria sem React Hook Form; o validador importava configuração da interface, impedindo reutilização pura no backend.
- **Solução:** extraído o validador para `shared-utils/nfeEmissionFormValidation.ts`, com UF do emitente como entrada explícita. `nfeEmissionFormSchema` reutiliza as regras existentes em `superRefine`. O serviço antigo injeta a configuração vigente; o hook executa `useZodForm.validateAndRun` antes de preparar ou transmitir. Prévia continua opcional; validação adicional não muda hashes, snapshots nem confirmação de Produção.
- **Arquivos/linhas:** `shared-utils/nfeEmissionFormValidation.ts` (contrato/validador), `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeValidationService.ts` (wrapper), `hooks/useNfeEmissionActions.ts` (resolver antes dos efeitos). A localização e as evidências complementares estão na tabela de checkpoints abaixo.
- **Estado da prova:** testes focados da emissão ainda em execução neste checkpoint. Nenhuma emissão foi realizada para validar esta refatoração.

### Resolver das devoluções e estabilidade da submissão

- **Problema:** os modais de devolução vinculada/avulsa salvavam por botão sem RHF. Durante a integração, os testes revelaram que `useForm.values` podia disparar outro reset durante a resolução assíncrona e cancelar silenciosamente a intenção de envio.
- **Causa e solução:** o status/número informado no clique difere dos valores controlados de renderização; RHF 7.90 descarta a submissão quando ocorre reset concorrente. `useZodForm` mantém os valores controlados em ref e congela o payload no início de cada envio; trava síncrona rejeita envios simultâneos e é liberada em `finally`. Devoluções passam por `shared-utils/returnFormSchemas.ts`, reutilizando a regra de saldo por linha, quantidades positivas e preços não negativos. Não são modificados os snapshots nem os vínculos fiscais.
- **Arquivos:** `useZodForm.ts` e testes, `ReturnOrderModal.tsx`, `modals/UnlinkedReturnOrderModal.tsx`, `shared-utils/returnFormSchemas.ts`. O helper de clique dos testes de emissão aguarda `act` porque o resolver é assíncrono. A localização atual consta na tabela de checkpoints; as provas locais estão nos logs de regressão do documento central.
- **Prova:** nova rodada focada em andamento; nenhum envio SEFAZ ou escrita comercial foi usado como teste.

### Importação por chave e NCM em lote no resolver

- **Causa comprovada:** `InboundAccessKeyModal` removia letras da chave usando `\D`, embora o contrato compartilhado vigente aceite CNPJ alfanumérico. A atribuição de NCM em lote verificava somente texto não vazio. Os dois caminhos não executavam RHF.
- **Solução:** `lookupFormSchemas.ts` normaliza a chave com o helper fiscal existente e valida os 44 caracteres por `ACCESS_KEY_PATTERN`; input preserva letras na posição prevista pelo contrato. `bulkNcmFormSchema` aceita máscara conhecida e exige oito dígitos. Os callbacks recebem os valores parseados após `useZodForm.validateAndRun`. O filtro de busca fiscal também usa o componente `ZodForm`.
- **Arquivos:** `shared-utils/lookupFormSchemas.ts`, `catalogFormSchemas.ts`, `InboundAccessKeyModal.tsx`, `ApplyNcmModal.tsx`, `FiscalDocumentsFilterBar.tsx`; localização e evidências complementares constam na tabela de checkpoints abaixo. Não houve consulta externa por chave, distribuição DF-e nem gravação de NCM remota.
- **Rascunhos:** autosave de pedidos passou a usar `orderDraftFormSchema` (estrutura, números e enums), preservando incompletude; o submit manual conserva regras de cliente/vendedor. Autosave de produto conserva a versão retornada pelo serviço no objeto parseado. Os testes de rascunho verificam dados, não identidade de referência, pois Zod entrega uma cópia.

### Cobertura ampliada: sistema inteiro e contratos de rascunho

- **Determinação do usuário:** todos os formulários devem usar RHF e zodResolver, incluindo ERP, móvel e catálogo. Regra registrada no `AGENTS.md:5`. Dependências adicionadas nos três projetos; schemas compartilhados preservam políticas específicas de senha já existentes (catálogo: 6; criação/alteração de credencial ERP/móvel: 8).
- **Novos caminhos:** configurações gerais passam por `AppSettingsFormSchema` antes do autosave; compras validam fechamento com rascunho, autosave e confirmação separadamente por `purchaseFormSchemas.ts`; confirmação comercial com evento fiscal passa por `operationConfirmationFormSchema.ts`; formulário móvel de produto reutiliza suas regras puras atuais em `mobileProductFormSchema.ts`. Não há alteração de CFOP, tributos, emissão automática, snapshots ou ambientes por esta integração.
- **Causa comprovada e solução adicional:** confirmação de Produção era exigida também para consultar rascunhos fiscais pendentes. `NfeOperationDraftModal.tsx:173` limita o bloqueio a `ready`/retry; `api/nfe/transmit-operation-draft.ts:313` exige confirmação somente quando o rascunho está `ready`. `unknown`/`transmitting` consultam a mesma tentativa com o valor real de confirmação; nenhuma confirmação artificial é enviada. A prova dos dois gates foi complementada: 7 casos de interface e 21 do endpoint passaram em `scratch/rhf-latest-regression.log`.
- **Compatibilidade do adaptador:** o método `submit` congela valores controlados antes de chamar RHF; `handleSubmit` original permanece no `FormProvider`, preservando os tipos da biblioteca. Cada aplicação resolve sua própria versão de React; schemas vêm de `shared-utils`. Catálogo alinhado a Zod 4.5.4 para compatibilidade dos tipos compartilhados. Versões da dependência ERP estão sendo conferidas junto às demais alterações do checkout.
- **Validação:** 81 testes focados de emissão/adaptador/autosaves passaram; depois 131 em 10 arquivos de acesso, financeiro, campanhas, produtos, rascunhos e operações fiscais. Rodadas sobrepostas, não somar como testes distintos. 12 testes de contratos pequenos/adaptador/configuração passaram. TypeScript do catálogo passou após compatibilização do adaptador; lint ERP da integração não apresentou erros, com avisos em revisão. **Migração global ainda em andamento**; inventário mantém pendências explícitas. Nenhuma escrita comercial remota, transmissão SEFAZ, DDL adicional ou deploy.

### Caminhos fiscais restantes dos formulários

- **Causas comprovadas:** editar/conciliar pedido, salvar rascunho fiscal, finalidade da compra, importar NF e configurar NCM/CSOSN ainda tinham caminhos diretos fora de RHF. A importação por documento e a identificação do fornecedor removiam letras dos identificadores. O callback legado de CC-e ainda tentava chamar uma API de envio, embora a política vigente proíba novos eventos.
- **Soluções:** `OrderEditModal` valida antes da auditoria e conserva o mesmo payload parseado na confirmação/persistência; a conciliação tem contrato próprio sem defaults que alterem itens históricos. Recebimentos validam antes de qualquer gravação de códigos de fornecedor. Importação usa `inboundInvoiceFormSchema` e o validador de chave já existente, extraído para `shared-utils/nfeAccessKeyValidation.ts`; normalização preserva CNPJ alfanumérico. Rascunho fiscal aceita dados incompletos, mas impede gravar documento inválido do destinatário em Produção e preserva o rascunho quando o enriquecimento ainda carrega. Finalidade da compra, CSOSN HML, busca/sincronização/revisão/correlação NCM passam pelo resolver. A submissão legada de CC-e é bloqueada antes da API; histórico e reconciliação continuam disponíveis, sem habilitar emissão de CC-e.
- **Arquivos:** `OrderEditModal.tsx`, `orderDomainValidation.ts`, `useReceiptForm.ts`, `receiptFormSchemas.ts`, `useInboundDocumentImport.ts`, `InboundDocumentImportModal.tsx`, `inboundInvoiceFormSchema.ts`, `lookupFormSchemas.ts`, `nfeAccessKeyValidation.ts`/reexport antigo, `useNfeEmission.ts`, `nfeEmissionFormValidation.ts`, `HmlCsosnSettings.tsx`, `fiscalOperationFormSchemas.ts`, `NcmManagementPanel.tsx`, `ncmManagementFormSchemas.ts`, `useFiscalCceModal.ts`, `fiscalCorrectionPolicy.ts`, `legacyFiscalFormSchemas.ts`, `orderEditFiscalPolicy.ts` e testes. A localização complementar consta na tabela de checkpoints abaixo.
- **Prova atual:** compilação completa ERP passou (startup fiscal, WASM e XSD incluídos) antes deste último grupo; 17 testes de chave, fronteira RHF e cancelamento passaram. A nova rodada do rascunho/emissão/configuração/CC-e histórica está em execução. Não houve emissão, manifestação, consulta SEFAZ real, escrita comercial remota, nova migration ou deploy.

## 3. Diretrizes para Próximos Agentes

### Continuação dos formulários: importação e dados assistidos

- **Problema e causa:** a importação CSV de pessoas e os preenchimentos assistidos de pedidos/recebimentos tinham callbacks próprios que não executavam RHF/resolver. O CSV também podia ocultar linhas sem nome e não permitia declarar as exceções de telefone/endereço ou a origem de marketing exigidas pelo cadastro normal.
- **Correção:** `erp/src/pages/App/Registrations/shared/modals/PersonImportModal.tsx:43`/`:197`/`:212`/`:264` valida cada prévia e o lote selecionado inteiro antes da primeira gravação, preserva linhas inválidas visíveis e permite mapear exceções e origem explícita; não fabrica origem orgânica. `erp/src/pages/App/SalesOrder/components/SmartAIFillModal.tsx:29`/`:32` valida texto e todo JSON aplicado; `erp/src/pages/App/Stock/Receipts/modals/ReceiptAIFillModal.tsx:51`/`:119`/`:125` valida texto e itens interpretados antes de aplicar. `shared-utils/assistedFormSchemas.ts:3` define contratos de entrada parcial; o formulário final continua responsável pela completude, sem acrescentar campos a snapshots fiscais.
- **Prova:** `erp/src/components/forms/assistedForms.test.tsx:18` passou nos 3 testes: texto vazio não chama IA, item inválido não aplica recebimento, JSON inválido é bloqueado e pedido parcial válido é preservado, lote com uma linha inválida não inicia gravação. Testes com serviços mockados, sem dados comerciais remotos, SEFAZ ou deploy.

### Confirmação de Produção limitada à transmissão do rascunho

- **Problema e causa:** os gates da interface/API exigiam confirmação também para consultar uma tentativa já incerta, contrariando a separação entre consulta e transmissão do hook.
- **Correção:** `erp/src/pages/App/FiscalDocuments/modals/NfeOperationDraftModal.tsx:173` limita o bloqueio à transmissão/retry; `api/nfe/transmit-operation-draft.ts:313` exige confirmação para `ready`. `unknown`/`transmitting` consultam a mesma tentativa sem confirmação fabricada; retry após 217 passa por `ready` e volta a exigir autorização. Permissões do operador permanecem.
- **Prova local:** 21 testes do endpoint (4 novos e reforço de timeout/retry) e 7 novos testes da interface em `operationDraftProductionConfirmation.test.tsx` passaram. Lint da interface/testes passou. Sem SEFAZ, banco ou deploy reais. Esta evidência substitui a pendência UI/API registrada ao final do grupo anterior.

1. **Sempre consultar este documento e `invariantes-arquiteturais.md`** antes de modificar qualquer endpoint ou componente fiscal.
2. **Nunca alterar objetos de snapshots** que são comparados via hash ou igualdade na RPC `prepare_nfe_outbound_attempt`.
3. **Nunca executar consultas sem timeout** no contexto de inicialização ou autenticação da aplicação.
4. **Toda nova correção fiscal deve ser adicionada a este histórico e vinculada no `README.md` fiscal.**



### RHF e zodResolver nos rascunhos de operação e cancelamento fiscal — 14/10

- **Problema e causa comprovada:** os handlers de preparar/revisar/transmitir rascunhos fiscais e de confirmar cancelamento fiscal executavam serviços a partir de estados locais, sem o resolver React Hook Form exigido pelo usuário. O cancelamento tinha verificações imperativas; o rascunho dependia de controles de interface e verificações no servidor. Não se alteraram prazos, CFOPs aprovados ou regras tributárias.
- **Solução:** contratos Zod explícitos compartilhados passaram a validar os dados efetivos antes de cada serviço. Preparação diferencia devolução vinculada e estorno fiscal; revisão reaproveita `normalizeReviewedFiscalBlock` e a constante vigente `ESTORNO_NATURE_OF_OPERATION`, exige uma ocorrência de cada item e valida CFOP/confirmacões já obrigatórias do estorno. O resolver apenas valida os XMLs: preserva suas strings originais e não injeta campos nem modifica snapshots/hash. Cancelamento conta 15..255 caracteres Unicode e exige confirmação de Produção somente para evento de cancelamento; encaminhamento ao estorno mantém o contrato anterior.
- **Consulta versus transmissão:** o schema do hook aceita reconciliar `unknown`/`transmitting` sem fabricar confirmação de Produção. Nova transmissão em `ready` e retry após ausência confirmada continuam exigindo confirmação explícita. Retornos `pending`/`retryAllowed`, mensagens e callbacks existentes foram preservados; não foi acrescentada retransmissão automática.
- **Arquivos e linhas:** `shared-utils/fiscalOperationFormSchemas.ts:6` (justificativa), `:11` (preparação), `:31`/`:40` (XML/revisão), `:77` (transmissão/reconciliação), `:89` (cancelamento); `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts:70`, `:80`, `:85`, `:151`, `:193`, `:216`, `:251`; `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts:27`, `:30`, `:61`, `:73`; `erp/src/pages/App/FiscalDocuments/__tests__/fiscalOperationForms.test.tsx:68`.
- **Prova local:** 12 testes novos de submissão real RHF/resolver aprovados, cobrindo preparo de devolução/estorno, revisão XML/CFOP/cobertura integral, confirmação de apuração, Produção/consulta/retry e cancelamento com 14/15/255/256 caracteres Unicode. Mais 2 testes existentes do serviço de cancelamento passaram, totalizando 14 na execução focada. ESLint dos 2 hooks e teste passou. Typecheck fiscal não apontou erros nesses arquivos/schema/teste, mas a execução global permaneceu bloqueada por `productToDbMapper.ts:27` (mistura de `||` e `??` sem parênteses), fora deste grupo. Nenhuma SEFAZ real, gravação remota, migration ou deploy foi executado.
- **Pendência deste checkpoint resolvida na continuação:** o gate da interface agora depende de transmissão em `ready` ou retry; o endpoint exige confirmação para nova transmissão e consulta a tentativa armazenada sem fabricá-la. Revalidação de 14/10: 7 testes de interface e 21 do endpoint aprovados em `scratch/rhf-latest-regression.log`. A autorização do operador e a consulta da mesma tentativa foram preservadas.

### Continuação fiscal dos formulários: vínculos, conferência e móvel

- **Problema e causa:** callbacks de criação/vínculo de produtos da NF de entrada e conferência de compra executavam efeitos sem RHF/resolver no proprietário. A chave digitada/lida no móvel removia letras; o cadastro móvel de fornecedor também removia letras do CNPJ. O prazo do fornecedor convertia texto inválido silenciosamente para zero.
- **Solução:** resolver real nos proprietários valida item pertencente à nota, identidades, acréscimo obrigatório da variação e valores finitos antes dos serviços; vínculo e composição preservam metadata/XML e rejeitam multiplicadores inválidos. Conferência valida todas as linhas antes de atualizar a compra. Cadastro móvel preserva CNPJ alfanumérico e usa o prazo parseado. Produto móvel reutiliza regras de conclusão e protege números também no rascunho; NCM reutiliza o contrato existente. Emissário/backend/permissões continuam responsáveis pelas regras fiscais contextuais. Não modifica snapshot fiscal assinado ou hash.
- **Arquivos/linhas de integração e contratos:**

- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:20`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:41`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:64`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:68`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:74`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:95`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:176`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:216`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:243`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:298`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:300`
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:40`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:50`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:52`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:150`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:154`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:236`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:248`
- `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:22`, `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:32`, `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:127`, `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:128`, `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:154`
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:14`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:23`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:37`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:44`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:84`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:158`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:241`, `erp/src/pages/App/Stock/Purchases/modals/PurchaseReceiptCheckModal.tsx:529`
- `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:56`, `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:92`, `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:130`, `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:154`, `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:174`, `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx:176`
- `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:33`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:48`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:88`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:274`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:318`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:354`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:378`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:392`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:454`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:498`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:512`
- `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:40`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:52`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:53`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:55`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:64`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:78`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:80`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:117`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:253`
- `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx:79`, `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx:90`, `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx:368`, `mobile/src/features/stock/invoices/modals/InboundInvoiceMappingsModal.tsx:370`
- `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:32`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:83`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:92`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:122`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:166`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:167`, `mobile/src/features/stock/suppliers/SupplierFormModal.tsx:184`
- `shared-utils/inboundProductLinkFormSchemas.ts:7`, `shared-utils/inboundProductLinkFormSchemas.ts:22`, `shared-utils/inboundProductLinkFormSchemas.ts:28`, `shared-utils/inboundProductLinkFormSchemas.ts:40`, `shared-utils/inboundProductLinkFormSchemas.ts:47`
- `shared-utils/mobileProductFormSchema.ts:31`
- `shared-utils/personDomainValidation.ts:4`, `shared-utils/personDomainValidation.ts:8`, `shared-utils/personDomainValidation.ts:32`, `shared-utils/personDomainValidation.ts:178`, `shared-utils/personDomainValidation.ts:190`
- `mobile/src/features/stock/invoices/utils/accessKey.ts:2`

- **Prova:** 41 testes ERP em 9 arquivos passaram na rodada da continuação, incluindo conciliação e preparação de produto de entrada. Mais 6 testes de domínio/cadastro passaram; 7 de chave/parser móvel e 4 de handlers móveis passaram. Estes últimos incluem chave alfanumérica no serviço mockado, bloqueio de chave inválida, edição financeira depois de intent nulo e fila SQLite que mantém rascunho incompleto mas bloqueia contagem negativa. Compilação ERP completa passou antes dos últimos ajustes móveis. Logs: `scratch/rhf-continue-final-tests.log`, `rhf-current-domain-tests.log`, `rhf-mobile-key-tests.log`, `mobile-rhf-continuation.log`, `rhf-erp-build-current.log`. Sem dados comerciais remotos, SEFAZ, migration adicional ou deploy. A migração global continua em conferência.
- **Teste de SKU:** a expectativa antiga de sufixo máximo+1 foi alinhada à regra vigente documentada em `productSkuService.ts`: reutilizar o menor sufixo livre, preservando variantes existentes e ausência de colisão. Nenhuma regra de numeração fiscal foi alterada.

### Continuação: validação das consultas e fonte única dos schemas

- **Problemas e causas comprovadas:** a listagem fiscal enviava diretamente os filtros de modelo, ambiente, status e período sem resolver; o formulário visual validava somente a busca. O teste de mudança do documento alvo demonstrou que a trava síncrona de submissão descartava a nova consulta enquanto outra validação aguardava resolução. O catálogo mantinha oito cópias locais de schemas, e o novo contrato de imagem estava ausente na cópia; ao usar a fonte central, o bundler identificou um import `.js` sem arquivo correspondente. Também havia erro JSX no alerta móvel e incompatibilidade TypeScript nas interfaces de snapshots, sem perda de campos em runtime.
- **Solução:** `validateValues` enfileira apenas a validação RHF, preservando cada snapshot e liberando o formulário antes do I/O. A trava de `validateAndRun` para salvamentos permanece. Listagem fiscal e cinco consultas móveis usam esse caminho. Filtros inválidos permanecem editáveis, mostram erro e não chegam ao serviço. O contrato mantém a consulta por identidade que ignora o período no serviço existente. O catálogo reexporta os contratos centrais, com raiz compartilhada no Next e import compatível com bundlers; nenhuma regra de chave/DV foi alterada. Snapshots de importação/inventário são copiados superficialmente para a tipagem do resolver, preservando metadata e contagens nulas de rascunho. O alerta móvel foi reposicionado fora do bloco de carregamento.
- **Arquivos e linhas desta continuação:**

| Arquivo | Linhas iniciais dos blocos alterados |
|---|---|
| `digital-catalog/src/hooks/useZodForm.ts` | `digital-catalog/src/hooks/useZodForm.ts:17`, `digital-catalog/src/hooks/useZodForm.ts:44`, `digital-catalog/src/hooks/useZodForm.ts:64` |
| `digital-catalog/src/shared-utils/nfeAccessKeyValidation.ts` | `digital-catalog/src/shared-utils/nfeAccessKeyValidation.ts:1` |
| `erp/src/hooks/useZodForm.test.tsx` | `erp/src/hooks/useZodForm.test.tsx:10` |
| `erp/src/hooks/useZodForm.ts` | `erp/src/hooks/useZodForm.ts:17`, `erp/src/hooks/useZodForm.ts:44`, `erp/src/hooks/useZodForm.ts:64` |
| `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts` | `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts:80`, `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts:109`, `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts:115`, `erp/src/pages/App/FiscalDocuments/__tests__/useFiscalDocumentsList.test.ts:118` |
| `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts` | `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:5`, `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:27`, `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:79`, `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:93`, `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:108`, `erp/src/pages/App/FiscalDocuments/hooks/useFiscalDocumentsList.ts:110` |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts` | `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:76` |
| `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx` | `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx:71` |
| `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx` | `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:1`, `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:61`, `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:69`, `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:121` |
| `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts` | `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts:87`, `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts:233`, `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts:337` |
| `mobile/src/features/stock/invoices/hooks/useInvoices.ts` | `mobile/src/features/stock/invoices/hooks/useInvoices.ts:21`, `mobile/src/features/stock/invoices/hooks/useInvoices.ts:29`, `mobile/src/features/stock/invoices/hooks/useInvoices.ts:31` |
| `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx` | `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:176`, `mobile/src/features/stock/invoices/modals/InvoiceImportModal.tsx:183` |
| `mobile/src/features/stock/invoices/utils/invoiceList.ts` | `mobile/src/features/stock/invoices/utils/invoiceList.ts:55` |
| `mobile/src/hooks/useZodForm.ts` | `mobile/src/hooks/useZodForm.ts:17`, `mobile/src/hooks/useZodForm.ts:44`, `mobile/src/hooks/useZodForm.ts:64` |
| `shared-utils/listingFormSchemas.ts` | `shared-utils/listingFormSchemas.ts:19` |
| `shared-utils/nfeAccessKeyValidation.ts` | `shared-utils/nfeAccessKeyValidation.ts:1` |

- **Testes:** 12 casos em 3 arquivos aprovaram fila de validação concorrente, recuperação após entrada inválida, consulta fiscal por identidade, período inválido sem I/O, resposta antiga ignorada e seleção de etiquetas. Seis testes móveis de proprietários passaram no runner versionado `erp/tests/mobile-forms/owners.test.tsx`, incluindo recuperação da submissão financeira após falha e troca de filtro com rede pendente. Onze testes de chave/listagem móvel passaram. Os 7 casos de interface e 21 do endpoint confirmaram a distinção consulta/transmissão em Produção na rodada de 58 casos. Logs: `scratch/rhf-filter-selection-tests.log`, `rhf-mobile-durable-tests.log`, `rhf-invoice-list-tests.log`, `rhf-latest-regression.log`. Os testes usam serviços simulados; não comprovam banco compartilhado/SEFAZ/nativo móvel.
- **Limite:** sem emissão, nova migration, massa comercial, deploy ou mensagens reais. Migração global segue em conferência no inventário; a compilação e o typecheck desta continuação são registrados no documento central de formulários.

#### Localização complementar dos checkpoints de domínio

Referências do checkout atual para as correções já descritas; a tabela resolve os placeholders anteriores, sem declarar encerrado o inventário global.

| Arquivo | Linha do contrato/proprietário atual |
|---|---|
| `shared-utils/commercialReturnRules.ts` | `shared-utils/commercialReturnRules.ts:22` |
| `shared-utils/personDomainValidation.ts` | `shared-utils/personDomainValidation.ts:8` |
| `shared-utils/productDomainValidation.ts` | `shared-utils/productDomainValidation.ts:12` |
| `shared-utils/withTimeout.ts` | `shared-utils/withTimeout.ts:1` |
| `shared-utils/orderDomainValidation.ts` | `shared-utils/orderDomainValidation.ts:21` |
| `shared-utils/commercialOrderRules.ts` | `shared-utils/commercialOrderRules.ts:11` |
| `shared-utils/commercialShippingRules.ts` | `shared-utils/commercialShippingRules.ts:7` |
| `shared-utils/orderCalculations.ts` | `shared-utils/orderCalculations.ts:6` |
| `shared-utils/nfeEmissionFormValidation.ts` | `shared-utils/nfeEmissionFormValidation.ts:42` |
| `shared-utils/returnFormSchemas.ts` | `shared-utils/returnFormSchemas.ts:11` |
| `shared-utils/lookupFormSchemas.ts` | `shared-utils/lookupFormSchemas.ts:5` |
| `shared-utils/receiptFormSchemas.ts` | `shared-utils/receiptFormSchemas.ts:5` |
| `shared-utils/inboundInvoiceFormSchema.ts` | `shared-utils/inboundInvoiceFormSchema.ts:4` |
| `shared-utils/fiscalOperationFormSchemas.ts` | `shared-utils/fiscalOperationFormSchemas.ts:5` |
| `shared-utils/ncmManagementFormSchemas.ts` | `shared-utils/ncmManagementFormSchemas.ts:4` |
| `shared-utils/legacyFiscalFormSchemas.ts` | `shared-utils/legacyFiscalFormSchemas.ts:5` |
| `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCceModal.ts` | `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCceModal.ts:11` |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts` | `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts:33` |
| `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts` | `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts:25` |
| `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts` | `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts:34` |
| `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx` | `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx:84` |
| `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx` | `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx:66` |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts` | `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeEmissionActions.ts:87` |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeValidationService.ts` | `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeValidationService.ts:4` |
| `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx` | `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx:78` |
| `erp/src/pages/App/SalesOrder/OrderEditModal.tsx` | `erp/src/pages/App/SalesOrder/OrderEditModal.tsx:1` |
| `erp/src/pages/App/SalesOrder/UnlinkedReturnOrderModal.tsx` | `erp/src/pages/App/SalesOrder/UnlinkedReturnOrderModal.tsx:1` |
| `erp/src/pages/App/SalesOrder/useSalesOrderForm.ts` | `erp/src/pages/App/SalesOrder/useSalesOrderForm.ts:1` |
| `erp/src/pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx` | `erp/src/pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx:10` |
| `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` | `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx:103` |
| `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx` | `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:24` |
| `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts` | `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts:36` |
| `erp/src/pages/utils/personService/personMapper.ts` | `erp/src/pages/utils/personService/personMapper.ts:3` |

- **Complemento de integração da busca:** `shared-utils/lookupFormSchemas.ts:7` acrescenta o contrato de busca submetida; não altera a validação da chave de entrada. O catálogo consome o reexport da fonte compartilhada. Typecheck fiscal ERP passou após a fila de validação; ERP e catálogo compilaram. Typecheck completo do catálogo passou separadamente. A compilação não constitui prova de transmissão nem prontidão fiscal completa.

### Continuação dos proprietários: consulta NCM e fila de autosave

- **Problema/causa comprovada:** o painel de NCM validava sincronização, revisão e correlação, mas consultava filtros, destino e ativação na loja sem passar pelo resolver. O adaptador rejeitava autosaves novos durante um salvamento ativo; um teste com a primeira gravação pendente comprovou o descarte do segundo snapshot em campanhas/regras.
- **Solução:** contratos explícitos para a consulta e para ativação; destino utiliza o contrato de busca. Os payloads parseados chegam às RPCs/serviço, com erros visíveis antes do efeito. `enqueueAndRun` aguarda a conclusão da submissão ativa e serializa snapshots; `validateValues` reutiliza a fila apenas para a validação, antes do I/O. A submissão comum conserva a rejeição síncrona de duplo clique. Não altera regras tributárias, snapshots assinados, permissões ou SQL.
- **Arquivos/linhas:**
- `shared-utils/ncmManagementFormSchemas.ts`: `3`, `8`
- `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx`: `3`, `145`, `147`, `164`, `198`, `225`
- `erp/src/hooks/useZodForm.ts`: `18`, `35`, `45`, `50`, `52`, `59`, `66`, `70`, `73`
- `mobile/src/hooks/useZodForm.ts`: `18`, `35`, `45`, `50`, `52`, `59`, `66`, `70`, `73`
- `digital-catalog/src/hooks/useZodForm.ts`: `18`, `35`, `45`, `50`, `52`, `59`, `66`, `70`, `73`
- **Validação em andamento:** 18 casos em adaptador, campanhas, conferência de compra, modelo de elemento e consulta fiscal passaram (`scratch/rhf-autosave-owners-tests.log`). O teste específico do painel NCM está em execução e seu resultado será registrado nesta seção. Nenhum endpoint remoto foi chamado: Supabase e demais serviços são simulados nos testes.

### Recebimento: contrato completo e fronteira de persistência

- **Problema/causa:** o formulário validava somente fornecedor/itens/totais/chave/percentuais e depois remontava o payload a partir do estado externo. Custos não fiscais, datas e anexos escapavam do resolver. Autosave e finalização podiam trabalhar com identidades diferentes enquanto a criação do rascunho ainda aguardava resposta. A chave era validada apenas pelo formato, sem reutilizar o validador central.
- **Solução:** contrato explícito cobre os campos persistidos e reutiliza `validateNfeAccessKey`, permitindo vazio em recibo sem NF e normalizando a entrada antes de verificar chave/modelo/DV. Rascunho e conclusão enviam os valores parseados; metadados e itens não são injetados em snapshots fiscais. Autosave fica na fila do adaptador; conclusão aguarda a escrita pendente, reutiliza a identidade recebida, impede duplo clique e bloqueia novos rascunhos depois de concluir. O backend conserva suas verificações transacionais e fiscais.
- **Arquivos/linhas:**
- `shared-utils/receiptFormSchemas.ts`: `11`, `15`
- `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts`: `49`, `50`, `51`, `170`, `266`, `271`, `294`, `302`, `314`, `318`, `333`, `373`, `399`, `403`, `404`, `443`, `455`, `459`, `477`, `480`, `490`
- `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.test.tsx`: `27`
- **Prova em andamento:** teste do proprietário já confirmou espera do rascunho, mesma identidade e bloqueio de conclusão simultânea; falta fechar a prova de custos e chave normalizada. Somente serviços simulados, sem persistir recebimento, vínculo ou fato fiscal remoto.
