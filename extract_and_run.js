const fs = require('fs');
const { execSync } = require('child_process');

try {
  const content = fs.readFileSync('C:/Users/Rosilene/.gemini/antigravity/brain/267aea66-1826-44ee-96cd-378a4c517aa1/sql-cleanup-script.md', 'utf8');
  const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
  if (!sqlMatch) {
      console.error("SQL not found in markdown");
      process.exit(1);
  }
  const sql = sqlMatch[1];
  fs.writeFileSync('cleanup.sql', sql);
  console.log("SQL extracted. Running...");
  
  const output = execSync('npx supabase db query -f cleanup.sql --linked', { encoding: 'utf8' });
  console.log(output);
  console.log("Done.");
} catch (e) {
  if (e.stdout) console.log("STDOUT:", e.stdout.toString());
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
  console.error("ERROR:", e);
}
