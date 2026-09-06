# AUDITORIA TÉCNICA E FUNCIONAL COMPLETA — ASSISTENTE FINANCEIRO IA MORANTE HUB

---

## 1. RESUMO EXECUTIVO E IDENTIFICAÇÃO DO MÓDULO

Esta auditoria documenta rigorosamente o funcionamento **real e atual** do módulo **Assistente Financeiro IA** no ecossistema Morante Hub (Mobile App + ERP).

O Assistente Financeiro é um assistente conversacional por texto e voz contínua projetado para operacionalizar lançamentos financeiros de entradas (receitas) e saídas (despesas), consultas ao contas a pagar e baixas operacionais no ERP Morante Hub.

### Regra de Ouro Arquitetural do Módulo
1. **Fatos Financeiros Realizados**: Somente movimentações reais já ocorridas (`isRealized = true`) geram registros no financeiro do ERP (`financial_transactions`).
2. **Zero Saídas Automáticas no Futuro**: Frases no futuro (*"vou pagar"*) ou intenções de compra parcelada/recorrente sem pagamento já efetuado (*"tenho 10 parcelas"*, *"pago todo mês"*) **NÃO** geram lançamentos realizados. O assistente orienta o usuário a registrar pagamentos efetivamente efetuados.
3. **Lote de Múltiplos Rascunhos (Batch-Aware)**: Uma única mensagem ou fala contendo $N$ fatos realizados independentes gera $N$ rascunhos (`batchDraftsList`), $N$ cards na UI e $N$ transações persistidas ao confirmar.

---

## 2. ARQUITETURA E MAPA DE ARQUIVOS

### Visão Geral de Responsabilidades

| Responsabilidade | Arquivo | Funções / Componentes Chave |
|---|---|---|
| **Interface do Usuário (UI)** | `mobile/src/features/finance/components/FinancialAiChatView.tsx` | Chat principal, gerenciamento de estado React, controle de gravação de voz contínua, renderização de cards e mensagens. |
| **Chips de Análise em Tempo Real** | `mobile/src/services/financial/draftAnalysisChips.ts` <br> `mobile/src/features/finance/components/chat/RealtimeDraftChips.tsx` | `buildDraftAnalysisChips`: Transforma rascunho(s) ativo(s) em pílulas visuais categorizadas (Entrada/Saída, Valor, Credor, Despesa, Forma de Pagamento, Data). |
| **Preview e Ações de Card** | `mobile/src/features/finance/components/TransactionPreviewCard.tsx` | Renderização visual de cards de transação (único ou em lote), botões de ação (Confirmar, Editar, Descartar/Ignorar). |
| **Modal de Edição Manual** | `mobile/src/features/finance/components/TransactionEditModal.tsx` | Formulário modal para ajuste manual de valor, descrição, categoria, forma de pagamento, finalidade e data de um draft. |
| **Validador de Regras de Negócio** | `mobile/src/services/financial/financialIntentValidator.ts` | `validateParsedIntent`, `extractMultipleFinancialFacts`, `processFinancialInput`, `buildGroupedQuestion`. Aplicação estrita de regras determinísticas de negócio e pareamento espacial. |
| **Slot-Filling Incremental** | `mobile/src/services/financial/financialSlotFilling.ts` | `trySlotFillingFallback`, `extractUnknownFieldsFromText`. Preenchimento incremental de lacunas e detecção de intenções de desconhecimento (*"não sei"*, *"não lembro"*). |
| **Classificador Multi-Turno** | `mobile/src/services/financial/multiTurnIntentClassifier.ts` | `classifyMultiTurnIntent`, `applyTurnPatch`, `applyTurnPatchWithDraftList`. Classificação entre `CORRECTION`, `ANSWER_TO_QUESTION`, `CONTINUATION`, `NEW_TRANSACTION`. |
| **Configuração de Voz** | `mobile/src/services/financial/voiceConfig.ts` | `AUTO_SEND_SILENCE_MS` (3000ms), `MAX_VOICE_INACTIVITY_MS` (15000ms), enums de estado de utterance e turno. |
| **Serviço Orquestrador de Voz/IA** | `mobile/src/services/financialAiAssistantService.ts` | `parseFinancialIntentWithGemini`, `fallbackHeuristicParser`, `extractLocalSemanticDelta`, `hasSignificantSemanticChange`, integração com API Gemini 2.5 Flash. |
| **Gravador de Voz Nativo / Web** | `mobile/src/services/voiceRecorderService.ts` | `startVoiceRecording`, `stopVoiceRecording`. Interface unificada com o motor de reconhecimento de fala da plataforma (ASR). |
| **Persistência de Dados (Supabase)** | `mobile/src/services/mobileFinanceService.ts` | `confirmFinancialDraft`, `createFinancialTransaction`, `payPayableAccount`, `fetchPayableAccounts`, `fetchFinancialCategories`. |
| **Parser de Números por Extenso** | `mobile/src/services/financial/wordToNumberPtBr.ts` | `parsePtBrWrittenNumbers`. Conversão de números escritos por extenso em português para `number`. |
| **Suíte de Testes de Regressão** | `erp/src/pages/utils/*.test.ts` (16 suítes) | 350 testes automatizados cobrindo invariantes, voz contínua, ASR, multi-fatos e regras de pagamento/categoria. |

---

## 3. FLUXO FUNCIONAL DO USUÁRIO (PASSO A PASSO)

```
[1. ENTRADA DE DADOS] (Texto digitado ou Fala de Voz Contínua)
       │
[2. OBTENÇÃO & ASR] (Transcrição com normalização de números e diacríticos)
       │
[3. EXTRAÇÃO DE FATOS] (extractMultipleFinancialFacts — segmentação por cláusula/pareamento espacial)
       │
[4. VERIFICAÇÃO DE REALIZAÇÃO] (isRealizedPayment: paguei, fiz um pagamento, recebi vs tenho/vou pagar)
       ├── SE NÃO REALIZADO: Cria Fato Informativo (rememberedUnrealizedFacts) → Pergunta de Confirmação de Pagamento
       └── SE REALIZADO: Gera Lote de Drafts (batchDraftsList)
               │
[5. CLASSIFICAÇÃO DE TURNO] (multiTurnIntentClassifier: NEW_TX, CORRECTION, ANSWER, CONTINUATION)
       │
[6. VALIDAÇÃO DETERMINÍSTICA] (financialIntentValidator: businessPurpose, paymentMethod, loan rules)
       │
[7. DETECÇÃO DE PENDÊNCIAS] (buildGroupedQuestion — formulação de perguntas para lacunas em lote/individual)
       │
[8. RENDERIZAÇÃO NA UI] (FinancialAiChatView preserva pendingIntent + TransactionPreviewCard exibe N cards)
       │
[9. ANÁLISE EM TEMPO REAL] (buildDraftAnalysisChips exibe pílulas visuais no cabeçalho do chat)
       │
[10. AÇÃO DO USUÁRIO] (Confirmar / Editar / Ignorar / Responder com nova fala)
       │
[11. PERSISTÊNCIA] (confirmFinancialDraft → inserção atômica no Supabase financial_transactions com IDEMPOTENCY)
```

---

## 4. TIPOS DE AÇÃO SUPORTADOS

O assistente financeiro suporta operacionalmente:

1. **Lançamento Único de Saída (Despesa Realizada)**: ex: *"Paguei 200 de gasolina no Pix"*.
2. **Lançamento Único de Entrada (Receita Realizada)**: ex: *"Recebi 500 do João em dinheiro"*.
3. **Lançamento de Múltiplos Fatos (Em Lote)**: ex: *"Paguei 100 de luz e 300 de internet"*.
4. **Baixa de Conta a Pagar Existente no ERP (`MATCH_EXISTING`)**: ex: *"Quitei o boleto da Bechara de 1.000"*.
5. **Consulta de Contas no ERP (`QUERY_OR_UPDATE`)**: ex: *"Não lembro o valor da conta da Bechara, consulta aí"*.
6. **Lançamento de Empréstimo Recebido (`isLoan = true`)**: ex: *"Peguei 5.000 de empréstimo do Banco Itaú"*.
7. **Resposta a Dúvida Pendente (`ANSWER_TO_QUESTION`)**: ex: *"É da loja"*, *"Foi no Pix"*.
8. **Correção de Lançamento (`CORRECTION`)**: ex: *"Não, foi 250"*, *"Na luz foi 150"*.
9. **Descarte de Rascunho Individual ou Lote**: Clique em **Ignorar** ou no botão **X**.
10. **Edição Manual via Modal**: Ajuste de qualquer campo pelo formulário modal sem re-parsing.
11. **Confirmação e Persistência**: Clique em **Confirmar** ou **Confirmar Lote**.

---

## 5. REALIZED VS FUTURE / PLANNED (REGRAS DE REALIZAÇÃO)

### Estados de Realização Fatos x Movimentações

- **`isRealized = true`**: Evento concluído de entrada ou saída de caixa. O assistente cria `ParsedFinancialIntent` com `isReadyForConfirmation = true` (se não houver lacunas) e permite a confirmação.
- **`isRealized = false`**: Compromisso futuro, dívida pendente ou hábito (*"tenho uma conta de 200"*, *"vou pagar amanhã"*, *"pago aluguel todo mês"*).
  - **Comportamento**: O assistente **NÃO** cria transação financeira realizada (`amount = null` ou mantido apenas como fato informativo `rememberedUnrealizedFacts`). Emite uma resposta orientativa perguntando se o usuário deseja registrar um pagamento já efetuado.

### Expressões de Realização Reconhecidas (`isRealizedPayment`)
```regex
\b(paguei|quitei|efetuei|acabei\s+de\s+pagar|paguei\s+no|paguei\s+na|baixei|recebi|transferi|caiu|entrou|paguei\s+as\s+duas|paguei\s+os\s+dois|paguei\s+tudo|fiz\s+um\s+pagamento|fiz\s+o\s+pagamento|fiz\s+pagamento|fiz\s+um\s+pix|fiz\s+pix|fiz\s+uma\s+transferência|fiz\s+uma\s+transferencia|fiz\s+transferência|fiz\s+transferencia|fiz\s+um\s+depósito|fiz\s+um\s+deposito|pagamos|realizei\s+o\s+pagamento|realizei\s+pagamento)\b
```

---

## 6. FINANCIAL FACTS & BATCH DRAFTS

### Estrutura de `extractMultipleFinancialFacts`

Quando a mensagem contém 2 ou mais itens (ex: *"Paguei 100 de luz e 300 de internet"*), o parser aplica dois mecanismos:
1. **Divisão em Cláusulas**: Quebra a frase por pontuação e conjunções (`,`, `.`, `;`, ` e `, ` e também `).
2. **Fallback de Pareamento Espacial**: Caso o ASR omita conjunções ou vírgulas (ex: *"fiz um pagamento de luz 100 internet 300"*), o algoritmo:
   - Ordena os termos financeiros (`factKeywords`) por posição inicial.
   - Associa cada palavra-chave ao valor numérico mais próximo (distância $< 120$ caracteres).
   - **Invariante de Alocação Única**: Utiliza `allocatedAmountIndexes = new Set<number>()` para garantir que um valor monetário nunca seja consumido por dois fatos independentes.

### Estrutura de Lote (`batchDraftsList`)

- Se $N \ge 2$ fatos são extraídos, o rascunho principal recebe `batchDraftsList: ParsedFinancialIntent[]`.
- **Invariante de Teste**: $N$ fatos realizados extraídos $\to$ $N$ drafts no lote $\to$ $N$ cards renderizados na UI.

---

## 7. MODELO DE DADOS DO DRAFT (`ParsedFinancialIntent`)

```typescript
export interface ParsedFinancialIntent {
  intentType?: 'SINGLE_TRANSACTION' | 'RECURRING' | 'PAYABLE_BILL' | 'INSTALLMENT' | 'MATCH_EXISTING' | 'QUERY_OR_UPDATE';
  type?: 'income' | 'expense' | null;
  amount?: number | null;
  description?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  date?: string | null;
  paymentMethod?: string | null;
  businessPurpose?: 'BUSINESS' | 'PERSONAL' | 'UNKNOWN' | null;
  counterparty?: string | null;
  supplier?: string | null;

  // Empréstimos
  isLoan?: boolean;
  creditor?: string | null;
  creditorType?: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' | 'UNKNOWN' | null;

  // Incerteza / Estimativa
  isEstimated?: boolean;

  // Lote de movimentações
  batchDraftsList?: ParsedFinancialIntent[] | null;
  isRealized?: boolean;
  rememberedUnrealizedFacts?: any[] | null;

  // Match / Consulta ERP
  matchedAccount?: FinancialTransaction | null;
  candidateAccounts?: FinancialTransaction[] | null;

  // Validação
  missingFields: string[];
  unknownByUser?: string[];
  questionToUser?: string | null;
  confidence: number;
  isReadyForConfirmation: boolean;
  validationStatus?: 'needs_input' | 'ready';
}
```

---

## 8. INVARIANTE DE VALOR UNKNOWN & PAREAMENTO

- **Valor Inexistente/Indeterminado**: Quando o usuário não informa o valor, `amount` permanece estritamente `null` (ou `missingFields = ['amount']`).
- **Proibição de Fallback para Zero**: O sistema **NUNCA** substitui `amount: null` por `0` ou `R$ 0,00` no parser ou preview. Se `amount` for nulo, a confirmação fica desabilitada e o robô pergunta: *"Qual foi o valor dessa movimentação?"*.

---

## 9. REGRAS DE NEGÓCIO: BUSINESS PURPOSE & CATEGORIAS

### 1. Despesas Ambíguas (Luz, Água, Internet, Aluguel, Eletrodomésticos, Eletrônicos)
- Se o usuário **NÃO** informou o destino:
  - `businessPurpose = 'UNKNOWN'`
  - `categoryName = 'UNKNOWN'`
  - Robô pergunta: *"Essa [conta/item] é da loja ou é uma compra pessoal?"*
- Se for para a **loja**: `businessPurpose = 'BUSINESS'`, Categoria = `'Contas de Consumo'` ou `'Equipamentos da Empresa'`.
- Se for **pessoal**: `businessPurpose = 'PERSONAL'`, Categoria = `'Pró-labore'`.

### 2. Exceção de Veículos (Combustível e Manutenção)
- **Combustível** e **Manutenção de Veículos** são **SEMPRE** `businessPurpose = 'BUSINESS'`.
- **NUNCA** perguntam se é loja vs pessoal e **NUNCA** viram Pró-labore (mesmo se o usuário disser *"meu carro"*).

### 3. Empréstimos e Credor
- **Credor Banco/Instituição Financeira**: Infere forma de recebimento/pagamento como `'Transferência bancária'`.
- **Credor Pessoa/Outro**: **NÃO** infere forma de pagamento. Pergunta como foi recebido.

---

## 10. FORMAS DE PAGAMENTO (`paymentMethod`)

- **Valores Válidos**: `'Pix'`, `'Cartão de Crédito'`, `'Cartão de Débito'`, `'Dinheiro'`, `'Transferência'`, `'Boleto'`.
- **Proibição de Invenção**: Se o usuário disse apenas *"cartão"*, define `paymentMethod = 'UNKNOWN'` e pergunta: *"Foi no cartão de débito ou de crédito?"*. Forma de pagamento é **obrigatória** para autorizar a confirmação.

---

## 11. PERSISTÊNCIA FINANCEIRA & IDEMPOTÊNCIA

A confirmação é executada via `confirmFinancialDraft` em `mobileFinanceService.ts`:
- **Chave de Idempotência**: A propriedade `notes` armazena `IDEMPOTENCY_${idempotencyKey}` no Supabase `financial_transactions`. Caso ocorra duplo clique ou retry, a consulta prévia detecta o registro e impede duplicação no banco.
- **Campos Gravados**: `type`, `amount`, `date`, `description`, `payment_method`, `category_id`, `category_name`, `result_nature`, `account_id` ('Caixa Geral'), `counterparty`, `purpose`, `origin` ('AI_ASSISTANT'), `status` ('ACTIVE').

---

## 12. VOZ CONTÍNUA & MÁQUINA DE ESTADOS

### Configuração de Voz (`voiceConfig.ts`)
- **Silêncio de Auto-Envio (`AUTO_SEND_SILENCE_MS = 3000`)**: 3 segundos de silêncio contínuo após uma fala disparam o envio automático da mensagem mantendo o microfone ligado (`LISTENING`).
- **Timer de Inatividade Total (`MAX_VOICE_INACTIVITY_MS = 15000`)**: 15 segundos sem nenhuma fala desligam o ditado e encerram a gravação para o estado `'IDLE'`.

---

## 13. REGRAS DE NEGÓCIO NUMERADAS (CATÁLOGO OFICIAL)

- **`RULE-FIN-AI-001`**: Somente fatos financeiros realizados (`isRealized = true`) geram lançamentos no financeiro do ERP.
- **`RULE-FIN-AI-002`**: Uma mensagem com $N$ fatos realizados independentes gera obrigatoriamente $N$ drafts no lote, $N$ cards na UI e $N$ transações persistidas.
- **`RULE-FIN-AI-003`**: O valor monetário não informado deve permanecer `null` e jamais ser convertido silenciosamente para zero.
- **`RULE-FIN-AI-004`**: Forma de pagamento não pode ser inventada. Termo *"cartão"* genérico exige pergunta se foi débito ou crédito.
- **`RULE-FIN-AI-005`**: Combustível e Manutenção de Veículos são estritamente empresariais (`BUSINESS`) e jamais viram Pró-labore.
- **`RULE-FIN-AI-006`**: Perguntas pendentes (`questionToUser`) não podem apagar ou destruir o rascunho/lote ativo da interface.
- **`RULE-FIN-AI-007`**: O envio de transações confirmadas exige chave de idempotência no banco de dados para evitar lançamentos duplicados por duplo clique ou instabilidade de rede.

---

## 14. INVARIANTES DO ASSISTENTE FINANCEIRO

1. $N \text{ fatos realizados independentes} \implies N \text{ drafts no renderer} \implies N \text{ cards na UI}$.
2. `amount = null` nunca vira `0` ou `R$ 0,00` em previews.
3. `allocatedAmountIndexes` previne alocação dupla do mesmo valor numérico por dois fatos independentes.
4. `setPendingIntent(finalIntent)` é mantido quando `finalIntent.questionToUser` existe.
5. Inatividade de voz $> 15\text{s}$ desliga o microfone e encerra o ditado.

---

## 15. COBERTURA DE TESTES AUTOMÁTICOS (350 TESTES PASSED)

Suítes de teste ativas localizadas em `erp/src/pages/utils/`:
1. `multiFactPipelineGroupedQuestions.test.ts` (11 testes)
2. `multiFactParsing.test.ts` (9 testes)
3. `financialInvariants.test.ts` (21 testes)
4. `complementaryFinancialAssistant.test.ts` (77 testes)
5. `latestRulesBattery.test.ts` (70 testes)
6. `paymentMethodRules.test.ts` (45 testes)
7. `continuousMicAutoSend.test.ts` (8 testes)
8. `longConversationState.test.ts` (12 testes)
9. `draftAnalysisChips.test.ts` (6 testes)
10. `unrealizedFactsAndBinding.test.ts` (9 testes)
11. `conversationalAssistant.test.ts` (15 testes)
12. `asyncConversationOrdering.test.ts` (8 testes)
13. `continuousVoiceStress.test.ts` (10 testes)
14. `e2eAuditRunner.test.ts` (25 testes)
15. `incrementalVoiceAssistant.test.ts` (4 testes)
16. `voiceSessionLifecycle.test.ts` (4 testes)

---

## 16. RESUMO PARA ANÁLISE PELO CHATGPT

```markdown
=== RESUMO EXECUTIVO PARA ANÁLISE PELO CHATGPT ===

SISTEMA: Assistente Financeiro IA do Morante Hub (Mobile App em React Native + Supabase ERP).
TECNOLOGIAS: TypeScript, React Native, Supabase, Gemini 2.5 Flash API (com Fallback Heurístico Determinístico).

1. PIPELINE DE DADOS:
- Entrada (Texto ou Voz Contínua) -> ASR Normalizer -> Parser Determinístico (financialIntentValidator.ts / financialSlotFilling.ts) -> LLM Fallback (Gemini 2.5 Flash) -> Classificador Multi-turno (multiTurnIntentClassifier.ts) -> State Manager (FinancialAiChatView.tsx) -> Persistence Layer (mobileFinanceService.ts).

2. MODELO DE DRAFTS E LOTE (BATCH DRAFTS):
- Rascunho com suporte a 1 ou N transações simultâneas (`batchDraftsList`).
- Invariante: N fatos realizados independentes -> N drafts no lote -> N cards na UI -> N registros atômicos no banco.

3. REGRAS DE NEGÓCIO E REALIZAÇÃO:
- Apelo estrito a eventos realizados (`isRealized = true`). Eventos futuros/hábitos ("vou pagar", "pago todo mês") não criam lançamentos financeiros efetuados.
- Categorização inteligente: despesas ambíguas (luz, água, internet, equipamentos) exigem escolha entre Loja (BUSINESS / Contas de Consumo / Equipamentos) vs Pessoal (PERSONAL / Pró-labore).
- Exceção veicular: Combustível e Manutenção de Veículos são SEMPRE BUSINESS.
- Formas de pagamento obrigatórias e sem invenção: "cartão" exige desambiguação entre débito e crédito.

4. VOZ CONTÍNUA:
- Escuta ativa com auto-envio após 3s de silêncio (`AUTO_SEND_SILENCE_MS = 3000`).
- Auto-desligamento por inatividade total de 15s (`MAX_VOICE_INACTIVITY_MS = 15000`).

5. PERSISTÊNCIA E IDEMPOTÊNCIA:
- Inserção atômica no Supabase (`financial_transactions`) utilizando chave de idempotência (`IDEMPOTENCY_${key}`) na coluna `notes` para impedir duplicações.

6. STATUS DE TESTES:
- 350 / 350 testes unitários, integrados e E2E aprovados em 16 arquivos de teste.
==================================================
```
