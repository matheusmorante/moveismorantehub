export const NFE_CCE_CONDITIONS_OF_USE =
  'A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal, desde que o erro não esteja relacionado com: I - as variáveis que determinam o valor do imposto tais como: base de cálculo, alíquota, diferença de preço, quantidade, valor da operação ou da prestação; II - a correção de dados cadastrais que implique mudança do remetente ou do destinatário; III - a data de emissão ou de saída.';

export type NfeCceXmlInput = {
  accessKey: string;
  environment: 1 | 2;
  issuerCnpj: string;
  sequence: number;
  correction: string;
  issuedAt: string;
  batchId: string;
};

export const canIssueCce = (doc: { modelo?: '55' | '65'; status?: string } | null | undefined) => {
  if (!doc) return { canIssue: false, reason: 'Documento não informado' };
  if (doc.modelo === '65') {
    return {
      canIssue: false,
      reason: 'A SEFAZ não permite Carta de Correção (CC-e) para NFC-e (Modelo 65).',
    };
  }
  if (!['autorizada', 'homologada'].includes(doc.status || '')) {
    return { canIssue: false, reason: 'Apenas NF-e autorizadas podem receber CC-e.' };
  }
  return { canIssue: true };
};

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[
        character
      ] as string
  );

export const validateNfeCce = (correction: string): string | null => {
  const normalized = correction.trim();
  const length = Array.from(normalized).length;
  if (length < 15 || length > 1000)
    return 'O texto da CC-e deve ter entre 15 e 1.000 caracteres.';
  const hasInvalidXmlControlCharacter = Array.from(normalized).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d;
  });
  if (hasInvalidXmlControlCharacter)
    return 'O texto da CC-e contém caracteres que não podem ser enviados no XML.';
  return null;
};

export const buildNfeCceXml = (input: NfeCceXmlInput): string => {
  const correction = input.correction.trim();
  const correctionError = validateNfeCce(correction);
  if (correctionError) throw new Error(correctionError);
  if (!/^\d{44}$/.test(input.accessKey)) throw new Error('Chave da NF-e inválida para CC-e.');
  if (!/^\d{14}$/.test(input.issuerCnpj)) throw new Error('CNPJ do emitente inválido para CC-e.');
  if (![1, 2].includes(input.environment)) throw new Error('Ambiente fiscal inválido para CC-e.');
  if (!Number.isInteger(input.sequence) || input.sequence < 1 || input.sequence > 20)
    throw new Error('A sequência de CC-e deve estar entre 1 e 20.');
  if (!/^\d{1,15}$/.test(input.batchId)) throw new Error('Identificador do lote da CC-e inválido.');
  if (!Number.isFinite(Date.parse(input.issuedAt))) throw new Error('Data da CC-e inválida.');

  const sequence = String(input.sequence).padStart(2, '0');
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${input.batchId}</idLote><evento versao="1.00"><infEvento Id="ID110110${input.accessKey}${sequence}"><cOrgao>41</cOrgao><tpAmb>${input.environment}</tpAmb><CNPJ>${input.issuerCnpj}</CNPJ><chNFe>${input.accessKey}</chNFe><dhEvento>${escapeXml(input.issuedAt)}</dhEvento><tpEvento>110110</tpEvento><nSeqEvento>${input.sequence}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Carta de Correção</descEvento><xCorrecao>${escapeXml(correction)}</xCorrecao><xCondUso>${escapeXml(NFE_CCE_CONDITIONS_OF_USE)}</xCondUso></detEvento></infEvento></evento></envEvento>`;
};
