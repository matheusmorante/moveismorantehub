import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAnonKey, getSupabaseSecretKey, getSupabaseUrl } from './supabaseSecretKey.js';
import { handleWhatsAppMedia } from '../erp/src/pages/utils/customerSupport/whatsappMediaProxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return handleWhatsAppMedia(req, res, {
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    supabaseSecretKey: getSupabaseSecretKey(),
  });
}
