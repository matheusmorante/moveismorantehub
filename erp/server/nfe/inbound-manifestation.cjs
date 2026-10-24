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

// api/nfe/inbound-manifestation.ts
var inbound_manifestation_exports = {};
__export(inbound_manifestation_exports, {
  default: () => handler
});
module.exports = __toCommonJS(inbound_manifestation_exports);
var import_node_crypto4 = require("node:crypto");

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

// api/nfe/inbound-manifestation.ts
var import_supabase_js = require("@supabase/supabase-js");

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

// api/nfe/nationalEnvironmentEventClient.ts
var import_axios = __toESM(require("axios"));
var NATIONAL_EVENT_ENDPOINTS = {
  1: "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  2: "https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx"
};
async function sendNationalEventOnce(input) {
  const url = NATIONAL_EVENT_ENDPOINTS[input.environment];
  if (!url) throw new Error("Ambiente fiscal inv\xE1lido para o Ambiente Nacional.");
  const endpoint = new URL(url);
  const allowedHost = input.environment === 1 ? "www.nfe.fazenda.gov.br" : "hom1.nfe.fazenda.gov.br";
  if (endpoint.protocol !== "https:" || endpoint.hostname !== allowedHost || endpoint.pathname !== "/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx") {
    throw new Error("Endpoint de manifesta\xE7\xE3o fora da lista oficial do Ambiente Nacional.");
  }
  const agent = createSefazHttpsAgent(input.certPem, input.privateKeyPem);
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${input.xmlPayload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  try {
    const response = await import_axios.default.post(url, envelope, {
      httpsAgent: agent,
      proxy: false,
      maxRedirects: 0,
      signal: AbortSignal.timeout(25e3),
      headers: {
        "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"',
        Accept: "application/soap+xml, text/xml"
      },
      timeout: 25e3
    });
    if (typeof response.data !== "string" || /<(?:[\w.-]+:)?Fault\b/i.test(response.data)) {
      throw new Error("O Ambiente Nacional n\xE3o confirmou o processamento do evento.");
    }
    return response.data;
  } finally {
    agent.destroy();
  }
}

// api/nfe/inboundManifestationProtocol.ts
var import_node_crypto3 = require("node:crypto");

// shared-utils/fiscalIdentifiers.ts
var CNPJ_PATTERN = /^[A-Z0-9]{12}[0-9]{2}$/;
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;
function normalizeFiscalIdentifier(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
}

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

// api/nfe/inboundManifestationProtocol.ts
var extractTag = (xml, tag) => {
  const match = xml.match(
    new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`, "i")
  );
  return match?.[1]?.trim() || "";
};
var extractBlock = (xml, tag) => {
  const match = xml.match(
    new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`, "i")
  );
  return match?.[0] || "";
};
function buildInboundScienceEventXml(input) {
  const batchId = `${String((0, import_node_crypto3.randomInt)(0, 1e12)).padStart(12, "0")}${String((0, import_node_crypto3.randomInt)(0, 1e3)).padStart(3, "0")}`;
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote>${buildInboundScienceEventElement(input)}</envEvento>`;
}
function buildInboundScienceEventElement(input) {
  const { accessKey, environment, recipientCnpj } = input;
  if (!ACCESS_KEY_PATTERN.test(accessKey) || accessKey.slice(20, 22) !== "55")
    throw new Error("A Ci\xEAncia da Emiss\xE3o deste fluxo exige chave de NF-e modelo 55 v\xE1lida.");
  if (!CNPJ_PATTERN.test(recipientCnpj))
    throw new Error("O CNPJ destinat\xE1rio informado para a Ci\xEAncia \xE9 inv\xE1lido.");
  if (environment !== 1 && environment !== 2)
    throw new Error("O ambiente fiscal da NF-e n\xE3o foi identificado.");
  const timestamp = formatNfeDateTime(/* @__PURE__ */ new Date());
  return `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="ID210210${accessKey}01"><cOrgao>91</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>${recipientCnpj}</CNPJ><chNFe>${accessKey}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento></evento>`;
}
function buildInboundScienceEventBatchXml(signedEvents) {
  if (signedEvents.length < 1 || signedEvents.length > 20)
    throw new Error("O lote de Ci\xEAncia deve conter entre 1 e 20 eventos.");
  if (signedEvents.some(
    (event) => !/^<evento\b[\s\S]*<infEvento\b/i.test(event) || !/<Signature\b/i.test(event)
  )) {
    throw new Error("O lote cont\xE9m evento sem a assinatura digital esperada.");
  }
  const batchId = `${String((0, import_node_crypto3.randomInt)(0, 1e12)).padStart(12, "0")}${String((0, import_node_crypto3.randomInt)(0, 1e3)).padStart(3, "0")}`;
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote>${signedEvents.join("")}</envEvento>`;
}
function parseInboundManifestationResponse(xml) {
  const eventResult = extractBlock(xml, "retEvento");
  const batchResult = extractBlock(xml, "retEnvEvento") || xml;
  const resultXml = eventResult || batchResult;
  const cStat = extractTag(resultXml, "cStat") || null;
  const xMotivo = extractTag(resultXml, "xMotivo") || null;
  const protocolNumber = extractTag(resultXml, "nProt") || null;
  const protocolDate = extractTag(resultXml, "dhRegEvento") || null;
  if (eventResult && ["135", "136"].includes(cStat || "")) {
    return { status: "registered", cStat, xMotivo, protocolNumber, protocolDate };
  }
  if (!cStat || cStat === "128" || cStat === "573") {
    return { status: "unknown", cStat, xMotivo, protocolNumber, protocolDate };
  }
  return { status: "rejected", cStat, xMotivo, protocolNumber, protocolDate };
}
function parseInboundManifestationBatchResponse(xml) {
  const blocks = [...xml.matchAll(/<(?:[\w.-]+:)?retEvento\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?retEvento\s*>/gi)].map((match) => match[0]);
  return blocks.map((block) => ({
    accessKey: extractTag(block, "chNFe") || null,
    responseXml: block,
    ...parseInboundManifestationResponse(block)
  }));
}

// api/nfe/inboundXmlConsultQueue.ts
function selectPendingInboundXmlConsults(summaries, manifestationEvents, consultedKeys) {
  const registeredEvents = new Set(
    manifestationEvents.filter((event) => event.status === "registered").map((event) => `${event.access_key}:${Number(event.environment)}`)
  );
  const consulted = new Set(
    consultedKeys.map((attempt) => `${attempt.access_key}:${Number(attempt.environment)}`)
  );
  return summaries.filter((invoice) => {
    const key = `${invoice.chave_acesso}:${Number(invoice.ambiente)}`;
    return registeredEvents.has(key) && !consulted.has(key);
  });
}

// api/nfe/inbound-manifestation.ts
var DIRECT_CONSULT_INTERVAL_MS = 5 * 60 * 1e3;
async function getNextDirectConsultAt(db, configuredCnpj) {
  const { data } = await db.from("sefaz_direct_consult_control").select("next_allowed_at").eq("cnpj", configuredCnpj).maybeSingle();
  return typeof data?.next_allowed_at === "string" ? data.next_allowed_at : new Date(Date.now() + DIRECT_CONSULT_INTERVAL_MS).toISOString();
}
async function consultNextRegisteredSummary(db, configuredCnpj, invoice, remainingCount) {
  const accessKey = normalizeFiscalIdentifier(invoice.chave_acesso);
  const environment = Number(invoice.ambiente);
  const environmentName = environment === 1 ? "production" : "homologation";
  const { data, error } = await db.functions.invoke("sefaz-inbound-sync", {
    body: { accessKey, environment: environmentName }
  });
  if (error || !data) {
    const retryAfter2 = await getNextDirectConsultAt(db, configuredCnpj);
    return {
      status: 202,
      body: {
        success: false,
        pending: true,
        retryable: true,
        hasMore: true,
        retryAfter: retryAfter2,
        xmlLookupPending: true,
        error: "N\xE3o foi poss\xEDvel confirmar a consulta autom\xE1tica do XML. A fila tentar\xE1 novamente ap\xF3s o intervalo da SEFAZ."
      }
    };
  }
  if (data.code === "SEFAZ_DIRECT_COOLDOWN") {
    return {
      status: 200,
      body: {
        success: true,
        skipped: true,
        hasMore: true,
        retryAfter: data.retryAfter || await getNextDirectConsultAt(db, configuredCnpj),
        xmlLookupPending: true,
        message: "A consulta autom\xE1tica do XML aguarda o intervalo de cinco minutos por CNPJ."
      }
    };
  }
  if (data.success !== true) {
    const retryAfter2 = typeof data.retryAfter === "string" ? data.retryAfter : await getNextDirectConsultAt(db, configuredCnpj);
    return {
      status: 202,
      body: {
        success: false,
        pending: true,
        retryable: true,
        hasMore: true,
        retryAfter: retryAfter2,
        sefazBlocked: data.code === "SEFAZ_RATE_LIMIT" || data.cStat === "656",
        xmlLookupPending: true,
        cStat: typeof data.cStat === "string" ? data.cStat : null,
        error: typeof data.message === "string" ? data.message : "A SEFAZ ainda n\xE3o confirmou a consulta autom\xE1tica do XML."
      }
    };
  }
  const documentKind = data.document?.kind;
  const { error: attemptError } = await db.from("sefaz_inbound_xml_consult_attempts").upsert({
    access_key: accessKey,
    environment,
    result: documentKind === "full" ? "full_received" : documentKind === "summary" ? "summary" : "no_document",
    consulted_at: (/* @__PURE__ */ new Date()).toISOString()
  }, { onConflict: "access_key,environment" });
  if (attemptError) {
    return {
      status: 503,
      body: {
        success: false,
        retryable: true,
        hasMore: true,
        retryAfter: await getNextDirectConsultAt(db, configuredCnpj),
        xmlLookupPending: true,
        error: "A consulta terminou, mas n\xE3o foi poss\xEDvel registrar seu resultado para evitar repeti\xE7\xE3o da mesma chave."
      }
    };
  }
  let persistedFullXml = false;
  let persistedItemsCount = 0;
  if (documentKind === "full") {
    const { data: savedInvoice, error: savedInvoiceError } = await db.from("inbound_invoices").select("xml_conteudo,itens").eq("id", invoice.id).maybeSingle();
    persistedFullXml = !savedInvoiceError && /<(?:[\w.-]+:)?(?:nfeProc|infNFe)\b/i.test(String(savedInvoice?.xml_conteudo || ""));
    persistedItemsCount = Array.isArray(savedInvoice?.itens) ? savedInvoice.itens.length : 0;
  }
  const retryAfter = remainingCount > 0 ? await getNextDirectConsultAt(db, configuredCnpj) : null;
  return {
    status: 200,
    body: {
      success: true,
      xmlRetrieved: documentKind === "full" && persistedFullXml,
      xmlItemsCount: persistedItemsCount,
      xmlLookupPending: documentKind !== "full" || !persistedFullXml,
      cStat: typeof data.cStat === "string" ? data.cStat : null,
      hasMore: remainingCount > 0,
      retryAfter,
      message: documentKind === "full" && persistedFullXml && persistedItemsCount > 0 ? `XML completo salvo na NF de entrada; ${persistedItemsCount} item(ns) foram atualizados.` : documentKind === "full" && persistedFullXml ? "XML completo salvo na NF de entrada, mas nenhum item foi extra\xEDdo para a lista." : documentKind === "full" ? "A SEFAZ devolveu o XML completo, mas n\xE3o foi poss\xEDvel confirmar a grava\xE7\xE3o na NF de entrada." : documentKind === "summary" ? "A consulta autom\xE1tica ainda retornou somente o resumo. O sistema aguardar\xE1 a pr\xF3xima distribui\xE7\xE3o da SEFAZ." : "A consulta autom\xE1tica n\xE3o localizou o XML completo. O sistema aguardar\xE1 a pr\xF3xima distribui\xE7\xE3o da SEFAZ."
    }
  };
}
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
async function processAutomaticScienceBatch(db, candidates, hasMore, configuredCnpj, userId, pfxBase64) {
  const environment = Number(candidates[0]?.ambiente);
  let certificate;
  let prepared;
  try {
    certificate = extractCertificateAndKey(pfxBase64, process.env.NFE_CERTIFICATE_PASSWORD || "");
    prepared = candidates.map((invoice) => {
      const accessKey = normalizeFiscalIdentifier(invoice.chave_acesso);
      const recipientCnpj = normalizeFiscalIdentifier(invoice.destinatario_cnpj);
      const event = buildInboundScienceEventElement({ accessKey, environment, recipientCnpj });
      const signedEvent = signNfeEventXml(event, certificate.privateKeyPem, certificate.certDerBase64);
      return {
        accessKey,
        environment,
        recipientCnpj,
        signedEvent,
        signedXml: buildInboundScienceEventBatchXml([signedEvent])
      };
    });
  } catch (error) {
    return {
      status: 409,
      body: {
        success: false,
        error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel preparar a Ci\xEAncia da Emiss\xE3o."
      }
    };
  }
  const { data: batchRows, error: batchError } = await db.rpc(
    "reserve_sefaz_manifestation_batch",
    { p_cnpj: configuredCnpj }
  );
  if (batchError)
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        retryable: true,
        hasMore,
        error: "N\xE3o foi poss\xEDvel reservar a fila de Ci\xEAncia por CNPJ."
      }
    };
  const batchLease = Array.isArray(batchRows) ? batchRows[0] : batchRows;
  if (!batchLease?.allowed)
    return {
      status: 429,
      body: {
        success: false,
        skipped: true,
        hasMore,
        retryAfter: batchLease?.next_allowed_at || null,
        error: "Outro lote de Ci\xEAncia est\xE1 em processamento ou aguardando o intervalo m\xEDnimo por CNPJ."
      }
    };
  if (!batchLease.claim_token)
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        retryable: true,
        hasMore,
        error: "A fila de Ci\xEAncia foi reservada sem identificador de execu\xE7\xE3o."
      }
    };
  const finishBatch = async (cooldownSeconds2) => {
    const { data, error } = await db.rpc("finish_sefaz_manifestation_batch", {
      p_cnpj: configuredCnpj,
      p_claim_token: batchLease.claim_token,
      p_cooldown_seconds: cooldownSeconds2
    });
    const finished = Array.isArray(data) ? data[0] : data;
    return error ? null : finished?.next_allowed_at || null;
  };
  let reservations;
  try {
    reservations = await Promise.all(prepared.map(async (event) => {
      const requestId = (0, import_node_crypto4.randomUUID)();
      const { data, error } = await db.rpc("reserve_inbound_manifestation_event", {
        p_access_key: event.accessKey,
        p_environment: event.environment,
        p_recipient_cnpj: event.recipientCnpj,
        p_signed_xml: event.signedXml,
        p_user_id: userId,
        p_request_id: requestId
      });
      const reservation = Array.isArray(data) ? data[0] : data;
      return { event, reservation, error };
    }));
  } catch {
    const nextAllowedAt2 = await finishBatch(0);
    return {
      status: 503,
      body: {
        success: false,
        skipped: true,
        hasMore,
        retryable: true,
        retryAfter: nextAllowedAt2,
        error: "N\xE3o foi poss\xEDvel reservar os eventos individuais de Ci\xEAncia."
      }
    };
  }
  const reserved = reservations.filter((item) => !item.error && item.reservation?.created === true && item.reservation.event_id).map((item) => ({ ...item.event, eventId: item.reservation.event_id }));
  const reservationPendingCount = reservations.filter((item) => item.error && ![
    "INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING",
    "INBOUND_INVOICE_NOT_FOUND",
    "INBOUND_MANIFESTATION_REQUIRES_SUMMARY",
    "INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH",
    "INBOUND_MANIFESTATION_RECIPIENT_MISMATCH"
  ].some((code) => String(item.error.message || "").includes(code))).length;
  if (!reserved.length) {
    const nextAllowedAt2 = await finishBatch(0);
    return {
      status: reservationPendingCount ? 202 : 200,
      body: {
        success: !reservationPendingCount,
        skipped: !reservationPendingCount,
        hasMore,
        nextAllowedAt: nextAllowedAt2,
        pending: Boolean(reservationPendingCount),
        pendingCount: reservationPendingCount,
        retryable: Boolean(reservationPendingCount),
        message: reservationPendingCount ? "Algumas Ci\xEAncias n\xE3o puderam ser reservadas e precisam de reconcilia\xE7\xE3o." : "Nenhuma Ci\xEAncia nova precisou ser transmitida."
      }
    };
  }
  let responseXml;
  try {
    responseXml = await sendNationalEventOnce({
      environment,
      xmlPayload: buildInboundScienceEventBatchXml(reserved.map((event) => event.signedEvent)),
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
  } catch {
    await db.from("inbound_manifestation_events").update({ status: "unknown", xmotivo: "Transmiss\xE3o do lote iniciada sem confirma\xE7\xE3o da resposta do Ambiente Nacional." }).in("id", reserved.map((event) => event.eventId)).eq("status", "transmitting");
    const nextAllowedAt2 = await finishBatch(5);
    return {
      status: 202,
      body: {
        success: false,
        hasMore,
        retryAfter: nextAllowedAt2 || new Date(Date.now() + 5e3).toISOString(),
        pending: true,
        pendingCount: reserved.length + reservationPendingCount,
        error: "Resultado incerto ap\xF3s o envio do lote. N\xE3o reenvie as Ci\xEAncias at\xE9 reconciliar o hist\xF3rico fiscal."
      }
    };
  }
  const eventResults = parseInboundManifestationBatchResponse(responseXml);
  const sefazBlocked = eventResults.some((item) => item.cStat === "656") || /<(?:[\w.-]+:)?cStat\b[^>]*>\s*656\s*<\//i.test(responseXml);
  const updateResults = await Promise.all(reserved.map(async (event) => {
    const result = eventResults.find((item) => item.accessKey === event.accessKey) || {
      status: "unknown",
      cStat: null,
      xMotivo: "A resposta n\xE3o trouxe retorno individual para esta NF-e.",
      protocolNumber: null,
      protocolDate: null,
      responseXml
    };
    const { data, error } = await db.from("inbound_manifestation_events").update({
      status: result.status,
      response_xml: result.responseXml || responseXml,
      cstat: result.cStat,
      xmotivo: result.xMotivo,
      protocol_number: result.protocolNumber,
      protocol_date: result.protocolDate,
      confirmed_at: result.status === "registered" ? (/* @__PURE__ */ new Date()).toISOString() : null
    }).eq("id", event.eventId).eq("status", "transmitting").select("id").maybeSingle();
    return { status: result.status, error: Boolean(error || !data) };
  }));
  const registeredCount = updateResults.filter((item) => !item.error && item.status === "registered").length;
  const rejectedCount = updateResults.filter((item) => !item.error && item.status === "rejected").length;
  const pendingCount = updateResults.filter((item) => item.error || item.status === "unknown").length + reservationPendingCount;
  const cooldownSeconds = sefazBlocked ? 3600 : 5;
  const nextAllowedAt = await finishBatch(cooldownSeconds);
  return {
    status: pendingCount ? 202 : registeredCount ? 200 : 422,
    body: {
      success: !pendingCount && registeredCount > 0,
      hasMore,
      nextAllowedAt: nextAllowedAt || new Date(Date.now() + cooldownSeconds * 1e3).toISOString(),
      retryAfter: sefazBlocked ? nextAllowedAt || new Date(Date.now() + 36e5).toISOString() : void 0,
      sefazBlocked,
      processed: registeredCount > 0,
      processedCount: registeredCount,
      rejectedCount,
      pending: Boolean(pendingCount),
      pendingCount,
      retryable: Boolean(reservationPendingCount),
      error: pendingCount ? "O lote foi enviado, mas h\xE1 Ci\xEAncias sem confirma\xE7\xE3o individual; n\xE3o reenvie at\xE9 reconciliar o hist\xF3rico." : registeredCount ? void 0 : "A SEFAZ rejeitou todas as Ci\xEAncias deste lote."
    }
  };
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  const automatic = req.body?.action === "process-auto";
  const requestId = automatic ? (0, import_node_crypto4.randomUUID)() : String(req.body?.requestId || "");
  let accessKey = normalizeFiscalIdentifier(req.body?.accessKey);
  if (!automatic && !ACCESS_KEY_PATTERN.test(accessKey))
    return res.status(400).json({ success: false, error: "Chave de acesso inv\xE1lida." });
  if (!isUuid(requestId))
    return res.status(400).json({ success: false, error: "Identificador da solicita\xE7\xE3o inv\xE1lido." });
  const { data: settingsRow, error: settingsError } = await db.from("settings").select("data").eq("id", "app").maybeSingle();
  const configuredCnpj = normalizeFiscalIdentifier(settingsRow?.data?.companyCnpj);
  if (settingsError || !CNPJ_PATTERN.test(configuredCnpj))
    return res.status(409).json({ success: false, error: "O CNPJ da empresa n\xE3o est\xE1 configurado corretamente." });
  if (automatic) {
    if (settingsRow?.data?.autoInboundScienceEnabled !== true)
      return res.status(200).json({ success: true, skipped: true, message: "A Ci\xEAncia autom\xE1tica est\xE1 desativada." });
    const candidates = [];
    const xmlCandidates = [];
    let foundEligible = false;
    let batchEnvironment = null;
    let xmlConsultTrackingAvailable = true;
    for (let offset = 0; candidates.length < 20 && xmlCandidates.length < 20; offset += 100) {
      const { data: summaries, error: summariesError } = await db.from("inbound_invoices").select("id,chave_acesso,modelo,ambiente,destinatario_cnpj,status_sefaz,xml_conteudo,data_emissao").eq("status_sefaz", "autorizada").ilike("xml_conteudo", "%resNFe%").order("data_emissao", { ascending: false }).order("id", { ascending: true }).range(offset, offset + 99);
      if (summariesError)
        return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel procurar notas resumo pendentes." });
      if (!summaries?.length) break;
      const eligible = summaries.filter((invoice2) => {
        const key = normalizeFiscalIdentifier(invoice2.chave_acesso);
        const environment2 = Number(invoice2.ambiente);
        return ACCESS_KEY_PATTERN.test(key) && key.slice(20, 22) === "55" && (environment2 === 1 || environment2 === 2) && normalizeFiscalIdentifier(invoice2.destinatario_cnpj) === configuredCnpj && String(invoice2.modelo || key.slice(20, 22)) === "55" && /<(?:[\w.-]+:)?resNFe\b/i.test(String(invoice2.xml_conteudo || ""));
      }).map((invoice2) => ({
        ...invoice2,
        chave_acesso: normalizeFiscalIdentifier(invoice2.chave_acesso),
        ambiente: Number(invoice2.ambiente)
      }));
      if (eligible.length) {
        foundEligible = true;
        const candidateKeys = eligible.map((invoice2) => normalizeFiscalIdentifier(invoice2.chave_acesso));
        const { data: previousEvents, error: previousEventsError } = await db.from("inbound_manifestation_events").select("access_key,environment,status").eq("event_type", "210210").in("access_key", candidateKeys);
        if (previousEventsError)
          return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel confirmar se j\xE1 existe uma Ci\xEAncia registrada." });
        const attemptedKeys = new Set((previousEvents || []).map((event) => `${event.access_key}:${event.environment}`));
        let previousConsults = [];
        if (xmlConsultTrackingAvailable) {
          const consultResult = await db.from("sefaz_inbound_xml_consult_attempts").select("access_key,environment").in("access_key", candidateKeys);
          if (consultResult.error) {
            const consultError = consultResult.error;
            const consultTableMissing = ["42P01", "PGRST205"].includes(consultError.code || "") || /sefaz_inbound_xml_consult_attempts/i.test(consultError.message || "") && /(does not exist|could not find|not found)/i.test(consultError.message || "");
            if (!consultTableMissing)
              return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel conferir as consultas autom\xE1ticas de XML j\xE1 realizadas." });
            xmlConsultTrackingAvailable = false;
          } else {
            previousConsults = consultResult.data || [];
          }
        }
        const pending = eligible.filter(
          (invoice2) => !attemptedKeys.has(`${normalizeFiscalIdentifier(invoice2.chave_acesso)}:${Number(invoice2.ambiente)}`)
        );
        const pendingXml = xmlConsultTrackingAvailable ? selectPendingInboundXmlConsults(eligible, previousEvents || [], previousConsults) : [];
        xmlCandidates.push(...pendingXml.slice(0, 20 - xmlCandidates.length));
        if (batchEnvironment === null && pending.length)
          batchEnvironment = Number(pending[0].ambiente);
        candidates.push(...pending.filter((invoice2) => Number(invoice2.ambiente) === batchEnvironment).slice(0, 20 - candidates.length));
      }
      if (candidates.length >= 20 || summaries.length < 100) break;
    }
    if (!candidates.length && xmlCandidates.length) {
      const consultation = await consultNextRegisteredSummary(
        db,
        configuredCnpj,
        xmlCandidates[0],
        xmlCandidates.length - 1
      );
      return res.status(consultation.status).json(consultation.body);
    }
    if (!candidates.length && foundEligible && !xmlConsultTrackingAvailable)
      return res.status(409).json({
        success: false,
        retryable: false,
        xmlLookupPending: true,
        error: "Consulta autom\xE1tica do XML pausada: falta aplicar a migration sefaz_inbound_xml_consult_tracking no Supabase operacional. A Ci\xEAncia autom\xE1tica continua dispon\xEDvel; a busca do XML ser\xE1 retomada ap\xF3s a cria\xE7\xE3o da tabela de controle."
      });
    if (!candidates.length)
      return res.status(200).json({
        success: true,
        skipped: true,
        message: foundEligible ? "As notas resumo eleg\xEDveis j\xE1 possuem tentativa de Ci\xEAncia ou consulta autom\xE1tica de XML registrada." : "Nenhuma nota resumo eleg\xEDvel para Ci\xEAncia autom\xE1tica."
      });
    const pfxBase642 = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfxBase642)
      return res.status(503).json({ success: false, error: "Certificado digital n\xE3o configurado no servidor." });
    const batchResult = await processAutomaticScienceBatch(
      db,
      candidates,
      candidates.length > 0,
      configuredCnpj,
      authorization.userId,
      pfxBase642
    );
    return res.status(batchResult.status).json(batchResult.body);
  }
  const { data: invoice, error: invoiceError } = await db.from("inbound_invoices").select("id,chave_acesso,modelo,ambiente,destinatario_cnpj,status_sefaz,xml_conteudo").eq("chave_acesso", accessKey).maybeSingle();
  if (invoiceError)
    return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel validar a NF-e de entrada." });
  if (!invoice)
    return res.status(404).json({ success: false, error: "Importe ou consulte a nota antes de enviar Ci\xEAncia." });
  if (Number(invoice.ambiente) !== 1 && Number(invoice.ambiente) !== 2)
    return res.status(409).json({ success: false, error: "O ambiente fiscal desta nota n\xE3o est\xE1 identificado. Consulte a nota novamente pela SEFAZ." });
  const environment = Number(invoice.ambiente);
  if (environment === 1 && !automatic && req.body?.productionConfirmed !== true)
    return res.status(400).json({ success: false, error: "Confirme explicitamente o envio da Ci\xEAncia em Produ\xE7\xE3o." });
  const recipientCnpj = normalizeFiscalIdentifier(invoice.destinatario_cnpj);
  if (recipientCnpj !== configuredCnpj)
    return res.status(409).json({ success: false, error: "O destinat\xE1rio da nota n\xE3o corresponde ao CNPJ configurado para esta empresa." });
  if (String(invoice.modelo || accessKey.slice(20, 22)) !== "55")
    return res.status(409).json({ success: false, error: "Ci\xEAncia do destinat\xE1rio s\xF3 pode ser enviada para NF-e modelo 55." });
  if (!/<(?:[\w.-]+:)?resNFe\b/i.test(String(invoice.xml_conteudo || "")))
    return res.status(409).json({ success: false, error: "A Ci\xEAncia est\xE1 dispon\xEDvel apenas enquanto a SEFAZ fornece o resumo da NF-e." });
  const pfxBase64 = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfxBase64)
    return res.status(503).json({ success: false, error: "Certificado digital n\xE3o configurado no servidor." });
  let signedXml;
  let certificate;
  try {
    certificate = extractCertificateAndKey(pfxBase64, process.env.NFE_CERTIFICATE_PASSWORD || "");
    const eventXml = buildInboundScienceEventXml({
      accessKey,
      environment,
      recipientCnpj
    });
    signedXml = signNfeEventXml(eventXml, certificate.privateKeyPem, certificate.certDerBase64);
  } catch (error) {
    return res.status(409).json({
      success: false,
      error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel preparar a Ci\xEAncia da Emiss\xE3o."
    });
  }
  const { data: batchRows, error: batchError } = await db.rpc(
    "reserve_sefaz_manifestation_batch",
    { p_cnpj: configuredCnpj }
  );
  if (batchError)
    return res.status(503).json({ success: false, retryable: true, error: "N\xE3o foi poss\xEDvel reservar a fila de Ci\xEAncia por CNPJ." });
  const batchLease = Array.isArray(batchRows) ? batchRows[0] : batchRows;
  if (!batchLease?.allowed)
    return res.status(429).json({
      success: false,
      skipped: true,
      retryAfter: batchLease?.next_allowed_at || null,
      error: "Outro lote de Ci\xEAncia est\xE1 em processamento ou aguardando o intervalo m\xEDnimo por CNPJ."
    });
  if (!batchLease.claim_token)
    return res.status(503).json({ success: false, retryable: true, error: "A fila de Ci\xEAncia foi reservada sem identificador de execu\xE7\xE3o." });
  const finishBatch = async (cooldownSeconds) => {
    const { data, error } = await db.rpc("finish_sefaz_manifestation_batch", {
      p_cnpj: configuredCnpj,
      p_claim_token: batchLease.claim_token,
      p_cooldown_seconds: cooldownSeconds
    });
    const finished = Array.isArray(data) ? data[0] : data;
    return error ? null : finished?.next_allowed_at || null;
  };
  const { data: reservation, error: reservationError } = await db.rpc(
    "reserve_inbound_manifestation_event",
    {
      p_access_key: accessKey,
      p_environment: environment,
      p_recipient_cnpj: recipientCnpj,
      p_signed_xml: signedXml,
      p_user_id: authorization.userId,
      p_request_id: requestId
    }
  );
  if (reservationError) {
    const message = String(reservationError.message || "");
    await finishBatch(0);
    if (message.includes("INBOUND_MANIFESTATION_PREVIOUS_EVENT_PENDING"))
      return res.status(409).json({ success: false, pending: true, error: "Existe uma tentativa de Ci\xEAncia com resultado incerto. N\xE3o reenvie o evento; reconcilie o hist\xF3rico fiscal antes de tentar novamente." });
    if (message.includes("INBOUND_INVOICE_NOT_FOUND"))
      return res.status(404).json({ success: false, error: "NF-e de entrada n\xE3o encontrada." });
    if (message.includes("INBOUND_MANIFESTATION_REQUIRES_SUMMARY"))
      return res.status(409).json({ success: false, error: "A nota n\xE3o est\xE1 mais apenas como resumo." });
    if (message.includes("INBOUND_MANIFESTATION_ENVIRONMENT_MISMATCH"))
      return res.status(409).json({ success: false, error: "O ambiente fiscal da nota mudou. Atualize a lista antes de continuar." });
    if (message.includes("INBOUND_MANIFESTATION_RECIPIENT_MISMATCH"))
      return res.status(409).json({ success: false, error: "O destinat\xE1rio da NF-e n\xE3o corresponde ao CNPJ do evento." });
    return res.status(409).json({ success: false, error: "N\xE3o foi poss\xEDvel reservar a transmiss\xE3o da Ci\xEAncia." });
  }
  const reservationRow = Array.isArray(reservation) ? reservation[0] : reservation;
  if (!reservationRow?.event_id) {
    await finishBatch(0);
    return res.status(503).json({ success: false, pending: true, error: "A tentativa foi reservada sem confirma\xE7\xE3o do hist\xF3rico. N\xE3o reenvie." });
  }
  if (reservationRow.created !== true) {
    const { data: previousEvent, error: previousError } = await db.from("inbound_manifestation_events").select("status,cstat,xmotivo,protocol_number").eq("id", reservationRow.event_id).maybeSingle();
    await finishBatch(0);
    if (previousError || !previousEvent)
      return res.status(503).json({ success: false, pending: true, error: "A Ci\xEAncia j\xE1 possui uma tentativa registrada, mas seu estado n\xE3o p\xF4de ser consultado." });
    if (previousEvent.status === "registered")
      return res.status(200).json({ success: true, alreadyProcessed: true, processed: automatic, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, protocolNumber: previousEvent.protocol_number });
    if (previousEvent.status === "rejected")
      return res.status(422).json({ success: false, cStat: previousEvent.cstat, xMotivo: previousEvent.xmotivo, error: previousEvent.xmotivo || "A SEFAZ rejeitou a Ci\xEAncia." });
    return res.status(202).json({ success: false, pending: true, error: "A tentativa anterior ainda est\xE1 em processamento ou precisa de reconcilia\xE7\xE3o. Nenhum evento novo foi enviado." });
  }
  let responseXml;
  try {
    responseXml = await sendNationalEventOnce({
      environment,
      xmlPayload: signedXml,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem
    });
  } catch {
    await db.from("inbound_manifestation_events").update({ status: "unknown", xmotivo: "Transmiss\xE3o iniciada sem confirma\xE7\xE3o da resposta do Ambiente Nacional." }).eq("id", reservationRow.event_id).eq("status", "transmitting");
    const nextAllowedAt2 = await finishBatch(5);
    return res.status(202).json({ success: false, pending: true, retryAfter: nextAllowedAt2, error: "Resultado incerto ap\xF3s o envio. N\xE3o reenvie a Ci\xEAncia at\xE9 reconciliar a situa\xE7\xE3o fiscal." });
  }
  const result = parseInboundManifestationResponse(responseXml);
  const { error: updateError } = await db.from("inbound_manifestation_events").update({
    status: result.status,
    response_xml: responseXml,
    cstat: result.cStat,
    xmotivo: result.xMotivo,
    protocol_number: result.protocolNumber,
    protocol_date: result.protocolDate,
    confirmed_at: result.status === "registered" ? (/* @__PURE__ */ new Date()).toISOString() : null
  }).eq("id", reservationRow.event_id).eq("status", "transmitting");
  const sefazBlocked = result.cStat === "656" || /<(?:[\w.-]+:)?cStat\b[^>]*>\s*656\s*<\//i.test(responseXml);
  const nextAllowedAt = await finishBatch(sefazBlocked ? 3600 : 5);
  if (updateError)
    return res.status(503).json({ success: result.status === "registered", pending: true, retryAfter: sefazBlocked ? nextAllowedAt : void 0, cStat: result.cStat, error: "A resposta da SEFAZ foi recebida, mas o hist\xF3rico local precisa de reconcilia\xE7\xE3o. N\xE3o reenvie o evento." });
  if (result.status === "unknown")
    return res.status(202).json({ success: false, pending: true, retryAfter: nextAllowedAt, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || "O Ambiente Nacional n\xE3o confirmou o resultado do evento. N\xE3o reenvie." });
  if (result.status === "rejected")
    return res.status(422).json({ success: false, retryAfter: sefazBlocked ? nextAllowedAt : void 0, sefazBlocked, cStat: result.cStat, xMotivo: result.xMotivo, error: result.xMotivo || "A SEFAZ rejeitou a Ci\xEAncia da Emiss\xE3o." });
  return res.status(200).json({
    success: true,
    nextAllowedAt,
    processed: automatic,
    cStat: result.cStat,
    xMotivo: result.xMotivo,
    protocolNumber: result.protocolNumber,
    protocolDate: result.protocolDate
  });
}
//# sourceMappingURL=inbound-manifestation.cjs.map
