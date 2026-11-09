import { describe, expect, it, vi } from "vitest";
import { CHARACTERISTICS_OPERATION, DESCRIPTION_OPERATION } from "./promptTemplates.ts";
import { getQuota } from "./quotaService.ts";

function createAdminStub(rpcData: unknown, monthRows: Array<{ cost_estimated: number }> = []) {
  const monthlyQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve({ data: monthRows, error: null }).then(resolve, reject),
  };
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: null });
  const from = vi.fn(() => monthlyQuery);

  return {
    admin: { rpc, from },
    rpc,
    from,
    monthlyQuery,
  };
}

describe("mobile product AI quota reads", () => {
  it("reads all characteristics windows with one RPC and preserves the displayed limits", async () => {
    const stub = createAdminStub({ usedMinute: 1, usedHour: 7, usedToday: 23 });

    await expect(getQuota(stub.admin as never, CHARACTERISTICS_OPERATION)).resolves.toEqual({
      usedMinute: 1,
      limitMinute: 2,
      usedHour: 7,
      limitHour: 20,
      usedToday: 23,
      limitToday: 80,
    });
    expect(stub.rpc).toHaveBeenCalledTimes(1);
    expect(stub.rpc).toHaveBeenCalledWith("get_mobile_product_ai_quota_counts", {
      p_operation: CHARACTERISTICS_OPERATION,
    });
    expect(stub.from).not.toHaveBeenCalled();
  });

  it("combines description counts but keeps the separate monthly cost read", async () => {
    const stub = createAdminStub(
      { usedGlobalToday: 18, usedCategoryToday: 9 },
      [{ cost_estimated: 0.35 }, { cost_estimated: 0.15 }],
    );

    const quota = await getQuota(stub.admin as never, DESCRIPTION_OPERATION);

    expect(quota).toMatchObject({
      usedToday: 9,
      limitToday: 100,
      usedGlobalToday: 18,
      globalLimitToday: 120,
      monthCostBRL: 0.5,
      monthBudgetBRL: 28.5,
    });
    expect(stub.rpc).toHaveBeenCalledTimes(1);
    expect(stub.rpc).toHaveBeenCalledWith("get_mobile_product_ai_quota_counts", {
      p_operation: DESCRIPTION_OPERATION,
    });
    expect(stub.from).toHaveBeenCalledTimes(1);
    expect(stub.from).toHaveBeenCalledWith("api_usage_logs");
    expect(stub.monthlyQuery.select).toHaveBeenCalledTimes(1);
    expect(stub.monthlyQuery.select).toHaveBeenCalledWith("cost_estimated");
  });

  it("fails closed when the RPC returns an invalid count payload", async () => {
    const stub = createAdminStub({ usedMinute: -1, usedHour: 7, usedToday: 23 });

    await expect(getQuota(stub.admin as never, CHARACTERISTICS_OPERATION)).rejects.toThrow(
      "Não foi possível consultar a cota de IA.",
    );
  });
});
