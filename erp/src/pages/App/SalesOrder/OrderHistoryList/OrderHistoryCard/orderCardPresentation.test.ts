import { describe, expect, it } from 'vitest';
import Order from '../../../../types/order.type';
import {
  buildOrderCardStatusConfig,
  resolveCardBgBorderClass,
  resolveCardCapabilities,
  resolveCardHeaderAccentClass,
  resolveCardTimeDisplay,
} from './orderCardPresentation';

describe('orderCardPresentation', () => {
  it('resolveCardCapabilities identifica rascunho, cancelado, visualização e bloqueio de edição', () => {
    const draftOrder = { status: 'draft', orderType: 'sale' } as Order;
    expect(resolveCardCapabilities(draftOrder)).toEqual({
      isDraft: true,
      isCancelled: false,
      canViewDetails: false,
      isEditLocked: false,
    });

    const fulfilledSale = { status: 'fulfilled', orderType: 'sale' } as Order;
    expect(resolveCardCapabilities(fulfilledSale)).toEqual({
      isDraft: false,
      isCancelled: false,
      canViewDetails: true,
      isEditLocked: true,
    });

    const cancelledOrder = { status: 'cancelled', orderType: 'sale' } as Order;
    expect(resolveCardCapabilities(cancelledOrder)).toEqual({
      isDraft: false,
      isCancelled: true,
      canViewDetails: true,
      isEditLocked: true,
    });
  });

  it('resolveCardHeaderAccentClass retorna classe de cancelado quando pedido está cancelado', () => {
    const order = { orderType: 'sale' } as Order;
    const accent = resolveCardHeaderAccentClass(order, 'green', false, true);
    expect(accent).toContain('bg-red-100');
  });

  it('resolveCardHeaderAccentClass respeita as cores de entrega (verde), retirada (roxo) e assistência (laranja)', () => {
    const order = { orderType: 'sale' } as Order;
    expect(resolveCardHeaderAccentClass(order, 'green', false, false)).toContain('bg-emerald-200');
    expect(resolveCardHeaderAccentClass(order, 'purple', false, false)).toContain('bg-purple-400');
    expect(resolveCardHeaderAccentClass(order, 'orange', false, false)).toContain('bg-orange-50');
  });

  it('resolveCardBgBorderClass diferencia borda de cancelado e normal', () => {
    expect(resolveCardBgBorderClass(true)).toContain('border-red-500');
    expect(resolveCardBgBorderClass(false)).toContain('bg-white');
  });

  it('resolveCardTimeDisplay formata intervalos e horários pontuais', () => {
    expect(resolveCardTimeDisplay(undefined)).toBe('');
    expect(
      resolveCardTimeDisplay({ pendingScheduling: true, startTime: '14:00' } as any)
    ).toBe('');
    expect(resolveCardTimeDisplay({ notInformed: true } as any)).toBe('Não informado');
    expect(
      resolveCardTimeDisplay({
        type: 'range',
        startTime: '09:00',
        endTime: '12:00',
      } as any)
    ).toBe('09:00 às 12:00');
    expect(resolveCardTimeDisplay({ startTime: '14:30' } as any)).toBe('14:30');
  });

  it('buildOrderCardStatusConfig monta dicionário com fallback de status de sistema', () => {
    const order = { status: 'scheduled', orderType: 'sale' } as Order;
    const config = buildOrderCardStatusConfig(order, {} as any);
    expect(config.scheduled).toBeDefined();
    expect(config.draft).toBeDefined();
    expect(config.draft.label).toBe('Rascunho');
  });
});
