import { describe, expect, it } from 'vitest';
import { parseNativeLabelAction } from './labelNativeAction';

describe('ações de etiquetas enviadas ao aparelho', () => {
  it('aceita o documento de impressão com as dimensões escolhidas', () => {
    expect(parseNativeLabelAction({ type: 'morante-label-action', id: 'request-1', action: 'print', html: '<html>folha</html>', width: 595, height: 842 }))
      .toEqual({ id: 'request-1', action: 'print', html: '<html>folha</html>', width: 595, height: 842 });
  });

  it('recusa dimensões inválidas e ações desconhecidas', () => {
    expect(parseNativeLabelAction({ type: 'morante-label-action', id: 'request-1', action: 'print', html: '', width: -1, height: 842 })).toBeNull();
    expect(parseNativeLabelAction({ type: 'morante-label-action', id: 'request-1', action: 'open-url', url: 'https://example.com' })).toBeNull();
  });

  it('aceita somente imagem PNG em base64 para compartilhar ou copiar', () => {
    expect(parseNativeLabelAction({ type: 'morante-label-action', id: 'request-2', action: 'share-image', dataUrl: 'data:image/png;base64,YWJj', fileName: 'preco.png' }))
      .toEqual({ id: 'request-2', action: 'share-image', base64: 'YWJj', fileName: 'preco.png' });
    expect(parseNativeLabelAction({ type: 'morante-label-action', id: 'request-2', action: 'copy-image', dataUrl: 'https://example.com/image.png' })).toBeNull();
  });
});
