import { describe, it, expect } from 'vitest';
import { classifyDeliveryService } from './deliveryServiceClassification';

describe('classifyDeliveryService', () => {
  it('deve classificar pedido regular como entrega padrão', () => {
    const order = {
      orderType: 'sale',
      items: [{ name: 'Mesa de Centro' }],
    };
    const result = classifyDeliveryService(order);
    expect(result.serviceType).toBe('delivery');
    expect(result.serviceLabel).toBe('ENTREGA');
    expect(result.isDelivery).toBe(true);
    expect(result.isPickup).toBe(false);
    expect(result.isAssistance).toBe(false);
    expect(result.isReturn).toBe(false);
  });

  it('deve classificar retirada corretamente', () => {
    const order = {
      orderType: 'sale',
      shipping: { deliveryMethod: 'pickup' },
    };
    const result = classifyDeliveryService(order);
    expect(result.serviceType).toBe('pickup');
    expect(result.serviceLabel).toBe('RETIRADA');
    expect(result.isPickup).toBe(true);
  });

  it('deve classificar assistência técnica', () => {
    const order = {
      orderType: 'assistance',
      items: [{ name: 'Troca de Puxador' }],
    };
    const result = classifyDeliveryService(order);
    expect(result.serviceType).toBe('assistance');
    expect(result.serviceLabel).toBe('ASSISTÊNCIA');
    expect(result.isAssistance).toBe(true);
  });

  it('deve classificar coleta de devolução com prioridade sobre outras flags', () => {
    const order = {
      orderType: 'return',
      shipping: { deliveryMethod: 'pickup' },
      items: [{ name: 'Sofá Avariado', handlingType: 'montagem no deposito' }],
    };
    const result = classifyDeliveryService(order);
    expect(result.serviceType).toBe('return');
    expect(result.serviceLabel).toBe('COLETA DE DEVOLUÇÃO');
    expect(result.isReturn).toBe(true);
    // Devoluções não devem marcar flags de montagem ativas
    expect(result.hasInternalAssembly).toBe(false);
    expect(result.hasOutsideAssembly).toBe(false);
  });

  it('deve identificar montagem no depósito e externa a partir de itens', () => {
    const order = {
      orderType: 'sale',
      items: [
        { name: 'Guarda-Roupa', handlingType: 'montagem cliente fora' },
        { name: 'Cômoda', handlingType: 'montado no depósito' },
      ],
    };
    const result = classifyDeliveryService(order);
    expect(result.hasOutsideAssembly).toBe(true);
    expect(result.hasInternalAssembly).toBe(true);
  });
});
