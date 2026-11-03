import type { ParsedFinancialIntent } from './financialTypes';

export function extractMultipleFinancialFactsWithValidator(
  text: string,
  todayStr: string,
  validateParsedIntent: (
    draft: ParsedFinancialIntent,
    todayStr: string
  ) => ParsedFinancialIntent
): ParsedFinancialIntent[] {
  const lower = text.toLowerCase().trim();
  if (!lower) return [];

  // Fatos/itens financeiros conhecidos
  const factKeywords: {
    key: string;
    label: string;
    cat: string;
    type?: 'expense' | 'income';
    isVehicle?: boolean;
    isDual?: boolean;
  }[] = [
    { key: 'luz', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'energia', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'eletricidade', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'internet', label: 'Pagamento de internet', cat: 'Contas de Consumo' },
    { key: 'telefonia', label: 'Pagamento de telefone', cat: 'Contas de Consumo' },
    { key: 'água', label: 'Pagamento de conta de água', cat: 'Contas de Consumo' },
    { key: 'agua', label: 'Pagamento de conta de água', cat: 'Contas de Consumo' },
    { key: 'aluguel', label: 'Pagamento de aluguel', cat: 'Aluguel' },
    { key: 'gasolina', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    {
      key: 'combustível',
      label: 'Abastecimento de combustível',
      cat: 'Combustível',
      isVehicle: true,
    },
    {
      key: 'combustivel',
      label: 'Abastecimento de combustível',
      cat: 'Combustível',
      isVehicle: true,
    },
    { key: 'abasteci', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    {
      key: 'oficina',
      label: 'Manutenção de veículo',
      cat: 'Manutenção de Veículos',
      isVehicle: true,
    },
    { key: 'óleo', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    { key: 'oleo', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    {
      key: 'pneus',
      label: 'Manutenção de veículo',
      cat: 'Manutenção de Veículos',
      isVehicle: true,
    },
    { key: 'frete', label: 'Pagamento de frete', cat: 'Frete' },
    { key: 'mercadoria', label: 'Compra de estoque', cat: 'Compra de estoque' },
    { key: 'estoque', label: 'Compra de estoque', cat: 'Compra de estoque' },
    {
      key: 'geladeira',
      label: 'Compra de geladeira',
      cat: 'Equipamentos da Empresa',
      isDual: true,
    },
    {
      key: 'televisão',
      label: 'Compra de televisão',
      cat: 'Equipamentos da Empresa',
      isDual: true,
    },
    {
      key: 'televisao',
      label: 'Compra de televisão',
      cat: 'Equipamentos da Empresa',
      isDual: true,
    },
    { key: 'tv', label: 'Compra de televisão', cat: 'Equipamentos da Empresa', isDual: true },
    { key: 'almoço', label: 'Alimentação / Almoço', cat: 'Alimentação' },
    { key: 'almoco', label: 'Alimentação / Almoço', cat: 'Alimentação' },
    { key: 'refeição', label: 'Alimentação', cat: 'Alimentação' },
    { key: 'refeicao', label: 'Alimentação', cat: 'Alimentação' },
    { key: 'café', label: 'Café e Lanches', cat: 'Alimentação' },
    { key: 'cafe', label: 'Café e Lanches', cat: 'Alimentação' },
    { key: 'estacionamento', label: 'Estacionamento', cat: 'Transporte e Estacionamento' },
    { key: 'montagem', label: 'Serviço de montagem', cat: 'Serviços Terceirizados' },
    { key: 'limpeza', label: 'Material de limpeza', cat: 'Material de Consumo' },
    { key: 'venda', label: 'Recebimento de venda', cat: 'Receitas Operacionais', type: 'income' },
    { key: 'recebi', label: 'Recebimento de venda', cat: 'Receitas Operacionais', type: 'income' },
    { key: 'joão', label: 'Recebimento de João', cat: 'Outras receitas', type: 'income' },
    { key: 'joao', label: 'Recebimento de João', cat: 'Outras receitas', type: 'income' },
  ];

  // Identifica se há forma de pagamento global na mensagem inteira
  let globalPayment = 'UNKNOWN';
  if (/\b(?:pix|pics)\b/i.test(lower)) globalPayment = 'Pix';
  else if (/débito|debito/i.test(lower)) globalPayment = 'Cartão de Débito';
  else if (/crédito|credito/i.test(lower)) globalPayment = 'Cartão de Crédito';
  else if (/dinheiro/i.test(lower)) globalPayment = 'Dinheiro';

  const isRealizedPayment =
    /\b(paguei|quitei|efetuei|acabei\s+de\s+pagar|paguei\s+no|paguei\s+na|baixei|recebi|transferi|caiu|entrou|paguei\s+as\s+duas|paguei\s+os\s+dois|paguei\s+tudo|fiz\s+um\s+pagamento|fiz\s+o\s+pagamento|fiz\s+pagamento|fiz\s+um\s+pix|fiz\s+pix|fiz\s+uma\s+transferência|fiz\s+uma\s+transferencia|fiz\s+transferência|fiz\s+transferencia|fiz\s+um\s+depósito|fiz\s+um\s+deposito|pagamos|realizei\s+o\s+pagamento|realizei\s+pagamento)\b/i.test(
      lower
    );

  // Divide o texto em cláusulas por vírgula, ponto, ponto-e-vírgula e conjunções " e ", " e também "
  const clauses = lower
    .split(/(?:,|\.|\;|\be\b|\betambém\b|\be\s+também\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const foundItems: {
    label: string;
    cat: string;
    type: 'expense' | 'income';
    isVehicle?: boolean;
    isDual?: boolean;
    amount: number;
    paymentMethod: string;
    key: string;
  }[] = [];

  for (const clause of clauses) {
    const numMatch = clause.match(/(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i);
    if (!numMatch) continue;

    const valStr = numMatch[1].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(valStr);
    if (isNaN(amount) || amount <= 0) continue;

    for (const fk of factKeywords) {
      if (clause.includes(fk.key)) {
        if (foundItems.some((i) => i.label === fk.label)) continue;

        let pm = globalPayment;
        if (/\b(?:pix|pics)\b/i.test(clause)) pm = 'Pix';
        else if (/débito|debito/i.test(clause)) pm = 'Cartão de Débito';
        else if (/crédito|credito/i.test(clause)) pm = 'Cartão de Crédito';
        else if (/dinheiro/i.test(clause)) pm = 'Dinheiro';

        const itemType = fk.type || (clause.includes('recebi') ? 'income' : 'expense');

        foundItems.push({
          key: fk.key,
          label: fk.label,
          cat: fk.cat,
          type: itemType,
          isVehicle: fk.isVehicle,
          isDual: fk.isDual,
          amount,
          paymentMethod: pm,
        });

        break;
      }
    }
  }

  // Fallback para frases onde ASR omite vírgulas ou "e" entre objetos coordenados (ex: "fiz um pagamento de luz 100 internet 300")
  if (foundItems.length < 2) {
    foundItems.length = 0; // Limpa para re-analisar espacialmente o texto completo
    const numberMatches = Array.from(lower.matchAll(/(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/gi));

    if (numberMatches.length >= 2) {
      const presentKeywords: { fk: (typeof factKeywords)[0]; pos: number }[] = [];
      for (const fk of factKeywords) {
        const idx = lower.indexOf(fk.key);
        if (idx !== -1 && !presentKeywords.some((pk) => pk.fk.label === fk.label)) {
          presentKeywords.push({ fk, pos: idx });
        }
      }

      presentKeywords.sort((a, b) => a.pos - b.pos);

      const availableNumbers = numberMatches
        .map((m) => {
          const valStr = m[1].replace(/\./g, '').replace(',', '.');
          return {
            numVal: parseFloat(valStr),
            pos: m.index || 0,
            used: false,
          };
        })
        .filter((n) => !isNaN(n.numVal) && n.numVal > 0);

      // 2. Um mesmo valor monetário não pode ser consumido por dois fatos independentes
      const allocatedAmountIndexes = new Set<number>();
      const numbersComeAfterAllItems =
        presentKeywords.length > 0 &&
        availableNumbers.length >= presentKeywords.length &&
        availableNumbers[0].pos > presentKeywords[presentKeywords.length - 1].pos;

      if (presentKeywords.length >= 2 && availableNumbers.length >= 2) {
        for (let keywordIndex = 0; keywordIndex < presentKeywords.length; keywordIndex += 1) {
          const pk = presentKeywords[keywordIndex];
          let bestNumIdx = -1;
          let minDistance = Infinity;

          if (numbersComeAfterAllItems && keywordIndex < availableNumbers.length) {
            bestNumIdx = keywordIndex;
          } else {
            availableNumbers.forEach((n, nIdx) => {
              if (allocatedAmountIndexes.has(nIdx) || n.used) return;
              const dist = Math.abs(n.pos - pk.pos);
              if (dist < minDistance && dist < 120) {
                minDistance = dist;
                bestNumIdx = nIdx;
              }
            });
          }

          if (bestNumIdx !== -1) {
            allocatedAmountIndexes.add(bestNumIdx);
            const matchedNum = availableNumbers[bestNumIdx];
            matchedNum.used = true;
            let pm = globalPayment;
            const nextKeywordPosition =
              presentKeywords[keywordIndex + 1]?.pos ??
              Math.min(lower.length, availableNumbers[0]?.pos ?? lower.length);
            const kwSub = lower.substring(
              pk.pos,
              Math.max(pk.pos + pk.fk.key.length, nextKeywordPosition)
            );
            if (/\b(?:pix|pics)\b/i.test(kwSub)) pm = 'Pix';
            else if (/débito|debito/i.test(kwSub)) pm = 'Cartão de Débito';
            else if (/crédito|credito/i.test(kwSub)) pm = 'Cartão de Crédito';
            else if (/dinheiro/i.test(kwSub)) pm = 'Dinheiro';

            foundItems.push({
              key: pk.fk.key,
              label: pk.fk.label,
              cat: pk.fk.cat,
              type: pk.fk.type || 'expense',
              isVehicle: pk.fk.isVehicle,
              isDual: pk.fk.isDual,
              amount: matchedNum.numVal,
              paymentMethod: pm,
            });
          }
        }
      }
    }
  }

  if (foundItems.length >= 2) {
    return foundItems.map((item) => {
      const isStoreExplicit = /loja|empresa|depósito|deposito|escritório|escritorio/i.test(lower);
      const isPersonalExplicit = /pessoal|minha casa|minha família|minha familia/i.test(lower);
      let busPurpose: 'BUSINESS' | 'PERSONAL' | 'UNKNOWN' = 'UNKNOWN';
      if (isPersonalExplicit) {
        busPurpose = 'PERSONAL';
      } else if (isStoreExplicit || item.isVehicle) {
        busPurpose = 'BUSINESS';
      }

      const rawDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: item.type,
        amount: item.amount,
        description: item.label,
        categoryName: busPurpose === 'UNKNOWN' ? 'UNKNOWN' : item.cat,
        paymentMethod: item.paymentMethod,
        businessPurpose: busPurpose,
        missingFields: busPurpose === 'UNKNOWN' ? ['businessPurpose'] : [],
        isReadyForConfirmation: false,
        isRealized: isRealizedPayment,
      };

      return validateParsedIntent(rawDraft, todayStr);
    });
  }
  return [];
}
