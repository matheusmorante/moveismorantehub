import { describe, expect, it } from 'vitest';
import { evaluateDocumentEligibility } from '../../../../../../api/nfe/order-cancellation-policy';

const now = Date.parse('2026-10-05T15:00:00.000Z');
const order = { id: 'order-1', status: 'scheduled', order_data: {} };
const accessKey = (model: string) =>
  '41' + '2610' + '12345678000195' + model + '001' + '000000001' + '1' + '00000000' + '0';
const authorizedAt = (timestamp: number) =>
  `<protNFe><infProt><dhRecbto>${new Date(timestamp).toISOString()}</dhRecbto></infProt></protNFe>`;

function document(overrides: Record<string, unknown> = {}) {
  return {
    id: 'document-1',
    order_id: order.id,
    document_type: 'outbound',
    status: 'homologada',
    ambiente: 2,
    modelo: '55',
    chave_acesso: accessKey(String(overrides.modelo || '55')),
    numero_protocolo: '141260000000001',
    xml_protocolo: authorizedAt(now - 60 * 60 * 1000),
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

  it('bloqueia pedido expedido sem confirmação de entrega e não o trata como estorno', () => {
    expect(
      evaluateDocumentEligibility(
        document({
          xml_protocolo: authorizedAt(now - 169 * 60 * 60 * 1000),
        }),
        {
          ...order,
          delivery_status: 'in_transit',
          order_data: { shipping: { deliveryStartedAt: '2026-10-05T13:00:00.000Z' } },
        },
        null,
        now
      )
    ).toMatchObject({
      canProceed: false,
      action: 'blocked',
      reason: expect.stringContaining('Confirme recusa ou retorno'),
    });
  });

  it('considera status legado de entrega quando a coluna normalizada está vazia', () => {
    expect(
      evaluateDocumentEligibility(
        document({ xml_protocolo: authorizedAt(now - 169 * 60 * 60 * 1000) }),
        {
          ...order,
          delivery_status: '',
          order_data: { deliveryStatus: 'in_transit' },
        },
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'blocked' });
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
        document({
          created_at: new Date(now - 60 * 60 * 1000).toISOString(),
          xml_protocolo: authorizedAt(now - 169 * 60 * 60 * 1000),
        }),
        order,
        null,
        now
      )
    ).toMatchObject({ canProceed: true, action: 'estorno' });
  });

  it('exige revisão quando falta a data de autorização no protocolo, sem usar created_at', () => {
    expect(
      evaluateDocumentEligibility(
        document({
          xml_protocolo: '',
          created_at: new Date(now - 169 * 60 * 60 * 1000).toISOString(),
        }),
        order,
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'manual_review', authorizedAt: '' });
  });

  it('prepara estorno de NF-e 55 após o prazo da NFC-e 65 no Paraná', () => {
    expect(
      evaluateDocumentEligibility(
        document({
          modelo: '65',
          created_at: new Date(now - 31 * 60 * 1000).toISOString(),
          xml_protocolo: authorizedAt(now - 31 * 60 * 1000),
        }),
        order,
        null,
        now
      )
    ).toMatchObject({ canProceed: true, action: 'estorno' });
  });

  it('encaminha pedido entregue ao fluxo de devolução dentro ou fora do prazo', () => {
    const delivered = { ...order, status: 'fulfilled' };
    expect(
      evaluateDocumentEligibility(
        document(),
        delivered,
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'return' });
    expect(
      evaluateDocumentEligibility(
        document({ xml_protocolo: authorizedAt(now - 169 * 60 * 60 * 1000) }),
        delivered,
        null,
        now
      )
    ).toMatchObject({ canProceed: false, action: 'return' });
  });

  it('permite retry após rejeição explícita do evento, mantendo a origem autorizada', () => {
    expect(
      evaluateDocumentEligibility(
        document(),
        order,
        { status: 'rejected', requested_at: new Date(now - 60_000).toISOString() },
        now
      )
    ).toMatchObject({ canProceed: true, action: 'cancel' });
  });
});
