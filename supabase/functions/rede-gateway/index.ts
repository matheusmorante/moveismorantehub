import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const REDE_SANDBOX_URL = "https://sandbox-erede.useredecloud.com.br";
const REDE_AUTH_URL = "https://oauth.userede.com.br/v2/token"; // Exemplo, verificar documentação

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, payload } = await req.json();

    // 1. Buscar credenciais no banco de dados
    const { data: config, error: configError } = await supabaseClient
      .from("rede_config")
      .select("*")
      .eq("active", true)
      .single();

    if (configError || !config) {
      throw new Error("Configuração da Rede não encontrada ou inativa.");
    }

    const baseUrl = config.environment === "production" 
      ? "https://api.userede.com.br" 
      : REDE_SANDBOX_URL;

    // 2. Lógica de Autenticação (OAuth 2.0)
    // Nota: Em um sistema real, o token deve ser cacheado.
    async function getAccessToken() {
      const authHeader = btoa(`${config.client_id}:${config.client_secret}`);
      const response = await fetch(REDE_AUTH_URL, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "grant_type": "client_credentials",
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro na autenticação Rede: ${errorData}`);
      }

      const data = await response.json();
      return data.access_token;
    }

    if (action === "create-transaction" || action === "create-pix") {
      const token = await getAccessToken();
      const isPix = action === "create-pix";
      
      const response = await fetch(`${baseUrl}/v2/transactions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          paymentMethod: isPix ? "pix" : (payload.paymentMethod || "credit_card"),
        }),
      });

      const result = await response.json();

      // Log da transação no banco de dados
      await supabaseClient.from("rede_transactions").insert([{
        order_id: payload.externalGroupId || payload.orderId || null,
        tid: result.tid,
        nsu: result.nsu,
        amount: payload.amount,
        status: (result.returnCode === "00" || result.returnCode === "0") ? "approved" : "pending",
        payment_method: isPix ? "pix" : (payload.paymentMethod || "credit_card"),
        raw_response: result
      }]);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "get-transaction") {
      const { tid } = payload;
      const token = await getAccessToken();
      
      const response = await fetch(`${baseUrl}/v2/transactions/${tid}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "create-payment-link") {
      const token = await getAccessToken();
      
      // The Rede API for payment links might be /v1/payment-links or similar. Assuming /v1 based on common patterns, 
      // but payload must match their schema (amount, reference, etc)
      const response = await fetch(`${baseUrl}/v1/payment-links`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        await supabaseClient.from("rede_transactions").insert([{
          order_id: payload.reference || payload.orderId || null,
          tid: result.id || `LINK-${Date.now()}`,
          amount: payload.amount,
          status: "pending",
          payment_method: "payment_link",
          raw_response: result
        }]);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.ok ? 200 : 400,
      });
    }

    if (action === "webhook") {
      // Recebe notificação da Rede (via POST do gateway deles)
      const notif = payload;
      
      // Tenta recuperar identificadores comuns
      const tid = notif.tid || notif.payment?.tid || notif.id;
      const status = notif.status || notif.payment?.status;
      const returnCode = notif.returnCode || notif.payment?.returnCode;

      if (tid) {
          let dbStatus = "pending";
          // Mapeamento básico de status Rede -> Nosso DB
          if (status === "Approved" || returnCode === "00") dbStatus = "approved";
          else if (status === "Denied") dbStatus = "denied";
          else if (status === "Canceled") dbStatus = "canceled";
          else if (status === "Chargeback" || status === "Dispute" || notif.type === "chargeback") dbStatus = "chargeback"; 

          const { data: txData } = await supabaseClient
            .from("rede_transactions")
            .update({ status: dbStatus, raw_response: notif })
            .eq("tid", tid)
            .select("order_id")
            .single();

          if (dbStatus === "chargeback" && txData?.order_id) {
            // Sincroniza o alerta de Chargeback direto na tabela de pedidos do ERP para travar a entrega
            await supabaseClient
              .from("orders")
              .update({ status: "chargeback" })
              .eq("id", txData.order_id);
          }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Ação não suportada" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
