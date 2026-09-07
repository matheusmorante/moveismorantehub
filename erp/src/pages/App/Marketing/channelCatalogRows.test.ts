import { describe, expect, it } from 'vitest';
import { buildChannelCatalogCollections, buildChannelCatalogSyncPayload, filterChannelCatalogRows, type ChannelCatalogVariationRow } from './channelCatalogRows';

const row: ChannelCatalogVariationRow = {
    varId: 'v1', varName: 'Azul', varSku: 'SKU-1', varStock: 2, varPrice: 100, varActive: true,
    varImage: 'photo.jpg', varWhatsappSync: true, varWhatsappAutoSync: false, varLastSync: null,
    parentId: 'p1', parentDescription: 'Sofá', parentEnvironment: 'Sala de Estar', parentTypeName: 'Sofá', parentLine: '', parentCode: '',
    rawParent: { unit_price: 90, images: ['parent.jpg'] }, rawVariation: {},
};

describe('channelCatalogRows', () => {
    it('cria coleções únicas de ambiente e tipo', () => {
        expect(buildChannelCatalogCollections([row, { ...row, varId: 'v2' }]).map(collection => collection.key))
            .toEqual(['env__Sala de Estar', 'type__Sofá']);
    });

    it('filtra por busca, canal e coleção', () => {
        expect(filterChannelCatalogRows([row], 'azul', 'whatsapp', 'env__Sala de Estar')).toEqual([row]);
        expect(filterChannelCatalogRows([row], 'mesa', 'all', 'all')).toEqual([]);
        expect(filterChannelCatalogRows([{ ...row, varWhatsappSync: false }], '', 'whatsapp', 'all')).toEqual([]);
    });

    it('preserva a compatibilidade do payload de sincronização', () => {
        expect(buildChannelCatalogSyncPayload({ ...row, varStock: 0 })).toMatchObject({
            id: 'v1', retailer_id: 'SKU-1', description: 'Sofá - Azul', unitPrice: 100,
            unit_price: 100, price: 100, images: ['photo.jpg'], stock: 0, active: false,
        });
    });
});
