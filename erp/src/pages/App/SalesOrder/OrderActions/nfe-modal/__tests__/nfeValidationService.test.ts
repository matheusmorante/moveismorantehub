// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { validateNfeEmission } from '../services/nfeValidationService';
import type Order from '@/pages/types/order.type';

describe('nfeValidationService', () => {
  const baseOrder: Order = {
    id: 'order-123',
    company_id: 'comp-1',
    created_at: new Date().toISOString(),
    customerData: {
      fullName: 'Cliente Teste',
      personType: 'PF',
      cpfCnpj: '123.456.789-09',
      address: { state: 'PR' },
    },
    items: [
      {
        orderItemId: 'item-1',
        productId: 'prod-1',
        description: 'Produto Teste',
        quantity: 1,
        unitPrice: 100,
        fiscal: {
          ncm: '12345678',
          cfop: '5102',
          cst: '102',
          origem: '0',
        },
      } as any,
    ],
    shipping: {
      deliveryMethod: 'delivery',
      value: 0,
    } as any,
    fiscalContext: {
      presence: '1',
      finalConsumer: true,
    },
  };

  it('valida com sucesso uma emissão com dados fiscais completos', () => {
    const result = validateNfeEmission({
      order: baseOrder,
      currentModel: '55',
      deliveryMethod: 'delivery',
      recipientTaxId: '123.456.789-09',
      nfeItems: [
        {
          ...(baseOrder.items[0] as any),
          fiscal: {
            ncm: '12345678',
            cfop: '5102',
            cst: '102',
            origem: '0',
          },
        },
      ],
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
      isLoadingNfeNumber: false,
    });

    expect(result.valid).toBe(true);
    expect(result.fiscalFieldError).toBeNull();
    expect(result.toastError).toBeUndefined();
  });

  it('bloqueia emissão se o NCM for inválido (menos de 8 dígitos)', () => {
    const result = validateNfeEmission({
      order: baseOrder,
      currentModel: '55',
      deliveryMethod: 'delivery',
      recipientTaxId: '123.456.789-09',
      nfeItems: [
        {
          ...(baseOrder.items[0] as any),
          fiscal: {
            ncm: '12345',
            cfop: '5102',
            cst: '102',
            origem: '0',
          },
        },
      ],
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
      isLoadingNfeNumber: false,
    });

    expect(result.valid).toBe(false);
    expect(result.fiscalFieldError?.fieldId).toBe('nfe-item-ncm-0');
    expect(result.toastError).toContain('deve conter exatamente 8 dígitos');
  });

  it('bloqueia emissão se estiver aguardando preparação fiscal dos itens', () => {
    const result = validateNfeEmission({
      order: baseOrder,
      currentModel: '55',
      deliveryMethod: 'delivery',
      recipientTaxId: '123.456.789-09',
      nfeItems: [],
      isLoadingFiscalData: true,
      fiscalPreparationError: null,
      isLoadingNfeNumber: false,
    });

    expect(result.valid).toBe(false);
    expect(result.toastError).toBe('Aguarde a preparação fiscal dos itens antes de emitir.');
  });
});
