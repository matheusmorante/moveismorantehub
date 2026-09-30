// @vitest-environment happy-dom
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NcmSelect } from './NcmSelect';
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { searchNcms: vi.fn(async () => []) } }));
afterEach(cleanup);
describe('NCM exibido e submetido pelo modal', () => {
  it.each(['', '9403', '9403.40.00', 'INVALIDO', '94034000'])(
    'propaga a edição literal %j, inclusive inválida; não conserva o código anterior', (value) => {
      const onChange = vi.fn();
      render(<NcmSelect value="94036000" onChange={onChange} />);
      fireEvent.change(screen.getByRole('textbox', { name: 'NCM' }), { target: { value } });
      expect(onChange).toHaveBeenLastCalledWith(value);
      expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty('value', value);
    });
});
