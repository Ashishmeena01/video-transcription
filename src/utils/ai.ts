import { GoogleGenAI } from "@google/genai";



if(!process.env.GEMINI_API_KEY) {
    throw new Error("One or more required environment variables are not defined.");
}


const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});


export default ai;