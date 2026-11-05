import https from 'node:https';
import { getCACertificates, type TLSSocket } from 'node:tls';
import { performance } from 'node:perf_hooks';
import { extractCertificateAndKey } from '../../../api/nfe/nfeSigner';
import { createSefazHttpsAgent } from '../../../api/nfe/sefazHttpsAgent';
import { icpBrasilRoots } from '../../../api/nfe/icpBrasilRoots';

function chainMetadata(socket?: TLSSocket) {
  if (!socket) return [];
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let cert = socket.getPeerCertificate(true);
  while (cert?.fingerprint256 && !seen.has(cert.fingerprint256)) {
    seen.add(cert.fingerprint256);
    chain.push({ subject: cert.subject, issuer: cert.issuer, validFrom: cert.valid_from,
      validTo: cert.valid_to, fingerprint256: cert.fingerprint256 });
    cert = cert.issuerCertificate;
  }
  return chain;
}

export async function wsdl(model: string, service: string, policy: string, environment: number) {
  const segment = model === '65' ? 'nfce' : 'nfe';
  const prefix = environment === 2 ? 'homologacao.' : '';
  const url = new URL(`https://${prefix}${segment}.sefa.pr.gov.br/${segment}/${service}?wsdl`);
  const cert = policy === 'server-only' ? undefined
    : extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || '', process.env.NFE_CERTIFICATE_PASSWORD || '');
  const agent = policy === 'erp' && cert ? createSefazHttpsAgent(cert.certPem, cert.privateKeyPem)
    : new https.Agent({cert: cert?.certPem, key: cert?.privateKeyPem,
      ...(policy === 'native-default' ? {} : {ca:[...getCACertificates('bundled'), ...icpBrasilRoots]}),
      rejectUnauthorized: true, minVersion: 'TLSv1.2', keepAlive: false});
  const started = performance.now();
  let socket: TLSSocket | undefined;
  return await new Promise(resolve => {
    const finish = (data: Record<string, unknown>) => {
      clearTimeout(deadline);
      const result = { model, environment, service, policy, endpoint: url.toString(),
        durationMs: Math.round(performance.now() - started), protocol: socket?.getProtocol(), cipher: socket?.getCipher(),
        authorized: socket?.authorized || false, authorizationError: socket?.authorizationError || null,
        chain: chainMetadata(socket), ...data };
      agent.destroy(); resolve(result);
    };
    const request = https.get(url, {agent}, response => {
      let bytes = 0; response.on('data', chunk => {bytes += chunk.length;});
      response.on('end', () => finish({http: response.statusCode, bytes, success: response.statusCode === 200}));
      response.on('error', error => finish({error: (error as NodeJS.ErrnoException).code || 'RESPONSE_ERROR', success: false}));
    });
    const deadline = setTimeout(() => request.destroy(Object.assign(new Error('Timeout'), {code: 'ETIMEDOUT'})), 15000);
    request.on('socket', s => { socket = s as TLSSocket; });
    request.on('error', error => finish({error: (error as NodeJS.ErrnoException).code || 'HTTPS_ERROR', success: false}));
  });
}
