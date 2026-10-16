// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import html2canvas from 'html2canvas';
import { exportLabelImage } from '../services/priceLabelExportService';

vi.mock('html2canvas', () => ({ default: vi.fn() }));
const command = { layoutId: 'layout', action: 'download' as 'copy' | 'download', snapshot: { selectedOppId: 'oferta/maio', scaleTens: 0 } };
const write = vi.fn(), click = vi.fn();
let element: HTMLDivElement, control: HTMLSpanElement;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function canvas(blob: Blob | null = new Blob(['png'], { type: 'image/png' })) {
  return { toDataURL: vi.fn(() => 'data:image/png;base64,abc'), toBlob: vi.fn((callback: BlobCallback) => callback(blob)) } as unknown as HTMLCanvasElement;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  element = document.createElement('div'); control = document.createElement('span');
  control.setAttribute('data-hide-export', 'true'); control.style.display = 'inline-flex'; element.append(control);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } });
  vi.stubGlobal('ClipboardItem', class { constructor(public data: Record<string, Blob>) {} });
  write.mockReset().mockResolvedValue(undefined); vi.mocked(html2canvas).mockReset().mockResolvedValue(canvas());
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('exportação da arte', () => {
  it('captura sem modificar o DOM e exclui somente controles na cópia', async () => {
    await exportLabelImage(element, command, () => true);
    const options = vi.mocked(html2canvas).mock.calls[0][1]!;
    expect(options.ignoreElements!(control)).toBe(true); expect(options.ignoreElements!(element)).toBe(false);
    expect(control.style.display).toBe('inline-flex'); expect(click).toHaveBeenCalledOnce();
    const link = click.mock.instances[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^etiqueta_preco_oferta%2Fmaio_\d+\.png$/);
  });
  it('propaga falha de captura sem alterar os estilos existentes', async () => {
    vi.mocked(html2canvas).mockRejectedValue(new Error('Captura falhou'));
    await expect(exportLabelImage(element, command, () => true)).rejects.toThrow('Captura falhou');
    expect(control.style.display).toBe('inline-flex'); expect(click).not.toHaveBeenCalled();
  });
  it('não captura intenção inválida nem prévia ausente', async () => {
    await expect(exportLabelImage(element, { ...command, snapshot: { scaleTens: -1 } }, () => true)).rejects.toThrow();
    await expect(exportLabelImage(null, command, () => true)).rejects.toThrow('prévia');
    expect(html2canvas).not.toHaveBeenCalled();
  });
  it('aguarda o callback toBlob e a confirmação de escrita', async () => {
    let callback!: BlobCallback; const pending = deferred<void>(); let done = false;
    const captured = canvas(); captured.toBlob = vi.fn((cb) => { callback = cb; });
    vi.mocked(html2canvas).mockResolvedValue(captured); write.mockReturnValue(pending.promise);
    const operation = exportLabelImage(element, { ...command, action: 'copy' }, () => true).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(0); expect(write).not.toHaveBeenCalled(); expect(done).toBe(false);
    callback(new Blob(['png'], { type: 'image/png' })); await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledOnce(); expect(done).toBe(false);
    pending.resolve(); await operation; expect(done).toBe(true);
  });
  it('propaga rejeição do clipboard ao proprietário', async () => {
    write.mockRejectedValue(new Error('Sem permissão'));
    await expect(exportLabelImage(element, { ...command, action: 'copy' }, () => true)).rejects.toThrow('Sem permissão');
  });
  it('rejeita blob nulo e navegador sem suporte', async () => {
    vi.mocked(html2canvas).mockResolvedValue(canvas(null));
    await expect(exportLabelImage(element, { ...command, action: 'copy' }, () => true)).rejects.toThrow('gerar');
    expect(write).not.toHaveBeenCalled();
    vi.stubGlobal('ClipboardItem', undefined);
    await expect(exportLabelImage(element, { ...command, action: 'copy' }, () => true)).rejects.toThrow('Use Baixar PNG');
    expect(html2canvas).toHaveBeenCalledOnce();
  });
  it.each(['copy', 'download'] as const)('contexto antigo impede o efeito %s após capturar', async (action) => {
    let current = true; const request = deferred<HTMLCanvasElement>(); vi.mocked(html2canvas).mockReturnValue(request.promise);
    const operation = exportLabelImage(element, { ...command, action }, () => current);
    const assertion = expect(operation).rejects.toThrow('arte mudou'); current = false; request.resolve(canvas()); await assertion;
    expect(write).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
  });
  it.each(['capture', 'blob', 'clipboard'] as const)('libera a espera em 30s durante %s e descarta continuação tardia', async (stage) => {
    const request = deferred<HTMLCanvasElement>(), pending = deferred<void>(); let callback!: BlobCallback;
    const captured = canvas();
    if (stage === 'capture') vi.mocked(html2canvas).mockReturnValue(request.promise);
    if (stage === 'blob') { captured.toBlob = vi.fn((cb) => { callback = cb; }); vi.mocked(html2canvas).mockResolvedValue(captured); }
    if (stage === 'clipboard') write.mockReturnValue(pending.promise);
    const operation = exportLabelImage(element, { ...command, action: 'copy' }, () => true);
    const assertion = expect(operation).rejects.toThrow('prazo'); await vi.advanceTimersByTimeAsync(30000); await assertion;
    request.resolve(captured); if (callback) callback(new Blob(['late'])); pending.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(write).toHaveBeenCalledTimes(stage === 'clipboard' ? 1 : 0); expect(click).not.toHaveBeenCalled();
  });
});
