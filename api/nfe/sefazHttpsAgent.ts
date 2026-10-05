import { createPrivateKey, X509Certificate } from 'node:crypto';
import https from 'node:https';
import { rootCertificates } from 'node:tls';
import { icpBrasilRoots } from './icpBrasilRoots';

// One portable trust policy: Node's bundled roots plus the verified SEFAZ-PR ICP root.
// Explicit `ca` replaces default/system/NODE_EXTRA_CA_CERTS trust for this Agent.
// It is intentional: fiscal TLS must work identically on Windows and Vercel.
const trustedSefazAuthorities = [...new Set([...rootCertificates, ...icpBrasilRoots])];

export function validateSefazClientCertificate(certPem: string, privateKeyPem: string): void {
  const certificate = new X509Certificate(certPem);
  if (certificate.ca || !certificate.checkPrivateKey(createPrivateKey(privateKeyPem)))
    throw Object.assign(new Error('Certificado A1 incompatível com a chave privada.'), {
      code: 'A1_KEY_MISMATCH',
    });
  const now = Date.now();
  if (Date.parse(certificate.validFrom) > now || Date.parse(certificate.validTo) <= now)
    throw Object.assign(new Error('Certificado A1 fora do período de validade.'), {
      code: 'A1_CERTIFICATE_EXPIRED',
    });
}

/** Fiscal clients share strict hostname validation, portable trust and A1 mTLS. */
export function createSefazHttpsAgent(certPem: string, privateKeyPem: string): https.Agent {
  validateSefazClientCertificate(certPem, privateKeyPem);
  return new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    ca: trustedSefazAuthorities,
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    keepAlive: false,
  });
}
