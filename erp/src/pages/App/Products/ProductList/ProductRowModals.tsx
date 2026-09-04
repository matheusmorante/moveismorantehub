import React from 'react';
import Product from '../../../types/product.type';
import LabelPrintSelectionModal, { LabelPrintType } from '../components/LabelPrintSelectionModal';
import ProductSalesModal from '../components/ProductSalesModal';
import { SendWhatsAppModal } from '@/components/shared/SendWhatsAppModal';

interface ProductRowModalsProps {
    product: Product;
    labelModal: { open: boolean; type: LabelPrintType };
    onCloseLabelModal: () => void;
    isSalesModalOpen: boolean;
    onCloseSalesModal: () => void;
    whatsAppModal: { open: boolean; message: string };
    onCloseWhatsAppModal: () => void;
}

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
                    id: product.id!,
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
