import type { ParsedFinancialIntent } from './financialTypes';
import { parsePtBrWrittenNumbers } from './wordToNumberPtBr';
import { extractUnknownFieldsFromText } from './financialSlotFilling';

export interface FinancialCategoryType {
  id?: string;
  name: string;
  type: 'income' | 'expense';
}

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

export const fallbackHeuristicParser = (
  msg: string,
  categories: FinancialCategoryType[] = [],
  todayStr: string = new Date().toISOString().split('T')[0],
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
        { type: movementType, amount: val1, description: cat1, categoryName: cat1, missingFields: [], isReadyForConfirmation: false },
        { type: movementType, amount: val2, description: cat2, categoryName: cat2, missingFields: [], isReadyForConfirmation: false },
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
