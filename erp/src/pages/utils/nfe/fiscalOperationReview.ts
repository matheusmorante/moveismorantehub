import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { normalizeReviewedFiscalBlock } from './fiscalOperationXml';

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';

function parseElement(xml: string, expectedName: string): Element {
    if (!xml || /<!DOCTYPE|<!ENTITY|<\?/i.test(xml)) throw new Error('Bloco fiscal original inválido.');
    let error = '';
    const document = new DOMParser({ errorHandler: {
        warning: (message) => { error ||= message; },
        error: (message) => { error ||= message; },
        fatalError: (message) => { error ||= message; },
    } }).parseFromString(xml, 'application/xml');
    if (error || !document.documentElement || document.documentElement.localName !== expectedName ||
        (document.documentElement.namespaceURI && document.documentElement.namespaceURI !== NFE_NAMESPACE)) {
        throw new Error(`Esperado XML válido do bloco ${expectedName}.`);
    }
    return document.documentElement;
}

function findElement(root: Element, name: string): Element | null {
    if (root.localName === name) return root;
    for (const child of Array.from(root.childNodes)) {
        if (child.nodeType !== 1) continue;
        const found = findElement(child as Element, name);
        if (found) return found;
    }
    return null;
}

function updateText(root: Element, name: string, value: string): void {
    const element = findElement(root, name);
    if (!element) throw new Error(`O item fiscal original não possui o campo ${name}.`);
    while (element.firstChild) element.removeChild(element.firstChild);
    element.appendChild(element.ownerDocument.createTextNode(value));
}

function proportionalValue(element: Element, factor: number): void {
    const original = element.textContent?.trim() || '';
    if (!/^\d+(?:\.\d+)?$/.test(original)) throw new Error(`Valor fiscal inválido em ${element.localName}.`);
    const decimals = original.split('.')[1]?.length || 0;
    const scale = 10 ** decimals;
    const value = Math.round(Number(original) * factor * scale) / scale;
    while (element.firstChild) element.removeChild(element.firstChild);
    element.appendChild(element.ownerDocument.createTextNode(value.toFixed(decimals)));
}

/** Retains the original product identity/NCM and changes only return quantity, proportional value, and reviewed CFOP. */
export function buildReturnProductXml(input: {
    originalProductXml: string;
    quantity: number;
    originalQuantity: number;
    grossValue: number;
    discountValue: number;
    cfop: string;
}): string {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > input.originalQuantity ||
        !Number.isFinite(input.originalQuantity) || input.originalQuantity <= 0 ||
        !/^\d{4}$/.test(input.cfop)) throw new Error('Quantidade ou CFOP de devolução inválido.');
    const product = parseElement(input.originalProductXml, 'prod');
    const factor = input.quantity / input.originalQuantity;
    const originalTributaryQuantity = findElement(product, 'qTrib');
    if (!originalTributaryQuantity) throw new Error('Item fiscal original sem quantidade tributável.');
    proportionalValue(originalTributaryQuantity, factor);
    updateText(product, 'CFOP', input.cfop);
    updateText(product, 'qCom', input.quantity.toFixed(4));
    updateText(product, 'vProd', input.grossValue.toFixed(2));
    const discount = findElement(product, 'vDesc');
    if (discount) updateText(product, 'vDesc', input.discountValue.toFixed(2));
    for (const name of ['vFrete', 'vSeg', 'vOutro']) {
        const value = findElement(product, name);
        if (value) proportionalValue(value, factor);
    }
    return normalizeReviewedFiscalBlock(new XMLSerializer().serializeToString(product), 'prod');
}

/** Scales original item tax bases/amounts proportionally; rates and tax classifications remain unchanged for review. */
export function buildProportionalReturnTaxesXml(originalTaxesXml: string, quantity: number, originalQuantity: number): string {
    if (!Number.isFinite(quantity) || !Number.isFinite(originalQuantity) || quantity <= 0 || originalQuantity <= 0 || quantity > originalQuantity) {
        throw new Error('Quantidade inválida para cálculo proporcional dos tributos.');
    }
    const taxes = parseElement(originalTaxesXml, 'imposto');
    const factor = quantity / originalQuantity;
    const scaleTags = (element: Element) => {
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType !== 1) continue;
            const childElement = child as Element;
            const isNumericLeaf = !Array.from(childElement.childNodes).some((node) => node.nodeType === 1);
            if (isNumericLeaf && (/^v/.test(childElement.localName) && !/^vAliqProd$/.test(childElement.localName) ||
                /^q(?:BC|Selo)/.test(childElement.localName))) proportionalValue(childElement, factor);
            else scaleTags(childElement);
        }
    };
    scaleTags(taxes);
    return normalizeReviewedFiscalBlock(new XMLSerializer().serializeToString(taxes), 'imposto');
}

/** Updates commercial total fields; tax totals remain visibly reviewable by the operator before saving. */
export function updateFiscalOperationTotalsXml(input: {
    originalTotalsXml: string;
    grossTotal: number;
    discountTotal: number;
    freight?: number;
    other?: number;
}): string {
    const total = parseElement(input.originalTotalsXml, 'total');
    const icmsTotal = findElement(total, 'ICMSTot');
    if (!icmsTotal) throw new Error('NF-e original sem ICMSTot para revisão da devolução.');
    const freight = input.freight || 0;
    const other = input.other || 0;
    updateText(icmsTotal, 'vProd', input.grossTotal.toFixed(2));
    updateText(icmsTotal, 'vDesc', input.discountTotal.toFixed(2));
    updateText(icmsTotal, 'vFrete', freight.toFixed(2));
    updateText(icmsTotal, 'vOutro', other.toFixed(2));
    updateText(icmsTotal, 'vNF', (input.grossTotal - input.discountTotal + freight + other).toFixed(2));
    return new XMLSerializer().serializeToString(total);
}
