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

// api/nfe/export-documents.ts
var export_documents_exports = {};
__export(export_documents_exports, {
  default: () => handler
});
module.exports = __toCommonJS(export_documents_exports);
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
function getSupabaseSecretKey() {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.service_role?.trim();
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
function hasFiscalExportRole(profile) {
  const roles = getFiscalProfileRoles(profile);
  return roles.has("accountant") || Array.from(roles).some((role) => fiscalOperatorRoles.has(role));
}
function hasFiscalAdministratorRole(profile) {
  return profile?.role === "administrator" || Array.isArray(profile?.roles) && profile.roles.includes("administrator");
}

// api/nfe/fiscalAuthorization.ts
async function authorizeFiscalExporter(client, authorizationHeader) {
  const headerValue = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const token = String(headerValue || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, message: "Autentica\xE7\xE3o necess\xE1ria." };
  try {
    const { data, error } = await client.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) return { ok: false, status: 401, message: "Sess\xE3o inv\xE1lida." };
    const { data: profile, error: profileError } = await client.from("profiles").select("role,roles").eq("id", user.id).maybeSingle();
    if (profileError)
      return { ok: false, status: 503, message: "N\xE3o foi poss\xEDvel validar a permiss\xE3o de exporta\xE7\xE3o." };
    if (!hasFiscalExportRole(profile))
      return { ok: false, status: 403, message: "Seu perfil n\xE3o pode exportar documentos fiscais." };
    const profileRoles = /* @__PURE__ */ new Set([
      ...typeof profile?.role === "string" ? [profile.role] : [],
      ...Array.isArray(profile?.roles) ? profile.roles.filter((role) => typeof role === "string") : []
    ]);
    const isOperator = hasFiscalOperationRole(profile);
    return {
      ok: true,
      userId: user.id,
      isAdministrator: hasFiscalAdministratorRole(profile),
      accountantOnly: profileRoles.has("accountant") && !isOperator
    };
  } catch {
    return { ok: false, status: 503, message: "N\xE3o foi poss\xEDvel validar a permiss\xE3o de exporta\xE7\xE3o." };
  }
}

// api/nfe/export-documents.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
var MAX_DOCUMENTS = 250;
var EXPORT_PAGE_SIZE = 10;
var MODEL_OPTIONS = ["55", "65"];
var DOCUMENT_TYPE_OPTIONS = ["outbound", "estorno", "return", "inbound"];
var STATUS_OPTIONS = ["autorizada", "homologada", "cancelada", "denegada", "rejeitada"];
var DOCUMENT_COLUMNS = "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,numero_protocolo,valor_total,created_at,document_type,original_document_id,supersedes_document_id";
var DOCUMENT_XML_COLUMNS = `${DOCUMENT_COLUMNS},xml_nfe,xml_protocolo`;
var INBOUND_COLUMNS = "id,chave_acesso,numero_nfe,serie,modelo,ambiente,data_emissao,status_sefaz,status_recebimento,protocolo,valor_total,xml_conteudo";
function isValidDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function parseEnumArray(value, allowed) {
  if (!Array.isArray(value) || value.length < 1 || value.length > allowed.length) return null;
  const entries = [...new Set(value)];
  if (entries.some((entry) => typeof entry !== "string" || !allowed.includes(entry)))
    return null;
  return entries;
}
function parseFilters(value, accountantOnly) {
  if (!value || typeof value !== "object") return null;
  const input = value;
  const models = parseEnumArray(input.models, MODEL_OPTIONS);
  const documentTypes = parseEnumArray(input.documentTypes, DOCUMENT_TYPE_OPTIONS);
  const statuses = parseEnumArray(input.statuses, STATUS_OPTIONS);
  const environment = input.environment;
  const purpose = input.purpose;
  const includeEvents = input.includeEvents;
  const includeReport = input.includeReport;
  if (purpose !== "accounting" && purpose !== "custom" || environment !== 1 && environment !== 2 || accountantOnly && environment !== 1 || !isValidDate(input.periodStart) || !isValidDate(input.periodEnd) || input.periodStart > input.periodEnd || !models || !documentTypes || !statuses || typeof includeEvents !== "boolean" || typeof includeReport !== "boolean") return null;
  const start = Date.parse(`${input.periodStart}T00:00:00.000Z`);
  const end = Date.parse(`${input.periodEnd}T00:00:00.000Z`);
  if (end - start > 366 * 24 * 60 * 60 * 1e3) return null;
  if (purpose === "accounting" && (environment !== 1 || documentTypes.includes("inbound") || !includeEvents || statuses.some((status) => !["autorizada", "cancelada"].includes(status)))) return null;
  if (environment === 1 && statuses.includes("homologada")) return null;
  if (environment === 2 && statuses.includes("autorizada")) return null;
  return {
    purpose,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    environment,
    models,
    documentTypes,
    statuses,
    includeEvents,
    includeReport
  };
}
function buildDocumentsQuery(db, filters, includeXml = false, head = false) {
  const columns = includeXml ? DOCUMENT_XML_COLUMNS : DOCUMENT_COLUMNS;
  const startInclusive = `${filters.periodStart}T00:00:00-03:00`;
  const endAt = new Date(
    Date.parse(`${filters.periodEnd}T00:00:00-03:00`) + 24 * 60 * 60 * 1e3
  ).toISOString();
  const outboundTypes = filters.documentTypes.filter((type) => type !== "inbound");
  if (!outboundTypes.length) return null;
  const typeConditions = outboundTypes.flatMap(
    (type) => type === "outbound" ? ["document_type.eq.outbound", "document_type.is.null"] : [`document_type.eq.${type}`]
  );
  return db.from("nfe_documents").select(columns, { count: "exact", head }).eq("ambiente", filters.environment).in("modelo", filters.models).in("status", filters.statuses).or(typeConditions.join(",")).gte("created_at", startInclusive).lt("created_at", endAt).order("created_at", { ascending: true }).order("id", { ascending: true });
}
function buildInboundQuery(db, filters, includeXml = false, head = false) {
  if (!filters.documentTypes.includes("inbound")) return null;
  const columns = includeXml ? INBOUND_COLUMNS : "id,chave_acesso,numero_nfe,serie,modelo,ambiente,data_emissao,status_sefaz,status_recebimento,protocolo,valor_total";
  const endAt = new Date(
    Date.parse(`${filters.periodEnd}T00:00:00-03:00`) + 24 * 60 * 60 * 1e3
  ).toISOString();
  return db.from("inbound_invoices").select(columns, { count: "exact", head }).eq("ambiente", filters.environment).in("modelo", filters.models).in("status_sefaz", filters.statuses).gte("data_emissao", `${filters.periodStart}T00:00:00-03:00`).lt("data_emissao", endAt).not("xml_conteudo", "is", null).neq("xml_conteudo", "").order("data_emissao", { ascending: true }).order("id", { ascending: true });
}
function mapGroups(documents) {
  const groups = /* @__PURE__ */ new Map();
  for (const document of documents) {
    const documentType = document.document_type || "outbound";
    const key = `${documentType}:${document.status}`;
    const row = groups.get(key) || { documentType, status: document.status, count: 0, total: 0 };
    row.count += 1;
    row.total += Number(document.valor_total || 0);
    groups.set(key, row);
  }
  return Array.from(groups.values()).map((row) => ({ ...row, total: Number(row.total.toFixed(2)) }));
}
async function summarizeExport(db, filters) {
  let outboundData = [];
  let outboundCount = 0;
  const outboundQuery = buildDocumentsQuery(db, filters);
  if (outboundQuery) {
    const { data, error, count } = await outboundQuery.range(0, MAX_DOCUMENTS - 1);
    if (error || !Array.isArray(data)) throw new Error("N\xE3o foi poss\xEDvel consultar as notas fiscais de sa\xEDda para exporta\xE7\xE3o.");
    outboundData = data;
    outboundCount = Number(count || 0);
  }
  let inboundData = [];
  let inboundCount = 0;
  const inboundQuery = buildInboundQuery(db, filters);
  if (inboundQuery) {
    const { data, error, count } = await inboundQuery.range(0, MAX_DOCUMENTS - 1);
    if (error || !Array.isArray(data)) throw new Error("N\xE3o foi poss\xEDvel consultar as notas fiscais de entrada para exporta\xE7\xE3o.");
    inboundData = data;
    inboundCount = Number(count || 0);
  }
  const totalCount = outboundCount + inboundCount;
  if (totalCount > MAX_DOCUMENTS) {
    const error = new Error(`O per\xEDodo encontrou mais de ${MAX_DOCUMENTS} documentos. Reduza o per\xEDodo para exportar com seguran\xE7a.`);
    Object.assign(error, { statusCode: 413 });
    throw error;
  }
  const documents = [
    ...outboundData,
    ...inboundData.map((document) => ({
      ...document,
      document_type: "inbound",
      status: document.status_sefaz,
      created_at: document.data_emissao
    }))
  ];
  const documentIds = outboundData.map((document) => String(document.id));
  const linkedIds = [...new Set(outboundData.flatMap((document) => [document.original_document_id, document.supersedes_document_id]).filter(Boolean).map(String))].filter((id) => !documentIds.includes(id));
  let eventDocumentIds = documentIds;
  if (linkedIds.length) {
    const { data: originals, error: originalError } = await db.from("nfe_documents").select("id").in("id", linkedIds).eq("ambiente", filters.environment);
    if (originalError) throw new Error("N\xE3o foi poss\xEDvel carregar as refer\xEAncias fiscais dos documentos.");
    eventDocumentIds = [...documentIds, ...(originals || []).map((document) => String(document.id))];
  }
  let eventCount = 0;
  if (filters.includeEvents && eventDocumentIds.length) {
    const { count: countEvents, error: eventsError } = await db.from("nfe_document_events").select("id", { count: "exact", head: true }).in("document_id", eventDocumentIds).eq("environment", filters.environment).eq("event_type", "110111").eq("status", "registered");
    if (eventsError) throw new Error("N\xE3o foi poss\xEDvel contar os eventos fiscais registrados.");
    eventCount = Number(countEvents || 0);
  }
  if (filters.includeEvents && inboundData.length) {
    const accessKeys = inboundData.map((document) => String(document.chave_acesso)).filter(Boolean);
    const { count: manifestationCount, error: manifestationError } = await db.from("inbound_manifestation_events").select("id", { count: "exact", head: true }).in("access_key", accessKeys).eq("environment", filters.environment).eq("event_type", "210210").eq("status", "registered");
    if (manifestationError) throw new Error("N\xE3o foi poss\xEDvel contar os eventos de manifesta\xE7\xE3o de entrada registrados.");
    eventCount += Number(manifestationCount || 0);
  }
  const totalValue = Number(documents.reduce((sum, document) => sum + Number(document.valor_total || 0), 0).toFixed(2));
  return {
    totalCount,
    inboundCount,
    eventCount,
    totalValue,
    groups: mapGroups(documents)
  };
}
function serializeFilterColumns(filters) {
  return {
    purpose: filters.purpose,
    period_start: filters.periodStart,
    period_end: filters.periodEnd,
    environment: filters.environment,
    models: filters.models,
    document_types: filters.documentTypes,
    statuses: filters.statuses,
    includes_events: filters.includeEvents,
    includes_report: filters.includeReport
  };
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalExporter(db, req.headers.authorization);
  if (!authorization.ok) return res.status(authorization.status).json({ success: false, error: authorization.message });
  const action = req.body?.action;
  if (action === "history") {
    const { data, error } = await db.from("nfe_document_export_history").select("id,created_at,purpose,period_start,period_end,environment,document_count,event_count,total_value,archive_name").eq("requested_by", authorization.userId).order("created_at", { ascending: false }).limit(15);
    if (error) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar o hist\xF3rico de exporta\xE7\xF5es." });
    return res.status(200).json({ success: true, history: data || [] });
  }
  const filters = parseFilters(req.body?.filters, authorization.accountantOnly);
  if (!filters) return res.status(422).json({ success: false, error: "Filtros de exporta\xE7\xE3o inv\xE1lidos ou incompat\xEDveis com o perfil." });
  if (action === "preview") {
    try {
      return res.status(200).json({ success: true, ...await summarizeExport(db, filters) });
    } catch (error) {
      const status = Number(error?.statusCode || 503);
      return res.status(status).json({ success: false, error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel pr\xE9-visualizar a exporta\xE7\xE3o." });
    }
  }
  if (action === "page") {
    const offset = req.body?.offset;
    if (!Number.isInteger(offset) || offset < 0 || offset >= MAX_DOCUMENTS) {
      return res.status(422).json({ success: false, error: "P\xE1gina de exporta\xE7\xE3o inv\xE1lida." });
    }
    let outboundCount = 0;
    const outboundQuery = buildDocumentsQuery(db, filters);
    if (outboundQuery) {
      const { count, error } = await buildDocumentsQuery(db, filters, false, true);
      if (error) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel contar as notas fiscais de sa\xEDda." });
      outboundCount = Number(count || 0);
    }
    let inboundCount = 0;
    const inboundQuery = buildInboundQuery(db, filters);
    if (inboundQuery) {
      const { count, error } = await buildInboundQuery(db, filters, false, true);
      if (error) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel contar as notas fiscais de entrada." });
      inboundCount = Number(count || 0);
    }
    if (outboundCount + inboundCount > MAX_DOCUMENTS || offset >= outboundCount + inboundCount) {
      return res.status(413).json({ success: false, error: "A lista de exporta\xE7\xE3o mudou ou ultrapassou o limite. Gere uma nova pr\xE9via ou reduza o per\xEDodo." });
    }
    const pageEnd = Math.min(offset + EXPORT_PAGE_SIZE, outboundCount + inboundCount);
    const outboundStart = Math.min(offset, outboundCount);
    const outboundEnd = Math.min(pageEnd, outboundCount);
    let data = [];
    if (outboundEnd > outboundStart && outboundQuery) {
      const outboundPageQuery = buildDocumentsQuery(db, filters, true);
      if (!outboundPageQuery) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel preparar a p\xE1gina de documentos fiscais." });
      const { data: outboundPage, error } = await outboundPageQuery.range(outboundStart, outboundEnd - 1);
      if (error || !Array.isArray(outboundPage)) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os XMLs fiscais de sa\xEDda." });
      data = outboundPage;
    }
    let inboundDocuments = [];
    const inboundStart = Math.max(0, offset - outboundCount);
    const inboundEnd = Math.min(pageEnd - outboundCount, inboundCount);
    if (inboundEnd > inboundStart && inboundQuery) {
      const inboundPageQuery = buildInboundQuery(db, filters, true);
      if (!inboundPageQuery) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel preparar a p\xE1gina de entradas fiscais." });
      const { data: inboundPage, error } = await inboundPageQuery.range(inboundStart, inboundEnd - 1);
      if (error || !Array.isArray(inboundPage)) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os XMLs fiscais de entrada." });
      inboundDocuments = inboundPage.map((document) => ({
        id: `inbound-${document.id}`,
        order_id: null,
        numero_nfe: Number(document.numero_nfe),
        serie: String(document.serie || "1"),
        chave_acesso: String(document.chave_acesso || ""),
        modelo: String(document.modelo) === "65" ? "65" : "55",
        ambiente: document.ambiente,
        status: document.status_sefaz,
        numero_protocolo: document.protocolo || null,
        valor_total: Number(document.valor_total || 0),
        created_at: document.data_emissao,
        document_type: "inbound",
        original_document_id: null,
        xml_nfe: document.xml_conteudo,
        xml_protocolo: null,
        source_status: document.status_recebimento || null
      }));
    }
    const originalIds = [...new Set(data.flatMap((document) => [document.original_document_id, document.supersedes_document_id]).filter(Boolean).map(String))];
    let linkedDocuments = [];
    if (originalIds.length) {
      const { data: originals, error: originalsError } = await db.from("nfe_documents").select(DOCUMENT_XML_COLUMNS).in("id", originalIds).eq("ambiente", filters.environment);
      if (originalsError || !Array.isArray(originals) || originals.length !== originalIds.length) {
        return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar todas as notas originais referenciadas." });
      }
      linkedDocuments = originals.map((document) => ({ ...document, isContextDocument: true }));
    }
    const allDocuments = [...data, ...linkedDocuments];
    const allIds = [...new Set(allDocuments.map((document) => String(document.id)))];
    let events = [];
    if (filters.includeEvents && allIds.length) {
      const { data: registeredEvents, error: eventsError } = await db.from("nfe_document_events").select("id,document_id,event_type,event_sequence,attempt_number,environment,status,protocol_number,protocol_date,requested_at,signed_xml,response_xml").in("document_id", allIds).eq("environment", filters.environment).eq("event_type", "110111").eq("status", "registered").order("requested_at", { ascending: true }).limit(500);
      if (eventsError || !Array.isArray(registeredEvents)) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os XMLs de eventos fiscais." });
      events = registeredEvents;
    }
    if (filters.includeEvents && inboundDocuments.length) {
      const inboundAccessKeys = inboundDocuments.map((document) => String(document.chave_acesso)).filter(Boolean);
      const inboundIdByKey = new Map(inboundDocuments.map((document) => [document.chave_acesso, document.id]));
      const { data: manifestations, error: manifestationsError } = await db.from("inbound_manifestation_events").select("id,access_key,event_type,event_sequence,attempt_number,environment,status,protocol_number,protocol_date,requested_at,signed_xml,response_xml").in("access_key", inboundAccessKeys).eq("environment", filters.environment).eq("event_type", "210210").eq("status", "registered").order("requested_at", { ascending: true }).limit(500);
      if (manifestationsError || !Array.isArray(manifestations)) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os XMLs dos eventos de entrada registrados." });
      events = events.concat(manifestations.map((event) => ({
        ...event,
        document_id: inboundIdByKey.get(String(event.access_key)) || ""
      })).filter((event) => event.document_id));
    }
    const orderIds = [...new Set(allDocuments.map((document) => document.order_id).filter(Boolean).map(String))];
    let orderNumbers = {};
    if (orderIds.length) {
      const { data: orders, error: ordersError } = await db.from("orders").select("id,order_number").in("id", orderIds);
      if (ordersError || !Array.isArray(orders)) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os n\xFAmeros dos pedidos vinculados." });
      orderNumbers = Object.fromEntries(orders.map((order) => [String(order.id), Number(order.order_number)]));
    }
    return res.status(200).json({
      success: true,
      documents: [...data, ...inboundDocuments],
      linkedDocuments,
      events,
      orderNumbers,
      nextOffset: pageEnd < outboundCount + inboundCount ? pageEnd : null
    });
  }
  if (action === "record") {
    const exportId = String(req.body?.exportId || "");
    const archiveName = String(req.body?.archiveName || "");
    if (!UUID_PATTERN.test(exportId) || !/^[A-Za-z0-9._-]{1,116}\.zip$/.test(archiveName)) {
      return res.status(422).json({ success: false, error: "Identifica\xE7\xE3o do arquivo de exporta\xE7\xE3o inv\xE1lida." });
    }
    try {
      const summary = await summarizeExport(db, filters);
      const { error } = await db.from("nfe_document_export_history").upsert({
        id: exportId,
        requested_by: authorization.userId,
        ...serializeFilterColumns(filters),
        document_count: summary.totalCount,
        event_count: summary.eventCount,
        total_value: summary.totalValue,
        archive_name: archiveName
      }, { onConflict: "id", ignoreDuplicates: true });
      if (error) return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel registrar a exporta\xE7\xE3o no hist\xF3rico." });
      return res.status(200).json({ success: true, exportId });
    } catch (error) {
      const status = Number(error?.statusCode || 503);
      return res.status(status).json({ success: false, error: error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel registrar a exporta\xE7\xE3o." });
    }
  }
  return res.status(400).json({ success: false, error: "A\xE7\xE3o de exporta\xE7\xE3o inv\xE1lida." });
}
//# sourceMappingURL=export-documents.cjs.map
