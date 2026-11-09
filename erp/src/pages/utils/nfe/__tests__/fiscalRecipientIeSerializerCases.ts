import { describe, it, expect } from 'vitest';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import type {
  FiscalDocument,
  FiscalSnapshotCandidate,
  FiscalAddress,
} from '../../../../../../api/nfe/fiscalSnapshot';
import type { ApprovedFiscalRuleSet } from '../../../../../../api/nfe/fiscalCore';
import { fiscalSnapshotHash } from '../../../../../../api/nfe/fiscalCore';
import { generateNfeAccessKey } from '../nfeAccessKey';

export function registerFiscalXmlSerializerCases(): void {
  describe('fiscalXmlSerializer (Backend XML output)', () => {
    const address: FiscalAddress = {
      street: 'Rua do Teste',
      number: '123',
      district: 'Centro',
      municipalityCode: '4105805',
      municipality: 'Colombo',
      uf: 'PR',
      postalCode: '83410270',
    };

    const makeSnapshotCandidate = (model: '55' | '65', recipientIeIndicator: '1' | '2' | '9' = '9', recipientIe?: string): FiscalSnapshotCandidate => ({
      emissionRequest: {
        orderId: 'ORDER_IE_1',
        environment: 2,
        finalConsumer: true,
        recipientTaxId: '12345678909',
        recipientIeIndicator,
        ...(recipientIe ? { recipientIe } : {}),
      },
      order: {
        id: 'ORDER_IE_1',
        type: 'sale',
        status: 'PAID',
        deleted: false,
        data: {
          items: [
            {
              productId: 'prod-1',
              name: 'Item de Teste',
              quantity: 1,
              unitPrice: 50,
              fiscal: { ncm: '94036000', cfop: '5102', origin: '0' },
            },
          ],
          shipping: { deliveryMethod: 'pickup', value: 0 },
          payments: [{ method: 'PIX', amount: 50, status: 'confirmed' }],
        },
      },
      issuerProfile: {
        companyCnpj: '12345678000195',
        companyName: 'Empresa Teste',
        companyIE: '1234567890',
        companyCRT: '1',
        companyCMun: '4105805',
        companyXMun: 'Colombo',
        companyUF: 'PR',
        companyCEP: '83410270',
        companyLogradouro: 'Rua do Teste',
        companyNumero: '123',
        companyBairro: 'Centro',
      },
      fiscalInputs: {
        products: {
          'prod-1': { ncm: '94036000', cfop: '5102', origin: '0', cst: '102' },
        },
      },
      fiscalContext: {},
    });

    const makeDoc = (snapshot: FiscalSnapshotCandidate, model: '55' | '65', recipientIeIndicator: '1' | '2' | '9', recipientIe?: string): FiscalDocument => {
      const hash = fiscalSnapshotHash(snapshot);
      return {
        snapshotHash: hash,
        ruleSetVersion: 'synthetic-v1',
        model,
        environment: 2,
        issuer: {
          cnpj: '12345678000195',
          name: 'Empresa Teste',
          ie: '1234567890',
          crt: '1',
          municipalityCode: '4105805',
          address,
        },
        recipient: {
          name: 'Cliente Teste',
          cpfCnpj: '12345678909',
          ieIndicator: recipientIeIndicator,
          ...(recipientIe ? { ie: recipientIe } : {}),
          address,
        },
        operation: {
          natureOfOperation: 'VENDA',
          direction: 'outbound',
          purpose: '1',
          destination: '1',
          presence: '1',
          finalConsumer: '1',
          freightMode: '9',
        },
        items: [
          {
            itemNumber: 1,
            product: {
              code: 'P-1',
              description: 'Item Teste',
              gtin: 'SEM GTIN',
              quantity: 1,
              unitValue: 50,
              gross: 50,
              discount: 0,
              freight: 0,
              insurance: 0,
              otherExpenses: 0,
            },
            classification: { ncm: '94036000', origin: '0', cfop: '5102', unit: 'UN' },
            taxes: [
              {
                group: 'ICMS',
                codeSystem: 'CSOSN',
                code: '102',
                values: { vICMS: 0 },
                decisionId: 'dec-1',
              },
              {
                group: 'PIS',
                codeSystem: 'CST',
                code: '07',
                values: { vBC: 0, pPIS: 0, vPIS: 0 },
                decisionId: 'dec-1',
              },
              {
                group: 'COFINS',
                codeSystem: 'CST',
                code: '07',
                values: { vBC: 0, pCOFINS: 0, vCOFINS: 0 },
                decisionId: 'dec-1',
              },
            ],
            decisions: [
              {
                decisionId: 'dec-1',
                ruleSetVersion: 'synthetic-v1',
                approver: 'test-suite',
                reason: 'Aprovado',
                effectiveAt: '2026-10-06T12:00:00Z',
              },
            ],
          },
        ],
        totals: {
          icmsBase: 0,
          products: 50,
          discount: 0,
          freight: 0,
          insurance: 0,
          otherExpenses: 0,
          icms: 0,
          icmsExempt: 0,
          fcp: 0,
          icmsStBase: 0,
          icmsSt: 0,
          fcpSt: 0,
          fcpStRetained: 0,
          ii: 0,
          ipi: 0,
          ipiReturned: 0,
          pis: 0,
          cofins: 0,
          invoice: 50,
          payment: 50,
          change: 0,
        },
        payments: [
          {
            methodCode: '01',
            amount: 50,
            paymentIndicator: '0',
            decision: {
              decisionId: 'dec-1',
              ruleSetVersion: 'synthetic-v1',
              approver: 'test-suite',
              reason: 'Aprovado',
              effectiveAt: '2026-10-06T12:00:00Z',
            },
          },
        ],
        decisions: [
          {
            decisionId: 'dec-1',
            ruleSetVersion: 'synthetic-v1',
            approver: 'test-suite',
            reason: 'Aprovado',
            effectiveAt: '2026-10-06T12:00:00Z',
          },
        ],
      };
    };

    const dummyRuleSet: ApprovedFiscalRuleSet = {
      version: 'synthetic-v1',
      issuerCnpj: '12345678000195',
      environment: 2,
      model: '55',
      approvedBy: 'test-suite',
      approvedAt: '2026-10-06T12:00:00Z',
      determine: () => ({} as any),
    };

    const nfeKey = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2610',
      cnpj: '12345678000195',
      model: '55',
      series: 1,
      number: 100,
      emissionType: '1',
      randomCode: '12345678',
    });

    const identity = {
      series: 1,
      number: 100,
      accessKey: nfeKey.accessKey,
      issuedAt: '2026-10-06T12:00:00-03:00',
    };

    it('NF-e 55: serializes indIEDest=1 with <IE>', () => {
      const snap = makeSnapshotCandidate('55', '1', '9012345678');
      const doc = makeDoc(snap, '55', '1', '9012345678');
      const xml = serializeFiscalDocument(snap, doc, dummyRuleSet, identity);
      expect(xml).toContain('<indIEDest>1</indIEDest>');
      expect(xml).toContain('<IE>9012345678</IE>');
    });

    it('NF-e 55: serializes indIEDest=9 with <IE> when IE is present', () => {
      const snap = makeSnapshotCandidate('55', '9', '9087654321');
      const doc = makeDoc(snap, '55', '9', '9087654321');
      const xml = serializeFiscalDocument(snap, doc, dummyRuleSet, identity);
      expect(xml).toContain('<indIEDest>9</indIEDest>');
      expect(xml).toContain('<IE>9087654321</IE>');
    });

    it('NF-e 55: serializes indIEDest=9 without <IE> when IE is empty', () => {
      const snap = makeSnapshotCandidate('55', '9');
      const doc = makeDoc(snap, '55', '9');
      const xml = serializeFiscalDocument(snap, doc, dummyRuleSet, identity);
      const destBlock = xml.match(/<dest>[\s\S]*?<\/dest>/)?.[0] || '';
      expect(destBlock).toContain('<indIEDest>9</indIEDest>');
      expect(destBlock).not.toContain('<IE>');
    });

    it('NFC-e 65: NEVER includes <IE> in XML, even if recipient object has IE', () => {
      const snap = makeSnapshotCandidate('65', '9', '9012345678');
      const doc = makeDoc(snap, '65', '9', '9012345678');
      const nfceKey = generateNfeAccessKey({
        ufCode: '41',
        yearMonth: '2610',
        cnpj: '12345678000195',
        model: '65',
        series: 1,
        number: 100,
        emissionType: '1',
        randomCode: '12345678',
      });
      const nfceIdentity = {
        series: 1,
        number: 100,
        accessKey: nfceKey.accessKey,
        issuedAt: '2026-10-06T12:00:00-03:00',
      };
      const nfceRuleSet = { ...dummyRuleSet, model: '65' as const };
      const xml = serializeFiscalDocument(snap, doc, nfceRuleSet, nfceIdentity);
      const destBlock = xml.match(/<dest>[\s\S]*?<\/dest>/)?.[0] || '';
      expect(destBlock).toContain('<indIEDest>9</indIEDest>');
      expect(destBlock).not.toContain('<IE>');
      expect(destBlock).not.toContain('9012345678');
    });
  });
}
