import http from 'http';
import { listWindowsPrinters, warmupPrintersCache } from './printers';
import { loadPresets, savePresets, getPresetForType, PrintPreset } from './presets';
import { isJobAlreadyProcessed } from './idempotency';
import { renderHtmlToPdfBuffer, warmupRenderer } from './renderer';
import { sendPdfToWindowsSpooler } from './spooler';
import { logPrintEvent } from './logger';
import { 
    loadMachineConfig, 
    saveMachineConfig, 
    getMachineConfigPath, 
    resolvePrinterForDocument 
} from './config';

const PORT = 40405;
const HOST = '127.0.0.1';

const setCorsHeaders = (res: http.ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Print-Client');
};

const sendJson = (res: http.ServerResponse, statusCode: number, data: any) => {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
};

const readBodyJson = async (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 50 * 1024 * 1024) {
                reject(new Error('Payload muito grande (máximo 50MB)'));
            }
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(new Error('JSON inválido no corpo da requisição'));
            }
        });
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    const pathname = url.pathname;

    try {
        // 1. Healthcheck
        if (req.method === 'GET' && pathname === '/health') {
            sendJson(res, 200, {
                status: 'ok',
                agent: 'morantehub-print-agent',
                version: '1.0.0',
                uptime: process.uptime(),
            });
            return;
        }

        // 2. Listagem de impressoras do Windows
        if (req.method === 'GET' && pathname === '/printers') {
            const force = url.searchParams.get('refresh') === 'true';
            const printers = await listWindowsPrinters(force);
            sendJson(res, 200, { printers });
            return;
        }

        // 3. Configuração persistente da Máquina (C:\ProgramData\MoranteHub\print-config.json)
        if (req.method === 'GET' && pathname === '/config') {
            const config = loadMachineConfig();
            sendJson(res, 200, {
                config,
                configPath: getMachineConfigPath()
            });
            return;
        }

        if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/config') {
            const body = await readBodyJson(req);
            if (!body || typeof body !== 'object') {
                sendJson(res, 400, { error: 'Payload de configuração inválido' });
                return;
            }
            const updated = saveMachineConfig(body);
            sendJson(res, 200, { 
                success: true, 
                config: updated,
                configPath: getMachineConfigPath()
            });
            return;
        }

        // 4. Presets legados
        if (req.method === 'GET' && pathname === '/presets') {
            const presets = loadPresets();
            sendJson(res, 200, { presets });
            return;
        }

        if (req.method === 'POST' && pathname === '/presets') {
            const body = await readBodyJson(req);
            if (!body || typeof body !== 'object') {
                sendJson(res, 400, { error: 'Payload de presets inválido' });
                return;
            }
            savePresets(body);
            sendJson(res, 200, { success: true, presets: loadPresets() });
            return;
        }

        // 5. Impressão
        if (req.method === 'POST' && pathname === '/print') {
            const body = await readBodyJson(req);
            const { printJobId, type, html, pdfBase64, printerName, options } = body;

            if (!printJobId || typeof printJobId !== 'string') {
                sendJson(res, 400, { error: 'Identificador printJobId é obrigatório' });
                return;
            }

            if (!html && !pdfBase64) {
                sendJson(res, 400, { error: 'Conteúdo de impressão (html ou pdfBase64) é obrigatório' });
                return;
            }

            // Verificação anti-duplicidade
            if (isJobAlreadyProcessed(printJobId)) {
                logPrintEvent(type || 'document', printJobId, printerName || 'default', 'queued', 'Job duplicado ignorado');
                sendJson(res, 200, {
                    success: true,
                    status: 'already_processed',
                    message: 'Trabalho já processado anteriormente (duplicação prevenida).',
                });
                return;
            }

            const docType = type || 'sales_order';
            const basePreset = getPresetForType(docType);
            const machineConfig = loadMachineConfig();

            // Resolução inteligente da impressora da máquina física (C:\ProgramData\MoranteHub\print-config.json)
            const targetPrinter = resolvePrinterForDocument(docType, printerName);

            // Escala e qualidade com fallback da máquina
            let resolvedScale = basePreset.scale;
            let resolvedQuality = basePreset.quality || 'normal';

            if (docType === 'sales_order') {
                if (machineConfig.orderScale) resolvedScale = machineConfig.orderScale;
                if (machineConfig.orderQuality) resolvedQuality = machineConfig.orderQuality;
            } else if (docType === 'receipt') {
                if (machineConfig.receiptScale) resolvedScale = machineConfig.receiptScale;
                if (machineConfig.receiptQuality) resolvedQuality = machineConfig.receiptQuality;
            } else if (docType === 'danfe') {
                if (machineConfig.danfeScale) resolvedScale = machineConfig.danfeScale;
                if (machineConfig.danfeQuality) resolvedQuality = machineConfig.danfeQuality;
            }

            const effectivePreset: PrintPreset = {
                ...basePreset,
                scale: options?.scale ?? resolvedScale,
                quality: options?.quality ?? resolvedQuality,
                ...options,
                margins: { ...basePreset.margins, ...(options?.margins || {}) },
            };

            logPrintEvent(docType, printJobId, targetPrinter, 'rendering');

            let pdfBuffer: Buffer;
            if (pdfBase64) {
                pdfBuffer = Buffer.from(pdfBase64, 'base64');
            } else {
                pdfBuffer = await renderHtmlToPdfBuffer(html, effectivePreset);
            }

            logPrintEvent(docType, printJobId, targetPrinter, 'sent_to_spooler');
            await sendPdfToWindowsSpooler(pdfBuffer, targetPrinter, effectivePreset, printJobId);

            sendJson(res, 200, {
                success: true,
                status: 'sent_to_spooler',
                printer: targetPrinter,
                jobId: printJobId,
                message: `Enviado com sucesso para a impressora ${targetPrinter}.`,
            });
            return;
        }

        // 6. Teste de impressão
        if (req.method === 'POST' && pathname === '/print-test') {
            const body = await readBodyJson(req);
            const printer = resolvePrinterForDocument('test', body.printerName);
            const testJobId = `test-${Date.now()}`;
            const testPreset = getPresetForType('test');

            const testHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                    .title { font-size: 20px; font-weight: 900; color: #1e3a8a; }
                    .subtitle { font-size: 12px; color: #64748b; font-weight: bold; }
                    .box { border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px; margin-top: 15px; }
                    .badge { display: inline-block; background: #10b981; color: white; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">MORANTE HUB — PÁGINA DE TESTE DE IMPRESSÃO</div>
                    <div class="subtitle">Agente Local de Impressão Direta (Windows Spooler)</div>
                </div>
                <p><span class="badge">CONEXÃO OPERACIONAL</span></p>
                <div class="box">
                    <p><strong>Impressora:</strong> ${printer}</p>
                    <p><strong>Papel:</strong> ${testPreset.paperSize} | <strong>Orientação:</strong> ${testPreset.orientation}</p>
                    <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <p><strong>ID do Teste:</strong> ${testJobId}</p>
                </div>
                <p style="margin-top: 20px; font-size: 11px; color: #64748b;">
                    Se esta folha foi impressa diretamente sem janelas de diálogo, o sistema de impressão automática está 100% configurado e pronto para uso no Morante Hub ERP.
                </p>
            </body>
            </html>`;

            const pdfBuffer = await renderHtmlToPdfBuffer(testHtml, testPreset);
            await sendPdfToWindowsSpooler(pdfBuffer, printer, testPreset, testJobId);

            sendJson(res, 200, {
                success: true,
                status: 'sent_to_spooler',
                printer,
                jobId: testJobId,
                message: `Página de teste enviada para ${printer}.`,
            });
            return;
        }

        sendJson(res, 404, { error: 'Rota não encontrada' });
    } catch (err: any) {
        console.error('[Server] Erro no processamento da requisição:', err);
        sendJson(res, 500, {
            error: err.message || 'Erro interno no agente de impressão',
            details: String(err),
        });
    }
});

server.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(`  MORANTE HUB — AGENTE LOCAL DE IMPRESSÃO WINDOWS      `);
    console.log(`  Status: ONLINE em http://${HOST}:${PORT}             `);
    console.log(`  Driver Alvo: EPSON L3250 Series                      `);
    console.log(`=======================================================`);

    // Warmup assíncrono: pré-carrega impressoras e deixa o Chromium pronto em RAM
    warmupPrintersCache();
    warmupRenderer().catch(err => console.warn('[Server] Warmup do Chromium falhou:', err));
});

export default server;

