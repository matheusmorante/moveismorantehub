import CustomerData from "../types/customerData.type"
import { Item } from "../types/items.type";
import { Payment } from "../types/payments.type";
import Order from "../types/order.type";
import Person from "../types/person.type";
import { calcItemTotalValue, calcPaymentTotalValue } from "./calculations";

export const stringifyFullAddress = (
    address: CustomerData['fullAddress'] | null | undefined
) => {
    if (!address) return '';
    const { street, number, complement, neighborhood, city } = address;
    return [street, number, complement, neighborhood, city]
        .filter(Boolean)
        .join(', ')
};

export const stringifyMapAddress = (
    address: CustomerData['fullAddress'] | null | undefined
) => {
    if (!address) return '';
    const { street, number, neighborhood, city } = address;
    return [street, number, neighborhood, city]
        .filter(Boolean)
        .join(', ')
};

export const stringifyFullAddressWithObservation = (
    address: CustomerData['fullAddress'] | null | undefined
) => {
    if (!address) return '';
    const { street, number, complement, observation, neighborhood, city } = address;
    return [street, number, complement, observation, neighborhood, city]
        .filter(Boolean)
        .join(', ')
};

export const stringifyItems = (items: Item[]) => {
    return items.map(item => `${item.description} (${item.quantity} UN)`)
        .join(', ')
};

export const stringifyItemsWithValues = (items: Item[]) => {
    return items.map(item => {
        const totalValue = calcItemTotalValue(item);
        return `${item.description} | ${item.quantity} UN | R$ ${totalValue}`

    }).join('\n')
};

export const stringifyPayments = (payments: Payment[]) => {
    return payments.map(payment => {
        const totalValue = calcPaymentTotalValue(payment);
        return `${payment.method} | R$ ${totalValue} | Status: ${payment.status}`
    }).join('\n')
}

export const formatToBRDate = (value: string | undefined | null) => {
    if (!value) return "-";
    
    // Alread formatted DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value;

    // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    if (value.includes('-')) {
        const datePart = value.split('T')[0];
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}/${m}/${y}`;
        }
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    // Use local time for formatting
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

export const formatDateTime = (value: string | undefined | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

export const formatDate = (value: string) => {
    if (!value) return "Não agendado";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return value;

    const date = new Date(value + 'T00:00:00'); // Force local time
    if (isNaN(date.getTime())) return value;
    
    return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

export const toTitleCase = (text: any) => {
    if (!text) return "";
    const str = String(text);
    const exceptions = ["de", "da", "do", "das", "dos", "com", "em"];
    return str
        .toLowerCase()
        .split(" ")
        .map((word, index) => {
            if (exceptions.includes(word) && index !== 0) {
                return word;
            }
            return (word.charAt(0).toUpperCase() + word.slice(1)) || "";
        })
        .join(" ");
};

export const dateNow = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
};

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value);
};

export const capitalizeCustomerData = (data: CustomerData): CustomerData => {
    if (!data) return data;

    return {
        ...data,
        fullName: toTitleCase(data.fullName || ""),
        fullAddress: data.fullAddress ? {
            ...data.fullAddress,
            street: toTitleCase(data.fullAddress.street || ""),
            complement: toTitleCase(data.fullAddress.complement || ""),
            neighborhood: toTitleCase(data.fullAddress.neighborhood || ""),
            city: toTitleCase(data.fullAddress.city || ""),
            observation: toTitleCase(data.fullAddress.observation || ""),
        } : data.fullAddress
    };
};

export const capitalizeOrder = (order: Order): Order => {
    if (!order) return order;

    return {
        ...order,
        customerData: capitalizeCustomerData(order.customerData),
        items: order.items?.map(item => {
            if (!item) return item;
            return {
                ...item,
                description: item.description?.toUpperCase() || ""
            };
        })
    };
};

export const capitalizePerson = (person: any): any => {
    if (!person) return person;

    return {
        ...person,
        fullName: toTitleCase(person.fullName),
        tradeName: person.tradeName ? toTitleCase(person.tradeName) : person.tradeName,
        fullAddress: person.fullAddress ? {
            ...person.fullAddress,
            street: toTitleCase(person.fullAddress.street),
            complement: toTitleCase(person.fullAddress.complement),
            neighborhood: toTitleCase(person.fullAddress.neighborhood),
            city: toTitleCase(person.fullAddress.city),
            observation: toTitleCase(person.fullAddress.observation),
        } : person.fullAddress
    };
};

export const getLocalISODate = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const generateProductCode = (description: string): string => {
    if (!description) return "";

    const stopWords = ["de", "da", "do", "das", "dos", "com", "em", "para", "a", "o", "as", "os"];
    const words = description
        .split(" ")
        .filter(w => w.length > 1 && !stopWords.includes(w.toLowerCase()));
    
    let baseCode = words.map(w => w.charAt(0).toUpperCase()).join("");
    
    if (baseCode.length < 2) {
        baseCode = (description.replace(/\s/g, '').substring(0, 3)).toUpperCase();
    }

    // O sufixo será adicionado no momento da inserção após verificar o banco
    return baseCode;
};


export const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // remove accents
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};
