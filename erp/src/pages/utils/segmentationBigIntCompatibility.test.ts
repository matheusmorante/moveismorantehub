import { parseAst } from 'rollup/parseAst';
import { describe, expect, it } from 'vitest';
import { segmentationBigIntCompatibility } from '../../../vite-segmentation-compat';

const transform = segmentationBigIntCompatibility.transform as Function;

describe('compatibilidade do modelo de remoção de fundo', () => {
  it('converte apenas literais BigInt das dependências de segmentação', () => {
    const source = 'const value = 123n; const hex = 0xffn; const grouped = 1_000n; const text = "123n"; // 456n';
    const result = transform.call({ parse: parseAst }, source, '/node_modules/@huggingface/transformers/dist/model.js');
    expect(result.code).toContain('BigInt("123")');
    expect(result.code).toContain('BigInt("255")');
    expect(result.code).toContain('BigInt("1000")');
    expect(result.code).toContain('"123n"; // 456n');
  });

  it('também converte ONNX e não altera arquivos fora das dependências selecionadas', () => {
    const source = 'const value = 42n;';
    expect(transform.call({ parse: parseAst }, source, 'C:\\app\\node_modules\\onnxruntime-web\\dist\\runtime.mjs').code).toContain('BigInt("42")');
    expect(transform.call({ parse: parseAst }, source, '/src/other.js')).toBeUndefined();
  });
});
