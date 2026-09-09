import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ensureGeminiFile, sha256Hex } from "../_shared/geminiFiles.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const supported = new Set(["application/pdf", "image/png", "image/jpeg"]);
const maxBytes = 12 * 1024 * 1024;
const EXTRACTION_SCHEMA_VERSION = "nfe-extraction-v2";
const EXTRACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: ["invoice", "issuer", "recipient", "items", "warnings", "confidence"],
  properties: {
    documentKind: { type: "STRING" },
    isConsumerInvoice: { type: "BOOLEAN" },
    invoice: { type: "OBJECT", properties: { accessKey: { type: "STRING" }, number: { type: "STRING" }, series: { type: "STRING" }, issuedAt: { type: "STRING" }, operationNature: { type: "STRING" }, model: { type: "STRING" }, totalProducts: { type: "STRING" }, totalInvoice: { type: "STRING" }, freight: { type: "STRING" }, discount: { type: "STRING" }, insurance: { type: "STRING" }, otherExpenses: { type: "STRING" }, ipi: { type: "STRING" }, icms: { type: "STRING" }, icmsSt: { type: "STRING" } } },
    issuer: { type: "OBJECT", properties: { legalName: { type: "STRING" }, tradeName: { type: "STRING" }, taxId: { type: "STRING" }, stateRegistration: { type: "STRING" } } },
    recipient: { type: "OBJECT", properties: { legalName: { type: "STRING" }, taxId: { type: "STRING" } } },
    items: { type: "ARRAY", items: { type: "OBJECT", properties: { itemNumber: { type: "STRING" }, productCode: { type: "STRING" }, productDescription: { type: "STRING" }, ean: { type: "STRING" }, ncm: { type: "STRING" }, cest: { type: "STRING" }, cfop: { type: "STRING" }, unit: { type: "STRING" }, quantity: { type: "STRING" }, unitCost: { type: "STRING" }, totalCost: { type: "STRING" }, discountValue: { type: "STRING" }, freightValue: { type: "STRING" }, insuranceValue: { type: "STRING" }, otherExpensesValue: { type: "STRING" }, ipiPercent: { type: "STRING" }, ipiValue: { type: "STRING" }, icmsPercent: { type: "STRING" }, icmsBaseValue: { type: "STRING" }, icmsValue: { type: "STRING" }, icmsStPercent: { type: "STRING" }, icmsStBaseValue: { type: "STRING" }, icmsStValue: { type: "STRING" }, normalizedParentName: { type: "STRING" }, detectedSupplierCodeFamily: { type: "STRING" } } } },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    confidence: { type: "OBJECT", properties: {} },
  },
};
const digits = (value: unknown) => String(value || "").replace(/\D/g, "");
const validateAccessKey = (value: unknown) => {
  const raw = String(value || "").trim();
  const normalized = digits(raw);
  // A chave é uma sugestão da leitura visual, não uma condição para importar a NF.
  // DANFEs normalmente a exibem em blocos de 4 dígitos separados por espaços.
  // Mantemos somente os dígitos lidos para a pessoa revisar depois, mesmo se estiver
  // incompleta ou com leitura imprecisa.
  if (!normalized) return { valid: false, normalized, reason: "access_key_missing" };
  if (normalized.length !== 44) return { valid: false, normalized, reason: "access_key_needs_review" };
  if (/[^\d\s.\-\/]/.test(raw)) return { valid: false, normalized, reason: "access_key_needs_review" };
  if (normalized.slice(20, 22) !== "55") return { valid: false, normalized, reason: "access_key_model_invalid" };
  const weights = [4,3,2,9,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2];
  const sum = weights.reduce((total, weight, index) => total + Number(normalized[index]) * weight, 0);
  const expected = 11 - (sum % 11);
  const digit = expected >= 10 ? 0 : expected;
  return Number(normalized[43]) === digit ? { valid: true, normalized } : { valid: false, normalized, reason: "access_key_check_digit_invalid" };
};
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
  const documentKind = String(value.documentKind || invoice.documentKind || "").toUpperCase();
  const model = String(invoice.model || "").replace(/\D/g, "");
  const isConsumerInvoice = value.isConsumerInvoice === true || documentKind === "NFC-E" || model === "65";
  if (isConsumerInvoice) {
    throw new Error("NFC-e (modelo 65) não pode ser importada como NF de Entrada. Envie uma NF-e de fornecedor, modelo 55.");
  }
  const issuer = value.issuer || {};
  const recipient = value.recipient || {};
  const rawKey = invoice.accessKey || value.accessKey || "";
  const keyValidation = validateAccessKey(rawKey);
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
  const accessKeyConfidence = keyValidation.valid ? 0.9 : 0;
  return { invoice: { accessKey: keyValidation.normalized, accessKeyRaw: keyValidation.normalized || null, number: String(invoice.number || ""), series: String(invoice.series || ""), issuedAt: invoice.issuedAt || null, entryExitAt: invoice.entryExitAt || null, operationNature: String(invoice.operationNature || ""), model: String(invoice.model || ""), protocol: String(invoice.protocol || ""), additionalInfo: String(invoice.additionalInfo || ""), totalProducts: numeric(invoice.totalProducts), totalInvoice: numeric(invoice.totalInvoice), freight: numeric(invoice.freight), discount: numeric(invoice.discount), insurance: numeric(invoice.insurance), otherExpenses: numeric(invoice.otherExpenses), ipi: numeric(invoice.ipi), icms: numeric(invoice.icms), icmsSt: numeric(invoice.icmsSt) }, issuer: { legalName: String(issuer.legalName || ""), tradeName: String(issuer.tradeName || ""), taxId: digits(issuer.taxId), stateRegistration: String(issuer.stateRegistration || ""), address: issuer.address && typeof issuer.address === "object" ? issuer.address : {} }, recipient: { legalName: String(recipient.legalName || ""), taxId: digits(recipient.taxId) }, items, warnings: Array.from(new Set(warnings)), confidence: { ...confidence, accessKey: { value: keyValidation.normalized || null, rawValue: keyValidation.normalized || null, confidence: accessKeyConfidence, source: "gemini_vision", validated: keyValidation.valid } }, validation: { valid: true, access_key_valid: keyValidation.valid, warnings: Array.from(new Set(warnings)) }, needs_review: warnings.length > 0 };
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
    let legacyInlinePayload = false;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const uploaded = form.get("file");
      if (!(uploaded instanceof File)) throw new Error("Arquivo da NF não foi enviado.");
      mimeType = String(uploaded.type || "").toLowerCase();
      fileName = String(uploaded.name || fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      bytes = new Uint8Array(await uploaded.arrayBuffer());
    } else {
      // Compatibilidade temporária com versões antigas do ERP. Novas versões
      // enviam multipart para não duplicar o documento em Base64 no navegador.
      const body = await req.json();
      mimeType = String(body.mimeType || "").toLowerCase();
      const base64 = String(body.base64 || "").replace(/^data:[^;]+;base64,/, "");
      fileName = String(body.fileName || fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!base64) throw new Error("Arquivo da NF não foi enviado.");
      bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
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
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Integração de análise de documentos não configurada.");
    const prompt = `Você é um sistema especializado em leitura de DANFE/NF-e brasileira. Analise a estrutura visual e os rótulos do documento; não faça OCR cego. Este fluxo aceita EXCLUSIVAMENTE NF-e de fornecedor, modelo 55. Rejeite NFC-e, cupom fiscal, DANFE NFC-e ou modelo 65: retorne documentKind:"NFC-E", isConsumerInvoice:true e items:[].

REGRAS ABSOLUTAS: nunca invente, estime, complete ou corrija números. Se não puder ler um campo, retorne null. Preserve os dígitos observados. Diferencie chave de acesso, protocolo, número da NF e código de barras. Para a chave, procure o rótulo "CHAVE DE ACESSO" e a região associada. Em DANFEs ela normalmente aparece em grupos de quatro dígitos separados por espaços; leia todos os grupos visíveis e retorne somente os dígitos, sem preencher ou adivinhar o que faltar. A chave é OPCIONAL: se estiver parcial, ilegível ou ausente, retorne o que foi possível (ou null), sem rejeitar o documento. Para itens, respeite linhas e colunas da tabela.

Além da extração fiscal, para CADA item extraia normalizedParentName e extractedAttributes {color,measure,doors,material,feet,mirror}. Cor sempre deve ser analisada semanticamente, inclusive cores compostas como "Freijó/Off White". Remova somente atributos reais de variação do nome-base: números de portas, medidas, modelo e função do móvel não podem ser apagados. detectedSupplierCodeFamily é apenas a parte comum provável do código do fornecedor quando a descrição também apoiar a família; caso contrário null. Não conclua que itens são o mesmo produto apenas por códigos parecidos. Valores e custos nunca definem identidade ou variação: no máximo são evidência complementar quando nome, fornecedor, código e atributos já forem coerentes.

Retorne SOMENTE JSON válido: {documentKind,isConsumerInvoice,invoice:{accessKey,number,series,issuedAt,entryExitAt,operationNature,model,protocol,additionalInfo,totalProducts,totalInvoice,freight,discount,insurance,otherExpenses,ipi,icms,icmsSt},issuer:{legalName,tradeName,taxId,stateRegistration,address},recipient:{legalName,taxId},items:[{itemNumber,productCode,productDescription,ean,ncm,cest,cfop,unit,quantity,unitCost,totalCost,discountValue,freightValue,insuranceValue,otherExpensesValue,ipiPercent,ipiValue,icmsPercent,icmsBaseValue,icmsValue,icmsStPercent,icmsStBaseValue,icmsStValue,normalizedParentName,extractedAttributes:{color,measure,doors,material,feet,mirror},detectedSupplierCodeFamily}],warnings,confidence}.`;
    const geminiFile = await ensureGeminiFile({
      supabase: service, ownerId: user.id, sourcePath: path, bytes, mimeType,
      displayName: fileName, apiKey, sha256: fileSha256,
    });
    const inferenceStartedAt = Date.now();
    const parts = [{ text: prompt }, { fileData: { mimeType, fileUri: geminiFile.reference.fileUri } }];
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", responseSchema: EXTRACTION_RESPONSE_SCHEMA, temperature: 0 } }) });
    if (!response.ok) {
      const detail = await response.text();
      console.error("[analyze-inbound-invoice] Gemini inference failed", { status: response.status, detail: detail.slice(0, 500) });
      throw new Error("Não foi possível analisar o documento fiscal.");
    }
    const payload = await response.json();
    const geminiInferenceMs = Date.now() - inferenceStartedAt;
    const validationStartedAt = Date.now();
    const text = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("");
    const extraction = validateExtraction(JSON.parse(text));
    const structuredOutputValidationMs = Date.now() - validationStartedAt;
    console.log("[analyze-inbound-invoice] completed", { itemCount: extraction.items.length, hasAccessKey: Boolean(extraction.invoice.accessKey), needsReview: extraction.needs_review, transport: legacyInlinePayload ? "legacy_base64" : "multipart", fileSha256, mimeType, fileSize: bytes.byteLength, extractionSchemaVersion: EXTRACTION_SCHEMA_VERSION, gemini_file_reused: geminiFile.reused, retry_count: geminiFile.retryCount, timings: { file_validation_ms: Date.now() - startedAt, storage_upload_ms: storageUploadMs, gemini_file_upload_ms: geminiFile.uploadMs, gemini_file_processing_ms: geminiFile.processingMs, gemini_inference_ms: geminiInferenceMs, structured_output_validation_ms: structuredOutputValidationMs, total_processing_ms: Date.now() - startedAt } });
    return new Response(JSON.stringify({ success: true, extraction, validation: extraction.validation, confidence: extraction.confidence?.accessKey?.confidence || 0, needs_review: extraction.needs_review, sources: { ocr: false, barcode: false, gemini: true, geminiFiles: true }, documentPath: path, documentMime: mimeType, extractionSchemaVersion: EXTRACTION_SCHEMA_VERSION, sourceFileSha256: fileSha256, geminiFileReused: geminiFile.reused }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[analyze-inbound-invoice] failed", { message: error?.message || "unknown error" });
    return new Response(JSON.stringify({ error: error?.message || "Falha ao processar NF." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
