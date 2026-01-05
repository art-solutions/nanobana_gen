import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { configValidator } from "./schema";
import { Id } from "./_generated/dataModel";

/**
 * Job Management Functions
 * Create, update, and query processing jobs
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
 * Create a new job
 */
export const create = internalMutation({
  args: {
    sourceUrl: v.string(),
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
      createdAt: Date.now(),
    });
  },
});

/**
 * Update job status to processing
 */
export const setProcessing = internalMutation({
  args: { jobId: v.id("jobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "processing" });
    return null;
  },
});

/**
 * Update job to completed with results
 */
export const setCompleted = internalMutation({
  args: {
    jobId: v.id("jobs"),
    generatedFileId: v.id("_storage"),
    generatedFileName: v.string(),
    generatedUrl: v.string(),
    promptTokens: v.optional(v.number()),
    candidateTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "completed",
      generatedFileId: args.generatedFileId,
      generatedFileName: args.generatedFileName,
      generatedUrl: args.generatedUrl,
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
 */
export const setFailed = internalMutation({
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

/**
 * Get a job by ID
 */
export const getById = internalQuery({
  args: { jobId: v.id("jobs") },
  returns: v.union(jobOutputValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

/**
 * List jobs with optional filtering
 */
export const list = internalQuery({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(statusValidator),
    batchId: v.optional(v.string()),
  },
  returns: v.object({
    jobs: v.array(jobOutputValidator),
    total: v.number(),
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

    return { jobs, total };
  },
});

/**
 * Get all jobs in a batch
 */
export const getByBatchId = internalQuery({
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
 */
export const getBatchSummary = internalQuery({
  args: { batchId: v.string() },
  returns: v.object({
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
      total: jobs.length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      pending: jobs.filter((j) => j.status === "pending").length,
      processing: jobs.filter((j) => j.status === "processing").length,
      totalTokens: jobs.reduce((sum, j) => sum + (j.totalTokens ?? 0), 0),
    };
  },
});
