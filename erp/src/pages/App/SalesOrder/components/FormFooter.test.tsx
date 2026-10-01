// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormFooter from './FormFooter';

const props = {
  currentOrder: { orderType: 'sale' } as any,
  totalOrderValue: 250,
  isSaving: false,
  draftAutoSaveStatus: 'saving' as const,
  showDraftAutoSave: true,
  onCompleteOrder: vi.fn(),
  currentStep: 1,
};

describe('FormFooter', () => {
  afterEach(cleanup);

  it('exibe spinner durante a gravação e confirmação quando a alteração é salva', () => {
    const { container, rerender } = render(<FormFooter {...props} />);

    expect(screen.getByRole('status').textContent).toContain('Salvando alteração...');
    expect(container.querySelector('.bi-arrow-repeat.animate-spin')).not.toBeNull();

    rerender(<FormFooter {...props} draftAutoSaveStatus="saved" />);

    expect(screen.getByRole('status').textContent).toContain('Alteração processada e salva');
    expect(container.querySelector('.bi-check-circle-fill')).not.toBeNull();
  });

  it('oculta o autosave durante a edição de um pedido existente', () => {
    render(<FormFooter {...props} showDraftAutoSave={false} />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
