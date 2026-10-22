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

// api/nfe/consult.ts
var consult_exports = {};
__export(consult_exports, {
  default: () => handler
});
module.exports = __toCommonJS(consult_exports);

// shared-utils/fiscalIdentifiers.ts
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;
function normalizeFiscalIdentifier(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
}

// api/supabaseSecretKey.ts
var import_dotenv = __toESM(require("dotenv"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var localEnvironmentLoaded = false;
function ensureEnvLoaded() {
  if (process.env.MORANTE_ENV_SOURCE === "vercel-development" || process.env.VERCEL_ENV || process.env.NODE_ENV === "test" || localEnvironmentLoaded)
    return;
  localEnvironmentLoaded = true;
  const candidateDirs = [
    process.cwd(),
    import_path.default.resolve(process.cwd(), ".."),
    __dirname,
    import_path.default.resolve(__dirname, ".."),
    import_path.default.resolve(__dirname, "../.."),
    import_path.default.resolve(__dirname, "../../..")
  ];
  for (const dir of candidateDirs) {
    for (const file of [".env.local", ".env"]) {
      const fullPath = import_path.default.resolve(dir, file);
      if (import_fs.default.existsSync(fullPath)) {
        import_dotenv.default.config({ path: fullPath, override: false, quiet: true });
      }
    }
  }
}
ensureEnvLoaded();
function getSupabaseSecretKey() {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.service_role?.trim();
}

// api/nfe/consult.ts
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
function sefazTransportDiagnostic(error) {
  return error instanceof SefazTransportError ? error.diagnostic : buildSefazTransportDiagnostic(error);
}

// api/nfe/sefazE2eSimulator.ts
var OPERATIONAL_SUPABASE_REFS = /* @__PURE__ */ new Set([
  "hkoxhourxwlddgsfdgws",
  "wzpdfmihnwcrgkyagwkd"
]);
var APPROVED_SEFAZ_HOSTS = /* @__PURE__ */ new Set([
  "homologacao.nfe.sefa.pr.gov.br",
  "homologacao.nfce.sefa.pr.gov.br"
]);
function projectRef(supabaseUrl2) {
  if (!supabaseUrl2) return null;
  try {
    const url = new URL(supabaseUrl2);
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

// api/nfe/consult.ts
var import_node_crypto10 = require("node:crypto");

// erp/src/pages/utils/nfe/nfeEventRules.ts
var readTag = (xml, tag2) => {
  const name = `(?:[\\w.-]+:)?${tag2}`;
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
};
var parseSefazCancellationEvent = (xml, expected) => {
  const events = [...xml.matchAll(/<(?:[\w.-]+:)?retEvento\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?retEvento>/gi)];
  const eventResponse = events[0]?.[0];
  if (!eventResponse) {
    const lotStatus = readTag(xml, "cStat");
    return {
      cStat: lotStatus,
      xMotivo: readTag(xml, "xMotivo") || "Retorno da SEFAZ sem resultado final do evento.",
      protocolNumber: null,
      protocolDate: null,
      registered: false,
      pending: !lotStatus || ["100", "101", "108", "109", "128", "135", "155", "573", "999"].includes(lotStatus)
    };
  }
  const cStat = readTag(eventResponse, "cStat");
  if (expected && (events.length !== 1 || readTag(eventResponse, "tpAmb") !== String(expected.environment) || readTag(eventResponse, "chNFe") !== expected.accessKey || readTag(eventResponse, "tpEvento") !== "110111" || readTag(eventResponse, "nSeqEvento") !== "1" || ["135", "155"].includes(cStat || "") && !/^\d{15}$/.test(readTag(eventResponse, "nProt") || ""))) return {
    cStat,
    xMotivo: "Resposta do evento n\xE3o corresponde ao documento, ambiente ou protocolo esperado. Consulte antes de repetir.",
    protocolNumber: null,
    protocolDate: null,
    registered: false,
    pending: true
  };
  return {
    cStat,
    xMotivo: readTag(eventResponse, "xMotivo"),
    protocolNumber: readTag(eventResponse, "nProt"),
    protocolDate: readTag(eventResponse, "dhRegEvento"),
    registered: cStat === "135" || cStat === "155",
    pending: !cStat || ["128", "136", "573"].includes(cStat)
  };
};
var parseSefazNfeSituation = (xml) => {
  const consultation = xml.match(/<(?:[\w.-]+:)?retConsSitNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?retConsSitNFe>/i)?.[1];
  const currentStatus = consultation ? readTag(consultation, "cStat") : null;
  if (currentStatus && currentStatus !== "100") {
    return {
      cStat: currentStatus,
      xMotivo: readTag(consultation || "", "xMotivo"),
      state: currentStatus === "101" ? "cancelled" : currentStatus === "217" ? "not_found" : "unknown",
      cancellationEventXml: currentStatus === "101" ? findCancellationEvent(xml) : null
    };
  }
  const cancellationEventXml = findCancellationEvent(xml);
  if (cancellationEventXml) {
    return {
      cStat: readTag(cancellationEventXml, "cStat"),
      xMotivo: readTag(cancellationEventXml, "xMotivo"),
      state: "cancelled",
      cancellationEventXml
    };
  }
  const protocol = xml.match(/<(?:[\w.-]+:)?infProt\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?infProt>/i)?.[0] || xml;
  const cStat = currentStatus || readTag(protocol, "cStat");
  return {
    cStat,
    xMotivo: readTag(consultation || protocol, "xMotivo"),
    state: cStat === "100" ? "authorized" : cStat === "101" ? "cancelled" : cStat === "217" ? "not_found" : "unknown",
    cancellationEventXml
  };
};
function findCancellationEvent(xml) {
  const eventBlocks = [...xml.matchAll(/<(?:[\w.-]+:)?procEventoNFe\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?procEventoNFe>/gi)].map(
    (match) => match[0]
  );
  return eventBlocks.find(
    (event) => readTag(event, "tpEvento") === "110111" && ["135", "155"].includes(readTag(event, "cStat") || "")
  ) || null;
}

// erp/src/pages/utils/nfe/sefazResponseParser.ts
function firstTag(xml, tag2) {
  const qualifiedTag = `(?:[\\w.-]+:)?${tag2}`;
  return xml.match(new RegExp(`<${qualifiedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${qualifiedTag}>`, "i"))?.[1]?.trim() || "";
}
function decodeXmlText(value) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
function parseSefazAuthorization(xml) {
  const protocolXml = xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || "";
  const batchStatus = firstTag(xml, "cStat");
  const protocolStatus = protocolXml ? firstTag(protocolXml, "cStat") : "";
  const cStat = protocolStatus || batchStatus;
  const xMotivo = decodeXmlText(firstTag(protocolXml || xml, "xMotivo"));
  const protocolNumber = firstTag(protocolXml, "nProt") || void 0;
  const protocolDate = firstTag(protocolXml, "dhRecbto") || void 0;
  const authorized = cStat === "100" && Boolean(protocolNumber);
  const pending = !protocolXml && ["103", "104", "105"].includes(batchStatus);
  return { authorized, pending, cStat, xMotivo, protocolNumber, protocolDate };
}

// api/nfe/consultAuthorizedDocument.ts
var import_node_crypto3 = require("node:crypto");
var import_xmldom = require("@xmldom/xmldom");

// api/nfe/fiscalEnvironmentPolicy.ts
function getNfeServiceEndpoint(model, environment, service) {
  if (model !== "55" && model !== "65") throw new Error("Unsupported NF-e model.");
  if (environment !== 1 && environment !== 2) throw new Error("Unsupported fiscal environment.");
  if (service !== "NFeAutorizacao4" && service !== "NFeConsultaProtocolo4" && service !== "NFeRecepcaoEvento4")
    throw new Error("Unsupported SEFA/PR fiscal service.");
  const prefix = model === "65" ? "nfce" : "nfe";
  const host = environment === 2 ? `homologacao.${prefix}` : prefix;
  return `https://${host}.sefa.pr.gov.br/${prefix}/${service}`;
}

// api/nfe/consultAuthorizedDocument.ts
function matchesConsultedDocument(response, doc, currentStatus = "100") {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return false;
    const errors = [];
    const xml = new import_xmldom.DOMParser({
      errorHandler: (level, message) => {
        if (level === "warning" && String(message).includes("errorHandler") && String(message).includes("deprecated")) return;
        errors.push(String(message));
      }
    }).parseFromString(response, "text/xml");
    if (!xml || errors.length) return false;
    const results = xml.getElementsByTagNameNS("*", "retConsSitNFe");
    if (results.length !== 1) return false;
    const result = results[0];
    const directValue = (element, name) => {
      const children2 = Array.from(element.childNodes).filter(
        (node) => node.nodeType === 1 && "localName" in node && node.localName === name
      );
      return children2.length === 1 ? children2[0].textContent?.trim() : void 0;
    };
    const protocols = result.getElementsByTagNameNS("*", "infProt");
    if (currentStatus === "217") return protocols.length === 0 && directValue(result, "tpAmb") === String(doc.ambiente) && directValue(result, "chNFe") === doc.chave_acesso && directValue(result, "cStat") === "217";
    return protocols.length === 1 && [result, protocols[0]].every(
      (element) => directValue(element, "tpAmb") === String(doc.ambiente) && directValue(element, "chNFe") === doc.chave_acesso
    ) && directValue(result, "cStat") === currentStatus && directValue(protocols[0], "cStat") === "100" && directValue(protocols[0], "nProt") === doc.numero_protocolo;
  } catch {
    return false;
  }
}
async function consultAuthorizedDocument(doc) {
  const identity = { documentId: doc.id, orderId: doc.order_id, environment: doc.ambiente, model: doc.modelo };
  const failure2 = (status, code, error, extra = {}) => ({
    status,
    body: { ...identity, success: false, code, error, ...extra }
  });
  if (!["55", "65"].includes(doc.modelo) || ![1, 2].includes(doc.ambiente) || doc.status !== (doc.ambiente === 1 ? "autorizada" : "homologada") || !ACCESS_KEY_PATTERN.test(doc.chave_acesso) || doc.chave_acesso.slice(20, 22) !== doc.modelo || !/^\d{15}$/.test(doc.numero_protocolo || "")) return failure2(409, "FISCAL_AUTHORIZED_DOCUMENT_INVALID", "Documento autorizado sem identidade fiscal v\xE1lida para consulta.");
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure2(503, "FISCAL_CERTIFICATE_UNAVAILABLE", "Certificado A1 indispon\xEDvel para consulta.");
  let certificate;
  try {
    certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || "");
  } catch {
    return failure2(503, "FISCAL_CERTIFICATE_INVALID", "Certificado A1 inv\xE1lido para consulta.");
  }
  let response;
  try {
    response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(doc.modelo, doc.ambiente, "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${doc.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
  } catch {
    return failure2(502, "FISCAL_AUTHORIZED_CONSULT_UNKNOWN", "Consulta sem resposta confirmada. A autoriza\xE7\xE3o persistida foi preservada.", {
      pending: true,
      state: "unknown",
      sefazConsulted: false,
      reconciliationRequired: true
    });
  }
  const situation = parseSefazNfeSituation(response);
  const parsed = parseSefazAuthorization(response);
  const evidence = {
    sefazConsulted: true,
    consultedAt: (/* @__PURE__ */ new Date()).toISOString(),
    cStat: situation.cStat,
    xMotivo: situation.xMotivo,
    responseHash: (0, import_node_crypto3.createHash)("sha256").update(response).digest("hex")
  };
  if (situation.state !== "authorized" || !matchesConsultedDocument(response, doc)) {
    return failure2(409, "FISCAL_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED", "A consulta divergiu da autoriza\xE7\xE3o persistida. Reconcilie a situa\xE7\xE3o fiscal; nenhum documento foi alterado.", {
      ...evidence,
      pending: true,
      state: "unknown",
      observedState: situation.state,
      reconciliationRequired: true
    });
  }
  return { status: 200, body: { ...identity, ...evidence, success: true, state: "authorized", pending: false, protocolNumber: parsed.protocolNumber, protocolDate: parsed.protocolDate } };
}

// api/nfe/cancellationPersistence.ts
async function persistCancellationResult(db, doc, eventId, responseXml) {
  const result = parseSefazCancellationEvent(responseXml, {
    accessKey: doc.chave_acesso,
    environment: Number(doc.ambiente)
  });
  const eventStatus = result.registered ? "registered" : result.pending ? "unknown" : "rejected";
  let committed = false;
  try {
    const { data, error } = await db.rpc("persist_nfe_cancellation_result", {
      p_document_id: doc.id,
      p_event_id: eventId,
      p_environment: Number(doc.ambiente),
      p_status: eventStatus,
      p_response_xml: responseXml,
      p_cstat: result.cStat,
      p_reason: result.xMotivo,
      p_protocol: result.protocolNumber,
      p_protocol_date: result.protocolDate
    });
    committed = !error && data?.eventId === eventId && data?.status === eventStatus;
  } catch {
  }
  if (!committed)
    return {
      status: 503,
      body: {
        success: false,
        pending: true,
        sefazConfirmed: result.registered,
        reconciliationRequired: true,
        error: "O resultado fiscal precisa de reconcilia\xE7\xE3o: a grava\xE7\xE3o local n\xE3o foi confirmada. N\xE3o retransmita."
      }
    };
  return {
    status: result.registered ? 200 : result.pending ? 202 : 422,
    body: {
      success: result.registered,
      pending: result.pending,
      status: result.registered ? "cancelada" : void 0,
      cStat: result.cStat,
      xMotivo: result.xMotivo,
      protocolNumber: result.protocolNumber,
      protocolDate: result.protocolDate,
      reconciliationRequired: result.pending
    }
  };
}

// api/nfe/reconcileLegacyConsultation.ts
async function reconcileLegacyConsultation(db, doc, xml, consultationStartedAt) {
  const situation = parseSefazNfeSituation(xml);
  const protocol = parseSefazAuthorization(xml);
  const uncertain = (error2) => ({
    status: 409,
    body: {
      success: false,
      pending: true,
      state: "unknown",
      observedState: situation.state,
      reconciliationRequired: true,
      cStat: situation.cStat,
      error: error2
    }
  });
  if (!["authorized", "cancelled"].includes(situation.state) || doc.status === "cancelada") {
    return uncertain(
      "A consulta n\xE3o confirma uma transi\xE7\xE3o segura. O hist\xF3rico fiscal foi preservado."
    );
  }
  const expectedProtocol = doc.numero_protocolo || protocol.protocolNumber;
  if (!/^\d{15}$/.test(expectedProtocol || "") || !matchesConsultedDocument(
    xml,
    {
      ...doc,
      numero_protocolo: expectedProtocol || null
    },
    situation.state === "cancelled" ? "101" : "100"
  )) {
    return uncertain(
      "A identidade da consulta divergiu do documento. Nenhum registro foi alterado."
    );
  }
  const { data: event, error } = await db.from("nfe_document_events").select("id,status").eq("document_id", doc.id).eq("event_type", "110111").order("attempt_number", { ascending: false }).limit(1).maybeSingle();
  if (error) return uncertain("N\xE3o foi poss\xEDvel conferir o hist\xF3rico de cancelamento.");
  if (situation.state === "cancelled") {
    if (!event?.id)
      return uncertain(
        "Cancelamento externo sem tentativa local vinculada. Reconcilia\xE7\xE3o fiscal necess\xE1ria."
      );
    const result = await persistCancellationResult(db, doc, event.id, xml);
    return {
      ...result,
      body: { ...result.body, state: result.body.success ? "cancelled" : "unknown" }
    };
  }
  if (event?.status === "registered") {
    return uncertain(
      "O hist\xF3rico registra cancelamento, mas a consulta informa autoriza\xE7\xE3o. N\xE3o retransmita."
    );
  }
  try {
    const { data: committed, error: commitError } = await db.rpc(
      "persist_nfe_legacy_consultation",
      {
        p_document_id: doc.id,
        p_environment: Number(doc.ambiente),
        p_expected_status: doc.status,
        p_response_xml: xml,
        p_protocol: expectedProtocol,
        p_consultation_started_at: consultationStartedAt,
        p_event_id: event?.id || null
      }
    );
    if (commitError || committed?.documentId !== doc.id || committed?.status !== (Number(doc.ambiente) === 1 ? "autorizada" : "homologada"))
      return uncertain(
        "A reconcilia\xE7\xE3o local n\xE3o foi confirmada. Consulte novamente antes de repetir a opera\xE7\xE3o."
      );
  } catch {
    return uncertain(
      "A resposta da grava\xE7\xE3o local n\xE3o foi recebida. Consulte novamente antes de repetir a opera\xE7\xE3o."
    );
  }
  return {
    status: 200,
    body: {
      success: true,
      state: "authorized",
      cStat: "100",
      protocolNumber: expectedProtocol,
      protocolDate: protocol.protocolDate,
      cancellationAttemptState: event ? "not_registered" : void 0,
      reconciliationRequired: false
    }
  };
}

// erp/src/pages/utils/nfe/fiscalAuthorization.ts
var FISCAL_OPERATOR_ROLES = ["manager", "administrator"];
var fiscalOperatorRoles = new Set(FISCAL_OPERATOR_ROLES);
function getFiscalProfileRoles(profile) {
  const roles = /* @__PURE__ */ new Set();
  if (typeof profile?.role === "string") roles.add(profile.role);
  if (Array.isArray(profile?.roles)) {
    for (const role of profile.roles) {
      if (typeof role === "string") roles.add(role);
    }
  }
  return roles;
}
function hasFiscalOperationRole(profile) {
  return Array.from(getFiscalProfileRoles(profile)).some((role) => fiscalOperatorRoles.has(role));
}
function hasFiscalAdministratorRole(profile) {
  return profile?.role === "administrator" || Array.isArray(profile?.roles) && profile.roles.includes("administrator");
}

// api/nfe/fiscalAuthorization.ts
async function authorizeFiscalOperator(client, authorizationHeader) {
  const headerValue = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const token = String(headerValue || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, message: "Autentica\xE7\xE3o necess\xE1ria." };
  try {
    const { data, error } = await client.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) return { ok: false, status: 401, message: "Sess\xE3o inv\xE1lida." };
    const { data: profile, error: profileError } = await client.from("profiles").select("role,roles").eq("id", user.id).maybeSingle();
    if (profileError)
      return { ok: false, status: 503, message: "N\xE3o foi poss\xEDvel validar a permiss\xE3o fiscal." };
    if (!hasFiscalOperationRole(profile))
      return { ok: false, status: 403, message: "Seu perfil n\xE3o pode operar documentos fiscais." };
    return { ok: true, userId: user.id, isAdministrator: hasFiscalAdministratorRole(profile) };
  } catch {
    return { ok: false, status: 503, message: "N\xE3o foi poss\xEDvel validar a permiss\xE3o fiscal." };
  }
}

// shared-utils/fiscalNumbering.ts
var MAX_FISCAL_NUMBER = 999999999;
function isFiscalNumber(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= MAX_FISCAL_NUMBER;
}
function fiscalNumberConflict(number) {
  if (!isFiscalNumber(number)) throw new Error("N\xFAmero fiscal inv\xE1lido.");
  return { previousNumber: number, nextNumber: number < MAX_FISCAL_NUMBER ? number + 1 : null };
}
function isDifferentKeyNumberConflict(cStat, reason, ownKey) {
  if (cStat !== "539" || !ACCESS_KEY_PATTERN.test(ownKey)) return false;
  const otherKey = reason.match(/\[chNFe:\s*([0-9]{6}[A-Z0-9]{12}[0-9]{26})\]/)?.[1];
  return Boolean(otherKey && otherKey !== ownKey && otherKey.slice(0, 2) === ownKey.slice(0, 2) && otherKey.slice(6, 34) === ownKey.slice(6, 34));
}

// erp/src/pages/utils/nfe/nfeSequenceSettings.ts
function validateContributorNfeSeries(value) {
  const series = typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,3}$/.test(series) || Number(series) > 889)
    throw new Error(
      "A s\xE9rie deste emissor deve estar entre 0 e 889. A s\xE9rie 900 \xE9 reservada \xE0 emiss\xE3o avulsa pelo Fisco. Corrija a s\xE9rie nas configura\xE7\xF5es fiscais."
    );
  return String(Number(series));
}

// shared-utils/fiscalIcmsGroups.ts
var ZERO_OWN_ICMS_CSOSNS = ["102", "103", "300", "400"];
var CSOSN_CODES = ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"];
function zeroOwnIcmsGroup(csosn) {
  if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn))
    throw new Error(`CSOSN ${csosn || "n\xE3o informado"} exige determina\xE7\xE3o e grupo tribut\xE1rio espec\xEDficos.`);
  return "ICMSSN102";
}

// shared-utils/fiscalItemSelections.ts
var csosns = new Set(CSOSN_CODES);
var fields = ["ncm", "cfop", "origem", "cest", "csosn"];
function parseFiscalItemSelections(value) {
  if (value === void 0) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Sele\xE7\xF5es fiscais dos itens inv\xE1lidas.");
  const entries = Object.entries(value);
  if (entries.length > 990) throw new Error("Limite de 990 itens fiscais excedido.");
  return Object.fromEntries(entries.map(([key, raw]) => {
    if (!/^[1-9]\d{0,2}$/.test(key) || Number(key) > 990 || !raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error("Sele\xE7\xE3o fiscal referencia item inv\xE1lido.");
    const item = raw;
    if (Object.keys(item).length !== fields.length || fields.some((field) => typeof item[field] !== "string") || !/^\d{8}$/.test(item.ncm) || !/^[567]\d{3}$/.test(item.cfop) || !/^[0-8]$/.test(item.origem) || !/^(?:\d{7})?$/.test(item.cest) || !csosns.has(item.csosn))
      throw new Error(`NCM, CFOP, origem, CEST ou CSOSN inv\xE1lido no item ${key}.`);
    return [key, Object.fromEntries(fields.map((field) => [field, item[field]]))];
  }));
}

// api/nfe/fiscalSelectionIntegrity.ts
async function assertXmlFiscalSelections(snapshot, xml) {
  const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
  if (!Object.keys(selections).length) return;
  const { XmlDocument } = await import("libxml2-wasm");
  const parsed = XmlDocument.fromString(xml);
  try {
    const namespace = { n: "http://www.portalfiscal.inf.br/nfe" };
    const items = parsed.find("//n:NFe/n:infNFe/n:det", namespace);
    if (items.length !== Object.keys(selections).length)
      throw new Error("XML assinado diverge da quantidade de itens confirmada.");
    for (const [key, selected] of Object.entries(selections)) {
      const base = `//n:NFe/n:infNFe/n:det[@nItem='${key}']`;
      const paths = {
        ncm: "/n:prod/n:NCM",
        cfop: "/n:prod/n:CFOP",
        cest: "/n:prod/n:CEST",
        origem: "/n:imposto/n:ICMS/*/n:orig",
        csosn: "/n:imposto/n:ICMS/*/n:CSOSN"
      };
      for (const [field, suffix] of Object.entries(paths)) {
        const nodes = parsed.find(base + suffix, namespace);
        const expected = selected[field];
        if (nodes.length !== (expected === "" ? 0 : 1) || (nodes[0]?.content || "") !== expected)
          throw new Error(`XML assinado diverge do formul\xE1rio: item ${key}, campo ${field}.`);
      }
    }
  } finally {
    parsed.dispose();
  }
}

// api/nfe/normal-sale/constants.ts
var NORMAL_SALE_RULESET_VERSION = "NORMAL_SALE_V1";

// shared-utils/fiscal-cfop-model/data/cfopBaseCatalog.ts
var CFOP_CATALOG_BASE = [
  // --- SAÍDAS INTERNAS (5.xxx) ---
  {
    code: "5102",
    description: "Venda de mercadoria adquirida ou recebida de terceiros",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55", "65"],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: "Opera\xE7\xE3o padr\xE3o de venda varejo/com\xE9rcio no Paran\xE1."
  },
  {
    code: "5101",
    description: "Venda de produ\xE7\xE3o do estabelecimento",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55", "65"],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: "Venda de m\xF3veis e itens fabricados no estabelecimento no Paran\xE1."
  },
  {
    code: "5405",
    description: "Venda de mercadoria adquirida de terceiros com ST (Substitu\xEDdo)",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55", "65"],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: "Mercadoria com ICMS ST retido anteriormente (CSOSN 500) no Paran\xE1."
  },
  {
    code: "5403",
    description: "Venda de mercadoria de terceiros sujeita a ST na condi\xE7\xE3o de substituto tribut\xE1rio",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55", "65"],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: "Venda de mercadoria de terceiros em opera\xE7\xE3o com ST, na condi\xE7\xE3o de contribuinte substituto."
  },
  {
    code: "5104",
    description: "Venda de mercadoria adquirida de terceiros efetuada fora do estabelecimento",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55", "65"],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: "Venda realizada fora do estabelecimento (ex: entrega externa/feiras)."
  },
  {
    code: "5152",
    description: "Transfer\xEAncia de mercadoria adquirida ou recebida de terceiros",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isTransfer: true,
    notes: "Transfer\xEAncia entre filiais/dep\xF3sitos dentro do Paran\xE1."
  },
  {
    code: "5202",
    description: "Devolu\xE7\xE3o de compra para comercializa\xE7\xE3o",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    notes: "Devolu\xE7\xE3o de compra a fornecedor dentro do Paran\xE1."
  },
  {
    code: "5411",
    description: "Devolu\xE7\xE3o de compra para comercializa\xE7\xE3o com ST",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isSt: true,
    notes: "Devolu\xE7\xE3o de mercadoria com ST a fornecedor no Paran\xE1."
  },
  {
    code: "5910",
    description: "Remessa em bonifica\xE7\xE3o, doa\xE7\xE3o ou brinde",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Brindes ou bonifica\xE7\xF5es no Paran\xE1."
  },
  {
    code: "5912",
    description: "Remessa para demonstra\xE7\xE3o",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Remessa para demonstra\xE7\xE3o no Paran\xE1."
  },
  {
    code: "5914",
    description: "Remessa para exposi\xE7\xE3o ou feira",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Remessa para showroom/feira no Paran\xE1."
  },
  {
    code: "5915",
    description: "Remessa para conserto ou reparo",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Remessa para assist\xEAncia t\xE9cnica/conserto no Paran\xE1."
  },
  {
    code: "5949",
    description: "Outra sa\xEDda de mercadoria ou presta\xE7\xE3o de servi\xE7o n\xE3o especificado",
    direction: "outbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    notes: "Outras sa\xEDdas n\xE3o especificadas dentro do Paran\xE1."
  },
  {
    code: "5933",
    description: "Presta\xE7\xE3o de servi\xE7o tributado pelo ISSQN dentro do Estado",
    direction: "outbound",
    scope: "internal",
    itemType: "service",
    allowedModels: ["55"],
    active: true,
    notes: "Exclusivo para servi\xE7o sujeito a ISSQN. Proibido para venda de mercadoria."
  },
  // --- SAÍDAS INTERESTADUAIS (6.xxx) ---
  {
    code: "6102",
    description: "Venda de mercadoria adquirida ou recebida de terceiros para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: false,
    isSt: false,
    notes: "Classifica\xE7\xE3o de venda interestadual de terceiros; n\xE3o aprova a tributa\xE7\xE3o do cen\xE1rio."
  },
  {
    code: "6101",
    description: "Venda de produ\xE7\xE3o do estabelecimento para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: "Venda de produ\xE7\xE3o pr\xF3pria entregue em outra UF."
  },
  {
    code: "6108",
    description: "Venda de mercadoria adquirida de terceiros destinada a n\xE3o contribuinte",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: false,
    stApplicability: "scenario_dependent",
    notes: "CFOP de venda a n\xE3o contribuinte; aplicabilidade e tributos dependem do cen\xE1rio e da matriz aprovada."
  },
  {
    code: "6107",
    description: "Venda de produ\xE7\xE3o do estabelecimento destinada a n\xE3o contribuinte",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: true,
    isSt: false,
    notes: "Produ\xE7\xE3o pr\xF3pria para n\xE3o contribuinte em outra UF."
  },
  {
    code: "6404",
    description: "Venda de mercadoria sujeita a ST com imposto retido anteriormente",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: "Mercadoria com ST retido vendida para fora do Estado."
  },
  {
    code: "6403",
    description: "Venda de mercadoria de terceiros sujeita a ST na condi\xE7\xE3o de substituto tribut\xE1rio para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isOwnProduction: false,
    isSt: true,
    notes: "Venda interestadual de mercadoria de terceiros com ST, na condi\xE7\xE3o de contribuinte substituto."
  },
  {
    code: "6152",
    description: "Transfer\xEAncia de mercadoria adquirida de terceiros para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isTransfer: true,
    notes: "Transfer\xEAncia entre estabelecimentos em UFs distintas."
  },
  {
    code: "6202",
    description: "Devolu\xE7\xE3o de compra para comercializa\xE7\xE3o para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    notes: "Devolu\xE7\xE3o a fornecedor localizado em outra UF."
  },
  {
    code: "6411",
    description: "Devolu\xE7\xE3o de compra para comercializa\xE7\xE3o com ST para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isSt: true,
    notes: "Devolu\xE7\xE3o de mercadoria com ST a fornecedor em outra UF."
  },
  {
    code: "6910",
    description: "Remessa em bonifica\xE7\xE3o, doa\xE7\xE3o ou brinde para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Brindes ou bonifica\xE7\xF5es fora do Paran\xE1."
  },
  {
    code: "6912",
    description: "Remessa para demonstra\xE7\xE3o para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Demonstra\xE7\xE3o em outra UF."
  },
  {
    code: "6914",
    description: "Remessa para exposi\xE7\xE3o ou feira para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Exposi\xE7\xE3o ou feira em outra UF."
  },
  {
    code: "6915",
    description: "Remessa para conserto ou reparo para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isShipment: true,
    notes: "Envio para conserto em outra UF."
  },
  {
    code: "6949",
    description: "Outra sa\xEDda de mercadoria ou presta\xE7\xE3o de servi\xE7o n\xE3o especificado fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    notes: "Outras sa\xEDdas interestaduais n\xE3o especificadas."
  },
  {
    code: "6933",
    description: "Presta\xE7\xE3o de servi\xE7o tributado pelo ISSQN para fora do Estado",
    direction: "outbound",
    scope: "interstate",
    itemType: "service",
    allowedModels: ["55"],
    active: true,
    notes: "Exclusivo para servi\xE7o sujeito a ISSQN. Proibido para venda de mercadoria."
  },
  // --- ENTRADAS INTERNAS (1.xxx) ---
  {
    code: "1202",
    description: "Devolu\xE7\xE3o de venda de mercadoria adquirida ou recebida de terceiros",
    direction: "inbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    notes: "Entrada por devolu\xE7\xE3o de cliente dentro do Paran\xE1."
  },
  {
    code: "1201",
    description: "Devolu\xE7\xE3o de venda de produ\xE7\xE3o do estabelecimento",
    direction: "inbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isOwnProduction: true,
    notes: "Entrada por devolu\xE7\xE3o de venda de produ\xE7\xE3o pr\xF3pria no Paran\xE1."
  },
  {
    code: "1411",
    description: "Devolu\xE7\xE3o de venda de mercadoria adquirida de terceiros com ST",
    direction: "inbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isSt: true,
    notes: "Entrada devolu\xE7\xE3o de mercadoria com ST no Paran\xE1."
  },
  {
    code: "1949",
    description: "Outra entrada de mercadoria ou presta\xE7\xE3o de servi\xE7o n\xE3o especificada",
    direction: "inbound",
    scope: "internal",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    notes: "Entradas diversas / estorno conforme RICMS/PR art. 298."
  },
  // --- ENTRADAS INTERESTADUAIS (2.xxx) ---
  {
    code: "2202",
    description: "Devolu\xE7\xE3o de venda de mercadoria adquirida de terceiros fora do Estado",
    direction: "inbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    notes: "Entrada por devolu\xE7\xE3o de cliente localizado em outra UF."
  },
  {
    code: "2201",
    description: "Devolu\xE7\xE3o de venda de produ\xE7\xE3o do estabelecimento fora do Estado",
    direction: "inbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isOwnProduction: true,
    notes: "Entrada por devolu\xE7\xE3o de cliente de outra UF para produ\xE7\xE3o pr\xF3pria."
  },
  {
    code: "2411",
    description: "Devolu\xE7\xE3o de venda de mercadoria com ST fora do Estado",
    direction: "inbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    isReturn: true,
    isSt: true,
    notes: "Entrada devolu\xE7\xE3o de mercadoria com ST de outra UF."
  },
  {
    code: "2949",
    description: "Outra entrada de mercadoria ou presta\xE7\xE3o de servi\xE7o n\xE3o especificada de fora do Estado",
    direction: "inbound",
    scope: "interstate",
    itemType: "product",
    allowedModels: ["55"],
    active: true,
    notes: "Outras entradas interestaduais n\xE3o especificadas."
  }
];

// shared-utils/fiscal-cfop-model/data/cfopSemantics.ts
var CFOP_SEMANTICS = {
  // --- Saídas Internas (5.xxx) ---
  "5102": { operationType: "sale", merchandiseOrigin: "third_party" },
  "5101": { operationType: "sale", merchandiseOrigin: "own_production" },
  "5405": { operationType: "sale", merchandiseOrigin: "third_party" },
  "5403": { operationType: "sale", merchandiseOrigin: "third_party" },
  "5104": { operationType: "sale_outside_establishment", merchandiseOrigin: "third_party" },
  "5152": { operationType: "transfer", merchandiseOrigin: "third_party" },
  "5202": { operationType: "supplier_return", merchandiseOrigin: "third_party" },
  "5411": { operationType: "supplier_return", merchandiseOrigin: "third_party" },
  "5910": { operationType: "bonus_donation_gift", merchandiseOrigin: "not_applicable" },
  "5912": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "5914": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "5915": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "5949": { operationType: "other", merchandiseOrigin: "not_applicable" },
  "5933": { operationType: "service", merchandiseOrigin: "not_applicable" },
  // --- Saídas Interestaduais (6.xxx) ---
  "6102": { operationType: "sale", merchandiseOrigin: "third_party" },
  "6101": { operationType: "sale", merchandiseOrigin: "own_production" },
  "6108": { operationType: "sale_to_non_taxpayer", merchandiseOrigin: "third_party" },
  "6107": { operationType: "sale_to_non_taxpayer", merchandiseOrigin: "own_production" },
  "6404": { operationType: "sale", merchandiseOrigin: "third_party" },
  "6403": { operationType: "sale", merchandiseOrigin: "third_party" },
  "6152": { operationType: "transfer", merchandiseOrigin: "third_party" },
  "6202": { operationType: "supplier_return", merchandiseOrigin: "third_party" },
  "6411": { operationType: "supplier_return", merchandiseOrigin: "third_party" },
  "6910": { operationType: "bonus_donation_gift", merchandiseOrigin: "not_applicable" },
  "6912": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "6914": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "6915": { operationType: "shipment", merchandiseOrigin: "not_applicable" },
  "6949": { operationType: "other", merchandiseOrigin: "not_applicable" },
  "6933": { operationType: "service", merchandiseOrigin: "not_applicable" },
  // --- Entradas Internas (1.xxx) ---
  "1202": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "1201": { operationType: "customer_return", merchandiseOrigin: "own_production" },
  "1411": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "1949": { operationType: "other", merchandiseOrigin: "not_applicable" },
  // --- Entradas Interestaduais (2.xxx) ---
  "2202": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "2201": { operationType: "customer_return", merchandiseOrigin: "own_production" },
  "2411": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "2949": { operationType: "other", merchandiseOrigin: "not_applicable" }
};

// shared-utils/fiscal-cfop-model/catalog.ts
if (CFOP_CATALOG_BASE.length !== Object.keys(CFOP_SEMANTICS).length) {
  throw new Error("Cat\xE1logo CFOP sem classifica\xE7\xE3o sem\xE2ntica completa.");
}
if (new Set(CFOP_CATALOG_BASE.map((item) => item.code)).size !== CFOP_CATALOG_BASE.length) {
  throw new Error("Cat\xE1logo CFOP cont\xE9m c\xF3digo duplicado.");
}
var CANONICAL_CFOPS = CFOP_CATALOG_BASE.map((item) => {
  const semantics = CFOP_SEMANTICS[item.code];
  if (!semantics) throw new Error(`CFOP ${item.code} sem natureza ou origem classificada.`);
  return { ...item, ...semantics };
});
var CFOP_BY_CODE = new Map(
  CANONICAL_CFOPS.map((def) => [def.code, def])
);

// shared-utils/fiscalDocumentModel.ts
var HOMOLOGATION_FIRST_ITEM_DESCRIPTION = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
var HOMOLOGATION_NFE_RECIPIENT_NAME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
function shouldUseHomologationFirstItemDescription(input) {
  return input.environment === 2 && (input.model === "65" || input.model === "55" && input.printType === "6");
}
function getHomologationRecipientName(input) {
  return input.environment === 2 ? HOMOLOGATION_NFE_RECIPIENT_NAME : input.recipientName;
}

// api/nfe/hmlTechnicalRuleSet.ts
var HML_TECHNICAL_RULESET_VERSION = "HML_TECHNICAL_V1";

// api/nfe/schemaValidator.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_xmldom2 = require("@xmldom/xmldom");
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

// api/nfe/hml-normal-sale/constants.ts
var HML_NORMAL_SALE_RULESET_VERSION = "HML_NORMAL_SALE_V2";

// erp/src/pages/utils/nfe/serviceFiscalComposition.ts
var toCents = (value) => Math.round((Number(value) || 0) * 100);
var normalizeLabel = (value) => String(value || "").replace(/\s+/g, " ").trim();
var formatBrl = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\u00a0/g, " ");
var normalizeInfCplText = (value) => value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "");
var getItemNetCents = (item) => {
  const unitPrice = Number(item.unitPrice) || 0;
  const quantity = Number(item.quantity) || 1;
  const unitDiscount = Number(item.unitDiscount) || 0;
  const fixedDiscount = item.discountType === "fixed" ? unitDiscount : unitPrice * unitDiscount / 100;
  return toCents(Math.max(0, unitPrice - fixedDiscount) * quantity);
};
function allocateCentsByQuantity(amountCents, targets) {
  const totalQuantity = targets.reduce((sum, target) => sum + target.quantity, 0);
  const exactShares = targets.map((target) => amountCents * target.quantity / totalQuantity);
  const shares = exactShares.map(Math.floor);
  let remainingCents = amountCents - shares.reduce((sum, share) => sum + share, 0);
  const byLargestRemainder = exactShares.map((exact, index) => ({ index, remainder: exact - shares[index] })).sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; index < remainingCents; index += 1) {
    shares[byLargestRemainder[index % byLargestRemainder.length].index] += 1;
  }
  return shares;
}
function linkedProductIds(service) {
  const configuredIds = Array.isArray(service.linkedProductOrderItemIds) && service.linkedProductOrderItemIds.length ? service.linkedProductOrderItemIds : service.linkedProductOrderItemId ? [service.linkedProductOrderItemId] : [];
  const ids = configuredIds.filter((id) => typeof id === "string" && Boolean(id.trim())).map((id) => id.trim());
  return { ids: [...new Set(ids)], malformed: ids.length !== configuredIds.length };
}
function composeServiceFiscalValues(items = [], mode = "55") {
  const products = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => item.itemType !== "service");
  const services = items.filter((item) => item.itemType === "service");
  const linkedServiceCents = /* @__PURE__ */ new Map();
  const linkedServiceLines = /* @__PURE__ */ new Map();
  const pendingServices = [];
  let incorporatedServiceCents = 0;
  for (const service of services) {
    const netCents = getItemNetCents(service);
    if (netCents <= 0) continue;
    const { ids, malformed } = linkedProductIds(service);
    const targets = ids.map((id) => products.find(({ item }) => item.orderItemId === id)?.item).filter((item) => Boolean(item)).sort(
      (left, right) => products.findIndex(({ item }) => item === left) - products.findIndex(({ item }) => item === right)
    );
    if (!ids.length || malformed || targets.length !== ids.length) {
      pendingServices.push({ item: service, amountCents: netCents, reason: "missing_product_link" });
      continue;
    }
    const targetsWithQuantity = targets.map((item) => ({ item, quantity: Number(item.quantity) }));
    if (targetsWithQuantity.some(
      ({ quantity }) => !Number.isFinite(quantity) || quantity <= 0
    )) {
      pendingServices.push({ item: service, amountCents: netCents, reason: "invalid_product_quantity" });
      continue;
    }
    const allocations = allocateCentsByQuantity(netCents, targetsWithQuantity);
    targetsWithQuantity.forEach(({ item }, index) => {
      const productId = item.orderItemId;
      const allocatedCents = allocations[index];
      if (allocatedCents <= 0) return;
      linkedServiceCents.set(
        productId,
        (linkedServiceCents.get(productId) || 0) + allocatedCents
      );
      const lines = linkedServiceLines.get(productId) || [];
      lines.push({
        description: normalizeLabel(service.description),
        allocatedCents,
        totalServiceCents: netCents
      });
      linkedServiceLines.set(productId, lines);
    });
    incorporatedServiceCents += netCents;
  }
  const fiscalProducts = products.map(({ item, itemIndex }) => {
    const quantity = Number(item.quantity) || 1;
    const grossCents = toCents((Number(item.unitPrice) || 0) * quantity);
    const netCents = getItemNetCents(item);
    const incorporatedServices = item.orderItemId ? linkedServiceLines.get(item.orderItemId) || [] : [];
    return {
      item,
      itemIndex,
      vProdCents: grossCents + (item.orderItemId ? linkedServiceCents.get(item.orderItemId) || 0 : 0),
      vDescCents: Math.max(0, grossCents - netCents),
      incorporatedServices
    };
  });
  const invoiceModel = mode === "65" ? "NFC-e" : "NF-e";
  const additionalInformation = fiscalProducts.flatMap(
    ({ item, incorporatedServices }) => incorporatedServices.map(
      ({ description, allocatedCents, totalServiceCents }) => normalizeInfCplText(
        `O valor fiscal do item "${normalizeLabel(item.description)}" inclui ${formatBrl(allocatedCents)} do rateio do servi\xE7o "${description || "Servi\xE7o sem descri\xE7\xE3o"}" (valor total do servi\xE7o no pedido: ${formatBrl(totalServiceCents)}). O rateio considera as quantidades dos produtos vinculados e \xE9 matem\xE1tico; n\xE3o afirma que o servi\xE7o foi executado em cada unidade. O servi\xE7o n\xE3o \xE9 cobrado novamente em separado na ${invoiceModel}.`
      )
    )
  ).join("; ");
  if (additionalInformation.length > 5e3)
    throw new Error("O detalhamento dos servi\xE7os incorporados excede o limite de informa\xE7\xF5es adicionais da nota fiscal.");
  return {
    products: fiscalProducts,
    vOutroCents: 0,
    pendingServices,
    ...additionalInformation ? { additionalInformation } : {},
    incorporatedServiceCents
  };
}

// api/nfe/interstate-outbound-fiscal-matrix/rules.ts
var INTERSTATE_OUTBOUND_GENERAL_SOURCES = [
  {
    id: "N1",
    scope: "NATIONAL",
    url: "https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf"
  },
  {
    id: "N2",
    scope: "NATIONAL",
    url: "https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24"
  },
  { id: "N3", scope: "NATIONAL", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm" },
  {
    id: "N4",
    scope: "NATIONAL",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18"
  },
  {
    id: "N5-LC",
    scope: "NATIONAL",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm"
  },
  {
    id: "N5-CV",
    scope: "NATIONAL",
    url: "https://www.confaz.fazenda.gov.br/legislacao/convenios/2021/CV236_21"
  },
  {
    id: "PR1",
    scope: "ORIGIN_STATE",
    issuerUf: "PR",
    url: "https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202405144.pdf"
  },
  {
    id: "PR2",
    scope: "ORIGIN_STATE",
    issuerUf: "PR",
    url: "https://www.fazenda.pr.gov.br/Pagina/ICMS-Substituicao-tributaria"
  },
  {
    id: "PR3",
    scope: "ORIGIN_STATE",
    issuerUf: "PR",
    url: "https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=278020&codTipoAto=1&tipoVisualizacao=compilado"
  }
];
var emptyInterstateTreatment = () => ({
  cfop: null,
  csosn: null,
  icms: {
    xmlGroup: null,
    framework: null,
    ratePercent: null,
    baseMethod: null,
    reductionPercent: null
  },
  st: {
    responsibility: null,
    applicable: null,
    agreementOrProtocol: null,
    baseMethod: null,
    ratePercent: null
  },
  difal: {
    applicable: null,
    responsibility: null,
    internalRatePercent: null,
    interstateRatePercent: null,
    destinationSharePercent: null
  },
  fcp: { applicable: null, ratePercent: null },
  fcpSt: { applicable: null, ratePercent: null }
});
var COMMON_INTERSTATE_CSOSN_CANDIDATE = "103";
var baseThirdPartyTreatment = (cfop) => ({
  cfop,
  csosn: COMMON_INTERSTATE_CSOSN_CANDIDATE,
  icms: {
    xmlGroup: "ICMSSN102",
    framework: "CSOSN 103 candidato comum; isen\xE7\xE3o por faixa de receita pendente de comprova\xE7\xE3o",
    ratePercent: 0,
    baseMethod: "Simples Nacional",
    reductionPercent: 0
  },
  st: {
    responsibility: "none",
    applicable: false,
    agreementOrProtocol: "not_applicable",
    baseMethod: "none",
    ratePercent: 0
  },
  difal: {
    responsibility: "none",
    applicable: false,
    internalRatePercent: 0,
    interstateRatePercent: 0,
    destinationSharePercent: 0
  },
  fcp: { applicable: false, ratePercent: 0 },
  fcpSt: { applicable: false, ratePercent: 0 }
});
var baseCommonCriteria = {
  environment: 2,
  model: "55",
  issuerRegime: "1",
  issuerUf: "PR",
  destinationScope: "INTERSTATE",
  destinationUf: null,
  operationType: "sale",
  purpose: "1",
  merchandiseOrigin: "third_party"
};
var COMMON_INTERSTATE_CSOSN_PENDING_REVIEW = "CSOSN 103 \xE9 o candidato comum informado para todas as UFs de destino, sem override por estado; comprovar a isen\xE7\xE3o por faixa de receita aplic\xE1vel ao emitente no PR antes de aprovar qualquer fam\xEDlia.";
var INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES = [
  // 1. Contribuinte (indIEDest=1), Não final (indFinal=0): 6102 é candidato de CFOP;
  // o restante do tratamento continua pendente de decisão por adquirente e produto.
  {
    id: "INTERSTATE-TAXPAYER-NONFINAL-BASE",
    status: "DRAFT",
    normativeScope: "NATIONAL",
    priority: 10,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "taxpayer",
      finalConsumer: false
    },
    treatment: baseThirdPartyTreatment("6102"),
    candidateCfops: ["6102"],
    pendingReview: [
      COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
      "CFOP 6102 \xE9 apenas classifica\xE7\xE3o da opera\xE7\xE3o; validar CSOSN/cr\xE9dito e ICMS conforme o adquirente.",
      "Definir ST, DIFAL, FCP e vig\xEAncia por produto e destino; os curingas atuais n\xE3o sustentam essas incid\xEAncias como false.",
      "N\xE3o foi localizado registro rastre\xE1vel de aprova\xE7\xE3o fiscal para a regra completa ou para seus curingas."
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  },
  // 2. Contribuinte (indIEDest=1), Consumidor final (indFinal=1): finalidade final
  // não demonstra sozinha uso/consumo ou ativo nem encerra DIFAL/ST.
  {
    id: "INTERSTATE-TAXPAYER-FINAL-BASE",
    status: "DRAFT",
    normativeScope: "NATIONAL",
    priority: 10,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "taxpayer",
      finalConsumer: true
    },
    treatment: baseThirdPartyTreatment("6102"),
    candidateCfops: ["6102"],
    pendingReview: [
      COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
      "CFOP 6102 \xE9 apenas classifica\xE7\xE3o da opera\xE7\xE3o; validar CSOSN/cr\xE9dito e ICMS conforme o adquirente.",
      "Distinguir revenda, uso/consumo e ativo; definir incid\xEAncia e responsabilidade de DIFAL, ST e FCP por produto e destino.",
      "N\xE3o foi localizado registro rastre\xE1vel de aprova\xE7\xE3o fiscal para a regra completa ou para seus curingas."
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  },
  // 3. IE isenta (indIEDest=2), não final: validação técnica por UF não aprova tributos.
  {
    id: "INTERSTATE-EXEMPT-NONFINAL-BASE",
    status: "DRAFT",
    normativeScope: "NATIONAL",
    priority: 10,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "exempt",
      finalConsumer: false
    },
    treatment: baseThirdPartyTreatment("6102"),
    candidateCfops: ["6102"],
    pendingReview: [
      COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
      "Validar se a UF de destino aceita indIEDest=2; RV 805/E16a-30 \xE9 valida\xE7\xE3o t\xE9cnica, n\xE3o aprova\xE7\xE3o do tratamento fiscal.",
      "Comprovar CSOSN/cr\xE9dito, ST, DIFAL, FCP, produto e vig\xEAncia; os curingas atuais n\xE3o sustentam incid\xEAncias como false.",
      "N\xE3o foi localizado registro rastre\xE1vel de aprova\xE7\xE3o fiscal para a regra completa ou para seus curingas."
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  },
  // 4. IE isenta (indIEDest=2), consumidor final: além da aceitação técnica por UF,
  // a destinação e o tratamento tributário precisam ser comprovados.
  {
    id: "INTERSTATE-EXEMPT-FINAL-BASE",
    status: "DRAFT",
    normativeScope: "NATIONAL",
    priority: 10,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "exempt",
      finalConsumer: true
    },
    treatment: baseThirdPartyTreatment("6102"),
    candidateCfops: ["6102"],
    pendingReview: [
      COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
      "Validar se a UF de destino aceita indIEDest=2; RV 805/E16a-30 \xE9 valida\xE7\xE3o t\xE9cnica, n\xE3o aprova\xE7\xE3o do tratamento fiscal.",
      "Comprovar destina\xE7\xE3o, CSOSN/cr\xE9dito, DIFAL, ST, FCP, produto e vig\xEAncia; os curingas atuais n\xE3o sustentam incid\xEAncias como false.",
      "N\xE3o foi localizado registro rastre\xE1vel de aprova\xE7\xE3o fiscal para a regra completa ou para seus curingas."
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  },
  // 5. Não contribuinte (indIEDest=9), consumidor final: 6108 é candidato de CFOP;
  // leiaute/validação XML não substituem a decisão legal sobre DIFAL e demais tributos.
  {
    id: "INTERSTATE-NONTAXPAYER-FINAL-BASE",
    status: "DRAFT",
    normativeScope: "NATIONAL",
    priority: 10,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "non_taxpayer",
      finalConsumer: true
    },
    treatment: baseThirdPartyTreatment("6108"),
    candidateCfops: ["6108"],
    pendingReview: [
      COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
      "CFOP 6108 \xE9 apenas classifica\xE7\xE3o da opera\xE7\xE3o; confirmar enquadramento fiscal do adquirente e do produto.",
      "Definir DIFAL e responsabilidade, ST, FCP e vig\xEAncia por destino e produto; exce\xE7\xE3o de leiaute do CRT 1 n\xE3o prova n\xE3o incid\xEAncia.",
      "N\xE3o foi localizado registro rastre\xE1vel de aprova\xE7\xE3o fiscal para a regra completa ou para seus curingas."
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  },
  // 6. Não Contribuinte (indIEDest=9), Não Final (indFinal=0) -> BLOCKED (RV E16a-40 / Rejeição 696)
  {
    id: "INTERSTATE-NONTAXPAYER-NONFINAL-BASE",
    status: "BLOCKED",
    normativeScope: "NATIONAL",
    priority: 0,
    criteria: {
      ...baseCommonCriteria,
      recipientIeStatus: "non_taxpayer",
      finalConsumer: false
    },
    treatment: emptyInterstateTreatment(),
    candidateCfops: [],
    pendingReview: [
      "MOC E16a-40: venda de sa\xEDda com indIEDest=9 e indFinal=0 \xE9 rejeitada pela SEFAZ (rejei\xE7\xE3o 696)"
    ],
    sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
    normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES
  }
];

// api/nfe/normal-sale/values.ts
var obj = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Fatos fiscais obrigat\xF3rios ausentes.");
  return value;
};
var normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
var money2 = (value, field, positive = false) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (positive ? 0.01 : 0) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw new Error(`${field} inv\xE1lido ou fora da precis\xE3o de centavos.`);
  return Math.round(value * 100);
};

// shared-utils/orderPaymentState.ts
var normalize2 = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function classifyOrderPaymentSettlement(status) {
  if (status === void 0 || status === null) return "paid";
  const normalized = normalize2(String(status));
  if (normalized.startsWith("pago")) return "paid";
  if (normalized.startsWith("pendente")) return "pending";
  return "unconfirmed";
}
function isPromissoryPaymentMethod(method) {
  return typeof method === "string" && normalize2(method).includes("promissoria");
}
function getOrderFulfillmentPaymentCondition(deliveryMethod) {
  if (deliveryMethod === "pickup") return "Pagamento na retirada";
  if (deliveryMethod === "delivery") return "Pagamento na entrega";
  return void 0;
}
function parseDateOnly(value) {
  if (typeof value !== "string") return void 0;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
  if (!match) return void 0;
  const date = /* @__PURE__ */ new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1] ? void 0 : match[1];
}
function getOrderPaymentDueDate(payment, shipping) {
  const explicitDate = parseDateOnly(payment.dueDate);
  if (explicitDate) return explicitDate;
  if (isPromissoryPaymentMethod(payment.method)) return void 0;
  const scheduling = shipping?.scheduling;
  if (!getOrderFulfillmentPaymentCondition(shipping?.deliveryMethod) || scheduling?.pendingScheduling === true || scheduling?.dateType === "range" || scheduling?.type === "range")
    return void 0;
  return parseDateOnly(scheduling?.date);
}
function getOrderPaymentActualDate(payment) {
  return parseDateOnly(payment.paymentDate);
}

// api/nfe/normal-sale/attemptPolicy.ts
function saoPauloEmissionTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("Data fiscal inv\xE1lida.");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "longOffset"
    }).formatToParts(date).map(({ type, value }) => [type, value])
  );
  const offset = parts.timeZoneName.replace("GMT", "") || "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
function isUncertainAuthorization(cStat, pending) {
  return pending || !/^\d{3}$/.test(cStat) || ["100", "103", "104", "105", "108", "109", "204", "539", "999"].includes(cStat);
}

// api/nfe/normal-sale/payments.ts
function resolveNormalSalePayments(params) {
  const { snapshot, data, shipping, modelDecision, traces, invoice, feeCentsByPayment } = params;
  const emissionDate = saoPauloEmissionTimestamp(snapshot.capturedAt).slice(0, 10);
  const rawPayments = Array.isArray(data.payments) ? data.payments.map(obj) : [];
  const resolvedPayments = [];
  let paidCents = 0;
  let pendingCents = 0;
  for (let index = 0; index < rawPayments.length; index += 1) {
    const payment2 = rawPayments[index];
    const feeCents = feeCentsByPayment[index] || 0;
    const amountValue = Number(payment2.amount ?? 0);
    if (!Number.isFinite(amountValue) || amountValue < 0)
      throw new Error(`Valor do pagamento ${index + 1} inv\xE1lido.`);
    if (amountValue === 0) continue;
    const amountCents = money2(amountValue, `Pagamento ${index + 1}`, true) + feeCents;
    const settlement = classifyOrderPaymentSettlement(payment2.status);
    if (settlement === "unconfirmed")
      throw new Error(
        `Pagamento ${index + 1} est\xE1 como \u201C${String(payment2.status)}\u201D; confirme se foi recebido ou permanece pendente antes de transmitir.`
      );
    const originalMethod = typeof payment2.method === "string" ? payment2.method.trim() : "";
    const method = normalize(originalMethod);
    const isPromissory = isPromissoryPaymentMethod(originalMethod);
    const fulfillmentCondition = getOrderFulfillmentPaymentCondition(shipping.deliveryMethod);
    let methodCode = method.includes("PIX") ? "17" : method.includes("CREDITO") || method.includes("CREDIT") ? "03" : method.includes("DEBITO") || method.includes("DEBIT") ? "04" : method.includes("DINHEIRO") || method.includes("CASH") ? "01" : method.includes("BOLETO") ? "15" : isPromissory ? "99" : void 0;
    let description = methodCode === "99" ? originalMethod : void 0;
    if (!methodCode && settlement === "pending" && (!method || method === "VERIFICAR")) {
      if (!fulfillmentCondition)
        throw new Error("O pedido pendente n\xE3o informa se a entrega ser\xE1 por entrega ou retirada.");
      methodCode = "99";
      description = fulfillmentCondition;
    }
    if (!methodCode)
      throw new Error(
        `Meio de pagamento \u201C${originalMethod || "n\xE3o informado"}\u201D do item ${index + 1} exige mapeamento fiscal espec\xEDfico.`
      );
    const paymentCard = payment2.fiscalCard;
    const rawInstallments = Number(payment2.installments ?? 1);
    if (!Number.isInteger(rawInstallments) || rawInstallments < 1 || rawInstallments > 120)
      throw new Error(`Quantidade de parcelas inv\xE1lida no pagamento ${index + 1}.`);
    const canDeclareNotIntegrated = settlement === "pending" || snapshot.emissionRequest.cardNotIntegrated || modelDecision.model === "65" && methodCode === "17";
    const card = paymentCard || (canDeclareNotIntegrated && ["03", "04", "17"].includes(methodCode) ? { integrationType: "2" } : void 0);
    if (modelDecision.model === "65" && ["03", "04", "17"].includes(methodCode) && (!card || !["1", "2"].includes(card.integrationType) || card.integrationType === "1" && ["03", "04"].includes(methodCode) && (!/^[A-Z0-9]{12}[0-9]{2}$/.test(card.acquirerCnpj || "") || !card.authorization)))
      throw new Error(
        `Pagamento ${index + 1}: informe a integra\xE7\xE3o e os dados fiscais reais do cart\xE3o/PIX para NFC-e.`
      );
    const resolved = {
      methodCode,
      amountCents,
      settlement,
      ...description ? { description } : {},
      ...settlement === "paid" && getOrderPaymentActualDate(payment2) ? { paymentDate: getOrderPaymentActualDate(payment2) } : {},
      ...settlement === "pending" ? { dueDate: getOrderPaymentDueDate(payment2, shipping) } : {},
      installments: rawInstallments,
      ...card ? { card } : {}
    };
    resolvedPayments.push(resolved);
    if (settlement === "paid") paidCents += amountCents;
    else pendingCents += amountCents;
  }
  const orderPaymentSummary = data.paymentsSummary && typeof data.paymentsSummary === "object" && !Array.isArray(data.paymentsSummary) ? data.paymentsSummary : {};
  const summaryPaid = Number(orderPaymentSummary.totalAmountPaid ?? 0);
  if (!resolvedPayments.length && Number.isFinite(summaryPaid) && summaryPaid > 0)
    throw new Error(
      "O Pedido de Venda informa valor recebido, mas n\xE3o tem os meios de pagamento correspondentes; revise os pagamentos antes de transmitir."
    );
  const amountDueCents = invoice - paidCents;
  if (amountDueCents < 0)
    throw new Error("Os valores marcados como pagos excedem o total fiscal da nota.");
  if (pendingCents > amountDueCents)
    throw new Error("Os valores pendentes do pedido excedem o saldo ainda devido da nota.");
  if (pendingCents < amountDueCents) {
    if (resolvedPayments.some(
      (payment2) => payment2.settlement === "pending" && payment2.methodCode === "99" && isPromissoryPaymentMethod(payment2.description)
    ))
      throw new Error(
        "O valor pendente da promiss\xF3ria n\xE3o cobre todo o saldo da nota; revise as parcelas registradas no Pedido de Venda."
      );
    const fulfillmentCondition = getOrderFulfillmentPaymentCondition(shipping.deliveryMethod);
    if (!fulfillmentCondition)
      throw new Error(
        "O saldo pendente n\xE3o tem condi\xE7\xE3o de retirada ou entrega definida no pedido."
      );
    const fallbackDueDate = getOrderPaymentDueDate({}, shipping);
    resolvedPayments.push({
      methodCode: "99",
      amountCents: amountDueCents - pendingCents,
      settlement: "pending",
      description: fulfillmentCondition,
      ...fallbackDueDate ? { dueDate: fallbackDueDate } : {},
      installments: 1
    });
    pendingCents = amountDueCents;
  }
  if (paidCents + pendingCents !== invoice)
    throw new Error("Os valores recebidos e pendentes n\xE3o reconciliam com o total fiscal da nota.");
  const payments = resolvedPayments.map((payment2) => ({
    methodCode: payment2.methodCode,
    amount: payment2.amountCents / 100,
    paymentIndicator: payment2.settlement === "paid" || payment2.dueDate === emissionDate ? "0" : "1",
    ...payment2.description ? { description: payment2.description } : {},
    ...payment2.paymentDate ? { paymentDate: payment2.paymentDate } : {},
    ...payment2.card ? { card: payment2.card } : {},
    decision: traces[0]
  }));
  const payment = paidCents + pendingCents;
  const pendingPayments = resolvedPayments.filter((item) => item.settlement === "pending");
  const billingParts = [];
  for (const pendingPayment of pendingPayments) {
    if (pendingPayment.dueDate === emissionDate) continue;
    if (isPromissoryPaymentMethod(pendingPayment.description) && pendingPayment.installments > 1) {
      const perInstallment = Math.floor(pendingPayment.amountCents / pendingPayment.installments);
      const remainder = pendingPayment.amountCents % pendingPayment.installments;
      if (perInstallment < 1)
        throw new Error("O valor da promiss\xF3ria n\xE3o cobre a quantidade de parcelas registrada.");
      for (let index = 0; index < pendingPayment.installments; index += 1)
        billingParts.push({
          amountCents: perInstallment + (index < remainder ? 1 : 0)
        });
    } else {
      billingParts.push({
        ...pendingPayment.dueDate ? { dueDate: pendingPayment.dueDate } : {},
        amountCents: pendingPayment.amountCents
      });
    }
  }
  if (billingParts.length > 120)
    throw new Error("A condi\xE7\xE3o a prazo excede o limite fiscal de 120 parcelas.");
  const billingInstallments = (
    // cobr is optional; a partial schedule cannot describe the full deferred balance.
    modelDecision.model === "55" && billingParts.length > 0 && billingParts.every((part) => part.dueDate) ? billingParts.sort((left, right) => left.dueDate.localeCompare(right.dueDate)).map((part, index) => ({
      number: String(index + 1).padStart(3, "0"),
      dueDate: part.dueDate,
      amount: part.amountCents / 100
    })) : void 0
  );
  return { payments, payment, billingInstallments };
}

// api/nfe/normal-sale/paymentFeeVoutro.ts
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function exactFeeCents(payment, index) {
  const fee = payment.fee ?? 0;
  if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0)
    throw new Error(`Taxa do pagamento ${index + 1} inv\xE1lida.`);
  if (fee === 0) return 0;
  const amount = payment.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
    throw new Error(`Taxa do pagamento ${index + 1} n\xE3o tem valor-base v\xE1lido.`);
  const amountCents = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountCents) || Math.abs(amount * 100 - amountCents) > 1e-6)
    throw new Error(`Valor do pagamento ${index + 1} est\xE1 fora da precis\xE3o de centavos.`);
  const feeType = payment.feeType ?? "fixed";
  if (feeType === "fixed") {
    const feeCents = Math.round(fee * 100);
    if (Math.abs(fee * 100 - feeCents) > 1e-6)
      throw new Error(`Taxa fixa do pagamento ${index + 1} est\xE1 fora da precis\xE3o de centavos.`);
    return feeCents;
  }
  if (feeType !== "percentage")
    throw new Error(`Tipo da taxa do pagamento ${index + 1} inv\xE1lido.`);
  const exactCents = amountCents * fee / 100;
  if (!Number.isFinite(exactCents) || exactCents > Number.MAX_SAFE_INTEGER)
    throw new Error(`Taxa percentual do pagamento ${index + 1} inv\xE1lida.`);
  return exactCents;
}
function allocateRoundedRows(exactCents, targetCents) {
  if (targetCents <= 0) return exactCents.map(() => 0);
  const rows = exactCents.map((exact, index) => ({
    index,
    cents: Math.floor(exact),
    remainder: exact - Math.floor(exact)
  }));
  const remaining = targetCents - rows.reduce((sum, row) => sum + row.cents, 0);
  const order = [...rows].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index
  );
  for (let index = 0; index < remaining; index += 1) order[index].cents += 1;
  return rows.sort((left, right) => left.index - right.index).map((row) => row.cents);
}
function resolvePaymentFeeRows(data) {
  const payments = Array.isArray(data.payments) ? data.payments.map(record) : [];
  const exactCents = payments.map(exactFeeCents);
  const exactTotalCents = exactCents.reduce((sum, value) => sum + value, 0);
  const rawSummary = record(data.paymentsSummary).totalPaymentsFee;
  if (exactTotalCents === 0 && (rawSummary === void 0 || rawSummary === null))
    return { feeCentsByPayment: exactCents.map(() => 0), totalFeeCents: 0 };
  if (typeof rawSummary !== "number" || !Number.isFinite(rawSummary) || rawSummary < 0)
    throw new Error("O resumo consolidado das taxas de pagamento est\xE1 ausente ou inv\xE1lido.");
  const totalFeeCents = Math.round(rawSummary * 100);
  if (Math.abs(rawSummary * 100 - exactTotalCents) > 1e-4 || totalFeeCents !== Math.round(exactTotalCents))
    throw new Error(
      "As taxas dos pagamentos n\xE3o reconciliam com o total consolidado do pedido; revise o resumo antes de emitir."
    );
  return {
    feeCentsByPayment: allocateRoundedRows(exactCents, totalFeeCents),
    totalFeeCents
  };
}
function fiscalPaymentMethodCode(method) {
  if (typeof method !== "string") return void 0;
  const normalized = normalize(method);
  if (normalized.includes("CREDITO") || normalized.includes("CREDIT")) return "03";
  if (normalized.includes("DEBITO") || normalized.includes("DEBIT")) return "04";
  return void 0;
}
function paymentInstallments(payment) {
  if (payment.installments !== void 0 && payment.installments !== null)
    return Number(payment.installments);
  const label = typeof payment.method === "string" ? payment.method : "";
  const fromLabel = label.match(/\b(\d{1,3})\s*x\b/i);
  return fromLabel ? Number(fromLabel[1]) : 1;
}
function formatBrl2(cents) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\u00a0/g, " ");
}
function paymentFeeInformation(data, feeCentsByPayment, totalFeeCents, model) {
  const payments = Array.isArray(data.payments) ? data.payments.map(record) : [];
  const groups = /* @__PURE__ */ new Map();
  payments.forEach((payment, index) => {
    const cents = feeCentsByPayment[index] || 0;
    if (!cents) return;
    const method = fiscalPaymentMethodCode(payment.method);
    if (!method) throw new Error(`Origem da taxa do pagamento ${index + 1} n\xE3o est\xE1 classificada.`);
    const installments = paymentInstallments(payment);
    const key = method === "03" && installments > 1 ? "credit_installments" : method;
    const description = key === "credit_installments" ? "processamento do cart\xE3o de cr\xE9dito e \xE0s condi\xE7\xF5es de parcelamento escolhidas" : method === "03" ? "processamento do cart\xE3o de cr\xE9dito" : "processamento do cart\xE3o de d\xE9bito";
    const current = groups.get(key) || { cents: 0, description };
    current.cents += cents;
    groups.set(key, current);
  });
  const origins = [...groups.values()].map(({ cents, description }) => `${formatBrl2(cents)} referentes aos custos de ${description}`).join("; ");
  return `O valor total desta ${model === "65" ? "NFC-e" : "NF-e"} inclui ${formatBrl2(totalFeeCents)} em acr\xE9scimos da modalidade de pagamento, j\xE1 considerados no total do pedido e repassados ao comprador: ${origins}. As taxas de maquininha foram rateadas proporcionalmente ao valor l\xEDquido dos produtos, compondo as outras despesas acess\xF3rias de cada item.`;
}
function allocateAcrossItems(totalCents, weights) {
  if (!totalCents) return weights.map(() => 0);
  const eligibleWeights = weights.map((weight) => Math.max(0, Math.round(weight)));
  const weightTotal = eligibleWeights.reduce((sum, weight) => sum + weight, 0);
  if (!eligibleWeights.length || weightTotal <= 0)
    throw new Error("N\xE3o h\xE1 itens fiscais com valor l\xEDquido para ratear as taxas de pagamento.");
  const exact = eligibleWeights.map((weight) => totalCents * weight / weightTotal);
  const roundedDown = exact.map(Math.floor);
  let remaining = totalCents - roundedDown.reduce((sum, cents) => sum + cents, 0);
  const order = exact.map((share, index) => ({ index, remainder: share - roundedDown[index] })).sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) roundedDown[order[index].index] += 1;
  return roundedDown;
}
function composePaymentFeeVoutro(params) {
  const { snapshot, model, itemNetCents } = params;
  const paymentFees = params.paymentFees || resolvePaymentFeeRows(snapshot.order.data);
  const itemFeeCents = itemNetCents.map(() => 0);
  if (!paymentFees.totalFeeCents)
    return { ...paymentFees, itemFeeCents };
  const payments = Array.isArray(snapshot.order.data.payments) ? snapshot.order.data.payments.map(record) : [];
  payments.forEach((payment, index) => {
    if (!(paymentFees.feeCentsByPayment[index] > 0)) return;
    const method = fiscalPaymentMethodCode(payment.method);
    if (!method)
      throw new Error(
        `A taxa do pagamento ${index + 1} n\xE3o est\xE1 vinculada a uma modalidade de cart\xE3o aprovada para classifica\xE7\xE3o fiscal.`
      );
    const installments = paymentInstallments(payment);
    if (!Number.isInteger(installments) || installments < 1 || method === "04" && installments > 1)
      throw new Error(`Parcelamento do pagamento ${index + 1} n\xE3o suportado para esta decis\xE3o fiscal.`);
  });
  const allocations = allocateAcrossItems(paymentFees.totalFeeCents, itemNetCents);
  const additionalInformation = paymentFeeInformation(
    snapshot.order.data,
    paymentFees.feeCentsByPayment,
    paymentFees.totalFeeCents,
    model
  );
  if (additionalInformation.length > 5e3)
    throw new Error("A explica\xE7\xE3o das taxas excede o limite de informa\xE7\xF5es adicionais da NF-e.");
  return {
    ...paymentFees,
    itemFeeCents: allocations,
    additionalInformation
  };
}
function joinFiscalAdditionalInformation(...sections) {
  const value = sections.filter((section) => Boolean(section?.trim())).join("; ");
  if (value.length > 5e3)
    throw new Error("As informa\xE7\xF5es adicionais excedem o limite fiscal da NF-e.");
  return value || void 0;
}

// api/nfe/hml-technical/constants.ts
var isHmlRuleSet = (version) => version === HML_TECHNICAL_RULESET_VERSION || version === "HML_NORMAL_SALE_V1" || version === HML_NORMAL_SALE_RULESET_VERSION;
var hmlEndpoint = (model, service) => {
  if (model !== "55" && model !== "65") throw new Error("Modelo fiscal inv\xE1lido.");
  return getNfeServiceEndpoint(model, 2, service);
};
var failure = (status, code, error, extra = {}) => ({ status, body: { success: false, code, error, ...extra } });
var hasProtocolKey = (xml, key) => {
  const protocol = xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || "";
  return ACCESS_KEY_PATTERN.test(key) && new RegExp(`<(?:[\\w.-]+:)?chNFe>\\s*${key}\\s*<\\/(?:[\\w.-]+:)?chNFe>`, "i").test(protocol);
};
function nfceXmlNeedsFreshEmission(xml, now = Date.now()) {
  const issuedAtText = xml?.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
  const issuedAt = issuedAtText ? Date.parse(issuedAtText) : Number.NaN;
  return !Number.isFinite(issuedAt) || now - issuedAt >= 4 * 6e4 || issuedAt > now + 6e4;
}
function freshNfceEmissionRequired(doc, cStat) {
  return failure(
    409,
    "HML_NEW_EMISSION_REQUIRED",
    cStat === "217" ? "A SEFAZ confirmou que a NFC-e original n\xE3o consta, mas seu hor\xE1rio de emiss\xE3o expirou. Inicie uma nova tentativa para gerar XML assinado com hor\xE1rio e numera\xE7\xE3o atuais." : "A SEFAZ rejeitou a NFC-e original por data-hora de emiss\xE3o atrasada. Inicie uma nova tentativa para gerar XML assinado com hor\xE1rio e numera\xE7\xE3o atuais.",
    {
      documentId: doc.id,
      orderId: doc.order_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      cStat,
      pending: false,
      sefazContacted: true,
      safeNewEmission: true
    }
  );
}

// api/nfe/hml-technical/transmission.ts
var import_node_crypto4 = require("node:crypto");

// api/nfe/nfeEmissionPerformance.ts
var import_api = require("@opentelemetry/api");
var tracer = import_api.trace.getTracer("morante-hub", "1.0.0");
async function withNfeEmissionStage(stage, operation, attributes = {}) {
  const correlationId = typeof attributes.emissionRequestId === "string" ? attributes.emissionRequestId : typeof attributes.correlationId === "string" ? attributes.correlationId : void 0;
  const name = `fiscal.nfe.${stage}`;
  const safeAttributes = {
    module: "Fiscal",
    flow: "outbound_nfe",
    stage,
    ...correlationId ? { correlation_id: correlationId } : {},
    ...attributes
  };
  return tracer.startActiveSpan(name, { attributes: safeAttributes }, async (span) => {
    const startedAt = performance.now();
    let succeeded = false;
    try {
      const result = await operation();
      succeeded = true;
      span.setStatus({ code: import_api.SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException("NF-e performance stage failed");
      span.setStatus({ code: import_api.SpanStatusCode.ERROR, message: "NF-e performance stage failed" });
      throw error;
    } finally {
      const durationMs = Math.max(0, performance.now() - startedAt);
      span.setAttribute("operation.duration_ms", durationMs);
      span.setAttribute("operation.success", succeeded);
      span.end();
      console.info(
        JSON.stringify({
          event: "fiscal.nfe.performance",
          stage,
          ...correlationId ? { correlation_id: correlationId } : {},
          duration_ms: Number(durationMs.toFixed(2)),
          success: succeeded
        })
      );
    }
  });
}

// api/nfe/xmlEnvelope.ts
function embeddedNfeXml(xml) {
  return xml.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>\s*/, "");
}

// erp/src/pages/utils/nfe/invoiceLineSnapshot.ts
var decodeXml = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
var childText = (xml, tag2) => {
  const found = xml.match(new RegExp(`<${tag2}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag2}>`, "i"));
  return found ? decodeXml(found[1].replace(/<[^>]+>/g, "").trim()) : "";
};
var decimal2 = (value) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
};
function parseAuthorizedInvoiceLines(xml) {
  if (!/<(?:\w+:)?infNFe\b/i.test(xml)) throw new Error("XML n\xE3o cont\xE9m uma NF-e identific\xE1vel.");
  const details = [...xml.matchAll(/<(?:\w+:)?det\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?det>/gi)];
  if (!details.length) throw new Error("XML autorizado n\xE3o cont\xE9m itens fiscais.");
  return details.map(([, attributes, content]) => {
    const itemNumber = attributes.match(/\bnItem=["'](\d+)["']/i)?.[1];
    const productXml = content.match(/<(?:\w+:)?prod\b[^>]*>[\s\S]*?<\/(?:\w+:)?prod>/i)?.[0] || "";
    const taxesXml = content.match(/<(?:\w+:)?imposto\b[^>]*>[\s\S]*?<\/(?:\w+:)?imposto>/i)?.[0] || "";
    const billedQuantity = decimal2(childText(productXml, "qCom"));
    const unitValue = decimal2(childText(productXml, "vUnCom"));
    const grossValue = decimal2(childText(productXml, "vProd"));
    const discountValue = decimal2(childText(productXml, "vDesc") || "0");
    if (!itemNumber || !productXml || !Number.isFinite(billedQuantity) || billedQuantity <= 0 || !Number.isFinite(unitValue) || unitValue < 0 || !Number.isFinite(grossValue) || grossValue < 0 || !Number.isFinite(discountValue) || discountValue < 0) {
      throw new Error(`Linha fiscal inv\xE1lida no item ${itemNumber || "sem nItem"}.`);
    }
    return {
      invoiceItemNumber: Number(itemNumber),
      productCode: childText(productXml, "cProd"),
      description: childText(productXml, "xProd"),
      billedQuantity,
      unitValue,
      grossValue,
      discountValue,
      productXml,
      taxesXml
    };
  });
}

// api/nfe/hml-technical/transmission.ts
async function releaseAttempt(db, documentId, attemptToken) {
  try {
    await db.rpc("release_hml_nfe_attempt", {
      p_document_id: documentId,
      p_attempt_token: attemptToken
    });
  } catch {
  }
}
async function transmitAndPersist(db, documentId, signedXml, accessKey, nfeNumber, metadata3, cert, attemptToken) {
  try {
    const { data: persisted, error } = await db.from("nfe_fiscal_snapshots").select("snapshot_data").eq("id", String(metadata3.fiscalSnapshotId || "")).maybeSingle();
    if (error || !persisted) throw new Error("Snapshot fiscal indispon\xEDvel na transmiss\xE3o.");
    await assertXmlFiscalSelections(persisted.snapshot_data, signedXml);
  } catch {
    return failure(
      422,
      "HML_TRANSMISSION_INTEGRITY_FAILED",
      "XML assinado e campos confirmados n\xE3o puderam ser reconciliados. Transmiss\xE3o bloqueada.",
      { ...metadata3, sefazContacted: false, numberReserved: true }
    );
  }
  let responseXml;
  try {
    const envelope = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${nfeNumber}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    responseXml = await withNfeEmissionStage(
      "sefaz_transmission",
      () => sendSoapToSefaz({
        url: hmlEndpoint(metadata3.model, "NFeAutorizacao4"),
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
        serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4",
        xmlPayload: envelope,
        certPem: cert.certPem,
        privateKeyPem: cert.privateKeyPem
      }),
      { environment: 2, model: String(metadata3.model || "") }
    );
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    const diagnosticId = (0, import_node_crypto4.randomUUID)();
    const attemptDiagnostic = {
      diagnosticId,
      emissionRequestId: metadata3.emissionRequestId,
      ...transportDiagnostic
    };
    console.error("SEFAZ_HML_TRANSPORT", { documentId, ...attemptDiagnostic });
    const { error: diagnosticPersistError } = await db.rpc("persist_hml_nfe_result", {
      p_document_id: documentId,
      p_attempt_token: attemptToken,
      p_status: "pendente",
      p_reason: `Resposta da transmiss\xE3o HML desconhecida: ${JSON.stringify(attemptDiagnostic)}`,
      p_response_xml: "",
      p_protocol: null,
      p_items: []
    });
    return failure(
      502,
      "HML_TRANSMISSION_UNCERTAIN",
      "Transmiss\xE3o sem resposta confirmada. Consulte a chave antes de qualquer nova tentativa.",
      {
        pending: true,
        ...metadata3,
        transportDiagnostic,
        diagnosticId,
        diagnosticStage: "sefaz-transmission",
        diagnosticCategory: "SEFAZ_TRANSPORT_FAILED",
        transportDiagnosticPersisted: !diagnosticPersistError
      }
    );
  }
  const parsed = parseSefazAuthorization(responseXml);
  const protocolMatches = hasProtocolKey(responseXml, accessKey);
  const authorized = parsed.authorized && protocolMatches;
  const numberConflict = isDifferentKeyNumberConflict(parsed.cStat, parsed.xMotivo, accessKey) ? fiscalNumberConflict(nfeNumber) : void 0;
  const status = authorized ? "homologada" : parsed.pending || parsed.cStat === "100" || parsed.cStat === "204" || !/^\d{3}$/.test(parsed.cStat) ? "pendente" : "erro";
  const lines = authorized ? parseAuthorizedInvoiceLines(signedXml).map((line) => ({
    item_number: line.invoiceItemNumber,
    product_code: line.productCode,
    description: line.description,
    billed_quantity: line.billedQuantity,
    unit_value: line.unitValue,
    gross_value: line.grossValue,
    discount_value: line.discountValue,
    product_xml: line.productXml,
    taxes_xml: line.taxesXml
  })) : [];
  const { error: persistError } = await db.rpc("persist_hml_nfe_result", {
    p_document_id: documentId,
    p_attempt_token: attemptToken,
    p_status: status,
    p_reason: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || "desconhecido"}`,
    p_response_xml: responseXml,
    p_protocol: authorized ? parsed.protocolNumber || null : null,
    p_items: lines
  });
  if (persistError)
    return failure(
      503,
      "HML_RESULT_PERSIST_FAILED",
      "Resposta SEFAZ recebida, mas n\xE3o persistida; reconcilia\xE7\xE3o obrigat\xF3ria.",
      { pending: true, ...metadata3 }
    );
  return {
    status: numberConflict ? 409 : status === "erro" ? 422 : 200,
    body: {
      success: authorized,
      pending: status === "pendente",
      ...numberConflict ? {
        code: "NFE_NUMBER_ALREADY_USED",
        error: `A numera\xE7\xE3o ${nfeNumber} j\xE1 est\xE1 sendo usada. Escolha o n\xFAmero sugerido ou informe outro.`,
        numberConflict
      } : status === "erro" ? {
        code: "HML_SEFAZ_REJECTED",
        error: `${parsed.cStat ? parsed.cStat + ": " : ""}${parsed.xMotivo || "Rejei\xE7\xE3o da SEFAZ."}`
      } : {},
      ...metadata3,
      signedXml,
      sefazResponseXml: responseXml,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate
    }
  };
}

// api/nfe/hml-technical/retryAndRecovery.ts
var import_node_crypto6 = require("node:crypto");

// api/nfe/hml-technical/consultation.ts
var import_node_crypto5 = require("node:crypto");
async function consultExisting(db, doc, cert, attemptToken) {
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  const response = await sendSoapToSefaz({
    url: hmlEndpoint(doc.modelo, "NFeConsultaProtocolo4"),
    action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
    serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
    xmlPayload: query,
    certPem: cert.certPem,
    privateKeyPem: cert.privateKeyPem
  });
  const situation = parseSefazNfeSituation(response);
  if (situation.state === "not_found") {
    const { error: error2 } = await db.rpc("persist_hml_nfe_result", {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
      p_status: "erro",
      p_reason: `217: ${situation.xMotivo || "NF-e n\xE3o consta na SEFAZ"}`,
      p_response_xml: response,
      p_protocol: null,
      p_items: []
    });
    if (error2)
      return failure(
        503,
        "HML_NOT_FOUND_PERSIST_FAILED",
        "A consulta retornou 217, mas a tentativa precisa de reconcilia\xE7\xE3o.",
        { pending: true, documentId: doc.id }
      );
    return failure(
      409,
      "HML_CONFIRMED_NOT_FOUND",
      "217: NF-e n\xE3o encontrada. A pr\xF3xima tentativa deve reutilizar o XML e a chave originais.",
      {
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        state: "not_found",
        pending: false,
        cStat: situation.cStat,
        xMotivo: situation.xMotivo
      }
    );
  }
  if (situation.state !== "authorized") {
    const { error: error2 } = await db.rpc("persist_hml_nfe_result", {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
      // A rejection of the consultation is not a rejection of the transmitted invoice.
      p_status: "pendente",
      p_reason: `${situation.cStat || "desconhecido"}: ${situation.xMotivo || "Consulta inconclusiva"}`,
      p_response_xml: response,
      p_protocol: null,
      p_items: []
    });
    if (error2)
      return failure(
        503,
        "HML_RECONCILIATION_PERSIST_FAILED",
        "Resposta da consulta n\xE3o persistida; reconcilia\xE7\xE3o obrigat\xF3ria.",
        { pending: true, documentId: doc.id }
      );
    return failure(
      409,
      "HML_RECONCILIATION_REQUIRED",
      "A consulta n\xE3o confirmou autoriza\xE7\xE3o. Revise a tentativa original antes de retransmitir.",
      {
        pending: true,
        documentId: doc.id,
        accessKey: doc.chave_acesso,
        cStat: situation.cStat,
        xMotivo: situation.xMotivo
      }
    );
  }
  const parsed = parseSefazAuthorization(response);
  if (!parsed.authorized || !parsed.protocolNumber || !hasProtocolKey(response, doc.chave_acesso))
    return failure(
      502,
      "HML_PROTOCOL_INCOMPLETE",
      "Consulta autorizada sem protocolo verific\xE1vel.",
      { pending: true, documentId: doc.id }
    );
  const lines = parseAuthorizedInvoiceLines(String(doc.xml_nfe || ""));
  const { error } = await db.rpc("persist_hml_nfe_result", {
    p_document_id: doc.id,
    p_attempt_token: attemptToken,
    p_status: "homologada",
    p_reason: parsed.xMotivo,
    p_response_xml: response,
    p_protocol: parsed.protocolNumber,
    p_items: lines.map((line) => ({
      item_number: line.invoiceItemNumber,
      product_code: line.productCode,
      description: line.description,
      billed_quantity: line.billedQuantity,
      unit_value: line.unitValue,
      gross_value: line.grossValue,
      discount_value: line.discountValue,
      product_xml: line.productXml,
      taxes_xml: line.taxesXml
    }))
  });
  if (error)
    return failure(
      503,
      "HML_RECONCILIATION_PERSIST_FAILED",
      "SEFAZ confirmou autoriza\xE7\xE3o, mas a persist\xEAncia precisa de reconcilia\xE7\xE3o.",
      { pending: true, documentId: doc.id }
    );
  return {
    status: 200,
    body: {
      success: true,
      documentId: doc.id,
      orderId: doc.order_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      signedXml: doc.xml_nfe,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo
    }
  };
}
async function consultAuthorizedHmlTechnical(doc) {
  if (doc.ambiente !== 2 || !["55", "65"].includes(doc.modelo) || doc.status !== "homologada" || !isHmlRuleSet(doc.fiscal_ruleset_version) || !ACCESS_KEY_PATTERN.test(doc.chave_acesso) || !doc.numero_protocolo)
    return failure(
      409,
      "HML_AUTHORIZED_DOCUMENT_INVALID",
      "A consulta direta exige um documento de homologa\xE7\xE3o autorizado com chave e protocolo persistidos."
    );
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, "HML_CERTIFICATE_UNAVAILABLE", "Certificado A1 n\xE3o configurado.");
  let cert;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || "");
  } catch {
    return failure(503, "HML_CERTIFICATE_INVALID", "Certificado A1 inv\xE1lido.");
  }
  const consultedAt = (/* @__PURE__ */ new Date()).toISOString();
  const query = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  let response;
  try {
    response = await sendSoapToSefaz({
      url: hmlEndpoint(doc.modelo, "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: query,
      certPem: cert.certPem,
      privateKeyPem: cert.privateKeyPem
    });
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    const diagnosticId = (0, import_node_crypto5.randomUUID)();
    console.error("SEFAZ_HML_AUTHORIZED_CONSULT", {
      documentId: doc.id,
      emissionRequestId: doc.emission_request_id,
      diagnosticId,
      ...transportDiagnostic
    });
    return failure(
      502,
      "HML_AUTHORIZED_CONSULT_UNKNOWN",
      "A consulta direta \xE0 SEFAZ n\xE3o teve resposta confirmada. A autoriza\xE7\xE3o persistida foi preservada.",
      {
        pending: true,
        documentId: doc.id,
        sefazConsulted: false,
        diagnosticId,
        diagnosticStage: "sefaz-consultation",
        transportDiagnostic
      }
    );
  }
  const situation = parseSefazNfeSituation(response);
  const parsed = parseSefazAuthorization(response);
  if (situation.state !== "authorized" || !parsed.authorized || parsed.protocolNumber !== doc.numero_protocolo || !hasProtocolKey(response, doc.chave_acesso)) {
    return failure(
      409,
      "HML_AUTHORIZED_CONSULT_RECONCILIATION_REQUIRED",
      situation.state === "cancelled" ? "A consulta encontrou um estado diferente da autoriza\xE7\xE3o persistida. Reconcilia\xE7\xE3o fiscal manual necess\xE1ria; nenhum dado foi sobrescrito." : "A consulta n\xE3o confirmou a autoriza\xE7\xE3o e o protocolo persistidos. Reconcilia\xE7\xE3o fiscal manual necess\xE1ria; nenhum dado foi sobrescrito.",
      {
        pending: true,
        documentId: doc.id,
        sefazConsulted: true,
        cStat: situation.cStat || parsed.cStat,
        xMotivo: situation.xMotivo || parsed.xMotivo,
        protocolMatches: parsed.protocolNumber === doc.numero_protocolo,
        responseHash: (0, import_node_crypto5.createHash)("sha256").update(response).digest("hex")
      }
    );
  }
  return {
    status: 200,
    body: {
      success: true,
      state: "authorized",
      sefazConsulted: true,
      consultedAt,
      documentId: doc.id,
      orderId: doc.order_id,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      cStat: parsed.cStat,
      xMotivo: situation.xMotivo || parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      responseHash: (0, import_node_crypto5.createHash)("sha256").update(response).digest("hex")
    }
  };
}

// api/nfe/hml-technical/retryAndRecovery.ts
async function retryHmlTechnical(db, documentId, allowRetransmission = true) {
  const { data: doc, error } = await db.from("nfe_documents").select("*").eq("id", documentId).maybeSingle();
  if (error || !doc || doc.ambiente !== 2 || !["55", "65"].includes(doc.modelo) || !isHmlRuleSet(doc.fiscal_ruleset_version))
    return failure(404, "HML_DOCUMENT_NOT_FOUND", "Tentativa HML original n\xE3o encontrada.");
  if (doc.status === "homologada")
    return {
      status: 200,
      body: {
        success: true,
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        protocolNumber: doc.numero_protocolo,
        signedXml: doc.xml_nfe
      }
    };
  if (doc.status === "erro" && parseSefazAuthorization(String(doc.xml_protocolo || "")).cStat === "244")
    return failure(
      409,
      "HML_SERIES_CORRECTION_REQUIRED",
      "244: A SEFAZ rejeitou a s\xE9rie. Corrija a s\xE9rie nas configura\xE7\xF5es fiscais e solicite uma nova tentativa vinculada; o XML rejeitado ser\xE1 preservado.",
      {
        documentId: doc.id,
        cStat: "244",
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2
      }
    );
  if (doc.status === "erro" && parseSefazAuthorization(String(doc.xml_protocolo || "")).cStat === "209")
    return failure(
      409,
      "HML_ISSUER_IE_CORRECTION_REQUIRED",
      "209: A SEFAZ rejeitou a inscri\xE7\xE3o estadual do emitente. Confira o cadastro da Receita/PR ou a contabilidade; o XML e a resposta rejeitados ser\xE3o preservados.",
      {
        documentId: doc.id,
        cStat: "209",
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2
      }
    );
  const previousRejection = parseSefazAuthorization(String(doc.xml_protocolo || ""));
  if (doc.status === "erro" && doc.modelo === "65" && previousRejection.cStat === "704")
    return freshNfceEmissionRequired(doc, previousRejection.cStat);
  if (doc.status === "erro" && isDifferentKeyNumberConflict(
    previousRejection.cStat,
    previousRejection.xMotivo,
    String(doc.chave_acesso || "")
  )) {
    return failure(
      409,
      "NFE_NUMBER_ALREADY_USED",
      `A numera\xE7\xE3o ${doc.numero_nfe} j\xE1 est\xE1 sendo usada; revise o n\xFAmero sugerido antes de tentar novamente.`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        numberConflict: fiscalNumberConflict(doc.numero_nfe)
      }
    );
  }
  if (doc.status === "erro" && previousRejection.cStat && !["100", "101", "105", "204", "217"].includes(previousRejection.cStat)) {
    return failure(
      409,
      "HML_SEFAZ_REJECTED",
      `${previousRejection.cStat}: ${previousRejection.xMotivo || doc.motivo_status || "Tentativa anterior rejeitada pela SEFAZ."}`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        xMotivo: previousRejection.xMotivo,
        pending: false,
        sefazContacted: true,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2
      }
    );
  }
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, "HML_CERTIFICATE_UNAVAILABLE", "Certificado A1 n\xE3o configurado.");
  let cert;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || "");
  } catch {
    return failure(503, "HML_CERTIFICATE_INVALID", "Certificado A1 inv\xE1lido.");
  }
  const attemptToken = (0, import_node_crypto6.randomUUID)();
  const { data: claimed, error: claimError } = await db.rpc("claim_hml_nfe_attempt", {
    p_document_id: doc.id,
    p_attempt_token: attemptToken
  });
  if (claimError || !claimed)
    return failure(
      409,
      "HML_ATTEMPT_IN_PROGRESS",
      "Outra chamada est\xE1 conduzindo esta tentativa. Aguarde antes de consultar novamente.",
      { pending: true, documentId: doc.id, accessKey: doc.chave_acesso }
    );
  try {
    let consultation;
    try {
      consultation = await consultExisting(db, doc, cert, attemptToken);
    } catch (error2) {
      const transportDiagnostic = sefazTransportDiagnostic(error2);
      const diagnosticId = (0, import_node_crypto6.randomUUID)();
      const attemptDiagnostic = {
        diagnosticId,
        emissionRequestId: doc.emission_request_id,
        ...transportDiagnostic
      };
      console.error("SEFAZ_HML_CONSULT", { documentId: doc.id, ...attemptDiagnostic });
      const { error: diagnosticPersistError } = await db.rpc("persist_hml_nfe_result", {
        p_document_id: doc.id,
        p_attempt_token: attemptToken,
        p_status: "pendente",
        p_reason: `Consulta HML inconclusiva por transporte: ${JSON.stringify(attemptDiagnostic)}`,
        p_response_xml: String(doc.xml_protocolo || ""),
        p_protocol: null,
        p_items: []
      });
      return failure(
        502,
        "HML_RECONCILIATION_REQUIRED",
        "Consulta da chave original inconclusiva; a retransmiss\xE3o permanece bloqueada.",
        {
          pending: true,
          documentId: doc.id,
          accessKey: doc.chave_acesso,
          transportDiagnostic,
          diagnosticId,
          diagnosticStage: "sefaz-consultation",
          diagnosticCategory: "SEFAZ_TRANSPORT_FAILED",
          transportDiagnosticPersisted: !diagnosticPersistError
        }
      );
    }
    if (consultation.body.code !== "HML_CONFIRMED_NOT_FOUND") return consultation;
    if (doc.modelo === "65" && nfceXmlNeedsFreshEmission(doc.xml_nfe))
      return freshNfceEmissionRequired(doc, String(consultation.body.cStat || "217"));
    if (!allowRetransmission) return consultation;
    try {
      validateContributorNfeSeries(doc.serie);
    } catch {
      return failure(
        422,
        "HML_RETRY_SERIES_INVALID",
        "A s\xE9rie do XML original \xE9 incompat\xEDvel com este emissor. A retransmiss\xE3o foi bloqueada; preserve a tentativa e corrija a configura\xE7\xE3o fiscal.",
        { documentId: doc.id, pending: false, sefazContacted: false }
      );
    }
    if (!doc.xml_nfe || !doc.chave_acesso || !doc.fiscal_snapshot_id)
      return failure(409, "HML_RETRY_XML_UNAVAILABLE", "XML ou snapshot original n\xE3o dispon\xEDvel.");
    try {
      await validateNfeAgainstOfficialSchema(doc.xml_nfe);
    } catch {
      return failure(409, "HML_RETRY_XML_INVALID", "XML original falhou no XSD oficial.");
    }
    const { error: reactivateError } = await db.rpc("reactivate_hml_nfe_retry", {
      p_document_id: doc.id,
      p_attempt_token: attemptToken
    });
    if (reactivateError)
      return failure(
        409,
        "HML_RETRY_STATE_CHANGED",
        "A tentativa mudou de estado; consulte novamente.",
        { documentId: doc.id }
      );
    return await transmitAndPersist(
      db,
      doc.id,
      doc.xml_nfe,
      doc.chave_acesso,
      doc.numero_nfe,
      {
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        fiscalSnapshotId: doc.fiscal_snapshot_id,
        emissionRequestId: doc.emission_request_id,
        series: doc.serie,
        model: doc.modelo,
        environment: 2
      },
      cert,
      attemptToken
    );
  } finally {
    await releaseAttempt(db, doc.id, attemptToken);
  }
}

// api/nfe/normal-sale/outboundTypes.ts
var outboundFailure = (status, code, error, extra = {}) => ({ status, body: { success: false, code, error, ...extra } });
var metadata = (a) => ({
  documentId: a.document_id,
  orderId: a.order_id,
  emissionRequestId: a.emission_request_id,
  fiscalSnapshotId: a.snapshot_id,
  accessKey: a.access_key,
  nfeNumber: a.number,
  series: a.series,
  model: a.model,
  environment: a.environment,
  numberReserved: true
});

// api/nfe/normal-sale/outboundPersistence.ts
async function persistResultToDatabase(db, a, token, state, reason, response, protocol = null, xml = "") {
  const items = state === "authorized" ? parseAuthorizedInvoiceLines(xml).map((line) => ({
    item_number: line.invoiceItemNumber,
    product_code: line.productCode,
    description: line.description,
    billed_quantity: line.billedQuantity,
    unit_value: line.unitValue,
    gross_value: line.grossValue,
    discount_value: line.discountValue,
    product_xml: line.productXml,
    taxes_xml: line.taxesXml
  })) : [];
  const result = await db.rpc("persist_nfe_outbound_result", {
    p_document_id: a.document_id,
    p_attempt_token: token,
    p_state: state,
    p_reason: reason,
    p_response_xml: response,
    p_protocol: protocol,
    p_items: items
  });
  if (result.error) throw new Error("FISCAL_RESULT_PERSIST_FAILED");
}
async function loadOutboundAttempt(db, documentId) {
  const [attempt, document] = await Promise.all([
    db.from("nfe_outbound_attempts").select("*").eq("document_id", documentId).maybeSingle(),
    db.from("nfe_documents").select("*").eq("id", documentId).maybeSingle()
  ]);
  if (attempt.error || document.error || !attempt.data || !document.data)
    throw new Error("FISCAL_ATTEMPT_UNAVAILABLE");
  return { attempt: attempt.data, document: document.data };
}

// api/nfe/normal-sale/outboundRecovery.ts
function productionTransmissionGate(environment, confirmed) {
  if (environment === 1 && !confirmed)
    return outboundFailure(
      403,
      "PRODUCTION_CONFIRMATION_REQUIRED",
      "Confirme explicitamente a emiss\xE3o em Produ\xE7\xE3o."
    );
  return null;
}

// api/nfe/normal-sale/outboundTransmission.ts
var import_node_crypto7 = require("node:crypto");

// erp/src/pages/utils/nfe/fiscalEnvelope.ts
function validateOrdinaryOutboundEnvelope(input) {
  const { xml } = input;
  const ide = [...xml.matchAll(/<ide>([\s\S]*?)<\/ide>/g)];
  if (ide.length !== 1) return "Identifica\xE7\xE3o fiscal ausente ou duplicada.";
  const only = (tag2) => {
    const matches = [...ide[0][1].matchAll(new RegExp(`<${tag2}>([^<]*)</${tag2}>`, "g"))];
    return matches.length === 1 ? matches[0][1].trim() : null;
  };
  if (only("finNFe") !== "1" || only("tpNF") !== "1") {
    return "Esta rota transmite somente nota de sa\xEDda normal. Estorno e devolu\xE7\xE3o exigem revis\xE3o fiscal pr\xF3pria.";
  }
  const referencedAccessKeys = [
    ...ide[0][1].matchAll(/<(refNFe|refNFeSig)>([0-9]{6}[A-Z0-9]{12}[0-9]{26})<\/\1>/g)
  ].map(([, , key]) => key);
  if (input.model === "55" && referencedAccessKeys.some((key) => key.slice(20, 22) === "65")) {
    return "NF-e de sa\xEDda modelo 55 n\xE3o pode referenciar chave de NFC-e modelo 65 nesta rota.";
  }
  if (only("mod") !== input.model || only("tpAmb") !== String(input.environment) || Number(only("nNF")) !== input.nfeNumber || Number(only("serie")) !== Number(input.series) || !ACCESS_KEY_PATTERN.test(input.accessKey) || !xml.includes(`Id="NFe${input.accessKey}"`)) {
    return "XML n\xE3o corresponde ao modelo, ambiente, numera\xE7\xE3o ou chave informados.";
  }
  return null;
}

// api/nfe/fiscalXmlAudit.ts
var import_xmldom3 = require("@xmldom/xmldom");
var import_xml_crypto2 = require("xml-crypto");
function createStrictXmlParser(parseErrors) {
  return new import_xmldom3.DOMParser({
    errorHandler: (level, message) => {
      if (level === "warning" && String(message).includes("errorHandler") && String(message).includes("deprecated"))
        return;
      parseErrors.push(String(message));
    }
  });
}
var FiscalXmlAuditError = class extends Error {
  mismatches;
  constructor(mismatches) {
    const detail = mismatches.map(({ field, expected, actual }) => `${field}: esperado ${expected}; encontrado ${actual}`).join("\n");
    super(`O XML assinado diverge do snapshot fiscal confirmado:
${detail}`);
    this.name = "FiscalXmlAuditError";
    this.mismatches = mismatches;
  }
};
var localName = (node) => (node.localName || node.tagName).split(":").at(-1) || "";
var children = (node) => node ? Array.from(node.childNodes).filter((child2) => child2.nodeType === 1) : [];
var child = (node, name) => node ? children(node).find((candidate) => localName(candidate) === name) || null : null;
var childElements = (node, name) => node ? children(node).filter((candidate) => localName(candidate) === name) : [];
var text = (node, name) => child(node, name)?.textContent?.trim() || "";
var allDescendants = (node, name) => {
  const result = [];
  const visit = (current) => {
    if (localName(current) === name) result.push(current);
    children(current).forEach(visit);
  };
  visit(node);
  return result;
};
function normalizeTaxId(value) {
  return normalizeFiscalIdentifier(value);
}
function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function addTextMismatch(mismatches, field, expected, actual, normalize3) {
  if (expected === void 0) return;
  const wanted = normalize3 ? normalize3(expected) : expected;
  const found = normalize3 ? normalize3(actual) : actual;
  if (wanted !== found)
    mismatches.push({ field, expected: wanted, actual: found || "(ausente)" });
}
function addOptionalTextMismatch(mismatches, field, expected, actual) {
  if (expected === void 0 || expected === "") {
    if (actual !== "") mismatches.push({ field, expected: "(ausente)", actual });
    return;
  }
  addTextMismatch(mismatches, field, expected, actual);
}
function addNumberMismatch(mismatches, field, expected, actualText, tolerance = 5e-3) {
  const actual = actualText ? Number(actualText.replace(",", ".")) : NaN;
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance)
    mismatches.push({
      field,
      expected,
      actual: Number.isFinite(actual) ? actual : actualText || "(ausente)"
    });
}
function compareAddress(mismatches, field, actual, expected) {
  if (!expected) {
    if (actual)
      mismatches.push({ field, expected: "(ausente)", actual: "(presente)" });
    return;
  }
  for (const [xmlName, value] of [
    ["xLgr", expected.street],
    ["nro", expected.number],
    ["xBairro", expected.district],
    ["cMun", expected.municipalityCode],
    ["xMun", expected.municipality],
    ["UF", expected.uf],
    ["CEP", expected.postalCode || ""],
    ["cPais", "1058"],
    ["xPais", "BRASIL"]
  ]) {
    addOptionalTextMismatch(mismatches, `${field}.${xmlName}`, value, text(actual, xmlName));
  }
}
function taxGroupTag(tax) {
  if (tax.group === "ICMS") {
    if (tax.codeSystem === "CSOSN") {
      if (ZERO_OWN_ICMS_CSOSNS.includes(tax.code)) return zeroOwnIcmsGroup(tax.code);
      return `ICMSSN${tax.code}`;
    }
    return `ICMS${tax.code}`;
  }
  if (tax.group === "PIS" || tax.group === "COFINS") {
    if (["04", "05", "06", "07", "08", "09"].includes(tax.code)) return `${tax.group}NT`;
    return `${tax.group}${["01", "02"].includes(tax.code) ? "Aliq" : "Outr"}`;
  }
  if (tax.group === "IPI")
    return ["04", "05", "06", "07", "08", "09"].includes(tax.code) ? "IPINT" : "IPITrib";
  return tax.group;
}
function compareTaxGroup(mismatches, itemNumber, tax, actualContainer) {
  const groupName = tax.group === "ICMS" ? "ICMS" : tax.group;
  const container = child(actualContainer, groupName);
  const expectedTag = taxGroupTag(tax);
  const expectedGroups = childElements(container, expectedTag);
  if (expectedGroups.length !== 1) {
    mismatches.push({
      field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}`,
      expected: 1,
      actual: expectedGroups.length
    });
    return;
  }
  const group = expectedGroups[0];
  const codeTag = tax.codeSystem === "CSOSN" ? "CSOSN" : "CST";
  addTextMismatch(
    mismatches,
    `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${codeTag}`,
    tax.code,
    text(group, codeTag)
  );
  const expectedFields = /* @__PURE__ */ new Set([codeTag]);
  if (tax.group === "ICMS") {
    expectedFields.add("orig");
    if (tax.codeSystem === "CST" && tax.code === "00")
      ["modBC", "vBC", "pICMS", "vICMS"].forEach((field) => {
        expectedFields.add(field);
      });
    else if (tax.codeSystem === "CSOSN") {
      const icmsValue = tax.values.vICMS;
      if (typeof icmsValue === "number" && icmsValue !== 0)
        mismatches.push({
          field: `det[${itemNumber}].imposto.ICMS.${expectedTag}.vICMS`,
          expected: 0,
          actual: icmsValue
        });
    }
  } else if (tax.group === "PIS" || tax.group === "COFINS") {
    if (!["04", "05", "06", "07", "08", "09"].includes(tax.code)) {
      expectedFields.add("vBC");
      expectedFields.add(tax.group === "PIS" ? "pPIS" : "pCOFINS");
      expectedFields.add(tax.group === "PIS" ? "vPIS" : "vCOFINS");
    }
  } else if (tax.group === "IPI") {
    if (!["04", "05", "06", "07", "08", "09"].includes(tax.code)) {
      expectedFields.add("vBC");
      expectedFields.add("pIPI");
      expectedFields.add("vIPI");
    }
  }
  for (const [field, value] of Object.entries(tax.values)) {
    if (!expectedFields.has(field) || field === "orig") continue;
    const expectedPath = `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`;
    if (typeof value === "number") {
      addNumberMismatch(
        mismatches,
        expectedPath,
        value,
        text(group, field),
        field.startsWith("p") ? 5e-5 : 5e-3
      );
    } else {
      addTextMismatch(mismatches, expectedPath, String(value), text(group, field));
    }
  }
  for (const field of expectedFields) {
    if (field === codeTag || field === "orig") continue;
    if (!Object.prototype.hasOwnProperty.call(tax.values, field))
      mismatches.push({
        field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`,
        expected: "(valor ausente no snapshot fiscal)",
        actual: text(group, field) || "(ausente)"
      });
  }
  for (const field of children(group).map(localName)) {
    if (!expectedFields.has(field))
      mismatches.push({
        field: `det[${itemNumber}].imposto.${groupName}.${expectedTag}.${field}`,
        expected: "(ausente)",
        actual: "(presente)"
      });
  }
}
function compareItem(mismatches, item, actual, environment, model) {
  const n = item.itemNumber;
  const field = `det[${n}]`;
  const product = child(actual, "prod");
  const taxes = child(actual, "imposto");
  const printType = model === "65" ? "4" : "1";
  const homologationName = n === 1 && shouldUseHomologationFirstItemDescription({ model, environment, printType }) ? HOMOLOGATION_FIRST_ITEM_DESCRIPTION : item.product.description;
  addTextMismatch(mismatches, `${field}.@nItem`, String(n), actual.getAttribute("nItem") || "");
  addTextMismatch(mismatches, `${field}.prod.cProd`, item.product.code, text(product, "cProd"));
  addTextMismatch(mismatches, `${field}.prod.xProd`, homologationName, text(product, "xProd"));
  addOptionalTextMismatch(
    mismatches,
    `${field}.infAdProd`,
    n === 1 && homologationName !== item.product.description ? item.product.description : void 0,
    text(actual, "infAdProd")
  );
  addTextMismatch(mismatches, `${field}.prod.NCM`, item.classification.ncm, text(product, "NCM"));
  addOptionalTextMismatch(mismatches, `${field}.prod.CEST`, item.classification.cest, text(product, "CEST"));
  addOptionalTextMismatch(mismatches, `${field}.prod.cBenef`, item.classification.benefitCode, text(product, "cBenef"));
  addTextMismatch(mismatches, `${field}.prod.CFOP`, item.classification.cfop, text(product, "CFOP"));
  addTextMismatch(mismatches, `${field}.prod.uCom`, item.classification.unit, text(product, "uCom"));
  addNumberMismatch(mismatches, `${field}.prod.qCom`, item.product.quantity, text(product, "qCom"), 5e-5);
  addNumberMismatch(mismatches, `${field}.prod.vUnCom`, item.product.unitValue, text(product, "vUnCom"), 5e-5);
  addNumberMismatch(mismatches, `${field}.prod.vProd`, item.product.gross, text(product, "vProd"));
  addTextMismatch(mismatches, `${field}.prod.cEAN`, item.product.gtin, text(product, "cEAN"));
  addTextMismatch(mismatches, `${field}.prod.cEANTrib`, item.product.gtin, text(product, "cEANTrib"));
  addTextMismatch(mismatches, `${field}.prod.uTrib`, item.classification.unit, text(product, "uTrib"));
  addNumberMismatch(mismatches, `${field}.prod.qTrib`, item.product.quantity, text(product, "qTrib"), 5e-5);
  addNumberMismatch(mismatches, `${field}.prod.vUnTrib`, item.product.unitValue, text(product, "vUnTrib"), 5e-5);
  addOptionalTextMismatch(mismatches, `${field}.prod.vFrete`, item.product.freight ? item.product.freight.toFixed(2) : void 0, text(product, "vFrete"));
  addOptionalTextMismatch(mismatches, `${field}.prod.vSeg`, item.product.insurance ? item.product.insurance.toFixed(2) : void 0, text(product, "vSeg"));
  addOptionalTextMismatch(mismatches, `${field}.prod.vDesc`, item.product.discount ? item.product.discount.toFixed(2) : void 0, text(product, "vDesc"));
  addOptionalTextMismatch(mismatches, `${field}.prod.vOutro`, item.product.otherExpenses ? item.product.otherExpenses.toFixed(2) : void 0, text(product, "vOutro"));
  addTextMismatch(mismatches, `${field}.prod.indTot`, "1", text(product, "indTot"));
  const icmsGroup = children(child(taxes, "ICMS"))[0] || null;
  addTextMismatch(mismatches, `${field}.imposto.ICMS.orig`, item.classification.origin, text(icmsGroup, "orig"));
  const expectedTaxGroups = new Set(item.taxes.map((tax) => tax.group));
  const actualTaxGroups = children(taxes).map(localName).filter((name) => name !== "vTotTrib");
  for (const name of ["ICMS", "IPI", "PIS", "COFINS"]) {
    const expected = expectedTaxGroups.has(name);
    const actualGroup = child(taxes, name);
    if (expected !== Boolean(actualGroup))
      mismatches.push({
        field: `${field}.imposto.${name}`,
        expected: expected ? "presente" : "ausente",
        actual: actualGroup ? "presente" : "ausente"
      });
  }
  for (const tax of item.taxes) compareTaxGroup(mismatches, n, tax, taxes);
  for (const extra of actualTaxGroups) {
    if (!expectedTaxGroups.has(extra))
      mismatches.push({
        field: `${field}.imposto.${extra}`,
        expected: "(ausente)",
        actual: "(presente)"
      });
  }
}
function assertNfeSignature(xml, expectedCertificatePem) {
  const parseErrors = [];
  const parsed = createStrictXmlParser(parseErrors).parseFromString(xml, "application/xml");
  if (parseErrors.length || !parsed.documentElement)
    throw new Error(`XML assinado inv\xE1lido: ${parseErrors.join("; ") || "raiz ausente"}`);
  const signatures = allDescendants(parsed.documentElement, "Signature");
  const infNfes = allDescendants(parsed.documentElement, "infNFe");
  if (localName(parsed.documentElement) !== "NFe" || signatures.length !== 1 || infNfes.length !== 1 || child(parsed.documentElement, "infNFe") !== infNfes[0] || child(parsed.documentElement, "Signature") !== signatures[0])
    throw new Error("XML fiscal precisa conter uma NF-e e uma assinatura XMLDSig.");
  const elementId = infNfes[0].getAttribute("Id");
  const signature = signatures[0];
  const references = allDescendants(signature, "Reference");
  const signatureMethod = child(child(signature, "SignedInfo"), "SignatureMethod")?.getAttribute("Algorithm");
  const digestMethod = child(references[0] || null, "DigestMethod")?.getAttribute("Algorithm");
  const transforms = allDescendants(references[0] || signature, "Transform").map((node) => node.getAttribute("Algorithm"));
  if (!elementId || references.length !== 1 || references[0].getAttribute("URI") !== `#${elementId}` || signatureMethod !== "http://www.w3.org/2000/09/xmldsig#rsa-sha1" || digestMethod !== "http://www.w3.org/2000/09/xmldsig#sha1" || !transforms.includes("http://www.w3.org/2000/09/xmldsig#enveloped-signature") || !transforms.includes("http://www.w3.org/TR/2001/REC-xml-c14n-20010315") || !allDescendants(signature, "SignatureValue")[0]?.textContent?.trim() || !allDescendants(signature, "X509Certificate")[0]?.textContent?.trim())
    throw new Error("Assinatura fiscal incompleta ou sem refer\xEAncia ao infNFe desta nota.");
  const verifier = new import_xml_crypto2.SignedXml({
    getCertFromKeyInfo: import_xml_crypto2.SignedXml.getCertFromKeyInfo,
    ...expectedCertificatePem ? { publicCert: expectedCertificatePem } : {}
  });
  verifier.loadSignature(signature.toString());
  if (!verifier.checkSignature(xml))
    throw new Error("A assinatura XMLDSig n\xE3o confere com o conte\xFAdo final do XML fiscal.");
}
function assertFiscalDocumentMatchesCommercialSnapshot(snapshot, document) {
  const orderItems = snapshot.order.data.items;
  if (!Array.isArray(orderItems)) throw new Error("Snapshot comercial sem itens do pedido.");
  const composition = composeServiceFiscalValues(orderItems, document.model);
  const paymentFeeComposition = composePaymentFeeVoutro({
    snapshot,
    model: document.model,
    itemNetCents: composition.products.map((item) => item.vProdCents - item.vDescCents)
  });
  const mismatches = [];
  if (composition.products.length !== document.items.length)
    mismatches.push({ field: "itens.count", expected: composition.products.length, actual: document.items.length });
  composition.products.forEach(({ item, vProdCents, vDescCents }, index) => {
    const fiscalItem = document.items[index];
    if (!fiscalItem) return;
    const n = index + 1;
    const code = String(item.code || item.sku || `ITEM-${n}`).slice(0, 60);
    const description = String(item.description || "").trim();
    const quantity = Number(item.quantity) || 1;
    const gross = vProdCents / 100;
    const freight2 = index === 0 ? Number(snapshot.order.data.shipping?.value || 0) : 0;
    const otherExpenses = ((index === 0 ? composition.vOutroCents : 0) + (paymentFeeComposition.itemFeeCents[index] || 0)) / 100;
    const fields2 = [
      [`itens[${n}].codigo`, code, fiscalItem.product.code],
      [`itens[${n}].descricao`, description, fiscalItem.product.description],
      [`itens[${n}].quantidade`, quantity, fiscalItem.product.quantity, 1e-6],
      [`itens[${n}].valorBruto`, gross, fiscalItem.product.gross],
      [`itens[${n}].desconto`, vDescCents / 100, fiscalItem.product.discount],
      [`itens[${n}].valorUnitario`, gross / quantity, fiscalItem.product.unitValue, 1e-6],
      [`itens[${n}].frete`, freight2, fiscalItem.product.freight],
      [`itens[${n}].outrasDespesas`, otherExpenses, fiscalItem.product.otherExpenses]
    ];
    for (const [field, expected, actual, tolerance = 5e-3] of fields2) {
      const matches = typeof expected === "string" ? expected === actual : typeof actual === "number" && Math.abs(expected - actual) <= tolerance;
      if (!matches) mismatches.push({ field, expected, actual });
    }
  });
  const shipping = objectValue(snapshot.order.data.shipping);
  const freight = Number(shipping.value || 0);
  const expectedCommercialTotal = (composition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) + composition.vOutroCents + paymentFeeComposition.totalFeeCents) / 100 + freight;
  if (Math.abs(expectedCommercialTotal - document.totals.invoice) > 5e-3)
    mismatches.push({
      field: "total.valorPedidoCalculado",
      expected: expectedCommercialTotal,
      actual: document.totals.invoice
    });
  const expectedAdditionalInformation = joinFiscalAdditionalInformation(
    composition.additionalInformation,
    paymentFeeComposition.additionalInformation
  ) || "";
  if ((document.additionalInformation || "") !== expectedAdditionalInformation)
    mismatches.push({
      field: "informacoesAdicionais.infCpl",
      expected: expectedAdditionalInformation || "(ausente)",
      actual: document.additionalInformation || "(ausente)"
    });
  if (document.modelDecision?.status === "ready") {
    const expectedPayments = resolveNormalSalePayments({
      snapshot,
      data: snapshot.order.data,
      shipping: objectValue(snapshot.order.data.shipping),
      modelDecision: document.modelDecision,
      traces: [...document.decisions],
      invoice: Math.round(document.totals.invoice * 100),
      feeCentsByPayment: resolvePaymentFeeRows(snapshot.order.data).feeCentsByPayment
    }).payments;
    const paymentCount = Math.max(expectedPayments.length, document.payments.length);
    for (let index = 0; index < paymentCount; index += 1) {
      const expected = expectedPayments[index];
      const actual = document.payments[index];
      if (!expected || !actual) {
        mismatches.push({
          field: `pagamentos[${index + 1}]`,
          expected: expected ? "presente" : "(ausente)",
          actual: actual ? "presente" : "(ausente)"
        });
        continue;
      }
      if (expected.methodCode !== actual.methodCode)
        mismatches.push({ field: `pagamentos[${index + 1}].meio`, expected: expected.methodCode, actual: actual.methodCode });
      if (Math.abs(expected.amount - actual.amount) > 5e-3)
        mismatches.push({ field: `pagamentos[${index + 1}].valor`, expected: expected.amount, actual: actual.amount });
      if (expected.paymentIndicator !== actual.paymentIndicator)
        mismatches.push({ field: `pagamentos[${index + 1}].indicador`, expected: expected.paymentIndicator || "", actual: actual.paymentIndicator || "" });
      if ((expected.description || "") !== (actual.description || ""))
        mismatches.push({ field: `pagamentos[${index + 1}].descri\xE7\xE3o`, expected: expected.description || "", actual: actual.description || "" });
      if ((expected.paymentDate || "") !== (actual.paymentDate || ""))
        mismatches.push({ field: `pagamentos[${index + 1}].data`, expected: expected.paymentDate || "", actual: actual.paymentDate || "" });
      if (JSON.stringify(expected.card || null) !== JSON.stringify(actual.card || null))
        mismatches.push({ field: `pagamentos[${index + 1}].cart\xE3o`, expected: "dados do pedido", actual: "dados divergentes" });
    }
  }
  const orderCustomer = objectValue(snapshot.order.data.customerData);
  const fiscalCustomer = objectValue(snapshot.fiscalInputs?.customer);
  const selectedTaxId = normalizeTaxId(
    String(
      snapshot.emissionRequest.recipientTaxId ?? orderCustomer.cpfCnpj ?? fiscalCustomer.cpfCnpj ?? ""
    )
  );
  const resolvedTaxId = normalizeTaxId(document.recipient.cpfCnpj);
  if (selectedTaxId && selectedTaxId !== resolvedTaxId)
    mismatches.push({ field: "cliente.CPF_CNPJ", expected: selectedTaxId, actual: resolvedTaxId || "(ausente)" });
  const orderCustomerName = String(orderCustomer.fullName || orderCustomer.name || "").trim();
  if (orderCustomerName && orderCustomerName !== document.recipient.name)
    mismatches.push({ field: "cliente.nome", expected: orderCustomerName, actual: document.recipient.name });
  const orderCustomerId = String(snapshot.order.data.customerId || orderCustomer.id || "");
  const fiscalCustomerId = String(fiscalCustomer.id || "");
  if (orderCustomerId && fiscalCustomerId && orderCustomerId !== fiscalCustomerId)
    mismatches.push({ field: "cliente.id", expected: orderCustomerId, actual: fiscalCustomerId });
  if (snapshot.emissionRequest.finalConsumer !== void 0 && document.operation.finalConsumer !== (snapshot.emissionRequest.finalConsumer ? "1" : "0"))
    mismatches.push({
      field: "operacao.consumidorFinal",
      expected: snapshot.emissionRequest.finalConsumer ? "1" : "0",
      actual: document.operation.finalConsumer
    });
  if (snapshot.emissionRequest.freightMode !== void 0 && document.operation.freightMode !== snapshot.emissionRequest.freightMode)
    mismatches.push({
      field: "transporte.modalidadeFrete",
      expected: snapshot.emissionRequest.freightMode,
      actual: document.operation.freightMode
    });
  const sourceTotal = Number(objectValue(snapshot.order.data.paymentsSummary).totalOrderValue);
  if (Number.isFinite(sourceTotal) && Math.abs(sourceTotal - document.totals.invoice) > 5e-3)
    mismatches.push({ field: "total.valorPedido", expected: sourceTotal, actual: document.totals.invoice });
  if (mismatches.length) throw new FiscalXmlAuditError(mismatches);
}
function assertSignedFiscalXmlMatchesSnapshot(snapshot, document, xml, identity, expectedCertificatePem) {
  assertFiscalDocumentMatchesCommercialSnapshot(snapshot, document);
  assertNfeSignature(xml, expectedCertificatePem);
  const parseErrors = [];
  const parsed = createStrictXmlParser(parseErrors).parseFromString(xml, "application/xml");
  if (parseErrors.length || !parsed.documentElement)
    throw new Error(`XML fiscal inv\xE1lido: ${parseErrors.join("; ") || "raiz ausente"}`);
  const infNfes = allDescendants(parsed.documentElement, "infNFe");
  if (infNfes.length !== 1) throw new Error("XML fiscal precisa conter um \xFAnico infNFe.");
  const infNfe = infNfes[0];
  const ide = child(infNfe, "ide");
  const issuer = child(infNfe, "emit");
  const recipient = child(infNfe, "dest");
  const totals = child(child(infNfe, "total"), "ICMSTot");
  const mismatches = [];
  addTextMismatch(mismatches, "infNFe.Id", `NFe${identity.accessKey}`, infNfe.getAttribute("Id") || "");
  addTextMismatch(mismatches, "ide.cUF", "41", text(ide, "cUF"));
  addTextMismatch(mismatches, "ide.cNF", identity.accessKey.slice(35, 43), text(ide, "cNF"));
  addTextMismatch(mismatches, "ide.mod", document.model, text(ide, "mod"));
  addTextMismatch(mismatches, "ide.tpAmb", String(document.environment), text(ide, "tpAmb"));
  addTextMismatch(mismatches, "ide.serie", String(identity.series), text(ide, "serie"));
  addTextMismatch(mismatches, "ide.nNF", String(identity.number), text(ide, "nNF"));
  addTextMismatch(mismatches, "ide.dhEmi", identity.issuedAt, text(ide, "dhEmi"));
  addTextMismatch(mismatches, "ide.tpNF", document.operation.direction === "outbound" ? "1" : "0", text(ide, "tpNF"));
  addTextMismatch(mismatches, "ide.finNFe", document.operation.purpose, text(ide, "finNFe"));
  addTextMismatch(mismatches, "ide.idDest", document.operation.destination, text(ide, "idDest"));
  addTextMismatch(mismatches, "ide.indFinal", document.operation.finalConsumer, text(ide, "indFinal"));
  addTextMismatch(mismatches, "ide.indPres", document.operation.presence, text(ide, "indPres"));
  addTextMismatch(mismatches, "ide.natOp", document.operation.natureOfOperation, text(ide, "natOp"));
  addTextMismatch(mismatches, "ide.cMunFG", document.issuer.municipalityCode, text(ide, "cMunFG"));
  addTextMismatch(mismatches, "ide.tpImp", document.model === "65" ? "4" : "1", text(ide, "tpImp"));
  addTextMismatch(mismatches, "ide.tpEmis", "1", text(ide, "tpEmis"));
  addTextMismatch(mismatches, "ide.cDV", identity.accessKey[43], text(ide, "cDV"));
  addTextMismatch(mismatches, "ide.procEmi", "0", text(ide, "procEmi"));
  addTextMismatch(mismatches, "ide.verProc", "MoranteHub_1.0", text(ide, "verProc"));
  addTextMismatch(mismatches, "emit.CNPJ", document.issuer.cnpj, text(issuer, "CNPJ"), normalizeTaxId);
  addTextMismatch(mismatches, "emit.xNome", document.issuer.name, text(issuer, "xNome"));
  addTextMismatch(mismatches, "emit.IE", document.issuer.ie, text(issuer, "IE"), normalizeTaxId);
  addTextMismatch(mismatches, "emit.CRT", document.issuer.crt, text(issuer, "CRT"));
  compareAddress(mismatches, "emit.enderEmit", child(issuer, "enderEmit"), document.issuer.address);
  const recipientTaxId = normalizeTaxId(document.recipient.cpfCnpj);
  const actualRecipientTaxId = normalizeTaxId(text(recipient, "CNPJ") || text(recipient, "CPF"));
  const recipientExpected = document.model !== "65" || Boolean(recipientTaxId);
  if (!recipientExpected && recipient)
    mismatches.push({ field: "dest", expected: "(ausente)", actual: "(presente)" });
  if (recipientExpected && !recipient)
    mismatches.push({ field: "dest", expected: "(presente)", actual: "(ausente)" });
  if (recipientExpected) {
    const expectedRecipientTag = recipientTaxId ? recipientTaxId.length === 11 ? "CPF" : "CNPJ" : "";
    const actualRecipientTag = text(recipient, "CNPJ") ? "CNPJ" : text(recipient, "CPF") ? "CPF" : "";
    addTextMismatch(mismatches, "dest.tipoDocumento", expectedRecipientTag, actualRecipientTag);
    addTextMismatch(mismatches, "dest.CNPJ/CPF", recipientTaxId, actualRecipientTaxId);
    addTextMismatch(
      mismatches,
      "dest.xNome",
      getHomologationRecipientName({
        model: document.model,
        environment: document.environment,
        recipientName: document.recipient.name
      }),
      text(recipient, "xNome")
    );
    addTextMismatch(mismatches, "dest.indIEDest", document.model === "65" ? "9" : document.recipient.ieIndicator, text(recipient, "indIEDest"));
    addOptionalTextMismatch(
      mismatches,
      "dest.IE",
      document.model === "65" || document.recipient.ieIndicator === "2" ? void 0 : document.recipient.ie,
      text(recipient, "IE")
    );
    compareAddress(mismatches, "dest.enderDest", child(recipient, "enderDest"), document.recipient.address);
  }
  const transport = child(infNfe, "transp");
  addTextMismatch(mismatches, "transp.modFrete", document.operation.freightMode, text(transport, "modFrete"));
  const transporter = document.operation.transporter;
  const actualTransporter = child(transport, "transporta");
  const emptyHomeDeliveryGroup = document.model === "65" && document.operation.presence === "4" && actualTransporter && !children(actualTransporter).length;
  if (!transporter && actualTransporter && !emptyHomeDeliveryGroup)
    mismatches.push({ field: "transp.transporta", expected: "(ausente)", actual: "(presente)" });
  if (transporter) {
    const expectedDocumentTag = transporter.cnpj ? "CNPJ" : "CPF";
    const actualDocumentTag = text(actualTransporter, "CNPJ") ? "CNPJ" : text(actualTransporter, "CPF") ? "CPF" : "";
    addTextMismatch(mismatches, "transp.transporta.tipoDocumento", expectedDocumentTag, actualDocumentTag);
    addOptionalTextMismatch(
      mismatches,
      `transp.transporta.${expectedDocumentTag === "CNPJ" ? "CPF" : "CNPJ"}`,
      void 0,
      text(actualTransporter, expectedDocumentTag === "CNPJ" ? "CPF" : "CNPJ")
    );
    addTextMismatch(mismatches, "transp.transporta.CNPJ/CPF", transporter.cnpj || transporter.cpf || "", text(actualTransporter, "CNPJ") || text(actualTransporter, "CPF"), normalizeTaxId);
    addTextMismatch(mismatches, "transp.transporta.xNome", transporter.name, text(actualTransporter, "xNome"));
    addOptionalTextMismatch(mismatches, "transp.transporta.IE", transporter.ie, text(actualTransporter, "IE"));
    addOptionalTextMismatch(mismatches, "transp.transporta.xEnder", transporter.address, text(actualTransporter, "xEnder"));
    addOptionalTextMismatch(mismatches, "transp.transporta.xMun", transporter.city, text(actualTransporter, "xMun"));
    addOptionalTextMismatch(mismatches, "transp.transporta.UF", transporter.uf, text(actualTransporter, "UF"));
  }
  const details = childElements(infNfe, "det");
  if (details.length !== document.items.length)
    mismatches.push({ field: "infNFe.det.count", expected: document.items.length, actual: details.length });
  document.items.forEach((item, index) => {
    const detail = details[index];
    if (detail) compareItem(mismatches, item, detail, document.environment, document.model);
  });
  const totalFields = [
    ["vBC", document.totals.icmsBase],
    ["vICMS", document.totals.icms],
    ["vICMSDeson", document.totals.icmsExempt],
    ["vFCP", document.totals.fcp],
    ["vBCST", document.totals.icmsStBase],
    ["vST", document.totals.icmsSt],
    ["vFCPST", document.totals.fcpSt],
    ["vFCPSTRet", document.totals.fcpStRetained],
    ["vProd", document.totals.products],
    ["vFrete", document.totals.freight],
    ["vSeg", document.totals.insurance],
    ["vDesc", document.totals.discount],
    ["vII", document.totals.ii],
    ["vIPI", document.totals.ipi],
    ["vIPIDevol", document.totals.ipiReturned],
    ["vPIS", document.totals.pis],
    ["vCOFINS", document.totals.cofins],
    ["vOutro", document.totals.otherExpenses],
    ["vNF", document.totals.invoice]
  ];
  for (const [xmlName, expected] of totalFields)
    addNumberMismatch(mismatches, `total.ICMSTot.${xmlName}`, expected, text(totals, xmlName));
  addTextMismatch(
    mismatches,
    "infAdic.infCpl",
    document.additionalInformation || "",
    text(child(infNfe, "infAdic"), "infCpl")
  );
  const paymentDetails = childElements(child(infNfe, "pag"), "detPag");
  if (paymentDetails.length !== document.payments.length)
    mismatches.push({ field: "pag.detPag.count", expected: document.payments.length, actual: paymentDetails.length });
  document.payments.forEach((payment, index) => {
    const actual = paymentDetails[index];
    if (!actual) return;
    const prefix = `pag.detPag[${index + 1}]`;
    addOptionalTextMismatch(mismatches, `${prefix}.indPag`, payment.paymentIndicator, text(actual, "indPag"));
    addTextMismatch(mismatches, `${prefix}.tPag`, payment.methodCode, text(actual, "tPag"));
    addOptionalTextMismatch(mismatches, `${prefix}.xPag`, payment.methodCode === "99" ? payment.description : void 0, text(actual, "xPag"));
    addNumberMismatch(mismatches, `${prefix}.vPag`, payment.amount, text(actual, "vPag"));
    addOptionalTextMismatch(mismatches, `${prefix}.dPag`, payment.paymentDate, text(actual, "dPag"));
    const expectedCard = payment.card;
    const actualCard = child(actual, "card");
    if (!expectedCard && actualCard)
      mismatches.push({ field: `${prefix}.card`, expected: "(ausente)", actual: "(presente)" });
    if (expectedCard) {
      addTextMismatch(mismatches, `${prefix}.card.tpIntegra`, expectedCard.integrationType, text(actualCard, "tpIntegra"));
      addOptionalTextMismatch(mismatches, `${prefix}.card.CNPJ`, expectedCard.acquirerCnpj, text(actualCard, "CNPJ"));
      addOptionalTextMismatch(mismatches, `${prefix}.card.tBand`, expectedCard.brand, text(actualCard, "tBand"));
      addOptionalTextMismatch(mismatches, `${prefix}.card.cAut`, expectedCard.authorization, text(actualCard, "cAut"));
    }
  });
  if (document.totals.change > 0)
    addNumberMismatch(mismatches, "pag.vTroco", document.totals.change, text(child(infNfe, "pag"), "vTroco"));
  else addOptionalTextMismatch(mismatches, "pag.vTroco", void 0, text(child(infNfe, "pag"), "vTroco"));
  const expectedInstallments = document.model === "55" ? document.billingInstallments || [] : [];
  const actualInstallments = childElements(child(infNfe, "cobr"), "dup");
  if (actualInstallments.length !== expectedInstallments.length)
    mismatches.push({
      field: "cobr.dup.count",
      expected: expectedInstallments.length,
      actual: actualInstallments.length
    });
  expectedInstallments.forEach((installment, index) => {
    const actual = actualInstallments[index];
    if (!actual) return;
    const prefix = `cobr.dup[${index + 1}]`;
    addTextMismatch(mismatches, `${prefix}.nDup`, installment.number, text(actual, "nDup"));
    addOptionalTextMismatch(mismatches, `${prefix}.dVenc`, installment.dueDate, text(actual, "dVenc"));
    addNumberMismatch(mismatches, `${prefix}.vDup`, installment.amount, text(actual, "vDup"));
  });
  const expectedReferences = snapshot.order.data.referencedAccessKeys && Array.isArray(snapshot.order.data.referencedAccessKeys) ? snapshot.order.data.referencedAccessKeys.map(String) : [];
  const actualReferences = allDescendants(infNfe, "refNFe").map((node) => node.textContent?.trim() || "");
  for (const expected of expectedReferences) {
    if (!actualReferences.includes(expected))
      mismatches.push({ field: "ide.NFref.refNFe", expected, actual: actualReferences.join(", ") || "(ausente)" });
  }
  for (const actual of actualReferences) {
    if (!expectedReferences.includes(actual))
      mismatches.push({ field: "ide.NFref.refNFe", expected: "(ausente)", actual });
  }
  if (document.model === "65") {
    const supplemental = child(parsed.documentElement, "infNFeSupl");
    const expectedQrCode = `http://www.fazenda.pr.gov.br/nfce/qrcode?p=${identity.accessKey}|3|${document.environment}`;
    addTextMismatch(mismatches, "infNFeSupl.qrCode", expectedQrCode, text(supplemental, "qrCode"));
    addTextMismatch(mismatches, "infNFeSupl.urlChave", "http://www.fazenda.pr.gov.br/nfce/consulta", text(supplemental, "urlChave"));
  } else if (child(parsed.documentElement, "infNFeSupl")) {
    mismatches.push({ field: "infNFeSupl", expected: "(ausente)", actual: "(presente)" });
  }
  if (mismatches.length) throw new FiscalXmlAuditError(mismatches);
}

// api/nfe/normal-sale/outboundTransmission.ts
async function transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed) {
  const gate = productionTransmissionGate(a.environment, productionConfirmed);
  if (gate) return { ...gate, body: { ...gate.body, ...metadata(a), sefazContacted: false } };
  try {
    const saved = await db.from("nfe_fiscal_snapshots").select("snapshot_data").eq("id", a.snapshot_id).maybeSingle();
    const xml = String(doc.xml_nfe || "");
    if (saved.error || !saved.data || (0, import_node_crypto7.createHash)("sha256").update(xml).digest("hex") !== a.xml_sha256)
      throw new Error("Snapshot ou XML reservado indispon\xEDvel.");
    const envelopeError = validateOrdinaryOutboundEnvelope({
      xml,
      accessKey: a.access_key,
      model: a.model,
      environment: a.environment,
      nfeNumber: a.number,
      series: a.series
    });
    if (envelopeError) throw new Error(envelopeError);
    const snapshot = saved.data.snapshot_data;
    if (!snapshot.resolvedDocument)
      throw new Error("Snapshot fiscal sem documento resolvido para a auditoria final.");
    const issuedAt = xml.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
    if (!issuedAt) throw new Error("XML reservado sem instante de emiss\xE3o fiscal.");
    assertSignedFiscalXmlMatchesSnapshot(
      snapshot,
      snapshot.resolvedDocument,
      xml,
      { series: a.series, number: a.number, accessKey: a.access_key, issuedAt },
      certificate.certPem
    );
    await assertXmlFiscalSelections(snapshot, xml);
    await validateNfeAgainstOfficialSchema(xml);
    if (a.model === "65" && (!issuedAt || Date.now() - Date.parse(issuedAt) > 5 * 6e4))
      return outboundFailure(
        409,
        "FISCAL_XML_EXPIRED",
        "XML NFC-e reservado fora do prazo de emiss\xE3o. A reserva foi preservada para tratamento fiscal.",
        { ...metadata(a), state: a.state, sefazContacted: false }
      );
  } catch (error) {
    return outboundFailure(
      422,
      "FISCAL_TRANSMISSION_INTEGRITY_FAILED",
      error instanceof Error ? error.message : "XML reservado inv\xE1lido.",
      { ...metadata(a), sefazContacted: false }
    );
  }
  const started = await withNfeEmissionStage(
    "start_transmission_rpc",
    () => db.rpc("start_nfe_outbound_transmission", {
      p_document_id: a.document_id,
      p_attempt_token: token
    }),
    { emissionRequestId: a.emission_request_id }
  );
  if (started.error)
    return outboundFailure(
      503,
      "FISCAL_START_NOT_CONFIRMED",
      "N\xE3o foi poss\xEDvel confirmar o in\xEDcio da transmiss\xE3o. Consulte a tentativa original.",
      { ...metadata(a), pending: true, sefazContacted: false }
    );
  let response;
  try {
    response = await withNfeEmissionStage(
      "sefaz_transmission",
      () => sendSoapToSefaz({
        url: getNfeServiceEndpoint(a.model, a.environment, "NFeAutorizacao4"),
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
        xmlPayload: `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${a.number}</idLote><indSinc>1</indSinc>${embeddedNfeXml(String(doc.xml_nfe))}</enviNFe>`,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem
      }),
      { model: a.model, environment: a.environment, emissionRequestId: a.emission_request_id }
    );
  } catch {
    let recorded = false;
    try {
      await persistResultToDatabase(
        db,
        a,
        token,
        "reconciling",
        "Transmiss\xE3o sem resposta confirmada; consulta obrigat\xF3ria antes de retry.",
        ""
      );
      recorded = true;
    } catch {
    }
    return outboundFailure(
      502,
      "FISCAL_TRANSMISSION_UNCERTAIN",
      "Transmiss\xE3o sem resposta confirmada. Consulte a chave reservada antes de repetir.",
      { ...metadata(a), pending: true, state: "unknown", reconciliationRecorded: recorded }
    );
  }
  const parsed = parseSefazAuthorization(response);
  const state = parsed.authorized ? "authorized" : isUncertainAuthorization(parsed.cStat, parsed.pending) ? "reconciling" : "rejected";
  try {
    await withNfeEmissionStage(
      "persist_result_rpc",
      () => persistResultToDatabase(
        db,
        a,
        token,
        state,
        parsed.xMotivo || "Resposta SEFAZ inconclusiva.",
        response,
        state === "authorized" ? parsed.protocolNumber || null : null,
        String(doc.xml_nfe)
      ),
      { emissionRequestId: a.emission_request_id }
    );
  } catch {
    return outboundFailure(
      503,
      "FISCAL_RESULT_PERSIST_FAILED",
      "Resposta recebida sem confirma\xE7\xE3o local. Consulte a tentativa original; n\xE3o retransmita.",
      { ...metadata(a), pending: true, state: "unknown" }
    );
  }
  return {
    status: state === "rejected" ? 422 : 200,
    body: {
      ...parsed,
      success: state === "authorized",
      pending: state === "reconciling",
      state,
      ...metadata(a),
      signedXml: doc.xml_nfe,
      sefazResponseXml: response,
      ...state === "rejected" ? { code: "FISCAL_SEFAZ_REJECTED", error: parsed.xMotivo } : {}
    }
  };
}

// api/nfe/normal-sale/outboundReconciliation.ts
var import_node_crypto8 = require("node:crypto");

// api/nfe/authorizationResponseIdentity.ts
var import_xmldom4 = require("@xmldom/xmldom");
function readSefazResult(response) {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return null;
    let invalidXml = false;
    const xml = new import_xmldom4.DOMParser({ errorHandler(level, message) {
      if (level === "warning" && String(message).includes("errorHandler") && String(message).includes("deprecated")) return;
      invalidXml = true;
    } }).parseFromString(response, "text/xml");
    if (invalidXml) return null;
    const namespace = "http://www.portalfiscal.inf.br/nfe";
    const results = [
      ...Array.from(xml.getElementsByTagNameNS("*", "retEnviNFe")),
      ...Array.from(xml.getElementsByTagNameNS("*", "retConsSitNFe"))
    ];
    const protocols = xml.getElementsByTagNameNS("*", "infProt");
    if (results.length !== 1 || protocols.length > 1) return null;
    const result = results[0];
    const protocol = protocols[0];
    if (result.namespaceURI !== namespace || protocol && (protocol.namespaceURI !== namespace || protocol.parentNode?.localName !== "protNFe" || protocol.parentNode.namespaceURI !== namespace || protocol.parentNode.parentNode !== result)) return null;
    const directValue = (element, name) => {
      const children2 = Array.from(element.childNodes).filter(
        (node) => node.nodeType === 1 && "localName" in node && node.localName === name
      );
      const child2 = children2[0];
      return children2.length === 1 && child2 && "namespaceURI" in child2 && child2.namespaceURI === namespace ? child2.textContent?.trim() : void 0;
    };
    return { result, protocol, directValue };
  } catch {
    return null;
  }
}
function matchesSefazAuthorization(response, expected) {
  const parsed = readSefazResult(response);
  if (!parsed?.protocol || !/^\d{15}$/.test(expected.protocolNumber)) return false;
  const { result, protocol, directValue } = parsed;
  const consultation = result.localName === "retConsSitNFe";
  return directValue(result, "cStat") === (consultation ? "100" : "104") && directValue(result, "tpAmb") === String(expected.environment) && (!consultation || directValue(result, "chNFe") === expected.accessKey) && directValue(protocol, "cStat") === "100" && directValue(protocol, "tpAmb") === String(expected.environment) && directValue(protocol, "chNFe") === expected.accessKey && directValue(protocol, "nProt") === expected.protocolNumber && Number.isFinite(Date.parse(directValue(protocol, "dhRecbto") || ""));
}

// api/nfe/normal-sale/outboundReconciliation.ts
function finalResult(a, doc, isReversed = false) {
  const parsed = parseSefazAuthorization(String(doc.xml_protocolo || ""));
  const isCancelled = doc.status === "cancelada";
  return {
    status: 200,
    body: {
      ...parsed,
      success: a.state === "authorized" && !isCancelled && !isReversed,
      ...metadata(a),
      state: isCancelled || isReversed ? "cancelled" : a.state,
      pending: false,
      signedXml: doc.xml_nfe,
      sefazResponseXml: doc.xml_protocolo,
      protocolNumber: doc.numero_protocolo,
      xMotivo: doc.motivo_status,
      ...isCancelled ? {
        code: "FISCAL_ALREADY_CANCELLED",
        error: "O documento original est\xE1 cancelado. Seu hist\xF3rico foi preservado."
      } : isReversed ? {
        code: "FISCAL_ALREADY_REVERSED",
        error: "O documento original foi revertido por estorno. Seu hist\xF3rico foi preservado."
      } : {},
      ...a.state === "rejected" ? { code: "FISCAL_SEFAZ_REJECTED", error: doc.motivo_status } : {}
    }
  };
}
async function reconcileNormalSale(db, documentId, allowTransmission = false, productionConfirmed = false, ownedToken, preloadedCertificate) {
  let loaded;
  try {
    loaded = await withNfeEmissionStage(
      "attempt_load",
      () => loadOutboundAttempt(db, documentId),
      { documentId }
    );
  } catch {
    return outboundFailure(
      503,
      "FISCAL_ATTEMPT_UNAVAILABLE",
      "Tentativa fiscal indispon\xEDvel. Nenhuma nova numera\xE7\xE3o foi reservada.",
      { documentId, pending: true }
    );
  }
  const { attempt: a, document: doc } = loaded;
  if (["authorized", "rejected"].includes(a.state)) {
    let isReversed = false;
    try {
      const { data: revConfirmed } = await db.rpc("is_order_edit_reversal_confirmed", {
        p_original_document_id: doc.id
      });
      isReversed = revConfirmed === true;
    } catch {
    }
    return finalResult(a, doc, isReversed);
  }
  const token = ownedToken || (0, import_node_crypto8.randomUUID)();
  if (!ownedToken) {
    const claimed = await db.rpc("claim_nfe_outbound_attempt", {
      p_document_id: documentId,
      p_attempt_token: token
    });
    if (claimed.error || !claimed.data)
      return outboundFailure(
        409,
        "FISCAL_ATTEMPT_IN_PROGRESS",
        "Outra opera\xE7\xE3o fiscal est\xE1 em andamento. Consulte novamente ap\xF3s sua conclus\xE3o.",
        { ...metadata(a), pending: true }
      );
  }
  try {
    if (a.state === "prepared" && !allowTransmission)
      return outboundFailure(
        409,
        "FISCAL_PREPARED_NOT_SENT",
        "Documento reservado; a transmiss\xE3o n\xE3o foi iniciada.",
        { ...metadata(a), pending: false, state: "prepared", sefazContacted: false }
      );
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfx)
      return outboundFailure(
        503,
        "FISCAL_CERTIFICATE_UNAVAILABLE",
        "Certificado A1 indispon\xEDvel para consultar ou transmitir.",
        { ...metadata(a), pending: a.state !== "prepared" }
      );
    const certificate = preloadedCertificate ? preloadedCertificate : await withNfeEmissionStage(
      "reconcile_cert_extract",
      () => extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ""),
      { documentId }
    );
    if (a.state === "prepared" && allowTransmission)
      return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);
    const response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(a.model, a.environment, "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${a.environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${a.access_key}</chNFe></consSitNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
    const situation = parseSefazNfeSituation(response);
    if (situation.state === "authorized") {
      const parsed = parseSefazAuthorization(response);
      if (!matchesSefazAuthorization(response, {
        accessKey: a.access_key,
        environment: a.environment,
        protocolNumber: parsed.protocolNumber || ""
      }) || !matchesConsultedDocument(response, {
        ambiente: a.environment,
        chave_acesso: a.access_key,
        numero_protocolo: parsed.protocolNumber || null
      })) {
        return outboundFailure(
          409,
          "FISCAL_RECONCILIATION_REQUIRED",
          "A consulta n\xE3o confirmou a identidade da autoriza\xE7\xE3o. Consulte novamente a mesma chave.",
          { ...metadata(a), pending: true, state: "unknown" }
        );
      }
      await persistResultToDatabase(
        db,
        a,
        token,
        "authorized",
        parsed.xMotivo,
        response,
        parsed.protocolNumber || null,
        String(doc.xml_nfe)
      );
      return {
        status: 200,
        body: {
          ...parsed,
          success: true,
          pending: false,
          state: "authorized",
          ...metadata(a),
          signedXml: doc.xml_nfe,
          sefazResponseXml: response
        }
      };
    }
    if (situation.state === "not_found") {
      await persistResultToDatabase(
        db,
        a,
        token,
        "confirmed_not_found",
        `217: ${situation.xMotivo}`,
        response
      );
      if (allowTransmission && a.state === "confirmed_not_found")
        return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);
      return outboundFailure(
        409,
        "FISCAL_CONFIRMED_NOT_FOUND",
        "217: Documento n\xE3o encontrado. Uma nova tentativa expl\xEDcita reutilizar\xE1 o XML, a chave e o n\xFAmero reservados.",
        {
          ...metadata(a),
          pending: false,
          state: "not_found",
          cStat: "217",
          xMotivo: situation.xMotivo
        }
      );
    }
    await persistResultToDatabase(
      db,
      a,
      token,
      "reconciling",
      "Consulta n\xE3o confirmou autoriza\xE7\xE3o nem aus\xEAncia do documento.",
      response
    );
    return outboundFailure(
      409,
      "FISCAL_RECONCILIATION_REQUIRED",
      "Consulta inconclusiva. N\xE3o retransmita sem confirmar a situa\xE7\xE3o da chave reservada.",
      { ...metadata(a), pending: true, state: "unknown", cStat: situation.cStat }
    );
  } catch {
    return outboundFailure(
      502,
      "FISCAL_RECONCILIATION_REQUIRED",
      "N\xE3o foi poss\xEDvel confirmar e persistir a situa\xE7\xE3o fiscal. A tentativa e o n\xFAmero foram preservados.",
      { ...metadata(a), pending: true, state: "unknown" }
    );
  } finally {
    try {
      await withNfeEmissionStage(
        "release_attempt_rpc",
        () => db.rpc("release_nfe_outbound_attempt", {
          p_document_id: documentId,
          p_attempt_token: token
        }),
        { documentId }
      );
    } catch {
    }
  }
}

// api/nfe/normal-sale/outboundStatus.ts
var import_node_crypto9 = require("node:crypto");

// shared-utils/withTimeout.ts
async function withTimeout(promise, timeoutMs, fallbackValue, label) {
  let timer;
  const timeoutPromise = new Promise((resolve2) => {
    timer = setTimeout(() => {
      console.warn(`[Request] Timeout de ${timeoutMs}ms atingido em: ${label}.`);
      resolve2(fallbackValue);
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// api/nfe/normal-sale/outboundStatus.ts
var OUTBOUND_ATTEMPT_STATUS_TIMEOUT_MS = 5e3;
async function readOutboundAttemptStatus(db, orderId, environment, emissionRequestId, diagnosticId = (0, import_node_crypto9.randomUUID)()) {
  const queryResults = await withTimeout(
    Promise.all([
      db.from("nfe_outbound_attempts").select(
        "document_id,emission_request_id,order_id,model,environment,series,number,state,transmission_started_at"
      ).eq("emission_request_id", emissionRequestId).maybeSingle(),
      db.from("nfe_documents").select("id,status,modelo,ambiente,numero_nfe,serie,numero_protocolo").eq("emission_request_id", emissionRequestId).eq("order_id", orderId).eq("ambiente", environment).eq("document_type", "outbound").maybeSingle(),
      db.from("nfe_fiscal_snapshots").select("id,requested_model,environment,series,reserved_number").eq("emission_request_id", emissionRequestId).eq("order_id", orderId).eq("environment", environment).maybeSingle()
    ]),
    OUTBOUND_ATTEMPT_STATUS_TIMEOUT_MS,
    null,
    "nfe:read-only-attempt-status"
  ).catch((error) => {
    const errorType = error instanceof Error ? error.name : void 0;
    console.error("[NF-e attempt status] read failed", {
      diagnosticId,
      diagnosticStage: "read-only-attempt-status",
      ...errorType && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(errorType) ? { errorType } : {}
    });
    return null;
  });
  if (!queryResults) return { kind: "unavailable", diagnosticId };
  const [attemptResult, documentResult, snapshotResult] = queryResults;
  const queryErrors = [
    { query: "attempt", error: attemptResult.error },
    { query: "document", error: documentResult.error },
    { query: "snapshot", error: snapshotResult.error }
  ].flatMap(({ query, error }) => {
    if (!error) return [];
    const code = typeof error.code === "string" ? error.code : "";
    return [
      {
        query,
        code: /^[A-Za-z0-9_.-]{1,48}$/.test(code) ? code : "UNKNOWN"
      }
    ];
  });
  if (queryErrors.length) {
    console.error("[NF-e attempt status] read failed", {
      diagnosticId,
      diagnosticStage: "read-only-attempt-status",
      queries: queryErrors
    });
    return { kind: "unavailable", diagnosticId };
  }
  const attempt = attemptResult.data;
  const document = documentResult.data;
  const snapshot = snapshotResult.data;
  if (attempt) {
    if (attempt.order_id !== orderId || attempt.environment !== environment)
      return { kind: "inconsistent" };
    if (!document || !snapshot || document.id !== attempt.document_id || document.modelo !== attempt.model || Number(document.ambiente) !== attempt.environment || Number(document.numero_nfe) !== attempt.number || String(document.serie) !== attempt.series || snapshot.requested_model !== attempt.model || Number(snapshot.environment) !== attempt.environment || Number(snapshot.reserved_number) !== attempt.number || String(snapshot.series) !== attempt.series)
      return {
        kind: "inconsistent",
        documentId: attempt.document_id,
        numberReserved: true
      };
    return { kind: "found", attempt, document };
  }
  if (document || snapshot)
    return {
      kind: "inconsistent",
      documentId: document?.id,
      numberReserved: true
    };
  return { kind: "not_found" };
}

// api/nfe/consult.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const supabase = (0, import_supabase_js.createClient)(
    supabaseUrl,
    serviceKey,
    { db: { retry: false } }
  );
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message
    });
  const emissionRequestId = String(req.body?.emissionRequestId || "");
  if (emissionRequestId) {
    const orderId = String(req.body?.orderId || "");
    const environment = Number(req.body?.environment);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      emissionRequestId
    ) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orderId
    ) || ![1, 2].includes(environment))
      return res.status(400).json({ success: false, error: "Identidade da tentativa inv\xE1lida." });
    const statusDiagnosticId = (0, import_node_crypto10.randomUUID)();
    const lookup = await readOutboundAttemptStatus(
      supabase,
      orderId,
      environment,
      emissionRequestId,
      statusDiagnosticId
    );
    if (lookup.kind === "unavailable")
      return res.status(503).json({
        success: false,
        pending: true,
        code: "FISCAL_ATTEMPT_STATUS_UNAVAILABLE",
        diagnosticStage: "read-only-attempt-status",
        diagnosticId: lookup.diagnosticId,
        error: "N\xE3o foi poss\xEDvel consultar o estado local da tentativa. Consulte novamente antes de continuar."
      });
    if (lookup.kind === "not_found")
      return res.status(200).json({
        success: true,
        code: "FISCAL_PREPARATION_NOT_PERSISTED",
        state: "not_found",
        pending: false,
        preparationReconciled: true,
        orderId,
        environment,
        emissionRequestId,
        numberReserved: false,
        sefazContacted: false
      });
    if (lookup.kind === "inconsistent")
      return res.status(503).json({
        success: false,
        pending: true,
        code: "FISCAL_ATTEMPT_STATUS_INCONSISTENT",
        ...lookup.documentId ? { documentId: lookup.documentId } : {},
        orderId,
        environment,
        emissionRequestId,
        numberReserved: lookup.numberReserved,
        error: "Os registros locais desta tentativa est\xE3o incompletos. Preserve a tentativa e solicite confer\xEAncia fiscal antes de continuar."
      });
    const { attempt, document } = lookup;
    const metadata3 = {
      documentId: attempt.document_id,
      orderId: attempt.order_id,
      emissionRequestId: attempt.emission_request_id,
      model: attempt.model,
      environment: attempt.environment,
      series: attempt.series,
      nfeNumber: attempt.number,
      numberReserved: true,
      sefazContacted: attempt.transmission_started_at ? void 0 : false,
      transmissionStartedAt: attempt.transmission_started_at,
      pending: ["prepared", "transmitting", "reconciling"].includes(attempt.state),
      state: attempt.state
    };
    if (attempt.state === "authorized") {
      if (!["autorizada", "homologada"].includes(document.status) || !document.numero_protocolo)
        return res.status(503).json({
          success: false,
          pending: true,
          code: "FISCAL_ATTEMPT_STATUS_INCONSISTENT",
          ...metadata3,
          error: "O estado local do documento diverge da tentativa. Preserve-a para confer\xEAncia fiscal."
        });
      return res.status(200).json({
        success: true,
        ...metadata3,
        state: "authorized",
        pending: false,
        protocolNumber: document.numero_protocolo || void 0
      });
    }
    if (attempt.state === "rejected") {
      if (document.status !== "erro")
        return res.status(503).json({
          success: false,
          pending: true,
          code: "FISCAL_ATTEMPT_STATUS_INCONSISTENT",
          ...metadata3,
          error: "O estado local do documento diverge da tentativa. Preserve-a para confer\xEAncia fiscal."
        });
      return res.status(200).json({
        success: true,
        code: "FISCAL_SEFAZ_REJECTED",
        ...metadata3,
        pending: false,
        state: "rejected",
        error: "A tentativa est\xE1 registrada como rejeitada. Consulte o motivo no documento fiscal."
      });
    }
    if (attempt.state === "confirmed_not_found") {
      if (document.status !== "erro")
        return res.status(503).json({
          success: false,
          pending: true,
          code: "FISCAL_ATTEMPT_STATUS_INCONSISTENT",
          ...metadata3,
          error: "O estado local do documento diverge da tentativa. Preserve-a para confer\xEAncia fiscal."
        });
      return res.status(200).json({
        success: true,
        code: "FISCAL_CONFIRMED_NOT_FOUND",
        ...metadata3,
        pending: false,
        state: "not_found"
      });
    }
    return res.status(200).json({
      success: true,
      ...metadata3,
      databaseReason: attempt.state === "prepared" && !attempt.transmission_started_at ? "PREPARED_ATTEMPT_FOUND" : "ATTEMPT_STATUS_FOUND",
      error: attempt.state === "prepared" && !attempt.transmission_started_at ? "A tentativa foi gravada e reservou o n\xFAmero; a transmiss\xE3o ainda n\xE3o come\xE7ou." : "A tentativa foi gravada e pode j\xE1 ter iniciado a transmiss\xE3o. Consulte o estado fiscal antes de continuar."
    });
  }
  const documentId = String(req.body?.documentId || "");
  if (!documentId)
    return res.status(400).json({ success: false, error: "Documento fiscal n\xE3o informado." });
  try {
    const { data: doc, error } = await supabase.from("nfe_documents").select("*").eq("id", documentId).maybeSingle();
    if (error || !doc)
      return res.status(404).json({ success: false, error: "Documento fiscal n\xE3o encontrado." });
    if (doc.fiscal_ruleset_version === NORMAL_SALE_RULESET_VERSION) {
      const result2 = ["autorizada", "homologada"].includes(doc.status) ? await consultAuthorizedDocument(doc) : await reconcileNormalSale(supabase, doc.id);
      return res.status(result2.status).json(result2.body);
    }
    if (isHmlRuleSet(doc.fiscal_ruleset_version)) {
      const result2 = doc.status === "homologada" ? await consultAuthorizedHmlTechnical(doc) : await retryHmlTechnical(supabase, doc.id, false);
      return res.status(result2.status).json({
        ...result2.body,
        state: result2.body.success ? "authorized" : ["HML_CONFIRMED_NOT_FOUND", "HML_NEW_EMISSION_REQUIRED"].includes(
          String(result2.body.code)
        ) ? "not_found" : "unknown"
      });
    }
    const model = String(doc.modelo);
    const environment = Number(doc.ambiente);
    const accessKey = String(doc.chave_acesso || "");
    if (!["55", "65"].includes(model) || ![1, 2].includes(environment) || !ACCESS_KEY_PATTERN.test(accessKey)) {
      return res.status(409).json({ success: false, error: "Modelo, ambiente ou chave de acesso inv\xE1lidos." });
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx)
      return res.status(503).json({ success: false, error: "Certificado digital do emitente n\xE3o configurado." });
    const certificate = extractCertificateAndKey(pfx, password || "");
    const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
    const consultationStartedAt = (/* @__PURE__ */ new Date()).toISOString();
    const responseXml = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(model, environment, "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: queryXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
    const result = await reconcileLegacyConsultation(supabase, doc, responseXml, consultationStartedAt);
    return res.status(result.status).json(result.body);
  } catch (err) {
    const diagnosticId = (0, import_node_crypto10.randomUUID)();
    const transportDiagnostic = sefazTransportDiagnostic(err);
    console.error("[NF-e Consult] Falha de transporte:", {
      documentId,
      diagnosticId,
      ...transportDiagnostic
    });
    return res.status(502).json({
      success: false,
      pending: true,
      diagnosticId,
      diagnosticStage: "sefaz-consultation",
      transportDiagnostic,
      error: "N\xE3o foi poss\xEDvel confirmar a situa\xE7\xE3o do documento na SEFAZ. Nenhum novo evento foi enviado."
    });
  }
}
//# sourceMappingURL=consult.cjs.map
