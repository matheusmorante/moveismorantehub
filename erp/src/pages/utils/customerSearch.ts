import { normalizeSearchTerm } from "./textUtils";

export const MIN_CUSTOMER_SEARCH_LENGTH = 2;

export type CustomerSearchQuery = {
    text: string;
    digits: string;
};

export const getCustomerSearchQuery = (value: string): CustomerSearchQuery => ({
    text: normalizeSearchTerm(value),
    digits: value.replace(/\D/g, ""),
});

export const canSearchCustomers = (value: string): boolean => {
    const { text, digits } = getCustomerSearchQuery(value);
    return text.length >= MIN_CUSTOMER_SEARCH_LENGTH || digits.length >= MIN_CUSTOMER_SEARCH_LENGTH;
};

export const matchesCustomerSearch = (
    query: CustomerSearchQuery,
    customer: { name?: string; phone?: string; address?: string },
): boolean => {
    if (!query.text && !query.digits) return false;

    const matchesText = [customer.name, customer.address]
        .filter(Boolean)
        .some((value) => normalizeSearchTerm(value!).includes(query.text));
    const phoneDigits = (customer.phone || "").replace(/\D/g, "");
    const matchesPhone = query.digits.length >= MIN_CUSTOMER_SEARCH_LENGTH
        && phoneDigits.includes(query.digits);

    return matchesText || matchesPhone;
};
