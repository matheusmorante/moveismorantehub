var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// scripts/testing/fiscal-audit.ts
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));
var import_node_os = __toESM(require("node:os"));
var import_node_https2 = __toESM(require("node:https"));
var import_node_crypto3 = require("node:crypto");
var import_node_child_process = require("node:child_process");
var import_node_tls2 = require("node:tls");
var import_dotenv = __toESM(require("dotenv"));
var import_node_forge2 = __toESM(require("node-forge"));
var import_supabase_js = require("@supabase/supabase-js");

// api/nfe/nfeSigner.ts
var import_node_forge = __toESM(require("node-forge"));
var import_xml_crypto = require("xml-crypto");
var import_node_crypto2 = require("node:crypto");

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
function signNfeXml(xml, privateKeyPem, certDerBase64) {
  return signFiscalEventXml(xml, privateKeyPem, certDerBase64, "infNFe");
}
function signFiscalEventXml(xml, privateKeyPem, certDerBase64, elementName) {
  const elementMatch = xml.match(
    new RegExp(`<${elementName}\\s+Id="([^"]+)"[^>]*>[\\s\\S]*?<\\/${elementName}>`)
  );
  if (!elementMatch) {
    throw new Error(`Tag <${elementName} Id="..."> n\xE3o encontrada no XML para assinatura.`);
  }
  const elementId = elementMatch[1];
  const cleanCertBase64 = certDerBase64.replace(/[\r\n\s]/g, "");
  const signer = new import_xml_crypto.SignedXml({
    privateKey: privateKeyPem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    getKeyInfoContent: () => `<X509Data><X509Certificate>${cleanCertBase64}</X509Certificate></X509Data>`
  });
  signer.addReference({
    xpath: `//*[local-name(.)='${elementName}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: `#${elementId}`
  });
  signer.computeSignature(xml, {
    location: {
      reference: `//*[local-name(.)='${elementName === "infNFe" && xml.includes("<infNFeSupl>") ? "infNFeSupl" : elementName}']`,
      action: "after"
    }
  });
  return signer.getSignedXml();
}

// api/nfe/sefazClient.ts
var import_axios = __toESM(require("axios"));
var import_node_perf_hooks = require("node:perf_hooks");

// api/nfe/sefazTransportDiagnostic.ts
function buildSefazTransportDiagnostic(error, contextOverride) {
  const item = error && typeof error === "object" ? error : {};
  const allowed = [
    "EPROTO",
    "ECONNRESET",
    "ECONNABORTED",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ERR_BAD_RESPONSE",
    "ERR_BAD_REQUEST",
    "ERR_CANCELED",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
    "CERT_HAS_EXPIRED",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "ERR_TLS_CERT_ALTNAME_INVALID",
    "A1_KEY_MISMATCH",
    "A1_CERTIFICATE_EXPIRED",
    "SEFAZ_SOAP_FAULT",
    "SEFAZ_ENDPOINT_INVALID"
  ];
  const safeCode = (value) => typeof value === "string" && (allowed.includes(value) || /^(?:ERR_(?:SSL|TLS|OSSL)_[A-Z0-9_]{1,64}|UND_ERR_[A-Z0-9_]{1,64})$/.test(value)) ? value : "UNKNOWN_TRANSPORT_ERROR";
  const code = typeof item.response?.data === "string" && /<(?:[\w-]+:)?Fault\b/i.test(item.response.data) ? "SEFAZ_SOAP_FAULT" : safeCode(item.code);
  const status = item.response?.status;
  const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
  const tlsReason = message.includes("alert unknown ca") ? "PEER_UNKNOWN_CA" : message.includes("alert certificate expired") ? "PEER_CERTIFICATE_EXPIRED" : message.includes("alert bad certificate") ? "PEER_BAD_CERTIFICATE" : message.includes("alert handshake failure") ? "PEER_HANDSHAKE_FAILURE" : void 0;
  const category = code === "SEFAZ_SOAP_FAULT" ? "SOAP_FAULT" : ["A1_KEY_MISMATCH", "A1_CERTIFICATE_EXPIRED"].includes(code) || tlsReason === "PEER_BAD_CERTIFICATE" ? "MTLS_CLIENT_CERTIFICATE" : [
    "ETIMEDOUT",
    "ECONNABORTED",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT"
  ].includes(code) ? "TIMEOUT" : code === "ECONNRESET" ? "SOCKET_RESET" : ["ENOTFOUND", "EAI_AGAIN"].includes(code) ? "DNS_FAILURE" : ["ECONNREFUSED"].includes(code) ? "TCP_FAILURE" : code === "EPROTO" || /^(?:ERR_(?:SSL|TLS|OSSL)_|CERT_|UNABLE_|DEPTH_|SELF_SIGNED)/.test(code) ? "TLS_FAILURE" : Number.isInteger(status) ? "HTTP_ERROR" : "TRANSPORT_UNKNOWN";
  const name = ["Error", "AxiosError", "TypeError", "SystemError"].includes(item.name) ? item.name : "Error";
  const context = contextOverride || item.sefazTransportContext || {};
  let endpoint;
  let hostname;
  try {
    const url = new URL(context.endpoint);
    if (url.protocol === "https:" && [
      "nfe.sefa.pr.gov.br",
      "nfce.sefa.pr.gov.br",
      "homologacao.nfe.sefa.pr.gov.br",
      "homologacao.nfce.sefa.pr.gov.br"
    ].includes(url.hostname) && /^\/(?:nfe|nfce)\/[A-Za-z0-9]+$/.test(url.pathname)) {
      endpoint = `${url.origin}${url.pathname}`;
      hostname = url.hostname;
    }
  } catch {
  }
  const errno = typeof item.errno === "number" && Number.isInteger(item.errno) ? item.errno : allowed.includes(item.errno) ? item.errno : void 0;
  const syscall = ["getaddrinfo", "connect", "read", "write", "send", "recv"].includes(item.syscall) ? item.syscall : void 0;
  const causes = [];
  let cause = item.cause;
  for (let depth = 0; cause && typeof cause === "object" && depth < 2; depth++) {
    causes.push({
      code: safeCode(cause.code),
      ...Number.isInteger(cause.errno) ? { errno: cause.errno } : {},
      ...["getaddrinfo", "connect", "read", "write"].includes(cause.syscall) ? { syscall: cause.syscall } : {}
    });
    cause = cause.cause;
  }
  const peer = context.peerCertificate || {};
  const safeCN = (value) => typeof value === "string" && /^[\w .,*()/:-]{1,160}$/.test(value) ? value : void 0;
  const safeDate = (value) => typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value)) ? value : void 0;
  const peerCertificate = {
    subjectCN: safeCN(peer.subjectCN),
    issuerCN: safeCN(peer.issuerCN),
    validFrom: safeDate(peer.validFrom),
    validTo: safeDate(peer.validTo),
    fingerprint256: typeof peer.fingerprint256 === "string" && /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/i.test(peer.fingerprint256) ? peer.fingerprint256 : void 0
  };
  return {
    name,
    code,
    category,
    message: `${category}: ${tlsReason || code}`,
    ...Number.isInteger(status) && status >= 100 && status <= 599 ? { httpStatus: status } : {},
    ...tlsReason ? { tlsReason } : {},
    ...errno !== void 0 ? { errno } : {},
    ...syscall ? { syscall } : {},
    ...endpoint ? { endpoint, hostname } : {},
    ...["dns", "connect", "tls", "request", "response"].includes(context.phase) ? { phase: context.phase } : {},
    ...context.tlsProtocol === "TLSv1.2" || context.tlsProtocol === "TLSv1.3" ? { tlsProtocol: context.tlsProtocol } : {},
    ...["55", "65"].includes(context.model) ? { model: context.model } : {},
    ...[1, 2].includes(context.environment) ? { environment: context.environment } : {},
    ...Object.values(peerCertificate).some((value) => value !== void 0) ? { peerCertificate } : {},
    ...Number.isFinite(context.durationMs) && context.durationMs >= 0 ? { durationMs: Math.min(Math.round(context.durationMs), 6e5) } : {},
    ...Number.isFinite(context.timeoutMs) && context.timeoutMs > 0 ? { timeoutMs: Math.min(Math.round(context.timeoutMs), 6e5) } : {},
    ...causes.length ? { cause: causes } : {}
  };
}
var SefazTransportError = class extends Error {
  code;
  diagnostic;
  constructor(error, context) {
    const diagnostic = buildSefazTransportDiagnostic(error, context);
    super(diagnostic.message);
    this.name = diagnostic.name;
    this.code = diagnostic.code;
    this.diagnostic = diagnostic;
  }
};

// api/nfe/sefazE2eSimulator.ts
var OPERATIONAL_SUPABASE_REFS = /* @__PURE__ */ new Set([
  "hkoxhourxwlddgsfdgws",
  "wzpdfmihnwcrgkyagwkd"
]);
var APPROVED_SEFAZ_HOSTS = /* @__PURE__ */ new Set([
  "homologacao.nfe.sefa.pr.gov.br",
  "homologacao.nfce.sefa.pr.gov.br"
]);
function projectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return null;
    return url.hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}
function assertSimulatorEnvironment(env) {
  const actualRef = projectRef(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const allowedRef = env.FISCAL_E2E_ALLOWED_SUPABASE_REF;
  if (env.NFE_E2E_SEFAZ_MODE !== "simulated" || env.FISCAL_E2E_SIMULATOR_ENABLED !== "1" || env.MORANTE_ENV_SOURCE !== "vercel-development" || env.VERCEL_ENV !== "development" || !actualRef || !allowedRef || actualRef !== allowedRef || OPERATIONAL_SUPABASE_REFS.has(actualRef)) {
    throw Object.assign(
      new Error("Simulador fiscal E2E bloqueado: projeto operacional ou modo de simula\xE7\xE3o n\xE3o aprovado."),
      { code: "FISCAL_E2E_SIMULATOR_GUARD_FAILED" }
    );
  }
}
function simulateFiscalE2eSoap(params, env = process.env) {
  if (env.NFE_E2E_SEFAZ_MODE !== "simulated") return null;
  assertSimulatorEnvironment(env);
  const endpoint = new URL(params.url);
  if (endpoint.protocol !== "https:" || !APPROVED_SEFAZ_HOSTS.has(endpoint.hostname) || !/NFeAutorizacao4\/nfeAutorizacaoLote$/.test(params.action)) {
    throw Object.assign(
      new Error("O simulador fiscal E2E aceita somente autoriza\xE7\xE3o em endpoint oficial de Homologa\xE7\xE3o."),
      { code: "FISCAL_E2E_SIMULATOR_ACTION_NOT_SUPPORTED" }
    );
  }
  const environments = [...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?tpAmb\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?tpAmb>/gi)];
  const models = [...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?mod\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?mod>/gi)];
  const invoiceIds = [
    ...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?infNFe\b[^>]*\bId=["']NFe([0-9]{6}[A-Z0-9]{12}[0-9]{26})["'][^>]*>/gi)
  ];
  if (environments.length !== 1 || environments[0][1].trim() !== "2" || models.length !== 1 || !["55", "65"].includes(models[0][1].trim()) || invoiceIds.length !== 1 || models[0][1].trim() === "65" !== endpoint.hostname.includes("nfce.")) {
    throw Object.assign(
      new Error("O XML encaminhado ao simulador n\xE3o \xE9 uma \xFAnica NF-e/NFC-e de Homologa\xE7\xE3o v\xE1lida."),
      { code: "FISCAL_E2E_SIMULATOR_XML_INVALID" }
    );
  }
  const accessKey = invoiceIds[0][1];
  const protocol = `9${accessKey.slice(-14)}`;
  const receiptDate = (/* @__PURE__ */ new Date()).toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><verAplic>MoranteHub-E2E-SIMULATOR</verAplic><cStat>104</cStat><xMotivo>Simulador E2E: lote processado sem contato com a SEFAZ.</xMotivo><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>MoranteHub-E2E-SIMULATOR</verAplic><chNFe>${accessKey}</chNFe><dhRecbto>${receiptDate}</dhRecbto><nProt>${protocol}</nProt><digVal>E2E-SIMULATED</digVal><cStat>100</cStat><xMotivo>Simulador E2E: autoriza\xE7\xE3o simulada; nenhuma transmiss\xE3o \xE0 SEFAZ ocorreu.</xMotivo></infProt></protNFe></retEnviNFe>`;
}

// api/nfe/sefazClient.ts
async function sendSoapToSefaz(params) {
  const startedAt = import_node_perf_hooks.performance.now();
  const {
    url,
    action,
    xmlPayload,
    certPem,
    privateKeyPem,
    serviceNamespace = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"
  } = params;
  const simulatedResponse = simulateFiscalE2eSoap({ url, action, xmlPayload });
  if (simulatedResponse !== null) return simulatedResponse;
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.port && target.port !== "443" || ![
    "nfe.sefa.pr.gov.br",
    "nfce.sefa.pr.gov.br",
    "homologacao.nfe.sefa.pr.gov.br",
    "homologacao.nfce.sefa.pr.gov.br"
  ].includes(target.hostname))
    throw Object.assign(new Error("Endpoint fiscal n\xE3o \xE9 um endere\xE7o HTTPS oficial da SEFAZ-PR."), {
      code: "SEFAZ_ENDPOINT_INVALID"
    });
  const expectedEnvironment = target.hostname.startsWith("homologacao.") ? "2" : "1";
  const expectedModel = target.hostname.includes("nfce.") ? "65" : "55";
  const environments = [
    ...xmlPayload.matchAll(/<(?:[\w-]+:)?tpAmb>\s*([^<]+)\s*<\/(?:[\w-]+:)?tpAmb>/g)
  ];
  const models = [...xmlPayload.matchAll(/<(?:[\w-]+:)?mod>\s*([^<]+)\s*<\/(?:[\w-]+:)?mod>/g)];
  if (environments.some((match) => match[1].trim() !== expectedEnvironment) || models.some((match) => match[1].trim() !== expectedModel))
    throw Object.assign(
      new Error("XML fiscal incompat\xEDvel com o ambiente ou modelo do endpoint SEFAZ."),
      {
        code: "SEFAZ_ENVIRONMENT_MODEL_MISMATCH"
      }
    );
  const httpsAgent = createSefazHttpsAgent(certPem, privateKeyPem);
  const context = {
    endpoint: `${target.origin}${target.pathname}`,
    phase: "dns",
    timeoutMs: 25e3,
    model: target.hostname.includes(".nfce.") || target.hostname === "nfce.sefa.pr.gov.br" ? "65" : "55",
    environment: target.hostname.startsWith("homologacao.") ? 2 : 1
  };
  const createConnection = httpsAgent.createConnection.bind(httpsAgent);
  httpsAgent.createConnection = (options, callback) => {
    const socket = createConnection(options, callback);
    socket?.once("lookup", (error) => {
      context.phase = error ? "dns" : "connect";
    });
    socket?.once("connect", () => {
      context.phase = "tls";
    });
    socket?.once("secureConnect", () => {
      context.phase = "request";
      context.tlsProtocol = socket.getProtocol() || void 0;
      const peer = socket.getPeerCertificate();
      context.peerCertificate = {
        subjectCN: peer?.subject?.CN,
        issuerCN: peer?.issuer?.CN,
        validFrom: peer?.valid_from,
        validTo: peer?.valid_to,
        fingerprint256: peer?.fingerprint256
      };
    });
    return socket;
  };
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="${serviceNamespace}">${xmlPayload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const deadline = AbortSignal.timeout(25e3);
  try {
    const response = await import_axios.default.post(url, soapEnvelope, {
      httpsAgent,
      proxy: false,
      maxRedirects: 0,
      signal: deadline,
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`,
        "Content-Length": Buffer.byteLength(soapEnvelope, "utf8"),
        Accept: "application/soap+xml, text/xml"
      },
      timeout: 25e3
    });
    context.phase = "response";
    if (typeof response.data === "string" && /<(?:[\w-]+:)?Fault\b/i.test(response.data))
      throw Object.assign(new Error("A SEFAZ retornou uma falha SOAP sem confirma\xE7\xE3o fiscal."), {
        code: "SEFAZ_SOAP_FAULT",
        response: { status: response.status }
      });
    return response.data;
  } catch (error) {
    const transportError = deadline.aborted ? Object.assign(new Error("Timeout de transporte SEFAZ."), {
      code: "ETIMEDOUT",
      cause: error
    }) : error;
    context.durationMs = Math.round(import_node_perf_hooks.performance.now() - startedAt);
    if (import_axios.default.isAxiosError(transportError) && transportError.response) context.phase = "response";
    throw new SefazTransportError(transportError, context);
  } finally {
    httpsAgent.destroy();
  }
}

// api/nfe/schemaValidator.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_xmldom = require("@xmldom/xmldom");
var NFE_SCHEMA_PACKAGE = "PL_010f_v1.04";
var schemaRelativePath = `api/nfe/schemas/${NFE_SCHEMA_PACKAGE}/nfe_v4.00.xsd`;
function resolveFilePath(filename) {
  try {
    if (filename.startsWith("file:")) {
      return (0, import_node_url.fileURLToPath)(filename);
    }
    const url = new URL(filename);
    if (url.protocol === "file:") {
      return (0, import_node_url.fileURLToPath)(url);
    }
    return null;
  } catch {
    return filename;
  }
}
var fsProviderRegistered = false;
function registerCustomFsProvider(xmlRegisterInputProvider) {
  if (fsProviderRegistered) return;
  fsProviderRegistered = true;
  xmlRegisterInputProvider({
    match(filename) {
      const p = resolveFilePath(filename);
      return p != null && (0, import_node_fs.existsSync)(p);
    },
    open(filename) {
      const p = resolveFilePath(filename);
      if (!p) return void 0;
      try {
        return (0, import_node_fs.openSync)(p, "r");
      } catch {
        return void 0;
      }
    },
    read(fd, buf) {
      try {
        return (0, import_node_fs.readSync)(fd, buf, 0, buf.byteLength, null);
      } catch {
        return -1;
      }
    },
    close(fd) {
      try {
        (0, import_node_fs.closeSync)(fd);
      } catch {
      }
      return true;
    }
  });
}
async function validateUnsignedNfeStructure(xml) {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("XML fiscal cont\xE9m declara\xE7\xE3o n\xE3o permitida.");
  const { XmlDocument } = await import("libxml2-wasm");
  let document;
  try {
    document = XmlDocument.fromBuffer(Buffer.from(xml, "utf8"));
    if (!/<NFe\s+xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe">/.test(xml) || !/<infNFe\s+Id="NFe[0-9]{6}[A-Z0-9]{12}[0-9]{26}"\s+versao="4\.00">/.test(xml) || /<(?:\w+:)?Signature(?:\s|>)/.test(xml))
      throw new Error("Envelope NF-e pr\xE9-assinatura inesperado.");
  } catch (error) {
    throw new Error(
      `XML da NF-e pr\xE9-assinatura inv\xE1lido: ${error instanceof Error ? error.message.slice(0, 300) : "erro desconhecido"}`
    );
  } finally {
    document?.dispose();
  }
}
async function validateNfeAgainstOfficialSchema(xml) {
  return validatePinnedSchema(xml, schemaRelativePath, NFE_SCHEMA_PACKAGE);
}
async function validatePinnedSchema(xml, relativePath, packageName) {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("XML fiscal cont\xE9m declara\xE7\xE3o n\xE3o permitida.");
  const candidates = [
    (0, import_node_path.resolve)(process.cwd(), relativePath),
    (0, import_node_path.resolve)(process.cwd(), "..", relativePath)
  ];
  const path2 = candidates.find(import_node_fs.existsSync) || candidates[0];
  const { XmlDocument, XsdValidator, xmlRegisterInputProvider } = await import("libxml2-wasm");
  registerCustomFsProvider(xmlRegisterInputProvider);
  let schema;
  let validator;
  let document;
  try {
    schema = XmlDocument.fromBuffer((0, import_node_fs.readFileSync)(path2), { url: (0, import_node_url.pathToFileURL)(path2).href });
    validator = XsdValidator.fromDoc(schema);
    document = XmlDocument.fromBuffer(Buffer.from(xml, "utf8"));
    validator.validate(document);
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : "erro desconhecido";
    throw new Error(`XML da NF-e n\xE3o passou pelo schema oficial ${packageName}: ${detail}`);
  } finally {
    document?.dispose();
    validator?.dispose();
    schema?.dispose();
  }
}

// scripts/testing/fiscal-audit.ts
var import_node_perf_hooks2 = require("node:perf_hooks");

// shared-utils/testArtifactQueries.ts
var NON_TEST_ARTIFACT_FILTER = [
  "order_data.is.null,",
  "and(",
  "or(order_data->>is_test.is.null,order_data->>is_test.neq.true),",
  "or(order_data->>isTest.is.null,order_data->>isTest.neq.true),",
  "or(order_data->testArtifact->>is_test.is.null,order_data->testArtifact->>is_test.neq.true)",
  ")"
].join("");
function excludeTestArtifacts(query) {
  return query.or(NON_TEST_ARTIFACT_FILTER);
}
function excludeTestOrders(query, referencedTable) {
  return referencedTable ? query.or(NON_TEST_ARTIFACT_FILTER, { referencedTable }) : excludeTestArtifacts(query);
}

// scripts/testing/fiscal-audit.ts
var root = import_node_path2.default.resolve(__dirname, "../../..");
var label = process.argv[3] || "process";
var keyFile = import_node_path2.default.join(import_node_os.default.tmpdir(), "morantehub-fiscal-audit-hmac-key");
if (!import_node_fs2.default.existsSync(keyFile)) import_node_fs2.default.writeFileSync(keyFile, (0, import_node_crypto3.randomBytes)(32), { mode: 384 });
var digestKey = import_node_fs2.default.readFileSync(keyFile);
var digest = (value) => (0, import_node_crypto3.createHmac)("sha256", digestKey).update(value).digest("hex");
var originalPfx = "C:/Users/Rosilene/Downloads/MOVEIS MORANTE LTDA44512248000107.pfx";
var pattern = /^(?:NFE_|NFCE_|SEFAZ_|SUPABASE_|VITE_SUPABASE_|VERCEL_ENV$|NODE_ENV$|NODE_EXTRA_CA_CERTS$|NODE_TLS_REJECT_UNAUTHORIZED$|NODE_OPTIONS$|HTTPS?_PROXY$|NO_PROXY$)/;
var mandatory = [
  "NFE_CERTIFICATE_BASE64",
  "NFE_CERTIFICATE_PASSWORD",
  "NODE_EXTRA_CA_CERTS",
  "NODE_TLS_REJECT_UNAUTHORIZED",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY"
];
var safeSubject = (s) => s.replace(/\b\d{11}\b/g, "[CPF omitido]");
var certificateMetadata = (cert) => ({
  subject: safeSubject(cert.subject),
  issuer: safeSubject(cert.issuer),
  ca: cert.ca,
  validFrom: cert.validFrom,
  validTo: cert.validTo,
  fingerprint256: cert.fingerprint256,
  currentlyValid: Date.parse(cert.validFrom) <= Date.now() && Date.parse(cert.validTo) > Date.now()
});
function inspectEnv(env) {
  const detectedNames = Object.keys(env).filter((k) => pattern.test(k) && k !== "NFE_ENVIRONMENT" && k !== "NFE_PRODUCTION_ENABLED");
  const variables = Object.fromEntries([.../* @__PURE__ */ new Set([...mandatory, ...detectedNames])].sort().map((name) => {
    const value = env[name];
    return [name, {
      present: value !== void 0 && value !== "",
      length: value?.length || 0,
      hash: value ? digest(value) : null,
      ...["VERCEL_ENV", "NODE_ENV", "NODE_TLS_REJECT_UNAUTHORIZED"].includes(name) ? { value: value ?? null } : {}
    }];
  }));
  const base64 = env.NFE_CERTIFICATE_BASE64 || "";
  const clean = base64.replace(/\s/g, "");
  const strictBase64 = Boolean(clean) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean);
  const decoded = Buffer.from(clean, "base64");
  let certificate = { strictBase64, decodedBytes: decoded.length, pkcs12Valid: false };
  if (strictBase64) {
    try {
      const extracted = extractCertificateAndKey(base64, env.NFE_CERTIFICATE_PASSWORD || "");
      const p12 = import_node_forge2.default.pkcs12.pkcs12FromAsn1(import_node_forge2.default.asn1.fromDer(decoded.toString("binary")), env.NFE_CERTIFICATE_PASSWORD || "");
      const chain = p12.getBags({ bagType: import_node_forge2.default.pki.oids.certBag })[import_node_forge2.default.pki.oids.certBag] || [];
      certificate = {
        ...certificate,
        pkcs12Valid: true,
        passwordCorrect: true,
        leaf: certificateMetadata(new import_node_crypto3.X509Certificate(extracted.certPem)),
        chain: chain.filter((bag) => bag.cert).map((bag) => certificateMetadata(new import_node_crypto3.X509Certificate(import_node_forge2.default.pki.certificateToPem(bag.cert))))
      };
    } catch (error) {
      certificate.errorCode = error.code || "PFX_PARSE_OR_PASSWORD_FAILED";
    }
  }
  let extraCA = { configured: Boolean(env.NODE_EXTRA_CA_CERTS), exists: false };
  if (env.NODE_EXTRA_CA_CERTS && import_node_fs2.default.existsSync(env.NODE_EXTRA_CA_CERTS)) {
    const pem = import_node_fs2.default.readFileSync(env.NODE_EXTRA_CA_CERTS, "utf8");
    const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
    try {
      extraCA = { ...extraCA, exists: true, certificates: blocks.map((block) => certificateMetadata(new import_node_crypto3.X509Certificate(block))) };
    } catch {
      extraCA = { ...extraCA, exists: true, validPem: false };
    }
  }
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const original = import_node_fs2.default.existsSync(originalPfx) ? import_node_fs2.default.readFileSync(originalPfx) : void 0;
  return {
    variables,
    certificate,
    extraCA,
    originalPfx: {
      exists: Boolean(original),
      bytes: original?.length,
      sha256: original ? (0, import_node_crypto3.createHash)("sha256").update(original).digest("hex") : null,
      matchesDecoded: original && clean ? original.equals(decoded) : null
    },
    supabaseRef: supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : null
  };
}
function chainMetadata(socket) {
  if (!socket) return [];
  const chain = [];
  const seen = /* @__PURE__ */ new Set();
  let cert = socket.getPeerCertificate(true);
  while (cert?.fingerprint256 && !seen.has(cert.fingerprint256)) {
    seen.add(cert.fingerprint256);
    chain.push({
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      fingerprint256: cert.fingerprint256
    });
    cert = cert.issuerCertificate;
  }
  return chain;
}
async function testArtifactPostgrestReads() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase() || "";
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD || "";
  const projectRef2 = (() => {
    try {
      return new URL(url).hostname.split(".")[0];
    } catch {
      return "";
    }
  })();
  const projectMatches = projectRef2 === "hkoxhourxwlddgsfdgws";
  const vercelDevelopment = process.env.VERCEL_ENV === "development";
  const environmentOk = vercelDevelopment;
  const credentialsPresent = Boolean(anonKey && email && password);
  if (!projectMatches || !environmentOk || !credentialsPresent) {
    console.log(JSON.stringify({
      mode: "artifact-reads",
      projectMatches,
      vercelDevelopment,
      environmentOk,
      operatorEmailPresent: Boolean(email),
      credentialsPresent,
      authenticated: false,
      administratorCheckOk: false,
      queriesValid: false
    }));
    process.exitCode = 1;
    return;
  }
  const operator = (0, import_supabase_js.createClient)(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await operator.auth.signInWithPassword({ email, password });
  const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) && login.data.user?.email?.trim().toLowerCase() === email;
  if (!authenticatedIdentityMatches) {
    console.log(JSON.stringify({
      mode: "artifact-reads",
      projectRef: projectRef2,
      environment: 2,
      operatorEmailPresent: true,
      authenticated: false,
      authenticatedIdentityMatches: false,
      administratorCheckOk: false,
      queriesValid: false
    }));
    process.exitCode = 1;
    return;
  }
  try {
    const role = await operator.rpc("is_administrator");
    const administratorCheckOk = !role.error && role.data === true;
    if (!administratorCheckOk) {
      console.log(JSON.stringify({
        mode: "artifact-reads",
        projectRef: projectRef2,
        environment: 2,
        operatorEmailPresent: true,
        authenticated: true,
        authenticatedIdentityMatches: true,
        administratorCheckOk: false,
        queriesValid: false
      }));
      process.exitCode = 1;
      return;
    }
    const orderCountQuery = () => operator.from("orders").select("id", { count: "exact", head: true });
    const markedTestFilter = "order_data->>is_test.eq.true,order_data->>isTest.eq.true,order_data->testArtifact->>is_test.eq.true";
    const countRows = async (build) => {
      try {
        const { count, error } = await build();
        return { count: error ? null : count ?? 0, errorCode: error?.code || null };
      } catch {
        return { count: null, errorCode: "POSTGREST_QUERY_FAILED" };
      }
    };
    const destinations = [
      {
        name: "sales-report",
        raw: () => orderCountQuery().is("order_data->deleted", null),
        filtered: () => excludeTestOrders(orderCountQuery()).is("order_data->deleted", null)
      },
      {
        name: "stock-report",
        raw: () => orderCountQuery().eq("deleted", false).neq("order_type", "budget"),
        filtered: () => excludeTestOrders(orderCountQuery()).eq("deleted", false).neq("order_type", "budget")
      },
      {
        name: "delivery-schedule",
        raw: () => orderCountQuery().or("deleted.is.null,deleted.eq.false").in("status", ["scheduled", "draft"]),
        filtered: () => excludeTestOrders(orderCountQuery()).or("deleted.is.null,deleted.eq.false").in("status", ["scheduled", "draft"])
      },
      {
        name: "assembly-list",
        raw: () => orderCountQuery().or("order_data->>deleted.is.null,order_data->>deleted.eq.false"),
        filtered: () => excludeTestOrders(orderCountQuery()).or("order_data->>deleted.is.null,order_data->>deleted.eq.false").or("order_data->>is_test.is.null,order_data->>is_test.eq.false")
      },
      {
        name: "assembly-print",
        raw: () => orderCountQuery().eq("deleted", false).neq("status", "cancelled"),
        filtered: () => excludeTestOrders(orderCountQuery()).eq("deleted", false).neq("status", "cancelled")
      },
      {
        name: "dashboard-period",
        raw: () => orderCountQuery().gte("created_at", "2026-10-05T00:00:00.000Z").lte("created_at", "2026-10-11T23:59:59.000Z"),
        filtered: () => excludeTestOrders(orderCountQuery()).gte("created_at", "2026-10-05T00:00:00.000Z").lte("created_at", "2026-10-11T23:59:59.000Z")
      },
      {
        name: "dashboard-recent-and-map",
        raw: () => orderCountQuery().in("status", ["scheduled", "fulfilled"]).or("deleted.is.null,deleted.eq.false"),
        filtered: () => excludeTestOrders(orderCountQuery()).in("status", ["scheduled", "fulfilled"]).or("deleted.is.null,deleted.eq.false")
      },
      {
        name: "notification-order-read",
        raw: () => orderCountQuery(),
        filtered: () => excludeTestOrders(orderCountQuery())
      }
    ];
    const destinationResults = [];
    for (const destination of destinations) {
      const raw = await countRows(destination.raw);
      const filtered = await countRows(destination.filtered);
      const marked = await countRows(() => destination.raw().or(markedTestFilter));
      const leaked = await countRows(() => destination.filtered().or(markedTestFilter));
      const queryValid = raw.count !== null && filtered.count !== null && marked.count !== null && leaked.count === 0;
      destinationResults.push({
        name: destination.name,
        rawCount: raw.count,
        filteredCount: filtered.count,
        excludedCount: raw.count !== null && filtered.count !== null ? raw.count - filtered.count : null,
        markedCandidateCount: marked.count,
        leakedTestCount: leaked.count,
        behaviorExercised: (marked.count ?? 0) > 0,
        queryValid,
        errorCode: raw.errorCode || filtered.errorCode || marked.errorCode || leaked.errorCode || null
      });
    }
    const activeStatusProofs = [];
    for (const status of ["scheduled", "fulfilled"]) {
      const marked = await countRows(() => orderCountQuery().eq("status", status).or("deleted.is.null,deleted.eq.false").or(markedTestFilter));
      const leaked = await countRows(() => excludeTestOrders(orderCountQuery()).eq("status", status).or("deleted.is.null,deleted.eq.false").or(markedTestFilter));
      activeStatusProofs.push({
        status,
        markedCandidateCount: marked.count,
        leakedTestCount: leaked.count,
        behaviorExercised: (marked.count ?? 0) > 0,
        queryValid: marked.count !== null && leaked.count === 0,
        errorCode: marked.errorCode || leaked.errorCode || null
      });
    }
    const contradictoryTestCount = await countRows(() => orderCountQuery().or(NON_TEST_ARTIFACT_FILTER).or(markedTestFilter));
    const limitedRows = await operator.from("orders").select("is_test:order_data->>is_test,isTest:order_data->>isTest,nested_test:order_data->testArtifact->>is_test").or(NON_TEST_ARTIFACT_FILTER).in("status", ["scheduled", "fulfilled"]).or("deleted.is.null,deleted.eq.false").order("created_at", { ascending: false }).limit(50);
    const limitedLeakCount = limitedRows.error ? null : (limitedRows.data || []).filter(
      (row) => [row.is_test, row.isTest, row.nested_test].some((value) => value === true || value === "true")
    ).length;
    const queriesValid = destinationResults.every((result) => result.queryValid === true) && activeStatusProofs.every((result) => result.queryValid === true) && contradictoryTestCount.count === 0 && contradictoryTestCount.errorCode === null && limitedLeakCount === 0 && !limitedRows.error;
    console.log(JSON.stringify({
      mode: "artifact-reads",
      projectRef: projectRef2,
      environment: 2,
      operatorEmailPresent: true,
      authenticated: true,
      authenticatedIdentityMatches: true,
      administratorCheckOk: true,
      sourceFilterAppliedBeforeLimit: true,
      destinations: destinationResults,
      activeStatusProofs,
      activeStatesExercised: activeStatusProofs.every((result) => result.behaviorExercised === true),
      contradictoryTestCount,
      limitedRowsReturned: limitedRows.data?.length ?? null,
      limitedLeakCount,
      queriesValid
    }));
    if (!queriesValid) process.exitCode = 1;
  } finally {
    await operator.auth.signOut({ scope: "local" });
  }
}
async function wsdl(model, service, policy, environment) {
  const segment = model === "65" ? "nfce" : "nfe";
  const prefix = environment === 2 ? "homologacao." : "";
  const url = new URL(`https://${prefix}${segment}.sefa.pr.gov.br/${segment}/${service}?wsdl`);
  const cert = policy === "server-only" ? void 0 : extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || "", process.env.NFE_CERTIFICATE_PASSWORD || "");
  const agent = policy === "erp" && cert ? createSefazHttpsAgent(cert.certPem, cert.privateKeyPem) : new import_node_https2.default.Agent({
    cert: cert?.certPem,
    key: cert?.privateKeyPem,
    ...policy === "native-default" ? {} : { ca: [...(0, import_node_tls2.getCACertificates)("bundled"), ...icpBrasilRoots] },
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    keepAlive: false
  });
  const started = import_node_perf_hooks2.performance.now();
  let socket;
  return await new Promise((resolve2) => {
    const finish = (data) => {
      clearTimeout(deadline);
      const result = {
        model,
        environment,
        service,
        policy,
        endpoint: url.toString(),
        durationMs: Math.round(import_node_perf_hooks2.performance.now() - started),
        protocol: socket?.getProtocol(),
        cipher: socket?.getCipher(),
        authorized: socket?.authorized || false,
        authorizationError: socket?.authorizationError || null,
        chain: chainMetadata(socket),
        ...data
      };
      agent.destroy();
      resolve2(result);
    };
    const request = import_node_https2.default.get(url, { agent }, (response) => {
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
      });
      response.on("end", () => finish({ http: response.statusCode, bytes, success: response.statusCode === 200 }));
      response.on("error", (error) => finish({ error: error.code || "RESPONSE_ERROR", success: false }));
    });
    const deadline = setTimeout(() => request.destroy(Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" })), 15e3);
    request.on("socket", (s) => {
      socket = s;
    });
    request.on("error", (error) => finish({ error: error.code || "HTTPS_ERROR", success: false }));
  });
}
async function main() {
  const mode = process.argv[2];
  if (mode === "artifact-reads") {
    await testArtifactPostgrestReads();
  } else if (mode === "openssl") {
    const extracted = extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || "", process.env.NFE_CERTIFICATE_PASSWORD || "");
    const probeDirectory = import_node_fs2.default.mkdtempSync(import_node_path2.default.join(import_node_os.default.tmpdir(), "morantehub-openssl-client-"));
    const clientFile = import_node_path2.default.join(probeDirectory, "encrypted-client.pem");
    const encryptedKey = import_node_forge2.default.pki.encryptRsaPrivateKey(
      import_node_forge2.default.pki.privateKeyFromPem(extracted.privateKeyPem),
      process.env.NFE_CERTIFICATE_PASSWORD || "",
      { algorithm: "aes256" }
    );
    import_node_fs2.default.writeFileSync(clientFile, extracted.certPem + encryptedKey, { mode: 384 });
    try {
      for (const model of ["55", "65"]) {
        const hostname = `homologacao.${model === "65" ? "nfce" : "nfe"}.sefa.pr.gov.br`;
        const response = (0, import_node_child_process.spawnSync)(
          "C:/Program Files/Git/usr/bin/openssl.exe",
          [
            "s_client",
            "-connect",
            `${hostname}:443`,
            "-servername",
            hostname,
            "-verify_return_error",
            "-verify_hostname",
            hostname,
            "-CAfile",
            import_node_path2.default.join(import_node_os.default.tmpdir(), "morantehub-official-v10.pem"),
            "-brief",
            "-cert",
            clientFile,
            "-key",
            clientFile,
            "-pass",
            "env:NFE_CERTIFICATE_PASSWORD"
          ],
          { input: "", encoding: "utf8", timeout: 2e4, windowsHide: true }
        );
        const output = response.stdout + response.stderr;
        const metadata = output.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(CONNECTION ESTABLISHED|Protocol version:|Ciphersuite:|Verification:|Verified peername:)/.test(line));
        const success = response.status === 0 && metadata.includes("Verification: OK");
        console.log(JSON.stringify({
          model,
          hostname,
          policy: "openssl-verified-v10-mtls",
          success,
          exitCode: response.status,
          metadata,
          ...!success ? { errorCode: response.error && "code" in response.error ? response.error.code : output.match(/error:([A-Fa-f0-9]+):/)?.[1] || "OPENSSL_VERIFICATION_FAILED" } : {}
        }));
        if (!success) process.exitCode = 1;
      }
    } finally {
      import_node_fs2.default.unlinkSync(clientFile);
      import_node_fs2.default.rmdirSync(probeDirectory);
    }
  } else if (mode === "env") {
    console.log(JSON.stringify({
      label,
      node: process.version,
      openssl: process.versions.openssl,
      startupExtraCA: Boolean(process.env.NODE_EXTRA_CA_CERTS),
      defaultCACount: (0, import_node_tls2.getCACertificates)("default").length,
      ...inspectEnv(process.env)
    }));
  } else if (mode === "local") {
    const files = [".env", ".env.local", ".env.development.local", "erp/.env", "erp/.env.local", "erp/.env.development.local"];
    console.log(JSON.stringify({ label: "local-files", files: files.filter((f) => import_node_fs2.default.existsSync(import_node_path2.default.join(root, f))).map((f) => ({ file: f, ...inspectEnv(import_dotenv.default.parse(import_node_fs2.default.readFileSync(import_node_path2.default.join(root, f)))) })) }));
  } else if (mode === "reconcile-http") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    if (new URL(url).hostname !== "hkoxhourxwlddgsfdgws.supabase.co") throw new Error("AUDIT_PROJECT_MISMATCH");
    const db = (0, import_supabase_js.createClient)(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: doc, error } = await db.from("nfe_documents").select("id,ambiente,modelo,emission_request_id").eq("emission_request_id", "aa1146c0-ea67-47aa-9ec6-8af7e5907dcd").single();
    if (error || doc?.ambiente !== 2 || doc.modelo !== "65") throw new Error("AUDIT_DOCUMENT_MISMATCH");
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL;
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    if (!email || !password) throw new Error("AUDIT_OPERATOR_UNAVAILABLE");
    const operator = (0, import_supabase_js.createClient)(url, process.env.VITE_SUPABASE_ANON_KEY || "", { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await operator.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw new Error("AUDIT_OPERATOR_AUTH_FAILED");
    try {
      const response = await fetch("http://127.0.0.1:5173/api/nfe/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${login.data.session.access_token}` },
        body: JSON.stringify({ documentId: doc.id }),
        signal: AbortSignal.timeout(45e3),
        redirect: "error"
      });
      const result = await response.json();
      const success = result.state === "authorized" || result.state === "not_found" && result.pending === false;
      console.log(JSON.stringify({
        mode,
        environment: 2,
        model: "65",
        documentId: doc.id,
        emissionRequestId: doc.emission_request_id,
        endpoint: "/api/nfe/consult",
        http: response.status,
        code: result.code,
        cStat: result.cStat,
        state: result.state,
        pending: result.pending,
        success,
        protocolPresent: Boolean(result.protocolNumber),
        retransmissionEnabled: false,
        emissionTriggered: false
      }));
      if (!success) process.exitCode = 1;
    } finally {
      await operator.auth.signOut({ scope: "local" });
    }
  } else if (mode === "operational") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    if (new URL(url).hostname !== "hkoxhourxwlddgsfdgws.supabase.co") throw new Error("AUDIT_PROJECT_MISMATCH");
    const db = (0, import_supabase_js.createClient)(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: doc, error } = await db.from("nfe_documents").select("id,order_id,ambiente,modelo,numero_nfe,serie,status,emission_request_id,fiscal_snapshot_id,chave_acesso,xml_nfe,hml_response_history,numero_protocolo,updated_at").eq("emission_request_id", "aa1146c0-ea67-47aa-9ec6-8af7e5907dcd").single();
    if (error || doc?.ambiente !== 2) throw new Error("AUDIT_DOCUMENT_MISMATCH");
    const { captureOperationalState } = require(import_node_path2.default.join(root, "scripts/testing/nfe-operational-audit.cjs"));
    const operational = await captureOperationalState(db, doc.order_id);
    const { data: snapshot, error: snapshotError } = await db.from("nfe_fiscal_snapshots").select("snapshot_data,snapshot_sha256").eq("id", doc.fiscal_snapshot_id).single();
    if (snapshotError) throw new Error("AUDIT_SNAPSHOT_MISSING");
    const hash = (value) => (0, import_node_crypto3.createHash)("sha256").update(value).digest("hex");
    console.log(JSON.stringify({
      projectRef: "hkoxhourxwlddgsfdgws",
      emissionRequestId: doc.emission_request_id,
      documentId: doc.id,
      orderId: doc.order_id,
      model: doc.modelo,
      environment: doc.ambiente,
      number: doc.numero_nfe,
      series: doc.serie,
      status: doc.status,
      keyHash: hash(doc.chave_acesso || ""),
      xmlHash: hash(doc.xml_nfe || ""),
      xmlBytes: Buffer.byteLength(doc.xml_nfe || ""),
      snapshotId: doc.fiscal_snapshot_id,
      snapshotHash: hash(JSON.stringify(snapshot.snapshot_data)),
      protocolPresent: Boolean(doc.numero_protocolo),
      historyCount: doc.hml_response_history?.length,
      updatedAt: doc.updated_at,
      operational: operational.map((item, index) => ({ table: ["orders", "order_items", "order_payments", "inventory_moves", "accounts_receivable", "financial_transactions"][index], ...item }))
    }));
  } else if (mode === "operator") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    const projectRef2 = (() => {
      try {
        return new URL(url).hostname.split(".")[0];
      } catch {
        return "";
      }
    })();
    const projectMatches = projectRef2 === "hkoxhourxwlddgsfdgws";
    const vercelDevelopment = process.env.VERCEL_ENV === "development";
    const environmentOk = vercelDevelopment;
    const operatorEmailPresent = Boolean(email);
    const credentialsPresent = Boolean(password && process.env.VITE_SUPABASE_ANON_KEY);
    if (!projectMatches || !environmentOk || !operatorEmailPresent || !credentialsPresent) {
      console.log(JSON.stringify({
        mode,
        projectRef: projectRef2,
        projectMatches,
        vercelDevelopment,
        environmentOk,
        operatorEmailPresent,
        credentialsPresent,
        authenticated: false,
        administratorCheckOk: false,
        isAdministrator: false
      }));
      process.exitCode = 1;
      return;
    }
    const operator = (0, import_supabase_js.createClient)(url, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const login = await operator.auth.signInWithPassword({ email, password });
    const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) && login.data.user?.email?.trim().toLowerCase() === email;
    const authenticated = authenticatedIdentityMatches;
    if (!authenticated) {
      console.log(JSON.stringify({
        mode,
        projectRef: projectRef2,
        environment: 2,
        operatorEmailPresent: true,
        authenticated: false,
        authenticatedIdentityMatches: false,
        administratorCheckOk: false,
        isAdministrator: false
      }));
      process.exitCode = 1;
    } else {
      const role = await operator.rpc("is_administrator");
      console.log(JSON.stringify({
        mode,
        projectRef: projectRef2,
        environment: 2,
        operatorEmailPresent: true,
        authenticated: true,
        authenticatedIdentityMatches: true,
        administratorCheckOk: !role.error,
        isAdministrator: !role.error && role.data === true
      }));
      if (role.error || role.data !== true) process.exitCode = 1;
    }
  } else if (mode === "artifact-resolve") {
    const [runId, orderId, scenarioKey] = process.argv.slice(3);
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase();
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD;
    const projectRef2 = (() => {
      try {
        return new URL(url).hostname.split(".")[0];
      } catch {
        return "";
      }
    })();
    if (projectRef2 !== "hkoxhourxwlddgsfdgws" || process.env.VERCEL_ENV !== "development" || !email || !password || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.log(JSON.stringify({
        mode,
        projectMatches: projectRef2 === "hkoxhourxwlddgsfdgws",
        vercelDevelopment: process.env.VERCEL_ENV === "development",
        authenticated: false,
        authenticatedIdentityMatches: false,
        administratorCheckOk: false,
        artifactValid: false,
        errorCode: "RUNTIME_OR_PROJECT_MISMATCH"
      }));
      process.exitCode = 1;
      return;
    }
    const operator = (0, import_supabase_js.createClient)(url, process.env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const login = await operator.auth.signInWithPassword({ email, password });
    const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) && login.data.user?.email?.trim().toLowerCase() === email;
    if (!authenticatedIdentityMatches) {
      console.log(JSON.stringify({
        mode,
        projectMatches: true,
        vercelDevelopment: true,
        authenticated: false,
        authenticatedIdentityMatches: false,
        administratorCheckOk: false,
        artifactValid: false,
        errorCode: "CONFIGURED_OPERATOR_AUTHENTICATION_FAILED"
      }));
      process.exitCode = 1;
      return;
    }
    const { loadPersistedFiscalOrder } = require(import_node_path2.default.join(root, "scripts/testing/fiscal-persisted-artifact.cjs"));
    try {
      const artifact = await loadPersistedFiscalOrder(operator, { orderId, runId, scenarioKey, expectedEmail: email });
      console.log(JSON.stringify({
        mode,
        projectMatches: true,
        vercelDevelopment: true,
        environment: 2,
        authenticated: true,
        authenticatedIdentityMatches: true,
        administratorCheckOk: true,
        artifactValid: true,
        scenarioKey: artifact.scenarioKey,
        deliveryMethod: artifact.deliveryMethod,
        status: artifact.status,
        itemCount: artifact.itemCount,
        paymentCount: artifact.paymentCount
      }));
    } catch (error) {
      const code = error && typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "PERSISTED_ARTIFACT_VALIDATION_FAILED";
      console.log(JSON.stringify({
        mode,
        projectMatches: true,
        vercelDevelopment: true,
        environment: 2,
        authenticated: true,
        authenticatedIdentityMatches: true,
        administratorCheckOk: true,
        artifactValid: false,
        errorCode: code
      }));
      process.exitCode = 1;
    }
  } else if (mode === "policy-status") {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const projectRef2 = (() => {
      try {
        return new URL(url).hostname.split(".")[0];
      } catch {
        return "";
      }
    })();
    const projectMatches = projectRef2 === "hkoxhourxwlddgsfdgws";
    const vercelDevelopment = process.env.VERCEL_ENV === "development";
    const environmentOk = vercelDevelopment;
    const serviceCredentialPresent = Boolean(apiKey);
    const emptyStatus = {
      mode,
      projectMatches,
      vercelDevelopment,
      environmentOk,
      serviceCredentialPresent,
      rpcReachable: false,
      policyStatusValid: false,
      ready: false,
      policyVersion: "",
      behavioralProofRequired: true
    };
    if (!projectMatches || !environmentOk || !serviceCredentialPresent) {
      console.log(JSON.stringify(emptyStatus));
      process.exitCode = 1;
      return;
    }
    let response;
    try {
      const headers = { apikey: apiKey, "content-type": "application/json" };
      if (apiKey.startsWith("eyJ")) headers.authorization = `Bearer ${apiKey}`;
      response = await fetch(new URL("/rest/v1/rpc/test_artifact_policy_status", url), {
        method: "POST",
        headers,
        body: "{}",
        signal: AbortSignal.timeout(1e4)
      });
    } catch {
      console.log(JSON.stringify(emptyStatus));
      process.exitCode = 1;
      return;
    }
    let status;
    try {
      status = await response.json();
    } catch {
      status = null;
    }
    const policy = status;
    const policyStatusValid = Boolean(
      policy && typeof policy.ready === "boolean" && typeof policy.policyVersion === "string" && typeof policy.behavioralProofRequired === "boolean"
    );
    const ready = policyStatusValid && policy?.ready === true;
    const policyVersion = typeof policy?.policyVersion === "string" ? policy.policyVersion : "";
    const behavioralProofRequired = policy?.behavioralProofRequired !== false;
    console.log(JSON.stringify({
      ...emptyStatus,
      rpcHttpStatus: response.status,
      rpcReachable: response.ok,
      policyStatusValid,
      ready,
      policyVersion,
      behavioralProofRequired
    }));
    if (!response.ok || !policyStatusValid || !ready || policyVersion !== "json-artifacts-v1" || behavioralProofRequired) {
      process.exitCode = 1;
    }
  } else if (mode === "wsdl") {
    const model = process.argv[3];
    const policy = process.argv[4] || "erp";
    const environment = process.argv[5] === "1" ? 1 : 2;
    const services = ["NFeAutorizacao4", "NFeRetAutorizacao4", "NFeConsultaProtocolo4", "NFeStatusServico4", "NFeRecepcaoEvento4", "NFeInutilizacao4"];
    if (!["55", "65"].includes(model)) throw new Error("AUDIT_MODEL_INVALID");
    for (const service of services) {
      const result = await wsdl(model, service, policy, environment);
      console.log(JSON.stringify(result));
      if (!result.success) process.exitCode = 1;
    }
  } else if (mode === "status" || mode === "consult") {
    const model = process.argv[3] === "65" ? "65" : "55";
    const segment = model === "65" ? "nfce" : "nfe";
    let accessKey;
    if (mode === "consult") {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      if (new URL(url).hostname !== "hkoxhourxwlddgsfdgws.supabase.co") throw new Error("AUDIT_PROJECT_MISMATCH");
      const db = (0, import_supabase_js.createClient)(url, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false, autoRefreshToken: false } });
      let query = db.from("nfe_documents").select("chave_acesso,ambiente,modelo").eq("ambiente", 2).eq("modelo", model);
      query = model === "65" ? query.eq("emission_request_id", "aa1146c0-ea67-47aa-9ec6-8af7e5907dcd") : query.eq("status", "homologada").not("chave_acesso", "is", null).order("created_at", { ascending: false }).limit(1);
      const { data, error } = await query.single();
      if (error || data?.ambiente !== 2 || data.modelo !== model) throw new Error("AUDIT_DOCUMENT_MISMATCH");
      accessKey = data.chave_acesso;
    }
    const service = mode === "status" ? "NFeStatusServico4" : "NFeConsultaProtocolo4";
    const cert = extractCertificateAndKey(process.env.NFE_CERTIFICATE_BASE64 || "", process.env.NFE_CERTIFICATE_PASSWORD || "");
    const xmlPayload = mode === "status" ? '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>' : `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
    const result = await sendSoapToSefaz({
      url: `https://homologacao.${segment}.sefa.pr.gov.br/${segment}/${service}`,
      action: `http://www.portalfiscal.inf.br/nfe/wsdl/${service}/${mode === "status" ? "nfeStatusServicoNF" : "nfeConsultaNF"}`,
      xmlPayload,
      serviceNamespace: `http://www.portalfiscal.inf.br/nfe/wsdl/${service}`,
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem
    });
    const cStat = result.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    console.log(JSON.stringify({
      mode,
      model,
      environment: 2,
      cStat,
      success: mode === "status" ? cStat === "107" : ["100", "150", "217", "101", "151", "155"].includes(cStat || ""),
      reason: result.match(/<xMotivo>(.*?)<\/xMotivo>/)?.[1],
      responseBytes: result.length,
      protocolPresent: /<nProt>/.test(result)
    }));
    if (!cStat || mode === "status" && cStat !== "107") process.exitCode = 1;
  } else if (mode === "perf") {
    const timings = {};
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const db = (0, import_supabase_js.createClient)(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const pfx = process.env.NFE_CERTIFICATE_BASE64 || "";
    const pass = process.env.NFE_CERTIFICATE_PASSWORD || "";
    let t0 = import_node_perf_hooks2.performance.now();
    const cert = extractCertificateAndKey(pfx, pass);
    timings.cert_extract_cold_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    extractCertificateAndKey(pfx, pass);
    timings.cert_extract_warm_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    const { data: doc } = await db.from("nfe_documents").select("xml_nfe, chave_acesso, numero_nfe, serie").eq("ambiente", 2).eq("modelo", "55").eq("status", "homologada").not("xml_nfe", "is", null).order("created_at", { ascending: false }).limit(1).single();
    timings.db_fetch_sample_xml_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    const sampleXml = doc?.xml_nfe || "";
    if (sampleXml) {
      t0 = import_node_perf_hooks2.performance.now();
      await validateNfeAgainstOfficialSchema(sampleXml);
      timings.schema_validation_cold_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
      t0 = import_node_perf_hooks2.performance.now();
      await validateNfeAgainstOfficialSchema(sampleXml);
      timings.schema_validation_warm_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
      const unsignedXml = sampleXml.replace(/<Signature[\s\S]*?<\/Signature>/, "");
      t0 = import_node_perf_hooks2.performance.now();
      await validateUnsignedNfeStructure(unsignedXml);
      timings.xml_unsigned_validation_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
      t0 = import_node_perf_hooks2.performance.now();
      signNfeXml(unsignedXml, cert.privateKeyPem, cert.certDerBase64);
      timings.xml_signing_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    }
    t0 = import_node_perf_hooks2.performance.now();
    await db.from("settings").select("data").eq("id", "app").maybeSingle();
    timings.db_settings_read_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    await db.from("orders").select("id,order_type,status,deleted,order_data,version,updated_at").limit(1).maybeSingle();
    timings.db_orders_read_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    await db.from("ncms").select("code,active,is_active,start_date,end_date").in("code", ["94036000"]);
    timings.db_ncms_read_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    await db.from("products").select("id,fiscal,unit").limit(5);
    timings.db_products_read_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    await db.rpc("test_artifact_policy_status");
    timings.db_rpc_ping_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    const statusPayload = '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>';
    const statusResult = await sendSoapToSefaz({
      url: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF",
      xmlPayload: statusPayload,
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4",
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem
    });
    timings.sefaz_status_soap_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    const statusCStat = statusResult.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    if (doc?.chave_acesso) {
      t0 = import_node_perf_hooks2.performance.now();
      const consultPayload = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
      const consultResult = await sendSoapToSefaz({
        url: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4",
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
        xmlPayload: consultPayload,
        serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
        certPem: cert.certPem,
        privateKeyPem: cert.privateKeyPem
      });
      timings.sefaz_consult_soap_ms = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    }
    const { data: recentAttempts55 } = await db.from("nfe_outbound_attempts").select("id, model, environment, state, created_at, transmission_started_at, updated_at").eq("model", "55").order("created_at", { ascending: false }).limit(5);
    const { data: recentAttempts65 } = await db.from("nfe_outbound_attempts").select("id, model, environment, state, created_at, transmission_started_at, updated_at").eq("model", "65").order("created_at", { ascending: false }).limit(5);
    const recentAttempts = [...recentAttempts55 || [], ...recentAttempts65 || []];
    const historical = (recentAttempts || []).map((att) => {
      const created = Date.parse(att.created_at);
      const started = att.transmission_started_at ? Date.parse(att.transmission_started_at) : null;
      const updated = Date.parse(att.updated_at);
      return {
        model: att.model,
        environment: att.environment,
        state: att.state,
        prep_to_transmit_ms: started ? started - created : null,
        transmission_to_result_ms: started ? updated - started : null,
        total_attempt_ms: updated - created
      };
    });
    console.log(JSON.stringify({
      mode: "perf",
      success: true,
      statusCStat,
      timings,
      historical
    }));
  } else if (mode === "keepalive") {
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const pwd = process.env.NFE_CERTIFICATE_PASSWORD || "";
    if (!pfx) throw new Error("PFX_UNAVAILABLE");
    const cert = extractCertificateAndKey(pfx, pwd);
    const https3 = require("node:https");
    const { rootCertificates: rootCertificates2 } = require("node:tls");
    const { icpBrasilRoots: icpBrasilRoots2 } = require(import_node_path2.default.join(root, "api/nfe/icpBrasilRoots.ts"));
    const trustedSefazAuthorities2 = [.../* @__PURE__ */ new Set([...rootCertificates2, ...icpBrasilRoots2])];
    const axios2 = require("axios");
    const agent = new https3.Agent({
      cert: cert.certPem,
      key: cert.privateKeyPem,
      ca: trustedSefazAuthorities2,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      keepAlive: true,
      keepAliveMsecs: 15e3
    });
    const url = "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4";
    const action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF";
    const payload = '<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>41</cUF><xServ>STATUS</xServ></consStatServ>';
    const soapEnvelope = `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header/><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
    let t0 = import_node_perf_hooks2.performance.now();
    const res1 = await axios2.post(url, soapEnvelope, {
      httpsAgent: agent,
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`,
        "Content-Length": Buffer.byteLength(soapEnvelope, "utf8"),
        Accept: "application/soap+xml, text/xml"
      },
      timeout: 25e3
    });
    const d1 = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    t0 = import_node_perf_hooks2.performance.now();
    const res2 = await axios2.post(url, soapEnvelope, {
      httpsAgent: agent,
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`,
        "Content-Length": Buffer.byteLength(soapEnvelope, "utf8"),
        Accept: "application/soap+xml, text/xml"
      },
      timeout: 25e3
    });
    const d2 = Number((import_node_perf_hooks2.performance.now() - t0).toFixed(2));
    const connHeader1 = res1.headers["connection"];
    const connHeader2 = res2.headers["connection"];
    const statusCStat = res2.data.match(/<cStat>(\d+)<\/cStat>/)?.[1];
    agent.destroy();
    console.log(JSON.stringify({
      mode: "keepalive",
      success: true,
      statusCStat,
      request1_duration_ms: d1,
      request2_duration_ms: d2,
      saved_ms: Number((d1 - d2).toFixed(2)),
      connection_header_1: connHeader1,
      connection_header_2: connHeader2,
      socket_reused: d2 < d1
    }));
  } else throw new Error("AUDIT_MODE_INVALID");
}
main().catch((error) => {
  console.error(JSON.stringify({ label, errorCode: error.code || "AUDIT_FAILED", transportCode: error.cause?.code || null }));
  process.exitCode = 1;
});
