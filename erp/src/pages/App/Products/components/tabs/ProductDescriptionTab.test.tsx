// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProductDescriptionTab from './ProductDescriptionTab';

describe('ProductDescriptionTab', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with full width container (w-full) without max-w restrictions', () => {
    const formData = { description: 'Descrição de teste' };
    const setFormData = vi.fn();

    const { container } = render(
      <ProductDescriptionTab formData={formData} setFormData={setFormData} />
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toContain('w-full');
    expect(rootDiv.className).not.toContain('max-w-4xl');

    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    expect(textarea).toBeTruthy();
    expect(textarea.className).toContain('w-full');
    expect((textarea as HTMLTextAreaElement).value).toBe('Descrição de teste');
  });

  it('calls setFormData when text is changed', () => {
    const formData = { description: '' };
    const setFormData = vi.fn();

    render(<ProductDescriptionTab formData={formData} setFormData={setFormData} />);

    const textarea = screen.getByRole('textbox', { name: /descrição detalhada do produto/i });
    fireEvent.change(textarea, { target: { value: 'Nova descrição completa' } });

    expect(setFormData).toHaveBeenCalled();
  });
});
