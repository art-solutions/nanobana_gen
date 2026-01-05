import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { configValidator } from "./schema";
import { v } from "convex/values";

const http = httpRouter();

/**
 * CORS headers for all responses
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * JSON response helper
 */
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

/**
 * Error response helper
 */
const errorResponse = (message: string, status = 400) => {
  return jsonResponse({ success: false, error: message }, status);
};

/**
 * OPTIONS handler for CORS preflight
 */
const handleOptions = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
});

// ========================
// PRESET ENDPOINTS
// ========================

/**
 * POST /api/presets - Create a new preset
 */
http.route({
  path: "/api/presets",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { name, ...config } = body;

      if (!name) {
        return errorResponse("Preset name is required");
      }

      const presetId = await ctx.runMutation(internal.presets.create, {
        name,
        config,
      });

      return jsonResponse({
        success: true,
        preset: {
          name,
          createdAt: Date.now(),
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/presets",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * GET /api/presets - List all presets
 */
http.route({
  path: "/api/presets",
  method: "GET",
  handler: httpAction(async (ctx) => {
    try {
      const presets = await ctx.runQuery(internal.presets.list, {});
      return jsonResponse({ presets });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

/**
 * GET /api/presets/:name - Get preset by name
 */
http.route({
  path: "/api/presets/by-name",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const name = url.searchParams.get("name");

      if (!name) {
        return errorResponse("Preset name is required");
      }

      const preset = await ctx.runQuery(internal.presets.getByName, { name });

      if (!preset) {
        return errorResponse(`Preset "${name}" not found`, 404);
      }

      return jsonResponse({ preset });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/presets/by-name",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * PUT /api/presets/:name - Update preset
 */
http.route({
  path: "/api/presets/by-name",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const name = url.searchParams.get("name");

      if (!name) {
        return errorResponse("Preset name is required");
      }

      const config = await request.json();

      await ctx.runMutation(internal.presets.update, { name, config });

      return jsonResponse({
        success: true,
        preset: {
          name,
          updatedAt: Date.now(),
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

/**
 * DELETE /api/presets/:name - Delete preset
 */
http.route({
  path: "/api/presets/by-name",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const name = url.searchParams.get("name");

      if (!name) {
        return errorResponse("Preset name is required");
      }

      await ctx.runMutation(internal.presets.deleteByName, { name });

      return jsonResponse({
        success: true,
        deleted: name,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

// ========================
// PROCESSING ENDPOINTS
// ========================

/**
 * POST /api/process/single - Process single image with preset
 */
http.route({
  path: "/api/process/single",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url, presetName } = body;

      if (!url) {
        return errorResponse("Image URL is required");
      }

      if (!presetName) {
        return errorResponse("Preset name is required");
      }

      // Get preset config
      const preset = await ctx.runQuery(internal.presets.getByName, {
        name: presetName,
      });

      if (!preset) {
        return errorResponse(`Preset "${presetName}" not found`, 404);
      }

      // Extract config from preset
      const config = {
        targetCountry: preset.targetCountry,
        additionalContext: preset.additionalContext,
        removeBranding: preset.removeBranding,
        addBrandingColors: preset.addBrandingColors,
        brandingColor: preset.brandingColor,
        addOwnLogo: preset.addOwnLogo,
        ownLogoData: preset.ownLogoData,
        filenameFindPattern: preset.filenameFindPattern,
        filenameReplacePattern: preset.filenameReplacePattern,
        modelVersion: preset.modelVersion,
        aspectRatio: preset.aspectRatio,
        imageSize: preset.imageSize,
      };

      // Create job
      const jobId = await ctx.runMutation(internal.jobs.create, {
        sourceUrl: url,
        config,
        presetName,
      });

      // Process job synchronously
      await ctx.runAction(internal.processing.processJob, { jobId });

      // Get updated job
      const job = await ctx.runQuery(internal.jobs.getById, { jobId });

      if (!job || job.status === "failed") {
        return errorResponse(job?.error || "Processing failed", 500);
      }

      return jsonResponse({
        success: true,
        jobId: job._id,
        generatedUrl: job.generatedUrl,
        generatedFileName: job.generatedFileName,
        usage: {
          promptTokens: job.promptTokens || 0,
          candidateTokens: job.candidateTokens || 0,
          totalTokens: job.totalTokens || 0,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/process/single",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * POST /api/process/single-with-config - Process single image with inline config
 */
http.route({
  path: "/api/process/single-with-config",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { url, config } = body;

      if (!url) {
        return errorResponse("Image URL is required");
      }

      if (!config) {
        return errorResponse("Config is required");
      }

      // Create job
      const jobId = await ctx.runMutation(internal.jobs.create, {
        sourceUrl: url,
        config,
      });

      // Process job synchronously
      await ctx.runAction(internal.processing.processJob, { jobId });

      // Get updated job
      const job = await ctx.runQuery(internal.jobs.getById, { jobId });

      if (!job || job.status === "failed") {
        return errorResponse(job?.error || "Processing failed", 500);
      }

      return jsonResponse({
        success: true,
        jobId: job._id,
        generatedUrl: job.generatedUrl,
        generatedFileName: job.generatedFileName,
        usage: {
          promptTokens: job.promptTokens || 0,
          candidateTokens: job.candidateTokens || 0,
          totalTokens: job.totalTokens || 0,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/process/single-with-config",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * POST /api/process/batch - Process multiple images with preset
 */
http.route({
  path: "/api/process/batch",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { urls, presetName } = body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return errorResponse("URLs array is required");
      }

      if (!presetName) {
        return errorResponse("Preset name is required");
      }

      // Get preset config
      const preset = await ctx.runQuery(internal.presets.getByName, {
        name: presetName,
      });

      if (!preset) {
        return errorResponse(`Preset "${presetName}" not found`, 404);
      }

      // Extract config from preset
      const config = {
        targetCountry: preset.targetCountry,
        additionalContext: preset.additionalContext,
        removeBranding: preset.removeBranding,
        addBrandingColors: preset.addBrandingColors,
        brandingColor: preset.brandingColor,
        addOwnLogo: preset.addOwnLogo,
        ownLogoData: preset.ownLogoData,
        filenameFindPattern: preset.filenameFindPattern,
        filenameReplacePattern: preset.filenameReplacePattern,
        modelVersion: preset.modelVersion,
        aspectRatio: preset.aspectRatio,
        imageSize: preset.imageSize,
      };

      // Generate batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create jobs for all URLs
      const jobIds = [];
      for (const url of urls) {
        const jobId = await ctx.runMutation(internal.jobs.create, {
          sourceUrl: url,
          config,
          presetName,
          batchId,
        });
        jobIds.push(jobId);
      }

      // Process all jobs
      await ctx.runAction(internal.processing.processBatch, { batchId });

      // Get all jobs
      const jobs = await ctx.runQuery(internal.jobs.getByBatchId, { batchId });
      const summary = await ctx.runQuery(internal.jobs.getBatchSummary, { batchId });

      // Build results
      const results = jobs.map((job) => ({
        jobId: job._id,
        sourceUrl: job.sourceUrl,
        generatedUrl: job.generatedUrl,
        generatedFileName: job.generatedFileName,
        status: job.status,
        error: job.error,
      }));

      return jsonResponse({
        success: true,
        batchId,
        results,
        summary: {
          total: summary.total,
          completed: summary.completed,
          failed: summary.failed,
          totalTokens: summary.totalTokens,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/process/batch",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * POST /api/process/batch-with-config - Process multiple images with inline config
 */
http.route({
  path: "/api/process/batch-with-config",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { urls, config } = body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return errorResponse("URLs array is required");
      }

      if (!config) {
        return errorResponse("Config is required");
      }

      // Generate batch ID
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create jobs for all URLs
      for (const url of urls) {
        await ctx.runMutation(internal.jobs.create, {
          sourceUrl: url,
          config,
          batchId,
        });
      }

      // Process all jobs
      await ctx.runAction(internal.processing.processBatch, { batchId });

      // Get all jobs
      const jobs = await ctx.runQuery(internal.jobs.getByBatchId, { batchId });
      const summary = await ctx.runQuery(internal.jobs.getBatchSummary, { batchId });

      // Build results
      const results = jobs.map((job) => ({
        jobId: job._id,
        sourceUrl: job.sourceUrl,
        generatedUrl: job.generatedUrl,
        generatedFileName: job.generatedFileName,
        status: job.status,
        error: job.error,
      }));

      return jsonResponse({
        success: true,
        batchId,
        results,
        summary: {
          total: summary.total,
          completed: summary.completed,
          failed: summary.failed,
          totalTokens: summary.totalTokens,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/process/batch-with-config",
  method: "OPTIONS",
  handler: handleOptions,
});

// ========================
// JOB HISTORY ENDPOINTS
// ========================

/**
 * GET /api/jobs - List all jobs with pagination
 */
http.route({
  path: "/api/jobs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const status = url.searchParams.get("status") as
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | null;
      const batchId = url.searchParams.get("batchId");

      const result = await ctx.runQuery(internal.jobs.list, {
        limit,
        offset,
        status: status || undefined,
        batchId: batchId || undefined,
      });

      return jsonResponse({
        jobs: result.jobs.map((job) => ({
          jobId: job._id,
          batchId: job.batchId,
          sourceUrl: job.sourceUrl,
          presetName: job.presetName,
          status: job.status,
          error: job.error,
          generatedFileName: job.generatedFileName,
          generatedUrl: job.generatedUrl,
          totalTokens: job.totalTokens,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
        total: result.total,
        limit,
        offset,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/jobs",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * GET /api/jobs/by-id - Get single job details
 */
http.route({
  path: "/api/jobs/by-id",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return errorResponse("Job ID is required");
      }

      const job = await ctx.runQuery(internal.jobs.getById, {
        jobId: jobId as any,
      });

      if (!job) {
        return errorResponse("Job not found", 404);
      }

      return jsonResponse({
        job: {
          jobId: job._id,
          batchId: job.batchId,
          sourceUrl: job.sourceUrl,
          presetName: job.presetName,
          config: job.config,
          status: job.status,
          error: job.error,
          generatedFileName: job.generatedFileName,
          generatedUrl: job.generatedUrl,
          promptTokens: job.promptTokens,
          candidateTokens: job.candidateTokens,
          totalTokens: job.totalTokens,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/jobs/by-id",
  method: "OPTIONS",
  handler: handleOptions,
});

/**
 * GET /api/jobs/batch - Get all jobs in a batch
 */
http.route({
  path: "/api/jobs/batch",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const batchId = url.searchParams.get("batchId");

      if (!batchId) {
        return errorResponse("Batch ID is required");
      }

      const jobs = await ctx.runQuery(internal.jobs.getByBatchId, { batchId });
      const summary = await ctx.runQuery(internal.jobs.getBatchSummary, { batchId });

      return jsonResponse({
        batchId,
        jobs: jobs.map((job) => ({
          jobId: job._id,
          sourceUrl: job.sourceUrl,
          status: job.status,
          error: job.error,
          generatedFileName: job.generatedFileName,
          generatedUrl: job.generatedUrl,
          totalTokens: job.totalTokens,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        })),
        summary,
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/jobs/batch",
  method: "OPTIONS",
  handler: handleOptions,
});

// ========================
// FILE SERVING ENDPOINT
// Serves files with proper extensions
// ========================

/**
 * GET /api/files/{storageId}.png - Serve image file with extension
 * This allows accessing files with proper extensions for browsers
 */
http.route({
  path: "/api/files",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      // Get the filename from query param: /api/files?id=xxx.png
      const fileParam = url.searchParams.get("id");

      if (!fileParam) {
        return errorResponse("File ID is required. Use ?id={storageId}.png", 400);
      }

      // Extract storage ID (remove .png extension if present)
      const storageId = fileParam.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");

      if (!storageId) {
        return errorResponse("Invalid file ID", 400);
      }

      // Get the file from storage
      const blob = await ctx.storage.get(storageId as any);

      if (!blob) {
        return errorResponse("File not found", 404);
      }

      // Determine content type from extension
      let contentType = "image/png";
      if (fileParam.endsWith(".jpg") || fileParam.endsWith(".jpeg")) {
        contentType = "image/jpeg";
      } else if (fileParam.endsWith(".gif")) {
        contentType = "image/gif";
      } else if (fileParam.endsWith(".webp")) {
        contentType = "image/webp";
      }

      // Return the file with proper headers
      return new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${fileParam}"`,
          "Cache-Control": "public, max-age=31536000",
          ...corsHeaders,
        },
      });
    } catch (error: any) {
      return errorResponse(error.message, 500);
    }
  }),
});

http.route({
  path: "/api/files",
  method: "OPTIONS",
  handler: handleOptions,
});

export default http;
