import axios from 'axios';
import type { TLSSocket } from 'node:tls';
import { performance } from 'node:perf_hooks';
import { createSefazHttpsAgent } from './sefazHttpsAgent';
import type { SefazTransportContext } from './sefazTransportDiagnostic';
import { simulateFiscalE2eSoap } from './sefazE2eSimulator';

export interface SefazSoapParams {
  url: string;
  action: string;
  xmlPayload: string;
  certPem: string;
  privateKeyPem: string;
  serviceNamespace?: string;
}

/**
 * Envia mensagem SOAP 1.2 com mTLS direto para a SEFAZ
 */
export async function sendSoapToSefaz(params: SefazSoapParams): Promise<string> {
  const startedAt = performance.now();
  const {
    url,
    action,
    xmlPayload,
    certPem,
    privateKeyPem,
    serviceNamespace = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4',
  } = params;

  const simulatedResponse = simulateFiscalE2eSoap({ url, action, xmlPayload });
  if (simulatedResponse !== null) return simulatedResponse;

  // Criar agente HTTPS com mTLS (Chave privada + Certificado do cliente)
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    target.username ||
    target.password ||
    (target.port && target.port !== '443') ||
    ![
      'nfe.sefa.pr.gov.br',
      'nfce.sefa.pr.gov.br',
      'homologacao.nfe.sefa.pr.gov.br',
      'homologacao.nfce.sefa.pr.gov.br',
    ].includes(target.hostname)
  )
    throw Object.assign(new Error('Endpoint fiscal não é um endereço HTTPS oficial da SEFAZ-PR.'), {
      code: 'SEFAZ_ENDPOINT_INVALID',
    });
  const expectedEnvironment = target.hostname.startsWith('homologacao.') ? '2' : '1';
  const expectedModel = target.hostname.includes('nfce.') ? '65' : '55';
  const environments = [
    ...xmlPayload.matchAll(/<(?:[\w-]+:)?tpAmb>\s*([^<]+)\s*<\/(?:[\w-]+:)?tpAmb>/g),
  ];
  const models = [...xmlPayload.matchAll(/<(?:[\w-]+:)?mod>\s*([^<]+)\s*<\/(?:[\w-]+:)?mod>/g)];
  if (
    environments.some((match) => match[1].trim() !== expectedEnvironment) ||
    models.some((match) => match[1].trim() !== expectedModel)
  )
    throw Object.assign(
      new Error('XML fiscal incompatível com o ambiente ou modelo do endpoint SEFAZ.'),
      {
        code: 'SEFAZ_ENVIRONMENT_MODEL_MISMATCH',
      }
    );
  const httpsAgent = createSefazHttpsAgent(certPem, privateKeyPem);
  const context: SefazTransportContext = {
    endpoint: `${target.origin}${target.pathname}`,
    phase: 'dns',
    timeoutMs: 25000,
    model:
      target.hostname.includes('.nfce.') || target.hostname === 'nfce.sefa.pr.gov.br' ? '65' : '55',
    environment: target.hostname.startsWith('homologacao.') ? 2 : 1,
  };
  const createConnection = httpsAgent.createConnection.bind(httpsAgent);
  httpsAgent.createConnection = (options, callback) => {
    const socket = createConnection(options, callback) as TLSSocket | null | undefined;
    socket?.once('lookup', (error) => {
      context.phase = error ? 'dns' : 'connect';
    });
    socket?.once('connect', () => {
      context.phase = 'tls';
    });
    socket?.once('secureConnect', () => {
      context.phase = 'request';
      context.tlsProtocol = socket.getProtocol() || undefined;
      const peer = socket.getPeerCertificate();
      context.peerCertificate = {
        subjectCN: peer?.subject?.CN,
        issuerCN: peer?.issuer?.CN,
        validFrom: peer?.valid_from,
        validTo: peer?.valid_to,
        fingerprint256: peer?.fingerprint256,
      };
    });
    return socket;
  };

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="${serviceNamespace}">${xmlPayload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const deadline = AbortSignal.timeout(25000);

  try {
    const response = await axios.post(url, soapEnvelope, {
      httpsAgent,
      proxy: false,
      maxRedirects: 0,
      signal: deadline,
      headers: {
        'Content-Type': `application/soap+xml; charset=utf-8; action="${action}"`,
        'Content-Length': Buffer.byteLength(soapEnvelope, 'utf8'),
        Accept: 'application/soap+xml, text/xml',
      },
      timeout: 25000,
    });
    context.phase = 'response';
    if (typeof response.data === 'string' && /<(?:[\w-]+:)?Fault\b/i.test(response.data))
      throw Object.assign(new Error('A SEFAZ retornou uma falha SOAP sem confirmação fiscal.'), {
        code: 'SEFAZ_SOAP_FAULT',
        response: { status: response.status },
      });
    return response.data;
  } catch (error) {
    const transportError = deadline.aborted
      ? Object.assign(new Error('Timeout de transporte SEFAZ.'), {
          code: 'ETIMEDOUT',
          cause: error,
        })
      : error;
    context.durationMs = Math.round(performance.now() - startedAt);
    if (axios.isAxiosError(transportError) && transportError.response) context.phase = 'response';
    if (transportError && typeof transportError === 'object' && Object.isExtensible(transportError))
      Object.defineProperty(transportError, 'sefazTransportContext', {
        value: context,
        configurable: true,
      });
    throw transportError;
  } finally {
    httpsAgent.destroy();
  }
}
