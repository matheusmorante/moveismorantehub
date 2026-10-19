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

// api/nfe/cancel.ts
var cancel_exports = {};
__export(cancel_exports, {
  default: () => handler
});
module.exports = __toCommonJS(cancel_exports);
var import_supabase_js = require("@supabase/supabase-js");

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
function signNfeEventXml(xml, privateKeyPem, certDerBase64) {
  return signFiscalEventXml(xml, privateKeyPem, certDerBase64, "infEvento");
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
    if (transportError && typeof transportError === "object" && Object.isExtensible(transportError))
      Object.defineProperty(transportError, "sefazTransportContext", {
        value: context,
        configurable: true
      });
    throw transportError;
  } finally {
    httpsAgent.destroy();
  }
}

// erp/src/pages/utils/nfe/nfeEventRules.ts
var readTag = (xml, tag) => {
  const name = `(?:[\\w.-]+:)?${tag}`;
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
};
var getAuthorizedAt = (protocolXml, fallbackDate) => readTag(protocolXml || "", "dhRecbto") || fallbackDate;
var getCancellationWindow = (model, authorizedAt, now = Date.now()) => {
  const authorizedTimestamp = new Date(authorizedAt).getTime();
  const limitMs = model === "65" ? 30 * 60 * 1e3 : model === "55" ? 168 * 60 * 60 * 1e3 : 0;
  const deadline = authorizedTimestamp + limitMs;
  const valid = limitMs > 0 && Number.isFinite(authorizedTimestamp) && authorizedTimestamp <= now;
  return {
    valid,
    deadline: valid ? new Date(deadline) : null,
    remainingMs: valid ? Math.max(deadline - now, 0) : 0,
    // The legal wording is “não superior a X horas”: the exact endpoint is
    // still within the limit; expiry starts on the following instant.
    expired: !valid || now > deadline
  };
};
var validateCancellationReason = (reason) => {
  const length = Array.from(reason.trim()).length;
  if (length < 15 || length > 255) return "A justificativa deve ter entre 15 e 255 caracteres.";
  return null;
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
function decideCancellationRecovery(previousEventStatus, situation) {
  if (situation === "cancelled") return "already_cancelled";
  if (situation !== "authorized") return "still_uncertain";
  if (previousEventStatus === "registered") return "manual_reconciliation";
  return previousEventStatus ? "retry_after_authorized_consult" : "send";
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
async function validateCancellationAgainstOfficialSchema(xml, expected) {
  await validatePinnedSchema(
    xml,
    "api/nfe/schemas/Evento_NT2026.004/envEvento_v1.00.xsd",
    "Evento_NT2026.004"
  );
  const document = new import_xmldom.DOMParser().parseFromString(xml, "text/xml");
  const ns = "http://www.portalfiscal.inf.br/nfe";
  const events = document.getElementsByTagNameNS(ns, "infEvento");
  const detail = document.getElementsByTagNameNS(ns, "detEvento");
  const tag = (name) => {
    const elements = events[0]?.getElementsByTagNameNS(ns, name);
    return elements?.length === 1 ? elements[0].textContent : null;
  };
  if (events.length !== 1 || detail.length !== 1 || tag("tpEvento") !== "110111" || tag("nSeqEvento") !== "1" || tag("chNFe") !== expected.accessKey || tag("tpAmb") !== String(expected.environment) || tag("nProt") !== expected.protocol || events[0].getAttribute("Id") !== `ID110111${expected.accessKey}01`) {
    throw new Error("Identidade do evento de cancelamento divergente do documento.");
  }
  const fragment = detail[0].cloneNode(true);
  fragment.setAttribute("xmlns", ns);
  await validatePinnedSchema(
    new import_xmldom.XMLSerializer().serializeToString(fragment),
    "api/nfe/schemas/Evento_Canc_PL_v1.01/e110111_v1.00.xsd",
    "Evento_Canc_PL_v1.01"
  );
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

// shared-utils/fiscalDocumentModel.ts
var HOMOLOGATION_FIRST_ITEM_DESCRIPTION = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
var HOMOLOGATION_NFE_RECIPIENT_NAME = "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
function shouldUseHomologationFirstItemDescription(input) {
  return input.environment === 2 && (input.model === "65" || input.model === "55" && input.printType === "6");
}
function getHomologationRecipientName(input) {
  return input.environment === 2 ? HOMOLOGATION_NFE_RECIPIENT_NAME : input.recipientName;
}

// shared-utils/fiscalIdentifiers.ts
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;
function normalizeFiscalIdentifier(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
}

// shared-utils/fiscalIcmsGroups.ts
var ZERO_OWN_ICMS_CSOSNS = ["102", "103", "300", "400"];
function zeroOwnIcmsGroup(csosn) {
  if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn))
    throw new Error(`CSOSN ${csosn || "n\xE3o informado"} exige determina\xE7\xE3o e grupo tribut\xE1rio espec\xEDficos.`);
  return "ICMSSN102";
}

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

// erp/src/pages/utils/nfe/nfeXmlBuilder.ts
function getSaoPauloDateParts(instant) {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime()))
    throw new Error("Instante de emiss\xE3o inv\xE1lido.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}
function formatNfeDateTime(instant) {
  const parts = getSaoPauloDateParts(instant);
  const localTimeAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMinutes = Math.round((localTimeAsUtc - instant.getTime()) / 6e4);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, "0")}:${String(absoluteOffsetMinutes % 60).padStart(2, "0")}`;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

// api/nfe/cancellationEventXml.ts
var escapeXml2 = (value) => value.replace(
  /[<>&"']/g,
  (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
  })[character]
);
function extractIssuerCnpjFromXml(xml) {
  return xml.match(/<emit\b[^>]*>[\s\S]*?<CNPJ>([A-Z0-9]{12}[0-9]{2})<\/CNPJ>/i)?.[1] || null;
}
function buildCancellationEventXml(params) {
  const timestamp = params.timestamp || formatNfeDateTime(/* @__PURE__ */ new Date());
  const batchId = params.batchId || Date.now().toString().slice(-15);
  const escapedProtocol = escapeXml2(String(params.protocolNumber));
  const escapedReason = escapeXml2(params.reason.trim());
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote><evento versao="1.00"><infEvento Id="ID110111${params.chaveAcesso}01"><cOrgao>41</cOrgao><tpAmb>${params.environment}</tpAmb><CNPJ>${params.issuerCnpj}</CNPJ><chNFe>${params.chaveAcesso}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${escapedProtocol}</nProt><xJust>${escapedReason}</xJust></detEvento></infEvento></evento></envEvento>`;
}

// erp/src/pages/utils/nfe/cancellationEligibility.ts
var getExplicitGoodsCirculationState = (row) => {
  const data = row?.order_data || {};
  const shipping = data.shipping || row?.shipping || {};
  const deliveryStatus = String(
    row?.delivery_status || row?.deliveryStatus || data.deliveryStatus || shipping.deliveryStatus || ""
  ).trim().toLowerCase();
  if (["delivered", "entregue", "retirado"].includes(deliveryStatus)) {
    return "completed";
  }
  const deliveryConfirmedAt = shipping.deliveryFinishedAt || row?.delivery_finished_at || row?.deliveryFinishedAt || data.deliveryFinishedAt;
  const pickupConfirmedAt = shipping.pickupConfirmedAt || row?.pickupConfirmedAt || data.pickupConfirmedAt;
  if (deliveryConfirmedAt || pickupConfirmedAt) return "completed";
  const unfinishedStatuses = /* @__PURE__ */ new Set([
    "in_transit",
    "in-transit",
    "out_for_delivery",
    "out-for-delivery",
    "em_transito",
    "em_rota",
    "em rota",
    "em_entrega",
    "em entrega",
    "in_progress",
    "in_service",
    "unattended",
    "refused",
    "recusado",
    "returning",
    "returned",
    "returned_to_store",
    "devolvido"
  ]);
  const normalizedDeliveryStatus = deliveryStatus.trim().toLowerCase();
  if (data.autoFulfilledAfter12h === true || unfinishedStatuses.has(normalizedDeliveryStatus) || shipping.deliveryStartedAt || shipping.deliveryArrivedAt || shipping.unattendedAt || row?.delivery_started_at || row?.delivery_arrived_at || row?.deliveryStartedAt || row?.deliveryArrivedAt) {
    return "in_progress";
  }
  return "none";
};
function getGoodsCirculationState(row) {
  const explicitState = getExplicitGoodsCirculationState(row);
  if (explicitState !== "none") return explicitState;
  const orderStatus = String(row?.status || "").trim().toLowerCase();
  if (["fulfilled", "atendido", "delivered", "entregue", "retirado"].includes(orderStatus)) {
    return "completed";
  }
  return "none";
}

// erp/src/pages/utils/nfe/fiscalCancellationPolicy.ts
function getFiscalCancellationPolicy(input) {
  if (input.goodsCirculated) {
    return {
      action: "return",
      reason: "A mercadoria j\xE1 circulou; use o fluxo de devolu\xE7\xE3o comercial.",
      deadline: null
    };
  }
  const authorizedStatus = input.environment === 1 ? "autorizada" : "homologada";
  if (input.status !== authorizedStatus) {
    return {
      action: "none",
      reason: "N\xE3o existe documento autorizado para tratar fiscalmente.",
      deadline: null
    };
  }
  if (String(input.issuerUf || "").trim().toUpperCase() !== "PR") {
    return {
      action: "manual_review",
      reason: "A UF do emitente n\xE3o est\xE1 confirmada como Paran\xE1; n\xE3o h\xE1 prazo fiscal espec\xEDfico configurado para decidir automaticamente.",
      deadline: null
    };
  }
  const window = getCancellationWindow(input.model, input.authorizedAt, input.now);
  if (!window.valid) {
    return {
      action: "manual_review",
      reason: "A autoriza\xE7\xE3o original n\xE3o tem uma data v\xE1lida.",
      deadline: null
    };
  }
  if (!window.expired) return { action: "cancel", deadline: window.deadline };
  if (!input.operationDidNotOccur) {
    return {
      action: "manual_review",
      reason: "O prazo expirou e a opera\xE7\xE3o n\xE3o foi comprovada como n\xE3o realizada.",
      deadline: window.deadline
    };
  }
  if (!["55", "65"].includes(input.model)) {
    return {
      action: "manual_review",
      reason: "O prazo expirou e o modelo " + (input.model || "n\xE3o identificado") + " n\xE3o tem procedimento de estorno configurado.",
      deadline: window.deadline
    };
  }
  return {
    action: "estorno",
    reason: input.model === "65" ? "O prazo de cancelamento da NFC-e expirou. No Paran\xE1, prepare uma NF-e modelo 55 de ajuste referenciando a NFC-e original." : "O prazo de cancelamento da NF-e expirou. Prepare uma NF-e modelo 55 de ajuste referenciando o documento original.",
    deadline: window.deadline
  };
}

// api/nfe/fiscalXmlAudit.ts
var import_xmldom2 = require("@xmldom/xmldom");
var import_xml_crypto2 = require("xml-crypto");
function createStrictXmlParser(parseErrors) {
  return new import_xmldom2.DOMParser({
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
      ["modBC", "vBC", "pICMS", "vICMS"].forEach((field) => expectedFields.add(field));
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
  verifier.loadSignature(signature);
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
    const fields = [
      [`itens[${n}].codigo`, code, fiscalItem.product.code],
      [`itens[${n}].descricao`, description, fiscalItem.product.description],
      [`itens[${n}].quantidade`, quantity, fiscalItem.product.quantity, 1e-6],
      [`itens[${n}].valorBruto`, gross, fiscalItem.product.gross],
      [`itens[${n}].desconto`, vDescCents / 100, fiscalItem.product.discount],
      [`itens[${n}].valorUnitario`, gross / quantity, fiscalItem.product.unitValue, 1e-6],
      [`itens[${n}].frete`, freight2, fiscalItem.product.freight],
      [`itens[${n}].outrasDespesas`, otherExpenses, fiscalItem.product.otherExpenses]
    ];
    for (const [field, expected, actual, tolerance = 5e-3] of fields) {
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

// shared-utils/orderPaymentState.ts
var normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function classifyOrderPaymentSettlement(status) {
  if (status === void 0 || status === null) return "paid";
  const normalized = normalize(String(status));
  if (normalized.startsWith("pago")) return "paid";
  if (normalized.startsWith("pendente")) return "pending";
  return "unconfirmed";
}
function isPromissoryPaymentMethod(method) {
  return typeof method === "string" && normalize(method).includes("promissoria");
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

// api/nfe/normal-sale/values.ts
var obj = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Fatos fiscais obrigat\xF3rios ausentes.");
  return value;
};
var normalize2 = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
var money = (value, field, positive = false) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < (positive ? 0.01 : 0) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw new Error(`${field} inv\xE1lido ou fora da precis\xE3o de centavos.`);
  return Math.round(value * 100);
};

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
    const amountCents = money(amountValue, `Pagamento ${index + 1}`, true);
    const settlement = classifyOrderPaymentSettlement(payment2.status);
    if (settlement === "unconfirmed")
      throw new Error(
        `Pagamento ${index + 1} est\xE1 como \u201C${String(payment2.status)}\u201D; confirme se foi recebido ou permanece pendente antes de transmitir.`
      );
    const originalMethod = typeof payment2.method === "string" ? payment2.method.trim() : "";
    const method = normalize2(originalMethod);
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
  const billingInstallments = modelDecision.model === "55" && billingParts.length > 0 ? billingParts.sort((left, right) => {
    if (!left.dueDate) return right.dueDate ? 1 : 0;
    if (!right.dueDate) return -1;
    return left.dueDate.localeCompare(right.dueDate);
  }).map((part, index) => ({
    number: String(index + 1).padStart(3, "0"),
    ...part.dueDate ? { dueDate: part.dueDate } : {},
    amount: part.amountCents / 100
  })) : void 0;
  return { payments, payment, billingInstallments };
}

// api/nfe/orderEditFiscalAudit.ts
var objectValue2 = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var normalizeText = (value) => String(value ?? "").trim();
var normalizeTaxId2 = (value) => normalizeFiscalIdentifier(value);
var moneyMatches = (left, right) => {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 5e-3;
};
var sameValue = (left, right) => normalizeText(left) === normalizeText(right);
function projectOrderDataForFiscalEdit(current, submitted) {
  const allowed = [
    "items",
    "shipping",
    "payments",
    "paymentsSummary",
    "itemsSummary",
    "customerData",
    "fiscalContext",
    "date",
    "status",
    "orderType",
    "observation"
  ];
  const projected = { ...current };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(submitted, key)) projected[key] = submitted[key];
  }
  return projected;
}
function hasPotentialFiscalOrderEdit(current, proposed) {
  const fields = (data) => ({
    items: Array.isArray(data.items) ? data.items.map((item) => ({
      orderItemId: item.orderItemId,
      productId: item.productId,
      variationId: item.variationId,
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitDiscount: item.unitDiscount,
      discountType: item.discountType,
      condition: item.condition,
      itemType: item.itemType,
      fiscal: item.fiscal ? {
        ncm: item.fiscal.ncm,
        cest: item.fiscal.cest,
        origem: item.fiscal.origem,
        cfop: item.fiscal.cfop,
        cst: item.fiscal.cst,
        pisCst: item.fiscal.pisCst,
        cofinsCst: item.fiscal.cofinsCst,
        icmsPercent: item.fiscal.icmsPercent,
        ipiPercent: item.fiscal.ipiPercent,
        hasSt: item.fiscal.hasSt,
        isSt: item.fiscal.isSt,
        isOwnProduction: item.fiscal.isOwnProduction,
        merchandiseOrigin: item.fiscal.merchandiseOrigin
      } : void 0
    })) : [],
    customerData: {
      fullName: data.customerData?.fullName,
      name: data.customerData?.name,
      cpfCnpj: data.customerData?.cpfCnpj,
      ie: data.customerData?.ie,
      ieIndicator: data.customerData?.ieIndicator,
      fullAddress: data.customerData?.fullAddress
    },
    shipping: {
      value: data.shipping?.value,
      deliveryMethod: data.shipping?.deliveryMethod,
      useCustomerAddress: data.shipping?.useCustomerAddress,
      deliveryAddress: data.shipping?.deliveryAddress,
      freightMode: data.shipping?.freightMode,
      transporter: data.shipping?.transporter
    },
    payments: Array.isArray(data.payments) ? data.payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      fiscalCard: payment.fiscalCard,
      installments: payment.installments,
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate
    })) : [],
    paymentsSummary: { totalOrderValue: data.paymentsSummary?.totalOrderValue },
    fiscalContext: {
      operationType: data.fiscalContext?.operationType,
      purpose: data.fiscalContext?.purpose,
      finalConsumer: data.fiscalContext?.finalConsumer,
      presence: data.fiscalContext?.presence,
      acquisitionPurpose: data.fiscalContext?.acquisitionPurpose,
      requiresTaxCredit: data.fiscalContext?.requiresTaxCredit,
      publicAdministrationRequirement: data.fiscalContext?.publicAdministrationRequirement,
      otherFiscalRequirement: data.fiscalContext?.otherFiscalRequirement,
      recipientIeIndicator: data.fiscalContext?.recipientIeIndicator
    }
  });
  return JSON.stringify(fields(current)) !== JSON.stringify(fields(proposed));
}
function assertAuthorizedFiscalSnapshot(snapshot, document) {
  if (!document.emission_request_id || !document.xml_nfe)
    throw new Error("A nota autorizada n\xE3o possui v\xEDnculo t\xE9cnico e XML \xEDntegro para auditoria.");
  if (!["55", "65"].includes(String(document.modelo)) || ![1, 2].includes(Number(document.ambiente)) || document.status !== (Number(document.ambiente) === 2 ? "homologada" : "autorizada"))
    throw new Error("Modelo, ambiente ou autoriza\xE7\xE3o da nota n\xE3o correspondem.");
  if (snapshot.order.id !== document.order_id || snapshot.emissionRequest.id !== document.emission_request_id || Number(snapshot.emissionRequest.environment) !== Number(document.ambiente))
    throw new Error("A fotografia fiscal n\xE3o pertence \xE0 nota autorizada consultada.");
  const resolvedDocument = snapshot.resolvedDocument;
  const issuedAt = document.xml_nfe.match(/<dhEmi(?:\s[^>]*)?>([^<]+)<\/dhEmi>/i)?.[1]?.trim();
  if (!resolvedDocument || resolvedDocument.model !== String(document.modelo) || Number(resolvedDocument.environment) !== Number(document.ambiente) || !issuedAt)
    throw new Error("A fotografia da nota est\xE1 incompleta; revis\xE3o fiscal necess\xE1ria.");
  assertSignedFiscalXmlMatchesSnapshot(snapshot, resolvedDocument, document.xml_nfe, {
    series: document.serie,
    number: Number(document.numero_nfe),
    accessKey: document.chave_acesso,
    issuedAt
  });
  return resolvedDocument;
}
function addMismatch(changes, field, expected, actual) {
  if (changes.some((change) => change.field === field)) return;
  changes.push({
    field,
    expected: normalizeText(expected) || "(vazio)",
    actual: normalizeText(actual) || "(vazio)"
  });
}
function resolveCustomerAddress(orderData) {
  const shipping = objectValue2(orderData.shipping);
  if (shipping.useCustomerAddress === false) {
    return objectValue2(shipping.deliveryAddress);
  }
  return objectValue2(objectValue2(orderData.customerData).fullAddress);
}
function compareChangedCustomerFields(changes, original, proposed, document) {
  const before = objectValue2(original.customerData);
  const after = objectValue2(proposed.customerData);
  const recipient = document.recipient;
  const changed = (key) => !sameValue(before[key], after[key]);
  if (changed("cpfCnpj") && normalizeTaxId2(after.cpfCnpj) !== normalizeTaxId2(recipient.cpfCnpj))
    addMismatch(changes, "dest.CNPJ/CPF", recipient.cpfCnpj, after.cpfCnpj);
  if ((changed("fullName") || changed("name")) && !sameValue(after.fullName || after.name, recipient.name))
    addMismatch(changes, "dest.xNome", recipient.name, after.fullName || after.name);
  if (changed("ie") && !sameValue(after.ie, recipient.ie))
    addMismatch(changes, "dest.IE", recipient.ie, after.ie);
  if (changed("ieIndicator") && !sameValue(after.ieIndicator, recipient.ieIndicator))
    addMismatch(changes, "dest.indIEDest", recipient.ieIndicator, after.ieIndicator);
  const oldAddress = resolveCustomerAddress(original);
  const newAddress = resolveCustomerAddress(proposed);
  if (!recipient.address) return;
  const addressFields = [
    ["street", "street", "logradouro"],
    ["number", "number", "numero"],
    ["neighborhood", "district", "bairro"],
    ["city", "municipality", "municipio"],
    ["state", "uf", "UF"],
    ["cep", "postalCode", "CEP"]
  ];
  for (const [sourceKey, fiscalKey, label] of addressFields) {
    if (sameValue(oldAddress[sourceKey], newAddress[sourceKey])) continue;
    if (!sameValue(newAddress[sourceKey], recipient.address[fiscalKey])) {
      addMismatch(
        changes,
        `dest.enderDest.${label}`,
        recipient.address[fiscalKey],
        newAddress[sourceKey]
      );
    }
  }
}
function compareChangedItemClassifications(changes, original, proposed, document) {
  const beforeItems = Array.isArray(original.items) ? original.items : [];
  const afterItems = Array.isArray(proposed.items) ? proposed.items : [];
  const fieldMap = [
    ["ncm", "ncm", "NCM"],
    ["cest", "cest", "CEST"],
    ["origem", "origin", "orig"],
    ["cfop", "cfop", "CFOP"]
  ];
  afterItems.forEach((item, index) => {
    const oldFiscal = objectValue2(objectValue2(beforeItems[index]).fiscal);
    const newFiscal = objectValue2(item.fiscal);
    const actual = document.items[index];
    if (!actual) return;
    for (const [sourceKey, actualKey, label] of fieldMap) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const actualValue = actual.classification[actualKey];
      if (!sameValue(newFiscal[sourceKey], actualValue))
        addMismatch(changes, `det[${index + 1}].prod.${label}`, actualValue, newFiscal[sourceKey]);
    }
    if (Object.hasOwn(newFiscal, "cst") && !sameValue(oldFiscal.cst, newFiscal.cst)) {
      const icms = actual.taxes.find((tax) => tax.group === "ICMS");
      if (!sameValue(newFiscal.cst, icms?.code))
        addMismatch(changes, `det[${index + 1}].imposto.ICMS.CST_CSOSN`, icms?.code, newFiscal.cst);
    }
    const taxCodeFields = [
      ["pisCst", "PIS", "CST"],
      ["cofinsCst", "COFINS", "CST"]
    ];
    for (const [sourceKey, group, tag] of taxCodeFields) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const tax = actual.taxes.find((candidate) => candidate.group === group);
      if (!sameValue(newFiscal[sourceKey], tax?.code))
        addMismatch(changes, `det[${index + 1}].imposto.${group}.${tag}`, tax?.code, newFiscal[sourceKey]);
    }
    const taxRates = [
      ["icmsPercent", "ICMS", "pICMS"],
      ["ipiPercent", "IPI", "pIPI"]
    ];
    for (const [sourceKey, group, rateKey] of taxRates) {
      if (!Object.hasOwn(newFiscal, sourceKey) || sameValue(oldFiscal[sourceKey], newFiscal[sourceKey]))
        continue;
      const tax = actual.taxes.find((candidate) => candidate.group === group);
      const rate = tax?.values[rateKey];
      if (!sameValue(newFiscal[sourceKey], rate))
        addMismatch(changes, `det[${index + 1}].imposto.${group}.${rateKey}`, rate, newFiscal[sourceKey]);
    }
  });
}
function compareChangedShipping(changes, original, proposed, document) {
  const before = objectValue2(original.shipping);
  const after = objectValue2(proposed.shipping);
  if (!sameValue(before.freightMode, after.freightMode) && !sameValue(after.freightMode, document.operation.freightMode))
    addMismatch(changes, "transp.modFrete", document.operation.freightMode, after.freightMode);
  const beforeTransporter = objectValue2(before.transporter);
  const afterTransporter = objectValue2(after.transporter);
  const actual = document.operation.transporter;
  const fields = [
    ["cnpj", "cnpj", "CNPJ/CPF"],
    ["cpf", "cpf", "CNPJ/CPF"],
    ["name", "name", "xNome"],
    ["ie", "ie", "IE"],
    ["address", "address", "xEnder"],
    ["city", "city", "xMun"],
    ["uf", "uf", "UF"]
  ];
  for (const [sourceKey, actualKey, label] of fields) {
    if (sameValue(beforeTransporter[sourceKey], afterTransporter[sourceKey])) continue;
    const expected = actual?.[actualKey];
    const matches = label === "CNPJ/CPF" ? normalizeTaxId2(expected) === normalizeTaxId2(afterTransporter[sourceKey]) : sameValue(expected, afterTransporter[sourceKey]);
    if (!matches)
      addMismatch(changes, `transp.transporta.${label}`, expected, afterTransporter[sourceKey]);
  }
}
function paymentProjection(payment) {
  return {
    methodCode: payment.methodCode,
    amount: Number(payment.amount || 0),
    paymentIndicator: payment.paymentIndicator,
    description: payment.description,
    paymentDate: payment.paymentDate,
    card: payment.card
  };
}
function compareEditedPayments(changes, snapshot, proposedData, document) {
  if (JSON.stringify(snapshot.order.data.payments ?? []) === JSON.stringify(proposedData.payments ?? []))
    return;
  const modelDecision = snapshot.emissionRequest.modelDecision;
  if (!modelDecision || modelDecision.status !== "ready") {
    addMismatch(changes, "pag.detPag", "decis\xE3o fiscal original dispon\xEDvel", "n\xE3o foi poss\xEDvel recalcular");
    return;
  }
  try {
    const candidate = {
      ...snapshot,
      order: { ...snapshot.order, data: proposedData }
    };
    const resolved = resolveNormalSalePayments({
      snapshot: candidate,
      data: proposedData,
      shipping: objectValue2(proposedData.shipping),
      modelDecision,
      traces: [...document.decisions],
      invoice: Math.round(document.totals.invoice * 100)
    });
    const expectedPayments = resolved.payments.map(paymentProjection);
    const actualPayments = document.payments.map(paymentProjection);
    if (JSON.stringify(expectedPayments) !== JSON.stringify(actualPayments)) {
      const length = Math.max(expectedPayments.length, actualPayments.length);
      for (let index = 0; index < length; index += 1) {
        const expected = expectedPayments[index];
        const actual = actualPayments[index];
        if (!expected || !actual) {
          addMismatch(
            changes,
            `pag.detPag[${index + 1}]`,
            expected ? "presente" : "(ausente)",
            actual ? "presente" : "(ausente)"
          );
          continue;
        }
        const xmlFieldFor = {
          methodCode: "tPag",
          amount: "vPag",
          paymentIndicator: "indPag",
          description: "xPag",
          paymentDate: "dPag"
        };
        for (const key of ["methodCode", "amount", "paymentIndicator", "description", "paymentDate"]) {
          const matches = key === "amount" ? moneyMatches(expected[key], actual[key]) : sameValue(expected[key], actual[key]);
          if (!matches)
            addMismatch(changes, `pag.detPag[${index + 1}].${xmlFieldFor[key]}`, actual[key], expected[key]);
        }
        if (JSON.stringify(expected.card ?? null) !== JSON.stringify(actual.card ?? null))
          addMismatch(changes, `pag.detPag[${index + 1}].card`, "dados atuais do pedido", "dados autorizados diferentes");
      }
    }
    if (JSON.stringify(resolved.billingInstallments ?? []) !== JSON.stringify(document.billingInstallments ?? []))
      addMismatch(changes, "cobr.dup", "parcelas atuais do pedido", "parcelas autorizadas diferentes");
  } catch {
    addMismatch(changes, "pag.detPag", "dados fiscais recalcul\xE1veis", "n\xE3o foi poss\xEDvel reconciliar os pagamentos");
  }
}
function compareEditedOperation(changes, original, proposed, document) {
  const before = objectValue2(original.fiscalContext);
  const after = objectValue2(proposed.fiscalContext);
  const operationFields = [
    ["purpose", "purpose", "ide.finNFe"],
    ["presence", "presence", "ide.indPres"],
    ["finalConsumer", "finalConsumer", "ide.indFinal"]
  ];
  for (const [sourceKey, fiscalKey, label] of operationFields) {
    if (!Object.hasOwn(after, sourceKey) || sameValue(before[sourceKey], after[sourceKey])) continue;
    const proposedValue = sourceKey === "finalConsumer" ? after[sourceKey] ? "1" : "0" : after[sourceKey];
    if (!sameValue(proposedValue, document.operation[fiscalKey]))
      addMismatch(changes, label, document.operation[fiscalKey], proposedValue);
  }
  const fiscalDecisionFields = [
    "acquisitionPurpose",
    "requiresTaxCredit",
    "publicAdministrationRequirement",
    "otherFiscalRequirement"
  ];
  for (const sourceKey of fiscalDecisionFields) {
    if (!Object.hasOwn(after, sourceKey) || sameValue(before[sourceKey], after[sourceKey])) continue;
    addMismatch(
      changes,
      `fiscalContext.${sourceKey}`,
      before[sourceKey] ?? "escolha fiscal confirmada na emiss\xE3o",
      after[sourceKey]
    );
  }
  if (Object.hasOwn(after, "recipientIeIndicator") && !sameValue(before.recipientIeIndicator, after.recipientIeIndicator) && !sameValue(after.recipientIeIndicator, document.recipient.ieIndicator))
    addMismatch(
      changes,
      "dest.indIEDest",
      document.recipient.ieIndicator,
      after.recipientIeIndicator
    );
  if (!sameValue(before.operationType, after.operationType)) {
    const isOutboundSale = ["sale", "showroom"].includes(normalizeText(after.operationType).toLowerCase());
    if (!isOutboundSale || document.operation.direction !== "outbound")
      addMismatch(changes, "ide.tpNF", document.operation.direction, after.operationType);
  }
}
function findFiscalOrderEditChanges(snapshot, proposedOrderData, document) {
  const changes = [];
  const candidate = {
    ...snapshot,
    order: { ...snapshot.order, data: proposedOrderData }
  };
  try {
    assertFiscalDocumentMatchesCommercialSnapshot(candidate, document);
  } catch (error) {
    if (error instanceof FiscalXmlAuditError) {
      changes.push(...error.mismatches.filter((mismatch) => mismatch.field !== "cliente.id"));
    } else {
      addMismatch(changes, "auditoria.comercial", "dados compar\xE1veis", "n\xE3o foi poss\xEDvel comparar o pedido");
    }
  }
  compareChangedCustomerFields(changes, snapshot.order.data, proposedOrderData, document);
  compareChangedItemClassifications(changes, snapshot.order.data, proposedOrderData, document);
  compareChangedShipping(changes, snapshot.order.data, proposedOrderData, document);
  compareEditedPayments(changes, snapshot, proposedOrderData, document);
  compareEditedOperation(changes, snapshot.order.data, proposedOrderData, document);
  return changes;
}

// api/nfe/cancellationPreflight.ts
async function recordCancellationPreflightFailure(params) {
  try {
    await params.supabase.from("nfe_document_events").insert({
      document_id: params.documentId,
      event_type: "110111",
      event_sequence: 1,
      attempt_number: params.attemptNumber,
      environment: params.environment,
      status: "rejected",
      justification: params.reason,
      signed_xml: "",
      xmotivo: `Falha local antes do envio \xE0 SEFAZ: ${params.errorMessage}`.slice(0, 1e3),
      requested_by: params.userId
    });
  } catch (err) {
    console.error("[NF-e Cancel] Erro ao registrar preflight failure:", err);
  }
}
async function validateCancellationDocument(params) {
  const { supabase, documentId, productionConfirmed } = params;
  const { data: doc, error: docError } = await supabase.from("nfe_documents").select("*").eq("id", documentId).maybeSingle();
  if (docError || !doc)
    return { ok: false, status: 404, error: "Documento fiscal n\xE3o encontrado." };
  return validateCancellationDocumentRecord(doc, productionConfirmed);
}
function validateCancellationDocumentRecord(doc, productionConfirmed) {
  if (!["outbound", "return", "estorno"].includes(String(doc.document_type)))
    return {
      ok: false,
      status: 409,
      error: "Somente uma NF-e de sa\xEDda, devolu\xE7\xE3o ou estorno pode receber este evento de cancelamento."
    };
  if (["return", "estorno"].includes(String(doc.document_type)) && String(doc.modelo) !== "55")
    return {
      ok: false,
      status: 409,
      error: "Cancelamento fiscal de NF-e de devolu\xE7\xE3o ou estorno exige modelo 55."
    };
  if (!["autorizada", "homologada"].includes(doc.status))
    return {
      ok: false,
      status: 409,
      error: "Somente documento autorizado pode receber evento de cancelamento."
    };
  if (!["55", "65"].includes(String(doc.modelo)) || ![1, 2].includes(Number(doc.ambiente)) || doc.status !== (Number(doc.ambiente) === 2 ? "homologada" : "autorizada") || !ACCESS_KEY_PATTERN.test(String(doc.chave_acesso || ""))) {
    return {
      ok: false,
      status: 409,
      error: "Modelo, ambiente ou chave de acesso do documento inv\xE1lidos."
    };
  }
  if (Number(doc.ambiente) === 1 && !productionConfirmed) {
    return {
      ok: false,
      status: 400,
      error: "Confirme explicitamente o cancelamento em Produ\xE7\xE3o."
    };
  }
  if (!/^\d{15}$/.test(String(doc.numero_protocolo || "")) || !doc.xml_nfe) {
    return {
      ok: false,
      status: 409,
      error: "A nota n\xE3o cont\xE9m XML autorizado e protocolo original v\xE1lidos para referenciar o evento."
    };
  }
  return { ok: true, doc };
}
async function validateOperationCancellationContext(params) {
  const { supabase, doc, viaOrderEdit } = params;
  if (!["return", "estorno"].includes(String(doc.document_type)) || String(doc.modelo) !== "55") {
    return { ok: false, status: 409, error: "Esta valida\xE7\xE3o exige NF-e modelo 55 de devolu\xE7\xE3o ou estorno." };
  }
  if (viaOrderEdit) return {
    ok: false,
    status: 409,
    error: "Substitui\xE7\xE3o por edi\xE7\xE3o de pedido aplica-se apenas \xE0 NF-e de venda original."
  };
  if (!doc.original_document_id) return {
    ok: false,
    status: 409,
    error: "A NF-e de devolu\xE7\xE3o ou estorno n\xE3o possui v\xEDnculo com o documento fiscal original."
  };
  if (doc.document_type === "return") {
    if (!doc.related_return_order_id) return {
      ok: false,
      status: 409,
      error: "A NF-e de devolu\xE7\xE3o n\xE3o possui v\xEDnculo com o pedido de devolu\xE7\xE3o comercial."
    };
    const { data: returnOrder, error } = await supabase.from("orders").select("id,status,order_type,linked_order_id,order_data").eq("id", doc.related_return_order_id).maybeSingle();
    if (error || !returnOrder || String(returnOrder.order_type || "").toLowerCase() !== "return") {
      return {
        ok: false,
        status: 409,
        error: "N\xE3o foi poss\xEDvel validar o pedido de devolu\xE7\xE3o comercial vinculado \xE0 NF-e de devolu\xE7\xE3o."
      };
    }
  }
  if (doc.document_type === "estorno") {
    const { data: activeReplacement, error } = await supabase.from("nfe_order_edit_replacements").select("id,status").eq("original_document_id", doc.original_document_id).eq("environment", doc.ambiente).eq("reversal_kind", "estorno").in("status", ["ready_to_reissue", "replacement_prepared", "completed"]).maybeSingle();
    if (error) return {
      ok: false,
      status: 503,
      error: "N\xE3o foi poss\xEDvel verificar substitui\xE7\xF5es fiscais vinculadas ao estorno."
    };
    if (activeReplacement) return {
      ok: false,
      status: 409,
      auditFailure: true,
      error: "Esta NF-e de estorno j\xE1 comp\xF5e uma substitui\xE7\xE3o fiscal de edi\xE7\xE3o aplicada ou conclu\xEDda e n\xE3o pode ser cancelada isoladamente."
    };
  }
  const policy = getFiscalCancellationPolicy({
    model: "55",
    authorizedAt: getAuthorizedAt(String(doc.xml_protocolo || ""), ""),
    status: String(doc.status),
    environment: Number(doc.ambiente),
    goodsCirculated: false,
    operationDidNotOccur: true,
    issuerUf: String(doc.chave_acesso || "").slice(0, 2) === "41" ? "PR" : "",
    now: params.now
  });
  if (policy.action !== "cancel") return {
    ok: false,
    status: 409,
    auditFailure: true,
    error: policy.reason || "Prazo de cancelamento da NF-e (168 horas no Paran\xE1) ultrapassado."
  };
  return { ok: true };
}
async function validateCancellationOrderAndCirculation(params) {
  const { supabase, doc, userId, reason, attemptNumber, viaOrderEdit } = params;
  let orderEditVersion = params.orderEditVersion;
  let proposedOrder = params.proposedOrder;
  const replacementId = params.replacementId;
  if (doc.document_type === "return" || doc.document_type === "estorno") {
    const validation = await validateOperationCancellationContext({ supabase, doc, viaOrderEdit });
    if (!validation.ok && validation.auditFailure) {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: validation.error,
        userId
      });
    }
    return validation;
  }
  if (!doc.order_id) {
    return {
      ok: false,
      status: 409,
      error: "Documento sem v\xEDnculo com o pedido; n\xE3o \xE9 poss\xEDvel comprovar se a mercadoria circulou."
    };
  }
  const { data: order, error: orderError } = await supabase.from("orders").select(
    "id,status,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_type,order_data"
  ).eq("id", doc.order_id).maybeSingle();
  if (orderError || !order) {
    return {
      ok: false,
      status: 503,
      error: "N\xE3o foi poss\xEDvel verificar a circula\xE7\xE3o da mercadoria."
    };
  }
  const linkedOrder = order;
  const commercialOrderStatus = String(order?.status || "").toLowerCase();
  const circulationState = getGoodsCirculationState(order);
  const physicalCirculationConfirmed = circulationState === "completed";
  if (circulationState === "in_progress") {
    return {
      ok: false,
      status: 409,
      error: "A entrega ou retirada ainda n\xE3o foi confirmada. Aguarde o registro de entrega, recusa ou retorno antes de cancelar a nota."
    };
  }
  const orderType = String(order?.order_type || order?.order_data?.orderType || "sale").toLowerCase();
  if (!["sale", "showroom"].includes(orderType)) {
    return {
      ok: false,
      status: 409,
      error: "O pedido vinculado n\xE3o \xE9 uma venda eleg\xEDvel para este cancelamento fiscal."
    };
  }
  if (viaOrderEdit && (!linkedOrder || params.orderEditOrderId !== String(doc.order_id))) {
    return {
      ok: false,
      status: 409,
      error: "A edi\xE7\xE3o fiscal n\xE3o corresponde ao pedido vinculado \xE0 nota."
    };
  }
  if (viaOrderEdit && !replacementId) {
    return {
      ok: false,
      status: 409,
      error: "Registre a substitui\xE7\xE3o fiscal antes de cancelar a nota por edi\xE7\xE3o."
    };
  }
  if (viaOrderEdit && replacementId) {
    const { data: replacement, error } = await supabase.from("nfe_order_edit_replacements").select("id,edited_order_data,expected_updated_at,original_order_data").eq("id", replacementId).eq("order_id", doc.order_id).eq("original_document_id", doc.id).eq("environment", doc.ambiente).eq("reversal_kind", "cancel").eq("status", "awaiting_reversal").maybeSingle();
    if (error || !replacement || linkedOrder?.status !== "scheduled" || new Date(linkedOrder.updated_at).getTime() !== new Date(replacement.expected_updated_at).getTime()) {
      return {
        ok: false,
        status: 409,
        error: "Substitui\xE7\xE3o fiscal n\xE3o registrada ou pedido indispon\xEDvel."
      };
    }
    proposedOrder = replacement.edited_order_data;
    orderEditVersion = replacement.expected_updated_at;
  }
  if (viaOrderEdit) {
    if (String(linkedOrder?.updated_at || "") !== orderEditVersion) {
      return {
        ok: false,
        status: 409,
        error: "O pedido foi alterado desde a confer\xEAncia. Confira novamente os dados antes de cancelar a nota."
      };
    }
    const currentOrderData = linkedOrder?.order_data || {};
    const proposedOrderData = projectOrderDataForFiscalEdit(
      currentOrderData,
      proposedOrder
    );
    if (!replacementId && !hasPotentialFiscalOrderEdit(currentOrderData, proposedOrderData)) {
      return {
        ok: false,
        status: 409,
        error: "A edi\xE7\xE3o proposta n\xE3o altera dados fiscais; a nota n\xE3o ser\xE1 cancelada."
      };
    }
    const { data: pendingDocuments, error: pendingDocumentsError } = await supabase.from("nfe_documents").select("id,status").eq("order_id", doc.order_id).in("status", ["processando", "pendente", "unknown", "transmitting"]);
    if (pendingDocumentsError) {
      return {
        ok: false,
        status: 503,
        error: "N\xE3o foi poss\xEDvel verificar tentativas fiscais em andamento para o pedido."
      };
    }
    if (pendingDocuments?.length) {
      return {
        ok: false,
        status: 409,
        error: "Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de alterar o pedido."
      };
    }
    const { data: snapshotRow, error: snapshotError } = await supabase.from("nfe_fiscal_snapshots").select("snapshot_data").eq("emission_request_id", doc.emission_request_id).eq("order_id", doc.order_id).maybeSingle();
    if (snapshotError || !snapshotRow?.snapshot_data) {
      return {
        ok: false,
        status: 409,
        error: "N\xE3o existe fotografia fiscal imut\xE1vel para validar o cancelamento desta edi\xE7\xE3o."
      };
    }
    try {
      const snapshot = snapshotRow.snapshot_data;
      const fiscalDocument = assertAuthorizedFiscalSnapshot(
        snapshot,
        doc
      );
      const changes = findFiscalOrderEditChanges(snapshot, proposedOrderData, fiscalDocument);
      if (!changes.length) {
        return {
          ok: false,
          status: 409,
          error: "O pedido proposto corresponde ao XML autorizado; a nota n\xE3o ser\xE1 cancelada."
        };
      }
    } catch (error) {
      return {
        ok: false,
        status: 409,
        error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel validar a edi\xE7\xE3o contra o XML autorizado."
      };
    }
  }
  if (physicalCirculationConfirmed) {
    const errorMsg = "H\xE1 confirma\xE7\xE3o de circula\xE7\xE3o/entrega. A NF-e original deve permanecer v\xE1lida; siga o fluxo fiscal de devolu\xE7\xE3o.";
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: errorMsg,
      userId
    });
    return { ok: false, status: 409, error: errorMsg };
  }
  if (!viaOrderEdit && doc.order_id && !["cancelled", "cancelado"].includes(commercialOrderStatus || "")) {
    const errorMsg = "A opera\xE7\xE3o comercial do pedido vinculado ainda n\xE3o foi cancelada; nenhum evento fiscal foi transmitido.";
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: errorMsg,
      userId
    });
    return { ok: false, status: 409, error: errorMsg };
  }
  const authorizedAt = getAuthorizedAt(String(doc.xml_protocolo || ""), "");
  const cancellationPolicy = getFiscalCancellationPolicy({
    model: String(doc.modelo),
    authorizedAt,
    status: String(doc.status),
    environment: Number(doc.ambiente),
    goodsCirculated: physicalCirculationConfirmed,
    operationDidNotOccur: true,
    issuerUf: String(doc.chave_acesso || "").slice(0, 2) === "41" ? "PR" : ""
  });
  if (cancellationPolicy.action !== "cancel") {
    const policyReason = cancellationPolicy.reason || (String(doc.modelo) === "65" ? "Prazo de cancelamento da NFC-e (30 minutos no Paran\xE1) ultrapassado." : "Prazo de cancelamento da NF-e (168 horas no Paran\xE1) ultrapassado.");
    await recordCancellationPreflightFailure({
      supabase,
      documentId: doc.id,
      attemptNumber,
      environment: Number(doc.ambiente),
      reason,
      errorMessage: policyReason,
      userId
    });
    return { ok: false, status: 409, error: policyReason };
  }
  return { ok: true, linkedOrder, proposedOrder, orderEditVersion };
}

// api/nfe/consultAuthorizedDocument.ts
var import_xmldom3 = require("@xmldom/xmldom");
function matchesConsultedDocument(response, doc, currentStatus = "100") {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return false;
    const errors = [];
    const xml = new import_xmldom3.DOMParser({
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
    return protocols.length === 1 && [result, protocols[0]].every(
      (element) => directValue(element, "tpAmb") === String(doc.ambiente) && directValue(element, "chNFe") === doc.chave_acesso
    ) && directValue(result, "cStat") === currentStatus && directValue(protocols[0], "cStat") === "100" && directValue(protocols[0], "nProt") === doc.numero_protocolo;
  } catch {
    return false;
  }
}

// api/nfe/cancellationPriorEventReconciler.ts
async function reconcilePriorCancellationEvent(params) {
  const { supabase, doc, priorEvent, pfxBase64, pfxPassword } = params;
  if (priorEvent.status === "transmitting" && Date.now() - new Date(priorEvent.requested_at).getTime() < 3e4) {
    return {
      action: "response",
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          error: "A transmiss\xE3o anterior ainda pode estar em andamento; aguarde antes de consultar novamente."
        }
      }
    };
  }
  if (!pfxBase64) {
    return {
      action: "response",
      response: {
        status: 503,
        body: {
          success: false,
          pending: true,
          error: "Certificado indispon\xEDvel para reconciliar; nenhum novo evento foi enviado."
        }
      }
    };
  }
  const certificate = extractCertificateAndKey(pfxBase64, pfxPassword || "");
  const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${Number(doc.ambiente)}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${doc.chave_acesso}</chNFe></consSitNFe>`;
  const consultationStartedAt = (/* @__PURE__ */ new Date()).toISOString();
  let situationXml;
  try {
    situationXml = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(String(doc.modelo), Number(doc.ambiente), "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: queryXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
  } catch {
    return {
      action: "response",
      response: {
        status: 502,
        body: {
          success: false,
          pending: true,
          error: "Consulta SEFAZ falhou; resultado continua incerto e nenhum novo evento foi transmitido."
        }
      }
    };
  }
  const situation = parseSefazNfeSituation(situationXml);
  if (["authorized", "cancelled"].includes(situation.state) && !matchesConsultedDocument(situationXml, doc, situation.state === "cancelled" ? "101" : "100")) {
    return {
      action: "response",
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          reconciliationRequired: true,
          error: "Consulta sem identidade fiscal correspondente. Nenhum documento foi alterado ou evento retransmitido."
        }
      }
    };
  }
  const recoveryDecision = decideCancellationRecovery(priorEvent.status, situation.state);
  if (recoveryDecision === "already_cancelled") {
    const persisted = await persistCancellationResult(supabase, doc, priorEvent.id, situationXml);
    return {
      action: "response",
      response: {
        status: persisted.status,
        body: persisted.body
      }
    };
  }
  if (recoveryDecision === "retry_after_authorized_consult" && priorEvent.status !== "rejected") {
    const { error } = await supabase.rpc("persist_nfe_cancellation_result", {
      p_document_id: doc.id,
      p_event_id: priorEvent.id,
      p_environment: Number(doc.ambiente),
      p_status: "rejected",
      p_response_xml: situationXml,
      p_cstat: "100",
      p_reason: "Consulta confirmou autoriza\xE7\xE3o ativa sem cancelamento registrado.",
      p_protocol: null,
      p_protocol_date: null,
      p_consultation_started_at: consultationStartedAt
    });
    if (error) {
      return {
        action: "response",
        response: {
          status: 503,
          body: {
            success: false,
            pending: true,
            error: "N\xE3o foi poss\xEDvel reconciliar a tentativa anterior. Nenhum evento foi reenviado."
          }
        }
      };
    }
  }
  if (recoveryDecision === "still_uncertain") {
    return {
      action: "response",
      response: {
        status: 202,
        body: {
          success: false,
          pending: true,
          cStat: situation.cStat,
          error: "A consulta n\xE3o confirmou nem cancelamento nem autoriza\xE7\xE3o ativa. Nenhum novo evento foi enviado."
        }
      }
    };
  }
  if (recoveryDecision === "manual_reconciliation") {
    return {
      action: "response",
      response: {
        status: 409,
        body: {
          success: false,
          pending: true,
          cStat: situation.cStat,
          error: "O hist\xF3rico local j\xE1 registra evento aceito, mas a consulta ainda n\xE3o o reflete. N\xE3o retransmita; reconcilia\xE7\xE3o fiscal necess\xE1ria."
        }
      }
    };
  }
  return { action: "proceed" };
}

// api/nfe/cancel.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var supabaseServiceKey = getSupabaseSecretKey() || "";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  }
  if (!supabaseServiceKey) {
    return res.status(503).json({
      success: false,
      error: "Servi\xE7o fiscal indispon\xEDvel: credencial segura do banco n\xE3o configurada."
    });
  }
  const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok) {
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message
    });
  }
  const documentId = String(req.body?.documentId || "");
  const reason = String(req.body?.reason || "").trim();
  const viaOrderEdit = req.body?.viaOrderEdit === true;
  const orderEditOrderId = String(req.body?.orderId || "");
  const orderEditVersion = String(req.body?.orderUpdatedAt || "");
  const proposedOrder = req.body?.proposedOrder;
  const replacementId = String(req.body?.replacementId || "");
  const productionConfirmed = req.body?.productionConfirmed === true;
  const reasonError = validateCancellationReason(reason);
  if (!documentId || reasonError) {
    return res.status(400).json({ success: false, error: reasonError || "Documento fiscal n\xE3o informado." });
  }
  if (viaOrderEdit && !replacementId && (!orderEditOrderId || !orderEditVersion || !proposedOrder || typeof proposedOrder !== "object" || Array.isArray(proposedOrder) || JSON.stringify(proposedOrder).length > 1e6)) {
    return res.status(400).json({
      success: false,
      error: "A confirma\xE7\xE3o de edi\xE7\xE3o fiscal est\xE1 incompleta ou excede o limite permitido."
    });
  }
  try {
    const docValidation = await validateCancellationDocument({
      supabase,
      documentId,
      productionConfirmed
    });
    if (!docValidation.ok || !docValidation.doc) {
      return res.status(docValidation.status || 400).json({
        success: false,
        error: docValidation.error
      });
    }
    const doc = docValidation.doc;
    const { data: priorEvents, error: priorError } = await supabase.from("nfe_document_events").select("id,status,cstat,xmotivo,protocol_number,requested_at,attempt_number").eq("document_id", doc.id).eq("event_type", "110111").order("attempt_number", { ascending: false });
    if (priorError) {
      return res.status(503).json({
        success: false,
        error: "N\xE3o foi poss\xEDvel conferir eventos fiscais anteriores."
      });
    }
    const priorEvent = priorEvents?.[0] || void 0;
    const nextAttemptNumber = Number(priorEvent?.attempt_number || 0) + 1;
    if (priorEvent) {
      const reconciliation = await reconcilePriorCancellationEvent({
        supabase,
        doc: {
          id: doc.id,
          ambiente: Number(doc.ambiente),
          chave_acesso: doc.chave_acesso,
          modelo: String(doc.modelo),
          numero_protocolo: doc.numero_protocolo
        },
        priorEvent,
        pfxBase64: process.env.NFE_CERTIFICATE_BASE64,
        pfxPassword: process.env.NFE_CERTIFICATE_PASSWORD
      });
      if (reconciliation.action === "response" && reconciliation.response) {
        return res.status(reconciliation.response.status).json(reconciliation.response.body);
      }
    }
    const orderValidation = await validateCancellationOrderAndCirculation({
      supabase,
      doc,
      userId: fiscalAuthorization.userId || "",
      reason,
      attemptNumber: nextAttemptNumber,
      viaOrderEdit,
      orderEditOrderId,
      orderEditVersion,
      proposedOrder,
      replacementId
    });
    if (!orderValidation.ok) {
      return res.status(orderValidation.status || 400).json({
        success: false,
        error: orderValidation.error
      });
    }
    const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
    const pfxPassword = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfxBase64) {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: "Certificado digital do emitente n\xE3o configurado.",
        userId: fiscalAuthorization.userId
      });
      return res.status(503).json({
        success: false,
        error: "Certificado digital do emitente n\xE3o configurado."
      });
    }
    let certificate;
    try {
      certificate = extractCertificateAndKey(pfxBase64, pfxPassword || "");
    } catch {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: "N\xE3o foi poss\xEDvel carregar o certificado digital do emitente.",
        userId: fiscalAuthorization.userId
      });
      return res.status(503).json({
        success: false,
        error: "N\xE3o foi poss\xEDvel carregar o certificado digital do emitente."
      });
    }
    const issuerCnpj = extractIssuerCnpjFromXml(doc.xml_nfe);
    if (!issuerCnpj) {
      await recordCancellationPreflightFailure({
        supabase,
        documentId: doc.id,
        attemptNumber: nextAttemptNumber,
        environment: Number(doc.ambiente),
        reason,
        errorMessage: "CNPJ do emitente n\xE3o encontrado no XML original.",
        userId: fiscalAuthorization.userId
      });
      return res.status(409).json({
        success: false,
        error: "CNPJ do emitente n\xE3o encontrado no XML original."
      });
    }
    const environment = Number(doc.ambiente);
    const eventXml = buildCancellationEventXml({
      chaveAcesso: doc.chave_acesso,
      environment,
      issuerCnpj,
      protocolNumber: doc.numero_protocolo,
      reason
    });
    const signedXml = signNfeEventXml(
      eventXml,
      certificate.privateKeyPem,
      certificate.certDerBase64
    );
    try {
      await validateCancellationAgainstOfficialSchema(signedXml, {
        accessKey: doc.chave_acesso,
        environment,
        protocol: doc.numero_protocolo
      });
    } catch {
      return res.status(422).json({
        success: false,
        code: "CANCELLATION_XML_INVALID",
        error: "XML de cancelamento inv\xE1lido. Nenhum evento foi transmitido."
      });
    }
    const { data: reservation, error: reserveError } = await supabase.rpc(
      "reserve_nfe_cancellation_event",
      {
        p_document_id: doc.id,
        p_environment: environment,
        p_signed_xml: signedXml,
        p_reason: reason,
        p_user_id: fiscalAuthorization.userId,
        p_previous_event_id: priorEvent?.id || null
      }
    );
    const event = reservation?.eventId ? { id: reservation.eventId } : null;
    if (reserveError || !event?.id) {
      return res.status(409).json({
        success: false,
        pending: true,
        error: "Outra solicita\xE7\xE3o pode j\xE1 estar em andamento. Confira os eventos fiscais antes de repetir."
      });
    }
    let responseXml;
    try {
      const url = getNfeServiceEndpoint(String(doc.modelo), environment, "NFeRecepcaoEvento4");
      responseXml = await sendSoapToSefaz({
        url,
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento",
        serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4",
        xmlPayload: signedXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem
      });
    } catch {
      await persistCancellationResult(supabase, doc, event.id, "");
      return res.status(502).json({
        success: false,
        pending: true,
        error: "Resultado incerto ap\xF3s envio \xE0 SEFAZ. N\xE3o reenvie; consulte a situa\xE7\xE3o fiscal."
      });
    }
    const persisted = await persistCancellationResult(supabase, doc, event.id, responseXml);
    return res.status(persisted.status).json(persisted.body);
  } catch (error) {
    console.error(
      "[NF-e Cancel] Falha no fluxo de cancelamento fiscal:",
      error?.message || "erro desconhecido"
    );
    return res.status(500).json({
      success: false,
      error: "Erro interno ao processar o evento fiscal de cancelamento."
    });
  }
}
//# sourceMappingURL=cancel.cjs.map
