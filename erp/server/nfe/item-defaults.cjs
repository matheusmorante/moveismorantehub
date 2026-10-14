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

// api/nfe/item-defaults.ts
var item_defaults_exports = {};
__export(item_defaults_exports, {
  default: () => handler
});
module.exports = __toCommonJS(item_defaults_exports);
var import_node_crypto = require("node:crypto");
var import_supabase_js = require("@supabase/supabase-js");

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
function addressUf(value) {
  let address = value;
  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch {
      return null;
    }
  }
  if (!address || typeof address !== "object") return null;
  const record2 = address;
  const rawUf = record2.state || record2.uf;
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
function determineSaleCfop(params) {
  const {
    destination,
    isOwnProduction,
    isSt,
    itemType = "product",
    catalogCfop,
    recipientIeIndicator,
    finalConsumer
  } = params;
  if (itemType === "service")
    throw new Error("Presta\xE7\xE3o de servi\xE7o exige uma matriz fiscal espec\xEDfica aprovada.");
  const catDef = getCfopDefinition(catalogCfop);
  const effectiveIsOwnProduction = isOwnProduction ?? catDef?.isOwnProduction ?? false;
  const effectiveIsSt = isSt ?? catDef?.isSt ?? false;
  if (effectiveIsSt || effectiveIsOwnProduction)
    throw new Error("Mercadoria com ST ou de produ\xE7\xE3o pr\xF3pria exige matriz fiscal espec\xEDfica aprovada.");
  if (destination === "2") {
    if (recipientIeIndicator === "9" || recipientIeIndicator === void 0 && finalConsumer === true && catDef?.code === "6108") {
      return "6108";
    }
    return "6102";
  }
  if (destination !== "1")
    throw new Error(`Determina\xE7\xE3o fiscal de CFOP para destino idDest=${destination} n\xE3o suportada.`);
  if (catDef && catDef.code !== "5102")
    throw new Error(`CFOP ${catDef.code} exige uma matriz fiscal espec\xEDfica aprovada.`);
  return "5102";
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

// shared-utils/fiscalIcmsGroups.ts
var CSOSN_CODES = ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"];

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

// api/nfe/item-defaults/resolvePreparedItems.ts
function resolvePreparedItems(params) {
  const {
    items,
    products,
    configuration,
    issuerCrt,
    destination,
    isInterstate,
    recipientIeIndicator,
    finalConsumer
  } = params;
  const productsById = new Map(products.map((product) => [product.id, product]));
  return items.map((item, index) => {
    const itemId = typeof item.productId === "string" ? item.productId : "";
    const product = productsById.get(itemId);
    const itemFiscal = item.fiscal && typeof item.fiscal === "object" && !Array.isArray(item.fiscal) ? item.fiscal : {};
    const catalogCst = product?.fiscal?.cst;
    const catalogCfop = product?.fiscal?.cfop;
    const savedCfop = typeof itemFiscal.cfop === "string" ? itemFiscal.cfop : void 0;
    const sourceCfop = savedCfop || (typeof catalogCfop === "string" ? catalogCfop : void 0);
    const sourceDefinition = getCfopDefinition(sourceCfop || "");
    if (sourceCfop && !sourceDefinition)
      throw new Error(
        `CFOP ${sourceCfop} n\xE3o classificado; revise a origem fiscal antes de preparar os itens.`
      );
    if (sourceDefinition && sourceDefinition.operationType !== "sale")
      throw new Error(
        `CFOP ${sourceCfop} exige tratamento fiscal espec\xEDfico e n\xE3o pode ser convertido em venda padr\xE3o.`
      );
    let cfop;
    let cfopSource;
    try {
      cfop = determineSaleCfop({
        destination,
        itemType: "product",
        isSt: catalogCst === "500" || itemFiscal.cst === "500" || itemFiscal.hasSt === true || itemFiscal.isSt === true || sourceDefinition?.stApplicability === "required",
        isOwnProduction: itemFiscal.isOwnProduction === true || itemFiscal.merchandiseOrigin === "own_production" || sourceDefinition?.merchandiseOrigin === "own_production",
        recipientIeIndicator,
        finalConsumer
      });
      cfopSource = isInterstate ? "INTERSTATE_RULE" : "INTERNAL_RULE";
    } catch {
      cfop = void 0;
      cfopSource = void 0;
    }
    return {
      itemNumber: index + 1,
      ...resolveItemCsosn({
        configuration,
        environment: 2,
        issuerCrt,
        catalog: typeof itemFiscal.cst === "string" ? itemFiscal.cst : typeof catalogCst === "string" ? catalogCst : void 0
      }),
      ...cfop ? { cfop, cfopSource } : {},
      ...typeof itemFiscal.commercialUnit === "string" || typeof product?.unit === "string" ? { commercialUnit: String(itemFiscal.commercialUnit || product?.unit) } : {},
      ...typeof itemFiscal.taxableUnit === "string" || typeof itemFiscal.commercialUnit === "string" || typeof product?.unit === "string" ? { taxableUnit: String(itemFiscal.taxableUnit || itemFiscal.commercialUnit || product?.unit) } : {}
    };
  });
}

// shared-utils/fiscalIdentifiers.ts
function normalizeFiscalIdentifier(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
}

// api/nfe/responsibleTechnician.ts
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

// shared-utils/orderItemFiscalSnapshot.ts
var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : void 0;
function hasFiscalItemSnapshot(item) {
  const itemRecord = record(item);
  const version = itemRecord.fiscalSnapshotVersion;
  const fiscal = record(itemRecord.fiscal);
  return typeof version === "number" && Number.isInteger(version) && version > 0 && Boolean(nonEmptyString(fiscal.commercialUnit)) && Boolean(nonEmptyString(fiscal.taxableUnit));
}

// api/nfe/item-defaults.ts
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method || ""))
    return res.status(405).json({ success: false, error: "M\xE9todo inv\xE1lido." });
  const supabaseSecret = getSupabaseSecretKey();
  if (!supabaseSecret)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co",
    supabaseSecret
  );
  const auth = await authorizeFiscalOperator(db, req.headers.authorization);
  if (auth.ok === false)
    return res.status(auth.status).json({ success: false, error: auth.message });
  try {
    const configuration = await loadHmlCsosnConfiguration(db);
    if (req.method === "GET")
      return res.status(200).json({
        success: true,
        configuration,
        readiness: {
          environment: 2,
          configurationIssues: [
            ...getResponsibleTechnicianConfigurationIssues(process.env, 2),
            ...!process.env.NFE_CERTIFICATE_BASE64 ? ["certificate.base64"] : []
          ]
        }
      });
    const body = req.body;
    if (body?.environment !== 2)
      return res.status(422).json({ success: false, error: "Esta configura\xE7\xE3o aplica-se somente \xE0 homologa\xE7\xE3o." });
    if (req.method === "PATCH") {
      const { data: profile, error: profileError } = await db.from("profiles").select("role,roles").eq("id", auth.userId).maybeSingle();
      if (profileError) throw new Error("N\xE3o foi poss\xEDvel validar a permiss\xE3o de configura\xE7\xE3o.");
      if (profile?.role !== "administrator" && !profile?.roles?.includes("administrator"))
        return res.status(403).json({
          success: false,
          error: "Somente administradores alteram configura\xE7\xF5es fiscais."
        });
      if (Object.keys(body).some((key) => !["environment", "csosn"].includes(key)))
        throw new Error("Campos de configura\xE7\xE3o inv\xE1lidos.");
      const updated = parseHmlCsosnConfiguration({
        ...configuration,
        csosn: validateCsosn(body.csosn, configuration.issuerCrt),
        version: (0, import_node_crypto.randomUUID)()
      });
      const { error: error2 } = await db.from("settings").upsert({
        id: HML_CSOSN_SETTINGS_ID,
        data: { ...updated, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), updatedBy: auth.userId }
      });
      if (error2)
        return res.status(503).json({ success: false, error: "O padr\xE3o CSOSN n\xE3o foi salvo." });
      return res.status(200).json({ success: true, configuration: updated });
    }
    if (typeof body.orderId !== "string" || !body.orderId || Object.keys(body).some((key) => !["orderId", "environment"].includes(key)))
      throw new Error("Pedido inv\xE1lido para prepara\xE7\xE3o fiscal.");
    const { data: order, error } = await db.from("orders").select("order_data").eq("id", body.orderId).maybeSingle();
    if (error) throw new Error("N\xE3o foi poss\xEDvel ler os itens do pedido.");
    if (!order) return res.status(404).json({ success: false, error: "Pedido n\xE3o encontrado." });
    const { data: app, error: appError } = await db.from("settings").select("data").eq("id", "app").maybeSingle();
    if (appError || !app?.data) throw new Error("Configura\xE7\xE3o do emitente indispon\xEDvel.");
    const items = order.order_data?.items?.filter(
      (item) => item.itemType !== "service"
    ) || [];
    if (items.length > 990) throw new Error("Pedido excede o limite de itens da NF-e.");
    const productIds = Array.from(
      new Set(
        items.flatMap(
          (item) => !hasFiscalItemSnapshot(item) && typeof (item.productId || item.fiscalSnapshotProductId) === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            String(item.productId || item.fiscalSnapshotProductId)
          ) ? [String(item.productId || item.fiscalSnapshotProductId)] : []
        )
      )
    );
    const products = productIds.length ? await db.from("products").select("id,fiscal,unit").in("id", productIds) : { data: [], error: null };
    if (products.error)
      throw new Error(
        `N\xE3o foi poss\xEDvel conferir exce\xE7\xF5es fiscais do cadastro: ${products.error.message}`
      );
    const shipping = order.order_data?.shipping || {};
    const customerData = order.order_data?.customerData || {};
    const operationScope = resolveFiscalCfopOrderScope({
      issuerUf: typeof app.data.companyUF === "string" && app.data.companyUF.trim() ? app.data.companyUF : "PR",
      deliveryMethod: String(shipping.deliveryMethod || "pickup"),
      shipping,
      customerAddress: customerData.fullAddress || customerData.address
    });
    if (operationScope.destination === null)
      throw new Error(operationScope.reason || "Local f\xEDsico da opera\xE7\xE3o fiscal n\xE3o identificado.");
    if (operationScope.scope === "foreign")
      throw new Error("Opera\xE7\xE3o com exterior exige matriz fiscal espec\xEDfica aprovada.");
    const destination = operationScope.destination;
    const isInterstate = operationScope.scope === "interstate";
    const fiscalContext = order.order_data?.fiscalContext || {};
    const resolved = resolvePreparedItems({
      items,
      products: products.data || [],
      configuration,
      issuerCrt: String(app.data.companyCRT || ""),
      destination,
      isInterstate,
      recipientIeIndicator: String(
        customerData.ieIndicator || fiscalContext.recipientIeIndicator || ""
      ),
      finalConsumer: typeof fiscalContext.finalConsumer === "boolean" ? fiscalContext.finalConsumer : void 0
    });
    return res.status(200).json({ success: true, configuration, items: resolved });
  } catch (error) {
    console.error("ITEM DEFAULTS ERROR:", error);
    return res.status(422).json({
      success: false,
      error: error instanceof Error ? error.message : "Prepara\xE7\xE3o fiscal inv\xE1lida."
    });
  }
}
//# sourceMappingURL=item-defaults.cjs.map
