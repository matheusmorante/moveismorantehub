import { describe, expect, it } from 'vitest';
import {
  formatRecipientTaxId,
  getRecipientTaxIdValidationMessage,
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
  recipientTaxIdKind,
} from '../../../../../../shared-utils/recipientTaxId';

describe('validação do documento fiscal do destinatário', () => {
  it('normaliza e valida formato e dígitos verificadores matemáticos', () => {
    expect(isValidRecipientTaxId('123.456.789-09')).toBe(true);
    expect(isValidRecipientTaxId('11.222.333/0001-81')).toBe(true);
    expect(isValidRecipientTaxId('111.111.111-11')).toBe(false);
    expect(isValidRecipientTaxId('333.333.333-33')).toBe(false);
    expect(isValidRecipientTaxId('343.324.234-23')).toBe(false);
    expect(isValidRecipientTaxId('11.222.333/0001-80')).toBe(false);
    expect(isValidRecipientTaxId('123.456.789-0')).toBe(false);
    expect(isValidRecipientTaxId('123.456.789-0A')).toBe(false);
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

  it('explica formato incorreto, tipo incompatível e dígitos verificadores inválidos', () => {
    expect(getRecipientTaxIdValidationMessage('123.456.789-0', 'PF')).toBe(
      'CPF inválido: informe 11 dígitos numéricos.'
    );
    expect(getRecipientTaxIdValidationMessage('333.333.333-33', 'PF')).toBe(
      'CPF inválido: os dígitos verificadores calculados não conferem.'
    );
    expect(getRecipientTaxIdValidationMessage('343.324.234-23', 'PF')).toBe(
      'CPF inválido: os dígitos verificadores calculados não conferem.'
    );
    expect(getRecipientTaxIdValidationMessage('11.222.333/0001-80', 'PJ')).toBe(
      'CNPJ inválido: os dígitos verificadores calculados não conferem.'
    );
    expect(getRecipientTaxIdValidationMessage('11.222.333/0001-81', 'PF')).toBe(
      'Tipo de documento incompatível: cliente PF precisa de um CPF.'
    );
    expect(getRecipientTaxIdValidationMessage('123.456.789-09', 'PF')).toBeNull();
    expect(getRecipientTaxIdValidationMessage('', 'PF')).toBeNull();
  });
});
