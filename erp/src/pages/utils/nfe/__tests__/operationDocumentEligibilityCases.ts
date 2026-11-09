import { describe, expect, it, vi } from 'vitest';

export function registerOperationDocumentEligibilityCases<TDocument extends object>({
  document,
  orderId,
  query,
}: {
  document: TDocument;
  orderId: string;
  query: (data: unknown) => any;
}): void {
  describe('elegibilidade somente leitura de NFD/estorno', () => {
    const operation = () => ({ ...document, document_type: 'return', xml_nfe: '<NFe/>',
      original_document_id: '11111111-1111-4111-8111-111111111111', related_return_order_id: orderId });
    const readDb = (row: any = { id: orderId, status: 'fulfilled', order_type: 'return' }) => ({
      from: vi.fn((_table: string) => query(row)), rpc: vi.fn(),
    });
    it('aceita a NFD recebida usando o mesmo contexto do preflight, sem gravar ou cancelar a venda', async () => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      const db = readDb();
      const result = await evaluateOperationDocumentEligibility(db, operation(), null, Date.now());
      expect(result).toMatchObject({ canProceed: true, action: 'cancel', orderId });
      expect(db.from).toHaveBeenCalledTimes(1);
      expect(db.from).toHaveBeenCalledWith('orders');
      expect(db.rpc).not.toHaveBeenCalled();
    });
    it.each(['registered', 'unknown', 'transmitting'])('exige reconciliação/espera da tentativa %s sem consulta de negócio adicional', async status => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      const db = readDb();
      const result = await evaluateOperationDocumentEligibility(db, operation(), { status, requested_at: new Date().toISOString() }, Date.now());
      expect(result.canProceed).toBe(false);
      expect(result.action).toBe(status === 'transmitting' ? 'pending' : 'reconcile');
      expect(db.from).not.toHaveBeenCalled();
    });
    it.each([
      { original_document_id: null }, { related_return_order_id: null }, { xml_nfe: null },
      { numero_protocolo: null }, { modelo: '65' }, { ambiente: 1 },
    ])('bloqueia contexto fiscal incompleto/cruzado %j', async change => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      expect(await evaluateOperationDocumentEligibility(readDb(), { ...operation(), ...change }, null, Date.now())).toMatchObject({ canProceed: false });
    });
    it('bloqueia vínculo com pedido que não é devolução', async () => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      expect(await evaluateOperationDocumentEligibility(readDb({ id: orderId, order_type: 'sale' }), operation(), null, Date.now())).toMatchObject({ canProceed: false });
    });
    it('bloqueia fora do prazo sem preparar outro estorno nem escrever auditoria', async () => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      const db = readDb();
      expect(await evaluateOperationDocumentEligibility(db, operation(), null, Date.now() + 8 * 86400000)).toMatchObject({ canProceed: false, action: 'none' });
      expect(db.rpc).not.toHaveBeenCalled();
      expect(db.from.mock.calls.every(([table]) => table === 'orders')).toBe(true);
    });
    it.each([false, true])('confere substituição ativa do estorno (%s) sem alterar o registro', async active => {
      const { evaluateOperationDocumentEligibility } = await import('../../../../../../api/nfe/order-cancellation-policy');
      const db = readDb(active ? { id: 'replacement', status: 'completed' } : null);
      expect(await evaluateOperationDocumentEligibility(db, { ...operation(), document_type: 'estorno' }, null, Date.now())).toMatchObject({ canProceed: !active });
      expect(db.from).toHaveBeenCalledWith('nfe_order_edit_replacements');
      expect(db.rpc).not.toHaveBeenCalled();
    });
  });
}
