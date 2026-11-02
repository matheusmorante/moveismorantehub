import type { ParsedFinancialIntent } from './financialTypes';

interface FinancialMovementClassification {
  businessPurpose: 'BUSINESS' | 'PERSONAL' | 'PERSONAL_PARTNER' | 'UNKNOWN' | null;
  categoryName: string | null;
  isAmbiguous: boolean;
}

export const classifyFinancialMovement = (
  text: string,
  movementType: 'income' | 'expense',
  activeDraft?: ParsedFinancialIntent | null
): FinancialMovementClassification => {
  const isExplicitStore =
    /da loja|do depósito|do deposito|da fábrica|da fabrica|da empresa|do comércio|do comercio|loja|escritório|escritorio|pra loja|para a loja|na loja|para o negócio|para o negocio/i.test(
      text
    );
  const isExplicitPersonal =
    /da minha casa|para minha casa|pra casa|minha casa|da casa|minha|pessoal|uso pessoal|da casa da gerente|gerente|do sócio|do socio|casa/i.test(
      text
    );
  const isUtilityBill =
    /luz|energia|eletricidade|água|agua|sanepar|internet|telefone|telefonia|aluguel|condomínio|condominio/i.test(
      text
    );
  const dualItemMatch = text.match(
    /\b(televisão|televisao|tv|geladeira|refrigerador|freezer|micro-ondas|microondas|ar-condicionado|ar\s+condicionado|computador|notebook|laptop|celular|smartphone|impressora|móveis|moveis|móvel|movel|eletrodoméstico|eletrodomesticos|eletrônico|eletronicos|equipamento|equipamentos|utensílio|utensilios|fogão|fogao|filtro|mesa|cadeira)\b/i
  );
  const isDualItem = Boolean(dualItemMatch);
  const isAmbiguous = isUtilityBill || isDualItem;

  let businessPurpose: FinancialMovementClassification['businessPurpose'] =
    activeDraft?.businessPurpose || null;
  let categoryName = activeDraft?.categoryName || null;

  if (movementType === 'expense') {
    if (
      text.includes('combustível') ||
      text.includes('combustivel') ||
      text.includes('gasolina') ||
      text.includes('etanol') ||
      text.includes('diesel') ||
      text.includes('abasteci') ||
      text.includes('abastecimento') ||
      text.includes('posto')
    ) {
      categoryName = 'Combustível';
      businessPurpose = 'BUSINESS';
    } else if (
      text.includes('manutenção') ||
      text.includes('manutencao') ||
      text.includes('oficina') ||
      text.includes('troca de óleo') ||
      text.includes('troca de oleo') ||
      text.includes('pneus') ||
      text.includes('peças') ||
      text.includes('pecas') ||
      text.includes('revisão') ||
      text.includes('revisao') ||
      text.includes('mecânico') ||
      text.includes('mecanico') ||
      text.includes('bateria') ||
      text.includes('alinhamento') ||
      text.includes('balanceamento')
    ) {
      categoryName = 'Manutenção de Veículos';
      businessPurpose = 'BUSINESS';
    } else if (
      text.includes('salário') ||
      text.includes('salario') ||
      text.includes('folha de pagamento') ||
      text.includes('adiantamento') ||
      text.includes('comissão') ||
      text.includes('comissao') ||
      text.includes('13º') ||
      text.includes('férias') ||
      text.includes('ferias')
    ) {
      categoryName = 'Salários';
      businessPurpose = 'BUSINESS';
    } else if (
      text.includes('imposto') ||
      text.includes('tributo') ||
      text.includes('das') ||
      text.includes('simples nacional') ||
      text.includes('fgts') ||
      text.includes('inss') ||
      text.includes('darf')
    ) {
      categoryName = 'Impostos e Tributos';
      businessPurpose = 'BUSINESS';
    } else if (text.includes('frete')) {
      categoryName = 'Frete';
      businessPurpose = 'BUSINESS';
    } else if (
      text.includes('mercadoria') ||
      text.includes('estoque') ||
      text.includes('revenda') ||
      text.includes('revender')
    ) {
      categoryName = 'Compra de estoque';
      businessPurpose = 'BUSINESS';
    } else if (isAmbiguous) {
      if (isExplicitStore || businessPurpose === 'BUSINESS') {
        businessPurpose = 'BUSINESS';
        categoryName = isDualItem ? 'Equipamentos da Empresa' : 'Contas de Consumo';
      } else if (isExplicitPersonal || businessPurpose === 'PERSONAL') {
        businessPurpose = 'PERSONAL';
        categoryName = 'Pró-labore';
      } else {
        businessPurpose = 'UNKNOWN';
        categoryName = 'UNKNOWN';
      }
    } else {
      categoryName = 'Despesa não classificada';
    }
  } else {
    const isVenda = text.includes('vendi') || text.includes('venda') || text.includes('vendas');
    categoryName = isVenda ? 'Vendas' : 'Outras receitas';
  }

  return { businessPurpose, categoryName, isAmbiguous };
};
