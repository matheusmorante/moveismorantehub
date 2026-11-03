// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LabelConfig } from '../utils/LabelConstants';
import { useLabelPrintMode } from './useLabelPrintMode';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  buildHtml: vi.fn(),
  hasBridge: vi.fn(),
  requestNative: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { getSession: mocks.getSession } } }));
vi.mock('../utils/labelGridLayout', () => ({ getLabelPaperDimensions: () => ({ w: '100mm', h: '150mm' }) }));
vi.mock('../services/mobileLabelBridge', () => ({
  buildMobileLabelPrintHtml: mocks.buildHtml,
  hasMobileLabelBridge: mocks.hasBridge,
  requestMobileLabelAction: mocks.requestNative,
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('modos de impressão de etiquetas', () => {
  it('abre a caixa de impressão do ERP no navegador', async () => {
    mocks.hasBridge.mockReturnValue(false);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { result } = renderHook(() => useLabelPrintMode({} as LabelConfig, 'identificacao'));

    await act(async () => { await result.current('standard'); });

    expect(print).toHaveBeenCalledOnce();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.requestNative).not.toHaveBeenCalled();
  });

  it('abre a impressão normal pelo Expo Print no app nativo', async () => {
    mocks.hasBridge.mockReturnValue(true);
    mocks.buildHtml.mockResolvedValue('<html>etiquetas</html>');
    mocks.requestNative.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLabelPrintMode({} as LabelConfig, 'identificacao'));

    await act(async () => { await result.current('standard'); });

    expect(mocks.requestNative).toHaveBeenCalledWith({
      action: 'print',
      html: '<html>etiquetas</html>',
      width: 100 * 72 / 25.4,
      height: 150 * 72 / 25.4,
    });
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
});
