import type { VercelResponse } from '@vercel/node';
import { loadContinuationReplacements } from './auditContinuationLoader';

export async function handleResumeAction({
  db,
  orderId,
  currentData,
  res,
}: {
  db: any;
  orderId: string;
  currentData: Record<string, any>;
  res: VercelResponse;
}) {
  try {
    const replacements = await loadContinuationReplacements(db, orderId);
    return res.status(200).json({ replacements, order: { ...currentData, id: orderId } });
  } catch (error) {
    return res.status(503).json({
      error: error instanceof Error ? error.message : 'Substituição fiscal indisponível.',
    });
  }
}
