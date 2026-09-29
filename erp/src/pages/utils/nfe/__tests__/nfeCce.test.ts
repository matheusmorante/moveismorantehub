import { describe, expect, it } from 'vitest';
import { buildNfeCceXml, validateNfeCce } from '../nfeCce';

const input = {
  accessKey: '4'.repeat(44),
  environment: 2 as const,
  issuerCnpj: '44512248000107',
  sequence: 2,
  correction: 'Complemento correto: Bloco B, apartamento 102.',
  issuedAt: '2026-09-29T20:00:00.000Z',
  batchId: '2026092920000',
};

describe('Carta de Correção eletrônica', () => {
  it('aplica o limite oficial de 15 a 1.000 caracteres', () => {
    expect(validateNfeCce('Texto curto')).toContain('15');
    expect(validateNfeCce('c'.repeat(1001))).toContain('1.000');
    expect(validateNfeCce('c'.repeat(15))).toBeNull();
    expect(validateNfeCce('c'.repeat(1000))).toBeNull();
  });

  it('monta o evento 110110, sequência e condições legais obrigatórias', () => {
    const xml = buildNfeCceXml(input);
    expect(xml).toContain(`Id="ID110110${input.accessKey}02"`);
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<tpEvento>110110</tpEvento>');
    expect(xml).toContain('<nSeqEvento>2</nSeqEvento>');
    expect(xml).toContain('<descEvento>Carta de Correção</descEvento>');
    expect(xml).toContain('<xCondUso>');
  });

  it('escapa dados livres e recusa modelo implícito ou sequência fora de 1–20', () => {
    const xml = buildNfeCceXml({ ...input, correction: 'Complemento <correto> e & válido.' });
    expect(xml).toContain('Complemento &lt;correto&gt; e &amp; válido.');
    expect(() => buildNfeCceXml({ ...input, sequence: 21 })).toThrow(/1 e 20/);
    expect(() => buildNfeCceXml({ ...input, accessKey: 'x'.repeat(44) })).toThrow(/Chave/);
  });
});
