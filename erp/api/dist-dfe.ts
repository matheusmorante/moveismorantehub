import type { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import forge from 'node-forge';

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
const CERTIFICATE_HEALTH_VERSION = 'cert-a1-2026-09-28-v2';
const EXPECTED_ISSUER_CNPJ = '44512248000107';

function extractCertificateAndKey(pfxBase64: string, password: string) {
  const pfxAsn1 = forge.asn1.fromDer(forge.util.decode64(pfxBase64));
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    ?? p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  if (!keyBag?.key) throw new Error('Chave privada não encontrada no PFX.');

  const certBag = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) throw new Error('Certificado X.509 não encontrado no PFX.');

  return {
    certPem: forge.pki.certificateToPem(certBag.cert),
    privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
  };
}

function validateAuthToken(authHeader?: string): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const validTokens = [
    process.env.MORANTEHUB_MCP_ACCESS_TOKEN,
    process.env.SEFAZ_BRIDGE_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Diagnóstico temporário e somente leitura para confirmar o runtime de Preview.
  // Não retorna o PFX, a senha, a chave privada ou o certificado.
  if (req.method === 'GET') {
    if (process.env.VERCEL_ENV !== 'preview') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx || !password) {
      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        configured: false,
        validPfx: false,
        hasPrivateKey: false,
        cnpjMatches: false,
        inValidityWindow: false,
      });
    }

    let failureStage = 'base64';
    try {
      const cleanBase64 = (pfx.includes(',') ? pfx.split(',').pop()! : pfx)
        .replace(/[\r\n\s]/g, '');
      failureStage = 'pkcs12';
      const { certPem, privateKeyPem } = extractCertificateAndKey(cleanBase64, password);
      failureStage = 'x509';
      const certificate = new X509Certificate(certPem);
      failureStage = 'private-key';
      const privateKey = createPrivateKey(privateKeyPem);
      const hasPrivateKey = certificate.checkPrivateKey(privateKey);
      failureStage = 'certificate-metadata';
      const subjectCnpj = certificate.subject.match(/(?:^|\n)serialNumber\s*=\s*(\d{14})\b/i)?.[1]
        ?? certificate.subject.match(/\b(\d{14})\b/)?.[1]
        ?? null;
      const now = Date.now();
      const notBefore = Date.parse(certificate.validFrom);
      const notAfter = Date.parse(certificate.validTo);

      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        configured: true,
        validPfx: true,
        hasPrivateKey,
        cnpjMatches: subjectCnpj === EXPECTED_ISSUER_CNPJ,
        inValidityWindow: Number.isFinite(notBefore) && Number.isFinite(notAfter)
          && now >= notBefore && now <= notAfter,
        notBefore: Number.isFinite(notBefore) ? new Date(notBefore).toISOString() : null,
        notAfter: Number.isFinite(notAfter) ? new Date(notAfter).toISOString() : null,
      });
    } catch {
      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        failureStage,
        configured: true,
        validPfx: false,
        hasPrivateKey: false,
        cnpjMatches: false,
        inValidityWindow: false,
      });
    }
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
    let { soapEnvelope, cleanCnpj, ultNsu, tpAmb = '1', environment = 'production' } = payload;

    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx || !password) {
      return res.status(503).json({
        error: 'CERTIFICADO_NAO_CONFIGURADO',
        message: 'Certificado A1 não configurado no servidor fiscal.',
      });
    }
    const cleanBase64 = (pfx.includes(',') ? pfx.split(',').pop()! : pfx)
      .replace(/[\r\n\s]/g, '');
    const { certPem, privateKeyPem } = extractCertificateAndKey(cleanBase64, password);

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
