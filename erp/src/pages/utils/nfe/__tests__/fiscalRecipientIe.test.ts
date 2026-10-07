import { describe, it, expect } from 'vitest';
import {
  validateRecipientIeWithCcc,
  registerCccLookupHandler,
  getRegisteredCccLookupHandler,
} from '../../../../../../api/nfe/cccRecipientValidator';
import { buildDestXml } from '../xml/xmlDestBlock';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import type Order from '@/pages/types/order.type';
import type {
  FiscalDocument,
  FiscalSnapshotCandidate,
  FiscalAddress,
} from '../../../../../../api/nfe/fiscalSnapshot';
import type { ApprovedFiscalRuleSet } from '../../../../../../api/nfe/fiscalCore';
import { fiscalSnapshotHash } from '../../../../../../api/nfe/fiscalCore';
import { generateNfeAccessKey } from '../nfeAccessKey';

describe('Fiscal Recipient IE & indIEDest Handling (NF-e 55 & NFC-e 65)', () => {
  describe('CCC Recipient Validator & NT 2025.001 Hook', () => {
    it('requires valid IE for indIEDest=1 (Contribuinte)', () => {
      expect(() =>
        validateRecipientIeWithCcc({ ieIndicator: '1', ie: '' })
      ).toThrow(/exige Inscrição Estadual válida/);

      expect(() =>
        validateRecipientIeWithCcc({ ieIndicator: '1', ie: '1' })
      ).toThrow(/deve conter entre 2 e 14 dígitos/);

      const result = validateRecipientIeWithCcc({ ieIndicator: '1', ie: '90.123.456-78' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedIe).toBe('9012345678');
      expect(result.requiresFutureCccCheck).toBe(false);
      expect(result.cccStatus).toBe('ACTIVE_TAXPAYER');
    });

    it('rejects IE for indIEDest=2 (Isento)', () => {
      const ok = validateRecipientIeWithCcc({ ieIndicator: '2', ie: '' });
      expect(ok.valid).toBe(true);
      expect(ok.sanitizedIe).toBeUndefined();

      expect(() =>
        validateRecipientIeWithCcc({ ieIndicator: '2', ie: '123456789' })
      ).toThrow(/não deve possuir Inscrição Estadual informada/);
    });

    it('accepts indIEDest=9 without IE as non-taxpayer standard', () => {
      const result = validateRecipientIeWithCcc({ ieIndicator: '9', ie: '' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedIe).toBeUndefined();
      expect(result.requiresFutureCccCheck).toBe(false);
    });

    it('accepts indIEDest=9 with IE and flags for future NT 2025.001 CCC validation', () => {
      const result = validateRecipientIeWithCcc({
        uf: 'PR',
        ieIndicator: '9',
        ie: '90.876.543-21',
      });
      expect(result.valid).toBe(true);
      expect(result.sanitizedIe).toBe('9087654321');
      expect(result.requiresFutureCccCheck).toBe(true);
      expect(result.cccStatus).toBe('PENDING_SERVICE_ACTIVATION');
      expect(result.message).toContain('NT 2025.001');
    });

    it('rejects malformed IE for indIEDest=9', () => {
      expect(() =>
        validateRecipientIeWithCcc({ ieIndicator: '9', ie: '9' })
      ).toThrow(/formato inválido/);
    });

    it('allows registering custom CCC lookup handler extension hook', () => {
      const dummyHandler = async (uf: string, ie: string) => ({
        isRegisteredAsNonTaxpayer: true,
        isActive: true,
      });
      registerCccLookupHandler(dummyHandler);
      expect(getRegisteredCccLookupHandler()).toBe(dummyHandler);
      registerCccLookupHandler(null);
    });
  });

  describe('xmlDestBlock (buildDestXml)', () => {
    const makeOrder = (overrides: Partial<Order>): Order => ({
      id: 'order-1',
      status: 'pago',
      type: 'sale',
      customerData: {
        fullName: 'Consumidor Exemplo',
        cpfCnpj: '12345678000195',
        personType: 'PJ',
        address: {
          street: 'Rua das Indústrias',
          number: '100',
          neighborhood: 'Centro',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80000000',
          cityCode: '4106902',
        },
      },
      items: [],
      payments: [],
      paymentsSummary: { totalOrderValue: 150 },
      ...overrides,
    });

    it('NF-e 55: indIEDest=1 generates <indIEDest>1</indIEDest> and <IE>', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Contribuinte LTDA',
          cpfCnpj: '12345678000195',
          personType: 'PJ',
          ieIndicator: '1',
          ie: '9012345678',
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      const xml = buildDestXml(order, false, '55');
      expect(xml).toContain('<indIEDest>1</indIEDest>');
      expect(xml).toContain('<IE>9012345678</IE>');
    });

    it('NF-e 55: indIEDest=1 without IE throws error', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Contribuinte Sem IE LTDA',
          cpfCnpj: '12345678000195',
          personType: 'PJ',
          ieIndicator: '1',
          ie: '',
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      expect(() => buildDestXml(order, false, '55')).toThrow(/exige Inscrição Estadual/);
    });

    it('NF-e 55: indIEDest=2 (Isento) generates <indIEDest>2</indIEDest> and NO <IE>', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Empresa Isenta LTDA',
          cpfCnpj: '12345678000195',
          personType: 'PJ',
          ieIndicator: '2',
          ie: '9012345678', // should NOT be emitted
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      const xml = buildDestXml(order, false, '55');
      expect(xml).toContain('<indIEDest>2</indIEDest>');
      expect(xml).not.toContain('<IE>');
    });

    it('NF-e 55: indIEDest=9 without IE generates <indIEDest>9</indIEDest> and NO <IE>', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Consumidor Final Sem IE',
          cpfCnpj: '12345678909',
          personType: 'PF',
          ieIndicator: '9',
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      const xml = buildDestXml(order, false, '55');
      expect(xml).toContain('<indIEDest>9</indIEDest>');
      expect(xml).not.toContain('<IE>');
    });

    it('NF-e 55: indIEDest=9 with IE generates <indIEDest>9</indIEDest> and <IE>', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Não Contribuinte com IE Especial',
          cpfCnpj: '12345678000195',
          personType: 'PJ',
          ieIndicator: '9',
          ie: '9087654321',
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      const xml = buildDestXml(order, false, '55');
      expect(xml).toContain('<indIEDest>9</indIEDest>');
      expect(xml).toContain('<IE>9087654321</IE>');
    });

    it('NFC-e 65: ALWAYS generates <indIEDest>9</indIEDest> and NEVER generates <IE>, even if customer has IE', () => {
      const order = makeOrder({
        customerData: {
          fullName: 'Cliente de Balcão com Cadastro PJ',
          cpfCnpj: '12345678000195',
          personType: 'PJ',
          ieIndicator: '1', // Attempting '1' or existing IE in customer DB
          ie: '9012345678',
          address: {
            street: 'Rua das Flores',
            number: '10',
            neighborhood: 'Centro',
            city: 'Curitiba',
            state: 'PR',
            postalCode: '80000000',
            cityCode: '4106902',
          },
        },
      });

      const xml = buildDestXml(order, false, '65');
      expect(xml).toContain('<indIEDest>9</indIEDest>');
      expect(xml).not.toContain('<IE>');
      expect(xml).not.toContain('9012345678');
    });
  });

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
});
