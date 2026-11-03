import fs from 'node:fs';
import { createHash, X509Certificate } from 'node:crypto';
import forge from 'node-forge';
import { extractCertificateAndKey } from '../../../api/nfe/nfeSigner';

const originalPfx = 'C:/Users/Rosilene/Downloads/MOVEIS MORANTE LTDA44512248000107.pfx';
const pattern = /^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_SUPABASE_|VERCEL_ENV$|NODE_ENV$|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$|NODE_OPTIONS$|HTTPS?_PROXY$|NO_PROXY$)/;
const mandatory = ['NFE_CERTIFICATE_BASE64', 'NFE_CERTIFICATE_PASSWORD',
  'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED', 'SUPABASE_URL',
  'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const safeSubject = (s: string) => s.replace(/\b\d{11}\b/g, '[CPF omitido]');
const certificateMetadata = (cert: X509Certificate) => ({
  subject: safeSubject(cert.subject), issuer: safeSubject(cert.issuer), ca: cert.ca,
  validFrom: cert.validFrom, validTo: cert.validTo, fingerprint256: cert.fingerprint256,
  currentlyValid: Date.parse(cert.validFrom) <= Date.now() && Date.parse(cert.validTo) > Date.now(),
});

export function inspectEnv(env: NodeJS.ProcessEnv, digest: (value: string) => string) {
  const detectedNames = Object.keys(env).filter(k =>
    pattern.test(k) && k !== 'NFE_ENVIRONMENT' && k !== 'NFE_PRODUCTION_ENABLED');
  const variables = Object.fromEntries([...new Set([...mandatory, ...detectedNames])].sort().map(name => {
    const value = env[name];
    return [name, { present: value !== undefined && value !== '', length: value?.length || 0,
      hash: value ? digest(value) : null,
      ...(['VERCEL_ENV', 'NODE_ENV', 'NODE_TLS_REJECT_UNAUTHORIZED'].includes(name) ? { value: value ?? null } : {}),
    }];
  }));
  const base64 = env.NFE_CERTIFICATE_BASE64 || '';
  const clean = base64.replace(/\s/g, '');
  const strictBase64 = Boolean(clean) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean);
  const decoded = Buffer.from(clean, 'base64');
  let certificate: Record<string, unknown> = { strictBase64, decodedBytes: decoded.length, pkcs12Valid: false };
  if (strictBase64) {
    try {
      const extracted = extractCertificateAndKey(base64, env.NFE_CERTIFICATE_PASSWORD || '');
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(decoded.toString('binary')), env.NFE_CERTIFICATE_PASSWORD || '');
      const chain = p12.getBags({bagType: forge.pki.oids.certBag})[forge.pki.oids.certBag] || [];
      certificate = { ...certificate, pkcs12Valid: true, passwordCorrect: true,
        leaf: certificateMetadata(new X509Certificate(extracted.certPem)),
        chain: chain.filter(bag => bag.cert).map(bag => certificateMetadata(new X509Certificate(forge.pki.certificateToPem(bag.cert!)))),
      };
    } catch (error) { certificate.errorCode = (error as {code?: string}).code || 'PFX_PARSE_OR_PASSWORD_FAILED'; }
  }
  let extraCA: Record<string, unknown> = { configured: Boolean(env.NODE_EXTRA_CA_CERTS), exists: false };
  if (env.NODE_EXTRA_CA_CERTS && fs.existsSync(env.NODE_EXTRA_CA_CERTS)) {
    const pem = fs.readFileSync(env.NODE_EXTRA_CA_CERTS, 'utf8');
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
    try { extraCA = {...extraCA, exists: true, certificates: blocks.map(block => certificateMetadata(new X509Certificate(block)))}; }
    catch { extraCA = {...extraCA, exists: true, validPem: false}; }
  }
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const original = fs.existsSync(originalPfx) ? fs.readFileSync(originalPfx) : undefined;
  return {variables, certificate, extraCA,
    originalPfx: {exists:Boolean(original),bytes:original?.length,
      sha256:original ? createHash('sha256').update(original).digest('hex') : null,
      matchesDecoded:original && clean ? original.equals(decoded) : null},
    supabaseRef: supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null};
}
