import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
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

    // 2. Se as chaves PEM não forem passadas, carrega do Supabase com segurança
    if (!certPem || !privateKeyPem) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: settingsRow, error: settingsError } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'app')
        .single();

      if (settingsError || !settingsRow?.data) {
        return res.status(500).json({ error: 'FALHA_CONFIGURACOES', message: 'Configurações fiscais não encontradas.' });
      }

      const { certificateBase64, certificatePassword, companyCnpj } = settingsRow.data;
      if (!certificateBase64 || !certificatePassword) {
        return res.status(400).json({ error: 'CERTIFICADO_NAO_CONFIGURADO', message: 'Certificado A1 ou senha ausentes no banco.' });
      }

      const cleanB64 = certificateBase64.includes(',') ? certificateBase64.split(',')[1] : certificateBase64;
      const extracted = extractCertificateAndKey(cleanB64.trim().replace(/[\r\n\s]/g, ''), certificatePassword);
      certPem = extracted.certPem;
      privateKeyPem = extracted.privateKeyPem;

      if (!cleanCnpj && companyCnpj) {
        cleanCnpj = companyCnpj.replace(/\D/g, '');
      }
    }

    // 3. Monta o envelope se não foi passado pronto
    if (!soapEnvelope) {
      if (!cleanCnpj) {
        return res.status(400).json({ error: 'CNPJ_OBRIGATORIO', message: 'CNPJ emitente não informado.' });
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
