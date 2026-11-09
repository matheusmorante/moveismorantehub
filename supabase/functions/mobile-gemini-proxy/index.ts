import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  CHARACTERISTICS_OPERATION,
  DESCRIPTION_OPERATION,
  type Operation,
  buildSystemInstruction,
} from "./promptTemplates.ts";
import {
  getQuota,
  reserveQuota,
  recordSuccessfulUsage,
  recordFailedUsage,
} from "./quotaService.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const bearer = req.headers.get("Authorization") || "";
  const token = bearer.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  if (!token || !supabaseUrl || !serviceRoleKey) {
    return json({ error: "Configuração ou autenticação indisponível." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return json({ error: "Não autenticado." }, 401);

  const rawBody = await req.text();
  if (rawBody.length > 9_000_000) return json({ error: "Payload de IA muito grande." }, 413);
  const body = (() => {
    try { return JSON.parse(rawBody); } catch { return null; }
  })();

  const operation = body?.operation as Operation | undefined;
  if (operation !== CHARACTERISTICS_OPERATION && operation !== DESCRIPTION_OPERATION) {
    return json({ error: "Operação de IA não permitida." }, 400);
  }
  if (
    operation === DESCRIPTION_OPERATION &&
    body.descriptionMode !== undefined &&
    body.descriptionMode !== "characteristics" &&
    body.descriptionMode !== "informative_text"
  ) {
    return json({ error: "Modo de geração de descrição inválido." }, 400);
  }

  if (body.action === "quota") {
    try {
      return json({ quota: await getQuota(admin, operation) });
    } catch {
      return json({ error: "Não foi possível consultar a cota de IA." }, 503);
    }
  }

  if (!apiKey) return json({ error: "Serviço de IA indisponível." }, 503);
  const mode = body.mode;
  if (operation === CHARACTERISTICS_OPERATION && mode !== "web_search" && mode !== "descriptive_text") {
    return json({ error: "Modo de preenchimento inválido." }, 400);
  }

  const contents = body.contents;
  const parts = contents?.[0]?.parts;
  if (
    !Array.isArray(contents) ||
    contents.length !== 1 ||
    contents[0]?.role !== "user" ||
    !Array.isArray(parts) ||
    parts.length < 1 ||
    parts.length > 4 ||
    typeof parts[0]?.text !== "string" ||
    parts[0].text.length > 30_000 ||
    (operation === DESCRIPTION_OPERATION && parts.length !== 1) ||
    parts.slice(1).some((part: any) =>
      typeof part?.inlineData?.mimeType !== "string" ||
      !/^image\/(jpeg|png|webp)$/i.test(part.inlineData.mimeType) ||
      typeof part?.inlineData?.data !== "string" ||
      part.inlineData.data.length > 2_800_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(part.inlineData.data)
    )
  ) {
    return json({ error: "Payload de IA inválido." }, 400);
  }

  let reservation: Awaited<ReturnType<typeof reserveQuota>>;
  try {
    reservation = await reserveQuota(admin, operation);
  } catch {
    return json({ error: "A cota de IA não pôde ser validada. Tente novamente." }, 503);
  }
  if (!reservation.allowed) {
    return json({ error: "Limite de requisições de IA atingido. Aguarde a renovação da cota.", quota: reservation.quota }, 429);
  }

  const isCharacteristics = operation === CHARACTERISTICS_OPERATION;
  const model = "gpt-6-luna";
  const tools = isCharacteristics && mode === "web_search" ? [{ type: "web_search" }] : [];
  const systemInstruction = buildSystemInstruction(operation, body.descriptionMode);
  const input = [{
    role: "user",
    content: parts.flatMap((part: any) => {
      if (typeof part?.text === "string") return [{ type: "input_text", text: part.text }];
      if (part?.inlineData?.data) {
        return [{
          type: "input_image",
          image_url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        }];
      }
      return [];
    }),
  }];

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input,
        instructions: systemInstruction,
        tools,
        ...(isCharacteristics ? { text: { format: { type: "json_object" } } } : {}),
        reasoning: { effort: "low" },
        max_output_tokens: 2048,
      }),
      signal: AbortSignal.timeout(22_000),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (reservation.requestId) {
        await recordFailedUsage(
          admin,
          reservation.requestId,
          response.status,
          `OpenAI HTTP ${response.status}`
        ).catch(() => undefined);
      }
      return json({ error: "OpenAI indisponível." }, response.status === 429 ? 429 : 502);
    }

    await recordSuccessfulUsage(
      admin,
      operation,
      model,
      payload,
      response.status,
      reservation.requestId
    ).catch(() => undefined);

    return json(payload);
  } catch (error) {
    console.error("MOBILE_OPENAI_PROXY_FAILED", error);
    if (reservation?.requestId) {
      await recordFailedUsage(
        admin,
        reservation.requestId,
        502,
        error instanceof Error ? error.message : "Erro inesperado"
      ).catch(() => undefined);
    }
    return json({ error: "OpenAI indisponível." }, 502);
  }
});
