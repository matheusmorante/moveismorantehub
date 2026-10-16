// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReceiptAIFillModal } from './ReceiptAIFillModal';
const mocks = vi.hoisted(() => ({ parse: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/receiptAiService', () => ({ parseReceiptWithAI: mocks.parse }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, warn: mocks.error } }));
const receipt = { supplierName: 'Alfa', items: [{ productType: 'Mesa', quantity: 2, baseCost: 0 }], warnings: [] };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function submit() { fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Recebi duas mesas  ' } }); fireEvent.click(screen.getByText('Interpretar e preencher')); }
beforeEach(() => { vi.clearAllMocks(); mocks.parse.mockReset().mockResolvedValue(receipt); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('interpretação e aplicação permanecem nos resolvers até confirmação', async () => {
  const parse = deferred<typeof receipt>(), apply = deferred<void>(); mocks.parse.mockReturnValueOnce(parse.promise);
  const onApply = vi.fn(() => apply.promise), close = vi.fn(); render(<ReceiptAIFillModal isOpen onApply={onApply} onClose={close} />); submit();
  await waitFor(() => expect(mocks.parse).toHaveBeenCalledWith('Recebi duas mesas')); expect(screen.getByRole('status').textContent).toContain('Interpretando');
  fireEvent.keyDown(document, { key: 'Escape' }); fireEvent.click(screen.getByLabelText('Fechar janela')); expect(close).not.toHaveBeenCalled();
  await act(async () => { parse.resolve(receipt); }); await waitFor(() => expect(onApply).toHaveBeenCalledWith(receipt));
  expect(screen.getByRole('status').textContent).toContain('Aplicando'); expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Interpretando...')); expect(mocks.parse).toHaveBeenCalledOnce();
  await act(async () => { apply.resolve(); }); await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it.each(['empty', 'quantity', 'cost', 'items'] as const)('resolver bloqueia %s antes do efeito', async (kind) => {
  const apply = vi.fn(); render(<ReceiptAIFillModal isOpen onApply={apply} onClose={vi.fn()} />);
  if (kind !== 'empty') {
    mocks.parse.mockResolvedValueOnce({ ...receipt, items: kind === 'items' ? [] : [{ ...receipt.items[0], ...(kind === 'quantity' ? { quantity: 0 } : { baseCost: -1 }) }] }); submit();
  } else fireEvent.click(screen.getByText('Interpretar e preencher'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(apply).not.toHaveBeenCalled();
  if (kind === 'empty') expect(mocks.parse).not.toHaveBeenCalled();
});
it.each(['parse', 'apply'] as const)('falha de %s conserva texto e permite repetição explícita', async (stage) => {
  const apply = vi.fn().mockResolvedValue(undefined); const close = vi.fn();
  if (stage === 'parse') mocks.parse.mockRejectedValueOnce(new Error('Falha esperada')); else apply.mockRejectedValueOnce(new Error('Falha esperada'));
  render(<ReceiptAIFillModal isOpen onApply={apply} onClose={close} />); submit();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falha esperada')); expect(close).not.toHaveBeenCalled();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toContain('Recebi duas mesas');
  fireEvent.click(screen.getByText('Interpretar e preencher')); await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it('fechar e reabrir descarta interpretação da abertura anterior', async () => {
  const parse = deferred<typeof receipt>(); mocks.parse.mockReturnValueOnce(parse.promise); const apply = vi.fn(), close = vi.fn();
  const view = render(<ReceiptAIFillModal isOpen onApply={apply} onClose={close} />); submit(); await waitFor(() => expect(mocks.parse).toHaveBeenCalledOnce());
  view.rerender(<ReceiptAIFillModal isOpen={false} onApply={apply} onClose={close} />); view.rerender(<ReceiptAIFillModal isOpen onApply={apply} onClose={close} />);
  await act(async () => { parse.resolve(receipt); }); await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  expect(apply).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
it.each(['parse', 'apply'] as const)('prazo de %s libera UI sem executar continuação tardia', async (stage) => {
  vi.useFakeTimers(); const pending = deferred<any>(); const apply = vi.fn().mockResolvedValue(undefined), close = vi.fn();
  if (stage === 'parse') mocks.parse.mockReturnValueOnce(pending.promise); else apply.mockReturnValueOnce(pending.promise);
  const view = render(<ReceiptAIFillModal isOpen onApply={apply} onClose={close} />); submit();
  await act(async () => { await vi.advanceTimersByTimeAsync(30001); }); expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull(); expect(close).not.toHaveBeenCalled();
  await act(async () => { pending.resolve(stage === 'parse' ? receipt : undefined); }); expect(close).not.toHaveBeenCalled();
  if (stage === 'parse') expect(apply).not.toHaveBeenCalled();
  else {
    view.rerender(<ReceiptAIFillModal isOpen={false} onApply={apply} onClose={close} />); view.rerender(<ReceiptAIFillModal isOpen onApply={apply} onClose={close} />);
    expect((screen.getByText('Interpretar e preencher') as HTMLButtonElement).disabled).toBe(true);
  }
});
