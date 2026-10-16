// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SmartAIFillModal from './SmartAIFillModal';

const mocks = vi.hoisted(() => ({ parse: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { parseOrderFreeText: mocks.parse } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warn: mocks.error, info: vi.fn(), success: mocks.success } }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetAllMocks(); });
const draft = { order: { seller: 'Operador', items: [{ quantity: 1, unitPrice: 0 }] } };
const result = (rawJSON: unknown = draft) => ({ rawJSON, summary: 'Pedido parcial', identifiedFields: {}, warnings: [], missingRequiredFields: [] });
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };
const enterJSON = (value: unknown = draft) => {
  fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
  fireEvent.change(screen.getByPlaceholderText('Cole aqui o JSON estruturado...'), { target: { value: typeof value === 'string' ? value : JSON.stringify(value) } });
};
const generate = (text = '  Um sofá para Cliente  ') => {
  fireEvent.change(screen.getByPlaceholderText(/Exemplo: O cliente/), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar Pedido com IA' }));
};

describe('SmartAIFillModal submission owner', () => {
  it('validates the actual AI request before the service and keeps parsed partial drafts', async () => {
    const apply = vi.fn();
    mocks.parse.mockResolvedValue(result());
    render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={apply} sellerList={['Operador']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Pedido com IA' }));
    await screen.findByRole('alert');
    expect(mocks.parse).not.toHaveBeenCalled();
    generate();
    await screen.findByRole('button', { name: 'Injetar e Preencher no Pedido' });
    expect(mocks.parse).toHaveBeenCalledWith('Um sofá para Cliente', ['Operador']);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Injetar e Preencher no Pedido' }));
    await waitFor(() => expect(apply).toHaveBeenCalledWith(draft));
  });

  it('rejects invalid AI output before offering application and allows another analysis', async () => {
    mocks.parse.mockResolvedValueOnce(result({ order: { items: [{ quantity: -1 }] } })).mockResolvedValueOnce(result());
    render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={vi.fn()} />);
    generate();
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Injetar e Preencher no Pedido' })).toBeNull();
    generate('Um sofá');
    await screen.findByRole('button', { name: 'Injetar e Preencher no Pedido' });
    fireEvent.change(screen.getByPlaceholderText(/Exemplo: O cliente/), { target: { value: 'Outro pedido' } });
    expect(screen.queryByRole('button', { name: 'Injetar e Preencher no Pedido' })).toBeNull();
  });

  it.each(['   ', '{broken', JSON.stringify({ order: { items: [{ quantity: 0 }] } })])('rejects invalid manual JSON: %s', async (json) => {
    const apply = vi.fn();
    render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={apply} />);
    enterJSON(json);
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    await screen.findByRole('alert');
    expect(apply).not.toHaveBeenCalled();
  });

  it('awaits parent confirmation, blocks all duplicate effects, then closes', async () => {
    const pending = deferred<void>();
    const apply = vi.fn(() => pending.promise);
    const close = vi.fn();
    render(<SmartAIFillModal isOpen onClose={close} onApplyData={apply} />);
    enterJSON();
    const submit = screen.getByRole('button', { name: 'Processar e Preencher' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Fechar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('aplicando');
    await act(async () => pending.resolve());
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it.each([false, new Error('Falha no formulário proprietário')])('keeps the modal open when parent fails: %s', async (receipt) => {
    const close = vi.fn();
    const apply = vi.fn(() => receipt instanceof Error ? Promise.reject(receipt) : Promise.resolve(receipt));
    render(<SmartAIFillModal isOpen onClose={close} onApplyData={apply} />);
    enterJSON();
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    await screen.findByRole('alert');
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Processar e Preencher' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores delayed AI results after switching the order context', async () => {
    const pending = deferred<ReturnType<typeof result>>();
    mocks.parse.mockReturnValue(pending.promise);
    const props = { isOpen: true, onClose: vi.fn(), onApplyData: vi.fn() };
    const view = render(<SmartAIFillModal {...props} contextKey="order-a" />);
    generate();
    await waitFor(() => expect(mocks.parse).toHaveBeenCalledTimes(1));
    view.rerender(<SmartAIFillModal {...props} contextKey="order-b" />);
    await act(async () => pending.resolve(result()));
    expect(screen.queryByRole('button', { name: 'Injetar e Preencher no Pedido' })).toBeNull();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('never closes a new context when an old parent application finishes', async () => {
    const pending = deferred<void>();
    const props = { isOpen: true, onClose: vi.fn(), onApplyData: vi.fn(() => pending.promise) };
    const view = render(<SmartAIFillModal {...props} contextKey="order-a" />);
    enterJSON();
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    await waitFor(() => expect(props.onApplyData).toHaveBeenCalled());
    view.rerender(<SmartAIFillModal {...props} contextKey="order-b" />);
    await act(async () => pending.resolve());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('bounds analysis and allows a later retry without accepting a late result', async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof result>>();
    mocks.parse.mockReturnValue(pending.promise);
    render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={vi.fn()} />);
    await act(async () => generate());
    await act(async () => vi.advanceTimersByTimeAsync(45_000));
    expect(screen.getByRole('alert').textContent).toContain('análise demorou');
    expect((screen.getByRole('button', { name: 'Gerar Pedido com IA' }) as HTMLButtonElement).disabled).toBe(false);
    await act(async () => pending.resolve(result()));
    expect(screen.queryByRole('button', { name: 'Injetar e Preencher no Pedido' })).toBeNull();
  });

  it('bounds uncertain parent application and keeps repeat application blocked after reopen', async () => {
    vi.useFakeTimers();
    const props = { onClose: vi.fn(), onApplyData: vi.fn(() => new Promise<void>(() => {})), contextKey: 'order-a' };
    const view = render(<SmartAIFillModal isOpen {...props} />);
    enterJSON();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' })));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(screen.getByRole('alert').textContent).toContain('Confira o pedido');
    expect(props.onClose).not.toHaveBeenCalled();
    view.rerender(<SmartAIFillModal isOpen={false} {...props} />);
    view.rerender(<SmartAIFillModal isOpen {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    expect(props.onApplyData).toHaveBeenCalledTimes(1);
  });

  it('reads uploaded JSON through the same validated and awaited parent boundary', async () => {
    const pending = deferred<void>();
    const close = vi.fn();
    const apply = vi.fn(() => pending.promise);
    const view = render(<SmartAIFillModal isOpen onClose={close} onApplyData={apply} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File([JSON.stringify(draft)], 'pedido.json')] } });
    await waitFor(() => expect(apply).toHaveBeenCalledWith(draft));
    expect(close).not.toHaveBeenCalled();
    await act(async () => pending.resolve());
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it.each(['invalid', 'error', 'timeout'])('reports uploaded JSON %s without calling the parent', async (mode) => {
    vi.useFakeTimers();
    const abort = vi.fn();
    class Reader {
      static LOADING = 1;
      readyState = 1;
      result = '{invalid';
      onload?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      abort() { this.readyState = 2; abort(); this.onabort?.(); }
      readAsText() {
        if (mode === 'invalid') { this.readyState = 2; this.onload?.(); }
        if (mode === 'error') { this.readyState = 2; this.onerror?.(); }
      }
    }
    vi.stubGlobal('FileReader', Reader);
    const apply = vi.fn();
    const view = render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={apply} />);
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    await act(async () => fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['{}'], 'pedido.json')] } }));
    if (mode === 'timeout') await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Processar e Preencher' }) as HTMLButtonElement).disabled).toBe(false);
    if (mode === 'timeout') expect(abort).toHaveBeenCalledTimes(1);
  });

  it('bounds closing after a confirmed application without repeating the parent effect', async () => {
    vi.useFakeTimers();
    const apply = vi.fn();
    const close = vi.fn(() => new Promise<void>(() => {}));
    render(<SmartAIFillModal isOpen onClose={close} onApplyData={apply} />);
    enterJSON();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' })));
    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(screen.getByRole('alert').textContent).toContain('Dados aplicados');
    fireEvent.click(screen.getByRole('button', { name: 'Processar e Preencher' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Fechar' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores speech from the previous order while accepting the current transcription', async () => {
    const recognitions: { onresult?: (event: unknown) => void }[] = [];
    class Recognition {
      onresult?: (event: unknown) => void;
      start = vi.fn();
      stop = vi.fn();
      constructor() { recognitions.push(this); }
    }
    vi.stubGlobal('SpeechRecognition', Recognition);
    const props = { isOpen: true, onClose: vi.fn(), onApplyData: vi.fn() };
    const view = render(<SmartAIFillModal {...props} contextKey="a" />);
    view.rerender(<SmartAIFillModal {...props} contextKey="b" />);
    const event = { resultIndex: 0, results: [Object.assign([{ transcript: 'Cliente novo' }], { isFinal: true })] };
    await act(async () => recognitions[0].onresult?.(event));
    expect((screen.getByPlaceholderText(/Exemplo: O cliente/) as HTMLTextAreaElement).value).toBe('');
    await act(async () => recognitions[1].onresult?.(event));
    expect((screen.getByPlaceholderText(/Exemplo: O cliente/) as HTMLTextAreaElement).value).toBe('Cliente novo ');
    expect(mocks.parse).not.toHaveBeenCalled();
  });
});
