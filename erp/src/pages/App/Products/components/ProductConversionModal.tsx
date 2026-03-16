import React, { useState } from 'react';
import Product, { Variation } from '../../../types/product.type';

interface ProductConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: Partial<Product>;
    onConvert: (updatedData: Partial<Product>) => void;
}

const ProductConversionModal: React.FC<ProductConversionModalProps> = ({ isOpen, onClose, formData, onConvert }) => {
    const [attrName, setAttrName] = useState('Cor');
    const [attrValue, setAttrValue] = useState('Padrão');

    if (!isOpen) return null;

    const handleConvert = () => {
        const newVariation: Variation = {
            id: Math.random().toString(36).substr(2, 9),
            name: `${attrName.toUpperCase()}: ${attrValue.toUpperCase()}`,
            sku: formData.code || '',
            stock: formData.stock || 0,
            unitPrice: formData.unitPrice || 0,
            costPrice: formData.costPrice || 0,
            syncUnitPrice: true,
            syncCostPrice: true,
            syncDescription: true,
            images: [],
            active: true,
            attributes: [{ name: attrName, value: attrValue }],
            comboItems: []
        };

        const updatedData: Partial<Product> = {
            ...formData,
            hasVariations: true,
            variations: [newVariation],
            // Clear parent code and stock as they moved to the variation
            code: '',
            stock: 0
        };

        onConvert(updatedData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                        <i className="bi bi-layers-fill text-2xl"></i>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Converter para Variação</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Criar grade de atributos</p>
                    </div>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Você está transformando este produto simples em um produto com variações. 
                    O <strong>SKU ({formData.code})</strong> e o <strong>Estoque ({formData.stock})</strong> serão movidos para a primeira variação.
                </p>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Atributo (Ex: Cor, Tamanho)</label>
                        <input
                            value={attrName}
                            onChange={(e) => setAttrName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Ex: Cor"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor do Atributo (Ex: Branco, G)</label>
                        <input
                            value={attrValue}
                            onChange={(e) => setAttrValue(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Ex: Padrão"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-10">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConvert}
                        className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                    >
                        Confirmar Conversão
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductConversionModal;
