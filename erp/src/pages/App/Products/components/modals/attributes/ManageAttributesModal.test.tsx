// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManageAttributesModal from './ManageAttributesModal';
import { saveCharacteristicOptions, saveVariation } from '../../../../../utils/variationService';
import { toast } from 'react-toastify';
import type VariationType from '@/pages/types/variation.type';
const fixtures = vi.hoisted(() => ({
  variations: [] as VariationType[],
  refresh: vi.fn(),
}));

vi.mock('../../../../Variations/useVariations', () => ({
  useVariations: () => ({
    variations: fixtures.variations,
    loading: false,
    handleDelete: vi.fn(),
    refresh: fixtures.refresh,
  }),
}));
vi.mock('../../../../../utils/variationService', () => ({
  saveVariation: vi.fn().mockResolvedValue('new'),
  saveCharacteristicOptions: vi.fn().mockResolvedValue([]),
  getVariationErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('ManageAttributesModal resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.refresh.mockResolvedValue(undefined);
    fixtures.variations = [{ id: 'cor', name: 'Cor', active: true, dataType: 'radio', options: [{ id: 'azul', value: 'Azul' }] }];
    vi.mocked(saveVariation).mockResolvedValue('new'); vi.mocked(saveCharacteristicOptions).mockResolvedValue([]);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('bloqueia escolha sem opções e salva o valor pendente pelo schema', async () => {
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome da Característica'), { target: { value: 'Acabamento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Característica' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(saveVariation).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Valores (Enter ou Vírgula)'), { target: { value: '  Fosco  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Característica' }));
    await waitFor(() => expect(saveVariation).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acabamento', options: [{ id: '', value: 'Fosco' }] })));
  });

  it('não persiste opção vazia nem remove a última opção de escolha', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Azul' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(saveCharacteristicOptions).not.toHaveBeenCalled();
  });

  it('protege criação concorrente e permite retomar após falha', async () => {
    let fail!: (error: Error) => void;
    vi.mocked(saveVariation).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
    const view = render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome da Característica'), { target: { value: 'Acabamento' } });
    fireEvent.change(screen.getByLabelText('Valores (Enter ou Vírgula)'), { target: { value: 'Fosco' } });
    const form = document.querySelector('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(saveVariation).toHaveBeenCalledTimes(1));
    await act(async () => { fail(new Error('Falha simulada')); }); await waitFor(() => expect(toast.error).toHaveBeenCalled());
    fireEvent.submit(form); await waitFor(() => expect(saveVariation).toHaveBeenCalledTimes(2));
    view.unmount();
  });

  it.each(['radio', 'multi_select'] as const)(
    'salva e confirma opções de característica %s pela mesma operação', async (dataType) => {
      fixtures.variations[0].dataType = dataType;
      render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
      fireEvent.change(screen.getByPlaceholderText('Novo valor...'), { target: { value: '  Verde  ' } });
      fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));
      await waitFor(() => expect(saveCharacteristicOptions).toHaveBeenCalledWith('cor', [
        { id: 'azul', value: 'Azul' },
        { id: '', value: 'Verde' },
      ]));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Valor adicionado com sucesso!'));
      expect(fixtures.refresh).toHaveBeenCalledOnce();
    }
  );

  it('espera a lista atualizar antes de confirmar que adicionou uma opção', async () => {
    let finishRefresh!: () => void;
    fixtures.refresh.mockImplementationOnce(() => new Promise((resolve) => { finishRefresh = () => resolve(undefined); }));
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Novo valor...'), { target: { value: 'Verde' } });
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));

    await waitFor(() => expect(fixtures.refresh).toHaveBeenCalledOnce());
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => { finishRefresh(); });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Valor adicionado com sucesso!'));
  });

  it('protege clique/Enter de adicionar durante uma atualização pendente', async () => {
    let finish!: () => void;
    vi.mocked(saveCharacteristicOptions).mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve([]); }));
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Novo valor...');
    fireEvent.change(input, { target: { value: 'Verde' } });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ })); fireEvent.keyDown(input, { key: 'Enter' }); });
    await waitFor(() => expect(saveCharacteristicOptions).toHaveBeenCalledTimes(1));
    await act(async () => { finish(); }); await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('valida a coleção restante antes de remover uma opção', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    fixtures.variations[0].options.push({ id: 'verde', value: 'Verde' });
    render(<ManageAttributesModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Verde' }));
    await waitFor(() => expect(saveCharacteristicOptions).toHaveBeenCalledWith('cor', [{ id: 'azul', value: 'Azul' }]));
  });
});
