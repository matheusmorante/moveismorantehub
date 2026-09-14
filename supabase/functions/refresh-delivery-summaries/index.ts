import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

type Scope = "today" | "next_days";

const normalize = (value: unknown) => String(value ?? "").trim();
const normalizeLower = (value: unknown) => normalize(value).toLowerCase();

function localDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function parseDate(value: unknown) {
  const raw = normalize(value).split("T")[0];
  if (!raw) return "";
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

function hash(value: string) {
  let first = 5381;
  let second = 52711;
  for (let index = 0; index < value.length; index += 1) {
    first = (first * 33) ^ value.charCodeAt(index);
    second = (second * 33) ^ value.charCodeAt(index);
  }
  return `fp_${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function scheduledDate(order: any) {
  const data = order?.order_data || {};
  const shipping = data.shipping || order?.shipping || {};
  const schedule = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};
  return parseDate(order?.scheduled_date || order?.scheduledDate || schedule.date || schedule.startDate || schedule.scheduledDate || data.scheduledDate);
}

function isOperational(order: any) {
  const data = order?.order_data || {};
  const status = normalizeLower(order?.status || data.status);
  const type = normalizeLower(order?.order_type || order?.orderType || data.orderType || data.order_type);
  const shipping = data.shipping || order?.shipping || {};
  const schedule = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};
  if (order?.deleted || data.deleted || order?.cancelled || data.cancelled || /cancel|rascunho|draft|deleted/.test(status)) return false;
  if (schedule.pendingScheduling || data.pendingScheduling || order?.pending_scheduling || !scheduledDate(order)) return false;
  return !type || /delivery|entrega|assist|return|devol/.test(type);
}

function operationType(order: any) {
  const data = order?.order_data || {};
  const type = normalizeLower(order?.order_type || order?.orderType || data.orderType || data.order_type);
  if (/assist/.test(type)) return "assistência";
  if (/return|devol/.test(type)) return "devolução";
  return "entrega";
}

function summaryText(scope: Scope, orders: any[]) {
  if (!orders.length) return scope === "today"
    ? "Sem atividades operacionais para hoje."
    : "Não há atividades operacionais agendadas para os próximos dias.";

  const byType = new Map<string, number>();
  for (const order of orders) {
    const type = operationType(order);
    byType.set(type, (byType.get(type) || 0) + 1);
  }
  const overview = [...byType.entries()].map(([type, count]) => `${count} ${count === 1 ? type : `${type}s`}`).join(", ");
  const details = orders.slice(0, 12).map((order) => {
    const data = order?.order_data || {};
    const shipping = data.shipping || order?.shipping || {};
    const customer = data.customerData || data.customer || {};
    const schedule = shipping.scheduling || data.schedule || data.scheduling || order?.schedule || {};
    const name = normalize(customer.name || customer.fullName || data.customerName || order.customer_name) || "cliente";
    const city = normalize(shipping.deliveryAddress?.city || shipping.address?.city || shipping.city || customer.address?.city || order.city);
    const period = normalize(schedule.period || schedule.shift || schedule.startTime || schedule.time);
    return `${operationType(order)} para ${name}${city ? ` em ${city}` : ""}${period ? `, ${period}` : ""}`;
  });
  const heading = scope === "today" ? "Para hoje" : "Para os próximos dias";
  return `${heading}, temos ${overview}. ${details.join(". ")}.`.replace(/\s+/g, " ").trim();
}

serve(async (request) => {
  const secret = Deno.env.get("DELIVERY_SUMMARY_JOB_SECRET") || "";
  if (!secret || request.headers.get("x-delivery-summary-job-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  try {
    const { data: orders, error } = await admin.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    const today = localDate();
    const operational = (orders || []).filter(isOperational);

    for (const scope of ["today", "next_days"] as Scope[]) {
      const scoped = operational.filter((order) => scope === "today" ? scheduledDate(order) === today : scheduledDate(order) > today);
      const fingerprint = hash(JSON.stringify(scoped.map((order) => ({
        id: order.id, date: scheduledDate(order), status: order.status, data: order.order_data,
      }))));
      const text = summaryText(scope, scoped);
      const id = `summary_${scope}_${fingerprint}`;
      const { data: existing, error: existingError } = await admin.from("delivery_summaries")
        .select("id").eq("scope", scope).eq("data_fingerprint", fingerprint).maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        console.log("DELIVERY_SUMMARY_UNCHANGED", { scope, summaryId: existing.id, orderCount: scoped.length });
        continue;
      }
      const { data: saved, error: saveError } = await admin.from("delivery_summaries").insert({
        id, scope, data_fingerprint: fingerprint, text, text_status: "READY", audio_status: "MISSING",
        generator_version: "backend-v2", tts_version: "v1", generation_started_at: null, error_message: null,
      }).select("id").single();
      // Duas alterações próximas podem chegar juntas. A restrição única deixa
      // uma só versão vencedora; a outra execução simplesmente reaproveita-a.
      if (saveError?.code === "23505") {
        console.log("DELIVERY_SUMMARY_ALREADY_QUEUED", { scope, orderCount: scoped.length });
        continue;
      }
      if (saveError) throw saveError;
      console.log("DELIVERY_SUMMARY_REFRESHED", { scope, summaryId: saved?.id, orderCount: scoped.length });
    }
    return new Response(JSON.stringify({ status: "READY" }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("DELIVERY_SUMMARY_REFRESH_FAILED", error);
    return new Response(JSON.stringify({ status: "FAILED" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
