import type { ParsedFinancialIntent } from '../financialTypes';
import { validateParsedIntent } from '../financialIntentValidator';

export function tryPatchDueDateSlots(
  text: string,
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent | null {
  // B) Frases de vencimento global (ex: "é todos eles são para o dia 20 do próximo mês")
  const hasDueDateKeyword =
    text.includes('vencimento') ||
    text.includes('vence') ||
    text.includes('para o dia') ||
    text.includes('próximo mês') ||
    text.includes('proximo mes') ||
    text.includes('mês que vem') ||
    text.includes('mes que vem') ||
    text.includes('todo dia') ||
    text.includes('cada dia') ||
    text.includes('primeiro boleto dia') ||
    text.includes('todos') ||
    text.includes('dia 20') ||
    text.includes('dia 15') ||
    text.includes('dia 10') ||
    text.includes('dia 25') ||
    text.includes('dia 30');

  const dayMatch =
    text.match(/(?:dia|todo\s*dia|para\s*o\s*dia|vencimento\s*dia)\s*(\d{1,2})/i) ||
    (hasDueDateKeyword ? text.match(/\b(\d{1,2})\b/) : null);
  const isNextMonth =
    text.includes('próximo mês') ||
    text.includes('proximo mes') ||
    text.includes('mês que vem') ||
    text.includes('mes que vem');
  const isEveryMonth =
    text.includes('todos') ||
    text.includes('todo') ||
    text.includes('cada') ||
    text.includes('primeiro') ||
    text.includes('mensal');

  if (
    dayMatch &&
    hasDueDateKeyword &&
    (isNextMonth || isEveryMonth || text.includes('dia') || text.includes('vencimento'))
  ) {
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
        draft.missingFields = (draft.missingFields || []).filter(
          (f) => f !== 'date' && f !== 'dueDate'
        );
        return validateParsedIntent(draft, todayStr);
      }

      let existingMonthOffset = 0;
      const firstDueDate = draft.dueDate || draft.installmentList?.[0]?.dueDate;
      if (firstDueDate) {
        const parts = firstDueDate.split('-');
        const prevMonth = parseInt(parts[1], 10) - 1;
        const prevYear = parseInt(parts[0], 10);
        existingMonthOffset =
          (prevYear - today.getFullYear()) * 12 + (prevMonth - today.getMonth());
        if (existingMonthOffset < 0) existingMonthOffset = 0;
      }

      let startMonth =
        today.getMonth() + (isNextMonth ? 1 : existingMonthOffset > 0 ? existingMonthOffset : 0);
      let startYear = today.getFullYear();

      const count = draft.installmentsCount || draft.installmentList?.length || 3;
      const total = draft.totalAmount || draft.amount || 10000;
      const list =
        draft.installmentList && draft.installmentList.length > 0
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

      draft.missingFields = (draft.missingFields || []).filter((f) => f !== 'installmentDueDates');
      return validateParsedIntent(draft, todayStr);
    }
  }
  return null;
}