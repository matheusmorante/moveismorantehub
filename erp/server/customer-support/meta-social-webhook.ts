import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import processor from './whatsapp-processor.cjs';

const { processMetaSocialWebhookPayload, verifyMetaSignature } = processor;
export const config = { api: { bodyParser: false } };

export interface MetaSocialWebhookConfig {
  verifyToken?: string;
  appSecret?: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

const MAX_WEBHOOK_BYTES = 1_000_000;

async function readBoundedRawBody(req: VercelRequest): Promise<Buffer> {
  const requestWithRawBody = req as VercelRequest & { rawBody?: Buffer };
  if (Buffer.isBuffer(requestWithRawBody.rawBody)) {
    if (requestWithRawBody.rawBody.byteLength > MAX_WEBHOOK_BYTES) throw new RangeError('Webhook excede o tamanho permitido.');
    return requestWithRawBody.rawBody;
  }
  if (typeof req[Symbol.asyncIterator] !== 'function') return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_WEBHOOK_BYTES) throw new RangeError('Webhook excede o tamanho permitido.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, byteLength);
}

function matchesVerifyToken(expectedToken: string, receivedToken: unknown): boolean {
  if (typeof receivedToken !== 'string') return false;
  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(receivedToken);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createMetaSocialWebhookHandler(config: MetaSocialWebhookConfig = {}) {
  const verifyToken = (config.verifyToken
    ?? process.env.META_SOCIAL_VERIFY_TOKEN
    ?? process.env.WHATSAPP_VERIFY_TOKEN
    ?? '').trim();
  const appSecret = (config.appSecret
    ?? process.env.META_APP_SECRET
    ?? process.env.WHATSAPP_APP_SECRET
    ?? '').trim();
  const supabaseUrl = config.supabaseUrl
    || process.env.VITE_SUPABASE_URL?.trim()
    || process.env.SUPABASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    || 'https://hkoxhourxwlddgsfdgws.supabase.co';
  const supabaseServiceKey = config.supabaseServiceKey
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SERVICE_KEY?.trim()
    || process.env.service_role?.trim()
    || '';

  return async function metaSocialWebhookHandler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Hub-Signature-256');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
      if (!verifyToken) return res.status(503).json({ error: 'Webhook verification is not configured.' });
      if (req.query['hub.mode'] === 'subscribe'
        && matchesVerifyToken(verifyToken, req.query['hub.verify_token'])) {
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).json({ error: 'Verify token mismatch' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (process.env.NODE_ENV === 'production' && !appSecret) {
      return res.status(503).json({ error: 'Webhook signature verification is not configured.' });
    }

    let rawBody: Buffer;
    try {
      rawBody = await readBoundedRawBody(req);
    } catch (error) {
      if (error instanceof RangeError) return res.status(413).json({ error: error.message });
      return res.status(400).json({ error: 'Invalid webhook body.' });
    }

    const signature = (req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256']) as string | undefined;
    if (appSecret && !verifyMetaSignature(rawBody, signature, appSecret)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    if (!supabaseServiceKey) return res.status(503).json({ error: 'Supabase configuration missing' });

    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid webhook payload.' });
    }
    if (!['instagram', 'page'].includes(String(body?.object || '')) || !Array.isArray(body?.entry)) {
      return res.status(400).json({ error: 'Unsupported Meta social webhook payload.' });
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const result = await processMetaSocialWebhookPayload(supabase, body);
      if (result.errors.length) {
        console.error(`[Meta Social Webhook] Eventos com erro: ${result.errors.length}`);
        return res.status(503).json({ error: 'Webhook processing could not be completed.' });
      }
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error) {
      console.error('[Meta Social Webhook] Erro ao processar payload:', error);
      return res.status(503).json({ error: 'Webhook processing could not be completed.' });
    }
  };
}

const handler = createMetaSocialWebhookHandler();
export default handler;
