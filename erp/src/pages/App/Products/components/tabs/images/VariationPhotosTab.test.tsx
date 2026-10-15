// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VariationPhotosTab from './VariationPhotosTab';

describe('VariationPhotosTab buttons clickability and Drag and Drop', () => {
  afterEach(() => cleanup());

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

  it('permite reordenar fotos por drag and drop mesmo em variação única (isSingleVariation = true)', () => {
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

    const photoCards = screen.getAllByTitle('Clique para ver opções ou arraste para reordenar');
    expect(photoCards.length).toBe(3);

    // Verifica que draggable é true mesmo com isSingleVariation = true
    expect(photoCards[0].getAttribute('draggable')).toBe('true');
    expect(photoCards[1].getAttribute('draggable')).toBe('true');

    // Inicia arrasto da foto 0
    const dataTransfer = {
      setData: vi.fn(),
      effectAllowed: 'none',
      dropEffect: 'none',
    };
    fireEvent.dragStart(photoCards[0], { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');

    // Arrasta sobre a foto 2
    fireEvent.dragOver(photoCards[2], { dataTransfer });

    // Deve chamar onChangeImages com a nova ordem: [photo-2, photo-3, photo-1]
    expect(onChangeImages).toHaveBeenCalledWith([
      'https://r2.test.com/photo-2.jpg',
      'https://r2.test.com/photo-3.jpg',
      'https://r2.test.com/photo-1.jpg',
    ]);
  });

  it('exibe botão para Vincular Fotos e contador de no máximo 15 fotos', () => {
    render(
      <VariationPhotosTab
        images={['https://r2.test.com/photo-1.jpg']}
        parentImages={['https://r2.test.com/photo-1.jpg', 'https://r2.test.com/photo-2.jpg']}
        isSingleVariation={true}
        onChangeImages={vi.fn()}
      />
    );

    expect(screen.getByText('Vincular Fotos')).toBeDefined();
    expect(screen.getByText('1 de 15 foto(s) vinculada(s)')).toBeDefined();
  });
});
