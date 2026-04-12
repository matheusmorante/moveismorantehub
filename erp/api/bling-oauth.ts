import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, code, clientId, clientSecret, redirectUri } = req.body;

        if (action === 'exchange_code') {
            const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            
            const response = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri
                }).toString()
            });

            const data: any = await response.json();

            if (!response.ok) {
                return res.status(response.status).json(data);
            }

            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

            const { error: dbError } = await supabase
                .from('bling_config')
                .update({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: expiresAt.toISOString(),
                    active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', '00000000-0000-0000-0000-000000000001');

            if (dbError) throw dbError;

            return res.status(200).json({ success: true, data });
        }

        return res.status(400).json({ error: 'Ação inválida' });
    } catch (error: any) {
        console.error('Erro Bling OAuth:', error);
        return res.status(500).json({ error: error.message });
    }
}
