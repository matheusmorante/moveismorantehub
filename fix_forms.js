const fs = require('fs');

// 1. Fix useProductFormSubmit.ts
const submitPath = 'erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts';
let submitContent = fs.readFileSync(submitPath, 'utf8');

if (!submitContent.includes("import { getEnteredProductName }")) {
    submitContent = "import { getEnteredProductName } from './rules/productDraftRules';\n" + submitContent;
}
submitContent = submitContent.replace(/draft\.getEnteredProductName\(formData\)/g, "getEnteredProductName(formData)");
fs.writeFileSync(submitPath, submitContent, 'utf8');
console.log('Fixed useProductFormSubmit.ts');

// 2. Fix useVariationForm.ts
const varFormPath = 'erp/src/pages/App/Products/hooks/variation/useVariationForm.ts';
let varFormContent = fs.readFileSync(varFormPath, 'utf8');

// We need to move effectiveTechnicalValues ABOVE getDim
const targetStr = `
    const effectiveTechnicalValues = getEffectiveVariationTechnicalValues(
      parentProduct.technicalValues || {},
      { ...finalVariation, attributes: cleanAttributes }
    );
`;
// First, remove it from its current position
if (varFormContent.includes("const effectiveTechnicalValues = getEffectiveVariationTechnicalValues(")) {
    varFormContent = varFormContent.replace(/\s*const effectiveTechnicalValues = getEffectiveVariationTechnicalValues\([\s\S]*?\{ \.\.\.finalVariation, attributes: cleanAttributes \}\n\s*\);/, "");
    
    // Now insert it right before `const getDim =`
    const insertStr = `
    const effectiveTechnicalValues = getEffectiveVariationTechnicalValues(
      parentProduct.technicalValues || {},
      { ...finalVariation, attributes: cleanAttributes }
    );
    const getDim = (`;
    varFormContent = varFormContent.replace(/    const getDim = \(/, insertStr);
    
    fs.writeFileSync(varFormPath, varFormContent, 'utf8');
    console.log('Fixed useVariationForm.ts');
} else {
    console.log('Could not find effectiveTechnicalValues block in useVariationForm.ts');
}
