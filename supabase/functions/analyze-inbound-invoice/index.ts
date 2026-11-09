import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const supported = new Set(["application/pdf", "image/png", "image/jpeg"]);
const maxBytes = 12 * 1024 * 1024;
const EXTRACTION_SCHEMA_VERSION = "nfe-extraction-v3";
const sha256Hex = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const digits = (value: unknown) => String(value || "").replace(/\D/g, "");
const validateOcrAccessKey = (value: unknown) => {
  const normalized = String(value || "").trim().toUpperCase().replace(/[.\-/\s]/g, "");
  if (!normalized) return { valid: false, normalized, reason: "access_key_missing" };
  if (!/^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$/.test(normalized)) return { valid: false, normalized: "", reason: "access_key_needs_review" };
  if (normalized.slice(20, 22) !== "55") return { valid: false, normalized: "", reason: "access_key_model_invalid" };
  let sum = 0;
  for (let index = 42, weight = 2; index >= 0; index--) {
    sum += (normalized.charCodeAt(index) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const calculated = 11 - (sum % 11);
  const checkDigit = calculated >= 10 ? 0 : calculated;
  return Number(normalized[43]) === checkDigit
    ? { valid: true, normalized }
    : { valid: false, normalized: "", reason: "access_key_check_digit_invalid" };
};
const numeric = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const result = Number(normalized);
  return Number.isFinite(result) ? result : 0;
};

function validateExtraction(value: any, deterministicAccessKey: unknown) {
  if (!value || typeof value !== "object" || !Array.isArray(value.items)) throw new Error("Resposta estruturada inválida da IA.");
  const invoice = value.invoice || {};
  const documentKind = String(value.documentKind || invoice.documentKind || "").toUpperCase();
  const model = String(invoice.model || "").replace(/\D/g, "");
  const isConsumerInvoice = value.isConsumerInvoice === true || documentKind === "NFC-E" || model === "65";
  if (isConsumerInvoice) {
    throw new Error("NFC-e (modelo 65) não pode ser importada como NF de Entrada. Envie uma NF-e de fornecedor, modelo 55.");
  }
  const issuer = value.issuer || {};
  const recipient = value.recipient || {};
  // A chave de acesso vem do OCR local determinístico; o modelo não lê nem corrige este campo.
  const keyValidation = validateOcrAccessKey(deterministicAccessKey);
  const warnings = Array.isArray(value.warnings) ? value.warnings.map(String) : [];
  if (!keyValidation.valid) warnings.push(keyValidation.reason);
  const items = value.items.map((item: any, index: number) => ({
    itemNumber: Number(item.itemNumber) || index + 1,
    productCode: String(item.productCode || "").trim(), productDescription: String(item.productDescription || "").trim(),
    ncm: String(item.ncm || "").trim(), cfop: String(item.cfop || "").trim(), unit: String(item.unit || "").trim(),
    quantity: numeric(item.quantity), unitCost: numeric(item.unitCost), totalCost: numeric(item.totalCost), discountValue: numeric(item.discountValue),
    ean: String(item.ean || "").trim(), cest: String(item.cest || "").trim(), freightValue: numeric(item.freightValue), insuranceValue: numeric(item.insuranceValue), otherExpensesValue: numeric(item.otherExpensesValue), ipiPercent: numeric(item.ipiPercent), ipiValue: numeric(item.ipiValue), icmsPercent: numeric(item.icmsPercent), icmsBaseValue: numeric(item.icmsBaseValue), icmsValue: numeric(item.icmsValue), icmsStPercent: numeric(item.icmsStPercent), icmsStBaseValue: numeric(item.icmsStBaseValue), icmsStValue: numeric(item.icmsStValue),
    normalizedParentName: String(item.normalizedParentName || "").trim(), extractedAttributes: item.extractedAttributes && typeof item.extractedAttributes === "object" ? item.extractedAttributes : {}, detectedSupplierCodeFamily: String(item.detectedSupplierCodeFamily || "").trim() || null,
  }));
  if (!items.length) throw new Error("Nenhum item foi identificado no documento.");
  const confidence = value.confidence && typeof value.confidence === "object" ? value.confidence : {};
  const accessKeyConfidence = keyValidation.valid ? 1 : 0;
  return { invoice: { accessKey: keyValidation.normalized, accessKeyRaw: keyValidation.normalized || null, number: String(invoice.number || ""), series: String(invoice.series || ""), issuedAt: invoice.issuedAt || null, entryExitAt: invoice.entryExitAt || null, operationNature: String(invoice.operationNature || ""), model: String(invoice.model || ""), protocol: String(invoice.protocol || ""), additionalInfo: String(invoice.additionalInfo || ""), totalProducts: numeric(invoice.totalProducts), totalInvoice: numeric(invoice.totalInvoice), freight: numeric(invoice.freight), discount: numeric(invoice.discount), insurance: numeric(invoice.insurance), otherExpenses: numeric(invoice.otherExpenses), ipi: numeric(invoice.ipi), icms: numeric(invoice.icms), icmsSt: numeric(invoice.icmsSt) }, issuer: { legalName: String(issuer.legalName || ""), tradeName: String(issuer.tradeName || ""), taxId: digits(issuer.taxId), stateRegistration: String(issuer.stateRegistration || ""), address: issuer.address && typeof issuer.address === "object" ? issuer.address : {} }, recipient: { legalName: String(recipient.legalName || ""), taxId: digits(recipient.taxId) }, items, warnings: Array.from(new Set(warnings)), confidence: { ...confidence, accessKey: { value: keyValidation.normalized || null, rawValue: keyValidation.normalized || null, confidence: accessKeyConfidence, source: keyValidation.valid ? "ocr" : "unavailable", validated: keyValidation.valid } }, validation: { valid: true, access_key_valid: keyValidation.valid, warnings: Array.from(new Set(warnings)) }, needs_review: warnings.length > 0 };
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
    const startedAt = Date.now();
    const contentType = req.headers.get("content-type") || "";
    let mimeType = "";
    let fileName = "documento";
    let bytes: Uint8Array;
    let deterministicAccessKey: string | null = null;
    let legacyInlinePayload = false;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const uploaded = form.get("file");
      if (!(uploaded instanceof File)) throw new Error("Arquivo da NF não foi enviado.");
      mimeType = String(uploaded.type || "").toLowerCase();
      fileName = String(uploaded.name || fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      bytes = new Uint8Array(await uploaded.arrayBuffer());
      deterministicAccessKey = String(form.get("accessKey") || "");
    } else {
      // Compatibilidade temporária com versões antigas do ERP. Novas versões
      // enviam multipart para não duplicar o documento em Base64 no navegador.
      const body = await req.json();
      mimeType = String(body.mimeType || "").toLowerCase();
      const base64 = String(body.base64 || "").replace(/^data:[^;]+;base64,/, "");
      fileName = String(body.fileName || fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!base64) throw new Error("Arquivo da NF não foi enviado.");
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      deterministicAccessKey = String(body.accessKey || "");
      legacyInlinePayload = true;
    }
    if (!supported.has(mimeType)) throw new Error("Formato de documento não permitido.");
    if (bytes.byteLength > maxBytes) throw new Error("O documento excede o limite de 12 MB.");
    const fileSha256 = await sha256Hex(bytes);
    const storageStartedAt = Date.now();
    const path = `${user.id}/${fileSha256}-${crypto.randomUUID()}-${fileName}`;
    const { error: uploadError } = await service.storage.from("inbound-invoice-documents").upload(path, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) throw new Error("Não foi possível preservar o documento original.");
    const storageUploadMs = Date.now() - storageStartedAt;
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("Integração de análise de documentos não configurada.");
    const prompt = `Você é um sistema especializado em leitura de DANFE/NF-e brasileira. Analise a estrutura visual e os rótulos do documento; não faça OCR cego. Este fluxo aceita EXCLUSIVAMENTE NF-e de fornecedor, modelo 55. Rejeite NFC-e, cupom fiscal, DANFE NFC-e ou modelo 65: retorne documentKind:"NFC-E", isConsumerInvoice:true e items:[].

REGRAS ABSOLUTAS: nunca invente, estime, complete ou corrija números. Se não puder ler um campo, retorne null. Preserve os valores observados. Não extraia nem infira a chave de acesso; ela é obtida por OCR local e validação determinística, fora deste modelo. Diferencie número da NF, protocolo e valores. Para itens, respeite linhas e colunas da tabela.

Além da extração fiscal, para CADA item extraia normalizedParentName e extractedAttributes {color,measure,doors,material,feet,mirror}. Cor sempre deve ser analisada semanticamente, inclusive cores compostas como "Freijó/Off White". Remova somente atributos reais de variação do nome-base: números de portas, medidas, modelo e função do móvel não podem ser apagados. detectedSupplierCodeFamily é apenas a parte comum provável do código do fornecedor quando a descrição também apoiar a família; caso contrário null. Não conclua que itens são o mesmo produto apenas por códigos parecidos. Valores e custos nunca definem identidade ou variação: no máximo são evidência complementar quando nome, fornecedor, código e atributos já forem coerentes.

Retorne SOMENTE JSON válido: {documentKind,isConsumerInvoice,invoice:{number,series,issuedAt,entryExitAt,operationNature,model,protocol,additionalInfo,totalProducts,totalInvoice,freight,discount,insurance,otherExpenses,ipi,icms,icmsSt},issuer:{legalName,tradeName,taxId,stateRegistration,address},recipient:{legalName,taxId},items:[{itemNumber,productCode,productDescription,ean,ncm,cest,cfop,unit,quantity,unitCost,totalCost,discountValue,freightValue,insuranceValue,otherExpensesValue,ipiPercent,ipiValue,icmsPercent,icmsBaseValue,icmsValue,icmsStPercent,icmsStBaseValue,icmsStValue,normalizedParentName,extractedAttributes:{color,measure,doors,material,feet,mirror},detectedSupplierCodeFamily}],warnings,confidence}.`;
    const { data: quotaCheck, error: quotaCheckErr } = await service.rpc("check_and_reserve_ai_quota", {
      p_provider: "openai",
      p_service: "openai_gpt",
      p_estimated_tokens: 3000,
      p_module_source: "estoque_nfe_inbound",
      p_reserve: false,
    });
    if (quotaCheckErr || (quotaCheck && !quotaCheck.allowed)) {
      const msg = quotaCheck?.message || "Limite de uso de IA para leitura de notas fiscais atingido.";
      console.warn("[analyze-inbound-invoice] Quota exceeded or blocked:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signedUrlError } = await service.storage
      .from("inbound-invoice-documents")
      .createSignedUrl(path, 300);
    if (signedUrlError || !signed?.signedUrl) throw new Error("Não foi possível preparar o documento para análise.");
    const inferenceStartedAt = Date.now();
    const documentInput = mimeType === "application/pdf"
      ? { type: "input_file", file_url: signed.signedUrl }
      : { type: "input_image", image_url: signed.signedUrl };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, documentInput] }],
        text: { format: { type: "json_object" } },
        reasoning: { effort: "low" },
        max_output_tokens: 4096,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      const status = response.status;
      console.error("[analyze-inbound-invoice] OpenAI inference failed", { status });
      void Promise.resolve().then(() => service.rpc("record_ai_token_usage", {
        p_provider: "openai",
        p_service: "openai_gpt",
        p_operation: "inbound_invoice_ocr [gpt-6-luna]",
        p_prompt_tokens: 0,
        p_completion_tokens: 0,
        p_total_tokens: 0,
        p_module_source: "estoque_nfe_inbound",
        p_environment: "production",
        p_response_time_ms: Date.now() - inferenceStartedAt,
        p_status: "ERROR",
        p_error_message: `OpenAI HTTP ${status}`,
      })).catch(() => undefined);
      throw new Error("Não foi possível analisar o documento fiscal.");
    }
    const payload = await response.json();
    const openAiInferenceMs = Date.now() - inferenceStartedAt;

    const promptTokens = Number(payload?.usage?.input_tokens || 0);
    const candidateTokens = Number(payload?.usage?.output_tokens || 0);
    const totalTokens = Number(payload?.usage?.total_tokens || 0);

    void Promise.resolve().then(() => service.rpc("record_ai_token_usage", {
      p_provider: "openai",
      p_service: "openai_gpt",
      p_operation: "inbound_invoice_ocr [gpt-6-luna]",
      p_prompt_tokens: promptTokens,
      p_completion_tokens: candidateTokens,
      p_total_tokens: totalTokens,
      p_module_source: "estoque_nfe_inbound",
      p_environment: "production",
      p_response_time_ms: openAiInferenceMs,
      p_status: "SUCCESS",
    })).catch((e: any) => console.warn("[analyze-inbound-invoice] Falha ao registrar telemetria:", e));
    const validationStartedAt = Date.now();
    const text = typeof payload?.output_text === "string"
      ? payload.output_text
      : (payload?.output || [])
        .filter((item: any) => item?.type === "message")
        .flatMap((item: any) => item?.content || [])
        .filter((item: any) => item?.type === "output_text" && typeof item.text === "string")
        .map((item: any) => item.text)
        .join("");
    const extraction = validateExtraction(JSON.parse(text), deterministicAccessKey);
    const structuredOutputValidationMs = Date.now() - validationStartedAt;
    console.log("[analyze-inbound-invoice] completed", { itemCount: extraction.items.length, hasAccessKey: Boolean(extraction.invoice.accessKey), needsReview: extraction.needs_review, transport: legacyInlinePayload ? "legacy_base64" : "multipart", fileSha256, mimeType, fileSize: bytes.byteLength, extractionSchemaVersion: EXTRACTION_SCHEMA_VERSION, timings: { file_validation_ms: Date.now() - startedAt, storage_upload_ms: storageUploadMs, openai_inference_ms: openAiInferenceMs, structured_output_validation_ms: structuredOutputValidationMs, total_processing_ms: Date.now() - startedAt } });
    return new Response(JSON.stringify({ success: true, extraction, validation: extraction.validation, confidence: extraction.confidence?.accessKey?.confidence || 0, needs_review: extraction.needs_review, sources: { ocr: Boolean(extraction.invoice.accessKey), barcode: false, openai: true }, documentPath: path, documentMime: mimeType, extractionSchemaVersion: EXTRACTION_SCHEMA_VERSION, sourceFileSha256: fileSha256 }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[analyze-inbound-invoice] failed", { message: error?.message || "unknown error" });
    return new Response(JSON.stringify({ error: error?.message || "Falha ao processar NF." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
