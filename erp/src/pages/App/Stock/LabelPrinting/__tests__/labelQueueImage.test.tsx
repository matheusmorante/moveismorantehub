// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import LabelQueue from '../components/LabelQueue';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
vi.mock('../components/ProductSearchInput', () => ({ default: () => null }));
const first = { id: 'first', isBlank: true, quantity: 1, name: '', metadata: { zero: 0, enabled: false } };
const second = { id: 'second', isBlank: true, quantity: 2, name: '' };
const image = () => new File(['photo'], 'logo.png', { type: 'image/png' });
function finish(reader: FileReader, result: string | null = 'data:image/png;base64,logo') {
  Object.defineProperty(reader, 'result', { value: result, configurable: true }); reader.dispatchEvent(new Event('load'));
}
function queue(items = [first, second]) {
  const update = vi.fn();
  const p = { labelItems: items, setLabelItems: update, printingMode: 'simple' as const, config: {}, selectedCategory: 'logos' };
  return { ...render(<LabelQueue {...p} />), update, p };
}
async function start() {
  fireEvent.change(screen.getByLabelText('Imagem da etiqueta 1'), { target: { files: [image()] } });
  await waitFor(() => expect(FileReader.prototype.readAsDataURL).toHaveBeenCalledTimes(1));
  return vi.mocked(FileReader.prototype.readAsDataURL).mock.contexts[0] as FileReader;
}
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('upload local vinculado ao item de etiqueta', () => {
  it('impede arquivo inválido e leitura duplicada, preservando metadata ao preencher o rascunho', async () => {
    const view = queue(); const input = screen.getByLabelText('Imagem da etiqueta 1') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'x.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('arquivo de imagem'));
    expect(FileReader.prototype.readAsDataURL).not.toHaveBeenCalled(); expect(view.update).not.toHaveBeenCalled();
    const reader = await start();
    expect(input.disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('Lendo');
    fireEvent.change(input, { target: { files: [image()] } }); expect(FileReader.prototype.readAsDataURL).toHaveBeenCalledTimes(1);
    await act(async () => { finish(reader); });
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(view.update.mock.calls[0][0]([first, second])).toEqual([{ ...first, image: 'data:image/png;base64,logo', isBlank: false, printingMode: 'simple' }, second]);
    expect(input.disabled).toBe(false); expect(screen.queryByRole('alert')).toBeNull();
  });

  it('segue a identidade do item ao reordenar em vez do índice antigo', async () => {
    const view = queue(); const reader = await start();
    view.rerender(<LabelQueue {...view.p} labelItems={[second, first]} />);
    await act(async () => { finish(reader); });
    expect(view.update.mock.calls[0][0]([second, first])).toEqual([second, { ...first, image: 'data:image/png;base64,logo', isBlank: false, printingMode: 'simple' }]);
  });

  it.each(['remove', 'edit'])('descarta leitura quando o destino é alterado: %s', async (operation) => {
    const view = queue(); const reader = await start();
    const next = operation === 'remove' ? [second] : [{ ...first, quantity: 3 }, second];
    view.rerender(<LabelQueue {...view.p} labelItems={next} />);
    await act(async () => { finish(reader); });
    expect(view.update).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('etiqueta mudou');
  });

  it('protege também o updater se a fila mudar antes de o React aplicá-lo', async () => {
    const view = queue(); const reader = await start(); await act(async () => { finish(reader); });
    const replacement = { ...first, id: 'other' };
    expect(view.update.mock.calls[0][0]([replacement, second])).toEqual([replacement, second]);
  });

  it.each(['error', 'abort', 'empty'])('mostra falha de leitura %s sem alterar a fila', async (failure) => {
    const view = queue(); const reader = await start();
    await act(async () => { if (failure === 'empty') finish(reader, ''); else reader.dispatchEvent(new Event(failure)); });
    expect(screen.getByRole('alert')).toBeTruthy(); expect(view.update).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Imagem da etiqueta 1') as HTMLInputElement).disabled).toBe(false);
  });

  it('expira e ignora carregamento tardio, liberando a próxima seleção', async () => {
    const view = queue(); vi.useFakeTimers();
    await act(async () => { fireEvent.change(screen.getByLabelText('Imagem da etiqueta 1'), { target: { files: [image()] } }); });
    const reader = vi.mocked(FileReader.prototype.readAsDataURL).mock.contexts[0] as FileReader;
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByRole('alert').textContent).toContain('leitura demorou');
    await act(async () => { finish(reader); }); expect(view.update).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Imagem da etiqueta 1') as HTMLInputElement).disabled).toBe(false);
  });

  it('aborta em outra categoria e na desmontagem sem publicar erro antigo', async () => {
    const abort = vi.spyOn(FileReader.prototype, 'abort');
    const view = queue(); const reader = await start();
    view.rerender(<LabelQueue {...view.p} selectedCategory="precos" />);
    await act(async () => { finish(reader); });
    expect(view.update).not.toHaveBeenCalled(); expect(abort).toHaveBeenCalled(); expect(toast.error).not.toHaveBeenCalled();
    vi.mocked(FileReader.prototype.readAsDataURL).mockClear(); const nextReader = await start();
    view.unmount(); await act(async () => { finish(nextReader); });
    expect(view.update).not.toHaveBeenCalled(); expect(toast.error).not.toHaveBeenCalled();
  });

  it('limpa o erro da leitura anterior ao trocar de categoria', async () => {
    const view = queue(), reader = await start();
    await act(async () => { reader.dispatchEvent(new Event('error')); });
    expect(screen.getByRole('alert')).toBeTruthy();
    view.rerender(<LabelQueue {...view.p} selectedCategory="precos" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
