import axios from 'axios';
import { createSefazHttpsAgent } from './sefazHttpsAgent';

const NATIONAL_EVENT_ENDPOINTS = {
  1: 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
  2: 'https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
} as const;

export async function sendNationalEventOnce(input: {
  environment: 1 | 2;
  xmlPayload: string;
  certPem: string;
  privateKeyPem: string;
}): Promise<string> {
  const url = NATIONAL_EVENT_ENDPOINTS[input.environment];
  if (!url) throw new Error('Ambiente fiscal inválido para o Ambiente Nacional.');

  const endpoint = new URL(url);
  const allowedHost = input.environment === 1 ? 'www.nfe.fazenda.gov.br' : 'hom1.nfe.fazenda.gov.br';
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== allowedHost ||
    endpoint.pathname !== '/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx'
  ) {
    throw new Error('Endpoint de manifestação fora da lista oficial do Ambiente Nacional.');
  }

  const agent = createSefazHttpsAgent(input.certPem, input.privateKeyPem);
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${input.xmlPayload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;

  try {
    const response = await axios.post(url, envelope, {
      httpsAgent: agent,
      proxy: false,
      maxRedirects: 0,
      signal: AbortSignal.timeout(25_000),
      headers: {
        'Content-Type':
          'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"',
        Accept: 'application/soap+xml, text/xml',
      },
      timeout: 25_000,
    });
    if (typeof response.data !== 'string' || /<(?:[\w.-]+:)?Fault\b/i.test(response.data)) {
      throw new Error('O Ambiente Nacional não confirmou o processamento do evento.');
    }
    return response.data;
  } finally {
    agent.destroy();
  }
}
