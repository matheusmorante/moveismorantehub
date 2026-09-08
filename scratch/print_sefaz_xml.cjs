const https = require('https');
const forge = require('node-forge');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hkoxhourxwlddgsfdgws.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI';

function extractPemFromPfx(pfxBase64, password) {
  const pfxDer = forge.util.decode64(pfxBase64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  let leafCertPem = '';
  let caChainPem = '';
  let keyPem = '';

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.key) keyPem = forge.pki.privateKeyToPem(safeBag.key);
      if (safeBag.cert) {
        const pem = forge.pki.certificateToPem(safeBag.cert);
        if (!leafCertPem) leafCertPem = pem;
        else caChainPem += pem + '\n';
      }
    }
  }

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
  if (keyBags.length > 0 && keyBags[0].key) keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  if (certBags.length > 0) {
    leafCertPem = forge.pki.certificateToPem(certBags[0].cert);
    caChainPem = certBags.slice(1).map((b) => forge.pki.certificateToPem(b.cert)).join('\n');
  }

  return { certPem: `${leafCertPem.trim()}\n${caChainPem.trim()}`.trim(), keyPem: keyPem.trim() };
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase.from('settings').select('data').eq('id', 'app').single();
  const { certificateBase64, certificatePassword, companyCnpj } = data.data;
  const cleanB64 = certificateBase64.includes(',') ? certificateBase64.split(',')[1] : certificateBase64;
  const { certPem, keyPem } = extractPemFromPfx(cleanB64.trim().replace(/[\r\n\s]/g, ''), certificatePassword);
  const cleanCnpj = companyCnpj.replace(/\D/g, '');

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>1</tpAmb>
          <cUFAutor>41</cUFAutor>
          <CNPJ>${cleanCnpj}</CNPJ>
          <distNSU>
            <ultNSU>000000000000000</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;

  const agent = new https.Agent({ cert: certPem, key: keyPem, rejectUnauthorized: true, keepAlive: false });

  const req = https.request({
    hostname: 'www1.nfe.fazenda.gov.br',
    port: 443,
    path: '/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    method: 'POST',
    agent,
    headers: {
      'Content-Type': 'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
      'User-Agent': 'Apache-HttpClient/4.5.13 (Java/11.0.15)',
      'Content-Length': Buffer.byteLength(soapEnvelope),
    },
    timeout: 25000,
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('FULL SEFAZ XML:');
      console.log(body);
    });
  });

  req.on('error', (err) => console.error('ERR:', err));
  req.write(soapEnvelope);
  req.end();
}

main();
