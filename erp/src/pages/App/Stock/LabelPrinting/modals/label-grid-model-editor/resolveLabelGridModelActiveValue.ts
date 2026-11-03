import type { useLabelGridModelSession } from './useLabelGridModelSession';

type Session = ReturnType<typeof useLabelGridModelSession>;

export const resolveLabelGridModelActiveValue = (
  selectedElement: string | null,
  isPromoPreview: boolean,
  session: Session
) => {
  if (selectedElement === 'name')
    return {
      font: session.nameFontSize,
      color: session.nameColor,
      bold: session.nameBold,
      align: session.nameAlign,
      valign: session.nameVAlign,
      text: 'Sofá de Canto Luxo Reclinável',
    };
  if (selectedElement === 'mainPrice') {
    if (isPromoPreview)
      return {
        font: session.promoPriceFontSize,
        color: session.promoPriceColor,
        bold: session.promoPriceBold,
        align: session.promoPriceAlign,
        valign: session.promoPriceVAlign,
        text: '2.990',
      };
    return {
      font: session.priceFontSize,
      color: session.priceColor,
      bold: session.priceBold,
      align: session.priceAlign,
      valign: session.priceVAlign,
      text: '3.490',
    };
  }
  if (selectedElement === 'oldPrice')
    return {
      font: session.oldPriceFontSize,
      color: session.oldPriceColor,
      bold: session.oldPriceBold,
      align: session.oldPriceAlign,
      valign: session.oldPriceVAlign,
      text: '3.490',
    };
  if (selectedElement === 'priceSymbol') {
    if (isPromoPreview)
      return {
        font: session.promoPriceSymbolFontSize,
        color: session.promoPriceSymbolColor,
        bold: session.promoPriceSymbolBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: 'R$',
      };
    return {
      font: session.priceSymbolFontSize,
      color: session.priceSymbolColor,
      bold: session.priceSymbolBold,
      align: 'center' as const,
      valign: 'middle' as const,
      text: 'R$',
    };
  }
  if (selectedElement === 'priceDecimals') {
    if (isPromoPreview)
      return {
        font: session.promoPriceDecimalsFontSize,
        color: session.promoPriceDecimalsColor,
        bold: session.promoPriceDecimalsBold,
        align: 'center' as const,
        valign: 'middle' as const,
        text: ',00',
      };
    return {
      font: session.priceDecimalsFontSize,
      color: session.priceDecimalsColor,
      bold: session.priceDecimalsBold,
      align: 'center' as const,
      valign: 'middle' as const,
      text: ',00',
    };
  }
  if (selectedElement?.toString().startsWith('extra_')) {
    const fields = isPromoPreview ? session.extraFieldsPromo : session.extraFields;
    const field = fields.find((candidate) => candidate.id === selectedElement);
    if (field)
      return {
        font: field.size,
        color: field.color,
        bold: field.bold,
        align: field.align || 'center',
        valign: 'middle' as const,
        text: field.text,
      };
  }
  return {
    font: 0,
    color: '#ccc',
    bold: false,
    align: 'center' as const,
    valign: 'middle' as const,
    text: '',
  };
};
