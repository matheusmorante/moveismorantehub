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
    const { data: pendingReviews, error: reviewError } = await db
      .from('nfe_order_edit_pending_reviews')
      .select('id,resolution_kind,reason,created_at')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (reviewError) throw new Error('Não foi possível carregar a pendência fiscal da edição.');
    return res.status(200).json({
      replacements,
      pendingReviews: pendingReviews || [],
      order: { ...currentData, id: orderId },
    });
  } catch (error) {
    return res.status(503).json({
      error: error instanceof Error ? error.message : 'Substituição fiscal indisponível.',
    });
  }
}
