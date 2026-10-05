import { describe, expect, it } from 'vitest';
import { evaluateDocumentEligibility } from '../../../../../../api/nfe/order-cancellation-policy';

const now = Date.parse('2026-10-05T15:00:00.000Z');
const order = { id: 'order-1', status: 'scheduled', order_data: {} };

function document(overrides: Record<string, unknown> = {}) {
  return {
    id: 'document-1',
    order_id: order.id,
    document_type: 'outbound',
    status: 'homologada',
    ambiente: 2,
    modelo: '55',
    chave_acesso: '1'.repeat(44),
    numero_protocolo: '141260000000001',
    xml_protocolo: '',
    created_at: new Date(now - 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('eligibilidade de cancelamento iniciada pela tela fiscal', () => {
  it('permite abrir o mesmo fluxo para uma NF-e autorizada vinculada a pedido agendado', () => {
    expect(evaluateDocumentEligibility(document(), order, null, now)).toMatchObject({
      canProceed: true,
      action: 'cancel',
      orderId: order.id,
      orderStatus: 'scheduled',
    });
  });

  it('mantém o pedido relacionado no estado comercial já cancelado', () => {
    expect(
      evaluateDocumentEligibility(document(), { ...order, status: 'cancelled' }, null, now)
    ).toMatchObject({ canProceed: true, action: 'cancel', orderId: order.id });
  });

  it('bloqueia cancelamento após circulação e direciona para devolução', () => {
    expect(
      evaluateDocumentEligibility(document(), { ...order, status: 'fulfilled' }, null, now)
    ).toMatchObject({ canProceed: false, action: 'return' });
  });

  it('não cancela uma devolução pelo fluxo de cancelamento de venda', () => {
    expect(
      evaluateDocumentEligibility(
        document(),
        { ...order, order_data: { orderType: 'return' } },
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'none' });
  });

  it('não libera uma segunda transmissão enquanto a tentativa anterior está em andamento', () => {
    expect(
      evaluateDocumentEligibility(
        document(),
        order,
        { status: 'transmitting', requested_at: new Date(now - 5_000).toISOString() },
        now
      )
    ).toMatchObject({ canProceed: false, action: 'pending' });
  });

  it('bloqueia repetição quando já há evento registrado e exige reconciliação', () => {
    expect(
      evaluateDocumentEligibility(document(), order, { status: 'registered' }, now)
    ).toMatchObject({ canProceed: false, action: 'reconcile' });
  });

  it('bloqueia documentos sem chave de acesso fiscal válida', () => {
    expect(
      evaluateDocumentEligibility(document({ chave_acesso: '123' }), order, null, now)
    ).toMatchObject({ canProceed: false, action: 'none' });
  });

  it('não oferece cancelamento para uma NF-e já cancelada', () => {
    expect(
      evaluateDocumentEligibility(document({ status: 'cancelada' }), order, null, now)
    ).toMatchObject({ canProceed: false, action: 'none' });
  });

  it('exige consulta à SEFAZ para tentativa anterior com resultado incerto', () => {
    expect(
      evaluateDocumentEligibility(
        document(),
        order,
        { status: 'unknown', requested_at: new Date(now - 60_000).toISOString() },
        now
      )
    ).toMatchObject({ canProceed: false, action: 'reconcile' });
  });

  it('exige revisão quando há mais de uma NF-e autorizada no mesmo pedido', () => {
    expect(evaluateDocumentEligibility(document(), order, null, now, 2)).toMatchObject({
      canProceed: false,
      action: 'manual_review',
    });
  });

  it('escolhe estorno após o prazo da NF-e 55 sem oferecer cancelamento SEFAZ', () => {
    expect(
      evaluateDocumentEligibility(
        document({ created_at: new Date(now - 169 * 60 * 60 * 1000).toISOString() }),
        order,
        null,
        now
      )
    ).toMatchObject({ canProceed: true, action: 'estorno' });
  });

  it('exige revisão após o prazo da NFC-e e não oferece cancelamento', () => {
    expect(
      evaluateDocumentEligibility(
        document({ modelo: '65', created_at: new Date(now - 31 * 60 * 1000).toISOString() }),
        order,
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'manual_review' });
  });
});
