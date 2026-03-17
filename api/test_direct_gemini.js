import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function testDirectGemini() {
    console.log("Testing Gemini API Key directly...");
    console.log("API KEY (first 5):", process.env.GEMINI_API_KEY?.substring(0, 5));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "You are a helpful assistant." 
    });

    try {
        console.log("Calling generateContent...");
        const result = await model.generateContent("Hello, are you there?");
        console.log("Waiting for response...");
        const response = await result.response;
        console.log("Response text:", response.text());
    } catch (error) {
        console.error("Direct Gemini Error:", error.message);
        if (error.response) {
            console.error("Error Response:", JSON.stringify(error.response, null, 2));
        }
        console.error("Full Error Stack:", error.stack);
    }
}

testDirectGemini();
