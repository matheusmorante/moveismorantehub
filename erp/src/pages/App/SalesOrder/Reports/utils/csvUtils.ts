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

export const exportResultsToCSV = (data: any[]) => {
    if (data.length === 0) return;
    const headers = ['Produto', 'Fornecedor', 'Giro (Qtd)', 'Receita Total', 'Lucro Total', 'Custo Medio', 'Part. Acumulada', 'Curva ABC', 'Lucro Mensal', 'Giro Mensal', 'Quadrante'];
    const rows = data.map(item => [
        `"${(item.product || '').replace(/"/g, '""')}"`,
        `"${(item.supplier || '').replace(/"/g, '""')}"`,
        item.totalQuantity,
        item.totalRevenue,
        item.totalProfit,
        item.avgCost,
        item.accumulatedPercentage,
        item.classification,
        item.monthlyProfit,
        item.monthlyTurnover,
        item.quadrant
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_abc_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const importResultsFromCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const { data } = parseCSV(text);
                
                const items = data.map(row => ({
                    date: new Date(),
                    product: row['Produto'] || row['product'] || 'Desconhecido',
                    supplier: row['Fornecedor'] || row['supplier'] || 'Sem Fornecedor',
                    quantity: Number(row['Giro (Qtd)'] || row['quantity'] || row['qty']) || 0,
                    salesValue: Number(row['Receita Total'] || row['revenue'] || row['rev']) || 0,
                    profit: Number(row['Lucro Total'] || row['profit']) || 0,
                    cost: Number(row['Custo Medio'] || row['cost']) || 0,
                }));
                
                resolve(items);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
};
