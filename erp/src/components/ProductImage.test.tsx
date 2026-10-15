// @vitest-environment happy-dom

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ProductImage from './ProductImage';

afterEach(() => {
  cleanup();
});

describe('ProductImage', () => {
  const originalUrl = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/products/guarda-roupa-sidney-branco-000212-04-main.jpg';

  it('renders thumbnail URL initially when size="thumbnail"', () => {
    render(<ProductImage src={originalUrl} size="thumbnail" alt="Guarda-Roupa Sydney" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe(
      'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/products/guarda-roupa-sidney-branco-000212-04-main_thumb.webp'
    );
  });

  it('cascades from thumbnail -> medium -> original when derived images 404/error', () => {
    const parentOnError = vi.fn();
    render(
      <ProductImage
        src={originalUrl}
        size="thumbnail"
        alt="Guarda-Roupa Sydney"
        onError={parentOnError}
      />
    );

    const img = screen.getByRole('img');

    // 1st error: thumb fails -> switches to medium
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(
      'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/products/guarda-roupa-sidney-branco-000212-04-main_medium.webp'
    );
    // parentOnError must NOT be called on intermediary fallback
    expect(parentOnError).not.toHaveBeenCalled();

    // 2nd error: medium fails -> switches to original
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe(originalUrl);
    expect(parentOnError).not.toHaveBeenCalled();

    // Original loads successfully
    fireEvent.load(img);
    expect(img.getAttribute('src')).toBe(originalUrl);
    expect(parentOnError).not.toHaveBeenCalled();
  });

  it('calls parent onError only when original image also fails', () => {
    const parentOnError = vi.fn();
    render(
      <ProductImage
        src={originalUrl}
        size="thumbnail"
        alt="Guarda-Roupa Sydney"
        onError={parentOnError}
      />
    );

    const img = screen.getByRole('img');

    // 1: thumb fails
    fireEvent.error(img);
    // 2: medium fails
    fireEvent.error(img);
    // 3: original fails
    fireEvent.error(img);

    expect(parentOnError).toHaveBeenCalledTimes(1);
    // Falls back to empty src, rendering icon placeholder
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders placeholder icon when src is null or empty', () => {
    const { container } = render(<ProductImage src={null} alt="Produto sem foto" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('.bi-image')).toBeTruthy();
  });
});
