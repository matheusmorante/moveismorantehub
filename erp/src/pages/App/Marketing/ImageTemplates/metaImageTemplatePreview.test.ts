import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelResponse } from '@vercel/node';
import { handleMetaImageTemplatePreview } from '../../../../../api/_lib/metaImageTemplatePreview';
import type { AuthenticatedErpRequest } from '../../../../../api/_lib/authenticatedErpRequest';
import { META_ADS_CREATIVE_CATALOG_ID } from '../../../../../../shared-utils/metaCatalogIds';

function context(roles = ['manager'], whatsappConfig?: unknown) {
  return { userId: 'user', roles, rolePermissions: {}, whatsappConfig } as AuthenticatedErpRequest;
}
function response() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn().mockReturnThis();
  return { status, json, res: { status, json } as unknown as VercelResponse };
}
const graphResponse = (data: unknown) => new Response(JSON.stringify(data));

afterEach(() => vi.unstubAllGlobals());

describe('prévia de modelos pelo Graph', () => {
  it('nega o acesso sem permissão e não faz chamada externa', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { res, status } = response();
    await handleMetaImageTemplatePreview({ operation: 'list_image_template_sets' }, context(['seller']), res, 'token', 'v26.0');
    expect(status).toHaveBeenCalledWith(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('pede até 15 conjuntos e devolve só o cursor, sem repassar a URL de paginação', async () => {
    const fetch = vi.fn().mockResolvedValue(graphResponse({ data: [{ id: '1', name: 'Vitrine' }],
      paging: { next: 'https://graph.facebook.com/?access_token=privado', cursors: { after: 'next==' } } }));
    vi.stubGlobal('fetch', fetch);
    const { res, status, json } = response();
    await handleMetaImageTemplatePreview({ operation: 'list_image_template_sets', target: 'whatsapp' },
      context(['manager'], { catalogId: '1002' }), res, 'token', 'v26.0');
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toBe('/v26.0/1002/product_sets');
    expect(url.searchParams.get('limit')).toBe('15');
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ rows: [{ id: '1', name: 'Vitrine' }], nextCursor: 'next==' });
  });

  it('confere o catálogo do conjunto antes de ler seus produtos', async () => {
    const fetch = vi.fn().mockResolvedValue(graphResponse({ product_catalog: { id: '999' } }));
    vi.stubGlobal('fetch', fetch);
    const { res, status } = response();
    await handleMetaImageTemplatePreview({ operation: 'list_image_template_products', setId: '12' }, context(), res, 'token', 'v26.0');
    expect(status).toHaveBeenCalledWith(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('solicita somente os campos usados e retorna o detalhe de um produto pertencente ao catálogo', async () => {
    const fetch = vi.fn().mockResolvedValue(graphResponse({ id: '19', name: 'Mesa', price: '199.00 BRL',
      additional_image_urls: ['a', 'b', 'c', 'd'], product_catalog: { id: META_ADS_CREATIVE_CATALOG_ID } }));
    vi.stubGlobal('fetch', fetch);
    const { res, status, json } = response();
    await handleMetaImageTemplatePreview({ operation: 'read_image_template_product', productId: '19' }, context(), res, 'token', 'v26.0');
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ id: '19', name: 'Mesa', price: '199.00 BRL', additional_image_urls: ['a', 'b', 'c'] });
  });
});
