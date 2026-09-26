// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  copyLabelImageToClipboard,
  downloadLabelImage,
} from '../services/priceLabelExportService';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('priceLabelExportService', () => {
  let mockElement: HTMLElement;
  let mockChild1: HTMLElement;
  let mockChild2: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();

    mockElement = document.createElement('div');
    mockChild1 = document.createElement('div');
    mockChild1.setAttribute('data-hide-export', 'true');
    mockChild2 = document.createElement('span');

    mockElement.appendChild(mockChild1);
    mockElement.appendChild(mockChild2);
  });

  describe('copyLabelImageToClipboard', () => {
    it('ignora execução se o elemento for null', async () => {
      await copyLabelImageToClipboard(null);
      expect(html2canvas).not.toHaveBeenCalled();
    });

    it('oculta elementos data-hide-export e restaura no finally após o canvas', async () => {
      let displayDuringCapture = '';
      vi.mocked(html2canvas).mockImplementation(async () => {
        displayDuringCapture = mockChild1.style.display;
        return {
          toBlob: vi.fn(),
        } as any;
      });

      await copyLabelImageToClipboard(mockElement);

      expect(displayDuringCapture).toBe('none');
      expect(mockChild1.style.display).toBe('');
    });

    it('restaura elementos data-hide-export no finally mesmo se html2canvas falhar', async () => {
      vi.mocked(html2canvas).mockRejectedValue(new Error('Canvas render failed'));

      await copyLabelImageToClipboard(mockElement);

      expect(mockChild1.style.display).toBe('');
      expect(toast.error).toHaveBeenCalledWith('Erro ao copiar imagem.');
    });

    it('copia blob para a área de transferência quando suportado', async () => {
      const mockBlob = new Blob(['fake-img'], { type: 'image/png' });
      const mockWrite = vi.fn().mockResolvedValue(undefined);

      Object.assign(navigator, {
        clipboard: { write: mockWrite },
      });
      (window as any).ClipboardItem = class MockClipboardItem {};

      vi.mocked(html2canvas).mockResolvedValue({
        toBlob: (cb: (blob: Blob) => void) => cb(mockBlob),
      } as any);

      await copyLabelImageToClipboard(mockElement);

      expect(mockWrite).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Imagem da etiqueta copiada para a área de transferência!');
    });
  });

  describe('downloadLabelImage', () => {
    it('gera URL de download e clica no link temporário', async () => {
      const mockDataUrl = 'data:image/png;base64,fake';
      const clickSpy = vi.fn();

      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = origCreateElement(tag);
        if (tag === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      vi.mocked(html2canvas).mockResolvedValue({
        toDataURL: () => mockDataUrl,
      } as any);

      await downloadLabelImage(mockElement, 'etiqueta_teste.png');

      expect(clickSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Download da imagem PNG concluído!');
    });

    it('restaura o DOM e exibe toast de erro se o download falhar', async () => {
      vi.mocked(html2canvas).mockRejectedValue(new Error('Capture error'));

      await downloadLabelImage(mockElement, 'etiqueta.png');

      expect(mockChild1.style.display).toBe('');
      expect(toast.error).toHaveBeenCalledWith('Erro ao baixar imagem PNG.');
    });
  });
});
