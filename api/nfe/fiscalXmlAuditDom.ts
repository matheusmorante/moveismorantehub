import { DOMParser } from '@xmldom/xmldom';

export function createStrictXmlParser(parseErrors: string[]) {
  return new DOMParser({
    errorHandler: (level, message) => {
      if (
        level === 'warning' &&
        String(message).includes('errorHandler') &&
        String(message).includes('deprecated')
      )
        return;
      parseErrors.push(String(message));
    },
  });
}

type XmlDocument = ReturnType<InstanceType<typeof DOMParser>['parseFromString']>;
export type XmlNode = NonNullable<XmlDocument['documentElement']>;

export const localName = (node: XmlNode) => (node.localName || node.tagName).split(':').at(-1) || '';
export const children = (node: XmlNode | null | undefined): XmlNode[] =>
  node ? Array.from(node.childNodes).filter((child): child is XmlNode => child.nodeType === 1) : [];
export const child = (node: XmlNode | null, name: string): XmlNode | null =>
  node ? children(node).find((candidate) => localName(candidate) === name) || null : null;
export const childElements = (node: XmlNode | null, name: string): XmlNode[] =>
  node ? children(node).filter((candidate) => localName(candidate) === name) : [];
export const text = (node: XmlNode | null, name: string): string =>
  child(node, name)?.textContent?.trim() || '';
export const allDescendants = (node: XmlNode, name: string): XmlNode[] => {
  const result: XmlNode[] = [];
  const visit = (current: XmlNode) => {
    if (localName(current) === name) result.push(current);
    children(current).forEach(visit);
  };
  visit(node);
  return result;
};
