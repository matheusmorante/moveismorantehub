// Verify the existing HML document in memory. Never prints certificate subjects or XML.
const assert = require('node:assert/strict');
const { X509Certificate } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { SignedXml } = require('xml-crypto');
async function main() {
  const documentId = process.argv[2];
  if (!/^[0-9a-f-]{36}$/i.test(documentId || '')) throw new Error('Exact HML document ID required.');
  const keys = spawnSync('npx.cmd', ['--yes', 'supabase', 'projects', 'api-keys', '--project-ref', 'hkoxhourxwlddgsfdgws', '--output', 'json'],
    { shell: true, windowsHide: true, encoding: 'utf8', timeout: 60000 });
  if (keys.status !== 0) throw new Error('Authorized document audit unavailable.');
  const serviceKey = JSON.parse(keys.stdout).find((key) => key.name === 'service_role')?.api_key;
  if (!serviceKey) throw new Error('Authorized document audit key unavailable.');
  const db = createClient('https://hkoxhourxwlddgsfdgws.supabase.co', serviceKey, { auth: { persistSession: false } });
  const { data: doc, error } = await db.from('nfe_documents').select('id,ambiente,xml_nfe').eq('id', documentId).single();
  if (error || !doc || doc.ambiente !== 2) throw new Error('Existing HML document unavailable.');
  const xml = doc.xml_nfe;
  assert.match(xml, /<tpAmb>2<\/tpAmb>/);
  const der = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/)?.[1];
  if (!der) throw new Error('Signed certificate missing.');
  const certificate = new X509Certificate(Buffer.from(der, 'base64'));
  const verifier = new SignedXml({ publicCert: certificate.toString(), getCertFromKeyInfo: () => certificate.toString() });
  verifier.loadSignature(xml.match(/<Signature\b[\s\S]*?<\/Signature>/)?.[0] || '');
  assert.equal(verifier.checkSignature(xml), true);
  const validNow = Date.parse(certificate.validFrom) <= Date.now() && Date.parse(certificate.validTo) >= Date.now();
  console.log(JSON.stringify({ stage: 'real-document-signature', environment: 2,
    signatureValid: true, certificateValidNow: validNow, certificateExpiry: certificate.validTo }));
}
main().catch(() => { console.error('HML document cryptographic verification failed; sensitive details withheld.'); process.exitCode = 1; });
