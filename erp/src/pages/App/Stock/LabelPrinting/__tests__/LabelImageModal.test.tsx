// @vitest-environment happy-dom
import React, { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-toastify';
import LabelImageModal from '../modals/LabelImageModal';
import { createLabelImage, deleteLabelImage, fetchLabelImages } from '../services/labelImageService';
import { LabelImageUnconfirmedError } from '../../../../../../../shared-utils/labelImageFormSchemas';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/labelImageService', () => ({ createLabelImage: vi.fn(), deleteLabelImage: vi.fn(), fetchLabelImages: vi.fn() }));

const existing = { id: 1, name: 'ANTIGA', image: '/antiga.svg', category: 'categoria-historica' };
const created = { id: 2, name: 'MDF', image: 'data:image/png;base64,AA', category: 'logos' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
class Reader {
  static instances: Reader[] = [];
  result: string | ArrayBuffer | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() { Reader.instances.push(this); }
  readAsDataURL = vi.fn();
  abort = vi.fn(() => this.onabort?.());
  succeed(image = created.image) { this.result = image; this.onload?.(); }
}
const upload = () => screen.getByLabelText('Carregar imagem de etiqueta') as HTMLInputElement;
const select = () => screen.getByRole('button', { name: 'Selecionar imagem ANTIGA' });
const props = () => ({ isOpen: true, currentCategory: 'logos' as const, onClose: vi.fn(), onSelect: vi.fn() });
async function open(overrides: Partial<React.ComponentProps<typeof LabelImageModal>> = {}) {
  const callbacks = { ...props(), ...overrides };
  const view = render(<LabelImageModal {...callbacks} />);
  await waitFor(() => expect(upload().disabled).toBe(false));
  return { ...view, ...callbacks };
}
async function startUpload(file = new File(['image'], '  mdf .png', { type: 'image/png' })) {
  fireEvent.change(upload(), { target: { files: [file] } });
  await waitFor(() => expect(Reader.instances).toHaveLength(1));
  return Reader.instances[0];
}
beforeEach(() => {
  vi.clearAllMocks(); Reader.instances = [];
  vi.stubGlobal('FileReader', Reader);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.mocked(fetchLabelImages).mockResolvedValue([existing]);
  vi.mocked(createLabelImage).mockResolvedValue(created);
  vi.mocked(deleteLabelImage).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('biblioteca de etiquetas com resolver real', () => {
  it('não consulta fechada e carrega normalmente sob StrictMode', async () => {
    const p = props(); const view = render(<StrictMode><LabelImageModal {...p} isOpen={false} /></StrictMode>);
    expect(fetchLabelImages).not.toHaveBeenCalled();
    view.rerender(<StrictMode><LabelImageModal {...p} /></StrictMode>);
    await waitFor(() => expect(upload().disabled).toBe(false));
    expect(fetchLabelImages).toHaveBeenCalledWith({ sort: 'newest' });
    expect(select()).toBeTruthy(); expect(screen.queryByRole('status')).toBeNull();
  });

  it('distingue falha de consulta de biblioteca vazia e oferece recarga', async () => {
    vi.mocked(fetchLabelImages).mockRejectedValueOnce(new Error('network'));
    render(<LabelImageModal {...props()} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('carregar'));
    expect(upload().disabled).toBe(true); expect(screen.queryByText('Sua biblioteca está vazia')).toBeNull();
    fireEvent.click(screen.getByText('Recarregar biblioteca'));
    await waitFor(() => expect(upload().disabled).toBe(false));
    expect(select()).toBeTruthy(); expect(screen.queryByRole('alert')).toBeNull();
  });

  it('libera consulta expirada e ignora a resposta anterior depois da recarga', async () => {
    const pending = deferred<typeof existing[]>();
    vi.mocked(fetchLabelImages).mockReturnValueOnce(pending.promise);
    vi.useFakeTimers(); render(<LabelImageModal {...props()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('alert').textContent).toContain('carregar');
    await act(async () => { fireEvent.click(screen.getByText('Recarregar biblioteca')); });
    expect(upload().disabled).toBe(false);
    await act(async () => { pending.resolve([{ ...existing, name: 'OBSOLETA' }]); });
    expect(screen.queryByRole('button', { name: 'Selecionar imagem OBSOLETA' })).toBeNull();
    expect(select()).toBeTruthy();
  });

  it('descarta consulta de uma categoria/abertura anterior', async () => {
    const pending = deferred<typeof existing[]>(); vi.mocked(fetchLabelImages).mockReturnValueOnce(pending.promise);
    const p = props(); const view = render(<LabelImageModal {...p} />);
    await waitFor(() => expect(fetchLabelImages).toHaveBeenCalledTimes(1));
    view.rerender(<LabelImageModal {...p} currentCategory="precos" />);
    await waitFor(() => expect(upload().disabled).toBe(false));
    await act(async () => { pending.resolve([{ ...existing, name: 'OBSOLETA' }]); });
    expect(select()).toBeTruthy(); expect(screen.queryByAltText('OBSOLETA')).toBeNull();
  });

  it.each([
    { file: new File(['x'], 'nota.txt', { type: 'text/plain' }), category: 'logos' },
    { file: new File(['x'], '.png', { type: 'image/png' }), category: 'logos' },
    { file: new File(['x'], 'logo.png', { type: 'image/png' }), category: 'invalida' },
  ])('bloqueia arquivo, nome ou categoria inválidos antes da leitura %#', async ({ file, category }) => {
    await open({ currentCategory: category as 'logos' });
    fireEvent.change(upload(), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(Reader.instances).toHaveLength(0); expect(createLabelImage).not.toHaveBeenCalled(); expect(upload().disabled).toBe(false);
  });

  it('usa valores parseados e mantém trava comum durante leitura e gravação', async () => {
    const write = deferred<typeof created>(); vi.mocked(createLabelImage).mockReturnValueOnce(write.promise);
    const p = await open(); const reader = await startUpload();
    expect(upload().disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('salvando');
    fireEvent.change(upload(), { target: { files: [new File(['x'], 'duplicada.png', { type: 'image/png' })] } });
    fireEvent.click(select()); fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    fireEvent.click(screen.getByText('Fechar Biblioteca')); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(p.onClose).not.toHaveBeenCalled(); expect(p.onSelect).not.toHaveBeenCalled(); expect(deleteLabelImage).not.toHaveBeenCalled(); expect(Reader.instances).toHaveLength(1);
    await act(async () => { reader.succeed(); });
    expect(createLabelImage).toHaveBeenCalledTimes(1);
    expect(createLabelImage).toHaveBeenCalledWith({ name: 'MDF', image: created.image, category: 'logos' });
    expect(upload().disabled).toBe(true); expect(toast.success).not.toHaveBeenCalled();
    await act(async () => { write.resolve(created); });
    expect(upload().disabled).toBe(false); expect(screen.getByAltText('MDF')).toBeTruthy(); expect(upload().value).toBe('');
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it.each(['error', 'abort'])('mostra erro de leitura %s sem iniciar INSERT', async (failure) => {
    await open(); const reader = await startUpload();
    await act(async () => { if (failure === 'error') reader.onerror?.(); else reader.onabort?.(); });
    expect(screen.getByRole('alert').textContent).toMatch(/ler|interrompida/);
    expect(createLabelImage).not.toHaveBeenCalled(); expect(upload().disabled).toBe(false);
  });

  it('expira leitura sem INSERT tardio e permite escolher outro arquivo', async () => {
    await open(); vi.useFakeTimers();
    await act(async () => { fireEvent.change(upload(), { target: { files: [new File(['x'], 'mdf.png', { type: 'image/png' })] } }); });
    const reader = Reader.instances[0];
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByRole('alert').textContent).toContain('leitura demorou'); expect(upload().disabled).toBe(false);
    await act(async () => { reader.succeed(); });
    expect(createLabelImage).not.toHaveBeenCalled(); expect(reader.abort).toHaveBeenCalled();
  });

  it('aborta leitura quando o proprietário fecha e ignora resposta de gravação desmontada', async () => {
    const p = props(), view = await open(p); const reader = await startUpload();
    view.rerender(<LabelImageModal {...p} isOpen={false} />);
    await act(async () => { reader.succeed(); }); expect(createLabelImage).not.toHaveBeenCalled(); expect(reader.abort).toHaveBeenCalled();
    view.rerender(<LabelImageModal {...p} />); await waitFor(() => expect(upload().disabled).toBe(false));
    Reader.instances = []; const write = deferred<typeof created>(); vi.mocked(createLabelImage).mockReturnValueOnce(write.promise);
    const next = await startUpload(); await act(async () => { next.succeed(); });
    view.rerender(<LabelImageModal {...p} isOpen={false} />);
    await act(async () => { write.resolve(created); }); expect(toast.success).not.toHaveBeenCalled();
  });

  it('preserva a lista em rejeição conhecida, com erro visível e nova tentativa liberada', async () => {
    vi.mocked(deleteLabelImage).mockRejectedValueOnce(new Error('A imagem não está mais disponível. Recarregue a biblioteca.'));
    await open(); fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Recarregue'));
    expect(select()).toBeTruthy(); expect(upload().disabled).toBe(false); expect(toast.success).not.toHaveBeenCalled();
  });

  it('exclui só depois da confirmação e mantém seleção/fechamento travados até o retorno', async () => {
    const deletion = deferred<void>(); vi.mocked(deleteLabelImage).mockReturnValueOnce(deletion.promise);
    const p = await open(); fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    await waitFor(() => expect(deleteLabelImage).toHaveBeenCalledWith(1));
    expect(select()).toBeTruthy(); expect(upload().disabled).toBe(true);
    fireEvent.click(select()); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(p.onSelect).not.toHaveBeenCalled(); expect(p.onClose).not.toHaveBeenCalled();
    await act(async () => { deletion.resolve(); }); expect(screen.queryByAltText('ANTIGA')).toBeNull(); expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('valida o ID antes da confirmação/exclusão e respeita desistência do operador', async () => {
    vi.mocked(fetchLabelImages).mockResolvedValueOnce([{ ...existing, id: 0 }]); const view = await open();
    fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('identificada'));
    expect(window.confirm).not.toHaveBeenCalled(); expect(deleteLabelImage).not.toHaveBeenCalled();
    view.unmount(); vi.mocked(window.confirm).mockReturnValueOnce(false); await open();
    fireEvent.click(screen.getByLabelText('Excluir ANTIGA')); await waitFor(() => expect(window.confirm).toHaveBeenCalledTimes(1));
    expect(deleteLabelImage).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });

  it.each(['upload', 'delete'])('bloqueia repetição de %s sem confirmação mesmo após consultar novamente', async (operation) => {
    await open();
    if (operation === 'upload') {
      vi.mocked(createLabelImage).mockRejectedValueOnce(new LabelImageUnconfirmedError());
      const reader = await startUpload(); await act(async () => { reader.succeed(); });
    } else {
      vi.mocked(deleteLabelImage).mockRejectedValueOnce(new LabelImageUnconfirmedError()); fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    }
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'));
    expect(upload().disabled).toBe(true); expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Recarregar biblioteca')); await waitFor(() => expect(fetchLabelImages).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(upload().disabled).toBe(true); fireEvent.click(screen.getByLabelText('Excluir ANTIGA'));
    expect(deleteLabelImage).toHaveBeenCalledTimes(operation === 'delete' ? 1 : 0);
  });

  it('expira gravação sem sucesso tardio e bloqueia novo envio', async () => {
    await open(); const write = deferred<typeof created>(); vi.mocked(createLabelImage).mockReturnValueOnce(write.promise);
    const reader = await startUpload(); vi.useFakeTimers(); await act(async () => { reader.succeed(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'); expect(upload().disabled).toBe(true);
    await act(async () => { write.resolve(created); }); expect(screen.queryByAltText('MDF')).toBeNull(); expect(toast.success).not.toHaveBeenCalled();
  });

  it('valida a seleção e aguarda o callback sem disparar seleção/exclusão duplicada', async () => {
    const selection = deferred<void>(), onSelect = vi.fn(() => selection.promise); await open({ onSelect });
    fireEvent.click(select()); await waitFor(() => expect(onSelect).toHaveBeenCalledWith(existing.image));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(upload().disabled).toBe(true); expect(screen.getByRole('status').textContent).toContain('Selecionando');
    fireEvent.click(screen.getByText('Selecionar')); fireEvent.click(screen.getByLabelText('Excluir ANTIGA')); expect(deleteLabelImage).not.toHaveBeenCalled();
    await act(async () => { selection.resolve(); }); expect(upload().disabled).toBe(false);
  });

  it('seleção inválida impede o callback e falha do callback fica visível', async () => {
    vi.mocked(fetchLabelImages).mockResolvedValueOnce([{ ...existing, image: '' }]); const view = await open();
    fireEvent.click(select()); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('indisponível')); expect(view.onSelect).not.toHaveBeenCalled();
    view.unmount(); const onSelect = vi.fn().mockRejectedValueOnce(new Error('Não foi possível adicionar à fila.')); await open({ onSelect });
    fireEvent.click(select()); await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('fila')); expect(upload().disabled).toBe(false);
  });
});
