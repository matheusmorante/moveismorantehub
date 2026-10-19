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

// api/nfe/return-fiscal-eligibility.ts
var return_fiscal_eligibility_exports = {};
__export(return_fiscal_eligibility_exports, {
  default: () => handler
});
module.exports = __toCommonJS(return_fiscal_eligibility_exports);

// shared-utils/fiscalIdentifiers.ts
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

// api/nfe/return-fiscal-eligibility.ts
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

// api/nfe/automaticReturnWorkerAuthorization.ts
var import_node_crypto = require("node:crypto");
var AUTOMATIC_RETURN_WORKER_SECRET_HEADER = "x-nfe-return-worker-secret";
function isAutomaticReturnWorkerAuthorized(header, expectedSecret = process.env.NFE_RETURN_AUTO_WORKER_SECRET) {
  const headerValue = Array.isArray(header) ? header[0] : header;
  const suppliedSecret = String(headerValue || "").trim();
  if (!expectedSecret || !suppliedSecret) return false;
  const supplied = Buffer.from(suppliedSecret);
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && (0, import_node_crypto.timingSafeEqual)(supplied, expected);
}

// erp/src/pages/utils/nfe/nfeAccessKey.ts
function calculateMod11CheckDigit(base43) {
  return calculateAccessKeyDigit(base43);
}

// erp/src/pages/utils/nfe/sefazResponseParser.ts
function firstTag(xml, tag) {
  const qualifiedTag = `(?:[\\w.-]+:)?${tag}`;
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
  const normalized = String(code).replace(/\D/g, "");
  return CFOP_BY_CODE.get(normalized);
}

// shared-utils/fiscal-cfop-model/selection.ts
function listActiveCfopOptions(filter) {
  return CANONICAL_CFOPS.filter((item) => {
    if (!item.active) return false;
    if (filter?.direction && item.direction !== filter.direction) return false;
    if (filter?.scope && item.scope !== filter.scope) return false;
    if (filter?.itemType && item.itemType !== filter.itemType) return false;
    if (filter?.model && !item.allowedModels.includes(filter.model)) return false;
    if (filter?.operationType && item.operationType !== filter.operationType) return false;
    if (filter?.merchandiseOrigin && item.merchandiseOrigin !== filter.merchandiseOrigin)
      return false;
    const stApplicability = item.stApplicability || (item.isSt ? "required" : item.itemType === "product" ? "not_required" : "not_applicable");
    if (filter?.isSt === true && stApplicability === "not_required") return false;
    if (filter?.isSt === false && stApplicability === "required") return false;
    return true;
  }).map((item) => ({
    value: item.code,
    label: `${item.code} - ${item.description}`,
    operationType: item.operationType,
    merchandiseOrigin: item.merchandiseOrigin,
    isSt: Boolean(item.isSt),
    stApplicability: item.stApplicability || (item.isSt ? "required" : "not_required")
  }));
}

// shared-utils/fiscalOperationContext.ts
var ESTORNO_NATURE_OF_OPERATION = "Nota Fiscal de Estorno";
var RETURN_TAX_MATRIX_REQUIRED_MESSAGE = "Este cen\xE1rio de devolu\xE7\xE3o ainda n\xE3o tem matriz tribut\xE1ria aprovada no ERP. A emiss\xE3o permanece bloqueada sem alterar ou zerar os dados tribut\xE1rios da NF-e original.";
function hasNonZeroTaxAmount(xml, excludeCommercialTotals = false) {
  const commercialTotals = /* @__PURE__ */ new Set([
    "vProd",
    "vFrete",
    "vSeg",
    "vDesc",
    "vOutro",
    "vNF",
    "vNFTot"
  ]);
  const valuePattern = /<(?:[\w.-]+:)?(v[a-z][\w.-]*|q(?:bc|selo)[\w.-]*)\b[^>]*>\s*([+-]?(?:\d+)(?:\.\d+)?)\s*<\/(?:[\w.-]+:)?\1>/gi;
  for (const match of xml.matchAll(valuePattern)) {
    if (excludeCommercialTotals && commercialTotals.has(match[1])) continue;
    const numericValue = Number(match[2]);
    if (!Number.isFinite(numericValue) || Math.abs(numericValue) > 1e-7) return true;
  }
  return false;
}
function validateReturnTaxScenario(sourceInvoiceXml, sourceTaxesXml) {
  if (hasNonZeroTaxAmount(sourceTaxesXml)) return RETURN_TAX_MATRIX_REQUIRED_MESSAGE;
  const totals = sourceInvoiceXml.match(
    /<(?:[\w.-]+:)?total\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?total>/i
  )?.[0];
  if (totals && hasNonZeroTaxAmount(totals, true)) return RETURN_TAX_MATRIX_REQUIRED_MESSAGE;
  return null;
}
function isSourceTaxedWithSt(taxesXml, originalCfop) {
  if (/<(?:\w+:)?(?:ICMSSN500|ICMS10|ICMS30|ICMS70|ICMS90|ICMSPart|ICMSST)\b/i.test(taxesXml))
    return true;
  const sourceCfop = getCfopDefinition(originalCfop);
  return Boolean(sourceCfop?.isSt);
}
function getReturnCfopOptionsForSourceItem(originalCfop, taxesXml, scope) {
  const sourceCfop = getCfopDefinition(originalCfop);
  if (!sourceCfop || sourceCfop.direction !== "outbound" || sourceCfop.itemType !== "product")
    return [];
  if (scope && sourceCfop.scope !== scope) return [];
  return getFiscalFormRules("return", {
    scope: scope || sourceCfop.scope,
    itemType: "product",
    merchandiseOrigin: sourceCfop.merchandiseOrigin,
    isSt: isSourceTaxedWithSt(taxesXml, originalCfop)
  }).allowedCfops;
}
var PAYMENT_WITHOUT_PAYMENT = [{ value: "90", label: "Sem pagamento" }];
var RETURN_TRANSPORT_BY_METHOD = {
  CLIENT_DELIVERED: {
    value: "4",
    label: "Transporte pr\xF3prio por conta do destinat\xE1rio (cliente trouxe \xE0 loja)"
  },
  COMPANY_PICKUP: {
    value: "3",
    label: "Transporte pr\xF3prio por conta do emitente (coleta da empresa)"
  }
};
var RETURN_NATURE = [{ value: "Devolu\xE7\xE3o de mercadoria", label: "Devolu\xE7\xE3o de mercadoria" }];
function scenarioScope(scenario) {
  if (scenario.issuerUf !== void 0 || scenario.recipientUf !== void 0) {
    const issuerUf = String(scenario.issuerUf || "").trim().toUpperCase();
    const recipientUf = String(scenario.recipientUf || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(issuerUf) || !/^[A-Z]{2}$/.test(recipientUf)) return null;
    if (recipientUf === "EX") return "foreign";
    return issuerUf === recipientUf ? "internal" : "interstate";
  }
  return scenario.scope || null;
}
function returnAvailability(scope, scenario) {
  if (!scenario.returnMethod) {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "O m\xE9todo de retorno n\xE3o est\xE1 persistido no pedido de devolu\xE7\xE3o."
    };
  }
  if (!scope) {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "N\xE3o foi poss\xEDvel determinar as UFs e o escopo fiscal da devolu\xE7\xE3o."
    };
  }
  if (scope === "interstate") {
    return {
      availability: "TEMPORARY_BLOCK",
      blockCategory: "TEMPORARY_BLOCK",
      blockReason: "A matriz fiscal de devolu\xE7\xE3o interestadual ainda n\xE3o foi aprovada e testada no ERP."
    };
  }
  if (scope === "foreign") {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "O fluxo de devolu\xE7\xE3o para o exterior ainda n\xE3o est\xE1 implementado no ERP."
    };
  }
  if (scenario.recipientFiscalStatus === "taxpayer") {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "O ERP ainda n\xE3o implementa a matriz de devolu\xE7\xE3o para destinat\xE1rio contribuinte do ICMS."
    };
  }
  if (scenario.recipientFiscalStatus === "unknown") {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "A condi\xE7\xE3o do destinat\xE1rio na NF-e original n\xE3o est\xE1 determinada pelo ERP."
    };
  }
  if (scenario.isFinalConsumer === false) {
    return {
      availability: "UNSUPPORTED_BY_ERP",
      blockCategory: "UNSUPPORTED_BY_ERP",
      blockReason: "O ERP ainda n\xE3o implementa a matriz de devolu\xE7\xE3o para destinat\xE1rio que n\xE3o seja consumidor final."
    };
  }
  return { availability: "READY" };
}
function getFiscalFormRules(context, scenario = {}) {
  if (context === "return") {
    const scope = scenarioScope(scenario);
    const transport = scenario.returnMethod ? RETURN_TRANSPORT_BY_METHOD[scenario.returnMethod] : null;
    const availability = returnAvailability(scope, scenario);
    return {
      context,
      visibleFields: [
        "origin",
        "purpose",
        "operation",
        "originalDocumentReference",
        "stockEffect",
        "natureOfOperation",
        "environment",
        "recipient",
        "items",
        "cfop",
        "taxes",
        "transport",
        "payment",
        "additionalInformation",
        "totals",
        "originalItemReference",
        "reviewConfirmations",
        "productionConfirmation"
      ],
      readOnlyFields: [
        "purpose",
        "model",
        "environment",
        "natureOfOperation",
        "recipient",
        "totals",
        "items",
        "payment",
        "transport",
        "originalDocumentReference",
        "originalItemReference",
        "additionalInformation",
        "stockEffect"
      ],
      hiddenFields: ["salePaymentMethods", "normalPurposeOptions", "estornoReason"],
      requiredFields: [
        "origin",
        "purpose",
        "model",
        "environment",
        "operation",
        "cfop",
        "recipient",
        "items",
        "taxes",
        "transport",
        "payment",
        "additionalInformation",
        "natureOfOperation",
        "totals",
        "originalDocumentReference",
        "originalItemReference",
        "reviewConfirmations"
      ],
      allowedModels: ["55"],
      allowedFinalidades: [4],
      allowedCfops: scope ? listActiveCfopOptions({
        direction: "inbound",
        scope,
        model: "55",
        itemType: scenario.itemType || "product",
        operationType: "customer_return",
        merchandiseOrigin: scenario.merchandiseOrigin,
        isSt: scenario.isSt
      }) : [],
      allowedPaymentOptions: PAYMENT_WITHOUT_PAYMENT,
      allowedTransportModes: transport ? [transport] : [],
      natureOptions: RETURN_NATURE,
      fixedValues: {
        finalidade: 4,
        tpNF: 0,
        ...scope ? { idDest: scope === "internal" ? 1 : scope === "interstate" ? 2 : 3 } : {},
        indFinal: 1,
        indIEDest: 9,
        indPres: 0,
        tPag: "90",
        vPag: "0.00",
        ...transport ? { modFrete: transport.value } : {}
      },
      ...availability,
      taxReviewMode: "source_zero_only_until_matrix"
    };
  }
  if (context === "estorno") {
    return {
      context,
      visibleFields: [
        "origin",
        "purpose",
        "operation",
        "natureOfOperation",
        "originalDocumentReference",
        "stockEffect",
        "reviewConfirmations",
        "productionConfirmation",
        "reason",
        "environment",
        "recipient",
        "items",
        "taxes",
        "transport",
        "payment",
        "totals"
      ],
      readOnlyFields: [
        "purpose",
        "model",
        "environment",
        "natureOfOperation",
        "items",
        "originalDocumentReference"
      ],
      hiddenFields: ["salePaymentMethods", "recipientSelection", "transportSelection"],
      requiredFields: [
        "origin",
        "purpose",
        "model",
        "environment",
        "natureOfOperation",
        "items",
        "reason"
      ],
      allowedModels: ["55"],
      allowedFinalidades: [3],
      allowedCfops: [],
      allowedPaymentOptions: [],
      allowedTransportModes: [],
      natureOptions: [
        { value: ESTORNO_NATURE_OF_OPERATION, label: ESTORNO_NATURE_OF_OPERATION }
      ],
      fixedValues: { finalidade: 3, tpNF: 0, natOp: ESTORNO_NATURE_OF_OPERATION },
      availability: "READY",
      taxReviewMode: "proportional_original_only"
    };
  }
  return {
    context,
    visibleFields: ["all"],
    readOnlyFields: [],
    hiddenFields: [],
    requiredFields: ["origin", "purpose", "model", "environment", "recipient", "items", "payment"],
    allowedModels: ["55", "65"],
    allowedFinalidades: [1],
    allowedCfops: [],
    allowedPaymentOptions: [],
    allowedTransportModes: [],
    natureOptions: [],
    fixedValues: { finalidade: 1 },
    availability: "READY",
    taxReviewMode: "normal"
  };
}

// erp/src/pages/utils/nfe/fiscalCfopResolution.ts
function normalizeCfop(value) {
  const code = String(value || "").replace(/\D/g, "");
  return /^\d{4}$/.test(code) ? code : null;
}
function originalItemCfop(productXml) {
  return normalizeCfop(productXml.match(/<(?:\w+:)?CFOP>(\d{4})<\/(?:\w+:)?CFOP>/i)?.[1]);
}

// api/nfe/returnFiscalRules.ts
var MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE = "N\xE3o \xE9 poss\xEDvel emitir NF-e de devolu\xE7\xE3o porque este pedido n\xE3o possui NF-e de sa\xEDda autorizada.";
function getReturnIssuerSettings(value) {
  const root = value && typeof value === "object" ? value : {};
  const settings = root.data && typeof root.data === "object" ? root.data : root;
  const legacy = settings.fiscalDefaults && typeof settings.fiscalDefaults === "object" ? settings.fiscalDefaults : {};
  return { ...legacy, ...settings };
}
function resolveFiscalReturnMethod(orderData) {
  const persistedMethod = String(orderData.returnMethod || "").trim().toLowerCase();
  if (["client_delivered", "client-delivered", "store_delivery"].includes(persistedMethod))
    return "CLIENT_DELIVERED";
  if (["company_pickup", "company-pickup", "store_collection"].includes(persistedMethod))
    return "COMPANY_PICKUP";
  return null;
}
function xmlBlock(xml, name) {
  const prefix = "(?:[\\w.-]+:)?";
  return xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${name}>`, "i"))?.[0] || "";
}
function readXmlTag(xml, name) {
  const prefix = "(?:[\\w.-]+:)?";
  return xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>([\\s\\S]*?)<\\/${prefix}${name}>`, "i"))?.[1]?.trim() || "";
}
function validateAuthorizedOutboundNfe(source, linkedSaleOrderId, expectedEnvironment, options = {}) {
  if (!source || source.document_type !== "outbound" || source.order_id !== linkedSaleOrderId || !["55", "65"].includes(String(source.modelo)) || ![1, 2].includes(Number(source.ambiente)) || expectedEnvironment !== void 0 && Number(source.ambiente) !== expectedEnvironment || source.status !== (Number(source.ambiente) === 1 ? "autorizada" : "homologada") || !ACCESS_KEY_PATTERN.test(source.chave_acesso || "") || source.chave_acesso.slice(20, 22) !== String(source.modelo) || source.chave_acesso.slice(22, 25) !== String(Number(source.serie)).padStart(3, "0") || source.chave_acesso.slice(25, 34) !== String(Number(source.numero_nfe)).padStart(9, "0") || source.chave_acesso.slice(6, 20) === "00000000000000" || calculateMod11CheckDigit(source.chave_acesso.slice(0, 43)) !== Number(source.chave_acesso[43]) || !/^\d{15}$/.test(source.numero_protocolo || "")) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }
  const authorizationXml = String(source.xml_protocolo || "");
  const authorization = parseSefazAuthorization(authorizationXml);
  const protocol = xmlBlock(authorizationXml, "infProt");
  if (!authorization.authorized || authorization.protocolNumber !== source.numero_protocolo || readXmlTag(protocol, "cStat") !== "100" || readXmlTag(protocol, "chNFe") !== source.chave_acesso || readXmlTag(protocol, "tpAmb") !== String(source.ambiente)) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }
  const invoiceXml = String(source.xml_nfe || "");
  const infNfe = xmlBlock(invoiceXml, "infNFe");
  const ide = xmlBlock(infNfe, "ide");
  if (!infNfe || !new RegExp(`\\bId=["']NFe${source.chave_acesso}["']`, "i").test(infNfe) || readXmlTag(ide, "mod") !== String(source.modelo) || readXmlTag(ide, "tpAmb") !== String(source.ambiente) || readXmlTag(ide, "serie") !== String(Number(source.serie)) || readXmlTag(ide, "nNF") !== String(Number(source.numero_nfe)) || readXmlTag(xmlBlock(invoiceXml, "emit"), "CNPJ") !== source.chave_acesso.slice(6, 20)) {
    return MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
  }
  if (String(source.modelo) === "65" && !options.allowNfceSource) {
    return "A emiss\xE3o de NF-e de devolu\xE7\xE3o com origem em NFC-e modelo 65 ainda n\xE3o \xE9 suportada pelo MoranteHub. A devolu\xE7\xE3o comercial pode ser registrada; a corre\xE7\xE3o fiscal exige revis\xE3o.";
  }
  return null;
}
function validateSupportedReturnEntryScenario(sourceInvoiceXml, companyUf, returnMethod, companyTaxRegime) {
  const destination = xmlBlock(sourceInvoiceXml, "dest");
  const destinationUf = readXmlTag(destination, "UF").toUpperCase();
  const taxpayerIndicator = readXmlTag(destination, "indIEDest");
  const invoiceIde = xmlBlock(xmlBlock(sourceInvoiceXml, "infNFe"), "ide");
  const originalIsFinalConsumer = readXmlTag(invoiceIde, "indFinal") === "1";
  const normalizedCompanyUf = companyUf.trim().toUpperCase();
  if (!destination || !destinationUf || !normalizedCompanyUf) {
    return "UNSUPPORTED_BY_ERP: n\xE3o foi poss\xEDvel determinar a UF e a condi\xE7\xE3o fiscal do destinat\xE1rio original.";
  }
  const originalTaxRegime = readXmlTag(xmlBlock(sourceInvoiceXml, "emit"), "CRT");
  if (!companyTaxRegime || !originalTaxRegime || companyTaxRegime !== originalTaxRegime) {
    return "UNSUPPORTED_BY_ERP: o regime tribut\xE1rio atual n\xE3o confere com o regime gravado na NF-e original.";
  }
  const recipientFiscalStatus = taxpayerIndicator === "9" ? "non_taxpayer" : ["1", "2"].includes(taxpayerIndicator) ? "taxpayer" : "unknown";
  const rules = getFiscalFormRules("return", {
    issuerUf: normalizedCompanyUf,
    recipientUf: destinationUf,
    returnMethod: returnMethod || void 0,
    recipientFiscalStatus,
    isFinalConsumer: originalIsFinalConsumer
  });
  if (rules.availability !== "READY")
    return `${rules.blockCategory}: ${rules.blockReason}`;
  return null;
}

// api/nfe/return-fiscal-eligibility.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: "Servi\xE7o fiscal indispon\xEDvel." });
  const returnOrderId = String(req.query.returnOrderId || "");
  if (!uuid.test(returnOrderId))
    return res.status(400).json({ error: "Devolu\xE7\xE3o fiscal inv\xE1lida." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const automaticReturnWorker = isAutomaticReturnWorkerAuthorized(
    req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER]
  );
  const fiscalAuthorization = automaticReturnWorker ? { ok: true, userId: null, isAdministrator: false } : await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({ error: fiscalAuthorization.message });
  const reviewCancelled = !automaticReturnWorker && req.query.reviewCancelled === "true";
  try {
    const [{ data: returnOrder, error: returnError }, { data: settingsRow, error: settingsError }] = await Promise.all([
      db.from("orders").select("id,order_type,status,deleted,items,order_index,linked_order_id,order_data").eq("id", returnOrderId).maybeSingle(),
      db.from("settings").select("data").eq("id", "app").maybeSingle()
    ]);
    if (returnError || settingsError) throw returnError || settingsError;
    if (!returnOrder || returnOrder.order_type !== "return" || returnOrder.deleted) {
      return res.status(404).json({ error: "Pedido de devolu\xE7\xE3o n\xE3o encontrado." });
    }
    if (returnOrder.status !== "fulfilled") {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: "A devolu\xE7\xE3o precisa estar recebida/coletada antes da emiss\xE3o fiscal.",
        sources: []
      });
    }
    const orderData = asRecord(returnOrder.order_data);
    const returnMethod = resolveFiscalReturnMethod(orderData);
    const linkedSaleOrderId = String(returnOrder.linked_order_id || orderData.linkedOrderId || "");
    if (!uuid.test(linkedSaleOrderId)) {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
        sources: []
      });
    }
    const { data: allocations, error: allocationsError } = await db.from("nfe_return_item_allocations").select(
      "id,return_order_id,return_item_index,original_document_id,original_item_number,quantity,fiscal_return_document_id,created_at"
    ).eq("return_order_id", returnOrderId).order("return_item_index");
    if (allocationsError) throw allocationsError;
    if (!allocations?.length) {
      return res.status(200).json({
        eligible: false,
        returnOrderId,
        hasAuthorizedOriginal: false,
        reason: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE,
        sources: []
      });
    }
    const sourceIds = [...new Set(allocations.map((item) => item.original_document_id))];
    const [{ data: sourceDocuments, error: sourceError }, { data: originalLines, error: linesError }, { data: returnDocuments, error: returnDocumentsError }, { data: drafts, error: draftsError }] = await Promise.all([
      db.from("nfe_documents").select(
        "id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe"
      ).in("id", sourceIds),
      db.from("nfe_document_items").select("id,document_id,item_number,billed_quantity,product_code,description,product_xml,taxes_xml").in("document_id", sourceIds),
      db.from("nfe_documents").select("id,original_document_id,related_return_order_id,document_type,status,ambiente,chave_acesso").eq("related_return_order_id", returnOrderId),
      db.from("nfe_operation_drafts").select("id,original_document_id,return_order_id,environment,status,document_id,updated_at").eq("return_order_id", returnOrderId).in("original_document_id", sourceIds).order("updated_at", { ascending: false })
    ]);
    if (sourceError || linesError || returnDocumentsError || draftsError)
      throw sourceError || linesError || returnDocumentsError || draftsError;
    const fiscalSettings = getReturnIssuerSettings(settingsRow);
    const companyUf = String(fiscalSettings.companyUF || "");
    const companyTaxRegime = String(fiscalSettings.companyCRT || "");
    const companyCnpj = normalizeFiscalIdentifier(String(fiscalSettings.companyCnpj || ""));
    const sourceById = new Map((sourceDocuments || []).map((source) => [source.id, source]));
    const lineByDocumentAndNumber = new Map(
      (originalLines || []).map((line) => [`${line.document_id}:${line.item_number}`, line])
    );
    const sourceGroups = sourceIds.map((sourceId) => {
      const source = sourceById.get(sourceId);
      const sourceAllocations = allocations.filter((item) => item.original_document_id === sourceId);
      const authorizationError = validateAuthorizedOutboundNfe(
        source,
        linkedSaleOrderId,
        source && ([1, 2].includes(Number(source.ambiente)) ? Number(source.ambiente) : void 0)
      );
      const companyCnpjMatchesSource = Boolean(
        source && companyCnpj.length === 14 && source.chave_acesso.slice(6, 20) === companyCnpj
      );
      const sourceAuthorized = !authorizationError && Boolean(source) && companyCnpjMatchesSource;
      let blockReason = authorizationError;
      if (!authorizationError && !companyCnpj) {
        blockReason = "CNPJ do estabelecimento ausente na configura\xE7\xE3o fiscal do servidor.";
      }
      if (!authorizationError && source && companyCnpj && !companyCnpjMatchesSource) {
        blockReason = MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE;
      }
      if (!blockReason && source) {
        blockReason = validateSupportedReturnEntryScenario(
          source.xml_nfe || "",
          companyUf,
          returnMethod,
          companyTaxRegime
        );
      }
      const quantities = /* @__PURE__ */ new Map();
      for (const allocation of sourceAllocations) {
        const quantity = Number(allocation.quantity);
        const originalLine = lineByDocumentAndNumber.get(
          `${sourceId}:${allocation.original_item_number}`
        );
        if (!Number.isInteger(allocation.return_item_index) || !Number.isInteger(allocation.original_item_number) || !Number.isFinite(quantity) || quantity <= 0 || !originalLine || (quantities.get(allocation.original_item_number) || 0) + quantity > Number(originalLine.billed_quantity) + 5e-5) {
          blockReason ||= "A aloca\xE7\xE3o dos itens devolvidos n\xE3o corresponde \xE0s quantidades fiscais da NF-e original.";
        }
        if (originalLine && !getReturnCfopOptionsForSourceItem(
          originalItemCfop(originalLine.product_xml) || "",
          originalLine.taxes_xml
        ).length) {
          blockReason ||= `N\xE3o h\xE1 CFOP de devolu\xE7\xE3o aprovado para o item original ${allocation.original_item_number}.`;
        }
        if (originalLine) {
          blockReason ||= validateReturnTaxScenario(source?.xml_nfe || "", originalLine.taxes_xml);
        }
        quantities.set(
          allocation.original_item_number,
          (quantities.get(allocation.original_item_number) || 0) + quantity
        );
      }
      const sourceReturnDocuments = (returnDocuments || []).filter(
        (document) => document.original_document_id === sourceId && document.document_type === "return"
      );
      const isCancelledDocument = (document) => ["cancelada", "cancelled"].includes(document.status);
      const activeReturnDocument = sourceReturnDocuments.find((document) => !isCancelledDocument(document));
      const cancelledReturnDocument = sourceReturnDocuments.find(isCancelledDocument);
      const sourceDrafts = (drafts || []).filter((draft) => draft.original_document_id === sourceId);
      const returnedDocument = activeReturnDocument || (reviewCancelled ? void 0 : cancelledReturnDocument);
      const existingDraft = sourceDrafts.find((draft) => draft.status !== "cancelled") || (reviewCancelled ? void 0 : sourceDrafts[0]);
      if (!blockReason && reviewCancelled && cancelledReturnDocument && !activeReturnDocument && (sourceAllocations.some((allocation) => allocation.fiscal_return_document_id) || sourceDrafts.some((draft) => draft.status === "authorized"))) {
        blockReason = "O cancelamento fiscal precisa reconciliar o rascunho e liberar as aloca\xE7\xF5es antes de uma nova revis\xE3o.";
      }
      let state = blockReason ? "blocked" : "ready";
      if (!blockReason && returnedDocument) {
        state = ["autorizada", "homologada"].includes(returnedDocument.status) ? "authorized" : returnedDocument.status === "cancelada" || returnedDocument.status === "cancelled" ? "cancelled" : "blocked";
        if (state === "blocked") blockReason = "A NF-e de devolu\xE7\xE3o vinculada exige reconcilia\xE7\xE3o fiscal.";
      } else if (!blockReason && existingDraft) {
        state = existingDraft.status === "cancelled" ? "cancelled" : ["transmitting", "unknown"].includes(existingDraft.status) ? "pending" : existingDraft.status === "rejected" ? "rejected" : "draft";
      }
      return {
        source: source && sourceAuthorized ? {
          id: source.id,
          order_id: source.order_id,
          modelo: source.modelo,
          ambiente: Number(source.ambiente),
          numero_nfe: Number(source.numero_nfe),
          serie: String(source.serie),
          chave_acesso: source.chave_acesso
        } : null,
        state,
        sourceAuthorized,
        blockReason,
        draftId: existingDraft?.id || null,
        returnDocumentId: returnedDocument?.id || null,
        allocatedItems: sourceAllocations.map((allocation) => ({
          returnItemIndex: allocation.return_item_index,
          originalItemNumber: allocation.original_item_number,
          quantity: Number(allocation.quantity),
          productCode: lineByDocumentAndNumber.get(`${sourceId}:${allocation.original_item_number}`)?.product_code || ""
        }))
      };
    });
    const hasAuthorizedOriginal = sourceGroups.some((group) => group.sourceAuthorized);
    const eligible = sourceGroups.some(
      (group) => ["ready", "draft", "rejected", "pending", "authorized"].includes(group.state)
    );
    const reviewingCancelled = reviewCancelled && sourceGroups.some((group) => ["ready", "draft", "rejected"].includes(group.state) && (returnDocuments || []).some((document) => document.original_document_id === group.source?.id && ["cancelada", "cancelled"].includes(document.status)));
    return res.status(200).json({
      eligible,
      returnOrderId,
      returnOrderIndex: returnOrder.order_index,
      linkedSaleOrderId,
      hasAuthorizedOriginal,
      reason: eligible ? reviewingCancelled ? "Uma NF-e anterior est\xE1 cancelada. A nova emiss\xE3o exige revis\xE3o fiscal e n\xE3o altera o retorno f\xEDsico j\xE1 confirmado." : null : sourceGroups.find((group) => group.blockReason)?.blockReason || (hasAuthorizedOriginal ? "A NF-e de devolu\xE7\xE3o vinculada est\xE1 cancelada; uma nova emiss\xE3o exige revis\xE3o fiscal." : MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE),
      sources: sourceGroups
    });
  } catch (error) {
    console.error(
      "[NF-e Return Eligibility] Falha ao conferir v\xEDnculo fiscal:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel verificar a elegibilidade fiscal da devolu\xE7\xE3o." });
  }
}
//# sourceMappingURL=return-fiscal-eligibility.cjs.map
