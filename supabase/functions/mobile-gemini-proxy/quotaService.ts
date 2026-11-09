import type { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  CHARACTERISTICS_OPERATION,
  type Operation,
} from "./promptTemplates.ts";

export const CHARACTERISTICS_LIMITS = { perMinute: 2, perHour: 20, perDay: 80 };
export const TEXT_LIMITS = { globalPerDay: 120, categoryPerDay: 100 };
export const MONTHLY_BUDGET_BRL = 28.5; // Margem de segurança antes do teto de R$ 30,00

type CharacteristicsQuotaCounts = {
  usedMinute: number;
  usedHour: number;
  usedToday: number;
};

type DescriptionQuotaCounts = {
  usedGlobalToday: number;
  usedCategoryToday: number;
};

const QUOTA_COUNTS_RPC = "get_mobile_product_ai_quota_counts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonnegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

async function readQuotaCounts(
  admin: ReturnType<typeof createClient>,
  operation: Operation
): Promise<CharacteristicsQuotaCounts | DescriptionQuotaCounts> {
  const { data, error } = await admin.rpc(QUOTA_COUNTS_RPC, {
    p_operation: operation,
  });
  if (error || !isRecord(data)) {
    throw new Error("Não foi possível consultar a cota de IA.");
  }

  const countFields = operation === CHARACTERISTICS_OPERATION
    ? ["usedMinute", "usedHour", "usedToday"]
    : ["usedGlobalToday", "usedCategoryToday"];
  if (!countFields.every((field) => isNonnegativeSafeInteger(data[field]))) {
    // Fail closed if the deployed database function has an incompatible response.
    throw new Error("Não foi possível consultar a cota de IA.");
  }

  return data as unknown as CharacteristicsQuotaCounts | DescriptionQuotaCounts;
}

export async function getQuota(
  admin: ReturnType<typeof createClient>,
  operation: Operation
) {
  if (operation === CHARACTERISTICS_OPERATION) {
    const counts = await readQuotaCounts(admin, operation) as CharacteristicsQuotaCounts;
    return {
      usedMinute: counts.usedMinute,
      limitMinute: CHARACTERISTICS_LIMITS.perMinute,
      usedHour: counts.usedHour,
      limitHour: CHARACTERISTICS_LIMITS.perHour,
      usedToday: counts.usedToday,
      limitToday: CHARACTERISTICS_LIMITS.perDay,
    };
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [counts, monthLogs] = await Promise.all([
    readQuotaCounts(admin, operation),
    admin
      .from("api_usage_logs")
      .select("cost_estimated")
      .in("provider", ["gemini", "openai"])
      .eq("status", "SUCCESS")
      .gte("created_at", startOfMonth),
  ]);
  const descriptionCounts = counts as DescriptionQuotaCounts;

  const monthList = monthLogs.data || [];
  const monthCostBRL = monthList.reduce(
    (acc: number, row: any) => acc + (Number(row.cost_estimated) || 0),
    0
  );

  return {
    usedToday: descriptionCounts.usedCategoryToday,
    limitToday: TEXT_LIMITS.categoryPerDay,
    usedGlobalToday: descriptionCounts.usedGlobalToday,
    globalLimitToday: TEXT_LIMITS.globalPerDay,
    monthCostBRL: Number(monthCostBRL.toFixed(2)),
    monthBudgetBRL: MONTHLY_BUDGET_BRL,
  };
}

export async function reserveQuota(
  admin: ReturnType<typeof createClient>,
  operation: Operation
): Promise<{ allowed: boolean; quota: any; requestId?: string }> {
  const quota = await getQuota(admin, operation);
  if ("usedMinute" in quota) {
    if (
      quota.usedMinute >= quota.limitMinute ||
      quota.usedHour >= quota.limitHour ||
      quota.usedToday >= quota.limitToday
    ) {
      return { allowed: false, quota };
    }
  } else if (
    quota.usedGlobalToday >= quota.globalLimitToday ||
    quota.usedToday >= quota.limitToday ||
    (quota.monthCostBRL !== undefined &&
      quota.monthBudgetBRL !== undefined &&
      quota.monthCostBRL >= quota.monthBudgetBRL)
  ) {
    return { allowed: false, quota };
  }

  const isCharacteristics = operation === CHARACTERISTICS_OPERATION;
  const model = "gpt-6-luna";
  const requestId = `mobile_ai_${crypto.randomUUID()}`;

  const { error } = await admin.from("api_usage_logs").insert({
    provider: "openai",
    service: "openai_gpt",
    operation: isCharacteristics ? operation : "pre_allocation_reservation",
    units: 1,
    status: "SUCCESS",
    http_status: 200,
    module_source: isCharacteristics ? "characteristics_ai" : "TEXT",
    cost_estimated: isCharacteristics ? 0.05 : 0.2,
    environment: "production",
    request_id: requestId,
    created_at: new Date().toISOString(),
  });

  if (error) throw new Error("Não foi possível reservar a cota de IA.");
  return { allowed: true, quota, requestId };
}

export async function recordSuccessfulUsage(
  admin: ReturnType<typeof createClient>,
  operation: Operation,
  model: string,
  payload: any,
  httpStatus: number,
  requestId?: string
): Promise<void> {
  const promptTokens = Number(payload?.usage?.input_tokens || 0);
  const candidateTokens = Number(payload?.usage?.output_tokens || 0);
  const totalTokens = Number(payload?.usage?.total_tokens || 0);
  const units = totalTokens || 1;
  const costEstimated = Number(
    ((promptTokens * 0.1 + candidateTokens * 0.5) * 5.6 / 1_000_000).toFixed(6)
  );

  if (requestId) {
    const { error } = await admin
      .from("api_usage_logs")
      .update({
        service: "openai_gpt",
        operation: `${operation} [${model}]`,
        units,
        status: "SUCCESS",
        http_status: httpStatus,
        module_source:
          operation === CHARACTERISTICS_OPERATION
            ? "characteristics_ai"
            : "mobile_products",
        cost_estimated: costEstimated,
      })
      .eq("request_id", requestId);
    if (error) console.warn("MOBILE_AI_USAGE_LOG_UPDATE_FAILED", error.message);
  } else {
    const { error } = await admin.from("api_usage_logs").insert({
      provider: "openai",
      service: "openai_gpt",
      operation: `${operation} [${model}]`,
      units,
      status: "SUCCESS",
      http_status: httpStatus,
      module_source:
        operation === CHARACTERISTICS_OPERATION
          ? "characteristics_ai"
          : "mobile_products",
      cost_estimated: costEstimated,
      environment: "production",
      request_id: `mobile_ai_result_${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("MOBILE_AI_USAGE_LOG_FAILED");
  }
}

export async function recordFailedUsage(
  admin: ReturnType<typeof createClient>,
  requestId: string,
  status: number,
  errorMessage: string
): Promise<void> {
  await admin
    .from("api_usage_logs")
    .update({
      status: status === 429 ? "RATE_LIMITED" : "ERROR",
      http_status: status,
      cost_estimated: 0,
      units: 0,
      error_message: errorMessage,
    })
    .eq("request_id", requestId);
}
