// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
import { PostCreatorModelModal } from './PostCreatorModelModal';
const props = () => ({ elementType: 'LOGO' as const, opportunities: [], onClose: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined), onSavingChange: vi.fn() });
const name = () => screen.getByLabelText('Identificação / Nome');
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar prompt' }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('post creator model modal composition', () => {
  it('retains the same draft identity after a known refusal and awaits the callback', async () => {
    const values = props(); values.onSave.mockRejectedValueOnce(Object.assign(new Error('Recusado'), { knownFailure: true }));
    render(<PostCreatorModelModal {...values} />); fireEvent.change(name(), { target: { value: ' Logo ' } }); submit(); await screen.findByRole('alert');
    submit(); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce()); expect(values.onSave).toHaveBeenCalledTimes(2);
    expect(values.onSave.mock.calls[0][0].id).toBe(values.onSave.mock.calls[1][0].id); expect(values.onSave.mock.calls[0][0].name).toBe('Logo');
  });
  it('guards duplicate submit and closing while the callback is pending', async () => {
    let resolve!: () => void; const values = props(); values.onSave.mockReturnValue(new Promise<void>((yes) => { resolve = yes; }));
    render(<PostCreatorModelModal {...values} />); fireEvent.change(name(), { target: { value: 'Logo' } }); act(() => { submit(); submit(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); });
    await waitFor(() => expect(values.onSave).toHaveBeenCalledOnce()); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { resolve(); }); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce());
  });
  it('bounds an uncertain callback and blocks replay', async () => {
    vi.useFakeTimers(); const values = props(); values.onSave.mockReturnValue(new Promise(() => {})); render(<PostCreatorModelModal {...values} />); fireEvent.change(name(), { target: { value: 'Logo' } });
    await act(async () => { submit(); await vi.advanceTimersByTimeAsync(80_001); }); expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmado/);
    await act(async () => { submit(); }); expect(values.onSave).toHaveBeenCalledOnce(); expect(values.onClose).not.toHaveBeenCalled();
  });
  it('rejects non-image files before starting FileReader', async () => {
    const reader = vi.fn(); vi.stubGlobal('FileReader', reader); render(<PostCreatorModelModal {...props()} />);
    fireEvent.change(screen.getByLabelText('Adicionar anexo'), { target: { files: [new File(['bad'], 'bad.pdf', { type: 'application/pdf' })] } });
    await screen.findByRole('alert'); expect(reader).not.toHaveBeenCalled(); expect(screen.getByText('Anexos (0)')).toBeTruthy();
  });
  it('bounds file reading, prevents close and releases the reader on timeout', async () => {
    vi.useFakeTimers(); const abort = vi.fn(); vi.stubGlobal('FileReader', class { onload: any; onerror: any; readAsDataURL() {} abort = abort; }); const values = props(); render(<PostCreatorModelModal {...values} />);
    await act(async () => { fireEvent.change(screen.getByLabelText('Adicionar anexo'), { target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_001); }); expect(abort).toHaveBeenCalledOnce(); expect(screen.getByRole('alert').textContent).toMatch(/demorou demais/); expect(screen.getByText('Anexos (0)')).toBeTruthy();
  });
});
