import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { endpoint, params, method = 'GET', body } = req.body;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: config, error: fetchError } = await supabase
            .from('bling_config')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

        if (fetchError || !config?.access_token) {
            return res.status(401).json({ error: 'Bling não configurado' });
        }

        const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
        const response = await fetch(`https://www.bling.com.br/Api/v3${endpoint}${queryString}`, {
            method,
            headers: {
                'Authorization': `Bearer ${config.access_token}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();
        return res.status(response.status).json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
