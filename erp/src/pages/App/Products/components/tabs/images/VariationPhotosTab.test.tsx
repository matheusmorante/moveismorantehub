// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VariationPhotosTab from './VariationPhotosTab';
import { uploadOptimizedProductImage } from './productImageUpload';

vi.mock('./SquareImageCropper', () => ({
  SquareImageCropper: ({ imageUrl, onCancel, onConfirm }: any) => (
    <div role="dialog" data-testid="mock-cropper">
      <span>Cropping: {imageUrl}</span>
      <button onClick={onCancel}>Cancelar</button>
      <button
        onClick={() =>
          onConfirm(new File(['dummy'], 'cropped.webp', { type: 'image/webp' }))
        }
      >
        Concluir e Salvar
      </button>
    </div>
  ),
}));

vi.mock('./productImageUpload', () => ({
  uploadOptimizedProductImage: vi.fn(),
}));

describe('VariationPhotosTab buttons clickability and Drag and Drop', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.mocked(uploadOptimizedProductImage).mockResolvedValue(
      'https://r2.test.com/photo-1-cropped.webp'
    );
  });

  it('hides unlink button with pointer-events-none by default and makes it clickable on click', () => {
    const onChangeImages = vi.fn();
    render(
      <VariationPhotosTab
        images={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        parentImages={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        isSingleVariation={false}
        onChangeImages={onChangeImages}
      />
    );

    const unlinkBtn = screen.getByLabelText('Desvincular foto 1');
    expect(unlinkBtn.className).toContain('pointer-events-none');
    expect(unlinkBtn.className).toContain('opacity-0');

    // Ao clicar na foto, o botão se torna visível e clicável
    const photoImg = screen.getByAltText('Foto 1');
    const card = photoImg.closest('div.group');
    expect(card).toBeTruthy();
    card && fireEvent.click(card);

    expect(unlinkBtn.className).toContain('pointer-events-auto');
    expect(unlinkBtn.className).toContain('opacity-100');

    // Ao clicar no botão agora visível, ele deve desvincular a foto
    fireEvent.click(unlinkBtn);
    expect(onChangeImages).toHaveBeenCalledWith(['https://r2.test.com/photo-2.jpg']);
  });

  it('renders Capa badge on the 1st photo and Secundária badge on the 2nd photo', () => {
    render(
      <VariationPhotosTab
        images={[
          'https://r2.test.com/photo-1.jpg',
          'https://r2.test.com/photo-2.jpg',
          'https://r2.test.com/photo-3.jpg',
        ]}
        parentImages={[
          'https://r2.test.com/photo-1.jpg',
          'https://r2.test.com/photo-2.jpg',
          'https://r2.test.com/photo-3.jpg',
        ]}
        isSingleVariation={false}
        onChangeImages={vi.fn()}
      />
    );

    expect(screen.getByText('Capa')).toBeTruthy();
    expect(screen.getByText('Secundária')).toBeTruthy();
  });

  it('mostra a galeria herdada da variação única sem controles próprios de edição', () => {
    const onChangeImages = vi.fn();
    const images = [
      'https://r2.test.com/photo-1.jpg',
      'https://r2.test.com/photo-2.jpg',
      'https://r2.test.com/photo-3.jpg',
    ];

    render(
      <VariationPhotosTab
        images={images}
        parentImages={images}
        isSingleVariation={true}
        onChangeImages={onChangeImages}
      />
    );

    expect(screen.getByText('Esta variação única herda automaticamente todas as fotos da galeria do produto.')).toBeTruthy();
    expect(screen.getByText('3 foto(s) vinculada(s)')).toBeTruthy();
    expect(screen.getByText('Capa')).toBeTruthy();
    expect(screen.queryAllByRole('img').length).toBe(3);
    expect(screen.queryByTitle('Clique para ver opções ou arraste para reordenar')).toBeNull();
    expect(screen.queryByLabelText('Recortar foto 1')).toBeNull();
    expect(screen.queryByLabelText('Desvincular foto 1')).toBeNull();
    expect(screen.queryAllByRole('button').length).toBe(0);
    expect(onChangeImages).not.toHaveBeenCalled();
  });

  it('exibe botão de recorte 1:1 e executa fluxo de recorte global com onReplaceImageGlobal', async () => {
    const onReplaceImageGlobal = vi.fn();
    const onChangeImages = vi.fn();
    render(
      <VariationPhotosTab
        images={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        parentImages={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        isSingleVariation={false}
        onChangeImages={onChangeImages}
        onReplaceImageGlobal={onReplaceImageGlobal}
      />
    );

    const cropBtn = screen.getByLabelText('Recortar foto 1');
    expect(cropBtn).toBeDefined();
    expect(cropBtn.getAttribute('title')).toBe('Recortar foto em 1:1');
    expect(cropBtn.className).toContain('bg-purple-600');

    // Clica no botão de recorte
    fireEvent.click(cropBtn);

    // O cropper deve abrir para a foto 1
    const cropper = await screen.findByRole('dialog');
    expect(cropper).toBeDefined();
    expect(screen.getByText('Cropping: https://r2.test.com/photo-1.jpg')).toBeDefined();

    // Confirma o recorte
    const confirmBtn = screen.getByText('Concluir e Salvar');
    fireEvent.click(confirmBtn);

    // Deve chamar onReplaceImageGlobal com a URL antiga e a nova
    await vi.waitFor(() => {
      expect(onReplaceImageGlobal).toHaveBeenCalledWith(
        'https://r2.test.com/photo-1.jpg',
        'https://r2.test.com/photo-1-cropped.webp'
      );
    });

    // Modal deve ser fechado
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('faz fallback para onChangeImages se onReplaceImageGlobal não for fornecido', async () => {
    const onChangeImages = vi.fn();
    render(
      <VariationPhotosTab
        images={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        parentImages={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        isSingleVariation={false}
        onChangeImages={onChangeImages}
      />
    );

    const cropBtn = screen.getByLabelText('Recortar foto 2');
    fireEvent.click(cropBtn);

    const confirmBtn = await screen.findByText('Concluir e Salvar');
    fireEvent.click(confirmBtn);

    await vi.waitFor(() => {
      expect(onChangeImages).toHaveBeenCalledWith([
        'https://r2.test.com/photo-1.jpg',
        'https://r2.test.com/photo-1-cropped.webp',
      ]);
    });
  });
});

