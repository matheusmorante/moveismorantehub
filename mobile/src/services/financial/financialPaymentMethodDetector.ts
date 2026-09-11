/**
 * Detector determinístico e reutilizável de formas de pagamento em português.
 */
export function detectFinancialPaymentMethod(text: string): string | null {
  const lower = text.toLowerCase();

  if (/débito|debito/i.test(lower)) return 'Cartão de Débito';
  if (/crédito|credito/i.test(lower)) return 'Cartão de Crédito';
  if (/\bpix\b/i.test(lower)) return 'Pix';
  if (/\bboleto\b/i.test(lower)) return 'Boleto';
  if (/\bdinheiro\b/i.test(lower)) return 'Dinheiro';
  if (/transferência|transferencia/i.test(lower)) return 'Transferência';

  return null;
}
