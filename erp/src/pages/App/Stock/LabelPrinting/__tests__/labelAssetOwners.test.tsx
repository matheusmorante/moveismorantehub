// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLabelModalsAndAssets } from '../hooks/useLabelModalsAndAssets';
import LabelNewAssetModal from '../modals/LabelNewAssetModal';
import LabelCustomDesignModal from '../modals/LabelCustomDesignModal';
import { createInitialLabelConfig } from '../services/labelModelMapper';
import type { CategoryType } from '../hooks/useLabelCategory';
const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: mocks }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/stock/labels' }) }));
const image = '/logo.svg';
const field = { id: 'f', text: 'Campo', x: 0, y: 0, size: 0, color: '#000', bold: false, align: 'left', width: 0, height: 0, metadata: { retained: true } };
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); window.localStorage.clear(); vi.spyOn(window, 'confirm').mockReturnValue(true); vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const setup = (category: CategoryType | null = 'logos', config = createInitialLabelConfig()) => {
  const logo = vi.fn(), label = vi.fn();
  const view = renderHook((props) => useLabelModalsAndAssets({ selectedCategory: props.category, config: props.config, onAddLogoItem: logo, onAddLabelItem: label }), { initialProps: { category, config } });
  const openLogo = () => act(() => { view.result.current.setIsNewLogoModalOpen(true); view.result.current.setNewLogoName('  MARCA  '); view.result.current.setNewLogoImage(image); });
  const openLabel = () => act(() => { view.result.current.setIsLabelModalOpen(true); view.result.current.setLabelFormName('  rótulo  '); view.result.current.setLabelFormImage(image); });
  return { ...view, logo, label, openLogo, openLabel };
};
function Harness() {
  const s = useLabelModalsAndAssets({ selectedCategory: 'logos', config: createInitialLabelConfig(), onAddLogoItem: vi.fn(), onAddLabelItem: vi.fn() });
  return <>
    <button onClick={() => { s.setIsNewLogoModalOpen(true); s.setNewLogoName('LOGO'); s.setNewLogoImage(image); }}>Novo logo</button>
    <button onClick={() => { s.setIsLabelModalOpen(true); s.setLabelFormName('Rótulo'); s.setLabelFormImage(image); }}>Novo rótulo</button>
    <LabelNewAssetModal isOpen={s.isNewLogoModalOpen} onClose={() => s.setIsNewLogoModalOpen(false)} newLogoImage={s.newLogoImage} newLogoName={s.newLogoName} setNewLogoName={s.setNewLogoName} onConfirm={s.handleConfirmNewLogo} isSaving={s.assetsSaving} error={s.assetError} />
    <LabelCustomDesignModal isOpen={s.isLabelModalOpen} onClose={() => s.setIsLabelModalOpen(false)} editingLabel={s.editingLabel} labelFormName={s.labelFormName} setLabelFormName={s.setLabelFormName} labelFormImage={s.labelFormImage} setLabelFormImage={s.setLabelFormImage} availableLogos={s.availableLogos} handleSaveCustomLabel={s.handleSaveCustomLabel} isSaving={s.assetsSaving} error={s.assetError} />
  </>;
}
describe('label asset owner with real RHF, schemas, children and local storage', () => {
  it('blocks invalid fields before writing and preserves the open draft', async () => {
    const s = setup(); s.openLogo(); act(() => s.result.current.setNewLogoName(' '));
    await act(async () => { expect(await s.result.current.handleConfirmNewLogo()).toBe(false); });
    expect(window.localStorage.getItem('label_available_logos')).toBeNull();
    expect(s.result.current.isNewLogoModalOpen).toBe(true); expect(s.result.current.assetError).toContain('nome');
  });
  it('saves parsed values once and holds the common lock through resolver completion', async () => {
    const s = setup(); s.openLogo();
    let a!: Promise<boolean>, b!: Promise<boolean>;
    act(() => { a = s.result.current.handleConfirmNewLogo(); b = s.result.current.handleConfirmNewLogo(); });
    expect(s.result.current.assetsSaving).toBe(true);
    await act(async () => { expect(await Promise.all([a, b])).toEqual([true, false]); });
    const saved = JSON.parse(window.localStorage.getItem('label_available_logos')!);
    expect(saved).toHaveLength(3); expect(saved[2]).toMatchObject({ name: 'MARCA', image });
    expect(s.result.current.isNewLogoModalOpen).toBe(false); expect(mocks.success).toHaveBeenCalledOnce();
  });
  it('does not publish or clear fields when local storage fails', async () => {
    const s = setup(); s.openLogo();
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await act(async () => { expect(await s.result.current.handleConfirmNewLogo()).toBe(false); });
    expect(s.result.current.availableLogos).toHaveLength(2); expect(s.result.current.newLogoName).toBe('  MARCA  ');
    expect(s.result.current.isNewLogoModalOpen).toBe(true); expect(s.result.current.assetError).toContain('gravar');
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('preserves the edited label extra fields, including zero and metadata, without a config fallback', async () => {
    const existing = { id: 'old', name: 'Antigo', image, extraFields: [field] };
    window.localStorage.setItem('label_custom_labels', JSON.stringify([existing]));
    const s = setup(); s.openLabel(); act(() => s.result.current.setEditingLabel(existing));
    await act(async () => { expect(await s.result.current.handleSaveCustomLabel()).toBe(true); });
    const saved = JSON.parse(window.localStorage.getItem('label_custom_labels')!);
    expect(saved).toEqual([{ ...existing, name: 'RÓTULO' }]); expect(s.result.current.editingLabel).toBeNull();
  });
  it('validates extra fields and keeps a failed label draft before any local write', async () => {
    const s = setup('logos', { ...createInitialLabelConfig(), extraFields: [{ ...field, width: -1 }] }); s.openLabel();
    await act(async () => { expect(await s.result.current.handleSaveCustomLabel()).toBe(false); });
    expect(window.localStorage.getItem('label_custom_labels')).toBeNull(); expect(s.result.current.isLabelModalOpen).toBe(true);
    expect(s.result.current.assetError).toBeTruthy();
  });
  it('creates a label without optional extra fields and blocks editing a disappeared label', async () => {
    const s = setup(); s.openLabel();
    await act(async () => { expect(await s.result.current.handleSaveCustomLabel()).toBe(true); });
    expect(JSON.parse(window.localStorage.getItem('label_custom_labels')!)[0]).toMatchObject({ name: 'RÓTULO', extraFields: [] });
    s.openLabel(); act(() => s.result.current.setEditingLabel({ id: 'missing', name: 'missing', image }));
    await act(async () => { expect(await s.result.current.handleSaveCustomLabel()).toBe(false); });
    expect(s.result.current.assetError).toContain('não encontrado');
  });
  it('ignores a command after closing and reopening its owner before validation completes', async () => {
    const s = setup(); s.openLogo(); let pending!: Promise<boolean>;
    act(() => { pending = s.result.current.handleConfirmNewLogo(); });
    act(() => s.result.current.setIsNewLogoModalOpen(false));
    act(() => { s.result.current.setIsNewLogoModalOpen(true); s.result.current.setNewLogoName('NOVA'); });
    await act(async () => { expect(await pending).toBe(false); });
    expect(window.localStorage.getItem('label_available_logos')).toBeNull(); expect(s.result.current.newLogoName).toBe('NOVA');
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('does not write after unmount during validation', async () => {
    const s = setup(); s.openLogo(); let pending!: Promise<boolean>;
    act(() => { pending = s.result.current.handleConfirmNewLogo(); }); s.unmount(); await pending;
    expect(window.localStorage.getItem('label_available_logos')).toBeNull(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('validates deletion identity and confirms persistence before publishing removal', async () => {
    const existing = { id: 'old', name: 'Rótulo', image };
    window.localStorage.setItem('label_custom_labels', JSON.stringify([existing])); const s = setup();
    await act(async () => { expect(await s.result.current.handleDeleteCustomLabel(' ')).toBe(false); });
    expect(s.result.current.customLabels).toHaveLength(1);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await act(async () => { expect(await s.result.current.handleDeleteCustomLabel('old')).toBe(false); });
    expect(s.result.current.customLabels).toHaveLength(1); expect(mocks.info).not.toHaveBeenCalled();
    vi.restoreAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true);
    await act(async () => { expect(await s.result.current.handleDeleteCustomLabel(' old ')).toBe(true); });
    expect(s.result.current.customLabels).toEqual([]); expect(window.localStorage.getItem('label_custom_labels')).toBe('[]');
  });
  it('validates queue payloads, parses name and preserves scale zero before the correct callback', async () => {
    const s = setup('logos', { ...createInitialLabelConfig(), imageScale: 0 });
    await act(async () => { expect(await s.result.current.handleAddLogoToQueue({ name: ' ', image })).toBe(false); });
    expect(s.logo).not.toHaveBeenCalled();
    await act(async () => { expect(await s.result.current.handleAddLogoToQueue({ name: '  Marca  ', image })).toBe(true); });
    expect(s.logo).toHaveBeenCalledWith(expect.objectContaining({ name: 'Marca', scale: 0, quantity: 1 })); expect(s.label).not.toHaveBeenCalled();
  });
  it('keeps built-in logos permanent and persists deletion of user-created logos across reload', async () => {
    window.localStorage.setItem('label_available_logos', JSON.stringify([{ id: 'custom', name: 'Custom', image }]));
    const s = setup();
    await act(async () => { expect(await s.result.current.handleDeleteAvailableLogo('logo_mdf_std')).toBe(false); });
    expect(s.result.current.assetError).toContain('padrão'); expect(window.confirm).not.toHaveBeenCalled();
    await act(async () => { expect(await s.result.current.handleDeleteAvailableLogo(' custom ')).toBe(true); });
    s.unmount(); const reloaded = setup();
    expect(reloaded.result.current.availableLogos.map((logo) => logo.id)).toEqual(['logo_mdf_std', 'logo_morante_std']);
  });
  it('does not queue invalid config or a category changed during validation', async () => {
    const config = { ...createInitialLabelConfig(), imageScale: Infinity };
    const s = setup('precos', config);
    await act(async () => { expect(await s.result.current.handleAddLogoToQueue({ name: 'Marca', image })).toBe(false); });
    expect(s.label).not.toHaveBeenCalled();
    s.rerender({ category: 'precos', config: createInitialLabelConfig() }); let pending!: Promise<boolean>;
    act(() => { pending = s.result.current.handleAddLogoToQueue({ name: 'Marca', image }); });
    s.rerender({ category: 'logos', config: createInitialLabelConfig() });
    await act(async () => { expect(await pending).toBe(false); }); expect(s.logo).not.toHaveBeenCalled(); expect(s.label).not.toHaveBeenCalled();
  });
  it.each(['logo', 'rótulo'])('shows storage failure in the actual controlled %s child', async (kind) => {
    render(<Harness />); fireEvent.click(screen.getByText(kind === 'logo' ? 'Novo logo' : 'Novo rótulo'));
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    fireEvent.click(screen.getByText(kind === 'logo' ? 'Salvar na Biblioteca' : 'Criar Rótulo Definido'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('gravar'));
    expect(screen.getByLabelText(kind === 'logo' ? 'Nome do Ativo' : 'Nome do Rótulo')).toBeTruthy(); expect(mocks.success).not.toHaveBeenCalled();
  });
});

