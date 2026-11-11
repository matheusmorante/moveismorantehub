import type { Plugin } from 'vite';

// The background-removal model is lazy-loaded. Rewrite only BigInt literals in
// its dependencies so the rest of the ERP keeps its existing browser targets.
export const segmentationBigIntCompatibility: Plugin = {
  name: 'segmentation-bigint-compatibility',
  apply: 'build',
  enforce: 'pre',
  transform(code, id) {
    if (!/[/\\](?:@huggingface[/\\]transformers|onnxruntime-web)[/\\]dist[/\\].*\.(?:m?js)$/.test(id)) return;
    const pending: any[] = [this.parse(code)];
    const replacements: Array<{ start: number; end: number; value: string }> = [];
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== 'object') continue;
      if (node.type === 'Literal' && typeof node.bigint === 'string') {
        replacements.push({ start: node.start, end: node.end, value: `BigInt(${JSON.stringify(node.bigint)})` });
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
