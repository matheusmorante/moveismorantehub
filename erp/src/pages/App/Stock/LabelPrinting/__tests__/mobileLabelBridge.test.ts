// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMobileLabelPrintHtml, hasMobileLabelBridge, requestMobileLabelAction } from '../services/mobileLabelBridge';

afterEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('[data-label-test]').forEach((node) => node.remove());
  delete (window as any).ReactNativeWebView;
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe('impressão de etiquetas pelo aplicativo', () => {
  it('preserva o código desenhado no canvas e os estilos na folha enviada ao aparelho', async () => {
    const style = document.createElement('style');
    style.dataset.labelTest = 'true';
    style.textContent = '@page { size: A4; margin: 0; }';
    document.head.appendChild(style);
    document.body.innerHTML = '<div class="print-only"><canvas width="80" height="80" style="width: 20mm"></canvas><span>Produto</span></div><div>Não imprimir</div>';
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cXI=');

    const html = await buildMobileLabelPrintHtml();

    expect(html).toContain('data:image/png;base64,cXI=');
    expect(html).toContain('width: 20mm');
    expect(html).toContain('@page');
    expect(html).toContain('Produto');
    expect(html).not.toContain('Não imprimir');
    expect(html).not.toContain('<canvas');
  });

  it('aguarda a confirmação do aparelho e propaga falhas de impressão', async () => {
    window.history.replaceState({}, '', '/mobile/etiquetas?cat=identificacao');
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    expect(hasMobileLabelBridge()).toBe(true);
    const pending = requestMobileLabelAction({ action: 'print', html: '<html></html>', width: 595, height: 842 });
    const sent = JSON.parse(postMessage.mock.calls[0][0]);
    window.dispatchEvent(new CustomEvent('morante-label-action-result', { detail: { id: sent.id, ok: false, error: 'Impressora indisponível' } }));
    await expect(pending).rejects.toThrow('Impressora indisponível');
  });

  it('não leva conteúdo executável da prévia para a impressão nativa', async () => {
    document.body.innerHTML = '<div class="print-only" onclick="bad()"><script>bad()</script><iframe></iframe><a href="javascript:bad()">Produto</a></div>';
    const html = await buildMobileLabelPrintHtml();
    expect(html).toContain('Produto');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('javascript:');
  });

  it('não ativa a ponte fora da tela de etiquetas do aplicativo', () => {
    (window as any).ReactNativeWebView = { postMessage: vi.fn() };
    expect(hasMobileLabelBridge()).toBe(false);
  });
});
