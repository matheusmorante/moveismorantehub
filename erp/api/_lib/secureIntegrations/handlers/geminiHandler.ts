import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOpenAi } from './openAiHandler.js';

/**
 * Compatibilidade temporária para clientes antigos: o caminho legado mantém
 * o formato do assistente, mas toda inferência é executada pela OpenAI.
 */
export async function handleGemini(req: VercelRequest, res: VercelResponse): Promise<unknown> {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.action !== 'generateContent') {
    return res.status(410).json({ error: 'O endpoint Gemini foi desativado. Atualize o aplicativo.' });
  }

  req.body = {
    action: 'agent_compat',
    payload: body.payload,
    moduleSource: 'legacy_gemini_proxy',
  };
  return handleOpenAi(req, res);
}
