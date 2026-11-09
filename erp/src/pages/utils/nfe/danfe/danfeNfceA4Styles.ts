import { DANFE_NFCE_A4_CHROME_STYLES } from './danfeNfceA4ChromeStyles';

export const DANFE_NFCE_A4_STYLES = `
    @page {
      size: A4 portrait;
      margin: 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #000;
      font-family: "Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif;
      font-size: 9px;
      line-height: 1.15;
    }${DANFE_NFCE_A4_CHROME_STYLES}
    .danfe-nfce-a4 {
      width: calc(100% - 24px);
      max-width: 200mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      box-shadow: none;
      box-sizing: border-box;
    }
    .danfe-pages {
      display: flex;
      flex-direction: column;
      gap: 5mm;
    }
    .danfe-page {
      width: 100%;
      height: 287mm;
      margin: 0 auto;
      overflow: visible;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .danfe-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .homologation-stripe {
      background: #fff1f2;
      border: 1px solid #e11d48;
      color: #be123c;
      padding: 3px 5px;
      text-align: center;
      font-weight: 900;
      font-size: 9px;
      letter-spacing: 0.5px;
      margin-bottom: 0;
      border-radius: 0;
      border-bottom-width: 0;
    }
    .document-header {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.78fr) minmax(0, 1fr);
      border: 1px solid #000;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .issuer-card,
    .document-card,
    .consultation-header {
      min-width: 0;
      padding: 2px 3px;
    }
    .issuer-card,
    .document-card {
      border-right: 1px solid #000;
    }
    .issuer-card {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .issuer-card.without-logo { justify-content: center; }
    .issuer-logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 20mm;
      min-height: 20mm;
    }
    .issuer-logo {
      display: block;
      max-width: 20mm;
      max-height: 20mm;
      object-fit: contain;
    }
    .issuer-details { min-width: 0; text-align: left; }
    .issuer-title {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 1px;
      overflow-wrap: anywhere;
    }
    .issuer-data {
      font-size: 6.5px;
      color: #000;
      font-weight: 600;
      margin-bottom: 1px;
      overflow-wrap: anywhere;
    }
    .issuer-address {
      font-size: 6.2px;
      color: #000;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .document-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
    }
    .doc-subtitle {
      font-size: 6.5px;
      font-weight: 600;
      color: #000;
      margin-top: 2px;
      line-height: 1.25;
    }
    .doc-direction {
      font-size: 7px;
      margin-top: 2px;
      color: #000;
    }
    .doc-number {
      font-size: 9px;
      font-weight: 700;
      color: #000;
      margin-top: 2px;
    }
    .doc-meta {
      font-size: 6.5px;
      font-weight: 600;
      color: #000;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }
    .doc-page-counter {
      font-size: 6.5px;
      font-weight: 700;
    }
    .consultation-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .key-label {
      font-size: 6px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
    }
    .key-value {
      width: 100%;
      margin-top: 2px;
      color: #000;
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: 0.25px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .consultation-header .qr-svg-wrapper {
      margin-top: 1px;
    }
    .key-url {
      margin-top: 1px;
      font-size: 6.5px;
      color: #1d4ed8;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }
    .section-title {
      background: #ffffff;
      border: 1px solid #000;
      padding: 2px 4px;
      font-size: 7px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      margin: 0;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    .products-title {
      border-width: 0 1px 0;
    }
    .consumer-card {
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .consumer-card .section-title { border-width: 0 0 1px; }
    .consumer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.5fr 0.8fr;
    }
    .consumer-field {
      min-width: 0;
      padding: 3px 5px;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .consumer-name { grid-column: span 2; }
    .consumer-tax-id { grid-column: span 2; border-right: 0; }
    .consumer-address { grid-column: span 2; border-bottom: 0; }
    .consumer-municipality { border-bottom: 0; }
    .consumer-state { border-right: 0; }
    .consumer-label {
      display: block;
      font-size: 6.5px;
      color: #000;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .consumer-value {
      display: block;
      font-size: 8.5px;
      color: #000;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .consumer-value.primary { font-size: 9px; font-weight: 800; }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8px;
      margin-top: 0;
      page-break-inside: auto;
    }
    table.items-table thead {
      display: table-header-group;
    }
    table.items-table th {
      background: #ffffff;
      border: 1px solid #000;
      padding: 3px 2px;
      font-size: 7px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      line-height: 1.05;
    }
    table.items-table td {
      border: 1px solid #000;
      padding: 3px 2px;
      color: #000;
      vertical-align: top;
      overflow-wrap: anywhere;
      line-height: 1.15;
    }
    table.items-table .table-fill-row td {
      height: 0;
      padding: 0;
      font-size: 0;
      line-height: 0;
      vertical-align: top;
    }
    table.items-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.items-table tr:nth-child(even) {
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .item-name {
      font-weight: 500;
      color: #000;
      overflow-wrap: anywhere;
    }
    .item-extra {
      font-size: 7.2px;
      color: #000;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }
    .totals-payment-container {
      display: block;
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
    }
    .totals-panel,
    .payments-panel {
      min-width: 0;
      border: 0;
      padding: 0;
      background: #fff;
    }
    .totals-panel .section-title,
    .payments-panel .section-title { border-width: 0 0 1px; }
    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(23mm, 1fr));
    }
    .totals-cell {
      min-width: 0;
      padding: 3px 4px;
      border-right: 1px solid #000;
    }
    .totals-cell:last-child { border-right: 0; }
    .totals-label {
      display: block;
      min-height: 14px;
      font-size: 6.2px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .totals-value {
      display: block;
      margin-top: 2px;
      font-size: 8px;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
    }
    .totals-cell-total {
      font-weight: 900;
      background: #f2f2f2;
    }
    .totals-cell-total .totals-label { font-size: 6.5px; }
    .totals-cell-total .totals-value { font-size: 9.5px; font-weight: 900; }
    .payments-panel {
      border-top: 1px solid #000;
    }
    table.payment-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      color: #000;
    }
    .payment-table th,
    .payment-table td {
      padding: 3px 5px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid #000;
    }
    .payment-table th {
      font-size: 6.8px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .payment-table td {
      font-size: 8px;
    }
    .payment-table th + th,
    .payment-table td + td {
      border-left: 1px solid #000;
    }
    .payment-table th:last-child,
    .payment-table td:last-child {
      width: 27mm;
      text-align: right;
    }
    .payment-table tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .payment-table tbody tr:last-child td {
      border-bottom: 0;
    }
    .payment-table .payments-paid-total td {
      font-weight: 900;
      background: #f2f2f2;
    }
    .payment-table .change-row td {
      font-weight: 700;
    }
    .taxes-banner {
      margin: 0;
      padding: 3px 5px;
      background: #fff;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      font-size: 7.5px;
      color: #000;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .qr-svg-wrapper {
      width: 30mm;
      height: 30mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 2mm;
      border: 1px solid #000;
    }
    .qr-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .authorization-card {
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .authorization-card .section-title { margin: 0; border-width: 0 0 1px; }
    .authorization-grid {
      display: grid;
      grid-template-columns: 2fr 1.35fr 1.2fr 0.85fr;
    }
    .authorization-field {
      min-width: 0;
      padding: 4px 5px;
      border-right: 1px solid #000;
      border-bottom: 0;
    }
    .authorization-field:last-child { border-right: 0; }
    .authorization-label {
      display: block;
      font-size: 6.5px;
      color: #000;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .authorization-value {
      display: block;
      font-size: 8px;
      color: #000;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .authorization-access-key .authorization-value { font-size: 7.5px; }
    .document-notice {
      border-top: 1px solid #000;
      padding: 3px 5px;
      text-align: center;
      color: #000;
      font-size: 7.5px;
      line-height: 1.3;
    }
    .additional-info-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      margin: 0;
      padding: 0;
      background: #fff;
      page-break-inside: auto;
      break-inside: auto;
    }
    .page-footer-core {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .additional-info-cell { min-width: 0; }
    .additional-info-cell + .additional-info-cell { border-left: 1px solid #000; }
    .additional-info-title {
      padding: 1px 3px;
      border-bottom: 1px solid #000;
      font-size: 6.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      page-break-after: avoid;
      break-after: avoid-page;
      margin: 0;
    }
    .additional-info-content {
      padding: 2px 3px;
      font-size: 7.5px;
      color: #000;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.15;
      orphans: 3;
      widows: 3;
    }
    @media screen and (max-width: 760px) {
      .danfe-nfce-a4 {
        width: 100%;
        min-height: 0;
        padding: 0;
      }
      .document-header { grid-template-columns: 1fr 0.85fr; }
      .issuer-card { grid-column: 1 / -1; border-right: 0; border-bottom: 1px solid #000; }
      .document-card { border-right: 1px solid #000; }
    }
    @media screen and (max-width: 480px) {
      .document-header { grid-template-columns: 1fr; }
      .issuer-card,
      .document-card { border-right: 0; border-bottom: 1px solid #000; }
      .issuer-card { justify-content: flex-start; }
      .consultation-header { align-items: center; }
      .totals-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .consumer-grid { grid-template-columns: 1fr 1fr; }
      .consumer-name,
      .consumer-tax-id,
      .consumer-address { grid-column: span 2; border-right: 0; }
      .consumer-field { border-bottom: 1px solid #000; }
      .consumer-address { border-bottom: 1px solid #000; }
      .consumer-field.consumer-municipality { border-right: 1px solid #000; border-bottom: 0; }
      .consumer-field.consumer-state { border-bottom: 0; }
      .authorization-grid { grid-template-columns: 1fr 1fr; }
      .authorization-field:nth-child(2n) { border-right: 0; }
      .authorization-field:nth-child(-n + 2) { border-bottom: 1px solid #000; }
      .authorization-field:nth-child(n + 3) { border-bottom: 0; }
      .additional-info-section { grid-template-columns: 1fr; }
      .additional-info-cell + .additional-info-cell { border-top: 1px solid #000; border-left: 0; }
    }
    body.danfe-pagination-measuring .danfe-nfce-a4 {
      position: relative !important;
      width: 200mm !important;
      max-width: 200mm !important;
      margin: 0 !important;
    }
    body.danfe-pagination-measuring .danfe-pages {
      position: absolute !important;
      top: 0 !important;
      left: -10000px !important;
      display: block !important;
      width: 200mm !important;
    }
    body.danfe-pagination-measuring .danfe-page {
      width: 200mm !important;
      height: 287mm !important;
      margin: 0 !important;
    }
    body.danfe-pagination-measuring .document-header { grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.78fr) minmax(0, 1fr) !important; }
    body.danfe-pagination-measuring .issuer-card { grid-column: auto !important; border-right: 1px solid #000 !important; border-bottom: 0 !important; }
    body.danfe-pagination-measuring .document-card { border-right: 1px solid #000 !important; border-bottom: 0 !important; }
    body.danfe-pagination-measuring .totals-grid { grid-template-columns: repeat(auto-fit, minmax(23mm, 1fr)) !important; }
    body.danfe-pagination-measuring .consumer-grid { grid-template-columns: 2fr 1fr 1.5fr 0.8fr !important; }
    body.danfe-pagination-measuring .consumer-name,
    body.danfe-pagination-measuring .consumer-tax-id,
    body.danfe-pagination-measuring .consumer-address { grid-column: span 2 !important; border-right: 0 !important; }
    body.danfe-pagination-measuring .consumer-field { border-bottom: 1px solid #000 !important; }
    body.danfe-pagination-measuring .consumer-address,
    body.danfe-pagination-measuring .consumer-municipality,
    body.danfe-pagination-measuring .consumer-state { border-bottom: 0 !important; }
    body.danfe-pagination-measuring .consumer-municipality { border-right: 1px solid #000 !important; }
    body.danfe-pagination-measuring .consumer-state { border-right: 0 !important; }
    body.danfe-pagination-measuring .authorization-grid { grid-template-columns: 2fr 1.35fr 1.2fr 0.85fr !important; }
    body.danfe-pagination-measuring .authorization-field { border-bottom: 0 !important; border-right: 1px solid #000 !important; }
    body.danfe-pagination-measuring .authorization-field:last-child { border-right: 0 !important; }
    body.danfe-pagination-measuring .additional-info-section { grid-template-columns: 2fr 1fr !important; }
    body.danfe-pagination-measuring .additional-info-cell + .additional-info-cell { border-top: 0 !important; border-left: 1px solid #000 !important; }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .danfe-nfce-a4 {
        width: 100% !important;
        max-width: none !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
      .danfe-pages { display: block !important; }
      .danfe-page {
        width: 100% !important;
        height: 287mm !important;
        margin: 0 !important;
      }
      .danfe-page:last-child { page-break-after: auto !important; break-after: auto !important; }
      .key-value { background: #ffffff !important; }
      .qr-svg-wrapper {
        border-color: #000 !important;
      }
    }
  `;
