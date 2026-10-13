// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VariationPhotosTab from './VariationPhotosTab';

describe('VariationPhotosTab buttons clickability', () => {
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
});
