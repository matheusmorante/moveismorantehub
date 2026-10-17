// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { ProductFormHeader } from './ProductFormHeader';

describe('ProductFormHeader', () => {
  afterEach(() => cleanup());

  const defaultProps = {
    formData: { name: 'Sofá Imperial' },
    ecomStatus: { isLegible: true, checks: {} },
    isService: false,
    navigateToRequirementField: vi.fn(),
    handleCloseWithAutoSave: vi.fn(),
    activeTab: 'geral' as const,
    setActiveTab: vi.fn(),
  };

  it('renderiza o botão global de preenchimento com IA no cabeçalho e dispara callback ao clicar', () => {
    const mockOpenAi = vi.fn();

    render(
      <ProductFormHeader
        {...defaultProps}
        onOpenAiFillModal={mockOpenAi}
      />
    );

    const aiButton = screen.getByRole('button', { name: /Preencher cadastro com IA/i });
    expect(aiButton).toBeDefined();
    expect(aiButton.textContent).toContain('Preencher com IA');
    expect(aiButton.querySelector('.bi-stars')).toBeDefined();

    fireEvent.click(aiButton);
    expect(mockOpenAi).toHaveBeenCalledWith('web_search');
  });

  it('não renderiza o botão de IA caso onOpenAiFillModal não seja fornecido', () => {
    render(<ProductFormHeader {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /Preencher cadastro com IA/i })).toBeNull();
  });

  it('chama handleCloseWithAutoSave ao clicar no botão de fechar', () => {
    render(<ProductFormHeader {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: /Fechar formulário/i });
    fireEvent.click(closeBtn);

    expect(defaultProps.handleCloseWithAutoSave).toHaveBeenCalled();
  });
});
