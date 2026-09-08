import https from 'node:https';

export interface DistDfeSoapParams {
  url: string;
  soapEnvelope: string;
  certPem: string;
  privateKeyPem: string;
  timeoutMs?: number;
}

export interface DistDfeSoapResponse {
  statusCode: number;
  responseXml: string;
  durationMs: number;
}

/**
 * Executa requisição SOAP HTTPS mTLS para o webservice NFeDistribuicaoDFe da SEFAZ
 * utilizando o stack nativo Node.js / OpenSSL com timeout e retry controlado.
 */
export async function sendDistDfeSoapToSefaz(
  params: DistDfeSoapParams,
): Promise<DistDfeSoapResponse> {
  const { url, soapEnvelope, certPem, privateKeyPem, timeoutMs = 25000 } = params;
  const parsedUrl = new URL(url);

  const agent = new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    rejectUnauthorized: true,
    keepAlive: false,
  });

  const payloadBuffer = Buffer.from(soapEnvelope, 'utf-8');

  const executeAttempt = (): Promise<DistDfeSoapResponse> => {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          agent,
          headers: {
            'Content-Type':
              'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
            'User-Agent': 'Apache-HttpClient/4.5.13 (Java/11.0.15)',
            'Content-Length': payloadBuffer.length,
          },
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.setEncoding('utf-8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const durationMs = Date.now() - start;
            resolve({
              statusCode: res.statusCode || 200,
              responseXml: body,
              durationMs,
            });
          });
        },
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Timeout na comunicação com a SEFAZ após ${timeoutMs}ms.`));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(payloadBuffer);
      req.end();
    });
  };

  // Retry controlado (máximo 2 tentativas com backoff simples para falhas transitórias de rede)
  let lastError: any;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await executeAttempt();
      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Falha na comunicação mTLS com SEFAZ: ${lastError?.message || String(lastError)}`);
}
