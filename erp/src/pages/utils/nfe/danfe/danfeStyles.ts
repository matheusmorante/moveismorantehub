export function getDanfeOfficialStyles(isHomologacao: boolean): string {
    return `
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            font-family: 'Courier New', Courier, monospace, Arial, sans-serif;
            font-size: 8px;
            color: #000;
            margin: 0;
            padding: 10px;
            background: #f1f5f9;
        }
        .danfe-a4 {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 5mm;
            border: 1px solid #000;
        }
        .border-box {
            border: 1px solid #000;
            position: relative;
        }
        .border-t-0 { border-top: 0 !important; }
        .border-b-0 { border-bottom: 0 !important; }
        .border-l-0 { border-left: 0 !important; }
        .border-r-0 { border-right: 0 !important; }
        
        .box-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 6px;
            font-weight: 800;
            text-transform: uppercase;
            color: #000;
            padding: 1px 2px 0 2px;
            line-height: 1;
        }
        .box-value {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.5px;
            font-weight: bold;
            color: #000;
            padding: 1px 2px 2px 2px;
            min-height: 12px;
            line-height: 1.1;
        }
        .box-value-sm {
            font-size: 7.5px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .font-black { font-weight: 900; }
        .font-bold { font-weight: bold; }
        
        /* Canhoto */
        .canhoto-container {
            border: 1px solid #000;
            border-bottom: 1px dashed #000;
            padding-bottom: 3px;
            margin-bottom: 4px;
        }
        
        /* Tabela de Produtos Oficial */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 7px;
        }
        .items-table th {
            border: 1px solid #000;
            background: #e2e8f0;
            font-size: 6.5px;
            font-weight: 800;
            padding: 2px;
            text-transform: uppercase;
            text-align: center;
        }
        .items-table td {
            border: 1px solid #000;
            padding: 2px;
            font-size: 7.5px;
        }
        
        .watermark-homologacao {
            ${isHomologacao ? `
                border: 2px dashed #dc2626;
                background: #fef2f2;
                color: #b91c1c;
                text-align: center;
                font-weight: 900;
                font-size: 11px;
                padding: 4px;
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ` : 'display: none;'}
        }
        
        @media print {
            body { background: #fff; padding: 0; }
            .danfe-a4 { border: none; padding: 0; width: 100%; min-height: auto; }
            .no-print { display: none !important; }
        }
    `;
}
