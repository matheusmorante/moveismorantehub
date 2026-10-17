// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
import { LabelModelCreationModal } from './LabelModelCreationModal';
const source = 'data:image/png;base64,aW1hZ2U=', cropped = 'data:image/png;base64,Y3JvcA==';
const readers: any[] = []; let readMode = 'load';
const draw = vi.fn(), encode = vi.fn();
const props = () => ({ isOpen: true, contextKey: 'label', onClose: vi.fn(), onApply: vi.fn().mockResolvedValue(true) });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>((yes) => { resolve = yes; }); return { promise, resolve }; };
const upload = async (load = true) => {
  fireEvent.change(screen.getByLabelText('Imagem do modelo de etiqueta'), { target: { files: [new File(['image'], 'model.png', { type: 'image/png' })] } });
  const image = await screen.findByAltText('Para recorte'); if (load) fireEvent.load(image); await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar ao Grid' })).toHaveProperty('disabled', false)); return image;
};
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Aplicar ao Grid' }));
beforeEach(() => {
  readers.length = 0; readMode = 'load'; vi.clearAllMocks(); encode.mockReturnValue(cropped);
  vi.stubGlobal('FileReader', class {
    result: string | null = null; onload: null | (() => void) = null; onerror: null | (() => void) = null; onabort: null | (() => void) = null; aborted = false;
    constructor() { readers.push(this); }
    abort = vi.fn(() => { this.aborted = true; this.onabort?.(); });
    readAsDataURL() { void Promise.resolve().then(() => { if (this.aborted) return; if (readMode === 'load') { this.result = source; this.onload?.(); } else if (readMode === 'error') this.onerror?.(); }); }
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400); vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLImageElement.prototype, 'clientWidth', 'get').mockReturnValue(400); vi.spyOn(HTMLImageElement.prototype, 'clientHeight', 'get').mockReturnValue(200);
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800); vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: draw, clearRect: vi.fn() } as any);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(encode);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('retained label model creation owner', () => {
  it('rejects an invalid file before reading or drawing it', async () => {
    const values = props(); render(<LabelModelCreationModal {...values} />);
    fireEvent.change(screen.getByLabelText('Imagem do modelo de etiqueta'), { target: { files: [new File(['bad'], 'bad.pdf', { type: 'application/pdf' })] } });
    await screen.findByRole('alert'); expect(readers).toHaveLength(0); expect(draw).not.toHaveBeenCalled(); expect(values.onApply).not.toHaveBeenCalled();
  });
  it('holds the resolver through bounded file reading and blocks close or a second read', async () => {
    vi.useFakeTimers(); readMode = 'hang'; const values = props(); render(<LabelModelCreationModal {...values} />);
    const file = new File(['image'], 'model.png', { type: 'image/png' });
    await act(async () => { fireEvent.change(screen.getByLabelText('Imagem do modelo de etiqueta'), { target: { files: [file] } }); });
    fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); fireEvent.change(screen.getByLabelText('Imagem do modelo de etiqueta'), { target: { files: [file] } });
    expect(readers).toHaveLength(1); expect(values.onClose).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_001); }); expect(screen.getByRole('alert').textContent).toMatch(/leitura demorou/); expect(readers[0].abort).toHaveBeenCalledOnce(); expect(screen.queryByAltText('Para recorte')).toBeNull();
  });
  it('does not draw before the source image dimensions are confirmed', async () => {
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0); vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(0);
    render(<LabelModelCreationModal {...props()} />); await upload(false); apply(); await screen.findByRole('alert'); expect(draw).not.toHaveBeenCalled();
  });
  it('validates preview geometry and applies the same crop from the displayed image', async () => {
    const values = props(); render(<LabelModelCreationModal {...values} />); const image = await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Pré-visualizar Recorte' })); await screen.findByAltText('Preview do recorte');
    expect(draw).toHaveBeenCalledWith(image, 40, 0, 400, 240, 0, 0, 400, 240); expect(values.onApply).not.toHaveBeenCalled();
    apply(); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce()); expect(values.onApply).toHaveBeenCalledWith(cropped, 1); expect(draw).toHaveBeenCalledOnce();
  });
  it('awaits an actual callback rather than closing after a fixed delay', async () => {
    const pending = deferred(), values = props(); values.onApply.mockReturnValue(pending.promise); render(<LabelModelCreationModal {...values} />); await upload();
    fireEvent.change(screen.getByLabelText('Escala do modelo em porcentagem'), { target: { value: '200' } }); apply(); await waitFor(() => expect(values.onApply).toHaveBeenCalledOnce());
    expect(values.onApply).toHaveBeenCalledWith(cropped, 2); expect(values.onClose).not.toHaveBeenCalled(); fireEvent.keyDown(window, { key: 'Escape' }); fireEvent.click(screen.getByRole('button', { name: 'Fechar' })); apply(); expect(values.onApply).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve(true); }); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce());
  });
  it('preserves the prepared crop after a confirmed callback refusal and retries without redrawing', async () => {
    const values = props(); values.onApply.mockResolvedValueOnce(false); render(<LabelModelCreationModal {...values} />); await upload(); apply(); await screen.findByRole('alert');
    expect(values.onClose).not.toHaveBeenCalled(); apply(); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce()); expect(values.onApply).toHaveBeenCalledTimes(2); expect(draw).toHaveBeenCalledOnce();
  });
  it('blocks replay after an uncertain callback rejection', async () => {
    const values = props(); values.onApply.mockRejectedValue(new Error('Disconnected')); render(<LabelModelCreationModal {...values} />); await upload(); apply(); await screen.findByRole('alert');
    apply(); expect(values.onApply).toHaveBeenCalledOnce(); expect(values.onClose).not.toHaveBeenCalled(); expect(screen.getByAltText('Preview do recorte')).toBeTruthy();
  });
  it('bounds a stalled callback and ignores its late completion', async () => {
    const pending = deferred(), values = props(); values.onApply.mockReturnValue(pending.promise); render(<LabelModelCreationModal {...values} />); await upload(); vi.useFakeTimers();
    await act(async () => { apply(); await vi.advanceTimersByTimeAsync(30_001); }); expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmada/); apply(); expect(values.onApply).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve(true); }); expect(values.onClose).not.toHaveBeenCalled();
  });
  it('does not let a prior callback close or unlock a newer context', async () => {
    const first = deferred(), next = deferred(), values = props(); values.onApply.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise); const view = render(<LabelModelCreationModal {...values} />); await upload(); apply(); await waitFor(() => expect(values.onApply).toHaveBeenCalledOnce());
    view.rerender(<LabelModelCreationModal {...values} contextKey="other" />); await upload(); apply(); await waitFor(() => expect(values.onApply).toHaveBeenCalledTimes(2));
    await act(async () => { first.resolve(true); }); expect(values.onClose).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Aplicar ao Grid' })).toHaveProperty('disabled', true);
    await act(async () => { next.resolve(true); }); await waitFor(() => expect(values.onClose).toHaveBeenCalledOnce());
  });
  it('blocks a crop that no longer fits the measured display before canvas mutation', async () => {
    const values = props(); render(<LabelModelCreationModal {...values} />); await upload(); vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100); apply(); await screen.findByRole('alert');
    expect(draw).not.toHaveBeenCalled(); expect(values.onApply).not.toHaveBeenCalled();
  });
  it('rejects an empty canvas encoding without invoking the consumer', async () => {
    encode.mockReturnValue('data:,'); const values = props(); render(<LabelModelCreationModal {...values} />); await upload(); apply(); await screen.findByRole('alert'); expect(values.onApply).not.toHaveBeenCalled(); expect(values.onClose).not.toHaveBeenCalled();
  });
  it('fits the initial selection in a narrow display before applying it', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(180); vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(180);
    vi.spyOn(HTMLImageElement.prototype, 'clientWidth', 'get').mockReturnValue(180); vi.spyOn(HTMLImageElement.prototype, 'clientHeight', 'get').mockReturnValue(180);
    const values = props(); render(<LabelModelCreationModal {...values} />); await upload(); apply(); await waitFor(() => expect(values.onApply).toHaveBeenCalledOnce()); expect(screen.queryByRole('alert')).toBeNull();
  });
  it('reports a source decoding failure before any canvas effect', async () => {
    const values = props(); render(<LabelModelCreationModal {...values} />); const image = await upload(); fireEvent.error(image);
    expect(screen.getByRole('alert').textContent).toMatch(/carregar a imagem/); apply(); await waitFor(() => expect(values.onApply).not.toHaveBeenCalled()); expect(draw).not.toHaveBeenCalled();
  });
});
