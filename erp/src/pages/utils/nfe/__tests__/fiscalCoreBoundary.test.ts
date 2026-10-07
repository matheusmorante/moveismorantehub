import { describe, expect, it } from 'vitest';
import {
  type FiscalSnapshotCandidate,
  parseFiscalEmissionCommand,
  resolveFiscalDocument,
} from '../../../../../../api/nfe/fiscalSnapshot';

const emissionRequestId = 'f19b3e63-6f84-45ea-8c5f-39476d709a3d';

describe('fronteira do Fiscal Core server-side', () => {
  it.each([1, 2] as const)(
    'aceita as mesmas escolhas fiscais verificáveis no ambiente %s',
    (environment) => {
      const selections = {
        '1': { ncm: '94036000', cfop: '5102', origem: '0', cest: '', csosn: '102' },
      };
      expect(
        parseFiscalEmissionCommand({
          orderId: 'order-123',
          environment,
          emissionRequestId,
          productionConfirmed: environment === 1,
          itemFiscalSelections: selections,
        })
      ).toMatchObject({
        command: {
          orderId: 'order-123',
          environment,
          emissionRequestId,
          itemFiscalSelections: selections,
        },
      });
    }
  );
  it('aceita somente a referência do pedido, ambiente e chave de idempotência', () => {
    expect(
      parseFiscalEmissionCommand({
        orderId: 'order-123',
        environment: 2,
        emissionRequestId,
      })
    ).toEqual({
      command: { orderId: 'order-123', environment: 2, emissionRequestId },
    });
  });

  it.each(['xml', 'model', 'series', 'nfeNumber', 'accessKey', 'fiscalSnapshotId'])(
    'rejeita %s vindo do navegador',
    (field) => {
      expect(
        parseFiscalEmissionCommand({
          orderId: 'order-123',
          environment: 2,
          emissionRequestId,
          [field]: field === 'xml' ? '<NFe />' : 'valor-cliente',
        })
      ).toEqual({
        error: 'Modelo, série, número, chave e XML devem ser determinados no servidor.',
      });
    }
  );

  it('bloqueia antes de criar FiscalDocument enquanto não houver matriz aprovada', () => {
    const snapshot: FiscalSnapshotCandidate = {
      schemaVersion: 1,
      capturedAt: '2026-09-30T12:00:00.000Z',
      order: {
        id: 'order-123',
        type: 'sale',
        status: 'scheduled',
        version: 1,
        updatedAt: '2026-09-30T11:59:00.000Z',
        data: { items: [], payments: [] },
      },
      issuerProfile: { companyCnpj: '00000000000000' },
      emissionRequest: { id: emissionRequestId, environment: 2 },
    };

    expect(resolveFiscalDocument(snapshot)).toEqual({
      status: 'blocked',
      blockers: [
        {
          code: 'APPROVED_FISCAL_RULESET_REQUIRED',
          scope: 'document',
          message:
            'A matriz de determinação fiscal aprovada ainda não está configurada. Nenhum modelo, CFOP ou tributo será presumido.',
        },
      ],
    });
  });
});
