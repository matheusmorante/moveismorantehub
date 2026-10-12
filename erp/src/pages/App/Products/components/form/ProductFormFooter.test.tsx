// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductFormFooter, type ProductFormFooterProps } from './ProductFormFooter';

const baseProps: ProductFormFooterProps = {
  isDraftProduct: true,
  autoSaveStatus: 'idle',
  loading: false,
  isAiProcessing: false,
  isLastStep: true,
  onClose: vi.fn(),
  onNextStep: vi.fn(),
  onSubmit: vi.fn(),
};

describe('ProductFormFooter artefato de teste', () => {
  afterEach(() => cleanup());

  it('exibe o controle apenas quando autorizado e encaminha a mudança', () => {
    const onTestArtifactChange = vi.fn();
    const { getByRole, rerender, queryByRole } = render(<ProductFormFooter {...baseProps} />);
    expect(queryByRole('switch', { name: 'Artefato de teste do produto' })).toBeNull();

    rerender(
      <ProductFormFooter
        {...baseProps}
        canMarkTestArtifact
        onTestArtifactChange={onTestArtifactChange}
      />
    );
    const toggle = getByRole('switch', { name: 'Artefato de teste do produto' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(onTestArtifactChange).toHaveBeenCalledWith(true);
  });
});
