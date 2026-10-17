// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { InventoryMoveEditModal } from '../InventoryMoveEditModal';
import type InventoryMove from '@/pages/types/inventoryMove.type';

const mocks = vi.hoisted(() => ({
  updateInventoryMove: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/pages/utils/inventoryService', () => ({
  updateInventoryMove: mocks.updateInventoryMove,
}));

vi.mock('react-toastify', () => ({
  toast: mocks.toast,
}));

describe('InventoryMoveEditModal', () => {
  const sampleMove: InventoryMove = {
    id: 'move-123',
    productId: 'prod-1',
    type: 'entry',
    quantity: 10,
    date: '2026-10-15T12:00:00Z',
    observation: 'Recebimento inicial',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('não renderiza quando isOpen é false', () => {
    render(
      <InventoryMoveEditModal
        move={sampleMove}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Editar Movimentação')).not.toBeInTheDocument();
  });

  it('renderiza os dados da movimentação quando aberto e permite fechar com Escape', () => {
    const onClose = vi.fn();
    render(
      <InventoryMoveEditModal
        move={sampleMove}
        isOpen={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Editar Movimentação')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Recebimento inicial')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('executa a validação RHF e atualiza movimentação no serviço ao salvar', async () => {
    mocks.updateInventoryMove.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <InventoryMoveEditModal
        move={sampleMove}
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.updateInventoryMove).toHaveBeenCalledTimes(1);
    });

    expect(mocks.updateInventoryMove).toHaveBeenCalledWith('move-123', expect.objectContaining({
      type: 'entry',
      quantity: 10,
      observation: 'Recebimento inicial',
    }));
    expect(mocks.toast.success).toHaveBeenCalledWith('Movimentação atualizada com sucesso!');
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('bloqueia submissão quando a observação for vazia', async () => {
    render(
      <InventoryMoveEditModal
        move={{ ...sampleMove, observation: '' }}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.toast.error).toHaveBeenCalledWith('Por favor, informe um motivo ou observação.');
    });
    expect(mocks.updateInventoryMove).not.toHaveBeenCalled();
  });
});
