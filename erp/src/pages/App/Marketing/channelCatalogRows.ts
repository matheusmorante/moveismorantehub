import { pluralizeProductType } from '@/pages/utils/pluralize';
import { normalizeSearchTerm } from '@/pages/utils/textUtils';

export interface ChannelCatalogVariationRow {
    varId: string; varName: string; varSku: string; varStock: number; varPrice: number;
    varActive: boolean; varImage: string | null; varWhatsappSync: boolean;
    varWhatsappAutoSync: boolean; varLastSync: string | null; isActuallyOnMeta?: boolean;
    parentId: string; parentDescription: string; parentEnvironment: string;
    parentTypeName: string; parentLine: string; parentCode: string;
    rawParent: { unit_price?: number; images?: string[]; [key: string]: unknown };
    rawVariation: unknown;
}

export interface ChannelCatalogCollection { label: string; key: string }

export function buildChannelCatalogCollections(rows: ChannelCatalogVariationRow[]): ChannelCatalogCollection[] {
    const seen = new Set<string>();
    const collections: ChannelCatalogCollection[] = [];
    const append = (label: string, key: string) => { if (!seen.has(key)) { seen.add(key); collections.push({ label, key }); } };

    rows.forEach(row => { const environment = row.parentEnvironment.trim(); if (environment) append(environment.toUpperCase(), `env__${environment}`); });
    rows.forEach(row => { const type = row.parentTypeName.trim(); if (type) append(pluralizeProductType(type).toUpperCase(), `type__${type}`); });

    return collections.sort((first, second) => first.label.localeCompare(second.label));
}

export function rowMatchesChannelCatalogCollection(row: ChannelCatalogVariationRow, key: string): boolean {
    if (!key || key === 'all') return true;
    if (key.startsWith('env__')) return row.parentEnvironment.trim() === key.replace('env__', '');
    if (key.startsWith('type__')) return row.parentTypeName.trim() === key.replace('type__', '');
    return true;
}

export function filterChannelCatalogRows(rows: ChannelCatalogVariationRow[], search: string, channel: 'all' | 'whatsapp' | 'ecommerce', collection: string): ChannelCatalogVariationRow[] {
    const query = normalizeSearchTerm(search);
    return rows.filter(row => {
        const matchesSearch = normalizeSearchTerm(row.varName).includes(query) || normalizeSearchTerm(row.varSku).includes(query) || normalizeSearchTerm(row.parentDescription).includes(query);
        const matchesChannel = channel === 'all' || (channel === 'whatsapp' && row.varWhatsappSync);
        return matchesSearch && matchesChannel && rowMatchesChannelCatalogCollection(row, collection);
    });
}

export function buildChannelCatalogSyncPayload(row: ChannelCatalogVariationRow) {
    const price = row.varPrice > 0 ? row.varPrice : Number(row.rawParent.unit_price ?? 0);
    return { ...row.rawParent, id: row.varId, retailer_id: row.varSku || row.varId, description: `${row.parentDescription} - ${row.varName}`, unitPrice: price, unit_price: price, price, images: row.varImage ? [row.varImage] : (row.rawParent.images || []), stock: row.varStock, active: row.varActive && row.varStock > 0 };
}
