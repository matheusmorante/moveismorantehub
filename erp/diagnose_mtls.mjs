import forge from 'node-forge';
import { Client } from 'pg';
import https from 'https';
import crypto from 'crypto';

async function diagnose() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query("SELECT (data->'certificateBase64') as b64, (data->'certificatePassword') as pass, (data->'companyCnpj') as cnpj FROM settings WHERE id = 'app'");
  await client.end();

  const row = res.rows[0];
  const b64 = row.b64;
  const pass = row.pass;
  const cnpjEsperado = (row.cnpj || '').replace(/\D/g, '');

  console.log('=== 1. DIAGNÓSTICO ESTRUTURAL DO CERTIFICADO ===');
  console.log('CNPJ configurado no ERP:', cnpjEsperado);
  console.log('Tamanho da carga Base64 do PFX:', b64?.length);

  const pfxDer = forge.util.decode64(b64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, pass);

  // Analisar bolsas de certificados
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  console.log(`Certificados na bolsa P12: ${certBags.length}`);
  console.log(`Chaves privadas na bolsa P12: ${keyBags.length}`);

  let privateKeyForge = null;
  if (keyBags.length > 0 && keyBags[0].key) {
    privateKeyForge = keyBags[0].key;
  }

  certBags.forEach((b, i) => {
    const cert = b.cert;
    const subject = cert.subject.attributes.map(a => `${a.shortName || a.name}=${a.value}`).join(', ');
    const issuer = cert.issuer.attributes.map(a => `${a.shortName || a.name}=${a.value}`).join(', ');
    console.log(`\n[Certificado #${i + 1}]`);
    console.log('  Subject:', subject);
    console.log('  Issuer: ', issuer);
    console.log('  Validade De: ', cert.validity.notBefore);
    console.log('  Validade Até:', cert.validity.notAfter);
    console.log('  Expirado?:   ', cert.validity.notAfter < new Date() ? 'SIM (EXPIRADO!)' : 'NÃO (VÁLIDO)');

    // Key Usage & Extended Key Usage
    const exts = cert.extensions || [];
    exts.forEach(ext => {
      if (ext.name === 'keyUsage' || ext.name === 'extKeyUsage') {
        console.log(`  Extensão [${ext.name}]:`, JSON.stringify(ext));
      }
    });
  });

  // 2. Identificar certificado folha e validar par de chaves
  const leafCertBag = certBags[0];
  const leafCert = leafCertBag.cert;
  const leafCertPem = forge.pki.certificateToPem(leafCert);
  const privateKeyPem = forge.pki.privateKeyToPem(privateKeyForge);

  console.log('\n=== 2. VALIDAÇÃO MATEMÁTICA DO PAR DE CHAVES (CERT + KEY) ===');
  // Comparar modulus RSA
  const certModulus = leafCert.publicKey.n.toString(16);
  const keyModulus = privateKeyForge.n.toString(16);
  const matches = certModulus === keyModulus;
  console.log('Modulus RSA do Certificado bate com a Chave Privada?:', matches ? 'SIM (PERFEITO)' : 'NÃO (INCOMPATÍVEL!)');

  // 3. Teste mTLS Local Direto
  console.log('\n=== 3. TESTE mTLS LOCAL COM NFeDistribuicaoDFe (AMBIENTE LOCAL) ===');
  const soapBody = '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
    '  <soap12:Body>' +
    '    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">' +
    '      <nfeDadosMsg>' +
    '        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">' +
    '          <tpAmb>1</tpAmb>' +
    '          <cUFAutor>41</cUFAutor>' +
    '          <CNPJ>' + cnpjEsperado + '</CNPJ>' +
    '          <distNSU>' +
    '            <ultNSU>000000000000000</ultNSU>' +
    '          </distNSU>' +
    '        </distDFeInt>' +
    '      </nfeDadosMsg>' +
    '    </nfeDistDFeInteresse>' +
    '  </soap12:Body>' +
    '</soap12:Envelope>';

  const startTime = Date.now();
  const req = https.request({
    hostname: 'www1.nfe.fazenda.gov.br',
    port: 443,
    path: '/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    method: 'POST',
    cert: leafCertPem,
    key: privateKeyPem,
    rejectUnauthorized: false,
    headers: {
      'Host': 'www1.nfe.fazenda.gov.br',
      'Content-Type': 'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
      'Content-Length': Buffer.byteLength(soapBody),
      'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)'
    }
  }, (resp) => {
    let raw = '';
    resp.on('data', chunk => raw += chunk);
    resp.on('end', () => {
      console.log(`[mTLS Local] Resposta HTTP recebida em ${Date.now() - startTime}ms!`);
      console.log('Status Code:', resp.statusCode);
      console.log('Headers:', resp.headers);
      console.log('Trecho do XML de resposta:', raw.substring(0, 500));
    });
  });

  req.on('error', (err) => {
    console.error(`[mTLS Local] Erro na conexão após ${Date.now() - startTime}ms:`, err.message);
  });

  req.write(soapBody);
  req.end();
}

diagnose().catch(console.error);
