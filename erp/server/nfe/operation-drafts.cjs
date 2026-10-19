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

// api/nfe/operation-drafts.ts
var operation_drafts_exports = {};
__export(operation_drafts_exports, {
  default: () => handler
});
module.exports = __toCommonJS(operation_drafts_exports);

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

// api/nfe/orderEditReplacement.ts
async function hasPendingOrderEditEstorno(db, orderId, documentId, environment) {
  const { data, error } = await db.from("nfe_order_edit_replacements").select("id").eq("order_id", orderId).eq("original_document_id", documentId).eq("environment", environment).eq("reversal_kind", "estorno").eq("status", "awaiting_reversal").maybeSingle();
  return !error && Boolean(data);
}

// api/nfe/operation-drafts.ts
var import_supabase_js = require("@supabase/supabase-js");

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

// erp/src/pages/utils/nfe/fiscalCfopResolution.ts
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
  const mapped = normalizeCfop(config?.inverseCfopMappings?.[originalCfop]);
  const requiredEntryPrefix = originalCfop[0] === "5" ? "1" : "2";
  return mapped?.startsWith(requiredEntryPrefix) ? mapped : null;
}
function getEstornoCfopOptions(originalCfop, config) {
  const inverse = suggestEstornoCfop(originalCfop, config);
  if (inverse) return [{ value: inverse, label: `${inverse.slice(0, 1)}.${inverse.slice(1)} \xB7 CFOP inverso configurado` }];
  return ESTORNO_FALLBACK_CFOPS.map((value) => ({
    value,
    label: `${value.slice(0, 1)}.${value.slice(1)} \xB7 outra sa\xEDda n\xE3o especificada`
  }));
}

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

// erp/src/pages/utils/nfe/fiscalOperationXml.ts
var import_xmldom = require("@xmldom/xmldom");

// erp/src/pages/utils/nfe/nfeAccessKey.ts
function calculateMod11CheckDigit(base43) {
  return calculateAccessKeyDigit(base43);
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
function suggestReturnCfopForSourceItem(originalCfop, taxesXml, configuredCfop) {
  const options = getReturnCfopOptionsForSourceItem(originalCfop, taxesXml);
  const configured = String(configuredCfop || "").replace(/\D/g, "");
  if (configured && options.some((option) => option.value === configured)) return configured;
  const sourceDefinition = getCfopDefinition(originalCfop);
  const defaultCode = isSourceTaxedWithSt(taxesXml, originalCfop) ? "1411" : sourceDefinition?.merchandiseOrigin === "own_production" ? "1201" : "1202";
  return options.some((option) => option.value === defaultCode) ? defaultCode : null;
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

// api/nfe/operation-drafts.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function extractFiscalBlock(xml, name) {
  const prefix = "(?:[\\w.-]+:)?";
  return xml.match(new RegExp(`<${prefix}${name}\\b[^>]*>[\\s\\S]*?<\\/${prefix}${name}>`, "i"))?.[0] || "";
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET", "POST", "PUT"].includes(req.method || ""))
    return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const automaticReturnWorker = isAutomaticReturnWorkerAuthorized(
    req.headers[AUTOMATIC_RETURN_WORKER_SECRET_HEADER]
  );
  const fiscalAuthorization = automaticReturnWorker ? { ok: true, userId: null, isAdministrator: false } : await authorizeFiscalOperator(db, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({ error: fiscalAuthorization.message });
  try {
    if (req.method === "GET") {
      const draftId2 = String(req.query.id || "");
      if (!uuid.test(draftId2)) return res.status(400).json({ error: "Rascunho fiscal inv\xE1lido." });
      const { data: draft, error: draftError } = await db.from("nfe_operation_drafts").select(
        "id,operation_kind,finalidade,original_document_id,original_access_key,return_order_id,environment,status,reason,nature_of_operation,review_data,generated_xml,signed_xml,sefaz_response_xml,protocol_number,access_key,document_id,created_at,updated_at"
      ).eq("id", draftId2).maybeSingle();
      if (draftError) throw draftError;
      if (!draft) return res.status(404).json({ error: "Rascunho fiscal n\xE3o encontrado." });
      if (automaticReturnWorker && draft.operation_kind !== "return") {
        return res.status(403).json({ error: "O worker s\xF3 pode consultar rascunhos de devolu\xE7\xE3o." });
      }
      const { data: lines, error: linesError } = await db.from("nfe_operation_draft_lines").select(
        "id,original_document_item_id,fiscal_item_number,quantity,gross_value,discount_value,reviewed_cfop,reviewed_product_xml,reviewed_taxes_xml"
      ).eq("draft_id", draftId2).order("fiscal_item_number");
      if (linesError) throw linesError;
      if (!lines?.length)
        return res.status(409).json({ error: "Rascunho fiscal sem itens de origem." });
      const sourceIds = lines.map((line) => line.original_document_item_id);
      const [sourceResult, settingsResult, sourceDocumentResult] = await Promise.all([
        db.from("nfe_document_items").select(
          "id,document_id,item_number,product_code,description,billed_quantity,unit_value,gross_value,discount_value,product_xml,taxes_xml"
        ).in("id", sourceIds),
        db.from("settings").select("data").eq("id", "app").maybeSingle(),
        db.from("nfe_documents").select("id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_nfe,serie,numero_protocolo,xml_protocolo,xml_nfe").eq("id", draft.original_document_id).maybeSingle()
      ]);
      if (sourceResult.error || settingsResult.error || sourceDocumentResult.error || !sourceDocumentResult.data) {
        throw sourceResult.error || settingsResult.error || sourceDocumentResult.error || new Error("Documento fiscal original ausente.");
      }
      const originalById = new Map((sourceResult.data || []).map((item) => [item.id, item]));
      const fiscalSettings = settingsResult.data?.data?.fiscalDefaults;
      const reviewedLines = lines.map((line) => {
        const original = originalById.get(line.original_document_item_id);
        if (!original || original.document_id !== draft.original_document_id) {
          throw new Error("Linha fiscal de origem inconsistente no rascunho.");
        }
        const originalCfop = originalItemCfop(original.product_xml);
        const allowedReturnCfops = draft.operation_kind === "return" ? getReturnCfopOptionsForSourceItem(originalCfop || "", original.taxes_xml) : [];
        const allowedEstornoCfops = draft.operation_kind === "estorno" ? getEstornoCfopOptions(originalCfop, fiscalSettings) : [];
        return {
          ...line,
          originalItemNumber: original.item_number,
          originalDescription: original.description,
          originalProductCode: original.product_code,
          originalQuantity: original.billed_quantity,
          originalUnitValue: original.unit_value,
          originalGrossValue: original.gross_value,
          originalDiscountValue: original.discount_value,
          originalProductXml: original.product_xml,
          originalTaxesXml: original.taxes_xml,
          originalCfop,
          allowedCfops: draft.operation_kind === "estorno" ? allowedEstornoCfops : allowedReturnCfops.map(({ value, label }) => ({ value, label })),
          suggestedCfop: draft.operation_kind === "estorno" ? suggestEstornoCfop(originalCfop, fiscalSettings) : suggestReturnCfopForSourceItem(
            originalCfop || "",
            original.taxes_xml,
            fiscalSettings?.returnCfop
          )
        };
      });
      const originalXml = String(sourceDocumentResult.data.xml_nfe || "");
      let fiscalReturnContext = null;
      if (draft.operation_kind === "return" && draft.return_order_id) {
        const sourceContext = await loadReturnFiscalSourceContext(
          db,
          draft.original_document_id,
          draft.return_order_id,
          Number(draft.environment),
          { allowConsumedAllocations: draft.status === "authorized" }
        );
        if ("error" in sourceContext)
          return res.status(409).json({ error: sourceContext.error });
        fiscalReturnContext = sourceContext.context;
      }
      const returnFormRules = fiscalReturnContext ? getFiscalFormRules("return", fiscalReturnContext.operationContext) : null;
      const returnXmlDefaults = returnFormRules ? getFiscalFormXmlDefaults(returnFormRules) : null;
      if (draft.operation_kind === "return" && !returnXmlDefaults) {
        return res.status(409).json({
          error: returnFormRules?.blockReason || "UNSUPPORTED_BY_ERP: contexto fiscal da devolu\xE7\xE3o incompleto."
        });
      }
      if (draft.operation_kind === "return" && (!fiscalReturnContext || !returnXmlDefaults)) {
        return res.status(409).json({
          error: "O cen\xE1rio da devolu\xE7\xE3o n\xE3o possui op\xE7\xF5es fiscais aprovadas para revis\xE3o."
        });
      }
      const lastSefazResult = draft.sefaz_response_xml ? parseSefazAuthorization(String(draft.sefaz_response_xml)) : null;
      return res.status(200).json({
        success: true,
        draft,
        lastSefazResult: lastSefazResult ? { cStat: lastSefazResult.cStat, xMotivo: lastSefazResult.xMotivo } : null,
        source: {
          id: sourceDocumentResult.data.id,
          order_id: sourceDocumentResult.data.order_id,
          modelo: sourceDocumentResult.data.modelo,
          ambiente: sourceDocumentResult.data.ambiente,
          chave_acesso: sourceDocumentResult.data.chave_acesso,
          numero_nfe: sourceDocumentResult.data.numero_nfe,
          serie: sourceDocumentResult.data.serie
        },
        returnOrder: fiscalReturnContext ? {
          id: fiscalReturnContext.returnOrder.id,
          orderIndex: fiscalReturnContext.returnOrder.order_index,
          returnMethod: fiscalReturnContext.returnOrder.returnMethod,
          operationContext: {
            issuerUf: fiscalReturnContext.operationContext.issuerUf,
            recipientUf: fiscalReturnContext.operationContext.recipientUf,
            scope: fiscalReturnContext.operationContext.scope,
            returnMethod: fiscalReturnContext.operationContext.returnMethod,
            recipientFiscalStatus: fiscalReturnContext.operationContext.recipientFiscalStatus,
            isFinalConsumer: fiscalReturnContext.operationContext.isFinalConsumer,
            taxRegime: fiscalReturnContext.operationContext.taxRegime
          }
        } : null,
        lines: reviewedLines,
        reviewTemplate: {
          recipient_xml: extractFiscalBlock(originalXml, "dest"),
          totals_xml: extractFiscalBlock(originalXml, "total"),
          transport_xml: returnXmlDefaults?.transportXml || (draft.operation_kind === "return" ? "" : "<transp><modFrete>9</modFrete></transp>"),
          payment_xml: returnXmlDefaults?.paymentXml || (draft.operation_kind === "return" ? "" : "<pag><detPag><tPag>90</tPag><vPag>0.00</vPag></detPag></pag>")
        }
      });
    }
    if (req.method === "PUT") {
      const draftId2 = String(req.body?.draftId || "");
      const reviewData = req.body?.reviewData;
      const lines = req.body?.lines;
      if (!uuid.test(draftId2) || !reviewData || !Array.isArray(lines)) {
        return res.status(400).json({ error: "Revis\xE3o fiscal inv\xE1lida ou incompleta." });
      }
      let normalizedLines;
      try {
        normalizedLines = lines.map((line) => ({
          draft_line_id: String(line.draft_line_id || ""),
          cfop: String(line.cfop || ""),
          product_xml: normalizeReviewedFiscalBlock(String(line.product_xml || ""), "prod"),
          taxes_xml: normalizeReviewedFiscalBlock(String(line.taxes_xml || ""), "imposto")
        }));
      } catch (error) {
        return res.status(400).json({
          error: error instanceof Error ? error.message : "Bloco fiscal de item inv\xE1lido."
        });
      }
      const { data: draftForReview, error: draftForReviewError } = await db.from("nfe_operation_drafts").select("id,operation_kind,finalidade,original_document_id,return_order_id,environment,status,reason,nature_of_operation").eq("id", draftId2).maybeSingle();
      if (draftForReviewError) throw draftForReviewError;
      if (!draftForReview) return res.status(404).json({ error: "Rascunho fiscal n\xE3o encontrado." });
      if (automaticReturnWorker && draftForReview.operation_kind !== "return") {
        return res.status(403).json({ error: "O worker s\xF3 pode revisar rascunhos de devolu\xE7\xE3o." });
      }
      if (draftForReview.operation_kind === "return" && draftForReview.return_order_id) {
        const sourceContext = await loadReturnFiscalSourceContext(
          db,
          draftForReview.original_document_id,
          draftForReview.return_order_id,
          Number(draftForReview.environment)
        );
        if ("error" in sourceContext)
          return res.status(409).json({ error: sourceContext.error });
        const returnFormRules = getFiscalFormRules(
          "return",
          sourceContext.context.operationContext
        );
        const returnXmlDefaults = getFiscalFormXmlDefaults(returnFormRules);
        if (!returnXmlDefaults || !returnFormRules.allowedModels.includes(
          String(sourceContext.context.source.modelo)
        ) || !returnFormRules.allowedFinalidades.includes(Number(draftForReview.finalidade))) {
          return res.status(409).json({
            error: "Modelo, finalidade ou op\xE7\xF5es fiscais incompat\xEDveis com a devolu\xE7\xE3o."
          });
        }
        let expectedRecipient = "";
        let submittedRecipient = "";
        let expectedPayment = "";
        let submittedPayment = "";
        let expectedTransport = "";
        let submittedTransport = "";
        try {
          expectedRecipient = normalizeReviewedFiscalBlock(
            extractFiscalBlock(sourceContext.context.source.xml_nfe || "", "dest"),
            "dest"
          );
          submittedRecipient = normalizeReviewedFiscalBlock(
            String(reviewData.recipient_xml || ""),
            "dest"
          );
          expectedPayment = normalizeReviewedFiscalBlock(
            returnXmlDefaults.paymentXml,
            "pag"
          );
          submittedPayment = normalizeReviewedFiscalBlock(
            String(reviewData.payment_xml || ""),
            "pag"
          );
          expectedTransport = normalizeReviewedFiscalBlock(
            returnXmlDefaults.transportXml,
            "transp"
          );
          submittedTransport = normalizeReviewedFiscalBlock(
            String(reviewData.transport_xml || ""),
            "transp"
          );
        } catch {
          return res.status(400).json({
            error: "Destinat\xE1rio, pagamento ou transporte n\xE3o formam um bloco XML v\xE1lido para devolu\xE7\xE3o."
          });
        }
        if (submittedRecipient !== expectedRecipient || submittedPayment !== expectedPayment || submittedTransport !== expectedTransport || String(reviewData.nature_of_operation || "").trim() !== returnXmlDefaults.natureOfOperation) {
          return res.status(409).json({
            error: "Na devolu\xE7\xE3o, destinat\xE1rio, natureza, pagamento sem pagamento e transporte s\xE3o determinados pelo contexto fiscal."
          });
        }
        const { data: returnLines, error: returnLinesError } = await db.from("nfe_operation_draft_lines").select("id,original_document_item_id,quantity,gross_value,discount_value").eq("draft_id", draftId2);
        if (returnLinesError || !returnLines?.length)
          return res.status(409).json({ error: "Rascunho de devolu\xE7\xE3o sem itens fiscais." });
        const sourceLines = new Map(sourceContext.context.lines.map((line) => [line.id, line]));
        const draftLineById = new Map(returnLines.map((line) => [line.id, line]));
        if (normalizedLines.length !== returnLines.length)
          return res.status(409).json({ error: "A revis\xE3o deve cobrir todos os itens da devolu\xE7\xE3o." });
        for (const line of normalizedLines) {
          const draftLine = draftLineById.get(line.draft_line_id);
          const sourceLine = draftLine && sourceLines.get(draftLine.original_document_item_id);
          if (!draftLine || !sourceLine || sourceLine.document_id !== draftForReview.original_document_id) {
            return res.status(409).json({ error: "Item fiscal n\xE3o pertence \xE0 NF-e original desta devolu\xE7\xE3o." });
          }
          const originalCfop = originalItemCfop(sourceLine.product_xml);
          const allowedCfops = getReturnCfopOptionsForSourceItem(
            originalCfop || "",
            sourceLine.taxes_xml
          );
          if (!allowedCfops.some((option) => option.value === line.cfop)) {
            return res.status(409).json({
              error: `CFOP ${line.cfop} n\xE3o \xE9 permitido para a origem, tributa\xE7\xE3o e escopo do item devolvido.`
            });
          }
          const expectedProduct = buildReturnProductXml({
            originalProductXml: sourceLine.product_xml,
            quantity: Number(draftLine.quantity),
            originalQuantity: Number(sourceLine.billed_quantity),
            grossValue: Number(draftLine.gross_value),
            discountValue: Number(draftLine.discount_value),
            cfop: line.cfop
          });
          const expectedTaxes = buildProportionalReturnTaxesXml(
            sourceLine.taxes_xml,
            Number(draftLine.quantity),
            Number(sourceLine.billed_quantity)
          );
          if (normalizeReviewedFiscalBlock(line.product_xml, "prod") !== normalizeReviewedFiscalBlock(expectedProduct, "prod") || normalizeReviewedFiscalBlock(line.taxes_xml, "imposto") !== normalizeReviewedFiscalBlock(expectedTaxes, "imposto")) {
            return res.status(409).json({
              error: "A revis\xE3o alterou campos estruturais ou tributos fora do c\xE1lculo proporcional permitido para a devolu\xE7\xE3o."
            });
          }
        }
      }
      if (draftForReview.operation_kind === "estorno") {
        const reason2 = String(reviewData.reason || draftForReview.reason || "").trim();
        if (Number(draftForReview.finalidade) !== 3 || String(reviewData.nature_of_operation || "").trim() !== ESTORNO_NATURE_OF_OPERATION || reason2.length < 15 || Array.from(reason2).length > 255 || reviewData.item_taxes_confirmed !== true || reviewData.totals_confirmed !== true || reviewData.apportionment_review_confirmed !== true || typeof reviewData.period_adjustment_text !== "string" || Array.from(reviewData.period_adjustment_text).length > 1200) {
          return res.status(409).json({
            error: "Estorno exige natureza e finalidade fixas, justificativa v\xE1lida e revis\xE3o fiscal confirmada."
          });
        }
        const { data: draftLines, error: draftLinesError } = await db.from("nfe_operation_draft_lines").select("id,original_document_item_id,quantity,gross_value,discount_value").eq("draft_id", draftId2);
        if (draftLinesError || !draftLines?.length || draftLines.length !== normalizedLines.length) {
          return res.status(409).json({ error: "A revis\xE3o deve cobrir todos os itens do estorno." });
        }
        const { data: sourceItems, error: sourceItemsError } = await db.from("nfe_document_items").select("id,document_id,billed_quantity,gross_value,discount_value,product_xml,taxes_xml").in("id", draftLines.map((line) => line.original_document_item_id));
        const { data: settingsRow, error: settingsError } = await db.from("settings").select("data").eq("id", "app").maybeSingle();
        if (sourceItemsError || settingsError || !sourceItems || sourceItems.length !== draftLines.length) {
          return res.status(409).json({ error: "N\xE3o foi poss\xEDvel conferir todos os itens originais do estorno." });
        }
        const fiscalDefaults = settingsRow?.data?.fiscalDefaults;
        const draftLinesById = new Map(draftLines.map((line) => [line.id, line]));
        const sourceItemsById = new Map(sourceItems.map((line) => [line.id, line]));
        const allSourceItems = await db.from("nfe_document_items").select("id").eq("document_id", draftForReview.original_document_id);
        if (allSourceItems.error || !allSourceItems.data || allSourceItems.data.length !== draftLines.length) {
          return res.status(409).json({ error: "O estorno precisa conter todos os itens fiscais originais." });
        }
        for (const reviewed of normalizedLines) {
          const draftLine = draftLinesById.get(reviewed.draft_line_id);
          const sourceLine = draftLine && sourceItemsById.get(draftLine.original_document_item_id);
          if (!draftLine || !sourceLine || sourceLine.document_id !== draftForReview.original_document_id) {
            return res.status(409).json({ error: "Item fiscal do estorno n\xE3o pertence \xE0 NF-e original." });
          }
          const sourceCfop = originalItemCfop(String(sourceLine.product_xml));
          const allowedEstornoCfops = getEstornoCfopOptions(sourceCfop, fiscalDefaults);
          const cfopIsValid = allowedEstornoCfops.some((option) => option.value === reviewed.cfop);
          if (!/^[56]\d{3}$/.test(sourceCfop || "") || !cfopIsValid || Math.abs(Number(draftLine.quantity) - Number(sourceLine.billed_quantity)) > 5e-5 || Math.abs(Number(draftLine.gross_value) - Number(sourceLine.gross_value)) > 5e-3 || Math.abs(Number(draftLine.discount_value) - Number(sourceLine.discount_value)) > 5e-3) {
            return res.status(409).json({
              error: "Item do estorno diverge da origem ou n\xE3o usa o CFOP inverso fiscalmente conferido."
            });
          }
          const expectedProduct = buildReturnProductXml({
            originalProductXml: String(sourceLine.product_xml),
            quantity: Number(sourceLine.billed_quantity),
            originalQuantity: Number(sourceLine.billed_quantity),
            grossValue: Number(sourceLine.gross_value),
            discountValue: Number(sourceLine.discount_value),
            cfop: reviewed.cfop
          });
          if (normalizeReviewedFiscalBlock(reviewed.product_xml, "prod") !== normalizeReviewedFiscalBlock(expectedProduct, "prod")) {
            return res.status(409).json({
              error: "O item do estorno precisa preservar os dados fiscais e valores originais."
            });
          }
        }
      }
      const { data: savedId, error: reviewError } = await db.rpc(
        "save_nfe_operation_draft_review",
        {
          p_draft_id: draftId2,
          p_review_data: reviewData,
          p_lines: normalizedLines,
          p_user_id: fiscalAuthorization.userId
        }
      );
      if (reviewError || !savedId)
        return res.status(409).json({ error: reviewError?.message || "N\xE3o foi poss\xEDvel registrar a revis\xE3o fiscal." });
      return res.status(200).json({ success: true, draftId: savedId, status: "ready" });
    }
    const kind = String(req.body?.kind || "");
    const originalDocumentId = String(req.body?.originalDocumentId || "");
    const returnOrderId = req.body?.returnOrderId ? String(req.body.returnOrderId) : null;
    const environment = Number(req.body?.environment);
    const reason = String(req.body?.reason || "").trim();
    if (automaticReturnWorker && (kind !== "return" || !returnOrderId)) {
      return res.status(403).json({ error: "O worker s\xF3 pode preparar rascunhos de devolu\xE7\xE3o vinculados." });
    }
    if (!["estorno", "return"].includes(kind) || !uuid.test(originalDocumentId) || returnOrderId !== null && !uuid.test(returnOrderId) || ![1, 2].includes(environment)) {
      return res.status(400).json({ error: "Tipo, origem, devolu\xE7\xE3o ou ambiente fiscal inv\xE1lido." });
    }
    const { data: source, error: sourceError } = await db.from("nfe_documents").select(
      "id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,xml_nfe,numero_nfe,serie,created_at"
    ).eq("id", originalDocumentId).maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) {
      return res.status(409).json({ error: "Documento fiscal original ausente." });
    }
    const sourceAuthorizationError = validateAuthorizedOutboundNfe(
      source,
      String(source?.order_id || ""),
      environment,
      { allowNfceSource: kind === "estorno" }
    );
    if (sourceAuthorizationError)
      return res.status(409).json({ error: sourceAuthorizationError });
    if (kind === "estorno") {
      if (returnOrderId || req.body?.operationDidNotOccur !== true || req.body?.goodsDidNotCirculate !== true || reason.length < 15)
        return res.status(400).json({
          error: "Confirme opera\xE7\xE3o n\xE3o realizada, aus\xEAncia de circula\xE7\xE3o e justifique o estorno."
        });
      const { data: order, error: orderError } = await db.from("orders").select(
        "id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_data"
      ).eq("id", source.order_id).maybeSingle();
      if (orderError) throw orderError;
      if (!order || !["cancelled", "cancelado"].includes(order.status) && !(order.status === "scheduled" && await hasPendingOrderEditEstorno(db, source.order_id, source.id, environment)) || getGoodsCirculationState(order) !== "none") {
        return res.status(409).json({
          error: "O estorno exige pedido cancelado ou substitui\xE7\xE3o por edi\xE7\xE3o registrada, sem entrega/retirada confirmada nem opera\xE7\xE3o em andamento."
        });
      }
      const authorizedAt = getAuthorizedAt(source.xml_protocolo || "", "");
      const policy = getFiscalCancellationPolicy({
        model: source.modelo,
        authorizedAt,
        status: source.status,
        environment: source.ambiente,
        goodsCirculated: false,
        operationDidNotOccur: true,
        issuerUf: String(source.chave_acesso || "").slice(0, 2) === "41" ? "PR" : ""
      });
      if (policy.action !== "estorno") {
        return res.status(409).json({
          error: policy.reason || "A pol\xEDtica fiscal n\xE3o autorizou a prepara\xE7\xE3o do estorno."
        });
      }
    } else if (!returnOrderId) {
      return res.status(400).json({ error: "Informe a devolu\xE7\xE3o comercial atendida." });
    } else {
      const sourceContext = await loadReturnFiscalSourceContext(
        db,
        originalDocumentId,
        returnOrderId,
        environment
      );
      if ("error" in sourceContext)
        return res.status(409).json({ error: sourceContext.error });
    }
    const { data: draftId, error: prepareError } = await db.rpc("prepare_nfe_operation_draft", {
      p_kind: kind,
      p_original_document_id: originalDocumentId,
      p_return_order_id: returnOrderId,
      p_environment: environment,
      p_reason: kind === "estorno" ? reason : null,
      p_user_id: fiscalAuthorization.userId
    });
    if (prepareError || !draftId)
      return res.status(409).json({ error: prepareError?.message || "N\xE3o foi poss\xEDvel preparar o rascunho fiscal." });
    return res.status(200).json({ success: true, draftId, status: "draft" });
  } catch (error) {
    console.error(
      "[NF-e Draft] Erro ao preparar/ler documento fiscal:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel acessar o rascunho fiscal." });
  }
}
//# sourceMappingURL=operation-drafts.cjs.map
