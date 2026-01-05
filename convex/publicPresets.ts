import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public Preset Queries and Mutations
 * These functions can be called directly from the React frontend
 */

// Validator for preset input (without name, createdAt, updatedAt)
const presetInputValidator = v.object({
  targetCountry: v.string(),
  additionalContext: v.string(),
  removeBranding: v.boolean(),
  addBrandingColors: v.boolean(),
  brandingColor: v.string(),
  addOwnLogo: v.boolean(),
  ownLogoData: v.optional(v.union(v.string(), v.null())),
  filenameFindPattern: v.string(),
  filenameReplacePattern: v.string(),
  modelVersion: v.optional(v.string()),
  aspectRatio: v.optional(v.string()),
  imageSize: v.optional(v.string()),
});

// Output validator for preset
const presetOutputValidator = v.object({
  _id: v.id("presets"),
  _creationTime: v.number(),
  name: v.string(),
  targetCountry: v.string(),
  additionalContext: v.string(),
  removeBranding: v.boolean(),
  addBrandingColors: v.boolean(),
  brandingColor: v.string(),
  addOwnLogo: v.boolean(),
  ownLogoData: v.optional(v.union(v.string(), v.null())),
  filenameFindPattern: v.string(),
  filenameReplacePattern: v.string(),
  modelVersion: v.optional(v.string()),
  aspectRatio: v.optional(v.string()),
  imageSize: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Simplified preset list item
const presetListItemValidator = v.object({
  _id: v.id("presets"),
  name: v.string(),
  targetCountry: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * List all presets (summary)
 * PUBLIC query - can be called from React frontend
 */
export const listPresets = query({
  args: {},
  returns: v.array(presetListItemValidator),
  handler: async (ctx) => {
    const presets = await ctx.db.query("presets").order("desc").collect();
    return presets.map((p) => ({
      _id: p._id,
      name: p.name,
      targetCountry: p.targetCountry,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

/**
 * Get a preset by name (full details)
 * PUBLIC query - can be called from React frontend
 */
export const getPreset = query({
  args: { name: v.string() },
  returns: v.union(presetOutputValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();
  },
});

/**
 * Get a preset by ID (full details)
 * PUBLIC query - can be called from React frontend
 */
export const getPresetById = query({
  args: { id: v.id("presets") },
  returns: v.union(presetOutputValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new preset
 * PUBLIC mutation - can be called from React frontend
 */
export const createPreset = mutation({
  args: {
    name: v.string(),
    config: presetInputValidator,
  },
  returns: v.id("presets"),
  handler: async (ctx, args) => {
    // Validate name is not empty
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Preset name cannot be empty");
    }

    // Check if preset with this name already exists
    const existing = await ctx.db
      .query("presets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (existing) {
      throw new Error(`Preset with name "${args.name}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert("presets", {
      name: args.name,
      ...args.config,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing preset
 * PUBLIC mutation - can be called from React frontend
 */
export const updatePreset = mutation({
  args: {
    name: v.string(),
    config: presetInputValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (!existing) {
      throw new Error(`Preset "${args.name}" not found`);
    }

    await ctx.db.patch(existing._id, {
      ...args.config,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete a preset by name
 * PUBLIC mutation - can be called from React frontend
 */
export const deletePreset = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    if (!existing) {
      throw new Error(`Preset "${args.name}" not found`);
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});

/**
 * Check if a preset name is available
 * PUBLIC query - useful for form validation
 */
export const isPresetNameAvailable = query({
  args: { name: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presets")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .unique();

    return !existing;
  },
});
