var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/nfe/distDfeBridge.ts
var distDfeBridge_exports = {};
__export(distDfeBridge_exports, {
  default: () => handler
});
module.exports = __toCommonJS(distDfeBridge_exports);
var import_node_https2 = __toESM(require("node:https"));

// api/nfe/sefazHttpsAgent.ts
var import_node_crypto = require("node:crypto");
var import_node_https = __toESM(require("node:https"));
var import_node_tls = require("node:tls");

// api/nfe/icpBrasilRoots.ts
var icpBrasilRoots = [
  "-----BEGIN CERTIFICATE-----\nMIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD\nVQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv\nIE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG\nA1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2\nMTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC\nQlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp\nb25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM\nLEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC\nIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn\n+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0\nD0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M\nem+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt\n1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg\nGaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR\n5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2\nlnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB\n7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7\n+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P\nKPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI\nTYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow\nOAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh\nY3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh\nc2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6\n8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV\nHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA\neCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B\nCbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7\nTmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW\nET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B\nMSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ\nkQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570\n2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp\nMEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH\nisLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP\nGEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO\njO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=\n-----END CERTIFICATE-----\n"
];

// api/nfe/sefazHttpsAgent.ts
var trustedSefazAuthorities = [.../* @__PURE__ */ new Set([...import_node_tls.rootCertificates, ...icpBrasilRoots])];
function validateSefazClientCertificate(certPem, privateKeyPem) {
  const certificate = new import_node_crypto.X509Certificate(certPem);
  if (certificate.ca || !certificate.checkPrivateKey((0, import_node_crypto.createPrivateKey)(privateKeyPem)))
    throw Object.assign(new Error("Certificado A1 incompat\xEDvel com a chave privada."), {
      code: "A1_KEY_MISMATCH"
    });
  const now = Date.now();
  if (Date.parse(certificate.validFrom) > now || Date.parse(certificate.validTo) <= now)
    throw Object.assign(new Error("Certificado A1 fora do per\xEDodo de validade."), {
      code: "A1_CERTIFICATE_EXPIRED"
    });
}
function createSefazHttpsAgent(certPem, privateKeyPem) {
  validateSefazClientCertificate(certPem, privateKeyPem);
  return new import_node_https.default.Agent({
    cert: certPem,
    key: privateKeyPem,
    ca: trustedSefazAuthorities,
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
    keepAlive: false
  });
}

// api/nfe/nfeSigner.ts
var import_node_forge = __toESM(require("node-forge"));
var import_xml_crypto = require("xml-crypto");
var import_node_crypto2 = require("node:crypto");
function extractCertificateAndKey(pfxBase64, password) {
  const normalized = pfxBase64.replace(/\s/g, "");
  if (!normalized || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized) || Buffer.from(normalized, "base64").toString("base64") !== normalized) {
    throw Object.assign(new Error("O certificado A1 deve conter Base64 v\xE1lido do arquivo PFX."), {
      code: "A1_BASE64_INVALID"
    });
  }
  const pfxDer = import_node_forge.default.util.decode64(normalized);
  const pfxAsn1 = import_node_forge.default.asn1.fromDer(pfxDer);
  const p12 = import_node_forge.default.pkcs12.pkcs12FromAsn1(pfxAsn1, password || "");
  const keyBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[import_node_forge.default.pki.oids.pkcs8ShroudedKeyBag]?.[0] || p12.getBags({ bagType: import_node_forge.default.pki.oids.keyBag })[import_node_forge.default.pki.oids.keyBag]?.[0];
  if (!keyBag?.key) {
    throw new Error("Chave privada RSA n\xE3o encontrada no arquivo .pfx.");
  }
  const privateKeyPem = import_node_forge.default.pki.privateKeyToPem(keyBag.key);
  const certBags = p12.getBags({ bagType: import_node_forge.default.pki.oids.certBag });
  const privateKey = (0, import_node_crypto2.createPrivateKey)(privateKeyPem);
  const certBag = certBags[import_node_forge.default.pki.oids.certBag]?.find(
    (bag) => bag.cert && !new import_node_crypto2.X509Certificate(import_node_forge.default.pki.certificateToPem(bag.cert)).ca && new import_node_crypto2.X509Certificate(import_node_forge.default.pki.certificateToPem(bag.cert)).checkPrivateKey(privateKey)
  );
  if (!certBag?.cert) {
    throw new Error("Certificado X.509 n\xE3o encontrado no arquivo .pfx.");
  }
  const certPem = import_node_forge.default.pki.certificateToPem(certBag.cert);
  validateSefazClientCertificate(certPem, privateKeyPem);
  const certDer = import_node_forge.default.asn1.toDer(import_node_forge.default.pki.certificateToAsn1(certBag.cert)).getBytes();
  const certDerBase64 = import_node_forge.default.util.encode64(certDer);
  return {
    privateKeyPem,
    certPem,
    certDerBase64
  };
}

// api/nfe/distDfeBridge.ts
var import_node_crypto3 = require("node:crypto");
var SEFAZ_DFE_URL_PROD = "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
var SEFAZ_DFE_URL_HOM = "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
var CERTIFICATE_HEALTH_VERSION = "cert-a1-2026-09-28-v2";
var EXPECTED_ISSUER_CNPJ = "44512248000107";
function validateAuthToken(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const validTokens = [
    process.env.MORANTEHUB_MCP_ACCESS_TOKEN,
    process.env.SEFAZ_BRIDGE_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ].filter(Boolean);
  return validTokens.includes(token);
}
function buildDefaultSoapEnvelope(cnpj, ultNsu, tpAmb = "1") {
  const paddedNsu = String(ultNsu || "0").padStart(15, "0");
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>41</cUFAutor>
          <CNPJ>${cnpj}</CNPJ>
          <distNSU>
            <ultNSU>${paddedNsu}</ultNSU>
          </distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}
async function sendDistDfeSoapToSefaz(params) {
  const { url, soapEnvelope, certPem, privateKeyPem, timeoutMs = 25e3 } = params;
  const parsedUrl = new URL(url);
  const agent = createSefazHttpsAgent(certPem, privateKeyPem);
  const payloadBuffer = Buffer.from(soapEnvelope, "utf-8");
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const req = import_node_https2.default.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        agent,
        headers: {
          "Content-Type": 'application/soap+xml;charset=utf-8;action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
          "User-Agent": "Apache-HttpClient/4.5.13 (Java/11.0.15)",
          "Content-Length": payloadBuffer.length
        },
        timeout: timeoutMs
      },
      (res) => {
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          agent.destroy();
          resolve({
            statusCode: res.statusCode || 200,
            responseXml: body,
            durationMs: Date.now() - start
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(Object.assign(new Error("Timeout na comunica\xE7\xE3o com a SEFAZ."), { code: "ETIMEDOUT" }));
    });
    req.on("error", (err) => {
      agent.destroy();
      reject(err);
    });
    req.write(payloadBuffer);
    req.end();
  });
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method === "GET") {
    if (process.env.VERCEL_ENV !== "preview") {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx || !password) {
      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        configured: false,
        validPfx: false,
        hasPrivateKey: false,
        cnpjMatches: false,
        inValidityWindow: false
      });
    }
    let failureStage = "base64";
    try {
      const cleanBase64 = (pfx.includes(",") ? pfx.split(",").pop() : pfx).replace(/[\r\n\s]/g, "");
      failureStage = "pkcs12";
      const { certPem, privateKeyPem } = extractCertificateAndKey(cleanBase64, password);
      failureStage = "x509";
      const certificate = new import_node_crypto3.X509Certificate(certPem);
      failureStage = "private-key";
      const privateKey = (0, import_node_crypto3.createPrivateKey)(privateKeyPem);
      const hasPrivateKey = certificate.checkPrivateKey(privateKey);
      failureStage = "certificate-metadata";
      const subjectCnpj = certificate.subject.match(/(?:^|\n)serialNumber\s*=\s*(\d{14})\b/i)?.[1] ?? certificate.subject.match(/\b(\d{14})\b/)?.[1] ?? null;
      const now = Date.now();
      const notBefore = Date.parse(certificate.validFrom);
      const notAfter = Date.parse(certificate.validTo);
      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        configured: true,
        validPfx: true,
        hasPrivateKey,
        cnpjMatches: subjectCnpj === EXPECTED_ISSUER_CNPJ,
        inValidityWindow: Number.isFinite(notBefore) && Number.isFinite(notAfter) && now >= notBefore && now <= notAfter,
        notBefore: Number.isFinite(notBefore) ? new Date(notBefore).toISOString() : null,
        notAfter: Number.isFinite(notAfter) ? new Date(notAfter).toISOString() : null
      });
    } catch {
      return res.status(200).json({
        version: CERTIFICATE_HEALTH_VERSION,
        failureStage,
        configured: true,
        validPfx: false,
        hasPrivateKey: false,
        cnpjMatches: false,
        inValidityWindow: false
      });
    }
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Apenas POST \xE9 permitido." });
  }
  if (!validateAuthToken(req.headers.authorization)) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Token de autoriza\xE7\xE3o inv\xE1lido ou ausente."
    });
  }
  try {
    const payload = req.body || {};
    let { soapEnvelope, cleanCnpj, ultNsu, tpAmb = "1", environment = "production" } = payload;
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx || !password) {
      return res.status(503).json({
        error: "CERTIFICADO_NAO_CONFIGURADO",
        message: "Certificado A1 n\xE3o configurado no servidor fiscal."
      });
    }
    const cleanBase64 = (pfx.includes(",") ? pfx.split(",").pop() : pfx).replace(/[\r\n\s]/g, "");
    const { certPem, privateKeyPem } = extractCertificateAndKey(cleanBase64, password);
    if (!soapEnvelope) {
      if (!cleanCnpj) {
        return res.status(400).json({ error: "CNPJ_OBRIGATORIO", message: "CNPJ emitente n\xE3o informado." });
      }
      soapEnvelope = buildDefaultSoapEnvelope(cleanCnpj, ultNsu || "0", tpAmb);
    }
    const targetUrl = environment === "production" ? SEFAZ_DFE_URL_PROD : SEFAZ_DFE_URL_HOM;
    const response = await sendDistDfeSoapToSefaz({
      url: targetUrl,
      soapEnvelope,
      certPem,
      privateKeyPem,
      timeoutMs: 25e3
    });
    return res.status(200).json({
      success: true,
      statusCode: response.statusCode,
      responseXml: response.responseXml,
      durationMs: response.durationMs
    });
  } catch (err) {
    console.error("[SEFAZ Node Bridge] Erro mTLS:", err.message || "Erro desconhecido");
    return res.status(502).json({
      success: false,
      error: "SEFAZ_COMMUNICATION_ERROR",
      message: err.message || "Erro na comunica\xE7\xE3o mTLS com a SEFAZ."
    });
  }
}
//# sourceMappingURL=dist-dfe-bridge.cjs.map
