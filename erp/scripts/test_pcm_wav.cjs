const API_KEY = process.env.GEMINI_API_KEY || '';
const fs = require('fs');

function pcmToWavBuffer(pcmBase64, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const pcmLen = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmLen, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmLen, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function run() {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Olá Matheus, a voz Gemini 3.1 Flash TTS está funcionando com perfeitamente!' }] }],
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
    })
  });

  const data = await res.json();
  const audioPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (audioPart) {
    const wavBuffer = pcmToWavBuffer(audioPart.inlineData.data);
    fs.writeFileSync('test_gemini_audio.wav', wavBuffer);
    console.log('✅ Arquivo test_gemini_audio.wav gerado com SUCESSO! Tamanho:', wavBuffer.length, 'bytes');
  } else {
    console.error('Falhou ao obter áudio:', data);
  }
}

run();
