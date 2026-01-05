import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CultureShift AI Database Schema
 * 
 * Tables:
 * - presets: Reusable configuration presets for image localization
 * - jobs: Processing jobs tracking status and results
 */

// Shared config validator - used in both presets and jobs
export const configValidator = v.object({
  targetCountry: v.string(),
  additionalContext: v.string(),
  removeBranding: v.boolean(),
  addBrandingColors: v.boolean(),
  brandingColor: v.string(),
  addOwnLogo: v.boolean(),
  ownLogoData: v.optional(v.union(v.string(), v.null())),
  filenameFindPattern: v.string(),
  filenameReplacePattern: v.string(),
  // Pro features
  modelVersion: v.optional(v.string()),
  aspectRatio: v.optional(v.string()),
  imageSize: v.optional(v.string()),
});

export default defineSchema({
  /**
   * Presets Table
   * Stores reusable configuration presets for reproducible outputs
   */
  presets: defineTable({
    name: v.string(),
    // Cultural Parameters
    targetCountry: v.string(),
    additionalContext: v.string(),
    // Branding Identity
    removeBranding: v.boolean(),
    addBrandingColors: v.boolean(),
    brandingColor: v.string(),
    addOwnLogo: v.boolean(),
    ownLogoData: v.optional(v.union(v.string(), v.null())),
    // Output Logic
    filenameFindPattern: v.string(),
    filenameReplacePattern: v.string(),
    // Model Config (Pro features)
    modelVersion: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    imageSize: v.optional(v.string()),
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  /**
   * Jobs Table
   * Tracks processing jobs with status and results
   */
  jobs: defineTable({
    // Job Identity
    batchId: v.optional(v.string()),
    sourceUrl: v.string(),
    // Configuration snapshot at job creation
    presetName: v.optional(v.string()),
    config: configValidator,
    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    // Results
    generatedFileId: v.optional(v.id("_storage")),
    generatedFileName: v.optional(v.string()),
    generatedUrl: v.optional(v.string()),
    generatedUrlWithExtension: v.optional(v.string()), // URL with .png extension for direct file access
    // Token Usage
    promptTokens: v.optional(v.number()),
    candidateTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_batchId", ["batchId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),
});
