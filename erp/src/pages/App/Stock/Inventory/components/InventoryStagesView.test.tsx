// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InventoryStagesView } from './InventoryStagesView';

afterEach(cleanup);

describe('etapas do inventário', () => {
  it('delega o cancelamento ao fluxo da tela para preservar o rascunho ou confirmar o descarte', () => {
    const onCancel = vi.fn();
    render(<InventoryStagesView items={[]} onSelectStage={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
