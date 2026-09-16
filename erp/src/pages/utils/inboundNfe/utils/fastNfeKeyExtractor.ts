/**
 * Extrator rápido de Chave de Acesso de NF-e (44 dígitos).
 * Executa uma varredura ultra-rápida no texto do arquivo (XML, PDF, etc.)
 * ANTES de acionar a extração pesada via IA/Vision, economizando tempo e recursos.
 */
export async function fastExtractNfeAccessKey(file: File): Promise<string | null> {
    try {
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();

        // 1. Arquivo XML
        if (fileName.endsWith('.xml') || fileType.includes('xml')) {
            const text = await file.text();
            const chNFeMatch = text.match(/<chNFe>(\d{44})<\/chNFe>/i) || text.match(/infNFe\s+Id="NFe(\d{44})"/i);
            if (chNFeMatch?.[1]) return chNFeMatch[1];

            const genericKeyMatch = text.match(/\b\d{44}\b/);
            if (genericKeyMatch?.[0]) return genericKeyMatch[0];
        }

        // 2. Arquivo PDF (Varredura direta em streams de texto do PDF)
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            const text = await file.text();
            
            // Procura padrão contínuo de 44 dígitos no texto do PDF
            const pdfKeyMatch = text.match(/\b\d{44}\b/);
            if (pdfKeyMatch?.[0]) return pdfKeyMatch[0];

            // Procura chave formatada (ex: 35.2309.12345678000199.55.001.000012345.1.000123456)
            const formattedMatch = text.match(/\b\d{2}\.\d{4}\.\d{14}\.\d{2}\.\d{3}\.\d{9}\.\d{1}\b/);
            if (formattedMatch?.[0]) {
                const cleaned = formattedMatch[0].replace(/\D/g, '');
                if (cleaned.length === 44) return cleaned;
            }
        }
    } catch {
        // Se a leitura direta não encontrar ou falhar, retorna null para seguir com a análise completa
    }

    return null;
}
