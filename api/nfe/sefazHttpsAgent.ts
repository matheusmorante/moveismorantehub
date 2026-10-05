import { createPrivateKey, X509Certificate } from 'node:crypto';
import https from 'node:https';
import { getCACertificates } from 'node:tls';

// Keep the Node defaults and Windows/host trust for fiscal endpoints only.
const trustedSefazAuthorities = [
  ...new Set([...getCACertificates('default'), ...getCACertificates('system')]),
];

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

/** Fiscal clients use Node's default TLS trust, hostname validation and A1 mTLS. */
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
