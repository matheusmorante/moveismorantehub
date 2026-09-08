import { describe, expect, it } from "vitest";
import { canSearchCustomers, getCustomerSearchQuery, matchesCustomerSearch } from "./customerSearch";

describe("customer search", () => {
    it("only enables suggestions after two meaningful characters", () => {
        expect(canSearchCustomers("P")).toBe(false);
        expect(canSearchCustomers("  ")).toBe(false);
        expect(canSearchCustomers("Pa")).toBe(true);
        expect(canSearchCustomers("41")).toBe(true);
    });

    it("matches names without accents and phones only when digits were entered", () => {
        const customer = { name: "Paulina Chagas", phone: "(41) 98368-886", address: "Vila Petropolis, Colombo" };

        expect(matchesCustomerSearch(getCustomerSearchQuery("pa"), customer)).toBe(true);
        expect(matchesCustomerSearch(getCustomerSearchQuery("col"), customer)).toBe(true);
        expect(matchesCustomerSearch(getCustomerSearchQuery("83"), customer)).toBe(true);
        expect(matchesCustomerSearch(getCustomerSearchQuery("zz"), customer)).toBe(false);
    });
});
