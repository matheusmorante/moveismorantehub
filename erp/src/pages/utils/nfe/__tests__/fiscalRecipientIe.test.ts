import { describe, it, expect } from 'vitest';
import {
  validateRecipientIeWithCcc,
  registerCccLookupHandler,
  getRegisteredCccLookupHandler,
} from '../../../../../../api/nfe/cccRecipientValidator';
import { buildDestXml } from '../xml/xmlDestBlock';
import type Order from '@/pages/types/order.type';
import { registerFiscalXmlSerializerCases } from './fiscalRecipientIeSerializerCases';

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

  registerFiscalXmlSerializerCases();
});
