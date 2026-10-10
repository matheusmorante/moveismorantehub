import type { VercelRequest, VercelResponse } from '@vercel/node';
import documentDetails from '../../server/nfe/document-details.cjs';
import itemDefaults from '../../server/nfe/item-defaults.cjs';
import orderCancellationPolicy from '../../server/nfe/order-cancellation-policy.cjs';
import orderFiscalBadges from '../../server/nfe/order-fiscal-badges.cjs';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
const unwrap = (handler: Handler): Handler =>
  (handler as unknown as { default?: Handler }).default || handler;
const handlers: Record<string, Handler> = {
  'document-details': unwrap(documentDetails),
  'item-defaults': unwrap(itemDefaults),
  'order-cancellation-policy': unwrap(orderCancellationPolicy),
  'order-fiscal-badges': unwrap(orderFiscalBadges),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const operation = typeof req.query.operation === 'string' ? req.query.operation : '';
  const selected = Object.hasOwn(handlers, operation) ? handlers[operation] : undefined;
  if (!selected)
    return res.status(404).json({ success: false, error: 'Operação fiscal não encontrada.' });
  return selected(req, res);
}
