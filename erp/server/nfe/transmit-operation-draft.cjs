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

// api/nfe/transmit-operation-draft.ts
var transmit_operation_draft_exports = {};
__export(transmit_operation_draft_exports, {
  default: () => handler
});
module.exports = __toCommonJS(transmit_operation_draft_exports);
var import_supabase_js = require("@supabase/supabase-js");

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

// erp/src/pages/utils/nfe/fiscalOperationXml.ts
var import_xmldom = require("@xmldom/xmldom");

// erp/src/pages/utils/nfe/xml/xmlEmitterBlock.ts
function escapeXml(unsafe = "") {
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function buildIdeXml(p) {
  if (!/^\d{7}$/.test(String(p.municipalityCode || "")))
    throw new Error("C\xF3digo IBGE do munic\xEDpio do fato gerador n\xE3o configurado ou inv\xE1lido.");
  if (p.referencedAccessKey && (p.finalidade !== 3 || !ACCESS_KEY_PATTERN.test(p.referencedAccessKey))) {
    throw new Error(
      "Refer\xEAncia de cabe\xE7alho permitida apenas para estorno com chave fiscal v\xE1lida."
    );
  }
  return `
    <ide>
      <cUF>41</cUF>
      <cNF>${p.randomCode}</cNF>
      <natOp>${escapeXml(p.natureOfOperation || "VENDA MERCADORIA")}</natOp>
      <mod>${p.model}</mod>
      <serie>${parseInt(p.series, 10)}</serie>
      <nNF>${p.nfeNumber}</nNF>
      <dhEmi>${p.dhEmi}</dhEmi>
      <tpNF>${p.operationType ?? 1}</tpNF>
      <idDest>${p.destinationIndicator ?? 1}</idDest>
      <cMunFG>${p.municipalityCode}</cMunFG>
      <tpImp>${p.model === "65" ? 4 : 1}</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${p.checkDigit}</cDV>
      <tpAmb>${p.environment}</tpAmb>
      <finNFe>${p.finalidade ?? 1}</finNFe>
      <indFinal>${p.finalConsumer ?? 1}</indFinal>
      <indPres>${p.presenceIndicator ?? 1}</indPres>
      <procEmi>0</procEmi>
      <verProc>MoranteHub_1.0</verProc>
      ${p.referencedAccessKey ? `<NFref><refNFe>${p.referencedAccessKey}</refNFe></NFref>` : ""}
    </ide>`;
}
function buildEmitXml(settings) {
  const emitCMun = String(settings.companyCMun || "");
  if (!/^\d{7}$/.test(emitCMun))
    throw new Error("C\xF3digo IBGE do munic\xEDpio do emitente n\xE3o configurado ou inv\xE1lido.");
  const emitCnpj = normalizeFiscalIdentifier(settings.companyCnpj);
  const emitName = settings.companyName || "MOVEIS MORANTE LTDA";
  if (!isValidCnpj(emitCnpj)) throw new Error("CNPJ do emitente inv\xE1lido.");
  const emitIE = (settings.companyIE || "ISENTO").replace(/[^\w]/g, "");
  const emitCRT = settings.companyCRT || "1";
  const emitCep = (settings.companyCEP || "80000000").replace(/\D/g, "");
  const emitBairro = settings.companyBairro || "Centro";
  const emitMun = settings.companyXMun || "Curitiba";
  const emitUF = settings.companyUF || "PR";
  const emitLogr = settings.companyLogradouro || settings.companyAddress || "Rua Principal";
  const emitNum = settings.companyNumero || "100";
  return `
    <emit>
      <CNPJ>${emitCnpj}</CNPJ>
      <xNome>${escapeXml(emitName)}</xNome>
      <xFant>${escapeXml(settings.companyName || "MOVEIS MORANTE")}</xFant>
      <enderEmit>
        <xLgr>${escapeXml(emitLogr)}</xLgr>
        <nro>${escapeXml(emitNum)}</nro>
        <xBairro>${escapeXml(emitBairro)}</xBairro>
        <cMun>${emitCMun}</cMun>
        <xMun>${escapeXml(emitMun)}</xMun>
        <UF>${emitUF}</UF>
        <CEP>${emitCep}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderEmit>
      <IE>${emitIE}</IE>
      <CRT>${emitCRT}</CRT>
    </emit>`;
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
function getCfopDefinition(code) {
  if (!code) return void 0;
  const normalized = String(code).replace(/\D/g, "");
  return CFOP_BY_CODE.get(normalized);
}

// shared-utils/fiscal-cfop-model/options.ts
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
function getFiscalFormXmlDefaults(rules) {
  if (rules.context !== "return") return null;
  if (rules.availability !== "READY") return null;
  const natureOfOperation = rules.natureOptions[0]?.value || "";
  const tPag = String(rules.fixedValues.tPag || "");
  const vPag = String(rules.fixedValues.vPag || "");
  const modFrete = String(rules.fixedValues.modFrete || "");
  if (!natureOfOperation || !tPag || !vPag || !modFrete || !rules.allowedTransportModes.length) {
    return null;
  }
  return {
    natureOfOperation,
    paymentXml: `<pag><detPag><tPag>${tPag}</tPag><vPag>${vPag}</vPag></detPag></pag>`,
    transportXml: `<transp><modFrete>${modFrete}</modFrete></transp>`
  };
}
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
var OUTBOUND_TO_ESTORNO_INBOUND_CFOP_MAP = {
  // Operações internas (5xxx -> 1949): Estorno de venda/saída conforme art. 298 RICMS/PR
  "5101": "1949",
  "5102": "1949",
  "5104": "1949",
  "5403": "1949",
  "5405": "1949",
  "5152": "1949",
  "5910": "1949",
  "5912": "1949",
  "5914": "1949",
  "5915": "1949",
  "5949": "1949",
  // Operações interestaduais (6xxx -> 2949): Estorno de saída interestadual
  "6101": "2949",
  "6102": "2949",
  "6107": "2949",
  "6108": "2949",
  "6403": "2949",
  "6404": "2949",
  "6152": "2949",
  "6910": "2949",
  "6912": "2949",
  "6914": "2949",
  "6915": "2949",
  "6949": "2949"
};
var ESTORNO_FALLBACK_CFOPS = ["5949", "6949", "7949"];
function normalizeCfop(value) {
  const code = String(value || "").replace(/\D/g, "");
  return /^\d{4}$/.test(code) ? code : null;
}
function originalItemCfop(productXml) {
  return normalizeCfop(productXml.match(/<(?:\w+:)?CFOP>(\d{4})<\/(?:\w+:)?CFOP>/i)?.[1]);
}
function suggestEstornoCfop(originalCfop, config) {
  if (!originalCfop || !/^[56]\d{3}$/.test(originalCfop)) return null;
  const requiredEntryPrefix = originalCfop[0] === "5" ? "1" : "2";
  const configured = config?.inverseCfopMappings?.[originalCfop];
  if (configured !== void 0) {
    const normalized = normalizeCfop(configured);
    return normalized?.startsWith(requiredEntryPrefix) ? normalized : null;
  }
  const canonical = OUTBOUND_TO_ESTORNO_INBOUND_CFOP_MAP[originalCfop];
  if (canonical?.startsWith(requiredEntryPrefix)) return canonical;
  return null;
}
function getEstornoCfopOptions(originalCfop, config) {
  const inverse = suggestEstornoCfop(originalCfop, config);
  if (inverse) {
    return [
      {
        value: inverse,
        label: `${inverse.slice(0, 1)}.${inverse.slice(1)} \xB7 Estorno fiscal (art. 298)`
      }
    ];
  }
  return [];
}

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
  const children2 = Array.from(document.documentElement.childNodes);
  const elements = children2.filter((child2) => child2.nodeType === 1);
  if (elements.length !== 1 || children2.some((child2) => child2.nodeType === 3 && child2.textContent?.trim())) {
    throw new Error(`Bloco ${expected} deve conter apenas um elemento.`);
  }
  const element = elements[0];
  if (element.localName !== expected || element.namespaceURI && element.namespaceURI !== namespace) {
    throw new Error(`Esperado bloco ${expected}.`);
  }
  return element;
}
function directText(element, name) {
  const child2 = Array.from(element.childNodes).find(
    (node) => node.nodeType === 1 && node.localName === name
  );
  return child2?.textContent?.trim() || "";
}
function decimal(value, field) {
  if (!/^\d{1,13}(?:\.\d{1,4})?$/.test(value))
    throw new Error(`${field} inv\xE1lido na revis\xE3o fiscal.`);
  return Number(value);
}
function assertMoney(actual, expected, field) {
  if (!Number.isFinite(expected) || expected < 0 || Math.abs(actual - expected) > 5e-3) {
    throw new Error(`${field} diverge das quantidades e valores conferidos.`);
  }
}
function assertQuantity(actual, expected, field) {
  if (!Number.isFinite(expected) || expected <= 0 || Math.abs(actual - expected) > 5e-5) {
    throw new Error(`${field} diverge da quantidade conferida.`);
  }
}
function blockXml(xml, expected) {
  return new import_xmldom.XMLSerializer().serializeToString(parseBlock(xml, expected));
}
function normalizeReviewedFiscalBlock(xml, expected) {
  return blockXml(xml, expected);
}
function buildReviewedFiscalOperationXml(input) {
  const expectedStatus = input.environment === 1 ? "autorizada" : "homologada";
  if (input.originalEnvironment !== input.environment || input.originalStatus !== expectedStatus || !/^\d{15}$/.test(input.originalProtocol || "") || !ACCESS_KEY_PATTERN.test(input.originalAccessKey) || calculateMod11CheckDigit(input.originalAccessKey.slice(0, 43)) !== Number(input.originalAccessKey[43])) {
    throw new Error("NF-e original n\xE3o autorizada e protocolada no ambiente selecionado.");
  }
  if (!ACCESS_KEY_PATTERN.test(input.accessKey) || !/^\d{8}$/.test(input.randomCode) || calculateMod11CheckDigit(input.accessKey.slice(0, 43)) !== Number(input.accessKey[43]) || input.accessKey.slice(20, 22) !== "55" || input.accessKey.slice(35, 43) !== input.randomCode || input.accessKey[34] !== "1" || input.checkDigit !== Number(input.accessKey[43]) || !Number.isInteger(input.nfeNumber) || input.nfeNumber <= 0 || input.accessKey.slice(25, 34) !== String(input.nfeNumber).padStart(9, "0") || input.accessKey.slice(22, 25) !== String(Number(input.series)).padStart(3, "0")) {
    throw new Error("Chave, s\xE9rie ou n\xFAmero da NF-e revisada s\xE3o inconsistentes.");
  }
  const issuedAt = new Date(input.issuedAt);
  if (!Number.isFinite(issuedAt.valueOf()) || !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}/.test(input.issuedAt) || input.accessKey.slice(2, 6) !== `${input.issuedAt.slice(2, 4)}${input.issuedAt.slice(5, 7)}`) {
    throw new Error("Data de emiss\xE3o incompat\xEDvel com a chave fiscal.");
  }
  const settings = input.settings;
  const cnpj = normalizeFiscalIdentifier(String(settings.companyCnpj || ""));
  if (cnpj.length !== 14 || input.accessKey.slice(6, 20) !== cnpj || input.originalAccessKey.slice(6, 20) !== cnpj || !String(settings.companyName || "").trim() || !String(settings.companyIE || "").trim() || !/^\d{8}$/.test(String(settings.companyCEP || "").replace(/\D/g, "")) || !/^\d{7}$/.test(String(settings.companyCMun || "")) || settings.companyUF !== "PR" || !String(settings.companyLogradouro || "").trim() || !String(settings.companyNumero || "").trim() || !String(settings.companyBairro || "").trim() || !String(settings.companyXMun || "").trim()) {
    throw new Error("Cadastro fiscal do emitente incompleto ou diferente da chave de acesso.");
  }
  if (!input.natureOfOperation?.trim() || input.natureOfOperation.length > 60) {
    throw new Error("Natureza da opera\xE7\xE3o fiscal deve ser conferida.");
  }
  if (input.kind === "estorno" && (input.natureOfOperation !== ESTORNO_NATURE_OF_OPERATION || ![1, 2, 3].includes(Number(input.destinationIndicator)) || ![0, 1].includes(Number(input.originalOperationType)))) {
    throw new Error("Estorno requer natureza, tpNF e indicador de destino fiscal da nota original.");
  }
  if (input.kind === "estorno" && (!input.reason || input.reason.trim().length < 15)) {
    throw new Error("Estorno requer justificativa espec\xEDfica.");
  }
  if (input.kind === "estorno" && Array.from(String(input.periodAdjustmentText || "")).length > 1200) {
    throw new Error("A revis\xE3o de diferen\xE7as e acr\xE9scimos excede o limite fiscal.");
  }
  if (!input.lines.length || input.lines.length > 990)
    throw new Error("Opera\xE7\xE3o fiscal sem itens conferidos.");
  const recipient = parseBlock(input.recipientXml, "dest");
  if (!directText(recipient, "xNome") || !directText(recipient, "CPF") && !directText(recipient, "CNPJ")) {
    throw new Error("Destinat\xE1rio/remetente fiscal precisa ser conferido e identificado.");
  }
  const returnRules = getFiscalFormRules("return", {
    ...input.returnScenario || { returnMethod: input.returnMethod }
  });
  const returnXmlDefaults = getFiscalFormXmlDefaults(returnRules);
  if (input.kind === "return") {
    const recipientAddress = Array.from(recipient.childNodes).find(
      (node) => node.nodeType === 1 && node.localName === "enderDest"
    );
    const recipientUf = recipientAddress ? directText(recipientAddress, "UF").toUpperCase() : "";
    if (!returnRules.allowedModels.includes("55") || !returnXmlDefaults || !returnRules.allowedTransportModes.length || input.natureOfOperation !== returnXmlDefaults.natureOfOperation || !returnRules.allowedModels.includes(input.originalAccessKey.slice(20, 22)) || recipientUf !== String(settings.companyUF).toUpperCase() || directText(recipient, "indIEDest") !== String(returnRules.fixedValues.indIEDest)) {
      throw new Error("Cen\xE1rio de devolu\xE7\xE3o incompat\xEDvel com as regras fiscais habilitadas.");
    }
  }
  let grossTotal = 0;
  let discountTotal = 0;
  const originalItems = /* @__PURE__ */ new Set();
  const details = input.lines.map((line, index) => {
    if (!Number.isInteger(line.originalItemNumber) || line.originalItemNumber < 1 || originalItems.has(line.originalItemNumber) || !Number.isFinite(line.billedQuantity) || line.billedQuantity <= 0 || !Number.isFinite(line.quantity) || line.quantity <= 0 || line.quantity > line.billedQuantity || !(/^[12]\d{3}$/.test(line.cfop) || input.kind === "estorno" && ESTORNO_FALLBACK_CFOPS.includes(line.cfop))) {
      throw new Error(
        `Item ${index + 1}: origem, quantidade ou CFOP interno de entrada inv\xE1lido.`
      );
    }
    if (input.kind === "return") {
      const taxScenarioError = validateReturnTaxScenario("", line.originalTaxesXml || "");
      if (taxScenarioError) throw new Error(taxScenarioError);
      const allowedCfops = getReturnCfopOptionsForSourceItem(
        line.originalCfop || "",
        line.originalTaxesXml || ""
      );
      if (!allowedCfops.some((option) => option.value === line.cfop)) {
        throw new Error(`Item ${index + 1}: CFOP incompat\xEDvel com a devolu\xE7\xE3o e a tributa\xE7\xE3o original.`);
      }
    }
    const proportionalGross = Math.round(line.originalGrossValue * 100 * line.quantity / line.billedQuantity) / 100;
    const proportionalDiscount = Math.round(line.originalDiscountValue * 100 * line.quantity / line.billedQuantity) / 100;
    assertMoney(line.grossValue, proportionalGross, `Valor proporcional do item ${index + 1}`);
    assertMoney(
      line.discountValue,
      proportionalDiscount,
      `Desconto proporcional do item ${index + 1}`
    );
    originalItems.add(line.originalItemNumber);
    const product = parseBlock(line.productXml, "prod");
    const taxes = parseBlock(line.taxesXml, "imposto");
    if (directText(product, "CFOP") !== line.cfop) {
      throw new Error(`Item ${index + 1}: CFOP do produto n\xE3o conferido.`);
    }
    if (!/^\d{8}$/.test(directText(product, "NCM"))) {
      throw new Error(`Item ${index + 1}: NCM do produto deve ter 8 d\xEDgitos.`);
    }
    if (line.originalProductCode && directText(product, "cProd") !== line.originalProductCode) {
      throw new Error(
        `Item ${index + 1}: c\xF3digo do produto deve preservar o documento fiscal original.`
      );
    }
    if (line.originalDescription && directText(product, "xProd") !== line.originalDescription) {
      throw new Error(
        `Item ${index + 1}: descri\xE7\xE3o do produto deve preservar o documento fiscal original.`
      );
    }
    if (line.originalNcm && directText(product, "NCM") !== line.originalNcm) {
      throw new Error(
        `Item ${index + 1}: NCM do produto deve preservar o documento fiscal original.`
      );
    }
    if (line.originalUnitValue !== void 0 && Math.abs(decimal(directText(product, "vUnCom"), "vUnCom") - line.originalUnitValue) > 1e-4) {
      throw new Error(
        `Item ${index + 1}: pre\xE7o unit\xE1rio do produto deve preservar o documento fiscal original.`
      );
    }
    assertQuantity(
      decimal(directText(product, "qCom"), "qCom"),
      line.quantity,
      `Quantidade do item ${index + 1}`
    );
    assertMoney(
      decimal(directText(product, "vProd"), "vProd"),
      line.grossValue,
      `Valor bruto do item ${index + 1}`
    );
    assertMoney(
      decimal(directText(product, "vDesc") || "0", "vDesc"),
      line.discountValue,
      `Desconto do item ${index + 1}`
    );
    if (line.discountValue > line.grossValue || !taxes.getElementsByTagName("ICMS").length) {
      throw new Error(`Item ${index + 1}: desconto ou tributos n\xE3o conferidos.`);
    }
    grossTotal += line.grossValue;
    discountTotal += line.discountValue;
    const reference = input.kind === "return" ? `<DFeReferenciado><chaveAcesso>${input.originalAccessKey}</chaveAcesso><nItem>${line.originalItemNumber}</nItem></DFeReferenciado>` : "";
    const serializedProduct = new import_xmldom.XMLSerializer().serializeToString(product);
    const serializedTaxes = new import_xmldom.XMLSerializer().serializeToString(taxes);
    return `<det nItem="${index + 1}">${serializedProduct}${serializedTaxes}${reference}</det>`;
  }).join("");
  const totals = parseBlock(input.totalsXml, "total");
  const icmsTotal = Array.from(totals.childNodes).find(
    (node) => node.nodeType === 1 && node.localName === "ICMSTot"
  );
  if (!icmsTotal) throw new Error("Totais fiscais ICMSTot n\xE3o conferidos.");
  assertMoney(decimal(directText(icmsTotal, "vProd"), "vProd"), grossTotal, "Total bruto");
  assertMoney(
    decimal(directText(icmsTotal, "vDesc"), "vDesc"),
    discountTotal,
    "Total de descontos"
  );
  decimal(directText(icmsTotal, "vNF"), "vNF");
  const transport = blockXml(input.transportXml, "transp");
  const payment = blockXml(input.paymentXml, "pag");
  if (input.kind === "return") {
    if (!returnXmlDefaults) {
      throw new Error("N\xE3o h\xE1 blocos fiscais aprovados para o retorno desta devolu\xE7\xE3o.");
    }
    const fixedPayment = normalizeReviewedFiscalBlock(
      returnXmlDefaults.paymentXml,
      "pag"
    );
    const fixedTransport = normalizeReviewedFiscalBlock(
      returnXmlDefaults.transportXml,
      "transp"
    );
    if (normalizeReviewedFiscalBlock(input.paymentXml, "pag") !== fixedPayment || normalizeReviewedFiscalBlock(input.transportXml, "transp") !== fixedTransport) {
      throw new Error("Pagamento e transporte fiscal n\xE3o correspondem ao contexto da devolu\xE7\xE3o.");
    }
  }
  const estornoInfAdFisco = [
    input.reason?.trim(),
    input.periodAdjustmentText?.trim(),
    "Nota Fiscal emitida de acordo com inciso VII do caput do art. 298 do RICMS"
  ].filter(Boolean).join(" ");
  const information = input.kind === "estorno" ? `<infAdic><infAdFisco>${escapeXml(estornoInfAdFisco)}</infAdFisco></infAdic>` : `<infAdic><infCpl>Devolucao referente a NF-e ${input.originalAccessKey}; itens e quantidades identificados por item.</infCpl></infAdic>`;
  const ide = buildIdeXml({
    accessKey: input.accessKey,
    randomCode: input.randomCode,
    checkDigit: input.checkDigit,
    nfeNumber: input.nfeNumber,
    series: input.series,
    model: "55",
    environment: input.environment,
    dhEmi: input.issuedAt,
    natureOfOperation: input.natureOfOperation,
    operationType: input.kind === "estorno" ? input.originalOperationType === 1 ? 0 : 1 : 0,
    finalidade: input.kind === "estorno" ? 3 : 4,
    destinationIndicator: input.kind === "estorno" ? input.destinationIndicator : 1,
    presenceIndicator: 0,
    municipalityCode: settings.companyCMun,
    referencedAccessKey: input.kind === "estorno" ? input.originalAccessKey : void 0
  });
  return `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="${namespace}"><infNFe Id="NFe${input.accessKey}" versao="4.00">${ide}${buildEmitXml(settings)}${new import_xmldom.XMLSerializer().serializeToString(recipient)}${details}${new import_xmldom.XMLSerializer().serializeToString(totals)}${transport}${payment}${information}</infNFe></NFe>`;
}

// erp/src/pages/utils/nfe/fiscalOperationReview.ts
var import_xmldom2 = require("@xmldom/xmldom");
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
  for (const child2 of Array.from(root.childNodes)) {
    if (child2.nodeType !== 1) continue;
    const found = findElement(child2, name);
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
    for (const child2 of Array.from(element.childNodes)) {
      if (child2.nodeType !== 1) continue;
      const childElement = child2;
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
function decideOperationDraftRecovery(cStat, state) {
  if (state === "authorized") return "authorized";
  if (cStat === "217" && state === "not_found") return "confirmed_not_found";
  return "still_uncertain";
}

// api/nfe/schemaValidator.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_xmldom3 = require("@xmldom/xmldom");
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

// api/nfe/nfeSigner.ts
var import_node_forge = __toESM(require("node-forge"));
var import_xml_crypto = require("xml-crypto");
var import_node_crypto3 = require("node:crypto");

// api/nfe/sefazHttpsAgent.ts
var import_node_crypto2 = require("node:crypto");
var import_node_https = __toESM(require("node:https"));
var import_node_tls = require("node:tls");

// api/nfe/icpBrasilRoots.ts
var icpBrasilRoots = [
  "-----BEGIN CERTIFICATE-----\nMIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD\nVQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv\nIE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG\nA1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2\nMTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC\nQlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp\nb25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM\nLEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC\nIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn\n+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0\nD0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M\nem+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt\n1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg\nGaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR\n5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2\nlnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB\n7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7\n+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P\nKPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI\nTYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow\nOAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh\nY3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh\nc2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6\n8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV\nHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA\neCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B\nCbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7\nTmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW\nET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B\nMSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ\nkQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570\n2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp\nMEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH\nisLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP\nGEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO\njO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=\n-----END CERTIFICATE-----\n"
];

// api/nfe/sefazHttpsAgent.ts
var trustedSefazAuthorities = [.../* @__PURE__ */ new Set([...import_node_tls.rootCertificates, ...icpBrasilRoots])];
function validateSefazClientCertificate(certPem, privateKeyPem) {
  const certificate = new import_node_crypto2.X509Certificate(certPem);
  if (certificate.ca || !certificate.checkPrivateKey((0, import_node_crypto2.createPrivateKey)(privateKeyPem)))
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
  const privateKey = (0, import_node_crypto3.createPrivateKey)(privateKeyPem);
  const certBag = certBags[import_node_forge.default.pki.oids.certBag]?.find(
    (bag) => bag.cert && !new import_node_crypto3.X509Certificate(import_node_forge.default.pki.certificateToPem(bag.cert)).ca && new import_node_crypto3.X509Certificate(import_node_forge.default.pki.certificateToPem(bag.cert)).checkPrivateKey(privateKey)
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

// api/nfe/responsibleTechnician.ts
var import_node_crypto4 = require("node:crypto");
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
  const hashCSRT = (0, import_node_crypto4.createHash)("sha1").update(`${config.csrt}${accessKey}`, "utf8").digest("base64");
  const responsibleTechnicianXml = `<infRespTec><CNPJ>${config.cnpj}</CNPJ><xContato>${escapeXml2(config.contact)}</xContato><email>${escapeXml2(config.email)}</email><fone>${config.phone}</fone><idCSRT>${config.csrtId}</idCSRT><hashCSRT>${hashCSRT}</hashCSRT></infRespTec>`;
  return `${xml.slice(0, infNfeCloseIndex)}${responsibleTechnicianXml}${xml.slice(infNfeCloseIndex)}`;
}
function hasResponsibleTechnicianCsrt(xml) {
  return /<infRespTec(?:\s|>)[\s\S]*?<idCSRT>\d{2}<\/idCSRT>[\s\S]*?<hashCSRT>[A-Za-z0-9+/]{27}={0,1}<\/hashCSRT>[\s\S]*?<\/infRespTec>/.test(
    xml
  );
}

// shared-utils/fiscalNumbering.ts
var DEFAULT_NFE_NUMBER = 102;
var DEFAULT_NFCE_NUMBER = 600;

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

// api/nfe/xmlEnvelope.ts
function embeddedNfeXml(xml) {
  return xml.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>\s*/, "");
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
async function loadReturnFiscalSourceContext(db, originalDocumentId, returnOrderId, expectedEnvironment, options = {}) {
  const [{ data: returnOrder, error: returnError }, { data: source, error: sourceError }, { data: settings, error: settingsError }] = await Promise.all([
    db.from("orders").select("id,order_index,order_type,status,deleted,linked_order_id,order_data").eq("id", returnOrderId).maybeSingle(),
    db.from("nfe_documents").select("id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe").eq("id", originalDocumentId).maybeSingle(),
    db.from("settings").select("data").eq("id", "app").maybeSingle()
  ]);
  if (returnError || sourceError || settingsError) {
    return { error: "N\xE3o foi poss\xEDvel conferir a NF-e original e o pedido de devolu\xE7\xE3o." };
  }
  if (!returnOrder || returnOrder.order_type !== "return" || returnOrder.deleted) {
    return { error: "Pedido de devolu\xE7\xE3o n\xE3o encontrado ou inv\xE1lido." };
  }
  if (!source) {
    return { error: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE };
  }
  if (returnOrder.status !== "fulfilled") {
    return { error: "A devolu\xE7\xE3o precisa estar recebida/coletada antes da emiss\xE3o fiscal." };
  }
  const orderData = returnOrder.order_data && typeof returnOrder.order_data === "object" ? returnOrder.order_data : {};
  const returnMethod = resolveFiscalReturnMethod(orderData);
  const linkedSaleOrderId = String(returnOrder.linked_order_id || orderData.linkedOrderId || "");
  const authorizationError = validateAuthorizedOutboundNfe(
    source,
    linkedSaleOrderId,
    expectedEnvironment
  );
  if (authorizationError) return { error: authorizationError };
  const issuerSettings = getReturnIssuerSettings(settings);
  const companyUf = String(issuerSettings.companyUF || "");
  const companyCnpj = normalizeFiscalIdentifier(String(issuerSettings.companyCnpj || ""));
  const taxRegime = String(issuerSettings.companyCRT || "");
  if (companyCnpj.length !== 14) {
    return { error: "CNPJ do estabelecimento ausente na configura\xE7\xE3o fiscal do servidor." };
  }
  if (companyCnpj && source.chave_acesso.slice(6, 20) !== companyCnpj) {
    return { error: MISSING_AUTHORIZED_ORIGINAL_NFE_MESSAGE };
  }
  const scenarioError = validateSupportedReturnEntryScenario(
    source.xml_nfe || "",
    companyUf,
    returnMethod,
    taxRegime
  );
  if (scenarioError) return { error: scenarioError };
  const originalDestinationUf = readXmlTag(xmlBlock(source.xml_nfe || "", "dest"), "UF").toUpperCase();
  const originalRecipientTaxpayerIndicator = readXmlTag(
    xmlBlock(source.xml_nfe || "", "dest"),
    "indIEDest"
  );
  const fiscalRules = getFiscalFormRules("return", {
    issuerUf: companyUf,
    recipientUf: originalDestinationUf,
    returnMethod: returnMethod || void 0,
    recipientFiscalStatus: originalRecipientTaxpayerIndicator === "9" ? "non_taxpayer" : "taxpayer",
    isFinalConsumer: readXmlTag(
      xmlBlock(xmlBlock(source.xml_nfe || "", "infNFe"), "ide"),
      "indFinal"
    ) === "1"
  });
  if (fiscalRules.availability !== "READY" || !returnMethod) {
    return { error: `${fiscalRules.blockCategory}: ${fiscalRules.blockReason}` };
  }
  const scope = originalDestinationUf === companyUf.trim().toUpperCase() ? "internal" : "interstate";
  const returnTransportMode = String(fiscalRules.fixedValues.modFrete || "");
  if (!["3", "4"].includes(returnTransportMode)) {
    return { error: "UNSUPPORTED_BY_ERP: n\xE3o foi poss\xEDvel resolver o transporte da devolu\xE7\xE3o." };
  }
  const [{ data: allocations, error: allocationsError }, { data: lines, error: linesError }] = await Promise.all([
    db.from("nfe_return_item_allocations").select("id,return_order_id,return_item_index,original_document_id,original_item_number,quantity,fiscal_return_document_id").eq("return_order_id", returnOrderId).eq("original_document_id", originalDocumentId),
    db.from("nfe_document_items").select("id,document_id,item_number,billed_quantity,product_code,description,product_xml,taxes_xml").eq("document_id", originalDocumentId)
  ]);
  if (allocationsError || linesError) {
    return { error: "N\xE3o foi poss\xEDvel conferir os itens e quantidades da devolu\xE7\xE3o." };
  }
  if (!allocations?.length) {
    return { error: "N\xE3o h\xE1 itens fiscais ainda dispon\xEDveis para vincular a esta NF-e de devolu\xE7\xE3o." };
  }
  if (!options.allowConsumedAllocations && allocations.some((allocation) => allocation.fiscal_return_document_id)) {
    return { error: "Uma ou mais aloca\xE7\xF5es j\xE1 est\xE3o vinculadas a documento fiscal de devolu\xE7\xE3o." };
  }
  const lineByNumber = new Map((lines || []).map((line) => [line.item_number, line]));
  const quantityByOriginalItem = /* @__PURE__ */ new Map();
  for (const allocation of allocations) {
    const quantity = Number(allocation.quantity);
    const originalLine = lineByNumber.get(allocation.original_item_number);
    const total = (quantityByOriginalItem.get(allocation.original_item_number) || 0) + quantity;
    if (!Number.isInteger(allocation.return_item_index) || !Number.isInteger(allocation.original_item_number) || !Number.isFinite(quantity) || quantity <= 0 || !originalLine || total > Number(originalLine.billed_quantity) + 5e-5) {
      return { error: "A aloca\xE7\xE3o dos itens devolvidos n\xE3o corresponde \xE0 NF-e original." };
    }
    if (originalLine && !getReturnCfopOptionsForSourceItem(
      originalItemCfop(originalLine.product_xml) || "",
      originalLine.taxes_xml,
      scope
    ).length) {
      return { error: `N\xE3o h\xE1 CFOP de devolu\xE7\xE3o aprovado para o item original ${allocation.original_item_number}.` };
    }
    const taxScenarioError = originalLine ? validateReturnTaxScenario(source.xml_nfe || "", originalLine.taxes_xml) : null;
    if (taxScenarioError) return { error: taxScenarioError };
    quantityByOriginalItem.set(allocation.original_item_number, total);
  }
  return {
    context: {
      source,
      returnOrder: { ...returnOrder, returnMethod },
      operationContext: {
        operation: "return",
        purpose: 4,
        model: "55",
        direction: "inbound",
        issuerUf: companyUf.trim().toUpperCase(),
        recipientUf: originalDestinationUf,
        scope,
        returnMethod,
        transportMode: returnTransportMode,
        recipientFiscalStatus: originalRecipientTaxpayerIndicator === "9" ? "non_taxpayer" : "taxpayer",
        isFinalConsumer: true,
        taxRegime,
        originalInvoice: {
          id: source.id,
          accessKey: source.chave_acesso,
          environment: Number(source.ambiente),
          model: source.modelo,
          series: String(source.serie),
          number: Number(source.numero_nfe),
          protocol: String(source.numero_protocolo || "")
        }
      },
      allocations: allocations.map((allocation) => ({
        ...allocation,
        quantity: Number(allocation.quantity)
      })),
      lines: lines || []
    }
  };
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

// api/nfe/normal-sale/attemptPolicy.ts
function isUncertainAuthorization(cStat, pending) {
  return pending || !/^\d{3}$/.test(cStat) || ["100", "103", "104", "105", "108", "109", "204", "539", "999"].includes(cStat);
}

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
    const namespace2 = "http://www.portalfiscal.inf.br/nfe";
    const results = [
      ...Array.from(xml.getElementsByTagNameNS("*", "retEnviNFe")),
      ...Array.from(xml.getElementsByTagNameNS("*", "retConsSitNFe"))
    ];
    const protocols = xml.getElementsByTagNameNS("*", "infProt");
    if (results.length !== 1 || protocols.length > 1) return null;
    const result = results[0];
    const protocol = protocols[0];
    if (result.namespaceURI !== namespace2 || protocol && (protocol.namespaceURI !== namespace2 || protocol.parentNode?.localName !== "protNFe" || protocol.parentNode.namespaceURI !== namespace2 || protocol.parentNode.parentNode !== result)) return null;
    const directValue = (element, name) => {
      const children2 = Array.from(element.childNodes).filter(
        (node) => node.nodeType === 1 && "localName" in node && node.localName === name
      );
      const child2 = children2[0];
      return children2.length === 1 && child2 && "namespaceURI" in child2 && child2.namespaceURI === namespace2 ? child2.textContent?.trim() : void 0;
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
function matchesSefazTransmissionResponse(response, expected) {
  const parsed = readSefazResult(response);
  if (!parsed) return false;
  const { result, protocol, directValue } = parsed;
  const batchStatus = directValue(result, "cStat") || "";
  if (result.localName !== "retEnviNFe" || directValue(result, "tpAmb") !== String(expected.environment) || !/^\d{3}$/.test(batchStatus)) return false;
  if (!protocol) return !["100", "104"].includes(batchStatus);
  return batchStatus === "104" && /^\d{3}$/.test(directValue(protocol, "cStat") || "") && directValue(protocol, "tpAmb") === String(expected.environment) && directValue(protocol, "chNFe") === expected.accessKey;
}

// erp/src/pages/utils/nfe/invoiceLineSnapshot.ts
var decodeXml = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
var childText = (xml, tag) => {
  const found = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
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

// api/nfe/fiscalXmlAudit.ts
var import_xmldom5 = require("@xmldom/xmldom");
var import_xml_crypto2 = require("xml-crypto");

// shared-utils/fiscalIcmsGroups.ts
var CSOSN_CODES = ["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"];

// shared-utils/fiscalItemSelections.ts
var csosns = new Set(CSOSN_CODES);

// api/nfe/fiscalXmlAudit.ts
function createStrictXmlParser(parseErrors) {
  return new import_xmldom5.DOMParser({
    errorHandler: (level, message) => {
      if (level === "warning" && String(message).includes("errorHandler") && String(message).includes("deprecated"))
        return;
      parseErrors.push(String(message));
    }
  });
}
var localName = (node) => (node.localName || node.tagName).split(":").at(-1) || "";
var children = (node) => node ? Array.from(node.childNodes).filter((child2) => child2.nodeType === 1) : [];
var child = (node, name) => node ? children(node).find((candidate) => localName(candidate) === name) || null : null;
var allDescendants = (node, name) => {
  const result = [];
  const visit = (current) => {
    if (localName(current) === name) result.push(current);
    children(current).forEach(visit);
  };
  visit(node);
  return result;
};
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

// api/nfe/operation-draft/draftXmlAudit.ts
function brazilTimestamp(now = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value || "";
  const local = Date.UTC(
    Number(value("year")),
    Number(value("month")) - 1,
    Number(value("day")),
    Number(value("hour")),
    Number(value("minute")),
    Number(value("second"))
  );
  const offsetMinutes = Math.round((local - now.getTime()) / 6e4);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const offset = Math.abs(offsetMinutes);
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}${sign}${String(Math.floor(offset / 60)).padStart(2, "0")}:${String(offset % 60).padStart(2, "0")}`;
}
function readTag2(xml, tag) {
  return xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "i"))?.[1]?.trim() || null;
}
function extractXmlBlock(xml, tag) {
  const prefix = "(?:[\\w.-]+:)?";
  return xml.match(new RegExp(`<${prefix}${tag}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${tag}>`, "i"))?.[0] || "";
}
function asFiscalSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value;
  const nested = record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested : record;
}
function getPersistableItems(signedXml, draftLines) {
  const parsed = parseAuthorizedInvoiceLines(signedXml);
  if (parsed.length !== draftLines.length) {
    throw new Error("Os itens do XML assinado diferem dos itens revisados.");
  }
  return parsed.map((item) => {
    const line = draftLines.find(
      (candidate) => Number(candidate.fiscal_item_number) === item.invoiceItemNumber
    );
    if (!line || !line.reviewed_product_xml || !line.reviewed_taxes_xml || !line.reviewed_cfop) {
      throw new Error(`Item ${item.invoiceItemNumber} n\xE3o possui revis\xE3o fiscal persistida.`);
    }
    if (normalizeReviewedFiscalBlock(item.productXml, "prod") !== normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), "prod") || normalizeReviewedFiscalBlock(item.taxesXml, "imposto") !== normalizeReviewedFiscalBlock(String(line.reviewed_taxes_xml), "imposto")) {
      throw new Error(
        `XML assinado diverge da revis\xE3o fiscal do item ${item.invoiceItemNumber}.`
      );
    }
    return {
      draft_line_id: String(line.id),
      item_number: item.invoiceItemNumber,
      product_code: item.productCode,
      description: item.description,
      quantity: item.billedQuantity,
      unit_value: item.unitValue,
      gross_value: item.grossValue,
      discount_value: item.discountValue,
      product_xml: String(line.reviewed_product_xml),
      taxes_xml: String(line.reviewed_taxes_xml)
    };
  });
}
function assertDraftXmlMatchesReview(input) {
  const {
    signedXml,
    certificatePem,
    draft,
    review,
    lines,
    originalById,
    sourceAccessKey,
    environment,
    accessKey,
    series,
    number,
    sourceOperationType,
    sourceDestinationIndicator
  } = input;
  assertNfeSignature(signedXml, certificatePem);
  const blocks = [
    ["dest", "recipient_xml"],
    ["total", "totals_xml"],
    ["transp", "transport_xml"],
    ["pag", "payment_xml"]
  ];
  for (const [tag, reviewField] of blocks) {
    const expected = normalizeReviewedFiscalBlock(String(review[reviewField] || ""), tag);
    const actual = normalizeReviewedFiscalBlock(extractXmlBlock(signedXml, tag), tag);
    if (actual !== expected) {
      throw new Error(`XML assinado diverge da pr\xE9via fiscal no campo ${tag}.`);
    }
  }
  const expectedIdentity = {
    mod: "55",
    tpAmb: String(environment),
    serie: String(Number(series)),
    nNF: String(number),
    finNFe: draft.operation_kind === "return" ? "4" : "3",
    tpNF: draft.operation_kind === "return" || sourceOperationType === 1 ? "0" : "1",
    idDest: draft.operation_kind === "return" ? "1" : String(sourceDestinationIndicator)
  };
  if (!signedXml.includes(`Id="NFe${accessKey}"`)) {
    throw new Error("XML assinado diverge da chave de acesso reservada.");
  }
  for (const [tag, expected] of Object.entries(expectedIdentity)) {
    if (readTag2(extractXmlBlock(signedXml, "ide"), tag) !== expected) {
      throw new Error(`XML assinado diverge da identidade fiscal em ide.${tag}.`);
    }
  }
  if (!signedXml.includes(`<tpAmb>${environment}</tpAmb>`)) {
    throw new Error("XML assinado diverge do ambiente fiscal selecionado.");
  }
  const invoiceLines = getPersistableItems(
    signedXml,
    lines
  );
  if (draft.operation_kind === "return") {
    const actualReferences = [
      ...signedXml.matchAll(/<DFeReferenciado>([\s\S]*?)<\/DFeReferenciado>/g)
    ].map(([, block]) => ({
      accessKey: readTag2(block, "chaveAcesso"),
      itemNumber: Number(readTag2(block, "nItem"))
    }));
    const expectedReferences = lines.map((line) => {
      const original = originalById.get(String(line.original_document_item_id || ""));
      return Number(original?.item_number);
    });
    if (actualReferences.length !== lines.length || actualReferences.some(
      (reference, index) => reference.accessKey !== sourceAccessKey || reference.itemNumber !== expectedReferences[index]
    ) || invoiceLines.length !== lines.length || /<NFref\b/.test(signedXml)) {
      throw new Error("Refer\xEAncias fiscais dos itens da devolu\xE7\xE3o divergem das aloca\xE7\xF5es revisadas.");
    }
  } else {
    const ide = extractXmlBlock(signedXml, "ide");
    const references = [...ide.matchAll(/<refNFe>([0-9]{6}[A-Z0-9]{12}[0-9]{26})<\/refNFe>/g)].map(
      ([, key]) => key
    );
    if (references.length !== 1 || references[0] !== sourceAccessKey || /<DFeReferenciado\b/.test(signedXml)) {
      throw new Error("XML de estorno deve referenciar somente a chave fiscal original.");
    }
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

// api/nfe/orderEditReplacement.ts
async function hasPendingOrderEditEstorno(db, orderId, documentId, environment) {
  const { data, error } = await db.from("nfe_order_edit_replacements").select("id").eq("order_id", orderId).eq("original_document_id", documentId).eq("environment", environment).eq("reversal_kind", "estorno").eq("status", "awaiting_reversal").maybeSingle();
  return !error && Boolean(data);
}

// api/nfe/operation-draft/draftValidation.ts
function validateDraftPreconditions(draft, automaticReturnWorker, productionConfirmed, previewOnly) {
  if (automaticReturnWorker && (draft.operation_kind !== "return" || !draft.return_order_id)) {
    return {
      status: 403,
      error: "O worker s\xF3 pode transmitir documentos de devolu\xE7\xE3o vinculados."
    };
  }
  const environment = Number(draft.environment);
  if (![1, 2].includes(environment)) {
    return { status: 409, error: "Ambiente fiscal inv\xE1lido no rascunho." };
  }
  if (draft.status === "authorized" && draft.document_id) {
    return { earlyAuthorized: true };
  }
  if (draft.status === "rejected") {
    return {
      status: 409,
      error: "A SEFAZ rejeitou esta tentativa. Revise o motivo antes de iniciar uma nova opera\xE7\xE3o fiscal."
    };
  }
  if (!previewOnly && !["ready", "transmitting", "unknown"].includes(draft.status)) {
    return {
      status: 409,
      error: "Conclua e salve a revis\xE3o fiscal antes de transmitir."
    };
  }
  if (previewOnly && !["draft", "ready", "transmitting", "unknown"].includes(draft.status)) {
    return {
      status: 409,
      error: "Rascunho em estado incompat\xEDvel com a pr\xE9via."
    };
  }
  if (!automaticReturnWorker && !previewOnly && environment === 1 && draft.status === "ready" && productionConfirmed !== true) {
    return {
      status: 400,
      error: "Confirme explicitamente a transmiss\xE3o deste documento em Produ\xE7\xE3o."
    };
  }
  if (!draft.review_data || !draft.nature_of_operation || !draft.reviewed_at) {
    return {
      status: 409,
      error: "A revis\xE3o fiscal n\xE3o foi persistida."
    };
  }
  return {};
}
function validateSourceDocument(source, draft, environment) {
  const returnModelOptions = getFiscalFormRules("return").allowedModels;
  const sourceModelAllowed = source && (draft.operation_kind === "return" ? returnModelOptions.includes(String(source.modelo)) : draft.operation_kind === "estorno" && ["55", "65"].includes(String(source.modelo)));
  if (!source || source.document_type !== "outbound" || !sourceModelAllowed) {
    return draft.operation_kind === "return" ? "N\xE3o \xE9 poss\xEDvel emitir NF-e de devolu\xE7\xE3o porque este pedido n\xE3o possui NF-e de sa\xEDda autorizada." : "Documento original incompat\xEDvel com esta opera\xE7\xE3o fiscal.";
  }
  if (source.chave_acesso !== draft.original_access_key || Number(source.ambiente) !== environment || source.status !== (environment === 1 ? "autorizada" : "homologada") || !source.numero_protocolo) {
    return draft.operation_kind === "return" ? "N\xE3o \xE9 poss\xEDvel emitir NF-e de devolu\xE7\xE3o porque este pedido n\xE3o possui NF-e de sa\xEDda autorizada." : "A autoriza\xE7\xE3o original n\xE3o confere com o rascunho.";
  }
  return null;
}
async function validateEstornoPreconditions(params) {
  const { db, source, draft, environment, sourceDestinationIndicator, sourceOperationTypeText } = params;
  if (![1, 2, 3].includes(sourceDestinationIndicator) || !sourceOperationTypeText || !["0", "1"].includes(sourceOperationTypeText)) {
    return "A NF-e original n\xE3o informa tpNF e indicador de destino v\xE1lidos para o estorno.";
  }
  const review = draft.review_data || {};
  if (Number(draft.finalidade) !== 3 || draft.nature_of_operation !== ESTORNO_NATURE_OF_OPERATION || String(review.nature_of_operation || "") !== ESTORNO_NATURE_OF_OPERATION || Array.from(String(review.reason || draft.reason || "").trim()).length < 15 || Array.from(String(review.reason || draft.reason || "").trim()).length > 255 || review.item_taxes_confirmed !== true || review.totals_confirmed !== true) {
    return "O rascunho de estorno n\xE3o cont\xE9m natureza, finalidade ou revis\xE3o fiscal obrigat\xF3ria.";
  }
  const { data: order, error: orderError } = await db.from("orders").select(
    "id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_data"
  ).eq("id", String(source.order_id || "")).maybeSingle();
  if (orderError || !order || !["cancelled", "cancelado"].includes(String(order.status)) && !(order.status === "scheduled" && await hasPendingOrderEditEstorno(db, String(source.order_id), source.id, environment))) {
    return "O estorno exige pedido cancelado ou substitui\xE7\xE3o por edi\xE7\xE3o registrada e ainda agendada.";
  }
  if (getGoodsCirculationState(order) !== "none") {
    return "A entrega/retirada est\xE1 confirmada ou em andamento; o estorno est\xE1 bloqueado e a NF-e original deve ser preservada.";
  }
  const policy = getFiscalCancellationPolicy({
    model: String(source.modelo),
    authorizedAt: getAuthorizedAt(source.xml_protocolo || "", ""),
    status: String(source.status),
    environment,
    goodsCirculated: false,
    operationDidNotOccur: true,
    issuerUf: String(source.chave_acesso || "").slice(0, 2) === "41" ? "PR" : ""
  });
  if (policy.action !== "estorno") {
    return policy.reason || "O prazo normal de cancelamento ainda est\xE1 aberto; n\xE3o transmita o estorno.";
  }
  const sourceAuthorizationError = validateAuthorizedOutboundNfe(
    source,
    String(source.order_id || ""),
    environment,
    { allowNfceSource: true }
  );
  if (sourceAuthorizationError) {
    return sourceAuthorizationError;
  }
  return null;
}
function validateEstornoItems(params) {
  const { lines, sourceItemsCount, originalById, fiscalDefaults } = params;
  if (sourceItemsCount !== lines.length) {
    return "O estorno precisa incluir todos os itens da NF-e original.";
  }
  for (const line of lines) {
    const original = originalById.get(String(line.original_document_item_id || ""));
    const sourceCfop = original ? originalItemCfop(String(original.product_xml)) : null;
    const reviewedCfop = String(line.reviewed_cfop);
    const cfopIsValid = getEstornoCfopOptions(sourceCfop, fiscalDefaults).some(
      (option) => option.value === reviewedCfop
    );
    if (!original || !/^[56]\d{3}$/.test(sourceCfop || "") || !cfopIsValid || Math.abs(Number(line.quantity) - Number(original.billed_quantity)) > 5e-5 || Math.abs(Number(line.gross_value) - Number(original.gross_value)) > 5e-3 || Math.abs(Number(line.discount_value) - Number(original.discount_value)) > 5e-3) {
      return "Item do estorno diverge da origem ou n\xE3o usa o CFOP inverso fiscalmente conferido.";
    }
    const expectedProduct = buildReturnProductXml({
      originalProductXml: String(original.product_xml),
      quantity: Number(original.billed_quantity),
      originalQuantity: Number(original.billed_quantity),
      grossValue: Number(original.gross_value),
      discountValue: Number(original.discount_value),
      cfop: reviewedCfop
    });
    if (normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), "prod") !== normalizeReviewedFiscalBlock(expectedProduct, "prod")) {
      return "O item do estorno precisa preservar os dados fiscais e valores originais.";
    }
  }
  return null;
}

// api/nfe/consultAuthorizedDocument.ts
var import_xmldom6 = require("@xmldom/xmldom");
function matchesConsultedDocument(response, doc, currentStatus = "100") {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return false;
    const errors = [];
    const xml = new import_xmldom6.DOMParser({
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

// api/nfe/operation-draft/draftPersistence.ts
async function consultDraftKey(accessKey, environment, certificate) {
  const queryXml = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
  return sendSoapToSefaz({
    url: getNfeServiceEndpoint("55", environment, "NFeConsultaProtocolo4"),
    action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF",
    serviceNamespace: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4",
    xmlPayload: queryXml,
    certPem: certificate.certPem,
    privateKeyPem: certificate.privateKeyPem
  });
}
async function executePrepareDraftAttemptRpc(db, params) {
  return db.rpc("prepare_nfe_operation_attempt", {
    p_draft_id: params.draftId,
    p_expected_updated_at: params.expectedUpdatedAt,
    p_expected_review_data: params.reviewData,
    p_expected_lines: params.lines,
    p_signed_xml: params.signedXml,
    p_access_key: params.accessKey,
    p_minimum_number: params.minimumNumber
  });
}
async function claimReadyDraftForTransmission(db, params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return db.from("nfe_operation_drafts").update({
    status: "transmitting",
    transmitted_at: now,
    updated_at: now
  }).eq("id", params.draftId).eq("status", "ready").eq("access_key", params.accessKey).eq("updated_at", params.expectedUpdatedAt).select("id,updated_at").maybeSingle();
}
async function confirmDraftTransmissionStart(db, params) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return db.from("nfe_operation_drafts").update({ transmitted_at: now, updated_at: now }).eq("id", params.draftId).eq("status", "transmitting").eq("access_key", params.accessKey).eq("updated_at", params.transmissionVersion).select("id,updated_at").maybeSingle();
}
async function persistDraftAuthorized(params) {
  const {
    res,
    db,
    draft,
    lines,
    environment,
    responseXml,
    authorizedAccessKey,
    authorizedSignedXml
  } = params;
  const authorization = parseSefazAuthorization(responseXml);
  const protocolNumber = authorization.protocolNumber;
  if (!authorization.authorized || !protocolNumber || !matchesSefazAuthorization(responseXml, {
    accessKey: authorizedAccessKey,
    environment,
    protocolNumber
  })) {
    return res.status(202).json({
      success: false,
      pending: true,
      reconciliationRequired: true,
      accessKey: authorizedAccessKey,
      error: "A resposta recebida n\xE3o confirma a identidade e o protocolo desta nota. Consulte a mesma tentativa; n\xE3o retransmita."
    });
  }
  const itemSnapshot = getPersistableItems(authorizedSignedXml, lines);
  const expectedDocumentId = draft.document_id || draft.id;
  let documentId = null;
  let persistenceConfirmed = false;
  try {
    const result = await db.rpc(
      "persist_authorized_nfe_operation_draft",
      {
        p_draft_id: draft.id,
        p_document_id: expectedDocumentId,
        p_number: Number(authorizedAccessKey.slice(25, 34)),
        p_series: String(Number(authorizedAccessKey.slice(22, 25))),
        p_access_key: authorizedAccessKey,
        p_signed_xml: authorizedSignedXml,
        p_sefaz_response_xml: responseXml,
        p_protocol_number: protocolNumber,
        p_protocol_date: authorization.protocolDate ? new Date(authorization.protocolDate).toISOString() : null,
        p_status: environment === 1 ? "autorizada" : "homologada",
        p_status_reason: authorization.xMotivo || "Autorizada pela SEFAZ.",
        p_items: itemSnapshot
      }
    );
    documentId = result.data;
    persistenceConfirmed = !result.error && documentId === expectedDocumentId;
  } catch {
  }
  if (!persistenceConfirmed || documentId !== expectedDocumentId) {
    console.error(
      "[NF-e Draft] SEFAZ autorizou, mas a persist\xEAncia local n\xE3o foi confirmada."
    );
    return res.status(503).json({
      success: true,
      pending: true,
      reconciliationRequired: true,
      accessKey: authorizedAccessKey,
      protocolNumber,
      error: "A SEFAZ autorizou, mas falta reconciliar a grava\xE7\xE3o local. Consulte novamente; n\xE3o retransmita."
    });
  }
  if (draft.operation_kind === "estorno") {
    const { data: editReplacement, error: editReplacementError } = await db.from("nfe_order_edit_replacements").select("id").eq("operation_draft_id", draft.id).maybeSingle();
    const orderEditTableNotInstalled = ["42P01", "PGRST204", "PGRST205"].includes(
      String(editReplacementError?.code || "")
    );
    if (editReplacementError && !orderEditTableNotInstalled) {
      return res.status(503).json({
        success: true,
        pending: true,
        reconciliationRequired: true,
        documentId,
        accessKey: authorizedAccessKey,
        protocolNumber,
        error: "O estorno foi autorizado, mas a conclus\xE3o da edi\xE7\xE3o do pedido precisa ser retomada. N\xE3o retransmita."
      });
    }
    let resolvedReplacement = editReplacement;
    if (!editReplacement && !editReplacementError && draft.original_document_id) {
      const { data: fallbackReplacement, error: fallbackError } = await db.from("nfe_order_edit_replacements").select("id").eq("original_document_id", draft.original_document_id).eq("environment", environment).eq("reversal_kind", "estorno").eq("status", "awaiting_reversal").maybeSingle();
      if (!fallbackError && fallbackReplacement) {
        await db.from("nfe_order_edit_replacements").update({ operation_draft_id: draft.id }).eq("id", fallbackReplacement.id);
        resolvedReplacement = fallbackReplacement;
      }
    }
    if (resolvedReplacement) {
      const { error: finalizeEditError } = await db.rpc("finalize_fiscal_order_edit", {
        p_replacement_id: resolvedReplacement.id
      });
      if (finalizeEditError) {
        console.error(
          "[NF-e Draft] Estorno autorizado; conclus\xE3o da edi\xE7\xE3o pendente:",
          finalizeEditError.message
        );
        return res.status(503).json({
          success: true,
          pending: true,
          reconciliationRequired: true,
          documentId,
          accessKey: authorizedAccessKey,
          protocolNumber,
          error: "O estorno foi autorizado, mas a atualiza\xE7\xE3o do pedido est\xE1 pendente. Retome a edi\xE7\xE3o pelo ERP; n\xE3o retransmita."
        });
      }
    }
  }
  return res.status(200).json({
    success: true,
    status: "authorized",
    documentId,
    accessKey: authorizedAccessKey,
    protocolNumber,
    cStat: authorization.cStat,
    xMotivo: authorization.xMotivo
  });
}
async function reconcileStoredDraftAttempt(params) {
  const {
    res,
    db,
    draft: requestedDraft,
    lines,
    environment,
    certificate,
    allowRetryAfterNotFound
  } = params;
  const { data: draft, error: draftError } = await db.from("nfe_operation_drafts").select("*").eq("id", requestedDraft.id).maybeSingle();
  if (draftError || !draft || draft.environment !== environment || draft.original_document_id !== requestedDraft.original_document_id || draft.return_order_id !== requestedDraft.return_order_id) {
    return res.status(503).json({
      success: false,
      pending: true,
      error: "N\xE3o foi poss\xEDvel confirmar a tentativa fiscal atual. Atualize a situa\xE7\xE3o antes de repetir."
    });
  }
  if (draft.status === "authorized" && draft.document_id) {
    return res.status(200).json({
      success: true,
      status: "authorized",
      documentId: draft.document_id,
      accessKey: draft.access_key
    });
  }
  if (!["transmitting", "unknown"].includes(draft.status)) {
    return res.status(409).json({
      success: false,
      pending: true,
      error: "A tentativa fiscal mudou durante a consulta. Atualize a situa\xE7\xE3o antes de continuar."
    });
  }
  if (!draft.access_key || !draft.signed_xml) {
    return res.status(409).json({
      success: false,
      pending: true,
      error: "Tentativa sem chave/XML persistidos; requer reconcilia\xE7\xE3o manual e n\xE3o pode ser retransmitida."
    });
  }
  let queryXml;
  const consultationStartedAt = Date.now();
  try {
    queryXml = await consultDraftKey(draft.access_key, environment, certificate);
  } catch (error) {
    console.error(
      "[NF-e Draft] Consulta ap\xF3s tentativa inconclusiva falhou:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return res.status(502).json({
      success: false,
      pending: true,
      accessKey: draft.access_key,
      error: "N\xE3o foi poss\xEDvel reconciliar a tentativa na SEFAZ. Nenhuma retransmiss\xE3o foi feita."
    });
  }
  const situation = parseSefazNfeSituation(queryXml);
  const recoveryDecision = decideOperationDraftRecovery(situation.cStat, situation.state);
  if (recoveryDecision === "authorized") {
    const protocol = draft.protocol_number || parseSefazAuthorization(queryXml).protocolNumber;
    if (!/^\d{15}$/.test(protocol || "") || !matchesConsultedDocument(queryXml, {
      ambiente: environment,
      chave_acesso: draft.access_key,
      numero_protocolo: protocol || null
    })) {
      return res.status(202).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        error: "A resposta da consulta n\xE3o confirma a chave, o ambiente e o protocolo desta nota. Consulte novamente."
      });
    }
    return persistDraftAuthorized({
      res,
      db,
      draft,
      lines,
      environment,
      responseXml: queryXml,
      authorizedAccessKey: draft.access_key,
      authorizedSignedXml: draft.signed_xml
    });
  }
  if (recoveryDecision === "confirmed_not_found" && allowRetryAfterNotFound) {
    if (!matchesConsultedDocument(queryXml, {
      ambiente: environment,
      chave_acesso: draft.access_key,
      numero_protocolo: null
    }, "217")) {
      return res.status(202).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        error: "A resposta da consulta n\xE3o corresponde \xE0 chave e ao ambiente desta nota. A tentativa foi preservada."
      });
    }
    const transmittedAt = Date.parse(draft.transmitted_at || "");
    if (!Number.isFinite(transmittedAt) || consultationStartedAt - transmittedAt < 3e4) {
      return res.status(202).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        error: "A transmiss\xE3o ainda pode estar em andamento. Aguarde e consulte novamente; nenhuma repeti\xE7\xE3o foi liberada."
      });
    }
    const { data: ready, error } = await db.from("nfe_operation_drafts").update({ status: "ready", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", draft.id).eq("access_key", draft.access_key).eq("updated_at", draft.updated_at).in("status", ["transmitting", "unknown"]).select("id").maybeSingle();
    if (error || !ready) {
      return res.status(503).json({
        success: false,
        pending: true,
        accessKey: draft.access_key,
        error: "A SEFAZ n\xE3o localizou a chave, mas n\xE3o foi poss\xEDvel liberar a repeti\xE7\xE3o segura. Tente consultar novamente."
      });
    }
    return res.status(409).json({
      success: false,
      retryAllowed: true,
      status: "ready",
      accessKey: draft.access_key,
      error: "A consulta \xE0 SEFAZ retornou cStat 217 (chave n\xE3o localizada). Uma nova tentativa poder\xE1 reutilizar exatamente a mesma chave e XML."
    });
  }
  return res.status(202).json({
    success: false,
    pending: true,
    accessKey: draft.access_key,
    cStat: situation.cStat,
    error: situation.xMotivo || "A SEFAZ ainda n\xE3o confirmou a situa\xE7\xE3o. N\xE3o retransmita."
  });
}

// api/nfe/transmit-operation-draft.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  }
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  }
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const automaticReturnWorker = isAutomaticReturnWorkerAuthorized(
    req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER]
  );
  const fiscalAuthorization = automaticReturnWorker ? { ok: true, userId: null, isAdministrator: false } : await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok) {
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message
    });
  }
  const draftId = String(req.body?.draftId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId)) {
    return res.status(400).json({ success: false, error: "Rascunho fiscal inv\xE1lido." });
  }
  const previewOnly = req.body?.previewOnly === true;
  if (previewOnly && !fiscalAuthorization.isAdministrator) {
    return res.status(403).json({
      success: false,
      code: "FISCAL_XML_PREVIEW_ADMIN_REQUIRED",
      error: "Somente administradores podem visualizar a pr\xE9via do XML fiscal."
    });
  }
  let reservedNfeNumber;
  try {
    const { data: draft, error: draftError } = await db.from("nfe_operation_drafts").select("*").eq("id", draftId).maybeSingle();
    if (draftError || !draft) {
      return res.status(404).json({ success: false, error: "Rascunho fiscal n\xE3o encontrado." });
    }
    const draftPreconditions = validateDraftPreconditions(
      draft,
      automaticReturnWorker,
      req.body?.productionConfirmed,
      previewOnly
    );
    if (draftPreconditions.earlyAuthorized) {
      if (previewOnly) {
        return res.status(200).json({
          success: true,
          preview: true,
          xml: draft.signed_xml || draft.generated_xml || "",
          documentId: draft.document_id,
          accessKey: draft.access_key
        });
      }
      return res.status(200).json({
        success: true,
        status: "authorized",
        documentId: draft.document_id,
        accessKey: draft.access_key
      });
    }
    if (draftPreconditions.error) {
      return res.status(draftPreconditions.status || 409).json({ success: false, error: draftPreconditions.error });
    }
    const environment = Number(draft.environment);
    const { data: source, error: sourceError } = await db.from("nfe_documents").select(
      "id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,numero_nfe,serie"
    ).eq("id", draft.original_document_id).maybeSingle();
    const sourceDocError = validateSourceDocument(
      sourceError ? null : source,
      draft,
      environment
    );
    if (sourceDocError) {
      return res.status(409).json({ success: false, error: sourceDocError });
    }
    const validatedSource = source;
    const isStoredAttempt = draft.status === "transmitting" || draft.status === "unknown";
    const sourceDestinationIndicator = Number(
      readTag2(String(validatedSource.xml_nfe || ""), "idDest")
    );
    const sourceOperationTypeText = readTag2(String(validatedSource.xml_nfe || ""), "tpNF");
    const sourceOperationType = Number(sourceOperationTypeText);
    let returnFiscalContext = null;
    let returnFormRules = null;
    let returnXmlDefaults = null;
    if (!isStoredAttempt) {
      if (draft.operation_kind === "estorno") {
        const estornoError = await validateEstornoPreconditions({
          db,
          source: validatedSource,
          draft,
          environment,
          sourceDestinationIndicator,
          sourceOperationTypeText
        });
        if (estornoError) {
          return res.status(409).json({ success: false, error: estornoError });
        }
      }
      if (draft.operation_kind === "return") {
        if (!draft.return_order_id) {
          return res.status(409).json({ success: false, error: "Devolu\xE7\xE3o comercial ausente no rascunho." });
        }
        returnFiscalContext = await loadReturnFiscalSourceContext(
          db,
          draft.original_document_id,
          draft.return_order_id,
          environment
        );
        if ("error" in returnFiscalContext) {
          return res.status(409).json({ success: false, error: returnFiscalContext.error });
        }
        returnFormRules = getFiscalFormRules(
          "return",
          returnFiscalContext.context.operationContext
        );
        returnXmlDefaults = getFiscalFormXmlDefaults(returnFormRules);
        if (!returnXmlDefaults || !returnFormRules.allowedModels.includes(String(validatedSource.modelo)) || !returnFormRules.allowedFinalidades.includes(Number(draft.finalidade))) {
          return res.status(409).json({
            success: false,
            error: "Modelo, finalidade ou op\xE7\xF5es fiscais incompat\xEDveis com a devolu\xE7\xE3o."
          });
        }
      }
    }
    const { data: lines, error: linesError } = await db.from("nfe_operation_draft_lines").select(
      "id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml"
    ).eq("draft_id", draft.id).order("fiscal_item_number");
    if (linesError || !lines?.length || lines.some(
      (line) => !line.reviewed_cfop || !line.reviewed_product_xml || !line.reviewed_taxes_xml
    )) {
      return res.status(409).json({ success: false, error: "H\xE1 itens sem CFOP ou blocos fiscais revisados." });
    }
    const originalIds = lines.map((line) => line.original_document_item_id);
    const { data: originalLines, error: originalLinesError } = await db.from("nfe_document_items").select(
      "id,document_id,item_number,billed_quantity,gross_value,discount_value,product_code,description,unit_value,product_xml,taxes_xml"
    ).in("id", originalIds);
    if (originalLinesError || !originalLines || originalLines.length !== lines.length) {
      return res.status(409).json({
        success: false,
        error: "N\xE3o foi poss\xEDvel carregar todos os itens da NF-e original."
      });
    }
    if (originalLines.some((line) => line.document_id !== validatedSource.id)) {
      return res.status(409).json({ success: false, error: "Item fiscal vinculado a outro documento original." });
    }
    const originalById = new Map(originalLines.map((line) => [line.id, line]));
    if (draft.operation_kind === "return" && returnFiscalContext && "context" in returnFiscalContext) {
      if (!returnFormRules || !returnXmlDefaults) {
        return res.status(409).json({
          success: false,
          error: "O cen\xE1rio da devolu\xE7\xE3o n\xE3o possui op\xE7\xF5es fiscais aprovadas."
        });
      }
      const allocationRows = returnFiscalContext.context.allocations;
      const sourceLineByNumber = new Map(originalLines.map((line) => [line.item_number, line]));
      const draftLineByOriginalId = new Map(
        lines.map((line) => [line.original_document_item_id, line])
      );
      const allocationsByNumber = /* @__PURE__ */ new Map();
      for (const allocation of allocationRows) {
        const grouped = allocationsByNumber.get(allocation.original_item_number) || [];
        grouped.push(allocation);
        allocationsByNumber.set(allocation.original_item_number, grouped);
      }
      const { data: allocationLinks, error: allocationLinksError } = await db.from("nfe_operation_draft_allocations").select("draft_line_id,allocation_id").in(
        "draft_line_id",
        lines.map((line) => line.id)
      );
      if (allocationLinksError) {
        return res.status(409).json({
          success: false,
          error: "N\xE3o foi poss\xEDvel validar a aloca\xE7\xE3o dos itens da devolu\xE7\xE3o."
        });
      }
      for (const [originalItemNumber, allocations] of allocationsByNumber) {
        const originalLine = sourceLineByNumber.get(originalItemNumber);
        const draftLine = originalLine && draftLineByOriginalId.get(originalLine.id);
        const linksForLine = draftLine ? (allocationLinks || []).filter((link) => link.draft_line_id === draftLine.id) : [];
        const expectedAllocationIds = allocations.map((allocation) => allocation.id).sort();
        const linkedAllocationIds = linksForLine.map((link) => link.allocation_id).sort();
        const expectedQuantity = allocations.reduce(
          (sum, allocation) => sum + allocation.quantity,
          0
        );
        if (!draftLine || Math.abs(Number(draftLine.quantity) - expectedQuantity) > 5e-5 || JSON.stringify(expectedAllocationIds) !== JSON.stringify(linkedAllocationIds)) {
          return res.status(409).json({
            success: false,
            error: "Os itens e quantidades do rascunho n\xE3o correspondem \xE0s aloca\xE7\xF5es persistidas da devolu\xE7\xE3o."
          });
        }
      }
      if (allocationsByNumber.size !== lines.length) {
        return res.status(409).json({
          success: false,
          error: "O rascunho cont\xE9m item sem aloca\xE7\xE3o fiscal correspondente \xE0 devolu\xE7\xE3o."
        });
      }
    }
    const { data: settingsRow, error: settingsError } = await db.from("settings").select("*").eq("id", "app").maybeSingle();
    if (settingsError || !settingsRow) {
      return res.status(503).json({ success: false, error: "Configura\xE7\xE3o fiscal indispon\xEDvel." });
    }
    const settings = asFiscalSettings(settingsRow.data || settingsRow);
    const fiscalDefaults = settings.fiscalDefaults;
    if (draft.operation_kind === "estorno") {
      const { data: sourceItems, error: sourceItemsError } = await db.from("nfe_document_items").select("id").eq("document_id", validatedSource.id);
      if (sourceItemsError || !sourceItems) {
        return res.status(409).json({ success: false, error: "N\xE3o foi poss\xEDvel ler os itens originais do estorno." });
      }
      const estornoItemError = validateEstornoItems({
        lines,
        sourceItemsCount: sourceItems.length,
        originalById,
        fiscalDefaults
      });
      if (estornoItemError) {
        return res.status(409).json({ success: false, error: estornoItemError });
      }
    }
    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    const password = process.env.NFE_CERTIFICATE_PASSWORD;
    if (!pfx) {
      return res.status(503).json({ success: false, error: "Certificado digital n\xE3o configurado." });
    }
    const certificate = extractCertificateAndKey(pfx, password || "");
    if (draft.status === "transmitting" || draft.status === "unknown") {
      if (previewOnly && draft.signed_xml) {
        return res.status(200).json({
          success: true,
          preview: true,
          xml: draft.signed_xml,
          accessKey: draft.access_key
        });
      }
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: true
      });
    }
    const review = draft.review_data;
    if (draft.operation_kind === "return") {
      if (!draft.return_order_id || !returnFiscalContext || !("context" in returnFiscalContext)) {
        return res.status(409).json({
          success: false,
          error: "A NF-e de devolu\xE7\xE3o n\xE3o possui v\xEDnculo fiscal eleg\xEDvel com a devolu\xE7\xE3o comercial."
        });
      }
      if (!returnFormRules || !returnXmlDefaults) {
        return res.status(409).json({
          success: false,
          error: "O cen\xE1rio da devolu\xE7\xE3o n\xE3o possui op\xE7\xF5es fiscais aprovadas."
        });
      }
      const fixedRecipient = normalizeReviewedFiscalBlock(
        extractXmlBlock(String(validatedSource.xml_nfe || ""), "dest"),
        "dest"
      );
      const submittedRecipient = normalizeReviewedFiscalBlock(
        String(review.recipient_xml || ""),
        "dest"
      );
      const fixedPayment = normalizeReviewedFiscalBlock(returnXmlDefaults.paymentXml, "pag");
      const submittedPayment = normalizeReviewedFiscalBlock(
        String(review.payment_xml || ""),
        "pag"
      );
      const fixedTransport = normalizeReviewedFiscalBlock(
        returnXmlDefaults.transportXml,
        "transp"
      );
      const submittedTransport = normalizeReviewedFiscalBlock(
        String(review.transport_xml || ""),
        "transp"
      );
      if (fixedRecipient !== submittedRecipient || fixedPayment !== submittedPayment || fixedTransport !== submittedTransport || String(review.nature_of_operation || "").trim() !== returnXmlDefaults.natureOfOperation) {
        return res.status(409).json({
          success: false,
          error: "Os campos estruturais da NF-e de devolu\xE7\xE3o divergem do cen\xE1rio fiscal permitido."
        });
      }
      for (const line of lines) {
        const original = originalById.get(line.original_document_item_id);
        if (!original)
          return res.status(409).json({ success: false, error: "Item original ausente." });
        const originalCfop = originalItemCfop(original.product_xml);
        const allowedCfops = getReturnCfopOptionsForSourceItem(
          originalCfop || "",
          original.taxes_xml
        );
        if (!allowedCfops.some((option) => option.value === line.reviewed_cfop)) {
          return res.status(409).json({
            success: false,
            error: `CFOP ${line.reviewed_cfop} n\xE3o \xE9 permitido para o item original e o cen\xE1rio de devolu\xE7\xE3o.`
          });
        }
        const expectedProduct = buildReturnProductXml({
          originalProductXml: original.product_xml,
          quantity: Number(line.quantity),
          originalQuantity: Number(original.billed_quantity),
          grossValue: Number(line.gross_value),
          discountValue: Number(line.discount_value),
          cfop: String(line.reviewed_cfop)
        });
        const expectedTaxes = buildProportionalReturnTaxesXml(
          original.taxes_xml,
          Number(line.quantity),
          Number(original.billed_quantity)
        );
        if (normalizeReviewedFiscalBlock(String(line.reviewed_product_xml), "prod") !== normalizeReviewedFiscalBlock(expectedProduct, "prod") || normalizeReviewedFiscalBlock(String(line.reviewed_taxes_xml), "imposto") !== normalizeReviewedFiscalBlock(expectedTaxes, "imposto")) {
          return res.status(409).json({
            success: false,
            error: "Item ou tributa\xE7\xE3o fiscal diverge da quantidade e refer\xEAncia originais da devolu\xE7\xE3o."
          });
        }
      }
    }
    let accessKey = draft.access_key;
    let signedXml = draft.signed_xml;
    let nfeNumber = 0;
    let series = "";
    let transmissionVersion = "";
    if (!accessKey || !signedXml) {
      for (let preparation = 0; preparation < 3; preparation++) {
        const issuedAt = brazilTimestamp(/* @__PURE__ */ new Date());
        const sourceAuthorizedAt = getAuthorizedAt(String(validatedSource.xml_protocolo || ""), "");
        const fiscalPeriod = (value) => value.match(/^(\d{4}-\d{2})/)?.[1] || "";
        const periodAdjustmentText = String(review.period_adjustment_text || "").trim();
        if (draft.operation_kind === "estorno" && (review.apportionment_review_confirmed !== true || !fiscalPeriod(sourceAuthorizedAt) || !fiscalPeriod(issuedAt) || fiscalPeriod(issuedAt) !== fiscalPeriod(sourceAuthorizedAt) && Array.from(periodAdjustmentText).length < 15)) {
          return res.status(409).json({
            success: false,
            error: "Confirme a revis\xE3o do per\xEDodo de apura\xE7\xE3o e informe diferen\xE7as/acr\xE9scimos do art. 298, \xA72\xBA, ou justifique por que n\xE3o se aplicam."
          });
        }
        const responsibleTechnician = getResponsibleTechnicianConfig(process.env, environment);
        if (!responsibleTechnician) {
          return res.status(503).json({
            success: false,
            error: "Configura\xE7\xE3o obrigat\xF3ria de respons\xE1vel t\xE9cnico/CSRT da NF-e indispon\xEDvel no servidor."
          });
        }
        const municipalityCode = String(settings.companyCMun || "").trim();
        if (!/^\d{7}$/.test(municipalityCode)) {
          return res.status(503).json({
            success: false,
            error: "C\xF3digo IBGE do munic\xEDpio do estabelecimento inv\xE1lido na configura\xE7\xE3o fiscal."
          });
        }
        const sequence = resolveNfeSequenceSettings(settings, "55", environment);
        series = sequence.series;
        const minimumNumber = sequence.minimumNumber;
        const { data: suggestedNumber, error: numberError } = await db.rpc("peek_nfe_outbound_number", {
          p_issuer_cnpj: String(validatedSource.chave_acesso).slice(6, 20),
          p_model: "55",
          p_series: series,
          p_environment: environment,
          p_minimum: minimumNumber
        });
        if (numberError || typeof suggestedNumber !== "number" || suggestedNumber < 1) {
          return res.status(503).json({
            success: false,
            numberReserved: false,
            error: "N\xE3o foi poss\xEDvel consultar a sequ\xEAncia fiscal para preparar o rascunho."
          });
        }
        nfeNumber = suggestedNumber;
        const generatedKey = generateNfeAccessKey({
          ufCode: "41",
          yearMonth: `${issuedAt.slice(2, 4)}${issuedAt.slice(5, 7)}`,
          cnpj: String(settings.companyCnpj || ""),
          model: "55",
          series,
          number: nfeNumber,
          emissionType: "1"
        });
        accessKey = generatedKey.accessKey;
        const baseXml = buildReviewedFiscalOperationXml({
          kind: draft.operation_kind === "estorno" ? "estorno" : "return",
          returnMethod: draft.operation_kind === "return" && returnFiscalContext && "context" in returnFiscalContext ? returnFiscalContext.context.returnOrder.returnMethod || void 0 : void 0,
          returnScenario: draft.operation_kind === "return" && returnFiscalContext && "context" in returnFiscalContext ? returnFiscalContext.context.operationContext : void 0,
          environment,
          originalEnvironment: environment,
          originalStatus: environment === 1 ? "autorizada" : "homologada",
          originalProtocol: String(validatedSource.numero_protocolo),
          originalAccessKey: String(validatedSource.chave_acesso),
          accessKey,
          randomCode: generatedKey.randomCode,
          checkDigit: generatedKey.checkDigit,
          nfeNumber,
          series,
          issuedAt,
          settings,
          natureOfOperation: String(draft.nature_of_operation || ""),
          originalOperationType: draft.operation_kind === "estorno" ? sourceOperationType : void 0,
          destinationIndicator: draft.operation_kind === "estorno" ? sourceDestinationIndicator : void 0,
          recipientXml: String(review.recipient_xml || ""),
          totalsXml: String(review.totals_xml || ""),
          transportXml: String(review.transport_xml || ""),
          paymentXml: String(review.payment_xml || ""),
          reason: String(review.reason || draft.reason || ""),
          periodAdjustmentText,
          lines: lines.map((line) => {
            const original = originalById.get(line.original_document_item_id);
            if (!original) {
              throw new Error(`Item original ${line.fiscal_item_number} n\xE3o encontrado.`);
            }
            return {
              originalItemNumber: Number(original.item_number),
              originalProductCode: original.product_code,
              originalDescription: original.description,
              originalNcm: readTag2(String(original.product_xml), "NCM") || void 0,
              originalCfop: originalItemCfop(original.product_xml) || void 0,
              originalTaxesXml: original.taxes_xml,
              originalUnitValue: Number(original.unit_value),
              billedQuantity: Number(original.billed_quantity),
              originalGrossValue: Number(original.gross_value),
              originalDiscountValue: Number(original.discount_value),
              quantity: Number(line.quantity),
              grossValue: Number(line.gross_value),
              discountValue: Number(line.discount_value),
              cfop: String(line.reviewed_cfop),
              productXml: String(line.reviewed_product_xml),
              taxesXml: String(line.reviewed_taxes_xml)
            };
          })
        });
        const xml = appendResponsibleTechnician(baseXml, accessKey, responsibleTechnician).replace(/>\s+</g, "><").trim();
        await validateUnsignedNfeStructure(xml);
        signedXml = signNfeXml(xml, certificate.privateKeyPem, certificate.certDerBase64);
        await validateNfeAgainstOfficialSchema(signedXml);
        assertDraftXmlMatchesReview({
          signedXml,
          certificatePem: certificate.certPem,
          draft,
          review,
          lines,
          originalById,
          sourceAccessKey: String(validatedSource.chave_acesso),
          environment,
          accessKey,
          series,
          number: nfeNumber,
          sourceOperationType,
          sourceDestinationIndicator
        });
        if (previewOnly) {
          return res.status(200).json({
            success: true,
            preview: true,
            xml: signedXml,
            accessKey,
            nfeNumber,
            series
          });
        }
        let prepared = null;
        try {
          prepared = await executePrepareDraftAttemptRpc(db, {
            draftId: draft.id,
            expectedUpdatedAt: draft.updated_at,
            reviewData: review,
            lines,
            signedXml,
            accessKey,
            minimumNumber
          });
        } catch {
          return res.status(503).json({
            success: false,
            pending: true,
            error: "A grava\xE7\xE3o da tentativa n\xE3o foi confirmada. Atualize a situa\xE7\xE3o fiscal antes de repetir; nenhuma transmiss\xE3o foi iniciada por esta requisi\xE7\xE3o."
          });
        }
        const { data: claimed, error: claimError } = prepared;
        if (claimError?.message?.includes("FISCAL_SEQUENCE_CHANGED") && preparation < 2) continue;
        if (claimError || claimed?.created !== true || claimed.draftId !== draft.id || claimed.accessKey !== accessKey || claimed.number !== nfeNumber || !claimed.updatedAt) {
          return res.status(409).json({
            success: false,
            pending: true,
            error: claimError?.message?.includes("FISCAL_SEQUENCE_CHANGED") ? "A numera\xE7\xE3o mudou durante a prepara\xE7\xE3o. Atualize a situa\xE7\xE3o fiscal antes de repetir." : "A prepara\xE7\xE3o n\xE3o foi confirmada ou outro processo alterou este rascunho. Atualize a situa\xE7\xE3o fiscal antes de repetir."
          });
        }
        reservedNfeNumber = nfeNumber;
        transmissionVersion = claimed.updatedAt;
        break;
      }
    } else {
      nfeNumber = Number(accessKey.slice(25, 34));
      series = String(Number(accessKey.slice(22, 25)));
      if (!hasResponsibleTechnicianCsrt(signedXml)) {
        return res.status(409).json({
          success: false,
          pending: true,
          error: "O XML assinado desta tentativa n\xE3o cont\xE9m CSRT. N\xE3o \xE9 seguro alter\xE1-lo durante retry; fa\xE7a reconcilia\xE7\xE3o fiscal antes de retransmitir."
        });
      }
      await validateNfeAgainstOfficialSchema(signedXml);
      assertDraftXmlMatchesReview({
        signedXml,
        certificatePem: certificate.certPem,
        draft,
        review,
        lines,
        originalById,
        sourceAccessKey: String(validatedSource.chave_acesso),
        environment,
        accessKey,
        series,
        number: nfeNumber,
        sourceOperationType,
        sourceDestinationIndicator
      });
      const { data: claimed, error: claimError } = await claimReadyDraftForTransmission(db, {
        draftId: draft.id,
        accessKey,
        expectedUpdatedAt: draft.updated_at
      });
      if (claimError || !claimed) {
        return res.status(409).json({
          success: false,
          pending: true,
          error: "Outro processo iniciou o rascunho. Consulte o estado antes de repetir."
        });
      }
      transmissionVersion = claimed.updated_at;
    }
    if (!accessKey || !signedXml) throw new Error("Tentativa fiscal sem chave/XML confirmados.");
    const batchXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${Date.now().toString().slice(-15)}</idLote><indSinc>1</indSinc>${embeddedNfeXml(signedXml)}</enviNFe>`;
    try {
      const { data: started, error: startError } = await confirmDraftTransmissionStart(db, {
        draftId: draft.id,
        accessKey,
        transmissionVersion
      });
      if (startError || !started) throw new Error("TRANSMISSION_START_NOT_CONFIRMED");
      transmissionVersion = started.updated_at;
    } catch {
      return res.status(503).json({
        success: false,
        pending: true,
        accessKey,
        error: "N\xE3o foi poss\xEDvel confirmar o in\xEDcio desta transmiss\xE3o. Atualize a situa\xE7\xE3o fiscal antes de repetir."
      });
    }
    let sefazXml;
    try {
      sefazXml = await sendSoapToSefaz({
        url: getNfeServiceEndpoint("55", environment, "NFeAutorizacao4"),
        action: "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote",
        xmlPayload: batchXml,
        certPem: certificate.certPem,
        privateKeyPem: certificate.privateKeyPem
      });
    } catch (error) {
      await db.from("nfe_operation_drafts").update({ status: "unknown", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", draft.id).eq("updated_at", transmissionVersion).eq("status", "transmitting");
      console.error(
        "[NF-e Draft] Conex\xE3o de autoriza\xE7\xE3o interrompida:",
        error instanceof Error ? error.message : "erro desconhecido"
      );
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: false
      });
    }
    const authorization = parseSefazAuthorization(sefazXml);
    if (authorization.authorized) {
      return persistDraftAuthorized({
        res,
        db,
        draft,
        lines,
        environment,
        responseXml: sefazXml,
        authorizedAccessKey: accessKey,
        authorizedSignedXml: signedXml
      });
    }
    if (isUncertainAuthorization(authorization.cStat, authorization.pending) || !matchesSefazTransmissionResponse(sefazXml, { accessKey, environment })) {
      await db.from("nfe_operation_drafts").update({
        status: "unknown",
        sefaz_response_xml: sefazXml,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", draft.id).eq("updated_at", transmissionVersion).eq("status", "transmitting");
      return reconcileStoredDraftAttempt({
        res,
        db,
        draft,
        lines,
        environment,
        certificate,
        allowRetryAfterNotFound: false
      });
    }
    const { data: rejectedDraft, error: rejectionSyncError } = await db.from("nfe_operation_drafts").update({
      status: "rejected",
      sefaz_response_xml: sefazXml,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", draft.id).eq("updated_at", transmissionVersion).eq("status", "transmitting").select("id").maybeSingle();
    if (rejectionSyncError || !rejectedDraft) {
      return res.status(503).json({
        success: false,
        pending: true,
        reconciliationRequired: true,
        accessKey,
        error: "O retorno fiscal n\xE3o foi confirmado na tentativa atual. Atualize a situa\xE7\xE3o antes de continuar; n\xE3o retransmita."
      });
    }
    return res.status(422).json({
      success: false,
      pending: false,
      status: "rejected",
      cStat: authorization.cStat,
      xMotivo: authorization.xMotivo,
      error: authorization.xMotivo || "A SEFAZ n\xE3o autorizou o documento."
    });
  } catch (error) {
    console.error(
      "[NF-e Draft] Erro no fluxo de emiss\xE3o:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    const message = error instanceof Error ? error.message : "Erro interno na emiss\xE3o fiscal.";
    const schemaFailure = message.startsWith("XML da NF-e n\xE3o passou pelo schema oficial");
    return res.status(schemaFailure ? 422 : 500).json({
      success: false,
      ...reservedNfeNumber ? { numberReserved: true, reservedNumber: reservedNfeNumber } : { numberReserved: false },
      error: schemaFailure && reservedNfeNumber ? `${message} O n\xFAmero ${reservedNfeNumber} j\xE1 foi consumido pela sequ\xEAncia; nenhuma transmiss\xE3o foi feita. Uma nova tentativa reservar\xE1 outro n\xFAmero.` : message
    });
  }
}
//# sourceMappingURL=transmit-operation-draft.cjs.map
