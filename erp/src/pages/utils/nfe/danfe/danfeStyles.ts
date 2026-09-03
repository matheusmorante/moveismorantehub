export function getDanfeStyles(isHomologacao: boolean): string {
    return `
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .danfe-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            padding: 20px;
            border: 1px solid #94a3b8;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .watermark {
            ${isHomologacao ? `
                border: 2px dashed #ef4444;
                background: #fef2f2;
                color: #b91c1c;
                text-align: center;
                font-weight: 900;
                font-size: 13px;
                padding: 8px;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            ` : 'display: none;'}
        }
        .header-box {
            display: flex;
            border: 1px solid #94a3b8;
            margin-bottom: 10px;
        }
        .emit-info {
            flex: 1;
            padding: 10px;
            border-right: 1px solid #94a3b8;
        }
        .danfe-badge {
            width: 140px;
            text-align: center;
            padding: 10px;
            border-right: 1px solid #94a3b8;
        }
        .key-info {
            flex: 1.5;
            padding: 10px;
        }
        .section-title {
            font-weight: 900;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #f1f5f9;
            padding: 4px 8px;
            border: 1px solid #94a3b8;
            border-bottom: none;
            margin-top: 10px;
        }
        .data-box {
            border: 1px solid #94a3b8;
            padding: 8px;
            font-size: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 10px;
        }
        th {
            background: #f1f5f9;
            padding: 5px;
            border: 1px solid #94a3b8;
            font-size: 9px;
            text-transform: uppercase;
        }
        @media print {
            body { background: #fff; padding: 0; }
            .danfe-container { border: none; box-shadow: none; max-width: 100%; }
            .no-print { display: none; }
        }
    `;
}
