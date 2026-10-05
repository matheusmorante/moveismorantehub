import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import { createSefazHttpsAgent } from './sefazHttpsAgent.ts';
import { extractCertificateAndKey } from './nfeSigner.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pfxBase64 =
      process.env.NFE_CERTIFICATE_BASE64 || process.env.SEFAZ_CLIENT_A1_PFX_BASE64 || '';
    const pfxPassword =
      process.env.NFE_CERTIFICATE_PASSWORD || process.env.SEFAZ_CLIENT_A1_PFX_PASSWORD || '';
    const certData = extractCertificateAndKey(pfxBase64, pfxPassword);

    const agent = createSefazHttpsAgent(certData.certPem, certData.privateKeyPem);

    const start = Date.now();
    const result = await new Promise((resolve) => {
      const request = https.request(
        {
          host: 'homologacao.nfe.sefa.pr.gov.br',
          port: 443,
          method: 'GET',
          path: '/',
          agent,
        },
        (resp) => {
          resolve({ status: resp.statusCode, duration: Date.now() - start });
          resp.on('data', () => {});
        }
      );
      request.on('error', (err) => resolve({ error: err.message, code: (err as any).code }));
      request.end();
    });

    res.status(200).json({
      extraCaConfigured: Boolean(process.env.NODE_EXTRA_CA_CERTS),
      extraCaPath: process.env.NODE_EXTRA_CA_CERTS,
      tlsResult: result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
