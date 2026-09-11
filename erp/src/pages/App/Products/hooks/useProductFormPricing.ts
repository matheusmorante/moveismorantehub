import React, { useState, useCallback } from 'react';
import Product from '@/pages/types/product.type';

export const parsePrice = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

export function useProductFormPricing(
    formData: Partial<Product>,
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
    const [discountPercent, setDiscountPercent] = useState('');
    const [discountFixed, setDiscountFixed] = useState('');

    const handlePriceChange = useCallback((newPrice: string | number) => {
        const orig = parsePrice(newPrice);
        setFormData(prev => {
            const next = { ...prev, unitPrice: orig };
            if (orig <= 0) {
                setDiscountPercent("");
                setDiscountFixed("");
                next.promoPrice = undefined;
                return next;
            }

            if (discountPercent) {
                const pct = parseFloat(discountPercent);
                if (!isNaN(pct)) {
                    const fixed = orig * (pct / 100);
                    setDiscountFixed(fixed.toFixed(2));
                    const promo = orig - fixed;
                    next.promoPrice = promo > 0 ? Number(promo.toFixed(2)) : 0;
                }
            } else if (prev.promoPrice && prev.promoPrice < orig) {
                const fixed = orig - prev.promoPrice;
                const pct = (fixed / orig) * 100;
                setDiscountFixed(fixed.toFixed(2));
                setDiscountPercent(pct.toFixed(1));
            }
            return next;
        });
    }, [discountPercent, setFormData]);

    const handleDiscountPercentChange = useCallback((valStr: string) => {
        setDiscountPercent(valStr);
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig <= 0 || valStr === "") {
                setDiscountFixed("");
                return { ...prev, promoPrice: undefined };
            }

            const pct = parseFloat(valStr);
            if (isNaN(pct) || pct < 0) {
                setDiscountFixed("");
                return { ...prev, promoPrice: undefined };
            }

            const fixed = orig * (pct / 100);
            setDiscountFixed(fixed.toFixed(2));
            const promo = orig - fixed;
            return { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 };
        });
    }, [setFormData]);

    const handleDiscountFixedChange = useCallback((valStr: string | number) => {
        const fixed = parsePrice(valStr);
        setDiscountFixed(String(valStr));
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig <= 0 || !valStr || fixed <= 0) {
                setDiscountPercent("");
                return { ...prev, promoPrice: undefined };
            }

            const pct = (fixed / orig) * 100;
            setDiscountPercent(pct.toFixed(1));
            const promo = orig - fixed;
            return { ...prev, promoPrice: promo > 0 ? Number(promo.toFixed(2)) : 0 };
        });
    }, [setFormData]);

    const handlePromoPriceFieldChange = useCallback((valStr: string | number) => {
        const promo = parsePrice(valStr);
        setFormData(prev => {
            const orig = prev.unitPrice || 0;
            if (orig > 0 && promo > 0 && promo < orig) {
                const fixed = orig - promo;
                const pct = (fixed / orig) * 100;
                setDiscountFixed(fixed.toFixed(2));
                setDiscountPercent(pct.toFixed(1));
            } else if (promo <= 0) {
                setDiscountFixed("");
                setDiscountPercent("");
            }
            return { ...prev, promoPrice: promo > 0 ? promo : undefined };
        });
    }, [setFormData]);

    const initializeDiscounts = useCallback((unitPrice?: number, promoPrice?: number) => {
        const orig = unitPrice || 0;
        const promo = promoPrice || 0;
        if (orig > 0 && promo > 0 && promo < orig) {
            const diff = orig - promo;
            setDiscountFixed(diff.toFixed(2));
            setDiscountPercent(((diff / orig) * 100).toFixed(1));
        } else {
            setDiscountFixed("");
            setDiscountPercent("");
        }
    }, []);

    return {
        discountPercent,
        discountFixed,
        setDiscountPercent,
        setDiscountFixed,
        handlePriceChange,
        handleDiscountPercentChange,
        handleDiscountFixedChange,
        handlePromoPriceFieldChange,
        initializeDiscounts,
    };
}
