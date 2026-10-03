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

  it.each([
    { query: 'gua', code: '94035000', alias: 'guarda-roupa em MDF/MDP' },
    { query: 'roupa', code: '94035000', alias: 'guarda-roupa em MDF/MDP' },
    { query: 'guard', code: '94035000', alias: 'guarda-roupa em MDF/MDP' },
    { query: 'MDF/MDP', code: '94035000', alias: 'guarda-roupa em MDF/MDP' },
    { query: 'armário para cozinha', code: '94034000', alias: 'armário para cozinha MDF/MDP' },
    { query: 'cama', code: '94035000', alias: 'cama de madeira' },
    { query: 'cômoda', code: '94035000', alias: 'cômoda em MDF/MDP' },
    { query: 'mesa de cabeceira', code: '94035000', alias: 'mesa de cabeceira em MDF/MDP' },
    { query: 'criado-mudo', code: '94035000', alias: 'criado-mudo em MDF/MDP' },
    { query: '94035000', code: '94035000', alias: null },
    { query: 'quartos de dormir', code: '94035000', alias: null },
  ])('busca "$query" por tag, descrição ou código', async ({ query, code, alias }) => {
    searchNcms.mockResolvedValueOnce([
      {
        code,
        official_description: 'Móveis de madeira, do tipo utilizado em quartos de dormir',
        alias_match: alias,
        rank: 1.5,
      },
    ]);
    render(<NcmSelect value="" onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'NCM' }), {
      target: { value: query },
    });

    expect(
      await screen.findByText(
        alias || 'Móveis de madeira, do tipo utilizado em quartos de dormir'
      )
    ).toBeTruthy();
    expect(searchNcms).toHaveBeenCalledWith(query, 10);
  });

  it('aguarda três caracteres antes de consultar ou exibir resultados', async () => {
    render(<NcmSelect value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'NCM' }), {
      target: { value: 'gu' },
    });

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(searchNcms).not.toHaveBeenCalled();
    expect(screen.queryByText(/Nenhum NCM encontrado/)).toBeNull();
    expect(screen.queryByText(/guarda-roupa/)).toBeNull();
  });
});
