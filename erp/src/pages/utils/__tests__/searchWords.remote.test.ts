import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { buildAccentInsensitiveWordsRegex, buildNormalizedWordsRegex, buildPostgrestAccentInsensitiveOrFilter, matchesSearchText } from '../../../../../shared-utils/searchText';
import { buildProductParentSearchFilter, buildProductSearchTerms, buildProductVariationSearchFilter } from '../../../../../shared-utils/productListSearch';

describe.skipIf(process.env.MORANTE_REMOTE_SEARCH_VERIFY !== '1')('busca remota do catálogo autorizada', () => {
  it('encontra o produto solicitado com as palavras em ordens diferentes', async () => {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim() || '';
    const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD || '';
    expect(new URL(url).hostname).toBe('hkoxhourxwlddgsfdgws.supabase.co');
    expect(email.toLowerCase()).toBe('matheusmorante002@gmail.com');
    expect(Boolean(key && password)).toBe(true);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await client.auth.signInWithPassword({ email, password });
    expect(auth.error).toBeNull();
    expect(auth.data.user?.email?.toLowerCase()).toBe(email.toLowerCase());
    try {
      for (const query of ['balcão florença pia', 'pia balcao florenca']) {
        const { data, error } = await client.rpc('search_catalog_shallow', { p_query: query, p_limit: 15 });
        expect(error).toBeNull();
        expect(data?.some((row: { parent_name?: string }) =>
          matchesSearchText(row.parent_name, 'balcão pia florença'))).toBe(true);
      }
      const query = 'balcão florença pia';
      const terms = buildProductSearchTerms(query);
      const [grouped, price, pattern, parents, variations, people, suppliers, inbound, peopleSample] = await Promise.all([
        client.from('products').select('name').eq('deleted', false).eq('active', true)
          .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'description', 'code'], query)).limit(5),
        client.from('products').select('name').eq('deleted', false).eq('active', true)
          .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'description', 'code'], query, 'contains', { includeYAndIEquivalence: true })).limit(5),
        client.from('products').select('name').eq('deleted', false).eq('active', true)
          .filter('name', 'imatch', buildAccentInsensitiveWordsRegex(query)).limit(5),
        client.from('products').select('name').eq('deleted', false).eq('active', true)
          .or(buildProductParentSearchFilter(terms)).limit(5),
        client.from('product_variations').select('name')
          .or(buildProductVariationSearchFilter(terms.searchTerms)).limit(5),
        client.from('people').select('id')
          .filter('search_people_main_text', 'imatch', buildNormalizedWordsRegex(query)).limit(0),
        client.from('people').select('id')
          .filter('search_people_supplier_text', 'imatch', buildNormalizedWordsRegex(query)).limit(0),
        client.from('people').select('id')
          .filter('search_people_inbound_text', 'imatch', buildNormalizedWordsRegex(query)).limit(0),
        client.from('people').select('id,full_name').not('full_name', 'is', null).limit(50),
      ]);
      for (const [kind, response] of [['filtro agrupado', grouped], ['etiqueta de preço', price], ['padrão de um campo', pattern], ['produtos', parents]] as const) {
        expect(response.error, kind).toBeNull();
        expect(response.data?.some((row) => matchesSearchText(row.name, query)), kind).toBe(true);
      }
      expect(variations.error, 'variações').toBeNull();
      expect(people.error, 'pessoas').toBeNull();
      expect(suppliers.error, 'fornecedores').toBeNull();
      expect(inbound.error, 'fornecedores de entrada').toBeNull();
      expect(peopleSample.error).toBeNull();
      const sample = peopleSample.data?.find((person) => person.full_name?.trim().split(/\s+/).length >= 2);
      expect(sample).toBeDefined();
      const reversedName = sample!.full_name.trim().split(/\s+/).reverse().join(' ');
      for (const field of ['search_people_main_text', 'search_people_supplier_text', 'search_people_inbound_text']) {
        const result = await client.from('people').select('id').eq('id', sample!.id)
          .filter(field, 'imatch', buildNormalizedWordsRegex(reversedName));
        expect(result.error, field).toBeNull();
        expect(result.data).toHaveLength(1);
      }
    } finally {
      await client.auth.signOut();
    }
  }, 30_000);
});
