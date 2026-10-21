import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  parseMetaStatusFailure,
  processWhatsAppWebhookPayload,
  readRawWebhookBody,
  verifyMetaSignature,
} from '../src/pages/utils/customerSupport/whatsappWebhookProcessor';

export { parseMetaStatusFailure, verifyMetaSignature };
export const config = { api: { bodyParser: false } };

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'morante_hub_whatsapp_2026';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const operation = req.query.operation as string | undefined;
  if (operation === 'dispatch') {
    return res.status(403).json({
      error: 'Envio indisponível por política da empresa.',
      status: 'BLOCKED_FREE_TIER_PROTECTION',
      reason: 'A Central de Atendimento permite consulta e recebimento, mas não despacha mensagens para clientes.',
    });
  }

  if (operation === 'media') {
    const mediaId = req.query.id as string | undefined;
    if (!mediaId) return res.status(400).json({ error: 'Parâmetro "id" de mídia obrigatório.' });
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
    if (!accessToken) return res.status(500).json({ error: 'Token da WhatsApp Cloud API não configurado.' });
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!metaRes.ok) return res.status(metaRes.status).json({ error: 'Mídia não encontrada na Meta.' });
      const metaData = await metaRes.json();
      if (!metaData.url) return res.status(404).json({ error: 'URL da mídia indisponível na Meta.' });
      const fileRes = await fetch(metaData.url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!fileRes.ok) return res.status(fileRes.status).json({ error: 'Falha ao baixar mídia dos servidores Meta.' });
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      res.setHeader('Content-Type', metaData.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.status(200).send(buffer);
    } catch (error: any) {
      console.error('[WhatsApp Media Proxy] Erro:', error);
      return res.status(500).json({ error: error.message || 'Erro ao processar mídia.' });
    }
  }

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).json({ error: 'Verify token mismatch' });
  }

  if (req.method === 'POST') {
    if (process.env.NODE_ENV === 'production' && !APP_SECRET.trim()) {
      return res.status(503).json({ error: 'Webhook signature verification is not configured.' });
    }
    const rawBody = await readRawWebhookBody(req);
    const signature = (req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256']) as string | undefined;
    if (APP_SECRET && !verifyMetaSignature(rawBody, signature, APP_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    if (!supabaseServiceKey) return res.status(500).json({ error: 'Supabase configuration missing' });

    try {
      const body = JSON.parse(rawBody.toString('utf8'));
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const result = await processWhatsAppWebhookPayload(supabase, body);
      if (result.errors.length) console.error(`[WhatsApp Webhook] Eventos com erro: ${result.errors.length}`);
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error: any) {
      console.error('[WhatsApp Webhook] Erro ao processar payload:', error);
      return res.status(400).json({ error: error.message || 'Invalid webhook payload' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
