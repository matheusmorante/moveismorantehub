// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartesianVariationModal from './CartesianVariationModal';
import ProductConversionModal from '../product/ProductConversionModal';
import type Product from '@/pages/types/product.type';
const mocks = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn() }));
vi.mock('@/pages/utils/variationService', () => ({ subscribeToVariations: (callback: (values: unknown[]) => void) => { callback([{ id: 'cor', name: 'Cor', active: true, dataType: 'radio', options: [{ id: 'azul', value: 'Azul' }] }]); return () => {}; } }));
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: any) => children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, error: mocks.error } }));
afterEach(cleanup); beforeEach(() => vi.clearAllMocks());
const product: Partial<Product> = { id: 'draft', name: 'Armário', isDraft: true, status: 'draft', code: 'PR-1', stock: 2, unitPrice: 100, costPrice: 60, fiscal: { ncm: '94035000' } };
const mountConversion = (data = product, onConvert = vi.fn()) => {
  const onClose = vi.fn();
  render(<ProductConversionModal isOpen onClose={onClose} formData={data} onConvert={onConvert} />);
  return { onConvert, onClose };
};
const selectCartesian = () => {
  fireEvent.click(screen.getByRole('button', { name: /Adicionar Característica/ }));
  fireEvent.change(screen.getAllByLabelText('Característica')[0], { target: { value: 'Cor' } });
  fireEvent.click(screen.getByRole('button', { name: 'Azul' }));
};

describe('conversão de produto', () => {
  it.each([['stock', -1], ['stock', Number.NaN], ['unitPrice', -1], ['costPrice', Number.NaN]] as const)('bloqueia %s inválido herdado do produto antes da conversão', async (field, value) => {
    const { onConvert, onClose } = mountConversion({ ...product, [field]: value });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Conversão' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled()); expect(onConvert).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it.each([true, false])('transfere SKU/estoque e valores parseados; rascunho=%s', async (draft) => {
    const original = { ...product, isDraft: draft, status: draft ? 'draft' : 'hidden' } as Partial<Product>;
    const { onConvert, onClose } = mountConversion(original);
    fireEvent.change(screen.getByLabelText('Nome da Característica (Ex: Cor, Tamanho)'), { target: { value: '  Cor  ' } });
    fireEvent.change(screen.getByLabelText('Valor da Característica (Ex: Branco, G)'), { target: { value: '  Azul  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Conversão' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConvert).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft', code: '', stock: 0, fiscal: { ncm: '94035000' }, variations: [expect.objectContaining({ name: 'COR: AZUL', sku: 'PR-1', stock: 2, unitPrice: 100, costPrice: 60, active: !draft, attributes: [{ name: 'Cor', value: 'Azul' }] })] }));
    expect(original.stock).toBe(2); expect(original.code).toBe('PR-1');
  });
  it('mantém proteção até concluir o callback e permite retomar após falha', async () => {
    let fail!: (error: Error) => void;
    const operation = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined);
    const { onClose } = mountConversion(product, operation); const button = screen.getByRole('button', { name: 'Confirmar Conversão' });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1)); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha simulada')); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    fireEvent.click(button); await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('componente de seleção cartesiana', () => {
  it('não descarta uma linha incompleta antes do resolver', async () => {
    const generate = vi.fn(); render(<CartesianVariationModal isOpen onClose={vi.fn()} onGenerate={generate} isGenerating={false} />);
    selectCartesian(); fireEvent.click(screen.getByRole('button', { name: /Adicionar Característica/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar Combinações' }));
    await waitFor(() => expect(mocks.warning).toHaveBeenCalled()); expect(generate).not.toHaveBeenCalled();
  });
  it('entrega atributos e valores validados à geração', async () => {
    const generate = vi.fn(); render(<CartesianVariationModal isOpen onClose={vi.fn()} onGenerate={generate} isGenerating={false} />);
    selectCartesian(); fireEvent.click(screen.getByRole('button', { name: 'Gerar Combinações' }));
    await waitFor(() => expect(generate).toHaveBeenCalledWith([{ name: 'Cor', values: ['Azul'], showName: true }]));
  });
  it('aguarda geração, preserva seleção quando falha e permite retomar', async () => {
    let fail!: (error: Error) => void;
    const generate = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined);
    render(<CartesianVariationModal isOpen onClose={vi.fn()} onGenerate={generate} isGenerating={false} />);
    selectCartesian(); const submit = screen.getByRole('button', { name: 'Gerar Combinações' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    await act(async () => { fail(new Error('Falha simulada')); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    expect(screen.getByLabelText('Característica')).toHaveProperty('value', 'Cor');
    fireEvent.click(submit); await waitFor(() => expect(generate).toHaveBeenCalledTimes(2));
  });
});
