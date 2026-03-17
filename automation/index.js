import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

// 1. Configuração de Ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configurados no .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Inicialização do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "morante-hub-session"
    }),
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

console.log('🚀 Iniciando Automador Móveis Morante...');

client.on('qr', (qr) => {
    console.log('📲 Escaneie o QR Code abaixo para conectar o WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado e pronto!');
});

client.on('message', async (msg) => {
    // Exemplo de integração: Salvar log de mensagens no Supabase
    try {
        if (msg.body.toLowerCase() === '!ping') {
            msg.reply('pong 🏓');
        }
        
        // Log de atividade
        const { error } = await supabase.from('automation_logs').insert([{
            type: 'whatsapp_message',
            content: msg.body,
            sender: msg.from,
            timestamp: new Date().toISOString()
        }]);
        
        if (error) console.error('Erro ao salvar log no Supabase:', error.message);
    } catch (err) {
        console.error('Erro no processamento da mensagem:', err);
    }
});

client.initialize();

// Tratamento de desligamento
process.on('SIGINT', async () => {
    console.log('\nDesligando...');
    await client.destroy();
    process.exit(0);
});
