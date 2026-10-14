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

// api/nfe/order-cancellation-policy.ts
var order_cancellation_policy_exports = {};
__export(order_cancellation_policy_exports, {
  default: () => handler,
  evaluateDocumentEligibility: () => evaluateDocumentEligibility
});
module.exports = __toCommonJS(order_cancellation_policy_exports);

// shared-utils/fiscalIdentifiers.ts
var ACCESS_KEY_PATTERN = /^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/;

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

// api/nfe/order-cancellation-policy.ts
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
var hasGoodsCirculated = (row) => getGoodsCirculationState(row) !== "none";

// erp/src/pages/utils/orderStatusTransitionRules.ts
var canCancelOrderDirectly = (order) => {
  if (!order.status || order.status === "cancelled" || order.status === "draft") {
    return false;
  }
  if (hasGoodsCirculated(order)) {
    return false;
  }
  if (getGoodsCirculationState(order) === "in_progress") return false;
  return order.status === "scheduled";
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

// api/nfe/order-cancellation-policy.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function evaluateDocumentEligibility(document, order, priorEvent, now, authorizedDocumentCount = 1) {
  const authorizationDateFor = (candidate) => getAuthorizedAt(candidate?.xml_protocolo || "", "");
  const deadlineFor = (candidate) => {
    const window = getCancellationWindow(
      String(candidate?.modelo || ""),
      authorizationDateFor(candidate),
      now
    );
    return window.deadline?.toISOString() || null;
  };
  const blocked = (reason, action = "manual_review") => ({
    canProceed: false,
    action,
    reason,
    orderId: document?.order_id || null,
    orderStatus: order?.status || null,
    authorizedAt: authorizationDateFor(document),
    deadline: deadlineFor(document)
  });
  if (!document) return blocked("Documento fiscal n\xE3o encontrado.", "none");
  if (document.document_type !== "outbound" || !document.order_id)
    return blocked("A nota n\xE3o est\xE1 vinculada a um pedido de venda.", "none");
  if (!order) return blocked("Pedido de origem n\xE3o encontrado.", "none");
  if (!["55", "65"].includes(String(document.modelo)) || ![1, 2].includes(Number(document.ambiente)))
    return blocked("Modelo ou ambiente fiscal inv\xE1lido.", "none");
  if (!["autorizada", "homologada"].includes(String(document.status)) || document.status === "homologada" && Number(document.ambiente) !== 2 || document.status === "autorizada" && Number(document.ambiente) !== 1)
    return blocked(
      "Somente uma NF-e autorizada no ambiente correspondente pode receber cancelamento.",
      "none"
    );
  if (!document.numero_protocolo)
    return blocked("A nota n\xE3o tem protocolo original para referenciar o evento.", "none");
  if (!ACCESS_KEY_PATTERN.test(String(document.chave_acesso || "")))
    return blocked("A nota n\xE3o tem uma chave de acesso v\xE1lida para o evento fiscal.", "none");
  if (String(document.chave_acesso).slice(20, 22) !== String(document.modelo))
    return blocked("O modelo gravado diverge do modelo informado na chave de acesso.", "none");
  const orderStatus = String(order.status || "").toLowerCase();
  const circulation = getGoodsCirculationState(order);
  if (circulation === "completed")
    return blocked(
      "Pedido entregue ou retirado; preserve a NF-e original e encaminhe ao fluxo de devolu\xE7\xE3o comercial.",
      "return"
    );
  if (circulation === "in_progress")
    return blocked(
      "H\xE1 evid\xEAncia de sa\xEDda ou tr\xE2nsito sem confirma\xE7\xE3o de entrega; n\xE3o cancele nem classifique como estorno. Confirme recusa ou retorno da mercadoria antes de decidir.",
      "blocked"
    );
  const orderType = String(order.order_type || order.order_data?.orderType || "sale").toLowerCase();
  if (!["sale", "showroom"].includes(orderType))
    return blocked(
      "Este documento n\xE3o est\xE1 ligado a uma venda eleg\xEDvel para cancelamento direto.",
      "none"
    );
  if (!["cancelled", "cancelado"].includes(orderStatus) && !canCancelOrderDirectly({ ...order, status: orderStatus }))
    return blocked("O estado atual do pedido n\xE3o permite cancelamento comercial.", "blocked");
  if (priorEvent?.status === "registered" || priorEvent?.status === "unknown")
    return blocked(
      "A situa\xE7\xE3o da tentativa de cancelamento precisa ser consultada na SEFAZ antes de qualquer nova a\xE7\xE3o.",
      "reconcile"
    );
  if (priorEvent?.status === "transmitting") {
    const requestedAt = new Date(priorEvent.requested_at || "").getTime();
    const attemptAge = now - requestedAt;
    if (!Number.isFinite(requestedAt) || attemptAge < 3e4)
      return blocked(
        "H\xE1 uma tentativa de cancelamento em processamento. Aguarde antes de repetir.",
        "pending"
      );
    return blocked(
      "A tentativa anterior n\xE3o foi confirmada. Consulte a SEFAZ antes de qualquer nova a\xE7\xE3o.",
      "reconcile"
    );
  }
  const policy = getFiscalCancellationPolicy({
    model: String(document.modelo),
    authorizedAt: authorizationDateFor(document),
    status: String(document.status),
    environment: Number(document.ambiente),
    goodsCirculated: false,
    operationDidNotOccur: true,
    issuerUf: String(document.chave_acesso).slice(0, 2) === "41" ? "PR" : "",
    now
  });
  return {
    canProceed: policy.action === "cancel" || policy.action === "estorno",
    action: policy.action,
    reason: policy.reason || null,
    orderId: document.order_id,
    orderStatus: order.status,
    authorizedAt: authorizationDateFor(document),
    deadline: policy.deadline?.toISOString() || null
  };
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido." });
  if (!supabaseUrl || !serviceKey)
    return res.status(503).json({ error: "Backend fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ error: authorization.message });
  const documentIds = Array.isArray(req.body?.documentIds) ? [...new Set(req.body.documentIds.map((id) => String(id)))] : null;
  if (documentIds) {
    if (!documentIds.length || documentIds.length > 30 || documentIds.some((id) => !uuid.test(id)))
      return res.status(400).json({ error: "Lista de documentos inv\xE1lida." });
    const { data: documents2, error: documentsError2 } = await db.from("nfe_documents").select(
      "id,order_id,document_type,status,ambiente,modelo,chave_acesso,xml_protocolo,numero_protocolo,created_at"
    ).in("id", documentIds);
    if (documentsError2)
      return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar as notas fiscais." });
    const linkedOrderIds = [
      ...new Set((documents2 || []).map((document) => document.order_id).filter(Boolean))
    ];
    const { data: authorizedDocuments2, error: authorizedDocumentsError } = linkedOrderIds.length ? await db.from("nfe_documents").select("id,order_id").in("order_id", linkedOrderIds).eq("document_type", "outbound").in("status", ["autorizada", "homologada"]) : { data: [], error: null };
    if (authorizedDocumentsError)
      return res.status(503).json({ error: "N\xE3o foi poss\xEDvel conferir as NF-e do pedido." });
    const authorizedCounts = /* @__PURE__ */ new Map();
    for (const document of authorizedDocuments2 || []) {
      const orderId2 = String(document.order_id || "");
      if (orderId2) authorizedCounts.set(orderId2, (authorizedCounts.get(orderId2) || 0) + 1);
    }
    const { data: orders, error: ordersError } = linkedOrderIds.length ? await db.from("orders").select(
      "id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_type,order_data"
    ).in("id", linkedOrderIds) : { data: [], error: null };
    if (ordersError)
      return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar os pedidos de origem." });
    const { data: events2, error: eventsError2 } = await db.from("nfe_document_events").select("document_id,status,requested_at,attempt_number").in("document_id", documentIds).eq("event_type", "110111").order("attempt_number", { ascending: false });
    if (eventsError2)
      return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar tentativas anteriores." });
    const documentsById = new Map(
      (documents2 || []).map((document) => [String(document.id), document])
    );
    const ordersById = new Map(
      (orders || []).map((order2) => [String(order2.id), order2])
    );
    const latestEvents = /* @__PURE__ */ new Map();
    for (const event of events2 || []) {
      if (!latestEvents.has(String(event.document_id)))
        latestEvents.set(String(event.document_id), event);
    }
    const now = Date.now();
    const eligibility = Object.fromEntries(
      documentIds.map((id) => {
        const document = documentsById.get(id);
        return [
          id,
          evaluateDocumentEligibility(
            document,
            document?.order_id ? ordersById.get(String(document.order_id)) : null,
            latestEvents.get(id),
            now,
            document?.order_id ? authorizedCounts.get(String(document.order_id)) || 0 : 0
          )
        ];
      })
    );
    return res.status(200).json({ documents: eligibility });
  }
  const orderId = String(req.body?.orderId || "");
  const preview = req.body?.preview === true;
  if (!uuid.test(orderId)) return res.status(400).json({ error: "Pedido inv\xE1lido." });
  const { data: order, error: orderError } = await db.from("orders").select(
    "id,status,delivery_status,delivery_started_at,delivery_arrived_at,delivery_finished_at,delivery_method,order_type,order_data,return_order_id"
  ).eq("id", orderId).maybeSingle();
  if (orderError) return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar o pedido." });
  if (!order) return res.status(404).json({ error: "Pedido n\xE3o encontrado." });
  const orderStatus = String(order.status || "").toLowerCase();
  const orderType = String(order.order_type || order.order_data?.orderType || "sale").toLowerCase();
  if (!["sale", "showroom"].includes(orderType))
    return res.status(409).json({ error: "O tratamento fiscal est\xE1 dispon\xEDvel somente para venda." });
  if (preview ? ["cancelled", "cancelado", "draft"].includes(orderStatus) : !["cancelled", "cancelado"].includes(orderStatus))
    return res.status(409).json({
      error: preview ? "O pedido n\xE3o est\xE1 em um estado que permita iniciar cancelamento ou devolu\xE7\xE3o." : "O fluxo comercial do pedido precisa estar confirmado antes de aplicar o tratamento fiscal."
    });
  const { data: documents, error: documentsError } = await db.from("nfe_documents").select(
    "id,order_id,document_type,status,ambiente,modelo,chave_acesso,numero_protocolo,xml_protocolo,created_at"
  ).eq("order_id", orderId).eq("document_type", "outbound").order("created_at", { ascending: false });
  if (documentsError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar as NF-e do pedido." });
  const circulation = getGoodsCirculationState(order);
  const allAuthorizedDocuments = (documents || []).filter(
    (document) => ["autorizada", "homologada"].includes(String(document.status || "").toLowerCase())
  );
  const requestedDocumentId = String(req.body?.documentId || "");
  if (requestedDocumentId && !uuid.test(requestedDocumentId))
    return res.status(400).json({ error: "Documento inv\xE1lido." });
  if (requestedDocumentId && !allAuthorizedDocuments.some((document) => String(document.id) === requestedDocumentId))
    return res.status(404).json({ error: "A nota autorizada n\xE3o pertence a este pedido." });
  const authorizedDocuments = requestedDocumentId ? allAuthorizedDocuments.filter((document) => String(document.id) === requestedDocumentId) : allAuthorizedDocuments;
  const terminalWithoutAuthorization = /* @__PURE__ */ new Set([
    "cancelada",
    "cancelled",
    "canceled",
    "rejeitada",
    "rejeitado",
    "denegada",
    "rejected",
    "erro",
    "error",
    "abandonada",
    "abandoned",
    "inutilizada"
  ]);
  const policyDocuments = requestedDocumentId ? (documents || []).filter((document) => String(document.id) === requestedDocumentId) : documents || [];
  const unresolvedDocuments = policyDocuments.filter((document) => {
    const status = String(document.status || "").toLowerCase();
    return !["autorizada", "homologada"].includes(status) && !terminalWithoutAuthorization.has(status);
  });
  const pendingDocuments = unresolvedDocuments.filter(
    (document) => ["pendente", "processando", "transmitting", "unknown"].includes(
      String(document.status || "").toLowerCase()
    )
  );
  const unknownFiscalDocuments = unresolvedDocuments.filter(
    (document) => !["pendente", "processando", "transmitting", "unknown"].includes(
      String(document.status || "").toLowerCase()
    )
  );
  const hasAuthorizedInvoice = authorizedDocuments.length > 0;
  if (circulation === "completed") {
    if (orderType !== "sale")
      return res.status(preview ? 200 : 409).json({
        action: "blocked",
        hasAuthorizedInvoice,
        reason: "A mercadoria foi entregue ou retirada, mas este tipo de pedido ainda n\xE3o possui fluxo de devolu\xE7\xE3o fiscal habilitado."
      });
    let returnOrderId = String(order.return_order_id || order.order_data?.returnOrderId || "") || void 0;
    let returnOrderStatus;
    if (!returnOrderId) {
      const { data: returnOrders, error: returnError } = await db.from("orders").select("id,status,order_index").eq("order_type", "return").eq("linked_order_id", orderId).order("created_at", { ascending: false }).limit(1);
      if (returnError)
        return res.status(503).json({
          error: "N\xE3o foi poss\xEDvel conferir se j\xE1 existe devolu\xE7\xE3o vinculada ao pedido."
        });
      const existingReturn = returnOrders?.[0];
      if (existingReturn) {
        returnOrderId = String(existingReturn.id);
        returnOrderStatus = String(existingReturn.status || "");
      }
    }
    return res.status(200).json({
      action: "return",
      hasAuthorizedInvoice,
      reason: returnOrderId ? "Este pedido j\xE1 foi entregue. Continue a devolu\xE7\xE3o vinculada existente para controlar os itens e quantidades." : "Este pedido j\xE1 foi entregue. Inicie a devolu\xE7\xE3o e selecione os itens e quantidades; o cancelamento da venda n\xE3o ser\xE1 feito por este fluxo.",
      returnOrderId,
      returnOrderStatus
    });
  }
  if (circulation === "in_progress") {
    const result = {
      action: "blocked",
      hasAuthorizedInvoice,
      reason: "H\xE1 evid\xEAncia de sa\xEDda ou tr\xE2nsito sem confirma\xE7\xE3o de entrega; n\xE3o cancele nem classifique como estorno. Confirme recusa ou retorno da mercadoria antes de decidir."
    };
    return preview ? res.status(200).json(result) : res.status(409).json(result);
  }
  if (pendingDocuments.length) {
    const result = {
      action: "pending",
      hasAuthorizedInvoice,
      reason: "H\xE1 uma NF-e/NFC-e em emiss\xE3o ou sem resultado final. Consulte e reconcilie a situa\xE7\xE3o fiscal antes de cancelar a venda."
    };
    return preview ? res.status(200).json(result) : res.status(409).json(result);
  }
  if (unknownFiscalDocuments.length) {
    const result = {
      action: "reconcile",
      hasAuthorizedInvoice,
      reason: "H\xE1 um documento fiscal vinculado com status n\xE3o reconhecido. Consulte o documento e reconcilie a situa\xE7\xE3o antes de cancelar a venda."
    };
    return preview ? res.status(200).json(result) : res.status(409).json(result);
  }
  if (preview && !canCancelOrderDirectly({
    ...order,
    orderType,
    status: orderStatus
  })) {
    return res.status(200).json({
      action: "blocked",
      hasAuthorizedInvoice,
      reason: "O estado atual do pedido n\xE3o permite cancelamento comercial."
    });
  }
  if (!preview && circulation !== "none")
    return res.status(409).json({ action: "blocked", error: "A circula\xE7\xE3o impede o cancelamento fiscal." });
  if (!authorizedDocuments.length)
    return res.status(200).json({ action: "none", hasAuthorizedInvoice: false });
  const { data: events, error: eventsError } = await db.from("nfe_document_events").select("document_id,status,requested_at,attempt_number").in("document_id", authorizedDocuments.map((document) => String(document.id))).eq("event_type", "110111").order("attempt_number", { ascending: false });
  if (eventsError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel conferir tentativas fiscais anteriores." });
  const latestEventByDocumentId = /* @__PURE__ */ new Map();
  for (const event of events || []) {
    if (!latestEventByDocumentId.has(String(event.document_id)))
      latestEventByDocumentId.set(String(event.document_id), event);
  }
  const operations = authorizedDocuments.map((document) => {
    const decision = evaluateDocumentEligibility(
      document,
      order,
      latestEventByDocumentId.get(String(document.id)) || null,
      Date.now(),
      authorizedDocuments.length
    );
    return {
      ...decision,
      hasAuthorizedInvoice: true,
      model: document.modelo,
      status: document.status,
      documentId: document.id,
      environment: document.ambiente,
      requestedBy: authorization.userId
    };
  });
  if (operations.length === 1) return res.status(200).json(operations[0]);
  return res.status(200).json({
    action: "batch",
    hasAuthorizedInvoice: operations.length > 0,
    operations
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  evaluateDocumentEligibility
});
//# sourceMappingURL=order-cancellation-policy.cjs.map
