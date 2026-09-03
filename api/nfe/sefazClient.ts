import https from 'https';
import axios from 'axios';

export interface SefazSoapParams {
    url: string;
    action: string;
    xmlPayload: string;
    certPem: string;
    privateKeyPem: string;
}

/**
 * Envia mensagem SOAP 1.2 com mTLS direto para a SEFAZ
 */
export async function sendSoapToSefaz(params: SefazSoapParams): Promise<string> {
    const { url, action, xmlPayload, certPem, privateKeyPem } = params;

    // Criar agente HTTPS com mTLS (Chave privada + Certificado do cliente)
    const httpsAgent = new https.Agent({
        cert: certPem,
        key: privateKeyPem,
        rejectUnauthorized: true,
        keepAlive: false,
    });

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      ${xmlPayload}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    const response = await axios.post(url, soapEnvelope, {
        httpsAgent,
        headers: {
            'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
            'Accept': 'application/soap+xml, text/xml',
        },
        timeout: 25000,
    });

    return response.data;
}
