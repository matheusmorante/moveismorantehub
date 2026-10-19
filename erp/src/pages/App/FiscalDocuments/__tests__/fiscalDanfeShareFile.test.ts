// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ model: '55', render: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: async () => ({}) }));
vi.mock('@/pages/utils/nfe/danfeGenerator', () => ({
  generateDanfeHtml: () => `<html><body><main class="${mocks.model === '55' ? 'danfe-a4' : 'danfe-nfce'}">DANFE HML</main></body></html>`,
  openDanfePrintWindow: vi.fn(),
}));
vi.mock('@/pages/utils/nfe/sefazResponseParser', () => ({ parseSefazAuthorization: () => ({ protocolNumber: '141260000636723' }) }));
vi.mock('../utils/fiscalXmlParser', () => ({ parseFiscalXmlDetails: () => ({ general: { model: mocks.model, environment: '2', number: '708', series: '1' } }) }));
vi.mock('html2canvas', () => ({ default: mocks.render }));
import { createDanfeShareFile } from '../services/fiscalDanfeXmlService';

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); document.body.innerHTML = ''; });

describe('imagem do DANFE aguarda o documento do iframe', () => {
  it.each(['55', '65'])('gera o arquivo do modelo %s sem resolver pelo about:blank inicial', async model => {
    mocks.model = model;
    const frameDocument = document.implementation.createHTMLDocument();
    Object.defineProperty(frameDocument, 'images', { value: [] });
    const append = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => {
      if (node.tagName === 'IFRAME') {
        // O navegador pode disparar load do documento vazio ao anexar o iframe.
        if (node.srcdoc) frameDocument.body.innerHTML = node.srcdoc;
        Object.defineProperty(node, 'contentDocument', { value: frameDocument });
        append(node);
        queueMicrotask(() => node.dispatchEvent(new Event('load')));
        return node;
      }
      return append(node);
    });
    mocks.render.mockImplementation(async (element: HTMLElement) => {
      expect(element.textContent).toBe('DANFE HML');
      expect(document.querySelector('iframe')?.style.visibility).not.toBe('hidden');
      return { toBlob: (done: (blob: Blob) => void) => done(new Blob(['image'], { type: 'image/png' })) };
    });
    const file = await createDanfeShareFile({ id: 'doc', modelo: model, ambiente: 2, numero_nfe: 708, serie: '1', status: 'homologada', xml_nfe: '<NFe/>', xml_protocolo: '<protNFe/>', numero_protocolo: '141260000636723', created_at: '2026-10-18T02:11:00Z' } as any);
    expect(file.type).toBe('image/png');
    expect(file.size).toBeGreaterThan(0);
    expect(document.querySelector('iframe')).toBeNull();
  });
});
