export async function createGenerationHash(input: unknown): Promise<string> {
  const source = JSON.stringify(input);
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function modelGenerationInput(model: { prompt: string; referenceFiles: Array<{ fileUrl: string }>; generationVersion: number }, guidelines = '') {
  return { prompt: model.prompt, references: model.referenceFiles.map(file => file.fileUrl), guidelines, generatorVersion: model.generationVersion };
}
