/**
 * Utilitário simples para parsing de CSV sem dependências externas.
 * Suporta delimitadores (vírgula ou ponto e vírgula) e remoção básica de aspas.
 */
export function parseCSV(text: string): { data: any[], headers: string[] } {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return { data: [], headers: [] };
    
    // Decidir delimitador (vírgula ou ponto e vírgula) baseado na primeira linha
    const firstLine = lines[0];
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolons > commas ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
        // Regex para lidar com valores entre aspas que podem conter o delimitador
        // Este é um parser simplificado
        let values: string[] = [];
        if (text.includes('"')) {
             // Fallback mais seguro para campos com aspas
             const result = [];
             let current = '';
             let inQuotes = false;
             for (let i = 0; i < line.length; i++) {
                 const char = line[i];
                 if (char === '"') inQuotes = !inQuotes;
                 else if (char === delimiter && !inQuotes) {
                     result.push(current.trim());
                     current = '';
                 } else {
                     current += char;
                 }
             }
             result.push(current.trim());
             values = result;
        } else {
             values = line.split(delimiter).map(v => v.trim());
        }

        const obj: any = {};
        headers.forEach((h, i) => {
            obj[h] = values[i]?.replace(/^"|"$/g, '') || "";
        });
        return obj;
    });
    
    return { data, headers };
}
