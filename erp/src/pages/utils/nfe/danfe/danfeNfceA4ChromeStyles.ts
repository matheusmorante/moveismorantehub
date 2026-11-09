export const DANFE_NFCE_A4_CHROME_STYLES = `
    .no-print {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto 10px;
      padding: 10px 16px;
      background: #1e293b;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .no-print-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .btn-print {
      background: #2563eb;
      color: #fff;
      border: 1px solid #1d4ed8;
      padding: 7px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .btn-close:hover {
      color: #fff;
      border-color: #cbd5e1;
    }
    .env-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .env-tag.homolog {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
    }
    .env-tag.prod {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #22c55e;
    }
    .env-tag.contingency {
      display: inline-block;
      margin-left: 6px;
      background: #fff7ed;
      color: #9a3412;
      border: 1px solid #fb923c;
    }`;
