import Product from '../../types/product.type';

export const LOCAL_STORAGE_KEY = 'local_products';

// Helper to get products from localStorage
export const getLocalProducts = (): Product[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Erro ao ler produtos locais:", e);
        return [];
    }
};

// Helper to save products to localStorage
export const saveLocalProducts = (products: Product[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
};

// Simple reactive subscription system for UI updates
export type SubscriptionCallback = (products: Product[]) => void;
const subscribers = new Set<{ callback: SubscriptionCallback; includeDeleted: boolean }>();

export const notifySubscribers = () => {
    const products = getLocalProducts();
    subscribers.forEach(sub => {
        const filtered = products.filter(p => !p.deleted === sub.includeDeleted);
        sub.callback(filtered);
    });
};

export const subscribeToProducts = (
    callback: (products: Product[]) => void, 
    includeDeleted = false,
    initializer?: () => Promise<Product[]>
) => {
    const run = async () => {
        let products: Product[] = [];
        if (initializer) {
            products = await initializer();
        } else {
            products = getLocalProducts();
        }
        const filtered = products.filter(p => !p.deleted === includeDeleted);
        callback(filtered);
    };
    run();

    const subObj = { callback, includeDeleted };
    subscribers.add(subObj);

    return () => {
        subscribers.delete(subObj);
    };
};
