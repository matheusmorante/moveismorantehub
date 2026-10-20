import { describe, expect, it } from 'vitest';
import {
  UNATTENDED_DELIVERY_REASONS,
  unattendedDeliveryFormSchema,
} from '../../../shared-utils/operationsFormSchemas';

describe('unattendedDeliveryFormSchema — Motivos de Insucesso na Entrega', () => {
  it('não inclui "Cliente Recusou Recebimento" na lista oficial de motivos', () => {
    expect(UNATTENDED_DELIVERY_REASONS).toEqual([
      'Cliente comunicou que está ausente',
      'Ninguém Atendeu no Local',
      'Outro Motivo',
    ]);
    expect(UNATTENDED_DELIVERY_REASONS).not.toContain('Cliente Recusou Recebimento');
  });

  it('rejeita "Cliente Recusou Recebimento" como motivo inválido no resolver Zod', () => {
    const result = unattendedDeliveryFormSchema.safeParse({
      reason: 'Cliente Recusou Recebimento',
      notes: 'Tentativa de entrega recusada',
      proofUrls: ['https://storage.com/proof1.jpg'],
    });

    expect(result.success).toBe(false);
  });

  it('aceita os motivos válidos com sucesso', () => {
    const valid1 = unattendedDeliveryFormSchema.safeParse({
      reason: 'Cliente comunicou que está ausente',
      notes: '',
      proofUrls: [],
    });
    expect(valid1.success).toBe(true);

    const valid2 = unattendedDeliveryFormSchema.safeParse({
      reason: 'Ninguém Atendeu no Local',
      notes: 'Portão fechado, campainha sem resposta',
      proofUrls: ['https://storage.com/proof.jpg'],
    });
    expect(valid2.success).toBe(true);

    const valid3 = unattendedDeliveryFormSchema.safeParse({
      reason: 'Outro Motivo',
      notes: 'Endereço em obra inacessível',
      proofUrls: [],
    });
    expect(valid3.success).toBe(true);
  });

  it('exige anexo de foto quando o motivo for "Ninguém Atendeu no Local"', () => {
    const result = unattendedDeliveryFormSchema.safeParse({
      reason: 'Ninguém Atendeu no Local',
      notes: '',
      proofUrls: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Anexe pelo menos uma imagem para o motivo “Ninguém Atendeu no Local”.'
      );
    }
  });
});
