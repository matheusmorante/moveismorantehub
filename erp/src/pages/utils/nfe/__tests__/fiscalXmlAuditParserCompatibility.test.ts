import { expect, it, vi } from 'vitest';

vi.mock('@xmldom/xmldom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xmldom/xmldom')>();

  return {
    ...actual,
    DOMParser: class XmldomV09CompatibleParser extends actual.DOMParser {
      constructor(options?: ConstructorParameters<typeof actual.DOMParser>[0]) {
        if (options) super(options);
        else super();

        if (options && typeof options.errorHandler !== 'function')
          throw new TypeError('errorHandler object is no longer supported, switch to onError!');

        if (options && typeof options.errorHandler === 'function')
          options.errorHandler(
            'warning',
            'The `errorHandler` option has been deprecated, use `onError` instead!'
          );
      }
    },
  };
});

import { assertNfeSignature } from '../../../../../../api/nfe/fiscalXmlAudit';

it('uses xmldom 0.9-compatible callbacks without relaxing strict XML checks', () => {
  expect(() => assertNfeSignature('<NFe />')).toThrow(
    'XML fiscal precisa conter uma NF-e e uma assinatura XMLDSig.'
  );
  expect(() => assertNfeSignature('<NFe><')).toThrow('XML assinado inválido:');
});
