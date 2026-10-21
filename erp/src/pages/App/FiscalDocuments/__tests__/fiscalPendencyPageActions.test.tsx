// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FiscalPendencyItem } from '../types/fiscalPendencies.types';
import type { NfeEmissionModalProps } from '../../SalesOrder/OrderActions/nfe-modal/types/nfeEmission.types';
import type { IssuedFiscalDocumentDetailsModalProps } from '../modals/issued-details-modal/issuedDetailsModal.types';
import FiscalDocumentsPage from '../index';

const mocks = vi.hoisted(() => ({
  pending: null as FiscalPendencyItem | null,
  fetchOrder: vi.fn(), beginReplacement: vi.fn(), reload: vi.fn(), info: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { id: 'operator' } }) }));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => ['admin'] }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => true }));
vi.mock('@/pages/utils/nfe/fiscalAuthorization', () => ({ hasFiscalOperationRole: () => true }));
vi.mock('@/pages/utils/nfe/nfeNumberPreviewPrefetch', () => ({ prefetchNfeNumberPreviews: vi.fn() }));
vi.mock('@/pages/utils/orderHistoryService', () => ({ fetchOrderById: mocks.fetchOrder }));
vi.mock('@/pages/utils/nfe/nfeEmissionRequestState', () => ({
  beginFiscalEmissionReplacement: mocks.beginReplacement,
}));
vi.mock('react-toastify', () => ({ toast: { info: mocks.info } }));
vi.mock('../hooks/useFiscalDocumentsList', () => ({ useFiscalDocumentsList: () => ({
  documents: [], orderNumbers: {}, cancellationEligibility: {}, documentCount: 0,
  loadDocuments: mocks.reload,
}) }));
vi.mock('../hooks/useFiscalDocumentDetails', () => ({ useFiscalDocumentDetails: () => ({}) }));
vi.mock('../hooks/useFiscalCancelModal', () => ({ useFiscalCancelModal: () => ({}) }));
vi.mock('../hooks/useFiscalSefazActions', () => ({ useFiscalSefazActions: () => ({}) }));
vi.mock('../hooks/useFiscalPendencies', () => ({ useFiscalPendencies: () => ({
  pendencies: [mocks.pending], loading: false, error: null,
  metrics: { openCount: 1, productionCount: 0, homologationCount: 1, reissueCount: 1 },
  filters: { pendencyType: 'all', situation: 'all', environment: 'all', model: 'all', period: 'all', search: '' },
  setFilterField: vi.fn(), resetFilters: vi.fn(), reload: mocks.reload,
}) }));
vi.mock('../components/FiscalDocumentsFilterBar', () => ({ FiscalDocumentsFilterBar: () => null }));
vi.mock('../components/FiscalDocumentsTable', () => ({ FiscalDocumentsTable: () => null }));
vi.mock('../modals/FiscalCancelModal', () => ({ FiscalCancelModal: () => null }));
vi.mock('../modals/NfeOperationDraftModal', () => ({ default: () => null }));
vi.mock('@/pages/App/SalesOrder/OrderActions/NfeEmissionModal', () => ({
  default: ({ isOpen, initialEnvironment, order }: NfeEmissionModalProps) =>
    isOpen && order ? <output aria-label="Emissão">{order.id} | {initialEnvironment}</output> : null,
}));
vi.mock('../modals/IssuedFiscalDocumentDetailsModal', () => ({
  IssuedFiscalDocumentDetailsModal: ({ documentId, initialEnvironment, document }: IssuedFiscalDocumentDetailsModalProps) => (
    <output aria-label="Detalhes">{documentId} | {initialEnvironment} | {document ? 'sintético' : 'carregamento real'}</output>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchOrder.mockResolvedValue({ id: 'owned-order' });
  mocks.reload.mockResolvedValue(undefined);
  mocks.pending = {
    id: 'owned-order:2', orderId: 'owned-order', orderIndex: '100',
    customerName: 'Cliente próprio', customerDocument: '',
    pendencyType: 'awaiting_new_invoice', environment: 2, model: '55',
    originalDocumentId: 'original-document', originalDocumentNumber: 100,
    originalDocumentClosure: 'cancelada', identifiedAt: '2026-10-20T14:00:00Z',
    situationStatus: 'reissue_required', actionKind: 'awaiting_new_invoice',
    actionLabel: 'Emitir nova NF', actionIcon: 'bi-receipt',
  };
});
afterEach(cleanup);

function openPendencies() {
  render(<FiscalDocumentsPage />);
  fireEvent.click(screen.getByRole('tab', { name: /Pendências Fiscais/ }));
}

describe('ações da Central na página fiscal', () => {
  it.each([1, 2] as const)('abre a emissão no ambiente selecionado %s', async (environment) => {
    mocks.pending = { ...mocks.pending!, environment };
    openPendencies();
    fireEvent.click(screen.getByRole('button', { name: 'Emitir nova NF' }));
    expect((await screen.findByLabelText('Emissão')).textContent).toBe(`owned-order | ${environment}`);
    expect(mocks.fetchOrder).toHaveBeenCalledWith('owned-order');
    expect(mocks.beginReplacement).toHaveBeenCalledWith(
      'owned-order', environment, 'original-document'
    );
  });

  it.each([
    { currentDocumentId: 'current-document', draftId: 'draft-document', expected: 'current-document' },
    { currentDocumentId: null, draftId: 'draft-document', expected: 'draft-document' },
  ])('carrega detalhes pela identidade fiscal $expected sem inventar dados', ({ expected, ...ids }) => {
    mocks.pending = { ...mocks.pending!, ...ids };
    openPendencies();
    fireEvent.click(screen.getByText('Cliente próprio'));
    expect(screen.getByLabelText('Detalhes').textContent).toBe(`${expected} | 2 | carregamento real`);
  });

  it('não usa o ID do pedido quando a pendência não possui documento fiscal', () => {
    mocks.pending = { ...mocks.pending!, originalDocumentId: null };
    openPendencies();
    fireEvent.click(screen.getByText('Cliente próprio'));
    expect(screen.queryByLabelText('Detalhes')).toBeNull();
    expect(mocks.info).toHaveBeenCalledWith('Esta pendência ainda não possui um documento fiscal para consultar.');
  });
});
