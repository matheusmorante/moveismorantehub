import type { VercelResponse } from '@vercel/node';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleFinalizeAction({
  db,
  orderId,
  replacementId,
  res,
}: {
  db: any;
  orderId: string;
  replacementId: string;
  res: VercelResponse;
}) {
  if (!uuidPattern.test(replacementId))
    return res.status(400).json({ error: 'Substituição fiscal inválida.' });

  const { data: replacement, error: replacementError } = await db
    .from('nfe_order_edit_replacements')
    .select('id')
    .eq('id', replacementId)
    .eq('order_id', orderId)
    .maybeSingle();

  if (replacementError || !replacement)
    return res
      .status(404)
      .json({ error: 'Substituição fiscal não encontrada para este pedido.' });

  const { data: finalized, error: finalizeError } = await db.rpc('finalize_fiscal_order_edit', {
    p_replacement_id: replacementId,
  });

  if (finalizeError)
    return res.status(409).json({
      error: 'A reversão ainda não está confirmada; o pedido continua sem alteração.',
    });

  return res.status(200).json({ success: true, order: { ...finalized.order_data, id: orderId } });
}
