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

// api/nfe/audit-order-edit.ts
var audit_order_edit_exports = {};
__export(audit_order_edit_exports, {
  default: () => handler
});
module.exports = __toCommonJS(audit_order_edit_exports);
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
var DEFAULT_SUPABASE_URL = "https://hkoxhourxwlddgsfdgws.supabase.co";
var DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb3hob3VyeHdsZGRnc2ZkZ3dzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTg5MzgsImV4cCI6MjA5MzczNDkzOH0.vCNJeoR4wDl1BqESiyNhKpgviwxcx0cim8Dbl6MvdJI";
function getSupabaseUrl() {
  ensureEnvLoaded();
  return process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
}
function getSupabaseAnonKey() {
  ensureEnvLoaded();
  return process.env.VITE_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_ANON_KEY;
}
function getSupabaseSecretKey() {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.service_role?.trim();
}

// api/nfe/fiscalXmlAudit.ts
var import_xmldom = require("@xmldom/xmldom");
var import_xml_crypto = require("xml-crypto");

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
  return value.replace(/\D/g, "");
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
  const verifier = new import_xml_crypto.SignedXml({
    getCertFromKeyInfo: import_xml_crypto.SignedXml.getCertFromKeyInfo,
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
var normalizeTaxId2 = (value) => String(value ?? "").replace(/\D/g, "");
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
var hasGoodsCirculated = (row) => getGoodsCirculationState(row) !== "none";

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

// erp/src/pages/utils/nfe/orderEditFiscalPolicy.ts
function getOrderEditFiscalPolicy(order, document, now) {
  if (hasGoodsCirculated(order)) {
    return {
      action: "blocked",
      reason: "A mercadoria j\xE1 circulou. Preserve a nota original e use a devolu\xE7\xE3o vinculada quando houver retorno f\xEDsico.",
      deadline: null
    };
  }
  if (getGoodsCirculationState(order) === "in_progress") {
    return {
      action: "blocked",
      reason: "A entrega ou retirada ainda n\xE3o foi confirmada. Revise o andamento da opera\xE7\xE3o antes de substituir a nota.",
      deadline: null
    };
  }
  if (String(order.status || "").toLowerCase() !== "scheduled") {
    return {
      action: "blocked",
      reason: "A substitui\xE7\xE3o por edi\xE7\xE3o exige uma venda ainda agendada, sem circula\xE7\xE3o.",
      deadline: null
    };
  }
  return getFiscalCancellationPolicy({
    model: document.modelo,
    environment: document.ambiente,
    status: document.status,
    authorizedAt: getAuthorizedAt(document.xml_protocolo || "", ""),
    issuerUf: document.chave_acesso.slice(0, 2) === "41" ? "PR" : "",
    goodsCirculated: false,
    operationDidNotOccur: true,
    now
  });
}

// erp/src/pages/utils/orderPersistencePayload.ts
var buildOrderPersistencePayload = (order) => {
  const customerId = order.customerData?.id || null;
  const customerName = order.customerData?.fullName || order.customerName || "";
  const sellerId = order.sellerId || null;
  const sellerName = order.seller || "";
  const orderIndex = Number(order.orderIndex || order.orderNumber || 0) || null;
  const orderNumber = String(order.orderIndex || order.orderNumber || "");
  const status = order.status || "draft";
  const totalAmount = order.paymentsSummary?.totalOrderValue ?? order.total_amount ?? 0;
  const orderType = order.orderType || "sale";
  const scheduledDate = order.shipping?.scheduling?.date || order.scheduledDate || null;
  const scheduledStartTime = order.shipping?.scheduling?.startTime || null;
  const scheduledEndTime = order.shipping?.scheduling?.endTime || null;
  const deliveryMethod = order.shipping?.deliveryMethod || null;
  const deliveryStatus = order.deliveryStatus || null;
  const marketingOrigin = order.marketingOrigin || order.customerData?.marketingOrigin || null;
  const itemsSubtotal = order.itemsSummary?.itemsSubtotal ?? 0;
  const totalDiscount = order.itemsSummary?.totalFixedDiscount ?? 0;
  const totalCost = order.itemsSummary?.totalItemsCost ?? 0;
  const stockProcessed = Boolean(order.stockProcessed);
  const isStockChecked = Boolean(order.isStockChecked);
  const isRegisteredInBling = Boolean(order.isRegisteredInBling);
  const deleted = Boolean(order.deleted);
  const deletedAt = order.deletedAt ? new Date(order.deletedAt).toISOString() : null;
  const returnOrderId = order.returnOrderId || null;
  const linkedOrderId = order.linkedOrderId || null;
  const returnedTotalAmount = order.returnedTotalAmount ?? null;
  const originalSoldTotal = order.originalSoldTotal ?? null;
  const returnKind = order.returnKind || null;
  let normalizedScheduledDate = null;
  if (scheduledDate) {
    const rawDate = String(scheduledDate).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      normalizedScheduledDate = rawDate.slice(0, 10);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(rawDate)) {
      const [d, m, y] = rawDate.slice(0, 10).split("/");
      normalizedScheduledDate = `${y}-${m}-${d}`;
    }
  }
  const sanitizedOrder = { ...order };
  delete sanitizedOrder.updatedAt;
  if (sanitizedOrder.date && /^\d{2}\/\d{2}\/\d{4}/.test(sanitizedOrder.date)) {
    const [d, m, y] = sanitizedOrder.date.slice(0, 10).split("/");
    sanitizedOrder.date = `${y}-${m}-${d}T12:00:00.000Z`;
  }
  return {
    order_data: sanitizedOrder,
    items: order.items || [],
    order_number: orderNumber,
    order_index: orderIndex,
    order_type: orderType,
    status,
    customer_id: customerId,
    customer_name: customerName,
    seller_id: sellerId,
    seller_name: sellerName,
    total_amount: totalAmount,
    scheduled_date: normalizedScheduledDate,
    scheduled_start_time: scheduledStartTime,
    scheduled_end_time: scheduledEndTime,
    delivery_method: deliveryMethod,
    delivery_status: deliveryStatus,
    marketing_origin: marketingOrigin,
    items_subtotal: itemsSubtotal,
    total_discount: totalDiscount,
    total_cost: totalCost,
    stock_processed: stockProcessed,
    is_stock_checked: isStockChecked,
    is_registered_in_bling: isRegisteredInBling,
    deleted,
    deleted_at: deletedAt,
    return_order_id: returnOrderId,
    linked_order_id: linkedOrderId,
    returned_total_amount: returnedTotalAmount,
    original_sold_total: originalSoldTotal,
    return_kind: returnKind,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
};

// api/nfe/audit-order-edit.ts
var supabaseUrl = getSupabaseUrl();
var serviceKey = getSupabaseSecretKey() || "";
var anonKey = getSupabaseAnonKey();
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function loadAuditedChanges(db, order, document, proposedOrderData) {
  if (!document.emission_request_id || !document.xml_nfe)
    throw new Error("A nota autorizada n\xE3o possui v\xEDnculo t\xE9cnico e XML \xEDntegro para auditoria.");
  const { data: fiscalSnapshotRow, error } = await db.from("nfe_fiscal_snapshots").select("snapshot_data").eq("emission_request_id", document.emission_request_id).eq("order_id", order.id).maybeSingle();
  if (error || !fiscalSnapshotRow?.snapshot_data)
    throw new Error("N\xE3o existe fotografia fiscal imut\xE1vel para comparar esta nota autorizada.");
  const snapshot = fiscalSnapshotRow.snapshot_data;
  const resolvedDocument = assertAuthorizedFiscalSnapshot(
    snapshot,
    document
  );
  return findFiscalOrderEditChanges(snapshot, proposedOrderData, resolvedDocument);
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  const supabaseUrl2 = getSupabaseUrl();
  const serviceKey2 = getSupabaseSecretKey() || "";
  const anonKey2 = getSupabaseAnonKey();
  if (!supabaseUrl2 || !serviceKey2 || !anonKey2)
    return res.status(503).json({ error: "Servi\xE7o de auditoria fiscal indispon\xEDvel." });
  const header = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  const accessToken = String(header || "").replace(/^Bearer\s+/i, "").trim();
  const orderId = String(req.body?.orderId || "");
  const action = String(req.body?.action || "audit");
  const submitted = req.body?.proposedOrder;
  if (!accessToken) return res.status(401).json({ error: "Autentica\xE7\xE3o necess\xE1ria." });
  if (!uuid.test(orderId) || !["audit", "confirm", "resume", "finalize"].includes(action) || !["resume", "finalize"].includes(action) && (!submitted || typeof submitted !== "object" || Array.isArray(submitted)))
    return res.status(400).json({ error: "Dados de edi\xE7\xE3o do pedido inv\xE1lidos." });
  if (submitted && JSON.stringify(submitted).length > 1e6)
    return res.status(413).json({ error: "Os dados de edi\xE7\xE3o excedem o limite permitido." });
  const userDb = (0, import_supabase_js.createClient)(supabaseUrl2, anonKey2, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const db = (0, import_supabase_js.createClient)(supabaseUrl2, serviceKey2, { auth: { persistSession: false } });
  let fiscalOperatorId = null;
  if (action === "confirm" || action === "finalize") {
    const authorization = await authorizeFiscalOperator(db, header);
    if (!authorization.ok)
      return res.status(authorization.status).json({ error: authorization.message });
    fiscalOperatorId = authorization.userId;
  }
  const { data: visibleOrder, error: visibleOrderError } = await userDb.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (visibleOrderError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar o acesso ao pedido." });
  if (!visibleOrder) return res.status(403).json({ error: "Pedido indispon\xEDvel para esta sess\xE3o." });
  const { data: order, error: orderError } = await db.from("orders").select("id,order_type,status,order_data,updated_at,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method").eq("id", orderId).maybeSingle();
  if (orderError || !order)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel carregar o pedido atual." });
  if (!["sale", "showroom"].includes(String(order.order_type || order.order_data?.orderType || "sale")))
    return res.status(409).json({ error: "A auditoria de edi\xE7\xE3o fiscal est\xE1 dispon\xEDvel para vendas." });
  const currentData = order.order_data || {};
  if (action === "finalize") {
    const replacementId = String(req.body?.replacementId || "");
    if (!uuid.test(replacementId)) return res.status(400).json({ error: "Substitui\xE7\xE3o fiscal inv\xE1lida." });
    const { data: replacement, error: replacementError } = await db.from("nfe_order_edit_replacements").select("id").eq("id", replacementId).eq("order_id", orderId).maybeSingle();
    if (replacementError || !replacement)
      return res.status(404).json({ error: "Substitui\xE7\xE3o fiscal n\xE3o encontrada para este pedido." });
    const { data: finalized, error: finalizeError } = await db.rpc("finalize_fiscal_order_edit", {
      p_replacement_id: replacementId
    });
    if (finalizeError)
      return res.status(409).json({ error: "A revers\xE3o ainda n\xE3o est\xE1 confirmada; o pedido continua sem altera\xE7\xE3o." });
    return res.status(200).json({ success: true, order: { ...finalized.order_data, id: orderId } });
  }
  const loadContinuation = async () => {
    const { data: rows, error } = await db.from("nfe_order_edit_replacements").select("id,original_document_id,environment,reversal_kind,status,operation_draft_id,source_document_snapshot,replacement_document_id").eq("order_id", orderId).neq("status", "completed").order("created_at");
    if (error) throw new Error("O registro de substitui\xE7\xE3o fiscal est\xE1 indispon\xEDvel.");
    return Promise.all((rows || []).map(async (row) => {
      const { data: confirmed, error: proofError } = await db.rpc("is_order_edit_reversal_confirmed", {
        p_original_document_id: row.original_document_id
      });
      if (proofError) throw new Error("N\xE3o foi poss\xEDvel comprovar a revers\xE3o da nota original.");
      const source = row.source_document_snapshot;
      return {
        id: row.id,
        status: row.status,
        action: row.reversal_kind,
        environment: row.environment,
        reversalConfirmed: confirmed === true,
        draftId: row.operation_draft_id,
        replacementDocumentId: row.replacement_document_id,
        sourceDocument: {
          id: row.original_document_id,
          order_id: orderId,
          modelo: source.modelo,
          ambiente: row.environment,
          numero_nfe: source.numero_nfe,
          serie: source.serie,
          chave_acesso: source.chave_acesso
        }
      };
    }));
  };
  if (action === "resume") {
    try {
      return res.status(200).json({ replacements: await loadContinuation(), order: { ...currentData, id: orderId } });
    } catch (error) {
      return res.status(503).json({ error: error instanceof Error ? error.message : "Substitui\xE7\xE3o fiscal indispon\xEDvel." });
    }
  }
  const proposedOrderData = projectOrderDataForFiscalEdit(currentData, submitted);
  if (action === "audit" && !hasPotentialFiscalOrderEdit(currentData, proposedOrderData))
    return res.status(200).json({
      status: "unchanged",
      orderUpdatedAt: order.updated_at,
      changes: [],
      documents: []
    });
  const { data: fiscalRows, error: fiscalError } = await db.from("nfe_documents").select(
    "id,order_id,emission_request_id,document_type,status,ambiente,modelo,numero_nfe,serie,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,created_at"
  ).eq("order_id", orderId).eq("document_type", "outbound").in("modelo", ["55", "65"]).order("created_at", { ascending: false });
  if (fiscalError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar as notas autorizadas." });
  const pending = (fiscalRows || []).find(
    (row) => ["processando", "pendente", "unknown", "transmitting"].includes(String(row.status || "").toLowerCase())
  );
  if (pending)
    return res.status(409).json({
      status: "blocked",
      error: "Existe uma tentativa fiscal sem resultado confirmado. Consulte a SEFAZ antes de editar os dados fiscais do pedido."
    });
  const { data: replaced, error: replacedError } = await db.from("nfe_order_edit_replacements").select("original_document_id,status,request_id,original_order_data").eq("order_id", orderId);
  if (replacedError) return res.status(503).json({ error: "O registro de substitui\xE7\xE3o fiscal est\xE1 indispon\xEDvel." });
  if (replaced?.some((row) => row.status !== "completed")) {
    if (action === "confirm" && replaced.some((row) => row.request_id === req.body?.requestId)) {
      const original = replaced.find((row) => row.request_id === req.body.requestId).original_order_data;
      const retryData = projectOrderDataForFiscalEdit(original, submitted);
      const payload = buildOrderPersistencePayload({ ...retryData, id: orderId });
      const { error } = await db.rpc("commit_fiscal_order_edit", {
        p_request_id: req.body.requestId,
        p_order_id: orderId,
        p_expected_updated_at: req.body.orderUpdatedAt,
        p_order_payload: payload,
        p_items: retryData.items || [],
        p_payments: retryData.payments || [],
        p_plans: req.body.plans,
        p_actor_id: fiscalOperatorId
      });
      if (error) return res.status(409).json({ error: "A confirma\xE7\xE3o j\xE1 registrada n\xE3o corresponde a esta edi\xE7\xE3o." });
      return res.status(200).json({ success: true, replacements: await loadContinuation(), order: { ...currentData, id: orderId } });
    }
    return res.status(409).json({ status: "blocked", error: "Existe uma substitui\xE7\xE3o fiscal pendente. Conclua a revers\xE3o e a nova emiss\xE3o antes de editar novamente." });
  }
  const authorizedDocuments = (fiscalRows || []).filter(
    (row) => ["autorizada", "homologada"].includes(String(row.status || "").toLowerCase()) && !replaced?.some((replacement) => replacement.original_document_id === row.id && replacement.status === "completed")
  );
  if (!authorizedDocuments.length)
    return res.status(200).json({
      status: "unchanged",
      orderUpdatedAt: order.updated_at,
      changes: [],
      documents: []
    });
  const documents = [];
  try {
    for (const document of authorizedDocuments) {
      const changes = await loadAuditedChanges(db, order, document, proposedOrderData);
      if (changes.length) {
        const policy = getOrderEditFiscalPolicy(order, document);
        if (policy.action !== "cancel" && policy.action !== "estorno")
          return res.status(409).json({ status: "blocked", error: policy.reason || "Esta nota exige revis\xE3o fiscal." });
        documents.push({
          id: document.id,
          model: String(document.modelo),
          environment: Number(document.ambiente),
          action: policy.action,
          changes
        });
      }
    }
  } catch (error) {
    return res.status(409).json({
      status: "blocked",
      error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel comprovar a integridade das notas autorizadas."
    });
  }
  if (action === "confirm") {
    if (!uuid.test(String(req.body?.requestId || "")) || !documents.length || req.body.orderUpdatedAt !== order.updated_at || proposedOrderData.status !== "scheduled" || JSON.stringify(req.body.plans) !== JSON.stringify(documents.map(({ id, action: reversal, environment }) => ({ id, action: reversal, environment }))))
      return res.status(409).json({ error: "O pedido ou a pol\xEDtica fiscal mudou. Confira novamente antes de confirmar." });
    if (documents.some((document) => document.environment === 1) && req.body.productionConfirmed !== true)
      return res.status(400).json({ error: "Confirme explicitamente a substitui\xE7\xE3o fiscal em Produ\xE7\xE3o." });
    const payload = buildOrderPersistencePayload({ ...proposedOrderData, id: orderId });
    const { data: result, error } = await db.rpc("commit_fiscal_order_edit", {
      p_request_id: req.body.requestId,
      p_order_id: orderId,
      p_expected_updated_at: order.updated_at,
      p_order_payload: payload,
      p_items: proposedOrderData.items || [],
      p_payments: proposedOrderData.payments || [],
      p_plans: req.body.plans,
      p_actor_id: fiscalOperatorId
    });
    if (error) return res.status(409).json({ error: "A edi\xE7\xE3o n\xE3o foi gravada. O pedido mudou ou algum efeito obrigat\xF3rio falhou; confira novamente." });
    return res.status(200).json({ success: true, replacements: await loadContinuation(), order: { ...result.order_data, id: orderId } });
  }
  return res.status(200).json({
    status: documents.length ? "confirmation_required" : "unchanged",
    orderUpdatedAt: order.updated_at,
    changes: documents.flatMap((document) => document.changes),
    documents
  });
}
//# sourceMappingURL=audit-order-edit.cjs.map
