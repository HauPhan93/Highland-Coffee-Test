import { GoogleGenAI } from "@google/genai";

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.list();
  for await (const model of response) {
    if (model.name.includes('imagen') || model.name.includes('image') || model.name.includes('gemini')) {
      console.log(model.name);
    }
  }
}
run().catch(console.error);
