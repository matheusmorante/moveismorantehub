import type { VercelRequest, VercelResponse } from '@vercel/node';
import cancel from '../../server/nfe/cancel.cjs';
import returnCapacity from '../../server/nfe/return-capacity.cjs';
import operationDrafts from '../../server/nfe/operation-drafts.cjs';
import transmitOperationDraft from '../../server/nfe/transmit-operation-draft.cjs';
import cce from '../../server/nfe/cce.cjs';
import reserveNumber from '../../server/nfe/reserve-number.cjs';
import emit from '../../server/nfe/emit.cjs';
import consult from '../../server/nfe/consult.cjs';
import inboundManifestation from '../../server/nfe/inbound-manifestation.cjs';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
const unwrap = (handler: Handler): Handler =>
  (handler as unknown as { default?: Handler }).default || handler;
const handlers: Record<string, Handler> = {
  emit: unwrap(emit),
  consult: unwrap(consult),
  'inbound-manifestation': unwrap(inboundManifestation),
  cancel: unwrap(cancel),
  'return-capacity': unwrap(returnCapacity),
  'operation-drafts': unwrap(operationDrafts),
  'transmit-operation-draft': unwrap(transmitOperationDraft),
  cce: unwrap(cce),
  'reserve-number': unwrap(reserveNumber),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const operation = typeof req.query.operation === 'string' ? req.query.operation : '';
  const selected = Object.hasOwn(handlers, operation) ? handlers[operation] : undefined;
  if (!selected) return res.status(404).json({ success: false, error: 'Operação fiscal não encontrada.' });
  return selected(req, res);
}
