import Order from "../../../types/order.type";
import { normalizeSearchTerm } from "@/pages/utils/textUtils";

export const toComparableDate = (dateStr: string): string => {
    if (!dateStr || !dateStr.includes('/')) return dateStr;
    const [datePart, timePart] = dateStr.split(', ');
    const [day, month, year] = datePart.split('/');
    const dateNormalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (timePart) {
        return `${dateNormalized}T${timePart}`;
    }
    return dateNormalized;
};

export const filterOrder = (order: Order, filters?: any): boolean => {
    const showTrash = filters?.showTrash || false;
    const isDraft = filters?.isDraft || false;

    // Filter by Deleted or Draft status
    if (showTrash) {
        if (!order.deleted) return false;
    } else if (isDraft) {
        if (order.status !== 'draft' || order.deleted) return false;
    } else {
        if (order.deleted) return false;
    }

    if (!filters) return true;

    const customerNameQuery = normalizeSearchTerm(filters?.customerName || '');
    const orderCustomerName = normalizeSearchTerm(order.customerData?.fullName || '');
    const matchesCustomer = orderCustomerName.includes(customerNameQuery);

    let dateMatch = true;
    if (filters.dateRange?.start && filters.dateRange?.end) {
        const orderDateStr = order.date;
        const normalizedOrderDate = toComparableDate(orderDateStr).split('T')[0];
        const isAfterStart = normalizedOrderDate >= filters.dateRange.start;
        const isBeforeEnd = normalizedOrderDate <= filters.dateRange.end;
        if (isAfterStart && isBeforeEnd) {
            dateMatch = true;
        } else {
            dateMatch = false;
        }
    }

    const customerMatch = !filters.customerName || matchesCustomer;

    const prodQuery = normalizeSearchTerm(filters.productName || '');
    const productMatch = !filters.productName ||
        (order.items?.some(item => normalizeSearchTerm(item.description).includes(prodQuery))) ||
        (normalizeSearchTerm(order.assistanceDescription || '').includes(prodQuery));

    const isBudgetView = filters?.isBudgetView || false;
    const isAssistanceView = filters?.isAssistanceView || false;
    const isReturnView = filters?.isReturnView || false;
    const statusMatch = !filters.status || order.status === filters.status;
    
    // Strict Type Separation
    let typeMatch = true;
    if (isBudgetView) {
        typeMatch = order.orderType === 'budget';
    } else if (isAssistanceView) {
        typeMatch = order.orderType === 'assistance';
    } else if (isReturnView) {
        typeMatch = order.orderType === 'return';
    } else {
        typeMatch = filters.orderType 
            ? order.orderType === filters.orderType 
            : (order.orderType !== 'budget' && order.orderType !== 'assistance' && order.orderType !== 'return');
    }

    const sellerQuery = normalizeSearchTerm(filters.seller || '');
    const sellerMatch = !filters.seller || normalizeSearchTerm(order.seller || '').includes(sellerQuery);

    const totalOrderValue = order.paymentsSummary?.totalOrderValue || 0;
    const valueMatch = totalOrderValue >= filters.valueRange.min &&
        totalOrderValue <= filters.valueRange.max;

    return dateMatch && customerMatch && productMatch && statusMatch && typeMatch && sellerMatch && valueMatch;
};

export const sortOrders = (orders: Order[], filters?: any): Order[] => {
    const multiSort = filters?.multiSort || [];
    const sortRules = multiSort.length > 0 
      ? multiSort 
      : [{ key: filters?.sortBy || 'date', order: filters?.sortOrder || 'desc' }];

    return [...orders].sort((a, b) => {
        for (const rule of sortRules) {
            const { key: sortBy, order: sortOrder } = rule;
            let comparison = 0;

            if (sortBy === "customer") {
                comparison = (a.customerData?.fullName || "").localeCompare(b.customerData?.fullName || "");
            } else if (sortBy === "totalValue") {
                comparison = (a.paymentsSummary?.totalOrderValue || 0) - (b.paymentsSummary?.totalOrderValue || 0);
            } else if (sortBy === "status") {
                comparison = (a.status || "").localeCompare(b.status || "");
            } else if (sortBy === "deliveryDate") {
                const dateA = toComparableDate(a.shipping?.scheduling?.date || "");
                const dateB = toComparableDate(b.shipping?.scheduling?.date || "");
                comparison = dateA.localeCompare(dateB);
            } else {
                const dateA = toComparableDate(a.date || "");
                const dateB = toComparableDate(b.date || "");
                comparison = dateA.localeCompare(dateB);
            }

            if (comparison !== 0) {
                return sortOrder === "asc" ? comparison : -comparison;
            }
        }
        return 0;
    });
};
