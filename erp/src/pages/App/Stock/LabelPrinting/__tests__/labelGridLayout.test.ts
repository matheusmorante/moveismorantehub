import { describe, expect, it } from 'vitest';
import {
  expandLabelItems,
  getLabelGridPageItems,
  getLabelPaperDimensions,
} from '../utils/labelGridLayout';

describe('labelGridLayout', () => {
  it('expands items by quantity and preserves their instance identifiers', () => {
    const expanded = expandLabelItems(
      [
        { name: 'Sofá', price: 'R$ 100,00', quantity: 2, instances: ['a', 'b'] },
        { name: 'Mesa', price: 'R$ 200,00', quantity: 1 },
      ],
      'product'
    );

    expect(
      expanded.map(({ name, originalIdx, uuid, type }) => ({ name, originalIdx, uuid, type }))
    ).toEqual([
      { name: 'Sofá', originalIdx: 0, uuid: 'a', type: 'product' },
      { name: 'Sofá', originalIdx: 0, uuid: 'b', type: 'product' },
      { name: 'Mesa', originalIdx: 1, uuid: '000XXX', type: 'product' },
    ]);
  });

  it('returns only the items for the requested page', () => {
    expect(getLabelGridPageItems(['a', 'b', 'c', 'd', 'e'], 2, 1)).toEqual(['c', 'd']);
  });

  it.each([
    ['A3', undefined, undefined, { w: '297mm', h: '420mm' }],
    ['A5', undefined, undefined, { w: '148mm', h: '210mm' }],
    ['Letter', undefined, undefined, { w: '216mm', h: '279mm' }],
    ['Custom', 80, 120, { w: '80mm', h: '120mm' }],
    ['Custom', undefined, undefined, { w: '210mm', h: '297mm' }],
  ])('calculates dimensions for paper %s', (paperSize, paperWidth, paperHeight, expected) => {
    expect(
      getLabelPaperDimensions({
        paperSize: String(paperSize),
        paperWidth: paperWidth as number | undefined,
        paperHeight: paperHeight as number | undefined,
      })
    ).toEqual(expected);
  });
});
