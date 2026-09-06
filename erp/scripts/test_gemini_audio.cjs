const API_KEY = process.env.GEMINI_API_KEY || '';

const ttsModels = [
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-pro-preview-tts'
];

async function testTTS(model) {
  console.log(`\n--- Testando TTS Modelo: ${model} ---`);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  
  const payload = {
    contents: [
      {
        parts: [
          {
            text: 'Fale em português do Brasil com tom natural e profissional: Olá Matheus! O resumo das entregas está pronto para você ouvir.'
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Kore'
          }
        }
      }
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`[${model}] Status HTTP:`, res.status);
    const data = await res.json();
    if (!res.ok) {
      console.error(`[${model}] Erro:`, JSON.stringify(data, null, 2));
    } else {
      const candidates = data?.candidates || [];
      const parts = candidates[0]?.content?.parts || [];
      console.log(`[${model}] Partes retornadas:`, parts.length);
      const audioPart = parts.find(p => p.inlineData);
      if (audioPart) {
        console.log(`🎉 SUCCESS! [${model}] MimeType: ${audioPart.inlineData.mimeType}, Base64 Length: ${audioPart.inlineData.data.length}`);
      } else {
        console.log(`[${model}] Sem partes de áudio. Raw data:`, JSON.stringify(data).slice(0, 300));
      }
    }
  } catch (err) {
    console.error(`[${model}] Exceção:`, err.message);
  }
}

async function run() {
  for (const m of ttsModels) {
    await testTTS(m);
  }
}

run();
