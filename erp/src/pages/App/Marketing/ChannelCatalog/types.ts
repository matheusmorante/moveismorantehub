import { ChannelCatalogVariationRow } from '../../channelCatalogRows';

export interface VariationRow extends ChannelCatalogVariationRow {
    varId: string;
    varName: string;
    varSku: string;
    varStock: number;
    varPrice: number;
    varActive: boolean;
    varImage: string | null;
    varWhatsappSync: boolean;
    varWhatsappAutoSync: boolean;
    varLastSync: string | null;
    isActuallyOnMeta?: boolean;
    parentId: string;
    parentDescription: string;
    parentEnvironment: string;
    parentTypeName: string;
    parentLine: string;
    parentCode: string;
}

export interface CatalogCollectionItem {
    label: string;
    key: string;
}

export interface MetaCollectionItem {
    id: string;
    name: string;
    filter?: string;
}

export type ChannelFilter = 'all' | 'whatsapp' | 'ecommerce';
