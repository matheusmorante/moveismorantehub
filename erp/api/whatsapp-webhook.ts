import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWhatsAppMedia } from '../src/pages/utils/customerSupport/whatsappMediaProxy.js';
import { createWhatsAppTestDispatchHandler, MAX_WHATSAPP_TEST_REQUEST_BYTES } from '../../api/whatsapp-dispatch.js';
import { createWhatsAppSupportSendHandler } from '../../api/whatsapp-support-send.js';
import processor from '../server/customer-support/whatsapp-processor.cjs';

const {
  parseMetaStatusFailure,
  processWhatsAppWebhookPayload,
  readRawWebhookBody,
  verifyMetaSignature,
} = processor;

export { parseMetaStatusFailure, verifyMetaSignature };
export const config = { api: { bodyParser: false } };

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN?.trim() || '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET?.trim() || '';
const handleTestDispatch = createWhatsAppTestDispatchHandler();
const handleCustomerSupportSend = createWhatsAppSupportSendHandler();
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature-256');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const operation = req.query.operation as string | undefined;
  if (operation === 'dispatch') {
    if (req.method === 'POST' && req.body === undefined) {
      // This shared route disables Vercel's JSON parser to preserve webhook HMAC bytes.
      const rawBody = await readRawWebhookBody(req);
      if (rawBody.byteLength > MAX_WHATSAPP_TEST_REQUEST_BYTES) {
        return res.status(413).json({ error: 'Solicitação excede o tamanho permitido.' });
      }
      try {
        req.body = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
      } catch {
        return res.status(400).json({ error: 'Solicitação inválida.' });
      }
    }
    return handleTestDispatch(req, res);
  }

  if (operation === 'support-send') {
    return handleCustomerSupportSend(req, res);
  }

  if (operation === 'media') {
    return handleWhatsAppMedia(req, res, {
      supabaseUrl,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    });
  }

  if (req.method === 'GET') {
    if (!VERIFY_TOKEN) return res.status(503).json({ error: 'Webhook verification is not configured.' });
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
      if (result.errors.length) {
        console.error(`[WhatsApp Webhook] Eventos com erro: ${result.errors.length}`);
        return res.status(503).json({ error: 'Webhook processing could not be completed.' });
      }
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error: any) {
      console.error('[WhatsApp Webhook] Erro ao processar payload:', error);
      return res.status(400).json({ error: error.message || 'Invalid webhook payload' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
