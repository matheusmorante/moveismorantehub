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

const { searchNcms, getCatalogEntry } = vi.hoisted(() => ({
  searchNcms: vi.fn<(searchTerm: string, maxResults?: number) => Promise<SearchResult[]>>(
    async () => []
  ),
  getCatalogEntry: vi.fn<(code: string) => Promise<any>>(async (code: string) => ({
    code,
    official_description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
    active: true,
    is_active: true,
  })),
}));
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { searchNcms, getCatalogEntry } }));

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
    getCatalogEntry.mockImplementation(async (code: string) => ({
      code,
      official_description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
      active: true,
      is_active: true,
    }));
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

  it('mantém o resultado do portal aberto até selecionar e propaga a descrição como subtítulo do código', async () => {
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

    expect(onChange).toHaveBeenLastCalledWith(
      '94035000',
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
    expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty(
      'value',
      '94035000'
    );
    expect(screen.getByTestId('ncm-select-description').textContent).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
  });

  it('exibe somente o código no input e a descrição da sefaz como subtítulo quando carregado', () => {
    render(
      <NcmSelect
        value="94035000"
        description="Móveis de madeira, do tipo utilizado em quartos de dormir"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty(
      'value',
      '94035000'
    );
    expect(screen.getByTestId('ncm-select-description').textContent).toBe(
      'Móveis de madeira, do tipo utilizado em quartos de dormir'
    );
  });
});
