import { describe, expect, it } from 'vitest';
import {
  canAbandonBeforeHmlTransmission,
  getFiscalSelectionMismatchDetails,
  isFormallyAbandonedHmlAttempt,
} from '../../../../../../api/nfe/hmlAttemptSafety';

const requestId = 'd81628e1-7874-42cf-9ae2-fcfd551903e3';
const tlsDiagnostic = {
  emissionRequestId: requestId,
  code: 'SELF_SIGNED_CERT_IN_CHAIN',
  category: 'TLS_FAILURE',
  phase: 'tls',
  environment: 2,
  model: '65',
  hostname: 'homologacao.nfce.sefa.pr.gov.br',
  endpoint: 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4',
};
const tlsFailure = {
  order_id: 'order-4077',
  emission_request_id: requestId,
  status: 'pendente',
  ambiente: 2,
  modelo: '65',
  document_type: 'outbound',
  hml_attempt_token: null,
  hml_attempt_expires_at: null,
  numero_protocolo: null,
  xml_protocolo: null,
  hml_response_history: [
    {
      reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify(tlsDiagnostic)}`,
      responseXml: '',
      protocol: null,
    },
  ],
};

describe('segurança de tentativa fiscal HML', () => {
  it('identifica o NCM alterado sem atribuir a divergência ao CSOSN', () => {
    const snapshot = {
      emissionRequest: {
        itemFiscalSelections: {
          '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
        },
      },
    };
    const current = {
      itemFiscalSelections: {
        '1': { ncm: '94035000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
      },
    };

    expect(getFiscalSelectionMismatchDetails(snapshot, current)).toEqual([
      { field: 'Item 1 · NCM', snapshotValue: '94036000', currentValue: '94035000' },
    ]);
  });

  it('aceita seleções fiscais idênticas sem indicar conflito', () => {
    const selections = {
      '1': { ncm: '94035000', cfop: '5102', origem: '0', cest: '', csosn: '103' },
    };
    expect(
      getFiscalSelectionMismatchDetails(
        { emissionRequest: { itemFiscalSelections: selections, itemCsosnOverrides: {} } },
        { itemFiscalSelections: selections, itemCsosnOverrides: {} }
      )
    ).toEqual([]);
  });

  it('só permite encerrar uma pendência HML quando TLS falhou antes de qualquer resposta', () => {
    expect(canAbandonBeforeHmlTransmission(tlsFailure)).toBe(true);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_response_history: [
          {
            reason: `Consulta HML inconclusiva por transporte: ${JSON.stringify(tlsDiagnostic)}`,
          },
        ],
      })
    ).toBe(false);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_response_history: [
          {
            reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify({ ...tlsDiagnostic, phase: 'request' })}`,
          },
        ],
      })
    ).toBe(false);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_response_history: [
          {
            reason: `Resposta da transmissão HML desconhecida: ${JSON.stringify({ ...tlsDiagnostic, emissionRequestId: 'b81628e1-7874-42cf-9ae2-fcfd551903e3' })}`,
          },
        ],
      })
    ).toBe(false);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_response_history: [
          { reason: 'SEFAZ respondeu 217', responseXml: '<retConsSitNFe/>', protocol: '' },
        ],
      })
    ).toBe(false);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_response_history: [
          { reason: 'SEFAZ respondeu 704', responseXml: '<retEnviNFe/>', protocol: '141260' },
        ],
      })
    ).toBe(false);
    expect(
      canAbandonBeforeHmlTransmission({
        ...tlsFailure,
        hml_attempt_token: 'lease-active',
      })
    ).toBe(false);
  });

  it('reconhece o registro formal de abandono sem permitir retry do ID antigo', () => {
    expect(
      isFormallyAbandonedHmlAttempt([
        { abandonmentCode: 'FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE' },
      ])
    ).toBe(true);
    expect(isFormallyAbandonedHmlAttempt([{ reason: 'SELF_SIGNED_CERT_IN_CHAIN' }])).toBe(false);
  });
});
