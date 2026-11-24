import * as fs from 'fs';

const SALES_CSV = 'c:\\Users\\Rosilene\\Desktop\\pdv\\vendas_2026-03-12-06-15-16.csv';
const content = fs.readFileSync(SALES_CSV, 'utf-8');
const lines = content.split('\n');
if (lines.length > 0) {
    const header = lines[0];
    const cols = header.split(';');
    console.log("Colunas encontradas:");
    cols.forEach((c, i) => console.log(`${i}: ${c}`));
}
