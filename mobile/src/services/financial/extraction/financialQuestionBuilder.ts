import type { ParsedFinancialIntent } from './financialTypes';

export function buildGroupedQuestion(batch: ParsedFinancialIntent[]): string | null {
  if (!batch || batch.length === 0) return null;

  const unknownPurposeDrafts = batch.filter(
    (d) => d.businessPurpose === 'UNKNOWN' || d.missingFields?.includes('businessPurpose')
  );

  if (unknownPurposeDrafts.length >= 2) {
    const itemNames = unknownPurposeDrafts.map((d) => {
      const desc = (d.description || '').toLowerCase();
      if (desc.includes('luz') || desc.includes('energia') || desc.includes('eletricidade'))
        return 'luz';
      if (desc.includes('internet')) return 'internet';
      if (desc.includes('água') || desc.includes('agua')) return 'água';
      if (desc.includes('aluguel')) return 'aluguel';
      if (desc.includes('geladeira')) return 'geladeira';
      if (desc.includes('televisão') || desc.includes('televisao') || desc.includes('tv'))
        return 'televisão';
      return desc
        .replace(/^pagamento de (?:conta de )?/i, '')
        .replace(/^compra de /i, '')
        .trim();
    });

    const joinedItems =
      itemNames.length === 2
        ? `${itemNames[0]} e ${itemNames[1]}`
        : `${itemNames.slice(0, -1).join(', ')} e ${itemNames[itemNames.length - 1]}`;

    const isDualItem = unknownPurposeDrafts.some((d) =>
      /geladeira|televisão|televisao|tv|micro-ondas|ar-condicionado|computador/i.test(
        d.description || ''
      )
    );
    if (isDualItem) {
      return `Esses itens de ${joinedItems} são para a loja ou são compras pessoais?`;
    }
    return `Essas contas de ${joinedItems} são da loja ou são pessoais?`;
  } else if (unknownPurposeDrafts.length === 1) {
    return unknownPurposeDrafts[0].questionToUser || null;
  }

  const unknownPaymentDrafts = batch.filter(
    (d) =>
      !d.paymentMethod ||
      d.paymentMethod === 'UNKNOWN' ||
      d.missingFields?.includes('paymentMethod')
  );

  if (unknownPaymentDrafts.length >= 2) {
    const itemNames = unknownPaymentDrafts.map((d) => {
      const desc = (d.description || '').toLowerCase();
      if (desc.includes('luz')) return 'luz';
      if (desc.includes('internet')) return 'internet';
      if (desc.includes('água') || desc.includes('agua')) return 'água';
      return desc
        .replace(/^pagamento de (?:conta de )?/i, '')
        .replace(/^compra de /i, '')
        .trim();
    });

    const joinedItems =
      itemNames.length === 2
        ? `${itemNames[0]} e ${itemNames[1]}`
        : `${itemNames.slice(0, -1).join(', ')} e ${itemNames[itemNames.length - 1]}`;

    return `Qual foi a forma de pagamento das contas de ${joinedItems}?`;
  } else if (unknownPaymentDrafts.length === 1) {
    return unknownPaymentDrafts[0].questionToUser || null;
  }

  const firstPending = batch.find((d) => d.questionToUser && d.questionToUser !== 'Confere?');
  return firstPending?.questionToUser || null;
}
