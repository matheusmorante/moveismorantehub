// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '@/pages/types/product.type';
import { MoveProductToTrashModal } from './MoveProductToTrashModal';

afterEach(cleanup);

const mockProduct: Product = {
  id: 'prod-uuid-1',
  code: 'PRD-001',
  name: 'Sofá Retrátil Confort',
  unitPrice: 1200,
  unit: 'UN',
  categoryIds: ['cat-1'],
  description: 'Sofá 3 lugares',
  active: true,
  isDraft: false,
};

describe('MoveProductToTrashModal', () => {
  it('não renderiza nada quando isOpen é false', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const { container } = render(
      <MoveProductToTrashModal
        isOpen={false}
        product={mockProduct}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('não renderiza nada quando product é null', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const { container } = render(
      <MoveProductToTrashModal
        isOpen={true}
        product={null}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, texto de retenção de 30 dias e dados do produto', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <MoveProductToTrashModal
        isOpen={true}
        product={mockProduct}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Mover produto para lixeira?')).toBeDefined();
    expect(
      screen.getByText(
        'O produto e todas as suas variações serão movidos para a lixeira. Você poderá restaurá-los durante 30 dias.'
      )
    ).toBeDefined();
    expect(screen.getByText('PRD-001')).toBeDefined();
    expect(screen.getByText('Sofá Retrátil Confort')).toBeDefined();
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <MoveProductToTrashModal
        isOpen={true}
        product={mockProduct}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('chama onConfirm ao clicar em Mover para lixeira', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <MoveProductToTrashModal
        isOpen={true}
        product={mockProduct}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mover para lixeira' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('desabilita os botões durante o estado isLoading', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <MoveProductToTrashModal
        isOpen={true}
        product={mockProduct}
        isLoading={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement;
    const confirmBtn = screen.getByRole('button', {
      name: 'Mover para lixeira',
    }) as HTMLButtonElement;

    expect(cancelBtn.disabled).toBe(true);
    expect(confirmBtn.disabled).toBe(true);
  });

  it('fecha o modal ao pressionar a tecla Escape quando não estiver carregando', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <MoveProductToTrashModal
        isOpen={true}
        product={mockProduct}
        isLoading={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
