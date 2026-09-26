const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('C:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src');
let fixed = 0;
let alreadyOk = 0;
let noModal = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('<Modal')) {
    noModal++;
    continue;
  }
  if (content.includes('useSafeAreaInsets') || content.includes('SafeAreaView')) {
    alreadyOk++;
    continue;
  }

  console.log('Fixing:', file);
  
  // 1. Add import
  const importMatch = content.match(/import React.*?from 'react';/);
  if (importMatch) {
    content = content.replace(importMatch[0], importMatch[0] + "\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';");
  } else {
    content = "import { useSafeAreaInsets } from 'react-native-safe-area-context';\n" + content;
  }

  // 2. Add hook
  const componentMatch = content.match(/(export const [A-Za-z0-9_]+: React\.FC<.*?> = \([^)]*\)(?: =>) {)/);
  if (componentMatch) {
    content = content.replace(componentMatch[0], componentMatch[0] + "\n  const insets = useSafeAreaInsets();");
  } else {
    const componentMatch2 = content.match(/(export const [A-Za-z0-9_]+ = \([^)]*\) => {)/);
    if (componentMatch2) {
      content = content.replace(componentMatch2[0], componentMatch2[0] + "\n  const insets = useSafeAreaInsets();");
    } else {
      const componentMatch3 = content.match(/(const [A-Za-z0-9_]+ = \([^)]*\) => {)/);
      if (componentMatch3) {
         content = content.replace(componentMatch3[0], componentMatch3[0] + "\n  const insets = useSafeAreaInsets();");
      } else {
         console.log('Could not find component signature for:', file);
         continue;
      }
    }
  }

  // 3. Inject
  let modified = false;
  content = content.replace(/(<Modal[^>]*>[\s\n]*<View style=\{)\[([^\]]+)\](\})/g, (match, p1, p2, p3) => {
    modified = true;
    return p1 + '[' + p2 + ', { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]' + p3;
  });
  
  if (!modified) {
    content = content.replace(/(<Modal[^>]*>[\s\n]*<View style=\{)([^\[\]}]+)(\})/g, (match, p1, p2, p3) => {
      modified = true;
      return p1 + '[' + p2 + ', { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]' + p3;
    });
  }
  
  if (!modified) {
     console.log('Could not find inner View style to patch in:', file);
     continue;
  }

  fs.writeFileSync(file, content, 'utf8');
  fixed++;
}

console.log('Summary: Fixed=' + fixed + ', AlreadyOK=' + alreadyOk + ', NoModal=' + noModal);
