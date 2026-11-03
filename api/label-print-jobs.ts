import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authorizeLabelPrintUser,
  cleanLabelHtml,
  getLabelCategory,
  isAllowedAppOrigin,
} from './labelPrintAuthorization';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const category = getLabelCategory(req.body?.category);
    if (!category) return res.status(400).json({ error: 'Categoria de etiqueta inválida.' });
    const authorization = await authorizeLabelPrintUser(req, category);
    if (!authorization.ok) return res.status(authorization.status).json({ error: authorization.message });

    const html = cleanLabelHtml(req.body?.html);
    const assetOrigin = req.body?.assetOrigin;
    const width = Number(req.body?.paperWidthMm);
    const height = Number(req.body?.paperHeightMm);
    if (!html || !isAllowedAppOrigin(assetOrigin) || !Number.isFinite(width) || !Number.isFinite(height) ||
        width < 20 || width > 500 || height < 30 || height > 1200) {
      return res.status(400).json({ error: 'Folha ou conteúdo de impressão inválido.' });
    }

    const { count, error: queueError } = await authorization.db
      .from('label_print_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', authorization.userId)
      .in('status', ['pending', 'processing']);
    if (queueError) return res.status(503).json({ error: 'Não foi possível validar a fila de impressão.' });
    if ((count || 0) >= 25) return res.status(429).json({ error: 'A fila atingiu o limite de 25 impressões pendentes.' });

    const id = randomUUID();
    const { error } = await authorization.db.from('label_print_jobs').insert({
      id,
      owner_id: authorization.userId,
      category,
      html,
      asset_origin: new URL(assetOrigin).origin,
      paper_width_mm: width,
      paper_height_mm: height,
      status: 'pending',
    });
    if (error) return res.status(503).json({ error: 'Não foi possível colocar as etiquetas na fila.' });
    return res.status(201).json({ id, status: 'pending' });
  }

  if (req.method === 'GET') {
    const authorization = await authorizeLabelPrintUser(req, 'manage');
    if (!authorization.ok) return res.status(authorization.status).json({ error: authorization.message });
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Impressão inválida.' });
    const { data, error } = await authorization.db
      .from('label_print_jobs')
      .select('id,status,error,created_at,completed_at')
      .eq('id', id)
      .eq('owner_id', authorization.userId)
      .maybeSingle();
    if (error) return res.status(503).json({ error: 'Não foi possível consultar a impressão.' });
    if (!data) return res.status(404).json({ error: 'Impressão não encontrada.' });
    return res.status(200).json({ id: data.id, status: data.status, error: data.error });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
