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

// api/nfe/reserve-number.ts
var reserve_number_exports = {};
__export(reserve_number_exports, {
  default: () => handler
});
module.exports = __toCommonJS(reserve_number_exports);

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

// api/nfe/reserve-number.ts
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

// api/nfe/reserve-number.ts
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://hkoxhourxwlddgsfdgws.supabase.co";
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST" && req.method !== "GET")
    return res.status(405).json({ success: false, error: "M\xE9todo inv\xE1lido." });
  const serviceKey = getSupabaseSecretKey();
  if (!serviceKey)
    return res.status(503).json({ success: false, error: "Servi\xE7o fiscal indispon\xEDvel." });
  const db = (0, import_supabase_js.createClient)(supabaseUrl, serviceKey);
  const authorization = await authorizeFiscalOperator(db, req.headers.authorization);
  if (!authorization.ok)
    return res.status(authorization.status).json({ success: false, error: authorization.message });
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const model = req.query.model;
    const environment = Number(req.query.environment);
    const series = String(req.query.series ?? "");
    const minimumNumber = Number(req.query.minimumNumber);
    if (model !== "55" && model !== "65" || environment !== 1 && environment !== 2 || !/^\d{1,3}$/.test(series) || !Number.isInteger(minimumNumber) || minimumNumber < 1 || minimumNumber > 999999999)
      return res.status(400).json({ success: false, error: "Par\xE2metros de sequ\xEAncia inv\xE1lidos." });
    const { data, error } = await db.from("nfe_sequences").select("ultimo_numero").eq("modelo", model).eq("serie", series).eq("ambiente", environment).maybeSingle();
    if (error)
      return res.status(500).json({ success: false, error: "N\xE3o foi poss\xEDvel consultar a sequ\xEAncia fiscal." });
    const nextNumber = Math.max(minimumNumber, Number(data?.ultimo_numero ?? 0) + 1);
    return res.status(200).json({ success: true, nextNumber });
  }
  return res.status(409).json({
    success: false,
    code: "FISCAL_CORE_REQUIRED",
    error: "Reserva direta desativada. Modelo, s\xE9rie e n\xFAmero s\xF3 ser\xE3o reservados pelo backend ap\xF3s determina\xE7\xE3o fiscal aprovada.",
    numberReserved: false
  });
}
//# sourceMappingURL=reserve-number.cjs.map
