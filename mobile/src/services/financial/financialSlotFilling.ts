import type { ParsedFinancialIntent } from './financialTypes';
import { parsePtBrNumber } from './financialTextParser';
import { parsePtBrWrittenNumbers } from './wordToNumberPtBr';
import { validateParsedIntent } from './financialIntentValidator';
import { inferBusinessPurpose } from './financialPurposeReply';

export const extractUnknownFieldsFromText = (
  text: string,
  activeDraft?: ParsedFinancialIntent | null
): string[] => {
  const lower = text.toLowerCase();
  const unknownSet = new Set<string>(activeDraft?.unknownByUser || []);

  const isGeneralUnknown =
    lower.includes('não lembro') ||
    lower.includes('nao lembro') ||
    lower.includes('sem lembrar') ||
    lower.includes('não sei') ||
    lower.includes('nao sei') ||
    lower.includes('não tenho certeza') ||
    lower.includes('nao tenho certeza') ||
    lower.includes('consulta aí') ||
    lower.includes('consulta ai') ||
    lower.includes('procura aí') ||
    lower.includes('procura ai') ||
    lower.includes('vê pra mim') ||
    lower.includes('ve pra mim');

  if (isGeneralUnknown) {
    if (lower.includes('dia') || lower.includes('data') || lower.includes('vencimento') || lower.includes('quando')) {
      unknownSet.add('date');
      unknownSet.add('dueDate');
    }
    if (lower.includes('forma') || lower.includes('como paguei') || lower.includes('pagamento') || lower.includes('paguei')) {
      unknownSet.add('paymentMethod');
    }
    if (lower.includes('quantia') || lower.includes('valor') || lower.includes('quanto') || lower.includes('preço') || lower.includes('preco')) {
      unknownSet.add('amount');
      unknownSet.add('totalAmount');
    }

    if (unknownSet.size === 0 && activeDraft) {
      if (activeDraft.missingFields?.includes('amount') || (activeDraft.questionToUser && (activeDraft.questionToUser.includes('valor') || activeDraft.questionToUser.includes('Valor')))) {
        unknownSet.add('amount');
        unknownSet.add('totalAmount');
      }
      if (activeDraft.missingFields?.includes('dueDate') || activeDraft.missingFields?.includes('date') || (activeDraft.questionToUser && (activeDraft.questionToUser.includes('data') || activeDraft.questionToUser.includes('vencimento')))) {
        unknownSet.add('date');
        unknownSet.add('dueDate');
      }
    }

    if (unknownSet.size === 0) {
      unknownSet.add('amount');
      unknownSet.add('date');
    }
  }

  return Array.from(unknownSet);
};

export const trySlotFillingFallback = (
  msg: string,
  activeDraft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null => {
  const text = msg.toLowerCase().trim();
  const draft: ParsedFinancialIntent = JSON.parse(JSON.stringify(activeDraft));

  // 0. Detecção de Desconhecimento do Usuário ("não lembro", "não sei", "consulta aí", "procura aí", "vê pra mim", "não tenho certeza")
  const isUnknown =
    text.includes('não lembro') ||
    text.includes('nao lembro') ||
    text.includes('sem lembrar') ||
    text.includes('não sei') ||
    text.includes('nao sei') ||
    text.includes('consulta aí') ||
    text.includes('consulta ai') ||
    text.includes('procura aí') ||
    text.includes('procura ai') ||
    text.includes('vê pra mim') ||
    text.includes('ve pra mim') ||
    text.includes('não tenho certeza') ||
    text.includes('nao tenho certeza');

  if (isUnknown) {
    draft.unknownByUser = extractUnknownFieldsFromText(text, draft);

    // Altera a intenção para busca no ERP
    draft.intentType = 'QUERY_OR_UPDATE';
    draft.missingFields = (draft.missingFields || []).filter(f => !draft.unknownByUser?.includes(f));
    draft.questionToUser = null;

    return validateParsedIntent(draft, todayStr);
  }

  // Uma resposta pode preencher vários campos de uma vez (ex.: "R$ 500, da
  // loja, pago no Pix"). Esses campos precisam ser acumulados antes da primeira
  // validação; caso contrário, um retorno antecipado ao reconhecer a finalidade
  // faz o valor e a forma de pagamento serem ignorados.
  let commonFieldsPatched = 0;

  if (
    !draft.description &&
    /\b(?:conta|compra|venda|recebimento|pagamento|aluguel|energia|luz|internet|água|agua|combustível|combustivel|gasolina|frete|salário|salario|manutenção|manutencao)\b/i.test(text)
  ) {
    draft.description = msg.trim();
    commonFieldsPatched += 1;
  }

  if (!draft.amount && !draft.totalAmount) {
    const explicitAmountMatch = text.match(
      /(?:r\$\s*|\b(?:valor|total|foi|paguei|recebi)\s*(?:foi|de|era|\u00e9|e)?\s*)(\d+(?:\.\d{3})*(?:,\d{1,2})?)/i
    );
    if (explicitAmountMatch) {
      const parsedAmount = parsePtBrNumber(
        explicitAmountMatch[1],
        /\b(?:mil|k)\b/i.test(text),
      );
      if (parsedAmount > 0) {
        draft.amount = parsedAmount;
        draft.isEstimated = false;
        draft.missingFields = (draft.missingFields || []).filter(field => field !== 'amount' && field !== 'totalAmount');
        commonFieldsPatched += 1;
      }
    }
  }

  if (!draft.paymentMethod || draft.paymentMethod === 'UNKNOWN' || draft.missingFields?.includes('paymentMethod')) {
    let paymentMethod: string | null = null;
    if (/débito|debito/i.test(text)) paymentMethod = 'Cartão de Débito';
    else if (/crédito|credito/i.test(text)) paymentMethod = 'Cartão de Crédito';
    else if (/\bpix\b/i.test(text)) paymentMethod = 'Pix';
    else if (/\bboleto\b/i.test(text)) paymentMethod = 'Boleto';
    else if (/\bdinheiro\b/i.test(text)) paymentMethod = 'Dinheiro';
    else if (/transferência|transferencia/i.test(text)) paymentMethod = 'Transferência';

    if (paymentMethod) {
      draft.paymentMethod = paymentMethod;
      draft.missingFields = (draft.missingFields || []).filter(field => field !== 'paymentMethod');
      commonFieldsPatched += 1;
    }
  }

  if (
    draft.type === 'expense' &&
    (!draft.businessPurpose || draft.businessPurpose === 'UNKNOWN' || draft.missingFields?.includes('businessPurpose'))
  ) {
    const purposeReply = inferBusinessPurpose(text);
    if (purposeReply === 'BUSINESS' || purposeReply === 'PERSONAL') {
      draft.businessPurpose = purposeReply;
      const description = (draft.description || '').toLowerCase();
      const isEquipment = /\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|computador|notebook|celular|smartphone|impressora|móveis|moveis|equipamento)\b/i.test(description);
      draft.categoryName = purposeReply === 'PERSONAL'
        ? 'Pró-labore'
        : (isEquipment ? 'Equipamentos da Empresa' : 'Contas de Consumo');
      draft.missingFields = (draft.missingFields || []).filter(field => field !== 'businessPurpose');
      commonFieldsPatched += 1;
    }
  }

  const hasInstallmentOrDateOrOrdinal =
    /(primeir|segund|terceir|quart|últim|ultim|\b1º|\b2º|\b3º|\b4º)/i.test(text) ||
    /\b(?:dia|vence|vencimento|para o dia)\b/i.test(text);

  if (commonFieldsPatched >= 2 || (commonFieldsPatched >= 1 && !hasInstallmentOrDateOrOrdinal)) {
    draft.questionToUser = null;
    return validateParsedIntent(draft, todayStr);
  }

  // 0.5. Slot filling para Credor de Empréstimo (ex: "Do banco", "Do Itaú", "Do Matheus", "Do João")
  const isCreditorMissing = activeDraft.missingFields?.includes('creditor') || (activeDraft.questionToUser && activeDraft.questionToUser.includes('De quem foi'));
  if (isCreditorMissing || (draft.isLoan && (!draft.creditor || draft.creditorType === 'UNKNOWN'))) {
    const bankKeywords = ['banco', 'itaú', 'itau', 'bradesco', 'santander', 'nubank', 'caixa', 'inter', 'sicoob', 'sicredi', 'safra', 'btg', 'c6', 'financeira', 'cooperativa'];
    const isBankAnswer = bankKeywords.some(b => text.includes(b));

    let detectedCreditor: string | null = null;
    let detectedType: 'FINANCIAL_INSTITUTION' | 'PERSON_OR_OTHER' = 'PERSON_OR_OTHER';

    if (isBankAnswer) {
      detectedType = 'FINANCIAL_INSTITUTION';
      const match = text.match(/(?:do|da|no|na|pelo)?\s*(banco(?:\s+[a-z0-9]+)?|itaú|itau|bradesco|santander|nubank|caixa|inter|sicoob|sicredi|safra|btg|c6|financeira|cooperativa)/i);
      detectedCreditor = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Banco';
    } else {
      const match = text.match(/(?:do|da|de|pelo|com|foi\s+o|foi\s+a|foi)?\s*([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i);
      if (match) {
        let raw = match[1];
        if (raw.toLowerCase() === 'foi' || raw.toLowerCase() === 'o' || raw.toLowerCase() === 'a') {
          const secondMatch = text.match(/(?:foi\s+o|foi\s+a|foi|é\s+o|é\s+a|é)\s+([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i);
          if (secondMatch) raw = secondMatch[1];
        }
        const stopWords = ['uma', 'um', 'empréstimo', 'emprestimo', 'dinheiro', 'pix', 'banco', 'é', 'foi', 'o', 'a', 'categoria'];
        if (!stopWords.includes(raw.toLowerCase())) {
          detectedCreditor = raw.charAt(0).toUpperCase() + raw.slice(1);
          detectedType = 'PERSON_OR_OTHER';
        }
      }
    }

    if (detectedCreditor) {
      draft.creditor = detectedCreditor;
      draft.supplier = detectedCreditor;
      draft.counterparty = detectedCreditor;
      draft.creditorType = detectedType;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'creditor');

      if (detectedType === 'FINANCIAL_INSTITUTION' && (!draft.paymentMethod || draft.paymentMethod === 'UNKNOWN')) {
        draft.paymentMethod = 'Transferência bancária';
      }

      return validateParsedIntent(draft, todayStr);
    }
  }

  // 0.7. Slot filling para Finalidade da Despesa (Business vs Personal: "Da loja", "É para a loja", "Pessoal", "Minha casa")
  const isPurposeMissing =
    activeDraft.missingFields?.includes('businessPurpose') ||
    (activeDraft.questionToUser && /loja ou é uma (?:compra|conta) pessoal/.test(activeDraft.questionToUser)) ||
    activeDraft.businessPurpose === 'UNKNOWN' ||
    /loja|empresa|comércio|comercio|escritório|escritorio|pessoal|casa/i.test(text);

  if (isPurposeMissing) {
    const purposeReply = inferBusinessPurpose(text);

    if (purposeReply === 'BUSINESS') {
      draft.businessPurpose = 'BUSINESS';
      const descLower = (draft.description || '').toLowerCase();
      const isDualItem = /\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|computador|notebook|laptop|celular|smartphone|impressora|móveis|moveis|móvel|movel|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro)\b/i.test(descLower);

      if (!draft.categoryName || draft.categoryName === 'UNKNOWN' || draft.categoryName === 'Despesa não classificada' || draft.categoryName === 'Pró-labore') {
        draft.categoryName = isDualItem ? 'Equipamentos da Empresa' : 'Contas de Consumo';
      }
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'businessPurpose');
      (draft as any).questions = ((draft as any).questions || []).filter((q: string) => !/loja|pessoal|casa|businessPurpose/i.test(q));
      draft.questionToUser = null;
      return validateParsedIntent(draft, todayStr);
    } else if (purposeReply === 'PERSONAL') {
      draft.businessPurpose = 'PERSONAL';
      draft.categoryName = 'Pró-labore';
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'businessPurpose');
      (draft as any).questions = ((draft as any).questions || []).filter((q: string) => !/loja|pessoal|casa|businessPurpose/i.test(q));
      draft.questionToUser = null;
      return validateParsedIntent(draft, todayStr);
    }
  }

  // 1. Slot filling para Categoria (ex: "é compra, compra de estoque", "compra de estoque", "categoria estoque")
  const isCategoryFilling =
    text.includes('compra de estoque') ||
    text.includes('estoque') ||
    text.includes('mercadoria') ||
    text.includes('matéria prima') ||
    text.includes('materia prima') ||
    text.includes('categoria') ||
    text.includes('combustível') ||
    text.includes('combustivel') ||
    text.includes('alimentação') ||
    text.includes('alimentacao') ||
    text.includes('aluguel') ||
    text.includes('frete') ||
    text.includes('manutenção') ||
    text.includes('manutencao') ||
    text.includes('despesa operacional') ||
    (text.startsWith('é ') && !text.includes('pix') && !text.includes('dia') && !text.includes('boleto') && !text.includes('dinheiro') && !text.includes('cartão') && !text.includes('cartao'));

  if (isCategoryFilling && !text.includes('para o dia') && !text.includes('vencimento')) {
    let catName = '';
    if (text.includes('compra de estoque') || text.includes('estoque')) {
      catName = 'Compra de estoque';
    } else if (text.includes('combustível') || text.includes('combustivel')) {
      catName = 'Combustível';
    } else if (text.includes('alimentação') || text.includes('alimentacao')) {
      catName = 'Alimentação';
    } else if (text.includes('aluguel')) {
      catName = 'Aluguel';
    } else if (text.includes('frete')) {
      catName = 'Frete';
    } else if (text.includes('manutenção') || text.includes('manutencao')) {
      catName = 'Manutenção';
    } else {
      const match = text.match(/(?:(?:troca|muda|altera)\s+a\s+categoria\s+para\s+|categoria\s+para\s+|categoria\s+é\s+|categoria\s+|é\s+compra[,\s]+é\s+|é\s+compra[,\s]+|é\s+)([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i);
      if (match) {
        catName = match[1].trim();
        if (catName.toLowerCase().startsWith('para ')) catName = catName.slice(5).trim();
        catName = catName.charAt(0).toUpperCase() + catName.slice(1);
      }
    }

    if (catName) {
      draft.categoryName = catName;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'category');

      // Se restam parcelas sem vencimento, pergunta de forma curta e direta sobre o vencimento
      const hasMissingDates = draft.installmentList && draft.installmentList.some(i => !i.dueDate);
      if (hasMissingDates) {
        draft.missingFields = ['installmentDueDates'];
        draft.isReadyForConfirmation = false;
        draft.questionToUser = 'Qual é o vencimento do primeiro boleto? Os demais vencem mensalmente na mesma data?';
      }

      return validateParsedIntent(draft, todayStr);
    }
  }

  // 1.2. Slot filling para complemento de boletos faltantes (ex: "e outro de 4 mil", "e mais um de 3000")
  const isComplementingBill =
    (text.includes('outro') || text.includes('mais') || text.includes('faltou')) &&
    !text.includes('para o dia') &&
    !text.includes('vencimento') &&
    !text.includes('total');

  if (isComplementingBill && draft.installmentList && draft.installmentList.length > 0) {
    const missingBillMatch = text.match(/(?:outro|mais|mais\s+um|faltou)\s*(?:boleto|parcela)?\s*(?:de\s*)?(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
    if (missingBillMatch) {
      let amt = parsePtBrNumber(missingBillMatch[1], text.includes('mil') || text.includes('k'));

      if (amt > 0) {
        const nextNumber = draft.installmentList.length + 1;
        draft.installmentList.push({
          number: nextNumber,
          amount: amt,
          dueDate: null,
        });
        draft.installmentsCount = draft.installmentList.length;
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // 1.5. Slot filling para troca de Fornecedor / Contraparte (ex: "na verdade o fornecedor é Bertolini", "foi para Lucas")
  const isSupplierChange = text.includes('fornecedor') || text.includes('fábrica') || text.includes('fabrica') || text.includes('na verdade é da') || text.includes('na verdade é do') || text.includes('na verdade o fornecedor') || text.includes('foi para');
  if (isSupplierChange) {
    const supplierMatch = text.match(/(?:fornecedor|fábrica|fabrica|na\s+verdade\s+é\s+d[ao]|é\s+d[ao]|na\s+verdade\s+o\s+fornecedor\s+é|foi\s+para)\s+(?:é\s+)?([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/i);
    if (supplierMatch) {
      const raw = supplierMatch[1];
      const stopWords = ['uma', 'um', 'compra', 'mercadoria', 'estoque', 'produtos', 'outro', 'outra'];
      if (!stopWords.includes(raw.toLowerCase())) {
        const formattedName = raw.charAt(0).toUpperCase() + raw.slice(1);
        draft.supplier = formattedName;
        draft.counterparty = formattedName;
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // 2. Correção do Total Declarado (ex: "o total é 25 mil", "o total correto é 25.000")
  const totalCorrectionMatch = text.match(/(?:o\s+)?total\s*(?:é|correto\s*é|de)?\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
  if (totalCorrectionMatch) {
    let correctedTotal = parsePtBrNumber(totalCorrectionMatch[1], text.includes('mil') || text.includes('k'));

    if (correctedTotal > 0) {
      draft.totalAmount = correctedTotal;
      draft.amount = correctedTotal;
      return validateParsedIntent(draft, todayStr);
    }
  }

  // 3. Patching Incremental Preservativo de Parcela/Grupo (ex: "eu quis dizer 2 de 5.000")
  const patchMatch = text.match(/(?:(\d+|dois|três|quatro)\s*(?:boletos?|parcelas?)?\s*de\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?)/i);

  if (patchMatch && draft.installmentList && draft.installmentList.length > 0) {
    const rawQ = patchMatch[1].toLowerCase();
    const newQty = rawQ === 'dois' ? 2 : rawQ === 'três' ? 3 : rawQ === 'quatro' ? 4 : parseInt(rawQ, 10);
    const targetVal = parsePtBrNumber(patchMatch[2], text.includes('mil') || text.includes('k'));

    if (newQty > 0 && targetVal > 0) {
      const existingTargetItems = draft.installmentList.filter(item => item.amount === targetVal);

      if (existingTargetItems.length > 0) {
        const otherItems = draft.installmentList.filter(item => item.amount !== targetVal);
        const newTargetItems = Array.from({ length: newQty }, (_, i) => ({
          number: 0,
          amount: targetVal,
          dueDate: existingTargetItems[i]?.dueDate || null,
        }));

        const combinedList = [...otherItems, ...newTargetItems];
        combinedList.sort((a, b) => b.amount - a.amount);
        draft.installmentList = combinedList.map((item, idx) => ({
          ...item,
          number: idx + 1,
        }));
        draft.installmentsCount = combinedList.length;

        if (draft.dueDay) {
          const today = new Date(todayStr || Date.now());
          const isNextMonth = text.includes('próximo mês') || text.includes('proximo mes') || draft.dueDate?.includes('-10-') || draft.dueDate?.includes('-11-');
          let startMonth = today.getMonth() + (isNextMonth ? 1 : 0);
          let startYear = today.getFullYear();

          draft.installmentList = draft.installmentList.map((item, idx) => {
            let m = startMonth + idx;
            let y = startYear;
            while (m > 11) {
              m -= 12;
              y += 1;
            }
            const formattedMonth = String(m + 1).padStart(2, '0');
            const formattedDay = String(draft.dueDay!).padStart(2, '0');
            return {
              ...item,
              dueDate: item.dueDate || `${y}-${formattedMonth}-${formattedDay}`,
            };
          });
        }

        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // 4. Slot filling para Forma de Pagamento / Recebimento (ex: "Pix", "no cartão", "dinheiro", "foi no pix")
  const isPaymentMention =
    text.includes('forma de pagamento') ||
    text.includes('forma de recebimento') ||
    text.includes('pagamento') ||
    text.includes('recebimento') ||
    text.includes('débito') ||
    text.includes('debito') ||
    text.includes('crédito') ||
    text.includes('credito') ||
    text.includes('pix') ||
    text.includes('boleto') ||
    text.includes('cartão') ||
    text.includes('cartao') ||
    text.includes('dinheiro') ||
    text.includes('transferência') ||
    text.includes('transferencia');

  const isMissingPaymentMethod = !draft.paymentMethod || draft.paymentMethod === 'UNKNOWN' || draft.missingFields?.includes('paymentMethod');

  if ((isPaymentMention || isMissingPaymentMethod) && !text.includes('boletos') && !text.includes('parcelas')) {
    let capturedMethod: string | null = null;
    if (text.includes('débito') || text.includes('debito')) capturedMethod = 'Cartão de Débito';
    else if (text.includes('crédito') || text.includes('credito')) capturedMethod = 'Cartão de Crédito';
    else if (text.includes('pix')) capturedMethod = 'Pix';
    else if (text.includes('boleto')) capturedMethod = 'Boleto';
    else if (text.includes('dinheiro')) capturedMethod = 'Dinheiro';
    else if (text.includes('transferência') || text.includes('transferencia')) capturedMethod = 'Transferência';

    if (capturedMethod) {
      draft.paymentMethod = capturedMethod;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'paymentMethod');
      (draft as any).questions = ((draft as any).questions || []).filter((q: string) => !/pagamento|recebimento|forma|paymentMethod/i.test(q));
      draft.questionToUser = null;
      if (!text.includes('dia') && !text.includes('categoria') && !text.includes('mil') && !text.includes('k')) {
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // 5. Slot filling para troca de Categoria (ex: "troca a categoria para móveis para revenda")
  const isCategoryChange = text.includes('categoria') || text.includes('móveis para revenda') || text.includes('moveis para revenda') || text.includes('fornecedores') || text.includes('estoque');
  if (isCategoryChange) {
    if (text.includes('móveis para revenda') || text.includes('moveis para revenda')) draft.categoryName = 'Móveis para revenda';
    else if (text.includes('fornecedores')) draft.categoryName = 'Fornecedores';
    else if (text.includes('estoque')) draft.categoryName = 'Compra de estoque';

    if (!text.includes('dia')) {
      return validateParsedIntent(draft, todayStr);
    }
  }

  const hasOrdinal = /(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º|\b1ª|\b2ª|\b3ª|\b4ª)/i.test(text);
  const isGlobalAll = text.includes('todos') || text.includes('tudo') || text.includes('cada') || text.includes('todas');

  // A) Patch de data de parcela específica por ordinal
  if (hasOrdinal && !isGlobalAll && draft.installmentList && draft.installmentList.length > 0) {
    const specificPatchMatch = text.match(/(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º|\b1|\b2|\b3|\b4)\s*(?:boleto|parcela)?\s*(?:é|vence|ficou)?\s*(?:para\s*o\s*dia|dia)\s*(\d{1,2})(?:\s*de\s*([a-z]+))?/i);
    if (specificPatchMatch) {
      const ordinal = specificPatchMatch[1].toLowerCase();
      const day = parseInt(specificPatchMatch[2], 10);
      const monthName = specificPatchMatch[3];

      let targetIdx = -1;
      if (ordinal.includes('primeir') || ordinal === '1' || ordinal === '1º') targetIdx = 0;
      else if (ordinal.includes('segund') || ordinal === '2' || ordinal === '2º') targetIdx = 1;
      else if (ordinal.includes('terceir') || ordinal === '3' || ordinal === '3º') targetIdx = 2;
      else if (ordinal.includes('quart') || ordinal === '4' || ordinal === '4º') targetIdx = 3;
      else if (ordinal.includes('últim') || ordinal.includes('ultim')) targetIdx = draft.installmentList.length - 1;

      if (targetIdx >= 0 && targetIdx < draft.installmentList.length && day >= 1 && day <= 31) {
        const today = new Date(todayStr || Date.now());
        let targetYear = today.getFullYear();
        let targetMonth = today.getMonth();

        if (monthName) {
          const monthMap: Record<string, number> = {
            janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
            julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
          };
          if (monthMap[monthName] !== undefined) {
            targetMonth = monthMap[monthName];
            if (targetMonth < today.getMonth()) targetYear += 1;
          }
        } else if (draft.installmentList[targetIdx].dueDate) {
          const parts = draft.installmentList[targetIdx].dueDate!.split('-');
          targetYear = parseInt(parts[0], 10);
          targetMonth = parseInt(parts[1], 10) - 1;
        }

        const formattedMonth = String(targetMonth + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        draft.installmentList[targetIdx].dueDate = `${targetYear}-${formattedMonth}-${formattedDay}`;

        return validateParsedIntent(draft, todayStr);
      }
    }

    // A.2) Patch de valor de parcela específica por ordinal
    const ordinalValueMatch = text.match(/(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º)\s*(?:boleto|parcela)?\s*(?:é|ficou|de)?\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
    if (ordinalValueMatch) {
      const ordinal = ordinalValueMatch[1].toLowerCase();
      const val = parsePtBrNumber(ordinalValueMatch[2], text.includes('mil') || text.includes('k'));

      let targetIdx = -1;
      if (ordinal.includes('primeir') || ordinal === '1º') targetIdx = 0;
      else if (ordinal.includes('segund') || ordinal === '2º') targetIdx = 1;
      else if (ordinal.includes('terceir') || ordinal === '3º') targetIdx = 2;
      else if (ordinal.includes('quart') || ordinal === '4º') targetIdx = 3;
      else if (ordinal.includes('últim') || ordinal.includes('ultim')) targetIdx = draft.installmentList.length - 1;

      if (targetIdx >= 0 && targetIdx < draft.installmentList.length && val > 0) {
        draft.installmentList[targetIdx].amount = val;
        draft.totalAmount = draft.installmentList.reduce((acc, curr) => acc + curr.amount, 0);
        draft.amount = draft.totalAmount;
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // B) Frases de vencimento global (ex: "é todos eles são para o dia 20 do próximo mês")
  const hasDueDateKeyword = text.includes('vencimento') || text.includes('vence') || text.includes('para o dia') || text.includes('próximo mês') || text.includes('proximo mes') || text.includes('mês que vem') || text.includes('mes que vem') || text.includes('todo dia') || text.includes('cada dia') || text.includes('primeiro boleto dia') || text.includes('todos') || text.includes('dia 20') || text.includes('dia 15') || text.includes('dia 10') || text.includes('dia 25') || text.includes('dia 30');

  const dayMatch = text.match(/(?:dia|todo\s*dia|para\s*o\s*dia|vencimento\s*dia)\s*(\d{1,2})/i) || (hasDueDateKeyword ? text.match(/\b(\d{1,2})\b/) : null);
  const isNextMonth = text.includes('próximo mês') || text.includes('proximo mes') || text.includes('mês que vem') || text.includes('mes que vem');
  const isEveryMonth = text.includes('todos') || text.includes('todo') || text.includes('cada') || text.includes('primeiro') || text.includes('mensal');

  if (dayMatch && hasDueDateKeyword && (isNextMonth || isEveryMonth || text.includes('dia') || text.includes('vencimento'))) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      draft.dueDay = day;
      const today = new Date(todayStr || Date.now());

      if (!draft.installmentList || draft.installmentList.length === 0) {
        let y = today.getFullYear();
        let m = today.getMonth() + (isNextMonth ? 1 : 0);
        if (text.includes('outubro')) m = 9;
        else if (text.includes('novembro')) m = 10;
        else if (text.includes('dezembro')) m = 11;
        else if (text.includes('setembro')) m = 8;
        const dateObj = new Date(y, m, day);
        const isoDate = dateObj.toISOString().split('T')[0];
        draft.date = isoDate;
        draft.dueDate = isoDate;
        draft.missingFields = (draft.missingFields || []).filter(f => f !== 'date' && f !== 'dueDate');
        return validateParsedIntent(draft, todayStr);
      }

      let existingMonthOffset = 0;
      const firstDueDate = draft.dueDate || draft.installmentList?.[0]?.dueDate;
      if (firstDueDate) {
        const parts = firstDueDate.split('-');
        const prevMonth = parseInt(parts[1], 10) - 1;
        const prevYear = parseInt(parts[0], 10);
        existingMonthOffset = (prevYear - today.getFullYear()) * 12 + (prevMonth - today.getMonth());
        if (existingMonthOffset < 0) existingMonthOffset = 0;
      }

      let startMonth = today.getMonth() + (isNextMonth ? 1 : (existingMonthOffset > 0 ? existingMonthOffset : 0));
      let startYear = today.getFullYear();

      const count = draft.installmentsCount || draft.installmentList?.length || 3;
      const total = draft.totalAmount || draft.amount || 10000;
      const list = draft.installmentList && draft.installmentList.length > 0
        ? draft.installmentList
        : Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            amount: total / count,
            dueDate: null,
          }));

      draft.installmentList = list.map((item, idx) => {
        let m = startMonth + idx;
        let y = startYear;
        while (m > 11) {
          m -= 12;
          y += 1;
        }
        const formattedMonth = String(m + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        return {
          ...item,
          dueDate: `${y}-${formattedMonth}-${formattedDay}`,
        };
      });

      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'installmentDueDates');
      return validateParsedIntent(draft, todayStr);
    }
  }

  // C) Extração de valores detalhados de parcelas
  let parsedAmounts: number[] = [];
  const cleanText = text.replace(/^de\s*\d+\s*(?:mil)?\s*são/gi, '');
  const amountsRegex = /(?:(\d+|dois|três|quatro)\s*(?:boletos?|parcelas?)?\s*de\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?)/gi;
  let match;

  while ((match = amountsRegex.exec(cleanText)) !== null) {
    const rawQ = match[1].toLowerCase();
    let qty = rawQ === 'dois' ? 2 : rawQ === 'três' ? 3 : rawQ === 'quatro' ? 4 : parseInt(rawQ, 10);
    let val = parsePtBrNumber(match[2], cleanText.includes('mil') || cleanText.includes('k'));
    if (qty <= 10) {
      for (let i = 0; i < qty; i++) parsedAmounts.push(val);
    }
  }

  const singleLeftover = text.match(/\be\s+(?:outro|um|1)\s+(?:de\s+)?(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
  if (singleLeftover && parsedAmounts.length > 0) {
    let val2 = parsePtBrNumber(singleLeftover[1], text.includes('mil') || text.includes('k'));
    parsedAmounts.push(val2);
  }

  if (parsedAmounts.length > 0) {
    draft.installmentsCount = parsedAmounts.length;
    draft.installmentList = parsedAmounts.map((amt, idx) => ({
      number: idx + 1,
      amount: amt,
      dueDate: draft.installmentList?.[idx]?.dueDate || null,
    }));
    return validateParsedIntent(draft, todayStr);
  }

  // 6. Single transaction Date Patch
  const datePatchMatch = text.match(/(?:dia|no dia|para o dia)?\s*(\d{1,2})(?:\s*de\s*([a-z]+))?/i);
  if (datePatchMatch && (text.includes('dia') || text.includes('outubro') || text.includes('setembro') || text.includes('novembro') || text.includes('dezembro') || text.includes('janeiro') || text.includes('fevereiro') || text.includes('março') || text.includes('abril') || text.includes('maio') || text.includes('junho') || text.includes('julho') || text.includes('agosto'))) {
    const day = parseInt(datePatchMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const today = new Date(todayStr || Date.now());
      let y = today.getFullYear();
      let m = today.getMonth() + 1;
      if (text.includes('outubro')) m = 10;
      else if (text.includes('novembro')) m = 11;
      else if (text.includes('dezembro')) m = 12;
      else if (text.includes('setembro')) m = 9;

      const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      draft.date = isoDate;
      draft.dueDate = isoDate;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'date' && f !== 'dueDate');
      return validateParsedIntent(draft, todayStr);
    }
  }

  // 7. Single transaction Amount Patch
  const shortCentsRegexMatch = text.match(/(?:valor|na verdade é|na verdade e|paguei|recebi|é|e|de|total|foi)?\s*(?:r\$\s*)?(\d+)\s+e\s+(\d{1,2})\b/i);
  const singleNumMatch = text.match(/(?:valor|na verdade é|na verdade e|paguei|recebi|é|e|de|total)?\s*(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i);

  if (shortCentsRegexMatch && !text.includes('mil') && !text.includes('reais') && !text.includes('centavos')) {
    const r = parseInt(shortCentsRegexMatch[1], 10);
    const c = parseInt(shortCentsRegexMatch[2], 10);
    if (r > 0 && c >= 0 && c <= 99) {
      const patchVal = r + (c / 100);
      draft.amount = patchVal;
      draft.isEstimated = false;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'amount');
      if (!draft.paymentMethod || draft.paymentMethod === 'UNKNOWN') {
        draft.missingFields.push('paymentMethod');
        draft.isReadyForConfirmation = false;
        draft.questionToUser = 'Qual foi a forma de pagamento?';
      } else {
        draft.isReadyForConfirmation = true;
        draft.questionToUser = null;
      }
      return validateParsedIntent(draft, todayStr);
    }
  }

  if (singleNumMatch || text.includes('mil') || text.includes('k')) {
    let patchVal: number | null = null;
    if (singleNumMatch) {
      patchVal = parsePtBrNumber(singleNumMatch[1], text.includes('mil') || text.includes('k'));
    }
    if (!patchVal) {
      patchVal = parsePtBrWrittenNumbers(text);
    }

    if (patchVal && patchVal > 0) {
      const isAdditive = text.includes('mais') || text.includes('adiciona') || text.includes('soma');
      const baseAmount = isAdditive && draft.amount ? draft.amount : 0;
      draft.amount = baseAmount + patchVal;
      draft.isEstimated = false;
      draft.missingFields = (draft.missingFields || []).filter(f => f !== 'amount');
      if (!draft.paymentMethod || draft.paymentMethod === 'UNKNOWN') {
        draft.missingFields.push('paymentMethod');
        draft.isReadyForConfirmation = false;
        draft.questionToUser = 'Qual foi a forma de pagamento?';
      } else {
        draft.isReadyForConfirmation = true;
        draft.questionToUser = null;
      }
      return validateParsedIntent(draft, todayStr);
    }
  }

  return null;
};
