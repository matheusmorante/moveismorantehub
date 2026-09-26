/** Fail closed at the ordinary outbound endpoint. Estorno and return need their own reviewed draft. */
export function validateOrdinaryOutboundEnvelope(input: {
    xml: string;
    accessKey: string;
    model: '55' | '65';
    environment: 1 | 2;
    nfeNumber: number;
    series: string;
}): string | null {
    const { xml } = input;
    const ide = [...xml.matchAll(/<ide>([\s\S]*?)<\/ide>/g)];
    if (ide.length !== 1) return 'Identificação fiscal ausente ou duplicada.';
    const only = (tag: string): string | null => {
        const matches = [...ide[0][1].matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))];
        return matches.length === 1 ? matches[0][1].trim() : null;
    };
    if (only('finNFe') !== '1' || only('tpNF') !== '1') {
        return 'Esta rota transmite somente nota de saída normal. Estorno e devolução exigem revisão fiscal própria.';
    }
    if (only('mod') !== input.model || only('tpAmb') !== String(input.environment) ||
        Number(only('nNF')) !== input.nfeNumber || Number(only('serie')) !== Number(input.series) ||
        !/^\d{44}$/.test(input.accessKey) ||
        !xml.includes(`Id="NFe${input.accessKey}"`)) {
        return 'XML não corresponde ao modelo, ambiente, numeração ou chave informados.';
    }
    return null;
}
