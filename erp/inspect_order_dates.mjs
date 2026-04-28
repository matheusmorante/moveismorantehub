import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const parseEnv = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return {};
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const env = {};
        for (const line of lines) {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                env[match[1]] = value;
            }
        }
        return env;
    } catch (e) { return {}; }
};

const envLocal = parseEnv(path.resolve('.env.local'));
const envDefault = parseEnv(path.resolve('.env'));
const SUPABASE_URL = envLocal.VITE_SUPABASE_URL || envDefault.VITE_SUPABASE_URL;
const SUPABASE_KEY = envLocal.VITE_SUPABASE_ANON_KEY || envDefault.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data: orders } = await supabase.from('orders').select('id, order_data').limit(15);
    if (!orders) {
        console.log("Sem pedidos");
        return;
    }
    orders.forEach(o => {
        console.log(`ID: ${o.id} | Date: ${o.order_data?.date} | Checked: ${o.order_data?.isStockChecked}`);
    });
}
run();
