// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableCSSFileLoading":true,"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LabelGridModelModal from '../modals/LabelGridModelModal';
import { saveGridModelWithFallback } from '../services/labelGridModelPersistence';
import { insertRemoteLabelLayout } from '../services/labelLayoutService';
import { saveCustomLabelLayouts } from '../services/labelStorageService';
import type { GridModel } from '../types/LabelGridModelTypes';

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));
vi.mock('../services/labelLayoutService', () => ({ insertRemoteLabelLayout: vi.fn(), updateRemoteLabelLayout: vi.fn() }));
vi.mock('../services/labelStorageService', () => ({ saveCustomLabelLayouts: vi.fn() }));
vi.mock('../modals/label-grid-model-editor/LabelGridModelToolbar', () => ({ LabelGridModelToolbar: () => null }));
vi.mock('../modals/label-grid-model-editor/LabelGridModelSettingsPanel', () => ({ LabelGridModelSettingsPanel: () => null }));
vi.mock('../modals/label-grid-model-editor/LabelGridModelCanvasElement', () => ({ LabelGridModelCanvasElement: () => null }));
vi.mock('../modals/label-grid-model-editor/LabelGridModelElementSelector', () => ({ LabelGridModelElementSelector: () => null }));

beforeEach(() => { vi.clearAllMocks(); vi.mocked(saveCustomLabelLayouts).mockReturnValue(true); });
afterEach(cleanup);
function open() {
  const onClose = vi.fn(), onSave = vi.fn(async (model: GridModel) => {
    await saveGridModelWithFallback({ newModel: model, editingGridModel: null, customLayouts: [], selectedCategory: 'identificacao' });
    return true;
  });
  render(<LabelGridModelModal isOpen onClose={onClose} onSave={onSave} currentCategory="identificacao" />);
  return { onClose, onSave };
}
describe('fronteira de gravação pelo editor real', () => {
  it('não fecha sem confirmação booleana e descarta validação de uma abertura desmontada', async () => {
    const onSave = vi.fn().mockResolvedValue(false), onClose = vi.fn();
    const p = render(<LabelGridModelModal isOpen onClose={onClose} onSave={onSave} currentCategory="identificacao" />);
    fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'));
    expect(onClose).not.toHaveBeenCalled(); expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Salvar Modelo'));
    p.unmount();
    await act(async () => { await Promise.resolve(); });
    expect(onSave).toHaveBeenCalledTimes(1); expect(onClose).not.toHaveBeenCalled();
  });
  it('mantém o editor aberto e mostra erro quando fallback local não confirma gravação', async () => {
    vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    vi.mocked(saveCustomLabelLayouts).mockReturnValueOnce(false);
    const p = open(); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('neste computador'));
    expect(p.onClose).not.toHaveBeenCalled(); expect(screen.getByRole('dialog')).toBeTruthy();
    expect((screen.getByText('Salvar Modelo') as HTMLButtonElement).disabled).toBe(false);
  });

  it('bloqueia repetição na mesma abertura após resultado incerto sem fallback', async () => {
    vi.mocked(insertRemoteLabelLayout).mockResolvedValueOnce({ data: null, error: { uncertain: true } });
    const p = open(); fireEvent.click(screen.getByText('Salvar Modelo'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não foi confirmada'));
    const button = screen.getByText('Salvar Modelo') as HTMLButtonElement;
    expect(button.disabled).toBe(true); fireEvent.click(button);
    expect(p.onSave).toHaveBeenCalledTimes(1); expect(p.onClose).not.toHaveBeenCalled(); expect(saveCustomLabelLayouts).not.toHaveBeenCalled();
  });

  it('mantém trava síncrona e proteção de fechamento até confirmar persistência', async () => {
    let finish!: (value: Awaited<ReturnType<typeof insertRemoteLabelLayout>>) => void;
    vi.mocked(insertRemoteLabelLayout).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const p = open(); const button = screen.getByText('Salvar Modelo');
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(insertRemoteLabelLayout).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toContain('Salvando');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Fechar editor de grade de etiqueta')); expect(p.onClose).not.toHaveBeenCalled();
    const model = p.onSave.mock.calls[0][0];
    await act(async () => { finish({ data: { ...model, id: 'confirmed' }, error: null }); });
    expect(p.onSave).toHaveBeenCalledTimes(1); expect(p.onClose).toHaveBeenCalledTimes(1);
  });
});
