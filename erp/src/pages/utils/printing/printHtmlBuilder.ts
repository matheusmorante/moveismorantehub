import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Order from "@/pages/types/order.type";
import { DanfeData, generateDanfeHtml } from "../nfe/danfeGenerator";
import { ReceiptPrintDocument } from "@/pages/ReceiptPage/ReceiptPrintDocument";
import { OrderPrintDocument } from "@/pages/OrderPage/OrderPrintDocument";
import { getSettings } from "../settingsService";

/**
 * Coleta todas as tags de estilo e links de folhas de estilo presentes no documento atual.
 */
const collectCurrentDocumentStyles = (): string => {
    if (typeof document === 'undefined') return '';
    return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
};

/**
 * Monta o documento HTML completo e autônomo com estilos embutidos e tag base.
 */
const wrapWithFullHtmlStructure = (bodyContent: string, title: string): string => {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173';
    const styles = collectCurrentDocumentStyles();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <base href="${origin}/">
    <title>${title}</title>
    ${styles}
</head>
<body style="margin: 0; padding: 0; background: #ffffff;">
    ${bodyContent}
</body>
</html>`;
};

/**
 * Constrói o HTML do Pedido de Venda renderizado fielmente em memória sem iframes nem abas.
 */
export const buildSalesOrderHtml = (order: Order, isBudget = false): string => {
    const markup = renderToStaticMarkup(
        React.createElement(OrderPrintDocument, { order, isBudget })
    );
    const title = `Pedido de Venda - ${order.id || 'Novo'}`;
    return wrapWithFullHtmlStructure(markup, title);
};

/**
 * Constrói o HTML do Recibo de Venda renderizado fielmente em memória sem iframes nem abas.
 */
export const buildReceiptHtml = (order: Order): string => {
    const settings = getSettings();
    const markup = renderToStaticMarkup(
        React.createElement(ReceiptPrintDocument, { order, settings })
    );
    const title = `Recibo de Venda - ${order.id || 'Novo'}`;
    return wrapWithFullHtmlStructure(markup, title);
};

/**
 * Constrói o HTML oficial do DANFE (NF-e ou NFC-e)
 */
export const buildDanfeHtml = (danfeData: DanfeData): string => {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173';
    const baseTag = `<base href="${origin}/">`;
    const rawHtml = generateDanfeHtml(danfeData);

    if (rawHtml.includes('<head>')) {
        return rawHtml.replace('<head>', `<head>${baseTag}`);
    }
    return `<!DOCTYPE html><html><head>${baseTag}</head>${rawHtml}</html>`;
};
