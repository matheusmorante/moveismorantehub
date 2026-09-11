import type { ParsedFinancialIntent } from '../financialTypes';

export interface BusinessPurposeValidationResult {
  handled: boolean;
  result?: ParsedFinancialIntent;
}

/**
 * Validação de propósito comercial x pessoal / pró-labore.
 * Extraído para isolar regras fiscais e de classificação de despesas.
 */
export function applyBusinessPurposeRules(
  result: ParsedFinancialIntent
): BusinessPurposeValidationResult {
  if (result.type !== 'expense') {
    return { handled: false };
  }

  const descLower = (result.description || '').toLowerCase();
  const catLower = (result.categoryName || '').toLowerCase();
  const combinedText = `${descLower} ${catLower}`;

  const isFuel = /combustível|combustivel|gasolina|etanol|diesel|abasteci|abastecimento|abastecendo|posto/i.test(combinedText);
  const isVehicleMaintenance = /manutenção|manutencao|oficina|óleo|oleo|pneu|pneus|peças|pecas|revisão|revisao|reparos|mecanico|mecânico|bateria|alinhamento|balanceamento|lavagem|conserto|reparo/i.test(combinedText);
  const isPayroll = /salário|salario|folha de pagamento|adiantamento salarial|comissão|comissao|vale transporte|férias|ferias|décimo terceiro|decimo terceiro|13º/i.test(combinedText);
  const isTax = /imposto|tributo|\bdas\b|simples nacional|icms|darf|fgts|inss|\bgps\b/i.test(combinedText);
  const isFreight = /frete|carreto/i.test(combinedText);
  const isStock = /estoque|mercadoria|fornecedor|matéria-prima|materia-prima/i.test(combinedText);

  if (isFuel) {
    result.categoryName = 'Combustível';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }
  if (isVehicleMaintenance) {
    result.categoryName = 'Manutenção de Veículos';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }
  if (isPayroll) {
    result.categoryName = 'Salários';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }
  if (isTax) {
    result.categoryName = 'Impostos e Tributos';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }
  if (isFreight) {
    result.categoryName = 'Frete';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }
  if (isStock) {
    result.categoryName = 'Compra de estoque';
    result.businessPurpose = 'BUSINESS';
    return { handled: false, result };
  }

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
      return { handled: true, result };
    }
  }

  return { handled: false, result };
}
