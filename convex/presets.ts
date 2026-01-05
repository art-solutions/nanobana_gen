import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

/**
 * Preset Management Functions
 * CRUD operations for configuration presets
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

/**
 * Create a new preset
 */
export const create = internalMutation({
  args: {
    name: v.string(),
    config: presetInputValidator,
  },
  returns: v.id("presets"),
  handler: async (ctx, args) => {
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
 * List all presets
 */
export const list = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("presets"),
      name: v.string(),
      targetCountry: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
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
 * Get a preset by name
 */
export const getByName = internalQuery({
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
 * Update an existing preset
 */
export const update = internalMutation({
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
 */
export const deleteByName = internalMutation({
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
