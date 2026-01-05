"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { configValidator } from "./schema";
import { generateOutputFilename, getFilenameFromUrl } from "./utils/filenameUtils";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

/**
 * Image Processing Action
 * Calls Gemini API to generate localized images
 */

// Config type for TypeScript
type ProcessingConfig = {
  targetCountry: string;
  additionalContext: string;
  removeBranding: boolean;
  addBrandingColors: boolean;
  brandingColor: string;
  addOwnLogo: boolean;
  ownLogoData?: string | null;
  filenameFindPattern: string;
  filenameReplacePattern: string;
  modelVersion?: string;
  aspectRatio?: string;
  imageSize?: string;
};

/**
 * Build the prompt for Gemini based on config
 */
const buildPrompt = (config: ProcessingConfig): string => {
  let brandingInstructions = "";
  
  if (config.removeBranding) {
    brandingInstructions += "\n    - REMOVE BRANDING: Identify and scrub any existing logos, text, or watermarks from the original image.";
  }
  if (config.addBrandingColors) {
    brandingInstructions += `\n    - BRANDING COLORS: Subtly adjust the color palette using ${config.brandingColor} as a key accent color.`;
  }
  if (config.addOwnLogo && config.ownLogoData) {
    brandingInstructions += "\n    - INSERT LOGO: Composite the provided logo into the scene realistically.";
  }

  return `
    Generate a new version of this image located in ${config.targetCountry}, keeping the same context but adapting the visual elements.

    CORE INSTRUCTIONS:
    1. CONTEXT: Maintain the original scenario but transplanted to ${config.targetCountry}.
    2. FLEXIBILITY: Change people, geometry, environment, and atmosphere to be authentic.
       - PEOPLE: Update ethnicity, fashion, and appearance.
       - GEOMETRY & ENVIRONMENT: Redesign architecture and background.
       - ATMOSPHERE: Adapt lighting and mood.
    
    BRANDING ADJUSTMENTS:${brandingInstructions}

    The output should be a distinct new variation that tells the same story in a different cultural setting.
    
    Additional Context: ${config.additionalContext}
  `;
};

/**
 * Fetch image from URL and convert to base64
 */
const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  
  return { base64, mimeType: contentType };
};

/**
 * Process a single image job
 */
export const processJob = internalAction({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get job details
    const job = await ctx.runQuery(internal.jobs.getById, { jobId: args.jobId });
    if (!job) {
      throw new Error("Job not found");
    }

    // Update to processing
    await ctx.runMutation(internal.jobs.setProcessing, { jobId: args.jobId });

    try {
      // Fetch source image
      const { base64: imageBase64, mimeType } = await fetchImageAsBase64(job.sourceUrl);

      // Initialize Gemini client
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable not set");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(job.config);

      // Build parts array
      const parts: any[] = [
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
      ];

      // Add logo if configured
      if (job.config.addOwnLogo && job.config.ownLogoData) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: job.config.ownLogoData,
          },
        });
      }

      // Call Gemini API
      const response = await ai.models.generateContent({
        model: job.config.modelVersion || "gemini-2.0-flash-exp",
        contents: { parts },
        config: {
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          ],
        },
      });

      // Extract usage
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        candidateTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      };

      // Check response
      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error("No candidates returned from Gemini");
      }

      if (candidate.finishReason && candidate.finishReason !== "STOP") {
        throw new Error(`Generation stopped: ${candidate.finishReason}`);
      }

      // Find image in response
      const responseParts = candidate.content?.parts;
      if (!responseParts || responseParts.length === 0) {
        throw new Error("No content parts in response");
      }

      let generatedBase64: string | null = null;
      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          generatedBase64 = part.inlineData.data;
          break;
        }
      }

      if (!generatedBase64) {
        throw new Error("No image data in response");
      }

      // Generate filename
      const originalFilename = getFilenameFromUrl(job.sourceUrl);
      const generatedFileName = generateOutputFilename(
        originalFilename,
        job.config.filenameFindPattern,
        job.config.filenameReplacePattern
      );

      // Store in Convex storage
      const imageBuffer = Buffer.from(generatedBase64, "base64");
      const blob = new Blob([imageBuffer], { type: "image/png" });
      const fileId = await ctx.storage.store(blob);
      const fileUrl = await ctx.storage.getUrl(fileId);

      if (!fileUrl) {
        throw new Error("Failed to get storage URL");
      }

      // Update job as completed
      await ctx.runMutation(internal.jobs.setCompleted, {
        jobId: args.jobId,
        generatedFileId: fileId,
        generatedFileName,
        generatedUrl: fileUrl,
        promptTokens: usage.promptTokens,
        candidateTokens: usage.candidateTokens,
        totalTokens: usage.totalTokens,
      });

    } catch (error: any) {
      // Update job as failed
      await ctx.runMutation(internal.jobs.setFailed, {
        jobId: args.jobId,
        error: error.message || "Unknown error",
      });
    }

    return null;
  },
});

/**
 * Process all jobs in a batch sequentially
 */
export const processBatch = internalAction({
  args: { batchId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const jobs = await ctx.runQuery(internal.jobs.getByBatchId, {
      batchId: args.batchId,
    });

    for (const job of jobs) {
      if (job.status === "pending") {
        await ctx.runAction(internal.processing.processJob, { jobId: job._id });
      }
    }

    return null;
  },
});
