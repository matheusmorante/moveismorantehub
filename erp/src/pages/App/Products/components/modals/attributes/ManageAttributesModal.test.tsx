// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManageAttributesModal from './ManageAttributesModal';
import { saveVariation, updateVariation } from '../../../../../utils/variationService';
import { toast } from 'react-toastify';
import type VariationType from '@/pages/types/variation.type';
const fixtures = vi.hoisted(() => ({ variations: [] as VariationType[] }));

vi.mock('../../../../Variations/useVariations', () => ({
  useVariations: () => ({
    variations: fixtures.variations,
    loading: false,
    handleDelete: vi.fn(),
    refresh: vi.fn(),
  }),
}));
vi.mock('../../../../../utils/variationService', () => ({
  saveVariation: vi.fn().mockResolvedValue('new'),
  updateVariation: vi.fn().mockResolvedValue(undefined),
  getVariationErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ManageAttributesModal resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.variations = [{ id: 'cor', name: 'Cor', active: true, dataType: 'radio', options: [{ id: 'azul', value: 'Azul' }] }];
    vi.mocked(saveVariation).mockResolvedValue('new'); vi.mocked(updateVariation).mockResolvedValue(undefined);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('bloqueia escolha sem opções e salva o valor pendente pelo schema', async () => {
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome do Atributo'), { target: { value: 'Acabamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Atributo' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(saveVariation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Valores (Enter ou Vírgula)'), { target: { value: '  Fosco  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Atributo' }));
    await waitFor(() => expect(saveVariation).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acabamento', options: [{ id: '', value: 'Fosco' }] })));
  });

  it('não persiste opção vazia nem remove a última opção de escolha', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Azul' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(updateVariation).not.toHaveBeenCalled();
  });

  it('protege criação concorrente e permite retomar após falha', async () => {
    let fail!: (error: Error) => void;
    vi.mocked(saveVariation).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const view = render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome do Atributo'), { target: { value: 'Acabamento' } });
    fireEvent.change(screen.getByLabelText('Valores (Enter ou Vírgula)'), { target: { value: 'Fosco' } });
    const form = document.querySelector('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(saveVariation).toHaveBeenCalledTimes(1));
    await act(async () => { fail(new Error('Falha simulada')); }); await waitFor(() => expect(toast.error).toHaveBeenCalled());
    fireEvent.submit(form); await waitFor(() => expect(saveVariation).toHaveBeenCalledTimes(2));
    view.unmount();
  });

  it('valida e normaliza a opção adicionada antes de atualizar', async () => {
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Novo valor...'), { target: { value: '  Verde  ' } });
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));
    await waitFor(() => expect(updateVariation).toHaveBeenCalledWith('cor', { options: [{ id: 'azul', value: 'Azul' }, { id: '', value: 'Verde' }] }));
  });

  it('protege clique/Enter de adicionar durante uma atualização pendente', async () => {
    let finish!: () => void;
    vi.mocked(updateVariation).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Novo valor...');
    fireEvent.change(input, { target: { value: 'Verde' } });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ })); fireEvent.keyDown(input, { key: 'Enter' }); });
    await waitFor(() => expect(updateVariation).toHaveBeenCalledTimes(1));
    await act(async () => { finish(); }); await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('valida a coleção restante antes de remover uma opção', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    fixtures.variations[0].options.push({ id: 'verde', value: 'Verde' });
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Verde' }));
    await waitFor(() => expect(updateVariation).toHaveBeenCalledWith('cor', { options: [{ id: 'azul', value: 'Azul' }] }));
  });
});
