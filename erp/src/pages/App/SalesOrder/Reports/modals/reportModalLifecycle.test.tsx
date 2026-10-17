// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReportConfigModal from './ReportConfigModal';
import ItemExclusionModal from './ItemExclusionModal';
import { mappedCsvItems } from '../utils/reportCsvInput';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const deferred = () => { let resolve!: (value: any) => void; const promise = new Promise<any>(yes => { resolve = yes; }); return { promise, resolve }; };
describe('report modal lifetime', () => {
  it('awaits the exclusions callback without closing and preserves its selection after refusal', async () => {
    const pending = deferred(); const onConfirm = vi.fn(() => pending.promise); const onClose = vi.fn();
    render(<ItemExclusionModal isOpen items={[]} initialExcludedItems={['Mesa']} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Concluído/ })); await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce()); expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Concluído/ })).toHaveProperty('disabled', true);
    await act(async () => { pending.resolve(false); }); await screen.findByRole('alert'); expect(onClose).not.toHaveBeenCalled();
  });
  it('catches a rejected parent callback without losing the configuration', async () => {
    render(<ReportConfigModal isOpen initialName="Análise" onClose={vi.fn()} onSave={async () => { throw new Error('Falha de confirmação'); }} />);
    fireEvent.click(screen.getByRole('button', { name: /Salvar e Atualizar/ })); expect((await screen.findByRole('alert')).textContent).toBe('Falha de confirmação'); expect(screen.getByPlaceholderText('Ex: Análise de Inverno 2024')).toHaveProperty('value', 'Análise');
  });
  it('runs the file resolver before reading a non-CSV file', async () => {
    const read = vi.fn(); vi.stubGlobal('FileReader', class { readAsText = read; }); const view = render(<ReportConfigModal isOpen initialSource="csv" onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['bad'], 'bad.pdf')] } });
    await screen.findByRole('alert'); expect(read).not.toHaveBeenCalled();
  });
  it('bounds a stalled file read and releases controls', async () => {
    vi.useFakeTimers(); const abort = vi.fn(); vi.stubGlobal('FileReader', class { readAsText = vi.fn(); abort = abort; });
    const view = render(<ReportConfigModal isOpen initialSource="csv" onClose={vi.fn()} onSave={vi.fn()} />);
    await act(async () => { fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['text'], 'report.csv')] } }); });
    expect(screen.getByRole('status').textContent).toMatch(/CSV/); await act(async () => { await vi.advanceTimersByTimeAsync(10_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/prazo/); expect(abort).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Salvar e Atualizar' })).toHaveProperty('disabled', false);
  });
  it('aborts the pending reader and prevents publication after closing', async () => {
    const reader = { current: null as any }; vi.stubGlobal('FileReader', class { onload: any; onerror: any; onabort: any; readAsText = vi.fn(); abort = vi.fn(); constructor() { reader.current = this; } });
    const view = render(<ReportConfigModal isOpen initialSource="csv" onClose={vi.fn()} onSave={vi.fn()} />);
    await act(async () => { fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['text'], 'report.csv')] } }); });
    view.rerender(<ReportConfigModal isOpen={false} initialSource="csv" onClose={vi.fn()} onSave={vi.fn()} />); expect(reader.current.abort).toHaveBeenCalled(); expect(reader.current.onload).toBeNull();
  });
});
describe('mapped report CSV', () => {
  const mapping = { date: 'Data', product: 'Produto', supplier: 'Fornecedor', quantity: 'Qtd', cost: 'Custo', salesValue: 'Venda', profit: 'Lucro' };
  const row = { Data: '16/10/2026', Produto: 'Mesa', Fornecedor: 'Fornecedor', Qtd: '2', Custo: 'R$ 1.234,56', Venda: '3.000,00', Lucro: '' };
  it('preserves localized amounts, explicit losses and the missing-profit calculation', () => {
    expect(mappedCsvItems([row], mapping)[0]).toMatchObject({ quantity: 2, cost: 1234.56, salesValue: 3000 });
    expect(mappedCsvItems([row], mapping)[0].profit).toBeCloseTo(530.88);
    expect(mappedCsvItems([{ ...row, Lucro: '-20,50' }], mapping)[0].profit).toBe(-20.5);
  });
  it('rejects malformed amounts and dates instead of silently converting them into zero', () => {
    expect(() => mappedCsvItems([{ ...row, Venda: 'texto' }], mapping)).toThrow(/numérico/);
    expect(() => mappedCsvItems([{ ...row, Data: 'invalid' }], mapping)).toThrow(/data/);
  });
});
