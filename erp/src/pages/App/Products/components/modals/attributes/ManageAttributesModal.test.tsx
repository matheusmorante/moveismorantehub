// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManageAttributesModal from './ManageAttributesModal';
import { saveVariation, updateVariation } from '../../../../../utils/variationService';
import { toast } from 'react-toastify';

vi.mock('../../../../Variations/useVariations', () => ({
  useVariations: () => ({
    variations: [{ id: 'cor', name: 'Cor', active: true, dataType: 'radio', options: [{ id: 'azul', value: 'Azul' }] }],
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
  beforeEach(() => vi.clearAllMocks());
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
});
