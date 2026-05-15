import { GoogleGenAI } from "@google/genai";

async function testModel(modelName) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    let response;
    if (modelName.includes('imagen')) {
      response = await ai.models.generateImages({
        model: modelName,
        prompt: 'a white cat',
        config: { numberOfImages: 1, aspectRatio: '1:1' }
      });
      console.log(`[SUCCESS] ${modelName} (generateImages)`);
      return true;
    } else {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: 'a white cat' }] }],
        config: { imageConfig: { aspectRatio: '1:1' } }
      });
      console.log(`[SUCCESS] ${modelName} (generateContent)`);
      return true;
    }
  } catch (error) {
    if (error.status === 403 || error.status === 404) {
      console.log(`[FAILED] ${modelName} - ${error.status} ${error.message.split('\n')[0]}`);
    } else {
      console.log(`[ERROR] ${modelName} -`, error.message);
    }
    return false;
  }
}

async function runTests() {
  const modelsToTest = [
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.5-pro-image',
    'gemini-1.5-flash',
    'gemini-3-flash-preview'
  ];

  for (const model of modelsToTest) {
    await testModel(model);
  }
}

runTests().catch(console.error);
