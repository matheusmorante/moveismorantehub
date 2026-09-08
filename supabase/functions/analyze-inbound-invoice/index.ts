import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const supported = new Set(["application/pdf", "image/png", "image/jpeg"]);
const maxBytes = 12 * 1024 * 1024;
const digits = (value: unknown) => String(value || "").replace(/\D/g, "");
const numeric = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
};

function validateExtraction(value: any) {
  if (!value || typeof value !== "object" || !Array.isArray(value.items)) throw new Error("Resposta estruturada inválida da IA.");
  const invoice = value.invoice || {};
  const issuer = value.issuer || {};
  const key = digits(invoice.accessKey);
  if (key && key.length !== 44) throw new Error("A chave extraída não possui 44 dígitos.");
  const items = value.items.map((item: any, index: number) => ({
    itemNumber: Number(item.itemNumber) || index + 1,
    productCode: String(item.productCode || "").trim(), productDescription: String(item.productDescription || "").trim(),
    ncm: String(item.ncm || "").trim(), cfop: String(item.cfop || "").trim(), unit: String(item.unit || "").trim(),
    quantity: numeric(item.quantity), unitCost: numeric(item.unitCost), totalCost: numeric(item.totalCost), discountValue: numeric(item.discountValue),
    freightValue: numeric(item.freightValue), ipiPercent: numeric(item.ipiPercent), ipiValue: numeric(item.ipiValue), icmsValue: numeric(item.icmsValue),
  }));
  if (!items.length) throw new Error("Nenhum item foi identificado no documento.");
  return { invoice: { accessKey: key, number: String(invoice.number || ""), series: String(invoice.series || ""), issuedAt: invoice.issuedAt || null, entryExitAt: invoice.entryExitAt || null, operationNature: String(invoice.operationNature || ""), model: String(invoice.model || ""), protocol: String(invoice.protocol || ""), totalProducts: numeric(invoice.totalProducts), totalInvoice: numeric(invoice.totalInvoice), freight: numeric(invoice.freight), discount: numeric(invoice.discount), insurance: numeric(invoice.insurance), otherExpenses: numeric(invoice.otherExpenses), ipi: numeric(invoice.ipi), icms: numeric(invoice.icms) }, issuer: { legalName: String(issuer.legalName || ""), tradeName: String(issuer.tradeName || ""), taxId: digits(issuer.taxId), stateRegistration: String(issuer.stateRegistration || ""), address: issuer.address && typeof issuer.address === "object" ? issuer.address : {} }, items, warnings: Array.isArray(value.warnings) ? value.warnings.map(String) : [], confidence: value.confidence && typeof value.confidence === "object" ? value.confidence : {} };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    console.log("[analyze-inbound-invoice] request received", { method: req.method });
    const auth = req.headers.get("Authorization") || "";
    const accessToken = auth.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      console.warn("[analyze-inbound-invoice] missing authorization token");
      return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    // A validação acontece dentro do handler para a mesma regra valer em dev e produção.
    // Nunca logar o token ou aceitar identidade enviada pelo frontend.
    const service = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    const { data: { user }, error: authError } = await service.auth.getUser(accessToken);
    if (authError || !user) {
      console.warn("[analyze-inbound-invoice] invalid authorization token", { reason: authError?.message || "user not found" });
      return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    const mimeType = String(body.mimeType || "").toLowerCase();
    const base64 = String(body.base64 || "").replace(/^data:[^;]+;base64,/, "");
    const fileName = String(body.fileName || "documento").replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!supported.has(mimeType) || !base64) throw new Error("Formato de documento não permitido.");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > maxBytes) throw new Error("O documento excede o limite de 12 MB.");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Integração de análise de documentos não configurada.");
    const prompt = `Extraia SOMENTE fatos legíveis desta nota fiscal brasileira. Não invente nem complete campos ausentes. Retorne JSON válido com invoice, issuer, items, warnings e confidence. Cada item deve permanecer na linha correta. invoice: accessKey,number,series,issuedAt,entryExitAt,operationNature,model,protocol,totalProducts,totalInvoice,freight,discount,insurance,otherExpenses,ipi,icms. issuer: legalName,tradeName,taxId,stateRegistration,address. items[]: itemNumber,productCode,productDescription,ncm,cfop,unit,quantity,unitCost,totalCost,discountValue,freightValue,ipiPercent,ipiValue,icmsValue. confidence pode indicar campos incertos.`;
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }) });
    if (!response.ok) throw new Error("Não foi possível analisar o documento fiscal.");
    const payload = await response.json();
    const text = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("");
    const extraction = validateExtraction(JSON.parse(text));
    const path = `${user.id}/${crypto.randomUUID()}-${fileName}`;
    const { error: uploadError } = await service.storage.from("inbound-invoice-documents").upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) throw new Error("Não foi possível preservar o documento original.");
    console.log("[analyze-inbound-invoice] completed", { itemCount: extraction.items.length, hasAccessKey: Boolean(extraction.invoice.accessKey) });
    return new Response(JSON.stringify({ extraction, documentPath: path, documentMime: mimeType }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[analyze-inbound-invoice] failed", { message: error?.message || "unknown error" });
    return new Response(JSON.stringify({ error: error?.message || "Falha ao processar NF." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
