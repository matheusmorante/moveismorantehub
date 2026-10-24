import { describe, expect, it } from 'vitest';
import { selectPendingInboundXmlConsults } from '../../../../../../api/nfe/inboundXmlConsultQueue';

describe('selectPendingInboundXmlConsults', () => {
  it('selects only summaries with a registered Science and no completed key consultation', () => {
    const summaries = [
      { chave_acesso: '1'.repeat(44), ambiente: 1 },
      { chave_acesso: '2'.repeat(44), ambiente: 1 },
      { chave_acesso: '3'.repeat(44), ambiente: 2 },
    ];
    const manifestationEvents = [
      { access_key: '1'.repeat(44), environment: 1, status: 'registered' },
      { access_key: '2'.repeat(44), environment: 1, status: 'rejected' },
      { access_key: '3'.repeat(44), environment: 2, status: 'registered' },
    ];
    const consultedKeys = [
      { access_key: '3'.repeat(44), environment: 2 },
    ];

    expect(selectPendingInboundXmlConsults(summaries, manifestationEvents, consultedKeys))
      .toEqual([summaries[0]]);
  });
});
