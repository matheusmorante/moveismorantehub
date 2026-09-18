const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = 'c:\\Users\\mathe\\.gemini\\antigravity-ide\\brain\\3b2cd90a-8537-4385-b40b-9545525b2cba\\.system_generated\\logs\\transcript_full.jsonl';
const targetDir = 'c:\\Users\\mathe\\OneDrive\\Área de Trabalho\\projetos\\morantehub\\mobile\\src\\features\\stock';

async function processLineByLine() {
  const fileStream = fs.createReadStream(transcriptPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const filesMap = new Map();

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          if (tc.name === 'default_api:write_to_file' || tc.name === 'write_to_file') {
            const args = tc.arguments;
            if (args.TargetFile && args.TargetFile.includes('features') && args.TargetFile.includes('stock')) {
              filesMap.set(args.TargetFile, args.CodeContent);
            }
          }
          if (tc.name === 'default_api:replace_file_content' || tc.name === 'replace_file_content') {
            const args = tc.arguments;
            if (args.TargetFile && args.TargetFile.includes('features') && args.TargetFile.includes('stock')) {
              let currentContent = filesMap.get(args.TargetFile);
              if (currentContent) {
                  currentContent = currentContent.replace(args.TargetContent, args.ReplacementContent);
                  filesMap.set(args.TargetFile, currentContent);
              }
            }
          }
        }
      }
    } catch (e) { }
  }

  for (const [filePath, content] of filesMap.entries()) {
      const destPath = filePath; // keep original path for now, it'll recreate the old components/ screens/ folders
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destPath, content, 'utf8');
      console.log('Recovered: ' + destPath);
  }
}

processLineByLine().then(() => console.log('Done'));
