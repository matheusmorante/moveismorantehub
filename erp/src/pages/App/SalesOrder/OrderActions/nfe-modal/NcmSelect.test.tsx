// @vitest-environment happy-dom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NcmSelect } from './NcmSelect';

type SearchResult = {
  code: string;
  official_description: string;
  alias_match: string | null;
  rank: number;
};

const { searchNcms } = vi.hoisted(() => ({
  searchNcms: vi.fn<(searchTerm: string, maxResults?: number) => Promise<SearchResult[]>>(
    async () => []
  ),
}));
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { searchNcms } }));

afterEach(cleanup);

describe('NCM exibido e submetido pelo modal', () => {
  beforeEach(() => {
    searchNcms.mockResolvedValue([
      {
        code: '94035000',
        official_description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
        alias_match: 'guarda-roupa',
        rank: 1.5,
      },
    ]);
  });

  it.each(['', '9403', '9403.40.00', 'INVALIDO', '94034000'])(
    'propaga a edição literal %j, inclusive inválida; não conserva o código anterior',
    (value) => {
      const onChange = vi.fn();
      render(<NcmSelect value="94036000" onChange={onChange} />);
      fireEvent.change(screen.getByRole('textbox', { name: 'NCM' }), { target: { value } });
      expect(onChange).toHaveBeenLastCalledWith(value);
      expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty('value', value);
    }
  );

  it('mantém o resultado do portal aberto até selecionar e propaga o código escolhido', async () => {
    const onChange = vi.fn();
    render(<NcmSelect value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'NCM' }), {
      target: { value: 'guar' },
    });

    const result = await screen.findByText(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
    fireEvent.mouseDown(result);

    expect(document.body.contains(result)).toBe(true);
    fireEvent.click(result);

    expect(onChange).toHaveBeenLastCalledWith('94035000');
    expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty('value', '94035000');
  });
});
