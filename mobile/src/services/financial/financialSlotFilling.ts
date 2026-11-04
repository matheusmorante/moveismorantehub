import type { ParsedFinancialIntent } from './financialTypes';
import { parsePtBrNumber } from './financialTextParser';
import { parsePtBrWrittenNumbers } from './wordToNumberPtBr';
import { validateParsedIntent } from './financialIntentValidator';
import { inferBusinessPurpose } from './financialPurposeReply';
import { detectFinancialPaymentMethod } from './financialPaymentMethodDetector';
import { tryPatchDueDateSlots } from './patchers/dueDateSlotPatcher';
import { tryPatchInstallmentSlots } from './patchers/installmentSlotPatcher';
import { tryPatchLoanCreditorSlots } from './patchers/loanCreditorSlotPatcher';
import { tryPatchUnknownFinancialAnswer } from './patchers/unknownAnswerPatcher';
import { extractUnknownFieldsFromText } from './financialUnknownFieldExtractor';

export { extractUnknownFieldsFromText };

export const trySlotFillingFallback = (
  msg: string,
  activeDraft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null => {
  const text = msg.toLowerCase().trim();
  const draft: ParsedFinancialIntent = JSON.parse(JSON.stringify(activeDraft));

  const unknownAnswerPatch = tryPatchUnknownFinancialAnswer(text, draft, todayStr);
  if (unknownAnswerPatch) return unknownAnswerPatch;

  // Uma resposta pode preencher vários campos de uma vez (ex.: "R$ 500, da
  // loja, pago no Pix"). Esses campos precisam ser acumulados antes da primeira
  // validação; caso contrário, um retorno antecipado ao reconhecer a finalidade
  // faz o valor e a forma de pagamento serem ignorados.
  let commonFieldsPatched = 0;

  if (
    !draft.description &&
    /\b(?:conta|compra|venda|recebimento|pagamento|aluguel|energia|luz|internet|água|agua|combustível|combustivel|gasolina|frete|salário|salario|manutenção|manutencao)\b/i.test(
      text
    )
  ) {
    draft.description = msg.trim();
    commonFieldsPatched += 1;
  }

  if (!draft.amount && !draft.totalAmount) {
    const explicitAmountMatch = text.match(
      /(?:r\$\s*|\b(?:valor|total|foi|paguei|recebi)\s*(?:foi|de|era|\u00e9|e)?\s*)(\d+(?:\.\d{3})*(?:,\d{1,2})?)/i
    );
    if (explicitAmountMatch) {
      const parsedAmount = parsePtBrNumber(explicitAmountMatch[1], /\b(?:mil|k)\b/i.test(text));
      if (parsedAmount > 0) {
        draft.amount = parsedAmount;
        draft.isEstimated = false;
        draft.missingFields = (draft.missingFields || []).filter(
          (field) => field !== 'amount' && field !== 'totalAmount'
        );
        commonFieldsPatched += 1;
      }
    }
  }

  const paymentMethod = detectFinancialPaymentMethod(text);
  if (paymentMethod) {
    draft.paymentMethod = paymentMethod;
    draft.missingFields = (draft.missingFields || []).filter((field) => field !== 'paymentMethod');
    commonFieldsPatched += 1;
  }

  if (
    draft.type === 'expense' &&
    (!draft.businessPurpose ||
      draft.businessPurpose === 'UNKNOWN' ||
      draft.missingFields?.includes('businessPurpose'))
  ) {
    const purposeReply = inferBusinessPurpose(text);
    if (purposeReply === 'BUSINESS' || purposeReply === 'PERSONAL') {
      draft.businessPurpose = purposeReply;
      const description = (draft.description || '').toLowerCase();
      const isEquipment =
        /\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|computador|notebook|celular|smartphone|impressora|móveis|moveis|equipamento)\b/i.test(
          description
        );
      draft.categoryName =
        purposeReply === 'PERSONAL'
          ? 'Pró-labore'
          : isEquipment
            ? 'Equipamentos da Empresa'
            : 'Contas de Consumo';
      draft.missingFields = (draft.missingFields || []).filter(
        (field) => field !== 'businessPurpose'
      );
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

  const creditorPatchResult = tryPatchLoanCreditorSlots(text, activeDraft, draft, todayStr);
  if (creditorPatchResult) return creditorPatchResult;

  // 0.7. Slot filling para Finalidade da Despesa (Business vs Personal: "Da loja", "É para a loja", "Pessoal", "Minha casa")
  const isPurposeMissing =
    activeDraft.missingFields?.includes('businessPurpose') ||
    (activeDraft.questionToUser &&
      /loja ou é uma (?:compra|conta) pessoal/.test(activeDraft.questionToUser)) ||
    activeDraft.businessPurpose === 'UNKNOWN' ||
    /loja|empresa|comércio|comercio|escritório|escritorio|pessoal|casa/i.test(text);

  if (isPurposeMissing) {
    const purposeReply = inferBusinessPurpose(text);

    if (purposeReply === 'BUSINESS') {
      draft.businessPurpose = 'BUSINESS';
      const descLower = (draft.description || '').toLowerCase();
      const isDualItem =
        /\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|computador|notebook|laptop|celular|smartphone|impressora|móveis|moveis|móvel|movel|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro)\b/i.test(
          descLower
        );

      if (
        !draft.categoryName ||
        draft.categoryName === 'UNKNOWN' ||
        draft.categoryName === 'Despesa não classificada' ||
        draft.categoryName === 'Pró-labore'
      ) {
        draft.categoryName = isDualItem ? 'Equipamentos da Empresa' : 'Contas de Consumo';
      }
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'businessPurpose');
      (draft as any).questions = ((draft as any).questions || []).filter(
        (q: string) => !/loja|pessoal|casa|businessPurpose/i.test(q)
      );
      draft.questionToUser = null;
      return validateParsedIntent(draft, todayStr);
    } else if (purposeReply === 'PERSONAL') {
      draft.businessPurpose = 'PERSONAL';
      draft.categoryName = 'Pró-labore';
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'businessPurpose');
      (draft as any).questions = ((draft as any).questions || []).filter(
        (q: string) => !/loja|pessoal|casa|businessPurpose/i.test(q)
      );
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
    (text.startsWith('é ') &&
      !text.includes('pix') &&
      !text.includes('dia') &&
      !text.includes('boleto') &&
      !text.includes('dinheiro') &&
      !text.includes('cartão') &&
      !text.includes('cartao'));

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
      const match = text.match(
        /(?:(?:troca|muda|altera)\s+a\s+categoria\s+para\s+|categoria\s+para\s+|categoria\s+é\s+|categoria\s+|é\s+compra[,\s]+é\s+|é\s+compra[,\s]+|é\s+)([a-zA-ZáàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]+)/i
      );
      if (match) {
        catName = match[1].trim();
        if (catName.toLowerCase().startsWith('para ')) catName = catName.slice(5).trim();
        catName = catName.charAt(0).toUpperCase() + catName.slice(1);
      }
    }

    if (catName) {
      draft.categoryName = catName;
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'category');

      // Se restam parcelas sem vencimento, pergunta de forma curta e direta sobre o vencimento
      const hasMissingDates =
        draft.installmentList && draft.installmentList.some((i) => !i.dueDate);
      if (hasMissingDates) {
        draft.missingFields = ['installmentDueDates'];
        draft.isReadyForConfirmation = false;
        draft.questionToUser =
          'Qual é o vencimento do primeiro boleto? Os demais vencem mensalmente na mesma data?';
      }

      return validateParsedIntent(draft, todayStr);
    }
  }

  // 1.2 e 3: Patching de parcelas e complemento de boletos
  const installmentPatchResult = tryPatchInstallmentSlots(text, draft, todayStr);
  if (installmentPatchResult) {
    return installmentPatchResult;
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

  const isMissingPaymentMethod =
    !draft.paymentMethod ||
    draft.paymentMethod === 'UNKNOWN' ||
    draft.missingFields?.includes('paymentMethod');

  if (
    (isPaymentMention || isMissingPaymentMethod) &&
    !text.includes('boletos') &&
    !text.includes('parcelas')
  ) {
    const capturedMethod = detectFinancialPaymentMethod(text);

    if (capturedMethod) {
      draft.paymentMethod = capturedMethod;
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'paymentMethod');
      (draft as any).questions = ((draft as any).questions || []).filter(
        (q: string) => !/pagamento|recebimento|forma|paymentMethod/i.test(q)
      );
      draft.questionToUser = null;
      if (
        !text.includes('dia') &&
        !text.includes('categoria') &&
        !text.includes('mil') &&
        !text.includes('k')
      ) {
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  // 5. Slot filling para troca de Categoria (ex: "troca a categoria para móveis para revenda")
  const isCategoryChange =
    text.includes('categoria') ||
    text.includes('móveis para revenda') ||
    text.includes('moveis para revenda') ||
    text.includes('fornecedores') ||
    text.includes('estoque');
  if (isCategoryChange) {
    if (text.includes('móveis para revenda') || text.includes('moveis para revenda'))
      draft.categoryName = 'Móveis para revenda';
    else if (text.includes('fornecedores')) draft.categoryName = 'Fornecedores';
    else if (text.includes('estoque')) draft.categoryName = 'Compra de estoque';

    if (!text.includes('dia')) {
      return validateParsedIntent(draft, todayStr);
    }
  }

  const hasOrdinal =
    /(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º|\b1ª|\b2ª|\b3ª|\b4ª)/i.test(
      text
    );
  const isGlobalAll =
    text.includes('todos') ||
    text.includes('tudo') ||
    text.includes('cada') ||
    text.includes('todas');

  // A) Patch de data de parcela específica por ordinal
  if (hasOrdinal && !isGlobalAll && draft.installmentList && draft.installmentList.length > 0) {
    const specificPatchMatch = text.match(
      /(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º|\b1|\b2|\b3|\b4)\s*(?:boleto|parcela)?\s*(?:é|vence|ficou)?\s*(?:para\s*o\s*dia|dia)\s*(\d{1,2})(?:\s*de\s*([a-z]+))?/i
    );
    if (specificPatchMatch) {
      const ordinal = specificPatchMatch[1].toLowerCase();
      const day = parseInt(specificPatchMatch[2], 10);
      const monthName = specificPatchMatch[3];

      let targetIdx = -1;
      if (ordinal.includes('primeir') || ordinal === '1' || ordinal === '1º') targetIdx = 0;
      else if (ordinal.includes('segund') || ordinal === '2' || ordinal === '2º') targetIdx = 1;
      else if (ordinal.includes('terceir') || ordinal === '3' || ordinal === '3º') targetIdx = 2;
      else if (ordinal.includes('quart') || ordinal === '4' || ordinal === '4º') targetIdx = 3;
      else if (ordinal.includes('últim') || ordinal.includes('ultim'))
        targetIdx = draft.installmentList.length - 1;

      if (targetIdx >= 0 && targetIdx < draft.installmentList.length && day >= 1 && day <= 31) {
        const today = new Date(todayStr || Date.now());
        let targetYear = today.getFullYear();
        let targetMonth = today.getMonth();

        if (monthName) {
          const monthMap: Record<string, number> = {
            janeiro: 0,
            fevereiro: 1,
            marco: 2,
            março: 2,
            abril: 3,
            maio: 4,
            junho: 5,
            julho: 6,
            agosto: 7,
            setembro: 8,
            outubro: 9,
            novembro: 10,
            dezembro: 11,
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
        draft.installmentList[targetIdx].dueDate =
          `${targetYear}-${formattedMonth}-${formattedDay}`;

        return validateParsedIntent(draft, todayStr);
      }
    }

    // A.2) Patch de valor de parcela específica por ordinal
    const ordinalValueMatch = text.match(
      /(primeir[oa]|segund[oa]|terceir[oa]|quart[oa]|últim[oa]|ultim[oa]|\b1º|\b2º|\b3º|\b4º)\s*(?:boleto|parcela)?\s*(?:é|ficou|de)?\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i
    );
    if (ordinalValueMatch) {
      const ordinal = ordinalValueMatch[1].toLowerCase();
      const val = parsePtBrNumber(ordinalValueMatch[2], text.includes('mil') || text.includes('k'));

      let targetIdx = -1;
      if (ordinal.includes('primeir') || ordinal === '1º') targetIdx = 0;
      else if (ordinal.includes('segund') || ordinal === '2º') targetIdx = 1;
      else if (ordinal.includes('terceir') || ordinal === '3º') targetIdx = 2;
      else if (ordinal.includes('quart') || ordinal === '4º') targetIdx = 3;
      else if (ordinal.includes('últim') || ordinal.includes('ultim'))
        targetIdx = draft.installmentList.length - 1;

      if (targetIdx >= 0 && targetIdx < draft.installmentList.length && val > 0) {
        draft.installmentList[targetIdx].amount = val;
        draft.totalAmount = draft.installmentList.reduce((acc, curr) => acc + curr.amount, 0);
        draft.amount = draft.totalAmount;
        return validateParsedIntent(draft, todayStr);
      }
    }
  }

  const dueDatePatch = tryPatchDueDateSlots(text, draft, todayStr);
  if (dueDatePatch) return dueDatePatch;

  // 6. Single transaction Date Patch
  const datePatchMatch = text.match(/(?:dia|no dia|para o dia)?\s*(\d{1,2})(?:\s*de\s*([a-z]+))?/i);
  if (
    datePatchMatch &&
    (text.includes('dia') ||
      text.includes('outubro') ||
      text.includes('setembro') ||
      text.includes('novembro') ||
      text.includes('dezembro') ||
      text.includes('janeiro') ||
      text.includes('fevereiro') ||
      text.includes('março') ||
      text.includes('abril') ||
      text.includes('maio') ||
      text.includes('junho') ||
      text.includes('julho') ||
      text.includes('agosto'))
  ) {
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
      draft.missingFields = (draft.missingFields || []).filter(
        (f) => f !== 'date' && f !== 'dueDate'
      );
      return validateParsedIntent(draft, todayStr);
    }
  }

  // 7. Single transaction Amount Patch
  const shortCentsRegexMatch = text.match(
    /(?:valor|na verdade é|na verdade e|paguei|recebi|é|e|de|total|foi)?\s*(?:r\$\s*)?(\d+)\s+e\s+(\d{1,2})\b/i
  );
  const singleNumMatch = text.match(
    /(?:valor|na verdade é|na verdade e|paguei|recebi|é|e|de|total)?\s*(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i
  );

  if (
    shortCentsRegexMatch &&
    !text.includes('mil') &&
    !text.includes('reais') &&
    !text.includes('centavos')
  ) {
    const r = parseInt(shortCentsRegexMatch[1], 10);
    const c = parseInt(shortCentsRegexMatch[2], 10);
    if (r > 0 && c >= 0 && c <= 99) {
      const patchVal = r + c / 100;
      draft.amount = patchVal;
      draft.isEstimated = false;
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'amount');
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
      const isAdditive =
        text.includes('mais') || text.includes('adiciona') || text.includes('soma');
      const baseAmount = isAdditive && draft.amount ? draft.amount : 0;
      draft.amount = baseAmount + patchVal;
      draft.isEstimated = false;
      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'amount');
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
