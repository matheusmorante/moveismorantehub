import fs from 'fs';
import tls from 'tls';
import https from 'https';
import crypto from 'crypto';
import { execSync } from 'child_process';
import axios from 'axios';
import { createSefazHttpsAgent } from './api/nfe/sefazHttpsAgent.ts';
import { icpBrasilRoots } from './api/nfe/icpBrasilRoots.ts';

const hosts = [
  { model: 55, env: 'HML', host: 'homologacao.nfe.sefa.pr.gov.br' },
  { model: 65, env: 'HML', host: 'homologacao.nfce.sefa.pr.gov.br' },
  { model: 55, env: 'PROD', host: 'nfe.sefa.pr.gov.br' },
  { model: 65, env: 'PROD', host: 'nfce.sefa.pr.gov.br' },
];

const logFile = 'audit_results.json';
const results = {
  roots: [],
  openssl: [],
  nodePure: [],
  nodeDefault: [],
  agentErp: [],
  axiosErp: [],
};

// 1. Check roots
function checkCert(certPem, source) {
  try {
    const cert = new crypto.X509Certificate(certPem);
    results.roots.push({
      source,
      subject: cert.subject,
      issuer: cert.issuer,
      serial: cert.serialNumber,
      ca: cert.ca,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      fingerprint256: cert.fingerprint256,
      algorithm: cert.infoAccess,
    });
  } catch (e) {
    results.roots.push({ source, error: e.message });
  }
}

try {
  if (fs.existsSync('v2.crt')) checkCert(fs.readFileSync('v2.crt', 'utf8'), 'v2.crt');
  if (fs.existsSync('v5.crt')) checkCert(fs.readFileSync('v5.crt', 'utf8'), 'v5.crt');
  icpBrasilRoots.forEach((pem, i) => checkCert(pem, `icpBrasilRoots[${i}]`));
} catch (e) {
  console.error(e);
}

// 2. OpenSSL
const opensslPath = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
for (const h of hosts) {
  try {
    const output = execSync(
      `"${opensslPath}" s_client -connect ${h.host}:443 -servername ${h.host} -showcerts </dev/null`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    const verifyMatch = output.match(/Verify return code: (\d+) \(([^)]+)\)/);
    results.openssl.push({
      host: h.host,
      returnCode: verifyMatch ? verifyMatch[1] : 'unknown',
      returnString: verifyMatch ? verifyMatch[2] : 'unknown',
      outputLength: output.length,
    });
  } catch (e) {
    results.openssl.push({
      host: h.host,
      error: e.message,
    });
  }
}

// 3. Node pure
async function testNodePure(host, ca) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = tls.connect(
      443,
      host,
      {
        servername: host,
        rejectUnauthorized: true,
        ca: ca,
      },
      () => {
        resolve({
          host,
          authorized: socket.authorized,
          protocol: socket.getProtocol(),
          duration: Date.now() - start,
        });
        socket.end();
      }
    );
    socket.on('error', (err) => {
      resolve({
        host,
        authorized: false,
        error: err.code || err.message,
        duration: Date.now() - start,
      });
    });
  });
}

// 4. Agent ERP (simulated)
async function testHttps(host, agent) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.request(
      {
        host,
        port: 443,
        method: 'GET',
        path: '/',
        agent,
      },
      (res) => {
        resolve({
          host,
          status: res.statusCode,
          duration: Date.now() - start,
        });
        res.on('data', () => {});
      }
    );
    req.on('error', (err) => {
      resolve({
        host,
        error: err.code || err.message,
        duration: Date.now() - start,
      });
    });
    req.end();
  });
}

async function runTests() {
  for (const h of hosts) {
    // Node default CA
    const resDefault = await testNodePure(h.host, undefined);
    results.nodeDefault.push(resDefault);

    // Node with ERP CA (icpBrasilRoots + default roots)
    const trustedSefazAuthorities = [...new Set([...tls.rootCertificates, ...icpBrasilRoots])];
    const resPure = await testNodePure(h.host, trustedSefazAuthorities);
    results.nodePure.push(resPure);

    // Agent ERP (without client cert for basic TLS check, if possible)
    // Wait, createSefazHttpsAgent requires client cert and key.
    // If I don't have it, I'll just create a similar agent without cert/key to test server auth.
    const agent = new https.Agent({
      ca: trustedSefazAuthorities,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      keepAlive: false,
    });
    const resHttps = await testHttps(h.host, agent);
    results.agentErp.push(resHttps);

    // Axios ERP
    try {
      const start = Date.now();
      const resAxios = await axios.get(`https://${h.host}/`, { httpsAgent: agent, timeout: 5000 });
      results.axiosErp.push({
        host: h.host,
        status: resAxios.status,
        duration: Date.now() - start,
      });
    } catch (e) {
      results.axiosErp.push({
        host: h.host,
        error: e.code || e.message,
      });
    }
  }

  fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
}

runTests();
