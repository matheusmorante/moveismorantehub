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

// api/nfe/cce.ts
var cce_exports = {};
__export(cce_exports, {
  default: () => handler
});
module.exports = __toCommonJS(cce_exports);

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

// erp/src/pages/utils/nfe/nfeEventRules.ts
var readTag = (xml, tag) => {
  const name = `(?:[\\w.-]+:)?${tag}`;
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
};
var findRegisteredSefazCceEvent = (xml, sequence) => {
  const eventBlocks = [...xml.matchAll(/<procEventoNFe\b[^>]*>[\s\S]*?<\/procEventoNFe>/gi)].map(
    (match) => match[0]
  );
  const event = eventBlocks.find(
    (block) => readTag(block, "tpEvento") === "110110" && Number(readTag(block, "nSeqEvento")) === sequence
  );
  if (!event) return null;
  const cStat = readTag(event, "cStat");
  return {
    cStat,
    xMotivo: readTag(event, "xMotivo"),
    protocolNumber: readTag(event, "nProt"),
    protocolDate: readTag(event, "dhRegEvento"),
    registered: cStat === "135",
    pending: cStat !== "135"
  };
};

// shared-utils/fiscalCorrectionPolicy.ts
var ORDER_EDIT_CCE_DISABLED_REASON = "O ERP n\xE3o utiliza CC-e. Para alterar dados fiscais antes da circula\xE7\xE3o, use cancelamento ou estorno e emita uma nova nota.";

// api/nfe/cce.ts
var import_supabase_js = require("@supabase/supabase-js");

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

// api/nfe/cce.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var getDocument = async (db, documentId) => {
  const { data, error } = await db.from("nfe_documents").select("id,modelo,ambiente,status,chave_acesso,xml_nfe,numero_protocolo").eq("id", documentId).maybeSingle();
  return { document: data, error };
};
var getCceEvents = async (db, documentId) => {
  const { data, error } = await db.from("nfe_document_events").select(
    "id,event_sequence,attempt_number,status,justification,request_id,requested_at,cstat,xmotivo,protocol_number,protocol_date"
  ).eq("document_id", documentId).eq("event_type", "110110").order("attempt_number", { ascending: false }).limit(100);
  return { events: data || [], error };
};
var pendingResponse = (res, message, cStat = null) => res.status(202).json({ success: false, pending: true, cStat, error: message });
async function reconcilePendingEvent(db, document, event, res, force) {
  if (!force && Date.now() - new Date(event.requested_at).getTime() < 3e4)
    return pendingResponse(
      res,
      "A transmiss\xE3o da CC-e ainda pode estar em andamento. Aguarde antes de consultar novamente."
    );
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx)
    return pendingResponse(
      res,
      "Certificado indispon\xEDvel para consultar a tentativa. Nenhum novo evento foi enviado."
    );
  let consultationXml;
  try {
    const certificate = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || "");
    const requestXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${document.ambiente}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${document.chave_acesso}</chNFe></consSitNFe>`;
    consultationXml = await sendSoapToSefaz({
      url: getNfeServiceEndpoint("55", document.ambiente, "NFeConsultaProtocolo4"),
      action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
      serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
      xmlPayload: requestXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
  } catch {
    return pendingResponse(
      res,
      "A consulta n\xE3o confirmou o resultado da CC-e. A tentativa permanece bloqueada para evitar duplicidade."
    );
  }
  const registeredEvent = findRegisteredSefazCceEvent(consultationXml, event.event_sequence);
  if (!registeredEvent?.registered)
    return pendingResponse(
      res,
      registeredEvent?.xMotivo || "A SEFAZ ainda n\xE3o confirmou a CC-e desta sequ\xEAncia. N\xE3o retransmita enquanto o resultado estiver incerto.",
      registeredEvent?.cStat || null
    );
  const { error } = await db.from("nfe_document_events").update({
    status: "registered",
    response_xml: consultationXml,
    cstat: registeredEvent.cStat,
    xmotivo: registeredEvent.xMotivo,
    protocol_number: registeredEvent.protocolNumber,
    protocol_date: registeredEvent.protocolDate,
    confirmed_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", event.id).in("status", ["transmitting", "unknown"]);
  return res.status(error ? 503 : 200).json({
    success: true,
    pending: Boolean(error),
    reconciled: true,
    sequence: event.event_sequence,
    cStat: registeredEvent.cStat,
    xMotivo: registeredEvent.xMotivo,
    protocolNumber: registeredEvent.protocolNumber,
    reconciliationRequired: Boolean(error)
  });
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET", "POST"].includes(String(req.method)))
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  const queryDocumentId = Array.isArray(req.query?.documentId) ? req.query.documentId[0] : req.query?.documentId;
  const documentId = String(
    req.method === "GET" ? queryDocumentId || "" : req.body?.documentId || ""
  );
  if (!documentId)
    return res.status(400).json({ success: false, error: "Documento fiscal n\xE3o informado." });
  try {
    const { document, error: documentError } = await getDocument(db, documentId);
    if (documentError || !document)
      return res.status(404).json({ success: false, error: "Documento fiscal n\xE3o encontrado." });
    if (document.modelo !== "55")
      return res.status(409).json({ success: false, error: "CC-e s\xF3 pode ser emitida para NF-e modelo 55." });
    if (![1, 2].includes(Number(document.ambiente)) || !/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(document.chave_acesso || ""))
      return res.status(409).json({ success: false, error: "Ambiente ou chave de acesso inv\xE1lidos." });
    if (!["autorizada", "homologada"].includes(document.status))
      return res.status(409).json({ success: false, error: "A NF-e precisa estar autorizada para receber CC-e." });
    const { events, error: eventsError } = await getCceEvents(db, document.id);
    if (eventsError)
      return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel consultar o hist\xF3rico de CC-e." });
    const latest = events[0] || null;
    const latestRegistered = events.find((event) => event.status === "registered") || null;
    if (req.method === "GET") {
      const pendingEvent = latest && ["transmitting", "unknown"].includes(latest.status) ? latest : null;
      return res.status(200).json({
        success: true,
        previousCorrection: latestRegistered?.justification || "",
        previousSequence: latestRegistered?.event_sequence || null,
        nextSequence: null,
        creationDisabled: true,
        creationDisabledReason: ORDER_EDIT_CCE_DISABLED_REASON,
        pending: pendingEvent ? {
          id: pendingEvent.id,
          status: pendingEvent.status,
          sequence: pendingEvent.event_sequence
        } : null,
        sequenceLimitReached: false
      });
    }
    const action = String(req.body?.action || "transmit");
    if (action === "reconcile") {
      if (!latest || !["transmitting", "unknown"].includes(latest.status))
        return res.status(409).json({ success: false, error: "N\xE3o h\xE1 CC-e pendente para consultar." });
      return reconcilePendingEvent(db, document, latest, res, true);
    }
    if (action !== "transmit")
      return res.status(400).json({ success: false, error: "A\xE7\xE3o da CC-e inv\xE1lida." });
    return res.status(409).json({
      success: false,
      code: "CCE_DISABLED_BY_ORDER_EDIT_POLICY",
      error: ORDER_EDIT_CCE_DISABLED_REASON
    });
  } catch (error) {
    console.error(
      "[NF-e CC-e] Falha no fluxo fiscal:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return res.status(500).json({ success: false, error: "Erro interno ao processar a CC-e." });
  }
}
//# sourceMappingURL=cce.cjs.map
