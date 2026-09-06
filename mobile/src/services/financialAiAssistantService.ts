import { supabase } from './supabaseClient';
import { FinancialCategory, FinancialTransaction, findMatchingPayableAccount, fetchPayableAccounts } from './mobileFinanceService';
import { extractMultipleFinancialFacts, processFinancialInput, validateParsedIntent } from './financial/financialIntentValidator';
import { trySlotFillingFallback, extractUnknownFieldsFromText } from './financial/financialSlotFilling';
import { parsePtBrWrittenNumbers } from './financial/wordToNumberPtBr';

export { validateParsedIntent, extractMultipleFinancialFacts, processFinancialInput } from './financial/financialIntentValidator';
export { trySlotFillingFallback, extractUnknownFieldsFromText } from './financial/financialSlotFilling';
export {
  classifyMultiTurnIntent,
  applyTurnPatch,
  applyTurnPatchWithDraftList,
} from './financial/multiTurnIntentClassifier';
export { buildGroupedQuestion } from './financial/financialIntentValidator';
export { AUTO_SEND_SILENCE_MS, MAX_VOICE_INACTIVITY_MS } from './financial/voiceConfig';
export type { UtteranceStatus, TurnIntent, UtteranceSegment } from './financial/voiceConfig';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  parsedIntent?: ParsedFinancialIntent | null;
  timestamp: string;
  parentMessageId?: string | null;
  version?: number;
  status?: 'ACTIVE' | 'SUPERSEDED' | 'BRANCH_INACTIVE';
  editedAt?: string | null;
}

export type IntentType =
  | 'SINGLE_TRANSACTION'
  | 'RECURRING'
  | 'PAYABLE_BILL'
  | 'INSTALLMENT'
  | 'MATCH_EXISTING'
  | 'QUERY_OR_UPDATE';

export interface InstallmentItemDraft {
  number: number;
  amount: number;
  dueDate?: string | null;
}

export interface ParsedFinancialIntent {
  intentType?: IntentType;
  type?: 'income' | 'expense' | null;
  amount?: number | null;
  description?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  date?: string | null;
  paymentMethod?: string | null;
  purpose?: 'BUSINESS' | 'PERSONAL_PARTNER' | 'NOT_INFORMED' | null;
  vehicleId?: string | null;
  counterparty?: string | null;

  // Recorrência
  frequency?: 'Mensal' | 'Semanal' | 'Anual' | null;
  dueDay?: number | null;
  startDate?: string | null;
  // Finalidade do Gasto
  businessPurpose?: 'BUSINESS' | 'PERSONAL' | 'UNKNOWN' | null;

  // Empréstimo e Credor
  creditor?: string | null;
  creditorType?: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' | 'UNKNOWN' | null;
  isLoan?: boolean;

  // Estimativa / Incerteza (DECISION-003)
  isEstimated?: boolean;
  estimationNote?: string | null;

  // Lançamentos múltiplos em lote (DECISION-001)
  batchDraftsList?: ParsedFinancialIntent[] | null;
  isRealized?: boolean;
  rememberedUnrealizedFacts?: any[] | null;

  // Conta a Pagar (Boleto/Agendamento)
  dueDate?: string | null;
  supplier?: string | null;

  // Parcelamento detalhado
  installmentsCount?: number | null;
  installmentAmount?: number | null;
  totalAmount?: number | null;
  installmentList?: InstallmentItemDraft[] | null;

  // Match existente / Alteração
  matchedAccount?: FinancialTransaction | null;
  candidateAccounts?: FinancialTransaction[] | null;
  fieldToUpdate?: 'amount' | 'dueDate' | 'paymentMethod' | 'description' | null;
  newValue?: string | number | null;

  missingFields: string[];
  unknownByUser?: string[];
  questionToUser?: string | null;
  confidence: number;
  isReadyForConfirmation: boolean;
  validationStatus?: 'needs_input' | 'ready';
}

const DEFAULT_FALLBACK_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const fetchGeminiApiKey = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .maybeSingle();

    if (!error && data?.value) {
      return data.value;
    }
  } catch (err) {
    console.warn('Erro ao buscar chave Gemini no banco, usando fallback:', err);
  }

  return DEFAULT_FALLBACK_KEY;
};

export const parsePtBrNumber = (valStr: string, hasMilKeyword?: boolean): number => {
  let cleaned = valStr.trim();
  if (/\d+\.\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '');
  } else {
    cleaned = cleaned.replace(',', '.');
  }
  let num = parseFloat(cleaned);
  if (hasMilKeyword && num < 100) {
    num *= 1000;
  }
  return num;
};

export const parseFinancialIntentWithGemini = async (
  userMessage: string,
  history: ChatMessage[] = [],
  categories: FinancialCategory[] = [],
  activeDraft?: ParsedFinancialIntent | null,
  abortSignal?: AbortSignal
): Promise<ParsedFinancialIntent> => {
  const geminiKey = await fetchGeminiApiKey();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Tentar slot-filling incremental via fallback determinístico
  if (activeDraft) {
    const patched = trySlotFillingFallback(userMessage, activeDraft, todayStr);
    if (patched) {
      if (patched.supplier && !patched.matchedAccount && patched.intentType === 'QUERY_OR_UPDATE') {
        const allPayables = await fetchPayableAccounts();
        const supplierQuery = (patched.supplier || patched.counterparty || '').toLowerCase();
        const matched = allPayables.filter(p => {
          const desc = p.description.toLowerCase();
          const party = (p.counterparty || '').toLowerCase();
          const lowerUserMsg = userMessage.toLowerCase();
          return (party && party.includes(supplierQuery)) || (desc && desc.includes(supplierQuery)) || (supplierQuery && lowerUserMsg.includes(party));
        });

        if (matched.length === 1) {
          patched.matchedAccount = matched[0];
          patched.supplier = matched[0].counterparty || matched[0].description;
          patched.amount = matched[0].amount;
          patched.dueDate = matched[0].due_date;
          patched.isReadyForConfirmation = true;
          patched.questionToUser = `Acho que encontrei a movimentação de ${matched[0].counterparty || matched[0].description} no valor de R$ ${matched[0].amount.toFixed(2)} (vencimento em ${matched[0].due_date}).`;
        } else if (matched.length > 1) {
          patched.candidateAccounts = matched;
          patched.questionToUser = `Encontrei ${matched.length} contas de ${patched.supplier || 'fornecedor'} no ERP. Qual delas você gostaria de verificar?`;
        } else {
          patched.questionToUser = `Nenhuma movimentação pendente de ${patched.supplier || 'fornecedor'} foi encontrada no ERP.`;
        }
      }
      return patched;
    }
  }

  // Para múltiplos fatos conhecidos, a extração local é a fonte de verdade.
  // Assim o lote não colapsa se a IA estiver indisponível ou responder parcialmente.
  const deterministicFacts = extractMultipleFinancialFacts(userMessage, todayStr);
  if (deterministicFacts.length >= 2) {
    const deterministic = processFinancialInput(userMessage, todayStr).draft;
    if (deterministic?.batchDraftsList?.length) return validateParsedIntent(deterministic, todayStr);
  }

  // 2. Tentar verificar se é uma consulta ou alteração de conta existente
  const lowerMsg = userMessage.toLowerCase();
  const normalizedMsg = lowerMsg.replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íï]/g, 'i').replace(/[óôõö]/g, 'o').replace(/[úü]/g, 'u');
  const hasEditOrQuery =
    lowerMsg.includes('editar') ||
    lowerMsg.includes('alterar') ||
    lowerMsg.includes('mudar') ||
    lowerMsg.includes('corrigir') ||
    lowerMsg.includes('trocar') ||
    lowerMsg.includes('cancelar') ||
    lowerMsg.includes('consulta') ||
    lowerMsg.includes('procura') ||
    lowerMsg.includes('vê pra mim') ||
    lowerMsg.includes('ve pra mim') ||
    /\bve\b/i.test(normalizedMsg) ||
    lowerMsg.includes('tem uma') ||
    lowerMsg.includes('não lembro') ||
    lowerMsg.includes('nao lembro') ||
    lowerMsg.includes('não sei') ||
    lowerMsg.includes('nao sei') ||
    lowerMsg.includes('sabe') ||
    lowerMsg.includes('qual foi') ||
    lowerMsg.includes('quanto foi');

  const isCreateAction =
    !hasEditOrQuery &&
    (lowerMsg.includes('comprei') ||
      (lowerMsg.includes('fiz uma compra') && !lowerMsg.includes('editar')) ||
      lowerMsg.includes('lançar') ||
      lowerMsg.includes('lancar') ||
      lowerMsg.includes('registrar') ||
      lowerMsg.includes('cadastrar'));

  const isQueryOrUpdate = !isCreateAction && hasEditOrQuery;
  const isPaymentExecution =
    (lowerMsg.includes('paguei') || lowerMsg.includes('quitei')) &&
    !lowerMsg.includes('como paguei') &&
    !lowerMsg.includes('quanto paguei') &&
    !lowerMsg.includes('não lembro') &&
    !lowerMsg.includes('nao lembro') &&
    !lowerMsg.includes('editar') &&
    !lowerMsg.includes('corrigir');

  if (isQueryOrUpdate && !isPaymentExecution && !activeDraft) {
    const unknownFields = extractUnknownFieldsFromText(userMessage, activeDraft);

    let supplierName: string | null = null;
    if (lowerMsg.includes('bechara')) supplierName = 'Bechara';
    else if (lowerMsg.includes('kappesberg')) supplierName = 'Kappesberg';
    else if (lowerMsg.includes('copel')) supplierName = 'Copel';
    else if (lowerMsg.includes('sanepar')) supplierName = 'Sanepar';
    else {
      const match = lowerMsg.match(/(?:da|do|de|fornecedor|fábrica|fabrica)\s+([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i);
      if (match && !['uma', 'um', 'compra', 'mercadoria'].includes(match[1].toLowerCase())) {
        supplierName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }

    const allPayables = await fetchPayableAccounts();

    const matchedPayables = allPayables.filter(p => {
      const desc = p.description.toLowerCase();
      const party = (p.counterparty || '').toLowerCase();
      const cat = (p.category_name || '').toLowerCase();
      const supQuery = (supplierName || '').toLowerCase();

      if (supQuery && ((party && party.includes(supQuery)) || (desc && desc.includes(supQuery)))) {
        return true;
      }

      return (
        (party && lowerMsg.includes(party)) ||
        (desc && lowerMsg.includes(desc)) ||
        lowerMsg.split(' ').some(word => word.length > 3 && (desc.includes(word) || party.includes(word) || cat.includes(word)))
      );
    });

    if (matchedPayables.length === 1) {
      const single = matchedPayables[0];
      return validateParsedIntent({
        intentType: 'QUERY_OR_UPDATE',
        matchedAccount: single,
        supplier: single.counterparty || single.description || supplierName,
        amount: single.amount,
        dueDate: single.due_date,
        unknownByUser: unknownFields,
        missingFields: [],
        confidence: 0.95,
        isReadyForConfirmation: true,
        questionToUser: `Encontrei esta compra de ${single.counterparty || single.description} no valor de R$ ${single.amount.toFixed(2)} (vencimento em ${single.due_date}). É essa que você quer editar?`,
      }, todayStr);
    } else if (matchedPayables.length > 1) {
      return validateParsedIntent({
        intentType: 'QUERY_OR_UPDATE',
        supplier: supplierName || 'fornecedor',
        candidateAccounts: matchedPayables,
        unknownByUser: unknownFields,
        missingFields: [],
        confidence: 0.85,
        isReadyForConfirmation: false,
        questionToUser: `Encontrei ${matchedPayables.length} compras de ${supplierName || 'fornecedor'} no ERP. Qual delas você gostaria de verificar?`,
      }, todayStr);
    } else {
      return validateParsedIntent({
        intentType: 'QUERY_OR_UPDATE',
        supplier: supplierName || 'fornecedor',
        unknownByUser: unknownFields,
        missingFields: [],
        confidence: 0.8,
        isReadyForConfirmation: false,
        questionToUser: `Nenhuma compra de ${supplierName || 'fornecedor'} foi encontrada no ERP com os dados disponíveis.`,
      }, todayStr);
    }
  }

  // 3. Tentar verificar se é um pagamento de conta a pagar pendente já existente
  const matchedPayable = await findMatchingPayableAccount(null, userMessage);
  if (matchedPayable && (userMessage.toLowerCase().includes('paguei') || userMessage.toLowerCase().includes('baixa') || userMessage.toLowerCase().includes('quitei'))) {
    return validateParsedIntent({
      intentType: 'MATCH_EXISTING',
      type: 'expense',
      amount: matchedPayable.amount,
      description: matchedPayable.description,
      categoryName: matchedPayable.category_name || 'Despesa',
      categoryId: matchedPayable.category_id,
      supplier: matchedPayable.counterparty || matchedPayable.description,
      dueDate: matchedPayable.due_date || matchedPayable.date,
      matchedAccount: matchedPayable,
      missingFields: [],
      confidence: 0.95,
      isReadyForConfirmation: true,
    }, todayStr);
  }

  const systemPrompt = `Você é o Assistente Financeiro IA do ERP Morante Hub.
Sua função é interpretar lançamentos financeiros operacionais para uma empresa de móveis e montagens em linguagem natural.

DATA DE REFERÊNCIA HOJE: ${todayStr} (Ano-Mês-Dia).

${activeDraft ? `RASCUNHO ATIVO EM ANDAMENTO: ${JSON.stringify(activeDraft)}. MANTENHA E FUSIONA TODOS OS DADOS JÁ EXTRAÍDOS DO RASCUNHO!` : ''}

REGRAS DE NEGÓCIO ABSOLUTAS:
1. O ASSISTENTE FINANCEIRO OPERA SOMENTE COM TRANSAÇÕES ÚNICAS REALIZADAS.
   - Cada fato financeiro realizado ("paguei", "recebi", "transferi", "quitei", "entrou", "saiu") gera UMA ÚNICA movimentação.
   - NUNCA crie ou sugira planos de parcelamento, recorrências futuras, agendamentos automáticos, boletos futuros ou parcelas pendentes.
2. EVENTOS FUTUROS E INTENÇÕES / COMPROMISSOS (ZERO SAÍDAS AUTOMÁTICAS):
   - Frases no futuro ("vou pagar", "vence mês que vem") ou compromissos/hábitos sem pagamento realizado ("comprei em 10x", "tenho 10 parcelas", "pago todo mês") NÃO geram movimentação financeira realizada.
   - Defina "amount": null, "isReadyForConfirmation": false, e pergunte ao usuário se ele quer registrar algum pagamento que já foi efetuado.
3. PARCELAS PAGAS COMO CONTEXTO DE DESCRIÇÃO:
   - Se o usuário declarar um pagamento de parcela já ocorrido ("Paguei a 3ª parcela da Bechara de R$ 1.000"), crie UMA ÚNICA movimentação de R$ 1.000 com a descrição "Pagamento da 3ª parcela — Bechara", sem gerar outras parcelas.
4. MÚLTIPLOS FATOS REAIS DISTINTOS:
   - Se a mensagem contiver múltiplos fatos reais já ocorridos ("Paguei 200 de luz e 150 de internet"), estruture em "batchDraftsList" com rascunhos independentes.
5. DATAS RELATIVAS:
   - Converta "hoje", "ontem" em datas ISO YYYY-MM-DD.
6. FORMA DE PAGAMENTO (REGRA FACTUAL):
   - NUNCA inventar forma de pagamento. Se o usuário disse apenas "cartão", defina "paymentMethod": "UNKNOWN" e pergunte "Foi no cartão de débito ou de crédito?". Se não informou, defina null.
7. EMPRÉSTIMOS E CREDOR:
   - Em empréstimos, se o credor for instituição financeira (banco, Itaú), infira "Transferência". Se for pessoa (Matheus, João) ou desconhecido, pergunte.
8. DESTINO DO GASTO (LOJA vs PESSOAL):
   - Para compras de bens físicos/equipamentos/eletrodomésticos que podem ser empresariais ou pessoais (geladeira, televisão, freezer, micro-ondas, ar-condicionado, computador, notebook, celular, impressora, móveis, etc.) ou contas de consumo ambíguas (luz, água, internet):
   - Se o usuário NÃO informou se é para a loja ou uso pessoal: defina "businessPurpose": "UNKNOWN", "categoryName": "UNKNOWN", e pergunte explicitamente: "Essa [item/conta] é para a loja ou é uma compra pessoal?".
   - Se for para a loja: "businessPurpose": "BUSINESS", com categoria empresarial adequada (ex: Equipamentos da Empresa / Contas de Consumo).
   - Se for pessoal: "businessPurpose": "PERSONAL", categoria "Pró-labore".
9. EXCEÇÕES DE VEÍCULO (COMBUSTÍVEL E MANUTENÇÃO):
   - Combustível (gasolina, etanol, diesel, abastecimento) e Manutenção de Veículos (oficina, troca de óleo, pneus, revisão, peças, mecânico) são SEMPRE empresariais ("businessPurpose": "BUSINESS"). NUNCA pergunte loja vs pessoal e NUNCA classifique como Pró-labore.
   - SEMPRE separe as categorias: 1) "Combustível", 2) "Manutenção de Veículos".

Histórico recente da conversa:
${history.filter(h => !h.status || h.status === 'ACTIVE').slice(-4).map(h => `${h.sender}: ${h.text}`).join('\n')}

Nova mensagem do usuário: "${userMessage}"

Responda APENAS um JSON válido no formato:
{
  "intentType": "SINGLE_TRANSACTION",
  "type": "income" | "expense" | null,
  "amount": number | null,
  "description": string | null,
  "categoryName": string | null,
  "date": "YYYY-MM-DD" | null,
  "paymentMethod": string | null,
  "businessPurpose": "BUSINESS" | "PERSONAL" | "UNKNOWN" | null,
  "counterparty": string | null,
  "supplier": string | null,
  "isLoan": boolean,
  "creditor": string | null,
  "creditorType": "FINANCIAL_INSTITUTION" | "PERSON_OR_OTHER" | "UNKNOWN" | null,
  "isEstimated": boolean,
  "batchDraftsList": [{
    "type": "income" | "expense",
    "amount": number,
    "description": string,
    "categoryName": string | null,
    "paymentMethod": string | null,
    "businessPurpose": "BUSINESS" | "PERSONAL" | "UNKNOWN",
    "missingFields": string[],
    "questionToUser": string | null,
    "isReadyForConfirmation": boolean
  }] | null,
  "missingFields": string[],
  "questionToUser": string | null,
  "confidence": number,
  "isReadyForConfirmation": boolean
}`;

  if (!geminiKey) {
    const rawHeuristic = fallbackHeuristicParser(userMessage, categories, todayStr, activeDraft);
    return validateParsedIntent(rawHeuristic, todayStr);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortSignal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (response.ok) {
      const resJson = await response.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (rawText) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ParsedFinancialIntent;
          return validateParsedIntent(parsed, todayStr);
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.warn('Erro ao chamar Gemini no assistente financeiro, fallback determinístico acionado:', err);
  }

  const rawHeuristic = fallbackHeuristicParser(userMessage, categories, todayStr, activeDraft);
  return validateParsedIntent(rawHeuristic, todayStr);
};

export const fallbackHeuristicParser = (
  msg: string,
  categories: FinancialCategory[],
  todayStr: string,
  activeDraft?: ParsedFinancialIntent | null
): ParsedFinancialIntent => {
  const text = msg.toLowerCase().trim();

  // Preserva ou extrai o tipo de movimentação (Entrada vs Saída)
  const isLoan =
    text.includes('emprestimo') ||
    text.includes('empréstimo') ||
    text.includes('emprestou') ||
    text.includes('emprestado') ||
    text.includes('emprestar');

  const isIncome =
    isLoan ||
    text.includes('vendi') ||
    (text.includes('venda') && !text.includes('para revenda') && !text.includes('para revender') && !text.includes('pra revenda') && !text.includes('pra revender')) ||
    text.includes('vendas') ||
    text.includes('recebi') ||
    text.includes('entrada') ||
    text.includes('entrou') ||
    text.includes('recebimento') ||
    text.includes('faturamento') ||
    text.includes('cliente') ||
    text.includes('sinal');

  const movementType = isIncome ? 'income' : 'expense';

  let creditor: string | null = activeDraft?.creditor || null;
  let creditorType: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' | 'UNKNOWN' = activeDraft?.creditorType || 'UNKNOWN';

  if (isLoan) {
    if (text.includes('banco x')) {
      creditorType = 'FINANCIAL_INSTITUTION';
      creditor = 'Banco X';
    } else if (text.includes('banco') || text.includes('itau') || text.includes('itaú') || text.includes('bradesco') || text.includes('santander') || text.includes('nubank') || text.includes('caixa') || text.includes('inter') || text.includes('sicoob') || text.includes('sicredi') || text.includes('cooperativa') || text.includes('financeira')) {
      creditorType = 'FINANCIAL_INSTITUTION';
      creditor = 'Banco';
    } else if (text.includes('matheus')) {
      creditorType = 'PERSON_OR_OTHER';
      creditor = 'Matheus';
    } else if (text.includes('lucas')) {
      creditorType = 'PERSON_OR_OTHER';
      creditor = 'Lucas';
    } else if (text.includes('joao') || text.includes('joão')) {
      creditorType = 'PERSON_OR_OTHER';
      creditor = 'João';
    }
  }

  let supplier: string | null = activeDraft?.supplier || null;
  if (text.includes('bechara')) {
    supplier = 'Bechara';
  } else if (text.includes('kappesberg')) {
    supplier = 'Kappesberg';
  } else if (text.includes('copel')) {
    supplier = 'Copel';
  } else if (text.includes('sanepar')) {
    supplier = 'Sanepar';
  } else {
    const supplierMatches = text.match(/(?:da|do|de|fornecedor|fábrica|fabrica)\s+([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/gi);
    if (supplierMatches) {
      const stopWords = ['uma', 'um', 'compra', 'mercadoria', 'estoque', 'produtos', 'beleza', 'venda', 'parcela', 'parcelas', 'primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'loja', 'minha', 'casa', 'luz', 'agua', 'água', 'internet'];
      for (const sm of supplierMatches) {
        const raw = sm.replace(/^(?:da|do|de|fornecedor|fábrica|fabrica)\s+/i, '').trim();
        if (!stopWords.includes(raw.toLowerCase())) {
          supplier = raw.charAt(0).toUpperCase() + raw.slice(1);
          break;
        }
      }
    }
  }

  const normText = text.replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íï]/g, 'i').replace(/[óôõö]/g, 'o').replace(/[úü]/g, 'u');
  const isQueryOrUpdate =
    text.includes('editar') ||
    text.includes('alterar') ||
    text.includes('mudar') ||
    text.includes('corrigir') ||
    text.includes('trocar') ||
    text.includes('cancelar') ||
    text.includes('consulta') ||
    text.includes('procura') ||
    text.includes('vê pra mim') ||
    text.includes('ve pra mim') ||
    /\bve\b/i.test(normText) ||
    text.includes('não lembro') ||
    text.includes('nao lembro') ||
    text.includes('não sei') ||
    text.includes('nao sei') ||
    text.includes('sabe') ||
    text.includes('qual foi') ||
    text.includes('quanto foi');

  const isPaymentExecution =
    (text.includes('paguei') || text.includes('quitei')) &&
    !text.includes('como paguei') &&
    !text.includes('quanto paguei') &&
    !text.includes('não lembro') &&
    !text.includes('nao lembro') &&
    !text.includes('editar') &&
    !text.includes('corrigir');

  if (isQueryOrUpdate && !isPaymentExecution && !activeDraft) {
    const unknownFields = extractUnknownFieldsFromText(text, activeDraft);
    return {
      intentType: 'QUERY_OR_UPDATE',
      type: movementType,
      supplier,
      counterparty: supplier,
      unknownByUser: unknownFields,
      missingFields: [],
      confidence: 0.8,
      isReadyForConfirmation: false,
      questionToUser: `Nenhuma compra de ${supplier || 'fornecedor'} foi encontrada no ERP com os dados disponíveis.`,
    };
  }

  const isRealizedEvent =
    text.includes('paguei') ||
    text.includes('recebi') ||
    text.includes('quitei') ||
    text.includes('transferi') ||
    text.includes('entrou') ||
    text.includes('saiu') ||
    text.includes('foi recebida') ||
    text.includes('foi pago') ||
    text.includes('acabei de pagar') ||
    text.includes('paguei este mês') ||
    text.includes('paguei este mes') ||
    text.includes('paguei hoje') ||
    text.includes('fiz um pagamento') ||
    text.includes('fiz um recebimento') ||
    text.includes('deu entrada') ||
    text.includes('baixei');

  const isFutureOrCommitment =
    text.includes('vou pagar') ||
    text.includes('tenho que pagar') ||
    text.includes('preciso pagar') ||
    text.includes('vence mês que vem') ||
    text.includes('vence mes que vem') ||
    text.includes('vence amanhã') ||
    text.includes('vence amanha') ||
    text.includes('vou receber') ||
    text.includes('vou transferir') ||
    text.includes('vou quitar') ||
    /\bpago\b.*?\btodo\s+(?:mês|mes)\b/i.test(text) ||
    /\btodo\s+(?:mês|mes)\b.*?\bpago\b/i.test(text) ||
    /\btenho\s+\d+\s+parcelas\b/i.test(text) ||
    /\b(?:comprei|fiz\s+uma\s+compra|compra)\b.*?\b(?:em|\d+)\s*(?:x|vezes|parcelas)\b/i.test(text);

  if (isFutureOrCommitment && !isRealizedEvent) {
    let qText = 'Você quer registrar alguma parcela que já foi paga?';
    if (text.includes('vou pagar') || text.includes('vence')) {
      qText = 'Essa movimentação ainda não foi realizada. Quando efetuar o pagamento, informe algo como "Paguei R$ 1.000 hoje".';
    } else if (text.includes('todo mês') || text.includes('todo mes')) {
      qText = 'Nenhuma movimentação realizada foi registrada. Quando efetuar o pagamento, informe algo como "Paguei R$ 2.000 hoje".';
    }
    return {
      intentType: 'SINGLE_TRANSACTION',
      type: movementType,
      amount: null,
      missingFields: ['amount'],
      confidence: 0.85,
      isReadyForConfirmation: false,
      questionToUser: qText,
    };
  }

  const amountPattern = `(?:\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)`;
  const totalMatch =
    text.match(new RegExp(`(?:r\\$\\s*)(${amountPattern})(?:\\s*mil|\\s*k)?`, 'i')) ||
    text.match(new RegExp(`(?:compra|lote|total|valor|paguei|gastei|recebi|entrou|vendi|sinal).*?\\b(${amountPattern})\\s*(?:mil|k)?`, 'i')) ||
    text.match(new RegExp(`(${amountPattern})\\s*(?:reais|r\\$|\\s*mil|\\s*k)`, 'i')) ||
    text.match(new RegExp(`(${amountPattern})`, 'i'));

  let totalAmount = totalMatch ? parsePtBrNumber(totalMatch[1], text.includes('mil') || text.includes('k')) : (activeDraft?.amount || activeDraft?.totalAmount || null);

  const inlineCorrectionMatch = text.match(/(?:não|nao|na\s+verdade|corrigindo|falei\s+errado|quis\s+dizer|ou\s+melhor|foi)\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
  if (inlineCorrectionMatch) {
    totalAmount = parsePtBrNumber(inlineCorrectionMatch[1]);
  }

  if (!totalAmount) {
    totalAmount = parsePtBrWrittenNumbers(text);
  }

  const centavosMatch =
    text.match(/(?:(\d+)\s*(?:reais|real)?)?\s*(?:e\s*)?(\d+)\s*centavos/i) ||
    text.match(/(\d+)\s+e\s+(\d{1,2})\b/i);
  if (centavosMatch) {
    const centavosPart = parseInt(centavosMatch[2], 10);
    const reaisPart = centavosMatch[1] ? parseInt(centavosMatch[1], 10) : (totalAmount && totalAmount !== centavosPart ? Math.floor(totalAmount) : 0);
    totalAmount = reaisPart + (centavosPart / 100);
  }

  let paymentMethod: string | null = activeDraft?.paymentMethod && activeDraft.paymentMethod !== 'UNKNOWN' ? activeDraft.paymentMethod : null;
  if (text.includes('pix') || text.includes('pics')) paymentMethod = 'Pix';
  else if (text.includes('cartão de crédito') || text.includes('cartao de credito') || text.includes('credto') || (text.includes('credito') && text.includes('cart')) || text.includes('crédito')) paymentMethod = 'Cartão de Crédito';
  else if (text.includes('cartão de débito') || text.includes('cartao de debito') || (text.includes('debito') && text.includes('cart')) || text.includes('débito')) paymentMethod = 'Cartão de Débito';
  else if (text.includes('cartão') || text.includes('cartao')) paymentMethod = 'UNKNOWN';
  else if (text.includes('boleto')) paymentMethod = 'Boleto';
  else if (text.includes('dinheiro')) paymentMethod = 'Dinheiro';
  else if (text.includes('transferência') || text.includes('transferencia')) paymentMethod = 'Transferência';

  const multiMatch = text.match(/(?:paguei|gastei|comprei|recebi)\s+(\d+)\s+de\s+([a-záàâãéèêíïóôõöúçñ]+)\s+e\s+(\d+)\s+de\s+([a-záàâãéèêíïóôõöúçñ]+)/i);
  if (multiMatch) {
    const val1 = parsePtBrNumber(multiMatch[1]);
    const cat1 = multiMatch[2];
    const val2 = parsePtBrNumber(multiMatch[3]);
    const cat2 = multiMatch[4];
    return {
      intentType: 'SINGLE_TRANSACTION',
      type: movementType,
      amount: val1,
      categoryName: cat1,
      batchDraftsList: [
        { type: movementType, amount: val1, description: cat1, categoryName: cat1 },
        { type: movementType, amount: val2, description: cat2, categoryName: cat2 },
      ],
      missingFields: [],
      confidence: 0.9,
      isReadyForConfirmation: false,
      questionToUser: `Identifiquei 2 movimentações independentes no seu pedido: 1) ${cat1} (R$ ${val1}), 2) ${cat2} (R$ ${val2}). Deseja confirmar os rascunhos em lote?`,
    };
  }

  // Montar descrição com contexto de parcela se houver menção
  let customDescription: string | null = activeDraft?.description || null;
  const ordMatch = text.match(/(terceira|3ª|3a|segunda|2ª|2a|primeira|1ª|1a|quarta|4ª|4a|quinta|5ª|5a)\s+parcela/i);
  if (ordMatch || text.includes('parcela')) {
    let ordStr = 'parcela';
    if (ordMatch) {
      const rawOrd = ordMatch[1].toLowerCase();
      if (rawOrd.includes('terceira') || rawOrd.includes('3')) ordStr = '3ª parcela';
      else if (rawOrd.includes('segunda') || rawOrd.includes('2')) ordStr = '2ª parcela';
      else if (rawOrd.includes('primeira') || rawOrd.includes('1')) ordStr = '1ª parcela';
      else if (rawOrd.includes('quarta') || rawOrd.includes('4')) ordStr = '4ª parcela';
      else if (rawOrd.includes('quinta') || rawOrd.includes('5')) ordStr = '5ª parcela';
    }

    const partyName = supplier || (text.includes('joao') || text.includes('joão') ? 'João' : null);
    const verbLabel = isIncome ? 'Recebimento' : 'Pagamento';
    if (ordMatch) {
      customDescription = partyName ? `${verbLabel} da ${ordStr} — ${partyName}` : `${verbLabel} da ${ordStr}`;
    } else {
      customDescription = partyName ? `${verbLabel} de parcela — ${partyName}` : `${verbLabel} de parcela`;
    }
  }

  let eventDate = todayStr;
  const dayKeywordMatch = text.match(/\bdia\s*(\d{1,2})\b/i);
  if (dayKeywordMatch) {
    const dNum = parseInt(dayKeywordMatch[1], 10);
    if (dNum >= 1 && dNum <= 31) {
      const today = new Date(todayStr || Date.now());
      let y = today.getFullYear();
      let m = today.getMonth();
      if (dNum > today.getDate()) {
        m -= 1;
        if (m < 0) { m = 11; y -= 1; }
      }
      eventDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    }
  }

  const isExplicitStore = /da loja|do depósito|do deposito|da fábrica|da fabrica|da empresa|do comércio|do comercio|loja|escritório|escritorio|pra loja|para a loja|na loja|para o negócio|para o negocio/i.test(text);
  const isExplicitPersonal = /da minha casa|para minha casa|pra casa|minha casa|da casa|minha|pessoal|uso pessoal|da casa da gerente|gerente|do sócio|do socio|casa/i.test(text);
  const isUtilityBill = /luz|energia|eletricidade|água|agua|sanepar|internet|telefone|telefonia|aluguel|condomínio|condominio/i.test(text);
  const dualItemMatch = text.match(/\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|computador|notebook|laptop|celular|smartphone|impressora|móveis|moveis|móvel|movel|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro|mesa|cadeira)\b/i);
  const isDualItem = Boolean(dualItemMatch);
  const isAmbiguous = isUtilityBill || isDualItem;

  let businessPurpose: 'BUSINESS' | 'PERSONAL' | 'UNKNOWN' | null = activeDraft?.businessPurpose || null;
  let catName = activeDraft?.categoryName || null;

  if (movementType === 'expense') {
    if (text.includes('combustível') || text.includes('combustivel') || text.includes('gasolina') || text.includes('etanol') || text.includes('diesel') || text.includes('abasteci') || text.includes('abastecimento') || text.includes('posto')) {
      catName = 'Combustível';
      businessPurpose = 'BUSINESS';
    } else if (text.includes('manutenção') || text.includes('manutencao') || text.includes('oficina') || text.includes('troca de óleo') || text.includes('troca de oleo') || text.includes('pneus') || text.includes('peças') || text.includes('pecas') || text.includes('revisão') || text.includes('revisao') || text.includes('mecânico') || text.includes('mecanico') || text.includes('bateria') || text.includes('alinhamento') || text.includes('balanceamento')) {
      catName = 'Manutenção de Veículos';
      businessPurpose = 'BUSINESS';
    } else if (text.includes('frete')) {
      catName = 'Frete';
      businessPurpose = 'BUSINESS';
    } else if (text.includes('mercadoria') || text.includes('estoque') || text.includes('revenda') || text.includes('revender')) {
      catName = 'Compra de estoque';
      businessPurpose = 'BUSINESS';
    } else if (isAmbiguous) {
      if (isExplicitStore || businessPurpose === 'BUSINESS') {
        businessPurpose = 'BUSINESS';
        catName = isDualItem ? 'Equipamentos da Empresa' : 'Contas de Consumo';
      } else if (isExplicitPersonal || businessPurpose === 'PERSONAL') {
        businessPurpose = 'PERSONAL';
        catName = 'Pró-labore';
      } else {
        businessPurpose = 'UNKNOWN';
        catName = 'UNKNOWN';
      }
    } else {
      catName = 'Despesa não classificada';
    }
  } else {
    const isVenda = text.includes('vendi') || text.includes('venda') || text.includes('vendas');
    catName = isVenda ? 'Vendas' : 'Outras receitas';
  }

  const isEstimated = /uns\b|acho que|aproximadamente|cerca de|em torno de/i.test(text);

  let counterpartyName = supplier || activeDraft?.counterparty || null;
  if (!counterpartyName) {
    if (text.includes('joao') || text.includes('joão')) counterpartyName = 'João';
    else if (text.includes('bechara')) counterpartyName = 'Bechara';
    else if (text.includes('kappesberg')) counterpartyName = 'Kappesberg';
  }

  const dateStr = text.includes('ontem')
    ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
    : eventDate;

  const missingFields: string[] = [];
  let isReadyForConfirmation = true;
  let questionToUser: string | null = null;

  if (businessPurpose === 'UNKNOWN' && isAmbiguous) {
    missingFields.push('businessPurpose');
    isReadyForConfirmation = false;
    questionToUser = 'Essa conta de luz é da loja ou é uma conta pessoal?';
  } else if (paymentMethod === 'UNKNOWN') {
    missingFields.push('paymentMethod');
    isReadyForConfirmation = false;
    questionToUser = 'Foi no cartão de débito ou de crédito?';
  } else if (isEstimated && totalAmount) {
    isReadyForConfirmation = false;
    const formatted = totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    questionToUser = `Você quer registrar R$ ${formatted} como estimativa ou prefere verificar o valor exato no comprovante?`;
  } else if (!paymentMethod && !isIncome) {
    missingFields.push('paymentMethod');
    isReadyForConfirmation = false;
    questionToUser = 'Qual foi a forma de pagamento?';
  } else if (!paymentMethod && isIncome && !isLoan) {
    missingFields.push('paymentMethod');
    isReadyForConfirmation = false;
    questionToUser = 'Qual foi a forma de recebimento?';
  } else if (!totalAmount) {
    missingFields.push('amount');
    isReadyForConfirmation = false;
    questionToUser = 'Qual foi o valor dessa movimentação?';
  }

  return {
    intentType: 'SINGLE_TRANSACTION',
    type: movementType,
    amount: totalAmount,
    description: customDescription || text,
    categoryName: isLoan ? 'Outras receitas' : catName,
    date: dateStr,
    paymentMethod,
    businessPurpose,
    supplier,
    counterparty: counterpartyName,
    isLoan,
    creditor,
    creditorType,
    isEstimated,
    missingFields,
    questionToUser,
    confidence: 0.9,
    isReadyForConfirmation,
  };
};

export interface LocalSemanticDelta {
  amountsFound: number[];
  amount?: number | null;
  categoryFound?: string | null;
  category?: string | null;
  supplierFound?: string | null;
  supplier?: string | null;
  dueDatesFound?: string[];
  isInstallment?: boolean;
  installmentsCount?: number | null;
  paymentMethod?: string | null;
}

export const extractLocalSemanticDelta = (text: string): LocalSemanticDelta => {
  const lower = text.toLowerCase();
  const amountsFound: number[] = [];

  const amountMatches = lower.match(/(?:r\$\s*|reais\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*mil|\s*k)?/g);
  if (amountMatches) {
    amountMatches.forEach(m => {
      const numMatch = m.match(/(\d+(?:[.,]\d{1,2})?)/);
      if (numMatch) {
        let val = parsePtBrNumber(numMatch[1], m.includes('mil') || m.includes('k'));
        if (val > 0) amountsFound.push(val);
      }
    });
  }

  let supplierFound: string | null = null;
  if (lower.includes('bechara')) supplierFound = 'Bechara';
  else if (lower.includes('kappesberg')) supplierFound = 'Kappesberg';
  else if (lower.includes('copel')) supplierFound = 'Copel';

  let categoryFound: string | null = null;
  if (lower.includes('estoque') || lower.includes('compra')) categoryFound = 'Compra de estoque';
  else if (lower.includes('frete')) categoryFound = 'Frete / Logística';
  else if (lower.includes('venda')) categoryFound = 'Vendas';

  const isInstallment = lower.includes('boletos') || lower.includes('parcelas') || lower.includes('parcela') || lower.includes('vezes');

  let installmentsCount: number | null = null;
  const countMatch = lower.match(/(?:em|em\s*até)?\s*(\d+)\s*(?:vezes|x|parcelas|boletos)/i);
  if (countMatch) installmentsCount = parseInt(countMatch[1], 10);

  let paymentMethod: string | null = null;
  if (lower.includes('pix')) paymentMethod = 'PIX';
  else if (lower.includes('cartão') || lower.includes('cartao')) paymentMethod = 'Cartão de Crédito';
  else if (lower.includes('boleto')) paymentMethod = 'Boleto';

  return {
    amountsFound,
    amount: amountsFound[0] || null,
    supplierFound,
    supplier: supplierFound,
    categoryFound,
    category: categoryFound,
    isInstallment,
    installmentsCount,
    paymentMethod,
  };
};

export const hasSignificantSemanticChange = (oldText: string, newText: string): boolean => {
  if (!oldText) return newText.trim().length > 3;

  const oldDelta = extractLocalSemanticDelta(oldText);
  const newDelta = extractLocalSemanticDelta(newText);

  if (oldDelta.amountsFound.length !== newDelta.amountsFound.length) return true;
  if (oldDelta.supplierFound !== newDelta.supplierFound) return true;
  if (oldDelta.categoryFound !== newDelta.categoryFound) return true;
  if (oldDelta.isInstallment !== newDelta.isInstallment) return true;

  const newWords = newText.trim().split(/\s+/).length;
  const oldWords = oldText.trim().split(/\s+/).length;
  return newWords - oldWords >= 4;
};

export const parseIncrementalDraftDelta = async (
  deltaText: string,
  currentDraft: ParsedFinancialIntent | null,
  categories: FinancialCategory[],
  abortSignal?: AbortSignal
): Promise<ParsedFinancialIntent> => {
  const todayStr = new Date().toISOString().split('T')[0];
  if (currentDraft) {
    const patched = trySlotFillingFallback(deltaText, currentDraft, todayStr);
    if (patched) return patched;
  }
  return parseFinancialIntentWithGemini(deltaText, [], categories, currentDraft, abortSignal);
};

export const consolidateFinalFinancialIntent = async (
  fullSessionText: string,
  activeDraft: ParsedFinancialIntent | null,
  categories: FinancialCategory[],
  abortSignal?: AbortSignal
): Promise<ParsedFinancialIntent> => {
  const todayStr = new Date().toISOString().split('T')[0];
  if (activeDraft) {
    const patched = trySlotFillingFallback(fullSessionText, activeDraft, todayStr);
    if (patched) return patched;
  }
  return parseFinancialIntentWithGemini(fullSessionText, [], categories, activeDraft, abortSignal);
};
