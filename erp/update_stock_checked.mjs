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
    const { data: orders, error } = await supabase.from('orders').select('id, order_data');
    if (error) {
        console.error("Erro ao buscar pedidos:", error);
        return;
    }
    if (!orders) {
        console.log("Nenhum pedido encontrado");
        return;
    }
    
    let count = 0;
    const targetDate = new Date('2026-04-26T23:59:59.999Z');
    
    for (const order of orders) {
        const rawData = order.order_data || {};
        const orderDateStr = rawData.date;
        let shouldAutoCheckStock = false;
        
        if (orderDateStr) {
            try {
                const orderDate = new Date(orderDateStr);
                if (!isNaN(orderDate.getTime())) {
                    shouldAutoCheckStock = orderDate <= targetDate;
                }
            } catch (e) {}
        }
        
        if (shouldAutoCheckStock && !rawData.isStockChecked) {
            rawData.isStockChecked = true;
            const { error: updateError } = await supabase
                .from('orders')
                .update({ order_data: rawData })
                .eq('id', order.id);
            if (updateError) {
                console.error(`Erro ao atualizar pedido ${order.id}:`, updateError);
            } else {
                count++;
            }
        }
    }
    console.log('Pedidos atualizados com sucesso:', count);
}
run();
