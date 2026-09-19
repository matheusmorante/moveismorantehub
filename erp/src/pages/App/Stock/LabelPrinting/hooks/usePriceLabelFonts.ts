import { useEffect, useState } from 'react';

const LOCAL_INTER_FONTS = [
    ['400', '/fonts/inter-400.ttf'],
    ['700', '/fonts/inter-700.ttf'],
    ['900', '/fonts/inter-900.ttf']
] as const;
let fontLoadPromise: Promise<boolean> | null = null;

const ensurePriceLabelFonts = () => {
    if (fontLoadPromise) return fontLoadPromise;
    fontLoadPromise = Promise.all(LOCAL_INTER_FONTS.map(async ([weight, source]) => {
        const font = new FontFace('Inter', `url(${source}) format('truetype')`, { weight });
        const loadedFont = await font.load();
        document.fonts.add(loadedFont);
    })).then(() => true).catch(() => false);
    return fontLoadPromise;
};

export const usePriceLabelFonts = () => {
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        let active = true;
        ensurePriceLabelFonts().then(loaded => active && setFontsReady(loaded));

        return () => {
            active = false;
        };
    }, []);

    return fontsReady;
};
