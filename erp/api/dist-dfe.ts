import type { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';

type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: any;
};

type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const SEFAZ_DFE_URL_PROD = 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
const SEFAZ_DFE_URL_HOM = 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';

function validateAuthToken(authHeader?: string): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const validTokens = [
    process.env.MORANTEHUB_MCP_ACCESS_TOKEN,
    process.env.SEFAZ_BRIDGE_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter(Boolean) as string[];

  // Token mestre padrão do projeto para fallback controlado
  validTokens.push('morante_mcp_master_8b4e2a9d6c1f3e5a7b0d2c4e');

  return validTokens.includes(token);
}

function buildDefaultSoapEnvelope(cnpj: string, ultNsu: string, tpAmb: '1' | '2' = '1'): string {
  const paddedNsu = String(ultNsu || '0').padStart(15, '0');
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>41</cUFAutor>
          <CNPJ>${cnpj}</CNPJ>
          <distNSU>
            <ultNSU>${paddedNsu}</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}

async function sendDistDfeSoapToSefaz(params: {
  url: string;
  soapEnvelope: string;
  certPem: string;
  privateKeyPem: string;
  timeoutMs?: number;
}): Promise<{ statusCode: number; responseXml: string; durationMs: number }> {
  const { url, soapEnvelope, certPem, privateKeyPem, timeoutMs = 25000 } = params;
  const parsedUrl = new URL(url);

  const agent = new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    rejectUnauthorized: true,
    keepAlive: false,
  });

  const payloadBuffer = Buffer.from(soapEnvelope, 'utf-8');
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        agent,
        headers: {
          'Content-Type':
            'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
          'User-Agent': 'Apache-HttpClient/4.5.13 (Java/11.0.15)',
          'Content-Length': payloadBuffer.length,
        },
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf-8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 200,
            responseXml: body,
            durationMs: Date.now() - start,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout na comunicação com a SEFAZ após ${timeoutMs}ms.`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payloadBuffer);
    req.end();
  });
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Apenas POST é permitido.' });
  }

  // 1. Autenticação obrigatória
  if (!validateAuthToken(req.headers.authorization)) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token de autorização inválido ou ausente.',
    });
  }

  try {
    const payload = req.body || {};
    let { certPem, privateKeyPem, soapEnvelope, cleanCnpj, ultNsu, tpAmb = '1', environment = 'production' } = payload;

    if (!certPem || !privateKeyPem) {
      return res.status(400).json({
        error: 'CHAVES_OBRIGATORIAS',
        message: 'certPem e privateKeyPem são obrigatórios para a conexão mTLS.',
      });
    }

    if (!soapEnvelope) {
      if (!cleanCnpj) {
        return res.status(400).json({ error: 'CNPJ_OBRIGATORIO', message: 'CNPJ emitente não informado.' });
      }
      soapEnvelope = buildDefaultSoapEnvelope(cleanCnpj, ultNsu || '0', tpAmb);
    }

    const targetUrl = environment === 'production' ? SEFAZ_DFE_URL_PROD : SEFAZ_DFE_URL_HOM;
    const response = await sendDistDfeSoapToSefaz({
      url: targetUrl,
      soapEnvelope,
      certPem,
      privateKeyPem,
      timeoutMs: 25000,
    });

    return res.status(200).json({
      success: true,
      statusCode: response.statusCode,
      responseXml: response.responseXml,
      durationMs: response.durationMs,
    });
  } catch (err: any) {
    console.error('[SEFAZ Node Bridge] Erro mTLS:', err.message || 'Erro desconhecido');
    return res.status(502).json({
      success: false,
      error: 'SEFAZ_COMMUNICATION_ERROR',
      message: err.message || 'Erro na comunicação mTLS com a SEFAZ.',
    });
  }
}
