// ─── Normalização de UF (Sigla Oficial de 2 Letras) ──────────────────────────
export const normalizeUf = (rawState?: string): string => {
    if (!rawState) return 'PR';
    const clean = rawState.trim().toUpperCase();
    if (clean.length === 2) return clean;
    const STATE_MAP: Record<string, string> = {
        'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPÁ': 'AP', 'AMAPA': 'AP',
        'AMAZONAS': 'AM', 'BAHIA': 'BA', 'CEARÁ': 'CE', 'CEARA': 'CE',
        'DISTRITO FEDERAL': 'DF', 'ESPÍRITO SANTO': 'ES', 'ESPIRITO SANTO': 'ES',
        'GOIÁS': 'GO', 'GOIAS': 'GO', 'MARANHÃO': 'MA', 'MARANHAO': 'MA',
        'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS', 'MINAS GERAIS': 'MG',
        'PARÁ': 'PA', 'PARA': 'PA', 'PARAÍBA': 'PB', 'PARAIBA': 'PB',
        'PARANÁ': 'PR', 'PARANA': 'PR', 'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI', 'PIAUI': 'PI',
        'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
        'RONDÔNIA': 'RO', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
        'SÃO PAULO': 'SP', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
    };
    return STATE_MAP[clean] || (clean.length === 2 ? clean : 'PR');
};

// ─── Extração Precisa de Endereço a Partir da Predição do Google Places ──────
export const parseAddressPrediction = (pred: any, defaultCity?: string, defaultState: string = 'PR'): {
    road: string;
    neighborhood: string;
    city: string;
    state: string;
} => {
    const mainText = pred.structured_formatting?.main_text || (pred.description ? pred.description.split(',')[0].split('-')[0].trim() : '');
    const secondaryText = pred.structured_formatting?.secondary_text || '';

    let road = mainText;
    let neighborhood = '';
    let city = defaultCity || '';
    let state = normalizeUf(defaultState || 'PR');

    let termsResolved = false;

    // 1. Extração estruturada via termos pred.terms
    if (Array.isArray(pred.terms) && pred.terms.length >= 2) {
        const termsValues = pred.terms.map((t: any) => (t?.value || '').trim()).filter(Boolean);
        const cleanTerms = termsValues.filter((t: string) => !['brasil', 'brazil'].includes(t.toLowerCase()));

        if (cleanTerms.length >= 2) {
            termsResolved = true;
            const candidateState = cleanTerms[cleanTerms.length - 1];
            state = normalizeUf(candidateState);

            city = cleanTerms[cleanTerms.length - 2];

            if (cleanTerms.length >= 4) {
                neighborhood = cleanTerms.slice(1, cleanTerms.length - 2).join(', ');
            }
        }
    }

    // 2. Fallback de extração a partir de secondaryText se termos não resolverem
    if (!termsResolved) {
        const parts = secondaryText
            .split(/[,–-]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s && !['brasil', 'brazil'].includes(s.toLowerCase()));

        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            const parsedUf = normalizeUf(lastPart);
            if (parsedUf !== 'PR' || lastPart.toUpperCase() === 'PR' || lastPart.toLowerCase() === 'paraná' || lastPart.toLowerCase() === 'parana') {
                state = parsedUf;
                parts.pop();
            }

            if (parts.length > 0 && !city) {
                city = parts.pop() || defaultCity || '';
            }

            if (parts.length > 0 && !neighborhood) {
                neighborhood = parts.join(', ');
            }
        }
    }

    // Se por algum motivo o bairro for idêntico à cidade ou ao estado, limpa o bairro
    if (neighborhood && (neighborhood.toLowerCase() === city.toLowerCase() || neighborhood.toUpperCase() === state.toUpperCase())) {
        neighborhood = '';
    }

    if (!city) city = defaultCity || 'Colombo';
    if (!state) state = 'PR';

    return { road, neighborhood, city, state };
};
