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

// api/nfe/emit.ts
var emit_exports = {};
__export(emit_exports, {
  default: () => handler
});
module.exports = __toCommonJS(emit_exports);

// shared-utils/fiscalIdentifiers.ts
var CNPJ_PATTERN = /^[A-Z0-9]{12}[0-9]{2}$/;
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;
function normalizeFiscalIdentifier(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
}
function mod11(value) {
  let sum = 0;
  for (let index = value.length - 1, weight = 2; index >= 0; index--) {
    sum += (value.charCodeAt(index) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const digit = 11 - sum % 11;
  return digit >= 10 ? 0 : digit;
}
function isValidCnpj(value) {
  const cnpj = normalizeFiscalIdentifier(value);
  if (!CNPJ_PATTERN.test(cnpj) || cnpj === "00000000000000") return false;
  const first = mod11(cnpj.slice(0, 12));
  const second = mod11(`${cnpj.slice(0, 12)}${first}`);
  return cnpj.slice(12) === `${first}${second}`;
}
function calculateAccessKeyDigit(base43) {
  if (!/^[0-9]{6}[A-Z0-9]{12}[0-9]{25}$/.test(base43))
    throw new Error("Base da chave de acesso inv\xE1lida.");
  return mod11(base43);
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

// api/nfe/emit.ts
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
  const normalized2 = pfxBase64.replace(/\s/g, "");
  if (!normalized2 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized2) || Buffer.from(normalized2, "base64").toString("base64") !== normalized2) {
    throw Object.assign(new Error("O certificado A1 deve conter Base64 v\xE1lido do arquivo PFX."), {
      code: "A1_BASE64_INVALID"
    });
  }
  const pfxDer = import_node_forge.default.util.decode64(normalized2);
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

// api/nfe/emit.ts
var import_node_crypto11 = require("node:crypto");

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

// erp/src/pages/utils/nfe/invoiceLineSnapshot.ts
var decodeXml = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
var childText = (xml, tag2) => {
  const found = xml.match(new RegExp(`<${tag2}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag2}>`, "i"));
  return found ? decodeXml(found[1].replace(/<[^>]+>/g, "").trim()) : "";
};
var decimal = (value) => {
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
    const billedQuantity = decimal(childText(productXml, "qCom"));
    const unitValue = decimal(childText(productXml, "vUnCom"));
    const grossValue = decimal(childText(productXml, "vProd"));
    const discountValue = decimal(childText(productXml, "vDesc") || "0");
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
var getNfeAuthorizationEndpoint = (model, environment) => getNfeServiceEndpoint(model, environment, "NFeAutorizacao4");

// api/nfe/emitNormalSale.ts
var import_node_crypto7 = require("node:crypto");

// erp/src/pages/utils/nfe/nfeAccessKey.ts
function calculateMod11CheckDigit(base43) {
  return calculateAccessKeyDigit(base43);
}
function generateNfeAccessKey(params) {
  const cleanCnpj = normalizeFiscalIdentifier(params.cnpj);
  if (!isValidCnpj(cleanCnpj)) throw new Error("CNPJ do emitente inv\xE1lido.");
  const cleanUf = params.ufCode.replace(/\D/g, "").padStart(2, "0");
  const cleanAAMM = params.yearMonth.replace(/\D/g, "").padStart(4, "0");
  const cleanModel = params.model.replace(/\D/g, "").padStart(2, "0");
  const cleanSeries = String(params.series).replace(/\D/g, "").padStart(3, "0");
  const cleanNumber = String(params.number).replace(/\D/g, "").padStart(9, "0");
  const cleanTpEmis = (params.emissionType || "1").replace(/\D/g, "").slice(0, 1) || "1";
  const cNF = params.randomCode ? params.randomCode.replace(/\D/g, "").padStart(8, "0").slice(-8) : String(Math.floor(1e7 + Math.random() * 9e7));
  const base43 = `${cleanUf}${cleanAAMM}${cleanCnpj}${cleanModel}${cleanSeries}${cleanNumber}${cleanTpEmis}${cNF}`;
  const checkDigit = calculateMod11CheckDigit(base43);
  const accessKey = `${base43}${checkDigit}`;
  return { accessKey, randomCode: cNF, checkDigit };
}

// shared-utils/fiscalNumbering.ts
var MAX_FISCAL_NUMBER = 999999999;
var DEFAULT_NFE_NUMBER = 102;
var DEFAULT_NFCE_NUMBER = 600;
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
function resolveNfeSequenceSettings(settings, model, environment) {
  const series = validateContributorNfeSeries(
    environment === 2 ? settings.nfeHomologationSerie || "1" : settings.nfeSerie || "1"
  );
  if (environment === 2) {
    return {
      series,
      minimumNumber: Number(
        model === "65" ? settings.nfceHomologationNextNumber ?? DEFAULT_NFCE_NUMBER : settings.nfeHomologationNextNumber ?? DEFAULT_NFE_NUMBER
      )
    };
  }
  return {
    series,
    minimumNumber: Number(
      model === "65" ? settings.nfceNextNumber ?? DEFAULT_NFCE_NUMBER : settings.nfeNextNumber ?? DEFAULT_NFE_NUMBER
    )
  };
}
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
function assertFiscalSelectionIntegrity(snapshot, document) {
  const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
  if (!Object.keys(selections).length) return;
  if (Object.keys(selections).length !== document.items.length)
    throw new Error("Formul\xE1rio e documento possuem quantidades de itens diferentes.");
  for (const item of document.items) {
    const selected = selections[String(item.itemNumber)];
    const icms = item.taxes.find((tax) => tax.group === "ICMS");
    if (!selected || selected.ncm !== item.classification.ncm || selected.cfop !== item.classification.cfop || selected.origem !== item.classification.origin || selected.cest !== (item.classification.cest || "") || icms?.codeSystem !== "CSOSN" || selected.csosn !== icms.code)
      throw new Error(
        `Campos confirmados no formul\xE1rio divergem da determina\xE7\xE3o fiscal do item ${item.itemNumber}.`
      );
  }
}
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

// api/nfe/fiscalCore.ts
var import_node_crypto3 = require("node:crypto");

// api/nfe/csosnPolicy.ts
var HML_CSOSN_SETTINGS_ID = "nfe55_hml_csosn_defaults_v1";
function initialHmlCsosnConfiguration() {
  return {
    model: "55",
    environment: 2,
    issuerCrt: "1",
    csosn: "103",
    productionApproved: false,
    version: "hml-csosn-2026-09-30"
  };
}
function validateCsosn(value, issuerCrt) {
  if (typeof value !== "string" || !CSOSN_CODES.some((code) => code === value))
    throw new Error("CSOSN inv\xE1lido. Selecione uma op\xE7\xE3o fiscal v\xE1lida.");
  if (issuerCrt !== "1")
    throw new Error("Esta regra de CSOSN exige CRT 1 (Simples Nacional).");
  return value;
}
function parseHmlCsosnConfiguration(value) {
  const config = value;
  if (config?.model !== "55" || config.environment !== 2 || config.issuerCrt !== "1" || config.productionApproved !== false || typeof config.version !== "string" || !config.version)
    throw new Error("Configura\xE7\xE3o de CSOSN de homologa\xE7\xE3o indispon\xEDvel ou fora do escopo.");
  validateCsosn(config.csosn, config.issuerCrt);
  return config;
}
async function loadHmlCsosnConfiguration(db, requirePersisted = false) {
  const { data, error } = await db.from("settings").select("data").eq("id", HML_CSOSN_SETTINGS_ID).maybeSingle();
  if (error) throw new Error("N\xE3o foi poss\xEDvel ler o padr\xE3o CSOSN do servidor.");
  if (requirePersisted && !data?.data)
    throw new Error("Salve o padr\xE3o CSOSN de homologa\xE7\xE3o antes de emitir.");
  return data?.data ? parseHmlCsosnConfiguration(data.data) : initialHmlCsosnConfiguration();
}
function resolveItemCsosn(input) {
  parseHmlCsosnConfiguration(input.configuration);
  if (input.environment !== 2)
    throw new Error("O padr\xE3o CSOSN de homologa\xE7\xE3o n\xE3o est\xE1 aprovado para produ\xE7\xE3o.");
  if (input.specificRule && input.manual && input.specificRule !== input.manual)
    throw new Error("CSOSN selecionado conflita com a regra fiscal espec\xEDfica. Revise a opera\xE7\xE3o.");
  const choices = [
    ["specific_rule", input.specificRule],
    ["manual", input.manual],
    ["catalog", input.catalog],
    ["default", input.configuration.csosn]
  ];
  const [source, value] = choices.find(([, code]) => code !== void 0 && code !== "");
  return { csosn: validateCsosn(value, input.issuerCrt), source };
}
function parseItemCsosnOverrides(value) {
  if (value === void 0) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Escolhas de CSOSN inv\xE1lidas.");
  const entries = Object.entries(value);
  if (entries.length > 990 || entries.some(
    ([key, code]) => !/^[1-9]\d{0,2}$/.test(key) || Number(key) > 990 || typeof code !== "string" || !CSOSN_CODES.some((allowed) => allowed === code)
  ))
    throw new Error("Escolhas de CSOSN devem referenciar itens v\xE1lidos e c\xF3digos existentes.");
  return Object.fromEntries(entries);
}

// api/nfe/normal-sale/constants.ts
var NORMAL_SALE_RULESET_VERSION = "NORMAL_SALE_V1";
function isNormalSaleRuleSet(version) {
  return version === NORMAL_SALE_RULESET_VERSION || version === "HML_NORMAL_SALE_V2";
}

// shared-utils/recipientTaxId.ts
function normalizeRecipientTaxId(raw) {
  return raw.trim().toUpperCase().replace(/[.\-/\s]/g, "");
}
function calculateCpfCheckDigits(clean9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(clean9[i], 10) * (10 - i);
  }
  let rest = sum * 10 % 11;
  const dv1 = rest === 10 || rest === 11 ? 0 : rest;
  sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(clean9[i], 10) * (11 - i);
  }
  sum += dv1 * 2;
  rest = sum * 10 % 11;
  const dv2 = rest === 10 || rest === 11 ? 0 : rest;
  return { dv1, dv2 };
}
function calculateCnpjCheckDigits(clean12) {
  const getVal = (char) => char.charCodeAt(0) - 48;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += getVal(clean12[i]) * weights1[i];
  }
  const rest1 = sum1 % 11;
  const dv1 = rest1 < 2 ? 0 : 11 - rest1;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 12; i++) {
    sum2 += getVal(clean12[i]) * weights2[i];
  }
  sum2 += dv1 * weights2[12];
  const rest2 = sum2 % 11;
  const dv2 = rest2 < 2 ? 0 : 11 - rest2;
  return { dv1, dv2 };
}
function isValidCpf(raw) {
  const clean = raw.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  const { dv1, dv2 } = calculateCpfCheckDigits(clean.slice(0, 9));
  return Number.parseInt(clean[9], 10) === dv1 && Number.parseInt(clean[10], 10) === dv2;
}
function isValidCnpj2(raw) {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (clean.length !== 14) return false;
  if (/^\d{14}$/.test(clean) && /^(\d)\1{13}$/.test(clean)) return false;
  const { dv1, dv2 } = calculateCnpjCheckDigits(clean.slice(0, 12));
  return Number.parseInt(clean[12], 10) === dv1 && Number.parseInt(clean[13], 10) === dv2;
}
function isValidRecipientTaxId(raw) {
  const value = normalizeRecipientTaxId(raw);
  if (/^\d{11}$/.test(value)) return isValidCpf(value);
  if (/^[0-9A-Z]{12}\d{2}$/.test(value)) return isValidCnpj2(value);
  return false;
}
function recipientTaxIdKind(raw) {
  const length = normalizeRecipientTaxId(raw).length;
  return length === 11 ? "CPF" : length === 14 ? "CNPJ" : null;
}
function recipientTaxIdMatchesPersonType(raw, personType) {
  const kind = recipientTaxIdKind(raw);
  if (!kind || !["PF", "PJ"].includes(String(personType || ""))) return true;
  return personType === "PF" && kind === "CPF" || personType === "PJ" && kind === "CNPJ";
}

// shared-utils/fiscal-cfop-model/catalog.ts
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
var CFOP_SEMANTICS = {
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
  "1202": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "1201": { operationType: "customer_return", merchandiseOrigin: "own_production" },
  "1411": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "1949": { operationType: "other", merchandiseOrigin: "not_applicable" },
  "2202": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "2201": { operationType: "customer_return", merchandiseOrigin: "own_production" },
  "2411": { operationType: "customer_return", merchandiseOrigin: "third_party" },
  "2949": { operationType: "other", merchandiseOrigin: "not_applicable" }
};
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
function getCfopDefinition(code) {
  if (!code) return void 0;
  const normalized2 = String(code).replace(/\D/g, "");
  return CFOP_BY_CODE.get(normalized2);
}

// shared-utils/fiscal-cfop-model/scope.ts
var BRAZILIAN_UFS = /* @__PURE__ */ new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]);
var isBrazilianFiscalUf = (uf) => typeof uf === "string" && BRAZILIAN_UFS.has(uf);
function addressUf(value) {
  let address2 = value;
  if (typeof address2 === "string") {
    try {
      address2 = JSON.parse(address2);
    } catch {
      return null;
    }
  }
  if (!address2 || typeof address2 !== "object") return null;
  const record3 = address2;
  const rawUf = record3.state || record3.uf;
  if (typeof rawUf !== "string") return null;
  const uf = rawUf.trim().toUpperCase();
  return BRAZILIAN_UFS.has(uf) || uf === "EX" ? uf : null;
}
function resolveFiscalCfopOrderScope(input) {
  const issuerUf = typeof input.issuerUf === "string" ? input.issuerUf.trim().toUpperCase() : "";
  if (!BRAZILIAN_UFS.has(issuerUf)) {
    return {
      scope: null,
      destination: null,
      issuerUf: null,
      operationUf: null,
      locationSource: "unknown",
      reason: "UF do estabelecimento emitente ausente ou inv\xE1lida."
    };
  }
  const shipping = input.shipping || {};
  const deliveryMethod = input.deliveryMethod || String(shipping.deliveryMethod || "");
  let operationUf;
  let locationSource;
  if (deliveryMethod === "pickup") {
    operationUf = addressUf(shipping.pickupAddress) || issuerUf;
    locationSource = "issuer_pickup_location";
  } else if (deliveryMethod === "delivery") {
    const deliveryAddress = shipping.deliveryAddress;
    const usesCustomerAddress = shipping.useCustomerAddress !== false;
    const effectiveAddress = usesCustomerAddress ? input.customerAddress || deliveryAddress : deliveryAddress;
    operationUf = addressUf(effectiveAddress);
    locationSource = operationUf ? "delivery_address" : "unknown";
  } else {
    return {
      scope: null,
      destination: null,
      issuerUf,
      operationUf: null,
      locationSource: "unknown",
      reason: "Modalidade de entrega ou retirada ausente ou inv\xE1lida."
    };
  }
  if (!operationUf) {
    return {
      scope: null,
      destination: null,
      issuerUf,
      operationUf: null,
      locationSource,
      reason: "UF do local f\xEDsico de entrega n\xE3o informada."
    };
  }
  if (operationUf === "EX") {
    return { scope: "foreign", destination: "3", issuerUf, operationUf, locationSource };
  }
  const scope = operationUf === issuerUf ? "internal" : "interstate";
  return {
    scope,
    destination: scope === "internal" ? "1" : "2",
    issuerUf,
    operationUf,
    locationSource
  };
}

// shared-utils/fiscal-cfop-model/selection.ts
function validateItemCfopMatch(params) {
  const {
    cfop,
    destination,
    model,
    direction = "outbound",
    itemType = "product",
    operationType,
    merchandiseOrigin,
    isSt
  } = params;
  const def = getCfopDefinition(cfop);
  if (!def) {
    return { valid: false, reason: `CFOP ${cfop} n\xE3o existe no cat\xE1logo oficial do sistema.` };
  }
  if (!def.active) {
    return { valid: false, reason: `CFOP ${cfop} est\xE1 desativado para novas emiss\xF5es.` };
  }
  if (def.direction !== direction) {
    return {
      valid: false,
      reason: `CFOP ${cfop} \xE9 de ${def.direction === "inbound" ? "entrada" : "sa\xEDda"}, mas a opera\xE7\xE3o \xE9 de ${direction === "inbound" ? "entrada" : "sa\xEDda"}.`
    };
  }
  if (operationType && def.operationType !== operationType) {
    return {
      valid: false,
      reason: `CFOP ${cfop} \xE9 classificado como ${def.operationType}, incompat\xEDvel com a opera\xE7\xE3o ${operationType}.`
    };
  }
  if (merchandiseOrigin && def.merchandiseOrigin !== merchandiseOrigin) {
    return {
      valid: false,
      reason: `CFOP ${cfop} classifica mercadoria ${def.merchandiseOrigin}, incompat\xEDvel com ${merchandiseOrigin}.`
    };
  }
  const stApplicability = def.stApplicability || (def.isSt ? "required" : def.itemType === "product" ? "not_required" : "not_applicable");
  if (isSt === true && stApplicability === "not_required") {
    return { valid: false, reason: `CFOP ${cfop} n\xE3o se aplica a item sujeito a ST.` };
  }
  if (isSt === false && stApplicability === "required") {
    return { valid: false, reason: `CFOP ${cfop} exige item sujeito a ST.` };
  }
  if (itemType === "product" && def.itemType === "service") {
    return {
      valid: false,
      reason: `CFOP ${cfop} pertence a presta\xE7\xE3o de servi\xE7o (ISSQN) e n\xE3o pode ser utilizado para venda de mercadoria.`
    };
  }
  if (itemType === "service" && def.itemType === "product") {
    return {
      valid: false,
      reason: `CFOP ${cfop} \xE9 de venda de mercadoria e n\xE3o pode ser utilizado para presta\xE7\xE3o de servi\xE7o.`
    };
  }
  if (model === "65") {
    if (destination !== "1") {
      return { valid: false, reason: "NFC-e (modelo 65) n\xE3o permite opera\xE7\xE3o interestadual." };
    }
    if (!cfop.startsWith("5")) {
      return { valid: false, reason: `CFOP ${cfop} inv\xE1lido para NFC-e (modelo 65 exige CFOP 5xxx interno).` };
    }
  }
  if (!def.allowedModels.includes(model)) {
    return { valid: false, reason: `CFOP ${cfop} n\xE3o \xE9 aceito para NF-e/NFC-e modelo ${model}.` };
  }
  const expectedScope = destination === "1" ? "internal" : destination === "2" ? "interstate" : "foreign";
  if (def.scope !== expectedScope) {
    const scopeLabel = expectedScope === "internal" ? "interna (idDest=1)" : expectedScope === "interstate" ? "interestadual (idDest=2)" : "com exterior (idDest=3)";
    return {
      valid: false,
      reason: `CFOP ${cfop} \xE9 incompat\xEDvel com opera\xE7\xE3o ${scopeLabel}.`
    };
  }
  return { valid: true };
}

// shared-utils/fiscalDocumentModel.ts
var HOMOLOGATION_FIRST_ITEM_DESCRIPTION = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
var HOMOLOGATION_NFE_RECIPIENT_NAME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
function shouldUseHomologationFirstItemDescription(input) {
  return input.environment === 2 && (input.model === "65" || input.model === "55" && input.printType === "6");
}
function getHomologationRecipientName(input) {
  return input.environment === 2 ? HOMOLOGATION_NFE_RECIPIENT_NAME : input.recipientName;
}
var FISCAL_MODEL_POLICY_VERSION = "PR_RETAIL_2026_10";
var fiscalModelReasonLabels = {
  RETAIL_FINAL_CONSUMER_IN_STATE: "Venda varejista para consumidor final dentro do Paran\xE1.",
  INTERSTATE_OPERATION: "Opera\xE7\xE3o interestadual.",
  RESALE: "Mercadoria destinada \xE0 revenda ou a adquirente que n\xE3o \xE9 consumidor final.",
  TAX_CREDIT_REQUIRED: "Opera\xE7\xE3o que exige documento apto a cr\xE9dito fiscal.",
  RETURN: "Devolu\xE7\xE3o de mercadoria.",
  TRANSFER: "Transfer\xEAncia de mercadoria.",
  SHIPMENT: "Remessa de mercadoria.",
  GOODS_RETURN: "Retorno de mercadoria.",
  EXPORT: "Exporta\xE7\xE3o.",
  IMPORT: "Importa\xE7\xE3o.",
  PUBLIC_ADMINISTRATION: "Exig\xEAncia fiscal da opera\xE7\xE3o com Administra\xE7\xE3o P\xFAblica.",
  OTHER_FISCAL_REQUIREMENT: "Caracter\xEDsticas fiscais da opera\xE7\xE3o exigem NF-e.",
  VALUE_LIMIT: "Valor igual ou superior ao limite de R$ 200.000 para NFC-e."
};
var retailCfops = /* @__PURE__ */ new Set(["5101", "5102", "5103", "5104", "5115", "5405", "5656", "5667", "5933"]);
var specialOperations = {
  return: "RETURN",
  transfer: "TRANSFER",
  shipment: "SHIPMENT",
  goods_return: "GOODS_RETURN",
  export: "EXPORT",
  import: "IMPORT",
  assistance: "SHIPMENT"
};
function resolveFiscalDocumentModel(facts) {
  const reasons = [];
  const add = (reason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };
  const special = specialOperations[facts.operationType || ""];
  if (special) add(special);
  if (facts.purpose === "4") add("RETURN");
  if (facts.purpose && facts.purpose !== "1" && facts.purpose !== "4") add("OTHER_FISCAL_REQUIREMENT");
  if (facts.recipientUf === "EX") add("EXPORT");
  if (facts.issuerUf && facts.recipientUf && facts.issuerUf !== facts.recipientUf && facts.recipientUf !== "EX") add("INTERSTATE_OPERATION");
  if (facts.finalConsumer === false) add("RESALE");
  if (facts.requiresTaxCredit) add("TAX_CREDIT_REQUIRED");
  if (facts.publicAdministrationRequirement) add("PUBLIC_ADMINISTRATION");
  if (facts.otherFiscalRequirement) add("OTHER_FISCAL_REQUIREMENT");
  if (facts.total !== void 0 && facts.total >= 2e5) add("VALUE_LIMIT");
  for (const rawCfop of facts.cfops || []) {
    const cfop = rawCfop.replace(/\D/g, "");
    if (/^[67]/.test(cfop)) add(cfop.startsWith("7") ? "EXPORT" : "INTERSTATE_OPERATION");
    else if (cfop && !retailCfops.has(cfop)) add("OTHER_FISCAL_REQUIREMENT");
  }
  if (!special && !["sale", "showroom"].includes(facts.operationType || "sale")) add("OTHER_FISCAL_REQUIREMENT");
  const blocked = (reason) => ({ status: "blocked", reason, policyVersion: FISCAL_MODEL_POLICY_VERSION });
  if (typeof facts.finalConsumer !== "boolean") return blocked("Informe se o adquirente \xE9 consumidor final.");
  if (reasons.length) return {
    status: "ready",
    model: "55",
    reasonCode: reasons[0],
    reasons,
    reason: reasons.map((r) => fiscalModelReasonLabels[r]).join(" "),
    policyVersion: FISCAL_MODEL_POLICY_VERSION,
    finalConsumer: facts.finalConsumer === true
  };
  if (facts.issuerUf !== "PR") return blocked("A pol\xEDtica de NFC-e est\xE1 definida somente para emitente do Paran\xE1.");
  if (!facts.recipientUf) return blocked("Informe a UF do destinat\xE1rio ou do local da opera\xE7\xE3o.");
  if (facts.recipientUf !== "PR") return blocked("Confirme a UF da opera\xE7\xE3o fiscal.");
  return {
    status: "ready",
    model: "65",
    reasonCode: "RETAIL_FINAL_CONSUMER_IN_STATE",
    reasons: ["RETAIL_FINAL_CONSUMER_IN_STATE"],
    reason: fiscalModelReasonLabels.RETAIL_FINAL_CONSUMER_IN_STATE,
    policyVersion: FISCAL_MODEL_POLICY_VERSION,
    finalConsumer: true
  };
}
function isSameFiscalModelDecision(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const da = a;
  const db = b;
  if (da.status !== db.status || da.policyVersion !== db.policyVersion) return false;
  if (da.status === "blocked") return da.reason === db.reason;
  return da.model === db.model && da.reasonCode === db.reasonCode && da.reason === db.reason && da.finalConsumer === db.finalConsumer && Array.isArray(da.reasons) && Array.isArray(db.reasons) && da.reasons.length === db.reasons.length && da.reasons.every((val, idx) => val === db.reasons[idx]);
}
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var object = (value) => isRecord(value) ? value : {};
function getFiscalRecipientAddress(order) {
  const data = object(order);
  const shipping = object(data.shipping);
  const customer = object(data.customerData);
  const customerAddress = customer.fullAddress || customer.address;
  const raw = shipping.deliveryMethod === "delivery" ? shipping.useCustomerAddress === false ? shipping.deliveryAddress : customerAddress || shipping.deliveryAddress : customerAddress;
  if (typeof raw === "string") {
    try {
      return object(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return object(raw);
}
function resolveOrderFiscalModel(order, options = {}) {
  const data = object(order);
  const context = object(data.fiscalContext);
  const shipping = object(data.shipping);
  const address2 = options.recipientAddress ? object(options.recipientAddress) : getFiscalRecipientAddress(data);
  const issuerUf = String(options.issuerUf || "").trim().toUpperCase();
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf,
    deliveryMethod: String(shipping.deliveryMethod || ""),
    shipping,
    customerAddress: address2
  });
  const recipientUf = operationScope.operationUf || "";
  return resolveFiscalDocumentModel({
    issuerUf,
    recipientUf,
    finalConsumer: options.finalConsumer ?? (typeof context.finalConsumer === "boolean" ? context.finalConsumer : void 0),
    operationType: String(context.operationType || data.orderType || "sale"),
    purpose: context.purpose,
    total: object(data.paymentsSummary).totalOrderValue,
    requiresTaxCredit: context.requiresTaxCredit === true,
    publicAdministrationRequirement: context.publicAdministrationRequirement === true,
    otherFiscalRequirement: context.otherFiscalRequirement === true || context.recipientIeIndicator === "1"
  });
}
function fiscalPresence(model, deliveryMethod, presence) {
  if (model === "65") {
    if (deliveryMethod === "delivery") return "4";
    if (deliveryMethod === "pickup" && presence === "4") return "1";
    return presence || "1";
  }
  if (deliveryMethod === "delivery" && !["2", "3", "9"].includes(presence || "")) return "9";
  if (deliveryMethod === "pickup" && presence === "4") return "1";
  return presence || (deliveryMethod === "delivery" ? "9" : "1");
}
var NFCE_RECIPIENT_IDENTIFICATION_LIMIT = 1e4;
function decideFiscalRecipientRequirements(facts) {
  const knownPersonType = facts.personType === "PF" || facts.personType === "PJ" ? facts.personType : void 0;
  const documentType = knownPersonType === "PF" ? "CPF" : knownPersonType === "PJ" ? "CNPJ" : recipientTaxIdKind(facts.recipientTaxId || "") || "CPF/CNPJ";
  const unsupported = (reason = "Esta opera\xE7\xE3o precisa de uma matriz fiscal espec\xEDfica aprovada.") => ({
    supported: false,
    documentRequired: false,
    addressRequired: false,
    documentType,
    reasonCodes: ["SPECIAL_FISCAL_OPERATION"],
    message: reason
  });
  if (facts.operationScope !== "NORMAL_DOMESTIC_SALE") return unsupported();
  if (!Number.isFinite(facts.total) || facts.total < 0)
    return unsupported("Total fiscal inv\xE1lido; confirme o valor da opera\xE7\xE3o antes da emiss\xE3o.");
  if (facts.model === "55") {
    return {
      supported: true,
      documentRequired: true,
      addressRequired: true,
      documentType,
      reasonCodes: ["NFE_MODEL_55_DOMESTIC_NORMAL_SALE"],
      message: `A NF-e modelo 55 desta venda dom\xE9stica exige ${documentType} do destinat\xE1rio.`
    };
  }
  if (!["1", "2", "3", "4", "5", "9"].includes(facts.presence))
    return unsupported("Indicador de presen\xE7a ausente ou inv\xE1lido para a NFC-e.");
  const nonPresent = ["2", "3", "4", "9"].includes(facts.presence);
  const amountLimit = facts.total >= NFCE_RECIPIENT_IDENTIFICATION_LIMIT;
  const reasonCodes = [];
  if (amountLimit) reasonCodes.push("NFCE_AMOUNT_LIMIT");
  if (nonPresent) reasonCodes.push("NFCE_NON_PRESENT_OPERATION");
  if (facts.presence === "4") reasonCodes.push("NFCE_HOME_DELIVERY");
  const documentRequired = amountLimit || nonPresent;
  const message = !documentRequired ? null : facts.presence === "4" ? `Como este pedido ser\xE1 entregue no endere\xE7o do cliente, o ${documentType} do destinat\xE1rio \xE9 obrigat\xF3rio para a NFC-e.` : nonPresent ? `Esta opera\xE7\xE3o NFC-e n\xE3o presencial exige o ${documentType} do destinat\xE1rio e o respectivo endere\xE7o.` : `Esta NFC-e tem valor igual ou superior a R$ ${NFCE_RECIPIENT_IDENTIFICATION_LIMIT.toLocaleString("pt-BR")}; informe o ${documentType} do destinat\xE1rio.`;
  return {
    supported: true,
    documentRequired,
    addressRequired: nonPresent,
    documentType,
    reasonCodes,
    message
  };
}

// api/nfe/fiscalCore.ts
var amountFields = [
  "icmsBase",
  "products",
  "discount",
  "freight",
  "insurance",
  "otherExpenses",
  "icms",
  "icmsExempt",
  "fcp",
  "icmsStBase",
  "icmsSt",
  "fcpSt",
  "fcpStRetained",
  "ii",
  "ipi",
  "ipiReturned",
  "pis",
  "cofins",
  "invoice",
  "payment",
  "change"
];
function cents(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    throw new Error(`${field} deve ser valor monet\xE1rio expl\xEDcito, n\xE3o negativo e em centavos.`);
  }
  return Math.round(value * 100);
}
function required(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} n\xE3o informado.`);
  return value.trim();
}
function equalAmount(actual, expected, field) {
  if (actual !== expected) throw new Error(`${field} n\xE3o reconcilia com os itens ou pagamentos.`);
}
function fiscalSnapshotHash(snapshot) {
  if (snapshot.persistedHash) {
    if (!/^[0-9a-f]{64}$/.test(snapshot.persistedHash))
      throw new Error("Hash fiscal persistido inv\xE1lido.");
    return snapshot.persistedHash;
  }
  return (0, import_node_crypto3.createHash)("sha256").update(JSON.stringify(snapshot)).digest("hex");
}
function validateFiscalDocument(snapshot, document, ruleSet) {
  if (document.snapshotHash !== fiscalSnapshotHash(snapshot) || document.ruleSetVersion !== ruleSet.version || document.environment !== snapshot.emissionRequest.environment || normalizeRecipientTaxId(document.issuer.cnpj) !== normalizeRecipientTaxId(ruleSet.issuerCnpj) || normalizeRecipientTaxId(document.issuer.cnpj) !== normalizeRecipientTaxId(String(snapshot.issuerProfile.companyCnpj || ""))) {
    throw new Error(
      "Documento fiscal n\xE3o corresponde ao snapshot, ambiente, emitente ou regra aprovada."
    );
  }
  if (!["55", "65"].includes(document.model) || !document.items.length || !document.payments.length)
    throw new Error("Modelo, itens ou pagamentos fiscais ausentes.");
  if (isNormalSaleRuleSet(ruleSet.version)) {
    const customer = snapshot.fiscalInputs?.customer;
    const customerPersonType = customer?.personType === "PF" || customer?.personType === "PJ" ? customer.personType : void 0;
    const snapshotRecipientTaxId = normalizeRecipientTaxId(
      String(snapshot.emissionRequest.recipientTaxId ?? customer?.cpfCnpj ?? "")
    );
    const documentRecipientTaxId = normalizeRecipientTaxId(document.recipient.cpfCnpj);
    if (snapshotRecipientTaxId !== documentRecipientTaxId || documentRecipientTaxId && (!isValidRecipientTaxId(documentRecipientTaxId) || !recipientTaxIdMatchesPersonType(documentRecipientTaxId, customerPersonType)))
      throw new Error(
        "Identifica\xE7\xE3o do destinat\xE1rio diverge do snapshot fiscal ou do cadastro PF/PJ."
      );
    const decision = resolveOrderFiscalModel(
      {
        ...snapshot.order.data,
        orderType: snapshot.order.type,
        paymentsSummary: { totalOrderValue: document.totals.invoice },
        items: document.items.map((item) => ({ fiscal: { cfop: item.classification.cfop } }))
      },
      {
        issuerUf: String(snapshot.issuerProfile.companyUF || ""),
        finalConsumer: snapshot.emissionRequest.finalConsumer,
        recipientAddress: getFiscalRecipientAddress({
          ...snapshot.order.data,
          customerData: { fullAddress: customer?.address }
        })
      }
    );
    if (decision.status !== "ready" || decision.model !== document.model || decision.finalConsumer !== (document.operation.finalConsumer === "1") || !isSameFiscalModelDecision(decision, document.modelDecision))
      throw new Error("Modelo fiscal diverge dos fatos e da pol\xEDtica de varejo.");
    const recipientRequirements = decideFiscalRecipientRequirements({
      model: document.model,
      presence: document.operation.presence,
      total: document.totals.invoice,
      personType: customerPersonType,
      recipientTaxId: documentRecipientTaxId,
      operationScope: "NORMAL_DOMESTIC_SALE"
    });
    if (!recipientRequirements.supported || recipientRequirements.documentRequired && !documentRecipientTaxId)
      throw new Error(
        recipientRequirements.message || "Documento do destinat\xE1rio n\xE3o atende \xE0 matriz fiscal."
      );
  }
  required(document.issuer.name, "Raz\xE3o social");
  required(document.issuer.ie, "IE do emitente");
  required(document.issuer.crt, "CRT do emitente");
  required(document.recipient.name, "Destinat\xE1rio");
  required(document.operation.natureOfOperation, "Natureza da opera\xE7\xE3o");
  const traceIds = new Set(document.decisions.map((trace2) => trace2.decisionId));
  if (!document.decisions.length || traceIds.size !== document.decisions.length || document.decisions.some(
    (trace2) => trace2.ruleSetVersion !== ruleSet.version || trace2.approver !== ruleSet.approvedBy || !trace2.reason || !trace2.effectiveAt
  )) {
    throw new Error("Trilha fiscal incompleta ou sem v\xEDnculo com a regra aprovada.");
  }
  const totals = document.totals;
  assertFiscalSelectionIntegrity(snapshot, document);
  for (const field of amountFields) cents(totals[field], `Total ${field}`);
  const sums = {
    icmsBase: 0,
    products: 0,
    discount: 0,
    freight: 0,
    insurance: 0,
    otherExpenses: 0,
    icms: 0,
    ipi: 0,
    pis: 0,
    cofins: 0
  };
  for (const [index, item] of document.items.entries()) {
    if (item.itemNumber !== index + 1 || !item.decisions.length || item.decisions.some((trace2) => !traceIds.has(trace2.decisionId)))
      throw new Error(`Item fiscal ${index + 1} sem ordem ou decis\xE3o rastre\xE1vel.`);
    required(item.product.code, `C\xF3digo do item ${index + 1}`);
    required(item.product.description, `Descri\xE7\xE3o do item ${index + 1}`);
    required(item.classification.cfop, `CFOP do item ${index + 1}`);
    required(item.classification.ncm, `NCM do item ${index + 1}`);
    required(item.classification.origin, `Origem do item ${index + 1}`);
    required(item.classification.unit, `Unidade do item ${index + 1}`);
    if (!Number.isFinite(item.product.quantity) || item.product.quantity <= 0 || !Number.isFinite(item.product.unitValue) || item.product.unitValue <= 0)
      throw new Error(`Quantidade ou pre\xE7o inv\xE1lido no item ${index + 1}.`);
    const gross = cents(item.product.gross, `Bruto do item ${index + 1}`);
    if (Math.abs(gross - Math.round(item.product.quantity * item.product.unitValue * 100)) > 1)
      throw new Error(`Bruto do item ${index + 1} diverge de quantidade \xD7 pre\xE7o.`);
    for (const field of ["gross", "discount", "freight", "insurance", "otherExpenses"]) {
      sums[field === "gross" ? "products" : field] += cents(
        item.product[field],
        `${field} do item ${index + 1}`
      );
    }
    if (cents(item.product.discount, "Desconto") > gross)
      throw new Error(`Desconto do item ${index + 1} excede seu valor bruto.`);
    for (const group of ["ICMS", "PIS", "COFINS"]) {
      const matches = item.taxes.filter((tax) => tax.group === group);
      if (matches.length !== 1 || !traceIds.has(matches[0].decisionId))
        throw new Error(`Item ${index + 1} exige exatamente um grupo ${group} decidido.`);
      if (group === "ICMS" && matches[0].codeSystem === "CSOSN")
        validateCsosn(matches[0].code, document.issuer.crt);
      if (group === "ICMS" && matches[0].codeSystem === "CST" && document.issuer.crt === "1")
        throw new Error(
          "Emitente CRT 1 exige CSOSN; CST de regime normal n\xE3o pode substituir a escolha."
        );
      const valueKey = group === "ICMS" ? "vICMS" : group === "PIS" ? "vPIS" : "vCOFINS";
      sums[group.toLowerCase()] += cents(
        matches[0].values[valueKey],
        `${group} do item ${index + 1}`
      );
      if (group === "ICMS" && matches[0].codeSystem === "CST" && matches[0].code === "00")
        sums.icmsBase += cents(matches[0].values.vBC, `Base ICMS do item ${index + 1}`);
    }
    const ipi = item.taxes.filter((tax) => tax.group === "IPI");
    if (ipi.length > 1 || ipi.length === 1 && !traceIds.has(ipi[0].decisionId))
      throw new Error(`IPI do item ${index + 1} amb\xEDguo.`);
    if (ipi.length) sums.ipi += cents(ipi[0].values.vIPI, `IPI do item ${index + 1}`);
    if (item.taxes.some((tax) => !["ICMS", "PIS", "COFINS", "IPI"].includes(tax.group)))
      throw new Error(`Grupo fiscal ainda sem serializa\xE7\xE3o suportada no item ${index + 1}.`);
  }
  for (const field of Object.keys(sums))
    equalAmount(cents(totals[field], `Total ${field}`), sums[field], `Total ${field}`);
  const invoice = sums.products - sums.discount + sums.freight + sums.insurance + sums.otherExpenses + sums.ipi;
  equalAmount(cents(totals.invoice, "Valor da nota"), invoice, "Valor da nota");
  const payments = document.payments.reduce((sum, payment) => {
    required(payment.methodCode, "Meio de pagamento");
    if (!traceIds.has(payment.decision.decisionId))
      throw new Error("Pagamento sem decis\xE3o fiscal rastre\xE1vel.");
    return sum + cents(payment.amount, "Valor do pagamento");
  }, 0);
  equalAmount(cents(totals.payment, "Total pago"), payments, "Total pago");
  equalAmount(payments, invoice + cents(totals.change, "Troco"), "Pagamentos e troco");
  for (const field of [
    "icmsExempt",
    "fcp",
    "icmsStBase",
    "icmsSt",
    "fcpSt",
    "fcpStRetained",
    "ii",
    "ipiReturned"
  ]) {
    if (totals[field] !== 0)
      throw new Error(`${field} exige suporte fiscal espec\xEDfico antes da emiss\xE3o.`);
  }
}
function determineWithApprovedRules(snapshot, ruleSet) {
  if (!ruleSet)
    return {
      status: "blocked",
      blockers: [
        {
          code: "APPROVED_FISCAL_RULESET_REQUIRED",
          scope: "document",
          message: "A matriz de determina\xE7\xE3o fiscal aprovada ainda n\xE3o est\xE1 configurada. Nenhum modelo, CFOP ou tributo ser\xE1 presumido."
        }
      ]
    };
  if (ruleSet.technicalHomologationOnly && snapshot.emissionRequest.environment !== 2)
    return {
      status: "blocked",
      blockers: [
        {
          code: "PRODUCTION_FISCAL_RULESET_REQUIRED",
          scope: "document",
          message: "A regra t\xE9cnica de homologa\xE7\xE3o nunca pode emitir em produ\xE7\xE3o."
        }
      ]
    };
  const issued = Date.parse(snapshot.capturedAt);
  if (!ruleSet.version || !ruleSet.approvedBy || !/^[A-Z0-9]{12}[0-9]{2}$/.test(normalizeRecipientTaxId(ruleSet.issuerCnpj)) || !Number.isFinite(Date.parse(ruleSet.approvedAt)) || !Number.isFinite(Date.parse(ruleSet.effectiveFrom)) || ruleSet.effectiveUntil !== void 0 && !Number.isFinite(Date.parse(ruleSet.effectiveUntil)) || !Number.isFinite(issued) || Date.parse(ruleSet.approvedAt) > issued || issued < Date.parse(ruleSet.effectiveFrom) || ruleSet.effectiveUntil && issued >= Date.parse(ruleSet.effectiveUntil))
    return {
      status: "blocked",
      blockers: [
        {
          code: "FISCAL_RULESET_NOT_APPLICABLE",
          scope: "document",
          message: "A matriz fiscal n\xE3o est\xE1 aprovada ou vigente para esta emiss\xE3o."
        }
      ]
    };
  try {
    const document = ruleSet.determine(snapshot, fiscalSnapshotHash(snapshot));
    validateFiscalDocument(snapshot, document, ruleSet);
    return { status: "ready", document };
  } catch (error) {
    return {
      status: "blocked",
      blockers: [
        {
          code: "FISCAL_DOCUMENT_INCOMPLETE",
          scope: "document",
          message: error instanceof Error ? error.message : "Determina\xE7\xE3o fiscal incompleta."
        }
      ]
    };
  }
}

// api/nfe/fiscalSnapshot.ts
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var SHA256_PATTERN = /^[0-9a-f]{64}$/;
var CLIENT_AUTHORITY_FIELDS = [
  "xml",
  "model",
  "series",
  "nfeNumber",
  "accessKey",
  "fiscalSnapshotId",
  "fiscalSnapshotHash"
];
var ALLOWED_COMMAND_FIELDS = /* @__PURE__ */ new Set([
  "orderId",
  "environment",
  "emissionRequestId",
  "supersedesDocumentId",
  "productionConfirmed",
  "requestedNumber",
  "itemCsosnOverrides",
  "itemFiscalSelections",
  "recipientTaxId",
  "recipientIe",
  "recipientIeIndicator",
  "finalConsumer",
  "deliveryByIssuer",
  "cardNotIntegrated",
  "transporter",
  "freightMode",
  "hasTransport",
  "transportResponsible",
  "freightContractResponsible",
  "previewOnly",
  "previewProof"
]);
var PROOF_ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "fingerprint",
  "capturedAt",
  "issuedAt",
  "model",
  "series",
  "number",
  "accessKey"
]);
function parsePreviewProofPayload(raw, previewOnly) {
  if (raw === void 0) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "V\xEDnculo da pr\xE9via fiscal inv\xE1lido." };
  }
  const proof = raw;
  if (Object.keys(proof).some((key) => !PROOF_ALLOWED_KEYS.has(key)) || typeof proof.fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(proof.fingerprint) || typeof proof.capturedAt !== "string" || !Number.isFinite(Date.parse(proof.capturedAt)) || typeof proof.issuedAt !== "string" || !Number.isFinite(Date.parse(proof.issuedAt)) || proof.model !== "55" && proof.model !== "65" || typeof proof.series !== "string" || !/^\d{1,3}$/.test(proof.series) || typeof proof.number !== "number" || !Number.isInteger(proof.number) || proof.number < 1 || proof.number > 999999999 || typeof proof.accessKey !== "string" || !ACCESS_KEY_PATTERN.test(proof.accessKey)) {
    return { error: "V\xEDnculo da pr\xE9via fiscal incompleto ou inv\xE1lido." };
  }
  if (previewOnly === true) {
    return { error: "Uma pr\xE9via nova n\xE3o pode reutilizar a prova de outra pr\xE9via." };
  }
  return {
    proof: {
      fingerprint: proof.fingerprint,
      capturedAt: proof.capturedAt,
      issuedAt: proof.issuedAt,
      model: proof.model,
      series: proof.series,
      number: proof.number,
      accessKey: proof.accessKey
    }
  };
}
function parseTransporterPayload(raw) {
  if (raw === void 0) return {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "Dados do transportador inv\xE1lidos." };
  }
  const t = raw;
  const name = typeof t.name === "string" ? t.name.trim() : "";
  const isCnpj = typeof t.cnpj === "string";
  const doc = normalizeRecipientTaxId(
    isCnpj ? String(t.cnpj) : typeof t.cpf === "string" ? t.cpf : ""
  );
  if (!name) return { error: "Raz\xE3o social ou nome do transportador \xE9 obrigat\xF3rio." };
  if (!isValidRecipientTaxId(doc) || (isCnpj ? doc.length !== 14 : doc.length !== 11)) {
    return { error: "CPF ou CNPJ v\xE1lido do transportador \xE9 obrigat\xF3rio." };
  }
  return {
    transporter: {
      name,
      ...isCnpj ? { cnpj: doc } : { cpf: doc },
      ...typeof t.ie === "string" && t.ie.trim() ? { ie: t.ie.trim().replace(/\D/g, "") } : {},
      ...typeof t.address === "string" && t.address.trim() ? { address: t.address.trim() } : {},
      ...typeof t.city === "string" && t.city.trim() ? { city: t.city.trim() } : {},
      ...typeof t.uf === "string" && t.uf.trim() ? { uf: t.uf.trim().toUpperCase() } : {}
    }
  };
}
function parseItemSelectionsAndOverrides(body) {
  let itemCsosnOverrides;
  try {
    itemCsosnOverrides = parseItemCsosnOverrides(body.itemCsosnOverrides);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Escolhas de CSOSN inv\xE1lidas." };
  }
  let itemFiscalSelections;
  try {
    itemFiscalSelections = parseFiscalItemSelections(body.itemFiscalSelections);
    for (const [key, code] of Object.entries(itemCsosnOverrides)) {
      if (itemFiscalSelections[key] && itemFiscalSelections[key].csosn !== code) {
        throw new Error(`Escolhas conflitantes de CSOSN no item ${key}.`);
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sele\xE7\xF5es fiscais inv\xE1lidas." };
  }
  return { itemCsosnOverrides, itemFiscalSelections };
}
function validateTransportRules(body) {
  if (body.hasTransport !== void 0 && typeof body.hasTransport !== "boolean") {
    return { error: "O indicador de transporte deve ser Sim ou N\xE3o." };
  }
  if (body.transportResponsible !== void 0 && !["OWN_COMPANY", "CUSTOMER", "THIRD_PARTY"].includes(String(body.transportResponsible))) {
    return { error: "Respons\xE1vel pelo transporte inv\xE1lido." };
  }
  if (body.freightContractResponsible !== void 0 && !["SENDER", "RECIPIENT", "THIRD_PARTY"].includes(String(body.freightContractResponsible))) {
    return { error: "Respons\xE1vel pela contrata\xE7\xE3o do frete inv\xE1lido." };
  }
  if (body.hasTransport === false) {
    if (body.transportResponsible && body.transportResponsible !== "NONE") {
      return { error: "Transporte desligado n\xE3o admite respons\xE1vel por transporte." };
    }
    if (body.freightMode && body.freightMode !== "9") {
      return { error: "Transporte desligado exige modalidade 9 (sem frete)." };
    }
    if (body.transporter) {
      return { error: "Transporte desligado n\xE3o admite dados de transportador." };
    }
  }
  let freightMode;
  if (body.freightMode !== void 0) {
    if (typeof body.freightMode !== "string" || !/^[012349]$/.test(body.freightMode)) {
      return { error: "Modalidade do frete inv\xE1lida." };
    }
    freightMode = body.freightMode;
  }
  return { freightMode };
}
function parseFiscalEmissionCommand(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { error: "Dados da solicita\xE7\xE3o fiscal inv\xE1lidos." };
  const body = value;
  if (CLIENT_AUTHORITY_FIELDS.some((field) => field in body))
    return { error: "Modelo, s\xE9rie, n\xFAmero, chave e XML devem ser determinados no servidor." };
  if (Object.keys(body).some((field) => !ALLOWED_COMMAND_FIELDS.has(field)))
    return { error: "A solicita\xE7\xE3o cont\xE9m campos que n\xE3o pertencem ao comando de emiss\xE3o." };
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const environment = Number(body.environment);
  const emissionRequestId = typeof body.emissionRequestId === "string" ? body.emissionRequestId : "";
  const supersedesDocumentId = typeof body.supersedesDocumentId === "string" ? body.supersedesDocumentId : void 0;
  if (!orderId || ![1, 2].includes(environment) || environment === 1 && orderId.startsWith("TEST_AUT_") || !UUID_PATTERN.test(emissionRequestId) || supersedesDocumentId !== void 0 && !UUID_PATTERN.test(supersedesDocumentId) || supersedesDocumentId !== void 0 && environment !== 2 || body.productionConfirmed !== void 0 && typeof body.productionConfirmed !== "boolean")
    return { error: "Pedido, ambiente ou chave de idempot\xEAncia inv\xE1lidos." };
  if (body.previewOnly !== void 0 && typeof body.previewOnly !== "boolean")
    return { error: "Indicador de pr\xE9via fiscal inv\xE1lido." };
  const proofResult = parsePreviewProofPayload(body.previewProof, body.previewOnly === true);
  if ("error" in proofResult) return { error: proofResult.error };
  const previewProof = proofResult.proof;
  if (body.requestedNumber !== void 0 && (typeof body.requestedNumber !== "number" || !Number.isInteger(body.requestedNumber) || body.requestedNumber < 1 || body.requestedNumber > 999999999))
    return { error: "Informe um n\xFAmero de nota fiscal inteiro entre 1 e 999999999." };
  const itemsResult = parseItemSelectionsAndOverrides(body);
  if ("error" in itemsResult) return { error: itemsResult.error };
  const { itemCsosnOverrides, itemFiscalSelections } = itemsResult;
  const recipientTaxId = body.recipientTaxId;
  if (body.cardNotIntegrated !== void 0 && typeof body.cardNotIntegrated !== "boolean")
    return { error: "Confirme a integra\xE7\xE3o do cart\xE3o." };
  if (body.deliveryByIssuer !== void 0 && typeof body.deliveryByIssuer !== "boolean")
    return { error: "Entrega pr\xF3pria deve ser Sim ou N\xE3o." };
  const transportRules = validateTransportRules(body);
  if (transportRules.error) return { error: transportRules.error };
  if (body.finalConsumer !== void 0 && typeof body.finalConsumer !== "boolean")
    return { error: "Consumidor final deve ser Sim ou N\xE3o." };
  if (recipientTaxId !== void 0 && (typeof recipientTaxId !== "string" || recipientTaxId !== "" && !isValidRecipientTaxId(recipientTaxId)))
    return { error: "Informe um CPF com 11 d\xEDgitos ou um CNPJ com 14 caracteres no formato permitido." };
  const recipientIeIndicator = body.recipientIeIndicator;
  if (recipientIeIndicator !== void 0 && !["1", "2", "9"].includes(String(recipientIeIndicator)))
    return { error: "Indicador da IE do destinat\xE1rio inv\xE1lido (deve ser 1, 2 ou 9)." };
  const recipientIe = body.recipientIe;
  if (recipientIe !== void 0 && typeof recipientIe !== "string")
    return { error: "Inscri\xE7\xE3o Estadual do destinat\xE1rio deve ser um texto v\xE1lido." };
  const transporterResult = parseTransporterPayload(body.transporter);
  if ("error" in transporterResult) return { error: transporterResult.error };
  const transporter = transporterResult.transporter;
  const freightMode = transportRules.freightMode;
  return {
    command: {
      orderId,
      environment,
      emissionRequestId,
      ...supersedesDocumentId ? { supersedesDocumentId } : {},
      ...body.requestedNumber === void 0 ? {} : { requestedNumber: body.requestedNumber },
      ...Object.keys(itemCsosnOverrides).length ? { itemCsosnOverrides } : {},
      ...Object.keys(itemFiscalSelections).length ? { itemFiscalSelections } : {},
      ...recipientTaxId === void 0 ? {} : { recipientTaxId },
      ...recipientIe === void 0 ? {} : { recipientIe: recipientIe.trim().toUpperCase() },
      ...recipientIeIndicator === void 0 ? {} : { recipientIeIndicator: String(recipientIeIndicator) },
      ...body.finalConsumer === void 0 ? {} : { finalConsumer: body.finalConsumer },
      ...body.deliveryByIssuer === void 0 ? {} : { deliveryByIssuer: body.deliveryByIssuer },
      ...body.cardNotIntegrated === void 0 ? {} : { cardNotIntegrated: body.cardNotIntegrated },
      ...body.hasTransport === void 0 ? {} : { hasTransport: body.hasTransport },
      ...body.transportResponsible === void 0 ? {} : { transportResponsible: body.transportResponsible },
      ...body.freightContractResponsible === void 0 ? {} : { freightContractResponsible: body.freightContractResponsible },
      ...transporter ? { transporter } : {},
      ...freightMode ? { freightMode } : {},
      ...body.productionConfirmed === void 0 ? {} : { productionConfirmed: body.productionConfirmed },
      ...body.previewOnly === void 0 ? {} : { previewOnly: body.previewOnly },
      ...previewProof ? { previewProof } : {}
    }
  };
}
function resolveFiscalDocument(snapshot, ruleSet) {
  return determineWithApprovedRules(snapshot, ruleSet);
}
function parseFiscalSnapshotReservation(value) {
  if (!value || typeof value !== "object") return null;
  const candidate = value;
  if (typeof candidate.snapshotId !== "string" || !UUID_PATTERN.test(candidate.snapshotId) || typeof candidate.snapshotHash !== "string" || !SHA256_PATTERN.test(candidate.snapshotHash) || !Number.isInteger(candidate.number) || Number(candidate.number) < 1 || Number(candidate.number) > 999999999 || typeof candidate.issuedAt !== "string" || Number.isNaN(Date.parse(candidate.issuedAt)) || !Number.isInteger(candidate.orderVersion) || Number(candidate.orderVersion) < 0) {
    return null;
  }
  return {
    snapshotId: candidate.snapshotId,
    snapshotHash: candidate.snapshotHash,
    number: Number(candidate.number),
    issuedAt: candidate.issuedAt,
    orderVersion: Number(candidate.orderVersion)
  };
}

// api/nfe/fiscalXmlAudit.ts
var import_node_crypto4 = require("node:crypto");
var import_xmldom = require("@xmldom/xmldom");
var import_xml_crypto2 = require("xml-crypto");

// erp/src/pages/utils/nfe/serviceFiscalComposition.ts
var toCents = (value) => Math.round((Number(value) || 0) * 100);
var getItemNetCents = (item) => {
  const unitPrice = Number(item.unitPrice) || 0;
  const quantity = Number(item.quantity) || 1;
  const unitDiscount = Number(item.unitDiscount) || 0;
  const fixedDiscount = item.discountType === "fixed" ? unitDiscount : unitPrice * unitDiscount / 100;
  return toCents(Math.max(0, unitPrice - fixedDiscount) * quantity);
};
function composeServiceFiscalValues(items = []) {
  const products = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => item.itemType !== "service");
  const services = items.filter((item) => item.itemType === "service");
  const linkedServiceCents = /* @__PURE__ */ new Map();
  let vOutroCents = 0;
  for (const service of services) {
    const netCents = getItemNetCents(service);
    const targetId = service.linkedProductOrderItemId;
    if (targetId && products.some(({ item }) => item.orderItemId === targetId)) {
      linkedServiceCents.set(targetId, (linkedServiceCents.get(targetId) || 0) + netCents);
    } else {
      vOutroCents += netCents;
    }
  }
  return {
    products: products.map(({ item, itemIndex }) => {
      const quantity = item.quantity || 1;
      const grossCents = toCents((Number(item.unitPrice) || 0) * quantity);
      const netCents = getItemNetCents(item);
      const discountCents = Math.max(0, grossCents - netCents);
      return {
        item,
        itemIndex,
        vProdCents: grossCents + (item.orderItemId ? linkedServiceCents.get(item.orderItemId) || 0 : 0),
        vDescCents: discountCents
      };
    }),
    vOutroCents
  };
}

// api/nfe/normal-sale/attemptPolicy.ts
function fiscalAttemptCommand(command) {
  const {
    productionConfirmed: _consent,
    previewOnly: _previewOnly,
    previewProof: _previewProof,
    ...fiscalCommand
  } = command;
  return JSON.parse(JSON.stringify(fiscalCommand));
}
function canonicalFiscalCommand(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalFiscalCommand).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalFiscalCommand(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
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

// api/nfe/fiscalXmlAudit.ts
function createStrictXmlParser(parseErrors) {
  return new import_xmldom.DOMParser({
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
function fiscalPreviewFingerprint(snapshot, document, identity, signedXml) {
  const frozenFacts = { ...snapshot };
  delete frozenFacts.capturedAt;
  delete frozenFacts.persistedHash;
  delete frozenFacts.decisionTrace;
  const { snapshotHash: _snapshotHash, ...frozenDocument } = document;
  return (0, import_node_crypto4.createHash)("sha256").update(
    canonicalFiscalCommand({
      snapshot: frozenFacts,
      document: frozenDocument,
      identity,
      signedXmlSha256: (0, import_node_crypto4.createHash)("sha256").update(signedXml).digest("hex")
    })
  ).digest("hex");
}
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
  const composition = composeServiceFiscalValues(orderItems);
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
    const otherExpenses = index === 0 ? composition.vOutroCents / 100 : 0;
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
  const expectedCommercialTotal = (composition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) + composition.vOutroCents) / 100 + freight;
  if (Math.abs(expectedCommercialTotal - document.totals.invoice) > 5e-3)
    mismatches.push({
      field: "total.valorPedidoCalculado",
      expected: expectedCommercialTotal,
      actual: document.totals.invoice
    });
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

// api/nfe/xml/xmlPrimitives.ts
var escapeXml = (value) => String(value).replace(
  /[&<>"']/g,
  (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[char] || char
);
var tag = (name, value) => `<${name}>${escapeXml(value)}</${name}>`;
var money = (value) => value.toFixed(2);
var decimal2 = (value, scale) => value.toFixed(scale);
var dateOnly = (value, field) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} inv\xE1lida.`);
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error(`${field} inv\xE1lida.`);
  return value;
};
function percent(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 1e4 - Math.round(value * 1e4)) > 1e-6)
    throw new Error("Al\xEDquota fiscal inv\xE1lida.");
  return value.toFixed(4);
}
function accessKeyDigit(base43) {
  return calculateAccessKeyDigit(base43);
}
function requireCode(value, pattern, field) {
  if (!pattern.test(value)) throw new Error(`${field} inv\xE1lido para serializa\xE7\xE3o fiscal.`);
  return value;
}
function addressXml(address2, name) {
  requireCode(address2.municipalityCode, /^\d{7}$/, "Munic\xEDpio IBGE");
  requireCode(address2.uf, /^[A-Z]{2}$/, "UF");
  if (address2.postalCode) requireCode(address2.postalCode, /^\d{8}$/, "CEP");
  for (const [field, value] of Object.entries(address2).filter(
    ([field2]) => field2 !== "postalCode"
  )) {
    if (!value?.trim()) throw new Error(`Endere\xE7o fiscal sem ${field}.`);
  }
  return `<${name}>${tag("xLgr", address2.street)}${tag("nro", address2.number)}${tag("xBairro", address2.district)}${tag("cMun", address2.municipalityCode)}${tag("xMun", address2.municipality)}${tag("UF", address2.uf)}${address2.postalCode ? tag("CEP", address2.postalCode) : ""}${tag("cPais", "1058")}${tag("xPais", "BRASIL")}</${name}>`;
}

// api/nfe/xml/fiscalTaxXml.ts
function taxAmount(tax, field) {
  const value = tax.values[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error(`${tax.group}.${field} precisa de valor num\xE9rico decidido.`);
  return value;
}
function serializeFiscalTaxes(taxes, origin) {
  const icms = taxes.find((tax) => tax.group === "ICMS");
  const pis = taxes.find((tax) => tax.group === "PIS");
  const cofins = taxes.find((tax) => tax.group === "COFINS");
  if (!icms || !pis || !cofins || taxes.some((tax) => tax.group === "IPI"))
    throw new Error("Grupos tribut\xE1rios ausentes ou ainda n\xE3o suportados pelo serializer.");
  const supportedIcmsFields = icms.codeSystem === "CST" && icms.code === "00" ? ["modBC", "vBC", "pICMS", "vICMS"] : ["vICMS"];
  if (Object.keys(icms.values).some((field) => !supportedIcmsFields.includes(field)))
    throw new Error(
      "INTERSTATE_TAX_TREATMENT_NOT_IMPLEMENTED: campos ICMS/ST/FCP/cr\xE9dito sem serializa\xE7\xE3o suportada."
    );
  let icmsGroup;
  if (icms.codeSystem === "CSOSN" && ZERO_OWN_ICMS_CSOSNS.includes(icms.code)) {
    if (taxAmount(icms, "vICMS") !== 0) throw new Error("ICMSSN102 n\xE3o destaca ICMS pr\xF3prio.");
    const group = zeroOwnIcmsGroup(icms.code);
    icmsGroup = `<${group}>${tag("orig", origin)}${tag("CSOSN", icms.code)}</${group}>`;
  } else if (icms.codeSystem === "CST" && icms.code === "00") {
    const base = taxAmount(icms, "vBC");
    const rate = taxAmount(icms, "pICMS");
    const amount2 = taxAmount(icms, "vICMS");
    if (Math.abs(Math.round(base * rate) - Math.round(amount2 * 100)) > 1)
      throw new Error("ICMS do item n\xE3o reconcilia com base e al\xEDquota.");
    icmsGroup = `<ICMS00>${tag("orig", origin)}${tag("CST", icms.code)}${tag("modBC", requireCode(String(icms.values.modBC), /^[0-3]$/, "Modalidade da base ICMS"))}${tag("vBC", money(base))}${tag("pICMS", percent(rate))}${tag("vICMS", money(amount2))}</ICMS00>`;
  } else throw new Error(`Grupo ICMS ${icms.codeSystem}/${icms.code} ainda n\xE3o suportado.`);
  const contribution = (tax, group) => {
    if (tax.codeSystem !== "CST") throw new Error(`${group} exige CST expl\xEDcito.`);
    const rateName = group === "PIS" ? "pPIS" : "pCOFINS";
    const valueName = group === "PIS" ? "vPIS" : "vCOFINS";
    const amount2 = taxAmount(tax, valueName);
    if (["04", "05", "06", "07", "08", "09"].includes(tax.code)) {
      if (amount2 !== 0) throw new Error(`${group} n\xE3o tributado com valor diferente de zero.`);
      return `<${group}><${group}NT>${tag("CST", tax.code)}</${group}NT></${group}>`;
    }
    if (!["01", "02", "49", "99"].includes(tax.code))
      throw new Error(`${group} CST ${tax.code} ainda n\xE3o suportado.`);
    const base = taxAmount(tax, "vBC");
    const rate = taxAmount(tax, rateName);
    if (Math.abs(Math.round(base * rate) - Math.round(amount2 * 100)) > 1)
      throw new Error(`${group} do item n\xE3o reconcilia com base e al\xEDquota.`);
    const variant = ["01", "02"].includes(tax.code) ? `${group}Aliq` : `${group}Outr`;
    return `<${group}><${variant}>${tag("CST", tax.code)}${tag("vBC", money(base))}${tag(rateName, percent(rate))}${tag(valueName, money(amount2))}</${variant}></${group}>`;
  };
  return `<imposto><ICMS>${icmsGroup}</ICMS>${contribution(pis, "PIS")}${contribution(cofins, "COFINS")}</imposto>`;
}

// api/nfe/xml/fiscalItemXml.ts
function serializeFiscalItems(document) {
  const operation = document.operation;
  const destination = operation.destination;
  if (destination !== "1" && destination !== "2" && destination !== "3")
    throw new Error("Destino fiscal do item ausente ou inv\xE1lido.");
  return document.items.map((item) => {
    const p = item.product;
    const c = item.classification;
    requireCode(c.ncm, /^\d{8}$/, `NCM do item ${item.itemNumber}`);
    requireCode(c.cfop, /^\d{4}$/, `CFOP do item ${item.itemNumber}`);
    const cfopMatch = validateItemCfopMatch({
      cfop: c.cfop,
      destination,
      model: document.model,
      direction: operation.direction,
      itemType: "product",
      operationType: "sale"
    });
    if (!cfopMatch.valid)
      throw new Error(`CFOP do item ${item.itemNumber} inv\xE1lido: ${cfopMatch.reason}`);
    requireCode(c.origin, /^[0-8]$/, `Origem do item ${item.itemNumber}`);
    const printType = document.model === "65" ? "4" : "1";
    const isHomologationFirstItem = item.itemNumber === 1 && shouldUseHomologationFirstItemDescription({
      model: document.model,
      environment: document.environment,
      printType
    });
    const product = `<prod>${tag("cProd", p.code)}${tag("cEAN", p.gtin)}${tag("xProd", isHomologationFirstItem ? HOMOLOGATION_FIRST_ITEM_DESCRIPTION : p.description)}${tag("NCM", c.ncm)}${c.cest ? tag("CEST", requireCode(c.cest, /^\d{7}$/, "CEST")) : ""}${c.benefitCode ? tag("cBenef", c.benefitCode) : ""}${tag("CFOP", c.cfop)}${tag("uCom", c.unit)}${tag("qCom", decimal2(p.quantity, 4))}${tag("vUnCom", decimal2(p.unitValue, 4))}${tag("vProd", money(p.gross))}${tag("cEANTrib", p.gtin)}${tag("uTrib", c.unit)}${tag("qTrib", decimal2(p.quantity, 4))}${tag("vUnTrib", decimal2(p.unitValue, 4))}${p.freight ? tag("vFrete", money(p.freight)) : ""}${p.insurance ? tag("vSeg", money(p.insurance)) : ""}${p.discount ? tag("vDesc", money(p.discount)) : ""}${p.otherExpenses ? tag("vOutro", money(p.otherExpenses)) : ""}${tag("indTot", "1")}</prod>`;
    const taxes = serializeFiscalTaxes(item.taxes, c.origin);
    const additionalProductInfo = isHomologationFirstItem ? tag("infAdProd", p.description) : "";
    return `<det nItem="${item.itemNumber}">${product}${taxes}${additionalProductInfo}</det>`;
  }).join("");
}

// api/nfe/fiscalXmlSerializer.ts
function serializeFiscalDocument(snapshot, document, ruleSet, identity) {
  validateFiscalDocument(snapshot, document, ruleSet);
  const key = requireCode(identity.accessKey, ACCESS_KEY_PATTERN, "Chave de acesso");
  requireCode(document.issuer.cnpj, /^[A-Z0-9]{12}[0-9]{2}$/, "CNPJ do emitente");
  if (document.issuer.address.uf !== "PR" || key.slice(0, 2) !== "41" || document.issuer.municipalityCode !== document.issuer.address.municipalityCode || key.slice(6, 20) !== normalizeRecipientTaxId(document.issuer.cnpj) || key.slice(20, 22) !== document.model || Number(key.slice(22, 25)) !== identity.series || Number(key.slice(25, 34)) !== identity.number || key[34] !== "1" || Number(key[43]) !== accessKeyDigit(key.slice(0, 43)) || !Number.isInteger(identity.number) || identity.number < 1 || !Number.isInteger(identity.series) || identity.series < 0 || identity.series > 999)
    throw new Error("Chave, emitente, modelo, s\xE9rie ou n\xFAmero fiscal n\xE3o conferem.");
  const issuedAt = new Date(identity.issuedAt);
  if (Number.isNaN(issuedAt.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(identity.issuedAt) || key.slice(2, 6) !== identity.issuedAt.slice(2, 4) + identity.issuedAt.slice(5, 7))
    throw new Error("Instante fiscal ou AAMM da chave inv\xE1lidos.");
  const zoneOffset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    timeZoneName: "longOffset"
  }).formatToParts(issuedAt).find((part) => part.type === "timeZoneName")?.value.replace("GMT", "");
  if (zoneOffset !== identity.issuedAt.slice(-6))
    throw new Error("Offset de emiss\xE3o n\xE3o corresponde ao fuso de S\xE3o Paulo.");
  const operation = document.operation;
  const destination = operation.destination;
  if (operation.direction !== "outbound" || destination !== "1" && destination !== "2" || operation.purpose !== "1" || !/^[0-9]$/.test(operation.presence) || !/^[012349]$/.test(operation.freightMode))
    throw new Error("Opera\xE7\xE3o fiscal n\xE3o suportada pelo serializer.");
  if (document.model === "65" && operation.destination !== "1")
    throw new Error("NFC-e n\xE3o permite opera\xE7\xE3o interestadual.");
  if (document.model === "65" && snapshot.order.data.shipping?.deliveryMethod === "delivery" && operation.presence !== "4")
    throw new Error("NFC-e com entrega em domic\xEDlio exige indPres=4.");
  if (document.model === "65" && document.recipient.address && document.recipient.address.uf !== "PR")
    throw new Error("NFC-e n\xE3o permite destinat\xE1rio fora do estado.");
  if (operation.destination === "1" && document.recipient.address && document.recipient.address.uf !== "PR") {
    const isPickup = snapshot.order.data.shipping?.deliveryMethod === "pickup";
    if (!isPickup) {
      throw new Error("Opera\xE7\xE3o interna (idDest=1) com entrega fora do estado \xE9 incoerente.");
    }
  }
  if (operation.destination === "2" && document.recipient.address && document.recipient.address.uf === "PR")
    throw new Error("Opera\xE7\xE3o interestadual (idDest=2) exige destinat\xE1rio com UF diferente de PR.");
  const recipientDoc = normalizeRecipientTaxId(document.recipient.cpfCnpj);
  const requirements = decideFiscalRecipientRequirements({
    model: document.model,
    presence: operation.presence,
    total: document.totals.invoice,
    personType: document.recipient.personType,
    recipientTaxId: recipientDoc,
    operationScope: "NORMAL_DOMESTIC_SALE"
  });
  if (!requirements.supported)
    throw new Error(requirements.message || "Matriz fiscal do destinat\xE1rio n\xE3o aplic\xE1vel.");
  if (requirements.documentRequired && !recipientDoc)
    throw new Error(requirements.message || "Documento do destinat\xE1rio obrigat\xF3rio.");
  if (recipientDoc && (!isValidRecipientTaxId(recipientDoc) || !recipientTaxIdMatchesPersonType(recipientDoc, document.recipient.personType)))
    throw new Error("Documento do destinat\xE1rio inv\xE1lido ou incompat\xEDvel com PF/PJ.");
  if (requirements.addressRequired && !document.recipient.address)
    throw new Error("Endere\xE7o do destinat\xE1rio obrigat\xF3rio para esta opera\xE7\xE3o.");
  if (document.model === "65" && (operation.finalConsumer !== "1" || document.recipient.ieIndicator !== "9" || document.totals.invoice >= 2e5))
    throw new Error("Opera\xE7\xE3o incompat\xEDvel com NFC-e.");
  if (!["1", "2", "9"].includes(document.recipient.ieIndicator) || document.recipient.ieIndicator === "1" && !document.recipient.ie)
    throw new Error("Condi\xE7\xE3o de contribuinte do destinat\xE1rio incompleta.");
  const effectivePresence = operation.presence;
  const intermediaryIndicator = document.model === "55" && ["2", "3", "4", "9"].includes(effectivePresence) ? tag("indIntermed", "0") : "";
  const ide = `<ide>${tag("cUF", "41")}${tag("cNF", key.slice(35, 43))}${tag("natOp", operation.natureOfOperation)}${tag("mod", document.model)}${tag("serie", identity.series)}${tag("nNF", identity.number)}${tag("dhEmi", identity.issuedAt)}${tag("tpNF", "1")}${tag("idDest", operation.destination)}${tag("cMunFG", document.issuer.municipalityCode)}${tag("tpImp", document.model === "65" ? "4" : "1")}${tag("tpEmis", "1")}${tag("cDV", key[43])}${tag("tpAmb", document.environment)}${tag("finNFe", operation.purpose)}${tag("indFinal", operation.finalConsumer)}${tag("indPres", effectivePresence)}${intermediaryIndicator}${tag("procEmi", "0")}${tag("verProc", "MoranteHub_1.0")}</ide>`;
  const issuer = `<emit>${tag("CNPJ", document.issuer.cnpj)}${tag("xNome", document.issuer.name)}${addressXml(document.issuer.address, "enderEmit")}${tag("IE", document.issuer.ie)}${tag("CRT", document.issuer.crt)}</emit>`;
  const recipient = !recipientDoc && document.model === "65" ? "" : `<dest>${recipientDoc ? tag(recipientDoc.length === 11 ? "CPF" : "CNPJ", recipientDoc) : ""}${tag("xNome", getHomologationRecipientName({
    model: document.model,
    environment: document.environment,
    recipientName: document.recipient.name
  }))}${document.recipient.address ? addressXml(document.recipient.address, "enderDest") : ""}${tag("indIEDest", document.model === "65" ? "9" : document.recipient.ieIndicator)}${document.model !== "65" && document.recipient.ie && document.recipient.ieIndicator !== "2" ? tag("IE", document.recipient.ie) : ""}</dest>`;
  const items = serializeFiscalItems(document);
  const t = document.totals;
  const total = `<total><ICMSTot>${tag("vBC", money(t.icmsBase))}${tag("vICMS", money(t.icms))}${tag("vICMSDeson", money(t.icmsExempt))}${tag("vFCP", money(t.fcp))}${tag("vBCST", money(t.icmsStBase))}${tag("vST", money(t.icmsSt))}${tag("vFCPST", money(t.fcpSt))}${tag("vFCPSTRet", money(t.fcpStRetained))}${tag("vProd", money(t.products))}${tag("vFrete", money(t.freight))}${tag("vSeg", money(t.insurance))}${tag("vDesc", money(t.discount))}${tag("vII", money(t.ii))}${tag("vIPI", money(t.ipi))}${tag("vIPIDevol", money(t.ipiReturned))}${tag("vPIS", money(t.pis))}${tag("vCOFINS", money(t.cofins))}${tag("vOutro", money(t.otherExpenses))}${tag("vNF", money(t.invoice))}</ICMSTot></total>`;
  const payments = `<pag>${document.payments.map((payment) => {
    requireCode(payment.methodCode, /^\d{2}$/, "Meio de pagamento");
    if (document.model === "65" && ["03", "04", "17"].includes(payment.methodCode) && !payment.card)
      throw new Error("Dados de integra\xE7\xE3o do cart\xE3o/PIX ausentes para NFC-e.");
    const paymentDescription = payment.description?.trim();
    if (payment.methodCode === "99" && (!paymentDescription || paymentDescription.length < 2 || paymentDescription.length > 60))
      throw new Error(
        "Descreva o meio de pagamento classificado como Outros (2 a 60 caracteres)."
      );
    return `<detPag>${payment.paymentIndicator ? tag("indPag", requireCode(payment.paymentIndicator, /^[01]$/, "Indicador do pagamento")) : ""}${tag("tPag", payment.methodCode)}${payment.methodCode === "99" ? tag("xPag", paymentDescription) : ""}${tag("vPag", money(payment.amount))}${payment.paymentDate ? tag("dPag", dateOnly(payment.paymentDate, "Data real do pagamento")) : ""}${payment.card ? "<card>" + tag(
      "tpIntegra",
      requireCode(payment.card.integrationType, /^[12]$/, "Integra\xE7\xE3o cart\xE3o")
    ) + (payment.card.acquirerCnpj ? tag("CNPJ", requireCode(payment.card.acquirerCnpj, /^[A-Z0-9]{12}[0-9]{2}$/, "CNPJ adquirente")) : "") + (payment.card.brand ? tag("tBand", requireCode(payment.card.brand, /^\d{2}$/, "Bandeira")) : "") + (payment.card.authorization ? tag("cAut", payment.card.authorization) : "") + "</card>" : ""}</detPag>`;
  }).join("")}${t.change ? tag("vTroco", money(t.change)) : ""}</pag>`;
  let billing = "";
  if (document.model === "55" && document.billingInstallments?.length) {
    const installments = document.billingInstallments;
    if (installments.length > 120)
      throw new Error("A cobran\xE7a excede o limite fiscal de 120 parcelas.");
    const billingCents = installments.reduce(
      (sum, installment) => sum + Math.round(installment.amount * 100),
      0
    );
    const deferredCents = document.payments.reduce(
      (sum, payment) => sum + (payment.paymentIndicator === "1" ? Math.round(payment.amount * 100) : 0),
      0
    );
    if (billingCents !== deferredCents)
      throw new Error("As duplicatas n\xE3o correspondem aos valores informados a prazo.");
    const emissionDate = identity.issuedAt.slice(0, 10);
    const lastDueDate = `${Number(emissionDate.slice(0, 4)) + 10}${emissionDate.slice(4)}`;
    let previousDueDate = emissionDate;
    const duplicates = installments.map((installment, index) => {
      if (installment.number !== String(index + 1).padStart(3, "0"))
        throw new Error("N\xFAmero da duplicata deve ter tr\xEAs algarismos sequenciais.");
      if (!Number.isFinite(installment.amount) || installment.amount <= 0)
        throw new Error("Valor da duplicata inv\xE1lido.");
      const dueDate = dateOnly(installment.dueDate || "", "Data de vencimento da duplicata");
      if (dueDate < previousDueDate || dueDate > lastDueDate)
        throw new Error("Data de vencimento da duplicata deve respeitar a emiss\xE3o, a ordem das parcelas e o limite de dez anos.");
      if (installments.length === 1 && dueDate === emissionDate)
        throw new Error("A cobran\xE7a com parcela \xFAnica n\xE3o deve ter vencimento na data da emiss\xE3o.");
      previousDueDate = dueDate;
      return `<dup>${tag("nDup", installment.number)}${tag("dVenc", dueDate)}${tag("vDup", money(installment.amount))}</dup>`;
    }).join("");
    const netBilling = money(billingCents / 100);
    billing = `<cobr><fat>${tag("nFat", identity.number)}${tag("vOrig", netBilling)}${tag("vLiq", netBilling)}</fat>${duplicates}</cobr>`;
  }
  const transporter = operation.transporter;
  if (transporter && (!transporter.name || !isValidRecipientTaxId(transporter.cnpj || transporter.cpf || "") || (transporter.cnpj ? normalizeRecipientTaxId(transporter.cnpj).length !== 14 : false) || (transporter.cpf ? normalizeRecipientTaxId(transporter.cpf).length !== 11 : false)))
    throw new Error("Identifica\xE7\xE3o do transportador incompleta.");
  const requiresHomeDeliveryTransportGroup = document.model === "65" && operation.presence === "4";
  const transport = `<transp>${tag("modFrete", operation.freightMode)}${transporter ? "<transporta>" + tag(transporter.cnpj ? "CNPJ" : "CPF", transporter.cnpj || transporter.cpf || "") + tag("xNome", transporter.name) + (transporter.ie ? tag("IE", transporter.ie) : "") + (transporter.address ? tag("xEnder", transporter.address) : "") + (transporter.city ? tag("xMun", transporter.city) : "") + (transporter.uf ? tag("UF", transporter.uf) : "") + "</transporta>" : requiresHomeDeliveryTransportGroup ? "<transporta/>" : ""}</transp>`;
  const supplement = document.model === "65" ? `<infNFeSupl><qrCode><![CDATA[http://www.fazenda.pr.gov.br/nfce/qrcode?p=${key}|3|${document.environment}]]></qrCode><urlChave>http://www.fazenda.pr.gov.br/nfce/consulta</urlChave></infNFeSupl>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${key}" versao="4.00">${ide}${issuer}${recipient}${items}${total}${transport}${billing}${payments}</infNFe>${supplement}</NFe>`;
}

// api/nfe/normal-sale/outboundAttempt.ts
var import_node_crypto5 = require("node:crypto");

// erp/src/pages/utils/nfe/nfeEventRules.ts
var readTag = (xml, tag2) => {
  const name = `(?:[\\w.-]+:)?${tag2}`;
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
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

// api/nfe/xmlEnvelope.ts
function embeddedNfeXml(xml) {
  return xml.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>\s*/, "");
}

// api/nfe/normal-sale/outboundAttempt.ts
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
async function describeActiveNormalSaleConflict(db, command, issuerCnpj) {
  const active = await db.from("nfe_outbound_attempts").select("*").eq("order_id", command.orderId).eq("environment", command.environment).eq("issuer_cnpj", issuerCnpj).in("state", ["prepared", "transmitting", "reconciling", "authorized"]);
  if (active.error || active.data?.length !== 1)
    return outboundFailure(
      503,
      "FISCAL_RECOVERY_UNAVAILABLE",
      "J\xE1 existe uma tentativa fiscal para este pedido, mas n\xE3o foi poss\xEDvel identific\xE1-la com seguran\xE7a. Atualize a consulta antes de continuar.",
      { pending: true, orderId: command.orderId, environment: command.environment, numberReserved: false, sefazContacted: false }
    );
  const attempt = active.data[0];
  return outboundFailure(
    409,
    "ALREADY_ACTIVE_FISCAL_ATTEMPT",
    "J\xE1 existe uma tentativa fiscal em andamento para este pedido. Consulte a tentativa original antes de continuar.",
    { ...metadata(attempt), state: attempt.state, databaseReason: "ALREADY_ACTIVE_FISCAL_ATTEMPT", pending: true, numberReserved: false, sefazContacted: false }
  );
}
function productionTransmissionGate(environment, confirmed) {
  if (environment === 1 && !confirmed)
    return outboundFailure(
      403,
      "PRODUCTION_CONFIRMATION_REQUIRED",
      "Confirme explicitamente a emiss\xE3o em Produ\xE7\xE3o."
    );
  return null;
}
async function persist(db, a, token, state, reason, response, protocol = null, xml = "") {
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
function finalResult(a, doc) {
  const parsed = parseSefazAuthorization(String(doc.xml_protocolo || ""));
  return {
    status: 200,
    body: {
      ...parsed,
      success: a.state === "authorized" && doc.status !== "cancelada",
      ...metadata(a),
      state: doc.status === "cancelada" ? "cancelled" : a.state,
      pending: false,
      signedXml: doc.xml_nfe,
      sefazResponseXml: doc.xml_protocolo,
      protocolNumber: doc.numero_protocolo,
      xMotivo: doc.motivo_status,
      ...doc.status === "cancelada" ? {
        code: "FISCAL_ALREADY_CANCELLED",
        error: "O documento original est\xE1 cancelado. Seu hist\xF3rico foi preservado."
      } : {},
      ...a.state === "rejected" ? { code: "FISCAL_SEFAZ_REJECTED", error: doc.motivo_status } : {}
    }
  };
}
async function transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed) {
  const gate = productionTransmissionGate(a.environment, productionConfirmed);
  if (gate) return { ...gate, body: { ...gate.body, ...metadata(a), sefazContacted: false } };
  try {
    const saved = await db.from("nfe_fiscal_snapshots").select("snapshot_data").eq("id", a.snapshot_id).maybeSingle();
    const xml = String(doc.xml_nfe || "");
    if (saved.error || !saved.data || (0, import_node_crypto5.createHash)("sha256").update(xml).digest("hex") !== a.xml_sha256)
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
      await persist(
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
      () => persist(
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
async function loadOutboundAttempt(db, documentId) {
  const [attempt, document] = await Promise.all([
    db.from("nfe_outbound_attempts").select("*").eq("document_id", documentId).maybeSingle(),
    db.from("nfe_documents").select("*").eq("id", documentId).maybeSingle()
  ]);
  if (attempt.error || document.error || !attempt.data || !document.data)
    throw new Error("FISCAL_ATTEMPT_UNAVAILABLE");
  return { attempt: attempt.data, document: document.data };
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
  if (["authorized", "rejected"].includes(a.state)) return finalResult(a, doc);
  const token = ownedToken || (0, import_node_crypto5.randomUUID)();
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
      await persist(
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
      await persist(db, a, token, "confirmed_not_found", `217: ${situation.xMotivo}`, response);
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
    await persist(
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
async function recoverNormalSale(db, command) {
  const prior = await db.from("nfe_outbound_attempts").select("*").eq("emission_request_id", command.emissionRequestId).maybeSingle();
  if (prior.error)
    return outboundFailure(
      503,
      "FISCAL_RECOVERY_UNAVAILABLE",
      "N\xE3o foi poss\xEDvel verificar a idempot\xEAncia. Nenhum n\xFAmero novo ser\xE1 reservado.",
      { pending: true }
    );
  if (!prior.data) return null;
  if (canonicalFiscalCommand(prior.data.request_command) !== canonicalFiscalCommand(fiscalAttemptCommand(command)))
    return outboundFailure(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "A chave de idempot\xEAncia j\xE1 pertence a outro payload fiscal.",
      metadata(prior.data)
    );
  if (!["authorized", "rejected"].includes(prior.data.state)) {
    try {
      await loadOutboundAttempt(db, prior.data.document_id);
    } catch {
      return outboundFailure(
        503,
        "FISCAL_RECOVERY_UNAVAILABLE",
        "N\xE3o foi poss\xEDvel revalidar o XML da tentativa reservada.",
        { ...metadata(prior.data), sefazContacted: false }
      );
    }
  }
  return reconcileNormalSale(
    db,
    prior.data.document_id,
    true,
    command.productionConfirmed === true
  );
}

// api/nfe/normal-sale/values.ts
var obj = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Fatos fiscais obrigat\xF3rios ausentes.");
  return value;
};
var required2 = (value, field) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} ausente.`);
  return value.trim();
};
var normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
var money2 = (value, field, positive = false) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (positive ? 0.01 : 0) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw new Error(`${field} inv\xE1lido ou fora da precis\xE3o de centavos.`);
  return Math.round(value * 100);
};

// shared-utils/fiscalTransportModel.ts
function resolveTransport(input) {
  const { fiscalModel, deliveryMethod } = input;
  if (fiscalModel === "65" && deliveryMethod === "pickup") {
    return {
      hasTransport: false,
      transportResponsible: "NONE",
      modFrete: "9",
      modFreteDescription: "9 \u2014 Sem ocorr\xEAncia de transporte",
      isEmitterTransporter: false,
      requiresTransporterData: false,
      allowsEditHasTransport: false,
      derivedReason: "Definido automaticamente: pedido para retirada.",
      statusBadge: "9 \u2014 Sem ocorr\xEAncia de transporte [OFF \u{1F512}]",
      friendlyDescription: "Sem ocorr\xEAncia de transporte \u2014 definido pelo pedido de retirada"
    };
  }
  if (fiscalModel === "55" && deliveryMethod === "pickup") {
    return {
      hasTransport: true,
      transportResponsible: "CUSTOMER",
      modFrete: "4",
      modFreteDescription: "4 \u2014 Transporte pr\xF3prio por conta do destinat\xE1rio",
      isEmitterTransporter: false,
      requiresTransporterData: false,
      allowsEditHasTransport: false,
      derivedReason: "Definido automaticamente: pedido para retirada.",
      statusBadge: "4 \u2014 Transporte pr\xF3prio pelo destinat\xE1rio [ON \u{1F512}]",
      friendlyDescription: "Transporte pr\xF3prio pelo destinat\xE1rio \u2014 definido pelo pedido de retirada"
    };
  }
  const responsible = input.transportResponsible === "THIRD_PARTY" ? "THIRD_PARTY" : "OWN_COMPANY";
  if (responsible === "THIRD_PARTY") {
    const contract = input.freightContractResponsible || "SENDER";
    let modFrete = "0";
    let modDesc = "0 \u2014 Contrata\xE7\xE3o do frete por conta do remetente (CIF)";
    if (contract === "RECIPIENT") {
      modFrete = "1";
      modDesc = "1 \u2014 Contrata\xE7\xE3o do frete por conta do destinat\xE1rio (FOB)";
    } else if (contract === "THIRD_PARTY") {
      modFrete = "2";
      modDesc = "2 \u2014 Contrata\xE7\xE3o do frete por conta de terceiros";
    }
    return {
      hasTransport: true,
      transportResponsible: "THIRD_PARTY",
      freightContractResponsible: contract,
      modFrete,
      modFreteDescription: modDesc,
      isEmitterTransporter: false,
      requiresTransporterData: true,
      allowsEditHasTransport: false,
      derivedReason: "Definido automaticamente: pedido com entrega.",
      statusBadge: `Transporte ${modFrete} \u2014 Transportador terceirizado [ON \u{1F512}]`,
      friendlyDescription: "Transportador terceirizado \u2014 definido pelo pedido com entrega"
    };
  }
  return {
    hasTransport: true,
    transportResponsible: "OWN_COMPANY",
    modFrete: "3",
    modFreteDescription: "3 \u2014 Transporte pr\xF3prio por conta do remetente",
    isEmitterTransporter: true,
    requiresTransporterData: false,
    allowsEditHasTransport: false,
    derivedReason: "Definido automaticamente: pedido com entrega.",
    statusBadge: "3 \u2014 Entrega pela pr\xF3pria empresa [ON \u{1F512}]",
    friendlyDescription: "Entrega pela pr\xF3pria empresa \u2014 definido pelo pedido com entrega"
  };
}

// shared-utils/orderItemFiscalSnapshot.ts
var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : void 0;
function hasFiscalItemSnapshot(item) {
  const itemRecord = record(item);
  const version = itemRecord.fiscalSnapshotVersion;
  const fiscal = record(itemRecord.fiscal);
  return typeof version === "number" && Number.isInteger(version) && version > 0 && Boolean(nonEmptyString(fiscal.commercialUnit)) && Boolean(nonEmptyString(fiscal.taxableUnit));
}

// api/nfe/interstate-outbound-fiscal-matrix/rules.ts
var EXEMPT_IE_DISALLOWED_UFS = [
  "AM",
  "BA",
  "CE",
  "GO",
  "MG",
  "MS",
  "MT",
  "PA",
  "PE",
  "RN",
  "SE",
  "SP"
];
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

// api/nfe/interstate-outbound-fiscal-matrix/resolver.ts
var requiredFacts = [
  "environment",
  "model",
  "issuerRegime",
  "issuerUf",
  "destinationUf",
  "destinationScope",
  "operationType",
  "purpose",
  "recipientIeStatus",
  "finalConsumer",
  "hasSt",
  "merchandiseOrigin",
  "productOrigin",
  "ncm",
  "effectiveAt"
];
var isMissing = (value, key) => value === void 0 || value === null || value === "" && key !== "cest";
var matchesKnownCriteria = (facts, criteria) => Object.entries(criteria).every(([key, expected]) => {
  if (key === "destinationUf" && expected == null) return true;
  const actual = facts[key];
  return isMissing(actual, key) || actual === expected;
});
var matchesCompleteCriteria = (facts, criteria) => Object.entries(criteria).every(([key, expected]) => {
  if (key === "destinationUf" && expected == null) return true;
  const actual = facts[key];
  return !isMissing(actual, key) && actual === expected;
});
var validPercent = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
var treatmentIsComplete = (treatment) => treatment.cfop !== null && /^6\d{3}$/.test(treatment.cfop) && treatment.csosn !== null && {
  "101": "ICMSSN101",
  "102": "ICMSSN102",
  "103": "ICMSSN102",
  "201": "ICMSSN201",
  "202": "ICMSSN202",
  "203": "ICMSSN202",
  "300": "ICMSSN102",
  "400": "ICMSSN102",
  "500": "ICMSSN500",
  "900": "ICMSSN900"
}[treatment.csosn] === treatment.icms.xmlGroup && Boolean(treatment.icms.framework?.trim()) && Boolean(treatment.icms.xmlGroup?.trim()) && validPercent(treatment.icms.ratePercent) && Boolean(treatment.icms.baseMethod?.trim()) && validPercent(treatment.icms.reductionPercent) && treatment.st.applicable !== null && treatment.st.responsibility !== null && (treatment.st.applicable ? treatment.st.responsibility !== "none" : treatment.st.responsibility === "none") && Boolean(treatment.st.agreementOrProtocol?.trim()) && Boolean(treatment.st.baseMethod?.trim()) && validPercent(treatment.st.ratePercent) && treatment.difal.applicable !== null && treatment.difal.responsibility !== null && (treatment.difal.applicable ? treatment.difal.responsibility !== "none" : treatment.difal.responsibility === "none") && validPercent(treatment.difal.internalRatePercent) && validPercent(treatment.difal.interstateRatePercent) && validPercent(treatment.difal.destinationSharePercent) && treatment.fcp.applicable !== null && validPercent(treatment.fcp.ratePercent) && treatment.fcpSt.applicable !== null && validPercent(treatment.fcpSt.ratePercent) && (treatment.fcp.applicable || treatment.fcp.ratePercent === 0) && (treatment.fcpSt.applicable || treatment.fcpSt.ratePercent === 0);
var scopeMatchesCriteria = (scope, criteria) => {
  switch (scope) {
    case "NATIONAL":
      return true;
    case "ORIGIN_STATE":
      return isBrazilianFiscalUf(criteria.issuerUf);
    case "DESTINATION_STATE":
      return isBrazilianFiscalUf(criteria.destinationUf);
    case "ORIGIN_DESTINATION_PAIR":
      return isBrazilianFiscalUf(criteria.issuerUf) && isBrazilianFiscalUf(criteria.destinationUf);
    case "PRODUCT_SPECIFIC":
      return Boolean(criteria.productId || criteria.ncm || criteria.cest);
    default:
      return false;
  }
};
var normativeSourcesAreScoped = (rule) => scopeMatchesCriteria(rule.normativeScope, rule.criteria) && Array.isArray(rule.normativeSources) && rule.normativeSources.length > 0 && rule.sourceReferences.every(
  (url) => rule.normativeSources.some((source) => source.url === url)
) && rule.normativeSources.every((source) => {
  if (!source || typeof source.id !== "string" || !source.id.trim() || typeof source.url !== "string" || !source.url.trim() || !rule.sourceReferences.includes(source.url) || !scopeMatchesCriteria(source.scope, rule.criteria))
    return false;
  if ((source.scope === "ORIGIN_STATE" || source.scope === "ORIGIN_DESTINATION_PAIR") && !isBrazilianFiscalUf(source.issuerUf))
    return false;
  if ((source.scope === "DESTINATION_STATE" || source.scope === "ORIGIN_DESTINATION_PAIR") && !isBrazilianFiscalUf(source.destinationUf))
    return false;
  if (source.scope === "PRODUCT_SPECIFIC" && !(source.productId || source.ncm || source.cest))
    return false;
  return ["issuerUf", "destinationUf", "productId", "ncm", "cest"].every(
    (key) => source[key] === void 0 || !isMissing(source[key], key) && source[key] === rule.criteria[key]
  );
});
var isInterstateOutboundRoute = (facts) => facts.destinationScope === "INTERSTATE" && isBrazilianFiscalUf(facts.issuerUf) && isBrazilianFiscalUf(facts.destinationUf) && facts.issuerUf !== facts.destinationUf;
var approvalIsComplete = (rule) => Boolean(
  rule.approvedBy?.trim() && rule.criteria.destinationScope === "INTERSTATE" && rule.approvedAt && Number.isFinite(Date.parse(rule.approvedAt)) && rule.effectiveFrom && Number.isFinite(Date.parse(rule.effectiveFrom)) && (!rule.effectiveUntil || Number.isFinite(Date.parse(rule.effectiveUntil)) && Date.parse(rule.effectiveUntil) >= Date.parse(rule.effectiveFrom)) && requiredFacts.filter((key) => key !== "effectiveAt").every(
    (key) => key === "destinationUf" && rule.criteria.destinationUf == null ? rule.reviewedWildcards?.includes(key) : Object.hasOwn(rule.criteria, key) || rule.reviewedWildcards?.includes(key)
  ) && Boolean(rule.xmlEvidence?.trim()) && Boolean(rule.testEvidence?.trim()) && rule.sourceReferences.length > 0 && rule.sourceReferences.every((source) => Boolean(source.trim())) && normativeSourcesAreScoped(rule) && rule.pendingReview.length === 0 && treatmentIsComplete(rule.treatment)
);
function validateInterstateExemptIe(destinationUf, recipientIeStatus) {
  if (recipientIeStatus === "exempt" && destinationUf) {
    const ufUpper = destinationUf.toUpperCase().trim();
    if (EXEMPT_IE_DISALLOWED_UFS.includes(ufUpper)) {
      return {
        valid: false,
        errorCode: "INTERSTATE_EXEMPT_IE_NOT_ALLOWED",
        reason: `A UF de destino ${ufUpper} n\xE3o permite destinat\xE1rio como contribuinte isento de inscri\xE7\xE3o estadual (indIEDest=2) em opera\xE7\xF5es interestaduais (MOC RV 805 / E16a-30).`
      };
    }
  }
  return { valid: true };
}
function resolveInterstateStRole(params) {
  const { stRole, hasSt, catalogCst, itemFiscalCst, ncm, issuerUf, destinationUf } = params;
  const suggestsPriorSt = catalogCst === "500" || itemFiscalCst === "500";
  const incomplete = (reason) => ({
    role: null,
    isSt: null,
    status: "UNCONFIGURED",
    errorCode: "INTERSTATE_TAX_PROFILE_INCOMPLETE",
    reason
  });
  if (stRole === void 0) {
    if (hasSt === false && !suggestsPriorSt)
      return {
        role: "NONE",
        isSt: false,
        status: "RESOLVED"
      };
    return incomplete(
      hasSt === true || suggestsPriorSt ? "O produto indica contexto de ST, mas o papel do emitente na sa\xEDda interestadual n\xE3o foi informado; hasSt ou CST 500 n\xE3o determinam substituto/substitu\xEDdo." : "O enquadramento de ST n\xE3o foi informado; CEST vazio ou ausente no cadastro n\xE3o comprova aus\xEAncia de enquadramento."
    );
  }
  if (stRole === "NONE") {
    if (suggestsPriorSt)
      return incomplete(
        "CST 500 conflita com o papel NONE; revise o enquadramento fiscal do item."
      );
    return {
      role: "NONE",
      isSt: false,
      status: "RESOLVED"
    };
  }
  if (hasSt === false)
    return incomplete(
      "O papel informado na ST conflita com hasSt=false; revise os fatos fiscais do item."
    );
  return {
    role: stRole,
    isSt: true,
    status: "UNCONFIGURED",
    errorCode: "INTERSTATE_ST_RULE_NOT_CONFIGURED",
    reason: `Regra de Substitui\xE7\xE3o Tribut\xE1ria interestadual (papel ${stRole}) ainda n\xE3o parametrizada para NCM ${ncm || "n\xE3o informado"} e par ${issuerUf || "origem"}\u2192${destinationUf || "destino"}.`
  };
}
function hasApprovedInterstateOutboundRoute(facts, rules = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES) {
  const effectiveAt = Date.parse(String(facts.effectiveAt || ""));
  if (!isInterstateOutboundRoute(facts)) return false;
  return rules.some(
    (rule) => rule.status === "APPROVED" && approvalIsComplete(rule) && Number.isFinite(effectiveAt) && Date.parse(rule.effectiveFrom || "") <= effectiveAt && (!rule.effectiveUntil || Date.parse(rule.effectiveUntil) >= effectiveAt) && [
      "environment",
      "model",
      "issuerRegime",
      "issuerUf",
      "destinationUf",
      "destinationScope",
      "operationType",
      "purpose"
    ].every(
      (key) => rule.criteria[key] === facts[key] || rule.criteria[key] == null && rule.reviewedWildcards?.includes(key)
    )
  );
}
function resolveInterstateOutboundFiscalMatrix(facts, rules = INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES) {
  const missingFacts = requiredFacts.filter((key) => isMissing(facts[key], key));
  for (const [key, valid] of [
    ["issuerUf", isBrazilianFiscalUf(facts.issuerUf)],
    ["destinationUf", isBrazilianFiscalUf(facts.destinationUf)],
    ["purpose", typeof facts.purpose === "string" && /^[1-4]$/.test(facts.purpose)],
    ["ncm", typeof facts.ncm === "string" && /^\d{8}$/.test(facts.ncm)],
    ["cest", typeof facts.cest === "string" && (facts.cest === "" || /^\d{7}$/.test(facts.cest))],
    [
      "productOrigin",
      typeof facts.productOrigin === "string" && /^[0-8]$/.test(facts.productOrigin)
    ]
  ]) {
    if (!valid && !missingFacts.includes(key)) missingFacts.push(key);
  }
  if (facts.effectiveAt && !Number.isFinite(Date.parse(facts.effectiveAt)) && !missingFacts.includes("effectiveAt")) {
    missingFacts.push("effectiveAt");
  }
  const matchingDraftRuleIds = rules.filter((rule) => rule.status === "DRAFT" && matchesKnownCriteria(facts, rule.criteria)).map((rule) => rule.id);
  const matchingBlockedRuleIds = rules.filter((rule) => rule.status === "BLOCKED" && matchesKnownCriteria(facts, rule.criteria)).map((rule) => rule.id);
  const notApproved = (reason, code = "HML_INTERSTATE_MATRIX_NOT_APPROVED") => ({
    status: "not_approved",
    code,
    matchingDraftRuleIds,
    matchingBlockedRuleIds,
    missingFacts,
    reason
  });
  if (missingFacts.length) {
    return notApproved(
      missingFacts.includes("hasSt") ? "Informe se o produto est\xE1 sujeito \xE0 ST; CEST vazio ou ausente no cadastro n\xE3o comprova aus\xEAncia de enquadramento." : "Fatos fiscais obrigat\xF3rios ausentes ou inv\xE1lidos.",
      "INTERSTATE_TAX_PROFILE_INCOMPLETE"
    );
  }
  if (!isInterstateOutboundRoute(facts)) {
    return notApproved(
      "A matriz de sa\xEDda interestadual exige UFs brasileiras distintas e destinationScope=INTERSTATE."
    );
  }
  if (facts.recipientIeStatus === "non_taxpayer" && facts.finalConsumer === false) {
    return notApproved(
      "MOC E16a-40: indIEDest=9 e indFinal=0 em venda de sa\xEDda \xE9 rejeitado pela SEFAZ (rejei\xE7\xE3o 696).",
      "INTERSTATE_RULE_INVALID_COMBINATION"
    );
  }
  const exemptCheck = validateInterstateExemptIe(facts.destinationUf, facts.recipientIeStatus);
  if (!exemptCheck.valid) {
    return notApproved(
      exemptCheck.reason || "UF n\xE3o permite contribuinte isento.",
      exemptCheck.errorCode
    );
  }
  const stResult = resolveInterstateStRole({
    stRole: facts.stRole,
    hasSt: facts.hasSt,
    ncm: facts.ncm,
    issuerUf: facts.issuerUf,
    destinationUf: facts.destinationUf
  });
  if (stResult.status === "UNCONFIGURED") {
    return notApproved(stResult.reason || "ST n\xE3o configurada.", stResult.errorCode);
  }
  const effectiveAt = Date.parse(String(facts.effectiveAt));
  const specificity = (rule) => {
    const criteria = rule.criteria;
    const specified = (key) => !isMissing(criteria[key], key);
    const routePairSpecific = specified("issuerUf") && specified("destinationUf");
    const operationCriteria = [
      "environment",
      "model",
      "issuerRegime",
      "destinationScope",
      "operationType",
      "purpose",
      "recipientPersonType",
      "recipientIeStatus",
      "finalConsumer",
      "merchandiseOrigin",
      "productOrigin",
      "hasSt",
      "stRole",
      "allowsIcmsCredit",
      "recipientTaxRegime"
    ].filter((key) => specified(key)).length;
    return [
      Number(specified("productId")),
      Number(specified("ncm")),
      Number(specified("cest")),
      Number(routePairSpecific),
      Number(specified("destinationUf")),
      Number(specified("issuerUf")),
      operationCriteria
    ];
  };
  const compare = (a, b) => {
    for (let index = 0; index < a.length; index++) {
      if (a[index] !== b[index]) return b[index] - a[index];
    }
    return 0;
  };
  const ranked = rules.filter((rule) => {
    const effectiveFrom = Date.parse(rule.effectiveFrom || "");
    const effectiveUntil = Date.parse(rule.effectiveUntil || "");
    const active = (!Number.isFinite(effectiveFrom) || effectiveFrom <= effectiveAt) && (!rule.effectiveUntil || !Number.isFinite(effectiveUntil) || effectiveUntil >= effectiveAt);
    if (!active || rule.status === "DEPRECATED") return false;
    if (rule.status === "APPROVED")
      return matchesCompleteCriteria(facts, rule.criteria);
    return matchesKnownCriteria(facts, rule.criteria);
  }).map((rule) => ({ rule, specificity: specificity(rule) })).sort((a, b) => compare(a.specificity, b.specificity));
  if (ranked.length) {
    const bestSpecificity = ranked[0].specificity;
    const bestCandidates = ranked.filter(
      (candidate) => compare(candidate.specificity, bestSpecificity) === 0
    );
    const unresolved = bestCandidates.filter(
      ({ rule }) => rule.status === "DRAFT" || rule.status === "BLOCKED"
    );
    if (unresolved.length) {
      const details = unresolved.map(({ rule }) => {
        const review = rule.pendingReview.join(" ");
        return `${rule.id} (${rule.status})${review ? `: ${review}` : ""}`;
      }).join(" | ");
      return notApproved(
        `O cen\xE1rio mais espec\xEDfico da matriz est\xE1 pendente ou bloqueado; uma regra-base gen\xE9rica n\xE3o pode autoriz\xE1-lo. ${details}`
      );
    }
    const matchingApproved = bestCandidates.map(({ rule }) => rule);
    const invalid = matchingApproved.filter((rule) => !approvalIsComplete(rule));
    if (invalid.length) {
      return {
        status: "invalid_approved_rule",
        code: "HML_INTERSTATE_MATRIX_INVALID",
        ruleIds: invalid.map((rule) => rule.id)
      };
    }
    if (matchingApproved.length > 1) {
      return {
        status: "ambiguous",
        code: "HML_INTERSTATE_MATRIX_AMBIGUOUS",
        ruleIds: matchingApproved.map((rule) => rule.id)
      };
    }
    const best = matchingApproved[0];
    return {
      status: "approved",
      rule: best,
      ruleId: best.id,
      reason: `Regra aprovada vigente (${best.id}) aplicada sem conflito.`,
      sources: [...best.sourceReferences],
      normativeSources: [...best.normativeSources],
      // A regra APPROVED é uma decisão completa. Não reescrever CSOSN ou
      // grupos de ICMS a partir de outro resolvedor depois da seleção.
      treatment: best.treatment
    };
  }
  return notApproved("Nenhuma regra APPROVED completa e vigente corresponde aos fatos.");
}

// api/nfe/normal-sale/interstateValidation.ts
function resolveInterstateFinalConsumer(operationScope, contextData, requestFinalConsumer) {
  if (operationScope.scope !== "interstate") {
    return requestFinalConsumer;
  }
  const acquisitionPurpose = contextData.acquisitionPurpose;
  if (acquisitionPurpose !== "resale" && acquisitionPurpose !== "use_consumption" && acquisitionPurpose !== "fixed_asset") {
    throw new Error(
      "ACQUISITION_PURPOSE_REQUIRED: registre no pedido se a compra \xE9 para revenda, uso/consumo ou ativo imobilizado."
    );
  }
  const finalConsumer = acquisitionPurpose !== "resale";
  if (requestFinalConsumer !== finalConsumer) {
    throw new Error(
      "ACQUISITION_PURPOSE_MISMATCH: o indFinal enviado n\xE3o corresponde \xE0 finalidade persistida no pedido."
    );
  }
  return finalConsumer;
}
function validateInterstateNormalSaleMatrix(params) {
  const {
    facts,
    operationScope,
    modelDecision,
    initialComposition,
    customer,
    ieIndicator,
    finalConsumer,
    ruleSetVersion
  } = params;
  if (operationScope.scope !== "interstate") {
    return;
  }
  if (modelDecision.model !== "55") {
    throw new Error("NFC-e modelo 65 n\xE3o pode ser usada em opera\xE7\xE3o interestadual.");
  }
  const routeFacts = {
    environment: facts.emissionRequest.environment,
    model: modelDecision.model,
    issuerRegime: String(facts.issuerProfile.companyCRT || ""),
    issuerUf: operationScope.issuerUf || "",
    destinationUf: operationScope.operationUf || "",
    destinationScope: "INTERSTATE",
    operationType: "sale",
    purpose: "1",
    effectiveAt: facts.capturedAt
  };
  if (!hasApprovedInterstateOutboundRoute(routeFacts)) {
    throw new Error(
      `Opera\xE7\xE3o interestadual n\xE3o est\xE1 coberta pela matriz ${ruleSetVersion} (HML_INTERSTATE_MATRIX_NOT_APPROVED). A Matriz de Decis\xE3o Fiscal Interestadual de Sa\xEDda n\xE3o cont\xE9m regra APPROVED utiliz\xE1vel; CFOP candidato n\xE3o define CSOSN, ICMS, ST, DIFAL ou FCP.`
    );
  }
  const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
  const inputs = obj(facts.fiscalInputs);
  const productCatalog = obj(inputs.products);
  const recipientIeStatus = ieIndicator === "1" ? "taxpayer" : ieIndicator === "2" ? "exempt" : "non_taxpayer";
  const explicitBoolean = (...values) => values.find((value) => typeof value === "boolean");
  const merchandiseOrigin = (item, fiscal) => {
    const source = item.merchandiseOrigin ?? fiscal.merchandiseOrigin;
    if (source === "third_party" || source === "own_production") return source;
    const isOwnProduction = explicitBoolean(item.isOwnProduction, fiscal.isOwnProduction);
    return isOwnProduction === void 0 ? "third_party" : isOwnProduction ? "own_production" : "third_party";
  };
  const matrixResults = initialComposition.products.map(({ item }, index) => {
    const selected = selections[String(index + 1)];
    const itemRecord = item;
    const itemFiscal = itemRecord.fiscal && typeof itemRecord.fiscal === "object" ? itemRecord.fiscal : {};
    const productFiscalRaw = hasFiscalItemSnapshot(itemRecord) ? itemFiscal : itemRecord.productId ? productCatalog[itemRecord.productId] : void 0;
    const productFiscal = productFiscalRaw && typeof productFiscalRaw === "object" ? productFiscalRaw : {};
    const matrixFacts = {
      environment: facts.emissionRequest.environment,
      model: modelDecision.model,
      issuerRegime: String(facts.issuerProfile.companyCRT || ""),
      issuerUf: operationScope.issuerUf || "",
      destinationUf: operationScope.operationUf || "",
      destinationScope: "INTERSTATE",
      operationType: "sale",
      purpose: "1",
      recipientPersonType: customer.personType === "PF" || customer.personType === "PJ" ? customer.personType : void 0,
      recipientIeStatus,
      finalConsumer,
      merchandiseOrigin: merchandiseOrigin(itemRecord, productFiscal),
      productOrigin: selected?.origem,
      ncm: selected?.ncm,
      cest: selected?.cest,
      hasSt: explicitBoolean(
        itemFiscal.hasSt,
        itemFiscal.isSt,
        productFiscal.hasSt,
        productFiscal.isSt
      ),
      productId: typeof itemRecord.productId === "string" ? itemRecord.productId : void 0,
      effectiveAt: facts.capturedAt
    };
    const matrixResult = resolveInterstateOutboundFiscalMatrix(matrixFacts);
    if (matrixResult.status === "approved") {
      const approvedTreatment = matrixResult.treatment;
      if (selected?.cfop === "6933" || selected?.cfop === "5933") {
        throw new Error(
          `CFOP ${selected.cfop} pertence a presta\xE7\xE3o de servi\xE7o (ISSQN) e n\xE3o pode ser aplicado a venda de mercadoria.`
        );
      }
      if (selected?.cfop && selected.cfop !== approvedTreatment.cfop) {
        throw new Error(
          `CFOP escolhido diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.cfop} para opera\xE7\xE3o interestadual); nenhuma escolha foi substitu\xEDda.`
        );
      }
      if (selected?.csosn !== approvedTreatment.csosn) {
        throw new Error(
          `CSOSN ${selected?.csosn || "n\xE3o informado"} diverge do tratamento aprovado pela matriz (esperado ${approvedTreatment.csosn}); nenhuma escolha foi substitu\xEDda.`
        );
      }
    }
    return matrixResult;
  });
  const nonApproved = matrixResults.find((result) => result.status !== "approved");
  if (!matrixResults.length || nonApproved) {
    const code = nonApproved && "code" in nonApproved ? nonApproved.code : "HML_INTERSTATE_MATRIX_NOT_APPROVED";
    const reason = nonApproved && "reason" in nonApproved ? nonApproved.reason : "";
    throw new Error(
      `Opera\xE7\xE3o interestadual n\xE3o est\xE1 coberta pela matriz ${ruleSetVersion} (${code}). ${reason || "A Matriz de Decis\xE3o Fiscal Interestadual de Sa\xEDda n\xE3o cont\xE9m regra APPROVED utiliz\xE1vel; CFOP candidato n\xE3o define CSOSN, ICMS, ST, DIFAL ou FCP."}`
    );
  }
}

// api/nfe/normal-sale/items.ts
function determineNormalSaleItems(params) {
  const {
    snapshot,
    composition,
    selections,
    expectedCfop,
    isNonTaxpayerInterstate = false,
    snapshotScope,
    contribution,
    modelDecision,
    ruleSetVersion,
    code,
    freight
  } = params;
  const catalog = obj(obj(snapshot.fiscalInputs).products);
  const allowedSavedCfops = ["5101", "5102", "6101", "6102", "6107", "6108"];
  const commercialUnits = [];
  const traces = composition.products.map(({ item }, index) => {
    const selected = selections[String(index + 1)];
    const itemRecord = item;
    const saved = itemRecord.fiscal || {};
    const productFiscal = hasFiscalItemSnapshot(itemRecord) ? {} : catalog[item.productId || itemRecord.fiscalSnapshotProductId || ""] || {};
    const commercialUnit = String(
      saved.commercialUnit || productFiscal.commercialUnit || productFiscal.unit || "UN"
    );
    commercialUnits[index] = commercialUnit;
    const taxableUnit = String(saved.taxableUnit || productFiscal.taxableUnit || commercialUnit);
    if (commercialUnit !== taxableUnit)
      throw new Error(
        `Unidades comercial e tribut\xE1vel do item ${index + 1} exigem fator de convers\xE3o fiscal expl\xEDcito.`
      );
    const ownProduction = itemRecord.merchandiseOrigin === "own_production" || saved.merchandiseOrigin === "own_production" || productFiscal.merchandiseOrigin === "own_production" || itemRecord.isOwnProduction === true || saved.isOwnProduction === true || productFiscal.isOwnProduction === true;
    const hasSt = [
      itemRecord.hasSt,
      itemRecord.isSt,
      saved.hasSt,
      saved.isSt,
      productFiscal.hasSt,
      productFiscal.isSt
    ].find((value) => typeof value === "boolean");
    if (hasSt === true)
      throw new Error(
        "Venda normal interna com ST exige matriz fiscal espec\xEDfica aprovada."
      );
    const itemExpectedCfop = snapshotScope.scope === "internal" ? ownProduction ? "5101" : "5102" : isNonTaxpayerInterstate ? ownProduction ? "6107" : "6108" : ownProduction ? "6101" : "6102";
    for (const fiscal of [saved, productFiscal]) {
      if (fiscal.cfop && !allowedSavedCfops.includes(fiscal.cfop) || ["icmsPercent", "pisPercent", "cofinsPercent", "ipiPercent"].some(
        (field) => Number(fiscal[field] || 0) !== 0
      ))
        throw new Error(
          "Exce\xE7\xE3o tribut\xE1ria do pedido/cadastro exige matriz espec\xEDfica; os dados n\xE3o foram substitu\xEDdos."
        );
    }
    const override = snapshot.emissionRequest.itemCsosnOverrides?.[String(index + 1)];
    const csosn = validateCsosn(selected.csosn, String(snapshot.issuerProfile.companyCRT));
    if (override !== void 0 && override !== csosn)
      throw new Error("CSOSN confirmado diverge da escolha fiscal preparada.");
    if (selected.cfop === "6933" || selected.cfop === "5933")
      throw new Error(
        `CFOP ${selected.cfop} pertence a presta\xE7\xE3o de servi\xE7o (ISSQN) e n\xE3o pode ser aplicado a venda de mercadoria.`
      );
    if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn) || selected.cfop !== itemExpectedCfop)
      throw new Error(
        `CSOSN ou CFOP escolhido exige matriz fiscal espec\xEDfica (esperado CFOP ${itemExpectedCfop} para opera\xE7\xE3o ${snapshotScope.scope === "internal" ? "interna" : "interestadual"}); nenhuma escolha foi substitu\xEDda.`
      );
    const isSupportedContributionCst = (cst) => !cst || cst === contribution.pis.cst || cst === "49" || cst === "99";
    if (!isSupportedContributionCst(saved.pisCst) || !isSupportedContributionCst(saved.cofinsCst) || !isSupportedContributionCst(productFiscal.pisCst) || !isSupportedContributionCst(productFiscal.cofinsCst))
      throw new Error("Exce\xE7\xE3o de PIS/COFINS exige regra espec\xEDfica.");
    return {
      decisionId: `normal-sale-item-${index + 1}`,
      ruleSetVersion,
      effectiveAt: contribution.confirmedAt,
      inputFacts: {
        orderId: snapshot.order.id,
        itemNumber: index + 1,
        environment: snapshot.emissionRequest.environment,
        issuerCrt: "1",
        recipientMunicipalitySource: "IBGE",
        recipientMunicipalityCode: code
      },
      result: {
        ...selected,
        csosnSource: "confirmed_item_selection",
        contributionDecisionId: contribution.decisionId,
        contributionDecisionModel: contribution.model,
        ...contribution.sourceUrl ? { contributionSourceUrl: contribution.sourceUrl } : {},
        pisCst: contribution.pis.cst,
        cofinsCst: contribution.cofins.cst,
        modelDecision
      },
      reason: modelDecision.reason,
      approver: contribution.confirmedBy
    };
  });
  const determinedItems = composition.products.map(
    ({ item, vProdCents, vDescCents }, index) => {
      const selected = selections[String(index + 1)];
      return {
        itemNumber: index + 1,
        product: {
          // The selected variation SKU is stored in `code`; productId is an internal UUID.
          code: String(item.code || item.sku || `ITEM-${index + 1}`).slice(0, 60),
          description: required2(item.description, "Descri\xE7\xE3o comercial"),
          gtin: "SEM GTIN",
          quantity: item.quantity,
          unitValue: vProdCents / 100 / item.quantity,
          gross: vProdCents / 100,
          discount: vDescCents / 100,
          freight: index === 0 ? freight / 100 : 0,
          insurance: 0,
          otherExpenses: index === 0 ? composition.vOutroCents / 100 : 0
        },
        classification: {
          ncm: selected.ncm,
          cfop: selected.cfop,
          origin: selected.origem,
          cest: selected.cest || void 0,
          unit: commercialUnits[index]
        },
        taxes: [
          {
            group: "ICMS",
            codeSystem: "CSOSN",
            code: selected.csosn,
            values: { vICMS: 0 },
            decisionId: traces[index].decisionId
          },
          {
            group: "PIS",
            codeSystem: "CST",
            code: contribution.pis.cst,
            values: {
              vBC: contribution.pis.base,
              pPIS: contribution.pis.rate,
              vPIS: contribution.pis.value
            },
            decisionId: traces[index].decisionId
          },
          {
            group: "COFINS",
            codeSystem: "CST",
            code: contribution.cofins.cst,
            values: {
              vBC: contribution.cofins.base,
              pCOFINS: contribution.cofins.rate,
              vCOFINS: contribution.cofins.value
            },
            decisionId: traces[index].decisionId
          }
        ],
        decisions: [traces[index]]
      };
    }
  );
  const products = composition.products.reduce((sum, item) => sum + item.vProdCents, 0);
  const discount = composition.products.reduce((sum, item) => sum + item.vDescCents, 0);
  const invoice = products - discount + freight + composition.vOutroCents;
  return { traces, determinedItems, products, discount, invoice };
}

// shared-utils/orderPaymentState.ts
var normalize2 = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function classifyOrderPaymentSettlement(status) {
  if (status === void 0 || status === null) return "paid";
  const normalized2 = normalize2(String(status));
  if (normalized2.startsWith("pago")) return "paid";
  if (normalized2.startsWith("pendente")) return "pending";
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

// api/nfe/normal-sale/payments.ts
function resolveNormalSalePayments(params) {
  const { snapshot, data, shipping, modelDecision, traces, invoice } = params;
  const rawPayments = Array.isArray(data.payments) ? data.payments.map(obj) : [];
  const resolvedPayments = [];
  let paidCents = 0;
  let pendingCents = 0;
  for (let index = 0; index < rawPayments.length; index += 1) {
    const payment2 = rawPayments[index];
    const amountValue = Number(payment2.amount ?? 0);
    if (!Number.isFinite(amountValue) || amountValue < 0)
      throw new Error(`Valor do pagamento ${index + 1} inv\xE1lido.`);
    if (amountValue === 0) continue;
    const amountCents = money2(amountValue, `Pagamento ${index + 1}`, true);
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
    paymentIndicator: payment2.settlement === "paid" ? "0" : "1",
    ...payment2.description ? { description: payment2.description } : {},
    ...payment2.paymentDate ? { paymentDate: payment2.paymentDate } : {},
    ...payment2.card ? { card: payment2.card } : {},
    decision: traces[0]
  }));
  const payment = paidCents + pendingCents;
  const pendingPayments = resolvedPayments.filter((item) => item.settlement === "pending");
  const billingParts = [];
  for (const pendingPayment of pendingPayments) {
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

// shared-utils/recipientIeIndicator.ts
function resolveEffectiveRecipientIeIndicator(input) {
  for (const candidate of [input.selected, input.persisted, input.customer]) {
    const value = String(candidate ?? "").trim();
    if (value === "1" || value === "2" || value === "9") return value;
  }
  return String(input.ie ?? "").trim() ? "1" : "9";
}
function getRecipientIeIndicatorConsistencyError(indicator, ie, finalConsumer) {
  if (indicator !== "1" && indicator !== "2" && indicator !== "9") {
    return "Selecione uma situa\xE7\xE3o v\xE1lida para a Inscri\xE7\xE3o Estadual do destinat\xE1rio.";
  }
  if (indicator === "9" && finalConsumer === false) {
    return "Destinat\xE1rio n\xE3o contribuinte exige opera\xE7\xE3o com consumidor final. Revise a finalidade da compra ou a situa\xE7\xE3o fiscal do cliente antes de emitir.";
  }
  const rawIe = typeof ie === "string" ? ie.trim() : "";
  const digits2 = rawIe.replace(/\D/g, "");
  if (indicator === "1") {
    if (!digits2) {
      return "Destinat\xE1rio contribuinte do ICMS (indIEDest=1) exige Inscri\xE7\xE3o Estadual.";
    }
    if (digits2.length < 2 || digits2.length > 14) {
      return "A IE informada para indIEDest=1 deve conter de 2 a 14 d\xEDgitos.";
    }
    return null;
  }
  if (indicator === "2") {
    return rawIe ? "Destinat\xE1rio isento (indIEDest=2) n\xE3o deve possuir Inscri\xE7\xE3o Estadual informada." : null;
  }
  if (rawIe && (digits2.length < 2 || digits2.length > 14)) {
    return "A IE informada para indIEDest=9 deve conter de 2 a 14 d\xEDgitos.";
  }
  return null;
}

// api/nfe/normal-sale/municipality.ts
var municipalitiesByUf = /* @__PURE__ */ new Map();
async function municipalityCode(city, uf = "PR", existingCode) {
  if (existingCode && /^\d{7}$/.test(String(existingCode))) {
    return String(existingCode);
  }
  const normUf = uf.toUpperCase();
  let promise = municipalitiesByUf.get(normUf);
  if (!promise) {
    promise = fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normUf}/municipios`,
      { signal: AbortSignal.timeout(1e4) }
    ).then(async (response) => {
      if (!response.ok) throw new Error(`Consulta oficial IBGE indispon\xEDvel para UF ${normUf}.`);
      const data = await response.json();
      if (!Array.isArray(data) || data.some((item) => !Number.isInteger(item.id) || typeof item.nome !== "string"))
        throw new Error("Resposta oficial IBGE inv\xE1lida.");
      return data;
    }).catch((error) => {
      municipalitiesByUf.delete(normUf);
      throw error;
    });
    municipalitiesByUf.set(normUf, promise);
  }
  const list = await promise;
  const match = list.find((item) => normalize(item.nome) === normalize(city));
  if (!match)
    throw new Error(`Munic\xEDpio do destinat\xE1rio n\xE3o encontrado na fonte oficial IBGE de ${normUf}.`);
  return String(match.id);
}

// api/nfe/normal-sale/recipientScope.ts
function resolveNormalSaleCustomer(orderData, inputs) {
  const savedCustomer = orderData.customerData ? obj(orderData.customerData) : {};
  const catalogCustomer = inputs.customer ? obj(inputs.customer) : {};
  return {
    ...catalogCustomer,
    fullName: savedCustomer.fullName ?? savedCustomer.name ?? catalogCustomer.fullName,
    cpfCnpj: savedCustomer.cpfCnpj ?? catalogCustomer.cpfCnpj,
    address: savedCustomer.fullAddress ?? catalogCustomer.address,
    ie: savedCustomer.ie ?? catalogCustomer.ie,
    ieIndicator: savedCustomer.ieIndicator ?? catalogCustomer.ieIndicator,
    personType: savedCustomer.personType ?? catalogCustomer.personType
  };
}
function resolveRecipientIeContext(facts, customer, contextData) {
  const ieIndicator = resolveEffectiveRecipientIeIndicator({
    selected: facts.emissionRequest.recipientIeIndicator,
    persisted: contextData.recipientIeIndicator,
    customer: customer.ieIndicator,
    ie: facts.emissionRequest.recipientIe ?? customer.ie
  });
  const recipientIe = String(facts.emissionRequest.recipientIe ?? customer.ie ?? "");
  return { ieIndicator, recipientIe };
}
async function resolveNormalSaleRecipientAddress(params) {
  const { address: address2, requirements, issuerProfile } = params;
  const city = requirements.addressRequired ? required2(address2.city, "Munic\xEDpio real do destinat\xE1rio") : "";
  const issuerUf = String(issuerProfile.companyUF || "").toUpperCase();
  const uf = requirements.addressRequired ? required2(address2.state || address2.uf, "UF real do destinat\xE1rio").toUpperCase() : issuerUf;
  const code = requirements.addressRequired ? await municipalityCode(
    city,
    uf,
    address2.cityCode || address2.ibge || address2.municipalityCode
  ) : String(issuerProfile.companyCMun || "");
  const recipientAddress = requirements.addressRequired ? {
    street: required2(address2.street, "Logradouro real"),
    number: required2(String(address2.number || ""), "N\xFAmero real"),
    district: required2(address2.neighborhood || address2.bairro, "Bairro real"),
    municipality: city,
    municipalityCode: code,
    uf,
    postalCode: String(address2.zipCode || address2.cep || address2.postalCode || "").replace(
      /[-.]/g,
      ""
    )
  } : void 0;
  if (recipientAddress?.postalCode && !/^\d{8}$/.test(recipientAddress.postalCode)) {
    throw new Error("CEP real inv\xE1lido.");
  }
  return { recipientAddress, municipalityCode: code };
}
function validateNormalSaleRecipientRequirements(params) {
  const {
    requirements,
    model,
    cpfCnpj,
    personType,
    ieIndicator,
    recipientIe,
    finalConsumer,
    facts,
    shippingData,
    operationDestination
  } = params;
  if (!requirements.supported) {
    throw new Error(requirements.message || "Matriz fiscal n\xE3o aplic\xE1vel.");
  }
  if (operationDestination === "2" && model === "65") {
    throw new Error("NFC-e n\xE3o permite opera\xE7\xE3o interestadual; utilize NF-e modelo 55.");
  }
  if (requirements.documentRequired && !cpfCnpj) {
    throw new Error(
      `${requirements.documentType} do destinat\xE1rio \xE9 obrigat\xF3rio para esta opera\xE7\xE3o fiscal.`
    );
  }
  if (cpfCnpj && !isValidRecipientTaxId(cpfCnpj)) {
    throw new Error("CPF/CNPJ do destinat\xE1rio inv\xE1lido para esta opera\xE7\xE3o fiscal.");
  }
  if (cpfCnpj && !recipientTaxIdMatchesPersonType(cpfCnpj, personType)) {
    throw new Error(`CPF/CNPJ do destinat\xE1rio inv\xE1lido para o tipo ${personType}.`);
  }
  const ieConsistencyError = getRecipientIeIndicatorConsistencyError(
    ieIndicator,
    recipientIe,
    model === "55" ? finalConsumer : void 0
  );
  if (ieConsistencyError) {
    throw new Error(ieConsistencyError);
  }
  if (model === "65" && ieIndicator !== "9") {
    throw new Error(
      "NFC-e exige destinat\xE1rio n\xE3o contribuinte; revise a condi\xE7\xE3o fiscal da opera\xE7\xE3o."
    );
  }
  const effectiveTransporter = facts.emissionRequest.transporter || shippingData.transporter;
  if (facts.emissionRequest.transportResponsible === "THIRD_PARTY" && !effectiveTransporter) {
    throw new Error("Identifique o transportador terceirizado.");
  }
}

// api/nfe/simplesNormalSaleContribution.ts
var SUPPORTED_MODELS = ["55", "65"];
var SHARED_DECISION_ID = "fiscal_decision_simples_normal_sale_v1";
function parseSimplesNormalSaleContribution(value) {
  const scope = value?.scope;
  const declaredModels = scope?.models;
  const legacyModel = scope?.model;
  const hasSharedScope = legacyModel === void 0 && Array.isArray(declaredModels) && declaredModels.length === SUPPORTED_MODELS.length && SUPPORTED_MODELS.every((model) => declaredModels.includes(model));
  const hasLegacyScope = declaredModels === void 0 && (legacyModel === "55" || legacyModel === "65");
  if (scope?.operation !== "normal_sale" || scope.issuerCrt !== "1" || !hasSharedScope && !hasLegacyScope || typeof value.confirmedBy !== "string" || !value.confirmedBy.trim() || typeof value.confirmedAt !== "string" || !Number.isFinite(Date.parse(value.confirmedAt)) || value.pis?.cst !== "99" || value.cofins?.cst !== "99" || [value.pis, value.cofins].some((tax) => tax?.base !== 0 || tax.rate !== 0 || tax.value !== 0))
    throw new Error("Decis\xE3o persistida de PIS/COFINS fora do cen\xE1rio de venda normal CRT 1.");
  const models = hasSharedScope ? SUPPORTED_MODELS : [legacyModel];
  return {
    models,
    decisionId: hasSharedScope ? SHARED_DECISION_ID : legacyModel === "55" ? "fiscal_decision_simples_nfe55_normal_sale_v1" : "fiscal_decision_simples_nfce65_normal_sale_v1",
    pis: { cst: "99", base: 0, rate: 0, value: 0 },
    cofins: { cst: "99", base: 0, rate: 0, value: 0 },
    confirmedAt: value.confirmedAt,
    confirmedBy: value.confirmedBy,
    ...typeof value.sourceUrl === "string" && value.sourceUrl ? { sourceUrl: value.sourceUrl } : {}
  };
}
function assertContributionModelScope(decision, model) {
  if (!decision.models.includes(model))
    throw new Error(
      `A decis\xE3o persistida de PIS/COFINS n\xE3o cobre o modelo ${model} (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
}
function normalSaleContributionSettingsId() {
  return SHARED_DECISION_ID;
}
function resolveNormalSaleContribution(inputs, model) {
  const decision = inputs.contributionDecision ?? inputs.contributionDecisions?.[model];
  if (!decision)
    throw new Error(
      `Decis\xE3o de PIS/COFINS do modelo ${model} indispon\xEDvel (CONTRIBUTION_MODEL_SCOPE_REQUIRED).`
    );
  const parsed = parseSimplesNormalSaleContribution(decision);
  assertContributionModelScope(parsed, model);
  return { ...parsed, model };
}

// api/nfe/normal-sale/inputLoader.ts
async function loadNormalSaleInputs(db, facts, appSettings) {
  const items = facts.order.data.items;
  if (!Array.isArray(items)) throw new Error("Itens comerciais ausentes.");
  const ids = Array.from(
    new Set(
      items.filter((item) => item.itemType !== "service").map((item) => item.productId).filter(
        (id) => typeof id === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
      )
    )
  );
  const customerId = obj(facts.order.data.customerData).id;
  const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
  const codes = [...new Set(Object.values(selections).map((selected) => selected.ncm))];
  if (!codes.length) throw new Error("Confirme os campos fiscais de todos os itens no modal.");
  const [catalog, customer, decision, ncms] = await Promise.all([
    ids.length ? db.from("products").select("id,fiscal,unit").in("id", ids) : Promise.resolve({ data: [], error: null }),
    db.from("people").select("id,full_name,cpf_cnpj,address,rg_ie,person_type_pf_pj,deleted").eq("id", String(customerId || "")).maybeSingle(),
    db.from("settings").select("id,data").in("id", [normalSaleContributionSettingsId()]),
    db.from("ncms").select("code,active,is_active,start_date,end_date").in("code", codes)
  ]);
  if (catalog.error || customer.error || decision.error || ncms.error || !customer.data || customer.data.deleted)
    throw new Error("Cadastro real do destinat\xE1rio ou fatos fiscais indispon\xEDveis.");
  facts.fiscalInputs = {
    products: Object.fromEntries(
      (catalog.data || []).map((row) => [
        row.id,
        row.fiscal || {}
      ])
    ),
    customer: {
      id: customer.data.id,
      fullName: customer.data.full_name,
      cpfCnpj: customer.data.cpf_cnpj,
      address: customer.data.address,
      ie: customer.data.rg_ie,
      personType: customer.data.person_type_pf_pj
    },
    contributionDecision: decision.data?.find(
      (row) => row.id === normalSaleContributionSettingsId()
    )?.data || null,
    fiscalDefaults: appSettings.fiscalDefaults || null
  };
  const fiscalInputs = facts.fiscalInputs;
  const date = facts.capturedAt.slice(0, 10);
  const products = obj(fiscalInputs.products);
  const invalidSelection = Object.entries(selections).some(([itemNumber, selection]) => {
    const item = items.filter((candidate) => candidate.itemType !== "service")[Number(itemNumber) - 1];
    const savedItemFiscal = item?.fiscal && typeof item.fiscal === "object" ? item.fiscal : {};
    const savedProductFiscal = item?.productId && products[item.productId] && typeof products[item.productId] === "object" ? products[item.productId] : {};
    const originalNcm = String(savedItemFiscal.ncm || savedProductFiscal.ncm || "").replace(
      /\D/g,
      ""
    );
    return !ncms.data?.some(
      (ncm) => ncm.code === selection.ncm && ncm.active && (!ncm.start_date || ncm.start_date <= date) && (!ncm.end_date || ncm.end_date >= date) && (ncm.is_active || originalNcm === selection.ncm)
    );
  });
  if (ncms.error || invalidSelection)
    throw new Error(
      "NCM escolhido est\xE1 oficialmente inv\xE1lido ou desativado para novas sele\xE7\xF5es da loja."
    );
}

// api/nfe/normalSaleRuleSet.ts
async function createNormalSaleRuleSet(facts, ruleSetVersion = NORMAL_SALE_RULESET_VERSION) {
  const environment = facts.emissionRequest.environment;
  if (environment !== 1 && environment !== 2) throw new Error("Ambiente fiscal inv\xE1lido.");
  const inputs = obj(facts.fiscalInputs);
  const orderData = facts.order.data;
  const contextData = orderData.fiscalContext ? obj(orderData.fiscalContext) : {};
  const shippingData = orderData.shipping ? obj(orderData.shipping) : {};
  if (!["delivery", "pickup"].includes(String(shippingData.deliveryMethod || ""))) {
    throw new Error(
      "Modalidade atual do pedido ausente ou inv\xE1lida; confirme entrega ou retirada."
    );
  }
  const customer = resolveNormalSaleCustomer(orderData, inputs);
  const { ieIndicator, recipientIe } = resolveRecipientIeContext(facts, customer, contextData);
  const address2 = getFiscalRecipientAddress({
    ...orderData,
    customerData: { ...obj(orderData.customerData || {}), fullAddress: customer.address }
  });
  const operationScope = resolveFiscalCfopOrderScope({
    issuerUf: String(facts.issuerProfile.companyUF || ""),
    deliveryMethod: String(shippingData.deliveryMethod || ""),
    shipping: shippingData,
    customerAddress: customer.address
  });
  if (operationScope.destination === null) {
    throw new Error(operationScope.reason || "Local f\xEDsico da opera\xE7\xE3o fiscal n\xE3o identificado.");
  }
  if (operationScope.scope === "foreign") {
    throw new Error("Opera\xE7\xE3o com exterior exige matriz fiscal espec\xEDfica aprovada.");
  }
  const finalConsumer = resolveInterstateFinalConsumer(
    operationScope,
    contextData,
    facts.emissionRequest.finalConsumer
  );
  const initialComposition = composeServiceFiscalValues(orderData.items);
  const modelTotal = initialComposition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) + initialComposition.vOutroCents + money2(shippingData.value ?? 0, "Frete comercial");
  const decisionOrder = {
    ...orderData,
    orderType: facts.order.type,
    paymentsSummary: { totalOrderValue: modelTotal / 100 },
    items: orderData.items.filter((item) => item.itemType !== "service").map((item, index) => ({
      ...item,
      fiscal: {
        ...item.fiscal,
        cfop: facts.emissionRequest.itemFiscalSelections?.[String(index + 1)]?.cfop || item.fiscal?.cfop
      }
    }))
  };
  const modelDecision = resolveOrderFiscalModel(decisionOrder, {
    issuerUf: String(facts.issuerProfile.companyUF || ""),
    finalConsumer,
    recipientAddress: address2
  });
  if (modelDecision.status !== "ready") throw new Error(modelDecision.reason);
  if (modelDecision.reasons.some(
    (reason) => ![
      "RETAIL_FINAL_CONSUMER_IN_STATE",
      "INTERSTATE_OPERATION",
      "RESALE",
      "VALUE_LIMIT"
    ].includes(reason) && !(reason === "OTHER_FISCAL_REQUIREMENT" && (ieIndicator === "1" || contextData.otherFiscalRequirement === true))
  )) {
    throw new Error(
      `${modelDecision.reason} Esta opera\xE7\xE3o exige matriz tribut\xE1ria espec\xEDfica aprovada.`
    );
  }
  const deliveryMethod = shippingData.deliveryMethod;
  validateInterstateNormalSaleMatrix({
    facts,
    operationScope,
    modelDecision,
    initialComposition,
    customer,
    ieIndicator,
    finalConsumer,
    ruleSetVersion
  });
  const contribution = resolveNormalSaleContribution(inputs, modelDecision.model);
  const issuerCnpj = normalizeRecipientTaxId(String(facts.issuerProfile.companyCnpj || ""));
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(issuerCnpj)) throw new Error("CNPJ do emitente inv\xE1lido.");
  if (facts.issuerProfile.companyCRT !== "1" || facts.issuerProfile.companyUF !== "PR") {
    throw new Error("Regra de venda normal exige emitente Simples Nacional no Paran\xE1.");
  }
  const cpfCnpj = normalizeRecipientTaxId(
    String(facts.emissionRequest.recipientTaxId ?? customer.cpfCnpj ?? "")
  );
  const personType = customer.personType === "PF" || customer.personType === "PJ" ? customer.personType : void 0;
  const presence = fiscalPresence(modelDecision.model, deliveryMethod, contextData.presence);
  const requirements = decideFiscalRecipientRequirements({
    model: modelDecision.model,
    presence,
    total: modelTotal / 100,
    personType,
    recipientTaxId: cpfCnpj,
    operationScope: "NORMAL_DOMESTIC_SALE"
  });
  const { recipientAddress, municipalityCode: code } = await resolveNormalSaleRecipientAddress({
    address: address2,
    requirements,
    issuerProfile: facts.issuerProfile
  });
  validateNormalSaleRecipientRequirements({
    requirements,
    model: modelDecision.model,
    cpfCnpj,
    personType,
    ieIndicator,
    recipientIe,
    finalConsumer: modelDecision.finalConsumer,
    facts,
    shippingData,
    operationDestination: operationScope.destination
  });
  return {
    version: ruleSetVersion,
    approvedBy: contribution.confirmedBy,
    approvedAt: contribution.confirmedAt,
    effectiveFrom: contribution.confirmedAt,
    issuerCnpj,
    determine: (snapshot, hash) => {
      if (snapshot.emissionRequest.environment !== environment || snapshot.order.deleted || snapshot.order.type !== "sale" || ["draft", "cancelled", "cancelado"].includes(snapshot.order.status.toLowerCase())) {
        throw new Error("Pedido n\xE3o eleg\xEDvel para venda normal neste ambiente.");
      }
      const data = snapshot.order.data;
      const snapshotShipping = data.shipping ? obj(data.shipping) : {};
      const snapshotCustomer = data.customerData ? obj(data.customerData) : {};
      const snapshotScope = resolveFiscalCfopOrderScope({
        issuerUf: String(snapshot.issuerProfile.companyUF || ""),
        deliveryMethod: String(snapshotShipping.deliveryMethod || ""),
        shipping: snapshotShipping,
        customerAddress: snapshotCustomer.fullAddress || snapshotCustomer.address || customer.address || void 0
      });
      if (snapshotScope.destination === null) {
        throw new Error(
          snapshotScope.reason || "Local f\xEDsico da opera\xE7\xE3o fiscal n\xE3o identificado."
        );
      }
      const recipientCpfCnpj = normalizeRecipientTaxId(
        String(snapshot.emissionRequest.recipientTaxId ?? customer.cpfCnpj ?? "")
      );
      const items = data.items;
      const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
      const composition = composeServiceFiscalValues(items);
      if (!composition.products.length || Object.keys(selections).length !== composition.products.length) {
        throw new Error("Campos confirmados n\xE3o cobrem todos os produtos.");
      }
      for (const item of items) {
        if (typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isFinite(item.quantity)) {
          throw new Error("Quantidade comercial inv\xE1lida.");
        }
        money2(item.unitPrice, "Pre\xE7o comercial", true);
        if (item.unitDiscount !== void 0) money2(item.unitDiscount, "Desconto comercial");
        if (item.unitDiscount && !["fixed", "percentage"].includes(item.discountType)) {
          throw new Error("Tipo de desconto ausente ou n\xE3o suportado.");
        }
        if (item.discountType === "percentage" && item.unitDiscount > 100 || item.discountType === "fixed" && item.unitDiscount > item.unitPrice) {
          throw new Error("Desconto excede o pre\xE7o comercial.");
        }
      }
      const shipping = data.shipping ? obj(data.shipping) : {};
      const freight = money2(shipping.value ?? 0, "Frete comercial");
      const isNonTaxpayerInterstate = snapshotScope.scope === "interstate" && ieIndicator === "9";
      const expectedCfop = snapshotScope.scope === "internal" ? "5102" : isNonTaxpayerInterstate ? "6108" : "6102";
      const { traces, determinedItems, products, discount, invoice } = determineNormalSaleItems({
        snapshot,
        composition,
        selections,
        expectedCfop,
        isNonTaxpayerInterstate,
        snapshotScope,
        contribution,
        modelDecision,
        ruleSetVersion,
        code,
        freight
      });
      const { payments, payment, billingInstallments } = resolveNormalSalePayments({
        snapshot,
        data,
        shipping,
        modelDecision,
        traces,
        invoice
      });
      const issuer = snapshot.issuerProfile;
      const issuerAddress = {
        street: required2(issuer.companyLogradouro, "Logradouro emitente"),
        number: required2(issuer.companyNumero, "N\xFAmero emitente"),
        district: required2(issuer.companyBairro, "Bairro emitente"),
        municipalityCode: required2(issuer.companyCMun, "IBGE emitente"),
        municipality: required2(issuer.companyXMun, "Munic\xEDpio emitente"),
        uf: required2(issuer.companyUF, "UF emitente"),
        postalCode: required2(issuer.companyCEP, "CEP emitente").replace(/\D/g, "")
      };
      const isDelivery = shipping.deliveryMethod === "delivery";
      const snapshotDeliveryMethod = isDelivery ? "delivery" : "pickup";
      const effectiveTransporter = snapshot.emissionRequest.transporter || shipping.transporter;
      const rawResponsible = snapshot.emissionRequest.transportResponsible || (snapshot.emissionRequest.deliveryByIssuer === true ? "OWN_COMPANY" : snapshot.emissionRequest.deliveryByIssuer === false && effectiveTransporter ? "THIRD_PARTY" : void 0);
      const resolvedTransport = resolveTransport({
        fiscalModel: modelDecision.model,
        deliveryMethod: snapshotDeliveryMethod,
        hasTransport: snapshot.emissionRequest.hasTransport,
        transportResponsible: rawResponsible,
        freightContractResponsible: snapshot.emissionRequest.freightContractResponsible
      });
      const resolvedTransporter = resolvedTransport.isEmitterTransporter && modelDecision.model === "55" ? {
        cnpj: normalizeRecipientTaxId(String(issuer.companyCnpj || "")),
        name: String(issuer.companyName || ""),
        ie: String(issuer.companyIE || "").replace(/\D/g, ""),
        city: issuerAddress.municipality,
        uf: issuerAddress.uf
      } : resolvedTransport.requiresTransporterData && effectiveTransporter ? effectiveTransporter : void 0;
      return {
        snapshotHash: hash,
        ruleSetVersion,
        model: modelDecision.model,
        modelDecision,
        environment: snapshot.emissionRequest.environment,
        issuer: {
          cnpj: normalizeRecipientTaxId(required2(issuer.companyCnpj, "CNPJ emitente")),
          name: required2(issuer.companyName, "Raz\xE3o social"),
          ie: required2(issuer.companyIE, "IE emitente").replace(/\D/g, ""),
          crt: "1",
          municipalityCode: issuerAddress.municipalityCode,
          address: issuerAddress
        },
        recipient: {
          name: customer.fullName || "CONSUMIDOR FINAL",
          cpfCnpj: recipientCpfCnpj,
          ...personType ? { personType } : {},
          ieIndicator,
          ...ieIndicator === "1" ? { ie: required2(recipientIe, "IE destinat\xE1rio").replace(/\D/g, "") } : {},
          address: recipientAddress
        },
        operation: {
          natureOfOperation: "VENDA DE MERCADORIA",
          direction: "outbound",
          purpose: "1",
          destination: snapshotScope.destination || "1",
          presence,
          finalConsumer: modelDecision.finalConsumer ? "1" : "0",
          freightMode: resolvedTransport.modFrete,
          ...resolvedTransporter ? { transporter: resolvedTransporter } : {}
        },
        items: determinedItems,
        payments,
        ...billingInstallments?.length ? { billingInstallments } : {},
        decisions: traces,
        totals: {
          icmsBase: 0,
          products: products / 100,
          discount: discount / 100,
          freight: freight / 100,
          insurance: 0,
          otherExpenses: composition.vOutroCents / 100,
          icms: 0,
          icmsExempt: 0,
          fcp: 0,
          icmsStBase: 0,
          icmsSt: 0,
          fcpSt: 0,
          fcpStRetained: 0,
          ii: 0,
          ipi: 0,
          ipiReturned: 0,
          pis: 0,
          cofins: 0,
          invoice: invoice / 100,
          payment: payment / 100,
          change: 0
        }
      };
    }
  };
}

// api/nfe/paranaIssuerIe.ts
function validateParanaIssuerIe(value) {
  const supplied = String(value ?? "").trim();
  const ie = supplied.replace(/[.\s-]/g, "");
  const digit = (base) => {
    let sum = 0;
    for (let index = base.length - 1, weight = 2; index >= 0; index--, weight = weight === 7 ? 2 : weight + 1)
      sum += Number(base[index]) * weight;
    const result = 11 - sum % 11;
    return String(result >= 10 ? 0 : result);
  };
  if (!/^[\d.\s-]+$/.test(supplied) || !/^\d{10}$/.test(ie) || /^0+$/.test(ie) || ie[8] !== digit(ie.slice(0, 8)) || ie[9] !== digit(ie.slice(0, 9)))
    throw new Error(
      "Inscri\xE7\xE3o estadual do emitente inv\xE1lida para o Paran\xE1. Confira o n\xFAmero no cadastro da Receita/PR ou com a contabilidade."
    );
}

// api/nfe/responsibleTechnician.ts
var import_node_crypto6 = require("node:crypto");
function readResponsibleTechnicianConfig(env = process.env, environment = 2) {
  const cnpj = normalizeFiscalIdentifier(env.NFE_RESP_TECH_CNPJ || env.NFE_RESPONSIBLE_TECH_CNPJ);
  const contact = String(
    env.NFE_RESP_TECH_CONTACT || env.NFE_RESPONSIBLE_TECH_CONTACT || ""
  ).trim();
  const email = String(env.NFE_RESP_TECH_EMAIL || env.NFE_RESPONSIBLE_TECH_EMAIL || "").trim();
  const phone = String(env.NFE_RESP_TECH_PHONE || env.NFE_RESPONSIBLE_TECH_PHONE || "").replace(
    /\D/g,
    ""
  );
  const csrtId = String(
    environment === 2 ? env.NFE_ID_CSRT_HOMOLOGACAO || env.NFE_CSRT_ID || "" : env.NFE_ID_CSRT_PRODUCAO || env.NFE_CSRT_ID || ""
  ).trim();
  const csrt = String(
    environment === 2 ? env.NFE_CSRT_HOMOLOGACAO || env.NFE_CSRT_SECRET || "" : env.NFE_CSRT_PRODUCAO || env.NFE_CSRT_SECRET || ""
  ).trim();
  return { cnpj, contact, email, phone, csrtId, csrt };
}
function invalidConfigurationFields(config) {
  const validations = [
    ["responsibleTechnician.cnpj", /^[A-Z0-9]{12}[0-9]{2}$/.test(config.cnpj)],
    ["responsibleTechnician.contact", config.contact.length >= 2 && config.contact.length <= 60],
    ["responsibleTechnician.email", config.email.length >= 6 && config.email.length <= 60],
    ["responsibleTechnician.phone", /^\d{6,14}$/.test(config.phone)],
    ["responsibleTechnician.csrtId", /^\d{2}$/.test(config.csrtId)],
    ["responsibleTechnician.csrt", /^[A-Za-z0-9]{16,36}$/.test(config.csrt)]
  ];
  return validations.filter(([, valid]) => !valid).map(([field]) => field);
}
function getResponsibleTechnicianConfigurationIssues(env = process.env, environment = 2) {
  return invalidConfigurationFields(readResponsibleTechnicianConfig(env, environment));
}
function getResponsibleTechnicianConfig(env = process.env, environment = 2) {
  const config = readResponsibleTechnicianConfig(env, environment);
  return invalidConfigurationFields(config).length ? null : config;
}
function escapeXml2(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function appendResponsibleTechnician(xml, accessKey, config) {
  if (!ACCESS_KEY_PATTERN.test(accessKey)) throw new Error("Chave de acesso inv\xE1lida para CSRT.");
  if (/<infRespTec(?:\s|>)/.test(xml))
    throw new Error("O XML j\xE1 cont\xE9m infRespTec; o grupo deve ser gerado pelo servidor.");
  const infNfeCloseIndex = xml.lastIndexOf("</infNFe>");
  if (infNfeCloseIndex === -1) throw new Error("Grupo infNFe ausente no XML da NF-e.");
  const hashCSRT = (0, import_node_crypto6.createHash)("sha1").update(`${config.csrt}${accessKey}`, "utf8").digest("base64");
  const responsibleTechnicianXml = `<infRespTec><CNPJ>${config.cnpj}</CNPJ><xContato>${escapeXml2(config.contact)}</xContato><email>${escapeXml2(config.email)}</email><fone>${config.phone}</fone><idCSRT>${config.csrtId}</idCSRT><hashCSRT>${hashCSRT}</hashCSRT></infRespTec>`;
  return `${xml.slice(0, infNfeCloseIndex)}${responsibleTechnicianXml}${xml.slice(infNfeCloseIndex)}`;
}
function hasResponsibleTechnicianCsrt(xml) {
  return /<infRespTec(?:\s|>)[\s\S]*?<idCSRT>\d{2}<\/idCSRT>[\s\S]*?<hashCSRT>[A-Za-z0-9+/]{27}={0,1}<\/hashCSRT>[\s\S]*?<\/infRespTec>/.test(
    xml
  );
}

// api/nfe/normal-sale/testOrderProductionGuard.ts
var isSyntheticOrderBlockedInProduction = (environment, persistedOrderData) => {
  if (environment !== 1 || !persistedOrderData || typeof persistedOrderData !== "object") {
    return false;
  }
  return persistedOrderData.is_test === true;
};

// api/nfe/emitNormalSale.ts
async function emitNormalSale(db, command, candidate, appSettings, actorId) {
  if (isSyntheticOrderBlockedInProduction(command.environment, candidate.order.data))
    return outboundFailure(
      403,
      "TEST_ORDER_PRODUCTION_BLOCKED",
      "Pedidos marcados como teste n\xE3o podem ser emitidos em Produ\xE7\xE3o.",
      { numberReserved: false, sefazContacted: false }
    );
  const recovered = command.previewOnly ? null : await recoverNormalSale(db, command);
  if (recovered) return recovered;
  const gate = command.previewOnly ? null : productionTransmissionGate(command.environment, command.productionConfirmed === true);
  if (gate)
    return { ...gate, body: { ...gate.body, numberReserved: false, sefazContacted: false } };
  if (command.supersedesDocumentId)
    return outboundFailure(
      409,
      "FISCAL_REPLACEMENT_POLICY_REQUIRED",
      "A substitui\xE7\xE3o deve seguir a pol\xEDtica de corre\xE7\xE3o do documento original.",
      { numberReserved: false, sefazContacted: false }
    );
  if (candidate.order.data.fiscalScenario === "HML_TECHNICAL_V1")
    return outboundFailure(
      422,
      "SYNTHETIC_FISCAL_SCENARIO",
      "Fixture t\xE9cnica n\xE3o pertence ao fluxo de venda normal.",
      { numberReserved: false, sefazContacted: false }
    );
  const facts = structuredClone(candidate);
  let preparationSubmitted = false;
  try {
    await withNfeEmissionStage(
      "inputs_fetch",
      () => loadNormalSaleInputs(db, facts, appSettings),
      { emissionRequestId: command.emissionRequestId }
    );
    let rules = await createNormalSaleRuleSet(facts);
    const preflight = resolveFiscalDocument(facts, rules);
    if (preflight.status !== "ready") {
      console.error("[PREFLIGHT BLOCKERS]", JSON.stringify(preflight.blockers));
      return outboundFailure(
        422,
        "FISCAL_DETERMINATION_REQUIRED",
        "O pedido n\xE3o passou pela determina\xE7\xE3o fiscal.",
        { blockers: preflight.blockers, numberReserved: false, sefazContacted: false }
      );
    }
    validateParanaIssuerIe(preflight.document.issuer.ie);
    const model = preflight.document.model;
    const inputs = obj(facts.fiscalInputs);
    const decisions = inputs.contributionDecisions ? obj(inputs.contributionDecisions) : {};
    const { contributionDecisions: _allDecisions, ...ownInputs } = inputs;
    facts.fiscalInputs = {
      ...ownInputs,
      contributionDecision: inputs.contributionDecision ?? decisions[model]
    };
    facts.emissionRequest.modelDecision = preflight.document.modelDecision;
    facts.emissionRequest.finalConsumer = preflight.document.operation.finalConsumer === "1";
    rules = await createNormalSaleRuleSet(facts);
    const resolved = resolveFiscalDocument(facts, rules);
    if (resolved.status !== "ready" || resolved.document.model !== model)
      throw new Error("Modelo fiscal divergiu durante a prepara\xE7\xE3o.");
    const sequence = resolveNfeSequenceSettings(appSettings, model, command.environment);
    if (!Number.isInteger(sequence.minimumNumber) || sequence.minimumNumber < 1 || sequence.minimumNumber > 999999999)
      throw new Error("N\xFAmero inicial fiscal inv\xE1lido.");
    if (command.requestedNumber !== void 0 && command.requestedNumber < sequence.minimumNumber)
      throw new Error(
        `A numera\xE7\xE3o deve ser igual ou superior ao in\xEDcio configurado (${sequence.minimumNumber}).`
      );
    const minimum = command.requestedNumber ?? sequence.minimumNumber;
    const tech = getResponsibleTechnicianConfig(process.env, command.environment);
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!tech || !pfx)
      return outboundFailure(
        503,
        "FISCAL_CERTIFICATE_OR_CSRT_UNAVAILABLE",
        "Certificado A1 ou respons\xE1vel t\xE9cnico/CSRT n\xE3o configurado para o ambiente.",
        {
          numberReserved: false,
          sefazContacted: false,
          configurationIssues: [
            ...getResponsibleTechnicianConfigurationIssues(process.env, command.environment),
            ...!pfx ? ["certificate.base64"] : []
          ]
        }
      );
    const certificate = await withNfeEmissionStage(
      "cert_extract",
      () => extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ""),
      { emissionRequestId: command.emissionRequestId }
    );
    const issuedAt = saoPauloEmissionTimestamp(facts.capturedAt);
    const code = (0, import_node_crypto7.createHash)("sha256").update(command.emissionRequestId).digest("hex");
    const randomCode = String(Number.parseInt(code.slice(0, 10), 16) % 1e8).padStart(8, "0");
    for (let preparation = 0; preparation < 3; preparation++) {
      const peek = await withNfeEmissionStage(
        "number_peek_rpc",
        () => db.rpc("peek_nfe_outbound_number", {
          p_issuer_cnpj: resolved.document.issuer.cnpj,
          p_model: model,
          p_environment: command.environment,
          p_series: sequence.series,
          p_minimum: minimum
        }),
        { emissionRequestId: command.emissionRequestId }
      );
      if (peek.error || !Number.isInteger(peek.data))
        return outboundFailure(
          503,
          "FISCAL_SEQUENCE_UNAVAILABLE",
          "N\xE3o foi poss\xEDvel consultar a pr\xF3xima numera\xE7\xE3o fiscal.",
          { numberReserved: false, sefazContacted: false }
        );
      const number = peek.data;
      if (command.requestedNumber !== void 0 && number !== command.requestedNumber)
        return outboundFailure(
          409,
          "NFE_NUMBER_ALREADY_USED",
          "A numera\xE7\xE3o solicitada j\xE1 est\xE1 reservada ou foi utilizada.",
          {
            numberReserved: false,
            sefazContacted: false,
            numberConflict: { requestedNumber: command.requestedNumber, nextNumber: number },
            nfeNumber: command.requestedNumber
          }
        );
      const accessKey = generateNfeAccessKey({
        ufCode: "41",
        yearMonth: issuedAt.slice(2, 4) + issuedAt.slice(5, 7),
        cnpj: resolved.document.issuer.cnpj,
        model,
        series: sequence.series,
        number,
        emissionType: "1",
        randomCode
      }).accessKey;
      const snapshot = {
        ...facts,
        resolvedDocument: resolved.document,
        emissionRequest: {
          ...facts.emissionRequest,
          requestedModel: model,
          series: sequence.series,
          number
        }
      };
      let xml = await withNfeEmissionStage(
        "xml_serialization",
        () => serializeFiscalDocument(facts, resolved.document, rules, {
          accessKey,
          series: Number(sequence.series),
          number,
          issuedAt
        }),
        { emissionRequestId: command.emissionRequestId }
      );
      xml = appendResponsibleTechnician(xml, accessKey, tech);
      await withNfeEmissionStage(
        "xml_unsigned_validation",
        () => validateUnsignedNfeStructure(xml),
        { emissionRequestId: command.emissionRequestId }
      );
      const signedXml = await withNfeEmissionStage(
        "xml_signing",
        () => signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64),
        { emissionRequestId: command.emissionRequestId }
      );
      if (command.previewOnly) {
        await withNfeEmissionStage(
          "xml_schema_validation",
          () => validateNfeAgainstOfficialSchema(signedXml),
          { emissionRequestId: command.emissionRequestId }
        );
      }
      await assertXmlFiscalSelections(snapshot, signedXml);
      const identity = {
        series: sequence.series,
        number,
        accessKey
      };
      assertSignedFiscalXmlMatchesSnapshot(
        snapshot,
        resolved.document,
        signedXml,
        { ...identity, issuedAt },
        certificate.certPem
      );
      const previewFingerprint = fiscalPreviewFingerprint(
        snapshot,
        resolved.document,
        { ...identity, issuedAt },
        signedXml
      );
      if (command.previewOnly)
        return {
          status: 200,
          body: {
            success: true,
            preview: true,
            previewStatus: "PREVIEW_ONLY_NOT_AUTHORIZED",
            signedXml,
            previewProof: {
              fingerprint: previewFingerprint,
              capturedAt: facts.capturedAt,
              issuedAt,
              model,
              series: sequence.series,
              number,
              accessKey
            },
            orderId: command.orderId,
            emissionRequestId: command.emissionRequestId,
            model,
            series: sequence.series,
            nfeNumber: number,
            accessKey,
            environment: command.environment,
            numberReserved: false,
            sefazContacted: false
          }
        };
      const token = (0, import_node_crypto7.randomUUID)();
      preparationSubmitted = true;
      const saved = await withNfeEmissionStage(
        "prepare_attempt_rpc",
        () => db.rpc("prepare_nfe_outbound_attempt", {
          p_snapshot: { ...snapshot, decisionTrace: resolved.document.decisions },
          p_signed_xml: signedXml,
          p_access_key: accessKey,
          p_request_command: fiscalAttemptCommand(command),
          p_attempt_token: token,
          p_actor_id: actorId,
          p_minimum_number: minimum
        }),
        { emissionRequestId: command.emissionRequestId }
      );
      if (saved.error?.message.includes("FISCAL_SEQUENCE_CHANGED") && command.requestedNumber === void 0) {
        preparationSubmitted = false;
        continue;
      }
      if (saved.error || !saved.data?.documentId) {
        const recovery = await recoverNormalSale(db, command);
        if (recovery) return recovery;
        const reason = saved.error?.message.match(/\b[A-Z][A-Z_]{4,}\b/)?.[0] || "FISCAL_PREPARATION_FAILED";
        if (reason === "ALREADY_ACTIVE_FISCAL_ATTEMPT")
          return await describeActiveNormalSaleConflict(db, command, resolved.document.issuer.cnpj);
        if (!saved.error?.code && (!reason || reason === "FISCAL_PREPARATION_FAILED"))
          return outboundFailure(
            503,
            "FISCAL_PREPARATION_UNCONFIRMED",
            "A resposta da prepara\xE7\xE3o n\xE3o foi confirmada. Preserve esta inten\xE7\xE3o e consulte antes de repetir.",
            {
              pending: true,
              emissionRequestId: command.emissionRequestId,
              orderId: command.orderId,
              environment: command.environment,
              sefazContacted: false
            }
          );
        return outboundFailure(
          reason === "IDEMPOTENCY_KEY_REUSED" ? 409 : 503,
          reason,
          reason === "FISCAL_SOURCE_CHANGED" ? "Os dados do pedido, produtos ou cliente foram alterados durante a prepara\xE7\xE3o. Atualize os dados fiscais e tente novamente." : saved.error?.message || "A prepara\xE7\xE3o fiscal n\xE3o foi conclu\xEDda. Atualize os dados ou consulte a tentativa original.",
          { numberReserved: false, sefazContacted: false, pending: false }
        );
      }
      preparationSubmitted = false;
      return reconcileNormalSale(
        db,
        saved.data.documentId,
        true,
        command.productionConfirmed === true,
        saved.data.created ? token : void 0,
        certificate
      );
    }
    return outboundFailure(
      409,
      "FISCAL_SEQUENCE_BUSY",
      "A numera\xE7\xE3o mudou durante a prepara\xE7\xE3o. Repita a mesma solicita\xE7\xE3o.",
      { numberReserved: false, sefazContacted: false }
    );
  } catch (error) {
    if (preparationSubmitted) {
      try {
        const recovery = await recoverNormalSale(db, command);
        if (recovery) return recovery;
      } catch {
      }
      return outboundFailure(
        503,
        "FISCAL_PREPARATION_UNCONFIRMED",
        "A resposta da prepara\xE7\xE3o n\xE3o foi confirmada. Preserve esta inten\xE7\xE3o e consulte antes de repetir.",
        {
          pending: true,
          emissionRequestId: command.emissionRequestId,
          orderId: command.orderId,
          environment: command.environment,
          sefazContacted: false
        }
      );
    }
    return outboundFailure(
      422,
      "FISCAL_PREPARATION_INVALID",
      error instanceof Error ? error.message : "Prepara\xE7\xE3o fiscal inv\xE1lida.",
      {
        numberReserved: false,
        sefazContacted: false,
        ...error instanceof FiscalXmlAuditError ? {
          fiscalMismatchFields: error.mismatches.map(({ field, expected, actual }) => ({
            field,
            snapshotValue: String(expected),
            currentValue: String(actual)
          }))
        } : {}
      }
    );
  }
}

// erp/src/pages/utils/nfe/fiscalAuthorization.ts
var FISCAL_OPERATOR_ROLES = ["manager", "administrator"];
var fiscalOperatorRoles = new Set(FISCAL_OPERATOR_ROLES);
function hasFiscalOperationRole(profile) {
  if (!profile) return false;
  const roles = /* @__PURE__ */ new Set();
  if (typeof profile.role === "string") roles.add(profile.role);
  if (Array.isArray(profile.roles)) {
    for (const role of profile.roles) {
      if (typeof role === "string") roles.add(role);
    }
  }
  return Array.from(roles).some((role) => fiscalOperatorRoles.has(role));
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

// api/nfe/emitHmlTechnical.ts
var import_node_crypto10 = require("node:crypto");

// api/nfe/hmlTechnicalRuleSet.ts
var HML_TECHNICAL_RULESET_VERSION = "HML_TECHNICAL_V1";
var record2 = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Dado sint\xE9tico fiscal ausente.");
  return value;
};
var string = (value, field) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} ausente.`);
  return value.trim();
};
var digits = (value, size, field) => {
  const result = string(value, field).replace(/\D/g, "");
  if (result.length !== size) throw new Error(`${field} inv\xE1lido.`);
  return result;
};
var amount = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw new Error(`${field} deve ser positivo e em centavos.`);
  return value;
};
var address = (value, prefix) => ({
  street: string(value[`${prefix}Logradouro`], "Logradouro"),
  number: string(value[`${prefix}Numero`], "N\xFAmero"),
  district: string(value[`${prefix}Bairro`], "Bairro"),
  municipalityCode: digits(value[`${prefix}CMun`], 7, "C\xF3digo IBGE"),
  municipality: string(value[`${prefix}XMun`], "Munic\xEDpio"),
  uf: string(value[`${prefix}UF`], "UF"),
  postalCode: digits(value[`${prefix}CEP`], 8, "CEP")
});
function createHmlTechnicalRuleSet(snapshot, savedDecision, csosnConfiguration) {
  if (snapshot.emissionRequest.environment !== 2)
    throw new Error("PRODUCTION_FISCAL_RULESET_REQUIRED");
  parseHmlCsosnConfiguration(csosnConfiguration);
  if (savedDecision.productionApproved !== false || savedDecision.scope?.model !== "55" || savedDecision.scope?.operation !== "normal_sale" || savedDecision.scope?.issuerCrt !== "1" || !savedDecision.confirmedBy || !savedDecision.confirmedAt || !Number.isFinite(Date.parse(savedDecision.confirmedAt)) || savedDecision.pis?.cst !== "99" || savedDecision.cofins?.cst !== "99" || [savedDecision.pis, savedDecision.cofins].some(
    (tax) => tax?.base !== 0 || tax.rate !== 0 || tax.value !== 0
  ))
    throw new Error("Decis\xE3o persistida de PIS/COFINS para HML indispon\xEDvel.");
  const issuerCnpj = normalizeFiscalIdentifier(snapshot.issuerProfile.companyCnpj);
  if (!isValidCnpj(issuerCnpj)) throw new Error("CNPJ do emitente inv\xE1lido.");
  if (snapshot.issuerProfile.companyCRT !== "1" || snapshot.issuerProfile.companyUF !== "PR")
    throw new Error("Regra HML exige emitente Simples Nacional no Paran\xE1.");
  return {
    version: HML_TECHNICAL_RULESET_VERSION,
    approvedBy: "operator_instruction_hml_technical_only",
    approvedAt: savedDecision.confirmedAt,
    effectiveFrom: savedDecision.confirmedAt,
    issuerCnpj,
    technicalHomologationOnly: true,
    determine: (facts, hash) => {
      const data = facts.order.data;
      const runId = string(data.testRunId, "Identificador de teste");
      if (!/^TEST_AUT_[0-9a-f-]{36}$/i.test(runId) || facts.order.id !== runId || data.fiscalScenario !== HML_TECHNICAL_RULESET_VERSION || facts.order.type !== "sale" || facts.order.status !== "draft" || facts.order.deleted !== true || data.deleted !== true || !Array.isArray(data.payments) || data.payments.length !== 0)
        throw new Error(
          "HML exige pedido sint\xE9tico em rascunho, exclu\xEDdo dos indicadores e sem pagamentos operacionais."
        );
      const items = data.items;
      const payments = data.fiscalTestPayments;
      if (!Array.isArray(items) || items.length !== 1 || !Array.isArray(payments) || payments.length !== 1)
        throw new Error("HML t\xE9cnico exige um item e um pagamento sint\xE9ticos.");
      const item = record2(items[0]);
      if (Object.keys(facts.emissionRequest.itemCsosnOverrides || {}).some((key) => key !== "1"))
        throw new Error("Escolha de CSOSN referencia item inexistente no cen\xE1rio HML.");
      const fiscal = item.fiscal ? record2(item.fiscal) : {};
      const selections = parseFiscalItemSelections(facts.emissionRequest.itemFiscalSelections);
      if (Object.keys(selections).some((key) => key !== "1"))
        throw new Error("Sele\xE7\xE3o fiscal referencia item inexistente.");
      const selected = selections["1"];
      const csosn = resolveItemCsosn({
        configuration: csosnConfiguration,
        environment: 2,
        issuerCrt: String(facts.issuerProfile.companyCRT),
        manual: facts.emissionRequest.itemCsosnOverrides?.["1"]
      });
      if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn.csosn))
        throw new Error(
          `CSOSN ${csosn.csosn} exige regra espec\xEDfica e grupos tribut\xE1rios ainda n\xE3o dispon\xEDveis neste cen\xE1rio HML.`
        );
      const origin = selected?.origem ?? (fiscal.origem === void 0 || fiscal.origem === "" ? "0" : String(fiscal.origem));
      if (!/^[0-8]$/.test(origin)) throw new Error("Origem fiscal inv\xE1lida no item HML.");
      const payment = record2(payments[0]);
      if (item.isTemporaryProduct !== true || item.productId || item.unitDiscount !== 0 || item.discountType || Number(item.quantity) !== 1 || String(payment.method).toLowerCase() !== "pix")
        throw new Error("Produto tempor\xE1rio sem estoque, sem desconto e PIX s\xE3o obrigat\xF3rios.");
      const price = amount(item.unitPrice, "Pre\xE7o sint\xE9tico");
      if (amount(payment.amount, "Pagamento sint\xE9tico") !== price)
        throw new Error("Pagamento sint\xE9tico n\xE3o reconcilia com o item.");
      const customer = record2(data.customerData);
      if (customer.id || customer.cpfCnpj !== "12345678909" || !String(customer.fullName || "").includes("TEST_AUT_") || !String(item.description || "").includes("TEST_AUT_"))
        throw new Error("Produto e destinat\xE1rio devem identificar o teste.");
      const recipientAddress = address(record2(customer.fiscalAddress), "");
      if (recipientAddress.uf !== "PR" || recipientAddress.street !== "RUA TESTE" || recipientAddress.number !== "10" || recipientAddress.district !== "CENTRO" || recipientAddress.municipalityCode !== "4105805" || recipientAddress.municipality !== "COLOMBO" || recipientAddress.postalCode !== "83410270")
        throw new Error("Fixture HML exige endere\xE7o sint\xE9tico fixo no PR.");
      const issuer = facts.issuerProfile;
      const issuerAddress = address(issuer, "company");
      const trace2 = {
        decisionId: "hml-technical-single-item",
        ruleSetVersion: HML_TECHNICAL_RULESET_VERSION,
        effectiveAt: savedDecision.confirmedAt,
        inputFacts: { testRunId: runId, issuerCrt: "1", environment: 2 },
        result: {
          model: "55",
          cfop: "5102",
          csosn: csosn.csosn,
          csosnSource: csosn.source,
          csosnConfigurationVersion: csosnConfiguration.version,
          pisCst: "99",
          cofinsCst: "99"
        },
        reason: "Fixture t\xE9cnica sint\xE9tica: venda interna, sem substitui\xE7\xE3o tribut\xE1ria, sem frete ou desconto.",
        approver: "operator_instruction_hml_technical_only"
      };
      const totals = {
        icmsBase: 0,
        products: price,
        discount: 0,
        freight: 0,
        insurance: 0,
        otherExpenses: 0,
        icms: 0,
        icmsExempt: 0,
        fcp: 0,
        icmsStBase: 0,
        icmsSt: 0,
        fcpSt: 0,
        fcpStRetained: 0,
        ii: 0,
        ipi: 0,
        ipiReturned: 0,
        pis: 0,
        cofins: 0,
        invoice: price,
        payment: price,
        change: 0
      };
      return {
        snapshotHash: hash,
        ruleSetVersion: HML_TECHNICAL_RULESET_VERSION,
        model: "55",
        environment: 2,
        issuer: {
          cnpj: issuerCnpj,
          name: string(issuer.companyName, "Raz\xE3o social"),
          ie: digits(
            issuer.companyIE,
            String(issuer.companyIE || "").replace(/\D/g, "").length,
            "IE"
          ),
          crt: "1",
          municipalityCode: issuerAddress.municipalityCode,
          address: issuerAddress
        },
        recipient: {
          name: string(customer.fullName, "Destinat\xE1rio"),
          cpfCnpj: digits(customer.cpfCnpj, 11, "CPF sint\xE9tico"),
          ieIndicator: "9",
          address: recipientAddress
        },
        operation: {
          natureOfOperation: "VENDA DE MERCADORIA",
          direction: "outbound",
          purpose: "1",
          destination: "1",
          presence: "1",
          finalConsumer: "1",
          freightMode: "9"
        },
        items: [
          {
            itemNumber: 1,
            product: {
              code: runId.slice(0, 30),
              description: string(item.description, "Produto sint\xE9tico"),
              gtin: "SEM GTIN",
              quantity: 1,
              unitValue: price,
              gross: price,
              discount: 0,
              freight: 0,
              insurance: 0,
              otherExpenses: 0
            },
            classification: {
              ncm: selected?.ncm ?? "94036000",
              origin,
              cfop: selected?.cfop ?? "5102",
              cest: selected?.cest || void 0,
              unit: "UN"
            },
            taxes: [
              {
                group: "ICMS",
                codeSystem: "CSOSN",
                code: csosn.csosn,
                values: { vICMS: 0 },
                decisionId: trace2.decisionId
              },
              {
                group: "PIS",
                codeSystem: "CST",
                code: "99",
                values: { vBC: 0, pPIS: 0, vPIS: 0 },
                decisionId: trace2.decisionId
              },
              {
                group: "COFINS",
                codeSystem: "CST",
                code: "99",
                values: { vBC: 0, pCOFINS: 0, vCOFINS: 0 },
                decisionId: trace2.decisionId
              }
            ],
            decisions: [trace2]
          }
        ],
        payments: [{ methodCode: "17", amount: price, decision: trace2 }],
        totals,
        decisions: [trace2]
      };
    }
  };
}

// api/nfe/hml-normal-sale/constants.ts
var HML_NORMAL_SALE_RULESET_VERSION = "HML_NORMAL_SALE_V2";

// api/nfe/hmlNormalSaleRuleSet.ts
async function createHmlNormalSaleRuleSet(facts, configuration) {
  if (facts.emissionRequest.environment !== 2)
    throw new Error("PRODUCTION_FISCAL_RULESET_REQUIRED");
  parseHmlCsosnConfiguration(configuration);
  const rules = await createNormalSaleRuleSet(facts, HML_NORMAL_SALE_RULESET_VERSION);
  return { ...rules, technicalHomologationOnly: true };
}

// api/nfe/hml-technical/constants.ts
var isHmlRuleSet = (version) => version === HML_TECHNICAL_RULESET_VERSION || version === "HML_NORMAL_SALE_V1" || version === HML_NORMAL_SALE_RULESET_VERSION;
var hmlEndpoint = (model, service) => {
  if (model !== "55" && model !== "65") throw new Error("Modelo fiscal inv\xE1lido.");
  return getNfeServiceEndpoint(model, 2, service);
};
var failure = (status, code, error, extra = {}) => ({ status, body: { success: false, code, error, ...extra } });
var SNAPSHOT_REASON_MESSAGES = {
  ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL: "O pedido n\xE3o \xE9 venda/showroom ativa ou est\xE1 cancelado.",
  ORDER_FISCAL_DATA_UNAVAILABLE: "O pedido n\xE3o possui dados fiscais v\xE1lidos.",
  ORDER_REVISION_UNAVAILABLE: "O pedido n\xE3o possui vers\xE3o/data de atualiza\xE7\xE3o registrada.",
  HML_ORDER_NOT_ISOLATED: "O pedido t\xE9cnico HML precisa estar isolado (rascunho, exclu\xEDdo e sem pagamentos).",
  NCM_NOT_ACTIVE: "Algum item usa NCM inexistente, inativo ou fora da vig\xEAncia.",
  ISSUER_PROFILE_UNAVAILABLE: "Configura\xE7\xF5es da empresa emitente n\xE3o encontradas.",
  HML_CSOSN_CONFIGURATION_UNAVAILABLE: "Configura\xE7\xE3o padr\xE3o de CSOSN da homologa\xE7\xE3o n\xE3o encontrada.",
  ISSUER_MUNICIPALITY_UNAVAILABLE: "C\xF3digo IBGE do munic\xEDpio do emitente ausente ou inv\xE1lido (7 d\xEDgitos).",
  ALREADY_ACTIVE_FISCAL_ATTEMPT: "J\xE1 existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.",
  HML_ORDER_ALREADY_HAS_ATTEMPT: "O pedido de teste t\xE9cnico HML j\xE1 possui uma tentativa registrada."
};
var hasProtocolKey = (xml, key) => {
  const protocol = xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || "";
  return ACCESS_KEY_PATTERN.test(key) && new RegExp(`<(?:[\\w.-]+:)?chNFe>\\s*${key}\\s*<\\/(?:[\\w.-]+:)?chNFe>`, "i").test(protocol);
};
function saoPauloTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("Data da reserva inv\xE1lida.");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset"
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  const offset = String(parts.timeZoneName || "").replace("GMT", "") || "+00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}
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

// api/nfe/hml-technical/snapshotClassification.ts
function snapshotReasonOf(error) {
  const message = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message.trim() : "";
  if (/^[A-Z][A-Z0-9_]{2,80}$/.test(message)) return message;
  const check = message.match(
    /relation "([\w.]{1,80})" violates check constraint "([\w.]{1,120})"/
  );
  return check ? `CHECK:${check[1]}.${check[2]}` : void 0;
}
async function activeAttemptMetadata(db, orderId, model) {
  const { data: doc, error } = await db.from("nfe_documents").select("id,emission_request_id,chave_acesso,numero_nfe,serie,modelo,fiscal_snapshot_id").eq("order_id", orderId).eq("ambiente", 2).eq("document_type", "outbound").in("status", ["pendente", "processando", "homologada", "autorizada"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return {};
  if (doc)
    return {
      documentId: doc.id,
      emissionRequestId: doc.emission_request_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      fiscalSnapshotId: doc.fiscal_snapshot_id
    };
  if (!model) return {};
  const { data: snapshot, error: snapshotError } = await db.from("nfe_fiscal_snapshots").select("id,emission_request_id,reserved_number,series,requested_model").eq("order_id", orderId).eq("environment", 2).eq("requested_model", model).order("captured_at", { ascending: false }).limit(1).maybeSingle();
  if (snapshotError || !snapshot) return {};
  return {
    emissionRequestId: snapshot.emission_request_id,
    fiscalSnapshotId: snapshot.id,
    nfeNumber: snapshot.reserved_number,
    series: snapshot.series,
    model: snapshot.requested_model,
    reservationRecoveryRequired: true
  };
}
function classifySnapshotReservationError(error) {
  const databaseCode = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9]{5,8}$/.test(error.code) ? error.code : "UNKNOWN";
  const databaseReason = snapshotReasonOf(error);
  const reasonMessage = databaseReason ? SNAPSHOT_REASON_MESSAGES[databaseReason] : void 0;
  if (reasonMessage)
    return {
      databaseCode,
      databaseReason,
      category: "DATABASE_VALIDATION_REJECTED",
      hint: reasonMessage
    };
  if (databaseCode === "42883")
    return {
      databaseCode,
      category: "SQL_FUNCTION_NOT_FOUND",
      hint: "O PostgreSQL n\xE3o encontrou a fun\xE7\xE3o SQL solicitada. Verifique se a migration da reserva foi aplicada com a assinatura esperada."
    };
  if (databaseCode === "PGRST202")
    return {
      databaseCode,
      category: "RPC_MISSING_FROM_SCHEMA_CACHE",
      hint: "A fun\xE7\xE3o n\xE3o foi localizada no schema cache do PostgREST. Confira a migration e atualize o cache do Supabase."
    };
  if (databaseCode === "PGRST203")
    return {
      databaseCode,
      category: "RPC_SIGNATURE_AMBIGUOUS",
      hint: "H\xE1 sobrecarga amb\xEDgua para a fun\xE7\xE3o de reserva. Confira e remova assinaturas conflitantes."
    };
  if (databaseCode === "42501")
    return {
      databaseCode,
      category: "DATABASE_PERMISSION_DENIED",
      hint: "O papel de servi\xE7o n\xE3o tem permiss\xE3o para executar a reserva fiscal."
    };
  if (databaseCode === "23505")
    return {
      databaseCode,
      category: "DATABASE_UNIQUE_CONFLICT",
      hint: "A reserva encontrou um registro fiscal duplicado ou uma chave de idempot\xEAncia j\xE1 usada."
    };
  if (databaseCode === "23502")
    return {
      databaseCode,
      category: "DATABASE_REQUIRED_VALUE_MISSING",
      hint: "A reserva encontrou um campo obrigat\xF3rio ausente no snapshot ou na sequ\xEAncia fiscal."
    };
  if (databaseCode === "23503")
    return {
      databaseCode,
      category: "DATABASE_REFERENCE_CONFLICT",
      hint: "A reserva encontrou uma refer\xEAncia fiscal inexistente."
    };
  if (databaseCode === "23514" || databaseCode === "22023")
    return {
      databaseCode,
      category: "DATABASE_VALIDATION_REJECTED",
      hint: "O banco rejeitou um par\xE2metro ou valor do snapshot fiscal."
    };
  if (databaseCode.startsWith("08"))
    return {
      databaseCode,
      category: "DATABASE_CONNECTION_FAILED",
      hint: "O banco n\xE3o conseguiu concluir a chamada de reserva."
    };
  return {
    databaseCode,
    category: "SNAPSHOT_RESERVATION_FAILED",
    hint: "Consulte o log do servidor pelo identificador de diagn\xF3stico para encontrar a causa."
  };
}

// api/nfe/hml-technical/transmission.ts
var import_node_crypto8 = require("node:crypto");
async function releaseAttempt(db, documentId, attemptToken) {
  try {
    await db.rpc("release_hml_nfe_attempt", {
      p_document_id: documentId,
      p_attempt_token: attemptToken
    });
  } catch {
  }
}
async function transmitAndPersist(db, documentId, signedXml, accessKey, nfeNumber, metadata2, cert, attemptToken) {
  try {
    const { data: persisted, error } = await db.from("nfe_fiscal_snapshots").select("snapshot_data").eq("id", String(metadata2.fiscalSnapshotId || "")).maybeSingle();
    if (error || !persisted) throw new Error("Snapshot fiscal indispon\xEDvel na transmiss\xE3o.");
    await assertXmlFiscalSelections(persisted.snapshot_data, signedXml);
  } catch {
    return failure(
      422,
      "HML_TRANSMISSION_INTEGRITY_FAILED",
      "XML assinado e campos confirmados n\xE3o puderam ser reconciliados. Transmiss\xE3o bloqueada.",
      { ...metadata2, sefazContacted: false, numberReserved: true }
    );
  }
  let responseXml;
  try {
    const envelope = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${nfeNumber}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    responseXml = await withNfeEmissionStage(
      "sefaz_transmission",
      () => sendSoapToSefaz({
        url: hmlEndpoint(metadata2.model, "NFeAutorizacao4"),
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
        serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4",
        xmlPayload: envelope,
        certPem: cert.certPem,
        privateKeyPem: cert.privateKeyPem
      }),
      { environment: 2, model: String(metadata2.model || "") }
    );
  } catch (error) {
    const transportDiagnostic = sefazTransportDiagnostic(error);
    const diagnosticId = (0, import_node_crypto8.randomUUID)();
    const attemptDiagnostic = {
      diagnosticId,
      emissionRequestId: metadata2.emissionRequestId,
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
        ...metadata2,
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
      { pending: true, ...metadata2 }
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
      ...metadata2,
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
var import_node_crypto9 = require("node:crypto");

// api/nfe/hmlAttemptSafety.ts
var asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var normalized = (value) => value == null ? "" : String(value);
var itemFieldLabels = {
  ncm: "NCM",
  cfop: "CFOP",
  origem: "origem",
  cest: "CEST",
  csosn: "CSOSN"
};
function getFiscalSelectionMismatchDetails(snapshot, command) {
  const data = asRecord(snapshot);
  const emission = asRecord(data.emissionRequest);
  const savedChoices = asRecord(emission.itemFiscalSelections);
  const currentChoices = asRecord(command.itemFiscalSelections);
  const mismatches = /* @__PURE__ */ new Map();
  if (command.itemFiscalSelections !== void 0) {
    const itemNumbers = /* @__PURE__ */ new Set([...Object.keys(savedChoices), ...Object.keys(currentChoices)]);
    for (const itemNumber of itemNumbers) {
      const saved = asRecord(savedChoices[itemNumber]);
      const current = asRecord(currentChoices[itemNumber]);
      for (const field of Object.keys(itemFieldLabels)) {
        const snapshotValue = normalized(saved[field]);
        const currentValue = normalized(current[field]);
        if (snapshotValue !== currentValue) {
          const label = `Item ${itemNumber} \xB7 ${itemFieldLabels[field]}`;
          mismatches.set(label, { field: label, snapshotValue, currentValue });
        }
      }
    }
  }
  const savedOverrides = asRecord(emission.itemCsosnOverrides);
  const currentOverrides = asRecord(command.itemCsosnOverrides);
  if (command.itemCsosnOverrides !== void 0) {
    for (const itemNumber of /* @__PURE__ */ new Set([
      ...Object.keys(savedOverrides),
      ...Object.keys(currentOverrides)
    ])) {
      const snapshotValue = normalized(savedOverrides[itemNumber]);
      const currentValue = normalized(currentOverrides[itemNumber]);
      if (snapshotValue !== currentValue) {
        const label = `Item ${itemNumber} \xB7 CSOSN manual`;
        mismatches.set(label, { field: label, snapshotValue, currentValue });
      }
    }
  }
  const comparisons = [
    [
      "recipientTaxId",
      "documento do destinat\xE1rio",
      emission.recipientTaxId,
      command.recipientTaxId
    ],
    ["finalConsumer", "finalidade da opera\xE7\xE3o", emission.finalConsumer, command.finalConsumer],
    [
      "deliveryByIssuer",
      "respons\xE1vel pelo transporte",
      emission.deliveryByIssuer,
      command.deliveryByIssuer
    ],
    [
      "cardNotIntegrated",
      "meio de pagamento",
      emission.cardNotIntegrated,
      command.cardNotIntegrated
    ]
  ];
  for (const [field, label, saved, current] of comparisons) {
    const normalizedSaved = field === "recipientTaxId" ? normalizeRecipientTaxId(normalized(saved)) : normalized(saved);
    const normalizedCurrent = field === "recipientTaxId" ? normalizeRecipientTaxId(normalized(current)) : normalized(current);
    if (command[field] !== void 0 && normalizedSaved !== normalizedCurrent)
      mismatches.set(label, { field: label });
  }
  return [...mismatches.values()].sort((a, b) => a.field.localeCompare(b.field));
}
var TRANSMISSION_FAILURE_PREFIX = "Resposta da transmiss\xE3o HML desconhecida: ";
function hasStrictPreTransmissionTlsEvidence(entry, document) {
  if (typeof entry.reason !== "string" || !entry.reason.startsWith(TRANSMISSION_FAILURE_PREFIX))
    return false;
  let diagnostic;
  try {
    diagnostic = asRecord(JSON.parse(entry.reason.slice(TRANSMISSION_FAILURE_PREFIX.length)));
  } catch {
    return false;
  }
  const model = String(document.modelo || "");
  const prefix = model === "65" ? "nfce" : model === "55" ? "nfe" : "";
  const hostname = prefix ? `homologacao.${prefix}.sefa.pr.gov.br` : "";
  const endpointPrefix = hostname ? `https://${hostname}/${prefix}/` : "";
  return Boolean(
    document.emission_request_id && diagnostic.emissionRequestId === document.emission_request_id && diagnostic.code === "SELF_SIGNED_CERT_IN_CHAIN" && diagnostic.category === "TLS_FAILURE" && diagnostic.phase === "tls" && Number(diagnostic.environment) === 2 && diagnostic.model === model && diagnostic.hostname === hostname && typeof diagnostic.endpoint === "string" && diagnostic.endpoint.startsWith(endpointPrefix) && !("httpStatus" in diagnostic) && normalized(entry.responseXml) === "" && normalized(entry.protocol) === ""
  );
}
function canAbandonBeforeHmlTransmission(document, now = Date.now()) {
  if (document.status !== "pendente" || Number(document.ambiente) !== 2 || !["55", "65"].includes(String(document.modelo)) || document.document_type !== "outbound" || !document.order_id || !document.emission_request_id || document.hml_attempt_token != null || document.hml_attempt_expires_at != null && Date.parse(String(document.hml_attempt_expires_at)) > now || normalized(document.numero_protocolo) !== "" || normalized(document.xml_protocolo) !== "")
    return false;
  const history = Array.isArray(document.hml_response_history) ? document.hml_response_history.map(asRecord) : [];
  if (!history.length) return false;
  if (history.some(
    (entry) => normalized(entry.responseXml) !== "" || normalized(entry.protocol) !== ""
  ))
    return false;
  return history.some((entry) => hasStrictPreTransmissionTlsEvidence(entry, document));
}
function isFormallyAbandonedHmlAttempt(history) {
  return Array.isArray(history) && history.some(
    (entry) => asRecord(entry).abandonmentCode === "FISCAL_SNAPSHOT_CHANGED_AFTER_PRE_TRANSMISSION_FAILURE"
  );
}

// api/nfe/hml-technical/consultation.ts
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
  const attemptToken = (0, import_node_crypto9.randomUUID)();
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
      const diagnosticId = (0, import_node_crypto9.randomUUID)();
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
async function recoverHmlTechnical(db, command) {
  if (command.environment !== 2)
    return failure(
      503,
      "PRODUCTION_FISCAL_RULESET_REQUIRED",
      "Produ\xE7\xE3o exige uma matriz fiscal aprovada pr\xF3pria."
    );
  const { data: previous, error: previousError } = await db.from("nfe_documents").select(
    "id,order_id,emission_request_id,ambiente,modelo,status,document_type,fiscal_ruleset_version,fiscal_snapshot_id,hml_attempt_token,hml_attempt_expires_at,numero_protocolo,xml_protocolo,hml_response_history,supersedes_document_id,numero_nfe,serie"
  ).eq("emission_request_id", command.emissionRequestId).maybeSingle();
  if (previousError)
    return failure(
      503,
      "HML_ATTEMPT_READ_FAILED",
      "N\xE3o foi poss\xEDvel verificar a tentativa anterior. Nenhuma nova transmiss\xE3o foi iniciada."
    );
  if (previous) {
    if (previous.order_id !== command.orderId || previous.ambiente !== 2 || !["55", "65"].includes(previous.modelo) || !isHmlRuleSet(previous.fiscal_ruleset_version))
      return failure(
        409,
        "HML_IDEMPOTENCY_MISMATCH",
        "A chave de solicita\xE7\xE3o j\xE1 pertence a outra tentativa fiscal."
      );
    if (isFormallyAbandonedHmlAttempt(previous.hml_response_history))
      return failure(
        409,
        "HML_ATTEMPT_FORMALLY_ABANDONED",
        "Esta tentativa foi encerrada antes do envio \xE0 SEFAZ. Use a a\xE7\xE3o expl\xEDcita para iniciar uma nova tentativa fiscal.",
        {
          pending: false,
          documentId: previous.id,
          emissionRequestId: command.emissionRequestId,
          orderId: command.orderId,
          environment: 2,
          model: previous.modelo,
          hmlCanAbandonTlsFailure: false
        }
      );
    if ((previous.supersedes_document_id || null) !== (command.supersedesDocumentId || null))
      return failure(
        409,
        "HML_IDEMPOTENCY_MISMATCH",
        "A tentativa j\xE1 est\xE1 vinculada a outra origem fiscal. Consulte o documento original."
      );
    if (command.itemCsosnOverrides !== void 0 || command.itemFiscalSelections || command.recipientTaxId !== void 0 || command.finalConsumer !== void 0 || command.deliveryByIssuer !== void 0 || command.cardNotIntegrated !== void 0 || command.requestedNumber !== void 0) {
      if (!previous.fiscal_snapshot_id)
        return failure(
          409,
          "HML_IDEMPOTENCY_MISMATCH",
          "A tentativa anterior n\xE3o tem snapshot verific\xE1vel das escolhas de CSOSN."
        );
      const { data: snapshot, error } = await db.from("nfe_fiscal_snapshots").select("snapshot_data,reserved_number").eq("id", previous.fiscal_snapshot_id).maybeSingle();
      if (error || !snapshot)
        return failure(
          409,
          "HML_IDEMPOTENCY_MISMATCH",
          "O snapshot fiscal original n\xE3o est\xE1 dispon\xEDvel para comparar esta tentativa. Consulte o documento original."
        );
      const fiscalMismatchFields = getFiscalSelectionMismatchDetails(
        snapshot.snapshot_data,
        command
      );
      if (command.requestedNumber !== void 0 && snapshot.reserved_number !== command.requestedNumber)
        fiscalMismatchFields.push({
          field: "n\xFAmero fiscal",
          snapshotValue: String(snapshot.reserved_number),
          currentValue: String(command.requestedNumber)
        });
      if (fiscalMismatchFields.length)
        return failure(
          409,
          "HML_IDEMPOTENCY_MISMATCH",
          "A tentativa fiscal existente n\xE3o pode ser reutilizada porque os dados fiscais foram alterados ap\xF3s a cria\xE7\xE3o do snapshot.",
          {
            pending: false,
            documentId: previous.id,
            orderId: command.orderId,
            emissionRequestId: command.emissionRequestId,
            nfeNumber: previous.numero_nfe,
            series: previous.serie,
            environment: 2,
            model: previous.modelo,
            fiscalMismatchFields,
            hmlCanAbandonTlsFailure: canAbandonBeforeHmlTransmission(previous)
          }
        );
    }
    return retryHmlTechnical(db, previous.id, false);
  }
  const activeAttempt = await activeAttemptMetadata(db, command.orderId);
  if ("documentId" in activeAttempt)
    return failure(
      409,
      "HML_SNAPSHOT_RESERVATION_FAILED",
      SNAPSHOT_REASON_MESSAGES.ALREADY_ACTIVE_FISCAL_ATTEMPT,
      {
        ...activeAttempt,
        pending: true,
        environment: 2,
        orderId: command.orderId,
        databaseCode: "23505",
        databaseReason: "ALREADY_ACTIVE_FISCAL_ATTEMPT",
        diagnosticStage: "snapshot-reservation",
        numberReserved: false,
        sefazContacted: false
      }
    );
  return null;
}

// api/nfe/emitHmlTechnical.ts
async function emitHmlTechnical(db, command, candidate, appSettings) {
  if (command.environment !== 2)
    return failure(
      503,
      "PRODUCTION_FISCAL_RULESET_REQUIRED",
      "Produ\xE7\xE3o exige uma matriz fiscal aprovada pr\xF3pria."
    );
  if (command.recipientTaxId && !isValidRecipientTaxId(command.recipientTaxId))
    return failure(
      422,
      "NFE_RECIPIENT_TAX_ID_INVALID",
      "CPF/CNPJ do destinat\xE1rio inv\xE1lido para emitir NF-e modelo 55.",
      { field: "recipientTaxId", numberReserved: false, sefazContacted: false }
    );
  const recovered = await recoverHmlTechnical(db, command);
  if (recovered) return recovered;
  const technicalFixture = candidate.order.data.fiscalScenario === HML_TECHNICAL_RULESET_VERSION;
  if (!technicalFixture) {
    try {
      await loadNormalSaleInputs(db, candidate, appSettings);
    } catch (error) {
      return failure(
        422,
        "FISCAL_DETERMINATION_REQUIRED",
        error instanceof Error ? error.message : "Fatos do pedido real indispon\xEDveis.",
        { numberReserved: false, sefazContacted: false }
      );
    }
    if (command.recipientTaxId !== void 0) {
      const customer = candidate.fiscalInputs?.customer;
      if (customer && typeof customer === "object" && !Array.isArray(customer))
        customer.cpfCnpj = normalizeRecipientTaxId(command.recipientTaxId);
    }
  }
  const recipient = candidate.fiscalInputs?.customer;
  const effectiveRecipientTaxId = command.recipientTaxId !== void 0 ? command.recipientTaxId : !technicalFixture && recipient && typeof recipient === "object" && !Array.isArray(recipient) ? String(recipient.cpfCnpj || "") : "";
  if (!technicalFixture && effectiveRecipientTaxId && !isValidRecipientTaxId(effectiveRecipientTaxId))
    return failure(
      422,
      "NFE_RECIPIENT_TAX_ID_INVALID",
      "CPF/CNPJ do destinat\xE1rio inv\xE1lido para emitir NF-e modelo 55.",
      { field: "recipientTaxId", numberReserved: false, sefazContacted: false }
    );
  if (!technicalFixture)
    candidate.emissionRequest.recipientTaxId = normalizeRecipientTaxId(effectiveRecipientTaxId);
  const { data: decisionRow, error: decisionError } = await db.from("settings").select("data").eq("id", "fiscal_decision_simples_nfe55_normal_sale_v1").maybeSingle();
  if (decisionError || !decisionRow?.data)
    return failure(
      503,
      "HML_FISCAL_DECISION_UNAVAILABLE",
      "Decis\xE3o persistida de PIS/COFINS indispon\xEDvel."
    );
  let rules;
  try {
    const configuration = await loadHmlCsosnConfiguration(db, true);
    rules = technicalFixture ? createHmlTechnicalRuleSet(candidate, decisionRow.data, configuration) : await createHmlNormalSaleRuleSet(candidate, configuration);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cen\xE1rio HML inv\xE1lido.";
    if (message.includes("do destinat\xE1rio \xE9 obrigat\xF3rio"))
      return failure(422, "NFE_RECIPIENT_TAX_ID_REQUIRED", message, {
        field: "recipientTaxId",
        numberReserved: false,
        sefazContacted: false
      });
    if (message.includes("CPF/CNPJ do destinat\xE1rio inv\xE1lido"))
      return failure(422, "NFE_RECIPIENT_TAX_ID_INVALID", message, {
        field: "recipientTaxId",
        numberReserved: false,
        sefazContacted: false
      });
    const interstateMatrixUnavailable = message.includes(
      "n\xE3o est\xE1 coberta pela matriz HML_NORMAL_SALE_V2"
    );
    const interstateMatrixExecutionNotReady = message.includes(
      "HML_INTERSTATE_MATRIX_EXECUTION_NOT_READY"
    );
    return failure(
      422,
      interstateMatrixExecutionNotReady ? "HML_INTERSTATE_MATRIX_EXECUTION_NOT_READY" : interstateMatrixUnavailable ? "HML_INTERSTATE_MATRIX_NOT_APPROVED" : "HML_RULESET_NOT_APPLICABLE",
      message,
      {
        ...interstateMatrixUnavailable || interstateMatrixExecutionNotReady ? { requiredScope: "approved_interstate_matrix" } : {},
        numberReserved: false,
        sefazContacted: false
      }
    );
  }
  const preflight = resolveFiscalDocument(candidate, rules);
  if (preflight.status !== "ready")
    return failure(
      422,
      "HML_FISCAL_DOCUMENT_INCOMPLETE",
      "O pedido n\xE3o passou pela determina\xE7\xE3o fiscal.",
      { blockers: preflight.blockers, numberReserved: false, sefazContacted: false }
    );
  try {
    validateParanaIssuerIe(preflight.document.issuer.ie);
  } catch (error) {
    return failure(
      422,
      "HML_ISSUER_IE_INVALID",
      error instanceof Error ? error.message : "Inscri\xE7\xE3o estadual do emitente inv\xE1lida.",
      { numberReserved: false, sefazContacted: false }
    );
  }
  const tech = getResponsibleTechnicianConfig();
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!tech || !pfx)
    return failure(
      503,
      "HML_CERTIFICATE_OR_CSRT_UNAVAILABLE",
      "Certificado A1 ou respons\xE1vel t\xE9cnico/CSRT n\xE3o configurado no servidor.",
      {
        numberReserved: false,
        sefazContacted: false,
        configurationIssues: [
          ...getResponsibleTechnicianConfigurationIssues(),
          ...!pfx ? ["certificate.base64"] : []
        ]
      }
    );
  let cert;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || "");
  } catch {
    return failure(503, "HML_CERTIFICATE_INVALID", "Certificado A1 inv\xE1lido.", {
      numberReserved: false,
      sefazContacted: false
    });
  }
  let sequence;
  try {
    sequence = resolveNfeSequenceSettings(appSettings, preflight.document.model, 2);
  } catch (error) {
    return failure(
      422,
      "HML_SEQUENCE_INVALID",
      error instanceof Error ? error.message : "S\xE9rie HML inv\xE1lida.",
      { numberReserved: false, sefazContacted: false }
    );
  }
  if (!/^\d{1,3}$/.test(sequence.series) || !Number.isInteger(sequence.minimumNumber) || sequence.minimumNumber < 1 || sequence.minimumNumber > 999999999)
    return failure(422, "HML_SEQUENCE_INVALID", "S\xE9rie ou n\xFAmero inicial HML inv\xE1lido.", {
      numberReserved: false,
      sefazContacted: false
    });
  if (command.requestedNumber !== void 0 && command.requestedNumber < sequence.minimumNumber)
    return failure(
      422,
      "HML_NUMBER_BELOW_SEQUENCE_START",
      `A numera\xE7\xE3o manual precisa ser igual ou superior ao in\xEDcio configurado (${sequence.minimumNumber}).`,
      { numberReserved: false, sefazContacted: false }
    );
  const snapshotRpcName = command.requestedNumber === void 0 ? technicalFixture ? "prepare_nfe_fiscal_snapshot" : "prepare_nfe_fiscal_snapshot_with_context" : technicalFixture ? "prepare_numbered_nfe_fiscal_snapshot" : "prepare_numbered_nfe_fiscal_snapshot_with_context";
  const snapshotArgs = {
    p_order_id: command.orderId,
    p_emission_request_id: command.emissionRequestId,
    p_modelo: preflight.document.model,
    p_ambiente: 2,
    p_serie: sequence.series,
    p_numero_minimo: sequence.minimumNumber,
    p_item_csosn_overrides: command.itemCsosnOverrides || {},
    p_item_fiscal_selections: command.itemFiscalSelections || {},
    ...technicalFixture ? {} : { p_recipient_tax_id: normalizeRecipientTaxId(effectiveRecipientTaxId) },
    ...technicalFixture ? {} : {
      p_final_consumer: command.finalConsumer ?? (preflight.document.modelDecision?.status === "ready" && preflight.document.modelDecision.finalConsumer),
      p_delivery_by_issuer: command.deliveryByIssuer ?? false,
      p_card_not_integrated: command.cardNotIntegrated ?? false,
      p_model_decision: preflight.document.modelDecision
    },
    ...command.requestedNumber === void 0 ? {} : { p_requested_number: command.requestedNumber }
  };
  const { data: reservationValue, error: reservationError } = await db.rpc(
    snapshotRpcName,
    snapshotArgs
  );
  const reservation = parseFiscalSnapshotReservation(reservationValue);
  if (reservationError?.message?.includes("NFE_NUMBER_ALREADY_USED") && command.requestedNumber) {
    const conflict = fiscalNumberConflict(command.requestedNumber);
    return failure(
      409,
      "NFE_NUMBER_ALREADY_USED",
      `A numera\xE7\xE3o ${command.requestedNumber} j\xE1 est\xE1 sendo usada.${conflict.nextNumber ? ` N\xFAmero sugerido: ${command.requestedNumber} \u2192 ${conflict.nextNumber}.` : " O limite de numera\xE7\xE3o foi atingido; informe outro n\xFAmero."}`,
      {
        nfeNumber: command.requestedNumber,
        numberConflict: conflict,
        numberReserved: false,
        sefazContacted: false
      }
    );
  }
  if (reservationError || !reservation) {
    const diagnosticId = (0, import_node_crypto10.randomUUID)();
    const diagnostic = classifySnapshotReservationError(reservationError);
    const databaseReason = snapshotReasonOf(reservationError);
    const activeConflict = databaseReason === "ALREADY_ACTIVE_FISCAL_ATTEMPT";
    const activeAttempt = activeConflict ? await activeAttemptMetadata(db, command.orderId, preflight.document.model) : {};
    console.error("[NF-e HML] Falha na reserva at\xF4mica do snapshot", {
      diagnosticId,
      stage: "snapshot-reservation",
      rpc: snapshotRpcName,
      databaseCode: diagnostic.databaseCode,
      databaseReason,
      category: diagnostic.category,
      environment: 2,
      model: preflight.document.model
    });
    return failure(
      activeConflict ? 409 : 503,
      "HML_SNAPSHOT_RESERVATION_FAILED",
      diagnostic.databaseReason ? `Emiss\xE3o bloqueada pelo banco: ${diagnostic.hint}` : "N\xE3o foi poss\xEDvel reservar snapshot e n\xFAmero fiscal HML de forma at\xF4mica.",
      {
        diagnosticId,
        diagnosticStage: "snapshot-reservation",
        databaseCode: diagnostic.databaseCode,
        databaseReason,
        diagnosticCategory: diagnostic.category,
        diagnosticHint: diagnostic.hint,
        numberReserved: false,
        sefazContacted: false,
        ...activeConflict ? { ...activeAttempt, pending: true, orderId: command.orderId, environment: 2 } : {}
      }
    );
  }
  const { data: saved, error: snapshotError } = await db.from("nfe_fiscal_snapshots").select(
    "snapshot_data,snapshot_sha256,order_id,environment,requested_model,reserved_number,series"
  ).eq("id", reservation.snapshotId).maybeSingle();
  if (snapshotError || !saved || saved.snapshot_sha256 !== reservation.snapshotHash || saved.order_id !== command.orderId || saved.environment !== 2 || saved.requested_model !== preflight.document.model || saved.reserved_number !== reservation.number || saved.series !== sequence.series)
    return failure(503, "HML_SNAPSHOT_READ_FAILED", "Snapshot reservado n\xE3o p\xF4de ser validado.", {
      numberReserved: true,
      documentId: reservation.snapshotId
    });
  const persisted = saved.snapshot_data;
  const facts = {
    schemaVersion: persisted.schemaVersion,
    capturedAt: persisted.capturedAt,
    order: persisted.order,
    issuerProfile: persisted.issuerProfile,
    fiscalConfiguration: persisted.fiscalConfiguration,
    fiscalInputs: persisted.fiscalInputs,
    emissionRequest: {
      id: command.emissionRequestId,
      environment: 2,
      itemCsosnOverrides: persisted.emissionRequest.itemCsosnOverrides,
      itemFiscalSelections: persisted.emissionRequest.itemFiscalSelections,
      recipientTaxId: persisted.emissionRequest.recipientTaxId,
      finalConsumer: persisted.emissionRequest.finalConsumer,
      deliveryByIssuer: persisted.emissionRequest.deliveryByIssuer,
      cardNotIntegrated: persisted.emissionRequest.cardNotIntegrated,
      modelDecision: persisted.emissionRequest.modelDecision
    },
    persistedHash: reservation.snapshotHash
  };
  try {
    const configuration = parseHmlCsosnConfiguration(persisted.fiscalConfiguration);
    rules = technicalFixture ? createHmlTechnicalRuleSet(facts, decisionRow.data, configuration) : await createHmlNormalSaleRuleSet(facts, configuration);
  } catch {
    return failure(
      422,
      "HML_PERSISTED_CONFIGURATION_INVALID",
      "Configura\xE7\xE3o fiscal do snapshot n\xE3o p\xF4de ser validada.",
      { numberReserved: true }
    );
  }
  const resolved = resolveFiscalDocument(facts, rules);
  if (resolved.status !== "ready" || resolved.document.model !== saved.requested_model || !technicalFixture && !isSameFiscalModelDecision(
    resolved.document.modelDecision,
    persisted.emissionRequest.modelDecision
  ))
    return failure(
      422,
      "HML_PERSISTED_SNAPSHOT_INVALID",
      "O snapshot persistido n\xE3o passou pela determina\xE7\xE3o fiscal.",
      { blockers: resolved.status === "blocked" ? resolved.blockers : [], numberReserved: true }
    );
  try {
    validateParanaIssuerIe(resolved.document.issuer.ie);
  } catch (error) {
    return failure(
      422,
      "HML_PERSISTED_ISSUER_IE_INVALID",
      error instanceof Error ? error.message : "Inscri\xE7\xE3o estadual do snapshot inv\xE1lida.",
      { numberReserved: true, sefazContacted: false }
    );
  }
  const issuedAt = saoPauloTimestamp(reservation.issuedAt);
  const cNf = (0, import_node_crypto10.createHash)("sha256").update(command.emissionRequestId).digest("hex");
  const randomCode = String(parseInt(cNf.slice(0, 10), 16) % 1e8).padStart(8, "0");
  const accessKey = generateNfeAccessKey({
    ufCode: "41",
    yearMonth: issuedAt.slice(2, 4) + issuedAt.slice(5, 7),
    cnpj: resolved.document.issuer.cnpj,
    model: resolved.document.model,
    series: sequence.series,
    number: reservation.number,
    emissionType: "1",
    randomCode
  }).accessKey;
  let signedXml;
  try {
    let xml = serializeFiscalDocument(facts, resolved.document, rules, {
      accessKey,
      series: Number(sequence.series),
      number: reservation.number,
      issuedAt
    });
    xml = appendResponsibleTechnician(xml, accessKey, tech);
    await validateUnsignedNfeStructure(xml);
    signedXml = signNfeXml(xml, cert.privateKeyPem, cert.certDerBase64);
    await validateNfeAgainstOfficialSchema(signedXml);
    await assertXmlFiscalSelections(facts, signedXml);
  } catch (error) {
    return failure(
      422,
      "HML_XML_INVALID",
      error instanceof Error ? error.message : "XML HML inv\xE1lido.",
      { numberReserved: true, sefazContacted: false }
    );
  }
  const attemptToken = (0, import_node_crypto10.randomUUID)();
  const { data: documentId, error: insertError } = await db.rpc(
    "reserve_hml_nfe_outbound_with_replacement",
    {
      p_attempt_token: attemptToken,
      p_order_id: command.orderId,
      p_emission_request_id: command.emissionRequestId,
      p_access_key: accessKey,
      p_signed_xml: signedXml,
      p_number: reservation.number,
      p_series: sequence.series,
      p_decision_trace: resolved.document.decisions,
      p_supersedes_document_id: command.supersedesDocumentId || null
    }
  );
  if (insertError || !documentId) {
    const activeAttempt = await activeAttemptMetadata(
      db,
      command.orderId,
      preflight.document.model
    );
    return failure(
      409,
      "HML_ACTIVE_ATTEMPT_OR_PERSISTENCE_FAILED",
      "Tentativa fiscal j\xE1 ativa ou XML n\xE3o p\xF4de ser persistido. Consulte a emiss\xE3o antes de repetir.",
      {
        pending: true,
        numberReserved: true,
        ...activeAttempt,
        ..."documentId" in activeAttempt ? { databaseReason: "ALREADY_ACTIVE_FISCAL_ATTEMPT" } : {}
      }
    );
  }
  const metadata2 = {
    emissionRequestId: command.emissionRequestId,
    documentId,
    orderId: command.orderId,
    fiscalSnapshotId: reservation.snapshotId,
    accessKey,
    nfeNumber: reservation.number,
    series: sequence.series,
    model: resolved.document.model,
    environment: 2
  };
  try {
    return await transmitAndPersist(
      db,
      documentId,
      signedXml,
      accessKey,
      reservation.number,
      metadata2,
      cert,
      attemptToken
    );
  } finally {
    await releaseAttempt(db, documentId, attemptToken);
  }
}

// api/nfe/emit.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var supabaseServiceKey = getSupabaseSecretKey() || "";
async function handler(req, res) {
  let supabase;
  let reservedDocumentId;
  let retryResponseMetadata;
  let retryCertificate;
  let transmissionStarted = false;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const {
      xml: submittedXml,
      environment: submittedEnvironment,
      orderId: submittedOrderId,
      nfeNumber,
      series,
      model: submittedModel,
      accessKey,
      productionConfirmed,
      emissionRequestId,
      fiscalSnapshotId,
      fiscalSnapshotHash: fiscalSnapshotHash2
    } = req.body;
    let xml = typeof submittedXml === "string" ? submittedXml : "";
    let orderId = String(submittedOrderId || "");
    let model = String(submittedModel || "");
    let selectedEnvironment = Number(submittedEnvironment);
    let retryDoc = null;
    if (!req.body.retryDocumentId) {
      const parsedCommand = parseFiscalEmissionCommand(req.body);
      if ("error" in parsedCommand)
        return res.status(400).json({
          success: false,
          code: "INVALID_FISCAL_EMISSION_COMMAND",
          error: parsedCommand.error
        });
      const command = parsedCommand.command;
      if (!supabaseServiceKey)
        return res.status(503).json({
          success: false,
          error: "Servi\xE7o fiscal sem credencial segura do banco."
        });
      supabase = (0, import_supabase_js.createClient)(
        supabaseUrl,
        supabaseServiceKey,
        { db: { retry: false } }
      );
      const fiscalAuthorization2 = await withNfeEmissionStage(
        "operator_authorization",
        () => authorizeFiscalOperator(supabase, req.headers.authorization),
        { emissionRequestId: command.emissionRequestId, environment: command.environment }
      );
      if (!fiscalAuthorization2.ok)
        return res.status(fiscalAuthorization2.status).json({
          success: false,
          error: fiscalAuthorization2.message
        });
      if (command.previewOnly && !fiscalAuthorization2.isAdministrator)
        return res.status(403).json({
          success: false,
          code: "FISCAL_XML_PREVIEW_ADMIN_REQUIRED",
          error: "Somente administradores podem visualizar a pr\xE9via do XML fiscal."
        });
      const normalRecovery = command.previewOnly ? null : await withNfeEmissionStage(
        "idempotency_recovery",
        () => recoverNormalSale(supabase, command),
        { emissionRequestId: command.emissionRequestId, environment: command.environment }
      );
      if (normalRecovery) return res.status(normalRecovery.status).json(normalRecovery.body);
      const recovered = !command.previewOnly && command.environment === 2 ? await withNfeEmissionStage(
        "idempotency_recovery",
        () => recoverHmlTechnical(supabase, command),
        { emissionRequestId: command.emissionRequestId, environment: command.environment }
      ) : null;
      if (recovered) return res.status(recovered.status).json(recovered.body);
      const [{ data: orderRow2, error: orderError2 }, { data: settingsRow, error: settingsError }] = await withNfeEmissionStage(
        "order_and_settings_fetch",
        () => Promise.all([
          supabase.from("orders").select("id,order_type,status,deleted,order_data,version,updated_at").eq("id", command.orderId).maybeSingle(),
          supabase.from("settings").select("data").eq("id", "app").maybeSingle()
        ]),
        { emissionRequestId: command.emissionRequestId, environment: command.environment }
      );
      if (orderError2)
        return res.status(503).json({
          success: false,
          code: "FISCAL_ORDER_SNAPSHOT_UNAVAILABLE",
          error: "N\xE3o foi poss\xEDvel carregar a revis\xE3o fiscal do pedido no servidor."
        });
      if (!orderRow2)
        return res.status(404).json({ success: false, error: "Pedido n\xE3o encontrado." });
      if (!["sale", "showroom"].includes(String(orderRow2.order_type)) || ["cancelled", "cancelado"].includes(String(orderRow2.status || "").toLowerCase()))
        return res.status(409).json({
          success: false,
          code: "ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL",
          error: "Pedido n\xE3o eleg\xEDvel para emiss\xE3o fiscal de sa\xEDda."
        });
      if (!orderRow2.order_data || typeof orderRow2.order_data !== "object" || Array.isArray(orderRow2.order_data) || !Number.isInteger(orderRow2.version) || !orderRow2.updated_at)
        return res.status(409).json({
          success: false,
          code: "ORDER_FISCAL_SNAPSHOT_INCOMPLETE",
          error: "Pedido sem dados ou revis\xE3o necess\xE1rios para snapshot fiscal."
        });
      if (settingsError || !settingsRow?.data || typeof settingsRow.data !== "object" || Array.isArray(settingsRow.data))
        return res.status(503).json({
          success: false,
          code: "ISSUER_PROFILE_UNAVAILABLE",
          error: "Perfil do emitente indispon\xEDvel para preparar o snapshot fiscal."
        });
      const issuerKeys = [
        "companyName",
        "companyAddress",
        "companyCnpj",
        "companyIE",
        "companyIM",
        "companyCRT",
        "companyLogradouro",
        "companyNumero",
        "companyBairro",
        "companyCEP",
        "companyCMun",
        "companyXMun",
        "companyUF",
        "companyPhone",
        "cscId"
      ];
      const issuerSettings = settingsRow.data;
      const issuerProfile = Object.fromEntries(
        issuerKeys.flatMap(
          (key) => issuerSettings[key] === null || issuerSettings[key] === void 0 ? [] : [[key, issuerSettings[key]]]
        )
      );
      const candidate = {
        schemaVersion: 1,
        capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
        order: {
          id: String(orderRow2.id),
          type: String(orderRow2.order_type),
          status: String(orderRow2.status || ""),
          deleted: orderRow2.deleted === true,
          version: Number(orderRow2.version),
          updatedAt: String(orderRow2.updated_at),
          data: orderRow2.order_data
        },
        issuerProfile,
        emissionRequest: {
          id: command.emissionRequestId,
          environment: command.environment,
          itemCsosnOverrides: command.itemCsosnOverrides,
          itemFiscalSelections: command.itemFiscalSelections,
          recipientTaxId: command.recipientTaxId,
          recipientIe: command.recipientIe,
          recipientIeIndicator: command.recipientIeIndicator,
          finalConsumer: command.finalConsumer,
          deliveryByIssuer: command.deliveryByIssuer,
          cardNotIntegrated: command.cardNotIntegrated,
          hasTransport: command.hasTransport,
          transportResponsible: command.transportResponsible,
          freightContractResponsible: command.freightContractResponsible,
          transporter: command.transporter,
          freightMode: command.freightMode
        }
      };
      if (command.environment === 2 && candidate.order.data.fiscalScenario === "HML_TECHNICAL_V1") {
        if (command.previewOnly)
          return res.status(422).json({
            success: false,
            code: "FISCAL_PREVIEW_UNSUPPORTED_SCENARIO",
            error: "A pr\xE9via assinada ainda n\xE3o est\xE1 dispon\xEDvel para este cen\xE1rio fiscal t\xE9cnico.",
            numberReserved: false,
            sefazContacted: false
          });
        const result2 = await emitHmlTechnical(supabase, command, candidate, issuerSettings);
        return res.status(result2.status).json(result2.body);
      }
      const result = await withNfeEmissionStage(
        "normal_sale_pipeline",
        () => emitNormalSale(supabase, command, candidate, issuerSettings, fiscalAuthorization2.userId),
        { environment: command.environment }
      );
      return res.status(result.status).json(result.body);
    }
    if (!xml && !req.body.retryDocumentId) {
      return res.status(400).json({ error: "XML da NF-e n\xE3o fornecido no payload." });
    }
    if (!req.body.retryDocumentId) {
      const xmlEnvironment = String(xml).match(/<tpAmb>(\d+)<\/tpAmb>/)?.[1];
      const xmlModel = String(xml).match(/<mod>(\d+)<\/mod>/)?.[1];
      if (![1, 2].includes(selectedEnvironment) || !["55", "65"].includes(String(model)) || xmlEnvironment !== String(selectedEnvironment) || xmlModel !== String(model) || !orderId || !nfeNumber || !ACCESS_KEY_PATTERN.test(String(accessKey)) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(fiscalSnapshotId || "")
      ) || !/^[0-9a-f]{64}$/.test(String(fiscalSnapshotHash2 || "")) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(emissionRequestId || "")
      )) {
        return res.status(400).json({ success: false, error: "Dados da emiss\xE3o incompletos ou ambiente inv\xE1lido." });
      }
      const envelopeError = validateOrdinaryOutboundEnvelope({
        xml: String(xml),
        accessKey: String(accessKey),
        model: String(model),
        environment: selectedEnvironment,
        nfeNumber: Number(nfeNumber),
        series: String(series || "1")
      });
      if (envelopeError) return res.status(400).json({ success: false, error: envelopeError });
      await validateNfeAgainstOfficialSchema(String(xml));
    }
    if (!supabaseServiceKey)
      return res.status(503).json({ success: false, error: "Servi\xE7o fiscal sem credencial segura do banco." });
    supabase = (0, import_supabase_js.createClient)(
      supabaseUrl,
      supabaseServiceKey,
      { db: { retry: false } }
    );
    const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
    if (!fiscalAuthorization.ok)
      return res.status(fiscalAuthorization.status).json({
        success: false,
        error: fiscalAuthorization.message
      });
    if (req.body.retryDocumentId) {
      const { data, error } = await supabase.from("nfe_documents").select("*").eq("id", String(req.body.retryDocumentId)).maybeSingle();
      if (error || !data)
        return res.status(404).json({
          success: false,
          error: "Documento original n\xE3o encontrado para retransmiss\xE3o."
        });
      retryDoc = data;
      orderId = String(retryDoc.order_id || "");
      model = String(retryDoc.modelo || "");
      selectedEnvironment = Number(retryDoc.ambiente);
      if (selectedEnvironment === 1) {
        if (!supabase) {
          return res.status(503).json({
            success: false,
            code: "PRODUCTION_ORDER_GUARD_UNAVAILABLE",
            error: "N\xE3o foi poss\xEDvel consultar o pedido antes da retransmiss\xE3o."
          });
        }
        const { data: orderForRetry, error: orderLookupError } = await supabase.from("orders").select("order_data").eq("id", orderId).maybeSingle();
        if (orderLookupError || !orderForRetry) {
          return res.status(503).json({
            success: false,
            code: "PRODUCTION_ORDER_GUARD_UNAVAILABLE",
            error: "N\xE3o foi poss\xEDvel confirmar a elegibilidade do pedido antes da retransmiss\xE3o."
          });
        }
        if (orderForRetry.order_data?.is_test === true) {
          return res.status(403).json({
            success: false,
            code: "TEST_ORDER_PRODUCTION_BLOCKED",
            error: "Pedidos marcados como teste n\xE3o podem ser retransmitidos em Produ\xE7\xE3o."
          });
        }
      }
      if (retryDoc.fiscal_ruleset_version === NORMAL_SALE_RULESET_VERSION) {
        const result = await reconcileNormalSale(supabase, retryDoc.id, true, req.body.productionConfirmed === true);
        return res.status(result.status).json(result.body);
      }
      if (selectedEnvironment === 1)
        return res.status(503).json({
          success: false,
          code: "PRODUCTION_FISCAL_RULESET_REQUIRED",
          error: "A retransmiss\xE3o produtiva ainda depende da pol\xEDtica fiscal de Produ\xE7\xE3o; nenhum XML HML ser\xE1 convertido ou reutilizado."
        });
      if (!orderId || ![1, 2].includes(selectedEnvironment) || !["55", "65"].includes(model))
        return res.status(409).json({
          success: false,
          error: "Documento original sem pedido, modelo ou ambiente fiscal v\xE1lido."
        });
      retryResponseMetadata = {
        documentId: retryDoc.id,
        orderId,
        accessKey: String(retryDoc.chave_acesso || ""),
        nfeNumber: Number(retryDoc.numero_nfe),
        series: String(retryDoc.serie || ""),
        model,
        environment: selectedEnvironment
      };
      if (isHmlRuleSet(retryDoc.fiscal_ruleset_version)) {
        const result = await retryHmlTechnical(supabase, retryDoc.id);
        return res.status(result.status).json(result.body);
      }
      if (retryDoc.status !== "erro")
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error: "Apenas notas em situa\xE7\xE3o de Erro (217) podem ser retransmitidas."
        });
      if (String(retryDoc.motivo_status || "").indexOf("217") === -1 && String(retryDoc.motivo_status || "").toLowerCase().indexOf("n\xE3o consta") === -1)
        return res.status(400).json({
          success: false,
          ...retryResponseMetadata,
          error: "Apenas notas n\xE3o encontradas na SEFAZ (217) podem ser retransmitidas sem nova numera\xE7\xE3o."
        });
    }
    if (selectedEnvironment === 1 && productionConfirmed !== true)
      return res.status(400).json({
        success: false,
        ...retryResponseMetadata,
        error: "Confirma\xE7\xE3o expl\xEDcita de Produ\xE7\xE3o ausente."
      });
    const { data: orderRow, error: orderError } = await supabase.from("orders").select("id,order_type,status").eq("id", String(orderId)).maybeSingle();
    if (orderError || !orderRow)
      return res.status(404).json({
        success: false,
        ...retryResponseMetadata,
        error: "Pedido n\xE3o encontrado para emiss\xE3o fiscal."
      });
    if (!["sale", "showroom"].includes(String(orderRow.order_type)) || ["cancelled", "cancelado"].includes(String(orderRow.status).toLowerCase())) {
      return res.status(409).json({
        success: false,
        ...retryResponseMetadata,
        error: "A emiss\xE3o de sa\xEDda s\xF3 pode ser solicitada para pedido comercial v\xE1lido. Devolu\xE7\xF5es e estornos usam o fluxo fiscal pr\xF3prio."
      });
    }
    if (!req.body.retryDocumentId) {
      const { data: fiscalSnapshot, error: snapshotError } = await supabase.from("nfe_fiscal_snapshots").select(
        "id,emission_request_id,order_id,requested_model,environment,series,reserved_number,snapshot_sha256"
      ).eq("id", String(fiscalSnapshotId)).maybeSingle();
      if (snapshotError || !fiscalSnapshot || fiscalSnapshot.emission_request_id !== String(emissionRequestId) || fiscalSnapshot.order_id !== String(orderId) || fiscalSnapshot.requested_model !== String(model) || Number(fiscalSnapshot.environment) !== selectedEnvironment || fiscalSnapshot.series !== String(series || "1") || Number(fiscalSnapshot.reserved_number) !== Number(nfeNumber) || fiscalSnapshot.snapshot_sha256 !== String(fiscalSnapshotHash2)) {
        return res.status(409).json({
          success: false,
          error: "O snapshot fiscal n\xE3o corresponde a esta tentativa de emiss\xE3o."
        });
      }
    }
    let settings = {};
    if (!req.body.retryDocumentId) {
      const { data: settingsRow, error: settingsErr } = await supabase.from("settings").select("data").eq("id", "app").maybeSingle();
      if (settingsErr || !settingsRow?.data)
        return res.status(503).json({
          success: false,
          error: "Configura\xE7\xE3o fiscal indispon\xEDvel para validar o estabelecimento."
        });
      settings = settingsRow.data;
    }
    if (!req.body.retryDocumentId) {
      const configuredMunicipality = String(settings.companyCMun || "");
      const xmlMunicipality = String(xml).match(/<cMunFG>(\d{7})<\/cMunFG>/)?.[1];
      if (!/^\d{7}$/.test(configuredMunicipality) || xmlMunicipality !== configuredMunicipality)
        return res.status(409).json({
          success: false,
          error: "O munic\xEDpio do fato gerador no XML n\xE3o corresponde ao munic\xEDpio configurado para o estabelecimento."
        });
    }
    if (!req.body.retryDocumentId && String(model) === "55") {
      const responsibleTechnician = getResponsibleTechnicianConfig(
        process.env,
        selectedEnvironment
      );
      if (!responsibleTechnician)
        return res.status(503).json({
          success: false,
          error: "Configura\xE7\xE3o segura do respons\xE1vel t\xE9cnico/CSRT indispon\xEDvel para NF-e."
        });
      try {
        xml = appendResponsibleTechnician(xml, String(accessKey), responsibleTechnician);
        await validateNfeAgainstOfficialSchema(xml);
      } catch {
        return res.status(400).json({
          success: false,
          error: "N\xE3o foi poss\xEDvel preparar o grupo do respons\xE1vel t\xE9cnico da NF-e."
        });
      }
    }
    let documentId;
    let signedXml = String(xml);
    if (req.body.retryDocumentId) {
      if (!retryDoc)
        return res.status(404).json({ success: false, error: "Documento original n\xE3o encontrado para retransmiss\xE3o." });
      const retryXml = typeof retryDoc.xml_nfe === "string" ? retryDoc.xml_nfe : "";
      if (String(retryDoc.modelo) === "55" && !hasResponsibleTechnicianCsrt(retryXml)) {
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error: "XML original sem CSRT exigido pela SEFA/PR; a retransmiss\xE3o imut\xE1vel foi bloqueada."
        });
      }
      const retryEnvelopeError = validateOrdinaryOutboundEnvelope({
        xml: retryXml,
        accessKey: String(retryDoc.chave_acesso || ""),
        model: String(retryDoc.modelo),
        environment: Number(retryDoc.ambiente),
        nfeNumber: Number(retryDoc.numero_nfe),
        series: String(retryDoc.serie || "")
      });
      if (retryEnvelopeError) {
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error: "XML persistido n\xE3o confere com a chave e a numera\xE7\xE3o originais; retransmiss\xE3o bloqueada."
        });
      }
      await validateNfeAgainstOfficialSchema(retryXml);
      const pfxBase642 = process.env.NFE_CERTIFICATE_BASE64;
      if (!pfxBase642)
        return res.status(503).json({
          success: false,
          ...retryResponseMetadata,
          error: "Certificado digital A1 n\xE3o configurado no servidor fiscal."
        });
      retryCertificate = extractCertificateAndKey(
        pfxBase642,
        process.env.NFE_CERTIFICATE_PASSWORD || ""
      );
      const { data: reactivated, error: reactivateErr } = await supabase.from("nfe_documents").update({ status: "processando", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", retryDoc.id).eq("status", "erro").select("id").maybeSingle();
      if (reactivateErr || !reactivated)
        return res.status(409).json({
          success: false,
          ...retryResponseMetadata,
          error: "A nota n\xE3o p\xF4de ser reativada. Pode j\xE1 estar em processamento."
        });
      documentId = retryDoc.id;
      signedXml = retryXml;
      reservedDocumentId = documentId;
    } else {
      const isHomologacao2 = selectedEnvironment === 2;
      const documentStatus2 = isHomologacao2 ? "homologada" : "autorizada";
      const { data: existingAuthorized } = await supabase.from("nfe_documents").select("id").eq("order_id", orderId).eq("status", documentStatus2).limit(1).maybeSingle();
      if (existingAuthorized) {
      }
      try {
        const { data: reservedId, error: rpcErr } = await supabase.rpc(
          "reserve_nfe_outbound_emission",
          {
            p_order_id: orderId,
            p_modelo: String(model),
            p_ambiente: selectedEnvironment,
            p_emission_request_id: emissionRequestId,
            p_chave_acesso: accessKey,
            p_xml_nfe: xml,
            p_numero_nfe: Number(nfeNumber),
            p_serie: String(series || "1")
          }
        );
        if (rpcErr) {
          if (rpcErr.message.includes("ALREADY_ACTIVE")) {
            return res.status(409).json({
              success: false,
              pending: true,
              documentId: rpcErr.message.split(":")[2],
              error: "J\xE1 existe uma tentativa ativa ou em andamento para esse pedido. Consulte a situa\xE7\xE3o."
            });
          }
          if (rpcErr.message.includes("DUPLICATE_IDEMPOTENCY")) {
            return res.status(409).json({
              success: false,
              error: "Esta tentativa (ID de requisi\xE7\xE3o) j\xE1 foi registrada."
            });
          }
          throw rpcErr;
        }
        documentId = String(reservedId);
        reservedDocumentId = documentId;
      } catch {
        return res.status(503).json({
          success: false,
          error: "N\xE3o foi poss\xEDvel reservar a emiss\xE3o de forma at\xF4mica. Tente novamente."
        });
      }
    }
    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfxBase64) {
      if (!req.body.retryDocumentId)
        await supabase.from("nfe_documents").update({
          status: "erro",
          motivo_status: "Certificado digital n\xE3o configurado",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", documentId);
      return res.status(400).json({
        success: false,
        ...retryResponseMetadata,
        error: "Certificado digital A1 n\xE3o configurado no servidor fiscal."
      });
    }
    const { privateKeyPem, certPem, certDerBase64 } = retryCertificate || extractCertificateAndKey(pfxBase64, pfxPassword || "");
    if (!req.body.retryDocumentId) {
      signedXml = signNfeXml(String(xml), privateKeyPem, certDerBase64);
    }
    if (!req.body.retryDocumentId) await validateNfeAgainstOfficialSchema(signedXml);
    const idLote = String(Date.now()).slice(-15);
    const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    const isHomologacao = selectedEnvironment === 2;
    const sefazUrl = getNfeAuthorizationEndpoint(
      String(model),
      selectedEnvironment
    );
    console.log(
      `[NF-e Emit] Enviando lote ${idLote} para SEFAZ-PR (${isHomologacao ? "Homologa\xE7\xE3o" : "Produ\xE7\xE3o"})...`
    );
    let sefazResponseXml;
    try {
      transmissionStarted = true;
      sefazResponseXml = await withNfeEmissionStage(
        "sefaz_transmission",
        () => sendSoapToSefaz({
          url: sefazUrl,
          action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
          xmlPayload: enviNfeXml,
          certPem,
          privateKeyPem
        }),
        { environment: selectedEnvironment, model }
      );
    } catch (soapErr) {
      const diagnosticId = (0, import_node_crypto11.randomUUID)();
      const transportDiagnostic = sefazTransportDiagnostic(soapErr);
      const attemptDiagnostic = { diagnosticId, emissionRequestId, ...transportDiagnostic };
      console.error("[NF-e Emit] Falha de transporte:", { documentId, ...attemptDiagnostic });
      await supabase.from("nfe_documents").update({
        status: "pendente",
        motivo_status: `Resultado da transmiss\xE3o n\xE3o confirmado: ${JSON.stringify(attemptDiagnostic)}`,
        xml_nfe: signedXml,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", documentId);
      return res.status(502).json({
        success: false,
        pending: true,
        ...retryResponseMetadata,
        documentId,
        signedXml,
        diagnosticId,
        diagnosticStage: "sefaz-transmission",
        transportDiagnostic,
        error: "Transmiss\xE3o sem resposta confirmada. Consulte a chave original antes de tentar novamente."
      });
    }
    const parsed = parseSefazAuthorization(sefazResponseXml);
    const documentStatus = parsed.authorized ? isHomologacao ? "homologada" : "autorizada" : parsed.pending ? "pendente" : "erro";
    const { error: documentPersistError } = await supabase.from("nfe_documents").update({
      status: documentStatus,
      motivo_status: parsed.xMotivo || `SEFAZ cStat ${parsed.cStat || "desconhecido"}`,
      xml_nfe: signedXml,
      xml_protocolo: sefazResponseXml,
      numero_protocolo: parsed.protocolNumber || null,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", documentId);
    let fiscalSnapshotSyncError = false;
    if (parsed.authorized) {
      try {
        const invoiceLines = parseAuthorizedInvoiceLines(signedXml);
        const { error: linesError } = await supabase.from("nfe_document_items").upsert(
          invoiceLines.map((line) => ({
            document_id: documentId,
            item_number: line.invoiceItemNumber,
            product_code: line.productCode,
            description: line.description,
            billed_quantity: line.billedQuantity,
            unit_value: line.unitValue,
            gross_value: line.grossValue,
            discount_value: line.discountValue,
            product_xml: line.productXml,
            taxes_xml: line.taxesXml
          })),
          { onConflict: "document_id,item_number" }
        );
        if (linesError) {
          fiscalSnapshotSyncError = true;
          console.error(
            "[NF-e Emit] Nota autorizada, mas itens fiscais precisam de reconcilia\xE7\xE3o:",
            linesError.message
          );
        }
      } catch (snapshotError) {
        fiscalSnapshotSyncError = true;
        console.error(
          "[NF-e Emit] Nota autorizada sem snapshot fiscal de itens:",
          snapshotError?.message || "erro de leitura"
        );
      }
    }
    return res.status(200).json({
      success: parsed.authorized,
      ...retryResponseMetadata,
      pending: parsed.pending,
      cStat: parsed.cStat,
      xMotivo: parsed.xMotivo,
      protocolNumber: parsed.protocolNumber,
      protocolDate: parsed.protocolDate,
      reconciliationRequired: fiscalSnapshotSyncError || Boolean(documentPersistError),
      signedXml,
      sefazResponseXml
    });
  } catch (err) {
    console.error("[NF-e Emit] Erro inesperado:", err);
    if (supabase && reservedDocumentId && !transmissionStarted) {
      await supabase.from("nfe_documents").update({
        status: "erro",
        motivo_status: err instanceof Error && err.message.startsWith("XML da NF-e n\xE3o passou pelo schema oficial") ? `Falha de valida\xE7\xE3o XSD antes da transmiss\xE3o; nenhuma autoriza\xE7\xE3o foi confirmada. ${err.message}` : "Falha antes da transmiss\xE3o \xE0 SEFAZ; nenhuma autoriza\xE7\xE3o foi confirmada.",
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", reservedDocumentId);
    }
    const schemaFailure = err instanceof Error && err.message.startsWith("XML da NF-e n\xE3o passou pelo schema oficial");
    return res.status(schemaFailure ? 422 : 500).json({
      success: false,
      ...retryResponseMetadata,
      ...schemaFailure && !req.body?.retryDocumentId ? { numberReserved: true, reservedNumber: Number(req.body?.nfeNumber) } : {},
      error: schemaFailure && !req.body?.retryDocumentId ? `${err.message} O n\xFAmero ${req.body?.nfeNumber} j\xE1 foi consumido pela sequ\xEAncia; nenhuma transmiss\xE3o foi feita.` : err.message || "Erro interno ao processar NF-e."
    });
  }
}
//# sourceMappingURL=emit.cjs.map
