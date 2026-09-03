import forge from 'node-forge';
import crypto from 'crypto';

export interface ExtractedCertData {
    privateKeyPem: string;
    certPem: string;
    certDerBase64: string;
}

/**
 * Lê o certificado .pfx em base64 e a senha, extraindo a chave privada e o certificado em PEM
 */
export function extractCertificateAndKey(pfxBase64: string, password: string): ExtractedCertData {
    const pfxDer = forge.util.decode64(pfxBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password || '');

    // Obter chave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] 
        || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];

    if (!keyBag || !keyBag.key) {
        throw new Error('Chave privada RSA não encontrada no arquivo .pfx.');
    }

    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);

    // Obter certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    if (!certBag || !certBag.cert) {
        throw new Error('Certificado X.509 não encontrado no arquivo .pfx.');
    }

    const certPem = forge.pki.certificateToPem(certBag.cert);
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes();
    const certDerBase64 = forge.util.encode64(certDer);

    return {
        privateKeyPem,
        certPem,
        certDerBase64,
    };
}

/**
 * Canonização C14N inclusiva sem comentários
 */
export function canonicalizeC14N(xml: string): string {
    return xml
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/>\s+</g, '><')
        .trim();
}

/**
 * Aplica a assinatura digital padrão XMLDSig (RSA-SHA1) na tag <infNFe Id="..."> conforme o MOC da SEFAZ
 */
export function signNfeXml(xml: string, privateKeyPem: string, certDerBase64: string): string {
    // 1. Extrair o elemento <infNFe Id="...">...</infNFe>
    const infNFeMatch = xml.match(/<infNFe\s+Id="([^"]+)"[^>]*>[\s\S]*?<\/infNFe>/);
    if (!infNFeMatch) {
        throw new Error('Tag <infNFe Id="..."> não encontrada no XML para assinatura.');
    }

    const infNFeXml = infNFeMatch[0];
    const infNFeId = infNFeMatch[1];

    // 2. Canonizar e calcular o DigestValue (SHA-1 em Base64) do infNFe
    const canonicalInfNFe = canonicalizeC14N(infNFeXml);
    const digestValue = crypto
        .createHash('sha1')
        .update(canonicalInfNFe, 'utf8')
        .digest('base64');

    // 3. Montar a tag <SignedInfo>
    const signedInfoXml = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${infNFeId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

    // 4. Calcular o SignatureValue (Assinatura RSA-SHA1 do SignedInfo canonizado)
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(signedInfoXml, 'utf8');
    const signatureValue = signer.sign(privateKeyPem, 'base64');

    // 5. Montar o bloco completo <Signature>
    const cleanCertBase64 = certDerBase64.replace(/[\r\n\s]/g, '');
    const signatureBlock = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoXml}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${cleanCertBase64}</X509Certificate></X509Data></KeyInfo></Signature>`;

    // 6. Inserir a assinatura antes do fechamento </NFe>
    return xml.replace('</NFe>', `${signatureBlock}</NFe>`);
}
