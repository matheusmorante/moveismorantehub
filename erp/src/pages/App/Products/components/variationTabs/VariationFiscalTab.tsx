import React from 'react';
import Product, { Variation } from '../../../../types/product.type';

interface VariationFiscalTabProps {
    formData: Variation;
    setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    parentProduct: Product;
}

export const VariationFiscalTab: React.FC<VariationFiscalTabProps> = ({
    parentProduct
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-350">
            <div className="p-5 bg-blue-50/70 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
                <i className="bi bi-info-circle-fill text-blue-500 text-sm mt-0.5"></i>
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    Esta variação herda automaticamente os dados tributários do produto pai ({parentProduct.fiscal?.ncm || "Sem NCM"}). Para alterar essas informações, acesse a aba Tributário no cadastro do produto pai.
                </p>
            </div>
        </div>
    );
};
