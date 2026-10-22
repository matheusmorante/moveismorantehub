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

// api/nfe/fiscal-pendencies.ts
var fiscal_pendencies_exports = {};
__export(fiscal_pendencies_exports, {
  default: () => handler
});
module.exports = __toCommonJS(fiscal_pendencies_exports);
var import_supabase_js = require("@supabase/supabase-js");

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
function getSupabaseUrl() {
  ensureEnvLoaded();
  return process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
}
function getSupabaseSecretKey() {
  ensureEnvLoaded();
  return process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim() || process.env.service_role?.trim();
}

// erp/src/pages/App/FiscalDocuments/types/fiscalPendencies.types.ts
var FISCAL_PENDENCY_TYPE_CONFIG = {
  awaiting_new_invoice: {
    label: "Nova emiss\xE3o necess\xE1ria",
    description: "NF anterior j\xE1 regularizada; pedido continua ativo e aguarda nova nota.",
    badgeClass: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    icon: "bi-receipt",
    defaultAction: {
      kind: "awaiting_new_invoice",
      label: "Emitir nova NF",
      icon: "bi-receipt"
    }
  },
  draft: {
    label: "Rascunho pendente",
    description: "Nova nota fiscal preparada, mas ainda n\xE3o transmitida \xE0 SEFAZ.",
    badgeClass: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
    icon: "bi-pencil-square",
    defaultAction: {
      kind: "draft",
      label: "Continuar emiss\xE3o",
      icon: "bi-play-fill"
    }
  },
  rejected: {
    label: "Emiss\xE3o rejeitada",
    description: "Nova nota fiscal foi rejeitada pela SEFAZ e necessita de corre\xE7\xE3o cadastral/tribut\xE1ria.",
    badgeClass: "border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
    icon: "bi-x-octagon-fill",
    defaultAction: {
      kind: "rejected",
      label: "Corrigir emiss\xE3o",
      icon: "bi-wrench-adjustable"
    }
  },
  transmission_uncertain: {
    label: "Transmiss\xE3o incerta",
    description: "Resultado da transmiss\xE3o desconhecido; requer consulta e reconcilia\xE7\xE3o com a SEFAZ.",
    badgeClass: "border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
    icon: "bi-question-octagon-fill",
    defaultAction: {
      kind: "transmission_uncertain",
      label: "Consultar situa\xE7\xE3o",
      icon: "bi-arrow-repeat"
    }
  },
  prior_regularization_failed: {
    label: "Regulariza\xE7\xE3o com erro",
    description: "Falha ao estornar ou cancelar a nota anterior; bloqueia nova emiss\xE3o at\xE9 resolu\xE7\xE3o.",
    badgeClass: "border-red-400 bg-red-100 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    icon: "bi-exclamation-octagon-fill",
    defaultAction: {
      kind: "prior_regularization_failed",
      label: "Resolver regulariza\xE7\xE3o",
      icon: "bi-exclamation-octagon-fill"
    }
  },
  prior_regularization_uncertain: {
    label: "Regulariza\xE7\xE3o incerta",
    description: "Resultado incerto do cancelamento ou estorno anterior na SEFAZ.",
    badgeClass: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
    icon: "bi-question-circle-fill",
    defaultAction: {
      kind: "prior_regularization_uncertain",
      label: "Consultar regulariza\xE7\xE3o",
      icon: "bi-arrow-repeat"
    }
  },
  processing: {
    label: "Processamento em andamento",
    description: "Fluxo fiscal iniciado e aguardando processamento da SEFAZ.",
    badgeClass: "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    icon: "bi-hourglass-split",
    defaultAction: {
      kind: "processing",
      label: "Ver processamento",
      icon: "bi-hourglass-split"
    }
  }
};

// api/nfe/fiscal-pendencies.ts
var PAGE_SIZE = 1e3;
var ID_CHUNK_SIZE = 100;
var OPEN_ATTEMPT_STATUSES = ["rejeitada", "denegada", "transmitting", "unknown", "erro"];
var FiscalPendenciesDataError = class extends Error {
};
function requireEnvironment(value) {
  if (value === 1 || value === 2) return value;
  throw new FiscalPendenciesDataError("Ambiente fiscal inv\xE1lido.");
}
function requireModel(value) {
  if (value === "55" || value === "65") return value;
  throw new FiscalPendenciesDataError("Modelo fiscal inv\xE1lido.");
}
function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
async function readAllPages(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw new FiscalPendenciesDataError("Falha ao consultar dados fiscais.");
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
async function readPagesById(ids, buildQuery) {
  const rows = [];
  for (const idChunk of chunk(ids, ID_CHUNK_SIZE)) {
    rows.push(...await readAllPages(() => buildQuery(idChunk)));
  }
  return rows;
}
function customerFromOrder(order) {
  const customerData = order.order_data?.customerData || {};
  return {
    customerName: String(customerData.fullName || customerData.name || "Cliente n\xE3o informado").trim(),
    customerDocument: String(customerData.cpfCnpj || customerData.document || "").trim()
  };
}
function isCancelled(order) {
  return ["cancelled", "cancelado"].includes(String(order.status || "").toLowerCase());
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  }
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseSecretKey() || "";
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ success: false, error: "Backend fiscal indispon\xEDvel." });
  }
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok) {
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  }
  try {
    const replacements = await readAllPages(() => db.from("nfe_order_edit_replacements").select("id,order_id,original_document_id,environment,reversal_kind,status,replacement_document_id,operation_draft_id,created_at").neq("status", "completed").order("created_at", { ascending: false }).order("id", { ascending: false }));
    const attempts = await readAllPages(() => db.from("nfe_documents").select("id,order_id,numero_nfe,serie,modelo,ambiente,status,motivo_status,document_type,created_at,updated_at").in("status", OPEN_ATTEMPT_STATUSES).eq("document_type", "outbound").order("created_at", { ascending: false }).order("id", { ascending: false }));
    const candidateOrderIds = [.../* @__PURE__ */ new Set([
      ...replacements.map((row) => String(row.order_id || "")).filter(Boolean),
      ...attempts.map((row) => String(row.order_id || "")).filter(Boolean)
    ])];
    if (candidateOrderIds.length === 0) {
      return res.status(200).json({ success: true, pendencies: [], count: 0 });
    }
    const [orders, authorizedDocs] = await Promise.all([
      readPagesById(candidateOrderIds, (ids) => db.from("orders").select("id,order_index,status,order_type,order_data,created_at,updated_at").in("id", ids).order("id", { ascending: true })),
      readPagesById(candidateOrderIds, (ids) => db.from("nfe_documents").select("id,order_id,ambiente,status,document_type,created_at,numero_nfe").in("order_id", ids).in("status", ["autorizada", "homologada"]).eq("document_type", "outbound").order("created_at", { ascending: false }).order("id", { ascending: false }))
    ]);
    const ordersMap = new Map(orders.map((order) => [String(order.id), order]));
    if (ordersMap.size !== candidateOrderIds.length) {
      throw new FiscalPendenciesDataError("Pedido associado a pend\xEAncia fiscal n\xE3o encontrado.");
    }
    const authorizedMap = /* @__PURE__ */ new Map();
    for (const doc of authorizedDocs) {
      const environment = requireEnvironment(doc.ambiente);
      const key = `${doc.order_id}:${environment}`;
      if (!authorizedMap.has(key)) authorizedMap.set(key, doc);
    }
    const originalDocIds = [...new Set(
      replacements.map((row) => String(row.original_document_id || "")).filter(Boolean)
    )];
    if (replacements.some((row) => !row.original_document_id)) {
      throw new FiscalPendenciesDataError("Substitui\xE7\xE3o sem documento original.");
    }
    const originalDocs = await readPagesById(originalDocIds, (ids) => db.from("nfe_documents").select("id,numero_nfe,serie,modelo,ambiente,status").in("id", ids).order("id", { ascending: true }));
    const originalDocsMap = new Map(originalDocs.map((doc) => [String(doc.id), doc]));
    if (originalDocsMap.size !== originalDocIds.length) {
      throw new FiscalPendenciesDataError("Documento original de substitui\xE7\xE3o n\xE3o encontrado.");
    }
    const pendenciesByKey = /* @__PURE__ */ new Map();
    for (const replacement of replacements) {
      const order = ordersMap.get(String(replacement.order_id));
      const environment = requireEnvironment(replacement.environment);
      const key = `${replacement.order_id}:${environment}`;
      if (pendenciesByKey.has(key)) continue;
      const originalDoc = originalDocsMap.get(String(replacement.original_document_id));
      const model = requireModel(originalDoc.modelo);
      if (requireEnvironment(originalDoc.ambiente) !== environment) {
        throw new FiscalPendenciesDataError("Ambiente da substitui\xE7\xE3o diverge da nota original.");
      }
      const authorizedDoc = authorizedMap.get(key);
      if (authorizedDoc && new Date(authorizedDoc.created_at) > new Date(replacement.created_at)) continue;
      if (isCancelled(order) && replacement.status !== "awaiting_reversal") continue;
      if (!["awaiting_reversal", "ready_to_reissue", "replacement_prepared"].includes(replacement.status)) {
        throw new FiscalPendenciesDataError("Estado de substitui\xE7\xE3o fiscal inv\xE1lido.");
      }
      let pendencyType = "awaiting_new_invoice";
      let situationStatus = "reissue_required";
      let reason = null;
      let currentAttempt = null;
      const matchingAttempt = attempts.find(
        (attempt) => String(attempt.order_id) === String(replacement.order_id) && requireEnvironment(attempt.ambiente) === environment && new Date(attempt.created_at) > new Date(replacement.created_at)
      );
      if (replacement.status === "awaiting_reversal") {
        pendencyType = "prior_regularization_failed";
        situationStatus = "regularization_failed";
        reason = "Aguardando confirma\xE7\xE3o do estorno ou cancelamento anterior";
      } else if (replacement.status === "replacement_prepared") {
        pendencyType = "draft";
      } else if (matchingAttempt) {
        currentAttempt = matchingAttempt;
        const status = String(matchingAttempt.status).toLowerCase();
        if (status === "rejeitada" || status === "denegada") {
          pendencyType = "rejected";
          reason = matchingAttempt.motivo_status || "Rejei\xE7\xE3o SEFAZ na tentativa de emiss\xE3o";
        } else if (status === "transmitting" || status === "unknown") {
          pendencyType = "transmission_uncertain";
          reason = "Transmiss\xE3o com resultado incerto aguardando reconcilia\xE7\xE3o";
        } else if (status === "erro") {
          pendencyType = "processing";
          situationStatus = "failed";
          reason = matchingAttempt.motivo_status || "Falha na emiss\xE3o fiscal";
        }
      }
      const config = FISCAL_PENDENCY_TYPE_CONFIG[pendencyType];
      const customer = customerFromOrder(order);
      pendenciesByKey.set(key, {
        id: `${replacement.order_id}-${environment}`,
        orderId: String(replacement.order_id),
        orderIndex: order.order_index ? `#${order.order_index}` : `#${String(order.id).slice(0, 8)}`,
        ...customer,
        pendencyType,
        environment,
        model,
        originalDocumentId: replacement.original_document_id,
        originalDocumentNumber: originalDoc.numero_nfe || null,
        originalDocumentClosure: replacement.reversal_kind === "cancel" ? "cancelada" : "estornada",
        currentDocumentId: currentAttempt?.id || null,
        currentDocumentNumber: currentAttempt?.numero_nfe || null,
        currentAttemptStatus: currentAttempt?.status || null,
        draftId: replacement.operation_draft_id || null,
        identifiedAt: replacement.created_at,
        situationStatus,
        reason,
        actionKind: config.defaultAction.kind,
        actionLabel: config.defaultAction.label,
        actionIcon: config.defaultAction.icon
      });
    }
    for (const attempt of attempts) {
      const environment = requireEnvironment(attempt.ambiente);
      const model = requireModel(attempt.modelo);
      const key = `${attempt.order_id}:${environment}`;
      if (pendenciesByKey.has(key)) continue;
      const order = ordersMap.get(String(attempt.order_id));
      const authorizedDoc = authorizedMap.get(key);
      if (authorizedDoc && new Date(authorizedDoc.created_at) >= new Date(attempt.created_at)) continue;
      if (isCancelled(order)) continue;
      const status = String(attempt.status).toLowerCase();
      let pendencyType = "rejected";
      let situationStatus = "rejected";
      if (status === "transmitting" || status === "unknown") {
        pendencyType = "transmission_uncertain";
        situationStatus = "regularization_uncertain";
      } else if (status === "erro") {
        pendencyType = "processing";
        situationStatus = "failed";
      }
      const config = FISCAL_PENDENCY_TYPE_CONFIG[pendencyType];
      pendenciesByKey.set(key, {
        id: `${attempt.order_id}-${environment}`,
        orderId: String(attempt.order_id),
        orderIndex: order.order_index ? `#${order.order_index}` : `#${String(order.id).slice(0, 8)}`,
        ...customerFromOrder(order),
        pendencyType,
        environment,
        model,
        originalDocumentId: null,
        originalDocumentNumber: null,
        originalDocumentClosure: null,
        currentDocumentId: attempt.id,
        currentDocumentNumber: attempt.numero_nfe || null,
        currentAttemptStatus: attempt.status,
        draftId: null,
        identifiedAt: attempt.created_at,
        situationStatus,
        reason: attempt.motivo_status || "Falha na emiss\xE3o fiscal",
        actionKind: config.defaultAction.kind,
        actionLabel: config.defaultAction.label,
        actionIcon: config.defaultAction.icon
      });
    }
    const pendencies = [...pendenciesByKey.values()].sort(
      (a, b) => new Date(b.identifiedAt).getTime() - new Date(a.identifiedAt).getTime()
    );
    return res.status(200).json({ success: true, pendencies, count: pendencies.length });
  } catch (error) {
    console.error("[Fiscal] Falha ao carregar pend\xEAncias fiscais:", error instanceof FiscalPendenciesDataError ? error.message : "erro de consulta");
    return res.status(503).json({
      success: false,
      error: "N\xE3o foi poss\xEDvel confirmar a lista completa de pend\xEAncias fiscais. Tente novamente."
    });
  }
}
//# sourceMappingURL=fiscal-pendencies.cjs.map
