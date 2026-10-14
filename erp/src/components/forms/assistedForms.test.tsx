// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReceiptAIFillModal } from '@/pages/App/Stock/Receipts/modals/ReceiptAIFillModal';
import { SmartAIFillModal } from '@/pages/App/SalesOrder/components/SmartAIFillModal';
import { createPersonImportFormSchema } from '../../../../shared-utils/personDomainValidation';
import { useZodForm } from '@/hooks/useZodForm';

const mocks = vi.hoisted(() => ({ parse: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/receiptAiService', () => ({ parseReceiptWithAI: mocks.parse }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { parseOrderFromFreeText: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { warn: mocks.error, error: mocks.error, success: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('assisted form submissions', () => {
  it('blocks an empty request and invalid receipt items before applying data', async () => {
    const apply = vi.fn();
    render(<ReceiptAIFillModal isOpen onClose={vi.fn()} onApply={apply} />);
    fireEvent.click(screen.getByText('Interpretar e preencher'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.parse).not.toHaveBeenCalled();
    mocks.parse.mockResolvedValue({ items: [{ quantity: -1, baseCost: 10 }], warnings: [] });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Recebi uma cadeira  ' } });
    fireEvent.click(screen.getByText('Interpretar e preencher'));
    await waitFor(() => expect(mocks.parse).toHaveBeenCalledWith('Recebi uma cadeira'));
    await waitFor(() => expect(screen.getByText('Interpretar e preencher')).toBeTruthy());
    expect(apply).not.toHaveBeenCalled();
  });
  it('keeps incomplete assisted orders but rejects invalid quantities from manual JSON', async () => {
    const apply = vi.fn();
    render(<SmartAIFillModal isOpen onClose={vi.fn()} onApplyData={apply} />);
    fireEvent.click(screen.getByText('JSON'));
    const input = screen.getByPlaceholderText('Cole aqui o JSON estruturado...');
    fireEvent.change(input, { target: { value: JSON.stringify({ order: { items: [{ quantity: -1 }] } }) } });
    fireEvent.click(screen.getByText('Processar e Preencher'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(apply).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: JSON.stringify({ order: { seller: 'Operador' } }) } });
    fireEvent.click(screen.getByText('Processar e Preencher'));
    await waitFor(() => expect(apply).toHaveBeenCalledWith({ order: { seller: 'Operador' } }));
  });
  it('validates the full selected person import batch before the first write', async () => {
    const save = vi.fn();
    const schema = createPersonImportFormSchema('customers', {});
    const { result } = renderHook(() => useZodForm(schema, { rows: [] }));
    const valid = { fullName: 'Cliente', noAddress: true, noPhone: true, marketingOrigin: 'organic', metadata: { keep: true } };
    await act(async () => { await result.current.validateAndRun({ rows: [valid, { ...valid, fullName: '' }] }, save); });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { await result.current.validateAndRun({ rows: [valid] }, save); });
    expect(save).toHaveBeenCalledWith({ rows: [{ ...valid, personType: 'PF' }] });
  });
});
