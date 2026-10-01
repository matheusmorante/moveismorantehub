// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useProductFormAi } from './useProductFormAi';

const { findNcm } = vi.hoisted(() => ({ findNcm: vi.fn() }));
vi.mock('@/pages/utils/aiService', () => ({
  aiService: { findNCM: findNcm },
}));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.useFakeTimers();
  findNcm.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('não oferece nem dispara classificação de NCM por IA ao abrir o cadastro', async () => {
  const { result } = renderHook(() => useProductFormAi({}, vi.fn(), []));

  expect('handleGenerateNCM' in result.current).toBe(false);
  expect('toggleNcmAuto' in result.current).toBe(false);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1500);
  });

  expect(findNcm).not.toHaveBeenCalled();
});
