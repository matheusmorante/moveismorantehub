// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFixedPageSlots, normalizePageNumber } from '../../../../shared-utils/fixedPagination';
import { FixedPageSlots } from './FixedPageSlots';

afterEach(cleanup);

describe('fixed pagination slots', () => {
  it.each([
    [1, 1, [1]],
    [1, 2, [1, 2]],
    [2, 2, [1, 2]],
    [1, 3, [1, 2, 3]],
    [3, 3, [1, 2, 3]],
    [1, 4, [1, 2, 3, 4]],
    [3, 4, [1, 2, 3, 4]],
    [3, 5, [1, 2, 3, 4, 5]],
    [8, 10, [6, 7, 8, 9, 10]],
    [10, 10, [6, 7, 8, 9, 10]],
  ])(
    'keeps the current page centered when possible for page %i of %i',
    (page, totalPages, expected) => {
      expect(getFixedPageSlots(page, totalPages)).toEqual(expected);
    }
  );

  it('clamps invalid current pages after the result count shrinks', () => {
    expect(normalizePageNumber(9, 2)).toBe(2);
    expect(normalizePageNumber(0, 2)).toBe(1);
    expect(normalizePageNumber(Number.NaN, Number.NaN)).toBe(1);
  });

  it('renders equal page buttons and only navigates from non-current pages', () => {
    const onPageChange = vi.fn();
    render(
      <FixedPageSlots
        ariaLabel="Paginação de teste"
        currentPage={3}
        totalPages={4}
        onPageChange={onPageChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    const currentButton = screen.getByRole('button', { name: 'Página 3, atual' });
    expect(buttons).toHaveLength(4);
    expect(currentButton.getAttribute('aria-current')).toBe('page');

    fireEvent.click(currentButton);
    expect(onPageChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Página 4' }));
    expect(onPageChange.mock.calls).toEqual([[2], [4]]);
  });

  it('moves the displayed current page to the closest valid page and requests the clamp', () => {
    const onPageChange = vi.fn();
    render(
      <FixedPageSlots
        ariaLabel="Paginação de teste"
        currentPage={7}
        totalPages={2}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Página 2, atual' })).toBeTruthy();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
