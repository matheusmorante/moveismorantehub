import type { VercelRequest, VercelResponse } from '@vercel/node';
import auditOrderEdit from '../../server/nfe/audit-order-edit.cjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const selected = (auditOrderEdit as unknown as { default?: typeof auditOrderEdit }).default || auditOrderEdit;
  return selected(req, res);
}
