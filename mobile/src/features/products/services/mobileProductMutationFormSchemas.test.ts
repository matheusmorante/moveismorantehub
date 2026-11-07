import { describe, expect, it } from 'vitest';
import {
  productDraftDiscardFormSchema,
  productMoveToTrashFormSchema,
  productRestoreFromTrashFormSchema,
} from '../../../../../shared-utils/productVariationOperationFormSchemas';

describe('productDraftDiscardFormSchema', () => {
  it('accepts an explicitly confirmed draft and normalizes a display suffix from its UUID', () => {
    expect(
      productDraftDiscardFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000_display',
        confirmed: true,
      })
    ).toMatchObject({
      success: true,
      data: {
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: true,
      },
    });
  });

  it.each([
    { productId: 'not-a-uuid', confirmed: true },
    { productId: '123e4567-e89b-42d3-a456-426614174000', confirmed: false },
  ])('rejects invalid identifiers or an unconfirmed discard (%o)', (values) => {
    expect(productDraftDiscardFormSchema.safeParse(values).success).toBe(false);
  });

  it('requires explicit confirmation and a valid product ID before moving to trash', () => {
    expect(
      productMoveToTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: true,
      }).success
    ).toBe(true);
    expect(
      productMoveToTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        confirmed: false,
      }).success
    ).toBe(false);
  });

  it('requires the restore action and parses the product UUID before restoring', () => {
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000_display',
        action: 'restore',
      })
    ).toMatchObject({
      success: true,
      data: {
        productId: '123e4567-e89b-42d3-a456-426614174000',
        action: 'restore',
      },
    });
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: 'not-a-uuid',
        action: 'restore',
      }).success
    ).toBe(false);
    expect(
      productRestoreFromTrashFormSchema.safeParse({
        productId: '123e4567-e89b-42d3-a456-426614174000',
        action: 'delete',
      }).success
    ).toBe(false);
  });
});
