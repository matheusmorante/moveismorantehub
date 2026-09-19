import { useCallback, useEffect } from 'react';

const PRINT_PAGE_CLASS = 'label-printing-page';

export const useLabelPrintMode = () => {
    useEffect(() => {
        document.body.classList.add(PRINT_PAGE_CLASS);
        return () => document.body.classList.remove(PRINT_PAGE_CLASS);
    }, []);

    return useCallback(async () => {
        document.body.classList.add(PRINT_PAGE_CLASS);
        await document.fonts?.ready;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.setTimeout(() => window.print(), 100);
            });
        });
    }, []);
};
