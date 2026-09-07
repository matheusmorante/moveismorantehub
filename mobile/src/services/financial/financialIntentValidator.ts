import type { ParsedFinancialIntent } from './financialTypes';
import { fallbackHeuristicParser, parsePtBrNumber } from './financialTextParser';

/**
 * Validador determinístico do Backend para Intenções Financeiras.
 * O backend recalcula e valida totais, parcelas, divergências e vencimentos.
 */
export function validateParsedIntent(
  draft: ParsedFinancialIntent,
  todayStr: string
): ParsedFinancialIntent {
  const result: ParsedFinancialIntent = JSON.parse(JSON.stringify(draft));

  if (result.type) {
    result.type = (result.type.toLowerCase() === 'income' || result.type.toLowerCase() === 'in') ? 'income' : 'expense';
  }

  if (!result.intentType || result.intentType === 'INSTALLMENT' || result.intentType === 'RECURRING' || result.intentType === 'PAYABLE_BILL') {
    result.intentType = 'SINGLE_TRANSACTION';
  }

  if (result.batchDraftsList && result.batchDraftsList.length > 0) {
    result.isReadyForConfirmation = false;
    if (!result.questionToUser) {
      result.questionToUser = `Identifiquei ${result.batchDraftsList.length} movimentações independentes no seu pedido. Deseja confirmar os rascunhos em lote?`;
    }
    return result;
  }

  // 1. Caso especial: Vendas de produtos/serviços
  if (result.questionToUser && result.questionToUser.includes('pedidos no ERP')) {
    result.isReadyForConfirmation = false;
    return result;
  }

  // 3. Lançamento Único, Consulta ou Atualização
  if (result.intentType === 'QUERY_OR_UPDATE' || (result.candidateAccounts && result.candidateAccounts.length > 0)) {
    result.missingFields = [];
    result.isReadyForConfirmation = false;
    return result;
  }

  if (!result.amount && !result.totalAmount && !result.matchedAccount) {
    if (result.unknownByUser?.includes('amount')) {
      result.missingFields = [];
      result.isReadyForConfirmation = false;
      if (!result.questionToUser) {
        result.questionToUser = `Buscando movimentações de ${result.supplier || result.counterparty || 'fornecedor'} no ERP...`;
      }
      return result;
    }

    result.missingFields = ['amount'];
    result.isReadyForConfirmation = false;
    result.questionToUser = 'Qual foi o valor dessa movimentação?';
    return result;
  }

  if ((result.intentType as string) === 'PAYABLE_BILL' && !result.dueDate && !result.date) {
    if (result.unknownByUser?.includes('dueDate') || result.unknownByUser?.includes('date')) {
      result.missingFields = [];
      result.isReadyForConfirmation = false;
      return result;
    }

    result.missingFields = ['dueDate'];
    result.isReadyForConfirmation = false;
    result.questionToUser = `Qual é o vencimento deste boleto de ${result.supplier || result.description || 'conta'}?`;
    return result;
  }

  // 4. REGRA DE NEGÓCIO — EMPRÉSTIMOS E FORMA DE RECEBIMENTO
  const isLoan = Boolean(
    result.isLoan ||
    (result.categoryName && /empréstimo|emprestimo/i.test(result.categoryName)) ||
    (result.description && /empréstimo|emprestimo|emprestado|emprestei/i.test(result.description))
  );

  if (isLoan) {
    result.isLoan = true;
    if (!result.categoryName) result.categoryName = 'Empréstimos';
    if (!result.type) result.type = 'income';

    const creditorRaw = (result.creditor || result.supplier || result.counterparty || '').trim();
    const lowerCreditor = creditorRaw.toLowerCase();
    const lowerDesc = (result.description || '').toLowerCase();

    const bankKeywords = [
      'banco', 'itaú', 'itau', 'bradesco', 'santander', 'nubank', 'caixa',
      'inter', 'sicoob', 'sicredi', 'safra', 'btg', 'c6', 'financeira', 'cooperativa'
    ];

    const isBank =
      bankKeywords.some(k => lowerCreditor.includes(k)) ||
      lowerDesc.includes('do banco') ||
      lowerDesc.includes('no banco') ||
      lowerDesc.includes('do itau') ||
      lowerDesc.includes('do itaú') ||
      lowerDesc.includes('pelo banco') ||
      lowerDesc.includes('da financeira');

    const isPersonOrOther =
      !isBank &&
      creditorRaw.length > 0 &&
      !['banco', 'financeira', 'cooperativa', 'empréstimo', 'emprestimo'].includes(lowerCreditor);

    if (isBank) {
      result.creditorType = 'FINANCIAL_INSTITUTION';
      if (!result.creditor || result.creditor === 'Empréstimo' || result.creditor === 'Empréstimos') {
        const match = lowerDesc.match(/(?:do|no|na|pelo|da)?\s*(banco(?:\s+[a-z0-9]+)?|itaú|itau|bradesco|santander|nubank|caixa|inter|sicoob|sicredi|safra|btg|c6|financeira|cooperativa)/i);
        result.creditor = match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : (creditorRaw || 'Banco');
      }
      result.supplier = result.creditor;
      result.counterparty = result.creditor;
    } else if (isPersonOrOther) {
      result.creditorType = 'PERSON_OR_OTHER';
      result.creditor = creditorRaw;
      result.supplier = creditorRaw;
      result.counterparty = creditorRaw;
    } else {
      result.creditorType = 'UNKNOWN';
    }

    // A) Se o credor for UNKNOWN: perguntar primeiro "De quem foi o empréstimo?"
    if (result.creditorType === 'UNKNOWN') {
      if (!result.missingFields) result.missingFields = [];
      if (!result.missingFields.includes('creditor')) result.missingFields.push('creditor');
      result.isReadyForConfirmation = false;
      result.questionToUser = 'De quem foi o empréstimo?';
      return result;
    }

    // B) Se for FINANCIAL_INSTITUTION: inferência autorizada 'Transferência bancária' se paymentMethod for UNKNOWN/ausente
    if (result.creditorType === 'FINANCIAL_INSTITUTION') {
      const hasExplicitPayment = Boolean(
        result.paymentMethod &&
        result.paymentMethod !== 'UNKNOWN' &&
        result.paymentMethod !== 'UNKNOWN_BY_USER' &&
        result.paymentMethod.trim() !== ''
      );

      if (!hasExplicitPayment) {
        result.paymentMethod = 'Transferência bancária';
      }
    }

    // C) Se for PERSON_OR_OTHER: NÃO infere. Se paymentMethod for UNKNOWN, pergunta como recebeu.
    if (result.creditorType === 'PERSON_OR_OTHER') {
      const hasExplicitPayment = Boolean(
        result.paymentMethod &&
        result.paymentMethod !== 'UNKNOWN' &&
        result.paymentMethod !== 'UNKNOWN_BY_USER' &&
        result.paymentMethod.trim() !== ''
      );

      if (!hasExplicitPayment) {
        result.paymentMethod = 'UNKNOWN';
        if (!result.missingFields) result.missingFields = [];
        if (!result.missingFields.includes('paymentMethod')) result.missingFields.push('paymentMethod');
        result.isReadyForConfirmation = false;
        const amt = result.amount || result.totalAmount;
        const formattedAmount = amt
          ? `R$ ${amt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '';
        result.questionToUser = formattedAmount
          ? `Como você recebeu os ${formattedAmount} do ${result.creditor}?`
          : `Qual foi a forma de recebimento do empréstimo de ${result.creditor}?`;
        return result;
      }
    }
  }

  // 5. REGRA DE NEGÓCIO — DESPESA EMPRESARIAL x GASTO PESSOAL / PRÓ-LABORE
  if (result.type === 'expense') {
    const descLower = (result.description || '').toLowerCase();
    const catLower = (result.categoryName || '').toLowerCase();
    const combinedText = `${descLower} ${catLower}`;

    const isFuel = /combustível|combustivel|gasolina|etanol|diesel|abasteci|abastecimento|abastecendo|posto/i.test(combinedText);
    const isVehicleMaintenance = /manutenção|manutencao|oficina|óleo|oleo|pneu|pneus|peças|pecas|revisão|revisao|reparos|mecanico|mecânico|bateria|alinhamento|balanceamento|lavagem|conserto|reparo/i.test(combinedText);

    if (isFuel) {
      result.categoryName = 'Combustível';
      result.businessPurpose = 'BUSINESS';
    } else if (isVehicleMaintenance) {
      result.categoryName = 'Manutenção de Veículos';
      result.businessPurpose = 'BUSINESS';
    } else {
      const isElectricity = /luz|energia|eletricidade/i.test(combinedText);
      const isWater = /água|agua|sanepar/i.test(combinedText);
      const isInternetPhone = /internet|telefone|telefonia/i.test(combinedText);
      const isRentCondo = /aluguel|condomínio|condominio/i.test(combinedText);
      const isDomesticService = /compras domésticas|compras domesticas|serviços residenciais|servicos residenciais|assinatura/i.test(combinedText);
      const dualItemMatch = combinedText.match(/\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|computador|notebook|laptop|celular|smartphone|impressora|móveis|moveis|móvel|movel|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro|mesa|cadeira)\b/i);

      const isDualItem = Boolean(dualItemMatch);
      const isOtherAmbiguous = /material|materiais|compras|despesas/i.test(combinedText);
      const isUtilityBill = isElectricity || isWater || isInternetPhone || isRentCondo || isDomesticService;
      const isAmbiguousExpense = isUtilityBill || isDualItem || isOtherAmbiguous;

      if (isAmbiguousExpense) {
        const isExplicitStore = /da loja|do depósito|do deposito|da fábrica|da fabrica|da empresa|do comércio|do comercio|loja|escritório|escritorio|pra loja|para a loja|na loja|para o negócio|para o negocio/i.test(combinedText);
        const isExplicitPersonal = /da minha casa|para minha casa|pra casa|minha casa|da casa|minha|pessoal|uso pessoal|para mim|pra mim|pra minha mãe|pra minha mae|minha mãe|minha mae|para o gerente|do sócio|do socio|casa/i.test(combinedText);
        const isResale = /para revender|para revenda|para vender|revenda|revender/i.test(combinedText);

        const hasKnownCategory = Boolean(
          result.categoryName &&
          result.categoryName !== 'UNKNOWN' &&
          result.categoryName !== 'Despesa não classificada' &&
          result.categoryName !== 'Contas de Consumo' &&
          result.categoryName !== 'Equipamentos da Empresa' &&
          result.categoryName !== 'Pró-labore'
        );

        if (isResale && (!result.categoryName || result.categoryName === 'UNKNOWN' || result.categoryName === 'Despesa não classificada')) {
          result.businessPurpose = 'BUSINESS';
          result.categoryName = 'Compra de estoque';
        } else if (isExplicitStore || result.businessPurpose === 'BUSINESS' || hasKnownCategory) {
          result.businessPurpose = 'BUSINESS';
          if (!result.categoryName || result.categoryName === 'UNKNOWN' || result.categoryName === 'Despesa não classificada') {
            result.categoryName = isDualItem ? 'Equipamentos da Empresa' : 'Contas de Consumo';
          }
        } else if (isExplicitPersonal || result.businessPurpose === 'PERSONAL') {
          result.businessPurpose = 'PERSONAL';
          result.categoryName = 'Pró-labore';
        } else if (!result.businessPurpose || result.businessPurpose === 'UNKNOWN') {
          result.businessPurpose = 'UNKNOWN';
          result.categoryName = 'UNKNOWN';
          if (!result.missingFields) result.missingFields = [];
          if (!result.missingFields.includes('businessPurpose')) {
            result.missingFields.push('businessPurpose');
          }
          result.isReadyForConfirmation = false;

          if (isDualItem && dualItemMatch) {
            const rawItemName = dualItemMatch[1].toLowerCase();
            let itemName = rawItemName;
            if (rawItemName === 'tv') itemName = 'televisão';
            else if (rawItemName === 'ar condicionado') itemName = 'ar-condicionado';

            const isMasculine = /notebook|laptop|computador|celular|smartphone|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro/i.test(itemName);
            const demonstrative = isMasculine ? 'Esse' : 'Essa';
            result.questionToUser = `${demonstrative} ${itemName} é para a loja ou é uma compra pessoal?`;
          } else {
            let kindName = 'de luz';
            if (isWater) kindName = 'de água';
            else if (isInternetPhone) kindName = 'de internet';
            else if (isRentCondo) kindName = 'de aluguel';

            result.questionToUser = `Essa conta ${kindName} é da loja ou é uma conta pessoal?`;
          }
          return result;
        }
      }
    }
  }

  // 6. DECISION-002: Cartão Genérico -> Perguntar se foi no Débito ou no Crédito
  const lowerDesc = (result.description || '').toLowerCase();

  if (!result.paymentMethod || result.paymentMethod === 'UNKNOWN') {
    if (/\bpix\b/i.test(lowerDesc)) result.paymentMethod = 'Pix';
    else if (/débito|debito/i.test(lowerDesc)) result.paymentMethod = 'Cartão de Débito';
    else if (/crédito|credito/i.test(lowerDesc)) result.paymentMethod = 'Cartão de Crédito';
    else if (/dinheiro/i.test(lowerDesc)) result.paymentMethod = 'Dinheiro';
  }

  const isGenericCard = /cartão|cartao/i.test(lowerDesc) && !/débito|debito|crédito|credito|credto/i.test(lowerDesc);

  if (isGenericCard && (result.paymentMethod === 'Cartão' || result.paymentMethod === 'Cartão de Crédito' || result.paymentMethod === 'UNKNOWN' || !result.paymentMethod)) {
    result.paymentMethod = 'UNKNOWN';
    if (!result.missingFields) result.missingFields = [];
    if (!result.missingFields.includes('paymentMethod')) result.missingFields.push('paymentMethod');
    result.isReadyForConfirmation = false;
    result.questionToUser = 'Foi no cartão de débito ou de crédito?';
    return result;
  }

  // 7. DECISION-003: Incerteza / Estimativa do Usuário
  const hasUncertainty = /\b(uns|pouco|acho\s+que|não\s+tenho\s+certeza|nao\s+tenho\s+certeza|talvez)\b/i.test(lowerDesc);
  if (hasUncertainty && result.isEstimated !== false) {
    result.isEstimated = true;
    result.isReadyForConfirmation = false;

    if (/\b(uns|pouco|acho\s+que)\b/i.test(lowerDesc) && result.amount) {
      const formattedAmt = `R$ ${result.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      result.questionToUser = `Você quer registrar ${formattedAmt} como estimativa ou prefere verificar o valor exato no comprovante?`;
    } else {
      result.questionToUser = `Identifiquei uma estimativa no lançamento. Deseja confirmar este valor aproximado ou informar o valor exato?`;
    }
    return result;
  } else if (!hasUncertainty) {
    result.isEstimated = false;
  }

  // 8. DECISION-001: Múltiplas Movimentações na Mesma Mensagem (batchDraftsList)
  const multipleFacts = extractMultipleFinancialFacts(result.description || '', todayStr);
  if (multipleFacts.length >= 2 && (!result.batchDraftsList || result.batchDraftsList.length === 0)) {
    result.batchDraftsList = multipleFacts;
    result.isReadyForConfirmation = false;
    const pendingQuestion = result.batchDraftsList.find(d => d.questionToUser && d.questionToUser !== 'Confere?')?.questionToUser;
    result.questionToUser = pendingQuestion || `Identifiquei ${result.batchDraftsList.length} movimentações nesta mensagem. Deseja confirmar todas?`;
    return result;
  }

  // 9. REGRA OBRIGATÓRIA FACTUAL: Forma de pagamento é obrigatória para qualquer movimentação
  const isFutureCommitment = /começando\s+mês\s+que\s+vem|comecando\s+mes\s+que\s+vem|vence\s+mês\s+que\s+vem|vence\s+mes\s+que\s+vem/i.test(result.description || '');

  const hasPaymentMethod = Boolean(
    (result.paymentMethod &&
    result.paymentMethod !== 'UNKNOWN' &&
    result.paymentMethod !== 'UNKNOWN_BY_USER' &&
    result.paymentMethod.trim() !== '') ||
    (result.intentType as string) === 'INSTALLMENT' ||
    Boolean(result.installmentList?.length)
  );

  if (isFutureCommitment && (!result.installmentList || result.installmentList.length === 0)) {
    result.isReadyForConfirmation = false;
    result.questionToUser = 'Este lançamento contém parcelas futuras. Você deseja registrar algum pagamento que já foi efetuado hoje?';
    return result;
  }

  if (!hasPaymentMethod) {
    result.paymentMethod = 'UNKNOWN';
    if (!result.missingFields) result.missingFields = [];
    if (!result.missingFields.includes('paymentMethod')) {
      result.missingFields.push('paymentMethod');
    }
    result.isReadyForConfirmation = false;
    const isIncome = result.type === 'income';
    result.questionToUser = isIncome
      ? 'Qual foi a forma de recebimento?'
      : 'Qual foi a forma de pagamento?';
    return result;
  }

  result.missingFields = (result.missingFields || []).filter(f => f !== 'paymentMethod' && f !== 'businessPurpose');
  if (result.missingFields.length > 0) {
    result.isReadyForConfirmation = false;
  } else {
    result.isReadyForConfirmation = true;
    result.questionToUser = 'Confere?';
  }
  return result;
}

let globalUnrealizedFactsContext: ParsedFinancialIntent[] = [];

export function extractMultipleFinancialFacts(
  text: string,
  todayStr: string
): ParsedFinancialIntent[] {
  const lower = text.toLowerCase().trim();
  if (!lower) return [];

  // Fatos/itens financeiros conhecidos
  const factKeywords: { key: string; label: string; cat: string; type?: 'expense' | 'income'; isVehicle?: boolean; isDual?: boolean }[] = [
    { key: 'luz', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'energia', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'eletricidade', label: 'Pagamento de conta de luz', cat: 'Contas de Consumo' },
    { key: 'internet', label: 'Pagamento de internet', cat: 'Contas de Consumo' },
    { key: 'telefonia', label: 'Pagamento de telefone', cat: 'Contas de Consumo' },
    { key: 'água', label: 'Pagamento de conta de água', cat: 'Contas de Consumo' },
    { key: 'agua', label: 'Pagamento de conta de água', cat: 'Contas de Consumo' },
    { key: 'aluguel', label: 'Pagamento de aluguel', cat: 'Aluguel' },
    { key: 'gasolina', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    { key: 'combustível', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    { key: 'combustivel', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    { key: 'abasteci', label: 'Abastecimento de combustível', cat: 'Combustível', isVehicle: true },
    { key: 'oficina', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    { key: 'óleo', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    { key: 'oleo', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    { key: 'pneus', label: 'Manutenção de veículo', cat: 'Manutenção de Veículos', isVehicle: true },
    { key: 'frete', label: 'Pagamento de frete', cat: 'Frete' },
    { key: 'mercadoria', label: 'Compra de estoque', cat: 'Compra de estoque' },
    { key: 'estoque', label: 'Compra de estoque', cat: 'Compra de estoque' },
    { key: 'geladeira', label: 'Compra de geladeira', cat: 'Equipamentos da Empresa', isDual: true },
    { key: 'televisão', label: 'Compra de televisão', cat: 'Equipamentos da Empresa', isDual: true },
    { key: 'televisao', label: 'Compra de televisão', cat: 'Equipamentos da Empresa', isDual: true },
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

  const isRealizedPayment = /\b(paguei|quitei|efetuei|acabei\s+de\s+pagar|paguei\s+no|paguei\s+na|baixei|recebi|transferi|caiu|entrou|paguei\s+as\s+duas|paguei\s+os\s+dois|paguei\s+tudo|fiz\s+um\s+pagamento|fiz\s+o\s+pagamento|fiz\s+pagamento|fiz\s+um\s+pix|fiz\s+pix|fiz\s+uma\s+transferência|fiz\s+uma\s+transferencia|fiz\s+transferência|fiz\s+transferencia|fiz\s+um\s+depósito|fiz\s+um\s+deposito|pagamos|realizei\s+o\s+pagamento|realizei\s+pagamento)\b/i.test(lower);

  // Divide o texto em cláusulas por vírgula, ponto, ponto-e-vírgula e conjunções " e ", " e também "
  const clauses = lower.split(/(?:,|\.|\;|\be\b|\betambém\b|\be\s+também\b)/i).map(c => c.trim()).filter(Boolean);

  const foundItems: { label: string; cat: string; type: 'expense' | 'income'; isVehicle?: boolean; isDual?: boolean; amount: number; paymentMethod: string; key: string }[] = [];

  for (const clause of clauses) {
    const numMatch = clause.match(/(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i);
    if (!numMatch) continue;

    const valStr = numMatch[1].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(valStr);
    if (isNaN(amount) || amount <= 0) continue;

    for (const fk of factKeywords) {
      if (clause.includes(fk.key)) {
        if (foundItems.some(i => i.label === fk.label)) continue;

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
      const presentKeywords: { fk: typeof factKeywords[0]; pos: number }[] = [];
      for (const fk of factKeywords) {
        const idx = lower.indexOf(fk.key);
        if (idx !== -1 && !presentKeywords.some(pk => pk.fk.label === fk.label)) {
          presentKeywords.push({ fk, pos: idx });
        }
      }

      presentKeywords.sort((a, b) => a.pos - b.pos);

      const availableNumbers = numberMatches.map(m => {
        const valStr = m[1].replace(/\./g, '').replace(',', '.');
        return {
          numVal: parseFloat(valStr),
          pos: m.index || 0,
          used: false,
        };
      }).filter(n => !isNaN(n.numVal) && n.numVal > 0);

      // 2. Um mesmo valor monetário não pode ser consumido por dois fatos independentes
      const allocatedAmountIndexes = new Set<number>();
      const numbersComeAfterAllItems = presentKeywords.length > 0 &&
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
            const nextKeywordPosition = presentKeywords[keywordIndex + 1]?.pos ?? Math.min(lower.length, availableNumbers[0]?.pos ?? lower.length);
            const kwSub = lower.substring(pk.pos, Math.max(pk.pos + pk.fk.key.length, nextKeywordPosition));
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
    return foundItems.map(item => {
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

export function buildGroupedQuestion(
  batch: ParsedFinancialIntent[]
): string | null {
  if (!batch || batch.length === 0) return null;

  const unknownPurposeDrafts = batch.filter(
    d => d.businessPurpose === 'UNKNOWN' || d.missingFields?.includes('businessPurpose')
  );

  if (unknownPurposeDrafts.length >= 2) {
    const itemNames = unknownPurposeDrafts.map(d => {
      const desc = (d.description || '').toLowerCase();
      if (desc.includes('luz') || desc.includes('energia') || desc.includes('eletricidade')) return 'luz';
      if (desc.includes('internet')) return 'internet';
      if (desc.includes('água') || desc.includes('agua')) return 'água';
      if (desc.includes('aluguel')) return 'aluguel';
      if (desc.includes('geladeira')) return 'geladeira';
      if (desc.includes('televisão') || desc.includes('televisao') || desc.includes('tv')) return 'televisão';
      return desc.replace(/^pagamento de (?:conta de )?/i, '').replace(/^compra de /i, '').trim();
    });

    const joinedItems = itemNames.length === 2
      ? `${itemNames[0]} e ${itemNames[1]}`
      : `${itemNames.slice(0, -1).join(', ')} e ${itemNames[itemNames.length - 1]}`;

    const isDualItem = unknownPurposeDrafts.some(d => /geladeira|televisão|televisao|tv|micro-ondas|ar-condicionado|computador/i.test(d.description || ''));
    if (isDualItem) {
      return `Esses itens de ${joinedItems} são para a loja ou são compras pessoais?`;
    }
    return `Essas contas de ${joinedItems} são da loja ou são pessoais?`;
  } else if (unknownPurposeDrafts.length === 1) {
    return unknownPurposeDrafts[0].questionToUser || null;
  }

  const unknownPaymentDrafts = batch.filter(
    d => !d.paymentMethod || d.paymentMethod === 'UNKNOWN' || d.missingFields?.includes('paymentMethod')
  );

  if (unknownPaymentDrafts.length >= 2) {
    const itemNames = unknownPaymentDrafts.map(d => {
      const desc = (d.description || '').toLowerCase();
      if (desc.includes('luz')) return 'luz';
      if (desc.includes('internet')) return 'internet';
      if (desc.includes('água') || desc.includes('agua')) return 'água';
      return desc.replace(/^pagamento de (?:conta de )?/i, '').replace(/^compra de /i, '').trim();
    });

    const joinedItems = itemNames.length === 2
      ? `${itemNames[0]} e ${itemNames[1]}`
      : `${itemNames.slice(0, -1).join(', ')} e ${itemNames[itemNames.length - 1]}`;

    return `Qual foi a forma de pagamento das contas de ${joinedItems}?`;
  } else if (unknownPaymentDrafts.length === 1) {
    return unknownPaymentDrafts[0].questionToUser || null;
  }

  const firstPending = batch.find(d => d.questionToUser && d.questionToUser !== 'Confere?');
  return firstPending?.questionToUser || null;
}

export function processFinancialInput(
  text: string,
  todayStr = new Date().toISOString().split('T')[0],
  options?: { rememberedUnrealizedFacts?: ParsedFinancialIntent[] }
): { draft: ParsedFinancialIntent | null; isRealized?: boolean; rememberedFacts?: ParsedFinancialIntent[] } {
  const lower = text.toLowerCase().trim();
  const isRealizedPayment = /\b(paguei|quitei|efetuei|acabei\s+de\s+pagar|paguei\s+no|paguei\s+na|baixei|recebi|transferi|caiu|entrou|paguei\s+as\s+duas|paguei\s+os\s+dois|paguei\s+tudo|fiz\s+um\s+pagamento|fiz\s+o\s+pagamento|fiz\s+pagamento|fiz\s+um\s+pix|fiz\s+pix|fiz\s+uma\s+transferência|fiz\s+uma\s+transferencia|fiz\s+transferência|fiz\s+transferencia|fiz\s+um\s+depósito|fiz\s+um\s+deposito|pagamos|realizei\s+o\s+pagamento|realizei\s+pagamento)\b/i.test(lower);

  const activeContext = options?.rememberedUnrealizedFacts || globalUnrealizedFactsContext;

  // 1. Múltiplos Fatos novos na mesma mensagem (tem prioridade absoluta sobre contexto residual)
  const multipleFacts = extractMultipleFinancialFacts(text, todayStr);
  if (multipleFacts.length >= 2) {
    if (!isRealizedPayment) {
      globalUnrealizedFactsContext = multipleFacts;
    } else {
      globalUnrealizedFactsContext = [];
    }
    const groupedQuestion = buildGroupedQuestion(multipleFacts);
    const allMissing = Array.from(new Set(multipleFacts.flatMap(d => d.missingFields || [])));
    const mainDraft: ParsedFinancialIntent = {
      intentType: 'SINGLE_TRANSACTION',
      type: multipleFacts[0].type,
      amount: multipleFacts[0].amount,
      description: multipleFacts[0].description,
      categoryName: multipleFacts[0].categoryName,
      paymentMethod: multipleFacts[0].paymentMethod,
      businessPurpose: multipleFacts[0].businessPurpose,
      missingFields: allMissing,
      batchDraftsList: multipleFacts,
      isReadyForConfirmation: false,
      isRealized: isRealizedPayment,
      questionToUser: groupedQuestion || `Identifiquei ${multipleFacts.length} movimentações nesta mensagem. Qual foi a forma de pagamento?`,
    };

    return { draft: mainDraft, isRealized: isRealizedPayment, rememberedFacts: multipleFacts };
  }

  // 2. Resposta de pagamento a fatos não realizados prévios
  if (isRealizedPayment && activeContext.length >= 1) {
    let targetFacts: ParsedFinancialIntent[] = [];
    const isGenericPaymentRef = /\b(as\s+duas|os\s+dois|tudo|ambas|ambos|paguei\s+no|paguei\s+na|foi\s+no|foi\s+na|no\s+pix|no\s+debito|no\s+débito|no\s+credito|no\s+crédito|em\s+dinheiro)\b/i.test(lower);

    if (lower.includes('luz') && !lower.includes('internet')) {
      targetFacts = activeContext.filter(f => (f.description || '').toLowerCase().includes('luz'));
    } else if (lower.includes('internet') && !lower.includes('luz')) {
      targetFacts = activeContext.filter(f => (f.description || '').toLowerCase().includes('internet'));
    } else if (isGenericPaymentRef) {
      targetFacts = activeContext;
    } else {
      // Verifica se a mensagem casa com a descrição de algum fato pendente
      targetFacts = activeContext.filter(f => f.description && lower.includes(f.description.toLowerCase()));
    }

    if (targetFacts.length > 0) {
      let turnPaymentMethod: string | undefined = undefined;
      if (/\b(?:pix|pics)\b/i.test(lower)) turnPaymentMethod = 'Pix';
      else if (/débito|debito/i.test(lower)) turnPaymentMethod = 'Cartão de Débito';
      else if (/crédito|credito/i.test(lower)) turnPaymentMethod = 'Cartão de Crédito';
      else if (/dinheiro/i.test(lower)) turnPaymentMethod = 'Dinheiro';

      const realizedBatch = targetFacts.map(f => validateParsedIntent({
        ...f,
        paymentMethod: turnPaymentMethod || f.paymentMethod || 'UNKNOWN',
        isRealized: true,
        isReadyForConfirmation: false,
      }, todayStr));

      globalUnrealizedFactsContext = [];
      const pendingQuestion = buildGroupedQuestion(realizedBatch);
      const mainDraft: ParsedFinancialIntent = {
        intentType: 'SINGLE_TRANSACTION',
        type: realizedBatch[0].type,
        amount: realizedBatch[0].amount,
        description: realizedBatch[0].description,
        categoryName: realizedBatch[0].categoryName,
        paymentMethod: realizedBatch[0].paymentMethod,
        businessPurpose: realizedBatch[0].businessPurpose,
        missingFields: Array.from(new Set(realizedBatch.flatMap(d => d.missingFields || []))),
        batchDraftsList: realizedBatch.length >= 2 ? realizedBatch : null,
        isReadyForConfirmation: false,
        isRealized: true,
        questionToUser: pendingQuestion || `Identifiquei ${realizedBatch.length} movimentação(ões) nesta mensagem. Deseja confirmar?`,
      };

      return { draft: mainDraft, isRealized: true };
    }
  }

  // 3. Fato Único
  const numMatch = text.match(/(?:r\$\s*)?(\d+(?:\.\d{3})?(?:,\d{1,2})?)/i);
  const amt = numMatch ? parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.')) : null;

  const rawHeuristic = fallbackHeuristicParser(text, [], todayStr);
  rawHeuristic.isRealized = isRealizedPayment;
  const single = validateParsedIntent(rawHeuristic, todayStr);

  return { draft: single, isRealized: isRealizedPayment };
}
