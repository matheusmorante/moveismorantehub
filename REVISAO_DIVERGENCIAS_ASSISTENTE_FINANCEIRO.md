# REVISÃO PÓS-AUDITORIA — DIVERGÊNCIAS DE REGRA E RISCOS DO ASSISTENTE FINANCEIRO

---

## 1. TABELA CONSOLIDADA DE DIVERGÊNCIAS E RISCOS TÉCNICOS

| ID | REGRA ESPERADA | COMPORTAMENTO DO RUNTIME | STATUS | EVIDÊNCIA | ARQUIVO / FUNÇÃO | SEVERIDADE |
|---|---|---|:---:|---|---|:---:|
| **DIV-001** | **Voz Contínua Sem Timeout Automático**: O microfone permanece ativo indefinidamente capturando falas até ação explícita do usuário (Parar/Cancelar). | `MAX_VOICE_INACTIVITY_MS = 15000` (15s) encerra a sessão de voz e desliga o microfone para `'IDLE'` se houver 15s de silêncio absoluto. | **DECISÃO DE NEGÓCIO NECESSÁRIA** | `inactivityTimerRef.current = setTimeout(..., 15000)` encerra o ditado após 15s sem fala. | `FinancialAiChatView.tsx`<br>`handleStartVoice` (L343-L357) | **MÉDIA** |
| **DIV-002** | **Multi-fato N-Drafts no Payload**: Lote de $N$ fatos deve ser puramente representado pelo array `batchDraftsList`. | O objeto wrapper principal `mainDraft` copia os campos de nível superior (`amount`, `description`, `categoryName`, etc.) do **primeiro item** (`realizedBatch[0]`). | **RISCO TÉCNICO** | `amount: realizedBatch[0].amount`, `description: realizedBatch[0].description` no objeto pai. | `financialIntentValidator.ts`<br>`processFinancialInput` (L687-L695) | **ALTA** |
| **DIV-003** | **Idempotência Atômica no Banco**: Proteção contra transações duplicadas por duplo clique ou instabilidade de rede. | Consulta `SELECT notes WHERE notes = 'IDEMPOTENCY_...'`. Sem `UNIQUE` constraint no Postgres. Suscetível a race conditions simultâneas. | **RISCO TÉCNICO** | `eq('notes', 'IDEMPOTENCY_${idempotencyKey}')`. Não há índice/constraint UNIQUE na coluna `notes`. | `mobileFinanceService.ts`<br>`confirmFinancialDraft` (L508-L522) | **ALTA** |
| **DIV-004** | **Atomicidade de Batch em Confirm**: A confirmação de um lote com $N$ rascunhos deve ser atômica (rollback de todos se um falhar). | A confirmação de rascunhos em lote executa requisições HTTP individuais por item. Se B falhar, A e C permanecem gravados no banco. | **RISCO TÉCNICO** | `handleConfirmRegisterSingle` executa `createFinancialTransaction` por item isolado. | `FinancialAiChatView.tsx`<br>`handleConfirmRegisterSingle` (L496-L520) | **MÉDIA** |
| **DIV-005** | **Remoção Completa de Lógica Legada de Parcelas/Recorrência**: O assistente deve lidar apenas com lançamentos individuais realizados. | O validador desativa `INSTALLMENT`, mas `confirmFinancialDraft` ainda possui o fluxo legados ativo que cria parcelas `PENDING` e marca `is_recurring`. | **CÓDIGO LEGADO / RISCO** | `if (draft.intentType === 'INSTALLMENT')` cria múltiplos registros pendentes no Supabase. | `mobileFinanceService.ts`<br>`confirmFinancialDraft` (L540-L586) | **MÉDIA** |
| **DIV-006** | **Zero Conversão de `amount` Nulo**: `amount: null` jamais deve virar zero em nenhuma camada do pipeline. | O validador bloqueia confirmação, mas ao chamar `createFinancialTransaction`, usa a expressão `amount: draft.amount \|\| 0`. | **RISCO TÉCNICO** | `amount: draft.amount \|\| draft.totalAmount \|\| 0` converte `null` para `0` antes de enviar à API. | `mobileFinanceService.ts` (L594)<br>`FinancialAiChatView.tsx` (L501) | **MÉDIA** |
| **DIV-007** | **Ordem da Pipeline (Determinístico vs LLM)**: Definição clara da sequência de execução. | `classifyMultiTurnIntent` e `trySlotFillingFallback` executam **antes** do Gemini LLM. Se Gemini retornar, passa por `validateParsedIntent`. | **COMPORTAMENTO CORRETO** | `applyTurnPatch` -> `parseFinancialIntentWithGemini` -> `validateParsedIntent`. | `FinancialAiChatView.tsx` (L243-L270) | **INFO** |
| **DIV-008** | **Preview = Persistência**: O payload salvo nasce estritamente do draft exibido no preview. | O payload vem do draft do preview sem re-parsing. Porém, se campos como `purpose` ou `category` forem nulos, aplica defaults de última hora (`BUSINESS`, `Despesa não classificada`). | **COMPORTAMENTO CORRETO / DEFAULTS** | `purpose: draft.purpose \|\| 'BUSINESS'`, `category_name: draft.categoryName \|\| 'Despesa não classificada'`. | `mobileFinanceService.ts`<br>`confirmFinancialDraft` (L592-L611) | **BAIXA** |
| **DIV-009** | **Proibição de Invenção de Forma de Pagamento**: Termo *"cartão"* genérico não pode ser inferido. | `"cartão"` genérico vira `paymentMethod: 'UNKNOWN'`, exigindo escolha entre débito e crédito. Única inferência autorizada: banco $\to$ `'Transferência bancária'`. | **COMPORTAMENTO CORRETO** | `isGenericCard` força `paymentMethod = 'UNKNOWN'`. Empréstimo bancário atribui `'Transferência bancária'`. | `financialIntentValidator.ts` (L335-L343)<br>(L205-L208) | **INFO** |

---

## 2. ANÁLISE DETALHADA DAS 10 ÁREAS AUDITADAS

### 1. Voz Contínua (`AUTO_SEND_SILENCE_MS` vs `MAX_VOICE_INACTIVITY_MS`)
- **Regra Original de Voz Contínua**: O microfone deve permanecer ligado (`LISTENING`) capturando trecho por trecho com auto-envio após 3s de silêncio (`AUTO_SEND_SILENCE_MS = 3000`), sendo encerrado **exclusivamente por ação explícita do usuário** (clicar em Parar, Cancelar ou equivalente).
- **Runtime Atual**: Foi adicionado o timer `MAX_VOICE_INACTIVITY_MS = 15000` (15 segundos) em `FinancialAiChatView.tsx`. Se o usuário permanecer 15 segundos em silêncio absoluto (sem nenhuma fala), a função `handleFinishVoice` / `handleCancelVoice` é chamada e o microfone desliga para `'IDLE'`.
- **Análise**: Esta implementação atendeu à solicitação em áudio enviada pelo usuário na etapa anterior (*"faça com que se passar 15 segundos sem falar encerre o ditado"*). Contudo, tecnicamente diverge da especificação inicial de voz contínua pura.
- **Status**: `DECISÃO DE NEGÓCIO NECESSÁRIA` — Definir se o timeout de 15s permanece como proteção contra consumo de bateria/estresse de ASR ou se deve ser removido em favor da escuta 100% ininterrupta.

---

### 2. Pipeline Determinístico vs LLM (Gemini 2.5 Flash)
- **Ordem Real de Execução no Runtime**:
  1. **Classificação de Turno (Determinística Local)**: `classifyMultiTurnIntent` determina se a nova frase é `CORRECTION`, `ANSWER_TO_QUESTION`, `CONTINUATION` ou `NEW_TRANSACTION`.
  2. **Slot-Filling Incremental (Determinístico Local)**: `applyTurnPatch` roda `trySlotFillingFallback`. Se preencher a lacuna com sucesso e for continuação/resposta, o retorno é utilizado.
  3. **Consulta/Match de Contas no ERP (Determinístico Local)**: Se contiver palavras como *"bechara"*, *"consulta aí"*, *"não lembro"*, busca direto em `fetchPayableAccounts`.
  4. **Chamada ao Gemini 2.5 Flash (IA)**: Caso seja um lançamento novo ou haja incerteza, envia o prompt estruturado com histórico e rascunho ativo via HTTP POST para a API do Gemini.
  5. **Validador Determinístico do Backend (`validateParsedIntent`)**: Todo retorno do Gemini obrigatoriamente passa por este validador para ter totais recalculados, categorias veiculares ajustadas (`Combustível`, `Manutenção de Veículos`) e finalidade de gasto validada.
  6. **Fallback Heurístico Determinístico**: Se a chave Gemini falhar, der timeout ou não existir, entra em ação o `fallbackHeuristicParser`.

- **Mapeamento de Processamento por Campo**:
  - `multi-turn` / `correction`: **100% Determinístico Local** (executa antes da IA).
  - `amount`: **Gemini primeiro** $\to$ Validador/Fallback regex (`parsePtBrNumber` + extenso + centavos).
  - `paymentMethod`: **Gemini primeiro** $\to$ Validador força `UNKNOWN` para cartão genérico e infere Transferência para bancos.
  - `realization`: **Determinístico prevalece** (`isRealizedPayment` vs `isFutureOrCommitment` no validador).
  - `businessPurpose` / `category`: **Validador prevalece** (força `BUSINESS` para combustível/oficina e `UNKNOWN` para despesas ambíguas sem indicação de loja/casa).
  - `date`: **Gemini primeiro** $\to$ Fallback resolve `hoje`, `ontem`, `dia X`.
  - `counterparty`: **Gemini primeiro** $\to$ Fallback extrai por regex de fornecedores conhecidos.

- **Status**: `COMPORTAMENTO CORRETO` — O pipeline híbrido prioriza correções locais rápidas e submete todas as respostas de IA à validação determinística de regras.

---

### 3. Idempotência (`IDEMPOTENCY_${key}`)
- **Análise do Runtime**:
  - Em `mobileFinanceService.ts`, a função `confirmFinancialDraft` recebe um `idempotencyKey` opcional e executa:
    ```typescript
    const { data: existing } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('notes', `IDEMPOTENCY_${idempotencyKey}`)
      .limit(1);
    ```
- **Riscos identificados**:
  1. **Ausência de Constraint no Banco de Dados**: A coluna `notes` na tabela `financial_transactions` do Supabase é um campo de texto comum e **não possui constraint UNIQUE**.
  2. **Race Condition em Requisições Simultâneas**: Se o usuário der dois toques rápidos no botão ou a rede enviar duas requisições paralelas no mesmo milissegundo, ambas farão o `SELECT` antes que o primeiro `INSERT` termine. Ambas obterão `existing.length === 0` e ambas criarão registros duplicados no banco!
  3. **Vulnerabilidade a Edições no Banco/UI**: Se a coluna `notes` for editada em algum momento pelo operador ou por outra rotina do ERP, a string `IDEMPOTENCY_...` será sobrescrita, desativando a proteção para aquele registro.

- **Status**: `RISCO TÉCNICO (ALTO)` — Recomenda-se futuramente adicionar uma constraint única no banco ou criar uma tabela/coluna dedicada de idempotência.

---

### 4. Atomicidade de Batch (Confirmação em Lote)
- **Análise do Runtime**:
  - Quando um rascunho possui múltiplos fatos em `batchDraftsList` (ex: 3 itens: A, B, C), a interface `FinancialAiChatView.tsx` renderiza cards individuais ou botões de confirmação.
  - Ao confirmar, o sistema chama `handleConfirmRegisterSingle` ou insere item por item individualmente chamando `createFinancialTransaction`.
- **Comportamento no cenário de falha parcial**:
  - Se o item A for salvo com sucesso, o item B falhar (ex: erro de validação ou timeout) e o item C for confirmado em seguida:
    - Item A: **Permanecerá salvo** no Supabase.
    - Item B: **Falhou** (permanece na lista de rascunhos pendentes na UI para ajuste/retry).
    - Item C: **Permanecerá salvo** no Supabase.
- **Conclusão**: O lote de rascunhos **NÃO possui atomicidade de transação de banco de dados (`BEGIN / ROLLBACK`)**. A confirmação opera de forma individual e resiliente por item.

- **Status**: `RISCO TÉCNICO (MÉDIO)` / `COMPORTAMENTO ATUAL` — O comportamento atual é isolado por item, o que previne perda total de trabalho, mas não oferece rollback global automático.

---

### 5. Preview = Persistência
- **Análise do Runtime**:
  - **Confirmado**: O payload gravado no Supabase nasce diretamente do objeto `draft` aprovado no preview. Não é feita nenhuma chamada de re-parsing de texto ou re-classificação por IA no instante do clique no botão **Confirmar**.
- **Observação sobre Defaults de Persistência**:
  - Se algum campo opcional estiver omisso no draft no momento da gravação, a função `confirmFinancialDraft` aplica fallbacks conservadores de banco:
    - `purpose`: se `null`, salva `'BUSINESS'`.
    - `category_name`: se `null`, salva `'Despesa não classificada'` (ou `'Outras receitas'`).
    - `date`: se `null`, salva a data de hoje `YYYY-MM-DD`.
    - `origin`: salva `'AI_ASSISTANT'`.

- **Status**: `COMPORTAMENTO CORRETO` com `DEFAULTS DE BANCO`.

---

### 6. Batch como Fonte de Verdade (`batchDraftsList[0]`)
- **Análise do Runtime**:
  - Ao processar uma mensagem com múltiplos fatos em `financialIntentValidator.ts` (`processFinancialInput`), a função monta o objeto rascunho pai da seguinte forma:
    ```typescript
    const mainDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: multipleFacts[0].type,
      amount: multipleFacts[0].amount,
      description: multipleFacts[0].description,
      categoryName: multipleFacts[0].categoryName,
      paymentMethod: multipleFacts[0].paymentMethod,
      businessPurpose: multipleFacts[0].businessPurpose,
      batchDraftsList: multipleFacts,
      ...
    };
    ```
- **Risco Identificado**:
  - O rascunho pai copia os atributos de nível superior (`amount`, `description`, `categoryName`, etc.) do **primeiro fato do lote** (`multipleFacts[0]`).
  - Se qualquer componente visual antigo, hook de integração ou relatórios ler `pendingIntent.amount` ou `pendingIntent.description` diretamente em vez de iterar sobre `pendingIntent.batchDraftsList`, o sistema colapsará o lote exibindo/processando apenas a primeira movimentação.

- **Status**: `RISCO TÉCNICO (ALTO)` — Recomenda-se garantir que todos os leitores de rascunho verifiquem prioritariamente a presença de `batchDraftsList`.

---

### 7. Transações Futuras / Parcelamento / Recorrência
- **Análise do Runtime**:
  - A regra de negócio principal estabelece que o assistente trata apenas lançamentos realizados (`isRealized = true`). O validador `validateParsedIntent` força `result.intentType = 'SINGLE_TRANSACTION'`.
- **Presença de Código Legado no Serviço**:
  - No arquivo `mobileFinanceService.ts`, a função `confirmFinancialDraft` **ainda mantém blocos de código totalmente funcionais** para:
    - `draft.intentType === 'INSTALLMENT'`: gera inserção em lote de parcelas com `status: 'PENDING'`.
    - `draft.intentType === 'PAYABLE_BILL'`: gera transação com `status: 'PENDING'`.
    - `draft.intentType === 'RECURRING'`: grava com `is_recurring: true`.

- **Status**: `CÓDIGO LEGADO ATIVO / RISCO MÉDIO` — Embora o validador bloqueie a criação desses tipos de intent, o código legado de persistência para parcelamento e agendamento pendente continua vivo no serviço.

---

### 8. Invariante de Valor Monetário (`amount UNKNOWN`)
- **Análise do Runtime**:
  - O validador `validateParsedIntent` **não** atribui zero a valores nulos; ele adiciona `'amount'` a `missingFields` e define `isReadyForConfirmation = false`.
  - O card de preview em `TransactionPreviewCard.tsx` exibe `"Valor não informado"` e desabilita a confirmação se o valor for nulo.
- **Risco Encontrado em Funções de Persistência**:
  - Na chamada de confirmação isolada (`FinancialAiChatView.tsx`, L501 e `mobileFinanceService.ts`, L594), são utilizadas as expressões:
    `amount: draftToRegister.amount || 0` e `amount: draft.amount || draft.totalAmount || 0`.
  - **Efeito prático**: Embora a função `createFinancialTransaction` possua uma trava que rejeita `amount <= 0` com a mensagem de erro *"O valor da movimentação deve ser maior que zero"*, a expressão `|| 0` converte o `null` para `0` antes de enviar à API, dependendo da segunda trava para impedir o salvamento.

- **Status**: `RISCO TÉCNICO (MÉDIO)` — O valor zero é bloqueado antes do Supabase, mas a conversão intermediária `null || 0` deve ser sanitizada.

---

### 9. Formas de Pagamento e Inferências (`paymentMethod`)
- **Análise do Runtime**:
  - **Cartão Genérico**: Quando o usuário diz apenas *"cartão"*, `financialIntentValidator.ts` força `paymentMethod = 'UNKNOWN'`, desabilita a confirmação e emite a pergunta: *"Foi no cartão de débito ou de crédito?"*.
  - **Forma de Pagamento Ausente**: Se o usuário não informar nada, o sistema não inventa o método, força `'UNKNOWN'` e pergunta a forma de pagamento/recebimento.
  - **Confirmação Bloqueada**: O serviço `confirmFinancialDraft` valida `rawPaymentMethod` e recusa a gravação se for `'UNKNOWN'` ou vazio.
  - **Única Inferência Autorizada**: Em empréstimos onde o credor é uma instituição financeira (banco, Itaú, Bradesco), o sistema infere automaticamente `paymentMethod = 'Transferência bancária'`.

- **Status**: `COMPORTAMENTO CORRETO` — Respeita estritamente a proibição de invenção de formas de pagamento.

---

## 3. CLASSIFICAÇÃO FINAL DOS ACHADOS

### 🔴 DIVERGÊNCIA CONFIRMADA / RISCOS ALTOS
1. **`DIV-002` (Risco de Colapso de Lote em Leitores Simples)**: O rascunho wrapper pai popula atributos raiz (`amount`, `description`) a partir de `batchDraftsList[0]`, gerando risco para componentes que não checam `batchDraftsList`.
2. **`DIV-003` (Ausência de Index UNIQUE para Idempotência)**: A checagem de idempotência via `notes` no Supabase não possui trava UNIQUE no banco, permitindo race conditions em cliques simultâneos.

### 🟡 RISCOS TÉCNICOS / CÓDIGO LEGADO (MÉDIOS)
1. **`DIV-004` (Falta de Transação Atômica em Lotes)**: Confirmação de lote salva item a item sem rollback global se o 2º ou 3º item falhar.
2. **`DIV-005` (Código Legado de Parcelamento e Contas a Pagar Ativo)**: `confirmFinancialDraft` mantém fluxos operacionais para `INSTALLMENT` e `PAYABLE_BILL` com `status: 'PENDING'`.
3. **`DIV-006` (Expressão `amount || 0` na Chamada de Persistência)**: Passagem de `0` como fallback intermediário para valores nulos antes da validação de limite.

### 🔵 DECISÃO DE NEGÓCIO NECESSÁRIA
1. **`DIV-001` (Timeout de 15s de Inatividade de Voz vs Voz Contínua Pura)**: O runtime atual possui desligamento automático do microfone após 15s de silêncio absoluto. Definir se esta regra (implementada conforme solicitação por áudio) deve ser mantida ou se a voz deve ser 100% ininterrupta.

### 🟢 COMPORTAMENTOS CORRETOS E CONFORMES
1. **`DIV-007` (Pipeline de IA e Validação Determinística)**: Correções e slot-filling locais rodam antes da IA, e todo retorno de IA passa por validação determinística de regras.
2. **`DIV-008` (Fidelidade Preview -> Persistência)**: O payload gravado é derivado diretamente do draft aprovado no preview sem re-parsing.
3. **`DIV-009` (Proibição de Invenção de Pagamento)**: Respeito total às regras de desambiguação de cartão e obrigatoriedade de forma de pagamento.
