import { describe, expect, it } from 'vitest';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdKind,
} from '../../../../../../shared-utils/recipientTaxId';

describe('validação do documento fiscal do destinatário', () => {
  it('normaliza e valida CPF e CNPJ com dígitos verificadores', () => {
    expect(isValidRecipientTaxId('123.456.789-09')).toBe(true);
    expect(isValidRecipientTaxId('11.222.333/0001-81')).toBe(true);
    expect(isValidRecipientTaxId('111.111.111-11')).toBe(false);
    expect(isValidRecipientTaxId('11.222.333/0001-80')).toBe(false);
    expect(normalizeRecipientTaxId('11.222.333/0001-81')).toBe('11222333000181');
    expect(recipientTaxIdKind('123.456.789-09')).toBe('CPF');
    expect(recipientTaxIdKind('11.222.333/0001-81')).toBe('CNPJ');
  });
});
