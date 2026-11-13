import {
  CATALOG_FIELDS, isTemplateField, templateFieldLabel,
  type CatalogField, type TemplateField, type TemplatePreviewProduct,
} from '../../../../../../../shared-utils/catalogImageTemplate';

const EXCLUDED_DROPDOWN_FIELDS = new Set(['productType', 'promoPrice', 'salePrice']);
const fieldOptions = Object.entries(CATALOG_FIELDS).filter(([field]) => !EXCLUDED_DROPDOWN_FIELDS.has(field)) as [CatalogField, string][];

export function optionsFor(current: TemplateField, product: TemplatePreviewProduct | null): [TemplateField, string][] {
  const dynamicFields = Object.entries(product?.attributes ?? {}).reduce<[TemplateField, string][]>((fields, [field, attribute]) => {
    if (attribute && field !== 'attribute_cor') fields.push([field as TemplateField, attribute.name]);
    return fields;
  }, []);
  const options: [TemplateField, string][] = [...fieldOptions, ...dynamicFields];
  if (!options.some(([field]) => field === current)) options.push([current, templateFieldLabel(current, product?.attributes)]);
  return options;
}

export function messageAttributeSignature(attributes: TemplatePreviewProduct['attributes']) {
  return JSON.stringify(Object.entries(attributes ?? {}).map(([field, attribute]) => [field, attribute?.name]));
}

export function createMessageToken(rawField: string, label: string) {
  const token = document.createElement('span');
  token.className = 'ct-message-token';
  token.contentEditable = 'false';
  token.dataset.templateField = rawField;
  token.title = `Parâmetro: ${label}`;
  token.append(document.createTextNode(label));
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'ct-message-token-remove';
  remove.dataset.removeTemplateField = 'true';
  remove.setAttribute('aria-label', `Remover parâmetro ${label}`);
  remove.textContent = '×';
  token.append(remove);
  return token;
}

export function renderMessageEditor(root: HTMLDivElement, value: string, product: TemplatePreviewProduct | null, labels: string) {
  root.replaceChildren();
  const appendText = (text: string) => { if (text) root.append(document.createTextNode(text)); };
  const tokenPattern = /\{\{product\.([a-zA-Z0-9_]+)\}\}/g;
  let cursor = 0;
  for (const match of value.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    appendText(value.slice(cursor, start));
    const rawField = match[1];
    root.append(isTemplateField(rawField)
      ? createMessageToken(rawField, templateFieldLabel(rawField as TemplateField, product?.attributes))
      : document.createTextNode(match[0]));
    cursor = start + match[0].length;
  }
  appendText(value.slice(cursor));
  root.dataset.messageValue = value;
  root.dataset.attributeLabels = labels;
}

function serializeMessageNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.templateField) return `{{product.${node.dataset.templateField}}}`;
  if (node.tagName === 'BR') return '\n';
  const value = Array.from(node.childNodes).map(serializeMessageNode).join('');
  return ['DIV', 'P'].includes(node.tagName) && node.textContent ? `${value}\n` : value;
}

export function serializeMessageEditor(root: HTMLDivElement) {
  if (root.childNodes.length === 1 && root.firstChild instanceof HTMLBRElement) return '';
  return Array.from(root.childNodes).map(serializeMessageNode).join('');
}

export function messageEditorRange(root: HTMLDivElement) {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (range && root.contains(range.commonAncestorContainer)) return range;
  const end = document.createRange();
  end.selectNodeContents(root);
  end.collapse(false);
  return end;
}

export function setMessageEditorCaret(range: Range) {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
