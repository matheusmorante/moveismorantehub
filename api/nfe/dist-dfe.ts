import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendDistDfeSoapToSefaz } from './distDfeClient.js';
import { extractCertificateAndKey } from './nfeSigner.js';

type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: any;
};

type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const SEFAZ_DFE_URL_PROD =
  'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
const SEFAZ_DFE_URL_HOM =
  'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';

function validateAuthToken(authHeader?: string): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const validTokens = [
    process.env.MORANTEHUB_MCP_ACCESS_TOKEN,
    process.env.SEFAZ_BRIDGE_TOKEN,
  ].filter(Boolean) as string[];

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'METHOD_NOT_ALLOWED', message: 'Apenas POST é permitido.' });
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
    let {
      soapEnvelope,
      cleanCnpj,
      ultNsu,
      tpAmb = '1',
      environment = 'production',
    } = payload;

    // A ponte nunca aceita chave privada do cliente ou da tabela settings.
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx || !password)
      return res.status(503).json({
        error: 'CERTIFICADO_NAO_CONFIGURADO',
        message: 'Certificado A1 não configurado no servidor fiscal.',
      });
    const cleanB64 = pfx.includes(',') ? pfx.split(',')[1] : pfx;
    const { certPem, privateKeyPem } = extractCertificateAndKey(
      cleanB64.trim().replace(/[\r\n\s]/g, ''),
      password
    );

    // 3. Monta o envelope se não foi passado pronto
    if (!soapEnvelope) {
      if (!cleanCnpj) {
        return res
          .status(400)
          .json({ error: 'CNPJ_OBRIGATORIO', message: 'CNPJ emitente não informado.' });
      }
      soapEnvelope = buildDefaultSoapEnvelope(cleanCnpj, ultNsu || '0', tpAmb);
    }

    // 4. Executa mTLS via Node.js
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
    // Log seguro: NUNCA expor segredos ou chaves
    console.error('[SEFAZ Node Bridge] Erro mTLS:', err.message || 'Erro desconhecido');
    return res.status(502).json({
      success: false,
      error: 'SEFAZ_COMMUNICATION_ERROR',
      message: err.message || 'Erro na comunicação mTLS com a SEFAZ.',
    });
  }
}
