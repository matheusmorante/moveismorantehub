import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const mediaId = req.query.id as string | undefined;
  if (!mediaId) {
    return res.status(400).json({ error: 'Parâmetro "id" de mídia obrigatório.' });
  }

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    process.env.WHATSAPP_TOKEN;

  if (!accessToken) {
    return res.status(500).json({
      error: 'Token da WhatsApp Cloud API não configurado no servidor.',
    });
  }

  try {
    // 1. Consulta URL temporária do arquivo na Meta Graph API
    const metaGraphRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!metaGraphRes.ok) {
      const errData = await metaGraphRes.json().catch(() => ({}));
      console.error('[WhatsApp Media] Erro ao consultar mídia na Meta:', errData);
      return res.status(metaGraphRes.status).json({
        error: 'Mídia não encontrada ou token expirado na Meta.',
      });
    }

    const metaData = await metaGraphRes.json();
    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || 'application/octet-stream';

    if (!downloadUrl) {
      return res.status(404).json({ error: 'URL de download de mídia indisponível na Meta.' });
    }

    // 2. Faz o download do arquivo de mídia autenticado pelo backend
    const fileRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileRes.ok) {
      return res.status(fileRes.status).json({
        error: 'Falha ao baixar arquivo binário dos servidores da Meta.',
      });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'private, max-age=86400'); // Cache seguro de 24h

    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('[WhatsApp Media] Erro ao processar mídia:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar mídia.' });
  }
}
