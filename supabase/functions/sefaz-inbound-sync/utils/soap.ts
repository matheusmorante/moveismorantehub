export function buildSoapEnvelope(cleanCnpj: string, nsu: string, tpAmb: "1" | "2", accessKey?: string): string {
  const paddedNsu = nsu.padStart(15, "0");
  const query = accessKey
    ? `<consChNFe><chNFe>${accessKey}</chNFe></consChNFe>`
    : `<distNSU><ultNSU>${paddedNsu}</ultNSU></distNSU>`;
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>41</cUFAutor>
          <CNPJ>${cleanCnpj}</CNPJ>
          ${query}
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}
