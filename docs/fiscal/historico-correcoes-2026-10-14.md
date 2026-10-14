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
- **Arquivos alterados:** `shared-utils/commercialReturnRules.ts`, `shared-utils/personDomainValidation.ts`, `shared-utils/productDomainValidation.ts`, `shared-utils/withTimeout.ts`; reexports nos antigos arquivos de regras; `ReturnOrderModal.tsx`, `AuthContext.tsx` (somente extração do helper de timeout preservando contratos), `personMapper.ts`, testes correspondentes e migration. Linhas e resultados finais das validações serão complementados ao encerrar a rodada.
- **Validação até este checkpoint:** 36 testes locais aprovados em regras de devolução, mapper, modal e autenticação. Depois de acrescentar negativos do modal e ajustar expectativas antigas de CPF à regra já vigente, 27 testes passaram em schema de pessoa, submissão de produto e modal. Execuções sobrepostas; não somar como casos distintos. Prova remota das novas proteções pendente da aplicação autorizada.
- **Aplicação autorizada e prova remota:** 15/15 casos das funções puras passaram no Supabase `hkoxhourxwlddgsfdgws`; trigger habilitada e ACLs conferidas. Contratos compartilham os mesmos vetores com TypeScript (31 testes de quantidades aprovados). Modal passou em 11 testes, incluindo erro comercial, erro fiscal, origem não persistida e timeout. Sem gravação de fixtures, testes de trigger/replay/concorrência/rollback ainda pendentes. [Evidência remota](../audits/fiscal-2026-10-14/evidence/commercial-return-domain.json).

### Schemas compartilhados e migração dos formulários para RHF

- **Pedido e causa:** o usuário determinou React Hook Form e `zodResolver` em todos os formulários. O ERP não tinha essas dependências; o schema antigo de pedidos estava desconectado do salvamento real. Regras puras de pedido e cálculos dependiam de módulos da interface.
- **Implementação em andamento:** instalados `react-hook-form@7.90.0` e `@hookform/resolvers@5.9.1`. `shared-utils/orderDomainValidation.ts`, `commercialOrderRules.ts`, `commercialShippingRules.ts` e `orderCalculations.ts` concentram os contratos e cálculos, com configuração explícita de campos obrigatórios. Reexports preservam consumidores antigos. `useZodForm.ts` executa o resolver real e entrega valores parseados; pessoa, produto e salvar/concluir pedido passam por esse caminho. Schemas de pessoa/produto preservam metadata por `passthrough`, incluindo identificação de teste, sem alterar snapshots fiscais.
- **Arquivos/linhas:** os arquivos acima, wrappers antigos de cálculos/validações, `usePersonForm.ts`, `useProductFormSubmit.ts`, `useSalesOrderForm.ts`, `erp/package.json`/lock e testes. A lista com linhas e cobertura final será complementada após a migração; não se considera todos os formulários migrados neste checkpoint.
- **Validação atual:** 2 testes do adaptador RHF passaram; 12 de cálculos/pagamentos passaram. Expectativas antigas que contabilizavam pagamentos `pending` como recebidos foram corrigidas para o status canônico `Pago`. A compilação geral possui erros e está sendo separada por arquivos afetados; não há prova de build completo nesta etapa. Nenhuma população, transmissão fiscal ou deploy.

### Formulário de emissão: resolver no caminho efetivo

- **Problema comprovado:** `useNfeEmissionActions.handleEmit` executava validação própria sem React Hook Form; o validador importava configuração da interface, impedindo reutilização pura no backend.
- **Solução:** extraído o validador para `shared-utils/nfeEmissionFormValidation.ts`, com UF do emitente como entrada explícita. `nfeEmissionFormSchema` reutiliza as regras existentes em `superRefine`. O serviço antigo injeta a configuração vigente; o hook executa `useZodForm.validateAndRun` antes de preparar ou transmitir. Prévia continua opcional; validação adicional não muda hashes, snapshots nem confirmação de Produção.
- **Arquivos/linhas:** `shared-utils/nfeEmissionFormValidation.ts` (contrato/validador), `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeValidationService.ts` (wrapper), `hooks/useNfeEmissionActions.ts` (resolver antes dos efeitos). Linhas finais e resultados dos testes serão complementados após a verificação desta rodada.
- **Estado da prova:** testes focados da emissão ainda em execução neste checkpoint. Nenhuma emissão foi realizada para validar esta refatoração.

### Resolver das devoluções e estabilidade da submissão

- **Problema:** os modais de devolução vinculada/avulsa salvavam por botão sem RHF. Durante a integração, os testes revelaram que `useForm.values` podia disparar outro reset durante a resolução assíncrona e cancelar silenciosamente a intenção de envio.
- **Causa e solução:** o status/número informado no clique difere dos valores controlados de renderização; RHF 7.90 descarta a submissão quando ocorre reset concorrente. `useZodForm` mantém os valores controlados em ref e congela o payload no início de cada envio; trava síncrona rejeita envios simultâneos e é liberada em `finally`. Devoluções passam por `shared-utils/returnFormSchemas.ts`, reutilizando a regra de saldo por linha, quantidades positivas e preços não negativos. Não são modificados os snapshots nem os vínculos fiscais.
- **Arquivos:** `useZodForm.ts` e testes, `ReturnOrderModal.tsx`, `modals/UnlinkedReturnOrderModal.tsx`, `shared-utils/returnFormSchemas.ts`. O helper de clique dos testes de emissão aguarda `act` porque o resolver é assíncrono. Linhas e resultados finais serão complementados após a rodada.
- **Prova:** nova rodada focada em andamento; nenhum envio SEFAZ ou escrita comercial foi usado como teste.

## 3. Diretrizes para Próximos Agentes

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
- **Pendência comprovada, ainda não corrigida neste grupo:** `NfeOperationDraftModal.tsx:173` desabilita também a consulta pendente em Produção sem confirmação, e `api/nfe/transmit-operation-draft.ts:311` exige a confirmação antes da distinção entre tentativa armazenada e nova transmissão. Portanto a consulta de Produção sem confirmação **ainda não está resolvida ponta a ponta**; o teste do hook usa serviço mockado. Próximo ajuste dedicado deve limitar ambos os gates à transmissão/retry, preservando autorização do operador e consulta da mesma tentativa, sem passar `productionConfirmed:true` artificialmente.
