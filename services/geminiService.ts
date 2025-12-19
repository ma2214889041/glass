
import { GoogleGenAI, Type } from "@google/genai";
import { ImageSize, CreativeConcept, PosterConfig, PosterRecommendation, AppMode } from "../types";

export const ensureApiKey = async (): Promise<void> => {
  if (window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

const getClient = () => {
  // Always create a new instance right before use to get latest API key
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const PHOTOREALISM_INSTRUCTION = `
PHOTOREALISM MANDATE:
- You are a world-class commercial fashion photographer.
- MODEL AESTHETICS: STUNNINGLY BEAUTIFUL models, high-fashion makeup, exquisite facial symmetry.
- LIGHTING: Cinematic, directional, high-contrast lighting. Use rim lights, soft-boxes, or dramatic natural sunlight.
- EYEWEAR: Perfectly preserved shape, material texture, and lens refraction from the reference image.
`;

export const generateEyewearImage = async (
  imageBase64: string,
  prompt: string,
  size: ImageSize,
  additionalPrompt?: string
): Promise<string> => {
  await ensureApiKey();
  const ai = getClient();

  const fullPrompt = `
    ${PHOTOREALISM_INSTRUCTION}
    Reference: Exactly replicate the eyewear in the attached image.
    Scenario: ${prompt}
    User Request: ${additionalPrompt || 'None'}
    Ensure the result is 8k, ultra-detailed, and suitable for a high-end luxury brand.
  `;

  // Switched to gemini-2.5-flash-image for testing as per user request
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: fullPrompt },
      ],
    },
    config: {
      imageConfig: { aspectRatio: "3:4" }, // Nano banana doesn't support imageSize (1K/2K/4K)
    },
  });

  // Iterate through parts to find the image data
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated.");
};

export const generateCreativeConcepts = async (imageBase64: string): Promise<CreativeConcept[]> => {
  const ai = getClient(); 
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: "Analyze style and provide 3 high-end artistic photography concepts with titles (ZH), descriptions (ZH), and dense English prompts." },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["title", "description", "prompt"],
        },
      },
    },
  });
  return JSON.parse(response.text || "[]");
};

export const analyzeAndSuggestPosterConfigs = async (imageBase64: string): Promise<PosterRecommendation[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        {
          text: `
            Act as an Art Director. Suggest 3 high-impact poster concepts.
            CRITICAL: Define a "Negative Space" layout for each (e.g., Top Void, Bottom-Left Void).
            Visual Prompt MUST describe cinematic lighting, dynamic camera angles (low/high), and background textures.
            Return JSON Array of 3 items with name, description, title, subtitle, style, includeModel, colorPalette, fontType, layout, visualPrompt.
          `,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            style: { type: Type.STRING },
            includeModel: { type: Type.BOOLEAN },
            colorPalette: { type: Type.STRING },
            fontType: { type: Type.STRING },
            layout: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
          },
          required: ["name", "visualPrompt"],
        },
      },
    },
  });
  return JSON.parse(response.text || "[]");
};

export const generatePosterImage = async (
  imageBase64: string,
  config: PosterConfig,
  size: ImageSize,
  additionalPrompt?: string
): Promise<string> => {
  await ensureApiKey();
  const ai = getClient();

  const prompt = `
    TASK: Generate a Professional Advertising Poster.
    COMPOSITION: ${config.layout}. STRICTLY provide large NEGATIVE SPACE for typography.
    VISUALS: ${config.visualPrompt}
    TYPOGRAPHY: Render the text "${config.title}" and "${config.subtitle}" in ${config.fontType} font, integrated stylishly into the negative space.
    PRODUCT: Eyewear from reference must be identical.
    VIBE: Global Campaign, high-impact billboard, 8k.
    User Overrides: ${additionalPrompt || 'None'}
  `;

  // Switched to gemini-2.5-flash-image for testing as per user request
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: prompt },
      ],
    },
    config: {
      imageConfig: { aspectRatio: "3:4" },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated.");
};

export const optimizePrompt = async (currentInput: string, mode: AppMode): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Optimize this image prompt for a luxury eyewear campaign in ${mode} mode: "${currentInput}". Keep it concise and cinematic.`
  });
  return response.text?.trim() || currentInput;
};

export const getPromptSuggestions = async (mode: AppMode): Promise<string[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Suggest 3 photography keywords for ${mode} mode. Return JSON array of strings.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};
