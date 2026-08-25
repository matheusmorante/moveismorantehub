import { useEffect, useState } from 'react';

const FONT_LINK_ID = 'price-label-google-fonts';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Oswald:wght@400;700&family=Poppins:wght@400;700;900&family=Roboto:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap';
const REQUIRED_FONTS = ['Inter', 'Montserrat', 'Oswald', 'Roboto', 'Playfair Display', 'Bebas Neue', 'Anton', 'Poppins'];
let fontLoadPromise: Promise<void> | null = null;

const ensurePriceLabelFonts = () => {
    if (fontLoadPromise) return fontLoadPromise;
    fontLoadPromise = new Promise(resolve => {
        const loadFonts = async () => {
            try {
                await Promise.all(REQUIRED_FONTS.map(font => document.fonts.load(`900 16px "${font}"`)));
            } finally {
                resolve();
            }
        };
        const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
        if (existing?.sheet) return void loadFonts();

        const link = existing || document.createElement('link');
        link.id = FONT_LINK_ID;
        link.rel = 'stylesheet';
        link.href = FONT_URL;
        link.addEventListener('load', loadFonts, { once: true });
        link.addEventListener('error', () => resolve(), { once: true });
        if (!existing) document.head.appendChild(link);
    });
    return fontLoadPromise;
};

export const usePriceLabelFonts = () => {
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        let active = true;
        const fallbackTimer = window.setTimeout(() => active && setFontsReady(true), 4000);
        ensurePriceLabelFonts().then(() => active && setFontsReady(true));

        return () => {
            active = false;
            window.clearTimeout(fallbackTimer);
        };
    }, []);

    return fontsReady;
};
