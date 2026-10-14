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

// api/nfe/automatic-return-transmission-worker.ts
var automatic_return_transmission_worker_exports = {};
__export(automatic_return_transmission_worker_exports, {
  default: () => handler
});
module.exports = __toCommonJS(automatic_return_transmission_worker_exports);
var import_supabase_js = require("@supabase/supabase-js");

// erp/src/pages/utils/nfe/fiscalOperationReview.ts
var import_xmldom2 = require("@xmldom/xmldom");

// erp/src/pages/utils/nfe/fiscalOperationXml.ts
var import_xmldom = require("@xmldom/xmldom");

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

// erp/src/pages/utils/nfe/fiscalOperationXml.ts
var namespace = "http://www.portalfiscal.inf.br/nfe";
function parseBlock(xml, expected) {
  if (!xml || /<!DOCTYPE|<!ENTITY|<\?/i.test(xml)) throw new Error(`Bloco ${expected} inv\xE1lido.`);
  let parseError = "";
  const onParseError = (level, message) => {
    if (level === "warning" && message.includes("errorHandler") && message.includes("deprecated"))
      return;
    parseError ||= message;
  };
  const document = new import_xmldom.DOMParser({
    errorHandler: onParseError
  }).parseFromString(`<wrapper xmlns="${namespace}">${xml}</wrapper>`, "application/xml");
  if (parseError || !document?.documentElement)
    throw new Error(`Bloco ${expected} n\xE3o \xE9 XML v\xE1lido.`);
  const children = Array.from(document.documentElement.childNodes);
  const elements = children.filter((child) => child.nodeType === 1);
  if (elements.length !== 1 || children.some((child) => child.nodeType === 3 && child.textContent?.trim())) {
    throw new Error(`Bloco ${expected} deve conter apenas um elemento.`);
  }
  const element = elements[0];
  if (element.localName !== expected || element.namespaceURI && element.namespaceURI !== namespace) {
    throw new Error(`Esperado bloco ${expected}.`);
  }
  return element;
}
function blockXml(xml, expected) {
  return new import_xmldom.XMLSerializer().serializeToString(parseBlock(xml, expected));
}
function normalizeReviewedFiscalBlock(xml, expected) {
  return blockXml(xml, expected);
}

// erp/src/pages/utils/nfe/fiscalOperationReview.ts
var NFE_NAMESPACE = "http://www.portalfiscal.inf.br/nfe";
function parseElement(xml, expectedName) {
  if (!xml || /<!DOCTYPE|<!ENTITY|<\?/i.test(xml))
    throw new Error("Bloco fiscal original inv\xE1lido.");
  let error = "";
  const onParseError = (level, message) => {
    if (level === "warning" && message.includes("errorHandler") && message.includes("deprecated"))
      return;
    error ||= message;
  };
  const document = new import_xmldom2.DOMParser({
    errorHandler: onParseError
  }).parseFromString(xml, "application/xml");
  if (error || !document.documentElement || document.documentElement.localName !== expectedName || document.documentElement.namespaceURI && document.documentElement.namespaceURI !== NFE_NAMESPACE) {
    throw new Error(`Esperado XML v\xE1lido do bloco ${expectedName}.`);
  }
  return document.documentElement;
}
function findElement(root, name) {
  if (root.localName === name) return root;
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType !== 1) continue;
    const found = findElement(child, name);
    if (found) return found;
  }
  return null;
}
function updateText(root, name, value) {
  const element = findElement(root, name);
  if (!element) throw new Error(`O item fiscal original n\xE3o possui o campo ${name}.`);
  if (!element.ownerDocument) throw new Error("Bloco fiscal sem documento XML.");
  while (element.firstChild) element.removeChild(element.firstChild);
  element.appendChild(element.ownerDocument.createTextNode(value));
}
function proportionalValue(element, factor) {
  if (!element.ownerDocument) throw new Error("Bloco fiscal sem documento XML.");
  const original = element.textContent?.trim() || "";
  if (!/^\d+(?:\.\d+)?$/.test(original))
    throw new Error(`Valor fiscal inv\xE1lido em ${element.localName}.`);
  const decimals = original.split(".")[1]?.length || 0;
  const scale = 10 ** decimals;
  const value = Math.round(Number(original) * factor * scale) / scale;
  while (element.firstChild) element.removeChild(element.firstChild);
  element.appendChild(element.ownerDocument.createTextNode(value.toFixed(decimals)));
}
function buildReturnProductXml(input) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > input.originalQuantity || !Number.isFinite(input.originalQuantity) || input.originalQuantity <= 0 || !/^\d{4}$/.test(input.cfop))
    throw new Error("Quantidade ou CFOP de devolu\xE7\xE3o inv\xE1lido.");
  const product = parseElement(input.originalProductXml, "prod");
  const factor = input.quantity / input.originalQuantity;
  const originalTributaryQuantity = findElement(product, "qTrib");
  if (!originalTributaryQuantity)
    throw new Error("Item fiscal original sem quantidade tribut\xE1vel.");
  proportionalValue(originalTributaryQuantity, factor);
  updateText(product, "CFOP", input.cfop);
  updateText(product, "qCom", input.quantity.toFixed(4));
  updateText(product, "vProd", input.grossValue.toFixed(2));
  const discount = findElement(product, "vDesc");
  if (discount) updateText(product, "vDesc", input.discountValue.toFixed(2));
  for (const name of ["vFrete", "vSeg", "vOutro"]) {
    const value = findElement(product, name);
    if (value) proportionalValue(value, factor);
  }
  return normalizeReviewedFiscalBlock(new import_xmldom2.XMLSerializer().serializeToString(product), "prod");
}
function buildProportionalReturnTaxesXml(originalTaxesXml, quantity, originalQuantity) {
  if (!Number.isFinite(quantity) || !Number.isFinite(originalQuantity) || quantity <= 0 || originalQuantity <= 0 || quantity > originalQuantity) {
    throw new Error("Quantidade inv\xE1lida para c\xE1lculo proporcional dos tributos.");
  }
  const taxes = parseElement(originalTaxesXml, "imposto");
  const factor = quantity / originalQuantity;
  const scaleTags = (element) => {
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType !== 1) continue;
      const childElement = child;
      const childName = childElement.localName || "";
      const isNumericLeaf = !Array.from(childElement.childNodes).some(
        (node) => node.nodeType === 1
      );
      if (isNumericLeaf && (/^v/.test(childName) && !/^vAliqProd$/.test(childName) || /^q(?:BC|Selo)/.test(childName)))
        proportionalValue(childElement, factor);
      else scaleTags(childElement);
    }
  };
  scaleTags(taxes);
  return normalizeReviewedFiscalBlock(new import_xmldom2.XMLSerializer().serializeToString(taxes), "imposto");
}
function updateFiscalOperationTotalsXml(input) {
  const total = parseElement(input.originalTotalsXml, "total");
  const icmsTotal = findElement(total, "ICMSTot");
  if (!icmsTotal) throw new Error("NF-e original sem ICMSTot para revis\xE3o da devolu\xE7\xE3o.");
  const freight = input.freight || 0;
  const other = input.other || 0;
  updateText(icmsTotal, "vProd", input.grossTotal.toFixed(2));
  updateText(icmsTotal, "vDesc", input.discountTotal.toFixed(2));
  updateText(icmsTotal, "vFrete", freight.toFixed(2));
  updateText(icmsTotal, "vOutro", other.toFixed(2));
  updateText(
    icmsTotal,
    "vNF",
    (input.grossTotal - input.discountTotal + freight + other).toFixed(2)
  );
  return new import_xmldom2.XMLSerializer().serializeToString(total);
}

// erp/src/pages/App/FiscalDocuments/utils/fiscalOperationDraftReview.ts
function buildFiscalOperationDraftProductXml(line, cfop) {
  return buildReturnProductXml({
    originalProductXml: line.originalProductXml,
    quantity: Number(line.quantity),
    originalQuantity: Number(line.originalQuantity),
    grossValue: Number(line.gross_value),
    discountValue: Number(line.discount_value),
    cfop
  });
}
function buildFiscalOperationDraftReviewState(data) {
  let error = null;
  const reviewedLines = data.lines.map((line) => {
    const cfop = line.reviewed_cfop || line.suggestedCfop || "";
    let productXml = line.reviewed_product_xml || line.originalProductXml;
    if (cfop && !line.reviewed_product_xml) {
      try {
        productXml = buildFiscalOperationDraftProductXml(line, cfop);
      } catch (cause) {
        error = cause instanceof Error ? cause.message : "N\xE3o foi poss\xEDvel preparar o item fiscal.";
      }
    }
    let taxesXml = line.reviewed_taxes_xml || line.originalTaxesXml;
    try {
      if (!line.reviewed_taxes_xml) {
        taxesXml = buildProportionalReturnTaxesXml(
          line.originalTaxesXml,
          Number(line.quantity),
          Number(line.originalQuantity)
        );
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Tributos do item requerem revis\xE3o manual.";
    }
    return { draft_line_id: line.id, cfop, product_xml: productXml, taxes_xml: taxesXml };
  });
  let totalsXml = data.reviewTemplate.totals_xml;
  try {
    totalsXml = updateFiscalOperationTotalsXml({
      originalTotalsXml: totalsXml,
      grossTotal: data.lines.reduce((sum, line) => sum + Number(line.gross_value), 0),
      discountTotal: data.lines.reduce((sum, line) => sum + Number(line.discount_value), 0)
    });
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Totais fiscais precisam de revis\xE3o manual.";
  }
  const savedReview = data.draft.review_data || {};
  const review = {
    nature_of_operation: data.draft.nature_of_operation || savedReview.nature_of_operation || (data.draft.operation_kind === "estorno" ? "Nota Fiscal de Estorno" : "Devolu\xE7\xE3o de mercadoria"),
    reason: savedReview.reason || data.draft.reason || "",
    recipient_xml: savedReview.recipient_xml || data.reviewTemplate.recipient_xml,
    totals_xml: savedReview.totals_xml || totalsXml,
    transport_xml: savedReview.transport_xml || data.reviewTemplate.transport_xml,
    payment_xml: savedReview.payment_xml || data.reviewTemplate.payment_xml,
    item_taxes_confirmed: savedReview.item_taxes_confirmed === true,
    totals_confirmed: savedReview.totals_confirmed === true,
    apportionment_review_confirmed: savedReview.apportionment_review_confirmed === true,
    period_adjustment_text: savedReview.period_adjustment_text || ""
  };
  let notice;
  if (data.draft.status === "rejected") {
    const sefazMessage = data.lastSefazResult?.xMotivo || "Revise os dados e consulte a rejei\xE7\xE3o fiscal.";
    error = "SEFAZ rejeitou esta tentativa" + (data.lastSefazResult?.cStat ? " (cStat " + data.lastSefazResult.cStat + ")" : "") + ": " + sefazMessage;
    notice = "Esta tentativa rejeitada \xE9 somente leitura; \xE9 necess\xE1rio criar uma nova tentativa fiscal ap\xF3s corrigir os dados.";
  } else if (["transmitting", "unknown"].includes(data.draft.status)) {
    notice = "H\xE1 uma transmiss\xE3o sem confirma\xE7\xE3o final. Consulte a SEFAZ para reconciliar; o sistema n\xE3o retransmitir\xE1 automaticamente.";
  } else {
    notice = data.draft.status === "authorized" ? "Esta opera\xE7\xE3o j\xE1 foi autorizada pela SEFAZ." : "Rascunho carregado. Revise CFOP, tributos e totais antes de salvar.";
  }
  return { reviewedLines, review, error, notice };
}

// api/nfe/automaticReturnFiscalWorker.ts
var AutomaticReturnFiscalApiError = class extends Error {
  constructor(errorCode, retryable) {
    super(errorCode);
    this.errorCode = errorCode;
    this.retryable = retryable;
    this.name = "AutomaticReturnFiscalApiError";
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isReturnFiscalEligibility(value) {
  return isRecord(value) && typeof value.eligible === "boolean" && typeof value.hasAuthorizedOriginal === "boolean" && Array.isArray(value.sources);
}
async function transmitDraft(request, draftId, environment) {
  const result = await request("/api/nfe/transmit-operation-draft", "POST", {
    draftId,
    productionConfirmed: environment === 1
  });
  if (result.success === true && result.status === "authorized") return "authorized";
  if (result.pending === true || result.reconciliationRequired === true || result.retryAllowed === true) {
    return "reconciling";
  }
  return "blocked";
}
async function processAutomaticReturnFiscalJob(returnOrderId, request, buildReviewState = buildFiscalOperationDraftReviewState) {
  try {
    const rawEligibility = await request(
      "/api/nfe/return-fiscal-eligibility?returnOrderId=" + encodeURIComponent(returnOrderId),
      "GET"
    );
    if (!isReturnFiscalEligibility(rawEligibility)) {
      return { status: "retryable", errorCode: "eligibility_response_invalid" };
    }
    if (!rawEligibility.hasAuthorizedOriginal) {
      return { status: "not_required", errorCode: null };
    }
    if (!rawEligibility.eligible || rawEligibility.sources.length === 0) {
      return { status: "blocked", errorCode: "fiscal_eligibility_blocked" };
    }
    let hasPendingTransmission = false;
    for (const sourceResult of rawEligibility.sources) {
      if (sourceResult.state === "authorized") continue;
      if (!["ready", "draft", "pending"].includes(sourceResult.state)) {
        return { status: "blocked", errorCode: "fiscal_source_blocked" };
      }
      const source = sourceResult.source;
      if (!source?.id || ![1, 2].includes(Number(source.ambiente))) {
        return { status: "blocked", errorCode: "fiscal_source_invalid" };
      }
      let draftId = sourceResult.draftId || null;
      if (!draftId) {
        if (sourceResult.state === "pending") {
          hasPendingTransmission = true;
          continue;
        }
        if (sourceResult.state !== "ready") {
          return { status: "blocked", errorCode: "fiscal_draft_missing" };
        }
        const created = await request("/api/nfe/operation-drafts", "POST", {
          kind: "return",
          originalDocumentId: source.id,
          returnOrderId,
          environment: source.ambiente
        });
        draftId = typeof created.draftId === "string" ? created.draftId : null;
        if (!draftId) return { status: "retryable", errorCode: "fiscal_draft_create_unconfirmed" };
      }
      const draftPayload = await request(
        "/api/nfe/operation-drafts?id=" + encodeURIComponent(draftId),
        "GET"
      );
      const draft = draftPayload.draft;
      const loadedSource = draftPayload.source;
      const returnOrder = draftPayload.returnOrder;
      if (!isRecord(draft) || !isRecord(loadedSource) || !isRecord(returnOrder) || draft.operation_kind !== "return" || draft.return_order_id !== returnOrderId || loadedSource.id !== source.id || Number(draft.environment) !== Number(source.ambiente) || Number(loadedSource.ambiente) !== Number(source.ambiente) || returnOrder.id !== returnOrderId) {
        return { status: "blocked", errorCode: "fiscal_draft_link_mismatch" };
      }
      if (draft.status === "authorized") continue;
      if (sourceResult.state === "pending" && !["transmitting", "unknown"].includes(String(draft.status))) {
        return { status: "blocked", errorCode: "fiscal_pending_draft_state_mismatch" };
      }
      if (draft.status === "transmitting" || draft.status === "unknown") {
        const reconciliation = await transmitDraft(request, draftId, Number(source.ambiente));
        if (reconciliation === "blocked") {
          return { status: "blocked", errorCode: "fiscal_transmission_blocked" };
        }
        hasPendingTransmission ||= reconciliation === "reconciling";
        continue;
      }
      if (draft.status === "ready") {
        const readyResult = await transmitDraft(request, draftId, Number(source.ambiente));
        if (readyResult === "blocked") {
          return { status: "blocked", errorCode: "fiscal_transmission_blocked" };
        }
        hasPendingTransmission ||= readyResult === "reconciling";
        continue;
      }
      if (draft.status !== "draft") {
        return { status: "blocked", errorCode: "fiscal_draft_not_reviewable" };
      }
      const review = buildReviewState(draftPayload);
      const hasInvalidCfop = review.reviewedLines.some((line, index) => {
        const draftLine = draftPayload.lines?.[index];
        const allowedCfops = draftLine?.allowedCfops;
        return !/^\d{4}$/.test(line.cfop) || Array.isArray(allowedCfops) && !allowedCfops.some(
          (option) => isRecord(option) && option.value === line.cfop
        );
      });
      if (review.error || !review.reviewedLines.length || hasInvalidCfop) {
        return { status: "blocked", errorCode: "fiscal_review_required" };
      }
      await request("/api/nfe/operation-drafts", "PUT", {
        draftId,
        reviewData: review.review,
        lines: review.reviewedLines
      });
      const transmission = await transmitDraft(request, draftId, Number(source.ambiente));
      if (transmission === "blocked") {
        return { status: "blocked", errorCode: "fiscal_transmission_blocked" };
      }
      hasPendingTransmission ||= transmission === "reconciling";
    }
    return hasPendingTransmission ? { status: "reconciling", errorCode: "sefaz_reconciliation_pending" } : { status: "authorized", errorCode: null };
  } catch (error) {
    if (error instanceof AutomaticReturnFiscalApiError) {
      return {
        status: error.retryable ? "retryable" : "blocked",
        errorCode: error.errorCode
      };
    }
    return { status: "retryable", errorCode: "automatic_return_worker_error" };
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

// api/nfe/automatic-return-transmission-worker.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
function resolveInternalBaseUrl() {
  const configured = process.env.NFE_RETURN_AUTO_API_BASE_URL;
  const candidate = configured || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
function retryAt(status, attemptCount) {
  if (status !== "retryable" && status !== "reconciling") return null;
  const delayMinutes = status === "reconciling" ? 1 : Math.min(60, 2 ** Math.min(Math.max(attemptCount, 1), 6));
  return new Date(Date.now() + delayMinutes * 6e4).toISOString();
}
async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  if (!isAutomaticReturnWorkerAuthorized(req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER])) {
    return res.status(401).json({ error: "Autentica\xE7\xE3o do worker fiscal necess\xE1ria." });
  }
  if (!supabaseUrl || !serviceKey || !process.env.NFE_RETURN_AUTO_WORKER_SECRET) {
    return res.status(503).json({ error: "Worker fiscal indispon\xEDvel." });
  }
  const baseUrl = resolveInternalBaseUrl();
  if (!baseUrl) return res.status(503).json({ error: "Origem interna do worker n\xE3o configurada." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const { data: jobs, error: claimError } = await db.rpc("claim_return_fiscal_emission_job");
  if (claimError) return res.status(503).json({ error: "N\xE3o foi poss\xEDvel reservar uma devolu\xE7\xE3o." });
  const job = Array.isArray(jobs) ? jobs[0] : null;
  if (!job) return res.status(200).json({ processed: 0 });
  const requestFiscalApi = async (path2, method, body) => {
    let response;
    try {
      response = await fetch(new URL(path2, baseUrl), {
        method,
        headers: {
          "Content-Type": "application/json",
          [AUTOMATIC_RETURN_WORKER_SECRET_HEADER]: process.env.NFE_RETURN_AUTO_WORKER_SECRET || ""
        },
        ...body ? { body: JSON.stringify(body) } : {}
      });
    } catch {
      throw new AutomaticReturnFiscalApiError("fiscal_api_unreachable", true);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new AutomaticReturnFiscalApiError("fiscal_api_response_invalid", response.status >= 500);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AutomaticReturnFiscalApiError("fiscal_api_response_invalid", response.status >= 500);
    }
    const result2 = payload;
    const isRecoverable = result2.pending === true || result2.retryAllowed === true || result2.reconciliationRequired === true;
    if (!response.ok && !isRecoverable) {
      throw new AutomaticReturnFiscalApiError(
        response.status >= 500 || response.status === 429 ? "fiscal_api_unavailable" : "fiscal_api_rejected",
        response.status >= 500 || response.status === 429
      );
    }
    return result2;
  };
  const result = await processAutomaticReturnFiscalJob(
    String(job.return_order_id || ""),
    requestFiscalApi
  );
  const { data: finished, error: finishError } = await db.rpc("complete_return_fiscal_emission_job", {
    p_job_id: job.job_id,
    p_lease_token: job.lease_token,
    p_status: result.status,
    p_error_code: result.errorCode,
    p_next_attempt_at: retryAt(result.status, Number(job.attempt_count || 1))
  });
  if (finishError || finished !== true) {
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel registrar o resultado fiscal." });
  }
  return res.status(200).json({ processed: 1, outcome: result.status });
}
//# sourceMappingURL=automatic-return-transmission-worker.cjs.map
