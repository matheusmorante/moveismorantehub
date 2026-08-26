import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "morante_hub_whatsapp_2026";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // 1. Verificação do Webhook pela Meta (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verificação da Meta bem-sucedida! Challenge retornado.");
      return new Response(challenge, { status: 200 });
    } else {
      console.warn("[WhatsApp Webhook] Falha na verificação de token:", { mode, token });
      return new Response("Forbidden: Verify token mismatch", { status: 403 });
    }
  }

  // 2. Recebimento de Mensagens e Status da Meta (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("[WhatsApp Webhook] Notificação recebida da Meta:", JSON.stringify(body, null, 2));

      // Extrai dados da mensagem / status
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // Evento de clique em Botão Interativo (ex: Confirmação de Entrega)
      if (value?.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const from = message.from; // Número do cliente

        // Resposta interativa com botão
        if (message.type === "interactive" && message.interactive?.button_reply) {
          const buttonId = message.interactive.button_reply.id;
          const buttonTitle = message.interactive.button_reply.title;
          console.log(`[WhatsApp Webhook] Botão clicado: ID=${buttonId}, Title=${buttonTitle}, From=${from}`);

          // Se for confirmação de entrega: confirm_delivery_ORDERID
          if (buttonId.startsWith("confirm_delivery_")) {
            const orderId = buttonId.replace("confirm_delivery_", "");
            const supabaseClient = createClient(
              Deno.env.get("SUPABASE_URL") ?? "",
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
            );

            // Atualiza status do agendamento ou observação do pedido
            console.log(`[WhatsApp Webhook] Confirmando entrega para pedido #${orderId}`);
            await supabaseClient
              .from("orders")
              .update({
                delivery_confirmed_at: new Date().toISOString(),
                delivery_confirmed_by: from,
              })
              .eq("id", orderId);
          }
        }
      }

      // Retorna 200 OK imediatamente para a Meta confirmar recebimento
      return new Response(JSON.stringify({ status: "EVENT_RECEIVED" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("[WhatsApp Webhook] Erro ao processar payload:", err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
