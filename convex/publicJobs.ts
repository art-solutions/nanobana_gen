import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { configValidator } from "./schema";
import { Id } from "./_generated/dataModel";

/**
 * Public Job Queries
 * These queries can be called directly from the React frontend using useQuery
 */

// Job status type
const statusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

// Job output validator
const jobOutputValidator = v.object({
  _id: v.id("jobs"),
  _creationTime: v.number(),
  batchId: v.optional(v.string()),
  sourceUrl: v.string(),
  presetName: v.optional(v.string()),
  config: configValidator,
  status: statusValidator,
  error: v.optional(v.string()),
  generatedFileId: v.optional(v.id("_storage")),
  generatedFileName: v.optional(v.string()),
  generatedUrl: v.optional(v.string()),
  generatedUrlWithExtension: v.optional(v.string()),
  promptTokens: v.optional(v.number()),
  candidateTokens: v.optional(v.number()),
  totalTokens: v.optional(v.number()),
  createdAt: v.number(),
  completedAt: v.optional(v.number()),
});

/**
 * List jobs with optional filtering
 * This is a PUBLIC query that can be called from the React frontend
 */
export const listJobs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(statusValidator),
    batchId: v.optional(v.string()),
  },
  returns: v.object({
    jobs: v.array(jobOutputValidator),
    total: v.number(),
    limit: v.number(),
    offset: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    let allJobs;

    if (args.batchId) {
      allJobs = await ctx.db
        .query("jobs")
        .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
        .collect();
    } else if (args.status) {
      const status = args.status;
      allJobs = await ctx.db
        .query("jobs")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      allJobs = await ctx.db
        .query("jobs")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    const total = allJobs.length;
    const jobs = allJobs.slice(offset, offset + limit);

    return { jobs, total, limit, offset };
  },
});

/**
 * Get a job by ID
 * This is a PUBLIC query that can be called from the React frontend
 */
export const getJob = query({
  args: { jobId: v.id("jobs") },
  returns: v.union(jobOutputValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * Get all jobs in a batch
 * This is a PUBLIC query that can be called from the React frontend
 */
export const getJobsByBatch = query({
  args: { batchId: v.string() },
  returns: v.array(jobOutputValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .collect();
  },
});

/**
 * Get batch summary statistics
 * This is a PUBLIC query that can be called from the React frontend
 */
export const getBatchSummary = query({
  args: { batchId: v.string() },
  returns: v.object({
    batchId: v.string(),
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
    pending: v.number(),
    processing: v.number(),
    totalTokens: v.number(),
  }),
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_batchId", (q) => q.eq("batchId", args.batchId))
      .collect();

    return {
      batchId: args.batchId,
      total: jobs.length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      totalTokens: jobs.reduce((sum, j) => sum + (j.totalTokens ?? 0), 0),
    };
  },
});

/**
 * Get recent jobs summary
 * Useful for dashboard stats
 */
export const getRecentJobsSummary = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    total: v.number(),
    completed: v.number(),
    failed: v.number(),
    pending: v.number(),
    processing: v.number(),
    totalTokens: v.number(),
    recentJobs: v.array(jobOutputValidator),
  }),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const allJobs = await ctx.db
      .query("jobs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100); // Get last 100 for stats

    const recentJobs = allJobs.slice(0, limit);

    return {
      total: allJobs.length,
      completed: allJobs.filter((j) => j.status === "completed").length,
      failed: allJobs.filter((j) => j.status === "failed").length,
      pending: allJobs.filter((j) => j.status === "pending").length,
      processing: allJobs.filter((j) => j.status === "processing").length,
      totalTokens: allJobs.reduce((sum, j) => sum + (j.totalTokens ?? 0), 0),
      recentJobs,
    };
  },
});

// ========================
// PUBLIC MUTATIONS
// These mutations can be called from the React frontend
// ========================

/**
 * Create a new job from frontend
 * This is a PUBLIC mutation that can be called from the React frontend using useMutation
 */
export const createJob = mutation({
  args: {
    sourceUrl: v.string(),
    sourceName: v.string(),
    config: configValidator,
    presetName: v.optional(v.string()),
    batchId: v.optional(v.string()),
  },
  returns: v.id("jobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      sourceUrl: args.sourceUrl,
      config: args.config,
      presetName: args.presetName,
      batchId: args.batchId,
      status: "pending",
      generatedFileName: args.sourceName,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update job status to processing
 * This is a PUBLIC mutation that can be called from the React frontend using useMutation
 */
export const setJobProcessing = mutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "processing" });
    return null;
  },
});

/**
 * Update job to completed with results
 * This is a PUBLIC mutation that can be called from the React frontend using useMutation
 */
export const setJobCompleted = mutation({
  args: {
    jobId: v.id("jobs"),
    generatedUrl: v.string(),
    generatedFileName: v.string(),
    promptTokens: v.optional(v.number()),
    candidateTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      generatedUrl: args.generatedUrl,
      generatedFileName: args.generatedFileName,
      promptTokens: args.promptTokens,
      candidateTokens: args.candidateTokens,
      totalTokens: args.totalTokens,
      completedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Update job to failed with error
 * This is a PUBLIC mutation that can be called from the React frontend using useMutation
 */
export const setJobFailed = mutation({
  args: {
    jobId: v.id("jobs"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
    return null;
  },
});

// ========================
// FILE STORAGE MUTATIONS
// ========================

/**
 * Generate an upload URL for storing a generated image
 * This is a PUBLIC mutation that can be called from the React frontend
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Update job with the uploaded file's storage ID
 * Call this after uploading the file to the URL from generateUploadUrl
 */
export const setJobCompletedWithFile = mutation({
  args: {
    jobId: v.id("jobs"),
    storageId: v.id("_storage"),
    generatedFileName: v.string(),
    promptTokens: v.optional(v.number()),
    candidateTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the URL for the stored file
    const fileUrl = await ctx.storage.getUrl(args.storageId);

    // Generate URL with .png extension using the HTTP endpoint
    // Format: https://resilient-loris-278.convex.cloud/api/files?id={storageId}.png
    let urlWithExtension: string | undefined;
    if (fileUrl) {
      // Extract the base URL from the storage URL
      // Storage URL format: https://xxx.convex.cloud/api/storage/{storageId}
      const baseUrl = fileUrl.substring(0, fileUrl.lastIndexOf("/api/storage"));
      urlWithExtension = `${baseUrl}/api/files?id=${args.storageId}.png`;
    }

    await ctx.db.patch(args.jobId, {
      status: "completed",
      generatedFileId: args.storageId,
      generatedFileName: args.generatedFileName,
      generatedUrl: fileUrl || undefined,
      generatedUrlWithExtension: urlWithExtension,
      promptTokens: args.promptTokens,
      candidateTokens: args.candidateTokens,
      totalTokens: args.totalTokens,
      completedAt: Date.now(),
    });
    return null;
  },
});
