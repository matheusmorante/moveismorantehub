const fs = require('fs');
const path = require('path');

const srcFiles = [
  'C:\\Users\\mathe\\.gemini\\antigravity\\brain\\e78164c4-2cc5-4034-9ad2-38fe1a809c63\\icon_1775096253889.png',
  'C:\\Users\\mathe\\.gemini\\antigravity\\brain\\e78164c4-2cc5-4034-9ad2-38fe1a809c63\\splash_screen_1775096283605.png'
];

const destDir = 'C:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\moveismorantehub\\mobile\\assets';

fs.mkdirSync(destDir, { recursive: true });

fs.copyFileSync(srcFiles[0], path.join(destDir, 'icon.png'));
fs.copyFileSync(srcFiles[0], path.join(destDir, 'adaptive-icon.png'));
fs.copyFileSync(srcFiles[0], path.join(destDir, 'favicon.png'));
fs.copyFileSync(srcFiles[1], path.join(destDir, 'splash.png'));

console.log('Files copied successfully.');
