import { describe, expect, it } from 'vitest';
import { validateParanaIssuerIe } from '../../../../../../api/nfe/paranaIssuerIe';

describe('IE do emitente no Paraná', () => {
  it.each(['1234567850', '123.45678-50', ' 123.45678-50 '])('aceita o exemplo oficial SEFA/PR: %s', (value) => {
    expect(() => validateParanaIssuerIe(value)).not.toThrow();
  });
  it.each(['1234567840', '1234567851', '9091234567', '0000000000', '123456785',
    '01234567850', 'ISENTO', 'a1234567850', '', undefined])('rejeita IE inválida sem produzir um substituto: %s', (value) => {
    expect(() => validateParanaIssuerIe(value)).toThrow(/Inscrição estadual/);
  });
});
