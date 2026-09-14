import React from 'react';
import Product from '@/pages/types/product.type';
import LabelPrintSelectionModal, { LabelPrintType } from '../../components/modals/LabelPrintSelectionModal';
import ProductSalesModal from '../../components/modals/ProductSalesModal';
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';

export interface ProductRowModalsProps {
    readonly product: Product;
    readonly labelModal: { readonly open: boolean; readonly type: LabelPrintType };
    readonly onCloseLabelModal: () => void;
    readonly isSalesModalOpen: boolean;
    readonly onCloseSalesModal: () => void;
    readonly whatsAppModal: { readonly open: boolean; readonly message: string };
    readonly onCloseWhatsAppModal: () => void;
}

/**
 * Container desacoplado dos modais vinculados a uma linha de produto (etiquetas, vendas e envio por WhatsApp).
 */
export const ProductRowModals: React.FC<ProductRowModalsProps> = ({
    product,
    labelModal,
    onCloseLabelModal,
    isSalesModalOpen,
    onCloseSalesModal,
    whatsAppModal,
    onCloseWhatsAppModal,
}) => {
    return (
        <>
            <LabelPrintSelectionModal
                isOpen={labelModal.open}
                onClose={onCloseLabelModal}
                labelType={labelModal.type}
                initialProduct={{
                    id: product.id || '',
                    description: product.description,
                    code: product.code,
                    sku: product.sku,
                    unitPrice: product.unitPrice,
                    images: product.images,
                }}
            />

            {isSalesModalOpen && (
                <ProductSalesModal 
                    product={product}
                    onClose={onCloseSalesModal}
                />
            )}

            <SendWhatsAppModal
                isOpen={whatsAppModal.open}
                onClose={onCloseWhatsAppModal}
                initialMessage={whatsAppModal.message}
                title={`Enviar "${product.name || product.title || product.description}" via WhatsApp`}
            />
        </>
    );
};

export default ProductRowModals;
