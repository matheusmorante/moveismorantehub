import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    console.log("Listing available Gemini models...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    try {
        // The SDK doesn't have a direct listModels but we can try to find how it's done or use fetch
        // Actually, let's use a simple fetch to the Google API directly to be sure
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("Models found:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models found or error:", JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
