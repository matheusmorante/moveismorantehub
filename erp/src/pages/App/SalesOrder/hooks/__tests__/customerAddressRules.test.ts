import { describe, it, expect } from 'vitest';
import {
  hasInformedAddress,
  isCustomerNoAddress,
  computeCustomerAutoUseCustomerAddress,
  resolveInitialUseCustomerAddress,
  detectCustomerLinkingChange,
} from '../customerAddressRules';
import CustomerData from '@/pages/types/customerData.type';

describe('customerAddressRules', () => {
  describe('hasInformedAddress', () => {
    it('retorna true se tiver rua preenchida', () => {
      expect(hasInformedAddress({ street: 'Rua das Flores', city: '', cep: '', number: '', complement: '', observation: '', neighborhood: '' })).toBe(true);
    });

    it('retorna true se tiver cidade ou cep ou bairro preenchido', () => {
      expect(hasInformedAddress({ street: '', city: 'Curitiba', cep: '', number: '', complement: '', observation: '', neighborhood: '' })).toBe(true);
      expect(hasInformedAddress({ street: '', city: '', cep: '80000-000', number: '', complement: '', observation: '', neighborhood: '' })).toBe(true);
      expect(hasInformedAddress({ street: '', city: '', cep: '', number: '', complement: '', observation: '', neighborhood: 'Centro' })).toBe(true);
    });

    it('retorna false se todos os campos de endereço estiverem vazios ou indefinidos', () => {
      expect(hasInformedAddress(null)).toBe(false);
      expect(hasInformedAddress(undefined)).toBe(false);
      expect(hasInformedAddress({ street: '   ', city: '', cep: '', number: '', complement: '', observation: '', neighborhood: '' })).toBe(false);
    });
  });

  describe('isCustomerNoAddress', () => {
    it('detecta flag noAddress top-level', () => {
      expect(isCustomerNoAddress({ noAddress: true } as CustomerData)).toBe(true);
      expect(isCustomerNoAddress({ noAddress: false } as CustomerData)).toBe(false);
    });

    it('detecta flag noAddress legada em fullAddress', () => {
      expect(isCustomerNoAddress({ fullAddress: { noAddress: true } } as any)).toBe(true);
      expect(isCustomerNoAddress({ fullAddress: { noAddress: false } } as any)).toBe(false);
    });

    it('retorna false para cliente nulo ou indefinido', () => {
      expect(isCustomerNoAddress(null)).toBe(false);
      expect(isCustomerNoAddress(undefined)).toBe(false);
    });
  });

  describe('computeCustomerAutoUseCustomerAddress', () => {
    it('retorna true quando cliente tem endereço preenchido e não está marcado como não informar', () => {
      const customer: CustomerData = {
        fullName: 'João',
        phone: '4199999999',
        noAddress: false,
        fullAddress: { street: 'Rua A', city: 'Curitiba', cep: '', number: '10', complement: '', observation: '', neighborhood: '' },
      };
      expect(computeCustomerAutoUseCustomerAddress(customer)).toBe(true);
    });

    it('retorna false quando cliente está marcado como não informar endereço', () => {
      const customer: CustomerData = {
        fullName: 'Maria',
        phone: '4199999999',
        noAddress: true,
        fullAddress: { street: 'Rua A', city: 'Curitiba', cep: '', number: '10', complement: '', observation: '', neighborhood: '' },
      };
      expect(computeCustomerAutoUseCustomerAddress(customer)).toBe(false);
    });

    it('retorna false quando cliente não tem campos de endereço preenchidos', () => {
      const customer: CustomerData = {
        fullName: 'Pedro',
        phone: '4199999999',
        noAddress: false,
        fullAddress: { street: '', city: '', cep: '', number: '', complement: '', observation: '', neighborhood: '' },
      };
      expect(computeCustomerAutoUseCustomerAddress(customer)).toBe(false);
    });
  });

  describe('resolveInitialUseCustomerAddress', () => {
    it('preserva valor booleano explícito salvo no pedido', () => {
      expect(resolveInitialUseCustomerAddress(null, false)).toBe(false);
      expect(resolveInitialUseCustomerAddress(null, true)).toBe(true);
    });

    it('resolve a partir do cliente quando preferência salva for indefinida', () => {
      const customerWithAddr: CustomerData = {
        fullName: 'João',
        phone: '4199999999',
        noAddress: false,
        fullAddress: { street: 'Rua A', city: 'Curitiba', cep: '', number: '10', complement: '', observation: '', neighborhood: '' },
      };
      expect(resolveInitialUseCustomerAddress(customerWithAddr, undefined)).toBe(true);

      const customerNoAddr: CustomerData = {
        fullName: 'Maria',
        phone: '4199999999',
        noAddress: true,
        fullAddress: { street: '', city: '', cep: '', number: '', complement: '', observation: '', neighborhood: '' },
      };
      expect(resolveInitialUseCustomerAddress(customerNoAddr, undefined)).toBe(false);
    });

    it('retorna true por padrão quando não há dados de cliente nem preferência', () => {
      expect(resolveInitialUseCustomerAddress(null, undefined)).toBe(true);
    });
  });

  describe('detectCustomerLinkingChange', () => {
    const baseCustomer: CustomerData = {
      id: 'c1',
      fullName: 'Cliente 1',
      phone: '4199999999',
      noAddress: false,
      fullAddress: { street: 'Rua 1', city: 'Curitiba', cep: '', number: '10', complement: '', observation: '', neighborhood: '' },
    };

    it('detecta troca de cliente por ID ou nome', () => {
      const nextCustomer: CustomerData = {
        ...baseCustomer,
        id: 'c2',
        fullName: 'Cliente 2',
      };
      const result = detectCustomerLinkingChange({ nextCustomer, currentCustomer: baseCustomer });
      expect(result.customerChanged).toBe(true);
      expect(result.isLinkingCustomer).toBe(true);
      expect(result.isCustomerLinked).toBe(true);
    });

    it('detecta alteração de endereço no mesmo cliente vinculado', () => {
      const nextCustomer: CustomerData = {
        ...baseCustomer,
        fullAddress: { ...baseCustomer.fullAddress, street: 'Rua Nova' },
      };
      const result = detectCustomerLinkingChange({ nextCustomer, currentCustomer: baseCustomer });
      expect(result.customerChanged).toBe(false);
      expect(result.addressChanged).toBe(true);
      expect(result.isLinkingCustomer).toBe(true);
    });

    it('detecta alteração da flag noAddress no mesmo cliente vinculado', () => {
      const nextCustomer: CustomerData = {
        ...baseCustomer,
        noAddress: true,
      };
      const result = detectCustomerLinkingChange({ nextCustomer, currentCustomer: baseCustomer });
      expect(result.noAddressChanged).toBe(true);
      expect(result.isLinkingCustomer).toBe(true);
    });

    it('não considera vinculação quando o cliente é idêntico', () => {
      const result = detectCustomerLinkingChange({ nextCustomer: baseCustomer, currentCustomer: baseCustomer });
      expect(result.customerChanged).toBe(false);
      expect(result.addressChanged).toBe(false);
      expect(result.noAddressChanged).toBe(false);
      expect(result.isLinkingCustomer).toBe(false);
    });
  });
});
