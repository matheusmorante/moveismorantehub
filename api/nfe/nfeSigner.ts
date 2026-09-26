import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';

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
    return signFiscalEventXml(xml, privateKeyPem, certDerBase64, 'infNFe');
}

/** Assina eventos fiscais NF-e (como infEvento) com XMLDSig exigida pela SEFAZ. */
export function signNfeEventXml(xml: string, privateKeyPem: string, certDerBase64: string): string {
    return signFiscalEventXml(xml, privateKeyPem, certDerBase64, 'infEvento');
}

function signFiscalEventXml(xml: string, privateKeyPem: string, certDerBase64: string, elementName: 'infNFe' | 'infEvento'): string {
    // A NF-e exige XMLDSig sobre o elemento infNFe. O xml-crypto aplica a
    // canonização C14N e os transforms XMLDSig corretamente; a implementação
    // manual anterior apenas removia espaços, o que podia invalidar o Digest.
    const elementMatch = xml.match(new RegExp(`<${elementName}\\s+Id="([^"]+)"[^>]*>[\\s\\S]*?<\\/${elementName}>`));
    if (!elementMatch) {
        throw new Error(`Tag <${elementName} Id="..."> não encontrada no XML para assinatura.`);
    }

    const elementId = elementMatch[1];
    const cleanCertBase64 = certDerBase64.replace(/[\r\n\s]/g, '');
    const signer = new SignedXml({
        privateKey: privateKeyPem,
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        getKeyInfoContent: () => `<X509Data><X509Certificate>${cleanCertBase64}</X509Certificate></X509Data>`,
    });

    signer.addReference({
        xpath: `//*[local-name(.)='${elementName}']`,
        transforms: [
            'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
            'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
        ],
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
        uri: `#${elementId}`,
    });

    signer.computeSignature(xml, {
        location: { reference: `//*[local-name(.)='${elementName}']`, action: 'after' },
    });

    return signer.getSignedXml();
}
