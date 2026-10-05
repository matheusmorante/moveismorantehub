const fs = require('fs');

function updateVariationForm() {
    const path = 'erp/src/pages/App/Products/hooks/variation/useVariationForm.ts';
    let content = fs.readFileSync(path, 'utf8');

    const targetStr = `    const effectiveWidth = finalVariation.syncWidth
      ? Number(parentProduct.width || 0)
      : Number(formData.width || 0);
    const effectiveHeight = finalVariation.syncHeight
      ? Number(parentProduct.height || 0)
      : Number(formData.height || 0);
    const effectiveDepth = finalVariation.syncDepth
      ? Number(parentProduct.depth || 0)
      : Number(formData.depth || 0);`;

    const replacement = `    const effectiveTechnicalValues = getEffectiveVariationTechnicalValues(
      parentProduct.technicalValues || {},
      { ...finalVariation, attributes: cleanAttributes }
    );

    const getDim = (
      prop: 'width' | 'height' | 'depth',
      sync: boolean | undefined,
      techNames: string[]
    ) => {
      const parentVal = Number(parentProduct[prop] || 0);
      const varVal = Number(formData[prop] || 0);
      let val = sync ? parentVal : varVal;
      if (val <= 0) {
        for (const name of techNames) {
          const techVal = String(effectiveTechnicalValues[name] || '').replace(',', '.');
          const parsed = Number(techVal);
          if (!isNaN(parsed) && parsed > 0) {
            val = parsed;
            break;
          }
        }
      }
      return val;
    };

    const effectiveWidth = getDim('width', finalVariation.syncWidth, ['Largura']);
    const effectiveHeight = getDim('height', finalVariation.syncHeight, ['Altura']);
    const effectiveDepth = getDim('depth', finalVariation.syncDepth, ['Profundidade', 'Comprimento']);`;

    const removeStr = `    const effectiveTechnicalValues = getEffectiveVariationTechnicalValues(
      parentProduct.technicalValues || {},
      { ...finalVariation, attributes: cleanAttributes }
    );`;

    if (content.includes(targetStr)) {
        content = content.replace(targetStr, replacement);
        const lastIdx = content.lastIndexOf(removeStr);
        if (lastIdx > content.indexOf(replacement)) {
            content = content.slice(0, lastIdx) + content.slice(lastIdx + removeStr.length);
        }
        fs.writeFileSync(path, content, 'utf8');
        console.log('updated useVariationForm.ts');
    } else {
        console.log('targetStr not found in useVariationForm.ts');
    }
}

function updateLegibilityRules() {
    const path = 'erp/src/pages/App/Products/utils/productLegibilityRules.ts';
    let content = fs.readFileSync(path, 'utf8');

    const targetStr = `  const hasValidDimensions =
    isService ||
    (isPositiveNumber(data.width) && isPositiveNumber(data.height) && isPositiveNumber(data.depth));`;

    const replacement = `  const getDim = (prop: 'width' | 'height' | 'depth', names: string[]) => {
    if (isPositiveNumber(data[prop])) return true;
    if (data.technicalValues) {
      for (const name of names) {
        const val = String(data.technicalValues[name] || '').replace(',', '.');
        const num = Number(val);
        if (!isNaN(num) && num > 0) return true;
      }
    }
    return false;
  };

  const hasValidDimensions =
    isService ||
    (getDim('width', ['Largura']) && getDim('height', ['Altura']) && getDim('depth', ['Profundidade', 'Comprimento']));`;

    if (content.includes(targetStr)) {
        content = content.replace(targetStr, replacement);
        fs.writeFileSync(path, content, 'utf8');
        console.log('updated productLegibilityRules.ts');
    } else {
        console.log('targetStr not found in productLegibilityRules.ts');
    }
}

function updateProductKindRules() {
    const path = 'erp/src/pages/utils/productKindRules.ts';
    let content = fs.readFileSync(path, 'utf8');

    const targetStr = `  return {
    ...formData,
    name: options.name || formData.name || 'Produto',`;

    const replacement = `  const parseTech = (names: string[], currentVal: unknown) => {
    if (typeof currentVal === 'number' && currentVal > 0) return currentVal;
    const tv = formData.technicalValues || {};
    for (const name of names) {
      if (tv[name]) {
        const num = Number(String(tv[name]).replace(',', '.'));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return typeof currentVal === 'number' ? currentVal : 0;
  };

  return {
    ...formData,
    width: parseTech(['Largura'], formData.width),
    height: parseTech(['Altura'], formData.height),
    depth: parseTech(['Profundidade', 'Comprimento'], formData.depth),
    weight: parseTech(['Peso'], formData.weight),
    name: options.name || formData.name || 'Produto',`;

    if (content.includes(targetStr)) {
        content = content.replace(targetStr, replacement);
        fs.writeFileSync(path, content, 'utf8');
        console.log('updated productKindRules.ts');
    } else {
        console.log('targetStr not found in productKindRules.ts');
    }
}

updateVariationForm();
updateLegibilityRules();
updateProductKindRules();
