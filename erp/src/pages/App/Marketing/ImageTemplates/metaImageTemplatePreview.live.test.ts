import { expect, it } from 'vitest';
import type { VercelResponse } from '@vercel/node';
import { handleMetaImageTemplatePreview } from '../../../../../api/_lib/metaImageTemplatePreview';
import type { AuthenticatedErpRequest } from '../../../../../api/_lib/authenticatedErpRequest';

const enabled = process.env.MORANTE_IMAGE_TEMPLATE_GRAPH_AUDIT === 'development-readonly';

it.skipIf(!enabled)('confere o contrato de leitura do Graph nos dois catálogos do ERP', async () => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappId = process.env.MORANTE_IMAGE_TEMPLATE_AUDIT_WHATSAPP_ID;
  if (!token || !whatsappId || !/^\d+$/.test(whatsappId)) throw new Error('O ambiente de auditoria do Graph está incompleto.');
  const context = { roles: ['manager'], rolePermissions: {}, whatsappConfig: { catalogId: whatsappId } } as AuthenticatedErpRequest;

  async function read(body: { operation: string; target: string; setId?: string; productId?: string }) {
    let status = 0;
    let data: { rows?: { id: string }[]; id?: string; image_url?: string } = {};
    const sink = { status(value: number) { status = value; return this; }, json(value: typeof data) { data = value; return this; } };
    await handleMetaImageTemplatePreview(body, context, sink as unknown as VercelResponse, token!, 'v26.0');
    console.info(JSON.stringify({ catálogo: body.target, operação: body.operation, status, itens: data.rows?.length, fotoPrincipal: !!data.image_url }));
    expect(status, `${body.target} · ${body.operation}`).toBe(200);
    return data;
  }

  await Promise.all(['ads', 'whatsapp'].map(async (target) => {
    const [sets, products] = await Promise.all([
      read({ target, operation: 'list_image_template_sets' }), read({ target, operation: 'list_image_template_products' }),
    ]);
    const setId = sets.rows?.[0]?.id;
    const productId = products.rows?.[0]?.id;
    if (setId) await read({ target, operation: 'list_image_template_products', setId });
    if (productId) {
      const product = await read({ target, operation: 'read_image_template_product', productId });
      expect(product.id === productId, 'O detalhe deve pertencer ao produto selecionado.').toBe(true);
    }
  }));
}, 45_000);
