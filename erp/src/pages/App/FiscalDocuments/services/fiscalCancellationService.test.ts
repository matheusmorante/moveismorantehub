import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  updateOrder: vi.fn(),
  processCancellation: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    })),
  },
}));
vi.mock('@/pages/utils/orderMutationService', () => ({ updateOrder: mocks.updateOrder }));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  processOrderCancellationFiscalEffects: mocks.processCancellation,
}));

import { executeFiscalCancellation } from './fiscalCancellationService';

describe('executeFiscalCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'sale-1',
        status: 'scheduled',
        order_type: 'sale',
        order_index: 1045,
        order_data: { id: 'sale-1', status: 'scheduled', orderType: 'sale', items: [] },
      },
      error: null,
    });
    mocks.updateOrder.mockResolvedValue(undefined);
    mocks.processCancellation.mockResolvedValue({ action: 'cancel', cStat: '135' });
  });

  it('cancela comercialmente o pedido uma vez e aplica o tratamento fiscal somente à nota selecionada', async () => {
    const selectedDocument = {
      id: 'document-selected',
      order_id: 'sale-1',
      numero_nfe: 1045,
      modelo: '55',
      ambiente: 2,
    } as any;

    const result = await executeFiscalCancellation({
      document: selectedDocument,
      reason: 'Cancelamento solicitado dentro do prazo legal',
      isCancelEvent: true,
      productionConfirmed: false,
    });

    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrder).toHaveBeenCalledWith(
      'sale-1',
      { status: 'cancelled' },
      expect.objectContaining({ id: 'sale-1', orderIndex: 1045 })
    );
    expect(mocks.processCancellation).toHaveBeenCalledTimes(1);
    expect(mocks.processCancellation).toHaveBeenCalledWith(
      'sale-1',
      '1045',
      expect.objectContaining({
        reason: 'Cancelamento solicitado dentro do prazo legal',
        productionConfirmed: false,
        documentId: 'document-selected',
      })
    );
    expect(result).toMatchObject({ action: 'cancel', cStat: '135', commercialCommitted: true });
  });

  it('não altera novamente a venda já cancelada e ainda endereça só o documento solicitado', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'sale-1',
        status: 'cancelled',
        order_type: 'sale',
        order_index: 1045,
        order_data: { id: 'sale-1', status: 'cancelled', orderType: 'sale', items: [] },
      },
      error: null,
    });

    await executeFiscalCancellation({
      document: { id: 'document-second', order_id: 'sale-1', numero_nfe: 1045 } as any,
      reason: 'Cancelamento solicitado dentro do prazo legal',
      isCancelEvent: true,
      productionConfirmed: false,
    });

    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.processCancellation).toHaveBeenCalledWith(
      'sale-1',
      '1045',
      expect.objectContaining({ documentId: 'document-second' })
    );
  });
});
