import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'morante_hub_whatsapp_2026';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 1. Verificação do Webhook pela Meta (GET)
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[WhatsApp Webhook] Verificação da Meta bem-sucedida! Challenge retornado.');
            return res.status(200).send(challenge);
        } else {
            console.warn('[WhatsApp Webhook] Token de verificação inválido:', { mode, token });
            return res.status(403).json({ error: 'Verify token mismatch' });
        }
    }

    // 2. Recebimento de Mensagens e Status (POST)
    if (req.method === 'POST') {
        try {
            const body = req.body;
            console.log('[WhatsApp Webhook] Payload recebido:', JSON.stringify(body, null, 2));

            const entry = body?.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;

            // Se for resposta com clique em botão interativo (Confirmação de Entrega)
            if (value?.messages && value.messages.length > 0) {
                const message = value.messages[0];
                const from = message.from;

                if (message.type === 'interactive' && message.interactive?.button_reply) {
                    const buttonId = message.interactive.button_reply.id;
                    const buttonTitle = message.interactive.button_reply.title;
                    console.log(`[WhatsApp Webhook] Botão clicado: ID=${buttonId}, Title=${buttonTitle}, From=${from}`);

                    if (buttonId.startsWith('confirm_delivery_') && supabaseServiceKey) {
                        const orderId = buttonId.replace('confirm_delivery_', '');
                        const supabase = createClient(supabaseUrl, supabaseServiceKey);

                        console.log(`[WhatsApp Webhook] Confirmando entrega para pedido #${orderId}`);
                        await supabase
                            .from('orders')
                            .update({
                                delivery_confirmed_at: new Date().toISOString(),
                                delivery_confirmed_by: from,
                            })
                            .eq('id', orderId);
                    }
                }
            }

            return res.status(200).json({ status: 'EVENT_RECEIVED' });
        } catch (error: any) {
            console.error('[WhatsApp Webhook] Erro ao processar payload:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
