import type { ParsedFinancialIntent } from '../financialTypes';
import { parsePtBrNumber } from '../financialTextParser';
import { validateParsedIntent } from '../financialIntentValidator';

/**
 * Patcher e manipulador incremental de parcelas e grupos de boletos.
 * Extraído de financialSlotFilling.ts para respeitar os limites de complexidade e linhas.
 */
export function tryPatchInstallmentSlots(
  text: string,
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null {
  // 1.2. Complemento de boletos faltantes (ex: "e outro de 4 mil", "e mais um de 3000")
  const isComplementingBill =
    (text.includes('outro') || text.includes('mais') || text.includes('faltou')) &&
    !text.includes('para o dia') &&
    !text.includes('vencimento') &&
    !text.includes('total');

  if (isComplementingBill && draft.installmentList && draft.installmentList.length > 0) {
    const missingBillMatch = text.match(/(?:outro|mais|mais\s+um|faltou)\s*(?:boleto|parcela)?\s*(?:de\s*)?(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
    if (missingBillMatch) {
      const amt = parsePtBrNumber(missingBillMatch[1], text.includes('mil') || text.includes('k'));
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

  // C) Extração de valores detalhados de parcelas
  const parsedAmounts: number[] = [];
  const cleanText = text.replace(/^de\s*\d+\s*(?:mil)?\s*são/gi, '');
  const amountsRegex = /(?:(\d+|dois|três|quatro)\s*(?:boletos?|parcelas?)?\s*de\s*(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = amountsRegex.exec(cleanText)) !== null) {
    const rawQ = match[1].toLowerCase();
    const qty = rawQ === 'dois' ? 2 : rawQ === 'três' ? 3 : rawQ === 'quatro' ? 4 : parseInt(rawQ, 10);
    const val = parsePtBrNumber(match[2], cleanText.includes('mil') || cleanText.includes('k'));
    if (qty <= 10) {
      for (let i = 0; i < qty; i++) parsedAmounts.push(val);
    }
  }

  const singleLeftover = text.match(/\be\s+(?:outro|um|1)\s+(?:de\s+)?(?:r\$\s*)?(\d+(?:\.\d{3})?)(?:\s*mil|\s*k)?/i);
  if (singleLeftover && parsedAmounts.length > 0) {
    const val2 = parsePtBrNumber(singleLeftover[1], text.includes('mil') || text.includes('k'));
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

  return null;
}
