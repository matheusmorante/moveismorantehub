import React, { useLayoutEffect, useRef, useState } from 'react';
import { DynamicTextLayer } from '../../types';

export function FittedLayerText({ layer, text, canvasHeight }: { layer: DynamicTextLayer; text: string; canvasHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(text);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      let size = Math.max(8, canvasHeight * (layer.fontSizeRelative || .03));
      const isPrice = layer.role === 'price' || layer.role === 'oldPrice' || layer.type === 'DYNAMIC_PRICE';
      const min = isPrice ? 1 : Math.max(7, size * .55);
      node.style.whiteSpace = isPrice ? 'nowrap' : 'normal';
      node.textContent = text;
      node.style.fontSize = `${size}px`;
      const lines = layer.maxLines || (layer.role === 'title' ? 2 : 3);
      const siblingsHeight = Array.from(node.parentElement?.children || []).filter(child => child !== node)
        .reduce((total, child) => total + child.getBoundingClientRect().height, 0);
      const available = (node.parentElement?.clientHeight || Infinity) - siblingsHeight;
      while (size > min && (node.scrollWidth > node.clientWidth + 1 || node.getBoundingClientRect().height > Math.min(available, lines * size * 1.12) + 1)) {
        size -= .5; node.style.fontSize = `${size}px`;
      }
      const maxHeight = Math.min(available, lines * size * 1.12);
      let value = text;
      while (!isPrice && value.length && (node.getBoundingClientRect().height > maxHeight + 1 || node.scrollWidth > node.clientWidth + 1)) {
        value = value.slice(0, -1); node.textContent = value.trimEnd() + '…';
      }
      setDisplay(value === text ? text : value.trimEnd() + '…');
    };
    fit(); const observer = new ResizeObserver(fit); observer.observe(node.parentElement!);
    return () => observer.disconnect();
  }, [text, canvasHeight, layer]);
  return <div ref={ref} title={text} style={{ fontFamily: layer.fontFamily || 'Arial', color: layer.color,
    fontWeight: layer.fontWeight, textAlign: layer.textAlign, lineHeight: 1.12, overflowWrap: 'anywhere',
    textDecoration: layer.textDecoration, width: '100%', flexShrink: 0 }}>{display}</div>;
}
