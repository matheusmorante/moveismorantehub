import { SignedXml } from 'xml-crypto';
import { allDescendants, child, createStrictXmlParser, localName } from './fiscalXmlAuditDom';

export function assertNfeSignature(xml: string, expectedCertificatePem?: string) {
  const parseErrors: string[] = [];
  const parsed = createStrictXmlParser(parseErrors).parseFromString(xml, 'application/xml');
  if (parseErrors.length || !parsed.documentElement)
    throw new Error(`XML assinado inválido: ${parseErrors.join('; ') || 'raiz ausente'}`);
  const signatures = allDescendants(parsed.documentElement, 'Signature');
  const infNfes = allDescendants(parsed.documentElement, 'infNFe');
  if (
    localName(parsed.documentElement) !== 'NFe' ||
    signatures.length !== 1 ||
    infNfes.length !== 1 ||
    child(parsed.documentElement, 'infNFe') !== infNfes[0] ||
    child(parsed.documentElement, 'Signature') !== signatures[0]
  )
    throw new Error('XML fiscal precisa conter uma NF-e e uma assinatura XMLDSig.');
  const elementId = infNfes[0].getAttribute('Id');
  const signature = signatures[0];
  const references = allDescendants(signature, 'Reference');
  const signatureMethod = child(child(signature, 'SignedInfo'), 'SignatureMethod')?.getAttribute('Algorithm');
  const digestMethod = child(references[0] || null, 'DigestMethod')?.getAttribute('Algorithm');
  const transforms = allDescendants(references[0] || signature, 'Transform').map((node) => node.getAttribute('Algorithm'));
  if (
    !elementId ||
    references.length !== 1 ||
    references[0].getAttribute('URI') !== `#${elementId}` ||
    signatureMethod !== 'http://www.w3.org/2000/09/xmldsig#rsa-sha1' ||
    digestMethod !== 'http://www.w3.org/2000/09/xmldsig#sha1' ||
    !transforms.includes('http://www.w3.org/2000/09/xmldsig#enveloped-signature') ||
    !transforms.includes('http://www.w3.org/TR/2001/REC-xml-c14n-20010315') ||
    !allDescendants(signature, 'SignatureValue')[0]?.textContent?.trim() ||
    !allDescendants(signature, 'X509Certificate')[0]?.textContent?.trim()
  )
    throw new Error('Assinatura fiscal incompleta ou sem referência ao infNFe desta nota.');
  const verifier = new SignedXml({
    getCertFromKeyInfo: SignedXml.getCertFromKeyInfo,
    ...(expectedCertificatePem ? { publicCert: expectedCertificatePem } : {}),
  });
  verifier.loadSignature(signature.toString());
  if (!verifier.checkSignature(xml))
    throw new Error('A assinatura XMLDSig não confere com o conteúdo final do XML fiscal.');
}
