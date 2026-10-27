// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InboundInvoicesPage from './InboundInvoicesScreen';
import { fetchInboundInvoicesPage } from '@/pages/utils/inboundNfe/inboundInvoicesService';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: () => false }));
vi.mock('@/pages/utils/accessRoles', () => ({ canPrintProductIdentificationLabels: () => false, getProfileRoles: () => [] }));
vi.mock('@/pages/utils/inboundNfe/inboundInvoicesService', () => ({ fetchInboundInvoicesPage: vi.fn() }));
vi.mock('../components/InboundInvoicesHeader', () => ({
  InboundInvoicesHeader: ({ onSearchChange }: { onSearchChange: (value: string) => void }) =>
    <input aria-label="Buscar entrada" onChange={(event) => onSearchChange(event.target.value)} />,
}));
vi.mock('../components/InboundInvoicesTable', () => ({
  InboundInvoicesTable: ({ invoices }: { invoices: { id: string }[] }) =>
    <div>{invoices.map((invoice) => <span key={invoice.id}>{invoice.id}</span>)}</div>,
}));
vi.mock('../modals/InboundInvoiceDetailsModal', () => ({ InboundInvoiceDetailsModal: () => null }));
vi.mock('../modals/InboundDocumentImportModal', () => ({ InboundDocumentImportModal: () => null }));
vi.mock('../modals/ManageInboundInvoiceMappingsModal', () => ({ ManageInboundInvoiceMappingsModal: () => null }));
vi.mock('../modals/InboundPostImportActionModal', () => ({ InboundPostImportActionModal: () => null }));
vi.mock('@/pages/App/Products/components/modals/product/LabelPrintSelectionModal', () => ({ LabelPrintSelectionModal: () => null }));

const response = (id: string, page = 1) => ({
  invoices: [{ id }] as any[], totalCount: 45, totalPages: 3, page, pageSize: 15,
});

beforeEach(() => vi.mocked(fetchInboundInvoicesPage).mockReset());
afterEach(cleanup);

describe('InboundInvoicesPage pagination', () => {
  it('returns to page one with the selected size', async () => {
    vi.mocked(fetchInboundInvoicesPage).mockResolvedValue(response('initial'));
    render(<MemoryRouter><InboundInvoicesPage /></MemoryRouter>);
    await screen.findByText('initial');
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    await waitFor(() => expect(fetchInboundInvoicesPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 15 })));
    fireEvent.change(screen.getByRole('combobox', { name: 'Registros por página' }), { target: { value: '50' } });
    await waitFor(() => expect(fetchInboundInvoicesPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })));
  });

  it('does not replace a newer filtered page with a late response', async () => {
    let finishOld!: (value: ReturnType<typeof response>) => void;
    vi.mocked(fetchInboundInvoicesPage)
      .mockResolvedValueOnce(response('initial'))
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(response('filtered'));
    render(<MemoryRouter><InboundInvoicesPage /></MemoryRouter>);
    await screen.findByText('initial');
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    fireEvent.change(screen.getByLabelText('Buscar entrada'), { target: { value: 'filtro' } });
    await screen.findByText('filtered');
    await act(async () => finishOld(response('outdated', 2)));
    expect(screen.queryByText('outdated')).toBeNull();
    expect(screen.getByText('filtered')).toBeTruthy();
  });
});
