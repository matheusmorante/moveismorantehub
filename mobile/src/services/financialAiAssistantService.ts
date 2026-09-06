import { supabase } from './supabaseClient';
import { FinancialCategory, FinancialTransaction, findMatchingPayableAccount, fetchPayableAccounts } from './mobileFinanceService';
import { validateParsedIntent } from './financial/financialIntentValidator';
import { trySlotFillingFallback, extractUnknownFieldsFromText } from './financial/financialSlotFilling';

export { validateParsedIntent } from './financial/financialIntentValidator';
export { trySlotFillingFallback, extractUnknownFieldsFromText } from './financial/financialSlotFilling';

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

const DEFAULT_FALLBACK_KEY = 'AQ.__REDACTED_GCP_API_KEY__';

export const fetchGeminiApiKey = async (): Promise<string> => {
  try {
    const { data } = await supabase.from('settings').select('*').eq('id', 'app').maybeSingle();
    return (
      data?.data?.geminiApiKey ||
      data?.geminiApiKey ||
      data?.settings_data?.geminiApiKey ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      DEFAULT_FALLBACK_KEY
    );
  } catch {
    return (
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      DEFAULT_FALLBACK_KEY
    );
  }
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
  history: ChatMessage[],
  categories: FinancialCategory[],
  activeDraft?: ParsedFinancialIntent | null,
  abortSignal?: AbortSignal
): Promise<ParsedFinancialIntent> => {
  const geminiKey = await fetchGeminiApiKey();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Se já existe um rascunho ativo, tentar slot-filling incremental primeiro
  if (activeDraft) {
    const patched = trySlotFillingFallback(userMessage, activeDraft, todayStr);
    if (patched) {
      // Se o slot filling converteu para consulta ou desconhecimento (UNKNOWN_BY_USER), executa a busca no ERP
      if (patched.intentType === 'QUERY_OR_UPDATE' && !patched.matchedAccount && (!patched.candidateAccounts || patched.candidateAccounts.length === 0)) {
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

  // 2. Tentar verificar se é uma consulta ou alteração de conta existente
  const lowerMsg = userMessage.toLowerCase();
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

  if (isQueryOrUpdate && !lowerMsg.includes('paguei') && !lowerMsg.includes('quitei') && !activeDraft) {
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

REGRAS DE NLU E INTERPRETAÇÃO COMPLETA:
1. ENTENDER A OPERAÇÃO COMPLETA: Interprete a fala inteira. NUNCA sugira ou diga que vai registrar "um por um para evitar duplicidade". Se a mensagem contiver múltiplos boletos, parcelas ou fornecedores, estruture TODOS juntos em "installmentList".
2. EXTRAIR TOTAL DECLARADO E PARCELAS INDIVIDUAIS:
   - Se o usuário disse "compra de 30.000, dois boletos de 10.000 e um de 5.000", defina totalAmount = 30000 e installmentList = [{ number: 1, amount: 10000 }, { number: 2, amount: 10000 }, { number: 3, amount: 5000 }].
3. DATAS RELATIVAS E REGRAS MENSAIS:
   - Converta "próximo mês", "mês que vem", "dia 20", "sexta", "amanhã" em datas ISO absolutas YYYY-MM-DD.
   - Se a regra for "todo dia 20 a partir do próximo mês", calcule as datas consecutivas para cada parcela em "installmentList" (ex: 2026-10-20, 2026-11-20, 2026-12-20).
4. TRANSCRIÇÃO DE VOZ: Tolere termos imperfeitos de transcrição de voz (ex: "compra cabeceada"). Extraia os dados numéricos, fornecedor e datas com alta prioridade.
5. RESPOSTAS CURTAS / COMPLEMENTAÇÃO (PATCH DE DRAFT):
   - Se houver RASCUNHO ATIVO e o usuário enviar uma resposta curta (ex: "é compra, compra de estoque", "compra de estoque", "dia 20"), isso é um PATCH no rascunho existente.
   - NUNCA descarte ou limpe fornecedor, valores ou parcelas já existentes.
   - NUNCA repita perguntas sobre campos já preenchidos (se categoryName já estiver preenchido, é PROIBIDO perguntar categoria de novo!).
   - Se faltar apenas o vencimento, faça uma pergunta curta e direta (ex: "Qual é o vencimento do primeiro boleto? Os demais vencem mensalmente na mesma data?").
6. TIPOS DE MOVIMENTAÇÃO:
   - "income" (Entrada [+]) ou "expense" (Saída [-]).

Histórico recente da conversa:
${history.filter(h => !h.status || h.status === 'ACTIVE').slice(-4).map(h => `${h.sender}: ${h.text}`).join('\n')}

Nova mensagem do usuário: "${userMessage}"

Responda APENAS um JSON válido no formato:
{
  "intentType": "SINGLE_TRANSACTION" | "RECURRING" | "PAYABLE_BILL" | "INSTALLMENT",
  "type": "income" | "expense" | null,
  "amount": number | null,
  "description": string | null,
  "categoryName": string | null,
  "date": "YYYY-MM-DD" | null,
  "paymentMethod": string | null,
  "purpose": "BUSINESS" | "PERSONAL_PARTNER" | "NOT_INFORMED" | null,
  "vehicleId": string | null,
  "counterparty": string | null,
  "frequency": "Mensal" | "Semanal" | "Anual" | null,
  "dueDay": number | null,
  "dueDate": "YYYY-MM-DD" | null,
  "supplier": string | null,
  "installmentsCount": number | null,
  "installmentAmount": number | null,
  "totalAmount": number | null,
  "installmentList": [ { "number": number, "amount": number, "dueDate": "YYYY-MM-DD" | null } ] | null,
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

    if (!response || !response.ok) {
      const rawHeuristic = fallbackHeuristicParser(userMessage, categories, todayStr, activeDraft);
      return validateParsedIntent(rawHeuristic, todayStr);
    }

    const resJson = await response.json();
    const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      const rawHeuristic = fallbackHeuristicParser(userMessage, categories, todayStr, activeDraft);
      return validateParsedIntent(rawHeuristic, todayStr);
    }

    const parsed: ParsedFinancialIntent = JSON.parse(rawText.trim());

    if (!parsed.intentType) parsed.intentType = 'SINGLE_TRANSACTION';

    if (parsed.categoryName) {
      const match = categories.find(c => c.name.toLowerCase() === parsed.categoryName?.toLowerCase());
      if (match) {
        parsed.categoryId = match.id;
        parsed.categoryName = match.name;
      }
    }

    return validateParsedIntent(parsed, todayStr);
  } catch (e) {
    console.warn('Erro ao chamar Gemini Flash para assistente financeiro:', e);
    const rawHeuristic = fallbackHeuristicParser(userMessage, categories, todayStr, activeDraft);
    return validateParsedIntent(rawHeuristic, todayStr);
  }
};

const fallbackHeuristicParser = (
  msg: string,
  categories: FinancialCategory[],
  todayStr: string,
  activeDraft?: ParsedFinancialIntent | null
): ParsedFinancialIntent => {
  if (activeDraft) {
    const patched = trySlotFillingFallback(msg, activeDraft, todayStr);
    if (patched) return validateParsedIntent(patched, todayStr);
  }

  const text = msg.toLowerCase();
  const unknownFields = extractUnknownFieldsFromText(msg, activeDraft);

  const isEditOrQuery =
    text.includes('editar') ||
    text.includes('alterar') ||
    text.includes('mudar') ||
    text.includes('corrigir') ||
    text.includes('trocar') ||
    text.includes('cancelar') ||
    text.includes('consulta') ||
    text.includes('procura') ||
    text.includes('vê') ||
    text.includes('ve') ||
    text.includes('não lembro') ||
    text.includes('nao lembro') ||
    text.includes('não sei') ||
    text.includes('nao sei') ||
    text.includes('qual foi') ||
    text.includes('quanto foi') ||
    text.includes('saber');

  const isPaymentAction = (text.includes('paguei') || text.includes('quitei')) && !isEditOrQuery;

  if (isEditOrQuery && !isPaymentAction) {
    let supplier: string | null = null;
    if (text.includes('bechara')) supplier = 'Bechara';
    else if (text.includes('kappesberg')) supplier = 'Kappesberg';
    else if (text.includes('copel')) supplier = 'Copel';
    else if (text.includes('sanepar')) supplier = 'Sanepar';

    return validateParsedIntent({
      intentType: 'QUERY_OR_UPDATE',
      type: 'expense',
      supplier,
      unknownByUser: unknownFields,
      missingFields: [],
      confidence: 0.8,
      isReadyForConfirmation: false,
      questionToUser: supplier
        ? `Buscando movimentações de ${supplier} no ERP...`
        : `Buscando movimentações no ERP...`,
    }, todayStr);
  }

  const isInstallmentPurchase = text.includes('compra') || text.includes('comprei') || text.includes('boletos') || text.includes('parcelas');

  let supplier: string | null = null;
  if (text.includes('bechara')) {
    supplier = 'Bechara';
  } else if (text.includes('kappesberg')) {
    supplier = 'Kappesberg';
  } else if (text.includes('copel')) {
    supplier = 'Copel';
  } else if (text.includes('sanepar')) {
    supplier = 'Sanepar';
  } else {
    const supplierMatch = text.match(/(?:da|do|de|fornecedor|fábrica|fabrica)\s+([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i);
    if (supplierMatch) {
      const raw = supplierMatch[1];
      const stopWords = ['uma', 'um', 'compra', 'mercadoria', 'estoque', 'produtos', 'beleza', 'venda'];
      if (!stopWords.includes(raw.toLowerCase())) {
        supplier = raw.charAt(0).toUpperCase() + raw.slice(1);
      }
    }
  }

  const totalMatch =
    text.match(/(?:compra|lote|total|valor).*?\b(\d+(?:\.\d{3})?)\s*(?:mil|k)?/i) ||
    text.match(/(?:recebi|entrou|parcela\s*de)\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i) ||
    text.match(/(?:r\$\s*)(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i) ||
    text.match(/(\d+(?:\.\d{3})?)\s*(?:reais|r\$|\s*mil|\s*k)/i) ||
    text.match(/(\d+(?:\.\d{3})?)/i);

  let totalAmount = totalMatch ? parsePtBrNumber(totalMatch[1], text.includes('mil') || text.includes('k')) : null;

  let paymentMethod: string | null = null;
  if (text.includes('pix')) paymentMethod = 'Pix';
  else if (text.includes('cartão') || text.includes('cartao')) paymentMethod = 'Cartão de Crédito';
  else if (text.includes('boleto')) paymentMethod = 'Boleto';
  else if (text.includes('dinheiro')) paymentMethod = 'Dinheiro';

  let parsedAmounts: number[] = [];
  const amountsRegex = /(?:(\d+|dois|três|quatro)\s*(?:boletos?|parcelas?)?\s*de\s*(?:r\$\s*)?(\d+(?:\.\d{3})?|cinco|dez|quinze|vinte)(?:\s*mil|\s*k)?)/gi;
  let match;

  while ((match = amountsRegex.exec(text)) !== null) {
    const rawQ = match[1].toLowerCase();
    let qty = rawQ === 'dois' ? 2 : rawQ === 'três' ? 3 : rawQ === 'quatro' ? 4 : parseInt(rawQ, 10);
    const rawVal = match[2].toLowerCase();
    let val = 0;
    if (rawVal === 'cinco') val = 5000;
    else if (rawVal === 'dez') val = 10000;
    else if (rawVal === 'quinze') val = 15000;
    else if (rawVal === 'vinte') val = 20000;
    else val = parsePtBrNumber(rawVal, text.includes('mil') || text.includes('k'));

    if (qty <= 10) {
      for (let i = 0; i < qty; i++) parsedAmounts.push(val);
    }
  }

  const singleLeftover = text.match(/\be\s+(?:outro|um|1)\s+(?:de\s+)?(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
  if (singleLeftover && parsedAmounts.length > 0) {
    let val2 = parsePtBrNumber(singleLeftover[1], text.includes('mil') || text.includes('k'));
    parsedAmounts.push(val2);
  }

  if (isInstallmentPurchase || parsedAmounts.length > 0) {
    const count = parsedAmounts.length > 0 ? parsedAmounts.length : 3;
    const installmentList = parsedAmounts.length > 0
      ? parsedAmounts.map((amt, idx) => ({ number: idx + 1, amount: amt, dueDate: null }))
      : Array.from({ length: count }, (_, i) => ({
          number: i + 1,
          amount: totalAmount ? totalAmount / count : 0,
          dueDate: null,
        }));

    const sumAmounts = parsedAmounts.reduce((a, b) => a + b, 0);
    const explicitTotalMatch = text.match(/(?:total|compra\s+de\s+)(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
    const explicitTotal = explicitTotalMatch ? parsePtBrNumber(explicitTotalMatch[1], text.includes('mil') || text.includes('k')) : null;
    const finalTotal = explicitTotal || (sumAmounts > 0 ? sumAmounts : totalAmount);

    return validateParsedIntent({
      intentType: 'INSTALLMENT',
      type: 'expense',
      totalAmount: finalTotal,
      amount: finalTotal,
      supplier,
      paymentMethod,
      categoryName: 'Compra de estoque',
      installmentsCount: count,
      installmentList,
      missingFields: [],
      confidence: 0.85,
      isReadyForConfirmation: false,
    }, todayStr);
  }

  const isIncome =
    text.includes('vendi') ||
    text.includes('venda') ||
    text.includes('vendas') ||
    text.includes('recebi') ||
    text.includes('entrada') ||
    text.includes('entrou') ||
    text.includes('recebimento') ||
    text.includes('faturamento') ||
    text.includes('cliente') ||
    text.includes('sinal');

  if (isIncome) {
    const isVenda = text.includes('vendi') || text.includes('venda') || text.includes('vendas');
    return {
      intentType: 'SINGLE_TRANSACTION',
      type: 'income',
      amount: totalAmount,
      paymentMethod,
      description: isVenda ? (text.includes('venda de móveis') ? 'Venda de Móveis' : 'Venda Direta') : text,
      categoryName: isVenda ? 'Vendas' : 'Outras receitas',
      missingFields: totalAmount ? [] : ['amount'],
      confidence: 0.8,
      isReadyForConfirmation: !!totalAmount,
      questionToUser: isVenda ? 'Gostaria de registrar como uma nova venda ou de sinal de produto?' : null,
    };
  }

  return {
    intentType: 'SINGLE_TRANSACTION',
    type: 'expense',
    amount: totalAmount,
    paymentMethod,
    description: text,
    categoryName: 'Despesa não classificada',
    missingFields: totalAmount ? [] : ['amount'],
    confidence: 0.7,
    isReadyForConfirmation: !!totalAmount,
  };
};

export interface LocalSemanticDelta {
  amountsFound: number[];
  categoryFound?: string | null;
  supplierFound?: string | null;
  dueDatesFound?: string[];
  isInstallment?: boolean;
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

  return {
    amountsFound,
    supplierFound,
    categoryFound,
    isInstallment,
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
