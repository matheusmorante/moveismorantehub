import { describe, it, expect } from 'vitest';
import { mapToDB, mapFromDB } from '../personMapper';
import type Person from '@/pages/types/person.type';

describe('personMapper - Fiscal and Identification mapping', () => {
  describe('mapToDB', () => {
    it('persists ieIndicator to dedicated column dbObj.ie_indicator and NOT in address JSON', () => {
      const person: Person = {
        name: 'ACME Indústria e Comércio LTDA',
        personType: 'PJ',
        cpfCnpj: '12.345.678/0001-90',
        ie: '987654321',
        ieIndicator: '1',
        address: {
          street: 'Av. Industrial',
          number: '500',
          neighborhood: 'Distrito',
          city: 'Curitiba',
          state: 'PR',
          postalCode: '80000000',
        },
      };

      const dbRecord = mapToDB('clients', person);

      // Dedicated column must have ie_indicator
      expect(dbRecord.ie_indicator).toBe('1');
      // Address JSON must NOT contain ieIndicator
      expect(dbRecord.address).toBeDefined();
      expect((dbRecord.address as any).ieIndicator).toBeUndefined();
      // rg_ie column preserves legacy compatibility
      expect(dbRecord.rg_ie).toBe('987654321');
    });

    it('persists ieIndicator="2" (isento) and ieIndicator="9" (não contribuinte) correctly', () => {
      const isento: Person = {
        name: 'Empresa Isenta LTDA',
        personType: 'PJ',
        ieIndicator: '2',
      };
      const dbIsento = mapToDB('clients', isento);
      expect(dbIsento.ie_indicator).toBe('2');

      const naoContribuinte: Person = {
        name: 'Consumidor Final',
        personType: 'PF',
        ieIndicator: '9',
      };
      const dbNaoContribuinte = mapToDB('clients', naoContribuinte);
      expect(dbNaoContribuinte.ie_indicator).toBe('9');
    });

    it('preserves legacy column rg_ie for PF (RG) and PJ (IE)', () => {
      const pf: Person = {
        name: 'João da Silva',
        personType: 'PF',
        rgIe: '12.345.678-9',
      };
      expect(mapToDB('clients', pf).rg_ie).toBe('12.345.678-9');

      const pj: Person = {
        name: 'Loja Exemplo LTDA',
        personType: 'PJ',
        ie: '1020304050',
      };
      expect(mapToDB('clients', pj).rg_ie).toBe('1020304050');
    });
  });

  describe('mapFromDB', () => {
    it('reads ie_indicator from DB column and sets ieIndicator', () => {
      const dbRow: any = {
        id: 'uuid-1',
        name: 'Distribuidora PR LTDA',
        person_type: 'PJ',
        cpf_cnpj: '12345678000190',
        rg_ie: '9081726354',
        ie_indicator: '1',
        address: {
          street: 'Rua das Flores',
          city: 'Maringá',
          state: 'PR',
        },
      };

      const person = mapFromDB(dbRow);
      expect(person.ieIndicator).toBe('1');
      expect(person.ie).toBe('9081726354');
      expect(person.rgIe).toBe('9081726354');
      // Address must not leak ieIndicator
      expect((person.address as any)?.ieIndicator).toBeUndefined();
    });

    it('defaults ieIndicator to "9" (Não Contribuinte) when db column is null or undefined', () => {
      const dbRow: any = {
        id: 'uuid-2',
        name: 'Cliente Antigo Sem Coluna',
        person_type: 'PJ',
        ie_indicator: null,
      };

      const person = mapFromDB(dbRow);
      expect(person.ieIndicator).toBe('9');
    });
  });
});
