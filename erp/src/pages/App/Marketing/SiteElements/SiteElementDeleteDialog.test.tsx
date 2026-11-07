// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SiteElementDeleteDialog from './SiteElementDeleteDialog';
import { type SiteElementModel } from './siteElementService';
const mocks = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('./siteElementService', () => ({ deleteSiteElementModel: mocks.remove, siteElementErrorMessage: (error: Error) => error.message }));
const model: SiteElementModel = { id: '33bb9fd7-d91a-4291-80ac-4bad09910179', kind: 'carousel', name: 'Novembro', image_path: 'banner.png',
  file_name: 'banner.png', mime_type: 'image/png', size_bytes: 10, width: 1920, height: 620, updated_at: '' };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });
describe('site element deletion form', () => {
  it('requires explicit confirmation and waits for the service, preventing duplicate effects and closing', async () => {
    let resolve!: (value: { cleanupFailed: boolean }) => void;
    mocks.remove.mockReturnValue(new Promise((yes) => { resolve = yes; }));
    const onDeleted = vi.fn(); const onClose = vi.fn();
    render(<SiteElementDeleteDialog model={model} onClose={onClose} onDeleted={onDeleted} />);
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir modelo' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Excluir modelo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.remove).toHaveBeenCalledOnce(); expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve({ cleanupFailed: false }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(false));
  });
  it('displays deletion failure and keeps the dialog available', async () => {
    mocks.remove.mockRejectedValue(new Error('Falha ao excluir'));
    const onDeleted = vi.fn();
    render(<SiteElementDeleteDialog model={model} onClose={vi.fn()} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir modelo' }));
    await screen.findByText('Falha ao excluir');
    expect(screen.getByRole('alertdialog')).toBeTruthy(); expect(onDeleted).not.toHaveBeenCalled();
  });
});
