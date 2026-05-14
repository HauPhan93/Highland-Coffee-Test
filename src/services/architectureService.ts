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
  private aiInstance: GoogleGenAI | null = null;

  private get ai(): GoogleGenAI {
    if (!this.aiInstance) {
      // In Vite, environment variables for client-side are prefixed with VITE_
      // AI Studio uses process.env.GEMINI_API_KEY
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                     (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
      
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is missing. AI features will be disabled. Check your environment variables.");
        // We throw a delayed error only when used, or just handle null
        return null as any; 
      }
      this.aiInstance = new GoogleGenAI({ apiKey });
    }
    return this.aiInstance;
  }

  async analyzeImage(base64Image: string, mimeType: string, lang: 'EN' | 'VI' = 'EN'): Promise<string> {
    const systemInstruction = `
      You are a senior architectural analysis expert from the "HIGHLANDS AI Studio" system. 
      Your mission is to perform "Architecture Vision System" – scanning images and providing accurate, professional technical assessments.
      
      Respond STRICTLY in ${lang === 'VI' ? 'Vietnamese' : 'English'}.

      Analysis Framework (Must return exactly in this Markdown structure):

      ### ${lang === 'VI' ? 'PHONG CÁCH KIẾN TRÚC' : 'ARCHITECTURAL STYLE'} (Style)
      Identify the style (e.g., Modernism, Tropical, Indochine, Minimalism...).
      Describe the main identifying characteristics in 3 professional sentences.
      **Tags:** [10 architectural keywords in English, separated by commas].

      ### ${lang === 'VI' ? 'YẾU TỐ KIẾN TRÚC' : 'ARCHITECTURAL ELEMENTS'} (Elements)
      List 8 specific details appearing in the image (Windows, roof, balcony, column system, greenery...). Use a bulleted list.

      ### ${lang === 'VI' ? 'VẬT LIỆU & ÁNH SÁNG' : 'MATERIALS & LIGHTING'} (Materials & Space)
      *   **${lang === 'VI' ? 'Vật liệu & Kết cấu' : 'Materials & Texture'}:** Describe surface details (Exposed concrete, natural wood, Low-E glass...).
      *   **${lang === 'VI' ? 'Màu sắc & Tông' : 'Color & Tone'}:** Analyze the dominant color palette.
      *   **${lang === 'VI' ? 'Ánh sáng & Không gian' : 'Lighting & Space'}:** Assess how lighting affects the volumes and forms.

      ### ${lang === 'VI' ? 'ĐỀ XUẤT RENDER' : 'RENDER SUGGESTION'} (Render Suggestion)
      Provide advice to upgrade this image to be more beautiful (Camera angle, time of day...).

      ### IMAGEN 3 RENDER PROMPT
      Write a deep, professional English Prompt for Imagen 3.
      Prompt structure requirements: [Subject description] + [Architectural style] + [Materials details] + [Lighting conditions (e.g., Golden hour, Cinematic lighting)] + [Camera settings (e.g., Wide angle, 8k, f/2.8)] + [Environment/Atmosphere].
      Goal: Create a photorealistic and high-class render.

      ### ${lang === 'VI' ? 'THANG ĐIỂM THIẾT KẾ' : 'DESIGN SCORES'} (Design Scores)
      Return as a Markdown table:
      | ${lang === 'VI' ? 'Tiêu chí' : 'Criterion'} | ${lang === 'VI' ? 'Điểm' : 'Score'} (0-100) |
      | :--- | :--- |
      | ${lang === 'VI' ? 'Bố cục' : 'Composition'} | [Score] |
      | ${lang === 'VI' ? 'Vật liệu' : 'Materials'} | [Score] |
      | ${lang === 'VI' ? 'Ánh sáng' : 'Lighting'} | [Score] |
      | ${lang === 'VI' ? 'Sáng tạo' : 'Innovation'} | [Score] |
      | ${lang === 'VI' ? 'Tỷ lệ' : 'Proportion'} | [Score] |
      | ${lang === 'VI' ? 'Chi tiết' : 'Detail'} | [Score] |
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: lang === 'VI' ? "Hãy phân tích hình ảnh kiến trúc này theo đúng framework được yêu cầu." : "Please analyze this architectural image according to the required framework." },
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

  async chatAboutArchitecture(base64Image: string, mimeType: string, question: string, lang: 'EN' | 'VI' = 'EN'): Promise<string> {
    const systemInstruction = `
      You are a senior architectural consultant from the "HIGHLANDS AI Studio".
      A user is asking a specific question/requirement about an architectural image or a project.
      
      Your goal is to provide professional, actionable architectural suggestions, improvements, or explanations.
      
      Respond STRICTLY in ${lang === 'VI' ? 'Vietnamese' : 'English'}.
      Format your response with Markdown. Use bullet points for suggestions.
      Keep the tone professional, helpful, and concise.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `CONTEXT: User is asking about their architectural design. 
                     QUESTION: ${question}` },
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
        temperature: 0.8,
      },
    });

    return response.text || "I am unable to provide a suggestion at this moment.";
  }
}

export const architectureService = new ArchitectureService();
