import { describe, expect, it } from 'vitest';
import {
  isVersionedProductSaveRpcUnavailable,
  parseMobileProductSaveAcknowledgement,
} from '../../../../../shared-utils/mobileProductSaveAcknowledgement';

describe('parseMobileProductSaveAcknowledgement', () => {
  it('converte a linha versionada da RPC em identidade e versão do produto', () => {
    expect(
      parseMobileProductSaveAcknowledgement([
        {
          product_id: '123e4567-e89b-42d3-a456-426614174000',
          updated_at: '2026-10-24T12:30:00+00:00',
        },
      ])
    ).toEqual({
      productId: '123e4567-e89b-42d3-a456-426614174000',
      updatedAt: '2026-10-24T12:30:00+00:00',
    });
  });

  it('rejeita ACK vazio, ambíguo ou sem versão legível', () => {
    expect(() => parseMobileProductSaveAcknowledgement([])).toThrow(/não confirmou a versão/i);
    expect(() =>
      parseMobileProductSaveAcknowledgement([
        {
          product_id: '123e4567-e89b-42d3-a456-426614174000',
          updated_at: 'invalido',
        },
      ])
    ).toThrow(/não confirmou a versão/i);
    expect(() =>
      parseMobileProductSaveAcknowledgement([
        {
          product_id: 'not-a-uuid',
          updated_at: '2026-10-24T12:30:00+00:00',
        },
      ])
    ).toThrow(/não confirmou a versão/i);
    expect(() =>
      parseMobileProductSaveAcknowledgement([
        { product_id: '123e4567-e89b-42d3-a456-426614174000', updated_at: '2026-10-24T12:30:00Z' },
        { product_id: '123e4567-e89b-42d3-a456-426614174001', updated_at: '2026-10-24T12:30:00Z' },
      ])
    ).toThrow(/não confirmou a versão/i);
  });

  it('distingue a RPC ainda não migrada de uma gravação com resultado incerto', () => {
    expect(isVersionedProductSaveRpcUnavailable({ code: 'PGRST202' })).toBe(true);
    expect(
      isVersionedProductSaveRpcUnavailable({
        message: 'Could not find the function public.save_mobile_product_transaction_with_version in the schema cache',
      })
    ).toBe(true);
    expect(isVersionedProductSaveRpcUnavailable(new Error('A operação expirou.'))).toBe(false);
  });
});
