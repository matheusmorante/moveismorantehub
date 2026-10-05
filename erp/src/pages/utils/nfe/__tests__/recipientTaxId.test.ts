import { describe, expect, it } from 'vitest';
import {
  formatRecipientTaxId,
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
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
  it('preserva, formata e valida CNPJ alfanumérico pelo módulo 11 oficial', () => {
    expect(normalizeRecipientTaxId('12.ABC.345/01DE-35')).toBe('12ABC34501DE35');
    expect(isValidRecipientTaxId('12.ABC.345/01DE-35')).toBe(true);
    expect(isValidRecipientTaxId('12.ABC.345/01DE-36')).toBe(false);
    expect(recipientTaxIdKind('12ABC34501DE35')).toBe('CNPJ');
    expect(formatRecipientTaxId('12abc34501de35', 'PJ')).toBe('12.ABC.345/01DE-35');
  });
  it('não permite CPF em PJ nem CNPJ em PF', () => {
    expect(recipientTaxIdMatchesPersonType('12345678909', 'PF')).toBe(true);
    expect(recipientTaxIdMatchesPersonType('11.222.333/0001-81', 'PF')).toBe(false);
    expect(recipientTaxIdMatchesPersonType('12345678909', 'PJ')).toBe(false);
    expect(recipientTaxIdMatchesPersonType('12ABC34501DE35', 'PJ')).toBe(true);
  });
});
