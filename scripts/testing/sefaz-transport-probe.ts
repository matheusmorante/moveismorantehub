// Read-only WSDL GET: no SOAP, emission route, database, fiscal reservation or order mutation.
import https from 'node:https';
import type { TLSSocket } from 'node:tls';
import { performance } from 'node:perf_hooks';
import dotenv from 'dotenv';
import { extractCertificateAndKey } from '../../api/nfe/nfeSigner';
import { createSefazHttpsAgent } from '../../api/nfe/sefazHttpsAgent';
import { sefazTransportDiagnostic, type SefazTransportContext } from '../../api/nfe/sefazTransportDiagnostic';

dotenv.config({path: '.env.local', quiet: true});
const model = process.argv[2] === '55' ? '55' : '65';
const segment = model === '65' ? 'nfce' : 'nfe';
const url = new URL(`https://homologacao.${segment}.sefa.pr.gov.br/${segment}/NFeAutorizacao4?wsdl`);
const pfx = process.env.NFE_CERTIFICATE_BASE64;
if (!pfx) throw new Error('Certificado A1 de Development não configurado.');
const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
const agent = createSefazHttpsAgent(certificate.certPem, certificate.privateKeyPem);
const startedAt = performance.now();
const context: SefazTransportContext = {endpoint: `${url.origin}${url.pathname}`, model, environment: 2, timeoutMs: 15000, phase: 'dns'};
let peerSocket: TLSSocket | undefined;
const deadline = setTimeout(() => request.destroy(Object.assign(new Error('Timeout de transporte.'), {code: 'ETIMEDOUT'})), 15000);
const request = https.get(url, {agent}, response => {
  context.phase = 'response';
  let length = 0;
  response.on('data', (chunk: Buffer) => {length += chunk.length;});
  response.on('end', () => {
    clearTimeout(deadline);
    context.durationMs = Math.round(performance.now() - startedAt);
    console.log(JSON.stringify({success: response.statusCode === 200, runtime: process.version, method: 'GET', httpStatus: response.statusCode, responseBytes: length, clientCertificateValidated: true, serverCertificateAuthorized: peerSocket?.authorized === true, ...context}));
    if (response.statusCode !== 200) process.exitCode = 1;
    agent.destroy();
  });
});
request.on('socket', socket => {
  peerSocket = socket as TLSSocket;
  socket.once('lookup', error => {context.phase = error ? 'dns' : 'connect';});
  socket.once('connect', () => {context.phase = 'tls';});
  (socket as TLSSocket).once('secureConnect', () => {
    context.phase = 'request';
    context.tlsProtocol = (socket as TLSSocket).getProtocol() || undefined;
    const peer = (socket as TLSSocket).getPeerCertificate();
    context.peerCertificate = {subjectCN: peer.subject?.CN, issuerCN: peer.issuer?.CN, validFrom: peer.valid_from, validTo: peer.valid_to, fingerprint256: peer.fingerprint256};
  });
});
request.on('error', error => {
  clearTimeout(deadline);
  context.durationMs = Math.round(performance.now() - startedAt);
  Object.defineProperty(error, 'sefazTransportContext', {value: context});
  console.error(JSON.stringify({success: false, runtime: process.version, method: 'GET', ...sefazTransportDiagnostic(error)}));
  process.exitCode = 1;
  agent.destroy();
});
