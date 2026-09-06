import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

// Mock localStorage para node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import { buildImagePrompt, interpolatePrompt } from './postTemplatePrompt';
import { postTemplateService } from './postTemplateService';

describe('modelos estruturados de post', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('interpola apenas variáveis conhecidas e preserva regras sem texto', () => {
    expect(interpolatePrompt('Produto: {{product.name}} / {{unknown}}', { 'product.name': 'Sofá' })).toBe('Produto: Sofá / ');
  });

  it('monta prompt com preservação e áreas reservadas', async () => {
    const template = (await postTemplateService.list())[0];
    const prompt = buildImagePrompt(template, { 'product.name': 'Sofá' });
    expect(prompt).toContain('Nunca crie texto');
    expect(prompt).toContain('Mantenha a região');
  });

  it('exclui modelo definitivamente sem reaparecer nem mudar de posição', async () => {
    const initial = await postTemplateService.list();
    expect(initial.length).toBeGreaterThan(0);

    const toDelete = initial[0];
    await postTemplateService.remove(toDelete.id);

    const afterDelete = await postTemplateService.list();
    expect(afterDelete.some((t) => t.id === toDelete.id)).toBe(false);
    expect(afterDelete.length).toBe(initial.length - 1);

    // Nova chamada para garantir idempotência e persistência
    const reloaded = await postTemplateService.list();
    expect(reloaded.some((t) => t.id === toDelete.id)).toBe(false);
  });
});
