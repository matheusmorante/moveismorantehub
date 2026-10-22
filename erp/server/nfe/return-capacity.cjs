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

// api/nfe/return-capacity.ts
var return_capacity_exports = {};
__export(return_capacity_exports, {
  default: () => handler
});
module.exports = __toCommonJS(return_capacity_exports);

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

// api/nfe/return-capacity.ts
var import_supabase_js = require("@supabase/supabase-js");

// erp/src/pages/utils/nfe/invoiceLineSnapshot.ts
var decodeXml = (value) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
var childText = (xml, tag) => {
  const found = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return found ? decodeXml(found[1].replace(/<[^>]+>/g, "").trim()) : "";
};
var decimal = (value) => {
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
    const billedQuantity = decimal(childText(productXml, "qCom"));
    const unitValue = decimal(childText(productXml, "vUnCom"));
    const grossValue = decimal(childText(productXml, "vProd"));
    const discountValue = decimal(childText(productXml, "vDesc") || "0");
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

// shared-utils/testArtifactPolicy.ts
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
function normalizeTestRunId(value) {
  if (typeof value !== "string") return null;
  const uuid = value.replace(/^TEST_AUT_/i, "").toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid) ? uuid : null;
}
function normalizeTestArtifactScenarioKey(value) {
  if (typeof value !== "string") return null;
  const scenarioKey = value.trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{2,63}$/.test(scenarioKey) ? scenarioKey : null;
}
function artifactData(value) {
  const row = record(value);
  const data = record(row.order_data ?? row.orderData ?? value);
  let metadata = data.testArtifact ?? record(data.technical_specs ?? data.technicalSpecs).testArtifact ?? record(data.full_address ?? data.fullAddress).testArtifact ?? record(data.address).testArtifact ?? record(data.attributes).testArtifact;
  if (metadata === void 0) {
    for (const note of [data.notes, data.observation]) {
      if (typeof note !== "string") continue;
      try {
        metadata = record(JSON.parse(note)).testArtifact;
      } catch {
      }
      if (metadata !== void 0) break;
    }
  }
  return metadata === void 0 ? data : record(metadata);
}
function isIdentifiedTestArtifact(value) {
  const data = artifactData(value);
  const row = record(value);
  const root = record(row.order_data ?? row.orderData ?? value);
  if (root.is_test === true || root.is_test === "true" || root.isTest === true || root.isTest === "true") return true;
  return data.is_test === true || data.is_test === "true" || data.isTest === true || data.isTest === "true";
}
function readTestArtifactIdentity(value) {
  const data = artifactData(value);
  if (data.is_test !== true) return null;
  const runId = normalizeTestRunId(data.runId ?? data.testRunId ?? data.test_run_id);
  const owner = data.ownerId ?? data.testOwnerId;
  const ownerId = typeof owner === "string" && !/^TEST_AUT_/i.test(owner) ? normalizeTestRunId(owner) : null;
  const rawScenarioKey = data.scenarioKey ?? data.scenario_key;
  const scenarioKey = rawScenarioKey === void 0 ? null : normalizeTestArtifactScenarioKey(rawScenarioKey);
  return runId && ownerId ? { runId, ownerId, ...scenarioKey ? { scenarioKey } : {} } : null;
}

// api/nfe/return-capacity.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
var serviceKey = getSupabaseSecretKey() || "";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "M\xE9todo n\xE3o permitido." });
  if (!serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const supabase = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const fiscalAuthorization = await authorizeFiscalOperator(supabase, req.headers.authorization);
  if (!fiscalAuthorization.ok)
    return res.status(fiscalAuthorization.status).json({
      success: false,
      error: fiscalAuthorization.message
    });
  const orderId = String(req.body?.orderId || "");
  if (!orderId)
    return res.status(400).json({ success: false, error: "Pedido original n\xE3o informado." });
  try {
    const { data: source, error: sourceError } = await supabase.from("orders").select("id,order_type,status,order_data").eq("id", orderId).maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.order_type !== "sale")
      return res.status(409).json({ success: false, error: "Venda original n\xE3o encontrada." });
    const data = source.order_data || {};
    const hasTestMetadata = isIdentifiedTestArtifact(data) || Boolean(data.testArtifact || data.test_environment || data.testRunId);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const identity = readTestArtifactIdentity(data);
    const canonicalHmlTest = data.is_test === true && data.testArtifact?.is_test === true && uuid.test(String(data.testArtifact.runId || "")) && identity?.ownerId === fiscalAuthorization.userId.toLowerCase();
    const legacyHmlTest = !data.testArtifact && data.is_test === true && data.test_environment === "homologation" && typeof data.testRunId === "string" && uuid.test(data.testRunId.trim()) && uuid.test(String(source.id));
    const isHmlTest = canonicalHmlTest || legacyHmlTest;
    if (hasTestMetadata && !isHmlTest)
      return res.status(409).json({ success: false, error: "Identifica\xE7\xE3o do ambiente de teste incompleta." });
    const environment = isHmlTest ? 2 : 1;
    if (req.body?.environment !== void 0 && req.body.environment !== environment)
      return res.status(409).json({ success: false, error: "Ambiente fiscal difere da venda original." });
    const { data: docsData, error: docsError } = await supabase.from("nfe_documents").select("id,modelo,ambiente,status,document_type,xml_nfe,created_at").eq("order_id", orderId).eq("document_type", "outbound").eq("status", environment === 1 ? "autorizada" : "homologada").eq("ambiente", environment).in("modelo", ["55", "65"]).order("created_at", { ascending: true });
    if (docsError) throw docsError;
    const docs = docsData || [];
    if (!docs.length)
      return res.status(200).json({
        success: true,
        environment,
        hasAuthorizedInvoice: false,
        hasAuthorizedProductionInvoice: false,
        lines: []
      });
    const documentIds = docs.map((doc) => doc.id);
    const lines = [];
    for (const doc of docs) {
      if (!doc.xml_nfe)
        throw new Error(
          `XML da NF-e autorizada ${doc.id} indispon\xEDvel; n\xE3o \xE9 poss\xEDvel calcular saldo fiscal.`
        );
      const parsedLines = parseAuthorizedInvoiceLines(doc.xml_nfe);
      const { data: snapshotsData, error: snapshotError } = await supabase.from("nfe_document_items").select("item_number,billed_quantity,product_code,description").eq("document_id", doc.id);
      if (snapshotError) throw snapshotError;
      const snapshots = snapshotsData || [];
      if (!snapshots.length || snapshots.length !== parsedLines.length || parsedLines.some(
        (line) => !snapshots.some(
          (snapshot) => snapshot.item_number === line.invoiceItemNumber && Number(snapshot.billed_quantity) === line.billedQuantity
        )
      )) {
        throw new Error(
          "NF-e antiga sem itens fiscais reconciliados. A devolu\xE7\xE3o fiscal requer confer\xEAncia manual da origem."
        );
      }
      lines.push(
        ...parsedLines.map((line) => ({
          originalDocumentId: doc.id,
          originalEnvironment: environment,
          originalModel: doc.modelo,
          originalItemNumber: line.invoiceItemNumber,
          productCode: line.productCode,
          description: line.description,
          billedQuantity: line.billedQuantity
        }))
      );
    }
    const { data: priorReturnsData, error: priorReturnsError } = await supabase.from("orders").select("id,status,items,order_data").eq("order_type", "return").or(`linked_order_id.eq.${orderId},order_data->>linkedOrderId.eq.${orderId}`);
    if (priorReturnsError) throw priorReturnsError;
    const priorReturns = priorReturnsData || [];
    const { data: priorAllocationsData, error: priorAllocationError } = await supabase.from("nfe_return_item_allocations").select(
      "return_order_id,return_item_index,original_document_id,original_item_number,quantity"
    ).in("original_document_id", documentIds);
    if (priorAllocationError) throw priorAllocationError;
    const priorAllocations = priorAllocationsData || [];
    const alreadyMappedReturns = new Set(
      priorAllocations.map((allocation) => allocation.return_order_id)
    );
    const unmappedReturn = priorReturns.find((row) => {
      if (["cancelled", "cancelado"].includes(
        String(row.status || row.order_data?.status || "").toLowerCase()
      ))
        return false;
      if (!alreadyMappedReturns.has(row.id)) return true;
      const returnedItems = row.items || row.order_data?.items || [];
      return returnedItems.some((item, index) => {
        const quantity = Number(item.returnedQuantity ?? item.quantity);
        const mapped = priorAllocations.filter(
          (allocation) => allocation.return_order_id === row.id && allocation.return_item_index === index
        ).reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
        return !Number.isFinite(quantity) || Math.abs(mapped - quantity) > 1e-4;
      });
    });
    if (unmappedReturn) {
      throw new Error(
        "H\xE1 devolu\xE7\xE3o anterior sem v\xEDnculo fiscal conferido. Reconcilie-a manualmente antes de calcular novo saldo."
      );
    }
    const allocations = priorAllocations;
    const returnOrderIds = [
      ...new Set((allocations || []).map((allocation) => allocation.return_order_id))
    ];
    const { data: returnOrdersData, error: returnOrderError } = returnOrderIds.length ? await supabase.from("orders").select("id,status,order_data").in("id", returnOrderIds) : { data: [], error: null };
    if (returnOrderError) throw returnOrderError;
    const returnOrders = returnOrdersData || [];
    const statusByOrderId = new Map(
      returnOrders.map((row) => [row.id, row.status || row.order_data?.status || "scheduled"])
    );
    const result = lines.map((line) => {
      const related = (allocations || []).filter(
        (allocation) => allocation.original_document_id === line.originalDocumentId && allocation.original_item_number === line.originalItemNumber && !["cancelled", "cancelado"].includes(
          String(statusByOrderId.get(allocation.return_order_id) || "").toLowerCase()
        )
      );
      const reservedQuantity = related.reduce(
        (sum, allocation) => sum + Number(allocation.quantity || 0),
        0
      );
      return {
        ...line,
        reservedQuantity,
        availableQuantity: Math.max(line.billedQuantity - reservedQuantity, 0)
      };
    });
    return res.status(200).json({
      success: true,
      environment,
      hasAuthorizedInvoice: true,
      hasAuthorizedProductionInvoice: environment === 1,
      lines: result
    });
  } catch (error) {
    console.error(
      "[NF-e Return Capacity] Falha ao calcular saldo fiscal:",
      error?.message || "erro desconhecido"
    );
    return res.status(503).json({
      success: false,
      error: error?.message || "N\xE3o foi poss\xEDvel validar o saldo faturado."
    });
  }
}
//# sourceMappingURL=return-capacity.cjs.map
