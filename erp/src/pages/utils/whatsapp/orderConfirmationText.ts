export const DEFAULT_ORDER_CONFIRMATION_TEMPLATE =
  '*Olá {{customerName}}, seu pedido foi confirmado!*\n\n*Vendedor:* {{seller}}\n\n{{operations}}\n\n*Itens:*\n{{items}}\n\n*Valor total da compra:* {{totalValue}}\n\n*Pagamento:*\n{{payments}}';

// Preserve ordinary digits, formatting markers and symbols such as ©, ® and ™.
const emojiDecorations =
  /[ \t]*(?:(?:\uFFFD|[#*0-9]\uFE0F?\u20E3|[©®™]\uFE0F|(?![#*0-9©®™])\p{Emoji})(?:[\uFE0E-\uFE0F\u{E0020}-\u{E007F}]|\u200D)*[ \t]*)+/gu;

export const cleanOrderConfirmationText = (text: string): string =>
  text.replace(emojiDecorations, (decoration, offset: number) => {
    const before = text[offset - 1] ?? '\n';
    const after = text[offset + decoration.length] ?? '\n';
    if (/[\r\n]/.test(before + after)) return '';

    const spaceBefore = /^[ \t]/.test(decoration);
    const spaceAfter = /[ \t]$/.test(decoration);
    if ((before === '*' && !spaceBefore) || (after === '*' && !spaceAfter)) return '';
    return spaceBefore || spaceAfter ? ' ' : '';
  });
