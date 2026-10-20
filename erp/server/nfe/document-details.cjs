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

// api/nfe/document-details.ts
var document_details_exports = {};
__export(document_details_exports, {
  default: () => handler
});
module.exports = __toCommonJS(document_details_exports);

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

// api/nfe/document-details.ts
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

// shared-utils/fiscalIdentifiers.ts
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

// erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgeRules.types.ts
var isFiscalRegularizationBlockingStatus = (status) => status === "regularization_failed" || status === "regularization_uncertain";

// erp/src/pages/utils/nfe/orderFiscalBadge/fiscalDocumentPredicates.ts
var FISCAL_REJECTION_STATUSES = /* @__PURE__ */ new Set(["rejeitada", "denegada"]);
var newestFirst = (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""));
var productionFirst = (a, b) => Number(a.ambiente === 2) - Number(b.ambiente === 2) || newestFirst(a, b);
var isAuthorizedFiscalDocument = (document) => document.status === "autorizada" || document.status === "homologada";
var isOutboundFiscalDocument = (document) => (document.document_type || "outbound") === "outbound";

// erp/src/pages/utils/nfe/orderFiscalBadge/operationBadgeRules.ts
var resolveFiscalOperationBadge = (documents, drafts, documentType) => {
  const operationDocuments = documents.filter((document) => document.document_type === documentType);
  const authorizedDocument = operationDocuments.filter(isAuthorizedFiscalDocument).sort(productionFirst)[0];
  const cancelledDocument = operationDocuments.filter((document) => document.status.toLowerCase() === "cancelada").sort(productionFirst)[0];
  const rejectedDocument = operationDocuments.filter((document) => FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase())).sort(productionFirst)[0];
  const failedDocument = operationDocuments.filter((document) => document.status.toLowerCase() === "erro").sort(productionFirst)[0];
  const latestDraft = drafts.filter((draft) => draft.operation_kind === documentType).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
  if (authorizedDocument) {
    return {
      status: "issued",
      documentId: authorizedDocument.id,
      environment: authorizedDocument.ambiente === 2 ? 2 : 1
    };
  }
  if (cancelledDocument) {
    return {
      status: "cancelled",
      documentId: cancelledDocument.id,
      environment: cancelledDocument.ambiente === 2 ? 2 : 1
    };
  }
  if (latestDraft) {
    const draftStatus = latestDraft.status.toLowerCase();
    const draftId = latestDraft.id;
    if (draftStatus === "rejected") {
      return { status: "rejected", draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === "transmitting" || draftStatus === "unknown") {
      return { status: "pending", draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === "draft" || draftStatus === "ready") {
      return { status: "prepared", draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === "authorized") {
      return { status: "issued", draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
  }
  if (rejectedDocument) {
    return {
      status: "rejected",
      documentId: rejectedDocument.id,
      environment: rejectedDocument.ambiente === 2 ? 2 : 1
    };
  }
  if (!failedDocument) return {};
  return {
    status: "failed",
    documentId: failedDocument.id,
    environment: failedDocument.ambiente === 2 ? 2 : 1
  };
};
var resolveOrderFiscalEstornoBadge = (documents, drafts = []) => {
  const badge = resolveFiscalOperationBadge(documents, drafts, "estorno");
  if (!badge.status) return {};
  return {
    estornoStatus: badge.status,
    estornoDocumentId: badge.documentId,
    estornoDraftId: badge.draftId,
    estornoEnvironment: badge.environment
  };
};
var resolveOrderFiscalDevolucaoBadge = (documents, drafts = []) => {
  const badge = resolveFiscalOperationBadge(documents, drafts, "return");
  if (!badge.status) return {};
  return {
    devolucaoStatus: badge.status,
    devolucaoDocumentId: badge.documentId,
    devolucaoEnvironment: badge.environment
  };
};

// erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalSituationClassifier.ts
var isAuthorized = isAuthorizedFiscalDocument;
var isOutbound = isOutboundFiscalDocument;
var getEstornoConfirmedDocumentIds = (documents, drafts) => {
  const confirmed = /* @__PURE__ */ new Set();
  for (const draft of drafts) {
    if (draft.operation_kind === "estorno" && draft.status === "authorized" && draft.original_document_id) {
      confirmed.add(draft.original_document_id);
    }
  }
  return confirmed;
};
var resolveOrderFiscalBadgeStatus = (documents, estornoConfirmedIds) => {
  const outboundDocuments = documents.filter(isOutbound);
  const activeAuthorized = outboundDocuments.filter(
    (document) => isAuthorized(document) && String(document.cancellationEventStatus || "").toLowerCase() !== "registered"
  );
  if (activeAuthorized.length > 0) {
    if (estornoConfirmedIds && activeAuthorized.every((doc) => doc.id && estornoConfirmedIds.has(doc.id))) {
      return "reversed";
    }
    return "issued";
  }
  if (outboundDocuments.some(
    (document) => String(document.cancellationEventStatus || "").toLowerCase() === "registered"
  )) {
    return "cancelled";
  }
  if (outboundDocuments.some(
    (document) => FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase())
  )) {
    return "rejected";
  }
  if (outboundDocuments.some((document) => document.status.toLowerCase() === "erro")) {
    return "failed";
  }
  if (outboundDocuments.some((document) => document.status === "cancelada")) {
    return "cancelled";
  }
  return "not_issued";
};
var classifyDocumentRegularization = (document, context) => {
  const id = document.id || "";
  const cancellationEvent = String(document.cancellationEventStatus || "").toLowerCase();
  const formallyCancelled = String(document.status || "").toLowerCase() === "cancelada" || cancellationEvent === "registered";
  if (formallyCancelled) return { document, state: "confirmed", via: "cancel" };
  if (id && context.estornoConfirmedIds.has(id)) {
    return { document, state: "confirmed", via: "estorno" };
  }
  const draftStatus = String(context.latestEstornoDraftByDocumentId.get(id)?.status || "").toLowerCase();
  if (cancellationEvent === "rejected" || draftStatus === "rejected") {
    return { document, state: "failed" };
  }
  if (cancellationEvent === "unknown" || cancellationEvent === "transmitting" || draftStatus === "unknown" || draftStatus === "transmitting") {
    return { document, state: "uncertain" };
  }
  if (id && context.replacementsByDocumentId.get(id)?.status === "awaiting_reversal") {
    return { document, state: "uncertain" };
  }
  return { document, state: "none" };
};
var newestCreatedAt = (a, b) => newestFirst(a.document, b.document);
var resolveEnvironmentBadge = (environmentDocuments, legacyStatus, context) => {
  const classified = environmentDocuments.filter((document) => isAuthorized(document) || String(document.status || "").toLowerCase() === "cancelada").map((document) => classifyDocumentRegularization(document, context));
  const failed = classified.filter((item) => item.state === "failed").sort(newestCreatedAt)[0];
  if (failed) return { status: "regularization_failed", documentId: failed.document.id };
  const uncertain = classified.filter((item) => item.state === "uncertain").sort(newestCreatedAt)[0];
  if (uncertain) return { status: "regularization_uncertain", documentId: uncertain.document.id };
  if (!classified.length || classified.some((item) => item.state === "none")) {
    return { status: legacyStatus };
  }
  const latestClosure = [...classified].sort(newestCreatedAt)[0];
  const closureStatus = latestClosure.via === "estorno" ? "reversed" : "cancelled";
  if (context.orderCancelled) return { status: closureStatus };
  const awaitingNewEmission = classified.some((item) => {
    const replacement = item.document.id ? context.replacementsByDocumentId.get(item.document.id) : void 0;
    return Boolean(replacement) && replacement?.status !== "completed";
  });
  if (!awaitingNewEmission) return { status: closureStatus };
  const latestOutbound = environmentDocuments.filter((document) => document.id).sort(newestFirst)[0];
  return { status: "reissue_required", documentId: latestOutbound?.id };
};
var buildFiscalSituationContext = (documents, drafts, orderCancelled, replacements) => {
  const latestEstornoDraftByDocumentId = /* @__PURE__ */ new Map();
  for (const draft of [...drafts].sort(
    (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))
  )) {
    if (draft.operation_kind !== "estorno" || !draft.original_document_id) continue;
    if (!latestEstornoDraftByDocumentId.has(draft.original_document_id)) {
      latestEstornoDraftByDocumentId.set(draft.original_document_id, draft);
    }
  }
  return {
    estornoConfirmedIds: getEstornoConfirmedDocumentIds(documents, drafts),
    latestEstornoDraftByDocumentId,
    replacementsByDocumentId: new Map(
      replacements.map((replacement) => [replacement.original_document_id, replacement])
    ),
    orderCancelled
  };
};

// erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalCancellationRules.ts
var isAuthorized2 = isAuthorizedFiscalDocument;
var isOutbound2 = isOutboundFiscalDocument;
var resolveOrderCancellationState = (outboundDocs, operationDrafts, orderCancelled, now) => {
  const latestCancellationEvent = outboundDocs.filter((document) => document.cancellationEventStatus).sort(
    (a, b) => String(b.cancellationEventRequestedAt || b.created_at || "").localeCompare(
      String(a.cancellationEventRequestedAt || a.created_at || "")
    )
  )[0];
  const cancellationEventState = String(latestCancellationEvent?.cancellationEventStatus || "").toLowerCase();
  if (cancellationEventState === "rejected") return "failed";
  if (cancellationEventState === "unknown") return "verify";
  if (cancellationEventState === "transmitting") {
    const requestedAt = new Date(latestCancellationEvent?.cancellationEventRequestedAt || "").getTime();
    return Number.isFinite(requestedAt) && now - requestedAt < 3e4 ? "pending" : "verify";
  }
  if (!cancellationEventState && orderCancelled && outboundDocs.some(isAuthorized2) && !operationDrafts.some((draft) => draft.operation_kind === "estorno")) {
    return "pending";
  }
  return void 0;
};
var resolveCancellationDocuments = (outboundDocs, operationDrafts, orderCancelled, now) => {
  return outboundDocs.filter((document) => Boolean(document.id) && isAuthorized2(document)).flatMap((document) => {
    const state = String(document.cancellationEventStatus || "").toLowerCase();
    const cancellationStatus = state === "rejected" ? "failed" : state === "unknown" || state === "registered" ? "verify" : state === "transmitting" ? (() => {
      const requestedAt = new Date(document.cancellationEventRequestedAt || "").getTime();
      return Number.isFinite(requestedAt) && now - requestedAt < 3e4 ? "pending" : "verify";
    })() : orderCancelled && !operationDrafts.some(
      (draft) => draft.operation_kind === "estorno" && draft.original_document_id === document.id
    ) ? "pending" : void 0;
    return cancellationStatus ? [
      {
        documentId: document.id,
        environment: document.ambiente === 2 ? 2 : 1,
        state: cancellationStatus
      }
    ] : [];
  });
};
var findDocumentIdByStatus = (environmentDocuments, status, estornoConfirmedIds) => {
  const matchingDocuments = environmentDocuments.filter((document) => {
    if (status === "failed") return document.status.toLowerCase() === "erro";
    if (status === "rejected") {
      return FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase());
    }
    if (status === "cancelled") {
      return isOutbound2(document) && document.status === "cancelada" || String(document.cancellationEventStatus || "").toLowerCase() === "registered";
    }
    if (status === "issued") {
      return isOutbound2(document) && isAuthorized2(document) && String(document.cancellationEventStatus || "").toLowerCase() !== "registered" && !Boolean(document.id && estornoConfirmedIds.has(document.id));
    }
    if (status === "reversed") {
      return isOutbound2(document) && isAuthorized2(document) && Boolean(document.id && estornoConfirmedIds.has(document.id));
    }
    return false;
  });
  return matchingDocuments.sort(
    (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))
  )[0]?.id;
};

// erp/src/pages/utils/nfe/orderFiscalBadge/orderFiscalBadgePairResolver.ts
var isOutbound3 = isOutboundFiscalDocument;
var isAuthorized3 = isAuthorizedFiscalDocument;
var resolveOrderFiscalBadgePair = (documents, operationDrafts = [], orderCancelled = false, now = Date.now(), orderEditReplacements = []) => {
  const outboundDocs = documents.filter(isOutbound3);
  const prodDocs = outboundDocs.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = outboundDocs.filter((doc) => doc.ambiente === 2);
  const estornoConfirmedIds = getEstornoConfirmedDocumentIds(documents, operationDrafts);
  const situationContext = buildFiscalSituationContext(
    documents,
    operationDrafts,
    orderCancelled,
    orderEditReplacements
  );
  const productionResolution = resolveEnvironmentBadge(
    prodDocs,
    resolveOrderFiscalBadgeStatus(prodDocs, estornoConfirmedIds),
    situationContext
  );
  const homologationResolution = resolveEnvironmentBadge(
    hmlDocs,
    resolveOrderFiscalBadgeStatus(hmlDocs, estornoConfirmedIds),
    situationContext
  );
  const production = productionResolution.status;
  const homologation = homologationResolution.status;
  const cancellationState = resolveOrderCancellationState(
    outboundDocs,
    operationDrafts,
    orderCancelled,
    now
  );
  const cancellationDocuments = resolveCancellationDocuments(
    outboundDocs,
    operationDrafts,
    orderCancelled,
    now
  );
  const replacementOutboundDocs = documents.filter(
    (d) => isOutbound3(d) && isAuthorized3(d) && !estornoConfirmedIds.has(d.id || "")
  );
  const hasReplacementHml = replacementOutboundDocs.some((d) => d.ambiente === 2);
  const hasReplacementProd = replacementOutboundDocs.some((d) => d.ambiente !== 2);
  const hasConfirmedEstornoHml = hmlDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));
  const hasConfirmedEstornoProd = prodDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));
  const hmlOutboundDocs = outboundDocs.filter((d) => d.ambiente === 2).sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const homologationBadges = hmlOutboundDocs.map((doc, index) => {
    const isReversed = Boolean(doc.id && estornoConfirmedIds.has(doc.id));
    const seq = index + 1;
    const label = seq === 1 ? "NFH" : `NFH ${seq}`;
    return {
      id: doc.id,
      status: isReversed ? "reversed" : resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label
    };
  });
  if (hasConfirmedEstornoHml && !hasReplacementHml) {
    homologationBadges.push({
      status: "not_issued",
      sequenceNumber: hmlOutboundDocs.length + 1,
      label: `NFH ${hmlOutboundDocs.length + 1}`
    });
  }
  const prodOutboundDocs = outboundDocs.filter((d) => d.ambiente !== 2).sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const productionBadges = prodOutboundDocs.map((doc, index) => {
    const isReversed = Boolean(doc.id && estornoConfirmedIds.has(doc.id));
    const seq = index + 1;
    const label = seq === 1 ? "NF" : `NF ${seq}`;
    return {
      id: doc.id,
      status: isReversed ? "reversed" : resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label
    };
  });
  if (prodOutboundDocs.length === 0) {
    productionBadges.push({
      status: production,
      sequenceNumber: 1,
      label: "NF"
    });
  } else if (hasConfirmedEstornoProd && !hasReplacementProd) {
    productionBadges.push({
      status: "not_issued",
      sequenceNumber: prodOutboundDocs.length + 1,
      label: `NF ${prodOutboundDocs.length + 1}`
    });
  }
  const prodDocId = productionResolution.documentId ?? findDocumentIdByStatus(prodDocs, production, estornoConfirmedIds);
  const hmlDocId = homologationResolution.documentId ?? findDocumentIdByStatus(hmlDocs, homologation, estornoConfirmedIds);
  const productionBlocked = isFiscalRegularizationBlockingStatus(production);
  const homologationBlocked = isFiscalRegularizationBlockingStatus(homologation);
  return {
    production,
    homologation,
    ...production !== "not_issued" && prodDocId ? { productionDocumentId: prodDocId } : {},
    ...homologation !== "not_issued" && hmlDocId ? { homologationDocumentId: hmlDocId } : {},
    ...productionBadges.some((b) => b.status !== "not_issued" || b.sequenceNumber > 1) ? { productionBadges } : {},
    ...homologationBadges.length > 0 ? { homologationBadges } : {},
    ...cancellationState ? { cancellationState } : {},
    ...cancellationDocuments.length ? { cancellationDocuments } : {},
    ...resolveOrderFiscalEstornoBadge(documents, operationDrafts),
    ...resolveOrderFiscalDevolucaoBadge(documents, operationDrafts),
    ...hasConfirmedEstornoHml && !hasReplacementHml && !homologationBlocked ? { readyToReissueHml: true } : {},
    ...hasConfirmedEstornoProd && !hasReplacementProd && !productionBlocked ? { readyToReissueProd: true } : {}
  };
};

// api/nfe/orderFiscalSituation.ts
var REPLACEMENT_SELECT = "original_document_id,environment,reversal_kind,status,replacement_document_id";
async function fetchOrderEditReplacements(db, documentIds) {
  if (!documentIds.length) return [];
  const { data, error } = await db.from("nfe_order_edit_replacements").select(REPLACEMENT_SELECT).in("original_document_id", [...documentIds]);
  if (error) {
    console.warn("[Fiscal] Inten\xE7\xF5es de edi\xE7\xE3o indispon\xEDveis para o r\xF3tulo fiscal:", error.code || "erro");
    return void 0;
  }
  return data || [];
}
var extractXmlMotivo = (xml) => {
  if (typeof xml !== "string") return null;
  const match = /<xMotivo>([^<]{1,300})<\/xMotivo>/.exec(xml);
  return match ? match[1].trim() : null;
};
var joinReason = (cstat, motivo) => {
  const text = typeof motivo === "string" ? motivo.trim() : "";
  if (!text) return null;
  return cstat ? `${cstat} - ${text}` : text;
};
async function loadOrderFiscalSituation(db, document, orderEmissions) {
  if (!document.order_id || (document.document_type || "outbound") !== "outbound") return void 0;
  const environment = document.ambiente === 2 ? 2 : 1;
  const emissionIds = orderEmissions.map((emission) => String(emission.id)).filter(Boolean);
  if (!emissionIds.length) return void 0;
  try {
    const [orderResult, eventsResult, draftsResult, replacements] = await Promise.all([
      db.from("orders").select("id,status").eq("id", document.order_id).maybeSingle(),
      db.from("nfe_document_events").select("document_id,status,attempt_number,requested_at,cstat,xmotivo").in("document_id", emissionIds).eq("event_type", "110111").order("attempt_number", { ascending: false }),
      db.from("nfe_operation_drafts").select("id,original_document_id,operation_kind,environment,status,created_at").in("original_document_id", emissionIds).eq("operation_kind", "estorno").order("created_at", { ascending: false }),
      fetchOrderEditReplacements(db, emissionIds)
    ]);
    if (orderResult.error || eventsResult.error || draftsResult.error) return void 0;
    const latestEvents = /* @__PURE__ */ new Map();
    for (const event of eventsResult.data || []) {
      if (!latestEvents.has(String(event.document_id))) latestEvents.set(String(event.document_id), event);
    }
    const latestDrafts = /* @__PURE__ */ new Map();
    for (const draft of draftsResult.data || []) {
      if (!latestDrafts.has(String(draft.original_document_id))) {
        latestDrafts.set(String(draft.original_document_id), draft);
      }
    }
    const statusRows = orderEmissions.map((emission) => {
      const event = latestEvents.get(String(emission.id));
      return {
        id: String(emission.id),
        order_id: emission.order_id,
        status: emission.status,
        document_type: emission.document_type || "outbound",
        ambiente: emission.ambiente,
        created_at: emission.created_at,
        cancellationEventStatus: event?.status,
        cancellationEventRequestedAt: event?.requested_at
      };
    });
    const drafts = [...latestDrafts.values()].map((draft) => ({
      id: draft.id,
      original_document_id: draft.original_document_id,
      operation_kind: draft.operation_kind,
      environment: draft.environment,
      status: draft.status,
      created_at: draft.created_at
    }));
    const orderCancelled = ["cancelled", "cancelado"].includes(
      String(orderResult.data?.status || "").toLowerCase()
    );
    const pair = resolveOrderFiscalBadgePair(statusRows, drafts, orderCancelled, Date.now(), replacements || []);
    const status = environment === 2 ? pair.homologation || "not_issued" : pair.production;
    const documentId = environment === 2 ? pair.homologationDocumentId : pair.productionDocumentId;
    let reason = null;
    if (status === "regularization_failed" || status === "regularization_uncertain") {
      const failingEvent = documentId ? latestEvents.get(documentId) : void 0;
      reason = joinReason(failingEvent?.cstat, failingEvent?.xmotivo);
      const failingDraft = documentId ? latestDrafts.get(documentId) : void 0;
      if (!reason && failingDraft?.id) {
        const { data } = await db.from("nfe_operation_drafts").select("sefaz_response_xml").eq("id", failingDraft.id).maybeSingle();
        reason = extractXmlMotivo(data?.sefaz_response_xml);
      }
    } else if (status === "reissue_required") {
      const pending = orderEmissions.filter((emission) => !["autorizada", "homologada", "cancelada"].includes(String(emission.status))).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
      reason = pending?.motivo_status ? String(pending.motivo_status) : null;
    }
    const activeReplacement = (replacements || []).find(
      (r) => (r.environment === environment || r.environment == null) && r.status !== "completed"
    ) || (replacements || [])[0];
    let previousDocumentId = null;
    let previousDocumentNumber = null;
    let previousDocumentClosure = null;
    if (activeReplacement?.original_document_id) {
      previousDocumentId = activeReplacement.original_document_id;
      const originalDoc = orderEmissions.find((e) => String(e.id) === activeReplacement.original_document_id);
      previousDocumentNumber = originalDoc?.numero_nfe ?? null;
      previousDocumentClosure = activeReplacement.reversal_kind === "cancel" ? "cancelada" : "estornada";
    } else {
      const pastClosure = orderEmissions.filter((e) => e.ambiente === environment && ["cancelada"].includes(String(e.status).toLowerCase())).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
      if (pastClosure) {
        previousDocumentId = String(pastClosure.id);
        previousDocumentNumber = pastClosure?.numero_nfe ?? null;
        previousDocumentClosure = "cancelada";
      }
    }
    if (!previousDocumentNumber && (status === "reissue_required" || status === "regularization_failed" || status === "regularization_uncertain")) {
      const currentDocInEmissions = orderEmissions.find((e) => String(e.id) === document.id);
      if (currentDocInEmissions) {
        previousDocumentNumber = currentDocInEmissions?.numero_nfe ?? null;
        previousDocumentClosure = currentDocInEmissions.status === "cancelada" ? "cancelada" : "estornada";
      }
    }
    let actionKind;
    if (status === "regularization_failed") {
      actionKind = "prior_regularization_failed";
    } else if (status === "regularization_uncertain") {
      actionKind = "transmission_uncertain";
    } else if (status === "reissue_required") {
      const replacementAttempts = orderEmissions.filter((e) => String(e.id) !== previousDocumentId && e.ambiente === environment).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
      const latestAttempt = replacementAttempts[0];
      const attemptStatus = String(latestAttempt?.status || "").toLowerCase();
      if (attemptStatus === "rejeitada" || attemptStatus === "denegada") {
        actionKind = "rejected";
      } else if (attemptStatus === "transmitting" || attemptStatus === "unknown") {
        actionKind = "transmission_uncertain";
      } else if (activeReplacement?.status === "replacement_prepared") {
        actionKind = "draft";
      } else {
        actionKind = "awaiting_new_invoice";
      }
    } else if (status === "issued") {
      actionKind = "authorized";
    }
    return {
      status,
      environment,
      orderCancelled,
      orderId: String(document.order_id),
      ...documentId ? { documentId } : {},
      ...previousDocumentId ? { previousDocumentId } : {},
      ...previousDocumentNumber ? { previousDocumentNumber } : {},
      ...previousDocumentClosure ? { previousDocumentClosure } : {},
      reason,
      ...actionKind ? { actionKind } : {}
    };
  } catch (error) {
    console.warn("[Fiscal] Situa\xE7\xE3o fiscal do pedido indispon\xEDvel nos detalhes:", error instanceof Error ? error.name : "erro");
    return void 0;
  }
}

// api/nfe/document-details.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  const documentId = String(req.body?.documentId || "");
  if (!uuid.test(documentId))
    return res.status(400).json({ success: false, error: "Documento fiscal inv\xE1lido." });
  const { data: document, error: documentError } = await db.from("nfe_documents").select(
    "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type"
  ).eq("id", documentId).maybeSingle();
  if (documentError)
    return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os detalhes fiscais." });
  let fiscalDoc = document;
  let sourceDocument = void 0;
  let operationDrafts = [];
  let events = [];
  if (!fiscalDoc) {
    const { data: draft, error: draftError } = await db.from("nfe_operation_drafts").select("*").eq("id", documentId).maybeSingle();
    if (draftError)
      return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os detalhes fiscais." });
    if (!draft)
      return res.status(404).json({ success: false, error: "Documento fiscal n\xE3o encontrado." });
    if (draft.document_id) {
      const { data: issuedDoc, error: issuedDocError } = await db.from("nfe_documents").select(
        "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type"
      ).eq("id", draft.document_id).maybeSingle();
      if (issuedDocError || !issuedDoc)
        return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel conferir o documento fiscal vinculado ao rascunho." });
      fiscalDoc = issuedDoc;
    }
    if (!fiscalDoc) {
      let originalDoc = null;
      if (draft.original_document_id) {
        const { data: orig, error: originalError } = await db.from("nfe_documents").select("*").eq("id", draft.original_document_id).maybeSingle();
        if (originalError || !orig)
          return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel conferir o documento fiscal de origem." });
        originalDoc = orig;
      }
      const draftStatus = String(draft.status || "").toLowerCase();
      if (draftStatus === "authorized")
        return res.status(503).json({ success: false, error: "A autoriza\xE7\xE3o fiscal precisa ser reconciliada com o documento emitido." });
      const status = draftStatus === "rejected" ? "rejeitada" : draftStatus === "cancelled" ? "cancelada" : "pendente";
      const accessKey = typeof draft.access_key === "string" && ACCESS_KEY_PATTERN.test(draft.access_key) ? draft.access_key : "";
      if (originalDoc) sourceDocument = {
        id: originalDoc.id,
        order_id: originalDoc.order_id,
        modelo: originalDoc.modelo,
        ambiente: originalDoc.ambiente,
        numero_nfe: originalDoc.numero_nfe,
        serie: originalDoc.serie,
        chave_acesso: originalDoc.chave_acesso
      };
      fiscalDoc = {
        id: draft.id,
        order_id: originalDoc?.order_id || null,
        numero_nfe: accessKey ? Number(accessKey.slice(25, 34)) : 0,
        serie: accessKey ? String(Number(accessKey.slice(22, 25))) : "",
        chave_acesso: accessKey,
        modelo: "55",
        ambiente: draft.environment === 1 ? 1 : 2,
        status,
        motivo_status: draft.reason || "Nota Fiscal de Estorno (Modelo 55) preparada para regulariza\xE7\xE3o",
        numero_protocolo: draft.protocol_number || null,
        xml_nfe: draft.signed_xml || draft.generated_xml || null,
        xml_protocolo: draft.sefaz_response_xml || null,
        valor_total: originalDoc?.valor_total || 0,
        destinatario_nome: originalDoc?.destinatario_nome || "Consumidor",
        destinatario_documento: originalDoc?.destinatario_documento || null,
        created_at: draft.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: draft.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
        document_type: draft.operation_kind || "estorno"
      };
    }
    operationDrafts = [
      {
        id: draft.id,
        operation_kind: draft.operation_kind,
        environment: draft.environment,
        status: draft.status,
        reason: draft.reason,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
        sourceDocument
      }
    ];
    const targetIds = [draft.id, draft.original_document_id, draft.document_id].filter(Boolean);
    const { data: evts } = await db.from("nfe_document_events").select(
      "id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at"
    ).in("document_id", targetIds).order("requested_at", { ascending: false }).limit(30);
    events = evts || [];
    return res.status(200).json({
      success: true,
      document: fiscalDoc,
      events,
      operationDrafts
    });
  }
  const [eventsResult, draftsResult, linkedDocsResult] = await Promise.all([
    db.from("nfe_document_events").select(
      "id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at"
    ).eq("document_id", documentId).order("requested_at", { ascending: false }).limit(30),
    db.from("nfe_operation_drafts").select(
      "id,operation_kind,environment,status,reason,created_at,updated_at,document_id,access_key,protocol_number"
    ).or(`original_document_id.eq.${documentId},document_id.eq.${documentId}`).order("created_at", { ascending: false }).limit(10),
    db.from("nfe_documents").select(
      "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,original_document_id"
    ).eq("original_document_id", documentId).order("created_at", { ascending: false }).limit(10)
  ]);
  if (eventsResult.error)
    return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar o hist\xF3rico fiscal." });
  let orderEmissions = [];
  if (fiscalDoc?.order_id) {
    const { data: emissions } = await db.from("nfe_documents").select(
      "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type,original_document_id"
    ).eq("order_id", fiscalDoc.order_id).eq("ambiente", fiscalDoc.ambiente).eq("document_type", "outbound").order("created_at", { ascending: true }).limit(20);
    orderEmissions = emissions || [];
  }
  const fiscalSituation = await loadOrderFiscalSituation(db, fiscalDoc, orderEmissions);
  return res.status(200).json({
    success: true,
    document: fiscalDoc,
    events: eventsResult.data || [],
    operationDrafts: draftsResult.data || [],
    linkedDocuments: linkedDocsResult?.data || [],
    orderEmissions,
    ...fiscalSituation ? { fiscalSituation } : {}
  });
}
//# sourceMappingURL=document-details.cjs.map
