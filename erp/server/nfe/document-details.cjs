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
  let fiscalDoc = document;
  let operationDrafts = [];
  let events = [];
  if (!fiscalDoc) {
    const { data: draft, error: draftError } = await db.from("nfe_operation_drafts").select("*").eq("id", documentId).maybeSingle();
    if (draftError)
      return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar os detalhes fiscais." });
    if (!draft)
      return res.status(404).json({ success: false, error: "Documento fiscal n\xE3o encontrado." });
    if (draft.document_id) {
      const { data: issuedDoc } = await db.from("nfe_documents").select(
        "id,order_id,numero_nfe,serie,chave_acesso,modelo,ambiente,status,motivo_status,numero_protocolo,xml_nfe,xml_protocolo,valor_total,destinatario_nome,destinatario_documento,created_at,updated_at,document_type"
      ).eq("id", draft.document_id).maybeSingle();
      if (issuedDoc) {
        fiscalDoc = issuedDoc;
      }
    }
    if (!fiscalDoc) {
      let originalDoc = null;
      if (draft.original_document_id) {
        const { data: orig } = await db.from("nfe_documents").select("*").eq("id", draft.original_document_id).maybeSingle();
        originalDoc = orig;
      }
      const draftStatus = String(draft.status || "").toLowerCase();
      const isAuthorized = draftStatus === "authorized";
      const status = isAuthorized ? draft.environment === 2 ? "homologada" : "autorizada" : draftStatus === "ready" ? "preparada" : draftStatus === "rejected" ? "rejeitada" : "pendente";
      fiscalDoc = {
        id: draft.id,
        order_id: originalDoc?.order_id || null,
        numero_nfe: originalDoc?.numero_nfe || 0,
        serie: "1",
        chave_acesso: draft.access_key || (draft.original_access_key ? `ESTORNO-${draft.original_access_key}` : originalDoc?.chave_acesso ? `ESTORNO-${originalDoc.chave_acesso}` : ""),
        modelo: "55",
        ambiente: draft.environment === 1 ? 1 : 2,
        status,
        motivo_status: draft.reason || "Nota Fiscal de Estorno (Modelo 55) preparada para regulariza\xE7\xE3o",
        numero_protocolo: draft.protocol_number || null,
        xml_nfe: draft.signed_xml || draft.generated_xml || originalDoc?.xml_nfe || null,
        xml_protocolo: draft.sefaz_response_xml || originalDoc?.xml_protocolo || null,
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
        updated_at: draft.updated_at
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
  const [eventsResult, draftsResult] = await Promise.all([
    db.from("nfe_document_events").select(
      "id,event_type,event_sequence,attempt_number,status,justification,cstat,xmotivo,protocol_number,protocol_date,requested_by,requested_at,confirmed_at"
    ).eq("document_id", documentId).order("requested_at", { ascending: false }).limit(30),
    db.from("nfe_operation_drafts").select("id,operation_kind,environment,status,reason,created_at,updated_at").or(`original_document_id.eq.${documentId},document_id.eq.${documentId}`).order("created_at", { ascending: false }).limit(10)
  ]);
  if (eventsResult.error)
    return res.status(503).json({ success: false, error: "N\xE3o foi poss\xEDvel carregar o hist\xF3rico fiscal." });
  return res.status(200).json({
    success: true,
    document: fiscalDoc,
    events: eventsResult.data || [],
    operationDrafts: draftsResult.data || []
  });
}
//# sourceMappingURL=document-details.cjs.map
