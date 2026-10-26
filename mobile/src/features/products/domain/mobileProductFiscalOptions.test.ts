import { describe, expect, it } from 'vitest';
import { resolveMobileServiceCfopLabel } from './mobileProductFiscalOptions';

describe('resolveMobileServiceCfopLabel', () => {
  it('uses the same 5933 default as the ERP when no CFOP is saved', () => {
    expect(resolveMobileServiceCfopLabel()).toBe(
      '5933 - Prestação de serviço dentro do Estado'
    );
    expect(resolveMobileServiceCfopLabel('')).toBe(
      '5933 - Prestação de serviço dentro do Estado'
    );
  });

  it('shows the selected municipal service CFOP', () => {
    expect(resolveMobileServiceCfopLabel('6933')).toBe(
      '6933 - Prestação de serviço para fora do Estado'
    );
  });

  it('keeps an unavailable saved CFOP visible without implying the 5933 default', () => {
    expect(resolveMobileServiceCfopLabel('5999')).toBe(
      'CFOP salvo: 5999 (fora das opções municipais atuais)'
    );
  });
});
