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

// api/nfe/order-fiscal-badges.ts
var order_fiscal_badges_exports = {};
__export(order_fiscal_badges_exports, {
  default: () => handler
});
module.exports = __toCommonJS(order_fiscal_badges_exports);
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

// erp/src/pages/utils/nfe/nfeEventRules.ts
var readTag = (xml, tag) => {
  const name = `(?:[\\w.-]+:)?${tag}`;
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
};
var getAuthorizedAt = (protocolXml, fallbackDate) => readTag(protocolXml || "", "dhRecbto") || fallbackDate;

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

// api/nfe/order-fiscal-badges.ts
var supabaseUrl = getSupabaseUrl();
var serviceKey = getSupabaseSecretKey() || "";
var anonKey = getSupabaseAnonKey();
var orderIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
var documentSelect = "id,order_id,related_return_order_id,status,document_type,ambiente,created_at,numero_nfe,serie,modelo,valor_total";
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
    return res.status(503).json({ error: "Backend fiscal indispon\xEDvel." });
  const authorizationHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  const accessToken = String(authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return res.status(401).json({ error: "Autentica\xE7\xE3o necess\xE1ria." });
  const orderIds = Array.isArray(req.body?.orderIds) ? [...new Set(req.body.orderIds.map((id) => String(id)))] : [];
  if (orderIds.length === 0 || orderIds.length > 30 || orderIds.some((id) => !orderIdPattern.test(id)))
    return res.status(400).json({ error: "Lista de pedidos inv\xE1lida." });
  const userDb = (0, import_supabase_js.createClient)(supabaseUrl2, anonKey2, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const db = (0, import_supabase_js.createClient)(supabaseUrl2, serviceKey2, { auth: { persistSession: false } });
  const { data: visibleOrders, error: visibleOrdersError } = await userDb.from("orders").select("id,status").in("id", orderIds);
  if (visibleOrdersError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel validar os pedidos vis\xEDveis." });
  const visibleOrderIds = new Set((visibleOrders || []).map((order) => String(order.id)));
  if (orderIds.some((id) => !visibleOrderIds.has(id)))
    return res.status(403).json({ error: "Um ou mais pedidos n\xE3o est\xE3o dispon\xEDveis para esta sess\xE3o." });
  const [linkedReturnsResult, legacyReturnsResult] = await Promise.all([
    userDb.from("orders").select("id,linked_order_id,order_index,status").eq("order_type", "return").in("linked_order_id", orderIds),
    userDb.from("orders").select("id,linked_order_id,legacy_parent_id:order_data->>linkedOrderId,order_index,status").eq("order_type", "return").in("order_data->>linkedOrderId", orderIds)
  ]);
  if (linkedReturnsResult.error || legacyReturnsResult.error)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar as devolu\xE7\xF5es vinculadas." });
  const returnOrdersById = /* @__PURE__ */ new Map();
  for (const row of [...linkedReturnsResult.data || [], ...legacyReturnsResult.data || []])
    returnOrdersById.set(String(row.id), row);
  const returnOrders = Array.from(returnOrdersById.values());
  const scopedOrderIds = [.../* @__PURE__ */ new Set([...orderIds, ...returnOrders.map((order) => String(order.id))])];
  const { data: directDocuments, error: documentsError } = await userDb.from("nfe_documents").select(documentSelect).in("order_id", scopedOrderIds);
  if (documentsError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar os documentos fiscais." });
  const { data: relatedDocuments, error: relatedDocumentsError } = await userDb.from("nfe_documents").select(documentSelect).in("related_return_order_id", scopedOrderIds);
  if (relatedDocumentsError)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar as notas das devolu\xE7\xF5es." });
  const documents = [...new Map([...directDocuments || [], ...relatedDocuments || []].map((document) => [document.id, document])).values()];
  const returnDocumentIds = [
    ...new Set(
      (documents || []).filter((document) => document.document_type === "return" && document.id).map((document) => String(document.id))
    )
  ];
  let itemQuantityByDocumentId = /* @__PURE__ */ new Map();
  let authorizationXmlByDocumentId = /* @__PURE__ */ new Map();
  if (returnDocumentIds.length) {
    const [itemsResult, protocolResult] = await Promise.all([
      userDb.from("nfe_document_items").select("document_id,billed_quantity").in("document_id", returnDocumentIds),
      userDb.from("nfe_documents").select("id,xml_protocolo").in("id", returnDocumentIds)
    ]);
    const { data: items, error: itemsError } = itemsResult;
    const { data: protocols, error: protocolError } = protocolResult;
    if (!itemsError) {
      for (const item of items || []) {
        const documentId = String(item.document_id || "");
        if (!documentId) continue;
        itemQuantityByDocumentId.set(
          documentId,
          (itemQuantityByDocumentId.get(documentId) || 0) + Number(item.billed_quantity || 0)
        );
      }
    }
    if (!protocolError) {
      authorizationXmlByDocumentId = new Map(
        (protocols || []).map((document) => [String(document.id), String(document.xml_protocolo || "")])
      );
    }
  }
  const returnOrderById = new Map(returnOrders.map((order) => [String(order.id), order]));
  const compactDocuments = (documents || []).map((document) => {
    const returnOrderId = document.document_type === "return" ? document.related_return_order_id || document.order_id : document.order_id;
    const returnOrder = returnOrderById.get(String(returnOrderId || ""));
    return {
      id: document.id,
      order_id: returnOrderId,
      status: document.status,
      document_type: document.document_type,
      ambiente: document.ambiente,
      created_at: document.created_at,
      numero_nfe: document.numero_nfe,
      serie: document.serie,
      modelo: document.modelo,
      valor_total: document.valor_total,
      issuedAt: document.id && document.document_type === "return" ? getAuthorizedAt(authorizationXmlByDocumentId.get(String(document.id)) || "", "") || null : null,
      ...document.document_type === "return" ? {
        returnOrderCode: returnOrder?.order_index || returnOrder?.id || returnOrderId || null,
        itemQuantity: document.id ? itemQuantityByDocumentId.get(String(document.id)) : void 0
      } : {}
    };
  });
  const cancelledOrderIds = (visibleOrders || []).filter((order) => ["cancelled", "cancelado"].includes(String(order.status || "").toLowerCase())).map((order) => String(order.id));
  const outboundDocumentIds = [
    ...new Set(
      (documents || []).filter((document) => document.document_type === "outbound").map((document) => String(document.id))
    )
  ];
  const scopedDocumentIds = [...new Set((documents || []).map((document) => String(document.id)))];
  let eventsResult = { data: [], error: null };
  let draftsResult = { data: [], error: null };
  if (scopedDocumentIds.length) {
    const { data, error } = await db.from("nfe_document_events").select("document_id,status,attempt_number,requested_at").in("document_id", scopedDocumentIds).eq("event_type", "110111").order("attempt_number", { ascending: false });
    eventsResult = { data, error };
  }
  if (outboundDocumentIds.length) {
    const { data, error } = await db.from("nfe_operation_drafts").select("id,original_document_id,operation_kind,environment,status,created_at").in("original_document_id", outboundDocumentIds).eq("operation_kind", "estorno").order("created_at", { ascending: false });
    draftsResult = { data, error };
  }
  if (eventsResult.error || draftsResult.error)
    return res.status(503).json({ error: "N\xE3o foi poss\xEDvel consultar o hist\xF3rico fiscal." });
  const orderEditReplacements = await fetchOrderEditReplacements(db, outboundDocumentIds);
  const latestEvents = /* @__PURE__ */ new Map();
  for (const event of eventsResult.data || []) {
    if (!latestEvents.has(String(event.document_id)))
      latestEvents.set(String(event.document_id), event);
  }
  const latestDrafts = /* @__PURE__ */ new Map();
  for (const draft of draftsResult.data || []) {
    if (!latestDrafts.has(String(draft.original_document_id)))
      latestDrafts.set(String(draft.original_document_id), draft);
  }
  return res.status(200).json({
    documents: compactDocuments,
    returnOrders: returnOrders.map((order) => ({
      id: order.id,
      linked_order_id: order.linked_order_id || order.legacy_parent_id || null,
      order_index: order.order_index
    })),
    cancellationEvents: Array.from(latestEvents.values()).map((event) => ({
      document_id: event.document_id,
      status: event.status,
      requested_at: event.requested_at
    })),
    cancelledOrderIds,
    ...orderEditReplacements ? { orderEditReplacements } : {},
    estornoDrafts: Array.from(latestDrafts.values()).map((draft) => ({
      id: draft.id,
      original_document_id: draft.original_document_id,
      operation_kind: draft.operation_kind,
      environment: draft.environment,
      status: draft.status,
      created_at: draft.created_at
    }))
  });
}
//# sourceMappingURL=order-fiscal-badges.cjs.map
