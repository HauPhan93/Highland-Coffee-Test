import { GoogleGenAI } from "@google/genai";

export interface AnalysisResult {
  style: string;
  elements: string[];
  materials: string;
  renderSuggestion: string;
  imagenPrompt: string;
  scores: {
    composition: number;
    materials: number;
    lighting: number;
    innovation: number;
    proportion: number;
    detail: number;
  };
}

export class ArchitectureService {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async analyzeImage(base64Image: string, mimeType: string): Promise<string> {
    const systemInstruction = `
      You are a senior architectural analysis expert from the "HIGHLANDS AI Studio" system. 
      Your mission is to perform "Architecture Vision System" – scanning images and providing accurate, professional technical assessments.

      Analysis Framework (Must return exactly in this Markdown structure):

      ### ARCHITECTURAL STYLE (Style)
      Identify the style (e.g., Modernism, Tropical, Indochine, Minimalism...).
      Describe the main identifying characteristics in 3 professional sentences.
      **Tags:** [10 architectural keywords in English, separated by commas].

      ### ARCHITECTURAL ELEMENTS (Elements)
      List 8 specific details appearing in the image (Windows, roof, balcony, column system, greenery...). Use a bulleted list.

      ### MATERIALS & LIGHTING (Materials & Space)
      *   **Materials & Texture:** Describe surface details (Exposed concrete, natural wood, Low-E glass...).
      *   **Color & Tone:** Analyze the dominant color palette.
      *   **Lighting & Space:** Assess how lighting affects the volumes and forms.

      ### RENDER SUGGESTION (Render Suggestion)
      Provide advice to upgrade this image to be more beautiful (Camera angle, time of day...).

      ### IMAGEN 3 RENDER PROMPT
      Write a deep, professional English Prompt for Imagen 3.
      Prompt structure requirements: [Subject description] + [Architectural style] + [Materials details] + [Lighting conditions (e.g., Golden hour, Cinematic lighting)] + [Camera settings (e.g., Wide angle, 8k, f/2.8)] + [Environment/Atmosphere].
      Goal: Create a photorealistic and high-class render.

      ### DESIGN SCORES (Design Scores)
      Return as a Markdown table:
      | Criterion | Score (0-100) |
      | :--- | :--- |
      | Composition | [Score] |
      | Materials | [Score] |
      | Lighting | [Score] |
      | Innovation | [Score] |
      | Proportion | [Score] |
      | Detail | [Score] |
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Hãy phân tích hình ảnh kiến trúc này theo đúng framework được yêu cầu." },
            {
              inlineData: {
                data: base64Image.split(",")[1] || base64Image,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Không thể phân tích hình ảnh.";
  }
}

export const architectureService = new ArchitectureService();
