import { normalizeFiscalIdentifier } from './fiscalIdentifiers';

export const getInboundInvoiceRecipientGuardError = (message: unknown): string | null => {
  const text = typeof message === 'string' ? message : '';
  if (text.includes('INBOUND_INVOICE_RECIPIENT_MISMATCH')) {
    return 'Esta NF-e não pode ser importada porque o CNPJ do destinatário é diferente do CNPJ da empresa configurado no sistema.';
  }
  if (text.includes('INBOUND_INVOICE_COMPANY_CNPJ_UNCONFIGURED')) {
    return 'Configure o CNPJ da empresa antes de importar notas fiscais de entrada.';
  }
  return null;
};

export const assertInboundInvoiceRecipientMatchesCompany = (
  recipientCnpj: unknown,
  companyCnpj: unknown
): void => {
  const recipient = normalizeFiscalIdentifier(recipientCnpj);
  const company = normalizeFiscalIdentifier(companyCnpj);

  if (!company) {
    throw new Error('Configure o CNPJ da empresa antes de importar notas fiscais de entrada.');
  }

  if (!recipient || recipient !== company) {
    throw new Error(
      'Esta NF-e não pode ser importada porque o CNPJ do destinatário é diferente do CNPJ da empresa configurado no sistema.'
    );
  }
};
