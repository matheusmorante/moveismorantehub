// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { validateNfeEmission } from '../services/nfeValidationService';
import type Order from '@/pages/types/order.type';
import { nfeEmissionFormSchema } from '../../../../../../../../shared-utils/nfeEmissionFormValidation';

vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ companyUF: 'PR' }),
}));

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

  it('executa a consistência de consumidor final no schema real de submissão', () => {
    const values = { issuerUf: 'PR', order: { ...baseOrder, fiscalContext: { finalConsumer: false } }, currentModel: '55' as const,
      deliveryMethod: 'pickup' as const, recipientTaxId: '12345678909', recipientIeIndicator: '9' as const,
      recipientIe: '', finalConsumer: false, nfeItems: baseOrder.items as any,
      isLoadingFiscalData: false, fiscalPreparationError: null };
    const blocked = nfeEmissionFormSchema.safeParse(values);
    expect(blocked.success).toBe(false);
    if (!blocked.success) expect(blocked.error.issues[0].message).toContain('consumidor final');
    expect(nfeEmissionFormSchema.safeParse({ ...values, order: baseOrder, finalConsumer: true }).success).toBe(true);
  });

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

  it.each([
    ['55', 'pickup', 100],
    ['65', 'delivery', 100],
    ['65', 'pickup', 12000],
  ] as const)('bloqueia documento vazio quando obrigatório: %s, %s, %s', (model, deliveryMethod, total) => {
    const result = validateNfeEmission({
      order: { ...baseOrder, shipping: { ...baseOrder.shipping, deliveryMethod }, paymentsSummary: { totalOrderValue: total } } as Order,
      currentModel: model, deliveryMethod, recipientTaxId: ' ',
      nfeItems: baseOrder.items as any, isLoadingFiscalData: false, fiscalPreparationError: null,
    });
    expect(result.valid).toBe(false);
    expect(result.recipientTaxIdError).toBeTruthy();
    expect(result.fiscalFieldError?.fieldId).toBe('nfe-recipient-tax-id');
  });

  it('bloqueia a emissão quando o cliente selecionado não tem PF/PJ resolvido no cadastro', () => {
    const result = validateNfeEmission({
      order: {
        ...baseOrder,
        customerData: { ...baseOrder.customerData, id: 'customer-123', personType: undefined },
      },
      currentModel: '55',
      deliveryMethod: 'delivery',
      recipientTaxId: '123.456.789-09',
      nfeItems: [
        {
          ...(baseOrder.items[0] as any),
          fiscal: { ncm: '12345678', cfop: '5102', cst: '102', origem: '0' },
        },
      ],
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
    });

    expect(result.valid).toBe(false);
    expect(result.toastError).toContain('tipo de pessoa do cliente não foi encontrado no cadastro');
  });

  it('permite NFC-e de consumidor final sem cliente vinculado quando não exige documento', () => {
    const result = validateNfeEmission({
      issuerUf: 'PR',
      order: {
        ...baseOrder,
        customerData: {
          fullName: 'Consumidor Final',
          personType: undefined,
          cpfCnpj: undefined,
        },
        shipping: { ...baseOrder.shipping, deliveryMethod: 'pickup' },
      },
      currentModel: '65',
      deliveryMethod: 'pickup',
      recipientTaxId: '',
      finalConsumer: true,
      nfeItems: baseOrder.items as any,
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
    });

    expect(result.valid).toBe(true);
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

  it('bloqueia CPF com dígitos verificadores matematicamente inválidos antes de emitir', () => {
    const result = validateNfeEmission({
      order: baseOrder,
      currentModel: '55',
      deliveryMethod: 'delivery',
      recipientTaxId: '343.324.234-23',
      nfeItems: [baseOrder.items[0] as any],
      isLoadingFiscalData: false,
      fiscalPreparationError: null,
    });

    expect(result.valid).toBe(false);
    expect(result.recipientTaxIdError).toContain('não conferem com o cálculo oficial da Receita Federal');
    expect(result.toastError).toContain('não conferem com o cálculo oficial da Receita Federal');
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
