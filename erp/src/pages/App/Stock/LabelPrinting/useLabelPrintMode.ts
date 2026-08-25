import { useCallback, useEffect } from 'react';

const PRINT_PAGE_CLASS = 'label-printing-page';

export const useLabelPrintMode = () => {
    useEffect(() => {
        document.body.classList.add(PRINT_PAGE_CLASS);
        return () => document.body.classList.remove(PRINT_PAGE_CLASS);
    }, []);

    return useCallback(() => {
        document.body.classList.add(PRINT_PAGE_CLASS);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => window.print());
        });
    }, []);
};
