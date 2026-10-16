// @vitest-environment happy-dom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabelGridSheetPreview, type LabelGridSheetPreviewLayout } from '../components/LabelGridSheetPreview';

const errors = vi.hoisted(() => vi.fn());
vi.mock('react-toastify', () => ({ toast: { error: errors } }));
class Reader {
  static instances: Reader[] = [];
  result: string | ArrayBuffer | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() { Reader.instances.push(this); }
  readAsDataURL = vi.fn();
  abort = vi.fn(() => this.onabort?.());
  succeed() { this.result = 'data:image/png;base64,AA'; this.onload?.(); }
}
const layout: LabelGridSheetPreviewLayout = { paperWidth: 210, paperHeight: 297, columns: 1, rows: 1,
  margins: { top: 0, bottom: 0, left: 0, right: 0 }, gaps: { horizontal: 0, vertical: 0 },
  layoutType: 'rect', backgroundColor: '#fff', imageScale: 1, previewImage: null, customPreviewImage: null };
const file = () => new File(['image'], 'sample.png', { type: 'image/png' });
const input = () => screen.getByLabelText('Carregar amostra de etiqueta') as HTMLInputElement;
const choose = (value = file()) => fireEvent.change(input(), { target: { files: [value] } });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup(value = layout, onChange = vi.fn()) {
  const view = render(<LabelGridSheetPreview layout={value} ownerKey="model-1" onCustomPreviewImageChange={onChange} />);
  return { ...view, onChange };
}
async function start() { choose(); await waitFor(() => expect(Reader.instances).toHaveLength(1)); return Reader.instances[0]; }
beforeEach(() => {
  vi.clearAllMocks(); Reader.instances = []; vi.stubGlobal('FileReader', Reader);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('sheet sample owner with real RHF/schema and bounded file reading', () => {
  it('aborta a amostra pendente quando o proprietário começa a salvar e não aceita outra leitura', async () => {
    const s = setup(), reader = await start();
    s.rerender(<LabelGridSheetPreview layout={layout} ownerKey="model-1" disabled onCustomPreviewImageChange={s.onChange} />);
    await waitFor(() => expect(reader.abort).toHaveBeenCalled());
    await act(async () => { reader.succeed(); });
    expect(s.onChange).not.toHaveBeenCalled(); choose();
    expect(Reader.instances).toHaveLength(1); expect(input().disabled).toBe(true);
  });

  it('rejects an invalid file before reading and presents its error in the owner', async () => {
    const s = setup(); choose(new File(['text'], 'sample.txt', { type: 'text/plain' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('arquivo de imagem'));
    expect(Reader.instances).toHaveLength(0); expect(s.onChange).not.toHaveBeenCalled(); expect(input().disabled).toBe(false);
  });

  it('keeps the common lock throughout reading and the awaited callback', async () => {
    const callback = deferred(), onChange = vi.fn(() => callback.promise);
    setup({ ...layout, customPreviewImage: '/old.svg' }, onChange); const reader = await start();
    expect(input().disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('aplicando');
    choose(); fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(Reader.instances).toHaveLength(1); expect(onChange).not.toHaveBeenCalled();
    await act(async () => { reader.succeed(); });
    expect(onChange).toHaveBeenCalledOnce(); expect(onChange).toHaveBeenCalledWith('data:image/png;base64,AA'); expect(input().disabled).toBe(true);
    await act(async () => { callback.resolve(); }); expect(input().disabled).toBe(false); expect(screen.queryByRole('status')).toBeNull();
  });

  it('validates clearing under the same resolver and awaits its callback without reading a file', async () => {
    const callback = deferred(), onChange = vi.fn(() => callback.promise);
    setup({ ...layout, customPreviewImage: '/old.svg' }, onChange);
    const clear = screen.getByRole('button', { name: 'Limpar' }) as HTMLButtonElement;
    fireEvent.click(clear); fireEvent.click(clear);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null)); expect(onChange).toHaveBeenCalledOnce();
    expect(input().disabled).toBe(true); expect(Reader.instances).toHaveLength(0);
    await act(async () => { callback.resolve(); }); expect(clear.disabled).toBe(false);
  });

  it('preserves the sample after a callback rejection and exposes the failure', async () => {
    const onChange = vi.fn().mockRejectedValueOnce(new Error('Não foi possível aplicar a amostra.'));
    setup({ ...layout, customPreviewImage: '/old.svg' }, onChange); fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('aplicar a amostra'));
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeTruthy(); expect(input().disabled).toBe(false);
  });

  it.each(['error', 'abort'])('releases progress after a read %s without applying an image', async (kind) => {
    const s = setup(), reader = await start();
    await act(async () => { if (kind === 'error') reader.onerror?.(); else reader.onabort?.(); });
    expect(screen.getByRole('alert').textContent).toMatch(/ler|interrompida/); expect(input().disabled).toBe(false);
    expect(s.onChange).not.toHaveBeenCalled(); expect(reader.onload).toBeNull();
  });

  it('aborts a timed-out read and prevents a late result from restoring a cleared sample', async () => {
    const s = setup({ ...layout, customPreviewImage: '/old.svg' }); vi.useFakeTimers();
    await act(async () => { choose(); }); const reader = Reader.instances[0];
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByRole('alert').textContent).toContain('leitura demorou'); expect(input().disabled).toBe(false);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Limpar' })); });
    expect(s.onChange).toHaveBeenCalledOnce(); expect(s.onChange).toHaveBeenCalledWith(null);
    await act(async () => { reader.succeed(); }); expect(s.onChange).toHaveBeenCalledOnce(); expect(reader.abort).toHaveBeenCalled();
  });

  it('bounds a pending callback, blocks replay in that owner and ignores its late completion', async () => {
    const callback = deferred(), onChange = vi.fn(() => callback.promise); setup(layout, onChange); const reader = await start(); vi.useFakeTimers();
    await act(async () => { reader.succeed(); }); await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(input().disabled).toBe(true);
    choose(); await act(async () => { callback.resolve(); }); expect(onChange).toHaveBeenCalledOnce(); expect(screen.queryByRole('status')).toBeNull();
  });

  it('preserves a read across equivalent inline layout objects and changing callback references', async () => {
    const s = setup(), reader = await start(), next = vi.fn();
    s.rerender(<LabelGridSheetPreview layout={{ ...layout, margins: { ...layout.margins }, gaps: { ...layout.gaps } }} ownerKey="model-1" onCustomPreviewImageChange={next} />);
    await act(async () => { reader.succeed(); });
    expect(s.onChange).toHaveBeenCalledOnce(); expect(s.onChange).toHaveBeenCalledWith('data:image/png;base64,AA'); expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['owner', 'geometry', 'external-image'])('aborts a stale sample after a %s change', async (kind) => {
    const s = setup(), reader = await start();
    const next = kind === 'geometry' ? { ...layout, columns: 2 } : kind === 'external-image' ? { ...layout, customPreviewImage: '/external.svg' } : layout;
    s.rerender(<LabelGridSheetPreview layout={next} ownerKey={kind === 'owner' ? 'model-2' : 'model-1'} onCustomPreviewImageChange={s.onChange} />);
    await act(async () => { reader.succeed(); });
    expect(s.onChange).not.toHaveBeenCalled(); expect(reader.abort).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull(); expect(input().disabled).toBe(false);
  });

  it('does not begin reading after unmount in the resolver and aborts an active read', async () => {
    const before = setup(); choose(); before.unmount(); await act(async () => {});
    expect(Reader.instances).toHaveLength(0); expect(before.onChange).not.toHaveBeenCalled();
    const active = setup(), reader = await start(); active.unmount();
    await act(async () => { reader.succeed(); }); expect(active.onChange).not.toHaveBeenCalled(); expect(reader.abort).toHaveBeenCalled();
  });

  it('allows an incomplete grid draft and operates under StrictMode without revalidating layout fields', async () => {
    const onChange = vi.fn();
    render(<StrictMode><LabelGridSheetPreview layout={{ ...layout, columns: 0, rows: 0 }} ownerKey="draft" onCustomPreviewImageChange={onChange} /></StrictMode>);
    const reader = await start(); await act(async () => { reader.succeed(); });
    expect(onChange).toHaveBeenCalledOnce(); expect(onChange).toHaveBeenCalledWith('data:image/png;base64,AA'); expect(screen.queryByRole('alert')).toBeNull();
  });
});
