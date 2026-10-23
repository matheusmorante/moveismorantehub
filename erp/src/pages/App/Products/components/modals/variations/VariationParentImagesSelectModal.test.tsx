// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VariationParentImagesSelectModal from './VariationParentImagesSelectModal';
import { createVariationImageSelectionFormSchema } from '../../../../../../../../shared-utils/productImageFormSchemas';
import { toggleAllParentProductImages } from '../../../../../../../../shared-utils/productImageSelection';
const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
const photos = ['https://example.test/1.jpg', 'https://example.test/2.jpg'];
afterEach(cleanup); beforeEach(() => vi.clearAllMocks());
const mount = (selectedImages: string[] = [], onConfirm = vi.fn()) => {
  const onClose = vi.fn();
  render(<VariationParentImagesSelectModal isOpen onClose={onClose} parentImages={photos} selectedImages={selectedImages} maxSelection={2} onConfirm={onConfirm} />);
  return { onClose, onConfirm };
};
const confirm = () => screen.getByRole('button', { name: /^Confirmar/ });

describe('seleção de fotos da variação', () => {
  it('bloqueia foto indisponível antes do callback e mantém o modal aberto', async () => {
    const { onConfirm, onClose } = mount(['https://example.test/removed.jpg']);
    fireEvent.click(confirm());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione apenas fotos disponíveis no produto pai.'));
    expect(onConfirm).not.toHaveBeenCalled(); expect(onClose).not.toHaveBeenCalled();
  });
  it('preserva a ordem selecionada ao confirmar', async () => {
    const { onConfirm, onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Foto 2 do produto pai/ }));
    fireEvent.click(screen.getByRole('button', { name: /Foto 1 do produto pai/ }));
    fireEvent.click(confirm()); await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith([photos[1], photos[0]]);
  });
  it('permite desvincular todas as fotos', async () => {
    const { onConfirm, onClose } = mount(photos);
    fireEvent.click(screen.getByRole('button', { name: 'Desmarcar Todas' })); fireEvent.click(confirm());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); expect(onConfirm).toHaveBeenCalledWith([]);
  });
  it('seleciona as fotos disponíveis até o limite antes de confirmar', async () => {
    const { onConfirm, onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar Todas' }));
    fireEvent.click(confirm());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith(photos);
  });
  it('compartilha a ordem da galeria e o limite de seleção entre as plataformas', () => {
    expect(toggleAllParentProductImages([], [...photos, 'https://example.test/3.jpg'], 2)).toEqual(photos);
  });
  it('mantém a trava até o callback concluir e permite retomar após falha', async () => {
    let fail!: (error: Error) => void;
    const operation = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined);
    const { onClose } = mount([photos[0]], operation); const submit = confirm();
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(operation).toHaveBeenCalledTimes(1)); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha simulada')); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    fireEvent.click(confirm()); await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); expect(operation).toHaveBeenCalledTimes(2);
  });
  it.each([
    [photos[0], photos[0]],
    [photos[0], photos[1], photos[0]],
    [''],
  ])('o contrato compartilhado recusa seleção inválida %j', (...images) => {
    expect(createVariationImageSelectionFormSchema(photos, 2).safeParse({ images }).success).toBe(false);
  });
});
