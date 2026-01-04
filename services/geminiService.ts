import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { TokenUsage, AppConfig } from "../types";

// We use window.aistudio for key management
// Accessing via type assertion to avoid conflicts with existing global types

/**
 * Converts a File object to a Base64 string for the API.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Ensures a valid API key is selected.
 */
export const ensureApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && typeof win.aistudio.hasSelectedApiKey === 'function') {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
      return await win.aistudio.hasSelectedApiKey();
    }
    return true;
  }
  return !!process.env.API_KEY;
};

/**
 * Builds the text prompt based on configuration.
 */
export const buildPrompt = (config: AppConfig): string => {
  let brandingInstructions = "";
  if (config.removeBranding) {
    brandingInstructions += "\n    - REMOVE BRANDING: Identify and scrub any existing logos, text, or watermarks from the original image (e.g., on clothing, products, signs).";
  }
  if (config.addBrandingColors) {
    brandingInstructions += `\n    - BRANDING COLORS: Subtly adjust the color palette, lighting, or clothing to feel cohesive and stylized. Use the specific brand color ${config.brandingColor} as a key accent color in the scene (e.g. ambient light, clothing detail, or props).`;
  }
  if (config.addOwnLogo && config.ownLogoData) {
    brandingInstructions += "\n    - INSERT LOGO: I have provided a second image which is a LOGO. You must realistically composite this logo into the scene (e.g., printed on a shirt, on a billboard, or on a product packaging) in a way that obeys the scene's lighting and perspective.";
  }

  return `
    Generate a new version of this image located in ${config.targetCountry}, keeping the same context but adapting the visual elements.

    CORE INSTRUCTIONS:
    1. CONTEXT: Maintain the original scenario, activity, or subject matter (e.g., eating dinner, walking a dog, a selfie), but transpanted to ${config.targetCountry}.
    2. FLEXIBILITY: You are encouraged to change the people, geometry, environment, and atmosphere to be authentic to ${config.targetCountry}.
       - PEOPLE: Update ethnicity, fashion, and appearance.
       - GEOMETRY & ENVIRONMENT: Redesign the architecture, background, and layout to fit the location. Do not feel strictly bound by the original perspective if a change improves cultural authenticity.
       - ATMOSPHERE: Adapt lighting and mood.
    
    BRANDING ADJUSTMENTS:${brandingInstructions}

    The output should be a distinct new variation that tells the same story in a different cultural setting.
    
    Additional Context: ${config.additionalContext}
  `;
};

/**
 * Generates a localized version of the image.
 */
export const generateLocalizedImage = async (
  base64Image: string,
  mimeType: string,
  config: AppConfig,
  apiKey?: string
): Promise<{ imageUrl: string; usage: TokenUsage }> => {
  // Always instantiate a new client to get the latest selected key
  // Use custom key if provided, otherwise fallback to environment variable
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  
  const prompt = buildPrompt(config);

  const parts: any[] = [
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: base64Image,
      },
    }
  ];

  // If we have a custom logo, add it as a second image part
  if (config.addOwnLogo && config.ownLogoData) {
    parts.push({
      inlineData: {
        mimeType: 'image/png', // Assuming PNG for logo transparency, but the API handles detection usually
        data: config.ownLogoData
      }
    });
  }

  try {
    // Using gemini-3-pro-image-preview (Nano Banana Pro) as requested
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: {
        parts: parts,
      },
      config: {
        // Add safety settings to prevent "No content generated" errors due to strict filtering
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      }
    });

    const usage: TokenUsage = {
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      candidateTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0,
    };

    const candidate = response.candidates?.[0];
    
    if (!candidate) {
         throw new Error("No candidates returned. The model might be overloaded or the prompt was blocked entirely.");
    }

    // Check for safety blocks or other finish reasons
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(`Generation stopped. Reason: ${candidate.finishReason}. This often means the image violated safety policies.`);
    }

    const responseParts = candidate.content?.parts;
    if (!responseParts || responseParts.length === 0) {
        throw new Error("No content parts generated. The model returned an empty response.");
    }

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          imageUrl: `data:image/png;base64,${part.inlineData.data}`,
          usage
        };
      }
    }

    throw new Error("No image data found in response. The model might have returned text instead of an image.");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};