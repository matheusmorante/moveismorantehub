import type { Plugin } from 'vite';

// Rewrite BigInt literals only in the lazy-loaded segmentation and media tools.
// A Number fallback lets legacy bundles parse; those tools check for BigInt
// before running operations that require exact integer arithmetic.
export function createSegmentationBigIntCompatibility(): Plugin {
  return {
    name: 'segmentation-bigint-compatibility',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      const fileId = id.split(/[?#]/, 1)[0];
      if (!/[/\\](?:@huggingface[/\\]transformers|onnxruntime-web|mediabunny)[/\\]dist[/\\].*\.(?:m?js)$/.test(fileId)) return;
      const pending: any[] = [this.parse(code)];
      const replacements: Array<{ start: number; end: number; value: string }> = [];
      while (pending.length) {
        const node = pending.pop();
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'Literal' && typeof node.bigint === 'string') {
          const literal = JSON.stringify(node.bigint);
          replacements.push({
            start: node.start,
            end: node.end,
            value: `(typeof BigInt === 'function' ? BigInt(${literal}) : Number(${literal}))`,
          });
        }
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) pending.push(...value);
          else if (value && typeof value === 'object') pending.push(value);
        }
      }
      if (!replacements.length) return;
      for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
        code = code.slice(0, replacement.start) + replacement.value + code.slice(replacement.end);
      }
      return { code, map: null };
    },
  };
}

export const segmentationBigIntCompatibility = createSegmentationBigIntCompatibility();
