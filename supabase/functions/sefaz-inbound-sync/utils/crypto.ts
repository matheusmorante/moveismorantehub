import forge from "https://esm.sh/node-forge@1.3.1";

export function extractPemFromPfx(pfxBase64: string, password: string): { certPem: string; keyPem: string } {
  const pfxDer = forge.util.decode64(pfxBase64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

  let leafCertPem = "";
  let caChainPem = "";
  let keyPem = "";

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.key) {
        keyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
      if (safeBag.cert) {
        const pem = forge.pki.certificateToPem(safeBag.cert);
        // O primeiro certificado associado à chave privada é o folha
        if (!leafCertPem) {
          leafCertPem = pem;
        } else {
          caChainPem += pem + "\n";
        }
      }
    }
  }

  // Se o P12 tiver a propriedade getBags
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  if (keyBags.length > 0 && keyBags[0].key) {
    keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
  }

  if (certBags.length > 0) {
    leafCertPem = forge.pki.certificateToPem(certBags[0].cert);
    caChainPem = certBags.slice(1).map((b: any) => forge.pki.certificateToPem(b.cert)).join("\n");
  }

  if (!leafCertPem || !keyPem) {
    throw new Error("Não foi possível extrair o certificado e/ou a chave privada do arquivo .pfx com a senha fornecida.");
  }

  // Enviar o certificado folha seguido das CAs intermediárias da cadeia ICP-Brasil
  // A SEFAZ derruba a conexão se a cadeia completa não for enviada no handshake TLS
  const fullCertChainPem = caChainPem ? `${leafCertPem.trim()}\n${caChainPem.trim()}` : leafCertPem.trim();
  return { certPem: fullCertChainPem, keyPem: keyPem.trim() };
}
