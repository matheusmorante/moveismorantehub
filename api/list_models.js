import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
      const candidates = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
      candidates.forEach(m => console.log(`${m.name} -> ${m.displayName}`));
    } else {
      console.log("Nenhum modelo encontrado ou erro na chave:", data);
    }
  } catch (error) {
    console.error("Erro ao listar modelos:", error);
  }
}

listModels();
