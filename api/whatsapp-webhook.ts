import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseSecretKey, getSupabaseUrl } from './supabaseSecretKey';
import {
  parseMetaStatusFailure,
  processWhatsAppWebhookPayload,
  readRawWebhookBody,
  verifyMetaSignature,
} from '../erp/src/pages/utils/customerSupport/whatsappWebhookProcessor';

export { parseMetaStatusFailure, verifyMetaSignature };
export const config = { api: { bodyParser: false } };

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'morante_hub_whatsapp_2026';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || '';
const supabaseUrl = getSupabaseUrl();
const supabaseServiceKey = getSupabaseSecretKey() || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
