const apiKey = process.env.OPENAI_API_KEY?.trim();

async function listModels() {
  if (!apiKey) throw new Error('Configure OPENAI_API_KEY no ambiente antes de executar.');
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI respondeu HTTP ${response.status}.`);
  const models = Array.isArray(payload.data) ? payload.data : [];
  models
    .map((model) => model.id)
    .filter((id) => /^(gpt-|text-embedding-|omni-|tts-)/i.test(id))
    .sort()
    .forEach((id) => console.log(`- ${id}`));
}

listModels().catch((error) => {
  console.error('Não foi possível listar os modelos OpenAI:', error.message);
  process.exitCode = 1;
});
