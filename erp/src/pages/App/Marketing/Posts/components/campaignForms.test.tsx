// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignManagerModal } from './CampaignManagerModal';
import { GeneralCampaignRules } from './GeneralCampaignRules';

const mocks = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const advanceAutosave = () => act(async () => { await vi.advanceTimersByTimeAsync(700); });

describe('campaign form resolvers', () => {
  it('preserves saved campaigns during invalid autosave and reports manual submit errors', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const onSavingChange = vi.fn();
    const view = render(<CampaignManagerModal campaigns={[{
      id: 'campaign-1', name: 'Previous campaign', description: 'Description', active: true,
      createdAt: 'created', updatedAt: 'updated',
    }]} onSave={save} onClose={vi.fn()} onRemove={vi.fn()} onSavingChange={onSavingChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    await advanceAutosave();
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  ' } });
    await advanceAutosave();
    expect(save).not.toHaveBeenCalled();
    expect(onSavingChange).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
    await act(async () => { fireEvent.submit(view.container.querySelector('form')!); });
    expect(mocks.error).toHaveBeenCalledWith('Informe o nome da campanha.');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Updated campaign ' } });
    await advanceAutosave();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'campaign-1', name: 'Updated campaign', description: 'Description', createdAt: 'created' }));
  });

  it('skips initial rules load and permits clearing through validated autosave and submit', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn().mockResolvedValue('Previous rules');
    let view: ReturnType<typeof render>;
    await act(async () => { view = render(<GeneralCampaignRules load={load} save={save} onSavingChange={vi.fn()} />); });
    await advanceAutosave();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Regras gerais para campanhas/ }));
    fireEvent.change(screen.getByPlaceholderText('Descreva as regras globais de posicionamento...'), { target: { value: '' } });
    await advanceAutosave();
    expect(save).toHaveBeenCalledWith('');
    save.mockClear();
    await act(async () => { fireEvent.submit(view!.container.querySelector('form')!); });
    expect(save).toHaveBeenCalledWith('');
  });
});
