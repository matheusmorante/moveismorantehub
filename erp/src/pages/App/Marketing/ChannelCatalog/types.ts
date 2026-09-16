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
    isActuallyOnMeta?: boolean; // Status real verificado na API da Meta
    
    // Dados herdados do pai
    parentId: string;
    parentDescription: string;
    parentEnvironment: string;
    parentTypeName: string;
    parentLine: string;
    parentCode: string;
    // Raw para o syncProductToCatalog
}
