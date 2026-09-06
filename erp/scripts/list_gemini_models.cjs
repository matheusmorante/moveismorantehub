const API_KEY = 'AQ.__REDACTED_GCP_API_KEY__';

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log('Modelos Disponíveis no seu Projeto AI Studio:');
    data.models.forEach(m => {
      console.log(`- ${m.name} | Métodos: ${m.supportedGenerationMethods?.join(', ')}`);
    });
  } else {
    console.log('Erro ao listar:', data);
  }
}

listModels();
